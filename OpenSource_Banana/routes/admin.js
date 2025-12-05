const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database'); 

// ==========================================
// VIP 通道：后台管理 (旗舰UI版)
// ==========================================
router.get('/panel', (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
    
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nano Admin | 智能中控台</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['"Plus Jakarta Sans"', 'sans-serif'] },
                    colors: {
                        dark: { 900: '#030712', 800: '#111827', 700: '#1f2937' },
                        primary: { 500: '#6366f1', 600: '#4f46e5' }
                    },
                    animation: { 'blob': 'blob 7s infinite' },
                    keyframes: {
                        blob: {
                            '0%': { transform: 'translate(0px, 0px) scale(1)' },
                            '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                            '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                            '100%': { transform: 'translate(0px, 0px) scale(1)' },
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #030712; color: #f3f4f6; }
        .glass-panel {
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-sidebar {
            background: rgba(3, 7, 18, 0.9);
            backdrop-filter: blur(20px);
            border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        .input-dark {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            transition: all 0.3s ease;
        }
        .input-dark:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
            outline: none;
        }
        /* 滚动条美化 */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
        
        .nav-item.active {
            background: linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%);
            border-left: 3px solid #6366f1;
            color: #818cf8;
        }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="h-screen overflow-hidden text-sm selection:bg-indigo-500 selection:text-white">

    <!-- 动态背景光晕 -->
    <div class="fixed inset-0 pointer-events-none z-0">
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
        <div class="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div class="absolute -bottom-8 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
    </div>

    <!-- 登录界面 -->
    <div id="loginSection" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="w-full max-w-md glass-panel rounded-2xl shadow-2xl p-8 relative z-10 fade-in">
            <div class="text-center mb-8">
                <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
                    <i class="fas fa-cube text-2xl text-white"></i>
                </div>
                <h1 class="text-2xl font-bold text-white tracking-tight">Nano Admin</h1>
                <p class="text-gray-400 text-xs mt-2 uppercase tracking-widest">超级管理控制台</p>
            </div>
            
            <div class="space-y-5">
                <div>
                    <label class="block text-xs font-medium text-gray-400 mb-1.5 ml-1">管理员账号</label>
                    <div class="relative">
                        <i class="fas fa-envelope absolute left-4 top-3.5 text-gray-500"></i>
                        <input type="email" id="email" value="925626799@qq.com" class="w-full input-dark rounded-xl py-3 pl-10 pr-4">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-400 mb-1.5 ml-1">密码</label>
                    <div class="relative">
                        <i class="fas fa-lock absolute left-4 top-3.5 text-gray-500"></i>
                        <input type="password" id="pwd" class="w-full input-dark rounded-xl py-3 pl-10 pr-4">
                    </div>
                </div>
                <button onclick="doLogin()" class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-95">
                    安全登录
                </button>
            </div>
        </div>
    </div>

    <!-- 主界面 -->
    <div id="mainSection" class="hidden relative z-10 w-full h-full flex">
        
        <!-- 侧边栏 -->
        <aside class="w-72 glass-sidebar flex flex-col h-full flex-shrink-0 transition-all duration-300">
            <div class="h-20 flex items-center px-8 border-b border-white/5">
                <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/40">
                    <i class="fas fa-bolt text-white text-sm"></i>
                </div>
                <div>
                    <h1 class="font-bold text-lg text-white leading-none">Nano</h1>
                    <span class="text-[10px] text-gray-400 tracking-wider">CONSOLE</span>
                </div>
            </div>

            <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-4 mb-2 mt-4">数据管理</div>
                
                <button onclick="switchTab('users')" id="btn-users" class="nav-item w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all group">
                    <span class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors"><i class="fas fa-users"></i></span>
                    <span class="font-medium">用户管理</span>
                </button>

                <button onclick="switchTab('inspirations')" id="btn-inspirations" class="nav-item w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all group">
                    <span class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors"><i class="fas fa-images"></i></span>
                    <span class="font-medium">灵感图库</span>
                </button>

                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-4 mb-2 mt-6">运营工具</div>

                <button onclick="switchTab('notices')" id="btn-notices" class="nav-item w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all group">
                    <span class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors"><i class="fas fa-bullhorn"></i></span>
                    <span class="font-medium">系统公告</span>
                </button>
            </nav>

            <div class="p-4 border-t border-white/5">
                <button onclick="location.reload()" class="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-xs font-bold">
                    <i class="fas fa-sign-out-alt"></i> 退出系统
                </button>
            </div>
        </aside>

        <!-- 内容区域 -->
        <main class="flex-1 flex flex-col min-w-0 bg-transparent relative overflow-hidden">
            <!-- 顶部栏 -->
            <header class="h-20 flex items-center justify-between px-8 border-b border-white/5 glass-panel z-20">
                <div class="flex flex-col">
                    <h2 id="pageTitle" class="text-xl font-bold text-white">仪表盘</h2>
                    <p class="text-xs text-gray-400 mt-0.5">欢迎回来，管理员</p>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span class="text-xs text-green-400 font-medium">System Online</span>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 flex items-center justify-center border border-white/10 shadow-lg">
                        <i class="fas fa-user-shield text-gray-300"></i>
                    </div>
                </div>
            </header>

            <!-- 核心内容区 -->
            <div class="flex-1 overflow-y-auto p-8 scrollbar-thin">
                
                <!-- 1. 用户管理 -->
                <div id="users" class="section active fade-in space-y-6">
                    <div class="glass-panel rounded-2xl overflow-hidden shadow-2xl">
                        <div class="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 class="font-bold text-white flex items-center gap-2"><i class="fas fa-table text-indigo-400"></i> 用户列表</h3>
                            <button onclick="loadUsers()" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"><i class="fas fa-sync-alt mr-1"></i> 刷新数据</button>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left" id="userTable">
                                <thead class="bg-gray-900/50 text-gray-400 uppercase text-xs font-semibold">
                                    <tr>
                                        <th class="px-6 py-4">用户 ID</th>
                                        <th class="px-6 py-4">账户信息</th>
                                        <th class="px-6 py-4">剩余积分</th>
                                        <th class="px-6 py-4 text-right">资产管理</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-white/5 text-gray-300 text-sm"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- 2. 灵感管理 -->
                <div id="inspirations" class="section hidden fade-in space-y-8">
                    <!-- 发布卡片 -->
                    <div class="glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                        <div class="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-purple-600/20 transition-all"></div>
                        
                        <div class="relative z-10">
                            <h3 class="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <span class="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400"><i class="fas fa-magic"></i></span>
                                发布新灵感
                            </h3>
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div class="space-y-2">
                                    <label class="text-xs font-bold text-gray-400 ml-1">图片链接 (URL)</label>
                                    <input id="insUrl" placeholder="https://..." class="w-full input-dark rounded-xl px-4 py-3">
                                </div>
                                <div class="space-y-2">
                                    <label class="text-xs font-bold text-gray-400 ml-1">提示词 (Prompt)</label>
                                    <textarea id="insPrompt" rows="1" placeholder="画面描述..." class="w-full input-dark rounded-xl px-4 py-3 h-[48px] resize-none"></textarea>
                                </div>
                            </div>
                            <div class="mt-6 flex justify-end">
                                <button onclick="addInspiration()" class="px-8 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all">
                                    <i class="fas fa-cloud-upload-alt"></i> 立即发布
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 列表 -->
                    <div>
                        <div class="flex justify-between items-end mb-4 px-1">
                            <h3 class="text-lg font-bold text-white flex items-center gap-2"><i class="fas fa-layer-group text-gray-500"></i> 已发布内容</h3>
                            <button onclick="loadInspirations()" class="text-xs text-gray-400 hover:text-white"><i class="fas fa-sync-alt"></i> 刷新</button>
                        </div>
                        <div id="insList" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"></div>
                    </div>
                </div>

                <!-- 3. 系统公告 -->
                <div id="notices" class="section hidden fade-in space-y-8">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <!-- 左侧发布 -->
                        <div class="lg:col-span-1 glass-panel rounded-2xl p-6 shadow-xl h-fit">
                            <h3 class="font-bold text-white mb-6 flex items-center gap-2">
                                <i class="fas fa-pen-nib text-orange-500"></i> 撰写公告
                            </h3>
                            <textarea id="noticeContent" placeholder="在此输入公告内容..." class="w-full input-dark rounded-xl p-4 h-48 resize-none mb-4 text-sm"></textarea>
                            <div class="flex items-center justify-between mb-6">
                                <label class="flex items-center gap-2 cursor-pointer group">
                                    <div class="relative">
                                        <input type="checkbox" id="isImportant" class="peer sr-only">
                                        <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                                    </div>
                                    <span class="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">高亮通知</span>
                                </label>
                            </div>
                            <button onclick="addNotice()" class="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-900/20 transition-all">
                                发布公告
                            </button>
                        </div>

                        <!-- 右侧列表 -->
                        <div class="lg:col-span-2 glass-panel rounded-2xl overflow-hidden shadow-xl flex flex-col h-[600px]">
                            <div class="px-6 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center flex-shrink-0">
                                <h3 class="font-bold text-white">历史公告</h3>
                                <button onclick="loadNotices()" class="text-xs text-gray-400 hover:text-white"><i class="fas fa-sync-alt"></i></button>
                            </div>
                            <div class="overflow-y-auto flex-1 p-0">
                                <table class="w-full text-left" id="noticeTable">
                                    <tbody class="divide-y divide-white/5 text-gray-300 text-sm"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    </div>

    <!-- JS 逻辑部分 (MySQL适配版) -->
    <script>
        let TOKEN = '';

        async function doLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('pwd').value;
            const btn = event.target;
            const originalText = btn.innerText;
            
            btn.innerText = '验证中...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, password}) });
                const d = await res.json();
                if(d.success && d.data.user.role === 'admin') {
                    TOKEN = d.data.token;
                    
                    // 转场动画
                    const login = document.getElementById('loginSection');
                    login.style.opacity = '0';
                    login.style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        login.style.display='none';
                        document.getElementById('mainSection').classList.remove('hidden');
                        loadUsers();
                    }, 500);
                } else { 
                    alert('账号或密码错误'); 
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            } catch(e) { 
                alert('连接服务器失败'); 
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }

        function switchTab(name) {
            document.querySelectorAll('.section').forEach(el => {
                el.classList.add('hidden');
                el.classList.remove('fade-in');
            });
            const target = document.getElementById(name);
            target.classList.remove('hidden');
            void target.offsetWidth; // trigger reflow
            target.classList.add('fade-in');

            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.getElementById('btn-' + name).classList.add('active');

            const titles = {'users': '用户管理', 'inspirations': '灵感创意库', 'notices': '系统公告中心'};
            document.getElementById('pageTitle').innerText = titles[name];

            if(name === 'users') loadUsers();
            if(name === 'inspirations') loadInspirations();
            if(name === 'notices') loadNotices();
        }

        // --- 1. 用户逻辑 (MySQL) ---
        async function loadUsers() {
            const res = await fetch('/api/admin/users', { headers:{'Authorization':'Bearer '+TOKEN} });
            const d = await res.json();
            const tbody = document.querySelector('#userTable tbody');
            if(d.data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">暂无用户</td></tr>'; return; }
            
            tbody.innerHTML = d.data.map(u => \`
                <tr class="hover:bg-white/5 transition-colors group">
                    <td class="px-6 py-4 font-mono text-gray-500 text-xs">\${u.id}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow">
                                \${u.username.substring(0,1).toUpperCase()}
                            </div>
                            <div>
                                <div class="font-bold text-white">\${u.username}</div>
                                <div class="text-xs text-gray-500">\${u.email}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                            \${u.drawing_points} pts
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="changePoints(\${u.id})" class="text-gray-400 hover:text-white text-xs border border-gray-600 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-all hover:shadow">
                            <i class="fas fa-coins mr-1"></i> 管理
                        </button>
                    </td>
                </tr>
            \`).join('');
        }
        async function changePoints(id) {
            const p = prompt('请输入变动积分数 (正数充值，负数扣除):');
            if(p && !isNaN(p)) { await fetch('/api/admin/users/points', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN}, body:JSON.stringify({userId:id, points:parseInt(p)}) }); loadUsers(); }
        }

        // --- 2. 灵感逻辑 (MySQL) ---
        async function loadInspirations() {
            const res = await fetch('/api/admin/inspirations', { headers:{'Authorization':'Bearer '+TOKEN} });
            const d = await res.json();
            const list = document.getElementById('insList');
            if(d.data.length === 0) list.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">暂无灵感数据</div>';
            else {
                list.innerHTML = d.data.map(i => \`
                    <div class="group relative glass-panel rounded-xl overflow-hidden hover:border-purple-500/50 transition-all duration-300">
                        <div class="aspect-square relative overflow-hidden bg-gray-900">
                            <img src="\${i.url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-sm">
                                <button onclick="delIns(\${i.id})" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                                    <i class="fas fa-trash-alt mr-1"></i> 删除
                                </button>
                            </div>
                        </div>
                        <div class="p-3 border-t border-white/5 bg-white/5">
                            <p class="text-[10px] text-gray-400 mb-1">ID: \${i.id}</p>
                            <p class="text-xs text-gray-200 line-clamp-2 leading-relaxed" title="\${i.prompt}">\${i.prompt || '<span class="italic text-gray-600">No Prompt</span>'}</p>
                        </div>
                    </div>
                \`).join('');
            }
        }
        async function addInspiration() {
            const url = document.getElementById('insUrl').value.trim();
            const prompt = document.getElementById('insPrompt').value.trim();
            if(!url) return alert('图片链接不能为空');
            const res = await fetch('/api/admin/inspirations', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN}, body:JSON.stringify({url, prompt}) });
            if(res.ok) { document.getElementById('insUrl').value=''; document.getElementById('insPrompt').value=''; loadInspirations(); }
        }
        async function delIns(id) { if(confirm('确定删除此灵感？')) { await fetch('/api/admin/inspirations/'+id, { method:'DELETE', headers:{'Authorization':'Bearer '+TOKEN} }); loadInspirations(); } }

        // --- 3. 公告逻辑 (MySQL) ---
        async function loadNotices() {
            const res = await fetch('/api/admin/announcements', { headers:{'Authorization':'Bearer '+TOKEN} });
            const d = await res.json();
            const tbody = document.querySelector('#noticeTable tbody');
            if(d.data.length === 0) { tbody.innerHTML = '<tr><td colspan="3" class="text-center py-10 text-gray-500">暂无公告</td></tr>'; return; }

            tbody.innerHTML = d.data.map(n => \`
                <tr class="hover:bg-white/5 transition-colors group">
                    <td class="px-6 py-4 align-top">
                        <div class="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed \${n.is_important?'text-orange-300 font-medium':''} ">\${n.is_important ? '<i class="fas fa-fire text-orange-500 mr-2"></i>' : ''}\${n.content}</div>
                    </td>
                    <td class="px-6 py-4 text-gray-500 text-xs whitespace-nowrap align-top font-mono">
                        \${new Date(n.created_at).toLocaleString()}
                    </td>
                    <td class="px-6 py-4 text-right align-top">
                        <button onclick="delNotice(\${n.id})" class="text-gray-600 hover:text-red-400 transition-colors w-8 h-8 rounded flex items-center justify-center ml-auto">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            \`).join('');
        }
        async function addNotice() {
            const content = document.getElementById('noticeContent').value.trim();
            const isImportant = document.getElementById('isImportant').checked;
            if(!content) return alert('请输入内容');
            const res = await fetch('/api/admin/announcements', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN}, body: JSON.stringify({ content, isImportant }) });
            if(res.ok) { document.getElementById('noticeContent').value=''; loadNotices(); }
        }
        async function delNotice(id) { if(confirm('删除此公告？')) { await fetch('/api/admin/announcements/'+id, { method:'DELETE', headers:{'Authorization':'Bearer '+TOKEN} }); loadNotices(); } }

    </script>
</body>
</html>
    `;
    res.send(html);
});

// ================= API 接口 (MySQL 稳定版) =================

const authenticateToken = (req, res, next) => {
    const t = req.headers['authorization']?.split(' ')[1];
    if(!t) return res.sendStatus(401);
    jwt.verify(t, process.env.JWT_SECRET, (err, user) => { if(err) return res.sendStatus(403); req.user = user; next(); });
};
const requireAdmin = (req, res, next) => { if(req.user?.role === 'admin') next(); else res.status(403).json({error:'Admin only'}); };

// User APIs
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try { const [rows] = await pool.execute('SELECT id, username, email, role, drawing_points FROM users ORDER BY id DESC'); res.json({success:true, data:rows}); } catch(e){res.status(500).json({});}
});
router.post('/users/points', authenticateToken, requireAdmin, async (req, res) => {
    try { await pool.execute('UPDATE users SET drawing_points = drawing_points + ? WHERE id = ?', [req.body.points, req.body.userId]); res.json({success:true}); } catch(e){res.status(500).json({});}
});

