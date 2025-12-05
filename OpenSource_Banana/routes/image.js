// routes/image.js (修复版：MySQL公告)

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const sharp = require('sharp');

const { pool } = require('../config/database'); 
const aiService = require('../services/aiService');

const upload = multer({ storage: multer.memoryStorage() });

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ error: '需要提供访问令牌' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: '无效或过期的访问令牌' });
        req.user = user;
        next();
    });
};

async function getImageDimensions(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
        const metadata = await sharp(response.data).metadata();
        return `${metadata.width}x${metadata.height}`;
    } catch (error) {
        console.error(`⚠️ 无法获取图片尺寸:`, error.message);
        return null;
    }
}

async function getApiKeyToUse(connection, userId, currentPoints, requiredPoints) {
    try {
        const [userKeys] = await connection.execute(
            `SELECT api_key, api_base_url FROM user_api_config WHERE user_id = ? LIMIT 1`,
            [userId]
        );
        if (userKeys.length > 0) {
            return {
                key: userKeys[0].api_key,
                baseUrl: userKeys[0].api_base_url || process.env.AI_API_BASE_URL,
                isUserKey: true,
                shouldDeductPoints: false
            };
        }
    } catch (error) { console.error('获取用户API Key失败:', error); }
    if (currentPoints >= requiredPoints) {
        return {
            key: process.env.AI_API_KEY,
            baseUrl: process.env.AI_API_BASE_URL,
            isUserKey: false,
            shouldDeductPoints: true
        };
    }
    return null;
}

// ✅ 灵感列表 (MySQL)
router.get('/inspirations', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM inspirations ORDER BY id DESC LIMIT 20');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: '获取灵感失败' });
    } finally { if (connection) connection.release(); }
});

// ✅ 【修正】获取最新系统公告 (MySQL)
router.get('/public/announcement', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM announcements WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
        
        if (rows.length > 0) {
            const row = rows[0];
            // 转换字段名以匹配前端
            const notice = {
                content: row.content,
                isImportant: row.is_important === 1,
                createdAt: row.created_at
            };
            res.json({ success: true, data: notice });
        } else {
            res.json({ success: true, data: null });
        }
    } catch (error) {
        console.error('公告Error:', error);
        res.json({ success: true, data: null });
    } finally { if (connection) connection.release(); }
});

router.get('/models', authenticateToken, async (req, res, next) => {
    try {
        const modelsData = await aiService.getAvailableModels();
        res.json({ success: true, data: modelsData });
    } catch (error) { next(error); }
});

// 文生图
router.post('/generate', authenticateToken, async (req, res, next) => {
    console.log('API: /generate');
    let connection; 
    try {
        const { prompt, model, size, width, height, quantity = '1' } = req.body;
        const userId = req.user.id;
        
        if (!prompt) return res.status(400).json({ error: '提示词不能为空' });
        let qty = parseInt(quantity) || 1;
        if (qty < 1) qty = 1; if (qty > 4) qty = 4;

        connection = await pool.getConnection();
        const [users] = await connection.execute('SELECT drawing_points FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ success: false, error: '用户不存在' });

        const currentPoints = users[0].drawing_points || 0;
        const apiKeyInfo = await getApiKeyToUse(connection, userId, currentPoints, qty);
        
        if (!apiKeyInfo) return res.status(400).json({ success: false, error: `积分不足` });

        const generatedImages = [];
        for (let i = 0; i < qty; i++) {
            try {
                const result = await aiService.generateImage({ prompt, model, size, width, height, apiKey: apiKeyInfo.key, baseUrl: apiKeyInfo.baseUrl });
                const temporaryImageUrl = result.data?.data?.[0]?.url;
                if (!temporaryImageUrl) throw new Error('AI无返回图片');

                const fileName = `${Date.now()}-${userId}-${i}.png`;
                const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
                if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                const filePath = path.join(uploadsDir, fileName);
                const publicUrl = `/uploads/${fileName}`;

                const response = await axios({ url: temporaryImageUrl, responseType: 'stream' });
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);
                await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

                let actualSize = await getImageDimensions(temporaryImageUrl);
                const sizeToSave = actualSize || (width && height ? `${width}x${height}` : (size || null));

                const [insertResult] = await connection.execute('INSERT INTO creations (user_id, prompt, image_url, model, size, created_at) VALUES (?, ?, ?, ?, ?, ?)', [userId, prompt, publicUrl, model || null, sizeToSave, new Date()]);

                generatedImages.push({
                    url: publicUrl, prompt: prompt, model: model || null, size: sizeToSave,
                    id: insertResult.insertId, createdAt: new Date().toISOString()
                });
            } catch (error) { console.error(`生成第 ${i + 1} 张出错:`, error.message); }
        }

        if (generatedImages.length === 0) return res.status(500).json({ error: '生成失败' });

        let remainingPoints = currentPoints;
        if (apiKeyInfo.shouldDeductPoints) {
            await connection.execute(`UPDATE users SET drawing_points = drawing_points - ?, creation_count = creation_count + ? WHERE id = ?`, [qty, qty, userId]);
            remainingPoints -= qty;
        } else {
            await connection.execute(`UPDATE user_api_config SET updated_at = ? WHERE user_id = ?`, [new Date(), userId]);
        }

        res.status(200).json({ success: true, data: qty === 1 ? generatedImages[0] : generatedImages, remaining_points: remainingPoints, used_api_key: apiKeyInfo.isUserKey });

    } catch (error) { console.error('文生图错误:', error); next(error); } finally { if (connection) connection.release(); }
});

