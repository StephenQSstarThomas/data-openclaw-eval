"""
销售数据查询接口
"""
import math
from datetime import date, datetime
from typing import Optional, List

import pandas as pd
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func

import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(ROOT_DIR))

from api.database import get_db, engine, Order, OrderItem, Product, Customer
from api.models import (
    SalesOverview, TrendResponse, TrendDataPoint,
    CategoryStat, RegionStat,
    SalesFilterRequest, FilterResponse, SalesRecord,
    GranularityEnum, APIResponse,
)

router = APIRouter(prefix="/api/sales", tags=["销售数据"])


# ============================================================
# GET /api/sales/overview — 总览统计
# ============================================================
@router.get("/overview", response_model=APIResponse, summary="销售总览统计")
def get_overview(db: Session = Depends(get_db)):
    """
    获取销售数据总览，包含：
    - 总订单数、总销售额、总客户数
    - 平均订单金额、订单完成率
    - 销售额最高品类和地区
    """
    # 基础统计
    total_orders = db.query(func.count(Order.id)).scalar()
    total_revenue = db.query(func.sum(Order.final_amount)).scalar() or 0
    total_customers = db.query(func.count(Customer.id)).scalar()
    avg_amount = round(total_revenue / max(total_orders, 1), 2)
    total_products = db.query(func.count(Product.id)).scalar()

    # 完成率
    completed = db.query(func.count(Order.id)).filter(
        Order.status == "已完成"
    ).scalar()
    completion_rate = round(completed / max(total_orders, 1) * 100, 1)

    # Top 品类 — 通过关联查询
    top_cat_query = text("""
        SELECT p.category, SUM(oi.subtotal) as total
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        GROUP BY p.category
        ORDER BY total DESC
        LIMIT 1
    """)
    top_cat_result = db.execute(top_cat_query).first()
    top_category = top_cat_result[0] if top_cat_result else "未知"

    # Top 地区
    top_region_query = text("""
        SELECT region, SUM(final_amount) as total
        FROM orders
        GROUP BY region
        ORDER BY total DESC
        LIMIT 1
    """)
    top_region_result = db.execute(top_region_query).first()
    top_region = top_region_result[0] if top_region_result else "未知"

    overview = SalesOverview(
        total_orders=total_orders,
        total_revenue=round(total_revenue, 2),
        total_customers=total_customers,
        avg_order_amount=avg_amount,
        total_products=total_products,
        completion_rate=completion_rate,
        top_category=top_category,
        top_region=top_region,
    )

    return APIResponse(data=overview.model_dump())


# ============================================================
# GET /api/sales/trend — 销售趋势
# ============================================================
@router.get("/trend", response_model=APIResponse, summary="销售趋势")
def get_trend(
    granularity: GranularityEnum = Query(
        GranularityEnum.monthly, description="时间粒度"
    ),
    db: Session = Depends(get_db),
):
    """
    获取销售趋势数据，支持 daily / weekly / monthly 三种粒度
    """
    if granularity == GranularityEnum.daily:
        group_expr = "DATE(order_date)"
    elif granularity == GranularityEnum.weekly:
        group_expr = "strftime('%Y-W%W', order_date)"
    else:
        group_expr = "strftime('%Y-%m', order_date)"

    query = text(f"""
        SELECT
            {group_expr} AS period,
            SUM(final_amount) AS revenue,
            COUNT(*) AS orders
        FROM orders
        WHERE status != '已取消'
        GROUP BY period
        ORDER BY period
    """)

    results = db.execute(query).fetchall()

    data = []
    for row in results:
        period, revenue, orders = row
        data.append(TrendDataPoint(
            period=str(period),
            revenue=round(revenue, 2),
            orders=orders,
            avg_amount=round(revenue / max(orders, 1), 2),
        ))

    response = TrendResponse(
        granularity=granularity.value,
        data=data,
        total_periods=len(data),
    )

    return APIResponse(data=response.model_dump())


# ============================================================
# GET /api/sales/by-category — 按品类统计
# ============================================================
@router.get("/by-category", response_model=APIResponse, summary="按品类统计")
def get_by_category(db: Session = Depends(get_db)):
    """获取各品类销售额、订单数、占比"""
    query = text("""
        SELECT
            p.category,
            SUM(oi.subtotal) AS revenue,
            COUNT(DISTINCT oi.order_id) AS orders,
            AVG(oi.unit_price) AS avg_price
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != '已取消'
        GROUP BY p.category
        ORDER BY revenue DESC
    """)

    results = db.execute(query).fetchall()
    total_revenue = sum(r[1] for r in results)

    data = []
    for row in results:
        cat, revenue, orders, avg_price = row
        data.append(CategoryStat(
            category=cat,
            revenue=round(revenue, 2),
            orders=orders,
            percentage=round(revenue / max(total_revenue, 1) * 100, 1),
            avg_price=round(avg_price, 2),
        ))

    return APIResponse(data=[d.model_dump() for d in data])


