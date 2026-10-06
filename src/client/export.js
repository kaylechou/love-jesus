        function courseExportInner(c) {
            var qs = [], guide = [];
            try { qs = JSON.parse(c.quizzes_json || '[]'); } catch (e) {}
            try { guide = JSON.parse(c.guide_json || '[]'); } catch (e) {}
            var title = c.title || '未命名课件';
            var meta = [c.category, c.subcategory].filter(function(x) { return x; }).join(' · ');
            var now = new Date(), ds = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
            var body = '<header class="hero"><div class="meta">' + esc(meta) + '</div>'
                + '<h1>' + esc(title) + '</h1><div class="date">导出日期：' + ds + ' · 团契智学</div></header>', i;
            if (c.content) body += '<section class="card"><h2>📚 课程导读</h2><div class="md">' + expMd(c.content) + '</div></section>';
            if (c.video_url) body += '<section class="card"><h2>🎬 课程视频</h2><p class="md"><a href="' + esc(c.video_url) + '">观看课程视频</a></p></section>';
            var realGuide = guide.filter(function(g) { return g && (g.title || (g.points || []).length); });
            if (realGuide.length) {
                body += '<section class="card"><h2>🗺️ 课程导览</h2>' + realGuide.map(function(g, gi) {
                    var pts = (g.points || []).filter(function(x) { return String(x).trim(); });
                    return '<div class="chapter"><div class="ch-title"><span class="ch-num">' + (gi + 1) + '</span>' + esc(g.title || ('第' + (gi + 1) + '章')) + '</div>'
                        + (pts.length ? '<ul>' + pts.map(function(x) { return '<li>' + hlVerse(esc(x)) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
                }).join('') + '</section>';
            }
            if (c.instructions) body += '<section class="card"><h2>📝 答题说明</h2><div class="md">' + expMd(c.instructions) + '</div></section>';
            var order = ['verse', 'fill', 'single', 'multiple', 'judge', 'essay'], groups = {};
            qs.forEach(function(q) { var t = q.type || 'fill'; (groups[t] = groups[t] || []).push(q); });
            var hasQ = false;
            order.forEach(function(t) {
                var list = groups[t] || [];
                if (!list.length) return;
                hasQ = true;
                body += '<section class="card"><h2>' + (EXP_TYPE_LABEL[t] || t) + '（共' + list.length + '题）</h2>';
                list.forEach(function(q, qi) {
                    var rawQ = q.q || '';
                    var vref = '';
                    if (t === 'verse') {
                        /* 去掉题干开头的"【经文填空】"字样 */
                        if (rawQ.charAt(0) === '【') {
                            var ce = rawQ.indexOf('】');
                            if (ce > 0 && ce < 12) rawQ = rawQ.slice(ce + 1);
                        }
                        /* 经文出处徽章（与网页端一致，q.o 如"《约翰福音》3章16节"） */
                        vref = (q.h || q.o) ? '<div class="verse-ref-line">' + hlVerse(esc(stripEmoji(q.h || q.o))) + '</div>' : '';
                    }
                    var qtext = expInline(hlVerse(esc(rawQ)));
                    var bracket = (t === 'single' || t === 'multiple' || t === 'judge') ? '（ ）' : '';
                    var opts = '';
                    if ((t === 'single' || t === 'multiple') && q.o) {
                        opts = '<div class="opts">' + String(q.o).split(',').map(function(p) {
                            return '<div class="opt">' + esc(String(p).trim()) + '</div>';
                        }).join('') + '</div>';
                    }
                    var ws = '';
                    if (t === 'essay') {
                        var ansLen = 0;
                        try { ansLen = String(expAnswer(q) || '').length; } catch (e) {}
                        var wsLines = Math.max(3, Math.min(15, Math.ceil(ansLen / 30)));
                        ws = '<div class="ws">';
                        for (var wi = 0; wi < wsLines; wi++) ws += '<div class="ws-line"></div>';
                        ws += '</div>';
                    }
                    var qtextHtml = (t === 'verse') ? '<span class="verse-text">' + qtext + '</span>' : qtext;
                    body += '<div class="q' + (t === 'verse' ? ' q-verse' : '') + '"><div class="q-text">' + (qi + 1) + '. ' + bracket + vref + qtextHtml + '</div>' + opts + ws + '</div>';
                });
                body += '</section>';
            });
            /* 参考答案统一附在所有题型之后，不再每题单独出现 */
            body += buildAnswerKey(c);
            if (!hasQ && !c.content && !realGuide.length) body += '<section class="card"><p class="empty">本课件暂无内容</p></section>';
            return { title: title, body: body };
        }
        function buildExportHTML(c) {
            var inner = courseExportInner(c);
            return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
                + '<meta name="viewport" content="width=device-width,initial-scale=1">'
                + '<title>' + esc(inner.title) + ' - 团契智学</title><style>' + EXP_CSS + '</style></head>'
                + '<body><div class="wrap">' + inner.body + '<footer>由团契智学学习平台导出</footer></div></body></html>';
        }
        /* 多课件合并为一份打印文档（每课件另起一页） */
        function buildMultiCourseHTML(courses, docTitle) {
            var parts = courses.map(function(c, i) {
                var inner = courseExportInner(c);
                return (i > 0 ? '<div style="page-break-before:always"></div>' : '') + inner.body;
            }).join('');
            return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
                + '<meta name="viewport" content="width=device-width,initial-scale=1">'
                + '<title>' + esc(docTitle || '课件合集') + ' - 团契智学</title><style>' + EXP_CSS + '</style></head>'
                + '<body><div class="wrap">' + parts + '<footer>由团契智学学习平台导出</footer></div></body></html>';
        }
        function printCourses(courses, docTitle) {
            var w = window.open('', '_blank');
            if (!w) { alert('浏览器阻止了新窗口，请允许弹窗后重试'); return; }
            w.document.write(buildMultiCourseHTML(courses, docTitle));
            w.document.close();
            w.focus();
            setTimeout(function() { w.print(); }, 600);
        }
        function safeFileName(s) {
            var t = String(s || '课件'), bad = ['\\\\', '/', ':', '*', '?', '"', '<', '>', '|'], i;
            for (i = 0; i < bad.length; i++) t = t.split(bad[i]).join('_');
            t = t.slice(0, 60).trim();
            return t || '课件';
        }
        function downloadHTML(filename, html) {
            var blob = new Blob(['\\ufeff' + html], { type: 'text/html;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 1500);
        }
        function findCourse(id) {
            var list = allData || [], i;
            for (i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
            return null;
        }
        function exportCourse(id) {
            openExportMenu([id]);
        }
        function exportSelected() {
            var nodes = document.querySelectorAll('.exp-check:checked'), ids = [], i;
            for (i = 0; i < nodes.length; i++) ids.push(nodes[i].getAttribute('data-id'));
            if (!ids.length) { alert('请先勾选要导出的课件（卡片左上角复选框）'); return; }
            openExportMenu(ids);
        }
        /* ===== Office 导出：Word / Excel / PPTX / 打印存PDF ===== */
        var EXP_TYPE_PLAIN = { fill: '填空题', single: '单项选择题', multiple: '多项选择题', judge: '判断题', essay: '问答与思辨', verse: '经文诵读' };
        var exportIds = [];
        var exportLabel = '';
        function openExportMenu(ids, label) {
            exportIds = ids || [];
            exportLabel = label || '';
            var m = document.getElementById('exportModal');
            if (!m) {
                m = document.createElement('div');
                m.id = 'exportModal';
                m.style.cssText = 'position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;';
                m.innerHTML = '<div style="position:absolute;inset:0;background:rgba(15,23,42,.5)" onclick="closeExportMenu()"></div>'
                    + '<div style="position:relative;background:#fff;border-radius:24px;padding:24px;width:100%;max-width:340px;box-shadow:0 25px 50px rgba(0,0,0,.25)">'
                    + '<h3 style="font-weight:800;color:#1e293b;margin:0 0 4px">📥 导出课件</h3>'
                    + '<p id="exportMenuSub" style="font-size:12px;color:#94a3b8;margin:0 0 16px"></p>'
                    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
                    + '<button data-fmt="html" onclick="doExport(this.dataset.fmt)" style="border:1px solid #e2e8f0;border-radius:16px;padding:12px;font-size:14px;font-weight:700;color:#334155;background:#fff">📄<br>网页 HTML</button>'
                    + '<button data-fmt="word" onclick="doExport(this.dataset.fmt)" style="border:1px solid #e2e8f0;border-radius:16px;padding:12px;font-size:14px;font-weight:700;color:#334155;background:#fff">📝<br>Word 文档</button>'
                    + '<button data-fmt="excel" onclick="doExport(this.dataset.fmt)" style="border:1px solid #e2e8f0;border-radius:16px;padding:12px;font-size:14px;font-weight:700;color:#334155;background:#fff">📊<br>Excel 表格</button>'
                    + '<button data-fmt="pptx1" onclick="doExport(this.dataset.fmt)" style="border:1px solid #e2e8f0;border-radius:16px;padding:12px;font-size:14px;font-weight:700;color:#334155;background:#fff">📽️<br>PPT 单页版<br><span style="font-size:11px;font-weight:400;color:#94a3b8">自设动画</span></button>'
                    + '<button data-fmt="pptx2" onclick="doExport(this.dataset.fmt)" style="border:1px solid #e2e8f0;border-radius:16px;padding:12px;font-size:14px;font-weight:700;color:#334155;background:#fff">📽️<br>PPT 两页版<br><span style="font-size:11px;font-weight:400;color:#94a3b8">翻页揭示</span></button>'
                    + '</div>'
                    + '<button data-fmt="print" onclick="doExport(this.dataset.fmt)" style="margin-top:8px;width:100%;border:1px solid #e2e8f0;border-radius:16px;padding:12px;font-size:14px;font-weight:700;color:#334155;background:#fff">🖨️ 打印 / 存为 PDF</button>'
                    + '<button onclick="closeExportMenu()" style="margin-top:4px;width:100%;font-size:12px;color:#94a3b8;padding:8px;background:none;border:none">取消</button>'
                    + '</div>';
                document.body.appendChild(m);
            }
            var sub = document.getElementById('exportMenuSub');
            if (exportLabel) {
                sub.innerText = exportLabel + '，批量导出（逐个下载）';
            } else if (exportIds.length === 1) {
                var c0 = findCourse(exportIds[0]);
                sub.innerText = '单个课件：' + (c0 ? c0.title : '');
            } else {
                sub.innerText = '批量导出 ' + exportIds.length + ' 个课件（逐个下载）';
            }
            m.style.display = 'flex';
        }
        function closeExportMenu() {
            var m = document.getElementById('exportModal');
            if (m) m.style.display = 'none';
        }
        function doExport(fmt) {
            var ids = exportIds.slice();
            closeExportMenu();
            if (!ids.length) return;
            if (fmt === 'print') {
                var pcs = ids.map(function(id) { return findCourse(id); }).filter(function(c) { return c; });
                if (pcs.length === 1) printCourse(pcs[0]);
                else if (pcs.length > 1) printCourses(pcs, exportLabel || ('批量课件（' + pcs.length + '个）'));
                return;
            }
            ids.forEach(function(id, i) { setTimeout(function() { exportOne(id, fmt); }, i * 900); });
        }
        function exportOne(id, fmt) {
            var c = findCourse(id);
            if (!c) return;
            var fn = safeFileName(c.title);
            if (fmt === 'html') downloadHTML(fn + '.html', buildExportHTML(c));
            else if (fmt === 'word') downloadBytes(fn + '.docx', buildDocx(c), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            else if (fmt === 'excel') downloadBytes(fn + '.xlsx', buildXlsx(c), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            else if (fmt === 'pptx1') downloadBytes(fn + '-单页版.pptx', buildPptx(c, 'single'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
            else if (fmt === 'pptx2') downloadBytes(fn + '-两页版.pptx', buildPptx(c, 'dual'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        }
        function downloadText(filename, text, mime) {
            var blob = new Blob([String.fromCharCode(65279) + text], { type: mime || 'text/plain;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 1500);
        }
        function downloadBytes(filename, bytes, mime) {
            var blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 1500);
        }
        var WORD_CSS = 'body{font-family:"Microsoft YaHei",sans-serif;font-size:14px;color:#000;}'
            + 'h1{font-size:22px;}h2{font-size:18px;}'
            + '.q{margin:10px 0;}.q-text{font-weight:bold;}'
            + '.blank{text-decoration:underline;}'
            + '.ans{background:#f0f0f0;padding:8px;margin-top:6px;}'
            + '.verse-text{background:#fef3c7;}'
            + '.verse-ref-book{background:#7c3aed;color:#fff;padding:2px 6px;}'
            + '.verse-ref-num{color:#1d4ed8;}'
            + '.ws-line{border-bottom:1px solid #999;height:28px;}';
        function buildAnswerKey(c) {
            var qs = [];
            try { qs = JSON.parse(c.quizzes_json || '[]'); } catch (e) {}
            if (!qs.length) return '';
            var order = ['verse', 'fill', 'single', 'multiple', 'judge', 'essay'];
            var groups = {};
            qs.forEach(function(q) { var t = q.type || 'fill'; (groups[t] = groups[t] || []).push(q); });
            var html = '<div class="card answer-key"><h2>📋 参考答案</h2>';
            order.forEach(function(t) {
                var list = groups[t] || [];
                if (!list.length) return;
                html += '<p><b>' + (EXP_TYPE_LABEL[t] || t) + '</b></p><ol>';
                list.forEach(function(q) {
                    var ans = expAnswer(q);
                    html += '<li>' + esc(ans || '（开放作答）') + '</li>';
                });
                html += '</ol>';
            });
            html += '<p style="color:#94a3b8;font-size:12px;">提示：打印试卷时可删除本节，或不打印最后几页。</p></div>';
            return html;
        }
        function buildWordHTML(c) {
            var h = buildExportHTML(c);
            h = h.split('<!DOCTYPE html>').join('');
            h = h.split('<meta name="viewport" content="width=device-width,initial-scale=1">').join('');
            h = h.split('<html lang="zh-CN">').join('<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">');
            var p1 = h.split('<style>');
            var p2 = p1[1].split('</style>');
            h = p1[0] + '<style>' + WORD_CSS + '</style>' + p2[1];
            h = h.split('<span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>').join('<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>');
            return h;
        }
        function buildExcelHTML(c) {
            var qs = [];
            try { qs = JSON.parse(c.quizzes_json || '[]'); } catch (e) {}
            var guide = [];
            try { guide = JSON.parse(c.guide_json || '[]'); } catch (e) {}
            var guideHtml = '';
            var realGuide = guide.filter(function(g) { return g && (g.title || (g.points || []).length); });
            if (realGuide.length) {
                var grows = realGuide.map(function(g, gi) {
                    var pts = (g.points || []).filter(function(x) { return String(x).trim(); });
                    return '<tr><td>' + (gi + 1) + '</td><td>' + esc(g.title || '') + '</td><td>' + hlVerse(esc(pts.join('；'))) + '</td></tr>';
                }).join('');
                guideHtml = '<h3>课程导览</h3><table border="1" cellpadding="6" cellspacing="0"><tr><th>序号</th><th>章节</th><th>要点</th></tr>' + grows + '</table><br><br>';
            }
            var trs = qs.map(function(q, i) {
                var t = q.type || 'fill';
                var bracket = (t === 'single' || t === 'multiple' || t === 'judge') ? '（ ）' : '';
                return '<tr><td>' + (i + 1) + '</td><td>' + esc(EXP_TYPE_PLAIN[t] || t) + '</td><td>' + hlVerse(esc(bracket + (q.q || ''))) + '</td><td>' + esc(q.o || '') + '</td><td>' + esc(expAnswer(q)) + '</td></tr>';
            }).join('');
            return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'
                + '<head><meta charset="utf-8"><style>.verse-ref{display:inline-block;background:#7c3aed;color:#fff;font-weight:700;font-size:12px;padding:1px 8px;border-radius:9999px;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.verse-ref-icon{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;font-size:12px;padding:1px 7px;border-radius:9999px;white-space:nowrap;margin-right:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.verse-ref-book{display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:700;font-size:12px;padding:1px 8px;border-radius:9999px;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.verse-ref-num{display:inline-block;background:#eff6ff;color:#1d4ed8;font-weight:700;font-size:12px;padding:1px 8px;border-radius:9999px;white-space:nowrap;border:1.5px solid #60a5fa;margin-left:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.verse-text{background:#fef3c7;color:#92400e;font-weight:700;border-radius:3px;padding:0 3px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style>'
                + '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>题库</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->'
                + '</head><body>'
                + guideHtml
                + '<h3>题库</h3><table border="1" cellpadding="6" cellspacing="0"><tr><th>序号</th><th>题型</th><th>题目</th><th>选项</th><th>答案</th></tr>'
                + trs + '</table></body></html>';
        }
        function printCourse(c) {
            var w = window.open('', '_blank');
            if (!w) { alert('浏览器阻止了新窗口，请允许弹窗后重试'); return; }
            w.document.write(buildExportHTML(c));
            w.document.close();
            w.focus();
            setTimeout(function() { w.print(); }, 600);
        }
        /* ---- 错题本导出：与课件导出相同的全部格式（HTML / Word / Excel / PPT单页 / PPT两页 / 打印） ---- */
        var WRONG_TYPE_LABEL = { fill: '填空题', single: '单项选择题', multiple: '多项选择题', judge: '判断题', essay: '问答与思辨', verse: '经文诵读' };
        function wrongTypeNum(x) {
            var parts = [];
            var tl = WRONG_TYPE_LABEL[x.type] || x.type || '';
            if (tl) parts.push(tl);
            if (x.n) parts.push('第' + x.n + '题');
            return parts.join(' · ');
        }
        function wrongMeta(x) {
            return [x.series, x.sub, x.title].filter(function(s) { return s; }).join(' · ');
        }
        function wrongDateStr() {
            var now = new Date();
            return now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
        }
        function wrongBookName() {
            var nm = "";
            try { nm = progName(); } catch (e) {}
            return nm || tr("wbAnon");
        }
        function openWrongExportMenu() {
            var m = document.getElementById('wrongExportModal');
            if (!m) {
                m = document.createElement('div');
                m.id = 'wrongExportModal';
                m.style.cssText = 'position:fixed;inset:0;z-index:130;display:none;align-items:center;justify-content:center;padding:16px;';
                var btn = 'style="border:1px solid #e2e8f0;border-radius:16px;padding:12px;font-size:14px;font-weight:700;color:#334155;background:#fff"';
                m.innerHTML = '<div style="position:absolute;inset:0;background:rgba(15,23,42,.5)" onclick="closeWrongExportMenu()"></div>'
                    + '<div style="position:relative;background:#fff;border-radius:24px;padding:24px;width:100%;max-width:340px;box-shadow:0 25px 50px rgba(0,0,0,.25)">'
                    + '<h3 id="wrongExportTitle" style="font-weight:800;color:#1e293b;margin:0 0 4px">📥 导出错题本</h3>'
                    + '<p id="wrongExportSub" style="font-size:12px;color:#94a3b8;margin:0 0 16px"></p>'
                    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
                    + '<button data-fmt="html" onclick="doWrongExport(this.dataset.fmt)" ' + btn + '>📄<br>网页 HTML</button>'
                    + '<button data-fmt="word" onclick="doWrongExport(this.dataset.fmt)" ' + btn + '>📝<br>Word 文档</button>'
                    + '<button data-fmt="excel" onclick="doWrongExport(this.dataset.fmt)" ' + btn + '>📊<br>Excel 表格</button>'
                    + '<button data-fmt="pptx1" onclick="doWrongExport(this.dataset.fmt)" ' + btn + '>📽️<br>PPT 单页版<br><span style="font-size:11px;font-weight:400;color:#94a3b8">自设动画</span></button>'
                    + '<button data-fmt="pptx2" onclick="doWrongExport(this.dataset.fmt)" ' + btn + '>📽️<br>PPT 两页版<br><span style="font-size:11px;font-weight:400;color:#94a3b8">翻页揭示</span></button>'
                    + '</div>'
                    + '<button data-fmt="print" onclick="doWrongExport(this.dataset.fmt)" style="margin-top:8px;width:100%;border:1px solid #e2e8f0;border-radius:16px;padding:12px;font-size:14px;font-weight:700;color:#334155;background:#fff">🖨️ 打印 / 存为 PDF</button>'
                    + '<button id="wrongExportCancel" onclick="closeWrongExportMenu()" style="margin-top:4px;width:100%;font-size:12px;color:#94a3b8;padding:8px;background:none;border:none">取消</button>'
                    + '</div>';
                document.body.appendChild(m);
            }
            var fc = window._wrongCourseId || null;
            var arr = getWrong()[wrongBookName()] || [];
            if (fc) arr = arr.filter(function(x) { return x.cid === fc; });
            document.getElementById('wrongExportTitle').innerText = tr("expWrongT");
            document.getElementById('wrongExportCancel').innerText = tr("cancel");
            document.getElementById('wrongExportSub').innerText = tf("wbExpSub", { name: wrongBookName(), n: arr.length }) + (fc ? tr("wbScopeOne") : tr("wbScopeAll"));
            m.style.display = 'flex';
        }
        function closeWrongExportMenu() {
            var m = document.getElementById('wrongExportModal');
            if (m) m.style.display = 'none';
        }
        function doWrongExport(fmt) {
            closeWrongExportMenu();
            var name = wrongBookName();
            var arr = getWrong()[name] || [];
            var fc = window._wrongCourseId || null;
            if (fc) arr = arr.filter(function(x) { return x.cid === fc; });
            if (!arr.length) { alert(tr("wbEmptyAlert")); return; }
            var fn = safeFileName(name + '的错题本');
            var pptxMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            if (fmt === 'html') downloadHTML(fn + '.html', buildWrongHTML(name, arr));
            else if (fmt === 'word') downloadBytes(fn + '.docx', buildWrongDocx(name, arr), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            else if (fmt === 'excel') downloadBytes(fn + '.xlsx', buildWrongXlsx(name, arr), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            else if (fmt === 'pptx1') downloadBytes(fn + '-单页版.pptx', buildWrongPptx(name, arr, 'single'), pptxMime);
            else if (fmt === 'pptx2') downloadBytes(fn + '-两页版.pptx', buildWrongPptx(name, arr, 'dual'), pptxMime);
            else if (fmt === 'print') printWrongs(name, arr);
        }
        function buildWrongHTML(name, arr) {
            var ds = wrongDateStr();
            var body = arr.map(function(x, i) {
                return '<section class="card"><h2>第' + (i + 1) + '题 <span style="font-size:13px;color:#6366f1;">' + esc(wrongTypeNum(x)) + '</span></h2>'
                    + (wrongMeta(x) ? '<p style="font-size:12px;color:#94a3b8;margin:-8px 0 10px;">' + esc(wrongMeta(x)) + '</p>' : '')
                    + '<div class="md"><p>' + (x.type === 'verse' ? '<span class="verse-text">' + esc(stripVerseTag(x.q)) + '</span>' : esc(x.q || '')) + '</p>'
                    + '<p>' + tr("wbU") + '<b style="color:#dc2626;">' + esc(x.u || tr("wbNA")) + '</b></p>'
                    + '<p>' + tr("rightAns") + '<b style="color:#059669;">' + esc(x.expected || '') + '</b></p></div></section>';
            }).join('');
            return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
                + '<meta name="viewport" content="width=device-width,initial-scale=1">'
                + '<title>' + esc(name) + '的错题本 - 团契智学</title><style>' + EXP_CSS + '</style></head>'
                + '<body><div class="wrap"><header class="hero"><div class="meta">团契智学 · 错题本</div>'
                + '<h1>' + esc(name) + '的错题本</h1><div class="date">共' + arr.length + '题 · 导出日期：' + ds + '</div></header>'
                + body + '<footer>由团契智学学习平台导出</footer></div></body></html>';
        }
        function buildWrongWordHTML(name, arr) {
            var h = buildWrongHTML(name, arr);
            h = h.split('<!DOCTYPE html>').join('');
            h = h.split('<meta name="viewport" content="width=device-width,initial-scale=1">').join('');
            h = h.split('<html lang="zh-CN">').join('<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">');
            var p1 = h.split('<style>');
            var p2 = p1[1].split('</style>');
            h = p1[0] + '<style>' + WORD_CSS + '</style>' + p2[1];
            return h;
        }
        function buildWrongXlsx(name, arr) {
            var te = new TextEncoder();
            var rows = [], rn = 1;
            rows.push('<row r="' + (rn++) + '">' + xlsxCell('A1', name + '的错题本（共' + arr.length + '题）', 1) + '</row>');
            rows.push('<row r="' + rn + '">'
                + xlsxCell(xlsxCol(1)+rn, '序号', 3) + xlsxCell(xlsxCol(2)+rn, '系列', 3)
                + xlsxCell(xlsxCol(3)+rn, '子栏目', 3) + xlsxCell(xlsxCol(4)+rn, '课件', 3)
                + xlsxCell(xlsxCol(5)+rn, '题型', 3) + xlsxCell(xlsxCol(6)+rn, '题目', 3)
                + xlsxCell(xlsxCol(7)+rn, '你的答案', 3) + xlsxCell(xlsxCol(8)+rn, '正确答案', 3) + '</row>'); rn++;
            arr.forEach(function(x, i) {
                var qtext = x.type === 'verse' ? stripVerseTag(x.q) : (x.q || '');
                rows.push('<row r="' + rn + '">'
                    + xlsxCell(xlsxCol(1)+rn, String(i+1), 0)
                    + xlsxCell(xlsxCol(2)+rn, x.series || '', 0)
                    + xlsxCell(xlsxCol(3)+rn, x.sub || '', 0)
                    + xlsxCell(xlsxCol(4)+rn, x.title || '', 0)
                    + xlsxCell(xlsxCol(5)+rn, WRONG_TYPE_LABEL[x.type] || x.type || '', 0)
                    + xlsxRichCell(xlsxCol(6)+rn, verseSegs(docxStrip(qtext)), 0)
                    + xlsxCell(xlsxCol(7)+rn, x.u || '', 0)
                    + xlsxCell(xlsxCol(8)+rn, x.expected || '', 0)
                    + '</row>'); rn++;
            });
            var HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
            var contentTypes = HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                + '<Default Extension="xml" ContentType="application/xml"/>'
                + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                + '</Types>';
            var rels = HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                + '</Relationships>';
            var wbRels = HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
                + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                + '</Relationships>';
            var workbook = HEAD + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                + '<sheets><sheet name="错题本" sheetId="1" r:id="rId1"/></sheets></workbook>';
            var styles = HEAD + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                + '<fonts><font><sz val="11"/></font><font><b/><sz val="14"/><color rgb="FF1F4E79"/></font><font><sz val="11"/><color rgb="FF6D28D9"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><fill><patternFill><bgColor rgb="FF4F46E5"/></bgColor></patternFill></font></fonts>'
                + '<fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
                + '<borders><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
                + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
                + '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
                + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>'
                + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/>'
                + '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>';
            var sheet = HEAD + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                + '<cols><col min="1" max="1" width="8"/><col min="2" max="4" width="16"/><col min="5" max="5" width="14"/><col min="6" max="6" width="50"/><col min="7" max="8" width="24"/></cols>'
                + '<sheetData>' + rows.join('') + '</sheetData></worksheet>';
            var files = [
                {name: '[Content_Types].xml', data: te.encode(contentTypes)},
                {name: '_rels/.rels', data: te.encode(rels)},
                {name: 'xl/_rels/workbook.xml.rels', data: te.encode(wbRels)},
                {name: 'xl/workbook.xml', data: te.encode(workbook)},
                {name: 'xl/styles.xml', data: te.encode(styles)},
                {name: 'xl/worksheets/sheet1.xml', data: te.encode(sheet)},
            ];
            return zipStored(files);
        }
        function buildWrongExcelHTML(name, arr) {
            var trs = arr.map(function(x, i) {
                return '<tr><td>' + (i + 1) + '</td><td>' + esc(x.series || '') + '</td><td>' + esc(x.sub || '') + '</td><td>' + esc(x.title || '') + '</td>'
                    + '<td>' + esc(WRONG_TYPE_LABEL[x.type] || x.type || '') + '</td><td>' + esc(x.n || '') + '</td>'
                    + '<td>' + esc(x.type === 'verse' ? stripVerseTag(x.q) : (x.q || '')) + '</td><td>' + esc(x.u || '') + '</td><td>' + esc(x.expected || '') + '</td></tr>';
            }).join('');
            return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'
                + '<head><meta charset="utf-8"></head><body>'
                + '<h3>' + esc(name) + '的错题本（共' + arr.length + '题）</h3>'
                + '<table border="1" cellpadding="6" cellspacing="0"><tr><th>序号</th><th>系列</th><th>子栏目</th><th>课件</th><th>题型</th><th>题号</th><th>题目</th><th>你的答案</th><th>正确答案</th></tr>'
                + trs + '</table></body></html>';
        }
        function printWrongs(name, arr) {
            var w = window.open('', '_blank');
            if (!w) { alert(tr("popupBlocked")); return; }
            w.document.write(buildWrongHTML(name, arr));
            w.document.close();
            w.focus();
            setTimeout(function() { w.print(); }, 600);
        }
        function buildWrongPptx(name, arr, mode) {
            var te = new TextEncoder();
            var single = (mode === 'single');
            var slides = [{ t: [pptxPara(name + '的错题本', 4000, true)], b: [pptxPara('共' + arr.length + '题', 2000, false), pptxPara('团契智学', 1800, false)] }];
            arr.forEach(function(x, i) {
                var qParas = [pptxPara('【' + (WRONG_TYPE_LABEL[x.type] || x.type || '') + (x.n ? ' · 第' + x.n + '题' : '') + '】', 1800, true, '4F81BD')];
                if (wrongMeta(x)) qParas.push(pptxPara(wrongMeta(x), 1600, false, '64748B'));
                qParas.push(pptxPara(String(x.type === 'verse' ? stripVerseTag(x.q) : (x.q || '')), 1800, false));
                qParas.push(pptxPara(tr("wbU") + (x.u || tr("wbNA")), 1800, false, 'C0504D'));
                var ansParas = [pptxPara('【正确答案】', 1800, true, '047857'), pptxPara(String(x.expected || ''), 2000, false, '047857')];
                if (single) {
                    slides.push({ t: [pptxPara('第 ' + (i + 1) + ' 题', 3200, true)], b: qParas, a: ansParas });
                } else {
                    slides.push({ t: [pptxPara('第 ' + (i + 1) + ' 题', 3200, true)], b: qParas });
                    slides.push({ t: [pptxPara('第 ' + (i + 1) + ' 题 · 参考答案', 3200, true)], b: ansParas });
                }
            });
            var files = [];
            var addXml = function(nm, xml) { files.push({ name: nm, data: te.encode(xml) }); };
            var slideOverrides = slides.map(function(s, i) {
                return '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
            }).join('');
            addXml('[Content_Types].xml', PPTX_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' + slideOverrides + '</Types>');
            addXml('_rels/.rels', PPTX_ROOT_RELS);
            var sldIds = slides.map(function(s, i) { return '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>'; }).join('');
            addXml('ppt/presentation.xml', PPTX_HEAD + '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>' + sldIds + '</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>');
            var presRels = slides.map(function(s, i) { return '<Relationship Id="rId' + (i + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i + 1) + '.xml"/>'; }).join('');
            addXml('ppt/_rels/presentation.xml.rels', PPTX_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' + presRels + '</Relationships>');
            addXml('ppt/slideMasters/slideMaster1.xml', PPTX_MASTER);
            addXml('ppt/slideMasters/_rels/slideMaster1.xml.rels', PPTX_MASTER_RELS);
            addXml('ppt/slideLayouts/slideLayout1.xml', PPTX_LAYOUT);
            addXml('ppt/slideLayouts/_rels/slideLayout1.xml.rels', PPTX_LAYOUT_RELS);
            addXml('ppt/theme/theme1.xml', PPTX_THEME);
            slides.forEach(function(s, i) {
                addXml('ppt/slides/slide' + (i + 1) + '.xml', pptxSlideXml(s.t, s.b, s.a));
                addXml('ppt/slides/_rels/slide' + (i + 1) + '.xml.rels', PPTX_SLIDE_RELS);
            });
            return zipStored(files);
        }
        /* ---- PPTX 生成（无压缩 zip + 最小 Office Open XML） ---- */
        function xmlEsc(s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
        var CRC_T = null;
        function crc32Bytes(bytes) {
            if (!CRC_T) {
                CRC_T = new Int32Array(256);
                var n, k, cc;
                for (n = 0; n < 256; n++) {
                    cc = n;
                    for (k = 0; k < 8; k++) cc = (cc & 1) ? (0xEDB88320 ^ (cc >>> 1)) : (cc >>> 1);
                    CRC_T[n] = cc;
                }
            }
            var crc = 0xFFFFFFFF, i;
            for (i = 0; i < bytes.length; i++) crc = CRC_T[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
            return (crc ^ 0xFFFFFFFF) >>> 0;
        }
        function zipStored(files) {
            var te = new TextEncoder();
            var le16 = function(v) { return [v & 255, (v >> 8) & 255]; };
            var le32 = function(v) { return [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255]; };
            var chunks = [], central = [], offset = 0;
            files.forEach(function(f) {
                var nb = te.encode(f.name), data = f.data, crc = crc32Bytes(data);
                var lh = [0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
                    .concat(le32(crc), le32(data.length), le32(data.length), le16(nb.length), le16(0));
                var lhb = new Uint8Array(lh);
                chunks.push(lhb, nb, data);
                var ch = [0x50, 0x4B, 0x01, 0x02, 0x14, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
                    .concat(le32(crc), le32(data.length), le32(data.length), le16(nb.length), le16(0), le16(0), le16(0), le16(0), le32(0), le32(offset));
                central.push({ h: new Uint8Array(ch), n: nb });
                offset += lhb.length + nb.length + data.length;
            });
            var cs = offset, csize = 0;
            central.forEach(function(e) { chunks.push(e.h, e.n); csize += e.h.length + e.n.length; });
            var nf = files.length;
            var end = [0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00].concat(le16(nf), le16(nf), le32(csize), le32(cs), le16(0));
            chunks.push(new Uint8Array(end));
            var total = 0;
            chunks.forEach(function(x) { total += x.length; });
            var out = new Uint8Array(total), p = 0;
            chunks.forEach(function(x) { out.set(x, p); p += x.length; });
            return out;
        }
        var PPTX_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
        var PPTX_SLIDE_RELS = PPTX_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>';
        var PPTX_MASTER = PPTX_HEAD + '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400" b="1"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="2000"/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>';
        var PPTX_MASTER_RELS = PPTX_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>';
        var PPTX_LAYOUT = PPTX_HEAD + '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="titleAndContent" preserve="1"><p:cSld name="标题和内容"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="标题"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>标题</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="内容"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>内容</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
        var PPTX_LAYOUT_RELS = PPTX_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>';
        var PPTX_THEME = PPTX_HEAD + '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4><a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>';
        var PPTX_ROOT_RELS = PPTX_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>';
        function pptxRun(text, sz, bold, color) {
            var rpr = '<a:rPr lang="zh-CN" sz="' + sz + '"' + (bold ? ' b="1"' : '') + ' dirty="0"';
            if (color) rpr += '><a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill></a:rPr>';
            else rpr += '/>';
            return '<a:r>' + rpr + '<a:t xml:space="preserve">' + text + '</a:t></a:r>';
        }
        function pptxPara(text, sz, bold, color) {
            return '<a:p>' + pptxRun(xmlEsc(text), sz, bold, color) + '</a:p>';
        }
        /* 经文分段着色：引用紫色加粗，经文正文深琥珀色 */
        function pptxRichPara(text, sz) {
            var segs = verseSegs(esc(text));
            var runs = segs.map(function(sg) {
                // k:0普通|1书名|2经文|3章节|4图标
                var color = null, hl = null, bold = false;
                if (sg.k === 1) { color = 'FFFFFF'; hl = '7C3AED'; bold = true; }
                else if (sg.k === 2) { color = '92400E'; hl = 'FEF3C7'; bold = true; }
                else if (sg.k === 3) { color = '1D4ED8'; hl = 'EFF6FF'; bold = true; }
                else if (sg.k === 4) { color = 'FFFFFF'; hl = 'D97706'; bold = true; }
                return pptxRun(sg.t, sz, bold, color, hl);
            });
            return '<a:p>' + runs.join('') + '</a:p>';
        }
        function pptxAnswerParas(q) {
            var t = q.type || 'fill';
            var ans = expAnswer(q);
            if (!ans) return null;
            var GREEN = '047857', label = '答案', text = ans;
            if (t === 'single' || t === 'multiple') { label = '正确答案'; text = '✓ ' + ans; }
            else if (t === 'judge') { label = '判断结果'; }
            else if (t === 'fill') { label = '填空答案'; }
            else if (t === 'essay') { label = '参考答案'; }
            else if (t === 'verse') { label = '经文答案'; }
            return [pptxPara('【' + label + '】', 1800, true, GREEN), pptxPara(text, 2000, false, GREEN)];
        }
        function pptxShape(id, name, ph, x, y, cx, cy, paras) {
            return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="' + name + '"/><p:cNvSpPr/><p:nvPr>' + ph + '</p:nvPr></p:nvSpPr>'
                + '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>'
                + '<p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>' + paras.join('') + '</p:txBody></p:sp>';
        }
        function pptxSlideXml(titleParas, bodyParas, answerParas) {
            var hasAns = answerParas && answerParas.length;
            var bodyCy = hasAns ? 3000000 : 4521200;
            var shapes = pptxShape(2, '标题', '<p:ph type="title"/>', 685800, 342900, 10820400, 1143000, titleParas)
                + pptxShape(3, '内容', '<p:ph type="body" idx="1"/>', 685800, 1600200, 10820400, bodyCy, bodyParas);
            if (hasAns) {
                shapes += pptxShape(4, '答案', '', 685800, 4800200, 10820400, 1700000, answerParas);
            }
            return PPTX_HEAD + '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
                + '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
                + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
                + shapes + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
        }
        /* ---- 真正的 .docx 生成（ZIP+WordprocessingML，兼容移动Word） ---- */
        function docxEsc(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
        function docxStrip(s) {
            // 去markdown但保留下划线填空线
            return String(s || "").replace(/[#>*~]/g, "").replace(/\\s+/g, " ").trim();
        }
        function docxRun(text, opts) {
            opts = opts || {};
            var rPr = '';
            if (opts.bold) rPr += '<w:b/>';
            if (opts.italic) rPr += '<w:i/>';
            if (opts.color) rPr += '<w:color w:val="' + opts.color + '"/>';
            if (opts.size) rPr += '<w:sz w:val="' + opts.size + '"/>';
            if (opts.highlight) rPr += '<w:highlight w:val="' + opts.highlight + '"/>';
            if (opts.shd) rPr += '<w:shd w:fill="' + opts.shd + '" w:val="clear"/>';
            if (opts.underline) rPr += '<w:u w:val="single"/>';
            if (rPr) rPr = '<w:rPr>' + rPr + '</w:rPr>';
            return '<w:r>' + rPr + '<w:t xml:space="preserve">' + docxEsc(text) + '</w:t></w:r>';
        }
        function docxPara(text, opts) {
            opts = opts || {};
            var pPr = '';
            if (opts.style) pPr += '<w:pStyle w:val="' + opts.style + '"/>';
            if (opts.align) pPr += '<w:jc w:val="' + opts.align + '"/>';
            if (opts.pShd) pPr += '<w:shd w:fill="' + opts.pShd + '" w:val="clear"/>';
            if (opts.spacing) pPr += '<w:spacing w:after="' + opts.spacing + '"/>';
            if (opts.border) pPr += '<w:pBdr><w:left w:val="single" w:sz="12" w:color="' + opts.border + '"/></w:pBdr>';
            if (pPr) pPr = '<w:pPr>' + pPr + '</w:pPr>';
            var rPr = '';
            if (opts.bold) rPr += '<w:b/>';
            if (opts.color) rPr += '<w:color w:val="' + opts.color + '"/>';
            if (opts.size) rPr += '<w:sz w:val="' + opts.size + '"/>';
            if (opts.highlight) rPr += '<w:highlight w:val="' + opts.highlight + '"/>';
            if (rPr) rPr = '<w:rPr>' + rPr + '</w:rPr>';
            // 处理换行
            var runs = String(text).split('\\n').map(function(line, i, arr) {
                var t = '<w:t xml:space="preserve">' + docxEsc(line) + '</w:t>';
                if (i < arr.length - 1) t += '<w:br/>';
                return '<w:r>' + rPr + t + '</w:r>';
            }).join('');
            return '<w:p>' + pPr + runs + '</w:p>';
        }
        function buildDocx(c) {
            var te = new TextEncoder();
            var qs = [], guide = [];
            try { qs = JSON.parse(c.quizzes_json || '[]'); } catch (e) {}
            try { guide = JSON.parse(c.guide_json || '[]'); } catch (e) {}
            var title = c.title || '未命名课件';
            var meta = [c.category, c.subcategory].filter(function(x) { return x; }).join(' · ');
            var now = new Date(), ds = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
            var body = '';
            // 标题
            body += docxPara(title, {style: 'Heading1', align: 'center', pShd: 'EDE9FE'});
            body += docxPara(meta, {align: 'center', color: '6D28D9', size: '20', bold: true});
            body += docxPara('导出日期：' + ds + ' · 团契智学', {align: 'center', color: '808080', size: '18'});
            body += docxPara('', {});
            // 导读
            if (c.content) {
                body += docxPara('课程导读', {style: 'Heading2'});
                body += docxPara(stripMd(c.content || ''), {});
            }
            // 导览
            var realGuide = guide.filter(function(g) { return g && (g.title || (g.points || []).length); });
            if (realGuide.length) {
                body += docxPara('课程导览', {style: 'Heading2'});
                realGuide.forEach(function(g, gi) {
                    body += '<w:p><w:pPr><w:spacing w:before="80" w:after="40"/></w:pPr>'
                        + docxRun((gi + 1) + ' ', {bold: true, color: 'FFFFFF', shd: '4F46E5', size: '22'})
                        + docxRun(' ' + (g.title || ''), {bold: true, color: '4C1D95', size: '24'})
                        + '</w:p>';
                    (g.points || []).forEach(function(pt) {
                        if (String(pt).trim()) body += docxPara('  •  ' + stripMd(String(pt)), {color: '475569'});
                    });
                });
            }
            // 题目
            var order = ['verse', 'fill', 'single', 'multiple', 'judge', 'essay'], groups = {};
            qs.forEach(function(q) { var t = q.type || 'fill'; (groups[t] = groups[t] || []).push(q); });
            var TYPE_LABEL = {verse: '经文诵读', fill: '填空题', single: '单项选择题', multiple: '多项选择题', judge: '判断题', essay: '问答与思辨'};
            order.forEach(function(t) {
                var list = groups[t] || [];
                if (!list.length) return;
                body += docxPara((TYPE_LABEL[t] || t) + '（共' + list.length + '题）', {style: 'Heading2'});
                list.forEach(function(q, qi) {
                    var rawQ = q.q || '';
                    if (t === 'verse' && rawQ.charAt(0) === '【') {
                        var ce = rawQ.indexOf('】');
                        if (ce > 0 && ce < 12) rawQ = rawQ.slice(ce + 1);
                    }
                    // 经文出处徽章行
                    var ref = q.o || q.h || '';
                    if (t === 'verse' && ref) {
                        var refText = stripEmoji(ref);
                        var badgeHtml = '<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>'
                            + docxRun('📜 ', {})
                            + docxRun(refText, {bold: true, color: 'FFFFFF', shd: '7C3AED', size: '20'})
                            + '</w:p>';
                        body += badgeHtml;
                    }
                    var qtext = docxStrip(stripVerseTag(rawQ));
                    var bracket = (t === 'single' || t === 'multiple' || t === 'judge') ? '（ ）' : '';
                    // 题号+题干，多个run组合
                    var qp = '<w:p>';
                    if (t === 'verse') qp += '<w:pPr><w:shd w:fill="EFF6FF" w:val="clear"/><w:pBdr><w:left w:val="single" w:sz="18" w:color="3B82F6"/></w:pBdr><w:spacing w:after="80"/></w:pPr>';
                    else qp += '<w:pPr><w:spacing w:after="80"/></w:pPr>';
                    qp += docxRun((qi + 1) + '. ', {bold: true});
                    if (t === 'verse') {
                        qp += docxRun(qtext, {highlight: 'yellow', bold: true});
                    } else {
                        qp += docxRun(bracket + qtext, {bold: true});
                    }
                    qp += '</w:p>';
                    body += qp;
                    if (t === 'judge') {
                        body += docxPara('   √. 对', {color: '475569'});
                        body += docxPara('   ×. 错', {color: '475569'});
                    } else if ((t === 'single' || t === 'multiple') && q.o) {
                        var letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                        String(q.o).split(',').forEach(function(opt, oi) {
                            body += docxPara('   ' + (letters[oi] || '') + '. ' + String(opt).trim(), {color: '475569'});
                        });
                    }
                    // 问答题：按答案长度留白
                    if (t === 'essay') {
                        var ansLen = 0;
                        try { ansLen = String(expAnswer(q) || '').length; } catch (e) {}
                        var wsLines = Math.max(3, Math.min(15, Math.ceil(ansLen / 30)));
                        for (var wli = 0; wli < wsLines; wli++) {
                            body += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="999999"/></w:pBdr><w:spacing w:after="40"/></w:pPr><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>';
                        }
                    }
                });
            });
            // 参考答案
            if (qs.length) {
                body += docxPara('参考答案', {style: 'Heading1'});
                order.forEach(function(t) {
                    var list = groups[t] || [];
                    if (!list.length) return;
                    body += docxPara(TYPE_LABEL[t] || t, {bold: true});
                    list.forEach(function(q, qi) {
                        var ans = '';
                        try { ans = expAnswer(q) || ''; } catch (e) {}
                        body += docxPara((qi + 1) + '. ' + ans, {color: '047857'});
                    });
                });
            }
            var HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
            var contentTypes = HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                + '<Default Extension="xml" ContentType="application/xml"/>'
                + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
                + '</Types>';
            var rels = HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                + '</Relationships>';
            var docRels = HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
            var styles = HEAD + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                + '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1F4E79"/></w:rPr></w:style>'
                + '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="4C1D95"/></w:rPr></w:style>'
                + '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style>'
                + '</w:styles>';
            var document = HEAD + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                + '<w:body>' + body
                + '<w:sectPr><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
                + '</w:body></w:document>';
            var files = [
                {name: '[Content_Types].xml', data: te.encode(contentTypes)},
                {name: '_rels/.rels', data: te.encode(rels)},
                {name: 'word/_rels/document.xml.rels', data: te.encode(docRels)},
                {name: 'word/styles.xml', data: te.encode(styles)},
                {name: 'word/document.xml', data: te.encode(document)},
            ];
            return zipStored(files);
        }
        function buildWrongDocx(name, arr) {
            var te = new TextEncoder();
            var ds = wrongDateStr();
            var body = docxPara(name + '的错题本', {style: 'Heading1', align: 'center'});
            body += docxPara('共' + arr.length + '题 · ' + ds, {align: 'center', color: '808080', size: '20'});
            arr.forEach(function(x, i) {
                body += docxPara('第' + (i + 1) + '题 · ' + (WRONG_TYPE_LABEL[x.type] || x.type || ''), {style: 'Heading2'});
                if (wrongMeta(x)) body += docxPara(wrongMeta(x), {color: '808080', size: '20'});
                var qtext = x.type === 'verse' ? stripVerseTag(x.q) : (x.q || '');
                body += docxPara(stripMd(qtext), x.type === 'verse' ? {highlight: 'yellow'} : {});
                body += docxPara('你的答案：' + (x.u || '未作答'), {color: 'C0504D'});
                body += docxPara('正确答案：' + (x.expected || ''), {color: '047857'});
            });
            var HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
            var contentTypes = HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                + '<Default Extension="xml" ContentType="application/xml"/>'
                + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
                + '</Types>';
            var rels = HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                + '</Relationships>';
            var docRels = HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
            var styles = HEAD + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                + '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1F4E79"/></w:rPr></w:style>'
                + '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="4C1D95"/></w:rPr></w:style>'
                + '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style>'
                + '</w:styles>';
            var document = HEAD + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                + '<w:body>' + body
                + '<w:sectPr><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
                + '</w:body></w:document>';
            var files = [
                {name: '[Content_Types].xml', data: te.encode(contentTypes)},
                {name: '_rels/.rels', data: te.encode(rels)},
                {name: 'word/_rels/document.xml.rels', data: te.encode(docRels)},
                {name: 'word/styles.xml', data: te.encode(styles)},
                {name: 'word/document.xml', data: te.encode(document)},
            ];
            return zipStored(files);
        }
        /* ---- 真正的 .xlsx 生成 ---- */
        function xlsxEsc(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        function xlsxCell(ref, text, style) {
            var s = style ? ' s="' + style + '"' : '';
            return '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + xlsxEsc(text) + '</t></is></c>';
        }
        function xlsxRichCell(ref, segs, style) {
            var s = style ? ' s="' + style + '"' : '';
            var runs = segs.map(function(sg) {
                var rpr = '';
                if (sg.k === 1) rpr = '<rPr><b/><color rgb="FFFFFFFF"/><sz val="11"/></rPr>';
                else if (sg.k === 2) rpr = '<rPr><b/><color rgb="FF92400E"/><sz val="11"/></rPr>';
                else if (sg.k === 3) rpr = '<rPr><b/><color rgb="FF1D4ED8"/><sz val="11"/></rPr>';
                else if (sg.k === 4) rpr = '<rPr><b/><color rgb="FFFFFFFF"/><sz val="11"/></rPr>';
                else rpr = '<rPr><sz val="11"/></rPr>';
                return '<r>' + rpr + '<t xml:space="preserve">' + xlsxEsc(sg.t) + '</t></r>';
            }).join('');
            return '<c r="' + ref + '"' + s + ' t="inlineStr"><is>' + runs + '</is></c>';
        }
        function xlsxCol(n) {
            var s = '';
            while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
            return s;
        }
        function buildXlsx(c) {
            var te = new TextEncoder();
            var qs = [], guide = [];
            try { qs = JSON.parse(c.quizzes_json || '[]'); } catch (e) {}
            try { guide = JSON.parse(c.guide_json || '[]'); } catch (e) {}
            var rows = [];
            var rn = 1;
            // 标题行
            rows.push('<row r="' + (rn++) + '">' + xlsxCell('A1', c.title || '', 1) + '</row>');
            rows.push('<row r="' + (rn++) + '">' + xlsxCell('A2', [c.category, c.subcategory].filter(function(x){return x;}).join(' · '), 2) + '</row>');
            rows.push('<row r="' + (rn++) + '"></row>');
            // 导览
            var realGuide = guide.filter(function(g) { return g && (g.title || (g.points || []).length); });
            if (realGuide.length) {
                rows.push('<row r="' + rn + '">' + xlsxCell(xlsxCol(1)+rn, '课程导览', 1) + '</row>'); rn++;
                rows.push('<row r="' + rn + '">' + xlsxCell(xlsxCol(1)+rn, '序号', 3) + xlsxCell(xlsxCol(2)+rn, '章节', 3) + xlsxCell(xlsxCol(3)+rn, '要点', 3) + '</row>'); rn++;
                realGuide.forEach(function(g, gi) {
                    var pts = (g.points || []).filter(function(x){return String(x).trim();}).join('；');
                    rows.push('<row r="' + rn + '">' + xlsxCell(xlsxCol(1)+rn, String(gi+1), 0) + xlsxCell(xlsxCol(2)+rn, stripMd(g.title||''), 0) + xlsxRichCell(xlsxCol(3)+rn, verseSegs(stripMd(pts)), 0) + '</row>'); rn++;
                });
                rows.push('<row r="' + (rn++) + '"></row>');
            }
            // 题库表头
            var TYPE_PLAIN = {verse: '经文诵读', fill: '填空题', single: '单选题', multiple: '多选题', judge: '判断题', essay: '问答题'};
            rows.push('<row r="' + rn + '">' + xlsxCell(xlsxCol(1)+rn, '题库', 1) + '</row>'); rn++;
            rows.push('<row r="' + rn + '">'
                + xlsxCell(xlsxCol(1)+rn, '序号', 3) + xlsxCell(xlsxCol(2)+rn, '题型', 3)
                + xlsxCell(xlsxCol(3)+rn, '题目', 3) + xlsxCell(xlsxCol(4)+rn, '经文出处', 3)
                + xlsxCell(xlsxCol(5)+rn, '答案', 3) + '</row>'); rn++;
            qs.forEach(function(q, i) {
                var t = q.type || 'fill';
                var qq = q.q || '';
                if (t === 'verse' && qq.charAt(0) === '【') {
                    var ce = qq.indexOf('】');
                    if (ce > 0 && ce < 12) qq = qq.slice(ce + 1);
                }
                var ans = '';
                try { ans = expAnswer(q) || ''; } catch (e) {}
                var bracket = (t === 'single' || t === 'multiple' || t === 'judge') ? '（ ）' : '';
                rows.push('<row r="' + rn + '">'
                    + xlsxCell(xlsxCol(1)+rn, String(i+1), 0)
                    + xlsxCell(xlsxCol(2)+rn, TYPE_PLAIN[t] || t, 0)
                    + xlsxRichCell(xlsxCol(3)+rn, verseSegs(docxStrip(stripVerseTag(bracket + qq))), 0)
                    + xlsxRichCell(xlsxCol(4)+rn, verseSegs(stripEmoji(q.o || q.h || '')), 0)
                    + xlsxCell(xlsxCol(5)+rn, ans, 0)
                    + '</row>'); rn++;
            });
            var HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
            var contentTypes = HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                + '<Default Extension="xml" ContentType="application/xml"/>'
                + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                + '</Types>';
            var rels = HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                + '</Relationships>';
            var wbRels = HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
                + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                + '</Relationships>';
            var workbook = HEAD + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                + '<sheets><sheet name="题库" sheetId="1" r:id="rId1"/></sheets></workbook>';
            var styles = HEAD + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                + '<fonts><font><sz val="11"/></font><font><b/><sz val="14"/><color rgb="FF1F4E79"/></font><font><sz val="11"/><color rgb="FF6D28D9"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><fill><patternFill><bgColor rgb="FF4F46E5"/></bgColor></patternFill></font></fonts>'
                + '<fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
                + '<borders><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
                + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
                + '<cellXfs count="4">'
                + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
                + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>'
                + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/>'
                + '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0"/>'
                + '</cellXfs></styleSheet>';
            var sheet = HEAD + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                + '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
                + '<cols><col min="1" max="1" width="8"/><col min="2" max="2" width="14"/><col min="3" max="3" width="60"/><col min="4" max="4" width="22"/><col min="5" max="5" width="30"/></cols>'
                + '<sheetData>' + rows.join('') + '</sheetData></worksheet>';
            var files = [
                {name: '[Content_Types].xml', data: te.encode(contentTypes)},
                {name: '_rels/.rels', data: te.encode(rels)},
                {name: 'xl/_rels/workbook.xml.rels', data: te.encode(wbRels)},
                {name: 'xl/workbook.xml', data: te.encode(workbook)},
                {name: 'xl/styles.xml', data: te.encode(styles)},
                {name: 'xl/worksheets/sheet1.xml', data: te.encode(sheet)},
            ];
            return zipStored(files);
        }
        function buildPptx(c, mode) {
            var qs = [];
            try { qs = JSON.parse(c.quizzes_json || '[]'); } catch (e) {}
            var te = new TextEncoder();
            var meta = [c.category, c.subcategory].filter(function(x) { return x; }).join(' · ');
            var slides = [{ t: [pptxPara(c.title || '未命名课件', 4000, true)], b: [pptxPara(meta, 2000, false), pptxPara('团契智学', 1800, false)] }];
            if (c.content) {
                var plain = stripMd(c.content);
                slides.push({ t: [pptxPara('课程导读', 3200, true)], b: [pptxPara(plain.slice(0, 1500), 1800, false)] });
            }
            var pGuide = [];
            try { pGuide = JSON.parse(c.guide_json || '[]'); } catch (e) {}
            pGuide.forEach(function(g, gi) {
                if (!g) return;
                var pts = (g.points || []).filter(function(x) { return String(x).trim(); });
                if (!g.title && !pts.length) return;
                slides.push({
                    t: [pptxPara('课程导览 · ' + (g.title || ('第' + (gi + 1) + '章')), 3200, true)],
                    b: pts.map(function(x) { return pptxRichPara('• ' + String(x).trim(), 1800); })
                });
            });
            var single = (mode === 'single');
            qs.forEach(function(q, i) {
                var t = q.type || 'fill';
                var bracket = (t === 'single' || t === 'multiple' || t === 'judge') ? '（ ）' : '';
                var lines = ['【' + (EXP_TYPE_PLAIN[t] || '') + '】' + bracket + (q.q || '')];
                if (t === 'judge') {
                    lines.push('√. 对'); lines.push('×. 错');
                } else if ((t === 'single' || t === 'multiple') && q.o) {
                    var letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                    String(q.o).split(',').forEach(function(o, oi) { lines.push((letters[oi] || '') + '. ' + String(o).trim()); });
                }
                var qParas = lines.map(function(ln) { return pptxRichPara(ln, 1800); });
                var ansParas = pptxAnswerParas(q);
                if (single) {
                    slides.push({
                        t: [pptxPara('第 ' + (i + 1) + ' 题', 3200, true)],
                        b: qParas,
                        a: ansParas
                    });
                } else {
                    slides.push({
                        t: [pptxPara('第 ' + (i + 1) + ' 题', 3200, true)],
                        b: qParas
                    });
                    if (ansParas) {
                        slides.push({
                            t: [pptxPara('第 ' + (i + 1) + ' 题 · 参考答案', 3200, true)],
                            b: ansParas
                        });
                    }
                }
            });
            var files = [];
            var addXml = function(name, xml) { files.push({ name: name, data: te.encode(xml) }); };
            var slideOverrides = slides.map(function(s, i) {
                return '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
            }).join('');
            addXml('[Content_Types].xml', PPTX_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' + slideOverrides + '</Types>');
            addXml('_rels/.rels', PPTX_ROOT_RELS);
            var sldIds = slides.map(function(s, i) { return '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>'; }).join('');
            addXml('ppt/presentation.xml', PPTX_HEAD + '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>' + sldIds + '</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>');
            var presRels = slides.map(function(s, i) { return '<Relationship Id="rId' + (i + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i + 1) + '.xml"/>'; }).join('');
            addXml('ppt/_rels/presentation.xml.rels', PPTX_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' + presRels + '</Relationships>');
            addXml('ppt/slideMasters/slideMaster1.xml', PPTX_MASTER);
            addXml('ppt/slideMasters/_rels/slideMaster1.xml.rels', PPTX_MASTER_RELS);
            addXml('ppt/slideLayouts/slideLayout1.xml', PPTX_LAYOUT);
            addXml('ppt/slideLayouts/_rels/slideLayout1.xml.rels', PPTX_LAYOUT_RELS);
            addXml('ppt/theme/theme1.xml', PPTX_THEME);
            slides.forEach(function(s, i) {
                addXml('ppt/slides/slide' + (i + 1) + '.xml', pptxSlideXml(s.t, s.b, s.a));
                addXml('ppt/slides/_rels/slide' + (i + 1) + '.xml.rels', PPTX_SLIDE_RELS);
            });
            return zipStored(files);
        }

        /* 教师管理密码门（服务端会话） */