// 图生图
router.post('/edit', authenticateToken, upload.array('image', 3), async (req, res, next) => {
    console.log('API: /edit');
    let connection;
    try {
        const { prompt, model, width, height } = req.body;
        const imageFiles = req.files;
        const userId = req.user.id;

        if (!prompt) return res.status(400).json({ error: '提示词为空' });
        if (!imageFiles || imageFiles.length === 0) return res.status(400).json({ error: '请上传图片' });

        let targetWidth = null, targetHeight = null;
        try {
            const meta = await sharp(imageFiles[0].buffer).metadata();
            targetWidth = meta.width; targetHeight = meta.height;
        } catch (e) {}

        if (width && height) { targetWidth = parseInt(width); targetHeight = parseInt(height); }

        connection = await pool.getConnection();
        const [users] = await connection.execute('SELECT drawing_points FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ success: false, error: '用户不存在' });

        const currentPoints = users[0].drawing_points || 0;
        const apiKeyInfo = await getApiKeyToUse(connection, userId, currentPoints, 1);
        if (!apiKeyInfo) return res.status(400).json({ success: false, error: `积分不足` });

        const result = await aiService.editImage({ prompt, model, images: imageFiles, width: targetWidth, height: targetHeight, apiKey: apiKeyInfo.key, baseUrl: apiKeyInfo.baseUrl });
        if (!result.success) return res.status(500).json({ error: result.error || 'AI异常' });

        const temporaryImageUrl = result.data?.data?.[0]?.url;
        if (!temporaryImageUrl) return res.status(500).json({ error: '无图片URL' });

        const fileName = `${Date.now()}-${userId}-edit.png`;
        const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, fileName);
        const publicUrl = `/uploads/${fileName}`;

        const response = await axios({ url: temporaryImageUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

        let actualSize = await getImageDimensions(temporaryImageUrl);
        const sizeString = actualSize || (targetWidth && targetHeight ? `${targetWidth}x${targetHeight}` : null);
        
        await connection.execute('INSERT INTO creations (user_id, prompt, image_url, model, size, created_at) VALUES (?, ?, ?, ?, ?, ?)', [userId, prompt, publicUrl, model || null, sizeString, new Date()]);

        let remainingPoints = currentPoints;
        if (apiKeyInfo.shouldDeductPoints) {
            await connection.execute(`UPDATE users SET drawing_points = drawing_points - 1, creation_count = creation_count + 1 WHERE id = ?`, [userId]);
            remainingPoints -= 1;
        } else {
            await connection.execute(`UPDATE user_api_config SET updated_at = ? WHERE user_id = ?`, [new Date(), userId]);
        }

        res.status(200).json({
            success: true,
            data: { url: publicUrl, prompt: prompt, model: model || null, size: sizeString, createdAt: new Date().toISOString() },
            quantity: 1, remaining_points: remainingPoints, used_api_key: apiKeyInfo.isUserKey
        });

    } catch (error) { console.error('图生图错误:', error); next(error); } finally { if (connection) connection.release(); }
});

router.get('/history', authenticateToken, async (req, res, next) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute("SELECT * FROM creations WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [req.user.id]);
        res.json({ success: true, data: rows });
    } catch (error) { next(error); } finally { if (connection) connection.release(); }
});

router.delete('/delete/:id', authenticateToken, async (req, res, next) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM creations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: '无权删除' });

        const filePath = path.join(__dirname, '..', 'public', rows[0].image_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await connection.execute('DELETE FROM creations WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: '已删除' });
    } catch (error) { next(error); } finally { if (connection) connection.release(); }
});

module.exports = router;