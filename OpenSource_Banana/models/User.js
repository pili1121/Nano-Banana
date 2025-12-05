const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    trim: true,
    minlength: [2, '用户名至少2个字符'],
    maxlength: [20, '用户名最多20个字符'],
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      '请输入有效的邮箱地址'
    ]
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少6个字符'],
    select: false // 默认查询时不返回密码
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: null
  },
  usage: {
    totalImages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free'
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  // 只有密码被修改时才加密
  if (!this.isModified('password')) return next();

  try {
    // 加密密码
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('密码验证失败');
  }
};

// 更新使用统计
userSchema.methods.updateUsage = async function(imageCount = 1, tokens = 0) {
  this.usage.totalImages += imageCount;
  this.usage.totalTokens += tokens;
  return await this.save();
};

// 获取用户信息（不含敏感信息）
userSchema.methods.getProfile = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    usage: this.usage,
    subscription: this.subscription,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin
  };
};

// 索引
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);