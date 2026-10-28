"""Prepare selected season functions from current production source; no remote writes."""
from pathlib import Path
import zipfile,shutil,re,json
base=Path('/tmp/integrated-live-sources');stage=Path('/tmp/integrated-functions-release/functions')
for name in ['getEventProgress','claimEventQuestReward','adminGrowthSeasonPlan']:
 with zipfile.ZipFile(base/(name+'.zip')) as z:z.extractall(base/name)
source=(base/'getEventProgress/index.js').read_text()
for name in ['claimEventQuestReward','adminGrowthSeasonPlan']:
 assert source==(base/name/'index.js').read_text(),'Different current quest sources: '+name
shutil.copytree(base/'getEventProgress',stage,dirs_exist_ok=True)
local=Path('functions/index.js').read_text()
for name in ['adminUpdateSeasonEvents','adminGetSeasonEvents','getPublicSeasonEvents','getEventProgress','claimEventQuestReward','grantRankingCompleteXp','adminGrowthSeasonPlan']:
 pattern=r'^exports\.'+name+r'\s*=\s*onCall\([\s\S]*?^\}\);'
 old=re.search(pattern,source,re.M);new=re.search(pattern,local,re.M);assert old and new,name
 source=source[:old.start()]+new.group()+source[old.end():]
pattern=r'^function publicSeasonEvents\([\s\S]*?^\}'
old=re.search(pattern,source,re.M);new=re.search(pattern,local,re.M);assert old and new
source=source[:old.start()]+new.group()+source[old.end():]
pattern=r'^exports\.ingestPracticeGrowth=[\s\S]*?^\}\);'
old=re.search(pattern,source,re.M);new=re.search(pattern,local,re.M);assert old and new
source=source[:old.start()]+new.group()+source[old.end():]
assert 'const seasonDrafts=' not in source
source+='\n'+local[local.index('const seasonDrafts='):]
(stage/'index.js').write_text(source)
for f in ['quests.js','season-events.js','season-draft.js']:shutil.copyfile(Path('functions/growth')/f,stage/'growth'/f)
(stage.parent/'firebase.json').write_text(json.dumps({'functions':{'source':'functions'}}))
if not (stage/'node_modules').exists():(stage/'node_modules').symlink_to(Path('functions/node_modules').resolve(),target_is_directory=True)
print('Prepared selected integrated season functions from live sources')
