"""
WebSocket 实时设备状态推送

建立连接后持续推送设备状态变化、刷写进度等实时信息。
"""

import asyncio
import json
import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from hydrotool.core.adb.client import AdbClient
from hydrotool.core.fastboot.client import FastbootClient
from hydrotool.core.device import MODE_LABELS

logger = logging.getLogger("hydrotool.ws")
router = APIRouter()


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """广播消息给所有连接"""
        data = json.dumps(message, ensure_ascii=False)
        dead = []
        for conn in self.active_connections:
            try:
                await conn.send_text(data)
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.disconnect(conn)


manager = ConnectionManager()


@router.websocket("/devices")
async def device_status_websocket(websocket: WebSocket):
    """设备状态实时推送 WebSocket

    连接后每秒推送设备状态变化。
    """
    await manager.connect(websocket)
    adb = AdbClient()
    fb = FastbootClient()

    try:
        while True:
            # 扫描设备
            adb_devices = await adb.devices()
            fb_devices = await fb.devices()

            devices_info = []

            for d in adb_devices[:5]:  # 最多 5 台
                if d["status"] == "device":
                    try:
                        info = await adb.get_device_info(d["serial"])
                        mode = await adb.get_mode(d["serial"])
                        devices_info.append({
                            "serial": d["serial"],
                            "model": info.model,
                            "brand": info.brand,
                            "android_version": info.android_version,
                            "mode": mode.name,
                            "mode_label": MODE_LABELS.get(mode, ""),
                            "bootloader_unlocked": info.bootloader_unlocked,
                            "root_method": info.root_method or "",
                            "type": "adb",
                        })
                    except Exception:
                        devices_info.append({
                            "serial": d["serial"],
                            "type": "adb",
                            "status": d["status"],
                        })

            for d in fb_devices[:3]:
                devices_info.append({
                    "serial": d["serial"],
                    "type": "fastboot",
                    "status": d["status"],
                })

            # 推送状态
            await websocket.send_json({
                "type": "device_status",
                "timestamp": datetime.now().isoformat(),
                "devices": devices_info,
                "adb_count": len(adb_devices),
                "fastboot_count": len(fb_devices),
            })

            # 接收客户端消息（实现双向通信）
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                pass
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket 错误: {e}")
        manager.disconnect(websocket)
