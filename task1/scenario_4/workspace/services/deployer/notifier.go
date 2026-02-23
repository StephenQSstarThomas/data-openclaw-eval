package deployer

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// NotifyEvent 通知事件
type NotifyEvent struct {
	Type      string    `json:"type"`    // deploy_start, deploy_success, deploy_failed, health_failed
	Service   string    `json:"service"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// NotifierConfig 通知器配置
type NotifierConfig struct {
	SlackWebhook   string `yaml:"slack_webhook"`
	CustomWebhooks []string `yaml:"custom_webhooks"`
	Timeout        time.Duration `yaml:"timeout"`
}

// Notifier 通知发送器
type Notifier struct {
	config NotifierConfig
	client *http.Client
	logger *slog.Logger
}

func NewNotifier(cfg NotifierConfig) *Notifier {
	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = 10 * time.Second
	}
	return &Notifier{
		config: cfg,
		client: &http.Client{Timeout: timeout},
		logger: slog.Default().With("component", "notifier"),
	}
}

func (n *Notifier) Send(event NotifyEvent) {
	event.Timestamp = time.Now()

	// 发送到 Slack
	if n.config.SlackWebhook != "" {
		go n.sendSlack(event)
	}

	// 发送到自定义 Webhook
	for _, url := range n.config.CustomWebhooks {
		go n.sendWebhook(url, event)
	}
}

func (n *Notifier) sendSlack(event NotifyEvent) {
	emoji := map[string]string{
		"deploy_start":   ":rocket:",
		"deploy_success": ":white_check_mark:",
		"deploy_failed":  ":x:",
		"health_failed":  ":warning:",
	}
	color := map[string]string{
		"deploy_start":   "#2196F3",
		"deploy_success": "#4CAF50",
		"deploy_failed":  "#F44336",
		"health_failed":  "#FF9800",
	}

	payload := map[string]interface{}{
		"attachments": []map[string]interface{}{
			{
				"color":  color[event.Type],
				"blocks": []map[string]interface{}{
					{
						"type": "section",
						"text": map[string]string{
							"type": "mrkdwn",
							"text": fmt.Sprintf("%s *[%s]* %s\n_%s_",
								emoji[event.Type], event.Service, event.Message,
								event.Timestamp.Format("2006-01-02 15:04:05")),
						},
					},
				},
			},
		},
	}

	body, _ := json.Marshal(payload)
	resp, err := n.client.Post(n.config.SlackWebhook, "application/json", bytes.NewReader(body))
	if err != nil {
		n.logger.Error("Slack 通知失败", "error", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		n.logger.Warn("Slack 响应异常", "status", resp.StatusCode)
	}
}

func (n *Notifier) sendWebhook(url string, event NotifyEvent) {
	body, _ := json.Marshal(event)
	resp, err := n.client.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		n.logger.Error("Webhook 通知失败", "url", url, "error", err)
		return
	}
	defer resp.Body.Close()
}
