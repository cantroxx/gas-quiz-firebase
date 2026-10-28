'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<div id="admin-season-event-list"></div>');
  await page.addStyleTag({path:'public/styles.css'});
  for(const file of ['admin-render','admin-form'])await page.addScriptTag({path:'public/js/features/'+file+'.js'});
  await page.evaluate(()=>DJ48AdminRender.renderAdminSeasonEventRows({items:[{eventId:'stable-season',title:'10월 독서와 대전',periodType:'monthly',targetMonth:'2026-10',quizIds:['reading'],active:false,goals:[{kind:'practiceCorrect',target:20,xpReward:30,rewardCoin:20},{kind:'studyCorrect',target:10,xpReward:10,rewardCoin:5}]}]},{normalizeSeasonEvents:v=>v,maxRows:1}));
  const form=await page.evaluate(()=>DJ48AdminForm.getAdminSeasonEventsFormValues());assert.equal(form.items[0].eventId,'stable-season');assert.equal(form.items[0].goals.length,2);assert.equal(form.items[0].goals[0].target,20);
  await page.locator('[data-season-goal="rankingComplete"] [data-goal-enabled]').check();
  assert.equal(await page.locator('[data-season-goal="rankingComplete"] [data-goal-field="target"]').isEnabled(),true);
  await page.evaluate(()=>{
   const controls=document.createElement('div');controls.innerHTML='<button id="season-draft-load">초안</button><button id="season-draft-reroll">리롤</button><button id="season-draft-apply">추가</button><div id="season-draft-preview"></div>';document.body.append(controls);
   const response={data:{draft:{month:'2026-10',revision:0,items:[{eventId:'draft-test',title:'다음 달 초안',quizIds:['reading'],goals:[{kind:'studyCorrect',target:10,xpReward:10,rewardCoin:10}],active:false}]}}};
   window.firebase={app:()=>({functions:()=>({httpsCallable:()=>async()=>response})})};
   window.renderAdminSeasonEventRows=data=>DJ48AdminRender.renderAdminSeasonEventRows(data,{normalizeSeasonEvents:v=>v,maxRows:6});
  });
  await page.addScriptTag({path:'public/js/admin-season-draft.js'});
  await page.locator('#season-draft-load').click();await page.locator('#season-draft-apply').click();
  const appended=await page.evaluate(()=>DJ48AdminForm.getAdminSeasonEventsFormValues());assert.equal(appended.items.length,2);assert.equal(appended.items[0].eventId,'stable-season');assert.equal(appended.items[1].active,false);
  await page.locator('#admin-season-event-list article').first().screenshot({path:'/tmp/integrated-season-admin.png'});
  console.log('PASS integrated admin: stable ID, goal/reward roundtrip, toggles, append draft preserves edits and stays inactive');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
