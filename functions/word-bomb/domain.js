(function (root) {
  "use strict";
  const dictionary =
    typeof module !== "undefined"
      ? require("./dictionary")
      : root.WordBombDictionary;
  const WORDS = new Set(dictionary.words);
  const policy =
    typeof module !== "undefined"
      ? require("./word-policy")
      : root.WordBombWordPolicy;
  const VOTE_MS = 20000;
  const HANDOFF_MS = 1000;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function fail(message) {
    throw Error(message);
  }
  function settings(input = {}) {
    return {
      mode: input.mode === "challenge" ? "challenge" : "normal",
      allowOneShot: input.allowOneShot === true,
      speed: [1, 1.5, 2, 3].includes(input.speed) ? input.speed : 1,
      turnSeconds: [5, 10, 15, 20].includes(input.turnSeconds)
        ? input.turnSeconds
        : 10,
      durationSeconds: [60, 180, 300].includes(input.durationSeconds)
        ? input.durationSeconds
        : 180,
      hearts: [1, 2, 3].includes(input.hearts) ? input.hearts : 2,
    };
  }
  function initials(syllable) {
    const out = [syllable],
      n = (syllable || "").charCodeAt(0) - 0xac00;
    if (n < 0 || n >= 11172 || !Number.isFinite(n)) return out;
    const first = Math.floor(n / 588),
      vowel = Math.floor((n % 588) / 28),
      tail = n % 28;
    if (first === 5) {
      if ([2, 6, 7, 12, 17, 20].includes(vowel))
        out.push(String.fromCharCode(0xac00 + 11 * 588 + vowel * 28 + tail));
      else if ([0, 1, 8, 11, 13, 18].includes(vowel))
        out.push(String.fromCharCode(0xac00 + 2 * 588 + vowel * 28 + tail));
    } else if (first === 2 && [6, 12, 17, 20].includes(vowel))
      out.push(String.fromCharCode(0xac00 + 11 * 588 + vowel * 28 + tail));
    return out;
  }
  const byFirst = new Map();
  for (const word of WORDS) {
    if (!byFirst.has(word[0])) byFirst.set(word[0], []);
    byFirst.get(word[0]).push(word);
  }
  function followers(last, used = []) {
    const usedSet = new Set(used);
    return initials(last)
      .flatMap((char) => byFirst.get(char) || [])
      .filter((word) => !usedSet.has(word));
  }
  const practiceWords = new Set(dictionary.practiceWords || dictionary.words);
  function choices(state) {
    const used = new Set(state.used);
    return initials(state.word.slice(-1))
      .flatMap((char) => byFirst.get(char) || [])
      .filter(
        (word) =>
          !used.has(word) &&
          (state.options?.allowOneShot ||
            initials(word.slice(-1)).some((char) =>
              (byFirst.get(char) || []).some(
                (next) => next !== word && !used.has(next),
              ),
            )),
      );
  }
  function practiceChoices(state) {
    const all = choices(state);
    const easy = all.filter((word) => practiceWords.has(word));
    return easy.length ? easy : all;
  }
  function seed(state) {
    const used = new Set(state.used);
    // Rotate the independently curated seed list; never silently accept one-shot endings.
    const seeds = [
      "사과",
      "나무",
      "바다",
      "학교",
      "구두",
      "책상",
      "시계",
      "우산",
      "가방",
      "기차",
      ...(dictionary.practiceWords || dictionary.words),
      ...dictionary.words,
    ];
    for (let i = 0; i < seeds.length; i++) {
      const word = seeds[(i + state.round * 7) % seeds.length];
      if (
        !used.has(word) &&
        followers(word.slice(-1), [...used, word]).some(
          (next) => followers(next.slice(-1), [...used, word, next]).length,
        )
      ) {
        state.word = word;
        state.used.push(word);
        return true;
      }
    }
    return false;
  }
  function create(players, config, now) {
    if (
      players.length < 2 ||
      players.length > 8 ||
      new Set(players.map((p) => p.id)).size !== players.length
    )
      fail("2~8명이 필요해요.");
    const options = settings(config);
    const state = {
      version: 3,
      proposal: null,
      approvedWords: [],
      proposalTurn: 0,
      lastProposal: null,
      options,
      phase: "playing",
      players: players.map((p, i) => ({
        id: p.id,
        name: String(p.name).slice(0, 20),
        bot: !!p.bot,
        characterId:
          Number.isInteger(p.characterId) &&
          p.characterId >= 0 &&
          p.characterId < 16
            ? p.characterId
            : i,
        hearts: options.hearts,
        score: 0,
        successes: 0,
        explosions: 0,
        out: false,
        left: false,
      })),
      current: 0,
      turn: 1,
      round: 0,
      word: "",
      used: [],
      history: [],
      event: { type: "start", seq: 1, to: 0 },
      startsAt: now + 3000,
      turnStartsAt: now + 3000,
      turnEndsAt: now + 3000 + options.turnSeconds * 1000,
      endsAt:
        options.mode === "challenge"
          ? now + 3000 + options.durationSeconds * 1000
          : 0,
      winners: [],
      reason: "",
    };
    seed(state);
    return state;
  }
  function finish(state, reason, at) {
    state.proposal = null;
    state.phase = "finished";
    state.reason = reason;
    state.finishedAt = at;
    const eligible = state.players.filter((p) => !p.left);
    const value = (p) =>
      state.options.mode === "challenge" ? p.score : p.hearts;
    const best = Math.max(...eligible.map(value));
    state.winners = eligible.filter((p) => value(p) === best).map((p) => p.id);
  }
  function next(state, at) {
    if (state.players.filter((p) => !p.out).length <= 1) {
      finish(state, "survivor", at);
      return;
    }
    for (let i = 1; i <= state.players.length; i++) {
      const index = (state.current + i) % state.players.length;
      if (!state.players[index].out) {
        state.current = index;
        break;
      }
    }
    state.turn++;
    state.turnStartsAt =
      at + Math.round(HANDOFF_MS / (state.options.speed || 1));
    state.turnEndsAt = state.turnStartsAt + state.options.turnSeconds * 1000;
    state.event.to = state.current;
  }
  function explode(state, at) {
    const p = state.players[state.current],
      from = state.current;
    p.explosions++;
    if (state.options.mode === "challenge") p.score -= 10;
    else {
      p.hearts--;
      p.out = p.hearts <= 0;
    }
    state.round++;
    state.event = { type: "explode", seq: state.turn + 1, from, name: p.name };
    next(state, at);
    if (state.phase === "playing" && !seed(state))
      finish(state, "dictionary", at);
  }
  function advance(state, now) {
    // A vote pauses both clocks for at most 20 seconds, including while disconnected.
    if (state.proposal) {
      if (now < state.proposal.expiresAt) return state;
      resolveProposal(state, false, state.proposal.expiresAt, "timeout");
    }
    while (state.phase === "playing") {
      if (
        state.endsAt &&
        now >= state.endsAt &&
        state.endsAt <= state.turnEndsAt
      ) {
        finish(state, "time", state.endsAt);
        break;
      }
      if (now < state.turnEndsAt) break;
      explode(state, state.turnEndsAt);
    }
    return state;
  }
  function checkTurn(s, id, turn, now) {
    if (s.phase !== "playing") fail("이미 끝난 경기예요.");
    if (s.proposal) fail("친구들의 투표를 기다려 주세요.");
    if (s.players[s.current].id !== id) fail("아직 내 차례가 아니에요.");
    if (turn !== s.turn) fail("차례가 바뀌었어요. 다시 확인해 주세요.");
    if (now < s.turnStartsAt) fail("폭탄이 도착하면 시작해요.");
  }
  function checkWord(s, text) {
    const word = typeof text === "string" ? text.normalize("NFC").trim() : "";
    if (!/^[가-힣]+$/.test(word) || word.length < 2)
      fail("두 글자 이상의 한글 낱말을 써 주세요.");
    if (word.length > policy.MAX_WORD_LENGTH)
      fail("입력이 너무 길어요. 한 낱말만 써 주세요.");
    if (policy.isBlocked(word)) fail("친구들과 함께 쓰기 어려운 낱말이에요.");
    if (!initials(s.word.slice(-1)).includes(word[0]))
      fail(initials(s.word.slice(-1)).join(" 또는 ") + "(으)로 시작해 주세요.");
    if (s.used.includes(word))
      fail("이미 나온 낱말이에요. 다른 낱말을 생각해 봐요.");
    return word;
  }
  function acceptWord(s, word, now, agreed = false) {
    const from = s.current,
      p = s.players[from];
    p.successes++;
    p.score += 10;
    s.word = word;
    s.used.push(word);
    s.history = [...s.history, { word, name: p.name, agreed }].slice(-8);
    s.event = {
      type: "pass",
      seq: s.turn + 1,
      from,
      word,
      name: p.name,
      agreed,
    };
    next(s, now);
    if (s.phase === "playing" && !choices(s).length) {
      s.round++;
      if (!seed(s)) finish(s, "dictionary", now);
      else s.event.reset = true;
    }
    return s;
  }
  function submit(state, id, text, turn, now) {
    const s = advance(clone(state), now);
    if (s.phase !== "playing" || s.turn !== state.turn)
      return {
        state: s,
        accepted: false,
        message: "시간이 끝났어요. 다음 차례를 확인해 주세요.",
      };
    checkTurn(s, id, turn, now);
    const word = checkWord(s, text);
    if (!WORDS.has(word) && !(s.approvedWords || []).includes(word))
      fail("사전에 없는 낱말이에요. ‘제안’으로 친구들에게 물어볼 수 있어요.");
    if (
      !s.options.allowOneShot &&
      !followers(word.slice(-1), [...s.used, word]).length
    )
      fail(
        "이을 낱말이 없는 한방 낱말이에요. ‘제안’으로 친구들의 동의를 받을 수 있어요.",
      );
    return { state: acceptWord(s, word, now), accepted: true, message: "" };
  }
  function propose(state, id, text, turn, now) {
    const s = advance(clone(state), now);
    checkTurn(s, id, turn, now);
    if (s.proposalTurn === s.turn)
      fail("제안은 한 차례에 한 번만 할 수 있어요.");
    const word = checkWord(s, text);
    if (
      WORDS.has(word) &&
      (s.options.allowOneShot ||
        followers(word.slice(-1), [...s.used, word]).length)
    )
      fail("사전에 있는 낱말이에요. ‘폭탄 넘기기’를 눌러 주세요.");
    const eligibleIds = s.players
      .filter((p) => p.id !== id && !p.out && !p.left && !p.bot)
      .map((p) => p.id);
    if (!eligibleIds.length)
      fail("제안은 친구와 하는 온라인 대전에서 사용할 수 있어요.");
    s.proposalTurn = s.turn;
    s.proposal = {
      id: s.turn,
      word,
      proposerId: id,
      eligibleIds,
      votes: [],
      required: Math.floor(eligibleIds.length / 2) + 1,
      startedAt: now,
      expiresAt: now + VOTE_MS,
    };
    s.event = {
      type: "proposal",
      seq: s.turn + 1,
      word,
      name: s.players[s.current].name,
    };
    return s;
  }
  function resolveProposal(s, accepted, at, reason) {
    const proposal = s.proposal;
    if (!proposal) return s;
    const paused = Math.max(0, at - proposal.startedAt);
    s.turnStartsAt += paused;
    s.turnEndsAt += paused;
    if (s.endsAt) s.endsAt += paused;
    s.lastProposal = {
      id: proposal.id,
      word: proposal.word,
      accepted,
      reason,
      yes: proposal.votes.filter((v) => v.agree).length,
      required: proposal.required,
    };
    s.proposal = null;
    if (accepted) {
      s.approvedWords = [...(s.approvedWords || []), proposal.word];
      return acceptWord(s, proposal.word, at, true);
    }
    s.event = {
      type: "vote-rejected",
      seq: s.turn + 1,
      word: proposal.word,
      reason,
    };
    return s;
  }
  function vote(state, id, proposalId, agree, now) {
    const s = advance(clone(state), now),
      p = s.proposal;
    if (!p || p.id !== proposalId) fail("이미 끝났거나 바뀐 제안이에요.");
    if (typeof agree !== "boolean") fail("동의 또는 반대를 선택해 주세요.");
    const player = s.players.find((player) => player.id === id);
    if (!p.eligibleIds.includes(id) || !player || player.out || player.left)
      fail("이 제안의 투표 대상이 아니에요.");
    const existing = p.votes.find((v) => v.id === id);
    if (existing) {
      if (existing.agree !== agree) fail("이미 투표했어요.");
      return s;
    }
    p.votes.push({ id, agree });
    const yes = p.votes.filter((v) => v.agree).length,
      remaining = p.eligibleIds.length - p.votes.length;
    if (yes >= p.required) resolveProposal(s, true, now, "majority");
    else if (yes + remaining < p.required)
      resolveProposal(s, false, now, "rejected");
    return s;
  }
  function leave(state, id, now) {
    const s = advance(clone(state), now),
      index = s.players.findIndex((p) => p.id === id);
    if (index < 0) fail("참가자가 아니에요.");
    if (s.proposal) {
      if (s.proposal.proposerId === id) resolveProposal(s, false, now, "left");
      else if (
        s.proposal.eligibleIds.includes(id) &&
        !s.proposal.votes.some((v) => v.id === id)
      ) {
        s.proposal.votes.push({ id, agree: false });
        const yes = s.proposal.votes.filter((v) => v.agree).length;
        if (
          yes + s.proposal.eligibleIds.length - s.proposal.votes.length <
          s.proposal.required
        )
          resolveProposal(s, false, now, "left");
      }
    }
    const p = s.players[index];
    p.left = true;
    p.out = true;
    p.hearts = 0;
    if (s.phase === "playing") {
      s.event = { type: "leave", seq: s.turn + 1, from: index, name: p.name };
      if (s.players.filter((player) => !player.out).length <= 1)
        finish(s, "survivor", now);
      else if (index === s.current) next(s, now);
    }
    return s;
  }
  const api = {
    settings,
    initials,
    followers,
    choices,
    practiceChoices,
    create,
    submit,
    propose,
    vote,
    VOTE_MS,
    MAX_WORD_LENGTH: policy.MAX_WORD_LENGTH,
    advance,
    leave,
    clone,
    HANDOFF_MS,
    dictionaryVersion: dictionary.version,
    wordCount: WORDS.size,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.WordBombDomain = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
