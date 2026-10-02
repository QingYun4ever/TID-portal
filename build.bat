@echo off
setlocal
cd /d "%~dp0"
title STI-Portal - build

echo.
echo   ============================================
echo     科技创新部门户  -  构建
echo   ============================================
echo.

where node >nul 2>nul
if errorlevel 1 goto NONODE

if not exist "node_modules" (
  echo   [1/2] 正在安装依赖，请稍候...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto NPMFAIL
) else (
  echo   [1/2] 依赖已就绪
)

echo   [2/2] 正在构建...
echo.

call npm run build
if errorlevel 1 goto BUILDFAIL

echo.
echo   构建成功。
echo   产物： dist\public\（前端）  dist\server.js（服务端单文件）
echo   运行： npm start  或  node dist\server.js
echo.
exit /b 0

:NONODE
echo   [错误] 未检测到 Node.js，请先安装 20 以上版本：https://nodejs.org/
exit /b 1

:NPMFAIL
echo   [错误] 依赖安装失败，请检查网络后重试。
exit /b 1

:BUILDFAIL
echo   [错误] 构建失败，请看上面的报错信息。
exit /b 1
