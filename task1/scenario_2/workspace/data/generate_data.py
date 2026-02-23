"""
电商销售模拟数据生成器
生成 10000 条订单数据，写入 SQLite 和 CSV
"""
import random
import csv
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

import pandas as pd

# 添加项目根目录到 path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from config import (
    CATEGORIES, REGIONS, PAYMENT_METHODS, ORDER_STATUSES,
    TOTAL_RECORDS, DATE_RANGE_DAYS, RANDOM_SEED, DATA_DIR, DB_PATH
)
from api.database import (
    engine, SessionLocal, init_db,
    Customer, Product, Order, OrderItem, Base
)

# 固定随机种子
random.seed(RANDOM_SEED)

# ============================================================
# 姓名池
# ============================================================
LAST_NAMES = "王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗"
FIRST_NAMES_MALE = ["伟", "强", "磊", "军", "勇", "明", "杰", "浩", "涛", "鹏"]
FIRST_NAMES_FEMALE = ["芳", "娜", "敏", "静", "丽", "燕", "艳", "玲", "婷", "雪"]


def generate_name(gender: str) -> str:
    """生成随机中文姓名"""
    last = random.choice(list(LAST_NAMES))
    if gender == "男":
        first = random.choice(FIRST_NAMES_MALE)
    else:
        first = random.choice(FIRST_NAMES_FEMALE)
    return last + first


def generate_email(name: str, idx: int) -> str:
    """生成邮箱"""
    domains = ["qq.com", "163.com", "gmail.com", "foxmail.com", "outlook.com"]
    return f"user_{idx}@{random.choice(domains)}"


def generate_phone() -> str:
    """生成手机号"""
    prefixes = ["130", "131", "132", "135", "136", "137", "138", "139",
                "150", "151", "152", "155", "156", "157", "158", "159",
                "170", "176", "177", "178", "180", "181", "182", "183"]
    return random.choice(prefixes) + "".join([str(random.randint(0, 9)) for _ in range(8)])


# ============================================================
# 商品生成
# ============================================================
PRODUCT_NAMES = {
    "电子产品": ["智能手机", "蓝牙耳机", "平板电脑", "智能手表", "笔记本电脑",
                "移动电源", "机械键盘", "显示器", "路由器", "摄像头"],
    "服装":     ["T恤衫", "牛仔裤", "运动鞋", "羽绒服", "连衣裙",
                "休闲裤", "衬衫", "卫衣", "外套", "短裤"],
    "食品":     ["坚果礼盒", "牛肉干", "巧克力", "饼干礼包", "蜂蜜",
                "茶叶", "咖啡豆", "奶粉", "麦片", "果脯"],
    "家居":     ["台灯", "收纳箱", "床品四件套", "毛巾套装", "保温杯",
                "垃圾桶", "置物架", "香薰蜡烛", "靠枕", "花瓶"],
    "图书":     ["Python编程", "数据分析实战", "机器学习入门", "经济学原理", "三体",
                "百年孤独", "时间简史", "人类简史", "算法导论", "设计模式"],
}


def generate_products() -> List[Dict]:
    """生成商品数据"""
    products = []
    pid = 1
    for category, info in CATEGORIES.items():
        names = PRODUCT_NAMES[category]
        brands = info["brands"]
        for name in names:
            brand = random.choice(brands)
            price = round(random.uniform(info["min_price"], info["max_price"]), 2)
            cost = round(price * random.uniform(0.3, 0.7), 2)
            stock = random.randint(50, 5000)
            products.append({
                "id": pid,
                "name": f"{brand} {name}",
                "category": category,
                "brand": brand,
                "price": price,
                "cost": cost,
                "stock": stock,
                "description": f"{brand}品牌 {name}，品质保证",
            })
            pid += 1
    return products


# ============================================================
# 客户生成
# ============================================================
def generate_customers(n: int = 2000) -> List[Dict]:
    """生成客户数据"""
    customers = []
    today = datetime.now()
    for i in range(1, n + 1):
        gender = random.choice(["男", "女"])
        name = generate_name(gender)
        region = random.choice(list(REGIONS.keys()))
        city = random.choice(REGIONS[region])
        reg_days_ago = random.randint(30, 730)
        customers.append({
            "id": i,
            "name": name,
            "email": generate_email(name, i),
            "phone": generate_phone(),
            "gender": gender,
            "age": random.randint(18, 65),
            "region": region,
            "city": city,
            "register_date": (today - timedelta(days=reg_days_ago)).date(),
            "vip_level": random.choices([0, 1, 2, 3, 4, 5],
                                        weights=[30, 25, 20, 15, 7, 3])[0],
        })
    return customers


# ============================================================
# 订单生成
# ============================================================
def generate_order_no(idx: int, date: datetime) -> str:
    """生成订单号: ORD + 日期 + 序号"""
    return f"ORD{date.strftime('%Y%m%d')}{idx:06d}"


