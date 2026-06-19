"""
环境隐藏 CLI 命令（Phase 3+ 实现）

hydrotool hide scan          — Root 检测扫描
hydrotool hide integrity     — Play Integrity 检测
"""

import click
from rich.console import Console

from hydrotool.cli.main import hide

console = Console()


@hide.command()
def scan():
    """扫描 Root 检测点，模拟常见检测方法"""
    console.print("[yellow]⏳ Phase 3 实现[/yellow]")


@hide.command()
def integrity():
    """检测 Google Play Integrity 状态"""
    console.print("[yellow]⏳ Phase 3 实现[/yellow]")


@hide.command()
def fix():
    """修复 Play Integrity 检测"""
    console.print("[yellow]⏳ Phase 3 实现[/yellow]")
