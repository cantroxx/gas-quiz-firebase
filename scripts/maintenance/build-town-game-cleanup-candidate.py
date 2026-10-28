from pathlib import Path
import json,hashlib,difflib,shutil,subprocess,re
ROOT=Path(__file__).resolve().parents[2];S=Path('/tmp/town-game-cleanup-release');B=Path('/tmp/town-game-cleanup-baseline/public');P=ROOT/'public';C=S/'candidate';C.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
checked=json.loads((ROOT/'docs/product/town-game-cleanup-review-2026-10-18/source-manifest.json').read_text())
for f,h in checked.items():assert sha((P/f).read_bytes())==h,'Source changed: '+f
live=json.loads((S/'live-manifest.json').read_text())
for f in checked:
 (C/f).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(S/'before'/f,C/f)
patched=['player-status/style.css','player-status/index.html','js/player-status-shortcut.js','mathsurvivor/game.js','mathsurvivor/style.css','js/school-rooms.js']
patch=''
for f in patched:patch+=''.join(difflib.unified_diff((B/f).read_text().splitlines(True),(P/f).read_text().splitlines(True),fromfile='a/'+f,tofile='b/'+f))
(S/'scoped.patch').write_text(patch);subprocess.run(['git','apply','--check',str(S/'scoped.patch')],cwd=C,check=True);subprocess.run(['git','apply',str(S/'scoped.patch')],cwd=C,check=True)
# Keep the live popular quiz implementation; remove only its map notice creation.
f='js/features/quiz-render.js';t=(C/f).read_text();a=t.index("      if(viewModel.subjectId === 'popular') {");b=t.index('      item.appendChild(button);',a);t=t[:a]+t[b:];(C/f).write_text(t)
# Keep built game entries and their existing asset hashes; remove only the shared overlay.
for f in ['mathsurvivor/index.html','battle/index.html','cloud-tower/index.html','word-bomb/index.html','town-marble/index.html']:
 t=(C/f).read_text();t,n=re.subn(r'^[ \t]*<script[^\n]*player-status-shortcut\.js[^\n]*</script>\n','',t,flags=re.M);assert n==1,f
 if f=='mathsurvivor/index.html':
  for asset in ['style.css','game.js']:t,n=re.subn(re.escape(asset)+r'\?v=[^"\s]+',asset+'?v=10',t);assert n==1
  t=t.replace('id="quizUnit">4학년 · 각도','id="quizUnit">문제 준비 중')
 if f=='battle/index.html':
  assert '<b>스터디 타운</b>' in t;t=t.replace('<b>스터디 타운</b>','<b>균열의 탑</b>');t=t.replace('균열의 탑 생존 액션 · 스타라이트 아이돌 육성 — 분수로 여는 두 세계','문제를 풀고 무기와 유물을 모으며 도전하는 생존 액션 게임')
 (C/f).write_text(t)
t=(C/'index.html').read_text()
for f in ['js/app.bundle.js','js/school-rooms.js','js/player-status-shortcut.js']:
 t,n=re.subn(r'(/'+re.escape(f)+r'\?v=)[^"\s]+',r'\g<1>readable-games-20261018',t);assert n==1,f
(C/'index.html').write_text(t)
f='js/features/quiz-render.js';bundle=(C/'js/app.bundle.js').read_text();mark=f'/* /{f} */\n';a=bundle.index(mark)+len(mark);b=bundle.index(f'\n//# sourceURL=/{f}',a);assert bundle[a:b].rstrip()==(S/'before'/f).read_text().rstrip();(C/'js/app.bundle.js').write_text(bundle[:a]+(C/f).read_text().rstrip()+bundle[b:])
raw={f:sha((C/f).read_bytes()) for f in checked};(S/'candidate-manifest.json').write_text(json.dumps({'source':live['source'],'rawHashes':raw},indent=2));print(json.dumps({'files':len(raw),'source':live['source'],'changedBundleModules':1}))
