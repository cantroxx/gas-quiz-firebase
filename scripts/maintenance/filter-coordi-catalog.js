'use strict';
// Local files only. --write applies the reviewed filter; default verifies consistency.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const policy = require('../../public/coordi-shop/catalog-filter');
const root = path.resolve(__dirname, '../..');
const verifiedPath = path.join(root, 'public/coordi-shop/data/verified-top50.json');
const serverPath = path.join(root, 'functions/coordi-shop/catalog.json');
const verified = JSON.parse(fs.readFileSync(verifiedPath, 'utf8'));
const server = JSON.parse(fs.readFileSync(serverPath, 'utf8'));
const before = Object.keys(server).length;
const selected = new Map();
const excluded = new Map((verified.selectionExcluded || []).map(item => [`${item.category}-${item.code}-${item.listGender}`, item]));
for(const [category, byGender] of Object.entries(verified.itemsByCategoryGender)) {
  for(const [gender, items] of Object.entries(byGender)) {
    byGender[gender] = items.filter(item => {
      const reason = policy.exclusionReason(item);
      if(reason) excluded.set(`${item.category}-${item.code}-${gender}`, { ...item, listGender: gender, exclusionReason: reason });
      else excluded.delete(`${item.category}-${item.code}-${gender}`);
      return !reason;
    }).sort(policy.compareDisplay).map((item, index) => ({ ...item, displayRank: index + 1 }));
    verified.counts[category][gender] = byGender[gender].length;
    for(const item of byGender[gender]) {
      const id = `${item.category}-${item.code}`;
      assert(server[id], `Missing server price for ${id}; review pricing before adding items.`);
      if(!selected.has(id)) selected.set(id, { ...server[id], genders: [] });
      selected.get(id).genders.push(gender);
    }
  }
}
verified.selectionExcluded = [...excluded.values()];
verified.selectionPolicy = {
  cashOnly: true, exceptions: ['reviewed-skin-codes'], filterVersion: policy.version,
  sort: 'label-first-stat-package-last-then-last-30-days-usage',
  minimumClothingUsage: 6,
  minimumClothingUsageCategories: ['top', 'bottom'],
  minimumClothingUsageExceptions: ['master', 'special', 'transparent', 'unranked'],
  note: 'Require cash=true or cash=1 except reviewed skin codes; exclude shields, reviewed event rewards and Meister symbols. Exclude non-label tops/bottoms with known popularity.usedCount <= 5. Acquisition review is partial; unreviewed cash items remain. Master and special labels share priority; reviewed stat-package items sort last, then popularity.usedCount (fallback: original usedCount). Original source observations are preserved.'
};
const nextServer = Object.fromEntries(selected);
if(process.argv.includes('--write')) {
  fs.writeFileSync(verifiedPath, JSON.stringify(verified, null, 2) + '\n');
  fs.writeFileSync(serverPath, JSON.stringify(nextServer, null, 2) + '\n');
} else {
  assert.deepEqual(JSON.parse(fs.readFileSync(verifiedPath, 'utf8')), verified, 'Run filter-coordi-catalog.js --write to update the display catalog.');
  assert.deepEqual(server, nextServer, 'Display and server catalogs differ.');
}
console.log(`Coordi catalog ${process.argv.includes('--write') ? 'updated' : 'verified'}: ${before} -> ${selected.size} unique items; ${excluded.size} archived gender rows.`);
