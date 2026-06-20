"""
环境隐藏检测 API

POST /api/hide/scan/{serial} — 扫描常见 Root/环境隐藏检测点
"""

import re

from fastapi import APIRouter

from hydrotool.core.adb.client import AdbClient

router = APIRouter()
adb = AdbClient()

# 检测项定义：{名称: (方法, 检测内容, 不安全关键词)}
CHECKS = {
    "su_binary": ("shell which su", "/su", "system/bin/su"),
    "magisk_binary": ("shell which magisk", "/magisk", "magisk"),
    "magisk_app": ("shell pm list packages magisk", "package:", "com.topjohnwu.magisk"),
    "magisk_hide_props": ("shell getprop | grep magisk", "magisk", ""),
    "selinux_status": ("shell getenforce", "Permissive", ""),
    "verified_boot": ("shell getprop ro.boot.verifiedbootstate", "green", "orange/yellow/red"),
    "adb_root": ("shell id", "uid=0", "root"),
    "debuggable": ("shell getprop ro.debuggable", "0", "1"),
    "xposed": ("shell pm list packages de.robv.android.xposed", "package:", "de.robv"),
    "lsposed": ("shell pm list packages org.lsposed", "package:", "lsposed"),
}


@router.post("/scan/{serial}")
async def scan_hide(serial: str):
    """扫描设备环境隐藏状态"""
    results = []

    for name, (cmd, safe_val, risky_val) in CHECKS.items():
        try:
            output = await adb._run("-s", serial, *cmd.split(), timeout=5)
            is_risky = bool(risky_val) and risky_val.lower() in output.lower()
            # Special cases
            if name == "verified_boot" and "green" not in output.lower():
                is_risky = True
            if name == "selinux_status" and "permissive" in output.lower():
                is_risky = True
            if name == "debuggable" and output.strip() == "1":
                is_risky = True
            if name == "adb_root" and "uid=0" in output.lower():
                is_risky = True

            results.append({
                "check": name,
                "status": "risky" if is_risky else "safe",
                "output": output.strip()[:200],
                "label": _LABELS.get(name, name),
                "description": _DESCS.get(name, ""),
            })
        except Exception:
            results.append({
                "check": name,
                "status": "unknown",
                "output": "",
                "label": _LABELS.get(name, name),
                "description": _DESCS.get(name, ""),
            })

    risk_count = sum(1 for r in results if r["status"] == "risky")
    return {
        "serial": serial,
        "checks": results,
        "risk_count": risk_count,
        "total": len(results),
        "verdict": "safe" if risk_count == 0 else "exposed" if risk_count <= 3 else "high_risk",
    }


_LABELS = {
    "su_binary": "su 二进制",
    "magisk_binary": "Magisk 二进制",
    "magisk_app": "Magisk App",
    "magisk_hide_props": "Magisk 属性",
    "selinux_status": "SELinux 状态",
    "verified_boot": "验证启动",
    "adb_root": "ADB Root",
    "debuggable": "可调试",
    "xposed": "Xposed",
    "lsposed": "LSPosed",
}

_DESCS = {
    "su_binary": "检测系统中是否存在 su 命令",
    "magisk_binary": "检测是否存在 magisk 二进制",
    "magisk_app": "检测是否安装了 Magisk Manager",
    "magisk_hide_props": "检测系统属性中是否有 magisk 痕迹",
    "selinux_status": "SELinux 应为 Enforcing 模式",
    "verified_boot": "验证启动应为 green 状态",
    "adb_root": "ADB 不应以 root 身份运行",
    "debuggable": "ro.debuggable 应为 0",
    "xposed": "检测 Xposed 框架",
    "lsposed": "检测 LSPosed 框架",
}
