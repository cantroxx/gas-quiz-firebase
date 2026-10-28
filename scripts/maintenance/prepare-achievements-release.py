#!/usr/bin/env python3
from pathlib import Path
import json,shutil,hashlib,zipfile,difflib,subprocess,re
R=Path(__file__).resolve().parents[2];S=Path('/tmp/achievements-deploy-20261019');scope=json.loads((S/'scope.json').read_text());local=(R/'functions/index.js').read_text()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
modules={'subjectQuizAction':'subject-quiz/service.js','popularQuizAction':'popular-quiz/service.js','studyTownAction':'study-town/service.js','townMarbleAction':'town-marble/service.js','cloudTowerAction':'cloud-tower/service.js','wordBombAction':'word-bomb/service.js','fruitBellAction':'fruit-bell/service.js','survivorQuestQuiz':'growth/survivor.js'}
manifests={}
for t in scope['targets']:
 d=S/t;out=d/'release/functions';shutil.copytree(d/'before',out,dirs_exist_ok=True);src=(out/'index.js').read_text()
 if t=='syncMemberTitles':
  a=src.index('function numberFromText(');b=src.index('exports.setSelectedMemberTitle =',a)
  src=src[:a]+local[local.index('function ownedTitleDoc('):local.index('exports.setSelectedMemberTitle =')]+src[b:]
 if t=='popularQuizAction':
  pattern=r'const popularQuizService =[\s\S]*?\n\}\);'
  old=re.search(pattern,src);new=re.search(pattern,local);assert old and new
  src=src[:old.start()]+new[0]+src[old.end():]
 write(out/'index.js',src)
 if t in modules:shutil.copyfile(R/'functions'/modules[t],out/modules[t])
 shutil.copytree(R/'functions/achievements',out/'achievements',dirs_exist_ok=True)
 changed=[]
 for p in out.rglob('*'):
  if p.is_file():
   f=str(p.relative_to(out));prior=d/'before'/f
   if not prior.exists() or sha(p)!=sha(prior):
    changed.append(f)
    if f.endswith('.js'):subprocess.run(['node','--check',str(p)],check=True)
    if prior.exists():write(d/(f.replace('/','_')+'.diff'),''.join(difflib.unified_diff(prior.read_text().splitlines(True),p.read_text().splitlines(True))))
 manifests[t]={str(p.relative_to(out)):sha(p) for p in out.rglob('*') if p.is_file()}
 with zipfile.ZipFile(d/'candidate.zip','w',zipfile.ZIP_DEFLATED) as z:
  for f in manifests[t]:z.write(out/f,f)
 print(t,changed)
write(S/'function-manifests.json',json.dumps(manifests,indent=2))
new=S/'new-functions';shutil.copytree(S/'syncMemberTitles/release/functions',new/'functions',dirs_exist_ok=True)
write(new/'firebase.json',json.dumps({'functions':{'source':'functions'}}))
(new/'functions/node_modules').symlink_to(R/'functions/node_modules',target_is_directory=True) if not (new/'functions/node_modules').exists() else None
bundle=(S/'hosting-before/js/app.bundle.js').read_text();raw={}
for f in scope['files']:
 if f=='js/app.bundle.js':continue
 src=(R/'public'/f).read_text();before=(S/'hosting-before'/f).read_text()
 if f=='index.html':
  a=before.splitlines(True);b=src.splitlines(True);out=[]
  for tag,i,j,k,l in difflib.SequenceMatcher(None,a,b).get_opcodes():
   if tag=='equal':out+=a[i:j];continue
   old=''.join(a[i:j]);new=''.join(b[k:l]);use=(i>2000 or '뱃지·연습 현황' in old) and old.strip()!=new.strip()
   out+=b[k:l] if use else a[i:j]
  src=''.join(out)
  for asset in ['styles.css','js/app.bundle.js']:
   src=re.sub(r'(/'+re.escape(asset)+r')(?:\?[^"<>]*)?(?=")',r'\1?v=achievements-20261019',src)
 if f=='styles.css':src=before+'\n'+src[src.index('/* Achievement title art'):]
 if f.startswith('js/'):
  marker='/* /'+f+' */\n';end='\n//# sourceURL=/'+f;a=bundle.index(marker)+len(marker);b=bundle.find(end,a)
  if b<0:b=bundle.index('\n/* /js/',a)
  bundle=bundle[:a]+src.rstrip()+bundle[b:]
 write(S/'candidate'/f,src);raw[f]=sha(S/'candidate'/f)
 write(S/'hosting-diffs'/(f.replace('/','_')+'.diff'),''.join(difflib.unified_diff(before.splitlines(True),src.splitlines(True))))
write(S/'candidate/js/app.bundle.js',bundle);raw['js/app.bundle.js']=sha(S/'candidate/js/app.bundle.js')
write(S/'hosting-candidate.json',json.dumps({'source':json.loads((S/'hosting-before.json').read_text())['source'],'rawHashes':raw},indent=2))
print('Hosting',len(raw),'targeted files; other live modules and files preserved')
