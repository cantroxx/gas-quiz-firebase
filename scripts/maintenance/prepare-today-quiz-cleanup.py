#!/usr/bin/env python3
"""Apply the retired featured-quiz cleanup to local sources and isolated live snapshots."""
from pathlib import Path
import re, json, shutil, hashlib, subprocess
ROOT=Path(__file__).resolve().parents[2]
STAGE=Path('/tmp/today-cleanup-20261019')
def remove_fn(s,name):
    m=re.search(r'^( *)(?:async )?function '+name+r'\(',s,re.M)
    if not m:return s
    end=s.index('\n',m.start())+1
    if not s[m.start():end].rstrip().endswith('}'):
        close=re.search(r'^'+m[1]+r'}\n',s[end:],re.M)
        assert close,name
        end+=close.end()
    return s[:m.start()]+s[end:]
def replace_fn(s,name,new):
    m=re.search(r'^ *(?:async )?function '+name+r'\(',s,re.M); assert m,name
    offset=m.start();out=remove_fn(s,name);return out[:offset]+new+'\n'+out[offset:]
def cut(s,pattern):return re.sub(pattern,'',s,flags=re.M)
def patch(file,s):
    if file in ['functions/index.js','index.html']:
        s=cut(s,r'^ *const TODAY_QUIZ_ELIGIBLE_IDS = new Set\(\[[\s\S]*?^ *\]\);\n')
        s=cut(s,r'^ +(?:todayQuiz(?:Mode|Ids|RandomPoolIds|DailyCount|ShuffleSeed|ShuffledAtIso)|activeTodayQuizIds)(?::[^\n]*|),?\n')
    if file=='functions/index.js':
        s=cut(s,r'^  const sanitizeTodayQuizIds =[^\n]*\n[^\n]*\n')
        s=cut(s,r'^  const (?:todayQuiz(?:Ids|RandomPoolIds|Mode|DailyCount|ShuffleSeed|ShuffledAtIso)|activeTodayQuizIds) =[^\n]*\n')
        for name in ['getTodayQuizIds','getDailyShuffledQuizIds','getTodayQuizNoticeText','syncNoticeBoardWithTodayQuizFlags']:s=remove_fn(s,name)
        s=cut(s,r'^  await syncNoticeBoardWithTodayQuizFlags\(flags, \{[\s\S]*?^  \}\);\n')
        s=s.replace('todayQuizXpCap','practiceXpCap').replace('todayQuizXpSnapshot','practiceXpSnapshot').replace('usedTodayQuizXp','usedPracticeXp')
        s=s.replace('counts:{practiceCorrect:1,...(r.todayQuiz?{todayCorrect:1}:{})}','counts:{practiceCorrect:1}')
        # The historical field stays false on new logs for old event consumers.
    elif file=='index.html':
        s=replace_fn(s,'getNoticeBoardForDailyDrop',"    function getNoticeBoardForDailyDrop(notice) {\n      return normalizeNoticeBoardData(notice);\n    }")
        for name in ['getActiveTodayQuizIds','buildTodayQuizSummary','getAdminTodayQuizToggleGroups','renderAdminTodayQuizPoolGrid','getActiveTodayQuizIdsForNotice','getTodayQuizNoticeText','getTodayQuizShuffleCooldownInfo','formatCooldownRemaining','syncNoticeBoardWithTodayQuiz','shuffleTodayQuizNow']:s=remove_fn(s,name)
        s=cut(s,r'^ +(?:todayQuizSummary:|buildTodayQuizSummary,|shuffleTodayQuizNow,|renderAdminTodayQuizPoolGrid)[^\n]*\n')
        s=cut(s,r'^      const normalizeQuizIds =[^\n]*\n[^\n]*\n[^\n]*\n')
        s=cut(s,r'^      const filterTodayQuizIds =[^\n]*\n')
        s=cut(s,r'^      const todayQuiz(?:Ids|RandomPoolIds) =[^\n]*\n')
        s=cut(s,r'^      const activeTodayQuizIds =[^\n]*\n[^\n]*\n[^\n]*\n')
        s=replace_fn(s,'getAdminFeatureFlagsFormValues',"    function getAdminFeatureFlagsFormValues() {\n      return window.DJ48AdminForm.getAdminFeatureFlagsFormValues({\n        normalizeFeatureFlags,\n        normalizeFirebaseQuizId\n      });\n    }")
        s=cut(s,r'^      await syncNoticeBoardWithTodayQuiz\(featureFlags\)\.catch\(error => \{[\s\S]*?^      \}\);\n')
        s=cut(s,r'^      let noticeSynced = false;[\s\S]*?^      const noticeText =[^\n]*\n')
        s=s.replace('${noticeText}','')
    elif file=='js/features/admin-form.js':
        s=cut(s,r'^    const renderAdminTodayQuizPoolGrid =[^\n]*\n')
        s=cut(s,r'^    const todayQuizModeInput =[\s\S]*?^    renderAdminTodayQuizPoolGrid\(data\);\n')
        start=s.index('    const todayQuizIds =');end=s.index('    return normalizeFeatureFlags(',start);s=s[:start]+s[end:]
        s=cut(s,r'^      todayQuiz\w+[^\n]*\n')
    elif file=='js/features/admin-controller.js':
        s=cut(s,r"^    document.getElementById\('admin-today-quiz-shuffle-now'\)[\s\S]*?^    \}\);\n")
    elif file=='js/features/admin-render.js':
        s=remove_fn(s,'renderAdminTodayQuizPoolGrid');s=cut(s,r'^    renderAdminTodayQuizPoolGrid,\n')
        s=s.replace("todayCorrect:'오늘의 퀴즈 정답',",'').replace('연습전·오늘의 퀴즈·랭킹전','연습전·랭킹전')
    elif file=='js/features/home-controller.js':
        s=cut(s,r'^      const todayQuizButton =[\s\S]*?^      \}\n')
    elif file=='js/features/home-data.js':s=cut(s,r'^        todayQuizSummary: null\n')
    elif file=='js/features/home-render.js':
        s=remove_fn(s,'renderTodayQuizPanel');s=cut(s,r'^    renderTodayQuizPanel,\n')
    elif file=='js/admin-growth-season.js':s=s.replace("today:'오늘의 퀴즈 새 정답',",'')
    return s

