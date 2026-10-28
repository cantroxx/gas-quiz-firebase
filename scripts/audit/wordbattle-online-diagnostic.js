// Two real browser pages, production UI/net/reducers, synthetic transport only.
// No Firebase SDK, credentials, production network or ranking writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '../..');
const dir = path.join(root, 'public/wordbattle');
const clone = value => structuredClone(value);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const reducer = vm.createContext({ Date, Math });
  for (const name of ['hangul', 'words-data', 'words', 'engine', 'room']) {
    vm.runInContext(fs.readFileSync(path.join(dir, name + '.js'), 'utf8'), reducer);
  }
  // Execute the actual callable handler with an in-memory Admin DB adapter.
  const source = fs.readFileSync(path.join(root, 'functions/index.js'), 'utf8');
  const fragment = source.slice(source.indexOf('const WB_TURN_MS ='), source.indexOf('exports.wbCleanupOldRooms ='));
  let state, stage = 0, deliveries = [], clients = [], handLag = 0;
  const roomPath = 'wordbattleRooms/TEST';
  const roomRef = p => ({ path: p, collection: n => ({ doc: id => roomRef(p + '/' + n + '/' + id) }) });
  const snapshot = p => ({ exists: !!state[p], data: () => clone(state[p]) });
  function publish(changes) {
    Object.assign(state, clone(changes));
    for (const client of clients) for (const [p, value] of Object.entries(changes)) {
      const delay = stage + (p.includes('/hands/') ? handLag : 0);
      deliveries.push(sleep(delay).then(() => client.evaluate(({ p, value }) => window.deliver(p, value), { p, value })).catch(() => {}));
    }
  }
  const server = vm.createContext({ Date, Math, exports: {}, REGION: 'test', requireAuth: r => r.auth.uid,
    HttpsError: class extends Error {}, onCall: (_, fn) => fn,
    db: { collection: n => ({ doc: id => roomRef(n + '/' + id) }), runTransaction: async fn => {
      const changes = {};
      const result = await fn({ get: async ref => snapshot(ref.path), set: (ref, value) => { changes[ref.path] = value; } });
      publish(changes); return result;
    } }
  });
  vm.runInContext(fragment, server);
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const output = [];
  async function setup(delay = 0, lag = 0) {
    await Promise.all(deliveries); deliveries = [];
    for (const p of clients) await p.context().close();
    clients = []; stage = delay; handLag = lag;
    const game = reducer.WBRoom.newGame('TEST', { id: 'a', name: '테스트A' });
    reducer.WBRoom.join(game, { id: 'b', name: '테스트B' });
    reducer.WBRoom.start(game, { id: 'a' });
    const tiles = (prefix) => ['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ', 'ㅁ'].map((jamo, i) => ({ id: prefix + i, jamo, kind: jamo === 'ㅏ' ? 'V' : 'C' }));
    game.hands.a = tiles('a'); game.hands.b = tiles('b');
    reducer.WBRoom.refreshCounts(game);
    state = { [roomPath]: clone(game.room), [roomPath + '/hands/a']: { tiles: game.hands.a },
      [roomPath + '/hands/b']: { tiles: game.hands.b }, [roomPath + '/secret/deck']: { bag: clone(game.bag) } };
    for (const uid of ['a', 'b']) {
      const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
      await context.route('**/*', route => route.abort());
      const page = await context.newPage(); clients.push(page);
      page.on('pageerror', e => { throw e; });
      await page.exposeFunction('transport', async (op, data) => {
        await sleep(stage);
        if (op === 'get') return clone(state[data]);
        if (op === 'commit') { publish(data); return true; }
        if (op === 'draw') return server.exports.wbDraw({ auth: { uid }, data });
      });
      await page.setContent('<div id="app"></div>');
      await page.addStyleTag({ path: path.join(dir, 'style.css') });
      for (const name of ['hangul', 'words-data', 'words', 'engine', 'room', 'net', 'ui']) await page.addScriptTag({ path: path.join(dir, name + '.js') });
      await page.evaluate(({ uid, state, roomPath }) => {
        const callbacks = {};
        window.deliver = (p, value) => { if (callbacks[p]) callbacks[p]({ exists: !!value, data: () => value }); };
        const ref = p => ({ path: p, collection: n => ({ doc: id => ref(p + '/' + n + '/' + id) }),
          onSnapshot: cb => { callbacks[p] = cb; return () => delete callbacks[p]; } });
        const db = { collection: n => ({ doc: id => ref(n + '/' + id) }), runTransaction: async fn => {
          const changes = {};
          const result = await fn({ get: async r => { const data = await transport('get', r.path); return { exists: !!data, data: () => data }; },
            set: (r, v) => { changes[r.path] = v; } });
          await transport('commit', changes); return result;
        } };
        window.firebase = { app: () => ({ functions: () => ({ httpsCallable: () => async data => ({ data: await transport('draw', data) }) }) }) };
        window.session = WBNet.OnlineNet({ db, me: { id: uid, name: uid }, code: 'TEST', FieldValue: {} });
        deliver(roomPath, state[roomPath]); deliver(roomPath + '/hands/' + uid, state[roomPath + '/hands/' + uid]);
        WBUI.attach(session);
      }, { uid, state, roomPath });
    }
  }
  try {
    for (const delay of [0, 100, 300]) {
      await setup(delay);
      const [a, b] = clients;
      for (const id of ['a0', 'a1', 'a2', 'a3']) await a.locator('[data-pick="' + id + '"]').click();
      const start = Date.now();
      await a.locator('#btn-commit').click();
      await b.waitForFunction(() => session.isMyTurn() && session.getRoom().board[0]?.text === '가나');
      const commitMs = Date.now() - start;
      const drawStart = Date.now();
      await b.locator('#btn-draw-c').click();
      await a.waitForFunction(() => session.isMyTurn());
      output.push({ scenario: 'two_player_commit_draw', injectedStageMs: delay, commitToOtherMs: commitMs, drawToOtherMs: Date.now() - drawStart,
        hands: [state[roomPath + '/hands/a'].tiles.length, state[roomPath + '/hands/b'].tiles.length] });
      assert.equal(state[roomPath].turn, 'a');
    }
    // Adversarial delayed hand: an editable stale hand is followed by a newer hand.
    // This establishes UI behavior, not the frequency/order of Firestore deliveries.
    await setup(0, 1000);
    const a = clients[0];
    const nextHand = clone(state[roomPath + '/hands/a']);
    nextHand.tiles.push({ id: 'late', jamo: 'ㅗ', kind: 'V' });
    await a.locator('[data-pick="a0"]').click();
    const before = await a.locator('.building [data-pick]').count();
    const nextRoom = clone(state[roomPath]);
    nextRoom.players[0].handCount = nextHand.tiles.length;
    publish({ [roomPath]: nextRoom, [roomPath + '/hands/a']: nextHand });
    await a.waitForFunction(() => document.getElementById('app').inert);
    await sleep(1200);
    const after = await a.locator('.building [data-pick]').count();
    assert.equal(before, 1); assert.equal(after, 1);
    assert.equal(await a.evaluate(() => document.getElementById('app').inert), false);
    output.push({ scenario: 'late_hand_preserves_in_progress_edit', placedBeforeDelivery: before, placedAfterDelivery: after });
    // Reverse order: hand arrives first. Keep the draft while waiting for the room.
    handLag = 0;
    const reverseHand = clone(nextHand);
    reverseHand.tiles.push({ id: 'reverse', jamo: 'ㅜ', kind: 'V' });
    publish({ [roomPath + '/hands/a']: reverseHand });
    await a.waitForFunction(() => document.getElementById('app').inert);
    const reverseRoom = clone(nextRoom);
    reverseRoom.players[0].handCount = reverseHand.tiles.length;
    publish({ [roomPath]: reverseRoom });
    await a.waitForFunction(() => !document.getElementById('app').inert);
    assert.equal(await a.locator('.building [data-pick]').count(), 1);
    output.push({ scenario: 'hand_first_preserves_draft', passed: true });
    // Local offline signal is distinct from waiting for another player's turn.
    await a.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }));
    await a.waitForFunction(() => document.getElementById('app').inert);
    assert.match(await a.locator('#wb-connection').innerText(), /인터넷 연결/);
    await a.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }));
    await a.waitForFunction(() => !document.getElementById('app').inert);
    assert.equal(await a.locator('.building [data-pick]').count(), 1);
    output.push({ scenario: 'offline_recovery_preserves_draft', passed: true });
    // Freeze transport responses; room changes are no longer delivered to either page.
    await setup();
    await clients[0].evaluate(() => {
      window.pendingCalls = 0;
      session.timeout = () => { pendingCalls++; return new Promise(() => {}); };
      session.getRoom().turnEndsAt = Date.now() - 2000;
    });
    await sleep(10500);
    const count = await clients[0].evaluate(() => pendingCalls);
    assert.equal(count, 1);
    output.push({ scenario: 'pending_timeout_10_5s', requests: count });
    console.log(JSON.stringify({ transport: 'synthetic; not school or production latency; no transaction retry simulation', results: output }, null, 2));
  } finally {
    await Promise.all(deliveries);
    await browser.close();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
