// services/aiService.js [v23 - 终极修复：强制尺寸生效版]

const axios = require('axios');
const FormData = require('form-data');

class AIService {
  constructor() {
    // 系统默认配置
    this.defaultBaseURL = process.env.AI_API_BASE_URL;
    this.defaultApiKey = process.env.AI_API_KEY;
    this.timeout = 180000; // 延长超时时间到3分钟
  }

  // 创建axios实例
  createClient(apiKey, baseURL) {
    const finalApiKey = apiKey || this.defaultApiKey;
    const finalBaseURL = baseURL || this.defaultBaseURL;

    return axios.create({
      baseURL: finalBaseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${finalApiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // 提取尺寸信息
  extractImageSize(imageData) {
    if (imageData.width && imageData.height) return { width: imageData.width, height: imageData.height };
    if (imageData.size && typeof imageData.size === 'string') {
      const match = imageData.size.match(/(\d+)x(\d+)/);
      if (match) return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    if (imageData.url) {
      const urlParams = new URL(imageData.url);
      const w = urlParams.searchParams.get('w') || urlParams.searchParams.get('width');
      const h = urlParams.searchParams.get('h') || urlParams.searchParams.get('height');
      if (w && h) return { width: parseInt(w), height: parseInt(h) };
    }
    return null;
  }

  // ✅ 【修复核心】文生图 - 强制接收 width 和 height
  async generateImage(params) {
    const { 
      prompt, 
      model = 'gpt-4o-image', 
      n = 1, 
      quality = 'standard',
      style = 'vivid',
      responseFormat = 'url', 
      size,          // 旧参数
      width,         // 🔥 新增：接收前端发的宽度
      height,        // 🔥 新增：接收前端发的高度
      apiKey = null,
      baseUrl = null
    } = params;

    const finalApiKey = apiKey || this.defaultApiKey;
    const finalBaseURL = baseUrl || this.defaultBaseURL;

    // 🔥 智能尺寸逻辑：优先使用具体的 width/height
    let finalSize = size || '1024x1024';
    if (width && height) {
      finalSize = `${width}x${height}`;
    }

    // 构造请求数据
    const requestData = { 
      model, 
      prompt, 
      n, 
      size: finalSize, 
      quality, 
      style, 
      response_format: responseFormat 
    };

    // 🔥 兼容性增强：有些非OpenAI的自定义模型（如SD/MJ wrapper）可能直接需要 width/height 字段
    if (width) requestData.width = parseInt(width);
    if (height) requestData.height = parseInt(height);

    console.log('🎨 开始[文生图]:', { model, size: finalSize, width, height });
    console.log(`📡 API地址: ${finalBaseURL}`);

    try {
      const response = await axios.post(
        `${finalBaseURL}/v1/images/generations`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${finalApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      console.log(`✅ [文生图] API请求成功`);
      
      // 处理返回数据中的尺寸
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        response.data.data = response.data.data.map(item => {
          const sizeInfo = this.extractImageSize(item);
          if (sizeInfo) {
            item.width = sizeInfo.width;
            item.height = sizeInfo.height;
            item.size = `${sizeInfo.width}x${sizeInfo.height}`;
          } else if (width && height) {
            // 如果API没返回尺寸，我们把请求的尺寸补上去，方便前端显示
            item.width = parseInt(width);
            item.height = parseInt(height);
            item.size = finalSize;
          }
          return item;
        });
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ [文生图]失败:', error.response?.data || error.message);
      return { success: false, error: this.formatError(error) };
    }
  }

  // ✅ 【修复核心】图生图 - 强制接收 width 和 height
  async editImage(params) {
    const { 
      prompt, 
      image, 
      images, 
      model, 
      size, 
      width,         // 🔥 新增
      height,        // 🔥 新增
      n = 1, 
      responseFormat = 'url',
      originalName = 'upload.png',
      apiKey = null,
      baseUrl = null
    } = params;
    
    const finalApiKey = apiKey || this.defaultApiKey;
    const finalBaseURL = baseUrl || this.defaultBaseURL;

    // 🔥 智能尺寸逻辑
    let finalSize = size;
    if (width && height) {
      finalSize = `${width}x${height}`;
    }

    const form = new FormData();
    form.append('prompt', prompt);
    
    // 处理图片
    if (images && Array.isArray(images)) {
      images.forEach((file) => {
        form.append('image', file.buffer, { filename: file.originalname });
      });
    } else if (image) {
      form.append('image', image, { filename: originalName });
    }
    
    form.append('model', model);
    form.append('n', n.toString());
    form.append('response_format', responseFormat);

    // 🔥 强制传递尺寸参数
    if (finalSize) {
      form.append('size', finalSize);
      // 某些API可能需要单独的 width/height 字段，通过 FormData 传过去更保险
      if(width) form.append('width', width);
      if(height) form.append('height', height);
      console.log(`📐 [图生图] 设定尺寸: ${finalSize} (W:${width}, H:${height})`);
    }

    console.log('🎨 开始[图生图]...');

    try {
      const response = await axios.post(
        `${finalBaseURL}/v1/images/edits`, 
        form, 
        {
          headers: {
            'Authorization': `Bearer ${finalApiKey}`,
            ...form.getHeaders()
          },
          timeout: this.timeout
        }
      );

      console.log(`✅ [图生图] API请求成功`);
      
      // 补充尺寸信息
      if (response.data && response.data.data) {
        response.data.data = response.data.data.map(item => {
           // 尝试提取，提取不到就用请求的尺寸兜底
           const sizeInfo = this.extractImageSize(item);
           if (sizeInfo) {
             item.width = sizeInfo.width;
             item.height = sizeInfo.height;
             item.size = `${sizeInfo.width}x${sizeInfo.height}`;
           } else if (width && height) {
             item.width = parseInt(width);
             item.height = parseInt(height);
             item.size = finalSize;
           }
           return item;
        });
      }

      return { success: true, data: response.data };

    } catch (error) {
      console.error('❌ [图生图]失败:', error.response?.data || error.message);
      return { success: false, error: this.formatError(error) };
    }
  }

  // 获取可用模型
  async getAvailableModels() {
    // ... 保持原样 ...
    const modelData = {
      'gpt-4o-image': { name: 'GPT-4o-Image', description: '智能图像生成', icon: '🌟' },
      'nano-banana': { name: 'Nano Banana', description: '快速生成', icon: '🍌' },
      'nano-banana-hd': { name: 'Nano Banana HD', description: '高清品质', icon: '🍌✨' },
      'nano-banana-2': { name: 'Nano Banana 2.0', description: '旗舰模型', icon: '🚀' }
    };
    return Promise.resolve(Object.keys(modelData).map(key => ({ id: key, ...modelData[key] })));
  }

  formatError(error) {
    if (error.response) { 
      const { status, data } = error.response; 
      if (status === 401) return 'AI服务认证失败，请检查API密钥'; 
      if (status === 429) return 'AI服务请求频率过高'; 
      return data.error?.message || `请求失败 (${status})`; 
    } 
    return error.message || '未知错误';
  }
}

module.exports = new AIService();