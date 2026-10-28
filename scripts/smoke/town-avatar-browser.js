'use strict';
// All data is synthetic; only read-only status and preview calls are accepted.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright-core');
const candidate=require('./town-ui-candidate-fixture');
const catalog=require('../../functions/coordi-shop/catalog.json');
const server=require('../../functions/classroom/portrait');
const avatar=require('../../public/js/town-avatar');
const hair=Object.values(catalog).find(item=>item.category==='hair'&&item.genders.includes('female'));
const top=Object.values(catalog).find(item=>item.category==='top'&&item.genders.includes('female'));
const profile={owned:[hair.id,top.id],look:{gender:'female',equipped:{hair:hair.id,top:top.id,weapon:'unowned'}},prisms:{[hair.id]:{hairColor:4,tone:20,chroma:5,brightness:0}}};
assert.deepEqual(avatar.savedLookPayload(profile,catalog),server.savedLookPayload(profile));
assert.equal(avatar.savedLookPayload(profile,catalog).itemCode.weapon,undefined);
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='https://avatar.test')return route.abort();return route.fulfill({path:await candidate.file(url.pathname)});});
  await page.setContent('<section class="app-view" id="login-view" hidden></section><section class="app-view" id="town-view"><span class="spatial-guide"></span></section><section class="app-view" id="shop-view" hidden></section>');
  await page.evaluate(({profile,catalog})=>{
   window.member='a';window.uid='auth-a';window.calls=[];window.waiting=[];window.delay=false;window.fail=false;
   window.avatarStatus={profile:{...profile,prisms:{}},prices:catalog};
   const canvas=document.createElement('canvas');canvas.width=32;canvas.height=48;const ctx=canvas.getContext('2d');ctx.fillStyle='#99c55a';ctx.fillRect(4,4,24,40);window.preview=canvas.toDataURL();
   window.DJ48AccountState={getCurrentMemberUserId:()=>member,getFirebaseAuthUser:()=>uid?{uid}:null};
   window.DJ48Firebase={getFirebaseFunctions:()=>({httpsCallable:name=>async payload=>{
    calls.push({name,payload});if(name==='coordiShopAction'&&payload.action!=='status')throw Error('Unexpected mutation');
    if(fail)throw Error('Fixture unavailable');
    const data=name==='coordiShopAction'?structuredClone(avatarStatus):{success:true,imageUrl:preview};
    if(delay)await new Promise(resolve=>waiting.push(resolve));return {data};
   }})};
  },{profile,catalog});
  for(const file of ['coordi-shop/hair-prism.js','coordi-shop/preview-renderer.js','js/features/classroom-portrait.js','js/town-avatar.js'])await page.addScriptTag({path:await candidate.file(file)});
  const ready=()=>page.waitForFunction(()=>document.querySelector('.spatial-guide').dataset.avatarState==='ready');
  await ready();console.log('avatar: initial ready');assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='renderCoordiShopPreview').length),1);
  await page.evaluate(() => {
    const portrait=document.createElement('div'); portrait.className='saved-coordi-avatar';
    document.getElementById('town-view').append(portrait); DJ48TownAvatar.sync();
  });
  await page.waitForFunction(()=>document.querySelector('.saved-coordi-avatar img')?.naturalWidth>0);
  assert.equal(await page.locator('.saved-coordi-avatar').getAttribute('data-avatar-state'),'ready');
  assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='renderCoordiShopPreview').length),1,'New home portrait reuses the saved outfit');
  await page.evaluate(()=>DJ48TownAvatar.refresh(true));assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='renderCoordiShopPreview').length),1,'Unchanged outfit uses cached preview');
  await page.evaluate(()=>{avatarStatus.profile.look.equipped={};return DJ48TownAvatar.refresh(true);});assert.equal(await page.locator('.spatial-guide').getAttribute('data-avatar-state'),'fallback');
  assert.equal(await page.evaluate(()=>DJ48TownAvatar.getState().status),'empty');
  console.log('avatar: empty checked');
  // Hair alone must render; a save arriving during an old empty status read must not be dropped.
  await page.evaluate(()=>{delay=true;DJ48TownAvatar.refresh(true);});
  await page.waitForFunction(()=>waiting.length===1);
  await page.evaluate(({profile,image})=>{
    const hairId=profile.look.equipped.hair;
    avatarStatus.profile={owned:[hairId],prisms:{},look:{gender:'female',equipped:{hair:hairId}}};
    preview=image;window.afterSave=DJ48TownAvatar.refresh(true);
    delay=false;waiting.splice(0).forEach(resolve=>resolve());
  },{profile,image:'data:image/png;base64,'+fs.readFileSync('docs/product/town-avatar-mail-review-2026-10-18/hair-only.png').toString('base64')});
  await page.evaluate(()=>afterSave);await ready();
  assert.deepEqual(await page.evaluate(()=>Object.keys(calls.filter(c=>c.name==='renderCoordiShopPreview').at(-1).payload.look.itemCode)),['skin','face','hair']);
  await page.waitForFunction(()=>document.querySelector('.spatial-guide img').naturalWidth>0);
  console.log('avatar: hair-only saved during pending status renders successfully');
  await page.evaluate(profile=>{avatarStatus.profile={...profile,prisms:{}};delay=true;DJ48TownAvatar.refresh(true);},profile);
  await page.waitForFunction(()=>waiting.length===1);console.log('avatar: delayed status');
  await page.evaluate(()=>{member='b';uid='auth-b';DJ48TownAvatar.sync();});
  assert.equal(await page.locator('.spatial-guide img').getAttribute('src'),null,'Account change clears previous image immediately');
  await page.evaluate(()=>{delay=false;waiting.splice(0).forEach(resolve=>resolve());});await ready();
  console.log('avatar: account switch ready');
  const memberCalls=await page.evaluate(()=>calls.filter(c=>c.name==='coordiShopAction').map(c=>c.payload.memberUserId));assert(memberCalls.includes('b'));
  await page.evaluate(()=>{avatarStatus.profile.look.equipped={};delay=true;DJ48TownAvatar.refresh(true);});await page.waitForFunction(()=>waiting.length===1);
  await page.evaluate(()=>{member='';uid='';document.getElementById('town-view').hidden=true;document.getElementById('login-view').hidden=false;});
  await page.waitForFunction(()=>document.querySelector('.spatial-guide').dataset.avatarState==='fallback');
  await page.evaluate(()=>{delay=false;waiting.splice(0).forEach(resolve=>resolve());});
  assert.equal(await page.locator('.spatial-guide img').getAttribute('src'),null,'Late logout response cannot restore old image');
  console.log('avatar: logout checked');
  await page.evaluate(profile=>{member='c';uid='auth-c';avatarStatus.profile={...profile,prisms:{}};fail=true;document.getElementById('login-view').hidden=true;document.getElementById('town-view').hidden=false;},profile);
  await page.evaluate(()=>DJ48TownAvatar.refresh(true));assert.equal(await page.locator('.spatial-guide').getAttribute('data-avatar-state'),'fallback');
  assert.equal(await page.evaluate(()=>DJ48TownAvatar.getState().status),'error');
  await page.evaluate(()=>{fail=false;return DJ48TownAvatar.refresh(true);});await ready();
  await page.evaluate(()=>{document.getElementById('town-view').hidden=true;document.getElementById('shop-view').hidden=false;});
  const before=await page.evaluate(()=>calls.length);
  await page.evaluate(()=>{document.getElementById('shop-view').hidden=true;document.getElementById('town-view').hidden=false;});
  await page.waitForFunction(before=>calls.length>before,before);
  assert.deepEqual(errors,[]);console.log('PASS saved avatar: server payload parity, owned-only outfit, dye parameters, preview cache, account switch, late responses, logout, failure/retry, refresh after shop; no mutations.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
