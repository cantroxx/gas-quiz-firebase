'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { projectCatalog } = require('../../scripts/build-coordi-display-catalog');
const filter = require('../../public/coordi-shop/catalog-filter');
const sourcePath = require.resolve('../../public/coordi-shop/data/verified-top50.json');
const original = JSON.parse(fs.readFileSync(sourcePath));
const digest = () => crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
const before = digest();
execFileSync(process.execPath, ['scripts/build-coordi-display-catalog.js', '--check'], { stdio: 'inherit' });
assert.equal(digest(), before);
const display = require('../../public/coordi-shop/data/verified-top50-display.json');
const prices = require('../../functions/coordi-shop/catalog.json');
let rows = 0;
for(const [category, genders] of Object.entries(original.itemsByCategoryGender)) {
  for(const [gender, items] of Object.entries(genders)) {
    const lean = display.itemsByCategoryGender[category][gender];
    const omitAudit = ({hash, imageBytes, ...item}) => item;
    assert.deepEqual(lean, items.map(omitAudit), `Every display field and order retained: ${category}/${gender}`);
    const eligible = data => data.filter(filter.isEligible).sort(filter.compareDisplay).map(omitAudit);
    assert.deepEqual(eligible(lean), eligible(items), `Same eligibility and ranking: ${category}/${gender}`);
    for(const item of lean) {
      assert(!Object.hasOwn(item, 'hash') && !Object.hasOwn(item, 'imageBytes'));
      assert(prices[`${item.category}-${item.code}`], `Server product retained: ${item.code}`);
      rows++;
    }
  }
}
assert.deepEqual(Object.keys(display.itemsByCategoryGender), Object.keys(original.itemsByCategoryGender));
const sample = {itemsByCategoryGender:{hat:{female:[{code:1,hash:'audit',imageBytes:40,thumbnail:'image.png',futureField:{hash:'meaningful'}}]}}};
assert.deepEqual(projectCatalog(sample).itemsByCategoryGender.hat.female[0], {code:1,thumbnail:'image.png',futureField:{hash:'meaningful'}});
assert.equal(sample.itemsByCategoryGender.hat.female[0].hash, 'audit');
console.log(`PASS display catalog: ${rows} rows preserve product identity, fields, eligibility, order and source.`);
