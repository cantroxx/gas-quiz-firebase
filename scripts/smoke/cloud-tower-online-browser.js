#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright-core');
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
async function main(){
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8181');assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9191');
  const app=initializeApp({projectId:'demo-dj48-rules'},'ct-browser'),db=getFirestore(app),auth=getAuth(app),root=path.resolve(__dirname,'../../public');
  const people=[{uid:'cto-host',nickname:'하늘 탐험가',email:'ct-host@example.test'},{uid:'cto-guest',nickname:'구름 친구',email:'ct-guest@example.test'}];
  for(const p of people){await auth.createUser({uid:p.uid,email:p.email,password:'demo-test-only-1234'});await db.doc('authLinks/'+p.uid).set({memberUserId:'member-'+p.uid});await db.doc('users/member-'+p.uid).set({authUid:p.uid,nickname:p.nickname,status:'active',active:true});}
  const server=http.createServer((req,res)=>{
    let name=decodeURIComponent(req.url.split('?')[0]);if(name.endsWith('/'))name+='index.html';
    const sdk=name.match(/^\/__\/firebase\/10\.12\.2\/(firebase-(?:app|auth|firestore|functions)-compat\.js)$/);
    const file=sdk?path.resolve(__dirname,'../../node_modules/firebase',sdk[1]):path.resolve(root,'.'+name);
    if(!sdk&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.SMOKE_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
    const errors=[],pages=[];
    for(const person of people){const context=await browser.newContext({viewport:{width:1280,height:1000}});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'/cloud-tower/?emulator=1');await page.waitForSelector('body[data-art-ready="true"]');
      await page.evaluate(async email=>{await CloudTowerNet.load();await firebase.auth().signInWithEmailAndPassword(email,'demo-test-only-1234');},person.email);
      await page.click('#online-connect');await page.waitForFunction(()=>document.getElementById('online-connect').hidden);assert.equal(await page.locator('#rank-scope').innerText(),'공용');pages.push(page);
    }
    const [host,guest]=pages;
    await host.click('#room-create');await host.waitForFunction(()=>document.getElementById('room-number').textContent.length===6);const code=await host.locator('#room-number').innerText();
    await guest.fill('#room-code',code);await guest.locator('#room-join-form button').click();await guest.waitForSelector('#room-lobby:visible');await host.waitForFunction(()=>document.querySelectorAll('#room-members .room-member').length===2);
    assert.equal(await host.locator('#room-start').isDisabled(),true);
    await host.click('#room-ready');await guest.click('#room-ready');await host.waitForFunction(()=>!document.getElementById('room-start').disabled);
    await host.screenshot({path:'/tmp/cloud-tower-online-lobby.png',fullPage:true});await host.click('#room-start');
    for(const page of pages)await page.waitForFunction(()=>!document.getElementById('typing').disabled,{},{timeout:15000});
    await new Promise(resolve=>setTimeout(resolve,650));
    await host.fill('#typing','구름');await host.press('#typing','Enter');await host.waitForFunction(()=>document.getElementById('floor').textContent==='1');
    await guest.waitForFunction(()=>document.getElementById('race-standings').textContent.includes('하늘 탐험가 1층'));
    assert.ok(Math.abs(Number((await host.locator('#timer').innerText()).split(':')[1])-Number((await guest.locator('#timer').innerText()).split(':')[1]))<=1);
    await guest.screenshot({path:'/tmp/cloud-tower-online-race.png',fullPage:true});
    // A reload restores the same run and its authoritative progress, not a second run.
    const before=await host.evaluate(()=>CloudTowerGame.runId());await host.reload();await host.waitForSelector('body[data-art-ready="true"]');await host.click('#online-connect');await host.waitForSelector('#online-resume:visible');await host.click('#online-resume');await host.waitForFunction(()=>!document.getElementById('typing').disabled);assert.equal(await host.evaluate(()=>CloudTowerGame.runId()),before);assert.equal(await host.locator('#floor').innerText(),'1');
    await host.click('#stop');await host.waitForFunction(()=>document.getElementById('result').open);await host.waitForFunction(()=>document.getElementById('save-message').textContent.includes('중도 포기'));
    await guest.click('#stop');await guest.waitForFunction(()=>document.getElementById('result').open);await guest.click('#close-result');await guest.waitForFunction(()=>document.getElementById('race-result').textContent.includes('종료'));
    await host.click('#close-result');await host.click('#room-leave');await host.waitForFunction(()=>document.getElementById('room-lobby').hidden);
    // Main-tab adapter against actual emulated Firestore; no student production access.
    await db.doc('cloudTowerRanking/cloud-120-v1/entries/browser-rank').set({nickname:'<공용 기록>',score:400,floor:3,accuracy:99.5,elapsed:120,sortKey:400009951200});
    await host.evaluate(()=>{const wrapper=document.createElement('section');wrapper.id='ranking-board-root';wrapper.innerHTML='<div class="ranking-board-tabs"></div><div class="ranking-board-panels"><section data-ranking-board-panel="wordbattle"><div class="ranking-board-header"><p></p></div><div class="ranking-sub-tabs"></div></section></div>';document.body.append(wrapper);});
    await host.addScriptTag({url:base+'/js/ct-ranking-plaza.js'});await host.waitForFunction(()=>document.getElementById('cloud-tower-ranking-root')?.textContent.includes('<공용 기록>'));assert.equal(await host.locator('[data-ranking-sub-group-id="cloud-tower-rank"]').count(),1);assert.equal(await host.locator('#cloud-tower-ranking-root script').count(),0);
    await host.addScriptTag({url:base+'/js/features/ranking-render.js'});await host.evaluate(()=>document.getElementById('ranking-board-root').addEventListener('click',event=>DJ48RankingRender.handleRankingBoardRootClick(event)));
    await host.click('[data-ranking-sub-group-id="cloud-tower-rank"]');assert.equal(await host.locator('[data-ranking-sub-panel="cloud-tower-rank"]').isVisible(),true);
    assert.deepEqual(errors,[]);console.log('Cloud Tower browser online: actual Auth/Functions/Firestore emulators, two accounts, ready gate, synchronized countdown, server-scored typing, live opponent progress, reload resume, forfeit, room results, leave and Quiztown ranking adapter passed.');
  }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await deleteApp(app);}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
