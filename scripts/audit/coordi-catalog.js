'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const policy = require('../../public/coordi-shop/catalog-filter');
const verified = require('../../public/coordi-shop/data/verified-top50.json');
const server = require('../../functions/coordi-shop/catalog.json');
const root = path.resolve(__dirname, '../..');
const unique = new Map(), categories = [];
for(const [category, genders] of Object.entries(verified.itemsByCategoryGender)) {
  const summary = { category };
  for(const [gender, rows] of Object.entries(genders)) {
    assert(['male', 'female'].includes(gender));
    assert.equal(new Set(rows.map(item => item.code)).size, rows.length, `Duplicate ${category}/${gender}`);
    assert.equal(verified.counts[category][gender], rows.length);
    rows.forEach((item, index) => {
      const id = `${category}-${item.code}`;
      assert(policy.isEligible(item), `Excluded item ${id}`);
      assert.equal(item.category, category);
      assert(item.gender === 'all' || item.gender === gender, `Gender mismatch ${id}`);
      assert.equal(item.displayRank, index + 1);
      assert(!index || policy.compareDisplay(rows[index - 1], item) <= 0, `Out of order ${id}`);
      if(item.popularity?.unranked) {
        assert(policy.isTransparentItem(item), `Only functional transparent items may lack usage: ${id}`);
        assert.equal(item.popularity.usedCount, null); assert.equal(item.popularity.rank, null);
      } else {
        assert(Number.isInteger(item.popularity?.usedCount) && item.popularity.usedCount >= 0, `Missing usage ${id}`);
        assert(Number.isInteger(item.popularity?.rank) && item.popularity.rank > 0);
      }
      assert([null, 'master', 'special'].includes(item.labelType));
      if(item.labelType) assert(Number.isInteger(item.labelSeason) && item.labelSeason > 0);
      assert(server[id]?.genders.includes(gender), `Missing price/gender ${id}`);
      const file = path.join(root, 'public', item.thumbnail);
      const bytes = fs.readFileSync(file);
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid PNG ${file}`);
      assert(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
      const entry = unique.get(id) || {
        id, name: item.name, category, label: item.labelType, labelSeason: item.labelSeason,
        usedCount: item.popularity.usedCount, sourceRank: item.popularity.rank,
        price: server[id].price, displayRanks: {}
      };
      entry.displayRanks[gender] = index + 1;
      unique.set(id, entry);
    });
    summary[gender] = { total: rows.length, labels: rows.filter(policy.isPriorityLabel).length };
  }
  categories.push(summary);
}
assert.deepEqual([...unique.keys()].sort(), Object.keys(server).sort());
const items = [...unique.values()];
const summary = { unique: items.length, master: items.filter(i => i.label === 'master').length, special: items.filter(i => i.label === 'special').length, other: items.filter(i => !i.label).length, rows: items.reduce((sum, i) => sum + Object.keys(i.displayRanks).length, 0) };
if(process.argv.includes('--write-report')) {
  fs.writeFileSync(path.join(root, 'docs/product/COORDI_CATALOG_FULL_AUDIT_2026-09-29.json'), JSON.stringify({ review: verified.catalogReview, summary, categories, items }, null, 2) + '\n');
}
console.log('PASS full coordi catalog audit:', JSON.stringify(summary));
