package deployer

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// DeployConfig 部署配置
type DeployConfig struct {
	ServiceName    string        `yaml:"service_name"`
	Image          string        `yaml:"image"`
	Replicas       int           `yaml:"replicas"`
	MaxSurge       int           `yaml:"max_surge"`        // 滚动更新时最多额外实例数
	MaxUnavailable int           `yaml:"max_unavailable"`  // 最多不可用实例数
	HealthCheck    HealthConfig  `yaml:"health_check"`
	Timeout        time.Duration `yaml:"timeout"`
}

type HealthConfig struct {
	Endpoint string        `yaml:"endpoint"`
	Interval time.Duration `yaml:"interval"`
	Timeout  time.Duration `yaml:"timeout"`
	Retries  int           `yaml:"retries"`
}

// DeployStatus 部署状态
type DeployStatus struct {
	Phase       string    `json:"phase"` // pending, rolling, verifying, completed, failed, rolledback
	StartedAt   time.Time `json:"started_at"`
	CompletedAt time.Time `json:"completed_at,omitempty"`
	Progress    float64   `json:"progress"` // 0.0 - 1.0
	Message     string    `json:"message"`
	OldImage    string    `json:"old_image"`
	NewImage    string    `json:"new_image"`
}

// Deployer 滚动更新部署器
type Deployer struct {
	config   DeployConfig
	status   DeployStatus
	mu       sync.RWMutex
	logger   *slog.Logger
	notifier *Notifier
	rollback *RollbackManager
}

func NewDeployer(cfg DeployConfig, notifier *Notifier, rb *RollbackManager) *Deployer {
	return &Deployer{
		config:   cfg,
		logger:   slog.Default().With("service", cfg.ServiceName),
		notifier: notifier,
		rollback: rb,
	}
}

func (d *Deployer) GetStatus() DeployStatus {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.status
}

func (d *Deployer) setStatus(phase, msg string, progress float64) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.status.Phase = phase
	d.status.Message = msg
	d.status.Progress = progress
	if phase == "completed" || phase == "failed" || phase == "rolledback" {
		d.status.CompletedAt = time.Now()
	}
}

// Deploy 执行滚动更新
func (d *Deployer) Deploy(ctx context.Context, newImage string) error {
	d.mu.Lock()
	d.status = DeployStatus{
		Phase:     "pending",
		StartedAt: time.Now(),
		OldImage:  d.config.Image,
		NewImage:  newImage,
	}
	d.mu.Unlock()

	d.logger.Info("开始滚动部署", "old", d.config.Image, "new", newImage)
	d.notifier.Send(NotifyEvent{
		Type:    "deploy_start",
		Service: d.config.ServiceName,
		Message: fmt.Sprintf("开始部署 %s -> %s", d.config.Image, newImage),
	})

	// 创建回滚快照
	snapshot := d.rollback.CreateSnapshot(d.config)

	// 计算滚动批次
	batchSize := d.config.MaxSurge
	if batchSize <= 0 {
		batchSize = 1
	}
	totalBatches := (d.config.Replicas + batchSize - 1) / batchSize
	d.setStatus("rolling", "滚动更新中", 0)

	for batch := 0; batch < totalBatches; batch++ {
		select {
		case <-ctx.Done():
			d.setStatus("failed", "部署被取消", float64(batch)/float64(totalBatches))
			return ctx.Err()
		default:
		}

		startIdx := batch * batchSize
		endIdx := startIdx + batchSize
		if endIdx > d.config.Replicas {
			endIdx = d.config.Replicas
		}

		d.logger.Info("更新批次", "batch", batch+1, "total", totalBatches,
			"instances", fmt.Sprintf("%d-%d", startIdx, endIdx-1))

		// 模拟更新实例
		for i := startIdx; i < endIdx; i++ {
			if err := d.updateInstance(ctx, i, newImage); err != nil {
				d.logger.Error("实例更新失败", "instance", i, "error", err)
				d.setStatus("failed", fmt.Sprintf("实例 %d 更新失败: %v", i, err), float64(batch)/float64(totalBatches))

				// 自动回滚
				d.notifier.Send(NotifyEvent{
					Type:    "deploy_failed",
					Service: d.config.ServiceName,
					Message: fmt.Sprintf("实例 %d 更新失败，触发自动回滚", i),
				})
				if rbErr := d.rollback.Execute(ctx, snapshot); rbErr != nil {
					d.logger.Error("回滚也失败了", "error", rbErr)
					d.setStatus("failed", "部署和回滚均失败", float64(batch)/float64(totalBatches))
					return fmt.Errorf("deploy and rollback both failed: %w", rbErr)
				}
				d.setStatus("rolledback", "已自动回滚", 0)
				return fmt.Errorf("instance %d failed: %w", i, err)
			}
		}

		progress := float64(batch+1) / float64(totalBatches)
		d.setStatus("rolling", fmt.Sprintf("批次 %d/%d 完成", batch+1, totalBatches), progress)

		// 批次间健康检查
		if batch < totalBatches-1 {
			d.setStatus("verifying", "健康检查中", progress)
			if err := d.batchHealthCheck(ctx, startIdx, endIdx); err != nil {
				d.logger.Warn("批次健康检查失败", "batch", batch+1, "error", err)
				d.notifier.Send(NotifyEvent{
					Type:    "health_failed",
					Service: d.config.ServiceName,
					Message: fmt.Sprintf("批次 %d 健康检查失败，触发回滚", batch+1),
				})
				if rbErr := d.rollback.Execute(ctx, snapshot); rbErr != nil {
					return fmt.Errorf("rollback failed: %w", rbErr)
				}
				d.setStatus("rolledback", "健康检查失败，已回滚", progress)
				return err
			}
		}
	}

	d.config.Image = newImage
	d.setStatus("completed", "部署完成", 1.0)
	d.logger.Info("部署完成", "image", newImage)

	d.notifier.Send(NotifyEvent{
		Type:    "deploy_success",
		Service: d.config.ServiceName,
		Message: fmt.Sprintf("部署完成: %s", newImage),
	})

	return nil
}

func (d *Deployer) updateInstance(ctx context.Context, idx int, image string) error {
	d.logger.Info("更新实例", "instance", idx, "image", image)
	// 实际实现：调用 Docker API 或 K8s API 更新容器
	time.Sleep(500 * time.Millisecond) // 模拟更新耗时
	return nil
}

func (d *Deployer) batchHealthCheck(ctx context.Context, start, end int) error {
	cfg := d.config.HealthCheck
	for i := start; i < end; i++ {
		healthy := false
		for retry := 0; retry < cfg.Retries; retry++ {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(cfg.Interval):
			}
			// 实际实现：HTTP GET cfg.Endpoint
			healthy = true // 模拟健康
			if healthy {
				break
			}
		}
		if !healthy {
			return fmt.Errorf("instance %d health check failed after %d retries", i, cfg.Retries)
		}
	}
	return nil
}
