"""
系统管理路由

健康检查、系统信息、环境检测等。
"""

import platform
import shutil
import sys

from fastapi import APIRouter

from hydrotool.backend.models import SystemInfoResponse
from hydrotool.core.adb.client import AdbClient

router = APIRouter()
adb = AdbClient()


@router.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "service": "hydrotool-api"}


@router.get("/system", response_model=SystemInfoResponse)
async def get_system_info():
    """获取系统环境信息"""
    import hydrotool

    adb_path = shutil.which("adb")
    fastboot_path = shutil.which("fastboot")

    info = SystemInfoResponse(
        version=hydrotool.__version__,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        platform=f"{platform.system()} {platform.release()}",
        adb_available=adb_path is not None,
        fastboot_available=fastboot_path is not None,
    )

    if adb_path:
        try:
            info.adb_version = await adb.version()
        except Exception:
            info.adb_version = "无法获取版本"

    return info
