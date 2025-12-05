#!/bin/bash

# AI绘图创作工具启动脚本

echo "🚀 启动AI绘图创作工具..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查MongoDB是否运行
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB 未运行，正在启动 MongoDB..."
    mongod --dbpath ./data/db --fork --logpath ./data/mongodb.log
    if [ $? -eq 0 ]; then
        echo "✅ MongoDB 启动成功"
    else
        echo "❌ MongoDB 启动失败，请检查 MongoDB 安装"
        exit 1
    fi
else
    echo "✅ MongoDB 已在运行"
fi

# 创建必要的目录
mkdir -p data/db
mkdir -p logs
mkdir -p uploads

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
fi

# 设置环境变量
export NODE_ENV=production

# 启动服务器
echo "🌟 启动服务器..."
node server.js