const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 从导出的对象中，通过解构赋值只获取 connectDB 函数
const { connectDB } = require('./config/database'); 

const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/image');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin'); // ✅ 【新增】引入管理员路由

const app = express();

// 告诉 Express 应用它运行在反向代理（如 Nginx）后面，并信任代理
// 这行代码必须在所有使用 req.ip 或依赖正确 IP 地址的中间件之前
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

// 连接数据库
try {
  connectDB().catch(error => {
    console.error('⚠️ 数据库连接失败，某些功能可能不可用:', error.message);
  });
} catch (error) {
  console.error('⚠️ 数据库初始化失败:', error.message);
}

// ============== 安全中间件 ==============
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      // 在 script-src 中添加 'unsafe-inline' 来允许执行内联脚本
      scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "picsum.photos"],
      connectSrc: ["'self'", "https://api.fengjungpt.com"],
    },
  },
}));

// ============== 压缩中间件 ==============
app.use(compression());

// ============== 日志中间件 ==============
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ============== 速率限制 ==============
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});
// 对 /api/ 开头的路由应用速率限制
// 注意：这行必须放在 app.set('trust proxy', 1) 之后，才能正确获取 IP
app.use('/api/', limiter); 

// ============== CORS配置 ==============
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============== 解析请求体 ==============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============== 静态文件服务配置 ==============
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============== 创建上传目录 ==============
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ============== API 路由 ==============
app.use('/api/auth', authRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes); // ✅ 【新增】挂载管理员路由


// ============== 健康检查端点 ==============
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============== 处理所有未匹配的 GET 请求 (SPA 核心) ==============
app.get('*', (req, res) => { 
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============== 404 处理 ==============
app.use((req, res, next) => {
  res.status(404).json({ error: '请求的资源或API端点不存在' });
});

// ============== 全局错误处理中间件 ==============
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      error: '数据验证失败',
      details: errors
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: '无效的访问令牌'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: '访问令牌已过期'
    });
  }

  res.status(error.status || 500).json({
    error: error.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ============== 启动服务器 ==============
app.listen(PORT, () => {
  console.log(`🚀 AI绘图服务器运行在端口 ${PORT}`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`🔧 环境: ${process.env.NODE_ENV}`);
});

// ============== 优雅关闭服务器 ==============
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});
