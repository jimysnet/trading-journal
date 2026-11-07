import re,shutil,os
src=open('/home/claude/journal/index.html',encoding='utf-8').read()
names=['i18n.js','manual.js','app.js'];k=[0]
def sub(m):
    n=names[k[0]];k[0]+=1
    open('/home/claude/journal/dist/'+n,'w',encoding='utf-8').write(m.group(1))
    return '<script src="'+n+'"></script>'
out=re.sub(r'<script>(.*?)</script>',sub,src,flags=re.S)
assert k[0]==3,k
open('/home/claude/journal/dist/index.html','w',encoding='utf-8').write(out)
shutil.copy('/home/claude/journal/ru.js','/home/claude/journal/dist/ru.js')
for _f in ['prof.jpg','prof_face.jpg','prof_cut.webp','prof_head.webp','prof_body.webp','prof_head2.webp','prof_body2.webp','c2_body.webp','c2_smoke.webp','c2_face.jpg']+['fun_'+_n+'.webp' for _n in ['pizza', 'hotdog', 'icecream', 'coffee', 'souvlaki', 'donut', 'beer', 'cake', 'slap', 'stick', 'bat', 'water', 'tomato', 'pie', 'shoe']]: shutil.copy('/home/claude/journal/'+_f,'/home/claude/journal/dist/'+_f)
for f in sorted(os.listdir('/home/claude/journal/dist')):print(f,os.path.getsize('/home/claude/journal/dist/'+f))
