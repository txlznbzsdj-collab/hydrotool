"""
WebSocket 刷机进度实时推送

连接后按 task_id 订阅进度更新、日志和完成状态。
Endpoint: /ws/flash/{task_id}
"""

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from hydrotool.backend.services.task_manager import task_manager

router = APIRouter()


@router.websocket("/flash/{task_id}")
async def flash_progress_ws(websocket: WebSocket, task_id: str):
    """刷机任务实时进度推送"""
    await websocket.accept()
    task_manager.register_ws(task_id, websocket)

    try:
        # 发送当前状态
        task = task_manager.get_task(task_id)
        if task:
            await websocket.send_json({
                "type": "state",
                "task_id": task_id,
                "status": task["status"],
                "progress": task["progress"],
                "current_step": task["current_step"],
                "message": task["message"],
                "logs": task.get("logs", []),
            })

        # 保持连接
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        task_manager.unregister_ws(task_id, websocket)
