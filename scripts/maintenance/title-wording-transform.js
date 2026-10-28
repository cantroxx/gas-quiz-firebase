'use strict';
const files=['index.html','housing/app.js','housing/style.css','housing/index.html','housing/housing-data.js','player-status/status.js','player-status/index.html','js/features/home-data.js','js/features/admin-render.js','js/features/shop-data.js','js/features/shop-render.js','js/town-spatial.js','js/features/home-render.js','js/data/place-details.js'];
function transform(file,source){
 let s=source.replaceAll('칭호를','타이틀을').replaceAll('칭호가','타이틀이').replaceAll('칭호와','타이틀과').replaceAll('칭호는','타이틀은').replaceAll('칭호','타이틀');
 if(file==='index.html')s=s.replaceAll('>보유 타이틀<','>타이틀<');
 if(file==='js/features/shop-data.js'){
  s=s.replace("'타이틀 프레임': 'titleFrame'","'칭호 프레임': 'titleFrame',\n      '타이틀 프레임': 'titleFrame'");
  s=s.replace("'타이틀 프레임', 'titleFrame'].includes(category)","'칭호 프레임', '타이틀 프레임', 'titleFrame'].includes(category)");
  s=s.replace("category: categoryLabels[category] || category || '기타'","category: String(categoryLabels[category] || category || '기타').replaceAll('칭호를', '타이틀을').replaceAll('칭호가', '타이틀이').replaceAll('칭호와', '타이틀과').replaceAll('칭호는', '타이틀은').replaceAll('칭호', '타이틀')");
  s=s.replace('name: data.name || itemId',"name: String(data.name || itemId).replaceAll('칭호를', '타이틀을').replaceAll('칭호가', '타이틀이').replaceAll('칭호와', '타이틀과').replaceAll('칭호는', '타이틀은').replaceAll('칭호', '타이틀')");
  s=s.replace("desc: data.desc || '상점 아이템 설명을 준비 중입니다.'","desc: String(data.desc || '상점 아이템 설명을 준비 중입니다.').replaceAll('칭호를', '타이틀을').replaceAll('칭호가', '타이틀이').replaceAll('칭호와', '타이틀과').replaceAll('칭호는', '타이틀은').replaceAll('칭호', '타이틀')");
 }
 if(file==='js/features/shop-render.js'){
  s=s.replace("'아바타', '타이틀 프레임'].includes", "'아바타', '칭호 프레임', '타이틀 프레임'].includes");
  s=s.replace('return SHOP_CATEGORY_DISPLAY_LABELS[category] || category;',"return String(SHOP_CATEGORY_DISPLAY_LABELS[category] || category).replaceAll('칭호를', '타이틀을').replaceAll('칭호가', '타이틀이').replaceAll('칭호와', '타이틀과').replaceAll('칭호는', '타이틀은').replaceAll('칭호', '타이틀');");
 }
 if(file==='js/features/home-data.js')s=s.replace("desc: data.description || data.conditionText || data.sourceCategory || data.sourceType || '획득한 타이틀입니다.'", "desc: String(data.description || data.conditionText || data.sourceCategory || data.sourceType || '획득한 타이틀입니다.').replaceAll('칭호를', '타이틀을').replaceAll('칭호가', '타이틀이').replaceAll('칭호와', '타이틀과').replaceAll('칭호는', '타이틀은').replaceAll('칭호', '타이틀')");
 const assets={'index.html':['/js/app.bundle.js','/js/town-spatial.js'],'housing/index.html':['app.js','housing-data.js','style.css'],'player-status/index.html':['status.js']};
 for(const asset of assets[file]||[])s=s.replace(new RegExp('('+asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?:\\?[^"<>]*)?(?=")','g'),'$1?v=title-wording-20261019');
 return s;
}
module.exports={files,transform};
if(require.main===module){const fs=require('node:fs');for(const f of files)fs.writeFileSync('public/'+f,transform(f,fs.readFileSync('public/'+f,'utf8')));}
