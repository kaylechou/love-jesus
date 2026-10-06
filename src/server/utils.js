function checkAnswer(q, u) {
var uu = normStr(u);
if (q.type === 'single' || q.type === 'judge') {
var aa = normStr(q.a);
return uu!== "" && (uu === aa || aa.indexOf(uu) === 0);
}
if (q.type === 'multiple') {
/* 多选：顺序无关；少选、多选、错选都算错；每个已选项不可重复对应同一答案 */
var aa = String(q.a || "").split(/[、；;，,\\/|｜]/).map(normStr).filter(function (x) { return x!== "";});
if (aa.length === 0) return false;
var ua = String(u == null? "": u).split(/[、；;，,\\/|｜]/).map(normStr).filter(function (x) { return x!== "";});
var seen = {}, uniq = [];
ua.forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; uniq.push(x);}});
if (uniq.length !== aa.length) return false;
var used = [];
for (var ui = 0; ui < uniq.length; ui++) {
var hit = -1;
for (var ai = 0; ai < aa.length; ai++) {
if (used.indexOf(ai) >= 0) continue;
if (uniq[ui] === aa[ai] || (aa[ai].length >= 2 && aa[ai].indexOf(uniq[ui]) === 0)) { hit = ai; break; }
}
if (hit < 0) return false;
used.push(hit);
}
return true;
}
if (q.type === 'fill' || q.type === 'verse' || (q.type === 'essay' && isFillLike(q))) {
var rawU = String(u == null ? "" : u);
/* 填空答案两级分隔：先用 | ｜ ； 分各空（按题干空格顺序对应）；每空内部用 / ／ 或 、 ， ; \\ 分多个可接受答案，答中任意一个即正确 */
var groups = String(q.a || "").split(/[|｜；]/).map(function (g) {
return String(g).split(/[\/／、，,;\\或]/).map(normStr).filter(function (x) { return x!== "";});
}).filter(function (g) { return g.length > 0;});
if (q.type === 'verse' && groups.length === 0) return null; /* 经文框未设答案：开放性 */
if (groups.length === 0) return false;
function hitAlt(uu, alts) {
if (uu === "") return false;
for (var k = 0; k < alts.length; k++) {
if (uu === alts[k]) return true;
if (alts[k].length >= 2 && uu.indexOf(alts[k]) >= 0) return true;
}
return false;
}
/* 多空格题：各空答案用 MBSEP 连接提交；第 i 空命中第 i 组的任意一个备选即正确 */
if (rawU.indexOf(MBSEP) >= 0) {
var parts = rawU.split(MBSEP);
var glist = groups;
/* 兼容旧数据：答案中没写分空符、但备选个数恰好等于空格数时，按旧逻辑逐空顺序对应（如 上帝/创造主） */
if (glist.length === 1 && parts.length > 1 && glist[0].length === parts.length) {
glist = glist[0].map(function (x) { return [x];});
}
if (parts.length !== glist.length) return false;
for (var pi = 0; pi < parts.length; pi++) {
if (!hitAlt(normStr(parts[pi]), glist[pi])) return false;
}
return true;
}
/* 单空格题：命中任意一组的任意一个备选即正确 */
var uu = normStr(rawU);
if (uu === "") return false;
for (var gi = 0; gi < groups.length; gi++) {
if (hitAlt(uu, groups[gi])) return true;
}
return false;
}
return null; /* 纯问答题：开放性，不自动判定对错 */
}

async function sha256hex(s) {
const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function json(data, status, headers) {
return new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({ "Content-Type": "application/json" }, headers || {}) });
}
/* 去掉题目答案（发给非管理员） */
function stripAnswers(courses) {
return (courses || []).map(c => {
let qs = [];
try { qs = JSON.parse(c.quizzes_json || "[]");} catch (e) {}
qs = qs.map(q => ({ type: q.type, q: q.q, o: q.o, s: q.s, h: q.h }));
const nc = Object.assign({}, c);
nc.quizzes_json = JSON.stringify(qs);
return nc;
});
}
/* 首页列表精简字段：去掉题库/导读/说明（体积约为完整数据的 1/10），卡片与搜索只用 content */
function briefCourse(c) {
return { id: c.id, category: c.category, subcategory: c.subcategory, title: c.title, content: c.content, video_url: c.video_url, mode: c.mode, sort_order: c.sort_order, created_at: c.created_at, i18n_json: c.i18n_json || '' };
}
