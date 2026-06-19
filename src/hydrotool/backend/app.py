"""
FastAPI 后端入口

提供 REST API 和 WebSocket 服务，使 Web UI 和 CLI 共享同一套核心能力。
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from hydrotool.backend.routers import device, flash, root, system
from hydrotool.backend.websocket.device_stream import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    yield
    # 关闭时


app = FastAPI(
    title="HydroTool API",
    description="安卓刷机调试一体化工具箱 — 后端 API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 配置（允许 Web UI 跨域访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发阶段允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(system.router, prefix="/api", tags=["系统"])
app.include_router(device.router, prefix="/api/devices", tags=["设备"])
app.include_router(flash.router, prefix="/api/flash", tags=["刷机"])
app.include_router(root.router, prefix="/api/root", tags=["Root"])
app.include_router(ws_router, prefix="/ws", tags=["WebSocket"])
