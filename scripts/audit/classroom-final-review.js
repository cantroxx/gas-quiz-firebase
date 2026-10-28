// Uses the offline classroom harness and its synthetic fixture. No production calls.
const fs = require('node:fs');
const path = require('node:path');
module.exports = async function reviewClassroom(page, output) {
  fs.mkdirSync(output, { recursive: true });
  const result = { fixture: 'classroom-ui-browser.js synthetic demo class', cases: [] };
  const settle = () => page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
  });
  for(const teacher of [false, true]) {
    for(const [width,height] of [[1440,1000],[768,1024],[390,844]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(teacher => uiRender(teacher), teacher);
      for(const tab of ['quest','market']) {
        await page.evaluate(tab => DJ48ClassroomForm.setActiveClassroomTab(tab),tab);
        if(tab === 'market') await page.locator('[data-product-details="coupon"]').click();
        await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
        await settle();
        const name=`${teacher?'teacher':'student'}-${width}-${tab}`;
        result.cases.push(await page.evaluate(({name,tab,width,height}) => {
          const first=document.querySelector(tab==='quest'?'#classroom-quest-grid .classroom-card':'#classroom-shop-grid [data-classroom-shop-item-id]');
          const r=first.getBoundingClientRect();
          const imgs=[...document.querySelectorAll('#classroom-view img')].filter(i=>i.getClientRects().length && /\/(stationery|illustrations)\//.test(i.src));
          return {name,width,height,firstTop:Math.round(r.top),cardHeight:Math.round(r.height),scrollWidth:document.documentElement.scrollWidth,images:imgs.map(i=>({src:i.getAttribute('src'),width:i.width,height:i.height,boxWidth:i.getBoundingClientRect().width,boxHeight:i.getBoundingClientRect().height}))};
        },{name,tab,width,height}));
        await page.screenshot({path:path.join(output,`${name}.png`),animations:'disabled'});
        if(tab==='market' && width===390) {
          await page.locator('[data-product-details="snack"]').click(); await settle();
          const action=page.locator(teacher?'[data-classroom-shop-edit-id="snack"]':'[data-classroom-shop-buy-id="snack"]');
          const bounds=await action.boundingBox();
          result.cases.at(-1).selectedActionVisible=!!bounds && bounds.y>=0 && bounds.y+bounds.height<=height;
          await page.screenshot({path:path.join(output,`${name}-selected.png`),animations:'disabled'});
          if(!teacher) for(const id of ['snack','lunch']) {
            await page.locator(`[data-classroom-shop-item-id="${id}"]`).screenshot({path:path.join(output,`actual-size-${id}.png`),animations:'disabled'});
          }
        }
      }
    }
  }
  // Two generated assets whose normal UI needs an empty/generic activity fixture.
  if(await page.locator('img[src*="/stationery/"],img[src*="/illustrations/"]').count()) {
    await page.evaluate(()=>{DJ48ClassroomForm.setActiveClassroomTab('quest');uiRender(true);});
    await settle();
    await page.locator('#classroom-quest-grid img[src*="notebook"]').first().screenshot({path:path.join(output,'actual-size-notebook.png')});
    await page.evaluate(()=>{uiData.settings.quests=[];uiRender(true);}); await settle();
    await page.locator('#classroom-quest-grid img[src*="empty"]').screenshot({path:path.join(output,'actual-size-empty.png')});
  }
  fs.writeFileSync(path.join(output,'layout.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
};
