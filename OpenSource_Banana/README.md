# AI绘图创作工具

一个基于OpenAI兼容API的专业AI图像生成平台，支持文生图和图生图功能。

## ✨ 功能特性

### 🎨 核心功能
- **文生图**：根据文本描述生成高质量图像
- **图生图**：基于参考图片进行编辑和再创作
- **多模型支持**：支持GPT-4o-Image和Nano Banana模型
- **自定义参数**：支持尺寸、质量、风格等参数调节

### 👤 用户功能
- **邮箱注册登录**：简单快捷的注册流程
- **个人作品集**：管理和查看历史创作
- **使用统计**：详细的创作数据分析
- **主题切换**：深色/浅色模式自由切换

### 🔧 技术特性
- **响应式设计**：适配各种设备屏幕
- **实时进度**：生成过程可视化进度条
- **安全认证**：JWT令牌认证机制
- **API限流**：防止接口滥用
- **文件管理**：智能图片存储和管理

## 🚀 快速开始

### 环境要求
- Node.js 16.0+
- MongoDB 4.4+
- 现代浏览器（Chrome、Firefox、Safari等）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd ai-image-generator
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，填入您的配置
```

4. **启动MongoDB**
```bash
# Windows
start mongod

# macOS/Linux
mongod --dbpath ./data/db
```

5. **启动服务器**
```bash
# Windows
start.bat

# macOS/Linux
chmod +x start.sh
./start.sh

# 或者直接使用 npm
npm start
```

6. **访问应用**
打开浏览器访问：http://localhost:3000

## ⚙️ 配置说明

### 环境变量配置
```env
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ai-image-generator

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# AI模型配置
AI_API_BASE_URL=https://api.fengjungpt.com
AI_API_KEY=your-api-key-here

# CORS配置
FRONTEND_URL=http://localhost:3000

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### AI模型配置
目前支持以下模型：
- **gpt-4o-image**：高质量图像生成，适合专业创作
- **nano-banana**：快速生成，适合创意探索

## 📁 项目结构

```
ai-image-generator/
├── config/
│   └── database.js          # 数据库配置
├── models/
│   ├── User.js              # 用户模型
│   └── Image.js             # 图片模型
├── routes/
│   ├── auth.js              # 认证路由
│   └── image.js             # 图片生成路由
├── services/
│   └── aiService.js         # AI服务封装
├── public/
│   ├── index.html           # 主页面
│   └── login.html           # 登录注册页面
├── uploads/                 # 用户上传文件目录
├── .env                     # 环境变量配置
├── package.json             # 项目依赖
├── server.js                # 服务器入口文件
├── start.sh                 # Linux/macOS启动脚本
├── start.bat                # Windows启动脚本
└── README.md                # 项目说明文档
```

## 🔌 API文档

### 认证接口

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "用户名",
  "email": "email@example.com",
  "password": "password123"
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "email@example.com",
  "password": "password123"
}
```

#### 获取用户信息
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 图片生成接口

#### 文生图
```http
POST /api/image/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "一只可爱的猫咪",
  "model": "gpt-4o-image",
  "size": "1024x1024",
  "quality": "standard",
  "style": "vivid",
  "n": 1
}
```

#### 图生图
```http
POST /api/image/edit
Authorization: Bearer <token>
Content-Type: multipart/form-data

prompt: "给猫咪戴上一顶帽子"
image: <图片文件>
model: "gpt-4o-image"
size: "1024x1024"
n: 1
```

#### 获取用户图片列表
```http
GET /api/image/my-images?page=1&limit=20
Authorization: Bearer <token>
```

## 🎯 使用指南

### 1. 注册账号
- 访问登录页面
- 点击"注册"标签
- 填写用户名、邮箱和密码
- 完成注册并自动登录

### 2. 生成图片
- 在主页面输入描述文字
- 选择AI模型和参数
- 点击"立即生成"按钮
- 等待生成完成并查看结果

### 3. 管理作品
- 切换到"我的创作"标签
- 查看历史生成记录
- 下载或删除不满意的作品

## 🔒 安全特性

- JWT令牌认证
- 密码加密存储
- API请求限流
- 输入内容验证
- XSS和CSRF防护
- 文件类型检查

## 🛠️ 开发说明

### 本地开发
```bash
# 安装开发依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test
```

### 代码规范
- 使用ES6+语法
- 遵循RESTful API设计
- 完整的错误处理
- 详细的注释说明

## 📝 更新日志

### v1.0.0 (2024-01-20)
- ✨ 初始版本发布
- 🎨 支持文生图和图生图
- 👤 用户注册登录系统
- 🎯 多模型支持
- 📱 响应式界面设计

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🆘 常见问题

### Q: 图片生成失败怎么办？
A: 检查网络连接，确认API密钥正确，查看控制台错误信息。

### Q: 忘记密码怎么办？
A: 目前版本暂不支持自助重置密码，请联系管理员。

### Q: 支持哪些图片格式？
A: 支持JPEG、PNG和WebP格式，最大文件大小10MB。

### Q: 可以商用生成的图片吗？
A: 请遵守AI服务提供商的使用条款和相关法律法规。

## 📞 联系方式

- 项目主页：[GitHub Repository]
- 问题反馈：[Issues页面]
- 技术支持：support@example.com

---

⭐ 如果这个项目对您有帮助，请给我们一个星标！