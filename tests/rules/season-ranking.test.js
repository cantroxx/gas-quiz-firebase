const assert = require('node:assert/strict');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { createRankingRepository } = require('../../public/js/infrastructure/ranking-repository');
assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Emulator required');
initializeApp({ projectId: 'demo-dj48-rules' });
const db = getFirestore();

(async () => {
  const batch = db.batch();
  const row = (id, instant, score = 1, memberUserId = 'synthetic-season-member') => {
    batch.set(db.collection('rankingRecords').doc(id), {
      categoryKey: 'season-test', memberUserId, score,
      recordedAt: Timestamp.fromDate(new Date(instant))
    });
  };
  for(let index = 0; index < 225; index++) row(`season-${index}`, '2026-09-15T00:00:00Z', index);
  row('season-before', '2026-08-31T14:59:59.999Z', 9999);
  row('season-start', '2026-08-31T15:00:00Z', 10);
  row('season-end', '2026-09-30T14:59:59.999Z', 20);
  row('season-next-month', '2026-09-30T15:00:00Z', 30);
  row('season-hidden', '2026-09-15T00:00:00Z', 9999, 'G4-C8-N23');
  await batch.commit();
  const repository = createRankingRepository({ db });
  const events = [{ active: true, periodStartDate: '2026-09-01', periodEndDate: '2026-09-30' }];
  const records = await repository.loadSeasonRankingRecordsForPlaza(['season-test'], events);
  assert.equal(records.length, 227);
  assert.ok(records.some(record => record.recordId === 'season-224'));
  assert.ok(records.some(record => record.recordId === 'season-start'));
  assert.ok(records.some(record => record.recordId === 'season-end'));
  for (const id of ['season-before', 'season-next-month', 'season-hidden']) assert.ok(!records.some(record => record.recordId === id));
  assert.deepEqual(await repository.loadSeasonRankingRecordsForPlaza(['season-test'], [{ ...events[0], active: false }]), []);
  const nextMonth = await repository.loadSeasonRankingRecordsForPlaza(['season-test'], [{ active: true, periodStartDate: '2026-10-01', periodEndDate: '2026-10-31' }]);
  assert.deepEqual(nextMonth.map(record => record.recordId), ['season-next-month']);
  assert.equal((await db.collection('rankingRecords').doc('season-before').get()).data().score, 9999);
  console.log('Season ranking Emulator: >200 records, full pagination, KST month boundaries, hidden member exclusion, inactive event, next month and history preservation passed.');
  await db.terminate();
})().catch(error => { console.error(error); process.exitCode = 1; });
