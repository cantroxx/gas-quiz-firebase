// Offline, synthetic-data review of the real market renderer.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
module.exports = async (page, output) => {
  fs.mkdirSync(output, {recursive:true});
  const source=fs.readFileSync(path.resolve(__dirname,'../../functions/index.js'),'utf8');
  const arrays=['DEFAULT_CLASSROOM_POINT_SHOP_ITEMS','DEFAULT_CLASSROOM_POINT_BOOST_ITEMS'].map(name => vm.runInNewContext(source.match(new RegExp('const '+name+' = \\[[\\s\\S]*?^\\];','m'))?.[0]?.replace('const '+name+' = ','') || '[]'));
  const items=arrays.flat(); assert.equal(items.length,20);
  items.push({itemId:'billboard-ticket',title:'전광판 이용권',pricePoint:30,itemType:'billboardTicket'});
  await page.evaluate(items=>{uiData.economyBoard.shopItems=items;uiData.economyBoard.myDjCoin=500;uiData.wallet.point=250;uiData.economyBoard.purchases=[];uiRender(false);DJ48ClassroomForm.setActiveClassroomTab('market');},items);
  const observed=[];
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    for(const pane of ['point','coin']) {
      await page.locator(`[data-classroom-market-tab="${pane}"]`).click();
      const cards=page.locator('.classroom-card--shop:visible');
      assert.equal(await cards.count(),pane==='point'?6:15);
      for(let i=0;i<await cards.count();i++) {
        const card=cards.nth(i);await card.scrollIntoViewIfNeeded();
        await card.locator('.classroom-shop-art-image').evaluate(image=>image.decode());
      }
      const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...document.querySelectorAll('.classroom-card--shop')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{const img=e.querySelector('.classroom-shop-art-image');return {id:e.dataset.classroomShopItemId,src:img.getAttribute('src'),loaded:img.naturalWidth>0,width:img.getBoundingClientRect().width,reward:e.querySelector('.classroom-card-reward').textContent};})}));
      assert.equal(data.overflow,false);assert(data.images.every(i=>i.loaded&&i.width>=(width===320?85:100)),JSON.stringify({width,pane,...data}));
      assert.equal(new Set(data.images.map(i=>i.src)).size,data.images.length);
      for(const entry of data.images){const item=items.find(i=>i.itemId===entry.id);assert(entry.reward.includes(String(item.priceCoin||item.pricePoint)));}
      observed.push({width,pane,...data});
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      await page.screenshot({path:path.join(output,`${pane}-${width}.png`),fullPage:true,animations:'disabled'});
    }
  }
  // The image layer must preserve custom artwork and recover from a broken custom URL.
  const fallback=await page.evaluate(async()=>{
    const host=document.createElement('div');document.body.append(host);
    const image=DJ48ClassroomShopArt.createImage({itemId:'seat-choice'},'/images/classroom/market-v2/music-320.webp',true);host.append(image);await image.decode();const custom=image.getAttribute('src');
    image.dispatchEvent(new Event('error'));await image.decode();const replacement=image.getAttribute('src');host.remove();return {custom,replacement};
  });
  assert(fallback.custom.endsWith('music-320.webp'));assert(fallback.replacement.endsWith('seat-320.webp'));
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({observed,fallback},null,2));
  console.log('PASS market: 21 distinct products, prices, image loading, custom fallback, 4 responsive widths.');
};
