# CHANGELOG · love-jesus

按时间倒序。love-jesus 为模块化版本，与 love 项目互为备份、代码与数据双向同步。

---

## 2026-10-07 · 项目初始化

- 从 love 项目完整拆分出模块化结构（13 个模块 + build.py 构建脚本）
- 构建输出与原 worker.js 逐字节一致（360778 字节）
- 新建 Cloudflare Worker `love-jesus`，绑定新 D1 `fellowship_db_jesus`
- 绑定域名 （线上地址）
- 新建 GitHub 仓库 本仓库，推送全部模块源码
- D1 表结构复制：courses（97 门）、categories（13 个）、settings、bible_verses（92 处）
- 三表新增 `updated_at` 时间戳字段，写入时自动更新
- 建立双向同步机制：
  - 代码：每次更新同时部署双 Worker、推送双 GitHub 库
  - 数据：每小时双向同步（courses/categories/settings），以 updated_at 为准
  - 隐私数据（students/wrongs/progress）各自独立，不同步
- 自动备份：每天 04:21 备份 fellowship_db_jesus 到 本仓库

### 继承自 love 项目的全部功能（第 1–132 次部署）

- 六种题型：经文诵读 / 填空 / 单选 / 多选 / 判断 / 问答
- 三徽章经文高亮（📜金色 + 书名紫色 + 章节蓝色），66 卷全覆盖
- 五语言界面：简体 / 繁體 / English / 日本語 / 한국어
- 英文圣经 NIV/KJV 可选
- 导出：真实 .docx / .xlsx / .pptx + HTML + 打印/PDF
- 错题本（按学员隔离，答对自动移除）
- 学员系统：姓名+密码登录、防冒名、学员管理员
- 管理后台：课程/分类/成绩/学员/公告管理
- 系列/子栏目分享导出打印
- PWA 可安装、移动/桌面视图切换、字号调节
- 子栏目分隔符 `•`（加粗全角），A/B 分框编辑
- 问答题按答案长度动态留白（3–15 行）
- 管理端"学员预览"一键秒切
