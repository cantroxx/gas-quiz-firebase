'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^127\.0\.0\.1:\d+$/);
process.env.GCLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT = 'demo-dj48-rules';
const api = require('../../functions/index');
const load = require('node:module').createRequire(require.resolve('../../functions/package.json'));
const {getFirestore} = load('firebase-admin/firestore'), {getApps, deleteApp} = load('firebase-admin/app');
const pack = require('../../functions/popular-quiz/catalog.json'), manifest = require('../../functions/popular-quiz/image-derivatives.json');
async function main() {
  const db = getFirestore(), uid = 'cleanup-image-auth', member = 'G4-C8-N93';
  const call = data => api.popularQuizAction.run({auth: {uid}, data});
  for (const entry of manifest.entries) {
    const q = pack.questions.find(row => row.id === entry.id);
    assert.equal(q.sha256, entry.sourceSha256, 'source audit hash remains the original hash');
    assert.equal(q.imageUrl, entry.imageUrl);
    assert(fs.existsSync(path.resolve(__dirname, '../../public' + entry.originalUrl)), 'old run URL must remain available');
  }
  await db.doc('authLinks/' + uid).set({memberUserId: member});
  await db.doc('users/' + member).set({authUid: uid, active: true, status: 'active', role: 'student', grade: '4', classNumber: '8'});
  await db.doc('appSettings/featureFlags').set({practiceRewardEnabled: true, practiceXpEnabled: true});
  const run = await call({action: 'start', category: 'idol', mode: 'practice', requestId: crypto.randomUUID()});
  assert.equal(run.contentVersion, pack.version);
  const ref = db.doc('popularQuizRuns/' + run.runId), stored = (await ref.get()).data();
  const oldUrl = manifest.entries[0].originalUrl;
  stored.questions[0].imageUrl = oldUrl;
  await ref.update({questions: stored.questions, contentVersion: manifest.sourceVersion});
  const resumed = await call({action: 'resume', runId: run.runId});
  assert.equal(resumed.question.imageUrl, oldUrl); assert.equal(resumed.contentVersion, manifest.sourceVersion);
  await new Promise(resolve => setTimeout(resolve, 350));
  const answered = await call({action: 'answer', runId: run.runId, seq: resumed.seq, choice: stored.questions[0].answerIndex});
  assert.equal(answered.feedback.imageUrl, oldUrl); assert.equal(answered.feedback.correct, true);
  console.log('PASS original source hashes, retained URLs, new catalog version, old-version session resume and answer.');
}
main().catch(error => {console.error(error); process.exitCode = 1;}).finally(() => Promise.all(getApps().map(deleteApp)));
