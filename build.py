#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
团契智学 worker.js 构建脚本

将 src/ 下的模块按正确顺序拼接，还原成单个 worker.js（用于 Cloudflare 部署）。

模块顺序（必须与原文件字节顺序一致）：
  src/worker.js
  src/shared/constants.js
  src/server/utils.js
  src/server/db.js       （含 /*@@AUTH@@*/ 占位，由 auth.js 填充）
  src/server/auth.js      → 填入 db.js 的占位处
  src/server/api.js
  src/client/template_head.js
  src/client/main.js     （含 /*@@I18N@@*/ 占位，由 i18n.js 填充）
  src/client/i18n.js      → 填入 main.js 的占位处
  src/client/export.js
  src/client/ui.js
  src/client/template_tail.js

用法：
  python3 build.py                 # 构建到 worker.js（覆盖）
  python3 build.py -o /tmp/out.js  # 构建到指定文件（用于验证）
  python3 build.py --check         # 验证构建输出与 worker.js 逐字节一致
"""

import os
import sys
import hashlib

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, 'src')

def read(rel):
    with open(os.path.join(SRC, rel), 'r', encoding='utf-8') as f:
        return f.read()

def build():
    worker_head = read('worker.js')
    constants = read('shared/constants.js')
    utils = read('server/utils.js')
    db = read('server/db.js')
    auth = read('server/auth.js')
    api = read('server/api.js')
    tpl_head = read('client/template_head.js')
    main = read('client/main.js')
    i18n = read('client/i18n.js')
    export = read('client/export.js')
    ui = read('client/ui.js')
    tpl_tail = read('client/template_tail.js')

    # 填充占位符（占位符独占一行，替换时连同换行一起处理）
    if '/*@@AUTH@@*/' not in db:
        raise RuntimeError('db.js 缺少 /*@@AUTH@@*/ 占位符')
    db = db.replace('/*@@AUTH@@*/\n', auth)

    if '/*@@I18N@@*/' not in main:
        raise RuntimeError('main.js 缺少 /*@@I18N@@*/ 占位符')
    main = main.replace('/*@@I18N@@*/\n', i18n)

    return ''.join([
        worker_head,
        constants,
        utils,
        db,
        api,
        tpl_head,
        main,
        export,
        ui,
        tpl_tail,
    ])

def main_cli():
    out = os.path.join(BASE, 'worker.js')
    check_only = False
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '-o' and i + 1 < len(args):
            out = args[i + 1]
            i += 2
        elif args[i] == '--check':
            check_only = True
            i += 1
        else:
            print(f'未知参数: {args[i]}', file=sys.stderr)
            sys.exit(2)

    built = build()

    if check_only:
        with open(os.path.join(BASE, 'worker.js'), 'r', encoding='utf-8') as f:
            original = f.read()
        if built == original:
            h = hashlib.sha256(built.encode('utf-8')).hexdigest()[:16]
            print(f'✓ 构建输出与 worker.js 逐字节一致 ({len(built)} 字节, sha256:{h})')
            sys.exit(0)
        else:
            # 找出第一个差异位置
            n = min(len(built), len(original))
            diff_at = next((j for j in range(n) if built[j] != original[j]), n)
            print(f'✗ 不一致！长度: 构建={len(built)} 原文件={len(original)}', file=sys.stderr)
            print(f'  首个差异在字符 {diff_at}:', file=sys.stderr)
            print(f'  构建: ...{built[max(0,diff_at-40):diff_at+40]!r}...', file=sys.stderr)
            print(f'  原文: ...{original[max(0,diff_at-40):diff_at+40]!r}...', file=sys.stderr)
            sys.exit(1)

    with open(out, 'w', encoding='utf-8') as f:
        f.write(built)
    print(f'✓ 已构建: {out} ({len(built)} 字节)')

if __name__ == '__main__':
    main_cli()
