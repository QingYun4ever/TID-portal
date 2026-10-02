#!/usr/bin/env sh
# 科技创新部门户 - 开发模式（Vite 5273 + API 8787）
set -e
cd "$(dirname "$0")"

echo
echo "  ============================================"
echo "    科技创新部门户  -  开发模式"
echo "  ============================================"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "  [错误] 未检测到 Node.js，请先安装 20 以上版本：https://nodejs.org/"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  [1/2] 正在安装依赖，请稍候..."
  npm install --no-audit --no-fund
else
  echo "  [1/2] 依赖已就绪"
fi

echo "  [2/2] 正在启动开发服务器..."
echo
echo "  前端（Vite）： http://localhost:5273"
echo "  接口（API） ： http://127.0.0.1:8787"
echo
echo "  按 Ctrl+C 停止。"
echo

exec npm run dev
