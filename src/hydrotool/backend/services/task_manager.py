"""
异步刷机任务管理器

提供任务的创建、进度更新、日志记录和 WebSocket 广播能力。
"""

import asyncio
import json
from datetime import datetime
from typing import Optional

from fastapi import WebSocket


class TaskManager:
    """异步刷机任务管理器（单例模式，内存存储）"""

    def __init__(self):
        self._tasks: dict[str, dict] = {}
        self._ws_clients: dict[str, list[WebSocket]] = {}
        self._counter = 0

    def create_task(self, task_type: str = "flash") -> str:
        """创建新任务，返回 task_id"""
        self._counter += 1
        ts = datetime.now().strftime("%Y%m%dT%H%M%S")
        task_id = f"{task_type}_{self._counter:06d}_{ts}"

        self._tasks[task_id] = {
            "task_id": task_id,
            "type": task_type,
            "status": "pending",
            "progress": 0.0,
            "current_step": "",
            "message": "任务已创建",
            "timestamp": datetime.now().isoformat(),
            "logs": [],
        }
        self._ws_clients[task_id] = []
        return task_id

    async def update_progress(
        self,
        task_id: str,
        progress: float,
        message: str = "",
        step: str = "",
    ) -> None:
        """更新进度并广播"""
        task = self._tasks.get(task_id)
        if not task:
            return
        task["progress"] = min(progress, 100.0)
        task["status"] = "running"
        if message:
            task["message"] = message
        if step:
            task["current_step"] = step
        task["timestamp"] = datetime.now().isoformat()

        await self._broadcast(task_id, {
            "type": "progress",
            "task_id": task_id,
            "progress": task["progress"],
            "current_step": task["current_step"],
            "message": task["message"],
            "timestamp": task["timestamp"],
        })

    async def add_log(self, task_id: str, level: str, message: str) -> None:
        """追加日志并广播"""
        task = self._tasks.get(task_id)
        if not task:
            return
        entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
        }
        task["logs"].append(entry)

        await self._broadcast(task_id, {
            "type": "log",
            "task_id": task_id,
            "level": level,
            "message": message,
            "timestamp": entry["timestamp"],
        })

    async def complete_task(self, task_id: str, success: bool, message: str = "") -> None:
        """标记任务完成/失败"""
        task = self._tasks.get(task_id)
        if not task:
            return
        task["status"] = "completed" if success else "failed"
        task["progress"] = 100.0 if success else task["progress"]
        task["message"] = message
        task["timestamp"] = datetime.now().isoformat()

        await self._broadcast(task_id, {
            "type": "complete",
            "task_id": task_id,
            "status": task["status"],
            "message": message,
            "timestamp": task["timestamp"],
        })

    def get_task(self, task_id: str) -> Optional[dict]:
        """获取任务状态"""
        return self._tasks.get(task_id)

    def register_ws(self, task_id: str, ws: WebSocket) -> None:
        """注册 WebSocket 客户端"""
        if task_id not in self._ws_clients:
            self._ws_clients[task_id] = []
        self._ws_clients[task_id].append(ws)

    def unregister_ws(self, task_id: str, ws: WebSocket) -> None:
        """注销 WebSocket 客户端"""
        clients = self._ws_clients.get(task_id, [])
        if ws in clients:
            clients.remove(ws)

    async def _broadcast(self, task_id: str, msg: dict) -> None:
        """向该任务的所有 WebSocket 客户端广播"""
        clients = self._ws_clients.get(task_id, [])
        data = json.dumps(msg, ensure_ascii=False)
        dead = []
        for ws in clients:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.unregister_ws(task_id, ws)


# 全局单例
task_manager = TaskManager()
