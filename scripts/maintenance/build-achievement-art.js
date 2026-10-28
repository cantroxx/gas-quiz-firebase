'use strict';
const fs=require('node:fs'),C=require('../../functions/achievements/catalog');
const dir='public/images/titles-2026',base=fs.readFileSync(dir+'/nameplate.webp').toString('base64');
const palette={korean:['#63549b','文'],math:['#24659b','∑'],social:['#a66330','世'],science:['#267565','⚛'],'flag-country':['#27799d','⚑'],idol:['#ac4c83','♫'],anime:['#6e59a7','✦'],tiniping:['#b65583','♡']};
for(const t of C.titles){const [color,icon]=palette[t.area]||['#8a6330','★'];
 const size=t.titleName.length>10?23:28;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 640 220"><title>${t.titleName}</title><image href="data:image/webp;base64,${base}" width="640" height="220" preserveAspectRatio="xMidYMid meet"/><rect x="127" y="71" width="386" height="79" rx="20" fill="${color}" opacity=".09"/><g fill="${color}" text-anchor="middle" font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif"><text x="320" y="87" font-size="18">${icon} ${'✧'.repeat(t.tier)}</text><text x="320" y="125" font-size="${size}" font-weight="800">${t.titleName}</text><text x="320" y="149" font-size="11" letter-spacing="2">${t.kind==='practice'?'PRACTICE':'RANKING'}</text></g></svg>`;
 fs.writeFileSync(`${dir}/${t.titleId}.svg`,svg);
}
console.log('Created '+C.titles.length+' title images');
