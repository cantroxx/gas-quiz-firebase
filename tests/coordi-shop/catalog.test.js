'use strict';
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const filter = require('../../public/coordi-shop/catalog-filter');
const verified = require('../../public/coordi-shop/data/verified-top50.json');
const server = require('../../functions/coordi-shop/catalog.json');

for(const cash of [false, 0, undefined, null, 'false', 'true', '1']) {
  assert.equal(filter.isEligible({ code: 999, name: '상품', cash }), false);
}
for(const cash of [true, 1]) assert(filter.isEligible({ code: 999, name: '상품', cash }));
assert.equal(filter.isEligible({ code: 1012401, name: '레드 워리어 마이스터 심볼', cash: true }), false);
assert(filter.isEligible({ code: 1012837, name: '차원의 수호자 심볼', cash: true }), 'Do not exclude all items named 심볼.');
assert(filter.isEligible({ code: 12015, category: 'skin', cash: false }));
assert(!filter.isEligible({ code: 999, category: 'skin', cash: false }));
assert(!filter.isEligible({ code: 1092067, name: '투명 방패', category: 'shield', cash: true }));
assert(filter.isTransparentItem({ code: 1703129, name: '투명 무기', category: 'weapon' }));
assert(!filter.isTransparentItem({ code: 1092067, name: '투명 방패', category: 'shield' }));
assert.equal(Object.values(server).filter(i => i.category === 'skin').length, 37);
assert.equal(Object.values(server).filter(i => i.category === 'shield').length, 0);
assert.equal(Object.values(server).filter(i => /투명/.test(i.name)).length, 8);
for(const code of [1003271, 1003276, 1702099, 1702190, 1702653]) {
  assert(!filter.isEligible({ code, cash: true }));
  assert(!Object.values(server).some(item => item.code === code));
}
for(const [id, code] of [['hat-1006056', 1006056], ['overall-1053879', 1053879], ['weapon-1703240', 1703240], ['weapon-1703933', 1703933]]) {
  assert.equal(filter.isEligible({ code, cash: true }), false);
  assert.equal(server[id], undefined);
}
assert(verified.selectionExcluded.length > 0);
const curation = require('../../docs/product/COORDI_POPULARITY_REWARD_AUDIT_2026-09-29.json');
const removed = curation.items.filter(item => item.flags.includes('low-usage-removal-candidate') || item.flags.some(flag => flag.startsWith('confirmed-reward:')));
assert.equal(removed.length, 130);
for(const item of curation.items) {
  assert.equal(Boolean(server[`${item.category}-${item.code}`]), !removed.includes(item), `Reviewed selection ${item.code}`);
}
assert.equal(Object.keys(server).length, 1632);
assert.equal(Object.values(server).filter(i => i.category === 'top').length, 213);
assert.equal(Object.values(server).filter(i => i.category === 'bottom').length, 167);
const top = { code: 999, category: 'top', cash: true };
assert(!filter.isEligible({ ...top, popularity: { usedCount: 5 } }));
assert(filter.isEligible({ ...top, popularity: { usedCount: 6 } }));
// Missing observations must never become zero, and the original snapshot cannot override current usage.
for(const usage of [null, undefined, '1']) assert(filter.isEligible({ ...top, usedCount: 1, popularity: { usedCount: usage } }));
for(const labelType of ['master', 'special']) assert(filter.isEligible({ ...top, labelType, popularity: { usedCount: 1 } }));
assert(filter.isEligible({ ...top, transparent: true, popularity: { usedCount: 1 } }));
assert(!filter.isEligible({ ...top, usedCount: 999, popularity: { usedCount: 5 } }));
assert(filter.compareDisplay({ code: 1082892, popularity: { usedCount: 28398 } }, { code: 999, popularity: { usedCount: 10 } }) > 0);
assert(filter.compareDisplay({ code: 1, labelType: 'special', popularity: { usedCount: 1 } }, { code: 2, popularity: { usedCount: 9999 } }) < 0);
assert(filter.compareDisplay({ code: 1, labelType: 'master', popularity: { usedCount: 1 } }, { code: 2, labelType: 'special', popularity: { usedCount: 2 } }) > 0);
assert(filter.compareDisplay({ code: 1, usedCount: 9999, popularity: { usedCount: 1 } }, { code: 2, usedCount: 1, popularity: { usedCount: 2 } }) > 0);
for(const item of verified.selectionExcluded) {
  assert(item.exclusionReason);
  assert.equal(server[`${item.category}-${item.code}`], undefined);
}
execFileSync(process.execPath, ['scripts/maintenance/filter-coordi-catalog.js'], { cwd: path.resolve(__dirname, '../..'), stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/audit/coordi-catalog.js'], { cwd: path.resolve(__dirname, '../..'), stdio: 'inherit' });
console.log('PASS catalog: strict cash flags, reviewed event exclusions, Meister override, valid symbol retained, display/server consistency.');
