# worker.js 模块化源码

`worker.js`（5443行单文件）按逻辑拆分后的模块源码。修改时改这里的模块，
然后用 `../build.py` 重新拼接成 `worker.js` 再部署。

## 目录结构

```
src/
├── worker.js               # 文件头注释（主入口标识）
├── shared/
│   └── constants.js        # 共享常量：normStr / isFillLike / MBSEP（答案判定用）
├── server/                 # 服务端（Cloudflare Worker 顶层作用域）
│   ├── utils.js            # checkAnswer / sha256hex / json / stripAnswers / briefCourse
│   ├── db.js               # D1 操作：getSetting / setSetting / getPwHash /
│   │                       #   nextSortOrder / orderedCourses / migrate
│   │                       #   （含 /*@@AUTH@@*/ 占位符，构建时填入 auth.js）
│   ├── auth.js             # 管理员鉴权：adminToken / isAdminReq /
│   │                       #   adminCookie / clearAdminCookie
│   └── api.js              # export default：所有 /api/* 路由 + 页面分发
└── client/                 # 客户端（renderHTML 模板内的 <script>）
    ├── template_head.js    # function renderHTML + HTML head/body 模板 + <script>
    ├── main.js             # 客户端主逻辑（含 /*@@I18N@@*/ 占位符，构建时填入 i18n.js）
    ├── i18n.js             # I18N 多语言对象（504行，独立文件方便翻译维护）
    ├── export.js           # 导出：HTML / Word(.docx) / Excel(.xlsx) / PPT(.pptx) / PDF打印
    ├── ui.js               # 管理端 UI：登录 / 课程编辑 / 分类管理 / 导入等
    └── template_tail.js    # PWA script + </body></html> + 模板收尾
```

## 构建

```bash
# 构建到 worker.js（覆盖，用于部署前）
python3 build.py

# 验证构建输出与当前 worker.js 逐字节一致
python3 build.py --check

# 构建到指定文件（不覆盖）
python3 build.py -o /tmp/out.js
```

## 注意事项

1. **占位符机制**：源码中有两处函数交错（db/auth、main/i18n），
   用 `/*@@AUTH@@*/` 和 `/*@@I18N@@*/` 占位符处理。
   build.py 构建时自动填充，输出与原文件逐字节一致。
   不要删除或改动占位符行。

2. **模板字符串转义**：client/ 下的代码最终嵌在 renderHTML 的模板字符串里，
   正则和字符串转义要写双反斜杠（`\\n`、`\\.` 等），详见 AGENTS.md。

3. **拆分边界**：所有模块切分点都在语句/函数之间，不在函数内部。
   新增代码时注意不要跨模块拆散一个函数。

4. **部署流程不变**：构建出 worker.js 后，走原有部署流程
   （备份 → served脚本回归 → 部署 → 验证 → GitHub 推送逐字节核对）。
