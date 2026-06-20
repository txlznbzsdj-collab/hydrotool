"""
Android Boot Image 解析器

支持 header v0-v4 的 boot.img / recovery.img 拆包与打包。
参考: AOSP system/tools/mkbootimg/include/bootimg/bootimg.h
"""

import struct
import gzip
import shutil
from pathlib import Path
from typing import Optional


class BootImageError(Exception):
    """Boot Image 解析错误"""
    pass


class BootImage:
    """Android Boot Image 解析器"""

    MAGIC = b"ANDROID!"
    MAGIC_SIZE = 8

    # v0 header (1632 bytes without fields table)
    V0_HEADER_FORMAT = "<8s 10I 16s 512s 32s 1024s"
    V0_HEADER_SIZE = 1632

    def __init__(self, path: str):
        self._path = Path(path)
        if not self._path.is_file():
            raise BootImageError(f"文件不存在: {path}")

        self._fh = open(self._path, "rb")
        self._size = self._path.stat().st_size
        self._parse()

    def _parse(self) -> None:
        """解析 boot image header"""
        raw = self._fh.read(self.MAGIC_SIZE)
        if raw != self.MAGIC:
            raise BootImageError(f"不是有效的 Android boot image (magic: {raw!r})")

        # Parse v0 header
        hdr_raw = self._fh.read(self.V0_HEADER_SIZE)
        if len(hdr_raw) < self.V0_HEADER_SIZE:
            raise BootImageError("Header 不完整")

        (
            _,  # magic (already consumed)
            self._kernel_size,
            self._kernel_addr,
            self._ramdisk_size,
            self._ramdisk_addr,
            self._second_size,
            self._second_addr,
            self._tags_addr,
            self._page_size,
            self._header_version,
            self._os_version,
            _,  # name
            _,  # cmdline
            _,  # id
            _,  # extra_cmdline
        ) = struct.unpack_from(self.V0_HEADER_FORMAT, hdr_raw)

        if self._page_size == 0:
            self._page_size = 2048  # default

        # Calculate offsets
        self._kernel_offset = self._page_size
        self._ramdisk_offset = self._page_size + self._round_up(self._kernel_size, self._page_size)
        self._second_offset = self._ramdisk_offset + self._round_up(self._ramdisk_size, self._page_size)

    @staticmethod
    def _round_up(size: int, page: int) -> int:
        return ((size + page - 1) // page) * page

    @property
    def header_version(self) -> int:
        return self._header_version

    @property
    def kernel_size(self) -> int:
        return self._kernel_size

    @property
    def ramdisk_size(self) -> int:
        return self._ramdisk_size

    @property
    def page_size(self) -> int:
        return self._page_size

    @property
    def info(self) -> dict:
        """获取 boot image 概览信息"""
        return {
            "header_version": self._header_version,
            "kernel_size": self._kernel_size,
            "kernel_addr": hex(self._kernel_addr),
            "ramdisk_size": self._ramdisk_size,
            "ramdisk_addr": hex(self._ramdisk_addr),
            "second_size": self._second_size,
            "page_size": self._page_size,
            "total_size": self._size,
        }

    def extract(self, output_dir: str) -> dict[str, Path]:
        """提取 kernel 和 ramdisk 到输出目录

        Returns:
            {"kernel": Path, "ramdisk": Path}
        """
        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)

        # Extract kernel
        self._fh.seek(self._kernel_offset)
        kernel_data = self._fh.read(self._kernel_size)
        kernel_path = out / "kernel"
        kernel_path.write_bytes(kernel_data)

        # Extract ramdisk
        self._fh.seek(self._ramdisk_offset)
        ramdisk_data = self._fh.read(self._ramdisk_size)
        ramdisk_path = out / "ramdisk"

        # Try decompressing ramdisk
        try:
            decompressed = gzip.decompress(ramdisk_data)
            ramdisk_path.write_bytes(decompressed)
        except gzip.BadGzipFile:
            ramdisk_path = out / "ramdisk.gz"
            ramdisk_path.write_bytes(ramdisk_data)

        # Extract second if present
        second_path = None
        if self._second_size > 0:
            self._fh.seek(self._second_offset)
            second_data = self._fh.read(self._second_size)
            second_path = out / "second"
            second_path.write_bytes(second_data)

        return {
            "kernel": kernel_path,
            "ramdisk": ramdisk_path,
            "second": second_path,
        }

    @staticmethod
    def create(
        output_path: str,
        kernel_path: str,
        ramdisk_path: str,
        cmdline: str = "",
        base_addr: int = 0x10000000,
        page_size: int = 2048,
        second_path: Optional[str] = None,
        header_version: int = 0,
    ) -> str:
        """创建新的 boot.img（使用 mkbootimg 或手动构建）

        Returns:
            输出文件路径
        """
        # Try using system mkbootimg
        mkbootimg = shutil.which("mkbootimg")
        if mkbootimg:
            import subprocess
            cmd = [
                mkbootimg,
                f"--kernel={kernel_path}",
                f"--ramdisk={ramdisk_path}",
                f"--output={output_path}",
                f"--header_version={header_version}",
            ]
            if cmdline:
                cmd.append(f"--cmdline={cmdline}")
            if base_addr:
                cmd.append(f"--base={hex(base_addr)}")
            if second_path and Path(second_path).is_file():
                cmd.append(f"--second={second_path}")
            if page_size:
                cmd.append(f"--pagesize={page_size}")

            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise BootImageError(f"mkbootimg 失败: {result.stderr}")
            return output_path

        # Fallback: manual construction (simplified)
        kernel_bytes = Path(kernel_path).read_bytes()
        ramdisk_bytes = Path(ramdisk_path).read_bytes()

        kernel_size = len(kernel_bytes)
        ramdisk_size = len(ramdisk_bytes)
        second_size = 0
        second_bytes = b""

        if second_path and Path(second_path).is_file():
            second_bytes = Path(second_path).read_bytes()
            second_size = len(second_bytes)

        # Build header
        name_bytes = b"\x00" * 16
        cmdline_bytes = cmdline.encode("utf-8").ljust(512, b"\x00")[:512]
        extra_cmdline = b"\x00" * 1024
        id_bytes = b"\x00" * 32

        header = struct.pack(
            BootImage.V0_HEADER_FORMAT,
            BootImage.MAGIC,
            kernel_size, 0x10008000,  # kernel_size, kernel_addr
            ramdisk_size, 0x11000000,  # ramdisk_size, ramdisk_addr
            second_size, 0x10F00000,   # second_size, second_addr
            0x10000100, page_size,     # tags_addr, page_size
            header_version, 0,         # header_version, os_version
            name_bytes, cmdline_bytes, id_bytes, extra_cmdline,
        )

        with open(output_path, "wb") as f:
            f.write(header)
            f.write(b"\x00" * (page_size - len(header)))
            f.write(kernel_bytes)
            f.write(b"\x00" * (BootImage._round_up(kernel_size, page_size) - kernel_size))
            f.write(ramdisk_bytes)
            f.write(b"\x00" * (BootImage._round_up(ramdisk_size, page_size) - ramdisk_size))
            if second_size > 0:
                f.write(second_bytes)

        return output_path

    def close(self) -> None:
        self._fh.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def __repr__(self) -> str:
        return f"<BootImage v{self._header_version} kernel={self._kernel_size}b ramdisk={self._ramdisk_size}b>"
