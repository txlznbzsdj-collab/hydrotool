"""
AI 自动模式 CLI 命令（Phase 3 实现）

hydrotool ai auto           — AI 一键自动刷机/Root
hydrotool ai check-env      — 检测运行环境
hydrotool ai scan-device    — 扫描设备状态

当前为功能占位，Phase 3 实现完整逻辑。
"""

import asyncio
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from hydrotool.cli.main import ai
from hydrotool.core.adb.client import AdbClient
from hydrotool.core.fastboot.client import FastbootClient

console = Console()
adb = AdbClient()
fb = FastbootClient()


def run_async(coro):
    return asyncio.run(coro)


@ai.command()
@click.option("-s", "--serial", default=None, help="设备序列号（可选）")
@click.option(
    "-t", "--target",
    type=click.Choice(["root", "flash", "detect"]),
    default="detect",
    help="操作目标: root=一键Root, flash=刷机, detect=仅检测"
)
def auto(serial: Optional[str], target: str):
    """AI 一键自动刷机/Root（自动检测环境→识别设备→执行）"""
    console.print(Panel.fit(
        "[bold]🤖 HydroTool AI 自动模式[/bold]\n"
        "自动检测运行环境 → 识别设备状态 → 执行目标操作",
        border_style="cyan"
    ))

    # Step 1: 环境检测
    console.print("\n[bold]步骤 1/4: 检测运行环境[/bold]")
    env_result = run_async(_check_environment())

    all_ok = True
    for check, status in env_result.items():
        icon = "✅" if status == "ok" else "⚠️" if status == "warn" else "❌"
        console.print(f"  {icon} {check}")
        if status == "error":
            all_ok = False

    if not all_ok:
        console.print("\n[yellow]⚠️ 环境有问题，请先修复后再试[/yellow]")
        return

    # Step 2: 设备检测
    console.print("\n[bold]步骤 2/4: 识别设备状态[/bold]")
    device_found = run_async(_detect_device(serial))

    if not device_found:
        console.print("[red]❌ 未检测到设备，请连接手机后重试[/red]")
        return

    # Step 3: 方案预览（仅 detect 模式）
    if target == "detect":
        console.print("\n[bold]✅ 检测完成！设备已就绪[/bold]")
        console.print("[dim]使用 --target root 或 --target flash 执行具体操作[/dim]")
        return

    # Step 4: 执行（Phase 3 实现）
    console.print(f"\n[bold]步骤 3-4: 执行 {target} 操作[/bold]")
    console.print("[yellow]⏳ AI 自动执行功能将在 Phase 3 版本中实现[/yellow]")
    console.print("[yellow]当前请使用: hydrotool root auto 手动完成 Root[/yellow]")


@ai.command("check-env")
def check_env():
    """检测当前 PC 运行环境是否就绪"""
    result = run_async(_check_environment())

    table = Table(title="🖥️ 运行环境检测")
    table.add_column("检测项", style="cyan")
    table.add_column("状态", style="white")

    status_map = {"ok": "✅ 正常", "warn": "⚠️ 需注意", "error": "❌ 异常"}

    for check, status in result.items():
        table.add_row(check, status_map.get(status, status))

    console.print(table)


@ai.command("scan-device")
@click.option("-s", "--serial", default=None, help="设备序列号")
def scan_device(serial: Optional[str]):
    """扫描设备当前状态"""
    result = run_async(_detect_device(serial))
    if not result:
        console.print("[red]❌ 未检测到设备[/red]")


async def _check_environment() -> dict:
    """检测运行环境"""
    import shutil
    import sys
    import platform

    result = {}

    # OS
    os_name = platform.system()
    result[f"操作系统: {os_name} {platform.release()}"] = "ok"

    # Python
    py_ver = f"{sys.version_info.major}.{sys.version_info.minor}"
    result[f"Python: {py_ver}"] = "ok" if sys.version_info >= (3, 11) else "error"

    # ADB
    adb_path = shutil.which("adb")
    if adb_path:
        try:
            ver = await adb.version()
            result[f"ADB: {ver} ({adb_path})"] = "ok"
        except Exception:
            result["ADB: 无法运行"] = "error"
    else:
        result["ADB: 未安装"] = "error"

    # Fastboot
    fb_path = shutil.which("fastboot")
    if fb_path:
        result[f"Fastboot: ({fb_path})"] = "ok"
    else:
        result["Fastboot: 未安装"] = "warn"

    return result


async def _detect_device(serial: Optional[str]) -> bool:
    """检测设备"""
    # ADB
    adb_devices = await adb.devices()
    for d in adb_devices:
        if d["status"] == "device":
            info = await adb.get_device_info(d["serial"])
            console.print(f"  ✅ ADB: {info.model or d['serial']} ({d['serial']})")
            if info.bootloader_unlocked:
                console.print(f"  🔓 Bootloader: 已解锁")
            else:
                console.print(f"  🔒 Bootloader: 已锁定")
            if info.root_method:
                console.print(f"  🛡️ Root: 已获取 ({info.root_method})")
            return True

    # Fastboot
    fb_devices = await fb.devices()
    for d in fb_devices:
        console.print(f"  ✅ Fastboot: {d['serial']}")
        return True

    console.print("  ❌ 未连接任何设备")
    return False