// Inspiration APIs
router.get('/inspirations', authenticateToken, requireAdmin, async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM inspirations ORDER BY id DESC'); res.json({success:true, data:rows}); } catch(e){res.status(500).json({});}
});
router.post('/inspirations', authenticateToken, requireAdmin, async (req, res) => {
    try { await pool.execute('INSERT INTO inspirations (url, prompt) VALUES (?, ?)', [req.body.url, req.body.prompt]); res.json({success:true}); } catch(e){res.status(500).json({});}
});
router.delete('/inspirations/:id', authenticateToken, requireAdmin, async (req, res) => {
    try { await pool.execute('DELETE FROM inspirations WHERE id = ?', [req.params.id]); res.json({success:true}); } catch(e){res.status(500).json({});}
});

// Announcement APIs
router.get('/announcements', authenticateToken, requireAdmin, async (req, res) => {
    try { const [rows] = await pool.execute('SELECT * FROM announcements ORDER BY id DESC'); res.json({success:true, data:rows}); } catch(e){res.status(500).json({});}
});
router.post('/announcements', authenticateToken, requireAdmin, async (req, res) => {
    try { 
        const isImp = req.body.isImportant ? 1 : 0;
        await pool.execute('INSERT INTO announcements (content, is_important) VALUES (?, ?)', [req.body.content, isImp]); 
        res.json({success:true}); 
    } catch(e){res.status(500).json({});}
});
router.delete('/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
    try { await pool.execute('DELETE FROM announcements WHERE id = ?', [req.params.id]); res.json({success:true}); } catch(e){res.status(500).json({});}
});

module.exports = router;