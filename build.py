"""Χτίζει το dist/ από το src/index.html: βγάζει τα 3 <script> σε i18n.js, manual.js, app.js."""
import re, shutil, os
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, DIST = os.path.join(ROOT, 'src', 'index.html'), os.path.join(ROOT, 'dist')
os.makedirs(os.path.join(DIST, 'agent'), exist_ok=True)
src = open(SRC, encoding='utf-8').read()
names = ['i18n.js', 'manual.js', 'app.js']; k = [0]
def sub(m):
    n = names[k[0]]; k[0] += 1
    open(os.path.join(DIST, n), 'w', encoding='utf-8').write(m.group(1))
    return '<script src="' + n + '"></script>'
out = re.sub(r'<script>(.*?)</script>', sub, src, flags=re.S)
assert k[0] == 3, k
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(out)
for f in ['prof.jpg', 'prof_face.jpg', 'prof_cut.webp']:
    shutil.copy(os.path.join(ROOT, 'assets', f), os.path.join(DIST, f))
for f in os.listdir(os.path.join(ROOT, 'agent')):
    shutil.copy(os.path.join(ROOT, 'agent', f), os.path.join(DIST, 'agent', f))
for f in sorted(os.listdir(DIST)):
    p = os.path.join(DIST, f)
    if os.path.isfile(p): print(f, os.path.getsize(p))
