'use strict';
const assert = require('node:assert/strict');
const { createCoordiPreviewService } = require('../../functions/coordi-shop/service');
class AppError extends Error { constructor(code, message) { super(message); this.code = code; } }
(async () => {
  let renders = 0, authorizations = 0;
  const service = createCoordiPreviewService({
    ErrorType: AppError,
    authorize: async uid => { authorizations++; if(uid !== 'admin') throw new AppError('permission-denied', 'admin only'); },
    renderHash: async payload => { renders++; assert.equal(payload.itemPrism.skin.tone, 170); assert.equal(payload.itemCode.dress,1042194); assert.equal(payload.itemCode.pants,1062067); return 'A'.repeat(100); },
    fetchImage: async () => ({ok:true,headers:new Headers({'content-type':'image/png'}),arrayBuffer:async()=>Buffer.from('png')})
  });
  const input = {look:{itemCode:{skin:12000,face:21000,hair:31000},itemPrism:{skin:{tone:170}}}};
  await assert.rejects(service(null,input), {code:'unauthenticated'});
  await assert.rejects(service('student',input), {code:'permission-denied'});
  assert.equal(renders,0);
  const first=await service('admin',input);
  assert.equal(first.imageUrl,'data:image/png;base64,cG5n');
  assert.deepEqual(await service('admin',input),first);
  assert.equal(renders,1);
  await assert.rejects(service('student',input), {code:'permission-denied'});
  await assert.rejects(service('admin',{}), {code:'invalid-argument'});
  assert.equal(authorizations,5);
  assert.deepEqual(input.look.itemCode,{skin:12000,face:21000,hair:31000},'Default clothes never mutate saved input');
  const {withDefaultOutfit}=require('../../functions/coordi-shop/default-outfit');
  const catalog=require('../../functions/coordi-shop/catalog.json');
  const overall=Object.values(catalog).find(i=>i.category==='overall').code;
  assert.deepEqual(withDefaultOutfit({itemCode:{dress:overall}}).itemCode,{dress:overall},'No bottoms under an overall');
  assert.deepEqual(withDefaultOutfit({itemCode:{dress:1042319,pants:1062207}}).itemCode,{dress:1042319,pants:1062207},'Preserve chosen clothing');
  assert.deepEqual(withDefaultOutfit({itemCode:{pants:1062207}}).itemCode,{dress:1042194,pants:1062207},'Fill only missing top');
  console.log('PASS unauthenticated/student rejection, admin render, authorization before cache, prism passthrough, invalid payload');
})().catch(error=>{console.error(error);process.exitCode=1;});
