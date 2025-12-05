// services/mailService.js
const nodemailer = require('nodemailer');

// 1. 创建发送器 (读取 .env 里的配置)
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT) || 465,
    secure: true, // 465端口必须为true
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

/**
 * 发送验证码邮件
 * @param {string} toEmail - 接收者邮箱
 * @param {string} code - 6位数字验证码
 */
exports.sendVerificationEmail = async (toEmail, code) => {
    // 邮件内容配置
    const mailOptions = {
        from: `"Nano Banana 官方" <${process.env.MAIL_USER}>`, // 发件人必须和认证账号一致
        to: toEmail,
        subject: '【Nano Banana】您的注册验证码',
        html: `
            <div style="background-color:#f3f4f6; padding: 20px; font-family: sans-serif;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(to right, #8B5CF6, #3B82F6); padding: 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Nano Banana</h1>
                    </div>
                    <div style="padding: 30px; text-align: center; color: #374151;">
                        <p style="margin-bottom: 20px; font-size: 16px;">欢迎注册！您的验证码是：</p>
                        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; display: inline-block; margin-bottom: 20px;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #7C3AED;">${code}</span>
                        </div>
                        <p style="font-size: 14px; color: #6B7280;">验证码 5 分钟内有效，请勿泄露给他人。</p>
                    </div>
                    <div style="background-color: #F9FAFB; padding: 15px; text-align: center; font-size: 12px; color: #9CA3AF;">
                        此邮件由系统自动发送，请勿回复
                    </div>
                </div>
            </div>
        `
    };

    // 发送动作
    return transporter.sendMail(mailOptions);
};