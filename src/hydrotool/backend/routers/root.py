"""
Root 管理 API 路由
"""

from fastapi import APIRouter, HTTPException

from hydrotool.core.adb.client import AdbClient

router = APIRouter()
adb = AdbClient()
