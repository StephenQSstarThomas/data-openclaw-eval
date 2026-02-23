"""
数据质量验证脚本
一键检查 CSV 和 SQLite 数据的完整性和一致性
"""
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from config import DATA_DIR, DB_PATH
from api.database import engine


def verify_csv_data():
    """验证 CSV 数据"""
    print("=" * 60)
    print("  CSV 数据质量报告")
    print("=" * 60)

    # 原始数据
    raw_path = DATA_DIR / "raw_sales.csv"
    if raw_path.exists():
        raw = pd.read_csv(raw_path, encoding="utf-8-sig")
        print(f"\n[raw_sales.csv]")
        print(f"  行数: {len(raw)}")
        print(f"  列数: {len(raw.columns)}")
        print(f"  缺失值总数: {raw.isnull().sum().sum()}")
        print(f"  重复行数: {raw.duplicated().sum()}")
        # 检查日期格式
        date_col = raw["order_date"]
        slash_dates = date_col.str.contains("/", na=False).sum()
        dash_dates = date_col.str.contains("-", na=False).sum()
        print(f"  日期格式 '/' 分隔: {slash_dates}")
        print(f"  日期格式 '-' 分隔: {dash_dates}")
    else:
        print(f"  [WARNING] {raw_path} 不存在")

    # 清洗后数据
    cleaned_path = DATA_DIR / "cleaned_sales.csv"
    if cleaned_path.exists():
        cleaned = pd.read_csv(cleaned_path, encoding="utf-8-sig")
        print(f"\n[cleaned_sales.csv]")
        print(f"  行数: {len(cleaned)}")
        print(f"  列数: {len(cleaned.columns)}")
        print(f"  缺失值总数: {cleaned.isnull().sum().sum()}")
        print(f"  新增派生列: {[c for c in cleaned.columns if c.startswith('order_') and c not in raw.columns]}")

        # 数值范围检查
        print(f"\n  数值范围检查:")
        for col in ["unit_price", "quantity", "subtotal", "final_amount"]:
            if col in cleaned.columns:
                print(f"    {col}: [{cleaned[col].min():.2f}, {cleaned[col].max():.2f}]"
                      f"  均值={cleaned[col].mean():.2f}")

        # 品类分布
        print(f"\n  品类分布:")
        for cat, count in cleaned["category"].value_counts().items():
            print(f"    {cat}: {count} ({count/len(cleaned)*100:.1f}%)")
    else:
        print(f"  [WARNING] {cleaned_path} 不存在")


def verify_db_data():
    """验证数据库数据"""
    print("\n" + "=" * 60)
    print("  SQLite 数据库质量报告")
    print("=" * 60)

    if not DB_PATH.exists():
        print(f"  [WARNING] 数据库 {DB_PATH} 不存在")
        return

    with engine.connect() as conn:
        # 表记录数
        tables = ["customers", "products", "orders", "order_items"]
        print(f"\n  记录数统计:")
        for table in tables:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"    {table}: {count}")

        # 索引检查
        indexes = conn.execute(
            text("SELECT name, tbl_name FROM sqlite_master WHERE type='index'")
        ).fetchall()
        print(f"\n  索引数量: {len(indexes)}")
        for idx_name, tbl_name in indexes:
            print(f"    {idx_name} -> {tbl_name}")

        # 数据一致性
        print(f"\n  一致性检查:")
        # 订单金额一致性
        check = conn.execute(text("""
            SELECT COUNT(*)
            FROM orders o
            WHERE ABS(o.final_amount - (o.total_amount - o.discount)) > 0.01
        """)).scalar()
        print(f"    订单金额不一致: {check} 条")

        # 孤立订单明细
        orphan_items = conn.execute(text("""
            SELECT COUNT(*)
            FROM order_items oi
            LEFT JOIN orders o ON oi.order_id = o.id
            WHERE o.id IS NULL
        """)).scalar()
        print(f"    孤立订单明细: {orphan_items} 条")

        # 订单状态分布
        print(f"\n  订单状态分布:")
        statuses = conn.execute(text("""
            SELECT status, COUNT(*) as cnt
            FROM orders
            GROUP BY status
            ORDER BY cnt DESC
        """)).fetchall()
        for status, cnt in statuses:
            print(f"    {status}: {cnt}")


def main():
    print("电商数据质量验证\n")
    verify_csv_data()
    verify_db_data()
    print("\n" + "=" * 60)
    print("  验证完成")
    print("=" * 60)


if __name__ == "__main__":
    main()
