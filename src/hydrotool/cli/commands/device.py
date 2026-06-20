"""
设备管理 CLI 命令

hydrotool device info    — 查看设备信息
hydrotool device list    — 列出所有设备
hydrotool device modes   — 检测设备当前模式
"""

import asyncio
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from hydrotool.cli.main import device
from hydrotool.core.adb.client import AdbClient
from hydrotool.core.fastboot.client import FastbootClient
from hydrotool.core.device import MODE_LABELS

console = Console()


def run_async(coro):
    """在 Click 命令中运行异步协程"""
    return asyncio.run(coro)


@device.command()
@click.option("-s", "--serial", default=None, help="设备序列号（可选）")
@click.option("--json", "json_output", is_flag=True, help="JSON 格式输出")
def info(serial: Optional[str], json_output: bool):
    """查看连接的 Android 设备详细信息"""
    try:
        device_info = run_async(_get_device_info(serial))
    except Exception as e:
        console.print(f"[red]❌ 获取设备信息失败: {e}[/red]")
        return

    if json_output:
        import json as _json
        console.print(_json.dumps(device_info.to_dict(), indent=2, ensure_ascii=False))
        return

    # Rich 表格展示
    table = Table(title=f"📱 设备信息 — {device_info.model or device_info.serial}")
    table.add_column("属性", style="cyan")
    table.add_column("值", style="white")

    rows = [
        ("序列号", device_info.serial),
        ("品牌", device_info.brand),
        ("型号", device_info.model),
        ("Android 版本", device_info.android_version),
        ("Build 版本", device_info.build_version),
        ("内核版本", device_info.kernel_version),
        ("安全补丁", device_info.security_patch),
        ("SDK 版本", str(device_info.sdk)),
        ("Bootloader", "🔓 已解锁" if device_info.bootloader_unlocked else "🔒 已锁定"),
        ("A/B 分区", "✅ 支持" if device_info.ab_support else "❌ 不支持"),
        ("当前槽位", device_info.current_slot or "-"),
    ]

    for attr, value in rows:
        table.add_row(attr, str(value) if value else "-")

    console.print(table)


@device.command()
@click.option("--json", "json_output", is_flag=True, help="JSON 格式输出")
def list(json_output: bool):
    """列出所有连接的 Android 设备"""
    result = run_async(_list_devices())

    if json_output:
        import json as _json
        console.print(_json.dumps(result, indent=2, ensure_ascii=False))
        return

    if not result["adb"] and not result["fastboot"]:
        console.print("[yellow]⚠️ 未检测到任何连接的设备[/yellow]")
        return

    if result["adb"]:
        adb_table = Table(title="ADB 设备")
        adb_table.add_column("序列号", style="cyan")
        adb_table.add_column("状态", style="green")
        for d in result["adb"]:
            adb_table.add_row(d["serial"], d["status"])
        console.print(adb_table)

    if result["fastboot"]:
        fb_table = Table(title="Fastboot 设备")
        fb_table.add_column("序列号", style="cyan")
        fb_table.add_column("状态", style="green")
        for d in result["fastboot"]:
            fb_table.add_row(d["serial"], d["status"])
        console.print(fb_table)


@device.command()
@click.option("-s", "--serial", default=None, help="设备序列号（可选）")
def mode(serial: Optional[str]):
    """检测设备当前工作模式"""
    result = run_async(_detect_mode(serial))
    mode_name = MODE_LABELS.get(result["mode"], "未知")
    console.print(Panel(f"当前模式: [bold]{mode_name}[/bold]", title="📡 设备模式"))


async def _get_device_info(serial: Optional[str] = None) -> "DeviceInfo":
    """获取设备信息"""
    adb = AdbClient()
    fb = FastbootClient()

    # 先试 ADB
    if serial:
        if await adb.is_device_connected(serial):
            return await adb.get_device_info(serial)
    else:
        devices = await adb.devices()
        for d in devices:
            if d["status"] == "device":
                return await adb.get_device_info(d["serial"])

    # 再试 Fastboot
    if serial:
        if await fb.is_device_connected(serial):
            vars_dict = await fb.get_all_vars(serial)
            from hydrotool.core.device import DeviceInfo
            return DeviceInfo(
                serial=serial,
                model=vars_dict.get("product", ""),
                brand=vars_dict.get("vendor", ""),
                bootloader_unlocked=vars_dict.get("unlocked", "").lower() == "yes",
                ab_support=bool(vars_dict.get("current-slot", "")),
                current_slot=vars_dict.get("current-slot", ""),
            )
    else:
        fb_devices = await fb.devices()
        for d in fb_devices:
            vars_dict = await fb.get_all_vars(d["serial"])
            from hydrotool.core.device import DeviceInfo
            return DeviceInfo(
                serial=d["serial"],
                model=vars_dict.get("product", ""),
                brand=vars_dict.get("vendor", ""),
                bootloader_unlocked=vars_dict.get("unlocked", "").lower() == "yes",
                ab_support=bool(vars_dict.get("current-slot", "")),
                current_slot=vars_dict.get("current-slot", ""),
            )

    from hydrotool.core.device import DeviceInfo
    return DeviceInfo()


async def _list_devices() -> dict:
    """列出所有设备"""
    adb = AdbClient()
    fb = FastbootClient()

    return {
        "adb": await adb.devices(),
        "fastboot": await fb.devices(),
    }


async def _detect_mode(serial: Optional[str] = None) -> dict:
    """检测设备模式"""
    adb = AdbClient()
    fb = FastbootClient()

    mode = await adb.get_mode(serial)
    if mode.name != "DISCONNECTED":
        return {"mode": mode, "source": "adb"}

    mode = await fb.get_mode(serial)
    return {"mode": mode, "source": "fastboot"}
