// Offline stage timing. Real local UI modules; synthetic dependency delays, never production latency.
// Usage: node docs/operations/performance-2026-10-07/entry-probe.cjs /tmp/dj48-entry-20261007/result.json
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../..'),PUB=path.join(ROOT,'public');
const {chromium}=require(path.join(ROOT,'node_modules/playwright-core'));
const html=fs.readFileSync(path.join(PUB,'index.html'),'utf8');
const used=new Set(['public/index.html']);
function source(file){used.add('public/'+file);return fs.readFileSync(path.join(PUB,file),'utf8');}
function extract(name){const m=new RegExp('^    (?:async )?function '+name+'\\(','m').exec(html);if(!m)throw Error(name);const rest=html.slice(m.index+m[0].length),end=/^    (?:async )?function \w+\(/m.exec(rest);return html.slice(m.index,m.index+m[0].length+end.index);}
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=','base64');
const prices=require(path.join(ROOT,'functions/coordi-shop/catalog.json'));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function fixture(browser,shop=false){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 const errors=[],network={status:0,preview:0,catalogs:0,mutations:0,externalImages:0};
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{window.fixtureStages={};const record=k=>{if(fixtureStages[k]===undefined)requestAnimationFrame(()=>requestAnimationFrame(()=>{if(fixtureStages[k]===undefined)fixtureStages[k]=performance.timeOrigin+performance.now();}));};new MutationObserver(()=>{if(!location.pathname.startsWith('/coordi-shop/'))return;if(!window.genderListenerAttached){window.genderListenerAttached=true;document.addEventListener('click',e=>{if(e.target.closest('[data-set-gender]'))fixtureStages.genderClick=performance.timeOrigin+performance.now();},true);}const ok=document.querySelector('#coordi-wallet')?.textContent.includes('1,000')&&!document.querySelector('#coordi-buy')?.disabled&&document.querySelector('.item-card');if(ok){record('core');if(document.querySelector('#gender-dialog')?.hidden)record('ready');}if(document.querySelector('#official-look-status')?.textContent==='미리보기 반영됨')record('preview');}).observe(document,{childList:true,subtree:true,attributes:true,characterData:true});});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!=='https://entry.test'){network.externalImages++;return route.fulfill({contentType:'image/png',body:pixel});}
  if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
  if(u.pathname==='/fixture/call'){
   const c=JSON.parse(route.request().postData());
   if(c.data.action==='status'){network.status++;await delay(400);return route.fulfill({json:{data:{balance:1000,purchaseCoupons:20,prices,version:'synthetic',profile:{owned:[],prisms:{},look:{gender:'female',equipped:{}}}}}});}
   if(c.name==='renderCoordiShopPreview'){network.preview++;await delay(800);return route.fulfill({json:{data:{success:true,hash:'fixture',imageUrl:'data:image/png;base64,'+pixel.toString('base64')}}});}
   network.mutations++;return route.abort();
  }
  if(u.pathname.startsWith('/coordi-shop/data/')&&u.pathname.endsWith('.json')){network.catalogs++;await delay(400);}
  const file=path.resolve(PUB,'.'+(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname));
  if(!file.startsWith(PUB+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  used.add(path.relative(ROOT,file));
  return route.fulfill({path:file,contentType:({'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream'});
 });
 await page.goto('https://entry.test/',{waitUntil:'load'});
 await page.addScriptTag({content:source('js/features/app-view.js')});
 await page.addScriptTag({content:`
 window.marks={};window.calls=[];window.renderCost=[];
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const mark=k=>{if(marks[k]===undefined)marks[k]=performance.now()-window.started;};
 const enterAppView=o=>DJ48AppView.enterKnownPlaceView(o,{appViewIds:[...document.querySelectorAll('.app-view')].map(x=>x.id)});
 const initializeAuthUser=()=>Promise.resolve({});
 window.DJ48AccountState={getCurrentMemberUserId:()=> 'synthetic'};
 window.DJ48Firebase={getFirebaseFunctions:()=>({httpsCallable:name=>async data=>(await fetch('/fixture/call',{method:'POST',body:JSON.stringify({name,data})})).json()})};
 enterAppView({viewId:'school-view'});
 window.paintWatch=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 window.resetMarks=()=>{window.marks={};window.started=performance.now();};
 window.take=()=>({marks:{...marks},calls:[...calls],renderCost:[...renderCost],domNodes:document.getElementsByTagName('*').length});
 `});
 return {context,page,errors,network};
}
async function runAdmin(browser,role,sample){
 const f=await fixture(browser),p=f.page;
 for(const x of ['application/admin-usecases.js','features/admin-render.js','features/admin-controller.js'])await p.addScriptTag({content:source('js/'+x)});
 await p.addScriptTag({content:`
 const role=${JSON.stringify(role)},members=Array.from({length:80},(_,i)=>({userId:'fixture-'+i,nickname:'합성 학생',role:'student',status:'active',authLinked:true}));
 const request=async(name,ms,value)=>{calls.push(name);await sleep(ms);return value;};
 const setStatus=s=>{document.getElementById('admin-dashboard-status').textContent=s;};
 const loadAdminDashboard=()=>DJ48AdminUsecases.loadAdminDashboardFlow({}, {setStatus,loadDashboard:()=>request('dashboard',200,{dashboard:{adminLevel:role,activeStudents:80}}),renderDashboard:d=>{const t=performance.now();DJ48AdminRender.renderAdminDashboard(d,{createAdminDetailMetric:DJ48AdminRender.createAdminDetailMetric});renderCost.push({name:'dashboard',ms:performance.now()-t});mark('coreDom');}});
 const loadAdminMembers=()=>DJ48AdminUsecases.loadAdminMembersFlow({}, {loadMembers:()=>request('members',300,{members}),renderMemberList:m=>{const t=performance.now();DJ48AdminRender.renderAdminMemberList(m,{isSuperAdmin:role==='superAdmin'});renderCost.push({name:'members',ms:performance.now()-t});mark('membersDom');}});
 const optionalNames=['NoticeBoard','ExternalQuizzes','SeasonEvents','LoginSettings','FeatureFlags','Logs','OperationalAudit','QuizQualityAudit'];
 window.optionalDone=[];
 for(const n of optionalNames)window['loadAdmin'+n]=()=>{const promise=request(n,n.includes('Audit')?800:400,{});optionalDone.push(promise);return promise;};
 ${extract('setActiveAdminSection')}
 ${extract('showAdminView')}
 DJ48AdminController.bindAdminEvents({setActiveAdminSection});
 window.runEntry=async()=>{optionalDone=[];const callStart=calls.length;resetMarks();const job=showAdminView();await paintWatch();mark('firstVisual');mark('skeletonPaint');await job;mark('entryPromise');await paintWatch();mark('corePaint');mark('ready');const control=document.querySelector('[data-admin-section-target="members"]');control.click();if(!document.querySelector('#admin-section-members.is-active .admin-member-card'))throw Error('members tab unavailable');await Promise.all(optionalDone);mark('backgroundDependencies');return {...take(),newCalls:calls.length-callStart};};
 `});
 const runs=[];for(const visit of ['first','reentry','after-three-switches']){
  if(visit!=='first')await p.evaluate(n=>{for(let i=0;i<n;i++){enterAppView({viewId:'school-view'});enterAppView({viewId:'shop-view'});}enterAppView({viewId:'school-view'});},visit==='reentry'?1:3);
  runs.push({screen:'admin',role,sample,visit,...await p.evaluate(()=>{const b=document.createElement('button');let job;b.addEventListener('click',()=>job=runEntry(),{once:true});b.click();return job;})});
 }
 if(f.errors.length)throw Error(f.errors.join(';'));await f.context.close();return runs;
}
async function runClassroom(browser,teacher,sample){
 const f=await fixture(browser),p=f.page;
 for(const x of ['domain/classroom-domain.js','application/classroom-usecases.js','features/classroom-state.js','data/level-medal-assets.js','features/classroom-form.js','features/classroom-portrait.js','features/classroom-workspace.js','features/classroom-render.js','features/classroom-controller.js'])await p.addScriptTag({content:source('js/'+x)});
 const coordinator=html.slice(html.indexOf('    let classroomRenderRequest ='),html.indexOf('    function setClassroomQuestEditorStatus'));
 await p.addScriptTag({content:`
 const teacher=${teacher},isCurrentClassroomTeacher=()=>teacher,isCurrentAdminMember=()=>teacher;
 const settings=DJ48ClassroomDomain.normalizeClassroomSettings({classId:'fixture',quests:[{id:'q1',title:'합성 독서',active:true,rewardMode:'auto',rewardCoin:5}]});
 const data={settings,progress:{},wallet:{point:17},gems:[],review:[],students:Array.from({length:22},(_,i)=>({memberUserId:'fixture-'+i,nickname:'합성 학생',point:17})),economy:{myDjCoin:123,classroomGems:[],routines:[],classNotices:{slots:[]}}};
 const getClassroomRenderDeps=()=>({isCurrentClassroomTeacher,currentMemberUserId:'synthetic',getTodayDateKey:()=> '2026-10-07',normalizeDisplayImageUrl:x=>x,getLevelMedalAsset:DJ48LevelMedalAssets.getLevelMedalAsset});
 const read=(key,forceRefresh=false)=>DJ48ClassroomUsecases.loadClassroomCachedValue(key,{forceRefresh}, {...DJ48ClassroomState,loadValue:async()=>{calls.push(key);await sleep(key==='settings'?50:key==='economy'?600:50);mark('data-'+key);return data[key];}});
 const loadClassroomSettings=force=>read('settings',force),loadClassroomQuestProgress=()=>read('progress'),loadClassroomWallet=()=>read('wallet'),loadClassroomGemProgress=()=>read('gems'),loadClassroomStudentCards=()=>read('students'),loadClassroomEconomyBoard=()=>read('economy'),loadClassroomReviewItems=()=>teacher?read('review'):Promise.resolve([]);
 const setActiveClassroomTab=DJ48ClassroomForm.setActiveClassroomTab;
 ${coordinator}
 ${extract('setClassroomUnlocked')}
 ${extract('showClassroomView')}
 DJ48ClassroomController.bindClassroomEvents({setActiveClassroomTab});
 const stateRender=DJ48ClassroomRender.renderClassroomLoadState;DJ48ClassroomRender.renderClassroomLoadState=(state)=>{const r=stateRender(state);if(state==='ready')paintWatch().then(()=>{mark('corePaint');mark('ready');});return r;};
 const originalRender=renderClassroomPrototype;renderClassroomPrototype=(...args)=>window.currentRender=originalRender(...args);
 for(const name of ['renderClassroomTodayHome','renderClassroomSections']){const orig=DJ48ClassroomRender[name];DJ48ClassroomRender[name]=(...a)=>{const t=performance.now();const r=orig(...a);renderCost.push({name,ms:performance.now()-t});if(name==='renderClassroomTodayHome')mark('partialDom');else mark('coreDom');return r;};}
 window.runEntry=async()=>{const c=calls.length;resetMarks();showClassroomView(false);await paintWatch();mark('firstVisual');mark('skeletonPaint');if(!teacher){mark('gateReady');/* User typing excluded. Real entry usecase, synthetic verifier. */await DJ48ClassroomUsecases.verifyClassroomEntryFlow({entryCode:'fixture',memberUserId:'synthetic'}, {loadClassroomSettings,verifyEntryCode:async()=>{calls.push('verifyEntry');await sleep(100);mark('verified');return {};},setUnlocked:setClassroomUnlocked});}await window.currentRender;await paintWatch();mark('corePaint');const panel=document.querySelector('[data-classroom-panel="today"]');if(panel.inert||document.querySelector('#classroom-view').getAttribute('aria-busy')!=='false')throw Error('classroom not usable');mark('ready');document.querySelector('[data-classroom-tab="market"]').click();if(document.querySelector('[data-classroom-panel="market"]').hidden)throw Error('market tab unavailable');document.querySelector('[data-classroom-tab="today"]').click();mark('backgroundDependencies');return {...take(),newCalls:calls.length-c};};
 `});
 const runs=[];for(const visit of ['first','reentry','after-three-switches']){
  if(visit!=='first')await p.evaluate(n=>{for(let i=0;i<n;i++){enterAppView({viewId:'school-view'});enterAppView({viewId:'shop-view'});}enterAppView({viewId:'school-view'});},visit==='reentry'?1:3);
  runs.push({screen:'classroom',role:teacher?'teacher':'student',sample,visit,...await p.evaluate(()=>{const b=document.createElement('button');let job;b.addEventListener('click',()=>job=runEntry(),{once:true});b.click();return job;})});
 }
 if(f.errors.length)throw Error(f.errors.join(';'));await f.context.close();return runs;
}
async function runShop(browser,sample){
 const f=await fixture(browser,true),p=f.page;
 await p.addScriptTag({content:source('js/features/shop-render.js')});
 await p.addScriptTag({content:`
 let flags=null;const loadFeatureFlags=async()=>flags||(await sleep(150),flags={shopEnabled:true});const isCurrentAdminMember=()=>false;
 const renderAvatarMarket=()=>DJ48ShopRender.renderAvatarMarket(flags||{});
 ${extract('showShopView')}
 window.runEntry=async()=>{resetMarks();await showShopView();await paintWatch();mark('firstVisual');mark('skeletonPaint');};
 `});
 const runs=[];for(const visit of ['first','reentry','after-three-switches']){
  if(visit!=='first')await p.evaluate(n=>{for(let i=0;i<n;i++){enterAppView({viewId:'school-view'});enterAppView({viewId:'classroom-view'});}enterAppView({viewId:'school-view'});},visit==='reentry'?1:3);
  const before={...f.network};await p.evaluate(()=>{const b=document.createElement('button');let job;b.addEventListener('click',()=>job=runEntry(),{once:true});b.click();return job;});
  const frame=p.frameLocator('#shop-avatar-market iframe');
  await frame.locator('#coordi-wallet').filter({hasText:'1,000'}).waitFor();
  await p.evaluate(()=>{mark('corePaint');});
  const buttons=await frame.locator('#coordi-buy').isEnabled();
  if(!buttons)throw Error('shop commerce buttons not enabled');
  const gender=await frame.locator('#gender-dialog').count()?await frame.locator('#gender-dialog').isVisible():false;
  await p.evaluate(()=>mark('readyControlsEnabled'));
  if(gender)await frame.locator('[data-set-gender="female"]').click();
  // Preview background is complete when its success status is visible. No purchase/equip/dye is clicked.
  await p.frames().find(x=>x.url().includes('/coordi-shop/')).waitForFunction(()=>fixtureStages.preview!==undefined&&document.querySelector('#character-image')?.naturalWidth>0,{},{timeout:6000});
  await p.evaluate(()=>mark('backgroundPreview'));
  const iframe=p.frames().find(x=>x.url().includes('/coordi-shop/'));await iframe.waitForFunction(()=>fixtureStages.preview!==undefined&&fixtureStages.ready!==undefined);const phaseTimes=await iframe.evaluate(()=>fixtureStages);const absoluteStart=await p.evaluate(()=>performance.timeOrigin+started);
  if(visit==='first')await p.evaluate(({phaseTimes,absoluteStart})=>{marks.corePaint=phaseTimes.core-absoluteStart;marks.ready=phaseTimes.ready-absoluteStart;marks.backgroundPreview=phaseTimes.preview-absoluteStart;marks.genderClick=phaseTimes.genderClick-absoluteStart;},{phaseTimes,absoluteStart});else await p.evaluate(()=>{marks.ready=marks.readyControlsEnabled;});
  await frame.locator('#coordi-owned-only').check();if(await frame.locator('.item-card').count()!==0)throw Error('owned-only filter unavailable');await frame.locator('#coordi-owned-only').uncheck();
  runs.push({screen:'shop',sample,visit,...await p.evaluate(()=>take()),genderDialogVisible:gender,buttonsEnabled:buttons,networkDelta:Object.fromEntries(Object.keys(before).map(k=>[k,f.network[k]-before[k]])),items:await frame.locator('.item-card').count()});
 }
 if(f.network.mutations||f.errors.length)throw Error('shop fixture errors '+f.errors.join(';'));await f.context.close();return runs;
}
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const out={scope:'OFFLINE SYNTHETIC ONLY; all network fulfilled locally. Paint marks are double-rAF approximations, not GPU pixel capture/INP. No real Firebase timings. Round trips toggle shell views without executing other screens loaders.',delays:{adminDashboard:200,adminMembers:300,adminOptional:400,adminAudits:800,classSettings:50,classOther:50,classEconomy:600,studentVerification:100,shopFlags:150,shopCatalogAndStatus:400,shopPreview:800},runs:[]};
 try{for(let sample=1;sample<=3;sample++){for(const role of ['classAdmin','superAdmin'])out.runs.push(...await runAdmin(browser,role,sample));for(const teacher of [false,true])out.runs.push(...await runClassroom(browser,teacher,sample));out.runs.push(...await runShop(browser,sample));}out.sourceHashes=Object.fromEntries([...used].sort().map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex')]));fs.writeFileSync(process.argv[2]||'/tmp/dj48-entry-20261007/result.json',JSON.stringify(out,null,2));console.log(JSON.stringify({runs:out.runs.length,output:process.argv[2],syntheticOnly:true}));}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
