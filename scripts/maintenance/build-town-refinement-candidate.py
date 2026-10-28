"""Apply this request's baseline-to-local diff onto live; preserve all other modules/files."""
from pathlib import Path
import json, hashlib, difflib, shutil, subprocess
ROOT=Path(__file__).resolve().parents[2]
STAGE=Path('/tmp/town-refinement-release')
BASE=Path('/tmp/town-refine-baseline/public')
PUBLIC=ROOT/'public'
sha=lambda b:hashlib.sha256(b).hexdigest()
source=json.loads((ROOT/'docs/product/town-refinement-review-2026-10-18/source-manifest.json').read_text())
for file,digest in source.items(): assert sha((PUBLIC/file).read_bytes())==digest, file+' changed after check'
live=json.loads((STAGE/'live-manifest.json').read_text())
candidate=STAGE/'candidate';candidate.mkdir(exist_ok=True)
modules=['js/features/ranking-render.js','js/features/event-render.js','js/features/quiz-render.js']
patched=['town-spatial.css','js/town-spatial.js','js/school-rooms.js']+modules
for file in ['index.html','js/app.bundle.js']+patched:
    (candidate/file).parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(STAGE/'before'/file,candidate/file)
patch=''
for file in patched:
    patch+=''.join(difflib.unified_diff((BASE/file).read_text().splitlines(True),(PUBLIC/file).read_text().splitlines(True),fromfile='a/'+file,tofile='b/'+file))
(STAGE/'scoped.patch').write_text(patch)
subprocess.run(['git','apply','--check',str(STAGE/'scoped.patch')],cwd=candidate,check=True)
subprocess.run(['git','apply',str(STAGE/'scoped.patch')],cwd=candidate,check=True)
# Exact substitutions permit separately released stylesheets/cache keys elsewhere in the shell.
replacements=[
('/town-spatial.css?v=20261018','/town-spatial.css?v=refine-20261018'),
('  <script src="/js/town-spatial.js?v=20261018" defer></script>','  <script src="/js/town-avatar.js?v=20261018" defer></script>\n  <script src="/js/town-spatial.js?v=refine-20261018" defer></script>'),
('<a class="button hall-of-fame-link" href="/housing/?hall=1">🏛️ 하보 명예의 전당</a>',''),
('/js/app.bundle.js?v=town-ui-20261018','/js/app.bundle.js?v=town-refine-20261018'),
('/js/school-rooms.js?v=subject-depth-20261017','/js/school-rooms.js?v=town-refine-20261018')]
def shell_change(text):
    for old,new in replacements:
        assert text.count(old)==1,old
        text=text.replace(old,new)
    return text
assert shell_change((BASE/'index.html').read_text())==(PUBLIC/'index.html').read_text(),'Unrecorded shell change'
(candidate/'index.html').write_text(shell_change((STAGE/'before/index.html').read_text()))
# Replace only corresponding live module bodies, never the workspace's full bundle.
bundle=(STAGE/'before/js/app.bundle.js').read_text()
def range_for(text,file):
    marker=f'/* /{file} */\n';end=f'\n//# sourceURL=/{file}'
    assert text.count(marker)==1 and text.count(end)==1,file
    start=text.index(marker)+len(marker);finish=text.index(end,start)
    return start,finish
for file in modules:
    start,end=range_for(bundle,file)
    assert bundle[start:end].rstrip()==(STAGE/'before'/file).read_text().rstrip(),file+' live standalone/bundle mismatch'
    bundle=bundle[:start]+(candidate/file).read_text().rstrip()+bundle[end:]
def without_modules(text):
    for file in modules:
        start,end=range_for(text,file);text=text[:start]+text[end:]
    return text
assert without_modules(bundle)==without_modules((STAGE/'before/js/app.bundle.js').read_text())
(candidate/'js/app.bundle.js').write_text(bundle)
for file in ['js/town-avatar.js','images/town-spatial-20261018/school-v2.webp']:
    assert '/'+file not in live['files'],file+' already on live'
    (candidate/file).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(PUBLIC/file,candidate/file)
raw={file:sha((candidate/file).read_bytes()) for file in source}
(STAGE/'candidate-manifest.json').write_text(json.dumps({'source':live['source'],'rawHashes':raw},indent=2)+'\n')
fullpatch=''
for file in ['index.html']+patched:
    fullpatch+=''.join(difflib.unified_diff((STAGE/'before'/file).read_text().splitlines(True),(candidate/file).read_text().splitlines(True),fromfile='a/'+file,tofile='b/'+file))
(STAGE/'candidate.patch').write_text(fullpatch)
print(json.dumps({'source':live['source'],'changed':list(raw),'unrelatedBundleModules':'byte-identical','candidate':str(candidate)}))
