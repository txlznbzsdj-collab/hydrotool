"""
Fastboot 客户端封装

封装 fastboot 命令行工具调用，提供异步刷机能力。
"""

import asyncio
import re
import shutil
from typing import Optional

from hydrotool.core.device import DeviceMode


class FastbootError(Exception):
    """Fastboot 操作异常"""
    def __init__(self, message: str, cmd: str = "", returncode: int = -1):
        self.cmd = cmd
        self.returncode = returncode
        super().__init__(f"[{returncode}] {message}")


class FastbootClient:
    """Fastboot 客户端"""

    def __init__(self, fastboot_path: str = "fastboot"):
        self._fastboot_path = self._resolve_fastboot(fastboot_path)

    @staticmethod
    def _resolve_fastboot(fastboot_path: str) -> str:
        resolved = shutil.which(fastboot_path)
        return resolved or fastboot_path

    async def _run(self, *args: str, timeout: int = 60) -> str:
        """执行 fastboot 命令"""
        cmd = [self._fastboot_path, *args]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=timeout
            )
            output = stdout.decode().strip()
            error_output = stderr.decode().strip()

            if proc.returncode != 0:
                raise FastbootError(
                    error_output or output,
                    cmd=" ".join(cmd),
                    returncode=proc.returncode,
                )
            return output or error_output
        except asyncio.TimeoutError:
            raise FastbootError("命令超时", cmd=" ".join(cmd))

    async def devices(self) -> list[dict]:
        """列出 fastboot 模式下的设备"""
        output = await self._run("devices", timeout=10)
        devices = []
        for line in output.splitlines():
            if not line.strip():
                continue
            parts = line.split()
            if len(parts) >= 2:
                devices.append({
                    "serial": parts[0],
                    "status": parts[1],
                })
        return devices

    async def is_device_connected(self, serial: Optional[str] = None) -> bool:
        """检查是否有 fastboot 设备"""
        devices = await self.devices()
        if serial:
            return any(d["serial"] == serial for d in devices)
        return len(devices) > 0

    async def get_var(self, variable: str, serial: Optional[str] = None) -> str:
        """获取 fastboot 变量"""
        serial_args = ["-s", serial] if serial else []
        output = await self._run(*serial_args, "getvar", variable, timeout=10)
        # 输出格式: "variable: value" 或 "variable: "
        match = re.search(rf"{re.escape(variable)}:\s*(.*)", output)
        return match.group(1).strip() if match else ""

    async def get_all_vars(self, serial: Optional[str] = None) -> dict:
        """获取所有 fastboot 变量"""
        serial_args = ["-s", serial] if serial else []
        output = await self._run(*serial_args, "getvar", "all", timeout=15)
        vars_dict = {}
        for line in output.splitlines():
            if ":" in line and not line.startswith("getvar:all"):
                key, _, value = line.partition(":")
                vars_dict[key.strip()] = value.strip()
        return vars_dict

    async def flash(self, partition: str, image_path: str, serial: Optional[str] = None, slot: str = "") -> str:
        """刷写分区"""
        serial_args = ["-s", serial] if serial else []
        slot_args = ["--slot", slot] if slot else []
        return await self._run(
            *serial_args, *slot_args, "flash", partition, image_path, timeout=120
        )

    async def flash_all(self, serial: Optional[str] = None) -> str:
        """刷写所有分区（用于原厂包）"""
        serial_args = ["-s", serial] if serial else []
        return await self._run(*serial_args, "flash", "all", timeout=300)

    async def erase(self, partition: str, serial: Optional[str] = None) -> str:
        """擦除分区"""
        serial_args = ["-s", serial] if serial else []
        return await self._run(*serial_args, "erase", partition, timeout=30)

    async def boot(self, image_path: str, serial: Optional[str] = None) -> str:
        """临时启动（不刷写）"""
        serial_args = ["-s", serial] if serial else []
        return await self._run(*serial_args, "boot", image_path, timeout=30)

    async def reboot(self, serial: Optional[str] = None) -> str:
        """重启设备"""
        serial_args = ["-s", serial] if serial else []
        return await self._run(*serial_args, "reboot", timeout=15)

    async def reboot_bootloader(self, serial: Optional[str] = None) -> str:
        """重启到 Bootloader"""
        serial_args = ["-s", serial] if serial else []
        return await self._run(*serial_args, "reboot-bootloader", timeout=15)

    async def reboot_fastbootd(self, serial: Optional[str] = None) -> str:
        """重启到 FastbootD"""
        serial_args = ["-s", serial] if serial else []
        return await self._run(*serial_args, "reboot-fastboot", timeout=15)

    async def get_slot(self, serial: Optional[str] = None) -> str:
        """获取当前活跃槽位"""
        return await self.get_var("current-slot", serial)

    async def set_slot(self, slot: str, serial: Optional[str] = None) -> str:
        """切换活跃槽位"""
        serial_args = ["-s", serial] if serial else []
        return await self._run(*serial_args, "--set-active", slot, timeout=10)

    async def is_unlocked(self, serial: Optional[str] = None) -> bool:
        """检查 Bootloader 是否解锁"""
        var = await self.get_var("unlocked", serial)
        return var.lower() == "yes"

    async def oem_unlock(self, serial: Optional[str] = None) -> str:
        """解锁 Bootloader（需用户确认）"""
        serial_args = ["-s", serial] if serial else []
        try:
            return await self._run(*serial_args, "oem", "unlock", timeout=30)
        except FastbootError as e:
            # 有的设备用不同命令
            return await self._run(*serial_args, "flashing", "unlock", timeout=30)

    async def oem_lock(self, serial: Optional[str] = None) -> str:
        """重新锁定 Bootloader"""
        serial_args = ["-s", serial] if serial else []
        try:
            return await self._run(*serial_args, "oem", "lock", timeout=30)
        except FastbootError:
            return await self._run(*serial_args, "flashing", "lock", timeout=30)

    async def get_mode(self, serial: Optional[str] = None) -> DeviceMode:
        """检测 fastboot 模式下的具体状态"""
        if not await self.is_device_connected(serial):
            return DeviceMode.DISCONNECTED

        # 检查是否是 FastbootD（动态分区）
        try:
            var = await self.get_var("is-userspace", serial)
            if var.lower() == "yes":
                return DeviceMode.FASTBOOTD
        except FastbootError:
            pass

        # 检查是否是 EDL
        try:
            var = await self.get_var("edl", serial)
            if var:
                return DeviceMode.EDL
        except FastbootError:
            pass

        return DeviceMode.FASTBOOT
