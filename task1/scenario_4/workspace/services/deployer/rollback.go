package deployer

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// Snapshot 部署快照
type Snapshot struct {
	ID        string       `json:"id"`
	CreatedAt time.Time    `json:"created_at"`
	Config    DeployConfig `json:"config"`
	Status    string       `json:"status"` // available, used, expired
}

// RollbackManager 回滚管理器
type RollbackManager struct {
	snapshots []Snapshot
	maxKeep   int
	mu        sync.Mutex
	logger    *slog.Logger
}

func NewRollbackManager(maxKeep int) *RollbackManager {
	return &RollbackManager{
		maxKeep: maxKeep,
		logger:  slog.Default().With("component", "rollback"),
	}
}

func (rm *RollbackManager) CreateSnapshot(cfg DeployConfig) Snapshot {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	snap := Snapshot{
		ID:        fmt.Sprintf("snap-%d", time.Now().UnixMilli()),
		CreatedAt: time.Now(),
		Config:    cfg,
		Status:    "available",
	}
	rm.snapshots = append(rm.snapshots, snap)

	// 保留最近 N 个快照
	if len(rm.snapshots) > rm.maxKeep {
		rm.snapshots = rm.snapshots[len(rm.snapshots)-rm.maxKeep:]
	}

	rm.logger.Info("创建部署快照", "id", snap.ID, "image", cfg.Image)
	return snap
}

func (rm *RollbackManager) Execute(ctx context.Context, snap Snapshot) error {
	rm.logger.Info("执行回滚", "snapshot", snap.ID, "target_image", snap.Config.Image)

	// 标记快照为已使用
	rm.mu.Lock()
	for i := range rm.snapshots {
		if rm.snapshots[i].ID == snap.ID {
			rm.snapshots[i].Status = "used"
			break
		}
	}
	rm.mu.Unlock()

	// 实际回滚逻辑：恢复到快照中的镜像版本
	for i := 0; i < snap.Config.Replicas; i++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		rm.logger.Info("回滚实例", "instance", i, "image", snap.Config.Image)
		time.Sleep(300 * time.Millisecond) // 模拟回滚
	}

	rm.logger.Info("回滚完成", "snapshot", snap.ID)
	return nil
}

func (rm *RollbackManager) ListSnapshots() []Snapshot {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	result := make([]Snapshot, len(rm.snapshots))
	copy(result, rm.snapshots)
	return result
}
