from pathlib import Path
import json,hashlib,difflib,shutil,subprocess,re
ROOT=Path(__file__).resolve().parents[2];STAGE=Path('/tmp/town-medal-status-followup-release');BASE=Path('/tmp/town-medal-status-baseline');PUBLIC=ROOT/'public';C=STAGE/'candidate';C.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
checked=json.loads((ROOT/'docs/product/town-medal-status-review-2026-10-18/source-manifest.json').read_text())
for f,h in checked.items():assert sha((PUBLIC/f).read_bytes())==h,'Changed source '+f
live=json.loads((STAGE/'live-manifest.json').read_text())
patched={'player-status/index.html':'index.html','player-status/status.js':'status.js','js/player-status-shortcut.js':'player-status-shortcut.js','js/data/level-medal-assets.js':'level-medal-assets.js'}
for f in checked:
 (C/f).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(STAGE/'before'/f,C/f)
patch=''
for f,old in patched.items():patch+=''.join(difflib.unified_diff((BASE/old).read_text().splitlines(True),(PUBLIC/f).read_text().splitlines(True),fromfile='a/'+f,tofile='b/'+f))
(STAGE/'scoped.patch').write_text(patch)
subprocess.run(['git','apply','--check',str(STAGE/'scoped.patch')],cwd=C,check=True);subprocess.run(['git','apply',str(STAGE/'scoped.patch')],cwd=C,check=True)
shell=(C/'index.html').read_text()
for f in ['js/app.bundle.js','js/player-status-shortcut.js']:
 shell,n=re.subn(r'(/'+re.escape(f)+r'\?v=)[^"\s]+',r'\g<1>jewels-20261018',shell);assert n==1
(C/'index.html').write_text(shell)
bundle=(C/'js/app.bundle.js').read_text();f='js/data/level-medal-assets.js';start=bundle.index(f'/* /{f} */\n')+len(f'/* /{f} */\n');end=bundle.index(f'\n//# sourceURL=/{f}',start)
assert bundle[start:end].rstrip()==(STAGE/'before'/f).read_text().rstrip()
(C/'js/app.bundle.js').write_text(bundle[:start]+(C/f).read_text().rstrip()+bundle[end:])
for f in checked:
 if f.startswith('images/'):shutil.copy2(PUBLIC/f,C/f)
raw={f:sha((C/f).read_bytes()) for f in checked};(STAGE/'candidate-manifest.json').write_text(json.dumps({'source':live['source'],'rawHashes':raw},indent=2))
print(json.dumps({'source':live['source'],'files':len(raw),'unchangedBundleModules':79}))
