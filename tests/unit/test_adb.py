"""ADB 客户端单元测试"""

import pytest
from hydrotool.core.adb.client import AdbClient


class TestAdbClient:
    """ADB 客户端测试"""

    @pytest.mark.asyncio
    async def test_init(self):
        """测试初始化"""
        client = AdbClient()
        assert client._adb_path is not None
