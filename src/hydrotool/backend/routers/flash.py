"""
刷机 API 路由 — 异步任务版

POST /api/flash/partition    — 刷写分区（异步）
POST /api/flash/boot         — 刷入 boot.img（异步）
POST /api/flash/flash-all    — 整包刷写（异步）
POST /api/flash/erase        — 擦除分区（异步）
POST /api/flash/reboot       — 模式切换
POST /api/flash/unlock       — OEM 解锁
POST /api/flash/lock         — OEM 锁定
GET  /api/flash/slots/{serial}         — 槽位信息
POST /api/flash/slots/{serial}/switch  — 切换槽位
GET  /api/flash/tasks/{task_id}        — 任务查询
GET  /api/flash/devices                — Fastboot 设备列表
"""

import asyncio
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException

from hydrotool.backend.models import (
    FlashBootRequest,
    FlashEraseRequest,
    FlashPartitionRequest,
    FlashRebootRequest,
    FlashUnlockRequest,
    SlotSwitchRequest,
    FlashTaskAcceptedResponse,
    FlashTaskDetailResponse,
    FlashLogEntry,
    SlotInfoResponse,
    FastbootDeviceInfo,
    FastbootDeviceListResponse,
)
from hydrotool.backend.services.task_manager import task_manager
from hydrotool.core.fastboot.client import FastbootClient

router = APIRouter()


# ============================================================
# 辅助函数
# ============================================================

def _check_file(path: str) -> None:
    """校验文件存在"""
    if not path or not Path(path).is_file():
        raise HTTPException(status_code=400, detail=f"镜像文件不存在: {path}")


async def _get_fb() -> FastbootClient:
    """获取 Fastboot 客户端"""
    return FastbootClient()


async def _flash_partition_task(task_id: str, serial: str, partition: str, image_path: str, slot: str = ""):
    """后台任务：刷写单个分区"""
    try:
        fb = await _get_fb()
        await task_manager.update_progress(task_id, 5, "正在连接设备...")
        await task_manager.add_log(task_id, "info", f"目标设备: {serial}")

        step = f"刷写 {partition} 分区"
        await task_manager.update_progress(task_id, 15, step, step)
        await task_manager.add_log(task_id, "info", f"镜像: {image_path}")

        result = await fb.flash(partition, image_path, serial, slot)
        await task_manager.update_progress(task_id, 90, "刷写完成，正在验证...")
        await task_manager.add_log(task_id, "success", result)

        await task_manager.complete_task(task_id, True, f"{partition} 刷写完成")
    except Exception as e:
        await task_manager.add_log(task_id, "error", str(e))
        await task_manager.complete_task(task_id, False, str(e))


async def _flash_boot_task(task_id: str, serial: str, image_path: str):
    """后台任务：刷入 boot.img"""
    try:
        fb = await _get_fb()
        await task_manager.update_progress(task_id, 10, "刷入 boot.img...", "刷入 boot.img")
        await task_manager.add_log(task_id, "info", f"设备: {serial}, 镜像: {image_path}")

        result = await fb.flash("boot", image_path, serial)
        await task_manager.add_log(task_id, "success", result)
        await task_manager.complete_task(task_id, True, "boot.img 刷入完成，请重启设备")
    except Exception as e:
        await task_manager.add_log(task_id, "error", str(e))
        await task_manager.complete_task(task_id, False, str(e))


async def _flash_all_task(task_id: str, serial: str, image_path: str):
    """后台任务：整包刷写"""
    try:
        fb = await _get_fb()
        await task_manager.update_progress(task_id, 10, "整包刷写中...", "整包刷写")
        await task_manager.add_log(task_id, "info", f"fastboot flashall {image_path}")

        result = await fb.flash_all(serial)
        await task_manager.add_log(task_id, "success", result)
        await task_manager.complete_task(task_id, True, "整包刷写完成")
    except Exception as e:
        await task_manager.add_log(task_id, "error", str(e))
        await task_manager.complete_task(task_id, False, str(e))


async def _flash_erase_task(task_id: str, serial: str, partition: str):
    """后台任务：擦除分区"""
    try:
        fb = await _get_fb()
        await task_manager.update_progress(task_id, 20, f"擦除 {partition}...", f"擦除 {partition}")
        await task_manager.add_log(task_id, "info", f"fastboot erase {partition}")

        result = await fb.erase(partition, serial)
        await task_manager.add_log(task_id, "success", result)
        await task_manager.complete_task(task_id, True, f"{partition} 擦除完成")
    except Exception as e:
        await task_manager.add_log(task_id, "error", str(e))
        await task_manager.complete_task(task_id, False, str(e))


# ============================================================
# 异步刷写端点
# ============================================================

