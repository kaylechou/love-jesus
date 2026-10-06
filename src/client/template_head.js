
function renderHTML(results, categories, opts) {
    var isShareMode = opts.shareMode, isAdmin = opts.isAdmin, adminAuthed = !!opts.adminAuthed, notice = opts.notice || "";
    var notice_en = opts.notice_en || "", notice_ja = opts.notice_ja || "", notice_ko = opts.notice_ko || "";
  // 把服务端已过滤好的展示数据直接灌给前端（分享模式只含被分享的那一课），顺带防 </script> 注入
  // 学员端主页只注入精简字段（提速约一半），点开课件时再按需拉完整内容；管理端/分享页保持完整
  const bootList = (!isShareMode && !isAdmin) ? (results || []).map(briefCourse) : (results || []);
  const bootJson = JSON.stringify(bootList).replace(/</g, function(){ return String.fromCharCode(92) + 'u003c'; });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#1e3a5f">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="团契智学">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
    <link rel="apple-touch-icon" href="/icon-180.png">
    <title>团契智学${isAdmin ? ' · 教师管理' : '系统'}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
    <style>
        body.preview-mode .admin-only { display: none !important; }
        .quiz-card { border: 2px solid #f1f5f9; border-radius: 1.5rem; padding: 1.5rem; background: white; margin-bottom: 1.5rem; transition: all 0.3s ease; }
        .correct-ans { border-color: #10b981 !important; background-color: #f0fdf4; }
        .wrong-ans { border-color: #ef4444 !important; background-color: #fef2f2; }
        .course-card { animation: fadeUp .4s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .ask-flash { animation: askFlash 1.1s ease 2; border-color: #f59e0b !important; }
        .open-ans { border-color: #f59e0b !important; background-color: #fffbeb; }
        @keyframes askFlash { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } 50% { box-shadow: 0 0 0 5px rgba(245,158,11,.55); } }
        .section-head { display:flex; align-items:center; gap:.6rem; margin:2rem 0 1rem; }
        .section-head .bar { width:.35rem; height:1.4rem; border-radius:9999px; background:linear-gradient(to bottom,#8b5cf6,#6366f1); }
        /* 课件模式（jyzl1 式） */
        .blank-input { border-bottom: 2px solid #3b82f6; text-align: center; color: #2563eb; font-weight: bold; background: transparent; outline: none; padding: 0 5px; transition: all 0.3s; font-size: inherit; }
        .blank-input:focus { border-bottom-color: #1d4ed8; background: #eff6ff; }
        .answer-text { display: none; color: #059669; font-weight: bold; border-bottom: 2px solid #059669; padding: 0 5px; }
        .show-answers .answer-text { display: inline; }
        .show-answers .blank-input { display: none; }
        #studySubmit:disabled { background-color: #cbd5e1 !important; cursor: not-allowed; transform: none !important; }
        .sopt { display: inline-flex; align-items: center; border: 2px solid #e2e8f0; border-radius: 12px; padding: 8px 18px; cursor: pointer; font-size: .95rem; color: #334155; transition: all .2s; background: #fff; }
        /* 字号调节浮钮（全站可见，含分享页） */
        #fontFab { position: fixed; right: 0.5rem; bottom: 5rem; z-index: 100; display: flex; flex-direction: column; align-items: center; gap: .5rem; }
        #fontFabBtn { height: 3rem; padding: 0 1.1rem; border-radius: 9999px; background: linear-gradient(135deg,#8b5cf6,#6366f1); color: #fff; font-weight: 900; font-size: 1rem; box-shadow: 0 6px 20px rgba(124,93,250,.45); border: 2px solid #fff; cursor: pointer; line-height: 1; }
        #fontFabBtn:active { transform: scale(.94); }
        #videoToggleBtn { width: 2.6rem; height: 2.6rem; border-radius: 9999px; background: linear-gradient(135deg,#f59e0b,#ef4444); color: #fff; font-size: 1.1rem; box-shadow: 0 6px 20px rgba(245,158,11,.45); border: 2px solid #fff; cursor: pointer; line-height: 1; opacity: .55; transition: opacity .25s; display: flex; align-items: center; justify-content: center; }
        #videoToggleBtn:hover { opacity: 1; }
        #videoToggleBtn:active { transform: scale(.94); }
        #netEnvModal .netenv-opt { border-color: #e2e8f0; background: #f8fafc; }
        #netEnvModal .netenv-opt:hover { border-color: #a5b4fc; background: #eef2ff; }
        #netEnvModal .netenv-opt.netenv-cur { border-color: #6366f1; background: #eef2ff; box-shadow: 0 0 0 2px rgba(99,102,241,.25); }
        #fontFabBtn { opacity: .55; transition: opacity .25s; }
        #fontFab.open #fontFabBtn, #fontFabBtn:hover { opacity: 1; }
        #viewModeFab { position: fixed; left: 0.5rem; bottom: 5rem; z-index: 100; }
        #viewModeBtn { height: 3rem; min-width: 3rem; padding: 0 .9rem; border-radius: 9999px; background: linear-gradient(135deg,#0ea5e9,#6366f1); color: #fff; font-weight: 900; font-size: 1rem; box-shadow: 0 6px 20px rgba(14,165,233,.45); border: 2px solid #fff; cursor: pointer; line-height: 1; opacity: .55; transition: opacity .25s; }
        #viewModeBtn:hover { opacity: 1; }
        html.view-desktop .course-cards { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        #viewModeBtn:active { transform: scale(.94); }
        #fontPanel .font-reset-btn { height: 1.7rem; font-size: .7rem; font-weight: 700; background: #fff; color: #94a3b8; }
        #fontPanel { background: #fff; border-radius: 1rem; box-shadow: 0 10px 30px rgba(0,0,0,.18); border: 1px solid #ede9fe; padding: .55rem; display: flex; flex-direction: column; gap: .35rem; align-items: center; }
        #fontPanel button { width: 2.6rem; height: 2.2rem; border-radius: .6rem; background: #f5f3ff; color: #6d28d9; font-weight: 900; cursor: pointer; border: 1px solid #ede9fe; }
        #fontPanel button:active { transform: scale(.94); }
        #fontPanel.hidden { display: none; } /* ID 选择器优先级高于 .hidden，必须显式覆盖才能真正隐藏 */
        .sopt:has(input:checked) { border-color: #3b82f6; background: #eff6ff; color: #1d4ed8; font-weight: bold; }
        .sopt.sopt-ok { border-color: #10b981 !important; background: #ecfdf5 !important; color: #047857 !important; font-weight: bold; }
        .sopt-wrong { border-color: #f43f5e !important; background: #ffe4e6 !important; color: #9f1239 !important; font-weight: bold; }
        /* 分 Tab 互动课件导航（参考互动课件 UI） */
        .qtab-btn { white-space: nowrap; font-size: .8rem; padding: .55rem .85rem; border-radius: .7rem .7rem 0 0; color: #cbd5e1; border-bottom: 2px solid transparent; transition: all .2s; }
        .qtab-btn:hover { color: #fff; background: rgba(255,255,255,.06); }
        .qtab-btn.qtab-active { color: #fff; border-bottom-color: #60a5fa; background: rgba(255,255,255,.08); font-weight: 700; }
        .qtab-count { font-size: .65rem; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); color: #e0e7ff; padding: .05rem .45rem; border-radius: 9999px; margin-left: .3rem; }
        .qtab-report { color: #fcd34d; font-weight: 700; }
        .qtab-report.qtab-active { color: #fde68a; border-bottom-color: #fbbf24; }
        /* 经文高亮：引用徽章（紫）与经文正文（琥珀）作区分 */
        .verse-ref { display: inline-block; background: linear-gradient(135deg,#4f46e5,#7c3aed); color: #fff; font-weight: 700; font-size: .72rem; padding: .12rem .6rem; border-radius: 9999px; white-space: nowrap; vertical-align: .05em; box-shadow: 0 1px 4px rgba(124,58,237,.35); }
        .verse-ref-book { display: inline-block; background: linear-gradient(135deg,#4f46e5,#7c3aed); color: #fff; font-weight: 700; font-size: .72rem; padding: .12rem .6rem; border-radius: 9999px; white-space: nowrap; vertical-align: .05em; box-shadow: 0 1px 4px rgba(124,58,237,.35); }
        .verse-ref-icon { display: inline-block; background: linear-gradient(135deg,#f59e0b,#d97706); color: #fff; font-weight: 700; font-size: .72rem; padding: .12rem .5rem; border-radius: 9999px; white-space: nowrap; vertical-align: .05em; box-shadow: 0 1px 4px rgba(217,119,6,.35); margin-right: .3rem; }
        .verse-ref-num { display: inline-block; background: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: .72rem; padding: .12rem .6rem; border-radius: 9999px; white-space: nowrap; vertical-align: .05em; border: 1.5px solid #60a5fa; margin-left: .3rem; }
        .verse-text { background: #fef3c7; color: #92400e; font-weight: 700; border-radius: .2rem; padding: 0 .25rem; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
    </style>
</head>
<body class="bg-[#f6f7fb] min-h-screen text-slate-900 pb-20">
    <script>window.__BOOT__ = { shareMode: ${isShareMode}, isAdmin: ${isAdmin}, adminAuthed: ${adminAuthed}, list: ${bootJson} };</script>

    <!-- 顶栏 -->
    <header class="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-slate-100">
        <div class="max-w-7xl mx-auto px-5 py-3 flex justify-between items-center">
            <div class="flex items-center gap-2.5 cursor-pointer" onclick="location.href=location.origin">
                <div class="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-md shadow-violet-200">📖</div>
                <span class="font-black text-lg tracking-tight" data-i18n="appName">团契智学</span>
                ${isAdmin ? '<span class="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">教师管理</span>' : ''}
            </div>
            <div class="flex gap-2">
                ${isAdmin
                    ? '<button onclick="togglePreview()" id="previewBtn" class="text-xs bg-slate-100 px-3.5 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition">👁️ 学员预览</button>'
                      + '<button onclick="exportSelected()" class="admin-only text-xs bg-emerald-600 text-white px-3.5 py-2 rounded-xl font-bold shadow-md shadow-emerald-200 hover:opacity-95 transition">📥 批量导出</button>'
                      + '<button onclick="openEditModal()" class="admin-only text-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3.5 py-2 rounded-xl font-bold shadow-md shadow-violet-200 hover:opacity-95 transition">+ 创建新课件</button>'
                    : '<button onclick="openLangPanel()" id="langBtn" class="text-xs bg-slate-100 px-3.5 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition">🌐 简体</button>'
                      + '<button onclick="openWrongBook()" data-i18n="wrongBook" class="text-xs bg-slate-100 px-3.5 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition">📝 错题本</button>'
                      + '<button onclick="nameBtnClick()" id="nameBtn" class="text-xs bg-slate-100 px-3.5 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition">设置姓名</button>'}
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-5 pt-8">
        <!-- 标题区 -->
        <h1 class="text-[2rem] leading-tight font-black tracking-tight" data-i18n="myCourses">我的课程</h1>
        <p class="text-slate-400 mt-1 mb-6" data-i18n="heroSub">系统学习，稳步成长</p>

        ${(!isAdmin && notice) ? '<div class="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800 flex gap-3"><span class="text-lg">📢</span><span id="noticeBarText" data-notice-en="' + notice_en.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '" data-notice-ja="' + notice_ja.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '" data-notice-ko="' + notice_ko.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '">' + notice.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>' : ''}

        ${!isAdmin ? `
        <!-- 统计卡片 -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-violet-50 rounded-3xl p-5 flex items-center gap-4">
                <div class="w-14 h-14 shrink-0 rounded-2xl bg-violet-500 flex items-center justify-center text-white text-2xl shadow-sm">📖</div>
                <div>
                    <div id="statTotal" class="text-3xl font-black text-violet-600 leading-none">–</div>
                    <div class="text-xs text-slate-500 mt-1.5" data-i18n="statAll">全部课程</div>
                </div>
            </div>
            <div class="bg-emerald-50 rounded-3xl p-5 flex items-center gap-4">
                <div class="w-14 h-14 shrink-0 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-2xl shadow-sm">✓</div>
                <div>
                    <div id="statDone" class="text-3xl font-black text-emerald-600 leading-none">0</div>
                    <div class="text-xs text-slate-500 mt-1.5" data-i18n="statDone">已完成</div>
                </div>
            </div>
            <div class="bg-amber-50 rounded-3xl p-5 flex items-center gap-4">
                <div class="w-14 h-14 shrink-0 rounded-2xl bg-amber-500 flex items-center justify-center text-white text-2xl shadow-sm">◷</div>
                <div>
                    <div id="statDoing" class="text-3xl font-black text-amber-600 leading-none">0</div>
                    <div class="text-xs text-slate-500 mt-1.5" data-i18n="statDoing">进行中</div>
                </div>
            </div>
            <div class="bg-rose-50 rounded-3xl p-5 flex items-center gap-4">
                <div class="w-14 h-14 shrink-0 rounded-2xl bg-rose-500 flex items-center justify-center text-white text-2xl shadow-sm">★</div>
                <div>
                    <div id="statAvg" class="text-3xl font-black text-rose-500 leading-none">--</div>
                    <div class="text-xs text-slate-500 mt-1.5" data-i18n="statAvg">平均分</div>
                </div>
            </div>
        </div>

        <!-- 我的成绩 -->
        <div id="myScoresCard" class="hidden bg-white rounded-3xl p-6 shadow-sm mb-6">
            <h3 class="font-bold text-slate-800 mb-3" data-i18n="myScores">📊 我的成绩</h3>
            <div id="myScoresAvg" class="text-xs text-slate-400 mb-2"></div>
            <ul id="myScoresList" class="space-y-2 max-h-64 overflow-y-auto"></ul>
        </div>
        ` : ''}

        ${isAdmin ? `
        <!-- 按姓名查成绩 -->
        <div class="admin-only bg-white rounded-3xl p-6 shadow-sm mb-6">
            <h3 class="font-bold text-slate-800 mb-4">🔍 按姓名查成绩</h3>
            <div class="flex gap-2">
                <input id="scoreQueryName" placeholder="输入学员姓名" class="flex-1 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400">
                <button onclick="queryScores()" class="bg-indigo-900 text-white px-6 rounded-2xl text-sm font-bold">查询</button>
            </div>
            <div class="flex gap-2 mt-2">
                <select id="studentSelect" onchange="pickStudent(this.value)" class="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 bg-white text-slate-600">
                    <option value="">📋 学员名单加载中…</option>
                </select>
                <button onclick="loadStudents()" class="border border-slate-200 px-4 rounded-2xl text-sm text-slate-500 shrink-0">刷新</button>
            </div>
            <div id="scoreSummary" class="hidden text-xs text-slate-400 mt-3"></div>
            <ul id="scoreList" class="space-y-3 mt-3"></ul>
            <div id="scoreEmpty" class="hidden text-slate-400 text-sm mt-3">暂无该学员的成绩记录</div>
            <button id="delAllScoresBtn" onclick="deleteAllScores()" class="hidden mt-3 text-xs font-bold text-red-500 border border-red-200 rounded-2xl px-4 py-2">🗑 删除该学员全部成绩</button>
            <button id="viewAllWrongsBtn" onclick="adminViewAllWrongs()" class="hidden mt-3 ml-2 text-xs font-bold text-violet-600 border border-violet-200 rounded-2xl px-4 py-2">📝 查看该学员错题</button>
        </div>

        <!-- 学员管理员 -->
        <div class="admin-only bg-white rounded-3xl p-6 shadow-sm mb-6">
            <h3 class="font-bold text-slate-800 mb-2">👑 学员管理员</h3>
            <p class="text-xs text-slate-400 mb-3">设为管理员的学员，在学员端打开课件可直接查看答案（无需答题），按钮在课件顶部右侧。</p>
            <ul id="adminStudentList" class="space-y-2"><li class="text-sm text-slate-400">加载中…</li></ul>
        </div>

        <!-- 数据管理 -->
        <div class="admin-only bg-white rounded-3xl p-6 shadow-sm mb-6">
            <h3 class="font-bold text-slate-800 mb-4">🗂️ 数据管理</h3>
            <div class="flex flex-wrap gap-2">
                <button onclick="openImportModal()" class="text-xs bg-violet-100 text-violet-700 px-4 py-2.5 rounded-xl font-bold hover:bg-violet-200 transition">📥 批量导入课程</button>
                <button onclick="exportCSV()" class="text-xs bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-200 transition">📤 导出成绩 CSV</button>
                <button onclick="openPwModal()" class="text-xs bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl font-bold hover:bg-amber-200 transition">🔑 修改管理密码</button>
                <button onclick="adminLogout()" class="text-xs bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition">🚪 退出登录</button>
            </div>
        </div>

        <!-- 公告设置 -->
        <div class="admin-only bg-white rounded-3xl p-6 shadow-sm mb-6">
            <h3 class="font-bold text-slate-800 mb-4">📢 首页公告</h3>
            <div class="flex gap-2">
                <input id="noticeText" placeholder="公告内容（学员端首页顶部显示，留空则不显示）" class="flex-1 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400">
                <button onclick="saveNotice()" class="bg-indigo-900 text-white px-6 rounded-2xl text-sm font-bold">保存</button>
            </div>
        </div>

        <!-- 系列与子栏目管理 -->
        <div class="admin-only bg-white rounded-3xl p-6 shadow-sm mb-6">
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-slate-800">📚 系列与子栏目</h3>
                <button onclick="openCatModal('', '')" class="text-xs bg-violet-100 text-violet-700 px-4 py-2 rounded-xl font-bold hover:bg-violet-200 transition">＋ 新增系列</button>
            </div>
            <p class="text-xs text-slate-400 mb-4">给系列（如"基要真理"）和子栏目写简介，会显示在学员端对应标题下方；新增/编辑课程时直接选择即可，无需重复填写。</p>
            <div id="catList" class="space-y-3"><div class="text-sm text-slate-400">加载中…</div></div>
        </div>

        <!-- 系列/子栏目编辑弹窗 -->
        <div id="catModal" class="hidden fixed inset-0 bg-slate-900/95 z-[75] flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
                <button onclick="toggleModal('catModal')" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full text-lg">✕</button>
                <h2 class="font-black text-lg mb-5 pr-8" id="catModalTitle">＋ 新增系列</h2>
                <input id="cat_parent" type="hidden">
                <input id="cat_old" type="hidden">
                <input id="cat_name" placeholder="名称" class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 mb-3">
                <div id="cat_ab_wrap" class="hidden mb-3">
                    <label class="text-xs font-bold text-slate-500 mb-1 block">A（实心徽章）</label>
                    <input id="cat_name_a" placeholder="如：新约" class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 mb-2">
                    <label class="text-xs font-bold text-slate-500 mb-1 block">B（描边徽章）</label>
                    <input id="cat_name_b" placeholder="如：保罗书信" class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400">
                </div>
                <textarea id="cat_desc" placeholder="简介（学员端可见，可空）" class="w-full h-32 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 mb-5"></textarea>
                <div class="flex gap-3">
                    <button onclick="saveCat()" class="flex-1 bg-indigo-900 text-white py-3 rounded-2xl font-bold">保存</button>
                    <button onclick="toggleModal('catModal')" class="bg-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold">取消</button>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- 搜索框 -->
        <div class="relative mb-8">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">⌕</span>
            <input id="searchInput" oninput="debouncedFilter()" data-i18n-ph="searchPh" placeholder="搜索课程..."
                class="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition placeholder:text-slate-400">
        </div>

        <!-- 课程分区（JS 按栏目渲染） -->
        <div id="courseSections"></div>
        <div id="loadingState" class="text-center text-slate-400 py-16 text-sm">课程加载中…</div>
        <div id="emptyState" class="hidden text-center text-slate-400 py-16 text-sm" data-i18n="emptyResult">没有找到匹配的课程</div>
    </main>
    ${!isAdmin ? '<footer class="max-w-7xl mx-auto px-5 mt-6 text-center"><a href="/admin" data-i18n="adminEntry" class="text-xs text-slate-300 hover:text-violet-500 transition">教师管理入口 →</a></footer>' : ''}

    <!-- 答题 / 学习弹窗 -->
    <div id="lessonModal" class="hidden fixed inset-0 bg-white z-[80] overflow-y-auto">
        <div class="w-full max-w-7xl mx-auto px-3 md:px-6 py-6 pb-32">
            <div id="lessonHeader"></div>
            <div id="studyProg" class="hidden mt-4 text-sm font-bold text-violet-600"></div>
            <div id="lessonBody" class="mt-10 space-y-4"></div>
            <div id="lessonFooter" class="mt-12 pt-10 border-t">
                <div id="resultArea" class="hidden mt-8 space-y-4"></div>
                <button id="backListBtn" onclick="location.reload()" data-i18n="backList" class="mt-10 w-full text-slate-400 text-sm hover:underline">返回列表</button>
            </div>
        </div>
    </div>

    ${!isAdmin ? `
    <!-- 错题本弹窗 -->
    <div id="wrongBookModal" class="hidden fixed inset-0 bg-slate-900/60 z-[90] flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div class="p-6 border-b flex items-center justify-between">
                <h2 id="wrongBookTitle" class="font-black text-lg" data-i18n="wbMyT">📝 我的错题本</h2>
                <div class="flex gap-2">
                    <button onclick="openWrongExportMenu()" data-i18n="exportBtn" class="text-xs bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold">📥 导出</button>
                    <button onclick="clearWrongBook()" data-i18n="clearBtn" class="text-xs bg-red-50 text-red-500 px-4 py-2 rounded-xl font-bold">清空</button>
                    <button onclick="toggleModal('wrongBookModal')" class="text-xs bg-slate-100 text-slate-500 px-4 py-2 rounded-xl font-bold">关闭</button>
                </div>
            </div>
            <div id="wrongBookList" class="p-6 overflow-y-auto space-y-4"></div>
        </div>
    </div>
    ` : ''}

    ${isAdmin ? `
    <!-- 编辑弹窗 -->
    <div id="editModal" class="hidden fixed inset-0 bg-slate-900/95 z-[70] flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-7xl h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative">
            <button onclick="toggleModal('editModal')" class="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full text-xl bg-white/80">✕</button>
            <div class="md:hidden flex bg-slate-100 m-3 mb-0 rounded-xl p-1 text-sm font-bold shrink-0">
                <button type="button" id="emTabInfo" onclick="switchEmTab('info')" class="flex-1 py-2 rounded-lg bg-white shadow">📝 基本信息</button>
                <button type="button" id="emTabQuiz" onclick="switchEmTab('quiz')" class="flex-1 py-2 rounded-lg">🧩 题目编辑</button>
            </div>
            <div id="emPaneInfo" class="w-full md:w-1/3 p-6 border-r overflow-y-auto space-y-4 bg-slate-50">
                <h2 class="font-black text-indigo-900 text-xs">内容录入</h2>
                <textarea id="importText" class="w-full h-40 border p-3 rounded-xl text-xs" placeholder="粘贴题目...（## 开头表示章节名；填空题含 ____ 会自动识别为填空）"></textarea>
                <button onclick="smartParse()" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm">✨ 智能解析</button>
                <hr>
                <input id="f_id" type="hidden">
                <select id="f_series" onchange="onSeriesChange()" class="w-full border p-3 rounded-xl text-sm bg-white" title="所属系列"></select>
                <input id="f_series_new" placeholder="新系列名称" class="w-full border p-3 rounded-xl text-sm hidden">
                <select id="f_sub" class="w-full border p-3 rounded-xl text-sm bg-white" title="所属子栏目"></select>
                <input id="f_sub_new" placeholder="新子栏目名称" class="w-full border p-3 rounded-xl text-sm hidden">
                <input id="f_title" placeholder="课件标题" class="w-full border p-3 rounded-xl font-bold">
                <textarea id="f_content" placeholder="导读内容..." class="w-full h-32 border p-3 rounded-xl text-sm"></textarea>
                <div class="border border-indigo-100 rounded-xl p-3 bg-indigo-50/50">
                    <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <h3 class="text-xs font-black text-indigo-900">🗺️ 课程导览（思维导图式）</h3>
                        <div class="flex items-center gap-2">
                            <div class="flex bg-white rounded-lg p-0.5 text-[11px] font-bold border border-indigo-100">
                                <button type="button" id="gModeVisual" class="px-2.5 py-1 rounded-md">🧩 可视化</button>
                                <button type="button" id="gModeJson" class="px-2.5 py-1 rounded-md">📝 JSON</button>
                            </div>
                            <button type="button" id="guideAddCh" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold">+ 添加章节</button>
                        </div>
                    </div>
                    <div id="guideEditor" class="space-y-3"></div>
                    <textarea id="guideJson" spellcheck="false" class="hidden w-full h-48 border p-3 rounded-xl text-xs font-mono bg-white" placeholder='[{"title":"1. 章节名","points":["要点一","要点二"]}]'></textarea>
                    <p class="text-[11px] text-slate-400 mt-2">分章节一条条加小结，学员端"课程导读"页会渲染成章节卡片。</p>
                </div>
                <textarea id="f_instructions" placeholder="答题说明（留空则自动生成）..." class="w-full h-20 border p-3 rounded-xl text-sm"></textarea>
                <textarea id="f_video" rows="3" placeholder="视频链接（可选，一行一个；格式：名称|链接，如：&#10;YouTube|https://youtu.be/xxx&#10;企业微盘|https://drive.weixin.qq.com/...&#10;只写链接也行，会自动识别网站名）" class="w-full border p-3 rounded-xl text-sm"></textarea>
            </div>
            <div id="emPaneQuiz" class="flex-1 p-6 hidden md:flex flex-col overflow-hidden">
                <div class="flex items-center gap-2 mb-3 flex-wrap">
                    <div class="flex bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
                        <button type="button" id="qModeVisual" class="px-3 py-1.5 rounded-md">🧩 可视化</button>
                        <button type="button" id="qModeJson" class="px-3 py-1.5 rounded-md">📝 JSON 代码</button>
                    </div>
                    <button type="button" id="qJsonFormat" class="hidden text-xs text-indigo-600 font-bold">✨ 格式化</button>
                    <span class="text-[11px] text-slate-400">JSON 数组，每题含 type/s/q/o/a</span>
                </div>
                <div id="quizList" class="flex-1 overflow-y-auto space-y-4 pr-2"></div>
                <textarea id="quizJson" spellcheck="false" class="hidden flex-1 w-full border p-3 rounded-xl text-xs font-mono overflow-y-auto" placeholder='[{"type":"single","s":"第一章","q":"题干","o":"A.xxx, B.xxx","a":"A"}]'></textarea>
                <div class="mt-4 pt-4 border-t flex gap-3">
                    <button onclick="saveAll()" class="flex-1 bg-indigo-900 text-white px-10 py-3 rounded-xl font-bold">发布</button>
                    <button onclick="toggleModal('editModal')" class="bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold">取消</button>
                </div>
            </div>
        </div>
    </div>

    <!-- 批量导入弹窗 -->
    <div id="importModal" class="hidden fixed inset-0 bg-slate-900/95 z-[75] flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div class="p-6 border-b">
                <h2 class="font-black text-lg">📥 批量导入课程</h2>
                <p class="text-xs text-slate-400 mt-1">粘贴 JSON（可一次导入多门课程）。type 可选 single / multiple / fill / judge / essay / verse（经文框，o 填框标题）；s 为章节名（有章节时自动分组显示）；填空用 ____ 占位（下划线越多空格越宽）；填空多空格答案用 | 或 ； 分空按顺序对应，每空内多个可接受答案用 / 或"或"分隔（如 失败/软弱；互动关系，答"失败"或"软弱"都对）；category 为系列名，subcategory 为子栏目名（可空）</p>
            </div>
            <div class="p-6 flex-1 overflow-y-auto">
                <textarea id="importJson" class="w-full h-64 border p-3 rounded-xl text-xs font-mono" placeholder='{"courses":[{"category":"基要真理","subcategory":"第一部分","title":"第一课","content":"导读…","video_url":"","guide":[{"title":"1. 章节名","points":["要点一","要点二"]}],"instructions":"自定义答题说明（可空）","quizzes":[{"type":"fill","s":"第一章 信仰的本质","q":"人是按____所造的","a":"神的形象"}]}]}'></textarea>
            </div>
            <div class="p-6 border-t flex gap-3">
                <button onclick="doImport()" class="flex-1 bg-violet-600 text-white py-3 rounded-xl font-bold">开始导入</button>
                <button onclick="toggleModal('importModal')" class="bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold">取消</button>
            </div>
        </div>
    </div>

    <!-- 修改密码弹窗 -->
    <div id="pwModal" class="hidden fixed inset-0 bg-slate-900/95 z-[75] flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl">
            <h2 class="font-black text-lg mb-5">🔑 修改管理密码</h2>
            <input id="pw_old" type="password" placeholder="原密码" class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 mb-3">
            <input id="pw_new" type="password" placeholder="新密码（至少 6 位）" class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 mb-5">
            <div class="flex gap-3">
                <button onclick="doChangePassword()" class="flex-1 bg-indigo-900 text-white py-3 rounded-2xl font-bold">确认修改</button>
                <button onclick="toggleModal('pwModal')" class="bg-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold">取消</button>
            </div>
            <div class="mt-5 pt-5 border-t border-slate-100 text-left">
                <h3 class="font-bold text-sm text-slate-700 mb-1">🆘 密码恢复码</h3>
                <p class="text-xs text-slate-400 mb-3">忘记管理密码时，凭恢复码重设。请记在可靠的地方，不要告诉他人。</p>
                <div class="flex gap-2">
                    <input id="rc_set" type="password" placeholder="恢复码（至少 6 位）" class="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400">
                    <button onclick="setRecoveryCode()" class="bg-amber-500 text-white px-5 rounded-2xl font-bold text-sm">设置</button>
                </div>
            </div>
        </div>
    </div>
    ` : ''}

    ${isAdmin ? `
    <!-- 教师管理密码门 -->
    <div id="adminGate" ${adminAuthed ? 'style="display:none"' : ''} class="fixed inset-0 z-[100] bg-indigo-950 flex items-center justify-center p-6">
        <div class="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div class="text-4xl mb-3">🔐</div>
            <h2 class="font-black text-lg text-slate-900">教师管理</h2>
            <p class="text-slate-400 text-sm mt-1 mb-5">请输入管理密码进入</p>
            <input id="adminPwd" type="password" placeholder="管理密码" onkeydown="if(event.key==='Enter')adminLogin()" oninput="hideAdminErr()"
                class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 mb-2 text-center">
            <p id="adminErr" class="hidden text-red-500 text-xs mb-2"></p>
            <button onclick="adminLogin()" class="w-full bg-indigo-900 text-white py-3.5 rounded-2xl font-bold">进入管理端</button>
            <a href="javascript:void(0)" onclick="openRecoverModal()" class="block mt-3 text-indigo-400 text-xs hover:underline">忘记密码？</a>
            <a href="/" class="block mt-4 text-slate-400 text-sm hover:underline">返回学员端</a>
        </div>
    </div>

    <!-- 管理密码找回弹窗 -->
    <div id="recoverModal" class="hidden fixed inset-0 z-[100] bg-indigo-950/95 flex items-center justify-center p-6">
        <div class="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div class="text-4xl mb-3">🆘</div>
            <h2 class="font-black text-lg text-slate-900">找回管理密码</h2>
            <p class="text-slate-400 text-xs mt-1 mb-5">输入密码恢复码（在管理端"修改管理密码"中设置）</p>
            <input id="rc_code" type="password" placeholder="密码恢复码" oninput="hideRcErr()"
                class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 mb-3 text-center">
            <input id="rc_new" type="password" placeholder="新管理密码（至少 6 位）" oninput="hideRcErr()"
                class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-400 mb-2 text-center">
            <p id="rcErr" class="hidden text-red-500 text-xs mb-3"></p>
            <button onclick="doAdminRecover()" class="w-full bg-indigo-900 text-white py-3.5 rounded-2xl font-bold">重设密码并进入</button>
            <button onclick="toggleModal('recoverModal')" class="mt-3 text-slate-400 text-sm hover:underline">取消</button>
        </div>
    </div>` : ''}
    <script>
