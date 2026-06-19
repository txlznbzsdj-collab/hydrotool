"""Device 模块单元测试"""

from hydrotool.core.device import DeviceInfo, DeviceMode, MODE_LABELS


class TestDeviceMode:
    """设备模式测试"""

    def test_mode_labels(self):
        """测试模式标签"""
        assert MODE_LABELS[DeviceMode.DISCONNECTED] == "未连接"
        assert MODE_LABELS[DeviceMode.ADB_SYSTEM] == "ADB 系统模式"
        assert MODE_LABELS[DeviceMode.FASTBOOT] == "Fastboot 模式"

    def test_mode_uniqueness(self):
        """测试模式枚举唯一性"""
        modes = list(DeviceMode)
        assert len(modes) == len(set(m.name for m in modes))


class TestDeviceInfo:
    """设备信息测试"""

    def test_empty_device(self):
        """测试空设备"""
        info = DeviceInfo()
        assert info.is_connected is False
        assert info.to_dict()["serial"] == ""

    def test_connected_device(self):
        """测试已连接设备"""
        info = DeviceInfo(
            serial="ABC123",
            model="Pixel 7",
            brand="Google",
            android_version="14",
            bootloader_unlocked=True,
        )
        assert info.is_connected is True
        assert info.model == "Pixel 7"
        assert info.bootloader_unlocked is True

    def test_to_dict(self):
        """测试转字典"""
        info = DeviceInfo(serial="TEST", model="M2007J3SC")
        d = info.to_dict()
        assert d["serial"] == "TEST"
        assert d["model"] == "M2007J3SC"
        assert "brand" in d

    def test_repr(self):
        """测试字符串表示"""
        info = DeviceInfo(serial="ABC", model="Xiaomi 14")
        assert "ABC" in repr(info)
        assert "Xiaomi 14" in repr(info)
