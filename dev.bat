@echo off
setlocal
cd /d "%~dp0"
title STI-Portal - dev

echo.
echo   ============================================
echo     科技创新部门户  -  开发模式
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

echo   [2/2] 正在启动开发服务器...
echo.
echo   前端（Vite）： http://localhost:5273
echo   接口（API） ： http://127.0.0.1:8787
echo.
echo   按 Ctrl+C 停止。
echo.

call npm run dev
exit /b %errorlevel%

:NONODE
echo   [错误] 未检测到 Node.js，请先安装 20 以上版本：https://nodejs.org/
exit /b 1

:NPMFAIL
echo   [错误] 依赖安装失败，请检查网络后重试。
exit /b 1
