"""
定时报告调度器
- 每周一 09:00 生成周报
- 每月 1 日 09:00 生成月报
- 发送失败自动重试（最多 3 次）
- 完整日志记录
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from pathlib import Path

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

from generator import ReportGenerator

# ============================================================
# 日志配置
# ============================================================
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_DIR / "scheduler.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("reports.scheduler")

# ============================================================
# 邮件配置（从环境变量读取）
# ============================================================
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
REPORT_RECIPIENTS = os.getenv("REPORT_RECIPIENTS", "").split(",")
MAX_RETRIES = 3


def send_email(subject: str, html_content: str, recipients: list, retry: int = 0):
    """发送 HTML 邮件，失败自动重试"""
    if not SMTP_USER or not recipients or not recipients[0]:
        logger.warning("邮件配置不完整，跳过发送")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = ", ".join(recipients)
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, recipients, msg.as_string())

        logger.info(f"邮件已发送: {subject} -> {recipients}")
        return True

    except Exception as e:
        logger.error(f"邮件发送失败 (尝试 {retry+1}/{MAX_RETRIES}): {e}")
        if retry < MAX_RETRIES - 1:
            logger.info(f"重试发送...")
            return send_email(subject, html_content, recipients, retry + 1)
        logger.error(f"邮件发送彻底失败: {subject}")
        return False


def job_weekly_report():
    """生成并发送周报"""
    logger.info("=" * 60)
    logger.info("开始生成周报...")
    try:
        gen = ReportGenerator()
        result = gen.generate("weekly")
        gen.close()

        m = result["metrics"]
        subject = f"[周报] {m.period_label} | 销售额 ¥{m.total_revenue:,.0f}"
        send_email(subject, result["html"], REPORT_RECIPIENTS)
        logger.info(f"周报完成: {m.period_label}")
    except Exception as e:
        logger.error(f"周报生成失败: {e}", exc_info=True)
        raise


def job_monthly_report():
    """生成并发送月报"""
    logger.info("=" * 60)
    logger.info("开始生成月报...")
    try:
        gen = ReportGenerator()
        result = gen.generate("monthly")
        gen.close()

        m = result["metrics"]
        subject = f"[月报] {m.period_label} | 销售额 ¥{m.total_revenue:,.0f} | 环比 {m.revenue_change_pct:+.1f}%"
        send_email(subject, result["html"], REPORT_RECIPIENTS)
        logger.info(f"月报完成: {m.period_label}")
    except Exception as e:
        logger.error(f"月报生成失败: {e}", exc_info=True)
        raise


def on_job_event(event):
    """调度器事件监听"""
    if event.exception:
        logger.error(f"任务执行异常: {event.job_id} — {event.exception}")
    else:
        logger.info(f"任务执行成功: {event.job_id}")


def main():
    scheduler = BlockingScheduler(timezone="Asia/Shanghai")

    # 每周一 09:00 生成周报
    scheduler.add_job(
        job_weekly_report, "cron",
        day_of_week="mon", hour=9, minute=0,
        id="weekly_report", name="周报生成",
        misfire_grace_time=3600
    )

    # 每月 1 日 09:00 生成月报
    scheduler.add_job(
        job_monthly_report, "cron",
        day=1, hour=9, minute=0,
        id="monthly_report", name="月报生成",
        misfire_grace_time=3600
    )

    scheduler.add_listener(on_job_event, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

    logger.info("报告调度器已启动")
    logger.info(f"  周报: 每周一 09:00")
    logger.info(f"  月报: 每月 1 日 09:00")
    logger.info(f"  收件人: {REPORT_RECIPIENTS}")

    try:
        scheduler.start()
    except KeyboardInterrupt:
        logger.info("调度器已停止")


if __name__ == "__main__":
    main()
