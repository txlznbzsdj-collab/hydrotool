"""
HydroTool CLI 入口

提供 hydrotool 命令行工具的主入口和命令组结构。
"""

import sys
import click


@click.group(invoke_without_command=True)
@click.version_option(version="0.1.0", prog_name="hydrotool")
@click.option("--debug", is_flag=True, help="启用调试模式")
@click.pass_context
def cli(ctx, debug: bool):
    """HydroTool — 安卓刷机调试一体化工具箱

    无参数运行时自动启动图形界面（Web UI）。
    """
    if ctx.invoked_subcommand is None:
        # 无子命令 → 启动图形界面
        _launch_gui()


def _launch_gui():
    """启动原生桌面窗口（无需浏览器）"""
    import threading
    import uvicorn
    import webview

    port = 8000
    url = f"http://localhost:{port}"

    # 后台启动 FastAPI
    def _run_server():
        uvicorn.run(
            "hydrotool.backend.app:app",
            host="127.0.0.1",
            port=port,
            log_level="warning",
        )

    server_thread = threading.Thread(target=_run_server, daemon=True)
    server_thread.start()

    click.echo(f"🚀 HydroTool 启动中...")

    # 原生桌面窗口
    webview.create_window(
        title="HydroTool — 鸿德工具箱",
        url=url,
        width=1100,
        height=750,
        min_size=(800, 550),
        text_select=True,
    )
    webview.start(debug=False)


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


@cli.command()
@click.option("-p", "--port", default=8000, help="服务端口 (默认: 8000)")
@click.option("--no-browser", is_flag=True, help="不自动打开浏览器")
@click.option("--native", is_flag=True, help="使用原生桌面窗口（无需浏览器）")
def serve(port: int, no_browser: bool, native: bool):
    """启动图形界面（Web UI）
    
    启动后端 API 服务，并在浏览器中打开图形界面。
    CLI 命令组也可继续使用。
    """
    import webbrowser
    import uvicorn
    import threading

    url = f"http://localhost:{port}"

    if native:
        import webview

        def _run():
            uvicorn.run("hydrotool.backend.app:app", host="127.0.0.1", port=port, log_level="warning")

        threading.Thread(target=_run, daemon=True).start()
        click.echo(f"🚀 HydroTool 原生窗口启动中...")
        webview.create_window(
            title="HydroTool — 鸿德工具箱",
            url=url, width=1100, height=750,
            min_size=(800, 550), text_select=True,
        )
        webview.start(debug=False)
        return

    if not no_browser:
        def _open():
            import time
            time.sleep(1)
            webbrowser.open(url)
        threading.Thread(target=_open, daemon=True).start()

    click.echo(f"🚀 HydroTool Web UI: {url}")
    uvicorn.run("hydrotool.backend.app:app", host="0.0.0.0", port=port, log_level="warning")


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
