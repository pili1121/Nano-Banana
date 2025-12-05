const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteConnection {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../database.sqlite');
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ SQLite连接失败:', err);
                    reject(err);
                } else {
                    console.log('✅ SQLite连接成功');
                    this.initTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async initTables() {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                avatar TEXT,
                usage_totalImages INTEGER DEFAULT 0,
                usage_totalTokens INTEGER DEFAULT 0,
                subscription_plan TEXT DEFAULT 'free',
                subscription_expiresAt DATETIME,
                isActive BOOLEAN DEFAULT 1,
                lastLogin DATETIME DEFAULT CURRENT_TIMESTAMP,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createImagesTable = `
            CREATE TABLE IF NOT EXISTS images (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                prompt TEXT NOT NULL,
                negativePrompt TEXT,
                model TEXT NOT NULL,
                size TEXT NOT NULL,
                quality TEXT DEFAULT 'standard',
                style TEXT DEFAULT 'vivid',
                status TEXT DEFAULT 'pending',
                errorMessage TEXT,
                processingTime INTEGER DEFAULT 0,
                tokensUsed INTEGER DEFAULT 0,
                cost REAL DEFAULT 0,
                isPublic BOOLEAN DEFAULT 0,
                likes INTEGER DEFAULT 0,
                originalImage TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `;

        const createImageDataTable = `
            CREATE TABLE IF NOT EXISTS image_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_id TEXT NOT NULL,
                url TEXT NOT NULL,
                revisedPrompt TEXT,
                seed INTEGER,
                FOREIGN KEY (image_id) REFERENCES images (id)
            )
        `;

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(createUsersTable);
                this.db.run(createImagesTable);
                this.db.run(createImageDataTable, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    getDb() {
        return this.db;
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('关闭SQLite连接失败:', err);
                    } else {
                        console.log('SQLite连接已关闭');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

const connectDB = async () => {
    try {
        // 检查是否可以使用MongoDB
        const mongoose = require('mongoose');
        if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'mongodb://localhost:27017/ai-image-generator') {
            // 如果配置了非本地的MongoDB，尝试连接
            try {
                await mongoose.connect(process.env.MONGODB_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                });
                console.log('✅ MongoDB连接成功');
                return mongoose;
            } catch (error) {
                console.log('⚠️ MongoDB连接失败，切换到SQLite');
            }
        }

        // 使用SQLite作为备选
        console.log('📱 使用SQLite数据库');
        const sqliteConn = new SQLiteConnection();
        await sqliteConn.connect();

        // 返回适配接口
        return {
            connection: sqliteConn,
            model: (name, schema) => {
                // 简单的模型适配器
                return {
                    create: async (data) => {
                        // 实现创建逻辑
                        return data;
                    },
                    findOne: async (query) => {
                        // 实现查找逻辑
                        return null;
                    },
                    findById: async (id) => {
                        // 实现根据ID查找逻辑
                        return null;
                    },
                    find: async (query) => {
                        // 实现查找逻辑
                        return [];
                    },
                    save: async function() {
                        // 实现保存逻辑
                        return this;
                    }
                };
            }
        };
    } catch (error) {
        console.error('❌ 数据库连接失败:', error);
        process.exit(1);
    }
};

module.exports = connectDB;