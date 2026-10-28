"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("../../functions/word-bomb/domain");
const words = require("../../functions/word-bomb/dictionary");
const players = Array.from({ length: 8 }, (_, i) => ({
  id: "p" + i,
  name: "친구 " + i,
}));
function make(options = {}, count = 2) {
  return D.create(players.slice(0, count), options, 1000);
}
test("new turns receive the full selected budget after handoff; normal has no match deadline", () => {
  for (const seconds of [5, 10, 15, 20]) {
    let s = make({ turnSeconds: seconds });
    assert.equal(s.endsAt, 0);
    const first = s.word,
      word = D.choices(s)[0],
      before = D.clone(s);
    const result = D.submit(s, "p0", word, 1, s.turnStartsAt + 300);
    assert.equal(result.accepted, true);
    assert.deepEqual(s, before);
    s = result.state;
    assert.equal(s.current, 1);
    assert.equal(s.turnEndsAt - s.turnStartsAt, seconds * 1000);
    assert.equal(s.turnStartsAt, before.turnStartsAt + 300 + D.HANDOFF_MS);
    assert.equal(s.players[0].score, 10);
    assert.ok(s.used.includes(first));
    assert.ok(s.used.includes(word));
  }
});
test("challenge total deadline does not reset, time expiry does not explode the holder", () => {
  let s = make({ mode: "challenge", turnSeconds: 10, durationSeconds: 60 });
  const end = s.endsAt;
  s = D.submit(s, "p0", D.choices(s)[0], s.turn, s.turnStartsAt + 500).state;
  assert.equal(s.endsAt, end);
  s.turnEndsAt = end + 2000;
  D.advance(s, end);
  assert.equal(s.phase, "finished");
  assert.equal(s.reason, "time");
  assert.equal(s.players[1].explosions, 0);
  assert.deepEqual(s.winners, ["p0"]);
});
test("expired submissions settle once, never award points; duplicate requests cannot advance a second turn", () => {
  let s = make();
  const word = D.choices(s)[0];
  const late = D.submit(s, "p0", word, 1, s.turnEndsAt);
  assert.equal(late.accepted, false);
  assert.equal(late.state.players[0].hearts, 1);
  assert.equal(late.state.players[0].score, 0);
  const again = D.submit(
    late.state,
    "p1",
    D.choices(late.state)[0],
    late.state.turn,
    late.state.turnStartsAt,
  ).state;
  assert.throws(
    () => D.submit(again, "p1", word, late.state.turn, again.turnStartsAt),
    /내 차례/,
  );
});
test("early, stale, wrong-player, unknown, invalid and reused words are rejected without mutating input", () => {
  const s = make(),
    word = D.choices(s)[0],
    before = D.clone(s);
  assert.throws(() => D.submit(s, "p1", word, 1, s.turnStartsAt), /내 차례/);
  assert.throws(
    () => D.submit(s, "p0", word, 0, s.turnStartsAt),
    /차례가 바뀌/,
  );
  assert.throws(() => D.submit(s, "p0", word, 1, s.turnStartsAt - 1), /도착/);
  assert.throws(() => D.submit(s, "p0", "<script>", 1, s.turnStartsAt), /한글/);
  assert.throws(
    () => D.submit(s, "p0", s.word.slice(-1) + "갛갛", 1, s.turnStartsAt),
    /사전/,
  );
  const used = { ...s, word: "사과", used: ["사과", "과자"] };
  assert.throws(() => D.submit(used, "p0", "과자", 1, s.turnStartsAt), /이미/);
  assert.deepEqual(s, before);
});
test("dictionary membership and one-shot endings; dueum conversion preserves final consonants", () => {
  assert.ok(D.wordCount > 800);
  assert.equal(new Set(words.words).size, words.words.length);
  assert.ok(words.words.every((word) => /^[가-힣]{2,12}$/.test(word)));
  assert.deepEqual(D.initials("녀"), ["녀", "여"]);
  assert.deepEqual(D.initials("력"), ["력", "역"]);
  assert.deepEqual(D.initials("리"), ["리", "이"]);
  assert.deepEqual(D.initials("라"), ["라", "나"]);
  assert.deepEqual(D.initials("니"), ["니", "이"]);
  assert.deepEqual(D.initials("가"), ["가"]);
  const s = { ...make(), word: "국화", used: ["국화"] };
  assert.throws(
    () => D.submit(s, "p0", "화요일", 1, s.turnStartsAt - 1),
    /도착/,
  );
  const one = { ...s, word: "개미", used: ["개미", ...D.followers("역")] };
  assert.throws(() => D.submit(one, "p0", "미역", 1, s.turnStartsAt), /한방/);
  const dueum = { ...s, word: "사다리", used: ["사다리"] };
  assert.equal(D.submit(dueum, "p0", "이마", 1, s.turnStartsAt).accepted, true);
});
test("normal elimination skips out players, finishes with a last survivor and does not impose a total timer", () => {
  let s = make({ hearts: 1 }, 3);
  s.players[2].hearts = 2;
  D.advance(s, s.turnEndsAt);
  assert.equal(s.players[0].out, true);
  assert.equal(s.current, 1);
  D.advance(s, s.turnEndsAt);
  assert.equal(s.phase, "finished");
  assert.deepEqual(s.winners, ["p2"]);
});
test("challenge explosions subtract score without elimination; replaying disconnected time reaches the real end", () => {
  const s = make({ mode: "challenge", durationSeconds: 60, turnSeconds: 5 }, 4);
  D.advance(s, s.endsAt + 60000);
  assert.equal(s.phase, "finished");
  assert.equal(s.reason, "time");
  assert.ok(s.players.every((p) => !p.out));
  assert.ok(s.players.every((p) => p.score === -10 * p.explosions));
  assert.equal(
    s.players.reduce((a, p) => a + p.explosions, 0),
    10,
  );
});
test("leaving transfers current turn or ends both modes; a forfeit cannot win", () => {
  for (const mode of ["normal", "challenge"]) {
    let s = make({ mode }, 3);
    s = D.leave(s, "p0", s.turnStartsAt);
    assert.equal(s.current, 1);
    assert.equal(s.players[0].left, true);
    s = D.leave(s, "p2", s.turnStartsAt);
    assert.equal(s.phase, "finished");
    assert.deepEqual(s.winners, ["p1"]);
  }
});
test("simulation across modes and 2–8 players preserves legal words, equal turn budgets and eventual end", () => {
  for (const mode of ["normal", "challenge"])
    for (let count = 2; count <= 8; count++) {
      let s = make({ mode, turnSeconds: 5, durationSeconds: 60 }, count),
        time = s.turnStartsAt,
        steps = 0;
      while (s.phase === "playing" && steps++ < 1000) {
        const choices = D.choices(s);
        if (steps % 3 === 0 || !choices.length) {
          time = s.turnEndsAt;
          D.advance(s, time);
        } else {
          time = Math.max(time, s.turnStartsAt) + 300;
          s = D.submit(
            s,
            s.players[s.current].id,
            choices[(steps * 7) % choices.length],
            s.turn,
            time,
          ).state;
        }
        assert.equal(s.turnEndsAt - s.turnStartsAt, 5000);
        assert.equal(new Set(s.used).size, s.used.length);
      }
      assert.equal(s.phase, "finished");
      assert.ok(s.winners.length);
    }
});

