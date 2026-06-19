"""
Root 管理 API 路由
"""

from fastapi import APIRouter, HTTPException

from hydrotool.backend.models import RootStatusResponse
from hydrotool.core.adb.client import AdbClient

router = APIRouter()
adb = AdbClient()


@router.get("/status/{serial}", response_model=RootStatusResponse)
async def get_root_status(serial: str):
    """检测设备 Root 状态"""
    if not await adb.is_device_connected(serial):
        raise HTTPException(status_code=400, detail=f"设备 {serial} 未通过 ADB 连接")

    info = await adb.get_device_info(serial)
    return RootStatusResponse(
        is_rooted=bool(info.root_method),
        root_method=info.root_method,
        bootloader_unlocked=info.bootloader_unlocked,
        can_root=info.bootloader_unlocked,
    )
