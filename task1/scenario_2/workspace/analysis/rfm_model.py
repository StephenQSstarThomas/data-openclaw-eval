"""
RFM 用户画像分析模型
R (Recency)  — 最近一次消费距今天数，越小越好
F (Frequency) — 消费频次，越大越好
M (Monetary)  — 消费总金额，越大越好
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Tuple

import pandas as pd
import numpy as np
from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from config import DATA_DIR, DB_PATH
from api.database import engine, SessionLocal


class RFMModel:
    """RFM 分析模型"""

    # RFM 分位数打分的边界
    SCORE_BINS = 5  # 1-5 分

    def __init__(self, analysis_date: Optional[str] = None):
        """
        Args:
            analysis_date: 分析基准日期 (YYYY-MM-DD)，默认今天
        """
        if analysis_date:
            self.analysis_date = pd.to_datetime(analysis_date)
        else:
            self.analysis_date = pd.to_datetime(datetime.now().strftime("%Y-%m-%d"))
        self.rfm_df: Optional[pd.DataFrame] = None

    def load_from_db(self) -> pd.DataFrame:
        """从 SQLite 加载订单数据"""
        query = """
            SELECT
                o.customer_id,
                c.name AS customer_name,
                c.region,
                c.city,
                c.vip_level,
                c.gender,
                c.age,
                o.order_date,
                o.final_amount,
                o.status
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.status = '已完成'
        """
        df = pd.read_sql(query, engine)
        df["order_date"] = pd.to_datetime(df["order_date"])
        print(f"[RFM] 从数据库加载 {len(df)} 条已完成订单")
        return df

    def load_from_csv(self, path: Optional[str] = None) -> pd.DataFrame:
        """从 CSV 加载"""
        csv_path = Path(path) if path else DATA_DIR / "cleaned_sales.csv"
        df = pd.read_csv(csv_path, encoding="utf-8-sig")
        df["order_date"] = pd.to_datetime(df["order_date"])
        # 只保留已完成订单
        if "status" in df.columns:
            df = df[df["status"] == "已完成"]
        print(f"[RFM] 从 CSV 加载 {len(df)} 条已完成订单")
        return df

    def calculate_rfm(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        计算 RFM 值
        Returns: 每个客户的 RFM 数据
        """
        print("[RFM] 计算 R/F/M 值...")

        # 确定客户 ID 列
        cust_col = "customer_id" if "customer_id" in df.columns else "customer_name"

        # 聚合计算
        rfm = df.groupby(cust_col).agg(
            last_order_date=("order_date", "max"),
            frequency=("order_date", "count"),
            monetary=("final_amount", "sum"),
        ).reset_index()

        # R: 最近一次购买距今天数
        rfm["recency"] = (self.analysis_date - rfm["last_order_date"]).dt.days

        # 合并客户信息
        if cust_col == "customer_id":
            cust_info = df.drop_duplicates(subset=["customer_id"])[
                ["customer_id", "customer_name", "region", "city", "vip_level", "gender", "age"]
            ]
            rfm = rfm.merge(cust_info, on="customer_id", how="left")

        # 金额取整
        rfm["monetary"] = rfm["monetary"].round(2)

        print(f"  客户总数: {len(rfm)}")
        print(f"  R (Recency)  — 均值: {rfm['recency'].mean():.1f} 天")
        print(f"  F (Frequency) — 均值: {rfm['frequency'].mean():.1f} 次")
        print(f"  M (Monetary)  — 均值: ¥{rfm['monetary'].mean():,.2f}")

        self.rfm_df = rfm
        return rfm

    def score_rfm(self, rfm: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        分位数打分 (1-5)
        R: 值越小分越高（最近购买的客户更有价值）
        F: 值越大分越高
        M: 值越大分越高
        """
        if rfm is None:
            rfm = self.rfm_df
        if rfm is None:
            raise ValueError("请先调用 calculate_rfm()")

        print("[RFM] 分位数打分 (1-5)...")

        # R 分数 — 反向（recency 越小，分数越高）
        rfm["r_score"] = pd.qcut(
            rfm["recency"],
            q=self.SCORE_BINS,
            labels=[5, 4, 3, 2, 1],  # 反向
            duplicates="drop",
        ).astype(int)

        # F 分数 — 正向
        rfm["f_score"] = pd.qcut(
            rfm["frequency"].rank(method="first"),
            q=self.SCORE_BINS,
            labels=[1, 2, 3, 4, 5],
            duplicates="drop",
        ).astype(int)

        # M 分数 — 正向
        rfm["m_score"] = pd.qcut(
            rfm["monetary"].rank(method="first"),
            q=self.SCORE_BINS,
            labels=[1, 2, 3, 4, 5],
            duplicates="drop",
        ).astype(int)

        # RFM 总分（加权：R=0.3, F=0.3, M=0.4）
        rfm["rfm_score"] = (
            rfm["r_score"] * 0.3 +
            rfm["f_score"] * 0.3 +
            rfm["m_score"] * 0.4
        ).round(2)

        # RFM 组合标签
        rfm["rfm_label"] = (
            rfm["r_score"].astype(str) +
            rfm["f_score"].astype(str) +
            rfm["m_score"].astype(str)
        )

        self.rfm_df = rfm

        print(f"  RFM 总分范围: [{rfm['rfm_score'].min()}, {rfm['rfm_score'].max()}]")
        print(f"  RFM 总分均值: {rfm['rfm_score'].mean():.2f}")

        return rfm

    def get_summary(self) -> pd.DataFrame:
        """各评分段统计摘要"""
        if self.rfm_df is None:
            raise ValueError("请先计算 RFM 分数")

        summary = self.rfm_df.groupby("r_score").agg(
            客户数=("recency", "count"),
            平均R=("recency", "mean"),
            平均F=("frequency", "mean"),
            平均M=("monetary", "mean"),
            平均总分=("rfm_score", "mean"),
        ).round(2)

        return summary

    def export_csv(self, output_path: Optional[str] = None) -> str:
        """导出 RFM 结果到 CSV"""
        if self.rfm_df is None:
            raise ValueError("请先计算 RFM 分数")

        path = Path(output_path) if output_path else DATA_DIR / "rfm_results.csv"
        self.rfm_df.to_csv(path, index=False, encoding="utf-8-sig")
        print(f"[RFM] 结果已导出到 {path}")
        return str(path)


# ============================================================
# 便捷函数
# ============================================================
def run_rfm_analysis(source: str = "db", analysis_date: Optional[str] = None) -> pd.DataFrame:
    """
    一键运行 RFM 分析
    Args:
        source: 'db' 从数据库读, 'csv' 从 CSV 读
    """
    model = RFMModel(analysis_date=analysis_date)

    if source == "db":
        df = model.load_from_db()
    else:
        df = model.load_from_csv()

    rfm = model.calculate_rfm(df)
    rfm = model.score_rfm(rfm)
    model.export_csv()

    print("\n" + "=" * 50)
    print("RFM 分析完成！")
    print("=" * 50)
    print(model.get_summary())

    return rfm


if __name__ == "__main__":
    run_rfm_analysis(source="db")