test("100,000 unique source-grounded words and long proposals beyond the old 12-character limit", () => {
  assert.equal(D.wordCount, 100000);
  const policy = require("../../functions/word-bomb/word-policy");
  assert.ok(words.words.every((word) => !policy.isBlocked(word)));
  const s = make({ mode: "challenge" }, 2),
    text = s.word.slice(-1) + "학교친구들과함께만드는아주긴낱말기";
  assert.ok(text.length > 12);
  const p = D.propose(s, "p0", text, s.turn, s.turnStartsAt + 100);
  const accepted = D.vote(
    p,
    "p1",
    p.proposal.id,
    true,
    p.proposal.startedAt + 1000,
  );
  assert.equal(accepted.word, text);
  assert.equal(accepted.players[0].score, 10);
  assert.ok(accepted.approvedWords.includes(text));
  assert.equal(accepted.history.at(-1).agreed, true);
  assert.equal(words.words.includes(text), false);
  assert.throws(
    () =>
      D.propose(
        s,
        "p0",
        s.word.slice(-1) + "가".repeat(100),
        s.turn,
        s.turnStartsAt + 100,
      ),
    /너무 길/,
  );
});

test("proposal majority excludes proposer: 2 players needs 1; 3 needs 2; 4 needs 2", () => {
  for (const count of [2, 3, 4]) {
    const s = make({ mode: "challenge" }, count),
      at = s.turnStartsAt + 1500;
    let p = D.propose(s, "p0", s.word.slice(-1) + "상상낱말기", s.turn, at);
    assert.equal(p.proposal.required, count === 2 ? 1 : 2);
    assert.throws(
      () => D.vote(p, "p0", p.proposal.id, true, at + 300),
      /투표 대상/,
    );
    assert.throws(
      () => D.vote(p, "intruder", p.proposal.id, true, at + 300),
      /투표 대상/,
    );
    assert.throws(
      () => D.submit(p, "p0", D.choices(s)[0], s.turn, at + 300),
      /투표/,
    );
    const one = D.vote(p, "p1", p.proposal.id, true, at + 1000);
    if (count > 2) {
      assert.ok(one.proposal);
      assert.deepEqual(
        D.vote(one, "p1", one.proposal.id, true, at + 1100),
        one,
      );
      assert.throws(
        () => D.vote(one, "p1", one.proposal.id, false, at + 1100),
        /이미 투표/,
      );
      p = D.vote(one, "p2", one.proposal.id, true, at + 2000);
    } else p = one;
    assert.equal(p.proposal, null);
    assert.equal(p.current, 1);
    assert.equal(p.players[0].score, 10);
    assert.equal(p.endsAt, s.endsAt + (count === 2 ? 1000 : 2000));
    assert.equal(p.turnEndsAt - p.turnStartsAt, 10000);
    assert.throws(() => D.vote(p, "p1", s.turn, true, at + 3000), /끝났거나/);
  }
});

