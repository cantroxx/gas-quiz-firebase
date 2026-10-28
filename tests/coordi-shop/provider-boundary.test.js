'use strict';
const assert = require('node:assert/strict');
const { createCoordiPreviewService } = require('../../functions/coordi-shop/service');
const { createProvider } = require('../../public/coordi-shop/data-provider');
const { createRenderer } = require('../../public/coordi-shop/preview-renderer');
const hair = require('../../public/coordi-shop/hair-prism');
class AppError extends Error { constructor(code, message) { super(message); this.code = code; } }

(async () => {
  const look = { itemCode: { skin: 12000, hair: 31000, face: 21000 }, itemPrism: { hair: { baseColor: 0, mixColor: 7, mixRate: 63 } } };
  const original = structuredClone(look);
  const image = { success: true, imageUrl: 'data:image/png;base64,cG5n' };
  let calls = 0, authorized = true, release;
  const gate = new Promise(resolve => { release = resolve; });
  const provider = { id: 'synthetic', version: 'assets-1', normalize: value => value,
    render: async payload => { calls++; assert.deepEqual(payload, look); await gate; return image; } };
  const service = createCoordiPreviewService({ ErrorType: AppError, provider,
    authorize: async () => { if(!authorized) throw new AppError('permission-denied', 'closed'); },
    fetchImage: () => assert.fail('Injected provider must never fetch an official image'),
    renderHash: () => assert.fail('Injected provider must never request a hash') });
  const a = service('member', { look });
  const b = service('member', { look: { itemPrism: look.itemPrism, itemCode: { face: 21000, hair: 31000, skin: 12000 } } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1, 'Concurrent equivalent payloads share work');
  authorized = false;
  await assert.rejects(service('member', {look}), {code:'permission-denied'});
  release(); assert.deepEqual(await a, image); assert.deepEqual(await b, image);
  await assert.rejects(service('member', {look}), {code:'permission-denied'});
  authorized = true;
  assert.deepEqual(await service('member', {look}), image); assert.equal(calls, 1);
  provider.version = 'assets-2';
  await service('member', {look}); assert.equal(calls, 2, 'Asset/rule version invalidates images');
  let attempt = 0;
  const retry = createCoordiPreviewService({ ErrorType: AppError, authorize: async () => {},
    provider: {...provider, render: async () => { if(++attempt === 1) throw Error('temporary'); return image; }} });
  await assert.rejects(retry('member', {look}), /temporary/);
  assert.deepEqual(await retry('member', {look}), image);
  assert.equal(attempt, 2, 'Failures are not cached');

  const paths = [];
  const data = createProvider(async (url, options) => {
    paths.push(url); assert.equal(options.cache, 'no-store');
    return {ok:true,json:async()=>url.endsWith('runtime-config.json')?{schemaVersion:1,mode:'official'}:{items:[]}};
  });
  for(const kind of ['catalog','featuredHair','verified','effects']) await data.load(kind);
  assert.equal(paths.filter(url=>url.endsWith('runtime-config.json')).length,1);
  assert(paths.slice(1).every(url => url.startsWith('/coordi-shop/data/')));
  await assert.rejects(data.load('https://example.test'), /Unknown/);
  assert.equal(data.thumbnail({code:31000}, [{code:31000,thumbnail:'/fixture.png'}]), '/fixture.png');

  let current = true, finish;
  const shared = createRenderer({ loadHair: async () => hair,
    assertCurrent: () => { if(!current) throw Error('Account changed'); },
    render: async payload => { assert.deepEqual(payload, look); return image; } });
  assert.deepEqual(await shared(look), image, 'Native mix accepts provider-neutral PNG without an external hash');
  const delayed = createRenderer({ loadHair: async () => hair,
    assertCurrent: () => { if(!current) throw Error('Account changed'); },
    render: () => new Promise(resolve => { finish = resolve; }) });
  const obsolete = delayed(look);
  await new Promise(resolve => setImmediate(resolve));
  current = false; finish(image);
  await assert.rejects(obsolete, /Account changed/);
  assert.deepEqual(look, original, 'Rendering never rewrites the saved mix schema');
  console.log('PASS provider boundaries: auth before cache/pending, canonical keys, version invalidation, retry, no external hash coupling, data paths, native mix and stale-account response');
})().catch(error => { console.error(error); process.exitCode = 1; });
