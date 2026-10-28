"""Prepare only the requested shop callables from a downloaded live source archive."""
from pathlib import Path
import json, re, shutil
root = Path('/tmp/coordi-deploy-20260929')
base = root / 'live-functions'
stage = root / 'release/functions'
live = (base / 'index.js').read_text()
local = Path('functions/index.js').read_text()
for name in ['assertActiveMember', 'assertLinkedMemberAuth']:
    pattern = r'^(?:async )?function ' + name + r'\([\s\S]*?^\}'
    assert re.search(pattern, live, re.M).group() == re.search(pattern, local, re.M).group(), name
marker = '// Coordi shop remains an admin-only preview; no coin or inventory writes.'
assert live.count(marker) == 1
prefix, old = live.split(marker)
assert old.strip().endswith('coordiPreview(request.auth?.uid, request.data));')
assert 'exports.coordiShopAction' not in live
commerce = re.search(r'^const coordiCommerce=[\s\S]*?^exports\.coordiShopAction=.*?;', local, re.M).group()
preview = local[local.index('// Preview shares commerce access checks;'):local.index('// Shared quests:')]
shutil.copytree(base, stage, dirs_exist_ok=True)
shutil.copytree('functions/coordi-shop', stage / 'coordi-shop', dirs_exist_ok=True)
(stage / 'index.js').write_text(prefix + commerce + '\n\n' + preview)
(stage.parent / 'firebase.json').write_text(json.dumps({'functions': {'source': 'functions'}}, indent=2))
# Dependencies are already installed and match the production lockfile.
assert (base / 'package-lock.json').read_bytes() == Path('functions/package-lock.json').read_bytes()
if not (stage / 'node_modules').exists():
    (stage / 'node_modules').symlink_to(Path('functions/node_modules').resolve(), target_is_directory=True)
print('Prepared live-based shop source: only coordiShopAction and renderCoordiShopPreview will be deployed.')
