"""
自动化报告生成器
- 支持周报(weekly)和月报(monthly)
- 输出 HTML 内容 + PDF 文件
- 调用分析模块获取数据
"""

import os
import logging
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, field
from typing import Literal

import pandas as pd
from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger("reports.generator")

REPORTS_DIR = Path(__file__).parent
TEMPLATES_DIR = REPORTS_DIR / "templates"
OUTPUT_DIR = REPORTS_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

DB_PATH = Path(__file__).parent.parent / "ecommerce.db"


@dataclass
class ReportMetrics:
    """报告指标数据"""
    period_label: str                     # "2025-W03" 或 "2025-01"
    period_type: Literal["weekly", "monthly"]
    start_date: str
    end_date: str
    total_revenue: float = 0.0
    total_orders: int = 0
    avg_order_value: float = 0.0
    unique_customers: int = 0
    top_categories: list = field(default_factory=list)    # [{name, revenue, pct}]
    top_products: list = field(default_factory=list)       # [{name, revenue, qty}]
    daily_trend: list = field(default_factory=list)        # [{date, revenue, orders}]
    revenue_change_pct: float = 0.0       # 环比变化
    orders_change_pct: float = 0.0


class ReportGenerator:
    """报告生成器"""

    def __init__(self, db_path: str = None):
        import sqlite3
        self.db_path = db_path or str(DB_PATH)
        self.conn = sqlite3.connect(self.db_path)
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=True
        )

    def close(self):
        self.conn.close()

    def _query_df(self, sql: str, params: tuple = ()) -> pd.DataFrame:
        return pd.read_sql_query(sql, self.conn, params=params)

    def collect_metrics(self, period_type: str, ref_date: datetime = None) -> ReportMetrics:
        """收集指定周期的报告指标"""
        ref = ref_date or datetime.now()

        if period_type == "weekly":
            # 上周一到上周日
            last_monday = ref - timedelta(days=ref.weekday() + 7)
            start = last_monday.strftime("%Y-%m-%d")
            end = (last_monday + timedelta(days=6)).strftime("%Y-%m-%d")
            label = f"{last_monday.isocalendar()[0]}-W{last_monday.isocalendar()[1]:02d}"
            # 前一周（环比）
            prev_start = (last_monday - timedelta(days=7)).strftime("%Y-%m-%d")
            prev_end = (last_monday - timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            # 上个月
            first_this = ref.replace(day=1)
            last_day_prev = first_this - timedelta(days=1)
            start = last_day_prev.replace(day=1).strftime("%Y-%m-%d")
            end = last_day_prev.strftime("%Y-%m-%d")
            label = last_day_prev.strftime("%Y-%m")
            # 前一月（环比）
            prev_end_dt = last_day_prev.replace(day=1) - timedelta(days=1)
            prev_start = prev_end_dt.replace(day=1).strftime("%Y-%m-%d")
            prev_end = prev_end_dt.strftime("%Y-%m-%d")

        metrics = ReportMetrics(
            period_label=label, period_type=period_type,
            start_date=start, end_date=end
        )

        # 当期汇总
        summary = self._query_df("""
            SELECT
                COALESCE(SUM(final_amount), 0) as revenue,
                COUNT(*) as orders,
                COALESCE(AVG(final_amount), 0) as avg_value,
                COUNT(DISTINCT customer_id) as customers
            FROM orders
            WHERE order_date BETWEEN ? AND ?
              AND status NOT IN ('cancelled', 'refunded')
        """, (start, end))

        if not summary.empty:
            row = summary.iloc[0]
            metrics.total_revenue = float(row['revenue'])
            metrics.total_orders = int(row['orders'])
            metrics.avg_order_value = float(row['avg_value'])
            metrics.unique_customers = int(row['customers'])

        # 环比
        prev_summary = self._query_df("""
            SELECT COALESCE(SUM(final_amount), 0) as revenue, COUNT(*) as orders
            FROM orders WHERE order_date BETWEEN ? AND ? AND status NOT IN ('cancelled','refunded')
        """, (prev_start, prev_end))
        if not prev_summary.empty:
            pr = prev_summary.iloc[0]
            prev_rev = float(pr['revenue'])
            prev_ord = int(pr['orders'])
            metrics.revenue_change_pct = ((metrics.total_revenue - prev_rev) / prev_rev * 100) if prev_rev > 0 else 0
            metrics.orders_change_pct = ((metrics.total_orders - prev_ord) / prev_ord * 100) if prev_ord > 0 else 0

        # 分类 TOP
        cat_df = self._query_df("""
            SELECT c.name as category, SUM(oi.subtotal) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.order_date BETWEEN ? AND ? AND o.status NOT IN ('cancelled','refunded')
            GROUP BY c.name ORDER BY revenue DESC LIMIT 10
        """, (start, end))
        total_cat_rev = cat_df['revenue'].sum()
        metrics.top_categories = [
            {"name": r['category'], "revenue": float(r['revenue']),
             "pct": round(r['revenue']/total_cat_rev*100, 1) if total_cat_rev > 0 else 0}
            for _, r in cat_df.iterrows()
        ]

        # 商品 TOP
        prod_df = self._query_df("""
            SELECT p.name as product, SUM(oi.subtotal) as revenue, SUM(oi.quantity) as qty
            FROM order_items oi JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.order_date BETWEEN ? AND ? AND o.status NOT IN ('cancelled','refunded')
            GROUP BY p.name ORDER BY revenue DESC LIMIT 10
        """, (start, end))
        metrics.top_products = [
            {"name": r['product'], "revenue": float(r['revenue']), "qty": int(r['qty'])}
            for _, r in prod_df.iterrows()
        ]

        # 日趋势
        trend_df = self._query_df("""
            SELECT DATE(order_date) as date, SUM(final_amount) as revenue, COUNT(*) as orders
            FROM orders WHERE order_date BETWEEN ? AND ? AND status NOT IN ('cancelled','refunded')
            GROUP BY DATE(order_date) ORDER BY date
        """, (start, end))
        metrics.daily_trend = [
            {"date": r['date'], "revenue": float(r['revenue']), "orders": int(r['orders'])}
            for _, r in trend_df.iterrows()
        ]

        return metrics

    def render_html(self, metrics: ReportMetrics) -> str:
        """渲染 HTML 报告"""
        template = self.jinja_env.get_template("report_template.html")
        return template.render(
            metrics=metrics,
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

    def generate(self, period_type: str, ref_date: datetime = None) -> dict:
        """生成完整报告，返回 {html, filepath}"""
        logger.info(f"开始生成{period_type}报告...")
        metrics = self.collect_metrics(period_type, ref_date)
        html = self.render_html(metrics)

        filename = f"report_{metrics.period_type}_{metrics.period_label}.html"
        filepath = OUTPUT_DIR / filename
        filepath.write_text(html, encoding="utf-8")
        logger.info(f"报告已保存: {filepath}")

        return {"html": html, "filepath": str(filepath), "metrics": metrics}
