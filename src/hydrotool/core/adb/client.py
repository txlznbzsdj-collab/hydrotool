"""
ADB 异步客户端封装

封装 adb 命令行工具调用，提供异步设备管理能力。
所有方法返回解析后的结构化数据，而非原始命令输出。
"""

import asyncio
import re
import shutil
from typing import Optional

from hydrotool.core.device import DeviceInfo, DeviceMode


class AdbError(Exception):
    """ADB 操作异常"""

    def __init__(self, message: str, cmd: str = "", returncode: int = -1):
        self.cmd = cmd
        self.returncode = returncode
        super().__init__(f"[{returncode}] {message}")


class AdbClient:
    """ADB 客户端"""

    def __init__(self, adb_path: str = "adb"):
        self._adb_path = self._resolve_adb(adb_path)

    @staticmethod
    def _resolve_adb(adb_path: str) -> str:
        """解析 adb 路径，如果找不到则返回默认值"""
        resolved = shutil.which(adb_path)
        return resolved or adb_path

    async def _run(self, *args: str, timeout: int = 30) -> str:
        """执行 adb 命令"""
        cmd = [self._adb_path, *args]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=timeout
            )
            if proc.returncode != 0:
                raise AdbError(
                    stderr.decode().strip(),
                    cmd=" ".join(cmd),
                    returncode=proc.returncode,
                )
            return stdout.decode().strip()
        except asyncio.TimeoutError:
            raise AdbError("命令超时", cmd=" ".join(cmd))

    async def version(self) -> str:
        """获取 ADB 版本"""
        output = await self._run("version")
        match = re.search(r"version\s+(\S+)", output)
        return match.group(1) if match else output

    async def devices(self) -> list[dict]:
        """列出已连接的设备"""
        output = await self._run("devices", "-l")
        devices = []
        for line in output.splitlines()[1:]:  # 跳过第一行 "List of devices attached"
            if not line.strip():
                continue
            parts = line.split()
            if len(parts) >= 2:
                device = {"serial": parts[0], "status": parts[1]}
                # 解析 -l 附加信息
                for part in parts[2:]:
                    if ":" in part:
                        key, _, value = part.partition(":")
                        device[key] = value
                devices.append(device)
        return devices

    async def is_device_connected(self, serial: Optional[str] = None) -> bool:
        """检查设备是否通过 ADB 连接"""
        devices = await self.devices()
        if serial:
            return any(d["serial"] == serial and d["status"] == "device" for d in devices)
        return any(d["status"] == "device" for d in devices)

    async def get_device_info(self, serial: Optional[str] = None) -> DeviceInfo:
        """获取设备详细信息"""
        serial_args = ["-s", serial] if serial else []
        info = DeviceInfo()

        # 获取系统属性
        props_to_fetch = {
            "serial": "ro.serialno",
            "model": "ro.product.model",
            "brand": "ro.product.brand",
            "android_version": "ro.build.version.release",
            "build_version": "ro.build.display.id",
            "security_patch": "ro.build.version.security_patch",
            "sdk": "ro.build.version.sdk",
        }

        for attr, prop in props_to_fetch.items():
            try:
                value = await self._run(
                    *serial_args, "shell", "getprop", prop, timeout=5
                )
                if attr == "sdk":
                    setattr(info, attr, int(value) if value.isdigit() else 0)
                else:
                    setattr(info, attr, value)
            except AdbError:
                pass

        # 获取内核版本
        try:
            uname = await self._run(*serial_args, "shell", "uname", "-r", timeout=5)
            info.kernel_version = uname
        except AdbError:
            pass

        # 检测 Bootloader 状态
        try:
            bl_info = await self._run(*serial_args, "shell", "getprop", "ro.boot.verifiedbootstate", timeout=5)
            info.bootloader_unlocked = bl_info.lower() != "green"
        except AdbError:
            pass

        # 检测 AB 槽位
        try:
            slot = await self._run(*serial_args, "shell", "getprop", "ro.boot.slot_suffix", timeout=5)
            if slot:
                info.ab_support = True
                info.current_slot = slot.replace("_", "").upper()
        except AdbError:
            pass

        # 检测 Root 状态
        try:
            await self._run(*serial_args, "shell", "su", "-c", "id", timeout=5)
            info.root_method = "su"
        except AdbError:
            pass

        if serial:
            info.serial = serial

        return info

    async def get_mode(self, serial: Optional[str] = None) -> DeviceMode:
        """检测设备当前模式"""
        serial_args = ["-s", serial] if serial else []

        # 检查是否可通过 ADB 连接
        if await self.is_device_connected(serial):
            # 判断是否为 Recovery 模式
            try:
                output = await self._run(
                    *serial_args, "shell", "getprop", "ro.bootmode", timeout=5
                )
                if "recovery" in output.lower():
                    # 检测是否为 sideload
                    try:
                        await self._run(
                            *serial_args, "shell", "getprop", "init.svc.adbd", timeout=3
                        )
                        return DeviceMode.SIDELOAD
                    except AdbError:
                        return DeviceMode.ADB_RECOVERY
            except AdbError:
                pass
            return DeviceMode.ADB_SYSTEM

        return DeviceMode.DISCONNECTED

    async def reboot(self, mode: str = "", serial: Optional[str] = None) -> None:
        """重启设备"""
        serial_args = ["-s", serial] if serial else []
        mode_arg = [mode] if mode else []
        await self._run(*serial_args, "reboot", *mode_arg, timeout=15)

    async def reboot_bootloader(self, serial: Optional[str] = None) -> None:
        """重启到 Bootloader"""
        await self.reboot("bootloader", serial)

    async def reboot_recovery(self, serial: Optional[str] = None) -> None:
        """重启到 Recovery"""
        await self.reboot("recovery", serial)

    async def reboot_fastbootd(self, serial: Optional[str] = None) -> None:
        """重启到 FastbootD (Android 10+ 动态分区)"""
        await self.reboot("fastboot", serial)

    async def pull(self, remote: str, local: str, serial: Optional[str] = None) -> None:
        """从设备拉取文件"""
        serial_args = ["-s", serial] if serial else []
        await self._run(*serial_args, "pull", remote, local, timeout=120)

    async def push(self, local: str, remote: str, serial: Optional[str] = None) -> None:
        """推送文件到设备"""
        serial_args = ["-s", serial] if serial else []
        await self._run(*serial_args, "push", local, remote, timeout=120)

    async def shell(self, command: str, serial: Optional[str] = None, timeout: int = 30) -> str:
        """执行 shell 命令"""
        serial_args = ["-s", serial] if serial else []
        return await self._run(*serial_args, "shell", command, timeout=timeout)

    async def root(self, serial: Optional[str] = None) -> bool:
        """尝试 adb root"""
        try:
            serial_args = ["-s", serial] if serial else []
            output = await self._run(*serial_args, "root", timeout=10)
            return "adbd is already running as root" in output or "restarting adbd as root" in output
        except AdbError:
            return False
