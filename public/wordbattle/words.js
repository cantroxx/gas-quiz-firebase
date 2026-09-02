/* words.js — 낱말 판정
 *  사전: 국립국어원 학습용 어휘와 hunspell-dict-ko를 가공한 80,774개 (words-data.js)
 *        명사·동사·형용사·부사·관형사·감탄사·외래어 모두 포함. 난이도 모드는 없앴다.
 *  사전에 없는 낱말은 → 게임 중에 '제안'해서 다른 참가자들이 동의하면 통과한다(방별로 인정).
 *  욕설·성적 낱말은 사전에서 뺐고, '제안'으로도 낼 수 없게 막는다.
 *  window.WBWords 로 노출. words-data.js 가 먼저 로드되어야 함.
 *  출처·라이선스 점검: DICTIONARY_NOTICE.md
 */
(function (global) {
  'use strict';

  // ── 사전 ──────────────────────────────────────────────
  const DICT = new Set(global.WB_WORDS || []);

  // ── 차단 낱말 (아동용 필터: 욕설·성적·유해) ──
  // 사전에서도 뺐지만, '제안' 기능으로 우회하지 못하도록 여기서도 막는다.
  const BLOCKED = new Set([
    '씨발','시발','씨발놈','좆','좇','존나','병신','새끼','개새끼','지랄','썅','쌍놈','미친놈',
    '엿먹어','꺼져','닥쳐','또라이','등신','머저리','호로','후레자식','개년',
    '섹스','성교','자위','포르노','야동','음란','성기','자지','보지','불알','젖가슴',
    '유방','음경','발기','변태','강간','매춘','창녀',
    '살인','자살','마약','대마초','필로폰'
  ]);
  // 부분 문자열로도 걸러낼 뿌리 (예: '개새끼같은' 류)
  const BLOCKED_PARTS = ['씨발','시발','병신','새끼','좆','지랄','섹스','자위','포르노','강간','음란'];

  function isBlocked(text) {
    if (BLOCKED.has(text)) return true;
    for (const p of BLOCKED_PARTS) if (text.indexOf(p) >= 0) return true;
    return false;
  }

  // ── 이 방에서 '제안 → 동의'로 인정된 낱말 (게임마다 따로) ──
  let approved = new Set();
  function setApproved(list) { approved = new Set(list || []); }
  function isApproved(text) { return approved.has(text); }

  /* 낱말이 유효한가?
   *  반환 { ok, reason, canPropose }
   *   - canPropose: 사전엔 없지만 '제안'해볼 수 있는 낱말인지 (차단어는 제안도 불가)
   */
  function isValidWord(text) {
    if (!text || !text.length) return { ok: false, reason: '빈 낱말', canPropose: false };
    if (isBlocked(text)) return { ok: false, reason: '쓸 수 없는 낱말이에요', canPropose: false };
    if (DICT.has(text)) return { ok: true };
    if (approved.has(text)) return { ok: true };           // 친구들이 동의해준 낱말
    return { ok: false, reason: '사전에 없어요 — 친구들에게 제안해 보세요', canPropose: true };
  }

  /* 힌트: 가진 자모(available = [jamo,...])로 만들 수 있는 사전 낱말 하나를 추천.
   * 짧은 낱말(1~3글자) 위주로 찾고, 이미 방에서 인정된 낱말도 후보에 넣는다.
   */
  const H = global.WBHangul;
  function suggest(available) {
    const pool = {}; available.forEach(function (j) { pool[j] = (pool[j] || 0) + 1; });
    const candidates = (global.WB_WORDS || []).concat(Array.from(approved));
    let best = null;
    for (const w of candidates) {
      if (!w || w.length > 3 || isBlocked(w)) continue;
      const js = H.decompose(w);
      if (!js) continue;
      const need = {}; let okc = true;
      for (const j of js) { need[j] = (need[j] || 0) + 1; if ((pool[j] || 0) < need[j]) { okc = false; break; } }
      if (okc) { best = w; if (w.length <= 2) break; }   // 짧은 낱말을 우선
    }
    return best;
  }

  global.WBWords = {
    isValidWord,
    isBlocked,
    setApproved,
    isApproved,
    suggest,
    size: function () { return DICT.size; },
    has: function (w) { return DICT.has(w); },
    all: function () { return global.WB_WORDS || []; }
  };
})(typeof window !== 'undefined' ? window : this);