# ============================================================
# GET /api/sales/by-region — 按地区统计
# ============================================================
@router.get("/by-region", response_model=APIResponse, summary="按地区统计")
def get_by_region(db: Session = Depends(get_db)):
    """获取各地区销售额、订单数、占比、最畅销品类"""
    query = text("""
        SELECT
            o.region,
            SUM(o.final_amount) AS revenue,
            COUNT(*) AS orders
        FROM orders o
        WHERE o.status != '已取消'
        GROUP BY o.region
        ORDER BY revenue DESC
    """)

    results = db.execute(query).fetchall()
    total_revenue = sum(r[1] for r in results)

    data = []
    for row in results:
        region, revenue, orders = row
        # 查询该地区最畅销品类
        top_cat_query = text("""
            SELECT p.category, SUM(oi.subtotal) AS total
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.region = :region AND o.status != '已取消'
            GROUP BY p.category
            ORDER BY total DESC
            LIMIT 1
        """)
        top_result = db.execute(top_cat_query, {"region": region}).first()
        top_cat = top_result[0] if top_result else "未知"

        data.append(RegionStat(
            region=region,
            revenue=round(revenue, 2),
            orders=orders,
            percentage=round(revenue / max(total_revenue, 1) * 100, 1),
            top_category=top_cat,
        ))

    return APIResponse(data=[d.model_dump() for d in data])


# ============================================================
# POST /api/sales/filter — 复合筛选
# ============================================================
@router.post("/filter", response_model=APIResponse, summary="复合筛选查询")
def filter_sales(req: SalesFilterRequest, db: Session = Depends(get_db)):
    """
    复合条件筛选销售数据
    支持：日期范围、品类、地区、支付方式、金额范围
    返回分页结果及筛选摘要
    """
    conditions = ["1=1"]
    params = {}

    if req.start_date:
        conditions.append("DATE(o.order_date) >= :start_date")
        params["start_date"] = req.start_date.isoformat()
    if req.end_date:
        conditions.append("DATE(o.order_date) <= :end_date")
        params["end_date"] = req.end_date.isoformat()
    if req.categories:
        cat_list = ",".join(f"'{c.value}'" for c in req.categories)
        conditions.append(f"p.category IN ({cat_list})")
    if req.regions:
        reg_list = ",".join(f"'{r.value}'" for r in req.regions)
        conditions.append(f"o.region IN ({reg_list})")
    if req.payment_methods:
        pay_list = ",".join(f"'{p.value}'" for p in req.payment_methods)
        conditions.append(f"o.payment_method IN ({pay_list})")
    if req.status:
        conditions.append("o.status = :status")
        params["status"] = req.status.value
    if req.min_amount is not None:
        conditions.append("o.final_amount >= :min_amount")
        params["min_amount"] = req.min_amount
    if req.max_amount is not None:
        conditions.append("o.final_amount <= :max_amount")
        params["max_amount"] = req.max_amount

    where_clause = " AND ".join(conditions)

    # 总数查询
    count_query = text(f"""
        SELECT COUNT(*)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN customers c ON o.customer_id = c.id
        WHERE {where_clause}
    """)
    total = db.execute(count_query, params).scalar()

    # 分页查询
    offset = (req.page - 1) * req.page_size
    data_query = text(f"""
        SELECT
            o.order_no, o.order_date, c.name, o.region, o.city,
            p.category, p.name AS product_name,
            oi.quantity, oi.unit_price, oi.subtotal,
            o.payment_method, o.status
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN customers c ON o.customer_id = c.id
        WHERE {where_clause}
        ORDER BY o.order_date DESC
        LIMIT :limit OFFSET :offset
    """)
    params["limit"] = req.page_size
    params["offset"] = offset

    rows = db.execute(data_query, params).fetchall()
    records = [
        SalesRecord(
            order_no=r[0], order_date=r[1], customer_name=r[2],
            region=r[3], city=r[4], category=r[5], product_name=r[6],
            quantity=r[7], unit_price=r[8], subtotal=r[9],
            payment_method=r[10], status=r[11],
        )
        for r in rows
    ]

    # 筛选摘要
    summary_query = text(f"""
        SELECT
            SUM(o.final_amount) AS total_revenue,
            COUNT(DISTINCT o.id) AS total_orders,
            AVG(o.final_amount) AS avg_amount
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE {where_clause}
    """)
    summary_result = db.execute(summary_query, params).first()

    response = FilterResponse(
        total=total,
        page=req.page,
        page_size=req.page_size,
        total_pages=math.ceil(total / req.page_size),
        data=[r.model_dump() for r in records],
        summary={
            "total_revenue": round(summary_result[0] or 0, 2),
            "total_orders": summary_result[1] or 0,
            "avg_amount": round(summary_result[2] or 0, 2),
        },
    )

    return APIResponse(data=response.model_dump())
