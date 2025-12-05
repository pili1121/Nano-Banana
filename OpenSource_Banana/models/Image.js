const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prompt: {
    type: String,
    required: [true, '提示词不能为空'],
    trim: true,
    maxlength: [2000, '提示词不能超过2000字符']
  },
  negativePrompt: {
    type: String,
    default: '',
    maxlength: [2000, '负面提示词不能超过2000字符']
  },
    model: {
    type: String,
    required: true,
    // ▼▼▼ 在这里的数组里加上 'nano-banana-2' ▼▼▼
    enum: ['gpt-4o-image', 'nano-banana', 'nano-banana-hd', 'nano-banana-2', 'nano-banana-2-2k', 'nano-banana-2-4k']
},


  size: {
    type: String,
    required: true,
    default: '1024x1024'
  },
  quality: {
    type: String,
    enum: ['standard', 'hd'],
    default: 'standard'
  },
  style: {
    type: String,
    enum: ['vivid', 'natural'],
    default: 'vivid'
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    revisedPrompt: {
      type: String,
      default: ''
    },
    seed: {
      type: Number,
      default: null
    }
  }],
  originalImage: {
    type: String,
    default: null // 图生图时的原图URL
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: ''
  },
  processingTime: {
    type: Number, // 处理时间（毫秒）
    default: 0
  },
  tokensUsed: {
    type: Number,
    default: 0
  },
  cost: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  likes: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    apiResponse: mongoose.Schema.Types.Mixed,
    requestParams: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.metadata;
      return ret;
    }
  }
});

// 索引
imageSchema.index({ user: 1, createdAt: -1 });
imageSchema.index({ status: 1 });
imageSchema.index({ model: 1 });
imageSchema.index({ isPublic: 1, createdAt: -1 });
imageSchema.index({ tags: 1 });

// 虚拟字段：缩略图URL
imageSchema.virtual('thumbnailUrl').get(function() {
  if (this.images && this.images.length > 0) {
    return this.images[0].url;
  }
  return null;
});

// 中间件：创建时更新用户统计
imageSchema.post('save', async function() {
  if (this.status === 'completed') {
    try {
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(
        this.user,
        {
          $inc: {
            'usage.totalImages': this.images.length,
            'usage.totalTokens': this.tokensUsed
          },
          $set: { lastLogin: new Date() }
        }
      );
    } catch (error) {
      console.error('更新用户统计失败:', error);
    }
  }
});

// 静态方法：获取用户的图片
imageSchema.statics.findByUser = function(userId, options = {}) {
  const query = { user: userId };
  const { page = 1, limit = 20, status } = options;

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'username email');
};

// 静态方法：获取公开图片
imageSchema.statics.findPublic = function(options = {}) {
  const query = { isPublic: true, status: 'completed' };
  const { page = 1, limit = 20, model, tags } = options;

  if (model) {
    query.model = model;
  }

  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'username avatar');
};

// 实例方法：添加图片URL
imageSchema.methods.addImages = function(imagesData) {
  this.images.push(...imagesData);
  this.status = 'completed';
  return this.save();
};

// 实例方法：标记为失败
imageSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

module.exports = mongoose.model('Image', imageSchema);