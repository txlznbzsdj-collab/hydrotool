"""
Root 管理 API — boot 提取/查看/修补
"""
from pathlib import Path

from fastapi import APIRouter, HTTPException

from hydrotool.core.adb.client import AdbClient
from hydrotool.core.rom.boot_image import BootImage, BootImageError

router = APIRouter()
adb = AdbClient()


@router.get("/boot-info/{serial}")
async def get_boot_info(serial: str):
    """查看当前 boot 分区信息（通过 block 路径读取 header）"""
    try:
        boot_path = await adb._run("-s", serial, "shell", "ls", "/dev/block/by-name/boot", timeout=5)
        boot_path = boot_path.strip()
        if not boot_path or "No such" in boot_path:
            return {"status": "no_boot_partition", "message": "未找到 boot 分区"}
        return {"status": "ok", "partition": boot_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/boot-slots/{serial}")
async def get_boot_slots(serial: str):
    """查看 A/B boot 分区"""
    slots = []
    for s in ["_a", "_b"]:
        try:
            result = await adb._run("-s", serial, "shell", f"ls -l /dev/block/by-name/boot{s}", timeout=5)
            if result.strip() and "No such" not in result:
                slots.append({"slot": s.lstrip("_"), "exists": True, "info": result.strip()})
            else:
                slots.append({"slot": s.lstrip("_"), "exists": False})
        except Exception:
            slots.append({"slot": s.lstrip("_"), "exists": False})
    return {"serial": serial, "slots": slots}
