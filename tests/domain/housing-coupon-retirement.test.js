const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync(process.env.HOUSING_FUNCTION_SOURCE || 'functions/index.js', 'utf8');
const start = source.indexOf('exports.purchaseHousingItem =');
const end = source.indexOf('\n});', start) + 4;
assert(start > 0 && end > start);
const writes = [];
const reference = path => ({ path, id: path.split('/').at(-1), collection: name => ({ doc: id => reference(path + '/' + name + '/' + id) }) });
const transaction = {
  get: async ref => ({ exists: !ref.path.startsWith('userInventory/'), data: () => ref.path.startsWith('shopItems/')
    ? { enabled: true, price: 20, priceType: 'djCoin' } : { djCoin: 100, housingCoupons: 99 } }),
  set: (ref, data) => writes.push({ path: ref.path, data })
};
class AppError extends Error { constructor(code, message) { super(message); this.code = code; } }
const context = { exports: {}, REGION: 'test', onCall: (_, handler) => handler, requireAuth: () => 'uid', normalizeId: value => value,
  HttpsError: AppError, getFeatureFlags: async () => ({}), assertLinkedPurchasingMemberAuth: async () => ({}), assertHousingNotSuspended: () => {}, assertFeatureEnabledForMember: () => {},
  FieldValue: { serverTimestamp: () => 'time', increment: value => value },
  db: { collection: name => ({ doc: id => reference(name + '/' + (id || 'log')) }), runTransaction: fn => fn(transaction) } };
vm.runInNewContext(source.slice(start, end), context);
(async () => {
  const purchase = useCoupon => context.exports.purchaseHousingItem({ data: { memberUserId: 'member', itemId: 'room_chair', useCoupon } });
  await assert.rejects(purchase(true), { code: 'failed-precondition' });
  assert.equal(writes.length, 0, 'Retired coupon purchase must not write even with a stale positive balance');
  const result = await purchase(false);
  assert.equal(result.nextDjCoin, 80); assert.equal(result.pricePaid, 20);
  assert.equal(writes.find(write => write.path === 'userEconomy/member').data.djCoin, 80);
  console.log('PASS housing purchase: stale coupon rejected without writes; DJ coin purchase preserved.');
})().catch(error => { console.error(error); process.exitCode = 1; });
