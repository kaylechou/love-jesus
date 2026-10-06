async function getSetting(env, key) {
try {
const r = await env.DB.prepare("SELECT value FROM settings WHERE key =?").bind(key).all();
const rows = (r && r.results) || [];
return rows.length? rows[0].value: null;
} catch (e) { return null;}
}
async function setSetting(env, key, val) {
await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)").bind(key, val).run();
}
async function getPwHash(env) {
let h = await getSetting(env, "admin_pw_hash");
if (!h) { h = await sha256hex("777777"); await setSetting(env, "admin_pw_hash", h);}
return h;
}
/*@@AUTH@@*/
async function nextSortOrder(env) {
const r = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM courses").all();
const rows = (r && r.results) || [];
return (rows[0]? rows[0].m: 0) + 1;
}
async function orderedCourses(env) {
const r = await env.DB.prepare("SELECT * FROM courses ORDER BY sort_order ASC, category ASC, subcategory ASC, created_at DESC").all();
return (r && r.results) || [];
}

async function migrate(env) {
const db = env.DB;
try { await db.prepare("ALTER TABLE courses ADD COLUMN video_url TEXT").run();} catch (e) {}
try { await db.prepare("ALTER TABLE courses ADD COLUMN guide_json TEXT").run();} catch (e) {}
try { await db.prepare("ALTER TABLE courses ADD COLUMN instructions TEXT").run();} catch (e) {}
try { await db.prepare("ALTER TABLE courses ADD COLUMN mode TEXT DEFAULT 'quiz'").run();} catch (e) {}
try { await db.prepare("ALTER TABLE courses ADD COLUMN sort_order INTEGER DEFAULT 0").run();} catch (e) {}
await db.prepare("CREATE TABLE IF NOT EXISTS progress (username TEXT, course_id TEXT, score TEXT)").run();
try { await db.prepare("ALTER TABLE progress ADD COLUMN submitted_at TEXT").run();} catch (e) {}
try { await db.prepare("ALTER TABLE progress ADD COLUMN course_title TEXT").run();} catch (e) {}
await db.prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)").run();
await db.prepare("CREATE TABLE IF NOT EXISTS students (username TEXT PRIMARY KEY, pw_hash TEXT, created_at TEXT)").run();
try { await db.prepare("ALTER TABLE students ADD COLUMN is_admin INTEGER DEFAULT 0").run(); } catch (e) {}
await db.prepare("CREATE TABLE IF NOT EXISTS wrongs (username TEXT, course_id TEXT, course_title TEXT, series TEXT, sub TEXT, qtype TEXT, qnum TEXT, question TEXT, user_answer TEXT, correct_answer TEXT, submitted_at TEXT)").run();
await db.prepare("CREATE INDEX IF NOT EXISTS idx_wrongs_user ON wrongs(username, course_id)").run();
await db.prepare("CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(username, course_id)").run();
/* 系列/子栏目：parent 为空=系列，非空=该系列下的子栏目；(parent, name) 联合主键 */
await db.prepare("CREATE TABLE IF NOT EXISTS categories (parent TEXT DEFAULT '', name TEXT, description TEXT DEFAULT '', created_at TEXT DEFAULT '', PRIMARY KEY (parent, name))").run();
try { await db.prepare("ALTER TABLE categories ADD COLUMN parent TEXT DEFAULT ''").run();} catch (e) {}
/* 兼容此前单级 categories 表（name 单主键）：检测到旧结构则重建为两级 */
try {
const ci = await db.prepare("SELECT sql FROM sqlite_master WHERE name='categories'").all();
const csql = ((((ci || {}).results) || [])[0] || {}).sql || "";
if (csql && !/PRIMARY KEY\s*\(\s*parent/i.test(csql)) {
await db.prepare("ALTER TABLE categories RENAME TO categories_old").run();
await db.prepare("CREATE TABLE categories (parent TEXT DEFAULT '', name TEXT, description TEXT DEFAULT '', created_at TEXT DEFAULT '', PRIMARY KEY (parent, name))").run();
await db.prepare("INSERT OR IGNORE INTO categories (parent, name, description, created_at) SELECT '', name, description, created_at FROM categories_old").run();
await db.prepare("DROP TABLE categories_old").run();
}
} catch (e) {}
try { await db.prepare("ALTER TABLE courses ADD COLUMN subcategory TEXT DEFAULT ''").run();} catch (e) {}
const v = await getSetting(env, "schema_v2");
if (!v) {
try { await db.prepare("UPDATE courses SET sort_order = rowid WHERE sort_order IS NULL OR sort_order = 0").run();} catch (e) {}
await setSetting(env, "schema_v2", "1");
}
await getPwHash(env); // 首次运行时写入默认密码哈希（请尽快在管理端修改）
}


