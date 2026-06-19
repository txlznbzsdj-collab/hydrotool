"""
HydroTool CLI 入口

提供 hydrotool 命令行工具的主入口和命令组结构。
"""

import click


@click.group()
@click.version_option(version="0.1.0", prog_name="hydrotool")
@click.option("--debug", is_flag=True, help="启用调试模式")
def cli(debug: bool):
    """HydroTool — 安卓刷机调试一体化工具箱"""
    pass


# ============================================================
# 命令组定义
# 注意: 具体的命令实现在 commands/ 目录下，通过装饰器注册
# 导入 triggers 装饰器执行，将命令注册到对应组
# ============================================================

@cli.group()
def device():
    """设备管理：查看设备信息、状态检测"""


@cli.group()
def flash():
    """刷机：刷写 payload.bin、分区镜像、boot.img"""


@cli.group()
def root():
    """Root 管理：Magisk/KernelSU/APatch"""


@cli.group()
def module():
    """模块管理：安装/卸载/查看模块"""


@cli.group()
def hide():
    """环境隐藏：Root 检测、完整性修复"""


@cli.group()
def rom():
    """ROM 工具：解包/打包 payload.bin、boot.img"""


@cli.group()
def ai():
    """AI 自动模式：自动检测环境+设备状态+执行"""


# ============================================================
# 导入命令实现模块（触发装饰器注册命令）
# ============================================================
from hydrotool.cli.commands import device as _device_cmds   # noqa: F401, E402
from hydrotool.cli.commands import flash as _flash_cmds     # noqa: F401, E402
from hydrotool.cli.commands import root as _root_cmds       # noqa: F401, E402
from hydrotool.cli.commands import module as _module_cmds   # noqa: F401, E402
from hydrotool.cli.commands import hide as _hide_cmds       # noqa: F401, E402
from hydrotool.cli.commands import rom as _rom_cmds         # noqa: F401, E402
from hydrotool.cli.commands import ai as _ai_cmds           # noqa: F401, E402


if __name__ == "__main__":
    cli()
