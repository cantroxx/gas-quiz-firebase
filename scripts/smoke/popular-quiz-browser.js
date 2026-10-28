'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
process.env.GCLOUD_PROJECT='demo-dj48-rules';process.env.GOOGLE_CLOUD_PROJECT='demo-dj48-rules';
async function main(){
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8181');
 const action=require('../../functions/index').popularQuizAction,req=require('node:module').createRequire(require.resolve('../../functions/package.json'));
 const {getFirestore}=req('firebase-admin/firestore'),{getApps,deleteApp}=req('firebase-admin/app'),db=getFirestore();
 const uid='popular-browser-auth',member='G4-C8-N95',ROOT=path.resolve(__dirname,'../../public'),OUT=path.resolve(process.env.POPULAR_REVIEW_DIR || 'docs/product/popular-rebuild-2026-10-18');fs.mkdirSync(OUT,{recursive:true});
 const call=data=>action.run({auth:{uid},data});let failImage=false,failAnswer=false,answerCalls=0;
 await db.doc('authLinks/'+uid).set({memberUserId:member,authUid:uid});await db.doc('users/'+member).set({memberUserId:member,authUid:uid,status:'active',active:true,role:'student',grade:'4',classNumber:'8',studentNumber:95,nickname:'브라우저 검증'});
 await db.doc('appSettings/featureFlags').set({practiceRewardEnabled:true,practiceXpEnabled:true,rankingEnabled:true});
 const batch=db.batch();for(const id of ['flag-country','tiniping',...Array.from({length:9},(_,i)=>'pokemon-gen'+(i+1))])for(let i=0;i<30;i++)batch.set(db.doc(`quizQuestions/${id}/questions/${i}`),{answer:`${id}-${i}`,imageUrl:`https://fixture.invalid/${id}-${i}.svg`,order:i});await batch.commit();
 const server=http.createServer((request,response)=>{const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);let file=path.resolve(ROOT,'.'+pathname);if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){response.writeHead(403);response.end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(response);}catch(_){response.writeHead(404);response.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),page=await browser.newPage({viewport:{width:1365,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.exposeFunction('popularTestCall',async data=>{if(data.action==='answer'){answerCalls++;await new Promise(r=>setTimeout(r,330));if(failAnswer){failAnswer=false;const committed=await call(data);throw Error('응답 연결이 잠시 끊겼어요.');}}return call(data);});
 await page.addInitScript(()=>{window.PopularQuizTransport=data=>window.popularTestCall(data);});
 await page.route(/\/popular-quiz\/(?:assets|optimized)\//,route=>failImage?route.abort():route.continue());
 await page.route('https://fixture.invalid/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="350"><rect width="500" height="350" fill="#eee7fa"/><text x="130" y="180" font-size="35">테스트 사진</text></svg>'}));
 const waitHome=()=>page.getByRole('button',{name:'연습 시작 →',exact:true}).waitFor();
 const privateRun=async()=>{const c=(await db.doc('popularQuizPlayers/'+member).get()).data();return (await db.doc('popularQuizRuns/'+c.runId).get()).data();};
 async function right(){const r=await privateRun();await page.locator('.choice').nth(r.questions[r.seq%20].answerIndex).click();await page.getByRole('button',{name:'다음 문제 →',exact:true}).waitFor();}
 try{
  await page.goto(origin+'/popular-quiz/?category=idol');await waitHome();assert.equal(await page.locator('.category').count(),5);
  await page.screenshot({path:path.join(OUT,'desktop-hub.png'),fullPage:true});
  await page.getByRole('button',{name:'연습 시작 →',exact:true}).click();await page.locator('.choice:not(:disabled)').first().waitFor();
  await page.screenshot({path:path.join(OUT,'desktop-play.png'),fullPage:true});
  failAnswer=true;await right().catch(()=>{});await page.locator('#notice').waitFor();
  const seq=(await privateRun()).seq;assert.equal(seq,1);await page.getByRole('button',{name:'다시 시도',exact:true}).click();await page.getByRole('button',{name:'다음 문제 →',exact:true}).waitFor();
  assert.equal((await privateRun()).seq,1);assert.equal(answerCalls,2);assert.doesNotMatch(await page.locator('.feedback').textContent(),/XP \+|코인 \+/);assert.match(await page.locator('.feedback').textContent(),/100번마다 1회 완주/);
  await page.reload();await page.getByRole('button',{name:'이어 풀기',exact:true}).waitFor();await page.getByRole('button',{name:'이어 풀기',exact:true}).click();await page.getByRole('button',{name:'다음 문제 →',exact:true}).click();
  await page.locator('.choice:not(:disabled)').first().waitFor();
  failImage=true;await right();await page.getByRole('button',{name:'다음 문제 →',exact:true}).click();await page.getByRole('button',{name:'사진 다시 불러오기',exact:true}).waitFor();assert.equal(await page.locator('.choice:disabled').count(),4);
  failImage=false;await page.getByRole('button',{name:'사진 다시 불러오기',exact:true}).click();await page.locator('.choice:not(:disabled)').first().waitFor();
  await page.getByRole('button',{name:'그만 풀기',exact:true}).click();await page.getByRole('button',{name:'다시 고르기',exact:true}).click();await waitHome();
  await page.getByRole('button',{name:'⚡ 포켓몬',exact:true}).click();await page.getByRole('button',{name:'랭킹전',exact:true}).click();assert.equal(await page.getByRole('button',{name:'랭킹 도전 →',exact:true}).isEnabled(),false);
  for(const gen of ['1세대','3세대'])await page.getByRole('button',{name:gen,exact:true}).click();assert.equal(await page.getByRole('button',{name:'랭킹 도전 →',exact:true}).isEnabled(),false);
  await page.getByRole('button',{name:'5세대',exact:true}).click();assert.equal(await page.getByRole('button',{name:'랭킹 도전 →',exact:true}).isEnabled(),true);
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(OUT,'mobile-pokemon.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'랭킹 도전 →',exact:true}).click();await page.locator('.choice:not(:disabled)').first().waitFor();assert.deepEqual((await privateRun()).generations,[1,3,5]);
  assert.equal(await page.locator('.time,.timer').count(),0);
  await right();const abandoned=await privateRun();
  await page.reload();await page.getByRole('button',{name:'랭킹 도전 →',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'이어 풀기',exact:true}).count(),0);
  assert.equal((await db.doc('popularQuizRuns/'+abandoned.id).get()).data().status,'finished');
  assert.equal((await call({action:'board',category:'pokemon',generations:[1,3,5]})).rows[0].score,1);
  for(const gen of ['1세대','3세대','5세대'])await page.getByRole('button',{name:gen,exact:true}).click();
  await page.getByRole('button',{name:'랭킹 도전 →',exact:true}).click();await page.locator('.choice:not(:disabled)').first().waitFor();
  assert.notEqual((await privateRun()).id,abandoned.id);assert.equal((await privateRun()).seq,0);
  await page.getByRole('button',{name:'그만 풀기',exact:true}).click();await page.getByRole('button',{name:'다시 고르기',exact:true}).click();
  await page.getByRole('button',{name:'연습전',exact:true}).click();await page.getByRole('button',{name:'9세대',exact:true}).click();await page.getByRole('button',{name:'연습 시작 →',exact:true}).click();await page.locator('.choice:not(:disabled)').first().waitFor();assert.ok((await privateRun()).questions.every(q=>q.generation===9));
  await page.getByRole('button',{name:'그만 풀기',exact:true}).click();await page.getByRole('button',{name:'다시 고르기',exact:true}).click();
  for(const label of ['🌏 국기','💖 티니핑']){await page.getByRole('button',{name:label,exact:true}).click();await page.getByRole('button',{name:'연습 시작 →',exact:true}).click();await page.locator('.choice:not(:disabled)').first().waitFor();await right();await page.getByRole('button',{name:'그만 풀기',exact:true}).click();await page.getByRole('button',{name:'다시 고르기',exact:true}).click();}
  await page.getByRole('button',{name:'🎬 애니',exact:true}).click();await page.getByRole('button',{name:'연습 시작 →',exact:true}).click();await page.locator('.choice:not(:disabled)').first().waitFor();await page.screenshot({path:path.join(OUT,'mobile-anime.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const first=await privateRun();await page.locator('.choice').nth((first.questions[first.seq%20].answerIndex+1)%4).click();await page.getByRole('button',{name:'다음 문제 →',exact:true}).click();
  for(let i=0;i<19;i++){await right();assert.equal(await page.locator('.feedback .reward').count(),0);await page.getByRole('button',{name:'다음 문제 →',exact:true}).click();}
  assert.match(await page.locator('.hud').textContent(),/20번 답했어요/);
  failAnswer=true;const last=await privateRun();await page.locator('.choice').nth(last.questions[last.seq%20].answerIndex).click();await page.locator('#notice').waitFor();await page.getByRole('button',{name:'다시 시도',exact:true}).click();await page.getByRole('button',{name:'다음 문제 →',exact:true}).waitFor();
  assert.equal((await privateRun()).seq,21);assert.equal((await privateRun()).status,'playing');await page.getByRole('button',{name:'다음 문제 →',exact:true}).click();await page.getByRole('button',{name:'그만 풀기',exact:true}).click();assert.match(await page.locator('.result').textContent(),/21번 답하기 · 20문제 정답/);assert.equal((await db.doc('userEconomy/'+member).get()).exists,false);await page.screenshot({path:path.join(OUT,'practice-completion-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS browser + actual callable: five categories, image loading failure, response loss/retry, XP/coin feedback, resume, generation validation, preserved sources, desktop/mobile.');
 }finally{await browser.close();await new Promise(r=>server.close(r));await Promise.all(getApps().map(deleteApp));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
