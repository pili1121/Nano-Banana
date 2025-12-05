/*
 * =================================================================
 * Nano Banana AI 工作台主逻辑脚本 (v28 - Instant Switch Fix)
 * 修改日志：
 * 1. [修复] 点击生成瞬间，立即切换到“我的”视图并清空画布，防止渲染卡片与灵感图混杂
 * 2. [优化] 保持生成成功后的自动刷新逻辑
 * =================================================================
 */

// ==========================================
// 1. 全局配置与状态管理 (Global State)
// ==========================================
const API_BASE_URL = '/api';

// 当前登录用户信息
let currentUser = null;

// 当前选中的模型 ID
let selectedModel = 'nano-banana'; 

// 当前选择的生成数量
let selectedQuantity = '1';

// 灵感库的原始内容备份 (用于切换回灵感 Tab 时恢复)
let originalInspirationContent = null;

// 已上传的参考图片数组 (File Objects)
let uploadedImageFiles = [];

// 是否正在生成中 (防止重复点击)
let isGenerating = false;


// ==========================================
// 2. 应用初始化 (Initialization)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ 页面加载完成，开始初始化 Nano Banana...');
    
    try {
        // 1. 检查用户是否登录
        checkAuthStatus();

        if (currentUser) {
            // 备份灵感库内容
            const mainContentArea = document.querySelector('.masonry-grid');
            if(mainContentArea) {
                originalInspirationContent = mainContentArea.innerHTML;
            }
            
            // 2. 加载模型列表
            loadAvailableModels();
            
            // 3. 初始化所有按钮和事件监听
            initializeEventListeners();
        }
    } catch (error) {
        console.error('❌ 初始化过程中发生严重错误:', error);
        showErrorToast('页面加载失败，请刷新重试。');
    }
});


// ==========================================
// 3. 模型管理逻辑 (Model Logic)
// ==========================================

function loadAvailableModels() {
    const models = [
        { 
            id: 'nano-banana', 
            name: 'Nano Banana', 
            icon: '🍌', 
            description: '标准模式，生成速度快，适合日常使用' 
        },
        { 
            id: 'nano-banana-hd', 
            name: 'Nano Banana HD', 
            icon: '✨', 
            description: '高清模式，增强画质细节' 
        },
        { 
            id: 'nano-banana-2',  
            name: 'Nano Banana 2.0', 
            icon: '🚀', 
            description: '最新一代大模型，极致画质 (支持比例选择)' 
        },
        { 
            id: 'nano-banana-2-2k',  
            name: 'Nano Banana 2.0 (2K)', 
            icon: '🔷', 
            description: '2K 模式，超清分辨率绘图' 
        },
        { 
            id: 'nano-banana-2-4k',  
            name: 'Nano Banana 2.0 (4K)', 
            icon: '💠', 
            description: '4K 模式，极致细节视觉盛宴' 
        }
    ];
    updateModelDropdown(models);
}

function updateModelDropdown(modelsArray) {
    const modelDropdown = document.getElementById('modelDropdown');
    
    if (!modelDropdown) return;

    let dropdownHTML = '<div class="p-1 space-y-1">';
    
    for (const modelInfo of modelsArray) {
        const icon = modelInfo.icon || '✨';
        dropdownHTML += `
        <button class="w-full text-left px-3 py-3 rounded-lg flex items-center space-x-3 model-select-button hover:bg-blue-500/10 group transition-colors" 
                data-model-id="${modelInfo.id}" 
                data-model-name="${modelInfo.name}" 
                data-model-icon="${icon}">
            <span class="text-2xl group-hover:scale-110 transition-transform">${icon}</span>
            <div>
                <div class="font-bold text-sm group-hover:text-blue-500 transition-colors">${modelInfo.name}</div>
                <div class="text-[10px] text-gray-400 group-hover:text-blue-400/70">${modelInfo.description}</div>
            </div>
        </button>`;
    }
    dropdownHTML += '</div>';
    modelDropdown.innerHTML = dropdownHTML;

    modelDropdown.querySelectorAll('.model-select-button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); 
            selectModel(this.dataset.modelId, this.dataset.modelName, this.dataset.modelIcon);
        });
    });

    const current = modelsArray.find(m => m.id === selectedModel) || modelsArray[0];
    if (current) {
        selectModel(current.id, current.name, current.icon);
    }
}

