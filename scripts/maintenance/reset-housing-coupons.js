#!/usr/bin/env node
// One-time user-authorized reset. Default: private backup + aggregate preview.
// --commit reuses the backup; --restore conditionally restores coupon fields only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getCouponWeekKey } = require('../../functions/housing-coupons');
const projectId = 'dj48-quiztown-firebase';
const resetId = 'housing-coupon-reset-2026-09-14';
const backupPath = path.resolve(__dirname, '../../exports/' + resetId + '/backup.json');
const fields = ['housingCoupons', 'lastHousingCouponWeek', 'housingCouponResetId'];
function select(data) { return Object.fromEntries(fields.filter(key => Object.hasOwn(data, key)).map(key => [key, data[key]])); }

(async () => {
  assert.ok(!process.env.FIRESTORE_EMULATOR_HOST, 'Production reset must not use emulator');
  initializeApp({ projectId, credential: applicationDefault() });
  const db = getFirestore();
  const commit = process.argv.includes('--commit');
  const restore = process.argv.includes('--restore');
  const weekKey = getCouponWeekKey();
  if (!commit && !restore) {
    const [users, economy] = await Promise.all([
      db.collection('users').select().get(), db.collection('userEconomy').select(...fields).get()
    ]);
    const byId = new Map(economy.docs.map(doc => [doc.id, { id: doc.id, fields: select(doc.data()) }]));
    for (const doc of users.docs) if (!byId.has(doc.id)) byId.set(doc.id, { id: doc.id, fields: {} });
    const rows = [...byId.values()];
    const plan = { projectId, resetId, weekKey, createdAt: new Date().toISOString(), rows };
    fs.mkdirSync(path.dirname(backupPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(backupPath, JSON.stringify(plan, null, 2), { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ mode: 'preview', users: users.size, economy: economy.size, targets: rows.length,
      positiveBalances: rows.filter(row => Number(row.fields.housingCoupons) > 0).length,
      totalCoupons: rows.reduce((sum, row) => sum + (Number(row.fields.housingCoupons) || 0), 0), backupPath }));
  } else {
    const plan = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    assert.equal(plan.projectId, projectId);
    assert.equal(plan.resetId, resetId);
    assert.equal(plan.weekKey, weekKey, 'Backup is from a different week; do not reset a new weekly grant');
    let changed = 0, skipped = 0;
    for (const row of plan.rows) {
      const didChange = await db.runTransaction(async tx => {
        const ref = db.collection('userEconomy').doc(row.id);
        const snap = await tx.get(ref);
        const current = select(snap.data() || {});
        if (restore) {
          assert.equal(current.housingCouponResetId, resetId, 'Reset marker changed; manual review required');
          assert.equal(current.housingCoupons, 0, 'Coupon balance changed; manual review required');
          assert.equal(current.lastHousingCouponWeek, weekKey, 'Coupon week changed; manual review required');
          tx.set(ref, Object.fromEntries(fields.map(key => [key, Object.hasOwn(row.fields, key) ? row.fields[key] : FieldValue.delete()])), { merge: true });
        } else {
          if (current.housingCouponResetId === resetId) return false;
          assert.deepEqual(current, row.fields, 'Coupon state changed since backup; manual review required');
          tx.set(ref, { housingCoupons: 0, lastHousingCouponWeek: weekKey, housingCouponResetId: resetId }, { merge: true });
        }
        return true;
      });
      if (didChange) changed++; else skipped++;
    }
    const check = await db.collection('userEconomy').select(...fields).get();
    const positiveBalances = check.docs.filter(doc => Number(doc.data().housingCoupons) > 0).length;
    if (!restore) assert.equal(positiveBalances, 0, 'Some coupon balances remain');
    console.log(JSON.stringify({ mode: restore ? 'restore' : 'commit', changed, skipped, checked: check.size, positiveBalances }));
  }
  await db.terminate();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
