"""
AI 执行器 — LLM 驱动的命令生成-执行-反馈闭环

架构:
  用户目标 → LLM(分析+生成命令) → 执行器(运行ADB/Fastboot) → 结果回传LLM → 循环直到完成

使用 OpenAI 兼容 API，支持自定义 endpoint（可用本地模型或第三方 API）。
"""

import asyncio
import json
import os
import subprocess
import shutil
import platform
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Optional

from openai import AsyncOpenAI


# ============================================================
# 类型定义
# ============================================================


@dataclass
class ExecutionStep:
    """单步执行记录"""
    step: int
    tool_name: str
    arguments: dict
    result: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ExecutionState:
    """执行状态"""
    goal: str
    steps: list[ExecutionStep] = field(default_factory=list)
    status: str = "idle"  # idle | running | done | error
    summary: str = ""
    success: bool = False
    error: str = ""


# ============================================================
# 系统提示词
# ============================================================

SYSTEM_PROMPT = """你是 HydroTool 的 AI 刷机助手，运行在用户的 PC 上，通过 ADB 和 Fastboot 控制连接的 Android 设备。

## 你的能力
你可以调用以下工具来操作设备：
- **check_environment**: 检查 PC 上 ADB/Fastboot/Python 环境是否就绪
- **get_device_info**: 获取已连接设备的详细信息（型号、系统版本、Bootloader 状态、Root 状态）
- **run_adb_command**: 在设备上执行 ADB 命令（shell commands, reboot, push, pull, install 等）
- **run_fastboot_command**: 执行 Fastboot 命令（flash, boot, erase, oem unlock 等）
- **finalize**: 任务完成时调用，提供总结信息

## 工作流程
1. 先检查环境（check_environment）
2. 再查看设备信息（get_device_info）
3. 根据用户目标逐步执行操作
4. 每步执行后分析结果再决定下一步
5. 任务完成或无法继续时调用 finalize

## 重要规则
- 每次只调用一个工具，一步一步来
- 收到工具执行结果后分析再决定下一步
- 如果遇到错误，尝试诊断原因并给出修复建议
- 涉及刷写/root 等高风险操作前，向用户确认并说明风险
- 用中文回复，简洁专业
- 如果没有设备连接，引导用户连接设备并开启 USB 调试

## 常用命令参考
- 查看设备: adb devices
- 重启到 fastboot: adb reboot bootloader
- 查看 bootloader 状态: fastboot getvar unlocked
- 刷入 boot: fastboot flash boot boot.img
- 查看 Root: which su 或检查 Magisk
- 安装 APK: adb install app.apk
"""


# ============================================================
# 工具定义（OpenAI function calling 格式）
# ============================================================

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "check_environment",
            "description": "检查当前 PC 环境：ADB、Fastboot、Python 等工具是否可用",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_device_info",
            "description": "获取已连接 Android 设备的详细信息：型号、Android 版本、Bootloader 状态、Root 状态等",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_adb_command",
            "description": "在设备上执行 ADB 命令。常用: adb devices, adb shell ls, adb reboot bootloader, adb install, adb push",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "要执行的 ADB 命令（不含 'adb' 前缀），如 'devices', 'shell getprop ro.build.version.release', 'reboot bootloader'",
                    },
                    "serial": {
                        "type": "string",
                        "description": "目标设备序列号（多设备时必填）",
                    },
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_fastboot_command",
            "description": "执行 Fastboot 命令。常用: fastboot devices, fastboot getvar all, fastboot flash boot boot.img, fastboot oem unlock",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "要执行的 Fastboot 命令（不含 'fastboot' 前缀），如 'devices', 'flash boot boot.img', 'getvar unlocked'",
                    },
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finalize",
            "description": "任务完成或无法继续时调用，向用户提供总结",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "给用户的总结信息，说明完成了什么、当前状态、后续建议",
                    },
                    "success": {
                        "type": "boolean",
                        "description": "任务是否成功完成",
                    },
                },
                "required": ["message", "success"],
            },
        },
    },
]


# ============================================================
# 工具执行器
# ============================================================


