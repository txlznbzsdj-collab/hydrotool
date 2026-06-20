"""
设备管理 API 路由
"""

from typing import Optional

from fastapi import APIRouter, HTTPException

from hydrotool.backend.models import (
    DeviceInfoResponse,
    DeviceListItem,
    DeviceListResponse,
    DeviceModeResponse,
)
from hydrotool.core.adb.client import AdbClient
from hydrotool.core.fastboot.client import FastbootClient
from hydrotool.core.device import MODE_LABELS

router = APIRouter()
adb = AdbClient()
fb = FastbootClient()


@router.get("", response_model=DeviceListResponse)
async def list_devices():
    """列出所有已连接的设备（含简要信息）"""
    import asyncio
    devices = []

    try:
        adb_devices = await adb.devices()
        # 并发获取每个 ADB 设备的详细信息
        async def _get_adb_info(d: dict) -> DeviceListItem:
            try:
                info = await adb.get_device_info(d["serial"])
                return DeviceListItem(
                    serial=d["serial"], type="adb", status=d["status"],
                    model=info.model or "", brand=info.brand or "",
                    android_version=info.android_version or "",
                    sdk=info.sdk or 0,
                    bootloader_unlocked=info.bootloader_unlocked,
                    root_method=info.root_method or "",
                    current_slot=info.current_slot or "",
                )
            except Exception:
                return DeviceListItem(serial=d["serial"], type="adb", status=d["status"])

        tasks = [_get_adb_info(d) for d in adb_devices]
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, DeviceListItem):
                    devices.append(r)
                elif isinstance(r, Exception):
                    pass  # skip failed devices
    except (FileNotFoundError, Exception):
        pass

    try:
        fb_devices = await fb.devices()
        for d in fb_devices:
            try:
                info = await fb.get_all_vars(d["serial"])
                devices.append(DeviceListItem(
                    serial=d["serial"], type="fastboot", status=d["status"],
                    model=info.get("product", ""),
                    brand=info.get("vendor", ""),
                    bootloader_unlocked=info.get("unlocked", "").lower() == "yes",
                    current_slot=info.get("current-slot", ""),
                ))
            except Exception:
                devices.append(DeviceListItem(serial=d["serial"], type="fastboot", status=d["status"]))
    except (FileNotFoundError, Exception):
        pass

    return DeviceListResponse(devices=devices)


@router.get("/{serial}", response_model=DeviceInfoResponse)
async def get_device_info(serial: str):
    """获取指定设备的详细信息"""
    # 尝试 ADB
    if await adb.is_device_connected(serial):
        info = await adb.get_device_info(serial)
        return DeviceInfoResponse(**info.to_dict())

    # 尝试 Fastboot
    if await fb.is_device_connected(serial):
        vars_dict = await fb.get_all_vars(serial)
        return DeviceInfoResponse(
            serial=serial,
            model=vars_dict.get("product", ""),
            brand=vars_dict.get("vendor", ""),
            bootloader_unlocked=vars_dict.get("unlocked", "").lower() == "yes",
            ab_support=bool(vars_dict.get("current-slot", "")),
            current_slot=vars_dict.get("current-slot", ""),
        )

    raise HTTPException(status_code=404, detail=f"设备 {serial} 未连接")


@router.get("/{serial}/mode", response_model=DeviceModeResponse)
async def get_device_mode(serial: str):
    """检测设备当前工作模式"""
    # 先检查 ADB
    adb_devices = await adb.devices()
    for d in adb_devices:
        if d["serial"] == serial and d["status"] == "device":
            mode = await adb.get_mode(serial)
            return DeviceModeResponse(
                mode=mode.name,
                label=MODE_LABELS.get(mode, "未知"),
                source="adb",
            )

    # 再检查 Fastboot
    fb_devices = await fb.devices()
    for d in fb_devices:
        if d["serial"] == serial:
            mode = await fb.get_mode(serial)
            return DeviceModeResponse(
                mode=mode.name,
                label=MODE_LABELS.get(mode, "未知"),
                source="fastboot",
            )

    raise HTTPException(status_code=404, detail=f"设备 {serial} 未连接")


@router.post("/{serial}/reboot")
async def reboot_device(serial: str, mode: str = ""):
    """重启设备（可指定模式）"""
    valid_modes = {"", "bootloader", "recovery", "fastboot"}
    if mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"不支持的重启模式: {mode}")

    if await adb.is_device_connected(serial):
        await adb.reboot(mode, serial)
        return {"status": "ok", "message": f"设备 {serial} 正在重启{mode}"}

    raise HTTPException(status_code=400, detail=f"设备 {serial} 不在 ADB 模式，无法通过 ADB 重启")
