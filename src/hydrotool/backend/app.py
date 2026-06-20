"""
FastAPI 后端入口

提供 REST API、WebSocket 服务，以及 Web UI 静态文件服务。
"""

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from hydrotool.backend.routers import device, flash, root, system, ai, rom, module, hide
from hydrotool.backend.websocket.device_stream import router as ws_router
from hydrotool.backend.websocket.flash_stream import router as flash_ws_router


def _find_frontend_dir() -> Path:
    """查找前端静态文件目录（兼容 PyInstaller 打包）"""
    # PyInstaller 打包后
    if hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS) / "frontend" / "dist"

    # 开发环境
    candidates = [
        Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist",
        Path.cwd() / "frontend" / "dist",
    ]
    for d in candidates:
        if (d / "index.html").exists():
            return d
    return candidates[0]

FRONTEND_DIR = _find_frontend_dir()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="HydroTool API",
    description="安卓刷机调试一体化工具箱 — 后端 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 路由
app.include_router(system.router, prefix="/api", tags=["系统"])
app.include_router(device.router, prefix="/api/devices", tags=["设备"])
app.include_router(flash.router, prefix="/api/flash", tags=["刷机"])
app.include_router(root.router, prefix="/api/root", tags=["Root"])
app.include_router(module.router, prefix="/api/modules", tags=["模块"])
app.include_router(hide.router, prefix="/api/hide", tags=["环境隐藏"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI 自动"])
app.include_router(rom.router, prefix="/api/rom", tags=["ROM 工具箱"])
app.include_router(ws_router, prefix="/ws", tags=["WebSocket"])
app.include_router(flash_ws_router, prefix="/ws", tags=["刷机WebSocket"])

# 静态文件（Web UI）
if FRONTEND_DIR.exists() and (FRONTEND_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
