'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const html = fs.readFileSync(require('node:path').resolve(__dirname, '../../public/index.html'), 'utf8');
const start = html.indexOf('    async function checkServerFreshness() {');
const end = html.indexOf('    async function refreshCurrentAppData()', start);
assert(start > 0 && end > start);
function harness() {
  let member = 'a', stored = '', loads = 0;
  const pending = [], attention = [], listeners = [], timers = [];
  const context = vm.createContext({
    document: {hidden: false, addEventListener: (name, fn) => listeners.push({name, fn})},
    window: {DJ48AccountState: {getCurrentMemberUserId: () => member}, setTimeout: fn => timers.push(fn), setInterval: fn => timers.push(fn)},
    loadServerFreshnessSignature: () => {loads++; return new Promise((resolve, reject) => pending.push({resolve, reject}));},
    getStoredServerFreshnessSignature: () => stored,
    storeServerFreshnessSignature: value => {stored = value;},
    setGlobalRefreshNeedsAttention: value => attention.push(value), debugLog: () => {}
  });
  vm.runInContext('let serverFreshnessPollTimer = null, serverFreshnessRequest = null;\n' + html.slice(start, end), context);
  return {context, pending, attention, listeners, timers, member: value => {member = value;}, loads: () => loads, stored: () => stored};
}
test('hidden and signed-out tabs make no reads; one listener and resume refresh', async () => {
  const h = harness(), c = h.context;
  c.startServerFreshnessPolling(); c.startServerFreshnessPolling();
  assert.equal(h.listeners.length, 1); assert.equal(h.timers.length, 2);
  c.document.hidden = true;
  await c.checkServerFreshness(); assert.equal(h.loads(), 0);
  c.document.hidden = false; h.member('');
  await c.checkServerFreshness(); assert.equal(h.loads(), 0);
  h.member('a'); h.listeners[0].fn(); assert.equal(h.loads(), 1);
  h.pending[0].resolve('first'); await c.checkServerFreshness(); assert.equal(h.stored(), 'first');
});
test('overlapping requests merge; errors release request; changed signature still alerts', async () => {
  const h = harness(), c = h.context;
  const first = c.checkServerFreshness(), second = c.checkServerFreshness();
  assert.equal(h.loads(), 1); h.pending[0].resolve('first'); await Promise.all([first, second]);
  const failed = c.checkServerFreshness(); h.pending[1].reject(new Error('offline')); await failed;
  const changed = c.checkServerFreshness(); h.pending[2].resolve('changed'); await changed;
  assert.equal(h.loads(), 3); assert.deepEqual(h.attention, [false, true]);
});
test('account switch and signout discard stale results without cancelling new request', async () => {
  const h = harness(), c = h.context;
  const a = c.checkServerFreshness(); h.member('b'); const b = c.checkServerFreshness();
  assert.equal(h.loads(), 2); h.pending[0].resolve('old-a'); await a; assert.equal(h.stored(), '');
  const duplicate = c.checkServerFreshness(); assert.equal(h.loads(), 2);
  h.pending[1].resolve('new-b'); await Promise.all([b, duplicate]); assert.equal(h.stored(), 'new-b');
  const signedOut = c.checkServerFreshness(); h.member(''); h.pending[2].resolve('stale'); await signedOut;
  assert.deepEqual(h.attention, [false]);
});
