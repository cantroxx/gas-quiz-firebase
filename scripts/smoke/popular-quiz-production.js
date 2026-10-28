#!/usr/bin/env node
'use strict';
// Read-only production checks; no sign-in, game start, answer or reward writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
async function main(){
 const origin='https://dj48-quiztown-firebase.web.app',out=path.resolve(process.env.POPULAR_SMOKE_OUTPUT||'docs/operations/popular-deploy-2026-10-18');fs.mkdirSync(out,{recursive:true});
 const response=await fetch('https://asia-northeast3-dj48-quiztown-firebase.cloudfunctions.net/popularQuizAction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{action:'profile'}})});
 const body=await response.json();assert.equal(response.status,401);assert.equal(body.error.status,'UNAUTHENTICATED');
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/accounts:signUp**',route=>route.abort());
  const r=await page.goto(origin+'/popular-quiz/?category=pokemon&mode=ranking');assert.equal(r.status(),200);
  await page.getByText('퀴즈타운에서 로그인한 뒤 다시 들어와 주세요.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'← 퀴즈타운',exact:true}).getAttribute('href'),'/?popularQuizReturn=1');
  assert.equal(await page.locator('script[src*="firebase-functions-compat"]').count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  if(process.env.POPULAR_CHECK_DIRECT_ENTRY==='1'){
   const script=await fetch(origin+'/js/school-rooms.js?completion-check='+Date.now());assert(script.ok);
   await page.route(origin+'/?popular-entry-test=1',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<div id="school-quiz-grid"><button data-school-hub="popular">인기 퀴즈</button></div><div id="school-room-view"></div>'}));
   await page.goto(origin+'/?popular-entry-test=1');await page.addScriptTag({content:await script.text()});
   await page.evaluate(()=>DJ48SchoolHubs.configure({memberId:()=>'',enterView:()=>{throw Error('Intermediate popular room was rendered');}}));
   await page.getByRole('button',{name:'인기 퀴즈',exact:true}).click();await page.waitForURL(origin+'/popular-quiz/');
   await page.getByText('퀴즈타운에서 로그인한 뒤 다시 들어와 주세요.',{exact:true}).waitFor();assert.deepEqual(errors,[]);
  }
  await page.screenshot({path:path.join(out,'production-login-mobile.png'),fullPage:true});
  fs.writeFileSync(path.join(out,'public-smoke.json'),JSON.stringify({at:new Date().toISOString(),pageStatus:200,callableUnauthenticatedStatus:response.status,authGate:true,directEntryChecked:process.env.POPULAR_CHECK_DIRECT_ENTRY==='1',jsErrors:errors,studentWrites:false},null,2)+'\n');
  console.log('PASS production page, Firebase SDK load, authentication boundary, return link, mobile layout; no student writes.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
