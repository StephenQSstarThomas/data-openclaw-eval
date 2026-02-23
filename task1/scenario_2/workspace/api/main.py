"""
电商销售数据分析平台 — FastAPI 主程序
"""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import API_TITLE, API_VERSION, API_HOST, API_PORT, VISUALIZATION_DIR
from api.database import init_db
from api.routes.sales import router as sales_router

# ============================================================
# 创建 FastAPI 应用
# ============================================================
app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description="提供电商销售数据查询、分析、可视化接口",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ============================================================
# CORS 中间件
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# 静态文件（可视化 HTML）
# ============================================================
app.mount("/charts", StaticFiles(directory=str(VISUALIZATION_DIR)), name="charts")

# ============================================================
# 注册路由
# ============================================================
app.include_router(sales_router)

# ============================================================
# 健康检查
# ============================================================
@app.get("/health", tags=["系统"])
def health_check():
    """健康检查接口"""
    return {
        "status": "ok",
        "service": API_TITLE,
        "version": API_VERSION,
    }


@app.get("/", tags=["系统"])
def root():
    """根路径，返回 API 信息"""
    return {
        "name": API_TITLE,
        "version": API_VERSION,
        "docs": "/docs",
        "health": "/health",
    }


# ============================================================
# 启动事件
# ============================================================
@app.on_event("startup")
def on_startup():
    """应用启动时初始化数据库"""
    init_db()
    print(f"[API] {API_TITLE} v{API_VERSION} 已启动")
    print(f"[API] 文档: http://{API_HOST}:{API_PORT}/docs")


# ============================================================
# 入口
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
    )
