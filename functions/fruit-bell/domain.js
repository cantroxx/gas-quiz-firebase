/* Shared rules. Browser practice and the authoritative local match server use this file. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FruitBellDomain = factory();
})(globalThis, function () {
  'use strict';
  const VERSION = 'fruit-bell-90-v1';
  const DURATION = 90000, FLIP_MS = 500, TIE_MS = 60, TURN_MS = 3000;
  const EMOTES = Object.freeze({ laugh: '🤣', tease: '😜', surprise: '😱', clap: '👏' });
  const EMOTE_COOLDOWN = 3000, EMOTE_DURATION = 2500;
  function deck(random = Math.random) {
    const cards = [];
    for (let fruit = 0; fruit < 4; fruit++) {
      [5, 3, 3, 2, 1].forEach((copies, i) => {
        for (let j = 0; j < copies; j++) cards.push({ fruit, count: i + 1 });
      });
    }
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }
  function create(players, now, random = Math.random) {
    if (players.length < 2 || players.length > 4 || new Set(players.map(p => p.id)).size !== players.length) throw Error('2~4명이 필요해요.');
    const cards = deck(random);
    const state = { version: VERSION, phase: 'playing', startedAt: now, endsAt: now + DURATION,
      players: players.map(p => ({ id: p.id, name: p.name, bot: !!p.bot, hand: [], pile: [], hits: 0, misses: 0, reactions: [] })),
      turn: 0, round: 0, revealAt: 0, nextFlipAt: now + 1800, pending: null, contest: null,
      locked: [], event: { id: 0, type: 'start', text: '같은 과일이 정확히 5개면, 종!' }, revision: 0 };
    cards.forEach((card, i) => state.players[i % players.length].hand.push(card));
    return state;
  }
  function total(player) { return player.hand.length + player.pile.length; }
  function totals(state) {
    const result = [0, 0, 0, 0];
    for (const p of state.players) { const card = p.pile.at(-1); if (card) result[card.fruit] += card.count; }
    return result;
  }
  function matches(state) { return totals(state).some(count => count === 5); }
  function event(state, type, text, extra = {}) {
    state.event = { id: state.event.id + 1, type, text, ...extra }; state.revision++;
  }
  function nextPlayer(state, from) {
    for (let step = 1; step <= state.players.length; step++) {
      const index = (from + step) % state.players.length;
      if (state.players[index].hand.length) return index;
    }
    return -1;
  }
  function finish(state, reason = 'time') {
    // A card in flight still belongs to its owner's pile at the final count.
    if (state.pending) {
      state.players[state.pending.seat].pile.push(state.pending.card); state.pending = null;
    }
    state.contest = null;
    state.phase = reason === 'disconnect' ? 'aborted' : 'finished';
    const best = Math.max(...state.players.map(total));
    state.winners = state.players.filter(p => total(p) === best).map(p => p.id);
    event(state, state.phase, reason === 'disconnect' ? '연결이 끊겨 경기를 마쳤어요. 이 경기는 랭킹에 넣지 않아요.' : '경기 끝! 모은 카드를 세어 볼까요?', { reason });
  }
  function flip(state, id, now) {
    if (state.phase !== 'playing' || now >= state.endsAt || state.pending || state.contest || now < state.revealAt + 650) return false;
    const p = state.players[state.turn];
    if (!p || p.id !== id || !p.hand.length) return false;
    state.round++; state.locked = [];
    state.pending = { seat: state.turn, card: p.hand.shift(), at: now + FLIP_MS };
    state.nextFlipAt = now + FLIP_MS + TURN_MS;
    event(state, 'flip', `${p.name}의 카드가 뒤집혀요!`);
    return true;
  }
  function ring(state, id, round, now) {
    if (state.phase !== 'playing' || now >= state.endsAt || state.pending || !state.round || round !== state.round || state.locked.includes(id)) return { accepted: false };
    if (state.contest && now > state.contest.until) return { accepted: false };
    const p = state.players.find(p => p.id === id);
    if (!p) return { accepted: false };
    state.locked.push(id);
    if (!matches(state)) {
      let paid = 0;
      for (const other of state.players) if (other !== p && p.hand.length) { other.hand.push(p.hand.shift()); paid++; }
      p.misses++;
      event(state, 'miss', `${p.name}, 아직 5개가 아니에요! 카드 ${paid}장을 나눠 줬어요.`, { player: id, paid });
      return { accepted: true, correct: false };
    }
    const reaction = Math.max(0, Math.round(now - state.revealAt));
    if (!state.contest) state.contest = { until: now + TIE_MS, entries: [] };
    state.contest.entries.push({ id, reaction });
    state.revision++;
    return { accepted: true, correct: true };
  }
  function tick(state, now) {
    if (state.phase !== 'playing') return false;
    const before = state.revision;
    if (state.contest && now >= state.contest.until) {
      const entries = state.contest.entries;
      state.contest = null;
      if (entries.length > 1) {
        // Nobody loses cards on a near tie. A new flip changes the table before another attempt.
        state.locked = state.players.map(p => p.id);
        event(state, 'tie', '거의 동시에 딩! 카드를 두고 다음 카드에서 다시 겨뤄요.', { players: entries.map(e => e.id) });
      } else {
        const winner = state.players.find(p => p.id === entries[0].id);
        const cards = state.players.flatMap(p => p.pile.splice(0));
        winner.hand.push(...cards); winner.hits++; winner.reactions.push(entries[0].reaction);
        state.turn = state.players.indexOf(winner);
        state.locked = state.players.map(p => p.id);
        event(state, 'win', `${winner.name}, ${cards.length}장 가져가요!`, { player: winner.id, count: cards.length, reaction: entries[0].reaction });
      }
      state.nextFlipAt = now + 1350;
    }
    if (now >= state.endsAt) { finish(state); return true; }
    if (state.pending && now >= state.pending.at) {
      const { seat, card, at } = state.pending;
      state.players[seat].pile.push(card); state.pending = null; state.revealAt = now;
      state.nextFlipAt = now + TURN_MS;
      state.turn = nextPlayer(state, seat);
      event(state, 'reveal', '테이블 위 과일을 살펴봐요.');
    }
    if (!state.pending && !state.contest && now >= state.nextFlipAt) {
      if (state.turn < 0 || !state.players[state.turn]?.hand.length) state.turn = nextPlayer(state, Math.max(0, state.turn));
      if (state.turn < 0) {
        if (matches(state) && state.event.type !== 'tie') { state.nextFlipAt = now + 1000; }
        else finish(state, 'no-cards');
      } else flip(state, state.players[state.turn].id, now);
    }
    return before !== state.revision;
  }
  function view(state) {
    return { ...state, pending: state.pending ? { seat: state.pending.seat, at: state.pending.at } : null, contest: state.contest ? { until: state.contest.until } : null,
      players: state.players.map(p => ({ id: p.id, name: p.name, bot: p.bot,
        hand: p.hand.length, pile: p.pile.length, card: p.pile.at(-1) || null,
        total: total(p), hits: p.hits, misses: p.misses,
        bestReaction: p.reactions.length ? Math.min(...p.reactions) : null })) };
  }
  function result(state) {
    if (state.phase !== 'finished') return null;
    return { version: VERSION, winners: [...state.winners], practice: state.players.some(p => p.bot),
      players: state.players.map(p => ({ id: p.id, name: p.name, cards: total(p), hits: p.hits, misses: p.misses,
        bestReaction: p.reactions.length ? Math.min(...p.reactions) : null })) };
  }
  return { VERSION, DURATION, FLIP_MS, TIE_MS, EMOTES, EMOTE_COOLDOWN, EMOTE_DURATION, deck, create, total, totals, matches, flip, ring, tick, finish, view, result };
});
