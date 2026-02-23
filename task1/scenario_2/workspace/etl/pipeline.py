"""
ETL 数据清洗 Pipeline
主流程：读取 -> 验证 -> 异常值处理 -> 清洗 -> 输出
"""
import logging
import sys
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from config import DATA_DIR
from etl.validators import DataValidator
from etl.outlier_handler import OutlierHandler

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


class ETLPipeline:
    """数据清洗 Pipeline"""

    def __init__(self, input_path: str = None, output_path: str = None):
        self.input_path = Path(input_path or DATA_DIR / "raw_sales.csv")
        self.output_path = Path(output_path or DATA_DIR / "cleaned_sales.csv")
        self.validator = DataValidator()
        self.outlier_handler = OutlierHandler(method="iqr", multiplier=1.5)
        self.pipeline_stats: dict = {}

    def run(self) -> pd.DataFrame:
        """执行完整 ETL 流程"""
        logger.info("=" * 60)
        logger.info("  ETL Pipeline 启动")
        logger.info("=" * 60)
        start_time = datetime.now()

        # Step 1: 读取数据
        df = self._step_read_data()

        # Step 2: 数据验证
        df = self._step_validate(df)

        # Step 3: 去重
        df = self._step_deduplicate(df)

        # Step 4: 类型转换
        df = self._step_type_conversion(df)

        # Step 5: 缺失值处理
        df = self._step_handle_missing(df)

        # Step 6: 异常值处理
        df = self._step_handle_outliers(df)

        # Step 7: 派生字段
        df = self._step_feature_engineering(df)

        # Step 8: 清理临时列并输出
        df = self._step_output(df)

        elapsed = (datetime.now() - start_time).total_seconds()
        self.pipeline_stats["elapsed_seconds"] = round(elapsed, 2)
        logger.info(f"\nETL Pipeline 完成，耗时 {elapsed:.2f} 秒")
        self._print_summary()
        return df

    def _step_read_data(self) -> pd.DataFrame:
        """Step 1: 读取原始 CSV"""
        logger.info("\n[Step 1/8] 读取原始数据...")
        df = pd.read_csv(self.input_path, encoding="utf-8-sig")
        self.pipeline_stats["raw_rows"] = len(df)
        self.pipeline_stats["raw_columns"] = len(df.columns)
        logger.info(f"  读取 {len(df)} 行 x {len(df.columns)} 列")
        return df

    def _step_validate(self, df: pd.DataFrame) -> pd.DataFrame:
        """Step 2: 数据验证"""
        logger.info("\n[Step 2/8] 数据验证...")
        df, stats = self.validator.validate(df)
        self.pipeline_stats["validation"] = stats
        logger.info(self.validator.get_report())
        return df

    def _step_deduplicate(self, df: pd.DataFrame) -> pd.DataFrame:
        """Step 3: 去重"""
        logger.info("\n[Step 3/8] 去除重复行...")
        before = len(df)
        # 基于订单号 + 商品名去重
        df = df.drop_duplicates(
            subset=["order_no", "product_name"],
            keep="first",
        )
        after = len(df)
        removed = before - after
        self.pipeline_stats["duplicates_removed"] = removed
        logger.info(f"  去除重复: {before} -> {after} (移除 {removed} 条)")
        return df

    def _step_type_conversion(self, df: pd.DataFrame) -> pd.DataFrame:
        """Step 4: 类型转换"""
        logger.info("\n[Step 4/8] 数据类型转换...")
        # 日期转换 — 这里使用 format 参数确保正确解析
        df["order_date"] = pd.to_datetime(df["order_date"], format="%Y-%m-%d %H:%M:%S",
                                          errors="coerce")
        # 数值列
        numeric_cols = ["unit_price", "quantity", "subtotal", "order_total",
                        "discount", "final_amount", "shipping_fee",
                        "customer_age", "customer_vip"]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        logger.info(f"  已转换 order_date 和 {len(numeric_cols)} 个数值列")
        return df

    def _step_handle_missing(self, df: pd.DataFrame) -> pd.DataFrame:
        """Step 5: 缺失值处理"""
        logger.info("\n[Step 5/8] 缺失值处理...")
        missing_before = df.isnull().sum().sum()

        # 数值列：用中位数填充
        numeric_fill = {
            "unit_price": df["unit_price"].median(),
            "quantity": 1,
            "shipping_fee": 0,
            "discount": 0,
            "customer_age": df["customer_age"].median(),
            "customer_vip": 0,
        }
        for col, fill_val in numeric_fill.items():
            if col in df.columns:
                n_filled = df[col].isna().sum()
                if n_filled > 0:
                    df[col] = df[col].fillna(fill_val)
                    logger.info(f"  {col}: 填充 {n_filled} 条 (值={fill_val})")

        # 分类列：用众数填充
        cat_cols = ["category", "customer_region", "payment_method",
                    "status", "customer_gender"]
        for col in cat_cols:
            if col in df.columns and df[col].isna().any():
                mode_val = df[col].mode().iloc[0] if not df[col].mode().empty else "未知"
                n_filled = df[col].isna().sum()
                df[col] = df[col].fillna(mode_val)
                logger.info(f"  {col}: 填充 {n_filled} 条 (值={mode_val})")

        missing_after = df.isnull().sum().sum()
        self.pipeline_stats["missing_filled"] = int(missing_before - missing_after)
        logger.info(f"  缺失值: {missing_before} -> {missing_after}")
        return df

    def _step_handle_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """Step 6: 异常值处理"""
        logger.info("\n[Step 6/8] 异常值处理...")
        outlier_cols = ["unit_price", "quantity", "subtotal"]
        df = self.outlier_handler.detect(df, outlier_cols)
        df = self.outlier_handler.handle(df, outlier_cols, strategy="cap")
        logger.info(self.outlier_handler.get_report())
        return df

    def _step_feature_engineering(self, df: pd.DataFrame) -> pd.DataFrame:
        """Step 7: 派生字段"""
        logger.info("\n[Step 7/8] 派生字段生成...")
        # 时间维度
        if "order_date" in df.columns:
            df["order_year"] = df["order_date"].dt.year
            df["order_month"] = df["order_date"].dt.month
            df["order_day"] = df["order_date"].dt.day
            df["order_weekday"] = df["order_date"].dt.day_name()
            df["order_hour"] = df["order_date"].dt.hour
            df["is_weekend"] = df["order_date"].dt.dayofweek.isin([5, 6])
            logger.info("  生成: order_year, order_month, order_day, order_weekday, order_hour, is_weekend")

        # 折扣率
        if all(c in df.columns for c in ["discount", "order_total"]):
            df["discount_rate"] = (df["discount"] / df["order_total"]).round(4)
            df["discount_rate"] = df["discount_rate"].fillna(0)
            logger.info("  生成: discount_rate")

        # 客单价标签
        if "final_amount" in df.columns:
            df["amount_level"] = pd.cut(
                df["final_amount"],
                bins=[0, 100, 500, 2000, 10000, float("inf")],
                labels=["低", "中低", "中", "中高", "高"],
            )
            logger.info("  生成: amount_level")

        return df

    def _step_output(self, df: pd.DataFrame) -> pd.DataFrame:
        """Step 8: 输出清洗后数据"""
        logger.info("\n[Step 8/8] 输出清洗后数据...")
        # 移除临时验证列
        temp_cols = [c for c in df.columns if c.startswith("_")]
        df = df.drop(columns=temp_cols, errors="ignore")

        df.to_csv(self.output_path, index=False, encoding="utf-8-sig")
        self.pipeline_stats["cleaned_rows"] = len(df)
        self.pipeline_stats["cleaned_columns"] = len(df.columns)
        logger.info(f"  输出到 {self.output_path}")
        logger.info(f"  清洗后: {len(df)} 行 x {len(df.columns)} 列")
        return df

    def _print_summary(self):
        """打印 Pipeline 汇总"""
        s = self.pipeline_stats
        logger.info("\n" + "=" * 60)
        logger.info("  ETL Pipeline 汇总")
        logger.info("=" * 60)
        logger.info(f"  原始数据: {s.get('raw_rows', 0)} 行 x {s.get('raw_columns', 0)} 列")
        logger.info(f"  去重: 移除 {s.get('duplicates_removed', 0)} 条")
        logger.info(f"  缺失值填充: {s.get('missing_filled', 0)} 个")
        logger.info(f"  清洗后数据: {s.get('cleaned_rows', 0)} 行 x {s.get('cleaned_columns', 0)} 列")
        logger.info(f"  耗时: {s.get('elapsed_seconds', 0)} 秒")


# ============================================================
# 命令行入口
# ============================================================
if __name__ == "__main__":
    pipeline = ETLPipeline()
    cleaned_df = pipeline.run()
    print(f"\n清洗完成！输出文件: {pipeline.output_path}")
    print(f"数据概览:\n{cleaned_df.describe()}")
