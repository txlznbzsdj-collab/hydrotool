# HydroTool（鸿德工具箱）

> 一个终端搞定安卓设备的刷机、Root、模块管理与环境隐藏全流程——跨平台、开源、对新手友好，对极客高效。

## 功能概览

| 功能域 | 说明 |
|--------|------|
| 📱 设备管理 | USB/无线连接、设备信息、BL 状态、AB 槽位、分区信息 |
| 🔥 刷机引擎 | payload.bin 刷写、分区镜像刷写、boot.img 刷入、模式切换 |
| 🛡️ Root 管理 | Magisk/KernelSU/APatch 统一管理、boot 修补全自动 |
| 📦 模块管理 | 列表查看、安装/卸载、兼容性检测 |
| 👻 环境隐藏 | Root 检测扫描、Zygisk Next/TrickStore 配置、Play Integrity 修复 |
| 🔧 ROM 工具箱 | payload 解包打包、boot.img 拆包、DSU 制作、分区备份 |
| 🤖 AI 自动模式 | 自动识别环境 + 设备状态 + 一键执行（面向小白） |

## 快速开始

```bash
# 安装
pip install hydrotool

# 查看设备信息
hydrotool device info

# AI 一键 Root（Phase 3+）
hydrotool ai auto --target root
```

## 技术栈

- **CLI**: Python Click + Rich
- **后端**: FastAPI + WebSocket
- **前端**: React 18 + TypeScript + Tailwind + shadcn/ui
- **桌面**: Tauri v2
- **高性能模块**: Go

## 开发

```bash
# 克隆
git clone https://github.com/hydrotool/hydrotool.git
cd hydrotool

# 安装开发依赖
pip install -e ".[dev]"

# 运行 CLI
hydrotool device info
```

## 许可证

AGPL-3.0