function selectModel(modelId, modelName, icon) {
    selectedModel = modelId;
    const modelSelector = document.getElementById('modelSelector');
    const modelDropdown = document.getElementById('modelDropdown');

    if (modelSelector) {
        modelSelector.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-2xl">${icon}</span>
                <span class="font-medium text-sm">${modelName}</span>
            </div>
            <i class="fas fa-chevron-down text-xs text-gray-400"></i>
        `;
    }
    
    if (modelDropdown) {
        modelDropdown.classList.add('hidden');
    }

    const aspectRatioBox = document.getElementById('aspect-ratio-box');
    if (aspectRatioBox) {
        if (modelId.startsWith('nano-banana-2')) {
            aspectRatioBox.classList.remove('hidden'); 
        } else {
            aspectRatioBox.classList.add('hidden'); 
        }
    }
}


// ==========================================
// 4. 图片生成核心逻辑 (Generation Logic)
// ==========================================

async function handleGenerateClick(e) {
    if (e) e.preventDefault();
    
    // 1. 状态检查
    if (isGenerating) {
        showErrorToast('正在生成中，请稍候...');
        return;
    }

    const promptInput = document.getElementById('promptInput');
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showErrorToast('请输入图片描述');
        return;
    }

    // 2. 设置 UI 为加载状态
    const generateBtn = document.getElementById('generateBtn');
    isGenerating = true;
    setButtonLoading(generateBtn, true, "立即生成");

    // ============================================================
    // 🔥🔥🔥 核心修复：点击瞬间立即切换UI到“我的” 🔥🔥🔥
    // ============================================================
    const myWorksTab = document.getElementById('myWorksTab');
    const inspirationTab = document.getElementById('inspirationTab');
    const container = document.querySelector('.masonry-grid');
    const mainContentTitle = document.querySelector('.flex-1 h2');

    // 2.1 PC端 Tab 样式切换
    if (myWorksTab && inspirationTab) {
        switchTab(myWorksTab, inspirationTab);
    }
    // 更新标题
    if (mainContentTitle) mainContentTitle.textContent = '我的创作';

    // 2.2 移动端 View 切换
    if (window.innerWidth <= 1024) {
        const controlPanel = document.getElementById('control-panel-container');
        const rightContent = document.getElementById('right-content-panel');
        const mobileTabInspire = document.getElementById('mobileTabInspire');
        const mobileTabCreate = document.getElementById('mobileTabCreate');

        if(controlPanel && rightContent) {
            // 切换到右侧视图
            controlPanel.style.display = 'none';
            rightContent.style.display = 'flex';
            
            // 更新顶部 Tab 样式
            if (mobileTabInspire && mobileTabCreate) {
                const activeClass = "flex-1 py-1.5 text-xs font-bold rounded-full shadow-sm bg-blue-600 text-white transition-all duration-300 flex items-center justify-center gap-1";
                const inactiveClass = "flex-1 py-1.5 text-xs font-medium rounded-full text-gray-400 hover:text-gray-200 transition-all duration-300 flex items-center justify-center gap-1";
                mobileTabInspire.className = activeClass;
                mobileTabCreate.className = inactiveClass;
            }
        }
    }

    // 2.3 【关键】清空当前画布（移除灵感图片）
    // 这样占位卡片就会显示在空白区域，而不是混在灵感图里
    if (container) {
        container.innerHTML = '';
    }
    // ============================================================

    const qty = parseInt(selectedQuantity) || 1;
    const generatingCardIds = [];
    
    // 3. 插入占位卡片
    for (let i = 0; i < qty; i++) {
        const generatingCard = createGeneratingCard();
        const cardId = 'generating-' + Date.now() + '-' + i;
        generatingCard.id = cardId;
        generatingCardIds.push(cardId);
        container.prepend(generatingCard);
    }

    // 滚动到顶部
    setTimeout(() => {
        if(container.parentElement) container.parentElement.scrollTop = 0;
    }, 100);

    try {
        let result;
        
        if (uploadedImageFiles && uploadedImageFiles.length > 0) {
            console.log(`🚀 执行【图生图】逻辑...（使用 ${uploadedImageFiles.length} 张参考图）`);
            result = await editImage(prompt, uploadedImageFiles);
        } else {
            console.log('🚀 执行【文生图】逻辑...');
            result = await generateImage(prompt);
        }

        if (!result) {
            generatingCardIds.forEach(id => document.getElementById(id)?.remove());
            return;
        }

        // 4. 处理成功结果
        if (result && result.success) {
            const images = Array.isArray(result.data) ? result.data : [result.data];
            
            if (images.length > 0) {
                // 移除占位卡片 (因为我们要刷新整个列表，所以直接移除即可)
                generatingCardIds.forEach(id => document.getElementById(id)?.remove());
                
                showSuccessToast(`生成成功！共生成 ${images.length} 张图片`);

                // 5. 强制刷新“我的作品”列表数据
                // 优先调用挂载在 window 上的全局函数
                if (typeof window.loadMyWorksFromBackend === 'function') {
                    window.loadMyWorksFromBackend();
                } else {
                    fetchAndDisplayMyWorks();
                }

            } else {
                generatingCardIds.forEach(id => document.getElementById(id)?.remove());
                throw new Error('无法解析服务器返回的图片信息');
            }

        } else {
            // 处理 API 返回的业务错误
            generatingCardIds.forEach(id => document.getElementById(id)?.remove());
            throw new Error(result.error || '生成失败，未知原因');
        }
    } catch (error) {
        console.error('生成/编辑图片错误:', error);
        generatingCardIds.forEach(id => document.getElementById(id)?.remove());
        showErrorToast(error.message || '图片生成/编辑失败');
        
        // 出错后，重新加载列表，避免页面空白
        if (typeof window.loadMyWorksFromBackend === 'function') {
            window.loadMyWorksFromBackend();
        }
    } finally {
        isGenerating = false;
        setButtonLoading(generateBtn, false, "立即生成");
    }
}

function createGeneratingCard() {
    const card = document.createElement('div');
    card.className = 'masonry-item';

    const styleId = 'nano-loader-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes nano-spin { to { transform: rotate(360deg); } }
            @keyframes nano-pulse { 0%, 100% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); text-shadow: 0 0 15px rgba(168, 85, 247, 0.6); } }
            @keyframes nano-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
            .nano-glass-card { background: rgba(20, 20, 20, 0.6) !important; backdrop-filter: blur(20px) !important; border: 1px solid rgba(255, 255, 255, 0.08) !important; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6) !important; }
            .nano-loader-ring { width: 100%; height: 100%; border-radius: 50%; border: 2px solid transparent; border-top-color: #a855f7; border-right-color: #3b82f6; animation: nano-spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite; filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4)); }
        `;
        document.head.appendChild(style);
    }

    card.innerHTML = `
        <div class="component-tertiary rounded-xl overflow-hidden nano-glass-card relative group" 
             style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; padding: 2rem; text-align: center;">
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr from-purple-900/20 to-blue-900/20 rounded-full blur-[60px] pointer-events-none"></div>
            <div class="relative w-24 h-24 mb-10 flex items-center justify-center">
                <div class="absolute inset-0 nano-loader-ring"></div>
                <div class="absolute inset-3 border border-white/5 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-inner">
                    <i class="fas fa-layer-group text-3xl text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-blue-400 relative z-10" style="animation: nano-pulse 2s ease-in-out infinite;"></i>
                </div>
            </div>
            <div class="relative z-10 space-y-3">
                <h3 class="text-xl font-bold text-white tracking-wide">云端算力正在渲染...</h3>
                <div class="flex items-center justify-center gap-2 text-[10px] text-blue-200/50 font-mono uppercase tracking-[0.2em]">
                    <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    GENERATING /// GPU ACTIVE
                </div>
            </div>
            <div class="absolute bottom-0 left-0 w-full h-[2px] bg-gray-800/50 overflow-hidden">
                <div class="h-full bg-gradient-to-r from-transparent via-purple-500 to-transparent w-2/3 opacity-80" style="animation: nano-shimmer 2s infinite linear;"></div>
            </div>
        </div>
    `;
    return card;
}

