"""
ROM 工具箱 CLI 命令（Phase 2+ 实现）

hydrotool rom unpack-payload   — 解包 payload.bin
hydrotool rom unpack-boot      — 解包 boot.img
hydrotool rom backup           — 备份分区
"""

import click
from rich.console import Console

from hydrotool.cli.main import rom

console = Console()


@rom.command("unpack-payload")
@click.argument("payload_file", type=click.Path(exists=True))
@click.option("-o", "--output", default="payload_out", help="输出目录")
def unpack_payload(payload_file: str, output: str):
    """解包 payload.bin"""
    console.print("[yellow]⏳ Phase 2 实现 (Go 模块)[/yellow]")


@rom.command("unpack-boot")
@click.argument("boot_img", type=click.Path(exists=True))
@click.option("-o", "--output", default="boot_out", help="输出目录")
def unpack_boot(boot_img: str, output: str):
    """解包 boot.img"""
    console.print("[yellow]⏳ Phase 2 实现 (Go 模块)[/yellow]")


@rom.command()
@click.option("-s", "--serial", default=None, help="设备序列号")
@click.argument("partitions", nargs=-1, required=True)
def backup(serial: str, partitions: tuple):
    """备份指定分区"""
    console.print("[yellow]⏳ Phase 2 实现[/yellow]")