test("rejected or expired vote restores remaining turn/global time and cannot be repeated that turn", () => {
  for (const mode of ["normal", "challenge"]) {
    const s = make({ mode }, 3),
      at = s.turnStartsAt + 2300;
    const p = D.propose(s, "p0", s.word.slice(-1) + "친구제안기", s.turn, at);
    const frozen = D.advance(D.clone(p), at + 10000);
    assert.equal(frozen.turn, p.turn);
    assert.equal(frozen.players[0].explosions, 0);
    const rejected = D.vote(p, "p1", p.proposal.id, false, at + 3000);
    assert.equal(rejected.proposal, null);
    assert.equal(rejected.turn, p.turn);
    assert.equal(rejected.turnEndsAt - (at + 3000), s.turnEndsAt - at);
    if (mode === "challenge") assert.equal(rejected.endsAt, s.endsAt + 3000);
    else assert.equal(rejected.endsAt, 0);
    assert.throws(
      () =>
        D.propose(
          rejected,
          "p0",
          s.word.slice(-1) + "다른제안기",
          s.turn,
          at + 3100,
        ),
      /한 번/,
    );
    const accepted = D.submit(
      rejected,
      "p0",
      D.choices(rejected)[0],
      s.turn,
      at + 3100,
    );
    assert.equal(accepted.accepted, true);
    const timed = D.advance(D.clone(p), p.proposal.expiresAt);
    assert.equal(timed.lastProposal.reason, "timeout");
    assert.equal(timed.turnEndsAt, s.turnEndsAt + D.VOTE_MS);
    D.advance(timed, timed.turnEndsAt);
    assert.equal(timed.players[0].explosions, 1);
  }
});

test("proposal cannot override duplicate, wrong letter, blocked words, or a bot-only electorate", () => {
  const s = make({}, 3),
    at = s.turnStartsAt + 100;
  assert.throws(
    () => D.propose(s, "p0", D.choices(s)[0], s.turn, at),
    /사전에 있는/,
  );
  assert.throws(
    () =>
      D.propose(
        { ...s, word: "사과", used: ["사과", "과자"] },
        "p0",
        "과자",
        s.turn,
        at,
      ),
    /이미/,
  );
  assert.throws(() => D.propose(s, "p0", "사과", s.turn, at), /시작/);
  assert.throws(
    () => D.propose({ ...s, word: "소씨" }, "p0", "씨발", s.turn, at),
    /함께 쓰기/,
  );
  s.players.slice(1).forEach((p) => (p.bot = true));
  assert.throws(
    () => D.propose(s, "p0", s.word.slice(-1) + "제안기", s.turn, at),
    /온라인/,
  );
});

test("proposal quorum is fixed across a departure; proposer leaving cancels the pause", () => {
  const s = make({ mode: "challenge" }, 4),
    at = s.turnStartsAt + 100;
  let p = D.propose(s, "p0", s.word.slice(-1) + "제안낱말기", s.turn, at);
  p = D.leave(p, "p3", at + 1000);
  assert.equal(p.proposal.required, 2);
  assert.equal(p.proposal.votes[0].agree, false);
  p = D.vote(p, "p1", p.proposal.id, true, at + 1100);
  assert.ok(p.proposal);
  p = D.vote(p, "p2", p.proposal.id, true, at + 1200);
  assert.equal(p.lastProposal.accepted, true);
  const other = D.propose(s, "p0", s.word.slice(-1) + "제안낱말기", s.turn, at);
  const left = D.leave(other, "p0", at + 500);
  assert.equal(left.proposal, null);
  assert.equal(left.current, 1);
  assert.equal(left.players[0].left, true);
  assert.equal(left.endsAt, s.endsAt + 500);
});

