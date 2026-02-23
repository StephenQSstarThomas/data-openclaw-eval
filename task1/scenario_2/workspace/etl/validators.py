"""
数据验证模块
提供字段完整性校验、数值范围校验、日期格式校验
"""
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class DataValidator:
    """数据验证器"""

    # 必填字段
    REQUIRED_FIELDS = [
        "order_no", "order_date", "customer_name", "customer_region",
        "product_name", "category", "unit_price", "quantity", "subtotal",
        "final_amount", "payment_method", "status",
    ]

    # 数值范围
    NUMERIC_RANGES = {
        "unit_price": (0.01, 99999.99),
        "quantity": (1, 100),
        "subtotal": (0.01, 999999.99),
        "final_amount": (0.01, 9999999.99),
        "discount": (0.0, 999999.99),
        "shipping_fee": (0.0, 100.0),
        "customer_age": (12, 120),
        "customer_vip": (0, 5),
    }

    # 合法枚举值
    VALID_CATEGORIES = ["电子产品", "服装", "食品", "家居", "图书"]
    VALID_REGIONS = ["华北", "华东", "华南", "华中", "西南", "东北"]
    VALID_STATUSES = ["已完成", "已发货", "待发货", "已取消", "已退款"]
    VALID_PAYMENTS = ["支付宝", "微信支付", "银行卡", "信用卡", "货到付款"]
    VALID_GENDERS = ["男", "女"]

    def __init__(self):
        self.errors: List[Dict] = []
        self.warnings: List[Dict] = []
        self.stats: Dict[str, int] = {}

    def validate(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """
        执行全部验证，返回 (标记后的DataFrame, 验证报告)
        """
        logger.info(f"开始数据验证，共 {len(df)} 条记录")
        self.errors = []
        self.warnings = []

        # 添加验证标记列
        df["_is_valid"] = True
        df["_validation_issues"] = ""

        # 1. 字段完整性校验
        df = self._check_completeness(df)

        # 2. 数值范围校验
        df = self._check_numeric_ranges(df)

        # 3. 日期格式校验
        df = self._check_date_format(df)

        # 4. 枚举值校验
        df = self._check_enum_values(df)

        # 5. 逻辑一致性校验
        df = self._check_logical_consistency(df)

        # 汇总
        valid_count = df["_is_valid"].sum()
        invalid_count = len(df) - valid_count
        self.stats = {
            "total": len(df),
            "valid": int(valid_count),
            "invalid": int(invalid_count),
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
        }

        logger.info(f"验证完成: {valid_count} 条有效，{invalid_count} 条无效")
        return df, self.stats

    def _check_completeness(self, df: pd.DataFrame) -> pd.DataFrame:
        """字段完整性校验：检查必填字段是否为空"""
        logger.info("  [1/5] 字段完整性校验...")
        for field in self.REQUIRED_FIELDS:
            if field not in df.columns:
                self.errors.append({"type": "missing_column", "field": field})
                logger.error(f"    缺少必填列: {field}")
                continue
            null_mask = df[field].isna() | (df[field].astype(str).str.strip() == "")
            null_count = null_mask.sum()
            if null_count > 0:
                df.loc[null_mask, "_is_valid"] = False
                df.loc[null_mask, "_validation_issues"] += f"{field}为空;"
                self.warnings.append({
                    "type": "null_values",
                    "field": field,
                    "count": int(null_count),
                })
                logger.warning(f"    {field}: {null_count} 条为空")
        return df

    def _check_numeric_ranges(self, df: pd.DataFrame) -> pd.DataFrame:
        """数值范围校验"""
        logger.info("  [2/5] 数值范围校验...")
        for field, (min_val, max_val) in self.NUMERIC_RANGES.items():
            if field not in df.columns:
                continue
            col = pd.to_numeric(df[field], errors="coerce")
            out_mask = (col < min_val) | (col > max_val)
            out_count = out_mask.sum()
            if out_count > 0:
                df.loc[out_mask, "_is_valid"] = False
                df.loc[out_mask, "_validation_issues"] += f"{field}超范围[{min_val},{max_val}];"
                self.warnings.append({
                    "type": "out_of_range",
                    "field": field,
                    "count": int(out_count),
                    "range": (min_val, max_val),
                })
                logger.warning(f"    {field}: {out_count} 条超出范围 [{min_val}, {max_val}]")
        return df

    def _check_date_format(self, df: pd.DataFrame) -> pd.DataFrame:
        """日期格式校验"""
        logger.info("  [3/5] 日期格式校验...")
        if "order_date" in df.columns:
            parsed = pd.to_datetime(df["order_date"], errors="coerce")
            invalid_mask = parsed.isna() & df["order_date"].notna()
            invalid_count = invalid_mask.sum()
            if invalid_count > 0:
                df.loc[invalid_mask, "_is_valid"] = False
                df.loc[invalid_mask, "_validation_issues"] += "日期格式错误;"
                logger.warning(f"    order_date: {invalid_count} 条日期格式无效")

            # 检查未来日期
            future_mask = parsed > datetime.now()
            future_count = future_mask.sum()
            if future_count > 0:
                df.loc[future_mask, "_is_valid"] = False
                df.loc[future_mask, "_validation_issues"] += "日期为未来;"
                logger.warning(f"    order_date: {future_count} 条为未来日期")
        return df

    def _check_enum_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """枚举值校验"""
        logger.info("  [4/5] 枚举值校验...")
        enum_checks = {
            "category": self.VALID_CATEGORIES,
            "customer_region": self.VALID_REGIONS,
            "status": self.VALID_STATUSES,
            "payment_method": self.VALID_PAYMENTS,
            "customer_gender": self.VALID_GENDERS,
        }
        for field, valid_vals in enum_checks.items():
            if field not in df.columns:
                continue
            invalid_mask = ~df[field].isin(valid_vals) & df[field].notna()
            inv_count = invalid_mask.sum()
            if inv_count > 0:
                df.loc[invalid_mask, "_is_valid"] = False
                df.loc[invalid_mask, "_validation_issues"] += f"{field}枚举非法;"
                logger.warning(f"    {field}: {inv_count} 条枚举值非法")
        return df

    def _check_logical_consistency(self, df: pd.DataFrame) -> pd.DataFrame:
        """逻辑一致性校验：subtotal ≈ unit_price * quantity"""
        logger.info("  [5/5] 逻辑一致性校验...")
        if all(c in df.columns for c in ["unit_price", "quantity", "subtotal"]):
            expected = df["unit_price"] * df["quantity"]
            tolerance = 0.01
            mismatch_mask = (df["subtotal"] - expected).abs() > tolerance
            mm_count = mismatch_mask.sum()
            if mm_count > 0:
                df.loc[mismatch_mask, "_validation_issues"] += "subtotal计算不一致;"
                logger.warning(f"    subtotal 与 unit_price*quantity 不一致: {mm_count} 条")
        return df

    def get_report(self) -> str:
        """生成可读的验证报告"""
        lines = ["=" * 50, "数据验证报告", "=" * 50]
        lines.append(f"总记录数: {self.stats.get('total', 0)}")
        lines.append(f"有效记录: {self.stats.get('valid', 0)}")
        lines.append(f"无效记录: {self.stats.get('invalid', 0)}")
        lines.append(f"错误数: {self.stats.get('error_count', 0)}")
        lines.append(f"警告数: {self.stats.get('warning_count', 0)}")
        if self.warnings:
            lines.append("\n警告详情:")
            for w in self.warnings:
                lines.append(f"  - [{w['type']}] {w.get('field', 'N/A')}: {w.get('count', 0)} 条")
        return "\n".join(lines)
