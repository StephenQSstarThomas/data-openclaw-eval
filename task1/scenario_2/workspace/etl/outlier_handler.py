"""
异常值处理模块
使用 IQR (四分位距) 方法检测异常值
提供截断（cap）和标记（flag）两种策略
"""
import logging
from typing import Dict, List, Optional, Tuple

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class OutlierHandler:
    """异常值处理器"""

    def __init__(self, method: str = "iqr", multiplier: float = 1.5):
        """
        Args:
            method: 检测方法，目前支持 'iqr'
            multiplier: IQR 倍数，默认 1.5
        """
        self.method = method
        self.multiplier = multiplier
        self.outlier_stats: Dict[str, Dict] = {}

    def detect(self, df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
        """
        检测指定列的异常值，添加标记列
        """
        logger.info(f"开始异常值检测 (method={self.method}, multiplier={self.multiplier})")
        df["_has_outlier"] = False
        df["_outlier_details"] = ""

        for col in columns:
            if col not in df.columns:
                logger.warning(f"  列 {col} 不存在，跳过")
                continue

            numeric_col = pd.to_numeric(df[col], errors="coerce")
            q1 = numeric_col.quantile(0.25)
            q3 = numeric_col.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - self.multiplier * iqr
            upper_bound = q3 + self.multiplier * iqr

            outlier_mask = (numeric_col < lower_bound) | (numeric_col > upper_bound)
            outlier_count = outlier_mask.sum()

            self.outlier_stats[col] = {
                "q1": round(q1, 2),
                "q3": round(q3, 2),
                "iqr": round(iqr, 2),
                "lower_bound": round(lower_bound, 2),
                "upper_bound": round(upper_bound, 2),
                "outlier_count": int(outlier_count),
                "outlier_pct": round(outlier_count / len(df) * 100, 2),
            }

            df.loc[outlier_mask, "_has_outlier"] = True
            df.loc[outlier_mask, "_outlier_details"] += f"{col}异常;"

            logger.info(
                f"  {col}: Q1={q1:.2f}, Q3={q3:.2f}, IQR={iqr:.2f}, "
                f"范围=[{lower_bound:.2f}, {upper_bound:.2f}], "
                f"异常值={outlier_count} ({outlier_count/len(df)*100:.2f}%)"
            )

        total_outliers = df["_has_outlier"].sum()
        logger.info(f"异常值检测完成: {total_outliers} 条记录包含异常值")
        return df

    def handle(self, df: pd.DataFrame, columns: List[str],
               strategy: str = "cap") -> pd.DataFrame:
        """
        处理异常值
        Args:
            strategy: 'cap' = 截断到边界值, 'flag' = 仅标记不修改,
                      'remove' = 删除异常行
        """
        logger.info(f"异常值处理策略: {strategy}")

        if strategy == "flag":
            logger.info("  仅标记，不修改数据")
            return df

        if strategy == "remove":
            before = len(df)
            df = df[~df["_has_outlier"]].copy()
            after = len(df)
            logger.info(f"  删除异常行: {before} -> {after} (移除 {before - after} 条)")
            return df

        if strategy == "cap":
            for col in columns:
                if col not in self.outlier_stats:
                    continue
                stats = self.outlier_stats[col]
                lower = stats["lower_bound"]
                upper = stats["upper_bound"]
                numeric_col = pd.to_numeric(df[col], errors="coerce")

                capped_low = (numeric_col < lower).sum()
                capped_high = (numeric_col > upper).sum()

                df[col] = numeric_col.clip(lower=lower, upper=upper)
                logger.info(
                    f"  {col}: 截断下界 {capped_low} 条, 截断上界 {capped_high} 条"
                )
            return df

        raise ValueError(f"未知策略: {strategy}")

    def get_report(self) -> str:
        """生成异常值检测报告"""
        lines = ["=" * 50, "异常值检测报告", "=" * 50]
        for col, stats in self.outlier_stats.items():
            lines.append(f"\n列: {col}")
            lines.append(f"  Q1 = {stats['q1']}, Q3 = {stats['q3']}, IQR = {stats['iqr']}")
            lines.append(f"  正常范围: [{stats['lower_bound']}, {stats['upper_bound']}]")
            lines.append(f"  异常值数量: {stats['outlier_count']} ({stats['outlier_pct']}%)")
        return "\n".join(lines)
