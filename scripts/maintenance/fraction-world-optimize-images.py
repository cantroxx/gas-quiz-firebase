"""Compress source art without changing dimensions/crop coordinates. Pillow required."""
from pathlib import Path
from PIL import Image, ImageChops
import json
root = Path(__file__).resolve().parents[2] / 'public/fraction-world/assets'
out = root / 'optimized-v12'
out.mkdir(exist_ok=True)
unused = {'actors-v1','boss-combat-v2','bosses-v1','hero-motion-v2'}
rows=[]
for source in sorted(root.iterdir()):
    if source.suffix not in {'.png','.jpg'} or source.stem in unused or source.stem.startswith('pixel-'):
        continue
    target=out/(source.stem+'.webp')
    with Image.open(source) as im:
        im.save(target,quality=88,method=6,exact=True)
        with Image.open(target) as result:
            assert result.size==im.size
            assert ImageChops.difference(im.convert('RGBA').getchannel('A'), result.convert('RGBA').getchannel('A')).getbbox() is None
    rows.append({'source':source.name,'output':target.name,'before':source.stat().st_size,'after':target.stat().st_size})
cells=sorted(Path('/tmp').glob('fw-cell-*.png'))
assert len(cells)==13, 'Run fraction-world-export-pixels.js first'
for source in cells:
    target=out/('skill-'+source.stem.removeprefix('fw-cell-')+'.webp')
    with Image.open(source) as im:
        im.save(target,lossless=True,method=6,exact=True)
        with Image.open(target) as result:
            assert ImageChops.difference(im.convert('RGBA'),result.convert('RGBA')).getbbox() is None
    rows.append({'source':source.name,'output':target.name,'before':source.stat().st_size,'after':target.stat().st_size})
(out/'manifest.json').write_text(json.dumps(rows,indent=2)+'\n')
print('optimized bytes',sum(r['after'] for r in rows),'files',len(rows))
