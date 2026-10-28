#!/usr/bin/env python3
"""Rebase only the reviewed administrator delta onto each live snapshot."""
from pathlib import Path
import re,json,difflib,shutil,hashlib,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[2]
S=Path('/tmp/admin-refresh-deploy-20261021')
BASE=Path('/tmp/admin-refresh-20261019-baseline')
def write(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def delta(old,new,live,label):
    a=old.splitlines(keepends=True);b=new.splitlines(keepends=True)
    for group in difflib.SequenceMatcher(None,a,b,autojunk=False).get_grouped_opcodes(3):
        before=''.join(a[group[0][1]:group[-1][2]]);after=''.join(b[group[0][3]:group[-1][4]])
        assert before and live.count(before)==1,(label,'ambiguous or changed live context')
        live=live.replace(before,after,1)
    return live
scope=json.loads((S/'scope.json').read_text());hashes={}
for f in scope['files']:
    if f=='js/app.bundle.js':continue
    live=(S/'hosting-before'/f).read_text()
    new=delta((BASE/'public'/f).read_text(),(ROOT/'public'/f).read_text(),live,f)
    if f=='index.html':
        for asset in ['/styles.css','/js/app.bundle.js','/js/special-rewards.js']:
            new,n=re.subn(re.escape(asset)+r'\?v=[^"\s]+',asset+'?v=admin-refresh-20261021',new);assert n==1,asset
    write(S/'candidate'/f,new)
bundle=(S/'hosting-before/js/app.bundle.js').read_text()
for f in ['js/features/admin-render.js','js/features/admin-controller.js','js/infrastructure/admin-repository.js']:
    marker='/* /'+f+' */\n';a=bundle.index(marker)+len(marker);b=bundle.index('//# sourceURL=/'+f,a)
    body=delta((BASE/'public'/f).read_text(),(ROOT/'public'/f).read_text(),bundle[a:b],f+' bundled')
    bundle=bundle[:a]+body+bundle[b:]
write(S/'candidate/js/app.bundle.js',bundle)
for f in scope['files']:
    hashes[f]=sha(S/'candidate'/f)
    if f.endswith('.js'):subprocess.run(['node','--check',str(S/'candidate'/f)],check=True)
write(S/'hosting-candidate.json',json.dumps({'source':json.loads((S/'hosting-before.json').read_text())['source'],'rawHashes':hashes},indent=2))
refs={'achievements/catalog.js':'getMemberAchievements','subject-quiz/curriculum.js':'subjectQuizAction','popular-quiz/domain.js':'popularQuizAction'}
for f,target in refs.items():assert (ROOT/'functions'/f).read_bytes()==(S/'reference'/target/'before'/f).read_bytes(),f
manifests={};archives={};changes={}
for target in scope['targets']:
    d=S/target;out=d/'release/functions';assert not out.exists(),'Already prepared'
    shutil.copytree(d/'before',out)
    if target.startswith('adminGet'):
        pattern=r'exports\.'+target+r' = onCall\([\s\S]*?\n\}\);'
        live=(out/'index.js').read_text();local=(ROOT/'functions/index.js').read_text();old=(BASE/'functions/index.js').read_text()
        assert re.search(pattern,live).group()==re.search(pattern,old).group(),target
        live=re.sub(pattern,lambda _:re.search(pattern,local).group(),live,count=1);write(out/'index.js',live)
        for f in ['admin-insights.js',*refs]:write(out/f,(ROOT/'functions'/f).read_text())
    else:
        f='growth/special-rewards.js'
        assert (out/f).read_bytes()==(BASE/'functions'/f).read_bytes(),target
        write(out/f,(ROOT/'functions'/f).read_text())
    manifest={p.relative_to(out).as_posix():sha(p) for p in out.rglob('*') if p.is_file()}
    before={p.relative_to(d/'before').as_posix():sha(p) for p in (d/'before').rglob('*') if p.is_file()}
    changed=[f for f in manifest if manifest[f]!=before.get(f)]
    assert set(before)<=set(manifest)
    allowed={'index.js','admin-insights.js',*refs} if target.startswith('adminGet') else {'growth/special-rewards.js'}
    assert set(changed)<=allowed,(target,changed)
    with zipfile.ZipFile(d/'candidate.zip','w',zipfile.ZIP_DEFLATED) as z:
        for f in manifest:z.write(out/f,f)
    manifests[target]=manifest;archives[target]=sha(d/'candidate.zip');changes[target]=changed
    (out/'node_modules').symlink_to(ROOT/'functions/node_modules',target_is_directory=True)
    subprocess.run(['node','--check',str(out/'index.js')],check=True)
write(S/'function-manifests.json',json.dumps(manifests,indent=2));write(S/'archive-hashes.json',json.dumps(archives,indent=2));write(S/'changes.json',json.dumps(changes,indent=2))
print(json.dumps({'hosting':list(hashes),'functions':changes},indent=2))
