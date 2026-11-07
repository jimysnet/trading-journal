#!/usr/bin/env python3
"""Χτίζει το dist/ από το src/index.html, από οποιονδήποτε φάκελο (για την προγραμματισμένη εργασία).
Χρήση: python3 tools/build.py   → dist/index.html, app.js, i18n.js, manual.js, ru.js + εικόνες"""
import re, shutil, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S, D, A = os.path.join(R, 'src'), os.path.join(R, 'dist'), os.path.join(R, 'assets')
os.makedirs(D, exist_ok=True)
src = open(os.path.join(S, 'index.html'), encoding='utf-8').read()
names = ['i18n.js', 'manual.js', 'app.js']; k = [0]
def sub(m):
    n = names[k[0]]; k[0] += 1
    open(os.path.join(D, n), 'w', encoding='utf-8').write(m.group(1))
    return '<script src="' + n + '"></script>'
out = re.sub(r'<script>(.*?)</script>', sub, src, flags=re.S)
if k[0] != 3: sys.exit('περίμενα 3 inline <script> (χωρίς id), βρήκα %d' % k[0])
open(os.path.join(D, 'index.html'), 'w', encoding='utf-8').write(out)
shutil.copy(os.path.join(S, 'ru.js'), os.path.join(D, 'ru.js'))
for f in os.listdir(A): shutil.copy(os.path.join(A, f), os.path.join(D, f))
m = re.search(r'APP_VER=(\d+)', src)
print('APP_VER', m.group(1) if m else '?')
for f in sorted(os.listdir(D)):
    p = os.path.join(D, f)
    if os.path.isfile(p): print(f, os.path.getsize(p))
