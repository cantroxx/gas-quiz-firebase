(function (root) {
  "use strict";
  const MAX_WORD_LENGTH = 100;
  const blockedWords = new Set(
    "씨발 시발 좆 존나 병신 새끼 개새끼 지랄 썅 쌍놈 엿먹어 꺼져 닥쳐 또라이 등신 머저리 호로 개년 섹스 성교 자위 포르노 야동 음란 자지 보지 불알 젖가슴 음경 강간 매춘 창녀 자살 마약 필로폰".split(
      " ",
    ),
  );
  const blockedParts = [
    "씨발",
    "병신",
    "개새끼",
    "좆",
    "지랄",
    "섹스",
    "포르노",
    "강간",
  ];
  const isBlocked = (word) =>
    blockedWords.has(word) || blockedParts.some((part) => word.includes(part));
  const api = {
    MAX_WORD_LENGTH,
    isBlocked,
    blockedWords: [...blockedWords],
    blockedParts,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.WordBombWordPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