async function editImage(prompt, imageFiles) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
        showErrorToast('认证信息丢失，请重新登录。');
        handleLogout();
        return null;
    }

    const formData = new FormData();
    formData.append('prompt', prompt);
    
    if (Array.isArray(imageFiles)) {
        imageFiles.forEach((file) => formData.append('image', file));
    } else {
        formData.append('image', imageFiles);
    }
    
    formData.append('model', selectedModel);
    formData.append('quantity', selectedQuantity);

    if (selectedModel.startsWith('nano-banana-2')) {
        const ratioSelect = document.getElementById('aspectRatioSelect');
        const ratio = ratioSelect ? ratioSelect.value : '1:1';
        const sizeMap = { '1:1': { w: 1024, h: 1024 }, '16:9': { w: 1024, h: 576 }, '9:16': { w: 576, h: 1024 }, '4:3': { w: 1024, h: 768 }, '3:4': { w: 768, h: 1024 } };
        const dims = sizeMap[ratio] || sizeMap['1:1'];

        formData.append('aspect_ratio', ratio); 
        formData.append('width', dims.w);      
        formData.append('height', dims.h);    
        formData.append('size', `${dims.w}x${dims.h}`);
    }

    const response = await fetch(`${API_BASE_URL}/image/edit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `API错误，状态码: ${response.status}`);
    return data;
}

async function generateImage(prompt) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
        showErrorToast('认证信息丢失，请重新登录。');
        handleLogout();
        return null;
    }

    const requestBody = {
        prompt: prompt,
        model: selectedModel,
        quantity: selectedQuantity
    };

    if (selectedModel.startsWith('nano-banana-2')) {
        const ratioSelect = document.getElementById('aspectRatioSelect');
        const ratio = ratioSelect ? ratioSelect.value : '1:1';
        const sizeMap = { '1:1': { w: 1024, h: 1024 }, '16:9': { w: 1024, h: 576 }, '9:16': { w: 576, h: 1024 }, '4:3': { w: 1024, h: 768 }, '3:4': { w: 768, h: 1024 } };
        const dims = sizeMap[ratio] || sizeMap['1:1'];

        requestBody.aspect_ratio = ratio;
        requestBody.width = dims.w;        
        requestBody.height = dims.h;       
        requestBody.size = `${dims.w}x${dims.h}`;
    }

    const response = await fetch(`${API_BASE_URL}/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `API错误，状态码: ${response.status}`);
    return data;
}


