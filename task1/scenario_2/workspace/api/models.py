"""
Pydantic 请求/响应模型
用于 FastAPI 的请求验证和响应序列化
"""
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field


# ============================================================
# 枚举类型
# ============================================================
class GranularityEnum(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class CategoryEnum(str, Enum):
    electronics = "电子产品"
    clothing = "服装"
    food = "食品"
    home = "家居"
    books = "图书"


class RegionEnum(str, Enum):
    north = "华北"
    east = "华东"
    south = "华南"
    central = "华中"
    southwest = "西南"
    northeast = "东北"


class PaymentEnum(str, Enum):
    alipay = "支付宝"
    wechat = "微信支付"
    bank = "银行卡"
    credit = "信用卡"
    cod = "货到付款"


class OrderStatusEnum(str, Enum):
    completed = "已完成"
    shipped = "已发货"
    pending = "待发货"
    cancelled = "已取消"
    refunded = "已退款"


# ============================================================
# 响应模型
# ============================================================
class SalesOverview(BaseModel):
    """销售总览"""
    total_orders: int = Field(..., description="总订单数")
    total_revenue: float = Field(..., description="总销售额")
    total_customers: int = Field(..., description="总客户数")
    avg_order_amount: float = Field(..., description="平均订单金额")
    total_products: int = Field(..., description="商品种类数")
    completion_rate: float = Field(..., description="订单完成率 (%)")
    top_category: str = Field(..., description="销售额最高品类")
    top_region: str = Field(..., description="销售额最高地区")


class TrendDataPoint(BaseModel):
    """趋势数据点"""
    period: str = Field(..., description="时间段")
    revenue: float = Field(..., description="销售额")
    orders: int = Field(..., description="订单数")
    avg_amount: float = Field(..., description="平均金额")


class TrendResponse(BaseModel):
    """趋势响应"""
    granularity: str
    data: List[TrendDataPoint]
    total_periods: int


class CategoryStat(BaseModel):
    """品类统计"""
    category: str = Field(..., description="品类名称")
    revenue: float = Field(..., description="销售额")
    orders: int = Field(..., description="订单数")
    percentage: float = Field(..., description="占比 (%)")
    avg_price: float = Field(..., description="平均单价")


class RegionStat(BaseModel):
    """地区统计"""
    region: str = Field(..., description="地区")
    revenue: float = Field(..., description="销售额")
    orders: int = Field(..., description="订单数")
    percentage: float = Field(..., description="占比 (%)")
    top_category: str = Field(..., description="该地区最畅销品类")


class SalesFilterRequest(BaseModel):
    """复合筛选请求"""
    start_date: Optional[date] = Field(None, description="开始日期")
    end_date: Optional[date] = Field(None, description="结束日期")
    categories: Optional[List[CategoryEnum]] = Field(None, description="品类列表")
    regions: Optional[List[RegionEnum]] = Field(None, description="地区列表")
    payment_methods: Optional[List[PaymentEnum]] = Field(None, description="支付方式列表")
    status: Optional[OrderStatusEnum] = Field(None, description="订单状态")
    min_amount: Optional[float] = Field(None, ge=0, description="最小金额")
    max_amount: Optional[float] = Field(None, ge=0, description="最大金额")
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页条数")


class SalesRecord(BaseModel):
    """销售记录"""
    order_no: str
    order_date: datetime
    customer_name: str
    region: str
    city: str
    category: str
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float
    payment_method: str
    status: str


class FilterResponse(BaseModel):
    """筛选响应"""
    total: int = Field(..., description="总记录数")
    page: int
    page_size: int
    total_pages: int
    data: List[SalesRecord]
    summary: Dict[str, Any] = Field(default_factory=dict, description="筛选结果摘要")


class APIResponse(BaseModel):
    """通用 API 响应"""
    code: int = Field(200, description="状态码")
    message: str = Field("success", description="消息")
    data: Any = Field(None, description="数据")
