# 快速部署指南

## 🚀 一键启动

### 方法1：使用启动脚本

**Windows用户：**
```bash
# 双击运行
start.bat

# 或在命令行中运行
start.bat
```

**macOS/Linux用户：**
```bash
# 给脚本执行权限
chmod +x start.sh

# 运行启动脚本
./start.sh
```

### 方法2：使用npm命令

```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

## 📋 系统要求检查

### 1. Node.js检查
```bash
node --version
# 需要 v16.0.0 或更高版本
```

### 2. 数据库选择
- **推荐：MongoDB** (需要单独安装)
- **备选：SQLite** (自动配置，无需安装)

### 3. 网络要求
- 确保可以访问 https://api.fengjungpt.com
- 建议使用稳定的网络连接

## 🔧 配置步骤

### 1. 环境变量配置
复制并编辑 `.env` 文件：
```bash
cp .env.example .env
```

关键配置项：
```env
# AI模型配置 - 必填
AI_API_KEY=sk-MhTyDrLlgBI901bSYBkbMZUw454WmNWVM2YbmvZQ1O0jPLVH
AI_API_BASE_URL=https://api.fengjungpt.com

# 服务器端口 - 可选
PORT=3000

# 数据库配置 - 可选
MONGODB_URI=mongodb://localhost:27017/ai-image-generator
```

### 2. 端口检查
确保3000端口未被占用：
```bash
# 检查端口占用
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

## 🌐 访问应用

启动成功后，访问：
- **主页面**：http://localhost:3000
- **登录页面**：http://localhost:3000/login.html
- **API文档**：http://localhost:3000/api/health

## 🛠️ 故障排除

### 问题1：端口被占用
```bash
# 解决方案1：更改端口
# 编辑 .env 文件，修改 PORT=3001

# 解决方案2：终止占用进程
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### 问题2：MongoDB连接失败
系统会自动切换到SQLite，无需手动处理。

### 问题3：npm install 失败
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 问题4：AI生成失败
1. 检查网络连接
2. 验证API密钥是否正确
3. 查看服务器日志

## 📊 测试步骤

### 1. 注册测试
1. 访问 http://localhost:3000
2. 系统会自动跳转到登录页面
3. 点击"注册"标签
4. 填写邮箱和密码完成注册

### 2. 登录测试
1. 使用注册的邮箱和密码登录
2. 验证是否成功跳转到主页面

### 3. 图片生成测试
1. 在输入框中输入描述文字
2. 选择模型（GPT-4o-Image 或 Nano Banana）
3. 点击"立即生成"按钮
4. 等待生成完成

## 🔍 日志查看

服务器日志会显示：
- 🟢 成功启动信息
- 📡 数据库连接状态
- 🎨 AI模型调用记录
- ❌ 错误信息（如有）

## 📱 移动端访问

服务器支持移动端访问：
- 手机浏览器访问：http://你的IP:3000
- 确保防火墙允许3000端口访问

## 🚀 生产部署建议

### 1. 使用PM2进程管理
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name ai-image-generator

# 查看状态
pm2 status
```

### 2. 使用Nginx反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. SSL证书配置
使用Let's Encrypt免费SSL证书：
```bash
sudo certbot --nginx -d your-domain.com
```

## 📞 获取帮助

如遇到问题，请：
1. 查看控制台日志
2. 检查 [FAQ](README.md#-常见问题)
3. 提交Issue到项目仓库

---

## 🎉 快速验证清单

- [ ] Node.js版本 >= 16.0.0
- [ ] 网络连接正常
- [ ] API密钥已配置
- [ ] 端口3000可用
- [ ] 浏览器可以访问 http://localhost:3000
- [ ] 用户注册功能正常
- [ ] 图片生成功能正常
- [ ] 所有功能测试通过

完成以上步骤，您的AI绘图创作工具就成功部署了！🎨✨