"""Apply only the recorded UI delta to the downloaded live Hosting snapshot."""
from pathlib import Path
import subprocess, re, json, hashlib, difflib, shutil

ROOT = Path(__file__).resolve().parents[2]
STAGE = Path('/tmp/town-ui-release')
BASE = Path('/tmp/town-ui-20261018-baseline/public')
live = json.loads((STAGE/'live-manifest.json').read_text())
manifest = json.loads((ROOT/'docs/product/town-ui-review-2026-10-18/source-manifest.json').read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
for item in manifest['files']:
    rel = item['file'].removeprefix('public/')
    assert sha((BASE/rel).read_bytes()) == item['beforeSha256'], rel
    assert sha((ROOT/item['file']).read_bytes()) == item['afterSha256'], rel
    shutil.copy2(STAGE/'before'/rel, STAGE/'candidate'/rel)
subprocess.run(['git','apply','-p2','--exclude=index.html','--exclude=player-status/index.html',str(ROOT/'docs/product/town-ui-review-2026-10-18/scoped-source-changes.patch')],cwd=STAGE/'candidate',check=True)

# Live has the separately released securities stylesheet and current cache keys.
before = (STAGE/'before/index.html').read_text()
baseline = (BASE/'index.html').read_text()
after = (ROOT/'public/index.html').read_text()
def ref(text, pattern):
    matches = re.findall(pattern,text)
    assert len(matches)==1, pattern
    return matches[0]
style = ref(before,r'href="/styles\.css\?[^\"]+"')
security_links = re.findall(r'^.*<link[^\n]+/classroom-securities\.css[^\n]+\n',before,re.M)
assert len(security_links)==1
security = security_links[0]
def preserve_external(text):
    text = re.sub(r'href="/styles\.css\?[^\"]+"',lambda _:style,text)
    text = re.sub(r'^.*<link[^\n]+/classroom-securities\.css[^\n]+\n','',text,flags=re.M)
    return text.replace('</head>',security+'</head>',1)
baseline = preserve_external(baseline)
baseline = re.sub(r'src="/js/app\.bundle\.js\?[^\"]+"',lambda _:ref(before,r'src="/js/app\.bundle\.js\?[^\"]+"'),baseline)
assert baseline == before, 'Unexpected live shell change; review before proceeding'
(STAGE/'candidate/index.html').write_text(preserve_external(after))

before = (STAGE/'before/player-status/index.html').read_text()
baseline = (BASE/'player-status/index.html').read_text()
normalized = re.sub(r'(style\.css|status\.js)\?[^\"]+',r'\1',before)
assert normalized == baseline, 'Unexpected live status shell change'
shutil.copy2(ROOT/'public/player-status/index.html',STAGE/'candidate/player-status/index.html')

modules = ['js/features/home-render.js','js/data/place-details.js']
bundle = original = (STAGE/'before/js/app.bundle.js').read_text()
def swap(text,file,next_text,expected=None):
    marker=f'/* /{file} */\n';end=f'\n//# sourceURL=/{file}'
    assert text.count(marker)==1
    start=text.index(marker)+len(marker);finish=text.index(end,start)
    if expected is not None: assert text[start:finish].rstrip()==expected.rstrip(),file
    return text[:start]+next_text.rstrip()+text[finish:]
for file in modules:
    bundle=swap(bundle,file,(STAGE/'candidate'/file).read_text(),(STAGE/'before'/file).read_text())
strip=lambda text: swap(swap(text,modules[0],''),modules[1],'')
assert strip(bundle)==strip(original),'Unrelated bundle module changed'
(STAGE/'candidate/js/app.bundle.js').write_text(bundle)

new = ['town-ui-refresh.css','coordi-shop/storybook.css','images/town-ui-20261018/login-village-v1.webp','images/town-ui-20261018/boutique-room-v1.webp']
for file in new:
    assert '/'+file not in live['files'], 'New path already exists in live; review'
    target=STAGE/'candidate'/file;target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(ROOT/'public'/file,target)
changed=[x['file'].removeprefix('public/') for x in manifest['files']]+['js/app.bundle.js']+new
raw={file:sha((STAGE/'candidate'/file).read_bytes()) for file in changed}
(STAGE/'candidate-manifest.json').write_text(json.dumps({'source':live['source'],'rawHashes':raw},indent=2))
patch=[]
for file in changed:
    if file.endswith(('.js','.css','.html')) and (STAGE/'before'/file).exists():
        patch.extend(difflib.unified_diff((STAGE/'before'/file).read_text().splitlines(True),(STAGE/'candidate'/file).read_text().splitlines(True),fromfile='live/'+file,tofile='candidate/'+file))
(STAGE/'candidate.patch').write_text(''.join(patch))
print(json.dumps({'changed':changed,'source':live['source'],'preservedBundleModules':True},indent=2))
