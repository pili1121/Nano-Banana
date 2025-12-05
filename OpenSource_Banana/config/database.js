// config/database.js

// 1. 引入正确的工具：mysql2/promise
const mysql = require('mysql2/promise');
require('dotenv').config();

// 2. 从 .env 文件读取 MySQL 的配置
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 3. 创建一个数据库连接池（可以让多人同时高效使用数据库）
const pool = mysql.createPool(dbConfig);

// 4. 定义一个连接函数，用来在程序启动时测试连接
const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL数据库连接成功！');
        connection.release(); // 测试完后释放连接，还给连接池
    } catch (error) {
        console.error('❌ MySQL数据库连接失败:', error.message);
        throw error; // 抛出错误，让主程序知道出问题了
    }
};

// 5. 导出连接函数和连接池，让其他文件（比如 auth.js）可以使用
module.exports = { connectDB, pool };
