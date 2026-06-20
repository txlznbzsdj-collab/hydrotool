"""
ROM 工具箱 — 镜像拆包/打包/备份

提供:
- payload.bin 解析与分区提取
- boot.img 拆包/打包
- 分区备份与恢复
- DSU 制作（占位）
"""

from hydrotool.core.rom.payload_parser import PayloadParser, PayloadError
from hydrotool.core.rom.boot_image import BootImage, BootImageError


class RomToolkit:
    """ROM 工具箱统一入口"""

    @staticmethod
    def open_payload(path: str) -> PayloadParser:
        """打开 payload.bin 文件"""
        return PayloadParser(path)

    @staticmethod
    def open_boot_image(path: str) -> BootImage:
        """打开 boot.img 文件"""
        return BootImage(path)

    @staticmethod
    async def backup_partition(fb, partition: str, serial: str, output: str) -> str:
        """备份分区到本地文件（通过 fastboot）"""
        result = await fb._run(f"-s", serial, "fetch", partition, output)
        return result

    @staticmethod
    def prepare_dsu(system_img: str, output_path: str) -> str:
        """DSU 镜像制作（Phase 2 实现）"""
        return "DSU 功能将在后续版本实现"


__all__ = [
    "PayloadParser", "PayloadError",
    "BootImage", "BootImageError",
    "RomToolkit",
]
