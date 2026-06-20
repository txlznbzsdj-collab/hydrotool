"""设备模式定义"""

from enum import Enum, auto


class DeviceMode(Enum):
    """设备当前工作模式"""

    DISCONNECTED = auto()  # 未连接
    ADB_SYSTEM = auto()  # ADB 模式（正常开机）
    ADB_RECOVERY = auto()  # ADB 模式（Recovery）
    SIDELOAD = auto()  # Recovery 下的 ADB Sideload
    FASTBOOT = auto()  # Fastboot 模式
    FASTBOOTD = auto()  # FastbootD 模式（动态分区）
    EDL = auto()  # EDL 模式（高通紧急下载）
    MTK_PRELOADER = auto()  # MTK Preloader 模式（联发科）
    BROM = auto()  # BootROM 模式（深度变砖）


# 模式显示名称
MODE_LABELS = {
    DeviceMode.DISCONNECTED: "未连接",
    DeviceMode.ADB_SYSTEM: "ADB 系统模式",
    DeviceMode.ADB_RECOVERY: "ADB Recovery 模式",
    DeviceMode.SIDELOAD: "Sideload 模式",
    DeviceMode.FASTBOOT: "Fastboot 模式",
    DeviceMode.FASTBOOTD: "FastbootD 模式",
    DeviceMode.EDL: "EDL 模式（高通）",
    DeviceMode.MTK_PRELOADER: "Preloader 模式（联发科）",
    DeviceMode.BROM: "BootROM 模式",
}


class DeviceInfo:
    """设备信息"""

    def __init__(
        self,
        serial: str = "",
        model: str = "",
        brand: str = "",
        android_version: str = "",
        build_version: str = "",
        build_fingerprint: str = "",
        security_patch: str = "",
        kernel_version: str = "",
        bootloader_unlocked: bool = False,
        ab_support: bool = False,
        current_slot: str = "",
        sdk: int = 0,
        battery_level: int = -1,
        storage_total: int = 0,
        storage_used: int = 0,
        ram_total: int = 0,
        cpu_cores: int = 0,
    ):
        self.serial = serial
        self.model = model
        self.brand = brand
        self.android_version = android_version
        self.build_version = build_version
        self.build_fingerprint = build_fingerprint
        self.security_patch = security_patch
        self.kernel_version = kernel_version
        self.bootloader_unlocked = bootloader_unlocked
        self.ab_support = ab_support
        self.current_slot = current_slot
        self.sdk = sdk
        self.battery_level = battery_level
        self.storage_total = storage_total
        self.storage_used = storage_used
        self.ram_total = ram_total
        self.cpu_cores = cpu_cores

    @property
    def is_connected(self) -> bool:
        return bool(self.serial)

    def to_dict(self) -> dict:
        return {
            "serial": self.serial,
            "model": self.model,
            "brand": self.brand,
            "android_version": self.android_version,
            "build_version": self.build_version,
            "build_fingerprint": self.build_fingerprint,
            "security_patch": self.security_patch,
            "kernel_version": self.kernel_version,
            "bootloader_unlocked": self.bootloader_unlocked,
            "ab_support": self.ab_support,
            "current_slot": self.current_slot,
            "sdk": self.sdk,
            "battery_level": self.battery_level,
            "storage_total": self.storage_total,
            "storage_used": self.storage_used,
            "ram_total": self.ram_total,
            "cpu_cores": self.cpu_cores,
        }

    def __repr__(self) -> str:
        return (
            f"DeviceInfo(serial={self.serial}, model={self.model}, "
            f"brand={self.brand}, android={self.android_version})"
        )
