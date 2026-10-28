'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const D = require('../../public/fruit-bell/domain');
const { createRanking } = require('../../functions/fruit-bell/ranking');
const people = [{ id: 'a', name: '토끼' }, { id: 'b', name: '곰' }, { id: 'c', name: '고양이' }, { id: 'd', name: '개구리' }];
const count = s => s.players.reduce((n, p) => n + D.total(p), 0) + (s.pending ? 1 : 0);
function table(cards) {
  const s = D.create(people, 0, () => .4); s.round = 1; s.revealAt = 1000; s.nextFlipAt = 10000;
  cards.forEach((card, i) => { s.players[i].hand.pop(); s.players[i].pile = [card]; }); return s;
}
test('56 cards, expected fruit distribution, 2–4 player deal preserves all cards', () => {
  assert.equal(D.deck().length, 56);
  for (let n = 2; n <= 4; n++) {
    const s = D.create(people.slice(0, n), 0); assert.equal(count(s), 56);
    assert(Math.max(...s.players.map(p => p.hand.length)) - Math.min(...s.players.map(p => p.hand.length)) <= 1);
  }
  assert.throws(() => D.create(people.slice(0, 1), 0));
  assert.throws(() => D.create([people[0], people[0]], 0));
});
test('only exposed top cards count; five is valid and six is not', () => {
  const s = table([{ fruit: 0, count: 2 }, { fruit: 0, count: 3 }]);
  s.players[0].pile.unshift({ fruit: 0, count: 4 }); assert(D.matches(s));
  s.players[1].pile[0].count = 4; assert.equal(D.matches(s), false);
  s.players[2].pile.push({ fruit: 1, count: 5 }); assert(D.matches(s));
});
test('server holds a short contest, awards all piles once, conserves deck', () => {
  const s = table([{ fruit: 0, count: 2 }, { fruit: 0, count: 3 }]);
  assert.equal(D.ring(s, 'a', 1, 1450).correct, true);
  assert.equal(s.players[0].hits, 0);
  assert.equal(D.ring(s, 'a', 1, 1451).accepted, false);
  D.tick(s, 1510); assert.equal(s.players[0].hits, 1); assert.equal(s.players[0].reactions[0], 450);
  assert.equal(s.players[0].hand.length, 15); assert.equal(s.players[1].pile.length, 0); assert.equal(count(s), 56);
});
test('near ties keep piles, block repeated rings and allow next flip', () => {
  const s = table([{ fruit: 0, count: 2 }, { fruit: 0, count: 3 }]);
  D.ring(s, 'a', 1, 1400); D.ring(s, 'b', 1, 1459); D.tick(s, 1460);
  assert.equal(s.event.type, 'tie'); assert.equal(s.players[0].pile.length, 1);
  assert.equal(D.ring(s, 'c', 1, 1500).accepted, false); assert.equal(count(s), 56);
  D.tick(s, 2810); assert(s.pending); assert.equal(s.round, 2);
});
test('incorrect ring pays others once, including a nearly empty hand', () => {
  const s = table([{ fruit: 0, count: 2 }]);
  const before = s.players.map(p => p.hand.length);
  assert.equal(D.ring(s, 'a', 1, 1200).correct, false);
  assert.equal(s.players[0].hand.length, before[0] - 3);
  assert.equal(s.players[3].hand.length, before[3] + 1);
  assert.equal(D.ring(s, 'a', 1, 1250).accepted, false); assert.equal(count(s), 56);
  const t = table([{ fruit: 0, count: 1 }]); t.players[0].hand = [{ fruit: 1, count: 1 }];
  D.ring(t, 'a', 1, 1300); assert.equal(t.event.paid, 1); assert.equal(t.players[0].hand.length, 0);
});
test('rejects unknown players, stale rounds, early/repeated flips, and hides unrevealed cards', () => {
  const s = D.create(people, 0);
  assert.equal(D.ring(s, 'a', 0, 800).accepted, false);
  assert.equal(D.flip(s, 'b', 1800), false); assert(D.flip(s, 'a', 1800));
  assert.equal(D.flip(s, 'a', 1801), false); assert.equal(count(s), 56);
  const view = D.view(s); assert.equal(view.pending.card, undefined); assert.equal(typeof view.players[0].hand, 'number');
  assert.equal(D.ring(s, 'a', 1, 2000).accepted, false);
  D.tick(s, 2300); assert.equal(s.players[0].pile.length, 1);
  assert.equal(D.ring(s, 'nobody', 1, 2400).accepted, false);
  assert.equal(D.ring(s, 'a', 0, 2400).accepted, false);
});
test('deadline counts an in-flight card, rejects late rings and handles disconnects', () => {
  const s = D.create(people, 0); D.flip(s, 'a', 89900); D.tick(s, 90000);
  assert.equal(s.phase, 'finished'); assert.equal(count(s), 56); assert.equal(s.winners.length, 4);
  assert.equal(D.ring(s, 'a', s.round, 90001).accepted, false);
  const t = D.create(people, 0); D.finish(t, 'disconnect'); assert.equal(t.phase, 'aborted'); assert.equal(D.result(t), null);
});
test('exhausted decks finish when no five is present', () => {
  const s = table([{ fruit: 0, count: 2 }]); s.players.forEach(p => { p.pile.push(...p.hand.splice(0)); });
  // Ensure no final visible fruit adds to 5.
  s.players.forEach(p => { p.pile[p.pile.length - 1] = { fruit: 0, count: 1 }; });
  s.turn = -1; D.tick(s, 10000); assert.equal(s.phase, 'finished');
});
test('trial ranking excludes bots/aborts, deduplicates matches, and displays shared places', () => {
  const ranking = createRanking(), s = D.create(people, 0); D.finish(s);
  assert(ranking.record('first', D.result(s))); assert.equal(ranking.record('first', D.result(s)), false);
  assert.deepEqual(ranking.list().map(r => [r.total, r.rank, r.games]), [[1,1,1],[1,1,1],[1,1,1],[1,1,1]]);
  s.players[1].bot = true; assert.equal(ranking.record('bot', D.result(s)), false);
  assert.equal(ranking.record('abort', null), false);
});
test('random full games preserve all cards throughout turns and penalties', () => {
  for (let run = 0; run < 12; run++) {
    const s = D.create(people.slice(0, 2 + run % 3), 0);
    for (let now = 100; now <= 90500; now += 100) {
      D.tick(s, now);
      if (s.phase === 'playing' && !s.pending && Math.random() < .4) D.ring(s, s.players[Math.floor(Math.random() * s.players.length)].id, s.round, now);
      assert.equal(count(s), 56);
      assert(s.players.every(p => p.hand.length >= 0));
    }
    assert.equal(s.phase, 'finished');
  }
});
