const fs=require('fs');const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd()]}));
const OUT='/tmp/dj48-perf-20261007';
const block=['*identitytoolkit.googleapis.com*','*securetoken.googleapis.com*','*firestore.googleapis.com*','*firebasestorage.googleapis.com*','*cloudfunctions.net*','*run.app*','*firebaseio.com*','*firebasedatabase.app*','*firebaseinstallations.googleapis.com*','*google-analytics.com*','*googletagmanager.com*','*/_vercel/*','*/api/*','*storage.googleapis.com*'];
(async()=>{const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const out=[];try{for(const [name,url] of [['quiztown','https://dj48-quiztown-firebase.web.app/'],['ground','https://growndcard.com/']]){
const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),p=await ctx.newPage(),c=await ctx.newCDPSession(p);
await c.send('Network.enable');await c.send('Network.setBlockedURLs',{urls:block});await c.send('Profiler.enable');await c.send('Profiler.startPreciseCoverage',{callCount:true,detailed:true});
await p.goto(url,{waitUntil:'load'});await p.waitForTimeout(3000);
const coverage=(await c.send('Profiler.takePreciseCoverage')).result;
const sources=[];
for(const s of coverage){if(!s.url||!(s.url.startsWith('http')||s.url.startsWith('/')))continue;const ranges=s.functions.flatMap(f=>f.ranges);const edges=[...new Set(ranges.flatMap(r=>[r.startOffset,r.endOffset]))].sort((a,b)=>a-b);let covered=0,total=0;
for(let i=1;i<edges.length;i++){const a=edges[i-1],z=edges[i],active=ranges.filter(r=>r.startOffset<=a&&r.endOffset>=z).sort((a,b)=>(a.endOffset-a.startOffset)-(b.endOffset-b.startOffset));if(active.length){total+=z-a;if(active[0].count>0)covered+=z-a}}
sources.push({url:new URL(s.url,url).href.split('?')[0],totalUnits:total,executedUnits:covered});}
await c.send('Profiler.stopPreciseCoverage');
await p.screenshot({path:OUT+'/'+name+'-mobile-public.png'});
const scroll=[];
for(let trial=1;trial<=3;trial++){
await p.evaluate(()=>{window.scrollTo(0,0);window.__frameProbe=[];let last=performance.now();window.__probeUntil=last+1300;function tick(t){window.__frameProbe.push(t-last);last=t;if(t<window.__probeUntil)requestAnimationFrame(tick)}requestAnimationFrame(tick)});
await p.mouse.move(350,600);await p.mouse.wheel(0,600);await p.waitForTimeout(1450);
scroll.push(await p.evaluate(()=>({deltaScrollY:scrollY,frames:window.__frameProbe.length,over50:window.__frameProbe.filter(v=>v>50).length,maxFrameGap:Math.max(...window.__frameProbe),medianFrameGap:[...window.__frameProbe].sort((a,b)=>a-b)[Math.floor(window.__frameProbe.length/2)]})));}
out.push({name,coverage:sources,scroll,scope:'Separate unthrottled 390x844 probe. JS V8 UTF-16 range coverage of executed scripts, not bytes or safe-to-delete code; wheel/rAF gaps are laboratory indicators, not INP or compositor FPS.'});await ctx.close();}
fs.writeFileSync(OUT+'/ui-probe-mobile.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out.map(r=>({name:r.name,scroll:r.scroll,coverageSources:r.coverage.length}))));}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
