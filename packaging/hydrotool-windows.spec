# -*- mode: python ; coding: utf-8 -*-
"""
HydroTool Windows PyInstaller 打包配置

打包为单个 hydrotool.exe，包含 CLI + Web 后端。
"""

block_cipher = None

a = Analysis(
    ['../src/hydrotool/cli/main.py'],
    pathex=['..'],
    binaries=[],
    datas=[],
    hiddenimports=[
        'hydrotool',
        'hydrotool.cli',
        'hydrotool.cli.commands',
        'hydrotool.cli.commands.device',
        'hydrotool.cli.commands.flash',
        'hydrotool.cli.commands.root',
        'hydrotool.cli.commands.module',
        'hydrotool.cli.commands.ai',
        'hydrotool.cli.commands.hide',
        'hydrotool.cli.commands.rom',
        'hydrotool.core',
        'hydrotool.core.device',
        'hydrotool.core.adb',
        'hydrotool.core.adb.client',
        'hydrotool.core.fastboot',
        'hydrotool.core.fastboot.client',
        'hydrotool.backend',
        'hydrotool.backend.app',
        'hydrotool.backend.models',
        'hydrotool.backend.routers',
        'hydrotool.backend.routers.system',
        'hydrotool.backend.routers.device',
        'hydrotool.backend.routers.flash',
        'hydrotool.backend.routers.root',
        'hydrotool.backend.websocket',
        'hydrotool.backend.websocket.device_stream',
        'click',
        'rich',
        'pydantic',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'PIL',
        'cv2',
        'scipy',
        'IPython',
        'jupyter',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='hydrotool',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,          # CLI 工具，需要控制台窗口
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='hydrotool.ico',
)
