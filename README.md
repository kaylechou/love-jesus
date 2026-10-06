# love-jesus · 团契智学（模块化版本）

真理探索学习平台——教会团契的在线互动课件与答题系统。Cloudflare Worker + D1 实现，模块化源码结构。

- 线上地址：https://lovejesus.kaylechou.dpdns.org/
- 管理后台：`/admin`
- 更新记录：[CHANGELOG.md](./CHANGELOG.md)（按时间倒序）
- 姊妹项目：[kaylechou/love](https://github.com/kaylechou/love)（单文件版本，两项目互为备份、数据双向同步）

---

## 模块化结构

源码按功能拆分为 13 个模块，构建脚本打包为单个 `worker.js` 部署：

```
src/
├── worker.js              # 主入口（文件头）
├── shared/
│   └── constants.js       # 共享常量（normStr、isFillLike、MBSEP）
├── server/
│   ├── utils.js           # 服务端工具（判分、哈希、JSON、答案过滤）
│   ├── db.js              # 数据库操作（设置、课程排序、数据迁移）
│   ├── auth.js            # 管理员认证（token、Cookie）
│   └── api.js             # 所有 /api/* 路由 + 页面分发
├── client/
│   ├── template_head.js   # renderHTML + HTML 头部模板
│   ├── main.js            # 客户端主逻辑（课程、答题、进度）
│   ├── i18n.js            # 多语言文案（简/繁/英/日/韩）
│   ├── export.js          # 导出功能（HTML/Word/Excel/PPT/打印）
│   ├── ui.js              # 管理端 UI（登录、课程编辑、分类管理）
│   └── template_tail.js   # PWA + HTML 尾部
└── README.md              # 模块说明
```

### 构建与部署

```bash
# 修改模块后构建（输出 worker.js）
python3 build.py

# 验证构建输出与 worker.js 一致
python3 build.py --check

# 部署到 Cloudflare Workers（需绑定 D1）
python3 ~/workspace/skills/cloudflare/bin/cf.py deploy \
  <account-id> love-jesus <d1-database-uuid> worker.js
```

**注意**：构建输出保证与 `worker.js` 逐字节一致，部署前务必跑 `--check` 验证。

---

## 双项目互备

`love` 与 `love-jesus` 互为备份：

| 项目 | Worker | D1 数据库 | 域名 | GitHub |
|---|---|---|---|---|
| love | love | fellowship_db | love.kaylechou.dpdns.org | kaylechou/love |
| love-jesus | love-jesus | fellowship_db_jesus | lovejesus.kaylechou.dpdns.org | kaylechou/love-jesus |

- **代码同步**：每次更新同时部署到两个 Worker、推送到两个 GitHub 库
- **数据同步**：每小时双向同步一次（courses、categories、settings），以 `updated_at` 时间戳为准，新的覆盖旧的
- **隐私数据**：students、wrongs、progress 各自独立，不同步

---

## 功能详细介绍

### 📖 学习功能

#### 分 Tab 互动课件
学员点击"开始学习"后，课件以弹窗形式打开，顶部是紫色导航条（"← 返回课程列表" + 学员姓名），下方是题型页签。

- **📚 课程导读**：课程视频、课程导览卡片、答题说明、"开始答题 →"按钮
- **按题型分页**：页签按课程实际含有的题型动态生成
- **📊 成绩报告**：客观题得分、理解掌握评级、复习提示
- **自适应模式**：有章节的课程渲染为课件模式，无章节的渲染为平板测验
- **即时反馈**：核对后每题内联显示 ✓/✗，问答题可展开参考答案

#### 六种题型
| 题型 | 说明 |
|---|---|
| 经文诵读 📖 | 经文填空，三徽章引用显示，琥珀底纹高亮 |
| 填空题 ✏️ | 题干内嵌输入框，支持多答案判分 |
| 单项选择题 🔘 | 四选一，点击即选中 |
| 多项选择题 ☑️ | 复选框多选，顺序无关 |
| 判断题 ⚖️ | √ / × 二选一 |
| 问答与思辨 💬 | 大文本框作答，核对后展开参考答案 |

#### 错题本 📝
- 答错自动收录，按学员姓名隔离
- 导出格式与课件导出一致

### 👤 学员系统
- 姓名 + 密码登录，SHA-256 加盐哈希
- 学员管理员：可直接查看答案

### 🛠️ 管理后台（/admin）
- 课程管理：新建、编辑、删除、排序、批量导入
- 系列与子栏目两级管理
- 成绩查询、错题查看、学员管理
- 首页公告设置

### 📥 导出功能
| 格式 | 说明 |
|---|---|
| 📄 网页 HTML | 独立文件，离线可打开 |
| 📝 Word（.docx） | 真实 DOCX 格式 |
| 📊 Excel（.xlsx） | 真实 XLSX 格式 |
| 📽️ PPT（.pptx） | 单页版 / 两页版 |
| 🖨️ 打印/PDF | 浏览器打印 |

### 📱 移动端
- PWA 可安装应用
- 移动版 / 桌面版一键切换
- 字号五档可调
- 多语言：简体 / 繁體 / English / 日本語 / 한국어

---

## 技术栈

- **Cloudflare Workers** + **Cloudflare D1**（SQLite）
- 前端：原生 HTML / CSS / JavaScript（Tailwind CDN），无构建步骤
- 管理登录：HttpOnly Cookie + SHA-256；学员密码加盐哈希
- 服务端判分；未登录时 API 不下发答案

### 数据模型

| 表 | 说明 |
|---|---|
| courses | 课程（含 quizzes_json、guide_json、i18n_json、updated_at） |
| categories | 系列/子栏目（含 i18n_json、updated_at） |
| settings | 设置/公告（updated_at） |
| students | 学员（隐私，不同步） |
| wrongs | 错题（隐私，不同步） |
| progress | 进度（隐私，不同步） |
| bible_verses | 经文 NIV/KJV |

### API 接口

| 接口 | 说明 |
|---|---|
| `GET /api/data` | 课程列表（`?brief=1` 精简字段） |
| `GET /api/course?id=` | 单门课程完整内容 |
| `POST /api/save` | 新建 / 更新课程（管理） |
| `POST /api/submit` | 提交判分 |
| `GET /api/answers` | 教师版答案（需鉴权） |
| `POST /api/wrongs/save`、`GET /api/wrongs` | 错题同步/查询 |
