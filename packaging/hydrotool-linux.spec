# -*- mode: python ; coding: utf-8 -*-
"""
HydroTool Linux PyInstaller 打包配置
"""

block_cipher = None

a = Analysis(
    ['../src/hydrotool/cli/main.py'],
    pathex=['..'],
    binaries=[],
    datas=[('../frontend/dist', 'frontend/dist'), ('../frontend/dist/index.html', 'frontend/dist')],
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
        'hydrotool.core.ai',
        'hydrotool.core.ai.executor',
        'click',
        'rich',
        'pydantic',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'numpy', 'pandas', 'PIL'],
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
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
