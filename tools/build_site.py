#!/usr/bin/env python3
"""Φτιάχνει το site/ (για το Vercel) από το dist/ (το ίδιο build που ανεβαίνει στο claude.ai).
Προσθέτει: πλήρες HTML (doctype, charset, viewport), Firebase SDK και το shim.js πριν από τα scripts της σελίδας.
Χρήση:  python3 tools/build_site.py   (μετά το python3 tools/build.py)"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST, SITE, SRC = os.path.join(ROOT, 'dist'), os.path.join(ROOT, 'site'), os.path.join(ROOT, 'site-src')
FB = '10.14.1'

if os.path.isdir(SITE):
    shutil.rmtree(SITE)
os.makedirs(SITE)
for f in os.listdir(DIST):
    p = os.path.join(DIST, f)
    if os.path.isfile(p) and f != 'index.html':
        shutil.copy(p, os.path.join(SITE, f))
for f in os.listdir(SRC):
    shutil.copy(os.path.join(SRC, f), os.path.join(SITE, f))

html = open(os.path.join(DIST, 'index.html'), encoding='utf-8').read()
head = ('<!doctype html>\n<html lang="el">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="robots" content="noindex">\n<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ctext y=%27.9em%27 font-size=%2790%27%3E%F0%9F%93%92%3C/text%3E%3C/svg%3E">\n')
boot = (f'<script src="https://www.gstatic.com/firebasejs/{FB}/firebase-app-compat.js"></script>\n'
        f'<script src="https://www.gstatic.com/firebasejs/{FB}/firebase-auth-compat.js"></script>\n'
        f'<script src="https://www.gstatic.com/firebasejs/{FB}/firebase-firestore-compat.js"></script>\n'
        '<script src="shim.js"></script>\n')
first = re.search(r'<script src="(i18n|manual|app)\.js"></script>', html)
if not first:
    sys.exit('δεν βρέθηκαν τα scripts της σελίδας στο dist/index.html')
html = html[:first.start()] + boot + html[first.start():]
# Το claude.ai τυλίγει τη σελίδα· εδώ τη βάζουμε σε πλήρες έγγραφο
if '<body' not in html:
    html = head + html + '\n</html>\n'
else:
    html = head + html
open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(html)
print('site/ έτοιμο:', len(os.listdir(SITE)), 'αρχεία')
