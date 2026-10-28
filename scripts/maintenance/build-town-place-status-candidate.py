"""Patch only this request's module deltas into the latest Hosting release."""
from pathlib import Path
import json,hashlib,difflib,shutil,subprocess,re
ROOT=Path(__file__).resolve().parents[2];BASE=Path('/tmp/town-place-status-baseline/public');STAGE=Path('/tmp/town-place-status-release');PUBLIC=ROOT/'public'
sha=lambda b:hashlib.sha256(b).hexdigest()
checked=json.loads((ROOT/'docs/product/town-place-status-review-2026-10-18/source-manifest.json').read_text())
for f,h in checked.items():assert sha((PUBLIC/f).read_bytes())==h,'Changed since check: '+f
live=json.loads((STAGE/'live-manifest.json').read_text());candidate=STAGE/'candidate';candidate.mkdir(exist_ok=True)
modules=['js/features/home-render.js','js/features/home-controller.js','js/features/home-data.js','js/features/quiz-play.js','js/data/level-medal-assets.js']
patched=['town-spatial.css','js/town-spatial.js','js/player-status-shortcut.js','player-status/index.html','player-status/status.js','player-status/style.css']+modules
for f in patched+['index.html','js/app.bundle.js']:
 (candidate/f).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(STAGE/'before'/f,candidate/f)
patch=''
for f in patched:patch+=''.join(difflib.unified_diff((BASE/f).read_text().splitlines(True),(PUBLIC/f).read_text().splitlines(True),fromfile='a/'+f,tofile='b/'+f))
(STAGE/'scoped.patch').write_text(patch)
subprocess.run(['git','apply','--check',str(STAGE/'scoped.patch')],cwd=candidate,check=True)
subprocess.run(['git','apply',str(STAGE/'scoped.patch')],cwd=candidate,check=True)
# Index contains concurrent product work: change only our four cache references.
shell=(candidate/'index.html').read_text()
for f in ['town-spatial.css','js/town-spatial.js','js/player-status-shortcut.js','js/app.bundle.js']:
 shell,count=re.subn(r'(/'+re.escape(f)+r'\?v=)[^"\s]+',r'\g<1>places-20261018',shell);assert count==1,f
(candidate/'index.html').write_text(shell)
bundle=(candidate/'js/app.bundle.js').read_text()
def span(text,f):
 marker=f'/* /{f} */\n';end=f'\n//# sourceURL=/{f}';assert text.count(marker)==text.count(end)==1
 start=text.index(marker)+len(marker);return start,text.index(end,start)
for f in modules:
 start,end=span(bundle,f);assert bundle[start:end].rstrip()==(STAGE/'before'/f).read_text().rstrip(),'Live module mismatch: '+f
 bundle=bundle[:start]+(candidate/f).read_text().rstrip()+bundle[end:]
def excluded(text):
 for f in modules:
  start,end=span(text,f);text=text[:start]+text[end:]
 return text
assert excluded(bundle)==excluded((STAGE/'before/js/app.bundle.js').read_text())
(candidate/'js/app.bundle.js').write_text(bundle)
for f in checked:
 if f in patched+['index.html','js/app.bundle.js']:continue
 assert '/'+f not in live['files'],'Unexpected existing asset: '+f
 (candidate/f).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(PUBLIC/f,candidate/f)
raw={f:sha((candidate/f).read_bytes()) for f in checked}
(STAGE/'candidate-manifest.json').write_text(json.dumps({'source':live['source'],'rawHashes':raw},indent=2))
fullpatch=''
for f in ['index.html']+patched:fullpatch+=''.join(difflib.unified_diff((STAGE/'before'/f).read_text().splitlines(True),(candidate/f).read_text().splitlines(True),fromfile='a/'+f,tofile='b/'+f))
(STAGE/'candidate.patch').write_text(fullpatch)
print(json.dumps({'source':live['source'],'files':len(raw),'preservedBundleModules':75,'candidate':str(candidate)}))
