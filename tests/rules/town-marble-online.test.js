const adminRequire=require('node:module').createRequire(require.resolve('../../functions/package.json'));
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { initializeApp, deleteApp } = adminRequire('firebase-admin/app');
const { getFirestore } = adminRequire('firebase-admin/firestore');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, getDocs, collection, onSnapshot } = require('firebase/firestore');
const { createService } = require('../../functions/town-marble/service');
async function main() {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST||'', /^127\.0\.0\.1:\d+$/, 'Demo emulator only.');
  for (const file of ['data.js', 'game.js']) assert.equal(fs.readFileSync('town-marble-src/shared/' + file, 'utf8'), fs.readFileSync('functions/town-marble/domain/' + file, 'utf8'));
  const app = initializeApp({ projectId: 'demo-dj48-rules' }, 'tm-test'), db = getFirestore(app);
  const env = await initializeTestEnvironment({ projectId: 'demo-dj48-rules', firestore: { host: '127.0.0.1', port:Number(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1]), rules: fs.readFileSync('firestore.rules', 'utf8') } });
  let time = 1000000, counter = 0;
  const service = createService({ db, now: () => time, rng: n => (counter++) % n });
  const call = (uid, type, extra = {}) => service.act(uid, { type, ...extra });
  const rejects = (promise, code) => assert.rejects(promise, error => error.code === code);
  const action = async (uid, code, body, extra = {}) => {
    const state = (await db.doc('townMarbleRooms/' + code).get()).data();
    return call(uid, 'action', { code, version: state.version, id: crypto.randomUUID(), action: body, ...extra });
  };
  try {
    for (const uid of ['tm-a', 'tm-b', 'tm-c', 'tm-d', 'tm-e', 'tm-f', 'tm-inactive']) {
      await db.doc('authLinks/' + uid).set({ memberUserId: 'member-' + uid });
      await db.doc('users/member-' + uid).set({ authUid: uid, nickname: '<' + uid + '>', status: uid === 'tm-inactive' ? 'inactive' : 'active', active: uid !== 'tm-inactive' });
    }
    await rejects(call(null, 'profile'), 'unauthenticated'); await rejects(call('outsider', 'profile'), 'permission-denied'); await rejects(call('tm-inactive', 'profile'), 'permission-denied');
    let result = await call('tm-a', 'create', { character: 0, minutes: 20, name: 'spoofed' });
    const code = result.state.code, path = 'townMarbleRooms/' + code;
    assert.equal(result.state.seats[0].name, '<tm-a>');
    await rejects(call('tm-a', 'create', { character: 0, minutes: 20 }), 'failed-precondition');
    const joined = await Promise.allSettled(['tm-b', 'tm-c', 'tm-d', 'tm-e'].map(uid => call(uid, 'join', { code, character: 1 })));
    assert.equal(joined.filter(r => r.status === 'fulfilled').length, 3);
    let room = (await db.doc(path).get()).data();
    const ids = room.participantIds, guestId = ids[1];
    await rejects(call('tm-f', 'resume', { code }), 'permission-denied');
    await rejects(action(guestId, code, { type: 'START' }), 'failed-precondition');
    await rejects(action('tm-a', code, { type: 'START' }), 'failed-precondition');
    for (const uid of ids) await action(uid, code, { type: 'READY', ready: true });
    result = await action('tm-a', code, { type: 'START' }); assert.equal(result.state.game.players.length, 4);
    assert.equal(result.state.game.players[0].cash, 200);
    await rejects(action(guestId, code, { type: 'ROLL' }), 'failed-precondition');
    const client = env.authenticatedContext(guestId).firestore(); let observed;
    const off = onSnapshot(doc(client, path), snap => { observed = snap.data(); });
    const rollId = crypto.randomUUID(), version = result.state.version;
    result = await action('tm-a', code, { type: 'ROLL', dice: [6, 6], cash: 999999 }, { id: rollId, version });
    assert.deepEqual(result.state.game.dice, [1, 2]);
    const revision = result.state.game.revision;
    result = await call('tm-a', 'action', { code, version, id: rollId, action: { type: 'ROLL' } });
    assert.equal(result.state.game.revision, revision);
    await rejects(action('tm-a', code, { type: 'END' }, { version }), 'failed-precondition');
    for (let i = 0; i < 100 && observed?.game?.revision !== revision; i++) await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(observed.game.revision, revision); off();
    assert.equal((await call('tm-a', 'resume', { code })).state.game.revision, revision);
    // Deadline advances server state, including when the current browser disconnects.
    time += 46000; result = await call(guestId, 'sync', { code }); assert.ok(result.state.game.turn > 1);
    // Time-limited end and simultaneous finalization are atomic, with one result and one rank per member.
    time += 20 * 60000;
    await Promise.all(ids.map(uid => call(uid, 'sync', { code })));
    room = (await db.doc(path).get()).data(); assert.equal(room.game.status, 'ended'); assert.equal(room.ranking.status, 'saved');
    assert.equal((await db.doc('townMarbleResults/' + code).get()).exists, true);
    for (const seat of room.seats) {
      const row = (await db.doc('townMarbleRanking/town-v1/entries/' + seat.id).get()).data();
      assert.equal((await db.doc('users/'+seat.id).get()).data().gameHonors?.stars||0,room.game.winners.includes(seat.id)?1:0);
      assert.equal(row.games, 1); assert.ok([0, 1, 3].includes(row.total));
      assert.equal(row.total, room.game.winners.includes(seat.id) ? (room.game.winners.length > 1 ? 1 : 3) : 0);
    }
    await call('tm-a', 'sync', { code }); assert.equal((await db.doc('townMarbleRanking/town-v1/entries/member-tm-a').get()).data().games, 1);
    const rankPath = 'townMarbleRanking/town-v1/entries/member-tm-a';
    const outsider = env.authenticatedContext('outsider').firestore(), member = env.authenticatedContext('tm-f').firestore();
    for (const unauthorized of [env.unauthenticatedContext().firestore(), outsider, env.authenticatedContext('tm-inactive').firestore()]) await assertFails(getDoc(doc(unauthorized, rankPath)));
    await assertSucceeds(getDoc(doc(member, rankPath))); await assertSucceeds(getDoc(doc(client, path)));
    await assertFails(getDoc(doc(member, path))); await assertFails(getDocs(collection(client, 'townMarbleRooms')));
    await assertFails(setDoc(doc(client, path), { game: { cash: 99999 } })); await assertFails(setDoc(doc(client, rankPath), { total: 999999 }));
    for (const privatePath of ['townMarblePlayers/member-tm-a', 'townMarbleResults/' + code]) {
      await assertFails(getDoc(doc(env.authenticatedContext('tm-a').firestore(), privatePath)));
      await assertFails(setDoc(doc(client, privatePath), {}));
    }
    for (const collectionName of ['growthActivities','growthQuestProgress','growthQuestSources','rankingQuestSessions','coordiProfiles','coordiReceipts','survivorQuizQuestions','survivorQuizControls']) {
      const privateDoc=doc(client,collectionName+'/member-'+guestId);
      await assertFails(getDoc(privateDoc)); await assertFails(setDoc(privateDoc,{memberId:'member-'+guestId,uid:guestId,counts:{rankingComplete:100}}));
    }
    // Host migration, departed slots, ready reset and stale lobby expiration.
    const next = (await call('tm-a', 'create', { character: 0, minutes: 0 })).state.code;
    await call(guestId, 'join', { code: next, character: 1 });
    await action('tm-a', next, { type: 'LEAVE' });
    assert.equal((await db.doc('townMarbleRooms/' + next).get()).data().hostId, 'member-' + guestId);
    await call('tm-a', 'join', { code: next, character: 0 });
    for (const uid of [guestId, 'tm-a']) await action(uid, next, { type: 'READY', ready: true });
    time += 46000; const migrated = (await call('tm-a', 'sync', { code: next })).state;
    assert.equal(migrated.hostId, 'member-tm-a'); assert.equal(migrated.seats.find(s => s.id === 'member-' + guestId).ready, false);
    await call(guestId, 'sync', { code: next }); await action(guestId, next, { type: 'READY', ready: true });
    await action('tm-a', next, { type: 'START' }); await action(guestId, next, { type: 'SURRENDER' });
    assert.equal((await db.doc('townMarbleRooms/' + next).get()).data().ranking.status, 'unranked');
    assert.equal((await db.doc('townMarbleRooms/' + next).get()).data().questAbandoned['member-'+guestId],true);
    assert.equal((await db.doc(rankPath).get()).data().games, 1);
    const expired = (await call('tm-a', 'create', { character: 0, minutes: 20 })).state.code; time += 1800001;
    await rejects(call('tm-a', 'resume', { code: expired }), 'failed-precondition');
    console.log('Town Marble: linked auth, server nickname/dice, concurrent 4-player capacity, account lock, ready/host/turn gates, duplicate/stale commands, live snapshot, resume, deadline, atomic rank finalization, short-game exclusion, host migration, expiry and read/write privacy passed.');
  } finally { await env.cleanup(); await deleteApp(app); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
