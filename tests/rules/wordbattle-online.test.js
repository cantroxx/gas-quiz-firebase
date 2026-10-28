// Actual Firestore emulator transactions/listeners through the production OnlineNet.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, onSnapshot, runTransaction, setLogLevel } = require('firebase/firestore');
const root = path.resolve(__dirname, '../..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const snapshot = s => ({ exists: s.exists(), data: () => s.data() });
async function main() {
  setLogLevel('silent');
  const env = await initializeTestEnvironment({ projectId: 'demo-dj48-rules', firestore: {
    host: '127.0.0.1', port: 8181, rules: fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8')
  } });
  const subscriptions = [];
  try {
    const ctx = vm.createContext({ setTimeout, clearTimeout, Date, Math });
    for (const name of ['hangul', 'words-data', 'words', 'engine', 'room', 'net']) {
      vm.runInContext(fs.readFileSync(path.join(root, 'public/wordbattle', name + '.js'), 'utf8'), ctx);
    }
    const game = ctx.WBRoom.newGame('emulator-test', { id: 'a', name: 'test-A' });
    ctx.WBRoom.join(game, { id: 'b', name: 'test-B' });
    ctx.WBRoom.start(game, { id: 'a' });
    game.hands.a = ['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ', 'ㅁ'].map((jamo, i) => ({ id: 'a' + i, jamo, kind: jamo === 'ㅏ' ? 'V' : 'C' }));
    ctx.WBRoom.refreshCounts(game);
    const prefix = 'wordbattleRooms/emulator-test';
    await env.withSecurityRulesDisabled(async c => {
      const db = c.firestore();
      // Convert VM objects to plain objects recognized by the SDK.
      const plain = v => JSON.parse(JSON.stringify(v));
      await setDoc(doc(db, prefix), plain(game.room));
      for (const id of ['a', 'b']) await setDoc(doc(db, prefix + '/hands/' + id), { tiles: plain(game.hands[id]) });
    });
    const sessions = ['a', 'b'].map(id => {
      const db = env.authenticatedContext(id).firestore();
      const ref = p => ({ native: doc(db, p), collection: n => ({ doc: key => ref(p + '/' + n + '/' + key) }),
        onSnapshot: (cb, error) => { const stop = onSnapshot(doc(db, p), s => cb(snapshot(s)), error); subscriptions.push(stop); return stop; } });
      return ctx.WBNet.OnlineNet({ code: 'emulator-test', me: { id, name: id }, db: {
        collection: n => ({ doc: key => ref(n + '/' + key) }),
        runTransaction: fn => runTransaction(db, tx => fn({ get: async r => snapshot(await tx.get(r.native)),
          set: (r, value) => tx.set(r.native, JSON.parse(JSON.stringify(value))) }))
      } });
    });
    async function until(check) {
      for (let i = 0; i < 100; i++) { if (check()) return; await sleep(50); }
      throw new Error('Timed out waiting for emulator listeners');
    }
    await until(() => sessions.every(s => s.syncState() === 'ready'));
    assert.equal((await sessions[0].commit([['a0', 'a1', 'a2', 'a3']])).ok, true);
    await until(() => sessions[1].isMyTurn() && sessions[0].currentHand().length === 1);
    assert.equal(sessions[1].getRoom().board[0].text, '가나');
    const bdb = env.authenticatedContext('b').firestore();
    const handRef = doc(bdb, prefix + '/hands/b');
    const before = (await getDoc(handRef)).data();
    assert.equal((await sessions[1].useHint()).ok, true);
    assert.deepEqual((await getDoc(handRef)).data(), before);
    console.log('Wordbattle emulator passed: parallel transaction reads, two-client turn propagation, unchanged hand on hint.');
  } finally { subscriptions.forEach(stop => stop()); await env.cleanup(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
