"""
Root 管理 CLI 命令

hydrotool root status      — 检测 Root 状态
hydrotool root extract     — 提取 boot.img
hydrotool root patch       — Magisk 修补 boot.img
hydrotool root flash       — 刷入修补后的 boot.img
hydrotool root auto        — 一键 Root (提取 + 修补 + 刷入)
"""

import asyncio
import os
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt

from hydrotool.cli.main import root
from hydrotool.core.adb.client import AdbClient
from hydrotool.core.device import DeviceInfo

console = Console()
adb = AdbClient()


def run_async(coro):
    return asyncio.run(coro)


@root.command()
@click.option("-s", "--serial", default=None, help="设备序列号")
def status(serial: Optional[str]):
    """检测设备 Root 状态"""
    info = run_async(adb.get_device_info(serial))
    table = Table(title="🛡️ Root 状态")
    table.add_column("项目", style="cyan")
    table.add_column("状态", style="white")
    table.add_row("Root 权限", "✅ 已获取" if info.root_method else "❌ 未 Root")
    table.add_row("Root 方案", info.root_method or "-")
    table.add_row("Bootloader", "🔓 已解锁" if info.bootloader_unlocked else "🔒 已锁定")
    console.print(table)

    if not info.bootloader_unlocked:
        console.print("\n[yellow]⚠️ Bootloader 未解锁，需要先解锁才能 Root[/yellow]")


@root.command()
@click.option("-s", "--serial", default=None, help="设备序列号")
@click.option("-o", "--output", default="boot.img", help="输出文件路径（默认 boot.img）")
def extract(serial: Optional[str], output: str):
    """从设备提取 boot.img"""
    out_path = Path(output)
    if out_path.exists():
        if not click.confirm(f"{output} 已存在，覆盖？"):
            console.print("[yellow]已取消[/yellow]")
            return

    console.print("[cyan]正在检测 boot 分区位置...[/cyan]")
    try:
        boot_path = run_async(adb.shell("find /dev/block/by-name/boot", serial=serial))
        boot_path = boot_path.strip()
        if not boot_path:
            boot_path = "/dev/block/by-name/boot"

        console.print(f"[cyan]正在从 {boot_path} 提取 boot.img...[/cyan]")
        run_async(adb.pull(boot_path, output, serial=serial))
        console.print(f"[green]✅ boot.img 已保存到: {output}[/green]")
        console.print(f"   文件大小: {_format_file_size(output)}")
    except Exception as e:
        console.print(f"[red]❌ 提取失败: {e}[/red]")
        raise


@root.command()
@click.argument("boot_img", type=click.Path(exists=True), default="boot.img", required=False)
@click.option("-o", "--output", default="patched_boot.img", help="输出文件路径")
@click.option("--magisk-path", default="", help="Magisk APK 路径（可选）")
def patch(boot_img: str, output: str, magisk_path: str):
    """用 Magisk 修补 boot.img"""
    console.print("[cyan]准备 Magisk 修补流程...[/cyan]")
    console.print("[yellow]需要在手机上操作:[/yellow]")
    console.print("  1. 将 boot.img 传到手机")
    console.print("  2. 打开 Magisk App → 安装 → 选择并修补一个文件")
    console.print("  3. 选中所选的 boot.img")
    console.print("  4. 修补完成后将 patched_boot.img 拉回电脑")
    console.print()
    console.print(f"  源文件: {boot_img}")
    console.print(f"  输出建议: {output}")
    console.print()
    console.print("[yellow]💡 自动修补功能需要通过 ADB 调用 Magisk，后续版本支持[/yellow]")
    click.pause("按任意键继续...")


