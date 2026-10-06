async function adminToken(env) {
return await sha256hex("tq-admin:" + await getPwHash(env));
}
async function isAdminReq(request, env) {
const cookie = request.headers.get("Cookie") || "";
const m = cookie.match(/(?:^|;\s*)tq_admin=([a-f0-9]{64})/);
if (!m) return false;
return m[1] === await adminToken(env);
}
function adminCookie(token) {
return "tq_admin=" + token + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure";
}
function clearAdminCookie() {
return "tq_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure";
}