// ==========================================
// 5. 辅助与初始化函数 (Helpers)
// ==========================================

function checkAuthStatus() {
    const authToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userDataString = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (authToken && userDataString) {
        try {
            currentUser = JSON.parse(userDataString);
        } catch (e) {
            handleLogout();
        }
    } else {
        window.location.href = '/login.html';
    }
}

function initializeEventListeners() {
    const inspirationTab = document.getElementById('inspirationTab');
    const myWorksTab = document.getElementById('myWorksTab');
    const mainContentTitle = document.querySelector('.flex-1 h2');
    const mainContentArea = document.querySelector('.masonry-grid');

    if (inspirationTab && myWorksTab && mainContentTitle && mainContentArea) {
        inspirationTab.addEventListener('click', () => {
            switchTab(inspirationTab, myWorksTab);
            mainContentTitle.textContent = '创意灵感库';
            if (originalInspirationContent) {
                mainContentArea.innerHTML = originalInspirationContent;
            }
        });
        myWorksTab.addEventListener('click', () => {
            switchTab(myWorksTab, inspirationTab);
            mainContentTitle.textContent = '我的创作';
            fetchAndDisplayMyWorks();
        });
    }

    document.getElementById('generateBtn')?.addEventListener('click', handleGenerateClick);

    document.addEventListener('click', function(e) {
        const masonryItem = e.target.closest('.masonry-item[data-prompt]');
        if (masonryItem) {
            const prompt = masonryItem.dataset.prompt;
            const promptInput = document.getElementById('promptInput');
            if (prompt && promptInput) {
                promptInput.value = prompt;
                const event = new Event('input', { bubbles: true });
                promptInput.dispatchEvent(event);
                if(window.innerWidth > 1024) promptInput.focus();
                showSuccessToast('✨ 提示词已应用');
            }
        }
    });

    const promptInput = document.getElementById('promptInput');
    const charCount = document.getElementById('charCount');
    if (promptInput && charCount) {
        promptInput.addEventListener('input', () => {
            charCount.textContent = `${promptInput.value.length}/2000`;
            charCount.classList.toggle('text-yellow-400', promptInput.value.length > 1800);
        });
    }

    const quantitySelect = document.getElementById('quantitySelect');
    if (quantitySelect) {
        quantitySelect.addEventListener('change', (e) => {
            selectedQuantity = e.target.value;
        });
        selectedQuantity = quantitySelect.value;
    }

    const uploadBtn = document.getElementById('uploadBtn');
    if(uploadBtn) uploadBtn.addEventListener('click', handleImageUpload);

    const advancedToggle = document.getElementById('advancedToggle');
    if(advancedToggle) advancedToggle.addEventListener('click', () => {
        document.getElementById('advancedSettings').classList.toggle('hidden');
        document.getElementById('advancedIcon').classList.toggle('rotate-180');
    });

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    initializeKeyboardShortcuts();

    const notificationBtn = document.getElementById('notificationBtn');
    const noticeModal = document.getElementById('noticeModal');
    const closeNoticeBtn = document.getElementById('closeNoticeBtn');
    const closeNoticeMainBtn = document.getElementById('closeNoticeMainBtn');
    const noticeBackdrop = document.getElementById('noticeBackdrop');

    function toggleNotice(show) {
        if (!noticeModal) return;
        if (show) {
            noticeModal.classList.remove('hidden');
            fetchAnnouncement();
        } else {
            noticeModal.classList.add('hidden');
        }
    }

    if (notificationBtn) notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNotice(true);
    });
    if (closeNoticeBtn) closeNoticeBtn.addEventListener('click', () => toggleNotice(false));
    if (closeNoticeMainBtn) closeNoticeMainBtn.addEventListener('click', () => toggleNotice(false));
    if (noticeBackdrop) noticeBackdrop.addEventListener('click', () => toggleNotice(false));

    async function fetchAnnouncement() {
        const contentDiv = document.getElementById('noticeContentDisplay');
        const timeDiv = document.getElementById('noticeTime');
        if (!contentDiv) return;
        try {
            contentDiv.innerHTML = '<div class="text-center text-gray-400"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
            const res = await fetch(`${API_BASE_URL}/image/public/announcement`);
            const json = await res.json();
            if (json.success && json.data) {
                const notice = json.data;
                const colorClass = notice.isImportant ? 'text-orange-400 font-bold' : 'text-gray-300';
                contentDiv.className = `bg-gray-800/50 p-4 rounded-xl text-sm leading-relaxed min-h-[100px] whitespace-pre-wrap border border-gray-700 ${colorClass}`;
                contentDiv.textContent = notice.content;
                if(timeDiv) timeDiv.textContent = '发布于: ' + new Date(notice.createdAt).toLocaleString();
            } else {
                contentDiv.className = `bg-gray-800/50 p-4 rounded-xl text-sm leading-relaxed min-h-[100px] flex items-center justify-center text-gray-500 border border-gray-700`;
                contentDiv.textContent = '暂时没有新的系统公告。';
                if(timeDiv) timeDiv.textContent = '';
            }
        } catch (e) {
            console.error("获取公告失败", e);
            contentDiv.textContent = '加载公告失败，请稍后重试。';
        }
    }
}


