'use strict';
// Local catalog preparation only. Explicit --write downloads public preview sprites;
// no Firebase connection or student data. Inputs are saved public ranking/label snapshots.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const policy = require('../../public/coordi-shop/catalog-filter');
const renderer = require('../../functions/coordi-shop/render.cjs');
const option = flag => process.argv[process.argv.indexOf(flag) + 1];
assert(process.argv.includes('--ranking') && process.argv.includes('--labels'), 'Provide --ranking FILE --labels FILE');
const ranking = JSON.parse(fs.readFileSync(option('--ranking')));
const labels = JSON.parse(fs.readFileSync(option('--labels')));
const verifiedPath = path.join(root, 'public/coordi-shop/data/verified-top50.json');
const serverPath = path.join(root, 'functions/coordi-shop/catalog.json');
const verified = JSON.parse(fs.readFileSync(verifiedPath));
const server = JSON.parse(fs.readFileSync(serverPath));
const raw = require('../../public/coordi-shop/data/maple-cosmetics-catalog.json').items;
const limits = { top: null, bottom: null, overall: 150, hat: 100, shoes: 100, cape: 100, weapon: 100, glove: 75, faceAccessory: 75, eyeAccessory: 75, earring: 75 };
const keys = { top: 'dress', overall: 'dress', bottom: 'pants', hat: 'cap', faceAccessory: 'faceDeco', eyeAccessory: 'eyeDeco', earring: 'earring', shoes: 'shoes', cape: 'cape', weapon: 'weapon', glove: 'glove' };
// Equipment IDs encode male/female/unisex in the thousands digit. Check against
// every previously verified clothing row before applying the rule to new items.
const genderOf = code => ['male', 'female'][Math.floor(Number(code) / 1000) % 10] || 'all';
for(const category of Object.keys(limits)) for(const rows of Object.values(verified.itemsByCategoryGender[category])) {
  for(const item of rows) assert.equal(genderOf(item.code), item.gender, `Gender convention ${item.code}`);
}
const jobs = [];
for(const [category, limit] of Object.entries(limits)) {
  const ranked = new Map(ranking[category].rows.map(row => [Number(row.itemCode), row]));
  const candidates = raw.filter(item => item.category === category && policy.isEligible(item) && ranked.get(item.code)?.cash === true)
    .map(item => ({ code: item.code, name: item.name, category, slot: item.slot, cash: true, gender: genderOf(item.code),
      usedCount: ranked.get(item.code).usedCount, rank: ranked.get(item.code).rank,
      popularity: { usedCount: ranked.get(item.code).usedCount, rank: ranked.get(item.code).rank },
      labelType: labels[item.code]?.label || null, labelSeason: labels[item.code]?.season || null,
      ...(item.transparent ? { transparent: true, transparencyType: 'transparent' } : {})
    })).filter(policy.isEligible).sort((a, b) => b.usedCount - a.usedCount || a.rank - b.rank);
  for(const gender of ['male', 'female']) {
    const existing = new Set(verified.itemsByCategoryGender[category][gender].map(item => item.code));
    const selected = candidates.filter(item => item.gender === 'all' || item.gender === gender).slice(0, limit ?? Infinity);
    for(const item of selected) if(!existing.has(item.code)) jobs.push({ item, gender });
  }
}
console.log('Expansion plan:', JSON.stringify(Object.fromEntries(Object.keys(limits).map(category => [category, jobs.filter(j => j.item.category === category).length]))), 'new gender rows:', jobs.length);
if(!process.argv.includes('--write')) process.exit(0);
const cacheDir = option('--cache');
assert(process.argv.includes('--cache'), 'Provide --cache DIR for resumable downloads');
fs.mkdirSync(cacheDir, { recursive: true });
async function preview(job) {
  const { item, gender } = job;
  const stem = `${gender}-${item.code}`;
  const json = path.join(cacheDir, `${stem}.json`), png = path.join(cacheDir, `${stem}.png`);
  if(fs.existsSync(json) && fs.existsSync(png)) return JSON.parse(fs.readFileSync(json));
  const payload = renderer.normalizeMapleOfficialCoordiPayload({ gender: gender === 'male' ? 0 : 1,
    itemCode: { skin: 12000, face: gender === 'male' ? 20000 : 21000, hair: gender === 'male' ? 30000 : 31000, [keys[item.category]]: item.code }
  });
  const hash = await renderer.requestMeaegiOfficialCoordiHash(payload);
  const response = await fetch(renderer.buildMapleOfficialImageUrl(hash), { signal: AbortSignal.timeout(15000) });
  assert(response.ok, `Sprite HTTP ${response.status}`);
  const image = Buffer.from(await response.arrayBuffer());
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert(image.length > 1000 && image.length < 500000);
  const result = { ...item, thumbnail: `/coordi-shop/verified/${stem}.png`, hash, imageBytes: image.length };
  fs.writeFileSync(png, image); fs.writeFileSync(json, JSON.stringify(result));
  return result;
}
async function main() {
  let index = 0, completed = 0;
  const prepared = [], failures = [];
  await Promise.all(Array.from({ length: 3 }, async () => {
    while(index < jobs.length) {
      const job = jobs[index++];
      try {
        let result;
        for(let attempt = 0; attempt < 3; attempt++) {
          try { result = await preview(job); break; } catch(error) { if(attempt === 2) throw error; await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1))); }
        }
        prepared.push({ ...job, result });
      } catch(error) { failures.push({ code: job.item.code, gender: job.gender, error: error.message }); }
      completed++;
      if(completed % 100 === 0) console.log(`Verified ${completed}/${jobs.length}; failures ${failures.length}`);
    }
  }));
  if(failures.length) { fs.writeFileSync(path.join(cacheDir, 'failures.json'), JSON.stringify(failures, null, 2)); throw Error(`${failures.length} preview failures; nothing applied. Re-run to resume.`); }
  for(const { item, gender, result } of prepared) {
    fs.copyFileSync(path.join(cacheDir, `${gender}-${item.code}.png`), path.join(root, 'public', result.thumbnail));
    verified.itemsByCategoryGender[item.category][gender].push(result);
    const id = `${item.category}-${item.code}`;
    const price = Object.values(server).find(row => row.category === item.category).price;
    server[id] ||= { id, code: item.code, name: item.name, category: item.category, price, genders: [] };
    if(!server[id].genders.includes(gender)) server[id].genders.push(gender);
  }
  verified.limitPerCategoryGender = null;
  verified.catalogReview.expansion = { reviewedAt: new Date().toISOString(), limits, addedGenderRows: prepared.length, selection: 'all-ranked-cash-tops-bottoms-and-popular-clothing', rankingSources: Object.fromEntries(Object.keys(limits).map(c => [c, ranking[c].url])) };
  verified.catalogReview.transparentCount = 8;
  fs.writeFileSync(verifiedPath, JSON.stringify(verified, null, 2) + '\n');
  fs.writeFileSync(serverPath, JSON.stringify(server, null, 2) + '\n');
  execFileSync(process.execPath, ['scripts/maintenance/filter-coordi-catalog.js', '--write'], { cwd: root, stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/audit/coordi-catalog.js', '--write-report'], { cwd: root, stdio: 'inherit' });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
