"""Build a scoped release from downloaded production function sources; no remote writes."""
import pathlib,shutil,re,json
root=pathlib.Path('/tmp/growth-functions-release');base=pathlib.Path('/tmp/growth-live-sources');root.mkdir(exist_ok=True)
stage=root/'functions';shutil.copytree(base/'getEventProgress',stage,dirs_exist_ok=True)
local=pathlib.Path('functions/index.js').read_text();source=(stage/'index.js').read_text()
def export(s,n):
 m=re.search(r'^exports\.'+n+r' = onCall\([\s\S]*?^\}\);',s,re.M);assert m,n;return m.group()
for n in ['getEventProgress','claimEventQuestReward','grantRankingCompleteXp','grantPracticeReward']:
 old=export(source,n); live=export((base/n/'index.js').read_text(),n);assert old==live,(n,'different live implementation');source=source.replace(old,export(local,n))
source+='\n'+export(local,'startRankingQuestSession')+'\n'
for name,folder in [('studyTownAction','study-town'),('cloudTowerAction','cloud-tower'),('townMarbleAction','town-marble'),('wordBombAction','word-bomb')]:
 shutil.copytree(base/name/folder,stage/folder,dirs_exist_ok=True);shutil.copyfile(pathlib.Path('functions')/folder/'service.js',stage/folder/'service.js')
 variable={'study-town':'studyTownService','cloud-tower':'cloudTowerService','town-marble':'townMarbleService','word-bomb':'wordBombService'}[folder]
 pattern=r'^const '+variable+r' =[\s\S]*?^exports\.'+name+r' = [\s\S]*?\);'
 m=re.search(pattern,local,re.M);assert m,name;source+='\n'+m.group()+'\n'
shutil.copytree('functions/growth',stage/'growth',dirs_exist_ok=True)
a=local.index('// Shared quests:');b=local.index('\nconst coordiCommerce=',a);source+='\n'+local[a:b]
(stage/'index.js').write_text(source)
(root/'firebase.json').write_text(json.dumps({'functions':{'source':'functions'}}))
print(root)