async def _run_cli(cmd: list[str], timeout: int = 30) -> str:
    """执行本地命令并返回输出"""
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return stdout.decode("utf-8", errors="replace").strip() or "(无输出)"
    except asyncio.TimeoutError:
        return f"命令超时（{timeout}秒）"
    except FileNotFoundError:
        return f"命令未找到: {cmd[0]}"
    except Exception as e:
        return f"执行失败: {e}"


async def _execute_tool(name: str, args: dict) -> str:
    """执行工具调用，返回结果文本"""
    if name == "check_environment":
        return await _check_environment()

    elif name == "get_device_info":
        return await _get_device_info()

    elif name == "run_adb_command":
        cmd = args.get("command", "")
        serial = args.get("serial")
        adb_path = shutil.which("adb") or "adb"
        full_cmd = [adb_path]
        if serial:
            full_cmd += ["-s", serial]
        full_cmd += cmd.split()
        return await _run_cli(full_cmd)

    elif name == "run_fastboot_command":
        cmd = args.get("command", "")
        fb_path = shutil.which("fastboot") or "fastboot"
        full_cmd = [fb_path] + cmd.split()
        return await _run_cli(full_cmd)

    elif name == "finalize":
        return json.dumps({"done": True, "message": args.get("message", ""), "success": args.get("success", False)})

    else:
        return f"未知工具: {name}"


async def _check_environment() -> str:
    """检查运行环境"""
    lines = []
    lines.append(f"操作系统: {platform.system()} {platform.release()}")
    lines.append(f"Python: {platform.python_version()}")

    for tool in ["adb", "fastboot"]:
        path = shutil.which(tool)
        if path:
            result = await _run_cli([path, "version"], timeout=5)
            lines.append(f"{tool}: ✅ 已安装 ({path}) — {result[:80]}")
        else:
            lines.append(f"{tool}: ❌ 未安装")

    return "\n".join(lines)


async def _get_device_info() -> str:
    """获取设备信息"""
    adb_path = shutil.which("adb") or "adb"

    # ADB devices
    adb_devices = await _run_cli([adb_path, "devices", "-l"], timeout=10)
    if "device" not in adb_devices or adb_devices.count("\n") <= 1:
        # Try fastboot
        fb_path = shutil.which("fastboot") or "fastboot"
        fb_devices = await _run_cli([fb_path, "devices"], timeout=10)
        if fb_devices.strip():
            return f"设备处于 Fastboot 模式:\n{fb_devices}"
        return "未检测到任何设备。请用 USB 连接手机并开启「开发者选项 > USB 调试」。"

    lines = [f"ADB 设备列表:\n{adb_devices}"]

    # Get detailed info for first device
    # Extract serial
    for line in adb_devices.strip().split("\n")[1:]:
        if "\t" in line:
            serial = line.split()[0]
            break
    else:
        return "\n".join(lines)

    # Basic props
    props = {
        "ro.product.model": "型号",
        "ro.product.brand": "品牌",
        "ro.build.version.release": "Android 版本",
        "ro.build.version.sdk": "SDK 级别",
        "ro.product.cpu.abi": "CPU 架构",
        "ro.boot.verifiedbootstate": "Boot 验证状态",
        "ro.boot.flash.locked": "Bootloader 锁状态",
    }

    for prop, label in props.items():
        result = await _run_cli([adb_path, "-s", serial, "shell", "getprop", prop], timeout=5)
        if result and result != "(无输出)":
            lines.append(f"{label}: {result}")

    # Check root
    root_check = await _run_cli([adb_path, "-s", serial, "shell", "which su"], timeout=5)
    if root_check and "su" in root_check:
        lines.append(f"Root: ✅ 已获取 (su: {root_check.strip()})")
    else:
        lines.append("Root: ❌ 未获取")

    return "\n".join(lines)


# ============================================================
# AI 执行器主类
# ============================================================