/* ============ PWA：Web App Manifest / Service Worker / 图标（Android WebAPK + iOS 添加到主屏幕） ============ */
const PWA_ICON_192 = "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAACeklEQVR42u3dy00DMRSG0fiKOkIfoZhQGlMM0wdTCTs2IDH29TwSn7PmITKffhuBoFz2db3dL2xsmafdPldRjJ7OGJBuBimpSEdGpwhIN2OWVKQjo8y7h3oGl3yCRTpkpijUQ+aZhnrIPNkiHTLHWaiHzLMO9ZB54qEeMs891EPm6Yd6yDQQXiAywvyQGaFQD5mGQj1kGnIHovcdyPywfoRCPWQacoTR7wgzP9SOkAWi9yUaWgJyftFwilkgeiyQ+aFthCwQLtEcpzi/sEAICAEhIKgMyA0aC4SAEBACgjovI3yRX58fh3ze17d3CwQCQkAICAGBgBAQAkJAICBSykP8PtBRP4s41kP8JMQCISAEhIAQEAgIASEgBAQCQkAICAGBgBAQAkJAICAEhIAQEAICASEgBISAQEAICAEhIBAQAkJACAgEhIAQEAJCQNCsjPB/4/3LSwuEgBAQCAgBISAEBAJCQAgIASEgEBACQkAICASEgBAQAgIBISAEhIBAQAgIASEgBAQCQkAICAGBgBAQAkJAICAEhIAQEAgIASEgBISAQEAICAEhIBAQAkJACAgEhIA4q3K93b0KWCAEhIAQEAiI3QJa5smrgAVCQAgIAUFlQO7RtFnmyQLhCOPwgJxiNJxfFoh+R5gRonZ+LBAu0ZwnIKcYVeeXBaL3EWaEWD8/fy+QhlhZjyOMbb4LM0KsrCKq3hr1VBxhGuLfEtyB2OAOZIRY2UAk35+R61l7hGlIPdk7kIbUk71Ea0g9v5WGj+5vUkkn9W28KVJPKiANqSd1hDnOpJNdIFOknj4LZIqGTadzQEoaqpsNA5LRIOlsG5CSnrubH98wGZ7fHfIHsQAAAABJRU5ErkJggg==";
const PWA_ICON_512 = "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";
const PWA_ICON_180 = "iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAIAAACyr5FlAAACV0lEQVR42u3d7U3DMBSG0dhiDtgDhoHRyDBkDzJJ/6GSUhrnw2l9zzMACDh6b4pATV2Vnl/fO23aOPR7f4oEBCj1cDDRjJLEBCU74sCiVSIJC0SulclovsU/qYSFCdlsOciIMyGZDD7WnhUsAp6YTIYJWY6DjLA+Mhl8bPZqRXHKZsN4FOMgg49Mhq79xD1zqOSZw2wYj79xkMGHs6LCs2I2dG7AcmjGcpgNTSRYDpW8lJV+4XBTdHlZLIecFZWX3BRZDsEhOFQDhwcOWQ7BITgEh47sqdUv7Pvrs+ane3n7sBxyViQ4BIfgEByCQ3AIDsGhdkr3/PcclX8Ffkj3/Ht3yyE4BIfgEByCQ3AIDsEhOASHBIfgEByCQ3AIDsEhOASH4JDgEByCQ3AIDsEhOASH4BAcEhyCQ3AIDsGhY0utvgGg91uxHIJDcAgOwSE4BIfgkOAQHIJDcAgOwSE4BIfgEBwSHIJDcAgOwSE4BIfgEByCQ3BIcAgOwSE4BIfgEByCQ3AIDgkOwSE4BIfgEByCQ3AIDsEhwSE4BIfgUJWafXdIWQ7BITgEh+DQo+MYh953QZZDcAgO1cDhsUOXjUNvOeSsaDEOl0WTm2I55KxoJQ6XRRMJlkPzzorx0LkBy6HZD6TGw2z8txx8kOGsqPCsGA+zcXs5+Agu48ZZ4SOyDM8cKn/mMB5mY9Zy8BFTxtyzwkdAGV3XpaKP6F/yg7BY8kBqQuLIWPJqhY8gMorPihMThMXC5TAhQWSsWg4T0jCLzXAg0h6LjXFQ0oyJHXFQ8ugmfjoBBzSSx5xwCJsAAAAASUVORK5CYII=";
const PWA_SW_JS = "self.addEventListener('install',function(e){self.skipWaiting()});self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});self.addEventListener('fetch',function(e){/* 直通网络，不缓存页面，保证内容永远最新 */});";
function pwaIconResponse(b64) {
const bin = atob(b64);
const bytes = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
return new Response(bytes, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
function pwaManifest() {
return {
name: "团契智学", short_name: "团契智学", description: "团契互动课件与答题系统",
start_url: "/", scope: "/", display: "standalone", orientation: "portrait",
background_color: "#ffffff", theme_color: "#1e3a5f",
icons: [
{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
]
};
}
