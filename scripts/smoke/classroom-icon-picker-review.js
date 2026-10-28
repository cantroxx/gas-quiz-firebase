const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(page,output)=>{
 fs.mkdirSync(output,{recursive:true});
 const entries=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../docs/product/classroom-market-reserve-2026-10-17/prompts.json')));
 await page.evaluate(()=>{uiRender(true);DJ48ClassroomForm.setActiveClassroomTab('market');document.getElementById('classroom-shop-editor-panel').open=true;});
 const selected=[];
 for(const entry of entries){
  const key='shopReserve'+entry.key[0].toUpperCase()+entry.key.slice(1);
  await page.locator('#classroom-shop-icon-input').selectOption(key);
  await page.locator('#classroom-shop-art-preview img').evaluate(i=>i.decode());
  const value=await page.evaluate(()=>({form:DJ48ClassroomForm.getClassroomShopItemFormValues(),src:document.querySelector('#classroom-shop-art-preview img').getAttribute('src')}));
  assert.equal(value.form.icon,key);assert(value.src.endsWith('/'+entry.key+'-320.webp'));selected.push(value);
 }
 // Existing registered custom images remain until the teacher explicitly chooses another icon.
 await page.evaluate(()=>DJ48ClassroomForm.setClassroomShopItemFormValues({itemId:'homework-pass',title:'선택 시험',icon:'shopHomeworkPass',imageUrl:'/images/classroom/market-v2/seat-320.webp',pricePoint:50}));
 assert((await page.locator('#classroom-shop-art-preview img').getAttribute('src')).endsWith('seat-320.webp'));
 await page.locator('#classroom-shop-icon-input').selectOption('shopReserveAquarium');
 const saved=await page.evaluate(()=>DJ48ClassroomForm.getClassroomShopItemFormValues());assert.equal(saved.imageUrl,'');assert.equal(saved.pricePoint,50);assert.equal(saved.itemType,'coupon');assert.equal(saved.boostPoint,0);
 await page.evaluate(item=>{DJ48ClassroomForm.setClassroomShopItemFormValues(item);},saved);
 assert.equal(await page.locator('#classroom-shop-icon-input').inputValue(),'shopReserveAquarium');
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});await page.locator('#classroom-shop-art-preview').scrollIntoViewIfNeeded();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(output,'picker-'+width+'.png'),fullPage:true,animations:'disabled'});
 }
 await page.evaluate(item=>{uiData.economyBoard.shopItems=[item];uiData.wallet.point=500;uiRender(false);DJ48ClassroomForm.setActiveClassroomTab('market');},saved);
 await page.locator('[data-classroom-market-tab="point"]').click();
 const product=page.locator('[data-classroom-shop-item-id="homework-pass"] .classroom-shop-art-image');await product.scrollIntoViewIfNeeded();await product.evaluate(i=>i.decode());assert((await product.getAttribute('src')).endsWith('aquarium-320.webp'));
 await page.evaluate(()=>{uiData.studentCards[0].equippedItems=[{itemId:'custom',icon:'shopReserveAquarium',title:'작은 수족관'}];uiRender(false);DJ48ClassroomForm.setActiveClassroomTab('classroom');});
 const equipped=page.locator('[data-classroom-student-id="S1"] .classroom-student-equipped-image');await equipped.scrollIntoViewIfNeeded();await equipped.evaluate(i=>i.decode());assert((await equipped.getAttribute('src')).endsWith('aquarium-320.webp'));
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({selected,saved,studentProduct:saved.icon,equippedProduct:await equipped.getAttribute('src'),customImagePreservedUntilSelection:true,defaultItemRespectsChosenIcon:true},null,2));
 console.log('PASS picker: 12 images decode; form persistence, custom-image replacement, default-item override, student rendering, prices/effects preserved, 320–1440px.');
};