// ==========================================
// 6. UI 渲染与交互逻辑 (UI Rendering)
// ==========================================

async function fetchAndDisplayMyWorks() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const container = document.querySelector('.masonry-grid');
    if (!token || !container) return;

    container.innerHTML = `<p class="text-center text-gray-400 p-8 col-span-3">正在加载...</p>`;

    try {
        const response = await fetch(`${API_BASE_URL}/image/history?t=`+new Date().getTime(), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (!response.ok || !result.success) throw new Error(result.error);

        container.innerHTML = '';
        if (result.data && result.data.length > 0) {
            result.data.forEach(imageData => container.appendChild(createWorkCard(imageData)));
        } else {
            container.innerHTML = `<p class="text-center text-gray-400 p-8 col-span-3">暂无作品</p>`;
        }
    } catch (error) {
        container.innerHTML = `<p class="text-center text-red-400 p-8 col-span-3">加载失败</p>`;
    }
}

function createWorkCard(imageData) {
    const card = document.createElement('div');
    card.className = 'masonry-item group cursor-pointer';
    
    let aspectRatioStyle = '';
    if (imageData.size) {
        const [width, height] = imageData.size.split('x').map(Number);
        if (width && height) aspectRatioStyle = `aspect-ratio: ${width / height};`;
    }
    
    const imgUrl = imageData.image_url || imageData.url;

    card.innerHTML = `
        <div class="component-tertiary rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500/50 transition-all duration-300 shadow-lg border border-white/5 flex flex-col h-full bg-[#1e1e1e]">
            <div class="relative w-full bg-gray-900/50 group/image overflow-hidden" style="${aspectRatioStyle}">
                <img src="${imgUrl}" alt="AI Image" class="w-full h-full object-contain transition-transform duration-700 group-hover/image:scale-105" loading="lazy">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
            <div class="p-4 flex flex-col flex-1 gap-3">
                <h3 class="font-medium text-gray-300 text-xs leading-relaxed line-clamp-2 min-h-[2.5em] select-none" title="${imageData.prompt || ''}">${imageData.prompt || '无标题'}</h3>
                <div class="h-px w-full bg-white/5"></div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <button class="w-8 h-8 rounded-lg bg-white/5 hover:bg-blue-600 hover:text-white text-gray-400 transition-all flex items-center justify-center download-btn" title="下载原图"><i class="fas fa-download text-xs"></i></button>
                        <button class="w-8 h-8 rounded-lg bg-white/5 hover:bg-purple-600 hover:text-white text-gray-400 transition-all flex items-center justify-center use-ref-btn" title="作为参考图"><i class="fas fa-magic text-xs"></i></button>
                    </div>
                    <button class="w-8 h-8 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-gray-600 transition-all flex items-center justify-center delete-btn" data-id="${imageData.id}" title="删除这张图"><i class="fas fa-trash-alt text-xs"></i></button>
                </div>
            </div>
        </div>
    `;

    const downloadBtn = card.querySelector('.download-btn');
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadImage(imgUrl, imageData.prompt);
    });

    const useRefBtn = card.querySelector('.use-ref-btn');
    useRefBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        useAsReference(imgUrl);
    });

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteImage(deleteBtn.dataset.id);
    });

    return card;
}

