"""Prepare scoped local candidates from verified 2026-10-18 live source snapshots. No deployment.
Requires /tmp/quiz-cleanup-followup-20261018 source archives and the documented initial baseline.
"""
from pathlib import Path
import zipfile,re,shutil,json,difflib,hashlib,subprocess
root=Path.cwd();base=Path('/tmp/quiz-cleanup-followup-20261018');frozen=base/'verified-snapshot'
assert frozen.exists(), 'Restore the verified scoped patch snapshot first; do not include concurrent workspace edits.'
expected_hashes={}
for name in ['QUIZ_CLEANUP_VERIFICATION_2026-10-18.json','QUIZ_CLEANUP_FOLLOWUP_VERIFICATION_2026-10-18.json']:
 for row in json.loads((root/'docs/operations'/name).read_text())['files']:expected_hashes[row['path']]=row['afterSha256']
def verified(rel):
 p=frozen/rel if (frozen/rel).exists() else root/rel
 assert hashlib.sha256(p.read_bytes()).hexdigest()==expected_hashes[rel], 'Source drift: '+rel
 return p
current=verified('functions/index.js').read_text();initial=Path('/tmp/quiz-cleanup-stages-20261018/baseline/functions/index.js').read_text();rows=[]
for ident in ['subjectQuizAction','popularQuizAction','grantPracticeReward','grantRankingCompleteXp','adminGetQuizQualityAudit']:
 dst=base/'candidates'/ident/'functions';dst.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(base/(ident+'.zip')) as z:
  for name in z.namelist():
   path=Path(name)
   if path.is_absolute() or '..' in path.parts:raise ValueError('Unsafe archive path')
   if name.endswith('/') or any(part.startswith('.env') or part=='node_modules' for part in path.parts):continue
   target=dst/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(name))
 live=(dst/'index.js').read_text();candidate=live
 if ident in ['subjectQuizAction','popularQuizAction','grantPracticeReward']:
  names=['grantPracticeRewardInTransaction']+(['rewardGeneratedSubjectAnswer'] if ident=='subjectQuizAction' else [])
  patterns=[r'^(?:async )?function '+name+r'\([\s\S]*?^\}' for name in names]
 else:patterns=[r'^exports\.'+ident+r'\s*=\s*onCall\([\s\S]*?^\}\);']
 for pattern in patterns:
  old=re.search(pattern,candidate,re.M);expected=re.search(pattern,initial,re.M);new=re.search(pattern,current,re.M)
  assert old and expected and new,ident
  assert old.group()==expected.group(),ident+' live section does not match baseline'
  candidate=candidate[:old.start()]+new.group()+candidate[old.end():]
 (dst/'index.js').write_text(candidate)
 extras={'subjectQuizAction':['subject-quiz/service.js'],'popularQuizAction':['popular-quiz/catalog.json'],'adminGetQuizQualityAudit':['quiz-quality-scope.js']}.get(ident,[])
 for rel in extras:
  p=dst/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(verified('functions/'+rel),p)
 if not (dst/'node_modules').exists(): (dst/'node_modules').symlink_to(root/'functions/node_modules',target_is_directory=True)
 assert (dst/'node_modules').resolve()==(root/'functions/node_modules').resolve()
 subprocess.run(['node','--check',str(dst/'index.js')],check=True)
 patch=''.join(difflib.unified_diff(live.splitlines(True),candidate.splitlines(True),fromfile='live/'+ident+'/index.js',tofile='candidate/'+ident+'/index.js'))
 (base/'candidates'/ident/'index.patch').write_text(patch)
 rows.append({'function':ident,'sourceDirectory':str(dst),'changedFiles':['index.js']+extras,'indexSha256':hashlib.sha256(candidate.encode()).hexdigest(),'syntaxChecked':True})
# Create a scoped hosting candidate from the observed live files, not the local full tree.
host=base/'candidates/hosting';host.mkdir(parents=True,exist_ok=True)
old=Path('/tmp/quiz-cleanup-stages-20261018/baseline/public/index.html').read_text();new=verified('public/index.html').read_text();patch=''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/index.html',tofile='b/index.html'))
(base/'candidates/hosting-index.patch').write_text(patch)
shutil.copyfile('/tmp/quiz-cleanup-public/index.html',host/'index.html')
subprocess.run(['patch','--fuzz=0',str(host/'index.html'),str(base/'candidates/hosting-index.patch')],check=True,stdout=subprocess.PIPE)
bundle=Path('/tmp/quiz-cleanup-public/js/app.bundle.js').read_text();mods=['js/features/admin-render.js','js/infrastructure/admin-repository.js','js/infrastructure/ranking-repository.js','js/application/ranking-usecases.js']
for rel in mods:
 pattern=r'/\* /'+re.escape(rel)+r' \*/\n([\s\S]*?)\n//# sourceURL=/'+re.escape(rel)
 m=re.search(pattern,bundle);assert m,rel
 baseline=Path('/tmp/quiz-cleanup-stages-20261018/baseline/public')/rel
 assert m.group(1)==baseline.read_text().rstrip(),rel+' live module differs'
 content=verified('public/'+rel).read_text();bundle=bundle[:m.start(1)]+content.rstrip()+bundle[m.end(1):]
 p=host/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(host/'js/app.bundle.js').write_text(bundle)
for entry in json.loads((root/'functions/popular-quiz/image-derivatives.json').read_text())['entries']:
 rel=entry['imageUrl'].lstrip('/');p=host/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/'public'/rel,p)
(base/'candidate-manifest.json').write_text(json.dumps({'functions':rows,'hostingDirectory':str(host),'hostingFiles':[str(p.relative_to(host)) for p in host.rglob('*') if p.is_file()],'releaseExecuted':False},indent=2)+'\n')
print('Prepared scoped candidates: five function source packages and hosting patch/assets. No deployment.')
