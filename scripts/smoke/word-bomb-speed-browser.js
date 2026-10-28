'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
const {serve}=require('./word-bomb-test-server');
(async()=>{
 const server=process.env.WORD_BOMB_SPEED_URL?null:await serve();let browser;
 try {
  browser=await chromium.launch({executablePath:process.env.SMOKE_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{Math.random=()=>0.5;});
  await page.goto(process.env.WORD_BOMB_SPEED_URL||server.url+'/word-bomb/');
  await page.click('#mode-bot');
  assert.equal(await page.locator('#game-speed option').count(),4);
  await page.selectOption('#game-speed','3');
  await page.selectOption('#turn-seconds','10');
  await page.click('#practice');
  await page.waitForFunction(()=>WordBombApp.state()?.phase==='playing'&&!document.getElementById('submit-word').disabled);
  assert.equal(await page.evaluate(()=>WordBombApp.state().options.speed),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const word=await page.evaluate(()=>WordBombDomain.practiceChoices(WordBombApp.state())[0]);
  await page.fill('#word-input',word);await page.press('#word-input','Enter');
  await page.waitForFunction(()=>WordBombApp.state().turn===2);
  const before=await page.evaluate(()=>({start:WordBombApp.state().turnStartsAt,end:WordBombApp.state().turnEndsAt,durations:document.getElementById('flight').getAnimations().map(a=>a.effect.getTiming().duration)}));
  assert.equal(before.end-before.start,10000);
  for(const duration of before.durations)assert.ok(duration<=800/3+1);
  await page.waitForFunction(()=>WordBombApp.state().turn===3,{}, {timeout:4000});
  const after=await page.evaluate(()=>WordBombApp.state());
  // With deterministic RNG the 2800ms response becomes ~933ms; excludes the next handoff.
  const response=after.turnStartsAt-Math.round(1000/3)-before.start;
  assert.ok(response>=900&&response<1800,`3x bot response: ${response}ms`);
  assert.equal(after.turnEndsAt-after.turnStartsAt,10000);
  await page.screenshot({path:'/tmp/word-bomb-speed-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(`Playback speed: mobile settings, 3x handoff/animation/bot (${response}ms), unchanged 10s turn passed.`);
 }finally{if(browser)await browser.close();if(server)await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