@router.post("/partition", response_model=FlashTaskAcceptedResponse)
async def flash_partition(req: FlashPartitionRequest):
    """刷写单个分区（异步任务）"""
    _check_file(req.image_path)
    task_id = task_manager.create_task("flash")
    asyncio.create_task(_flash_partition_task(task_id, req.serial, req.partition, req.image_path, req.slot or ""))
    return FlashTaskAcceptedResponse(task_id=task_id, message=f"开始刷写 {req.partition}")


@router.post("/boot", response_model=FlashTaskAcceptedResponse)
async def flash_boot(req: FlashBootRequest):
    """刷入 boot.img（异步任务）"""
    _check_file(req.image_path)
    task_id = task_manager.create_task("flash_boot")
    asyncio.create_task(_flash_boot_task(task_id, req.serial, req.image_path))
    return FlashTaskAcceptedResponse(task_id=task_id, message="开始刷入 boot.img")


@router.post("/flash-all", response_model=FlashTaskAcceptedResponse)
async def flash_all(req: FlashBootRequest):
    """整包刷写（异步任务）"""
    task_id = task_manager.create_task("flash_all")
    asyncio.create_task(_flash_all_task(task_id, req.serial, req.image_path))
    return FlashTaskAcceptedResponse(task_id=task_id, message="开始整包刷写")


@router.post("/erase", response_model=FlashTaskAcceptedResponse)
async def flash_erase(req: FlashEraseRequest):
    """擦除分区（异步任务）"""
    task_id = task_manager.create_task("erase")
    asyncio.create_task(_flash_erase_task(task_id, req.serial, req.partition))
    return FlashTaskAcceptedResponse(task_id=task_id, message=f"开始擦除 {req.partition}")


# ============================================================
# 同步操作端点
# ============================================================

@router.post("/reboot")
async def flash_reboot(req: FlashRebootRequest):
    """模式切换"""
    fb = await _get_fb()
    try:
        if req.target == "bootloader":
            await fb.reboot_bootloader(req.serial)
        elif req.target == "fastbootd":
            await fb.reboot_fastbootd(req.serial) if hasattr(fb, "reboot_fastbootd") else await fb.reboot_bootloader(req.serial)
        else:
            await fb.reboot(req.serial)
        return {"status": "ok", "message": f"设备正在重启到 {req.target}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unlock")
async def flash_unlock(req: FlashUnlockRequest):
    """OEM 解锁"""
    fb = await _get_fb()
    try:
        result = await fb.oem_unlock(req.serial)
        return {"status": "ok", "message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lock")
async def flash_lock(req: FlashUnlockRequest):
    """OEM 锁定"""
    fb = await _get_fb()
    try:
        result = await fb.oem_lock(req.serial)
        return {"status": "ok", "message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 槽位管理
# ============================================================

@router.get("/slots/{serial}", response_model=SlotInfoResponse)
async def get_slots(serial: str):
    """获取设备 A/B 槽位信息"""
    fb = await _get_fb()
    try:
        current_raw = await fb.get_var("current-slot", serial)
        current = current_raw.strip() if current_raw else "unknown"
        slots = ["a", "b"]
        ab_support = current != "unknown"
        return SlotInfoResponse(
            serial=serial,
            current_slot=current,
            slots=slots,
            ab_support=ab_support,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/slots/{serial}/switch")
async def switch_slot(serial: str, req: SlotSwitchRequest):
    """切换 A/B 槽位"""
    fb = await _get_fb()
    try:
        result = await fb.set_slot(req.slot, serial)
        return {"status": "ok", "message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 任务查询
# ============================================================

@router.get("/tasks/{task_id}", response_model=FlashTaskDetailResponse)
async def get_task(task_id: str):
    """查询任务状态"""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return FlashTaskDetailResponse(**task)


# ============================================================
# 设备列表
# ============================================================

@router.get("/devices", response_model=FastbootDeviceListResponse)
async def list_devices():
    """获取 Fastboot 设备列表"""
    fb = await _get_fb()
    try:
        raw = await fb.devices()
        devices = []
        for d in raw:
            try:
                mode = await fb.get_mode(d["serial"])
            except Exception:
                mode = ""
            unlocked = None
            try:
                var = await fb.get_var("unlocked", d["serial"])
                unlocked = "unlocked" in var.lower() if var else None
            except Exception:
                pass
            devices.append(FastbootDeviceInfo(
                serial=d["serial"],
                status=d.get("status", ""),
                mode=mode or "",
                unlocked=unlocked,
            ))
        return FastbootDeviceListResponse(devices=devices)
    except Exception as e:
        return FastbootDeviceListResponse(devices=[])
