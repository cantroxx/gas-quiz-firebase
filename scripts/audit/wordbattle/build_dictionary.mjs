#!/usr/bin/env node
/** Rebuild public/wordbattle/words-data.js from pinned source inputs.
 *
 * Usage:
 *   node build_dictionary.mjs learning-words.json ko.dic words-data.js
 */

import { readFile, writeFile } from 'node:fs/promises'

const [, , learningPath, dictionaryPath, outputPath] = process.argv
if (!learningPath || !dictionaryPath || !outputPath) {
  throw new Error('usage: node build_dictionary.mjs learning-words.json ko.dic words-data.js')
}

const learning = JSON.parse(await readFile(learningPath, 'utf8'))
const dictionary = (await readFile(dictionaryPath, 'utf8')).split('\n')
const learningSingleLetters = new Set(learning.filter((word) => word.length === 1))
const hangulOnly = /^[가-힣]+$/
const fragmentEnding = /(하여|되어|시켜|거려|으며|으면)$/

const blockedSubstring = [
  '씨발', '시발', '씨팔', '시팔', '씨바', '시바', '개새끼', '존나', '졸라', '병신', '지랄',
  '미친놈', '미친년', '닥쳐', '꺼져', '엿먹', '또라이', '후레', '개자식', '개년', '개놈',
  '좆', '씹', '썅', '섹스', '성교', '자위', '포르노', '야동', '음란', '불알', '젖가슴',
  '젖꼭지', '음경', '음부', '강간', '매춘', '창녀', '윤간', '성폭행', '성추행', '성희롱',
  '몽정', '딜도', '콘돔', '에로', '떡치', '따먹', '자슥', '썩을', '제기랄', '니미', '느금',
  '마약', '대마초', '필로폰', '코카인', '헤로인', '자살', '살인', '강도',
]
const blockedExact = new Set([
  '새끼', '씨', '좇', '성기', '자지', '보지', '발기', '변태', '등신', '머저리', '호로',
  '썅년', '창놈', '섹', '좃', '띠발', '썹',
])

function isHarmful(word) {
  return blockedExact.has(word) || blockedSubstring.some((blocked) => word.includes(blocked))
}

const words = new Set(learning.filter((word) => !isHarmful(word)))
for (const line of dictionary.slice(1)) {
  const word = line.split('/')[0].trim().normalize('NFC')
  if (!word || !hangulOnly.test(word) || word.length < 1 || word.length > 4) continue
  if (word.length === 1 && !learningSingleLetters.has(word)) continue
  if (fragmentEnding.test(word) || isHarmful(word)) continue
  words.add(word)
}

const result = [...words].sort()
const source = `/* words-data.js — 낱말대전 사전 데이터 (자동 생성, 직접 수정하지 말 것)
 *
 * 출처:
 *  1) 국립국어원 「한국어 학습용 어휘 목록」 (2003) — 공공누리 제1유형
 *  2) spellcheck-ko/hunspell-dict-ko 0.7.94 (ko.dic) — 결합 사전 GPL-3.0
 *     https://github.com/spellcheck-ko/hunspell-dict-ko
 * 순수 한글 1~4글자만 추리고, 욕설·성적·유해 낱말은 걸러냈습니다.
 * (완벽한 필터는 불가능하므로 교실에서 교사 지도 하에 이용하세요.)
 *
 * 총 ${result.length}개
 * 상세 입력 해시·생성 절차·라이선스: DICTIONARY_NOTICE.md
 */
(function (global) {
  'use strict';
  var RAW = "${result.join(',')}";
  global.WB_WORDS_RAW = RAW;
  global.WB_WORDS = RAW.split(',');
})(typeof window !== 'undefined' ? window : this);
`

await writeFile(outputPath, source)
console.log(`dictionary words: ${result.length}`)
