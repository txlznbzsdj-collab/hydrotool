"""
HydroTool 后端运行入口

用法:
    python -m hydrotool.backend.run
    # 或
    uvicorn hydrotool.backend.app:app --host 0.0.0.0 --port 8000 --reload
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "hydrotool.backend.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
