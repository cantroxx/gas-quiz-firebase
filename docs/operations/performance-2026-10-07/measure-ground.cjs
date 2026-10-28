const fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const ROOT=process.cwd();
const {chromium}=require(ROOT+'/node_modules/playwright-core');
const OUT='/tmp/dj48-perf-20261007',BASE='https://growndcard.com';
const blocked=['*firebasedatabase.app*','*firebaseinstallations.googleapis.com*','*google-analytics.com*','*googletagmanager.com*','*vercel-insights.com*','*/_vercel/*','*/api/*','*identitytoolkit.googleapis.com*','*securetoken.googleapis.com*','*firestore.googleapis.com*','*firebasestorage.googleapis.com*','*cloudfunctions.net*','*run.app*','*firebaseio.com*','*storage.googleapis.com*',BASE+'/api/*'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const clean=u=>{try{const x=new URL(u);return x.origin+x.pathname}catch{return 'unknown'}};
(async()=>{
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const out={dateKST:'2026-10-07',browser:await b.version(),host:{platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0].model},scope:'Isolated unauthenticated static shells; all Firebase backend APIs blocked BEFORE navigation. No login, submissions, game play, data queries. CDP cache preserved. No HAR, credentials or response payloads saved.',runs:[],assets:[]};
try{
for(const scenario of [{name:'ground-desktop',url:'/',width:1440,height:1000,warm:true},{name:'ground-mobile',url:'/',width:390,height:844,warm:true,slow:true}]){
for(let sample=1;sample<=3;sample++){
const context=await b.newContext({viewport:{width:scenario.width,height:scenario.height},serviceWorkers:'block'}),page=await context.newPage(),cdp=await context.newCDPSession(page);
await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:blocked});await cdp.send('Performance.enable');
if(scenario.slow){await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:500000,uploadThroughput:125000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})}
await page.addInitScript(()=>{
window.__audit={long:[],lcp:[],shifts:[],events:[]};
for(const [type,key] of [['longtask','long'],['largest-contentful-paint','lcp'],['layout-shift','shifts'],['event','events']])try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__audit[key].push({start:e.startTime,duration:e.duration,value:e.value,recentInput:e.hadRecentInput,id:e.element?.id,tag:e.element?.tagName,name:e.name,processingStart:e.processingStart,processingEnd:e.processingEnd,interactionId:e.interactionId}))).observe({type,buffered:true,durationThreshold:16})}catch{}
});
for(const visit of scenario.warm?['cold','warm']:['cold']){
let rows=new Map(),failures=[],redirects=0;
const rq=e=>{if(e.redirectResponse)redirects++;rows.set(e.requestId,{url:clean(e.request.url),type:e.type,start:e.timestamp,initiator:e.initiator.type})};
const rs=e=>{let r=rows.get(e.requestId);if(r)Object.assign(r,{status:e.response.status,diskCache:!!e.response.fromDiskCache,serviceWorker:!!e.response.fromServiceWorker,protocol:e.response.protocol,cacheControl:e.response.headers['cache-control']||e.response.headers['Cache-Control']||'',encoding:e.response.headers['content-encoding']||'',timing:e.response.timing})};
const done=e=>{let r=rows.get(e.requestId);if(r)Object.assign(r,{wireBytes:e.encodedDataLength,end:e.timestamp})};
const fail=e=>{let r=rows.get(e.requestId);failures.push({url:r?.url||'unknown',reason:e.blockedReason||e.errorText});if(r)r.failed=true};
cdp.on('Network.requestWillBeSent',rq);cdp.on('Network.responseReceived',rs);cdp.on('Network.loadingFinished',done);cdp.on('Network.loadingFailed',fail);
await page.goto(BASE+scenario.url,{waitUntil:'load',timeout:60000});await page.waitForTimeout(2400);
const timing=await page.evaluate(()=>{let n=performance.getEntriesByType('navigation')[0];return {nav:n.toJSON(),paints:performance.getEntriesByType('paint').map(e=>e.toJSON()),...window.__audit,resources:performance.getEntriesByType('resource').map(e=>({url:e.name.split('?')[0],start:e.startTime,duration:e.duration,transfer:e.transferSize,decoded:e.decodedBodySize,encoded:e.encodedBodySize,initiator:e.initiatorType})),domNodes:document.getElementsByTagName('*').length,fonts:document.fonts.size,observationEnd:performance.now(),firebaseApps:window.firebase?.apps?.length||0}});
const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(x=>['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount','JSHeapUsedSize'].includes(x.name)).map(x=>[x.name,x.value]));
let cls=0,windowSum=0,windowStart=0,last=0;for(const s of timing.shifts.filter(s=>!s.recentInput)){if(s.start-last>1000||s.start-windowStart>5000){windowStart=s.start;windowSum=0}windowSum+=s.value;last=s.start;cls=Math.max(cls,windowSum)}
const entries=[...rows.values()];const summary={ttfb:timing.nav.responseStart,fcp:timing.paints.find(e=>e.name==='first-contentful-paint')?.startTime||null,lcp:timing.lcp.at(-1)?.start||null,cls,longTasks:timing.long.length,blockingExcess:timing.long.reduce((s,e)=>s+Math.max(0,e.duration-50),0),requests:entries.length,responses:entries.filter(r=>r.status).length,wireBytes:entries.reduce((s,e)=>s+(e.wireBytes||0),0),redirects};
let interaction=null;
if(false){
await page.evaluate(()=>{window.__clickAudit=null;document.getElementById('member-signup-mode-button').addEventListener('click',()=>{let start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__clickAudit={eventToTwoRafMs:performance.now()-start,signupActive:document.getElementById('member-link-form').classList.contains('is-signup-mode')}}))},{once:true,capture:true})});
await page.locator('#member-signup-mode-button').click();await page.waitForTimeout(100);interaction=await page.evaluate(()=>window.__clickAudit);
if(interaction)interaction.events=await page.evaluate(()=>window.__audit.events);
}
const row={scenario:scenario.name,sample,visit,summary,metrics,timing,network:entries,failures,interaction};out.runs.push(row);console.log(JSON.stringify({scenario:scenario.name,sample,visit,...summary,interaction:interaction&&{...interaction,events:undefined}}));
cdp.off('Network.requestWillBeSent',rq);cdp.off('Network.responseReceived',rs);cdp.off('Network.loadingFinished',done);cdp.off('Network.loadingFailed',fail);
fs.writeFileSync(OUT+'/ground-measurements.json',JSON.stringify(out,null,2)+'\n');
}
await context.close();
}}
}finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