async function useAsReference(imgUrl) {
    console.log("⚡️ 正在尝试垫图:", imgUrl);

    if (uploadedImageFiles.length >= 3) {
        showErrorToast('参考图已满 3 张，请先删除旧图');
        return;
    }

    const uploadBtn = document.getElementById('uploadBtn');
    const originalText = uploadBtn ? uploadBtn.innerHTML : '';
    
    if(uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
    }

    try {
        showToast('正在获取图片资源...', 'success');
        const response = await fetch(imgUrl);
        if (!response.ok) throw new Error("图片下载失败");
        const blob = await response.blob();
        const fileName = `ref_${Date.now()}.png`;
        const file = new File([blob], fileName, { type: blob.type });
        file._uploadId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        uploadedImageFiles = [...uploadedImageFiles, file];
        renderUploadedImages();
        showSuccessToast('✨ 已设为参考图，可继续修改提示词');

        if (window.innerWidth < 1024) {
             const sidebar = document.querySelector('.side-nav-container');
             const overlay = document.getElementById('menuOverlay');
             if (sidebar && overlay) {
                 sidebar.style.transform = 'translateX(0%)';
                 overlay.classList.remove('hidden');
             }
        }

    } catch (error) {
        console.error("垫图失败:", error);
        showErrorToast('无法获取该图片 (可能是跨域限制)');
    } finally {
        if(uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = originalText;
        }
    }
}


// ==========================================
// 7. 图片上传与管理逻辑 (Upload Manager)
// ==========================================

function handleImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = e => {
        const newFiles = Array.from(e.target.files);
        if (newFiles.length === 0) return;
        if (uploadedImageFiles.length + newFiles.length > 3) {
            showErrorToast(`❌ 最多只能上传3张参考图片！`);
            return;
        }
        newFiles.forEach(file => {
            file._uploadId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        });
        uploadedImageFiles = [...uploadedImageFiles, ...newFiles];
        renderUploadedImages();
    };
    input.click();
}

function renderUploadedImages() {
    const uploadedContainer = document.getElementById('uploadedImages');
    const imageGrid = document.getElementById('imageGrid');
    const imageCount = document.getElementById('imageCount');
    const uploadBtn = document.getElementById('uploadBtn');
    
    imageGrid.innerHTML = '';
    
    uploadedImageFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.createElement('div');
            preview.className = 'relative group rounded-lg overflow-hidden cursor-pointer';
            preview.innerHTML = `
                <img src="${e.target.result}" class="w-full h-20 object-cover">
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                    <button class="text-white bg-red-500 rounded-full w-6 h-6 flex items-center justify-center hidden group-hover:flex delete-upload-btn" data-upload-id="${file._uploadId}">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            `;
            const deleteBtn = preview.querySelector('.delete-upload-btn');
            deleteBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                removeUploadedImage(file._uploadId);
            });
            imageGrid.appendChild(preview);
        };
        reader.readAsDataURL(file);
    });

    imageCount.textContent = uploadedImageFiles.length;
    if (uploadedImageFiles.length > 0) uploadedContainer.classList.remove('hidden');
    else uploadedContainer.classList.add('hidden');
    if (uploadedImageFiles.length >= 3) uploadBtn.classList.add('hidden');
    else uploadBtn.classList.remove('hidden');
}

function removeUploadedImage(uploadId) {
    uploadedImageFiles = uploadedImageFiles.filter(f => f._uploadId !== uploadId);
    renderUploadedImages();
}


// ==========================================
// 8. 其他工具函数 (Utilities)
// ==========================================

function handleLogout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login.html';
}

function switchTab(activeTab, inactiveTab) {
    activeTab.classList.add('bg-white', 'text-gray-900');
    activeTab.classList.remove('text-gray-300');
    inactiveTab.classList.remove('bg-white', 'text-gray-900');
    inactiveTab.classList.add('text-gray-300');
}

function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme') || 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const icon = document.getElementById('themeIcon');
    if(icon) icon.className = next === 'light' ? 'fas fa-sun text-orange-500' : 'fas fa-moon';
}

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('generateBtn')?.click();
        }
    });
}

function setButtonLoading(button, loading, originalText) {
    if (!button) return;
    if (loading) {
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>处理中...`;
    } else {
        button.disabled = false;
        button.innerHTML = `<span>${originalText}</span><span class="text-2xl animate-pulse ml-3">💎</span>`;
    }
}

function downloadImage(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = (name || 'image') + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function deleteImage(id) {
    if (!confirm('确定删除这张图片吗?')) return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
        showErrorToast('身份验证失效，请重新登录');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/image/delete/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && (data.success || data.code === 200)) {
            showSuccessToast('✅ 图片已删除');
            const btn = document.querySelector(`.delete-btn[data-id="${id}"]`);
            if (btn) {
                const item = btn.closest('.masonry-item');
                if(item) item.remove();
            }
            fetchAndDisplayMyWorks();
        } else {
            throw new Error(data.error || data.message || '删除失败');
        }
    } catch (err) {
        console.error('删除出错:', err);
        showErrorToast('❌ 删除失败: ' + (err.message || '网络错误'));
    }
}


// ==========================================
// 9. Toast 轻提示组件 (Toast UI)
// ==========================================

function showToast(msg, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    el.className = `pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-full border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-[-20px] opacity-0 ${bgColor}`;
    el.innerHTML = `<i class="fas ${icon}"></i> <span class="text-sm font-bold">${msg}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => { el.classList.remove('translate-y-[-20px]', 'opacity-0'); });
    setTimeout(() => {
        el.classList.add('opacity-0', 'translate-y-[-20px]');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

function showSuccessToast(msg) { showToast(msg, 'success'); }
function showErrorToast(msg) { showToast(msg, 'error'); }