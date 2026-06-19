"""
模块管理 CLI 命令

hydrotool module list      — 列出已安装模块
hydrotool module install   — 安装模块
hydrotool module remove    — 移除模块
"""

import asyncio
from typing import Optional

import click
from rich.console import Console
from rich.table import Table

from hydrotool.cli.main import module
from hydrotool.core.adb.client import AdbClient

console = Console()
adb = AdbClient()


def run_async(coro):
    return asyncio.run(coro)


@module.command("list")
@click.option("-s", "--serial", default=None, help="设备序列号")
def list_modules(serial: Optional[str]):
    """列出已安装的 Magisk/KernelSU 模块"""
    console.print("[cyan]正在读取模块列表...[/cyan]")
    try:
        output = run_async(adb.shell("ls -1 /data/adb/modules/", serial=serial, timeout=10))
        modules = [m.strip("/") for m in output.splitlines() if m.strip()]

        if not modules:
            console.print("[yellow]⚠️ 未安装任何模块[/yellow]")
            return

        table = Table(title="📦 已安装模块")
        table.add_column("#", style="dim")
        table.add_column("模块名", style="cyan")

        for i, mod in enumerate(modules, 1):
            # 尝试读取模块名称
            try:
                name = run_async(adb.shell(
                    f"cat /data/adb/modules/{mod}/module.prop 2>/dev/null | grep name=",
                    serial=serial, timeout=5
                ))
                display_name = name.replace("name=", "").strip() if name else mod
            except Exception:
                display_name = mod
            table.add_row(str(i), display_name)

        console.print(table)

    except Exception as e:
        console.print(f"[red]❌ 读取失败: {e}[/red]")

    console.print("\n[dim]模块路径: /data/adb/modules/[/dim]")


@module.command()
@click.argument("zip_file", type=click.Path(exists=True))
@click.option("-s", "--serial", default=None, help="设备序列号")
def install(zip_file: str, serial: Optional[str]):
    """安装 Magisk/KernelSU 模块"""
    import os
    file_size = os.path.getsize(zip_file)
    file_name = os.path.basename(zip_file)

    console.print(f"📦 模块: [cyan]{file_name}[/cyan] ({_format_size(file_size)})")

    if not click.confirm("确认安装？"):
        console.print("[yellow]已取消[/yellow]")
        return

    try:
        remote_path = "/data/local/tmp/module.zip"
        console.print("[cyan]正在上传模块...[/cyan]")
        run_async(adb.push(zip_file, remote_path, serial=serial))

        console.print("[cyan]正在安装模块...[/cyan]")
        result = run_async(adb.shell(
            f"magisk --install-module {remote_path} 2>/dev/null || "
            f"ksud module install {remote_path} 2>/dev/null || "
            f"echo 'unknown: need manual install'",
            serial=serial, timeout=30
        ))
        console.print(result)
        console.print("[green]✅ 安装完成！建议重启设备生效[/green]")
    except Exception as e:
        console.print(f"[red]❌ 安装失败: {e}[/red]")
        raise


@module.command()
@click.argument("module_name")
@click.option("-s", "--serial", default=None, help="设备序列号")
def remove(module_name: str, serial: Optional[str]):
    """移除已安装的模块"""
    if not click.confirm(f"确认移除模块 '{module_name}'？"):
        console.print("[yellow]已取消[/yellow]")
        return

    try:
        run_async(adb.shell(f"rm -rf /data/adb/modules/{module_name}", serial=serial, timeout=10))
        console.print(f"[green]✅ 模块 '{module_name}' 已移除[/green]")
        console.print("[yellow]💡 重启后生效[/yellow]")
    except Exception as e:
        console.print(f"[red]❌ 移除失败: {e}[/red]")
        raise


def _format_size(size: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"
