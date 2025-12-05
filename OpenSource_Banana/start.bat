@echo off
chcp 65001 > nul

echo 🚀 启动AI绘图创作工具...

REM 检查Node.js是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

REM 创建必要的目录
if not exist "data" mkdir data
if not exist "data\db" mkdir data\db
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads

REM 安装依赖（如果需要）
if not exist "node_modules" (
    echo 📦 安装项目依赖...
    npm install
)

REM 设置环境变量
set NODE_ENV=production

REM 启动服务器
echo 🌟 启动服务器...
node server.js

pause