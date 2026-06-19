#!/bin/bash
# HydroTool 开发环境搭建脚本
set -e

echo "🚀 HydroTool 开发环境搭建"
echo "========================"

# 检查 Python
echo ""
echo "📋 检查 Python..."
if command -v python3 &> /dev/null; then
    PYTHON=$(command -v python3)
elif command -v python &> /dev/null; then
    PYTHON=$(command -v python)
else
    echo "❌ 未找到 Python，请安装 Python 3.11+"
    exit 1
fi

PY_VER=$($PYTHON --version 2>&1)
echo "   ✅ $PY_VER"

# 创建虚拟环境
echo ""
echo "📋 创建虚拟环境..."
if [ ! -d "venv" ]; then
    $PYTHON -m venv venv
    echo "   ✅ 虚拟环境已创建"
else
    echo "   ✅ 虚拟环境已存在"
fi

# 激活并安装
source venv/bin/activate

echo ""
echo "📋 安装依赖..."
pip install -e ".[dev]" --quiet
echo "   ✅ 依赖安装完成"

# 安装 pre-commit
echo ""
echo "📋 安装 Git hooks..."
if command -v pre-commit &> /dev/null; then
    pre-commit install 2>/dev/null || true
fi

# 运行测试
echo ""
echo "📋 运行测试..."
python -m pytest tests/ -v --tb=short 2>/dev/null || echo "   ⚠️  测试暂未通过（正常，项目在开发中）"

echo ""
echo "✅ HydroTool 开发环境已就绪！"
echo ""
echo "快速开始:"
echo "  source venv/bin/activate"
echo "  hydrotool device info"
