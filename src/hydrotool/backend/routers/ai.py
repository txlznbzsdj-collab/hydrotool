"""
AI 自动模式 API 路由

POST /api/ai/execute  — 启动 AI 执行
GET  /api/ai/status    — 查询执行状态
WS   /ws/ai/progress   — WebSocket 实时推送
"""

import asyncio
import json
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from hydrotool.core.ai.executor import AiExecutor, ExecutionState, ExecutionStep

router = APIRouter()

# 全局执行器实例（单任务）
_executor: Optional[AiExecutor] = None
_state: Optional[ExecutionState] = None

# WebSocket 连接列表
_ws_clients: list = []


# ============================================================
# 请求/响应模型
# ============================================================

class ExecuteRequest(BaseModel):
    goal: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    serial: Optional[str] = None


class ExecuteResponse(BaseModel):
    success: bool
    summary: str
    steps: list[dict]


class StatusResponse(BaseModel):
    status: str  # idle | running | done | error
    goal: str = ""
    summary: str = ""
    success: bool = False
    error: str = ""
    step_count: int = 0
    steps: list[dict] = []


# ============================================================
# 路由
# ============================================================


@router.get("/status", response_model=StatusResponse)
async def get_status():
    """获取当前 AI 执行状态"""
    global _state

    if _state is None:
        return StatusResponse(status="idle")

    return StatusResponse(
        status=_state.status,
        goal=_state.goal,
        summary=_state.summary,
        success=_state.success,
        error=_state.error,
        step_count=len(_state.steps),
        steps=[
            {
                "step": s.step,
                "tool": s.tool_name,
                "args": s.arguments,
                "result": s.result[:300],
            }
            for s in _state.steps
        ],
    )


@router.post("/execute", response_model=ExecuteResponse)
async def execute(req: ExecuteRequest):
    """启动 AI 自动执行"""
    global _executor, _state

    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="目标不能为空")

    # 检查 API key
    api_key = req.api_key or None
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="请提供 API Key（在设置中配置 OpenAI 兼容 API）",
        )

    # 创建执行器
    _executor = AiExecutor(
        api_key=api_key,
        base_url=req.base_url or None,
        model=req.model or None,
    )

    # 注册 WebSocket 推送回调
    _executor.on_step(lambda step: _broadcast_step(step))

    # 执行
    device_context = {"serial": req.serial} if req.serial else None
    _state = await _executor.execute(req.goal, device_context)

    return ExecuteResponse(
        success=_state.success,
        summary=_state.summary,
        steps=[
            {
                "step": s.step,
                "tool": s.tool_name,
                "args": s.arguments,
                "result": s.result[:500],
            }
            for s in _state.steps
        ],
    )


# ============================================================
# WebSocket
# ============================================================


@router.websocket("/progress")
async def ai_progress_ws(websocket: WebSocket):
    """AI 执行进度 WebSocket 推送"""
    await websocket.accept()
    register_ws_client(websocket)
    try:
        while True:
            # 保持连接，等待客户端消息（可发 ping）
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        unregister_ws_client(websocket)


# ============================================================
# WebSocket 支持
# ============================================================


def register_ws_client(ws):
    """注册 WebSocket 客户端"""
    _ws_clients.append(ws)


def unregister_ws_client(ws):
    """注销 WebSocket 客户端"""
    if ws in _ws_clients:
        _ws_clients.remove(ws)


async def _broadcast_step(step: ExecutionStep):
    """广播步骤到所有 WebSocket 客户端"""
    dead: list = []
    msg = json.dumps({
        "type": "ai_step",
        "step": step.step,
        "tool": step.tool_name,
        "args": step.arguments,
        "result": step.result[:500],
        "timestamp": step.timestamp,
    })
    for ws in _ws_clients:
        try:
            await ws.send_json(json.loads(msg))
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)
