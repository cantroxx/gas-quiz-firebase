/* engine.js — 낱말대전 게임 규칙(순수 로직). UI·네트워크와 분리.
 *  타일 봉지 만들기 → 자음7·모음7 나눠주기 → 낱말 검증 → 승리 판정.
 *  window.WBEngine 로 노출. WBHangul, WBWords 에 의존.
 */
(function (global) {
  'use strict';

  const H = global.WBHangul;
  const W = global.WBWords;

  // 봉지 구성: [자모, 개수].
  // 난이도를 낮추려고 흔한 자모는 넉넉히, 겹자음(ㄲㄸㅃㅆㅉ)·겹모음(ㅒㅖㅘㅙㅚㅝㅞㅟㅢ)은 1장씩만 둔다.
  const CONSONANT_COUNTS = {
    'ㄱ':7,'ㄴ':7,'ㄷ':6,'ㄹ':7,'ㅁ':7,'ㅂ':6,'ㅅ':7,'ㅇ':8,'ㅈ':6,'ㅎ':6,
    'ㅊ':3,'ㅋ':2,'ㅌ':3,'ㅍ':3,
    'ㄲ':1,'ㄸ':1,'ㅃ':1,'ㅆ':1,'ㅉ':1          // 겹자음: 최소화
  };
  const VOWEL_COUNTS = {
    'ㅏ':8,'ㅓ':7,'ㅗ':7,'ㅜ':6,'ㅡ':6,'ㅣ':8,'ㅐ':5,'ㅔ':4,
    'ㅑ':3,'ㅕ':4,'ㅛ':2,'ㅠ':2,
    'ㅒ':1,'ㅖ':1,'ㅘ':1,'ㅙ':1,'ㅚ':1,'ㅝ':1,'ㅞ':1,'ㅟ':1,'ㅢ':1   // 겹모음: 최소화
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  let _seq = 0;
  function makeTile(jamo, kind) {
    return { id: 't' + (++_seq) + '_' + jamo, jamo: jamo, kind: kind };
  }

  // 자음 봉지 / 모음 봉지를 따로 만들어 섞는다 (한글워드 규칙: 자음·모음 주머니 분리)
  function makeBag() {
    const consonants = [];
    const vowels = [];
    Object.keys(CONSONANT_COUNTS).forEach(function (j) {
      for (let k = 0; k < CONSONANT_COUNTS[j]; k++) consonants.push(makeTile(j, 'C'));
    });
    Object.keys(VOWEL_COUNTS).forEach(function (j) {
      for (let k = 0; k < VOWEL_COUNTS[j]; k++) vowels.push(makeTile(j, 'V'));
    });
    return { consonants: shuffle(consonants), vowels: shuffle(vowels) };
  }

  const HAND_CONSONANTS = 7;
  const HAND_VOWELS = 7;

  // bag 에서 각 플레이어에게 자음7·모음7 나눠주고, 남은 봉지를 반환.
  function deal(bag, numPlayers) {
    const hands = [];
    for (let p = 0; p < numPlayers; p++) {
      const hand = [];
      for (let i = 0; i < HAND_CONSONANTS; i++) if (bag.consonants.length) hand.push(bag.consonants.pop());
      for (let i = 0; i < HAND_VOWELS; i++) if (bag.vowels.length) hand.push(bag.vowels.pop());
      hands.push(hand);
    }
    return { hands: hands, bag: bag };
  }

  // 봉지에서 한 장 뽑기. kind 'C' 또는 'V'. 비었으면 null.
  function drawTile(bag, kind) {
    const pile = kind === 'C' ? bag.consonants : bag.vowels;
    return pile.length ? pile.pop() : null;
  }

  /* 타일 한 묶음(순서 있는 배열)이 유효한 낱말인지.
   *  반환 { ok, text, reason, canPropose }
   *   canPropose: 사전엔 없지만 친구들에게 '제안'해볼 수 있는 낱말
   */
  function validateWord(tiles) {
    const jamos = tiles.map(function (t) { return t.jamo; });
    const c = H.compose(jamos);
    if (!c.ok) return { ok: false, text: '', reason: c.reason, canPropose: false };
    const v = W.isValidWord(c.text);
    return { ok: v.ok, text: c.text, reason: v.reason, canPropose: !!v.canPropose };
  }

  /* 이번 턴에 내려는 여러 낱말 묶음 전체 검증.
   *  groups: [[tile,...], ...]
   *  반환 { ok, results:[{text,ok,reason,canPropose}] }  — 하나라도 실패하면 ok=false
   */
  function validateLay(groups) {
    let ok = groups.length > 0;
    const results = groups.map(function (g) {
      const r = validateWord(g);
      if (!r.ok) ok = false;
      return r;
    });
    return { ok: ok, results: results };
  }

  global.WBEngine = {
    makeBag, deal, drawTile, validateWord, validateLay,
    HAND_CONSONANTS, HAND_VOWELS,
    shuffle
  };
})(typeof window !== 'undefined' ? window : this);
