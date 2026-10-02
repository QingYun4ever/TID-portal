#!/usr/bin/env sh
# 科技创新部门户 - 构建（dist/public + dist/server.js）
set -e
cd "$(dirname "$0")"

echo
echo "  ============================================"
echo "    科技创新部门户  -  构建"
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

echo "  [2/2] 正在构建..."
echo

npm run build

echo
echo "  构建成功。"
echo "  产物： dist/public/（前端）  dist/server.js（服务端单文件）"
echo "  运行： npm start  或  node dist/server.js"
echo
