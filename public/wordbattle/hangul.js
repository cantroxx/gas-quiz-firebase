/* hangul.js — 자음·모음 낱자(타일)를 한글 글자로 조합하는 엔진
 * 낱말대전(루미큐브 한글워드)의 핵심: 늘어놓은 자모 타일들이 진짜 글자를 이루는지 판정한다.
 * 외부 의존성 없음. window.WBHangul 로 노출.
 */
(function (global) {
  'use strict';

  // 초성 19개 (자음이 글자 맨 앞에 올 때)
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  // 중성 21개 (모음)
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  // 종성 28개 (0번은 받침 없음). 타일은 낱개 자음만 쓰므로 복합 받침(ㄳ,ㄵ…)은 v1에서 제외.
  const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  const CHO_SET = new Set(CHO);
  const JUNG_SET = new Set(JUNG);
  const JONG_SET = new Set(JONG.filter(Boolean)); // 받침으로 쓸 수 있는 낱자

  function isConsonant(ch) { return CHO_SET.has(ch); }
  function isVowel(ch) { return JUNG_SET.has(ch); }

  // 초성/중성/종성 한 벌을 완성형 글자 하나로 합친다. 불가능하면 null.
  function composeSyllable(cho, jung, jong) {
    const ci = CHO.indexOf(cho);
    const vi = JUNG.indexOf(jung);
    const ti = jong ? JONG.indexOf(jong) : 0;
    if (ci < 0 || vi < 0 || ti < 0) return null;
    return String.fromCharCode(0xAC00 + (ci * 21 + vi) * 28 + ti);
  }

  /* 자모 배열을 한글 문자열로 조합.
   * 성공하면 { ok:true, text:'사과' }, 실패하면 { ok:false, reason:'...' }.
   * 규칙: [초성][중성]([종성])* 를 반복. 자음이 (초성,중성) 뒤에 오면,
   *   그 다음이 모음이면 → 새 글자의 초성, 아니면 → 받침으로 본다. (한글 입력기와 같은 방식)
   */
  function compose(jamos) {
    const n = jamos.length;
    if (n === 0) return { ok: false, reason: '빈 낱말' };
    let i = 0;
    let text = '';
    while (i < n) {
      const cho = jamos[i];
      if (!isConsonant(cho)) return { ok: false, reason: '글자는 자음으로 시작해야 해요 (' + cho + ')' };
      i++;
      if (i >= n || !isVowel(jamos[i])) return { ok: false, reason: '자음 뒤에는 모음이 와야 해요 (' + cho + ')' };
      const jung = jamos[i];
      i++;
      let jong = '';
      if (i < n && isConsonant(jamos[i])) {
        const next = jamos[i];
        const afterIsVowel = (i + 1 < n) && isVowel(jamos[i + 1]);
        if (JONG_SET.has(next) && !afterIsVowel) {
          jong = next;
          i++;
        }
      }
      const ch = composeSyllable(cho, jung, jong);
      if (!ch) return { ok: false, reason: '조합할 수 없는 글자' };
      text += ch;
    }
    return { ok: true, text };
  }

  // 완성형 글자 문자열 → 자모 배열 (힌트 기능에서 사용). 한글이 아니면 null.
  function decompose(text) {
    const out = [];
    for (const ch of text) {
      const code = ch.charCodeAt(0) - 0xAC00;
      if (code < 0 || code > 11171) return null;
      const ci = Math.floor(code / 588), vi = Math.floor((code % 588) / 28), ti = code % 28;
      out.push(CHO[ci]); out.push(JUNG[vi]);
      if (ti) out.push(JONG[ti]);
    }
    return out;
  }

  global.WBHangul = {
    CHO, JUNG, JONG,
    isConsonant, isVowel,
    composeSyllable, compose, decompose
  };
})(typeof window !== 'undefined' ? window : this);
