'use strict';
const files=['index.html','styles.css','js/features/home-render.js'];
function transform(file,s){
 if(file==='index.html'){
  s=s.replace('<button id="title-sync-button" class="mini-pill-button" type="button">타이틀 확인</button>', '<div class="title-sync-control">\n                <button id="title-sync-button" class="mini-pill-button" type="button">타이틀 확인</button>\n                <span id="title-sync-status" class="title-sync-feedback" role="status" aria-live="polite" hidden></span>\n              </div>');
  s=s.replace('          <p id="title-sync-status" class="profile-ranking-message-help" aria-live="polite"></p>\n','');
  s=s.replace("const status = document.getElementById('title-sync-status');", "const status = button ? document.getElementById('title-sync-status') : null;\n      if(status) status.hidden = false;");
  for(const asset of ['/styles.css','/js/app.bundle.js'])s=s.replace(new RegExp('('+asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?:\\?[^"<>]*)?(?=")','g'),'$1?v=title-panel-20261019');
 }
 if(file==='js/features/home-render.js'){
  const marker='  function renderCollectionCards(rootId, items, className) {';
  const start=s.indexOf(marker),end=s.indexOf('  function getBadgeGroupLabel',start);if(start<0||end<0)throw Error('Missing collection renderer');
  let part=s.slice(start,end).replace("    root.innerHTML = '';", "    const legacyWasOpen = root.querySelector('details.legacy-title-group')?.open === true;\n    root.innerHTML = '';");
  part=part.replace("legacyGroup = document.createElement('section');", "legacyGroup = document.createElement('details');\n      legacyGroup.open = legacyWasOpen;").replace("const heading = document.createElement('h4');heading.textContent = '(구) 타이틀';", "const heading = document.createElement('summary');heading.textContent = '(구) 타이틀';");s=s.slice(0,start)+part+s.slice(end);
 }
 if(file==='styles.css'){
  s=s.replace('.legacy-title-group>h4{margin:12px 0;color:var(--muted)}','');
  s+='\n/* Collapsed legacy titles and feedback adjacent to the manual title check. */\n.legacy-title-group>summary{cursor:pointer;padding:12px 0;color:var(--muted);font-weight:800;min-height:44px}\n.legacy-title-group>summary:focus-visible{outline:2px solid var(--green-dark);outline-offset:2px;border-radius:8px}\n.title-sync-control{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;max-width:100%}\n.title-sync-feedback{max-width:260px;color:var(--muted);font-size:.78rem;line-height:1.45;overflow-wrap:anywhere}\n';
 }
 if(file==='styles.css') s+='\n@media(max-width:600px){.collection-heading-row:has(.title-sync-control){grid-template-columns:minmax(0,1fr)}.collection-heading-actions:has(.title-sync-control){justify-content:flex-start}}\n';
 return s;
}
module.exports={files,transform};
if(require.main===module){const fs=require('node:fs');for(const f of files)fs.writeFileSync('public/'+f,transform(f,fs.readFileSync('public/'+f,'utf8')));}
