"""Generate 100 native SVG level icons, matching the village's cream/wood/leaf palette."""
from pathlib import Path
from math import sin,cos,pi
out=Path(__file__).resolve().parents[2]/'public/images/town-medals-20261018';out.mkdir(exist_ok=True)
palettes=[('#ba7f4e','#f4c58b','#79965c'),('#b68e52','#f5dda0','#7a9d68'),('#9eaba3','#f1f0d5','#65897a'),('#d2a043','#fff0ab','#8a9e52'),('#609879','#d7edb6','#dda85a'),('#709fac','#d0eced','#6a8d71'),('#8d7fa6','#e7d9ef','#c4a15c'),('#b57973','#f7d7be','#749665'),('#c4a052','#ffefb5','#667e9d'),('#caa14c','#fff5cb','#759771')]
for level in range(1,101):
 tier=(level-1)//10;step=(level-1)%10+1;base,light,ribbon=palettes[tier]
 rim=''
 if tier>=4:
  points=[]
  for i in range(24):
   a=i*pi/12-pi/2;r=43 if i%2==0 else 36;points.append(f'{50+cos(a)*r:.1f},{46+sin(a)*r:.1f}')
  rim=f'<polygon points="{" ".join(points)}" fill="url(#metal)" stroke="#806342" stroke-width="2"/>'
 elif tier>=2:rim='<rect x="13" y="9" width="74" height="74" rx="24" transform="rotate(45 50 46)" fill="url(#metal)" stroke="#806342" stroke-width="2"/>'
 else:rim='<circle cx="50" cy="46" r="40" fill="url(#metal)" stroke="#806342" stroke-width="2"/>'
 leaves=''.join(f'<ellipse cx="{18+i*2}" cy="{52+i*6}" rx="4" ry="8" transform="rotate(-40 {18+i*2} {52+i*6})"/><ellipse cx="{82-i*2}" cy="{52+i*6}" rx="4" ry="8" transform="rotate(40 {82-i*2} {52+i*6})"/>' for i in range(4))
 crown='<path d="m34 18-3-13 11 8 8-11 8 11 11-8-3 13Z" fill="#e8ba5e" stroke="#8c6a37" stroke-width="2"/>' if tier>=8 else ''
 gem_colors=[('#e6aa52','#fff0b1','#9e6039'),('#9fbb63','#eaf5b5','#5e814b'),('#69a595','#c4f4d9','#386b67'),('#59a7c2','#c6f3fa','#3d6b95'),('#6990d3','#d7e8ff','#4855a1'),('#9b81cc','#efdcff','#684b93'),('#cf79a8','#ffe1eb','#984d7f'),('#de7967','#ffdeac','#a64145'),('#e2bd61','#ffffd1','#af793b'),('#91cccf','#ffffff','#7085bf')]
 gem,shine,shade=gem_colors[tier];radius=15+step*.55
 vertices=6+(step//4)*2
 points=[(50+cos(i*2*pi/vertices-pi/2)*radius,44+sin(i*2*pi/vertices-pi/2)*radius*1.22) for i in range(vertices)]
 outline=' '.join(f'{x:.1f},{y:.1f}' for x,y in points)
 facets=''.join(f'<path d="M50 44L{x:.1f} {y:.1f}L{points[(i+1)%vertices][0]:.1f} {points[(i+1)%vertices][1]:.1f}Z" fill="{[shine,gem,shade,gem][i%4]}"/>' for i,(x,y) in enumerate(points))
 jewel=f'<polygon points="{outline}" fill="{gem}" stroke="#89653e" stroke-width="5" stroke-linejoin="round"/>{facets}<path d="m46 29-5 10 8-3" fill="none" stroke="#ffffffb0" stroke-width="2" stroke-linecap="round"/>'
 satellites=''.join(f'<path d="m{30+i*10} 72 3-4 3 4-3 4Z" fill="{gem}" stroke="#8c7145" stroke-width=".8"/>' for i in range(min(5,(step+1)//2)))
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112" role="img" aria-label="레벨 {level} 훈장"><defs><linearGradient id="metal" x2=".8" y2="1"><stop stop-color="{light}"/><stop offset="1" stop-color="{base}"/></linearGradient><radialGradient id="paper"><stop stop-color="#fff9df"/><stop offset="1" stop-color="{light}"/></radialGradient></defs><path d="m28 65-8 40 18-7 11 10 4-42M72 65l8 40-18-7-11 10-4-42" fill="{ribbon}" stroke="#6b6845" stroke-width="2"/><path d="m29 78-5 20 13-5m34-15 5 20-13-5" fill="none" stroke="#ffffff80" stroke-width="3"/>{rim}<circle cx="50" cy="46" r="32" fill="url(#paper)" stroke="#9f8050" stroke-width="2"/><path d="M26 31q24-23 48 0" fill="none" stroke="#fff9e5" stroke-width="3" stroke-linecap="round"/><g fill="{ribbon}" stroke="#6d7950" stroke-width="1">{leaves}</g>{crown}{jewel}{satellites}</svg>'''
 (out/f'level-{level:03}.svg').write_text(svg)
print('Generated 100 number-free village jewel medals.')
