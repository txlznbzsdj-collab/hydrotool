"""
刷机 API 路由
"""

import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket

from hydrotool.backend.models import FlashRequest, FlashTaskResponse
from hydrotool.core.fastboot.client import FastbootClient

router = APIRouter()
fb = FastbootClient()


@router.post("/partition", response_model=FlashTaskResponse)
async def flash_partition(req: FlashRequest):
    """刷写分区镜像"""
    # 验证设备是否在 Fastboot 模式
    if not await fb.is_device_connected(req.serial):
        raise HTTPException(status_code=400, detail="设备不在 Fastboot 模式")

    task_id = str(uuid.uuid4())[:8]
    try:
        result = await fb.flash(req.partition, req.image_path, req.serial, req.slot or "")
        return FlashTaskResponse(task_id=task_id, status="completed", message=result)
    except Exception as e:
        return FlashTaskResponse(task_id=task_id, status="failed", message=str(e))


@router.get("/devices")
async def list_fastboot_devices():
    """列出 Fastboot 模式下的设备"""
    devices = await fb.devices()
    return {"devices": devices}
