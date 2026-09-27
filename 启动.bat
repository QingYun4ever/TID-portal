@echo off
cd /d "%~dp0"

if not exist "dist\server.js" goto NOBUILD

where node >nul 2>nul
if errorlevel 1 goto NONODE

set "NODE_ENV=production"
set "PORT=8787"
set "HOST=127.0.0.1"

echo.
echo   ============================================
echo     科技创新部门户
echo   ============================================
echo.
echo   访问地址： http://127.0.0.1:8787
echo.
echo   登录方式：统一身份认证（OIDC）
echo     浏览器将跳转到统一认证登录；首次登录会自动创建门户账号，
echo     账号角色由管理员在「后台管理 → 用户与权限」中调整。
echo     请先在 .env 配置 OIDC_CLIENT_ID / OIDC_CLIENT_SECRET / OIDC_REDIRECT_URI / JWT_SECRET。
echo.
echo   正在启动，请稍候...
echo.

start "STI-Portal" /min cmd /c "node dist\server.js"
timeout /t 5 /nobreak >nul

netstat -ano | findstr "LISTENING" | findstr ":8787" >nul
if errorlevel 1 goto STARTFAIL

echo   启动成功，正在打开浏览器...
echo.
echo   服务运行在最小化的 STI-Portal 窗口里，
echo   关闭那个窗口即可停止服务。
echo.
start "" http://127.0.0.1:8787/
pause
exit /b 0

:NOBUILD
echo   [错误] 还没有构建产物，请先双击「构建.bat」。
pause
exit /b 1

:NONODE
echo   [错误] 未检测到 Node.js，请先安装 20 以上版本：https://nodejs.org/
pause
exit /b 1

:STARTFAIL
echo   [错误] 服务启动失败，端口 8787 没有监听。
echo   请在命令行手动执行 node dist\server.js 查看具体报错。
pause
exit /b 1