def generate_orders(customers: List[Dict], products: List[Dict],
                    n: int = TOTAL_RECORDS) -> Tuple[List[Dict], List[Dict]]:
    """生成订单和订单明细"""
    orders = []
    order_items = []
    today = datetime.now()
    item_id = 1

    for i in range(1, n + 1):
        customer = random.choice(customers)
        days_ago = random.randint(0, DATE_RANGE_DAYS)
        order_date = today - timedelta(
            days=days_ago,
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )

        # 每个订单包含 1-5 个商品
        num_items = random.choices([1, 2, 3, 4, 5], weights=[35, 30, 20, 10, 5])[0]
        selected_products = random.sample(products, min(num_items, len(products)))

        total = 0.0
        current_items = []
        for prod in selected_products:
            qty = random.randint(1, 3)
            subtotal = round(prod["price"] * qty, 2)
            total += subtotal
            current_items.append({
                "id": item_id,
                "order_id": i,
                "product_id": prod["id"],
                "quantity": qty,
                "unit_price": prod["price"],
                "subtotal": subtotal,
            })
            item_id += 1

        total = round(total, 2)
        discount = round(total * random.choice([0, 0, 0, 0.05, 0.1, 0.15, 0.2]), 2)
        final = round(total - discount, 2)
        shipping = round(random.choice([0, 0, 0, 5, 8, 10, 12, 15]), 2)
        status = random.choices(
            ORDER_STATUSES,
            weights=[60, 15, 10, 10, 5],
        )[0]

        orders.append({
            "id": i,
            "order_no": generate_order_no(i, order_date),
            "customer_id": customer["id"],
            "order_date": order_date,
            "total_amount": total,
            "discount": discount,
            "final_amount": final,
            "payment_method": random.choice(PAYMENT_METHODS),
            "status": status,
            "shipping_fee": shipping,
            "region": customer["region"],
            "city": customer["city"],
        })
        order_items.extend(current_items)

    return orders, order_items


# ============================================================
# 写入数据库与 CSV
# ============================================================
def save_to_database(customers, products, orders, order_items):
    """将数据写入 SQLite"""
    init_db()
    session = SessionLocal()
    try:
        # 写入客户
        for c in customers:
            session.add(Customer(**c))
        session.commit()
        print(f"[DB] 写入 {len(customers)} 条客户记录")

        # 写入商品
        for p in products:
            session.add(Product(**p))
        session.commit()
        print(f"[DB] 写入 {len(products)} 条商品记录")

        # 写入订单
        for o in orders:
            session.add(Order(**o))
        session.commit()
        print(f"[DB] 写入 {len(orders)} 条订单记录")

        # 写入订单明细
        for item in order_items:
            session.add(OrderItem(**item))
        session.commit()
        print(f"[DB] 写入 {len(order_items)} 条订单明细记录")

    except Exception as e:
        session.rollback()
        print(f"[ERROR] 数据库写入失败: {e}")
        raise
    finally:
        session.close()


def save_to_csv(orders, order_items, products, customers):
    """将关联后的数据导出为 CSV"""
    # 构建产品和客户的查找字典
    prod_map = {p["id"]: p for p in products}
    cust_map = {c["id"]: c for c in customers}

    rows = []
    for item in order_items:
        order = next(o for o in orders if o["id"] == item["order_id"])
        prod = prod_map[item["product_id"]]
        cust = cust_map[order["customer_id"]]
        rows.append({
            "order_no": order["order_no"],
            "order_date": order["order_date"].strftime("%Y-%m-%d %H:%M:%S"),
            "customer_name": cust["name"],
            "customer_region": cust["region"],
            "customer_city": cust["city"],
            "customer_age": cust["age"],
            "customer_gender": cust["gender"],
            "customer_vip": cust["vip_level"],
            "product_name": prod["name"],
            "category": prod["category"],
            "brand": prod["brand"],
            "unit_price": item["unit_price"],
            "quantity": item["quantity"],
            "subtotal": item["subtotal"],
            "order_total": order["total_amount"],
            "discount": order["discount"],
            "final_amount": order["final_amount"],
            "payment_method": order["payment_method"],
            "status": order["status"],
            "shipping_fee": order["shipping_fee"],
        })

    df = pd.DataFrame(rows)
    csv_path = DATA_DIR / "raw_sales.csv"
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    print(f"[CSV] 导出 {len(rows)} 条记录到 {csv_path}")
    return df


# ============================================================
# 主函数
# ============================================================
def main():
    print("=" * 60)
    print("  电商销售模拟数据生成器")
    print("=" * 60)

    print("\n[1/4] 生成商品数据...")
    products = generate_products()
    print(f"       共 {len(products)} 种商品")

    print("[2/4] 生成客户数据...")
    customers = generate_customers(2000)
    print(f"       共 {len(customers)} 位客户")

    print("[3/4] 生成订单数据...")
    orders, order_items = generate_orders(customers, products)
    print(f"       共 {len(orders)} 个订单，{len(order_items)} 条明细")

    print("[4/4] 保存数据...")
    save_to_database(customers, products, orders, order_items)
    df = save_to_csv(orders, order_items, products, customers)

    print("\n" + "=" * 60)
    print("  数据生成完成！")
    print(f"  数据库: {DB_PATH}")
    print(f"  CSV: {DATA_DIR / 'raw_sales.csv'}")
    print(f"  总订单数: {len(orders)}")
    print(f"  总明细数: {len(order_items)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
