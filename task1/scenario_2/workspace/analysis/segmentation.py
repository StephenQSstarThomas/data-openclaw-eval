"""
客户分群模块
基于 RFM 分数将客户分为 8 个群组
"""
import sys
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
import numpy as np
from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from config import DATA_DIR, DB_PATH
from api.database import engine, SessionLocal
from analysis.rfm_model import RFMModel


# ============================================================
# 分群规则
# ============================================================
SEGMENT_RULES = {
    "重要价值客户": {
        "description": "高R高F高M — 最近购买、高频、高消费",
        "condition": lambda r: (r["r_score"] >= 4) & (r["f_score"] >= 4) & (r["m_score"] >= 4),
        "action": "VIP服务、专属优惠、优先体验",
    },
    "重要发展客户": {
        "description": "高R低F高M — 最近购买、低频但高消费",
        "condition": lambda r: (r["r_score"] >= 4) & (r["f_score"] < 3) & (r["m_score"] >= 4),
        "action": "提升购买频次、推荐相关商品、会员升级激励",
    },
    "重要保持客户": {
        "description": "低R高F高M — 高频高消费但最近未购买",
        "condition": lambda r: (r["r_score"] < 3) & (r["f_score"] >= 4) & (r["m_score"] >= 4),
        "action": "召回营销、限时优惠、专属关怀",
    },
    "重要挽留客户": {
        "description": "低R低F高M — 高消费但最近未购买且低频",
        "condition": lambda r: (r["r_score"] < 3) & (r["f_score"] < 3) & (r["m_score"] >= 4),
        "action": "大额优惠券、一对一挽留、调研流失原因",
    },
    "一般价值客户": {
        "description": "高R高F低M — 最近购买、高频但消费低",
        "condition": lambda r: (r["r_score"] >= 4) & (r["f_score"] >= 4) & (r["m_score"] < 3),
        "action": "提升客单价、满减活动、关联推荐",
    },
    "一般发展客户": {
        "description": "高R低F低M — 新客或偶尔购买",
        "condition": lambda r: (r["r_score"] >= 4) & (r["f_score"] < 3) & (r["m_score"] < 3),
        "action": "新客培育、首单优惠、引导复购",
    },
    "一般保持客户": {
        "description": "中R中F中M — 各维度均一般",
        "condition": lambda r: (r["r_score"] == 3) | ((r["f_score"] == 3) & (r["m_score"] == 3)),
        "action": "常规营销、节日促销、保持触达",
    },
    "流失客户": {
        "description": "低R低F低M — 长期未购买、低频、低消费",
        "condition": lambda r: (r["r_score"] < 3) & (r["f_score"] < 3) & (r["m_score"] < 3),
        "action": "激活邮件、大额优惠、调研流失原因",
    },
}


