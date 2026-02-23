"""
数据库连接与 ORM 模型定义
使用 SQLite + SQLAlchemy
"""
import sqlite3
from datetime import datetime
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date,
    ForeignKey, Text, Boolean, Index, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

import sys
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import DATABASE_URL, DB_PATH

# ============================================================
# SQLAlchemy 引擎与会话
# ============================================================
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# ============================================================
# ORM 模型
# ============================================================
class Customer(Base):
    """客户表"""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    phone = Column(String(20))
    gender = Column(String(4))             # 男 / 女
    age = Column(Integer)
    region = Column(String(20))            # 大区
    city = Column(String(30))              # 城市
    register_date = Column(Date)
    vip_level = Column(Integer, default=0) # 0-5

    orders = relationship("Order", back_populates="customer")

    def __repr__(self):
        return f"<Customer(id={self.id}, name='{self.name}', region='{self.region}')>"


class Product(Base):
    """商品表"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    category = Column(String(20), nullable=False)  # 电子产品/服装/食品/家居/图书
    brand = Column(String(50))
    price = Column(Float, nullable=False)
    cost = Column(Float)                            # 成本价
    stock = Column(Integer, default=0)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    order_items = relationship("OrderItem", back_populates="product")

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', category='{self.category}')>"


class Order(Base):
    """订单表"""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(String(30), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    order_date = Column(DateTime, nullable=False)
    total_amount = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    final_amount = Column(Float, nullable=False)
    payment_method = Column(String(20))
    status = Column(String(10))                # 已完成/已发货/待发货/已取消/已退款
    shipping_fee = Column(Float, default=0.0)
    region = Column(String(20))
    city = Column(String(30))

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")

    def __repr__(self):
        return f"<Order(id={self.id}, order_no='{self.order_no}', total={self.total_amount})>"


class OrderItem(Base):
    """订单明细表"""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


# ============================================================
# 索引（初始阶段暂不添加额外索引，Round 6 优化时添加）
# ============================================================

# ============================================================
# 建表
# ============================================================
def init_db():
    """创建所有表"""
    Base.metadata.create_all(bind=engine)
    print(f"[DB] 数据库已初始化: {DB_PATH}")


def get_db():
    """FastAPI 依赖注入用"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
