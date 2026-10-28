'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createServer } = require('../../functions/fruit-bell/local-server');
test('local room authority, session isolation, ready/start and result recording', async () => {
  const app = createServer(), url = await app.listen();
  const streams = [];
  async function player() {
    const res = await fetch(url + '/api/fruit-bell/session', { method: 'POST' });
    const cookie = res.headers.get('set-cookie').split(';')[0], { id } = await res.json();
    const abort = new AbortController(); streams.push(abort);
    const events = await fetch(url + '/api/fruit-bell/events', { headers: { cookie }, signal: abort.signal });
    void (async () => { try { for await (const _ of events.body) { /* Drain SSE until test cleanup. */ } } catch (_) {} })();
    return { id, cookie, async call(action, data = {}) {
      const response = await fetch(url + '/api/fruit-bell/' + action, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      return { status: response.status, ...await response.json() };
    } };
  }
  try {
    const a = await player(), b = await player(), c = await player();
    const created = await a.call('create', { name: '<img src=x onerror=alert(1)>' });
    assert.equal(created.room.code.length, 6); const code = created.room.code;
    assert.equal((await c.call('join', { code: 'AAAAAA' })).status, 400);
    assert.equal((await b.call('join', { code, name: '둘째' })).status, 200);
    assert.equal((await b.call('start')).status, 400);
    assert.equal((await a.call('start')).status, 400);
    await a.call('ready', { ready: true }); await b.call('ready', { ready: true });
    assert.equal((await a.call('start')).room.game.phase, 'playing');
    assert.equal((await c.call('join', { code })).status, 400);
    const stolen = await fetch(url + '/api/fruit-bell/ring', { method: 'POST', body: JSON.stringify({ id: a.id, round: 0 }) }); assert.equal(stolen.status, 401);
    const cross = await fetch(url + '/api/fruit-bell/leave', { method: 'POST', headers: { cookie: a.cookie, Origin: 'https://untrusted.example' } }); assert.equal(cross.status, 403);
    const state = app.rooms.get(code).game;
    state.endsAt = Date.now() - 1;
    await new Promise(resolve => setTimeout(resolve, 40));
    let ranks = await (await fetch(url + '/api/fruit-bell/ranking')).json();
    assert.equal(ranks.rows.length, 2); assert(ranks.rows.every(r => r.games === 1));
    await new Promise(resolve => setTimeout(resolve, 40));
    ranks = await (await fetch(url + '/api/fruit-bell/ranking')).json(); assert(ranks.rows.every(r => r.games === 1));
    await a.call('leave'); await b.call('leave');
    const next = (await a.call('create')).room.code; await b.call('join', { code: next });
    assert.equal((await a.call('ready', { ready: true })).status, 200); assert.equal((await b.call('ready', { ready: true })).status, 200);
    const restarted = await a.call('start'); assert.equal(restarted.status, 200, JSON.stringify({ restarted, room: app.rooms.get(next) }));
    await b.call('leave'); assert.equal(app.rooms.get(next).game.phase, 'aborted');
    assert.equal(app.ranking.list()[0].games, 1);
  } finally { streams.forEach(a => a.abort()); await app.close(); }
});