def write(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
scope=json.loads((STAGE/'scope.json').read_text())
files=[f for f in scope['files'] if f!='js/app.bundle.js']
# Keep pre-edit local copies; all patches are applied independently to each live source.
for f in ['functions/index.js']+files:
    local=ROOT/(f if f.startswith('functions/') else 'public/'+f)
    before=STAGE/'local-before'/f;assert not before.exists(),'Already prepared'
    write(before,local.read_text());write(local,patch(f,local.read_text()))
for target in scope['targets']:
    d=STAGE/target;out=d/'release/functions';shutil.copytree(d/'before',out)
    write(out/'index.js',patch('functions/index.js',(out/'index.js').read_text()))
    write(d/'release/firebase.json',json.dumps({'functions':{'source':'functions'}}))
    (out/'node_modules').symlink_to(ROOT/'functions/node_modules',target_is_directory=True)
    subprocess.run(['node','--check',str(out/'index.js')],check=True)
    diff=subprocess.run(['diff','-u',str(d/'before/index.js'),str(out/'index.js')],capture_output=True,text=True);write(d/'candidate.diff',diff.stdout)
for f in files:write(STAGE/'candidate'/f,patch(f,(STAGE/'hosting-before'/f).read_text()))
bundle=(STAGE/'hosting-before/js/app.bundle.js').read_text()
for f in files:
    if not f.startswith('js/features/'):continue
    start=bundle.index('/* /'+f+' */\n')+len('/* /'+f+' */\n');end=bundle.index('//# sourceURL=/'+f,start)
    # Transform the actual bundled source, since standalone and bundle may differ.
    bundle=bundle[:start]+patch(f,bundle[start:end]).rstrip()+'\n'+bundle[end:]
write(STAGE/'candidate/js/app.bundle.js',bundle)
for f in scope['files']:
    if f.endswith('.js'):subprocess.run(['node','--check',str(STAGE/'candidate'/f)],check=True)
source=json.loads((STAGE/'hosting-before.json').read_text())['source']
write(STAGE/'hosting-candidate.json',json.dumps({'source':source,'rawHashes':{f:sha(STAGE/'candidate'/f) for f in scope['files']}},indent=2))
print('Prepared local cleanup and isolated live candidates:',scope['targets'])
