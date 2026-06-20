"""
AI 自动模式 CLI 命令

hydrotool ai auto           — AI 一键自动刷机/Root
hydrotool ai check-env      — 检测运行环境
hydrotool ai scan-device    — 扫描设备状态
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
from hydrotool.core.ai.executor import AiExecutor

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
@click.option("--goal", default=None, help="自定义目标描述（覆盖 --target）")
def auto(serial: Optional[str], target: str, goal: Optional[str]):
    """AI 一键自动刷机/Root（LLM 驱动 → 命令生成 → 执行反馈闭环）"""
    console.print(Panel.fit(
        "[bold]🤖 HydroTool AI 自动模式[/bold]\n"
        "AI 分析目标 → 生成命令 → 执行 → 反馈 → 循环直到完成",
        border_style="cyan"
    ))

    # Build goal
    if goal:
        final_goal = goal
    elif target == "root":
        final_goal = "为设备获取 Root 权限（Magisk/KernelSU/APatch）"
    elif target == "flash":
        final_goal = "刷入 ROM 固件到设备"
    else:
        final_goal = "检测设备和环境状态"

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

    # Step 3-4: AI 执行
    if target == "detect":
        console.print("\n[bold green]✅ 检测完成！设备已就绪[/bold green]")
        return

    console.print(f"\n[bold]步骤 3-4: AI 自动执行 [{target}][/bold]")
    console.print(f"[dim]目标: {final_goal}[/dim]\n")

    executor = AiExecutor()
    state = run_async(executor.execute(final_goal, {"serial": serial} if serial else None))

    # 显示步骤
    for s in state.steps:
        console.print(f"  🔧 {s.tool_name}: {s.result[:120]}")

    if state.success:
        console.print(f"\n[bold green]✅ {state.summary}[/bold green]")
    else:
        console.print(f"\n[yellow]⚠️ {state.summary}[/yellow]")

    if state.error:
        console.print(f"[red]错误: {state.error}[/red]")


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
            if info.bootloader_unlocked:
            return True

    # Fastboot
    fb_devices = await fb.devices()
    for d in fb_devices:
        console.print(f"  ✅ Fastboot: {d['serial']}")
        return True

    console.print("  ❌ 未连接任何设备")
    return False