class AiExecutor:
    """AI 命令执行器 — LLM 驱动的设备操作闭环"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        max_steps: int = 15,
    ):
        self.api_key = api_key or os.environ.get("HYDROTOOL_AI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        self.base_url = base_url or os.environ.get("HYDROTOOL_AI_BASE_URL") or os.environ.get("OPENAI_BASE_URL")
        self.model = model or os.environ.get("HYDROTOOL_AI_MODEL") or "gpt-4o-mini"
        self.max_steps = max_steps

        self._client: Optional[AsyncOpenAI] = None
        self._state: Optional[ExecutionState] = None
        self._callbacks: list = []

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            client_kwargs: dict[str, Any] = {"api_key": self.api_key}
            if self.base_url:
                client_kwargs["base_url"] = self.base_url
            self._client = AsyncOpenAI(**client_kwargs)
        return self._client

    def on_step(self, callback):
        """注册步骤回调（用于 WebSocket 推送）"""
        self._callbacks.append(callback)

    async def _notify_step(self, step: ExecutionStep):
        """通知所有回调"""
        for cb in self._callbacks:
            try:
                if asyncio.iscoroutinefunction(cb):
                    await cb(step)
                else:
                    cb(step)
            except Exception:
                pass

    async def execute(self, goal: str, device_context: Optional[dict] = None) -> ExecutionState:
        """执行 AI 驱动的设备操作

        Args:
            goal: 用户目标描述，如 "帮我刷入 Magisk Root"
            device_context: 初始设备上下文（可选）

        Returns:
            ExecutionState: 完整执行状态和结果
        """
        self._state = ExecutionState(goal=goal)
        self._state.status = "running"

        # 构建初始消息
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"用户目标: {goal}"},
        ]

        if device_context:
            ctx_str = json.dumps(device_context, ensure_ascii=False, indent=2)
            messages.append({"role": "user", "content": f"当前设备上下文:\n{ctx_str}"})

        try:
            for i in range(self.max_steps):
                # 调用 LLM
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=TOOLS,
                    tool_choice="auto",
                    temperature=0.2,
                )

                msg = response.choices[0].message

                # 没有 tool_calls = LLM 纯文本回复（添加为上下文并继续）
                if not msg.tool_calls:
                    if msg.content:
                        messages.append({"role": "assistant", "content": msg.content})
                        # 再给一次机会：让 LLM 调用 finalize
                        messages.append({
                            "role": "user",
                            "content": "请根据当前情况决定下一步操作。如果已完成或遇到困难，请调用 finalize 总结。",
                        })
                        continue
                    else:
                        # 空回复 = 结束
                        self._state.summary = "AI 未返回指令"
                        self._state.status = "done"
                        break

                # 处理 tool_calls
                for tc in msg.tool_calls:
                    func_name = tc.function.name
                    func_args = json.loads(tc.function.arguments)

                    # 执行工具
                    result = await _execute_tool(func_name, func_args)

                    # 记录步骤
                    step = ExecutionStep(
                        step=len(self._state.steps) + 1,
                        tool_name=func_name,
                        arguments=func_args,
                        result=result[:2000],  # 截断过长结果
                    )
                    self._state.steps.append(step)
                    await self._notify_step(step)

                    # 检查是否是 finalize
                    if func_name == "finalize":
                        try:
                            data = json.loads(result)
                            self._state.summary = data.get("message", "")
                            self._state.success = data.get("success", False)
                        except json.JSONDecodeError:
                            self._state.summary = result
                            self._state.success = False
                        self._state.status = "done"
                        return self._state

                    # 将 tool 结果加入消息
                    messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": func_name,
                                    "arguments": tc.function.arguments,
                                },
                            }
                        ],
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": func_name,
                        "content": result,
                    })

            # 达到最大步数
            self._state.summary = f"已达到最大步数限制（{self.max_steps}步）"
            self._state.status = "done"

        except Exception as e:
            self._state.status = "error"
            self._state.error = str(e)
            self._state.summary = f"执行出错: {e}"

        return self._state

    @property
    def state(self) -> Optional[ExecutionState]:
        return self._state


# ============================================================
# CLI 集成 — 供 hydrotool ai auto 调用
# ============================================================


async def run_ai_auto(goal: str, serial: Optional[str] = None) -> dict:
    """CLI 入口：AI 自动执行

    Returns:
        dict: {"success": bool, "summary": str, "steps": list}
    """
    executor = AiExecutor()
    device_context = {"serial": serial} if serial else None
    state = await executor.execute(goal, device_context)

    return {
        "success": state.success,
        "summary": state.summary,
        "steps": [
            {
                "step": s.step,
                "tool": s.tool_name,
                "args": s.arguments,
                "result": s.result[:500],
            }
            for s in state.steps
        ],
    }
