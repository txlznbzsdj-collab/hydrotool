"""
ROM 工具箱 API 路由

POST /api/rom/payload-info    — 解析 payload.bin 分区列表
POST /api/rom/boot-info       — 解析 boot.img 信息
POST /api/rom/boot-extract    — 拆包 boot.img
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException

from hydrotool.core.rom.payload_parser import PayloadParser, PayloadError
from hydrotool.core.rom.boot_image import BootImage, BootImageError

router = APIRouter()


@router.post("/payload-info")
async def payload_info(body: dict):
    """解析 payload.bin，返回分区列表"""
    path = body.get("path", "")
    if not path or not Path(path).is_file():
        raise HTTPException(status_code=400, detail=f"文件不存在: {path}")

    try:
        with PayloadParser(path) as p:
            return {
                "path": path,
                "version": p.version,
                "block_size": p.block_size,
                "manifest_size": p.manifest_size,
                "partitions": p.partitions,
            }
    except PayloadError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/boot-info")
async def boot_info(body: dict):
    """解析 boot.img，返回 header 信息"""
    path = body.get("path", "")
    if not path or not Path(path).is_file():
        raise HTTPException(status_code=400, detail=f"文件不存在: {path}")

    try:
        img = BootImage(path)
        info = img.info
        img.close()
        return {"path": path, **info}
    except BootImageError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/boot-extract")
async def boot_extract(body: dict):
    """拆包 boot.img，提取 kernel 和 ramdisk"""
    path = body.get("path", "")
    output_dir = body.get("output_dir", "/tmp/hydrotool_boot_extract")

    if not path or not Path(path).is_file():
        raise HTTPException(status_code=400, detail=f"文件不存在: {path}")

    try:
        img = BootImage(path)
        extracted = img.extract(output_dir)
        img.close()
        return {
            "path": path,
            "output_dir": output_dir,
            "files": {k: str(v) for k, v in extracted.items() if v},
        }
    except BootImageError as e:
        raise HTTPException(status_code=400, detail=str(e))
