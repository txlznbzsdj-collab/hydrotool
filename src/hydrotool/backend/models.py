"""
Pydantic 数据模型

定义 API 请求/响应数据结构。
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ============================================================
# 设备模型
# ============================================================

class DeviceInfoResponse(BaseModel):
    """设备信息响应"""
    serial: str = ""
    model: str = ""
    brand: str = ""
    android_version: str = ""
    build_version: str = ""
    security_patch: str = ""
    kernel_version: str = ""
    bootloader_unlocked: bool = False
    ab_support: bool = False
    current_slot: str = ""
    root_method: str = ""
    sdk: int = 0


class DeviceListItem(BaseModel):
    """设备列表项"""
    serial: str
    type: str  # "adb" or "fastboot"
    status: str


class DeviceListResponse(BaseModel):
    """设备列表响应"""
    devices: list[DeviceListItem]


class DeviceModeResponse(BaseModel):
    """设备模式响应"""
    mode: str
    label: str
    source: str  # "adb" or "fastboot"


# ============================================================
# 刷机模型
# ============================================================

class FlashRequest(BaseModel):
    """刷写请求（旧版兼容）"""
    serial: Optional[str] = None
    partition: str
    image_path: str
    slot: Optional[str] = None

class FlashPartitionRequest(BaseModel):
    """刷写分区请求"""
    serial: str
    partition: str
    image_path: str
    slot: Optional[str] = None

class FlashBootRequest(BaseModel):
    """刷入 boot.img 请求"""
    serial: str
    image_path: str

class FlashAllRequest(BaseModel):
    """整包刷写请求"""
    serial: str
    image_path: str
    slot: Optional[str] = None

class FlashEraseRequest(BaseModel):
    """擦除分区请求"""
    serial: str
    partition: str

class FlashRebootRequest(BaseModel):
    """模式切换请求"""
    serial: str
    target: str = "system"  # "bootloader"|"fastbootd"|"system"

class FlashUnlockRequest(BaseModel):
    """OEM 解锁请求"""
    serial: str

class SlotSwitchRequest(BaseModel):
    """槽位切换请求"""
    serial: str
    slot: str  # "a" or "b"

class FlashTaskAcceptedResponse(BaseModel):
    """刷机任务受理响应"""
    task_id: str
    status: str = "accepted"
    message: str = ""

class FlashLogEntry(BaseModel):
    """刷机日志条目"""
    timestamp: str
    level: str  # "info"|"success"|"error"|"warn"
    message: str

class FlashTaskDetailResponse(BaseModel):
    """刷机任务详情"""
    task_id: str
    type: str = "flash"
    status: str  # "pending"|"running"|"completed"|"failed"|"cancelled"
    progress: float = 0.0
    current_step: str = ""
    message: str = ""
    timestamp: str = ""
    logs: list[FlashLogEntry] = []

class SlotInfoResponse(BaseModel):
    """槽位信息"""
    serial: str
    current_slot: str
    slots: list[str]
    ab_support: bool

class FastbootDeviceInfo(BaseModel):
    """Fastboot 设备信息"""
    serial: str
    status: str
    mode: str = ""
    unlocked: Optional[bool] = None
    current_slot: str = ""

class FastbootDeviceListResponse(BaseModel):
    """Fastboot 设备列表"""
    devices: list[FastbootDeviceInfo]

class FlashTaskResponse(BaseModel):
    """刷写任务响应（旧版兼容）"""
    task_id: str
    status: str  # "running", "completed", "failed"
    message: str = ""


# ============================================================
# Root 模型
# ============================================================

class RootStatusResponse(BaseModel):
    """Root 状态响应"""
    is_rooted: bool
    root_method: str = ""
    bootloader_unlocked: bool = False
    can_root: bool = False


class RootAutoRequest(BaseModel):
    """一键 Root 请求"""
    serial: Optional[str] = None
    keep_boot: bool = False


# ============================================================
# 系统模型
# ============================================================

class SystemInfoResponse(BaseModel):
    """系统信息响应"""
    version: str
    python_version: str
    platform: str
    adb_available: bool
    adb_version: str = ""
    fastboot_available: bool
    fastboot_version: str = ""


class TaskStatus(BaseModel):
    """任务状态推送"""
    task_id: str
    type: str  # "flash", "root", "backup"
    status: str  # "pending", "running", "completed", "failed", "cancelled"
    progress: float = 0.0  # 0-100
    current_step: str = ""
    message: str = ""
    timestamp: str = ""