@root.command()
@click.argument("patched_boot", type=click.Path(exists=True))
@click.option("-s", "--serial", default=None, help="设备序列号")
def flash(patched_boot: str, serial: Optional[str]):
    """刷入修补后的 boot.img"""
    from hydrotool.core.fastboot.client import FastbootClient

    fb = FastbootClient()

    # 检查 fastboot 模式
    console.print("[cyan]正在检查设备模式...[/cyan]")
    if not run_async(fb.is_device_connected(serial)):
        console.print("[red]❌ 设备不在 Fastboot 模式！[/red]")
        console.print("请先进入 Fastboot 模式: adb reboot bootloader")
        return

    console.print(f"[cyan]正在刷入 {patched_boot} 到 boot 分区...[/cyan]")
    try:
        run_async(fb.flash("boot", patched_boot, serial))
        console.print("[green]✅ 刷入完成！[/green]")
        if click.confirm("重启设备？"):
            run_async(fb.reboot(serial))
            console.print("[green]✅ 设备正在重启...[/green]")
    except Exception as e:
        console.print(f"[red]❌ 刷入失败: {e}[/red]")
        raise


@root.command()
@click.option("-s", "--serial", default=None, help="设备序列号")
@click.option("--keep-boot", is_flag=True, help="保留提取的 boot.img 文件")
def auto(serial: Optional[str], keep_boot: bool):
    """一键 Root：提取 boot.img → 修补 → 刷入"""
    tmp_boot = "/tmp/hydrotool_boot.img"
    tmp_patched = "/tmp/hydrotool_patched_boot.img"

    console.print("[bold]🤖 一键 Root 流程[/bold]\n")

    # Step 1: 检测状态
    console.print("[1/3] 检测设备状态...")
    info = run_async(adb.get_device_info(serial))

    if info.root_method:
        console.print("[green]✅ 设备已 Root[/green]")
        return

    if not info.bootloader_unlocked:
        console.print("[red]❌ Bootloader 未解锁，请先解锁！[/red]")
        return

    # Step 2: 提取 boot.img
    console.print("[2/3] 提取 boot.img...")
    try:
        boot_path = run_async(adb.shell("find /dev/block/by-name/boot", serial=serial))
        boot_path = boot_path.strip() or "/dev/block/by-name/boot"
        run_async(adb.pull(boot_path, tmp_boot, serial=serial))
        console.print(f"   ✅ boot.img 已提取 ({_format_file_size(tmp_boot)})")
    except Exception as e:
        console.print(f"[red]❌ 提取 boot.img 失败: {e}[/red]")
        return

    # Step 3: 提示用户修补
    console.print("\n[3/3] Magisk 修补（需在手机上操作）")
    console.print(f"  已将 boot.img 保存到: [cyan]{tmp_boot}[/cyan]")
    console.print("  请在手机上:")
    console.print("    1. 将 boot.img 传到手机")
    console.print("    2. 打开 Magisk → 安装 → 选择并修补一个文件")
    console.print("    3. 修补完成后将 patched_boot.img 拉回电脑")
    console.print("    4. 放到: [cyan]/tmp/hydrotool_patched_boot.img[/cyan]")
    console.print()
    click.pause("  完成后按任意键继续...")

    if not os.path.exists(tmp_patched):
        console.print("[red]❌ 未找到修补后的 boot.img[/red]")
        console.print(f"  请将 patched_boot.img 放到: {tmp_patched}")
        return

    # Step 4: 刷入
    console.print("\n[4/4] 刷入修补后的 boot.img...")
    from hydrotool.core.fastboot.client import FastbootClient
    fb = FastbootClient()

    console.print("  正在重启到 Fastboot 模式...")
    run_async(adb.reboot_bootloader(serial))
    import time
    time.sleep(5)

    console.print("  正在刷入...")
    try:
        run_async(fb.flash("boot", tmp_patched, serial))
        console.print("\n[green]✅ Root 完成！重启中...[/green]")
        run_async(fb.reboot(serial))
    except Exception as e:
        console.print(f"[red]❌ 刷入失败: {e}[/red]")

    # 清理
    if not keep_boot:
        for f in [tmp_boot, tmp_patched]:
            if os.path.exists(f):
                os.remove(f)


def _format_file_size(path: str) -> str:
    size = os.path.getsize(path)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"
