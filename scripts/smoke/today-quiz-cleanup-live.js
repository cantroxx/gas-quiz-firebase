#!/usr/bin/env node
'use strict';
// Load real public assets; block all student APIs and use a synthetic Firebase app.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
(async()=>{const base='https://dj48-quiztown-firebase.web.app',browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{const context=await browser.newContext();await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(u.origin!==base||!['GET','HEAD'].includes(r.method()))return route.abort();if(u.pathname==='/__/firebase/init.js')return route.fulfill({contentType:'text/javascript',body:'firebase.initializeApp({apiKey:"synthetic-public-shell",projectId:"demo-today-cleanup",appId:"synthetic"});'});return route.continue();});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/?todayCleanupVerify='+Date.now());await page.locator('#member-link-form').waitFor();
const state=await page.evaluate(()=>{const old={todayQuizMode:'dailyRandom',todayQuizIds:['spelling'],activeTodayQuizIds:['spelling'],todayQuizRandomPoolIds:['spelling']};setAdminFeatureFlagsForm({...old,practiceRewardEnabled:true,practiceXpEnabled:true});return {flags:getAdminFeatureFlagsFormValues(),normalized:normalizeFeatureFlags(old),notice:getNoticeBoardForDailyDrop({quest:'교사 안내 유지'},old),retired:typeof buildTodayQuizSummary};});
assert.equal(state.retired,'undefined');assert.equal(state.flags.practiceRewardEnabled,true);assert.equal(state.flags.practiceXpEnabled,true);assert(!Object.keys(state.normalized).some(k=>/todayQuiz/i.test(k)));assert(!Object.keys(state.flags).some(k=>/todayQuiz/i.test(k)));assert.equal(state.notice.quest,'교사 안내 유지');
assert.equal(await page.locator('#admin-feature-today-quiz-mode,#admin-today-quiz-shuffle-now').count(),0);
for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390){fs.mkdirSync('/tmp/today-cleanup-20261019/screenshots',{recursive:true});await page.screenshot({path:'/tmp/today-cleanup-20261019/screenshots/live-390.png',fullPage:true});}}
assert.deepEqual(errors,[]);console.log('PASS live public assets: retired selection absent, stale fields ignored, teacher notice and reward switches preserved, 1440/390/320px, no JS errors; all student APIs blocked.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
