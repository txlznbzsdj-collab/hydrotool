"""
Android update_engine payload.bin 解析器

解析 Google OTA payload.bin 格式，提取分区列表和镜像数据。
Magic: "CrAU" (ChromeOS AU, Android 沿用)
"""

import struct
from pathlib import Path
from typing import Callable, Optional

from hydrotool.core.rom.protos import update_metadata_pb2


class PayloadError(Exception):
    """Payload 解析错误"""
    pass


class PayloadParser:
    """Android update_engine payload.bin 解析器"""

    MAGIC = b"CrAU"
    HEADER_SIZE = 24

    def __init__(self, path: str):
        self._path = Path(path)
        if not self._path.is_file():
            raise PayloadError(f"Payload 文件不存在: {path}")

        self._size = self._path.stat().st_size
        self._fh = open(self._path, "rb")
        self._parse_header()
        self._parse_manifest()

    def _parse_header(self) -> None:
        """解析 payload.bin 固定 24 字节头部"""
        raw = self._fh.read(self.HEADER_SIZE)
        if len(raw) < self.HEADER_SIZE:
            raise PayloadError("Payload 文件头部不完整")

        # struct: <4s 2Q 2B (little-endian)
        magic, version, manifest_size, sig_size, _, _ = struct.unpack_from("<4s 2Q 2B", raw)
        if magic != self.MAGIC:
            raise PayloadError(f"无效的 payload magic: {magic!r}, 期望 {self.MAGIC!r}")

        self.version = version
        self.manifest_size = manifest_size
        self.signature_size = sig_size

    def _parse_manifest(self) -> None:
        """解析 protobuf manifest"""
        self._fh.seek(self.HEADER_SIZE)
        raw = self._fh.read(self.manifest_size)
        if len(raw) < self.manifest_size:
            raise PayloadError("Manifest 数据不完整")

        self._manifest = update_metadata_pb2.DeltaArchiveManifest()
        self._manifest.ParseFromString(raw)

    @property
    def block_size(self) -> int:
        """块大小（通常是 4096）"""
        return self._manifest.block_size or 4096

    @property
    def partitions(self) -> list[dict]:
        """获取分区列表"""
        results = []
        for p in self._manifest.partitions:
            results.append({
                "name": p.partition_name,
                "operations": len(p.operations),
                "new_size": p.new_partition_info,
                "has_hash_tree": bool(p.hash_tree_data),
            })
        return results

    def extract_image(self, partition_name: str, output_path: str) -> int:
        """提取单个分区的镜像数据（拼接所有 REPLACE operations）

        Returns:
            写入的字节数
        """
        target = None
        for p in self._manifest.partitions:
            if p.partition_name == partition_name:
                target = p
                break
        if not target:
            raise PayloadError(f"分区 '{partition_name}' 不在 payload 中")

        out = open(output_path, "wb")
        written = 0

        for op in target.operations:
            if op.type in (0, 1, 6):  # REPLACE, REPLACE_BZ, REPLACE_XZ
                data_offset = self.HEADER_SIZE + self.manifest_size + op.data_offset
                self._fh.seek(data_offset)
                data = self._fh.read(op.data_length)
                out.write(data)
                written += len(data)

        out.close()
        return written

    async def flash_partitions(
        self,
        fb,
        serial: str,
        slot: str = "",
        on_progress: Optional[Callable] = None,
    ) -> list[dict]:
        """按顺序刷写所有分区

        Returns:
            [{partition, status, message}, ...]
        """
        results = []
        parts = self.partitions

        for i, p in enumerate(parts):
            name = p["name"]
            progress = (i / len(parts)) * 100 if parts else 0

            if on_progress:
                await on_progress(progress, f"刷写 {name} ({i+1}/{len(parts)})...")

            tmp_img = f"/tmp/hydrotool_flash_{name}.img"
            try:
                self.extract_image(name, tmp_img)
                result = await fb.flash(name, tmp_img, serial, slot)
                results.append({"partition": name, "status": "ok", "message": result})
            except Exception as e:
                results.append({"partition": name, "status": "failed", "message": str(e)})
            finally:
                Path(tmp_img).unlink(missing_ok=True)

        return results

    def close(self) -> None:
        """关闭文件句柄"""
        self._fh.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def __repr__(self) -> str:
        return f"<PayloadParser version={self.version} partitions={len(self.partitions)}>"
