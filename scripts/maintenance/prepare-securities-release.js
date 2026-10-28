#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),stage='/tmp/securities-cd-20261018',candidate=stage+'/candidate';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>fs.readFileSync(p,'utf8');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Expected unique patch: '+a.slice(0,100));return s.replace(a,()=>b);};
function write(p,s){fs.mkdirSync(path.dirname(candidate+'/'+p),{recursive:true});fs.writeFileSync(candidate+'/'+p,s);}
let html=read(stage+'/before/index.html');
html=once(html,'</head>','  <link rel="stylesheet" href="/classroom-securities.css?v=securities-cd-20261018">\n</head>');
const bank='<button class="classroom-tab" type="button" data-classroom-tab="bank" role="tab" aria-selected="false">은행</button>';
html=once(html,bank,bank+'\n            <button class="classroom-tab" type="button" data-classroom-tab="securities" role="tab" aria-selected="false" hidden>증권</button>');
const panel='<section class="classroom-panel" data-classroom-panel="bank" aria-label="은행">';
html=once(html,panel,'<section id="classroom-securities-panel" class="classroom-panel" data-classroom-panel="securities" aria-label="우리반 증권소"></section>\n        '+panel);
assert.equal((html.match(/\/js\/app\.bundle\.js\?[^"']*/g)||[]).length,1);html=html.replace(/\/js\/app\.bundle\.js\?[^"']*/, '/js/app.bundle.js?v=securities-cd-20261018');write('index.html',html);
let bundle=read(stage+'/before/js/app.bundle.js');
for(const match of bundle.matchAll(/\/\* \/(js\/[^ ]+) \*\/\n([\s\S]*?)\n\/\/# sourceURL=\/\1/g))write(match[1],match[2]+'\n');
function modify(p,edit){const start=`/* /${p} */\n`,end=`\n//# sourceURL=/${p}`;const a=bundle.indexOf(start),b=bundle.indexOf(end,a);assert(a>=0&&b>a,p);const source=bundle.slice(a+start.length,b),changed=edit(source);write(p,changed+'\n');bundle=bundle.slice(0,a+start.length)+changed+bundle.slice(b);}
modify('js/features/classroom-form.js',s=>{
 s=once(s,"economy: ['market', 'bank']","economy: ['market', 'bank', 'securities']");
 s=once(s,"    const view = document.getElementById('classroom-view');\n    if(panelTab", "    if(panelTab === 'securities' && !window.DJ48Securities?.isEnabled()) panelTab = 'market';\n    const view = document.getElementById('classroom-view');\n    if(panelTab");
 s=once(s,"button.hidden = !CLASSROOM_GROUPS[group].includes(button.dataset.classroomTab);","button.hidden = !CLASSROOM_GROUPS[group].includes(button.dataset.classroomTab) || (button.dataset.classroomTab === 'securities' && !window.DJ48Securities?.isEnabled());");
 return once(s,"    if(previousTab !== panelTab) view?.dispatchEvent(new CustomEvent('classroom-tab-changed'));", "    if(previousTab !== panelTab) {\n      if(panelTab === 'securities') window.DJ48Securities?.enter();\n      else window.DJ48Securities?.closeOrder();\n      view?.dispatchEvent(new CustomEvent('classroom-tab-changed'));\n    }");
});
modify('js/features/classroom-state.js',s=>once(s,'  function resetClassroomRuntimeData() {','  function resetClassroomRuntimeData() {\n    window.DJ48Securities?.reset();'));
modify('js/application/classroom-usecases.js',s=>once(s,"        bank: ['wallet', 'economy', ...(teacher ? ['students'] : [])],","        bank: ['wallet', 'economy', ...(teacher ? ['students'] : [])],\n        securities: [],"));
modify('js/features/classroom-workspace.js',s=>{
 s=once(s,"nav.hidden = !['market', 'bank'].includes(activeTab);","nav.hidden = !['market', 'bank', 'securities'].includes(activeTab);");
 s=once(s,"      nav.append(bank); document.querySelector('.classroom-tabs').after(nav);","      nav.append(bank); document.querySelector('.classroom-tabs').after(nav);\n      const securities = document.querySelector('[data-classroom-tab=\"securities\"]');\n      if(securities) { securities.classList.add('classroom-subtab'); nav.append(securities); }");
 return once(s,'  function render(data = {}, deps = {}) {','  function render(data = {}, deps = {}) {\n    root.DJ48Securities?.configure(data, deps);');
});
const added=['js/domain/securities-domain.js','js/features/securities-render.js','js/infrastructure/securities-repository.js','js/features/securities-server-controller.js'];
const chunks=added.map(p=>{const s=read(root+'/public/'+p).trimEnd();write(p,s+'\n');return `/* /${p} */\n${s}\n//# sourceURL=/${p}\n\n`;}).join('');
bundle=once(bundle,'/* /js/features/classroom-form.js */',chunks+'/* /js/features/classroom-form.js */');write('js/app.bundle.js',bundle);
write('classroom-securities.css',read(root+'/public/classroom-securities.css'));write('images/classroom-icons/securities.svg',read(root+'/public/images/classroom-icons/securities.svg'));
// New exports only; every existing deployed export/body remains unchanged.
const fn=stage+'/functions-release/functions';fs.cpSync(stage+'/live-functions',fn,{recursive:true});
const deployed=read(fn+'/index.js'),local=read(root+'/functions/index.js');
for(const name of ['assertActiveMember','assertLinkedMemberAuth','loadClassroomSettingsForTransaction','assertMemberCanEnterClassroom','isClassroomTeacherMember']){
 const body=s=>{const i=s.indexOf(`function ${name}(`);return s.slice(s.lastIndexOf('\n',i)+1,s.indexOf('\n}',i)+2);};assert.equal(body(deployed),body(local),'Authorization helper changed: '+name);
}
fs.cpSync(root+'/functions/classroom/securities',fn+'/classroom/securities',{recursive:true});
fs.writeFileSync(fn+'/index.js',deployed+'\n'+local.slice(local.indexOf('// Securities C/D:')));
if(!fs.existsSync(fn+'/node_modules'))fs.symlinkSync(root+'/functions/node_modules',fn+'/node_modules','dir');
fs.writeFileSync(stage+'/functions-release/firebase.json',JSON.stringify({functions:{source:'functions'}}));
for(const p of [candidate+'/js/app.bundle.js',fn+'/index.js'])execFileSync(process.execPath,['--check',p]);
const hashes={};for(const p of ['index.js',...fs.readdirSync(fn+'/classroom/securities').map(p=>'classroom/securities/'+p)])hashes[p]=hash(fs.readFileSync(fn+'/'+p));
fs.writeFileSync(stage+'/functions-candidate.json',JSON.stringify({targets:['classroomSecuritiesQuery','classroomSecuritiesAction','classroomSecuritiesAdminAction','classroomSecuritiesTick'],hashes},null,2));
const files=['index.html','js/app.bundle.js','classroom-securities.css','images/classroom-icons/securities.svg',...added,'js/features/classroom-form.js','js/features/classroom-state.js','js/features/classroom-workspace.js','js/application/classroom-usecases.js'];
fs.writeFileSync(stage+'/hosting-candidate.json',JSON.stringify({source:JSON.parse(read(stage+'/hosting-before.json')).version,rawHashes:Object.fromEntries(files.map(p=>[p,hash(fs.readFileSync(candidate+'/'+p))]))},null,2));
console.log(JSON.stringify({files,functions:4,authHelpers:'identical to deployed',preserved:'All other current live chunks and files'}));
