"""
模块管理 API

GET  /api/modules/list/{serial}       — 列出已安装模块
POST /api/modules/toggle/{serial}     — 启用/禁用模块
"""

from fastapi import APIRouter, HTTPException

from hydrotool.core.adb.client import AdbClient

router = APIRouter()
adb = AdbClient()

MODULE_PATHS = [
    "/data/adb/modules",
    "/data/adb/ksu/modules",
    "/data/adb/ap/modules",
]

MODULE_SOURCES = {
    "/data/adb/modules": "Magisk",
    "/data/adb/ksu/modules": "KernelSU",
    "/data/adb/ap/modules": "APatch",
}


@router.get("/list/{serial}")
async def list_modules(serial: str):
    """列出所有已安装模块"""
    all_modules = []

    for path, source in MODULE_SOURCES.items():
        try:
            result = await adb._run("-s", serial, "shell", f"ls -1 {path} 2>/dev/null", timeout=5)
            if result.strip():
                for name in result.strip().split("\n"):
                    name = name.strip()
                    if name and name != "lost+found":
                        # Check if disabled
                        try:
                            disable_file = await adb._run("-s", serial, "shell", f"test -f {path}/{name}/disable && echo 1 || echo 0", timeout=3)
                            disabled = disable_file.strip() == "1"
                        except Exception:
                            disabled = False

                        # Get module.prop
                        desc = ""
                        try:
                            prop = await adb._run("-s", serial, "shell", f"cat {path}/{name}/module.prop 2>/dev/null", timeout=3)
                            for line in prop.split("\n"):
                                if "=" in line:
                                    k, v = line.split("=", 1)
                                    if k.strip() == "description":
                                        desc = v.strip()
                                        break
                        except Exception:
                            pass

                        all_modules.append({
                            "name": name,
                            "source": source,
                            "disabled": disabled,
                            "description": desc,
                        })
        except Exception:
            pass

    return {"serial": serial, "modules": all_modules, "total": len(all_modules)}


@router.post("/toggle/{serial}")
async def toggle_module(serial: str, body: dict):
    """启用/禁用模块"""
    module_name = body.get("name", "")
    enable = body.get("enable", True)
    source = body.get("source", "/data/adb/modules")

    if not module_name:
        raise HTTPException(status_code=400, detail="模块名不能为空")

    module_path = f"{source}/{module_name}"
    disable_file = f"{module_path}/disable"

    try:
        if enable:
            await adb._run("-s", serial, "shell", f"rm -f {disable_file}", timeout=5)
        else:
            await adb._run("-s", serial, "shell", f"touch {disable_file}", timeout=5)
        return {"status": "ok", "name": module_name, "enabled": enable}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
