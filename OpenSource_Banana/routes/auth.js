const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const mailService = require('../services/mailService'); // 【新增】引入邮件服务

const router = express.Router();

// 【新增】内存中存储验证码 (重启服务器后会清空，适合中小项目)
// 结构: { "user@email.com": { code: "123456", expires: 1711111111111 } }
const verificationCodes = {};

// 这是一个中间件，用于从token中获取用户信息
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: '无效或过期的访问令牌' });
        req.user = user;
        next();
    });
};

// === 【新增接口】发送邮箱验证码 ===
router.post('/send-code', async (req, res) => {
    try {
        const { email } = req.body;
        
        // 1. 基础校验
        if (!email) return res.status(400).json({ success: false, error: '请输入邮箱地址' });

        // 2. 生成6位随机数字验证码
        const code = String(Math.floor(100000 + Math.random() * 900000));

        // 3. 发送邮件
        await mailService.sendVerificationEmail(email, code);

        // 4. 存入内存，设置 5 分钟后过期
        verificationCodes[email] = {
            code: code,
            expires: Date.now() + 5 * 60 * 1000 
        };

        // 5. 返回成功
        res.json({ success: true, message: '验证码已发送' });

    } catch (error) {
        console.error('发送验证码失败:', error);
        res.status(500).json({ success: false, error: '邮件发送失败，请检查邮箱是否正确或稍后再试' });
    }
});

// === 注册 API (升级版 - 增加验证码校验) ===
router.post('/register', async (req, res, next) => {
    let connection;
    try {
        // 【修改】从 body 中多获取一个 code 字段
        const { username, email, password, code } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, error: '用户名、邮箱和密码都不能为空' });
        }
        
        // === 【新增】验证码校验逻辑 开始 ===
        const record = verificationCodes[email];
        
        // 1. 检查是否获取过验证码
        if (!record) {
            return res.status(400).json({ success: false, error: '请先点击获取验证码' });
        }
        // 2. 检查是否过期
        if (Date.now() > record.expires) {
            delete verificationCodes[email]; // 清理过期数据
            return res.status(400).json({ success: false, error: '验证码已过期，请重新获取' });
        }
        // 3. 检查验证码是否匹配
        if (String(record.code) !== String(code)) {
            return res.status(400).json({ success: false, error: '验证码错误' });
        }
        // === 验证码校验逻辑 结束 ===

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: '密码至少需要6个字符' });
        }

        const [existingUsers] = await pool.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            if (existingUsers[0].username === username) {
                return res.status(409).json({ success: false, error: '该用户名已被使用' });
            }
            if (existingUsers[0].email === email) {
                return res.status(409).json({ success: false, error: '该邮箱已被注册' });
            }
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 新用户赠送10积分，创作数为0
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password, drawing_points, creation_count) VALUES (?, ?, ?, 10, 0)', 
            [username, email, hashedPassword]
        );
        const insertId = result.insertId;

        // === 【新增】注册成功后，立即删除验证码，防止重复使用 ===
        delete verificationCodes[email];

        const userProfile = {
            id: insertId,
            username: username,
            email: email,
            role: 'user',
            drawing_points: 10,  
            creation_count: 0
        };

        const token = jwt.sign(userProfile, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            message: '注册成功！已赠送10积分',
            data: {
                user: userProfile,
                token: token
            }
        });

    } catch (error) {
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// === 登录 API (保持不变) ===
router.post('/login', async (req, res, next) => {
    let connection;
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: '邮箱和密码不能为空' });
        }
        
        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, error: '邮箱或密码错误' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: '邮箱或密码错误' });
        }

        const userProfile = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            drawing_points: user.drawing_points || 0,
            creation_count: user.creation_count || 0
        };
        
        const token = jwt.sign(userProfile, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: userProfile,
                token: token
            }
        });

    } catch (error) {
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// === 获取当前用户信息 API (保持不变) ===
router.get('/me', authenticateToken, async (req, res, next) => {
    res.json({
        success: true,
        data: {
            user: req.user
        }
    });
});

module.exports = router;