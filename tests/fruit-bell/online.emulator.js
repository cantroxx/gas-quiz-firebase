const adminRequire=require('node:module').createRequire(require.resolve('../../functions/package.json'));
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs');
const { initializeApp, deleteApp } = adminRequire('firebase-admin/app');
const { getFirestore } = adminRequire('firebase-admin/firestore');
const { initializeTestEnvironment, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc } = require('firebase/firestore');
const { createService } = require('../../functions/fruit-bell/service');
const D = require('../../functions/fruit-bell/domain');
async function main() {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8497');
  const projectId = 'demo-fruit-bell', app = initializeApp({ projectId }, 'fruit-bell-service-test'), db = getFirestore(app);
  const env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8497, rules: fs.readFileSync('firestore.rules', 'utf8') } });
  let time = 1000000;
  const service = createService({ db, now: () => time, watchMs: 25 }), call = (uid, action, data = {}) => service.act(uid, { action, ...data });
  const reject = (promise, code) => assert.rejects(promise, error => error.code === code);
  const ids = ['fruit-a', 'fruit-b', 'fruit-c', 'fruit-d', 'fruit-e', 'fruit-inactive'];
  try {
    for (const id of ids) {
      await db.doc('authLinks/' + id).set({ memberUserId: 'member-' + id });
      await db.doc('users/member-' + id).set({ authUid: id, nickname: id, status: id === 'fruit-inactive' ? 'inactive' : 'active', active: id !== 'fruit-inactive' });
    }
    await reject(call(null, 'profile'), 'unauthenticated'); await reject(call('unknown', 'create'), 'permission-denied');
    await reject(call('fruit-inactive', 'profile'), 'permission-denied');
    await reject(call(ids[0], 'sync', { code: '../bad' }), 'invalid-argument');
    const code = (await call(ids[0], 'create', { name: 'SPOOFED' })).room.code;
    await reject(call(ids[0], 'create'), 'failed-precondition');
    const joins = await Promise.allSettled(ids.slice(1, 5).map(id => call(id, 'join', { code })));
    assert.equal(joins.filter(r => r.status === 'fulfilled').length, 3);
    const first = (await call(ids[0], 'sync', { code })).room, members = first.players.map(p => p.id), outsider = ids.find(id => !members.includes(id) && id !== 'fruit-inactive');
    assert.equal(first.players[0].name, ids[0]);
    await reject(call(outsider, 'sync', { code }), 'permission-denied');
    await reject(call(outsider, 'watch', { code, revision: first.revision }), 'permission-denied');
    await reject(call(members[1], 'start', { code }), 'permission-denied');
    await reject(call(members[0], 'start', { code }), 'failed-precondition');
    await reject(call(members[0], 'emote', { code, kind: 'laugh' }), 'failed-precondition');
    await reject(call(outsider, 'emote', { code, kind: 'laugh' }), 'permission-denied');
    for (const kind of ['arbitrary text', '__proto__', 'constructor']) await reject(call(members[0], 'emote', { code, kind }), 'invalid-argument');
    for (const id of members) await call(id, 'ready', { code, ready: true });
    let current = (await call(ids[0], 'start', { code })).room;
    const gameBeforeEmote = current.game;
    const emotes = await Promise.allSettled([0, 1].map(() => call(ids[0], 'emote', { code, kind: 'laugh', uid: members[1] })));
    assert.equal(emotes.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(emotes.find(r => r.status === 'rejected').reason.code, 'resource-exhausted');
    const received = (await call(members[1], 'sync', { code })).room;
    assert.deepEqual(received.game, gameBeforeEmote, 'Emotes cannot alter cards, score or timers');
    assert.deepEqual(received.players.find(p => p.id === ids[0]).emote, { kind: 'laugh', at: time });
    assert.equal(received.players.find(p => p.id === members[1]).emote, null, 'Sender cannot impersonate a friend');
    assert((await db.doc('fruitBellRooms/' + code).get()).data().players.every(p => p.actions === 0), 'Emotes do not qualify as ranked gameplay');
    const started = time; time += 1800;
    current = (await call(ids[0], 'sync', { code })).room;
    assert(current.game.pending); assert.equal(current.game.pending.card, undefined); assert.equal(typeof current.game.players[0].hand, 'number');
    time += 500; current = (await call(ids[0], 'sync', { code })).room;
    assert(current.game.players[0].card);
    // A replay cannot pay a penalty or take cards twice, even across concurrent function instances.
    const rings = await Promise.all([call(ids[0], 'ring', { code, round: current.game.round }), call(ids[0], 'ring', { code, round: current.game.round })]);
    assert.equal(rings.filter(r => r.accepted).length, 1);
    for (const id of members.slice(1)) await call(id, 'ring', { code, round: current.game.round, score: 99999, won: true });
    const stored = await db.doc('fruitBellRooms/' + code).get();
    assert(stored.data().players.every(p => p.actions === 1));
    time = started + 3000;
    assert.equal((await call(ids[0], 'sync', { code })).room.players.find(p => p.id === ids[0]).emote, null, 'Expired emotes are not replayed on reconnect');
    await call(ids[0], 'emote', { code, kind: 'clap' });
    for (let step = 1; step <= 9; step++) {
      time = started + step * 10000;
      for (const id of members) await call(id, 'sync', { code });
    }
    current = (await call(ids[0], 'sync', { code })).room;
    assert.equal(current.game.phase, 'finished'); assert.equal(current.rankingStatus, 'saved');
    await reject(call(ids[0], 'emote', { code, kind: 'laugh' }), 'failed-precondition');
    const entries = await db.collection('fruitBellRanking').doc(D.VERSION).collection('entries').get(); assert.equal(entries.size, 4);
    const before = entries.docs.map(doc => doc.data());
    await Promise.all(members.map(id => call(id, 'sync', { code })));
    assert.deepEqual((await db.collection('fruitBellRanking').doc(D.VERSION).collection('entries').get()).docs.map(doc => doc.data()), before);
    const matches=await db.collection('fruitBellMatches').get();assert.equal(matches.size,1);
    const winners=matches.docs[0].data().result.winners;
    for(const id of members)assert.equal((await db.doc('users/member-'+id).get()).data().gameHonors?.stars||0,winners.includes(id)?1:0);
    let list = await call(ids[0], 'list'); assert.equal(list.rows.length, 4); assert(list.rows.every(p => p.games === 1 && p.total <= 3));
    // A new service instance reconstructs state and the persisted leaderboard.
    const restarted = createService({ db, now: () => time });
    assert.equal((await restarted.act(ids[0], { action: 'list' })).rows.length, 4);
    await db.doc('users/member-' + members[1]).update({ status: 'inactive' });
    list = await call(ids[0], 'list'); assert.equal(list.rows.length, 3);
    await db.doc('users/member-' + members[1]).update({ status: 'active' });
    await db.doc('users/G4-C8-N23').set({ authUid: 'hidden-fruit', status: 'active', active: true });
    await db.doc(`fruitBellRanking/${D.VERSION}/entries/G4-C8-N23`).set({ uid: 'hidden-fruit', total: 999, games: 1 });
    list = await call(ids[0], 'list'); assert.equal(list.rows.length, 4); assert(list.rows.every(p => p.memberUserId !== 'G4-C8-N23'));
    // Waiting host can leave and pass ownership; a playing participant cancels atomically.
    time += 10000; const next = (await call(ids[0], 'create')).room.code;
    await call(members[1], 'join', { code: next });
    await call(ids[0], 'leave', { code: next }); assert.equal((await call(members[1], 'sync', { code: next })).room.host, members[1]);
    await call(ids[0], 'join', { code: next });
    for (const id of [ids[0], members[1]]) await call(id, 'ready', { code: next, ready: true });
    await call(members[1], 'start', { code: next });
    const ended = await call(ids[0], 'leave', { code: next }); assert.equal(ended.room.game.phase, 'aborted'); assert.equal(ended.room.rankingStatus, 'cancelled');
    assert.equal((await call(members[1], 'list')).rows.find(p => p.memberUserId === 'member-' + members[1]).games, 1);
    // Firestore default deny protects decks, results and all ranking writes from browsers.
    for (const context of [env.unauthenticatedContext(), env.authenticatedContext(ids[0])]) {
      for (const name of ['fruitBellRooms/' + code, `fruitBellRanking/${D.VERSION}/entries/member-${ids[0]}`, 'fruitBellMatches/' + stored.data().matchId, 'fruitBellPlayers/' + ids[0]]) {
        await assertFails(getDoc(doc(context.firestore(), name))); await assertFails(setDoc(doc(context.firestore(), name), { total: 999 }));
      }
    }
    console.log('Fruit Bell emulator passed: identity, room capacity, authority, hidden decks, replay, atomic ranking, restart persistence, privacy, cancel and default-deny rules.');
  } finally { await env.cleanup(); await deleteApp(app); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