test("reported classroom nouns: acid rain is accepted and one-shot nouns are in the dictionary", () => {
  for (const word of ["산성비", "산기슭", "부엌"])
    assert.ok(words.words.includes(word));
  const s = { ...make(), word: "우산", used: ["우산"] };
  assert.equal(
    D.submit(s, "p0", "산성비", s.turn, s.turnStartsAt).accepted,
    true,
  );
});

test("one-shot opt-in accepts classroom nouns, resets the seed, and preserves turn budgets", () => {
  assert.equal(D.settings({}).allowOneShot, false);
  assert.equal(D.settings({ allowOneShot: "true" }).allowOneShot, false);
  for (const mode of ["normal", "challenge"]) {
    for (const [before, word] of [
      ["우산", "산기슭"],
      ["공부", "부엌"],
    ]) {
      const base = make({ mode, allowOneShot: true }, 3);
      const s = { ...base, word: before, used: [before] };
      assert.ok(D.choices(s).includes(word));
      const result = D.submit(s, "p0", word, s.turn, s.turnStartsAt);
      assert.equal(result.accepted, true);
      assert.equal(result.state.players[0].score, 10);
      assert.equal(result.state.players[0].hearts, s.players[0].hearts);
      assert.equal(result.state.current, 1);
      assert.equal(result.state.event.reset, true);
      assert.notEqual(result.state.word, word);
      assert.ok(result.state.used.includes(word));
      assert.ok(D.choices(result.state).length);
      assert.equal(result.state.turnEndsAt - result.state.turnStartsAt, 10000);
      assert.equal(result.state.endsAt, s.endsAt);
      assert.throws(
        () =>
          D.submit(
            { ...s, options: { ...s.options, allowOneShot: false } },
            "p0",
            word,
            s.turn,
            s.turnStartsAt,
          ),
        /한방/,
      );
      assert.throws(
        () => D.propose(s, "p0", word, s.turn, s.turnStartsAt),
        /폭탄 넘기기/,
      );
    }
  }
});

test("expanded dictionary preserves every old word and prefers easy bot/hint words", () => {
  const old =
    require("../../fixtures/word-bomb/dictionary-v2-provenance.json").entries.map(
      (r) => r[0],
    );
  const all = new Set(words.words),
    easy = new Set(words.practiceWords);
  assert.equal(all.size, 100000);
  for (const word of [
    "인공지능",
    "일기예보",
    "이산화탄소",
    "기후변화",
    "미세먼지",
  ])
    assert.ok(all.has(word), word);
  assert.equal(easy.size, 10001);
  for (const word of old) {
    assert.ok(all.has(word), word);
    assert.ok(easy.has(word), word);
  }
  for (const current of ["우산", "공부", "사과", "기차", "나무", "도시"]) {
    const s = { ...make(), word: current, used: [current] };
    const allChoices = D.choices(s);
    const preferred = allChoices.filter((w) => easy.has(w));
    assert.deepEqual(
      D.practiceChoices(s),
      preferred.length ? preferred : allChoices,
    );
    const exhausted = { ...s, used: [...s.used, ...preferred] };
    assert.deepEqual(D.practiceChoices(exhausted), D.choices(exhausted));
    const reference = D.followers(current.slice(-1), s.used).filter(
      (w) => D.followers(w.slice(-1), [...s.used, w]).length,
    );
    assert.deepEqual(allChoices, reference);
  }
});

test("playback speed shortens handoff only, preserving turn, challenge and vote budgets", () => {
  for (const invalid of [undefined, 0, -1, 4, "2", NaN])
    assert.equal(D.settings({ speed: invalid }).speed, 1);
  for (const speed of [1, 1.5, 2, 3])
    for (const mode of ["normal", "challenge"]) {
      const s = make({ speed, mode, turnSeconds: 10, durationSeconds: 60 }, 3);
      assert.equal(s.options.speed, speed);
      assert.equal(s.startsAt, 4000);
      const at = s.turnStartsAt + 200;
      const result = D.submit(s, "p0", D.choices(s)[0], s.turn, at).state;
      assert.equal(result.turnStartsAt - at, Math.round(1000 / speed));
      assert.equal(result.turnEndsAt - result.turnStartsAt, 10000);
      assert.equal(result.endsAt, s.endsAt);
      if (mode === "challenge") assert.equal(s.endsAt - s.startsAt, 60000);
      const proposed = D.propose(
        s,
        "p0",
        s.word.slice(-1) + "새로운배속시험낱말기",
        s.turn,
        at,
      );
      assert.equal(proposed.proposal.expiresAt - at, 20000);
    }
  const old = make();
  delete old.options.speed;
  assert.equal(
    D.submit(old, "p0", D.choices(old)[0], old.turn, old.turnStartsAt).state
      .turnStartsAt - old.turnStartsAt,
    1000,
  );
});
