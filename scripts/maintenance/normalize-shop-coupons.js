#!/usr/bin/env node
'use strict';
// Explicitly authorized one-time reset. Preview/backup by default; --commit is atomic.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { Firestore, Timestamp, FieldValue } = require('@google-cloud/firestore');
const { GoogleAuth, OAuth2Client } = require('google-auth-library');
const PROJECT = 'dj48-quiztown-firebase', RESET = 'manual-10-20261018';
const BACKUP = path.resolve(__dirname, '../../exports/shop-coupons-20261018/backup.json');
const HOUSING_FIELDS = ['housingCoupons', 'lastHousingCouponWeek', 'housingCouponResetId', 'coupon10GrantedAt'];
const SHOP_FIELDS = ['purchaseCoupons', 'purchaseCouponGrant'];
const encode = value => value instanceof Timestamp ? { timestamp: [value.seconds, value.nanoseconds] } : { value };
function savedFields(data, fields) {
  return Object.fromEntries(fields.filter(key => Object.hasOwn(data, key)).map(key => [key, encode(data[key])]));
}
async function preview(db) {
  const [users, profiles, economies] = await Promise.all([
    db.collection('users').select().get(),
    db.collection('coordiProfiles').select(...SHOP_FIELDS).get(),
    db.collection('userEconomy').select(...HOUSING_FIELDS).get()
  ]);
  const byId = new Map(profiles.docs.map(doc => [doc.id, doc]));
  const ids = new Set([...users.docs.map(doc => doc.id), ...byId.keys()]);
  const rows = [...ids].map(id => {
    const doc = byId.get(id);
    return { path: 'coordiProfiles/' + id, exists: !!doc, updateTime: doc ? encode(doc.updateTime) : null,
      fields: savedFields(doc?.data() || {}, SHOP_FIELDS), type: 'shop' };
  });
  for (const doc of economies.docs) {
    const fields = savedFields(doc.data(), HOUSING_FIELDS);
    if (Object.keys(fields).length) rows.push({ path: doc.ref.path, exists: true,
      updateTime: encode(doc.updateTime), fields, type: 'housing' });
  }
  assert(rows.length <= 450, 'Too many writes for the reviewed single atomic batch; re-plan first');
  return { project: PROJECT, resetId: RESET, createdAt: new Date().toISOString(), users: users.size, rows };
}
async function commit(db, plan) {
  assert.equal(plan.project, PROJECT); assert.equal(plan.resetId, RESET);
  assert(plan.rows.length <= 450);
  const shopRows = plan.rows.filter(row => row.type === 'shop');
  const [users, profiles] = await Promise.all([db.collection('users').select().get(), db.collection('coordiProfiles').select().get()]);
  const currentIds = new Set([...users.docs, ...profiles.docs].map(doc => 'coordiProfiles/' + doc.id));
  assert.deepEqual([...currentIds].sort(), shopRows.map(row => row.path).sort(), 'Membership changed since backup; refresh the plan first');
  const current = await db.getAll(...shopRows.map(row => db.doc(row.path)));
  const marked = current.filter(doc => doc.data()?.purchaseCouponGrant === RESET).length;
  if (marked === shopRows.length) return { alreadyApplied: true, shop: marked };
  assert.equal(marked, 0, 'Partial/foreign application detected; review before continuing');
  const batch = db.batch();
  for (const row of plan.rows) {
    const ref = db.doc(row.path);
    const data = row.type === 'shop' ? { purchaseCoupons: 10, purchaseCouponGrant: RESET }
      : Object.fromEntries(HOUSING_FIELDS.map(key => [key, FieldValue.delete()]));
    if (row.exists) batch.update(ref, data, { lastUpdateTime: new Timestamp(...row.updateTime.timestamp) });
    else batch.create(ref, { ...data, memberUserId: ref.id, owned: [], prisms: {}, look: { gender: 'female', equipped: {} } });
  }
  await batch.commit();
  return { alreadyApplied: false, shop: shopRows.length, housing: plan.rows.length - shopRows.length };
}
async function verify(db, plan) {
  const docs = await db.getAll(...plan.rows.map(row => db.doc(row.path)));
  let shop = 0, housing = 0;
  for (let i = 0; i < docs.length; i++) {
    const data = docs[i].data() || {}, row = plan.rows[i];
    if (row.type === 'shop') {
      assert.equal(data.purchaseCouponGrant, RESET);
      assert(Number.isInteger(data.purchaseCoupons) && data.purchaseCoupons >= 0 && data.purchaseCoupons <= 10);
      shop++;
    } else {
      for (const key of HOUSING_FIELDS) assert(!Object.hasOwn(data, key), 'Retired coupon field remains');
      housing++;
    }
  }
  return { shop, housing, exactlyTen: docs.filter((doc, i) => plan.rows[i].type === 'shop' && doc.data()?.purchaseCoupons === 10).length };
}
async function main() {
  assert(!process.env.FIRESTORE_EMULATOR_HOST, 'Production entrypoint must not use an emulator');
  const lib = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
  const auth = require(lib + 'auth'), { requireAuth } = require(lib + 'requireAuth'), { getAccessToken, Client } = require(lib + 'apiv2');
  await requireAuth({ project: PROJECT, ...auth.getGlobalDefaultAccount() });
  const client = new OAuth2Client(); client.setCredentials({ access_token: await getAccessToken(), expiry_date: Date.now() + 3500000 });
  const db = new Firestore({ projectId: PROJECT, auth: new GoogleAuth({ authClient: client, projectId: PROJECT }) });
  try {
    if (process.argv.includes('--commit') || process.argv.includes('--verify')) {
      const plan = JSON.parse(fs.readFileSync(BACKUP));
      if (process.argv.includes('--commit')) {
        const receipt = JSON.parse(fs.readFileSync('/tmp/coupon-retirement-20261018/functions-receipt.json'));
        assert.equal(receipt.verifiedTargets.length, 4, 'Deploy and verify all coupon functions first');
        const cloud = new Client({ urlPrefix: 'https://cloudfunctions.googleapis.com', apiVersion: 'v2', auth: true });
        for (const target of receipt.verifiedTargets) {
          const live = (await cloud.get(`projects/${PROJECT}/locations/asia-northeast3/functions/${target.target}`)).body;
          assert.equal(live.state, 'ACTIVE');
          assert.equal(live.updateTime, target.updateTime, 'Coupon function changed after verification');
        }
        console.log(JSON.stringify(await commit(db, plan)));
      }
      console.log(JSON.stringify(await verify(db, plan)));
    } else {
      const plan = await preview(db);
      fs.mkdirSync(path.dirname(BACKUP), { recursive: true, mode: 0o700 });
      fs.writeFileSync(BACKUP, JSON.stringify(plan, null, 2), { mode: 0o600, flag: 'wx' });
      console.log(JSON.stringify({ mode: 'preview', users: plan.users, shop: plan.rows.filter(r => r.type === 'shop').length,
        housing: plan.rows.filter(r => r.type === 'housing').length, backup: BACKUP }));
    }
  } finally { await db.terminate(); }
}
module.exports = { preview, commit, verify, HOUSING_FIELDS, RESET };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
