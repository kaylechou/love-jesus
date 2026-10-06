/* ============ 纯函数：答案判定（服务端判分用，与旧客户端逻辑一致） ============ */
function normStr(s) {
return String(s == null? "": s).replace(/[\s　，,。、；;：:！!？?""''「」『』（）()\[\]·…—\-]/g, "").toUpperCase();
}
function isFillLike(q) {
return /_{2,}|＿{2,}|（\s*）|\(\s*\)/.test(q.q || "");
}
var MBSEP = String.fromCharCode(1); /* 课件多空格题：各空答案在提交时用此分隔符连接 */