class CustomerSegmentation:
    """客户分群引擎"""

    def __init__(self):
        self.segments: Dict[str, pd.DataFrame] = {}
        self.summary: Optional[pd.DataFrame] = None

    def segment(self, rfm_df: pd.DataFrame) -> pd.DataFrame:
        """
        对 RFM 数据进行分群
        Args:
            rfm_df: 包含 r_score, f_score, m_score 列的 DataFrame
        Returns:
            添加了 segment 列的 DataFrame
        """
        print("[分群] 开始客户分群...")
        rfm_df["segment"] = "未分类"

        # 按规则优先级依次分群
        for seg_name, rule in SEGMENT_RULES.items():
            mask = rule["condition"](rfm_df) & (rfm_df["segment"] == "未分类")
            rfm_df.loc[mask, "segment"] = seg_name
            count = mask.sum()
            if count > 0:
                print(f"  {seg_name}: {count} 人")

        # 统计未分类
        unclassified = (rfm_df["segment"] == "未分类").sum()
        if unclassified > 0:
            print(f"  未分类: {unclassified} 人 (归入一般保持客户)")
            rfm_df.loc[rfm_df["segment"] == "未分类", "segment"] = "一般保持客户"

        # 保存分群结果
        for seg_name in SEGMENT_RULES:
            seg_df = rfm_df[rfm_df["segment"] == seg_name]
            self.segments[seg_name] = seg_df

        return rfm_df

    def get_summary(self, rfm_df: pd.DataFrame) -> pd.DataFrame:
        """生成各分群统计摘要"""
        summary = rfm_df.groupby("segment").agg(
            客户数=("recency", "count"),
            占比百分比=("recency", lambda x: round(len(x) / len(rfm_df) * 100, 1)),
            平均R天数=("recency", "mean"),
            平均F频次=("frequency", "mean"),
            平均M金额=("monetary", "mean"),
            平均RFM分=("rfm_score", "mean"),
        ).round(2)

        summary = summary.sort_values("客户数", ascending=False)
        self.summary = summary
        return summary

    def save_to_db(self, rfm_df: pd.DataFrame):
        """将分群结果写回数据库 customers 表"""
        if "customer_id" not in rfm_df.columns:
            print("[分群] 警告: 缺少 customer_id 列，无法写回数据库")
            return

        session = SessionLocal()
        try:
            update_count = 0
            for _, row in rfm_df.iterrows():
                cust_id = int(row["customer_id"])
                segment = row["segment"]
                rfm_score = float(row["rfm_score"])
                session.execute(
                    text("""
                        UPDATE customers
                        SET vip_level = :vip_level
                        WHERE id = :cust_id
                    """),
                    {
                        "vip_level": self._segment_to_vip(segment),
                        "cust_id": cust_id,
                    }
                )
                update_count += 1

            session.commit()
            print(f"[分群] 已更新 {update_count} 条客户记录的 VIP 等级")
        except Exception as e:
            session.rollback()
            print(f"[ERROR] 写回数据库失败: {e}")
        finally:
            session.close()

    @staticmethod
    def _segment_to_vip(segment: str) -> int:
        """分群映射到 VIP 等级"""
        mapping = {
            "重要价值客户": 5,
            "重要发展客户": 4,
            "重要保持客户": 4,
            "重要挽留客户": 3,
            "一般价值客户": 3,
            "一般发展客户": 2,
            "一般保持客户": 1,
            "流失客户": 0,
        }
        return mapping.get(segment, 0)

    def export_csv(self, rfm_df: pd.DataFrame,
                   output_path: Optional[str] = None) -> str:
        """导出分群结果"""
        path = Path(output_path) if output_path else DATA_DIR / "customer_segments.csv"
        rfm_df.to_csv(path, index=False, encoding="utf-8-sig")
        print(f"[分群] 结果已导出到 {path}")
        return str(path)

    def print_report(self, rfm_df: pd.DataFrame):
        """打印分群报告"""
        summary = self.get_summary(rfm_df)
        print("\n" + "=" * 70)
        print("  客户分群报告")
        print("=" * 70)
        print(f"\n总客户数: {len(rfm_df)}")
        print(f"分群数: {len(self.segments)}")
        print("\n" + summary.to_string())
        print("\n各分群建议:")
        for seg_name, rule in SEGMENT_RULES.items():
            count = len(self.segments.get(seg_name, []))
            print(f"  [{seg_name}] ({count}人): {rule['action']}")


# ============================================================
# 一键运行
# ============================================================
def run_segmentation(source: str = "db") -> pd.DataFrame:
    """一键运行 RFM + 分群"""
    # 1. RFM 分析
    model = RFMModel()
    if source == "db":
        df = model.load_from_db()
    else:
        df = model.load_from_csv()

    rfm = model.calculate_rfm(df)
    rfm = model.score_rfm(rfm)

    # 2. 分群
    seg = CustomerSegmentation()
    rfm = seg.segment(rfm)
    seg.print_report(rfm)

    # 3. 保存
    seg.export_csv(rfm)
    if source == "db" and "customer_id" in rfm.columns:
        seg.save_to_db(rfm)

    return rfm


if __name__ == "__main__":
    run_segmentation(source="db")
