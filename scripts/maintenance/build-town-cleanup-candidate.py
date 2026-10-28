"""Apply this request's scoped delta to the live files; preserve unrelated shell changes."""
from pathlib import Path
import json,hashlib,difflib,shutil,re
ROOT=Path(__file__).resolve().parents[2];STAGE=Path('/tmp/town-cleanup-release');BASE=Path('/tmp/town-clean-baseline/public');PUBLIC=ROOT/'public'
sha=lambda b:hashlib.sha256(b).hexdigest()
checked=json.loads((ROOT/'docs/product/town-cleanup-review-2026-10-18/source-manifest.json').read_text())
for file,digest in checked.items():assert sha((PUBLIC/file).read_bytes())==digest,file+' changed after checks'
live=json.loads((STAGE/'live-manifest.json').read_text());candidate=STAGE/'candidate';candidate.mkdir(exist_ok=True)
existing=['index.html','town-spatial.css','js/town-spatial.js','js/town-avatar.js','js/player-status-shortcut.js']
patch=''
for file in existing:
 before=(BASE/file).read_text();after=(PUBLIC/file).read_text()
 production=(STAGE/'before'/file).read_text()
 if file=='index.html':
  style=re.findall(r'href="/styles\.css\?[^\"]+"',production);assert len(style)==1
  security=re.findall(r'^.*<link[^\n]+/classroom-securities\.css[^\n]+\n',production,re.M);assert len(security)==1
  def preserve_external(text):
   text=re.sub(r'href="/styles\.css\?[^\"]+"',lambda _:style[0],text)
   text=re.sub(r'^.*<link[^\n]+/classroom-securities\.css[^\n]+\n','',text,flags=re.M)
   return text.replace('</head>',security[0]+'</head>',1)
  before=preserve_external(before);after=preserve_external(after)
 assert before==production,file+' unexpected live/local difference; review before proceeding'
 (candidate/file).parent.mkdir(parents=True,exist_ok=True);(candidate/file).write_text(after)
 patch+=''.join(difflib.unified_diff(production.splitlines(True),after.splitlines(True),fromfile='a/'+file,tofile='b/'+file))
for file in checked:
 if file in existing:continue
 assert '/'+file not in live['files'],'New icon already exists: '+file
 (candidate/file).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(PUBLIC/file,candidate/file)
raw={file:sha((candidate/file).read_bytes()) for file in checked}
(STAGE/'candidate-manifest.json').write_text(json.dumps({'source':live['source'],'rawHashes':raw},indent=2)+'\n')
(STAGE/'candidate.patch').write_text(patch)
print(json.dumps({'source':live['source'],'changed':list(raw),'fullBundle':'unchanged live file','candidate':str(candidate)}))
