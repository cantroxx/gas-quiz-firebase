#!/usr/bin/env node
'use strict';
// Public shell only. Never logs in; backend requests are blocked.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const stage = '/tmp/site-loading-release-20261004/hosting';
const plan = JSON.parse(fs.readFileSync(stage + '/hosting-plan.json'));
const base = 'https://dj48-quiztown-firebase.web.app';
const candidate = process.argv.includes('--candidate');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function main() {
  if(!candidate) {
    const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/';
    const auth=require(lib+'auth'), {requireAuth}=require(lib+'requireAuth');
    await requireAuth({project:'dj48-quiztown-firebase',...auth.getGlobalDefaultAccount()});
    const live=await require(lib+'hosting/api').getChannel('-','dj48-quiztown-firebase','live');
    assert(live.release.version.name.endsWith('/'+plan.version.split('/').pop()));
    for(const [file,hash] of Object.entries(plan.rawHashes)) {
      const response=await fetch(`${base}/${file}?loading-verify=${Date.now()}`);
      assert(response.ok,file);
      assert.equal(digest(Buffer.from(await response.arrayBuffer())),hash,file);
    }
  }
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs',{urls:['*identitytoolkit.googleapis.com*','*securetoken.googleapis.com*','*firestore.googleapis.com*','*firebasestorage.googleapis.com*','*cloudfunctions.net*','*run.app*','*firebaseio.com*','*storage.googleapis.com*',base+'/api/*']});
    if(candidate) await context.route(base+'/**',route=>{
      const pathname=new URL(route.request().url()).pathname;
      const file=pathname==='/'?'index.html':pathname.slice(1);
      if(!Object.hasOwn(plan.rawHashes,file)) return route.continue();
      return route.fulfill({path:path.join(stage,'candidate',file),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8'});
    });
    await page.goto(base+'/?loading-verify='+Date.now(),{waitUntil:'load'});
    await page.locator('#member-link-form').waitFor({state:'visible'});
    const state=await page.evaluate(()=>({generation:typeof DJ48ClassroomState.getGeneration,revision:typeof DJ48ClassroomState.getRevision,
      workspace:typeof DJ48ClassroomWorkspace,bundle:document.querySelector('script[src*="app.bundle.js"]').src,
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth}));
    assert.equal(state.generation,'function');assert.equal(state.revision,'function');
    assert.notEqual(state.workspace,'undefined');assert.match(state.bundle,/classroom-loading-20261004/);
    assert.equal(state.horizontalOverflow,false);assert.deepEqual(errors,[]);
    const result={mode:candidate?'candidate':'live',version:plan.version,verifiedFiles:Object.keys(plan.rawHashes),publicShell:state,errors};
    fs.writeFileSync(stage+'/'+(candidate?'candidate-verification':'live-verification')+'.json',JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
