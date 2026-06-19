"""
刷机 CLI 命令

hydrotool flash payload <file>  — 刷写 payload.bin
hydrotool flash boot <file>    — 刷写 boot.img
hydrotool flash partition      — 刷写分区镜像
hydrotool flash slot <a|b>     — 切换 A/B 槽位
"""

import asyncio
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.progress import (
    Progress,
    SpinnerColumn,
    TextColumn,
    BarColumn,
    TimeElapsedColumn,
)

from hydrotool.cli.main import flash
from hydrotool.core.fastboot.client import FastbootClient

console = Console()


def run_async(coro):
    return asyncio.run(coro)


@flash.command()
@click.argument("payload_file", type=click.Path(exists=True))
@click.option("-s", "--serial", default=None, help="设备序列号")
@click.option("--slot", default=None, help="目标槽位（a/b）")
def payload(payload_file: str, serial: Optional[str], slot: Optional[str]):
    """刷写 payload.bin 文件（需设备在 fastbootd 模式）"""
    file_path = Path(payload_file)
    file_size = file_path.stat().st_size
    console.print(f"📦 payload.bin: [cyan]{file_path.name}[/cyan] ({_format_size(file_size)})")
    console.print("[yellow]⚠️ 请确保设备已在 FastbootD 模式[/yellow]")
    console.print("   进入方法: adb reboot fastboot\n")

    if not click.confirm("确认开始刷写？"):
        console.print("[yellow]已取消[/yellow]")
        return

    try:
        run_async(_flash_payload(str(file_path), serial, slot))
        console.print("[green]✅ 刷写完成！正在重启...[/green]")
    except Exception as e:
        console.print(f"[red]❌ 刷写失败: {e}[/red]")
        raise


@flash.command()
@click.argument("image_file", type=click.Path(exists=True))
@click.option("-s", "--serial", default=None, help="设备序列号")
def boot(image_file: str, serial: Optional[str]):
    """刷写 boot.img 到 boot 分区"""
    file_path = Path(image_file)
    console.print(f"🖥️  boot.img: [cyan]{file_path.name}[/cyan]")

    if not click.confirm("确认刷写 boot 分区？"):
        console.print("[yellow]已取消[/yellow]")
        return

    try:
        run_async(_flash_boot(str(file_path), serial))
        console.print("[green]✅ Boot 分区刷写完成！[/green]")
    except Exception as e:
        console.print(f"[red]❌ 刷写失败: {e}[/red]")
        raise


@flash.command()
@click.argument("partition")
@click.argument("image_file", type=click.Path(exists=True))
@click.option("-s", "--serial", default=None, help="设备序列号")
@click.option("--slot", default=None, help="目标槽位（a/b）")
def partition(partition: str, image_file: str, serial: Optional[str], slot: Optional[str]):
    """刷写指定分区镜像"""
    file_path = Path(image_file)
    console.print(f"📁 分区: [cyan]{partition}[/cyan] ← [cyan]{file_path.name}[/cyan]")

    if not click.confirm(f"确认刷写 {partition} 分区？"):
        console.print("[yellow]已取消[/yellow]")
        return

    try:
        run_async(FastbootClient().flash(partition, str(file_path), serial, slot or ""))
        console.print(f"[green]✅ {partition} 分区刷写完成！[/green]")
    except Exception as e:
        console.print(f"[red]❌ 刷写失败: {e}[/red]")
        raise


@flash.command()
@click.argument("slot_name", type=click.Choice(["a", "b"]))
@click.option("-s", "--serial", default=None, help="设备序列号")
def slot(slot_name: str, serial: Optional[str]):
    """切换 A/B 槽位"""
    try:
        result = run_async(FastbootClient().set_slot(slot_name, serial))
        console.print(f"[green]✅ 已切换到槽位 {slot_name.upper()}[/green]")
    except Exception as e:
        console.print(f"[red]❌ 切换失败: {e}[/red]")
        raise


async def _flash_payload(payload_file: str, serial: Optional[str], slot: Optional[str]):
    """刷写 payload.bin（调用 Go 模块或 fastboot）"""
    fb = FastbootClient()

    # 确保在 fastbootd 模式
    mode = await fb.get_mode(serial)
    if mode.name not in ("FASTBOOTD", "FASTBOOT"):
        console.print("[red]❌ 设备不在 Fastboot/FastbootD 模式！[/red]")
        console.print("请先执行: adb reboot fastboot")
        return

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("正在刷写 payload.bin...", total=None)

        # 简单实现：使用 fastboot flash 处理 payload.bin
        # 完整实现需调用 Go 模块解析 payload.bin 并逐个分区刷写
        result = await fb.flash("payload", payload_file, serial, slot or "")
        progress.update(task, completed=True)

    console.print(result)


async def _flash_boot(image_file: str, serial: Optional[str]):
    """刷写 boot 分区"""
    fb = FastbootClient()
    result = await fb.flash("boot", image_file, serial)
    console.print(result)


def _format_size(size: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"
