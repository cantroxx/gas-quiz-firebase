#!/usr/bin/env python3
"""Prepare narrowly scoped candidates from each function's own production source."""
from pathlib import Path
import json,re,shutil,hashlib,subprocess,zipfile,difflib
ROOT=Path(__file__).resolve().parents[2]; S=Path('/tmp/plaza-deploy-20261019')
scope=json.loads((S/'scope.json').read_text()); local=(ROOT/'functions/index.js').read_text()
def write(p,v):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(v)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def block(s,pattern):
 m=re.search(pattern,s,re.M);assert m,pattern;return m[0]
def replace(s,pattern):return s.replace(block(s,pattern),block(local,pattern),1)
manifests={}
for t in scope['targets']:
 d=S/t;out=d/'release/functions';shutil.copytree(d/'before',out,dirs_exist_ok=True);src=(out/'index.js').read_text();before=src
 changed=[]
 if t in ['getEventProgress','claimEventQuestReward','ingestGrowthActivity','ingestPracticeGrowth']:
  changed.append('growth/quests.js')
  src=replace(src,r'^const growthQuests =[\s\S]*?^\}\);')
 if t=='ingestPracticeGrowth':
  src=replace(src,r'^exports.ingestPracticeGrowth=[\s\S]*?^\}\);')
  # This deployed source already carries the current subject catalog.
  assert (out/'subject-quiz/curriculum.js').exists()
 if t=='grantPracticeReward':
  anchor='    const memberData = await assertLinkedMemberAuth(transaction, memberUserId, authUid);'
  start=src.index('async function grantPracticeRewardInTransaction(');pos=src.index(anchor,start)+len(anchor)
  guard=block(local,r"^    if\(!/\^subject-.*return \{ rewardCoin: 0, xpDelta: 0 \};$")
  src=src[:pos]+'\n'+guard+src[pos:]
 if t=='grantRankingCompleteXp':
  assert 'counts:{rankingComplete:1}' in src
  src=src.replace('counts:{rankingComplete:1}','counts:{rankingScore:Number(record.score)}')
 if t=='subjectQuizAction':
  assert 'item.complete ? {rankingComplete:1}' in src
  src=src.replace('item.complete ? {rankingComplete:1}','item.complete ? {rankingScore:item.score}')
  changed.append('subject-quiz/service.js')
 if t=='popularQuizAction':
  src=replace(src,r'^const popularQuizService =[\s\S]*?^\}\);');changed.append('popular-quiz/service.js')
 if t=='survivorQuestQuiz':changed.append('growth/survivor.js')
 if t=='wordBombAction':changed.append('word-bomb/service.js')
 write(out/'index.js',src)
 for f in changed:shutil.copyfile(ROOT/'functions'/f,out/f)
 write(d/'candidate.diff',''.join(difflib.unified_diff(before.splitlines(True),src.splitlines(True))))
 for f in ['index.js']+changed:subprocess.run(['node','--check',str(out/f)],check=True)
 manifests[t]={str(p.relative_to(out)):sha(p) for p in out.rglob('*') if p.is_file()}
 with zipfile.ZipFile(d/'candidate.zip','w',zipfile.ZIP_DEFLATED) as z:
  for f in manifests[t]:z.write(out/f,f)
write(S/'function-manifests.json',json.dumps(manifests,indent=2))
# New functions reuse the deployed quest/economy helpers; no other export is deployed.
out=S/'new-functions/functions';shutil.copytree(S/'getEventProgress/before',out,dirs_exist_ok=True)
src=(out/'index.js').read_text();a=local.index('const specialRewards =');b=local.index('exports.survivorQuestQuiz=',a)
write(out/'index.js',src+'\n'+local[a:b]);shutil.copyfile(ROOT/'functions/growth/special-rewards.js',out/'growth/special-rewards.js')
write(S/'new-functions/firebase.json',json.dumps({'functions':{'source':'functions'}}))
if not (out/'node_modules').exists():(out/'node_modules').symlink_to(ROOT/'functions/node_modules',target_is_directory=True)
subprocess.run(['node','--check',str(out/'index.js')],check=True)
# Replace only reviewed modules in the live bundle, retaining all other live modules.
bundle=(S/'hosting-before/js/app.bundle.js').read_text()
modules=[f for f in scope['files'] if f.startswith(('js/features/','js/application/','js/data/'))]
for f in modules:
 start='/* /'+f+' */\n';end='\n//# sourceURL=/'+f
 a=bundle.index(start)+len(start)
 b=bundle.find(end,a)
 if b<0:
  assert f=='js/data/popular-quiz-catalog.js'
  b=bundle.index('\n/* /js/',a)
 bundle=bundle[:a]+(ROOT/'public'/f).read_text().rstrip()+bundle[b:]
for f in scope['files']:
 src=(ROOT/'public'/f).read_text()
 if f=='js/app.bundle.js':src=bundle
 if f=='index.html':
  src=(S/'hosting-before'/f).read_text()
  pattern=r'^    function getRankingModeOptionsForQuiz\(quizId\) \{[\s\S]*?^    \}'
  src=src.replace(block(src,pattern),block((ROOT/'public/index.html').read_text(),pattern))
  src=src.replace('</head>','  <script src="/js/special-rewards.js?v=plaza-20261019" defer></script>\n</head>',1)
  anchor="    window.addEventListener('dj48-special-reward-updated', () => {"
  event=block((ROOT/'public/index.html').read_text(),re.escape(anchor)+r'[\s\S]*?^    \}\);')
  src=src.replace('    function resetRoomSettingsCache() {',event+'\n\n    function resetRoomSettingsCache() {',1)
  for asset in ['styles.css','js/app.bundle.js','js/town-avatar.js','js/town-spatial.js','js/ranking-plaza-loader.js','js/hideout-ranking-plaza.js']:
   src=re.sub(r'(/'+re.escape(asset)+r')(?:\?[^"<>]*)?(?=")',r'\1?v=plaza-20261019',src)
 if f=='styles.css':src=(S/'hosting-before'/f).read_text()+'\n'+src[src.index('/* Quest periods and the saved shop portrait'):]
 entry_assets={'popular-quiz/index.html':['style.css','app.js'],'mathsurvivor/index.html':['net.js','game.js'],'player-status/index.html':['status.js']}
 if f in entry_assets:
  src=(S/'hosting-before'/f).read_text()
  for asset in entry_assets[f]:src=re.sub(r'("'+re.escape(asset)+r')(?:\?[^"<>]*)?(?=")',r'\1?v=plaza-20261019',src)
 write(S/'candidate'/f,src)
 if f.endswith('.js'):subprocess.run(['node','--check',str(S/'candidate'/f)],check=True)
shutil.copyfile(ROOT/'public/js/special-rewards.js',S/'candidate/js/special-rewards.js')
files=scope['files']+['js/special-rewards.js']
write(S/'hosting-candidate.json',json.dumps({'source':json.loads((S/'hosting-before.json').read_text())['source'],'rawHashes':{f:sha(S/'candidate'/f) for f in files}},indent=2))
write(S/'checks.json',json.dumps({'passed':False,'fullCheckPassed':False,'archiveHashes':{t:sha(S/t/'candidate.zip') for t in scope['targets']}},indent=2))
print('Prepared',len(manifests),'existing functions, 2 new functions,',len(files),'Hosting paths')
