(function (root) {
  'use strict';
  const VERSION = 'cloud-120-v1';
  const DURATION = 120;
  // Original, fixed course. All challenge runs use the same order.
  const COURSE = [
    '구름', '무지개', '하늘 여행', '우리 반 최고', '한 걸음 더 높이',
    '작은 구름을 밟아요', '바람이 등을 밀어요', '친구와 함께 올라요',
    '오늘도 한 뼘 자라요', '틀려도 다시 해 보면 돼',
    '파란 하늘에 꿈을 그려요', '구름 사이로 햇살이 비쳐요',
    '천천히 정확하게 써 보아요', '나의 도전은 이제 시작이야',
    '무지개 너머에는 무엇이 있을까', '작은 용기가 큰 변화를 만들어요',
    '친구의 멋진 도전을 응원해요', '별빛을 따라 한 걸음 더 올라요',
    '실수는 새로운 배움의 시작이에요', '포기하지 않는 마음이 가장 빛나요',
    '맑은 하늘 아래 우리 꿈이 자라요', '어제의 나보다 조금 더 나아갔어요',
    '서로 다른 우리가 함께 빛나는 교실', '가장 높은 곳에서 만날 풍경이 궁금해',
    '따뜻한 말 한마디가 친구에게 힘이 돼요', '지금 이 순간에도 나는 자라고 있어요',
    '긴 여행의 끝에는 또 다른 시작이 있어요', '오늘 쌓은 작은 노력이 내일의 날개가 돼요',
    '구름 위에서 바라보는 세상은 참 아름다워요', '나만의 속도로 끝까지 도전하는 내가 좋아요'
  ];
  function create(mode) {
    return { mode: mode === 'practice' ? 'practice' : 'challenge', phase: 'playing',
      elapsed: 0, floor: 0, score: 0, index: 0, combo: 0, maxCombo: 0,
      strokes: 0, correct: 0, sentenceErrors: 0, text: '', cleared: 0 };
  }
  function prompt(state) { return COURSE[state.index % COURSE.length]; }
  function accuracy(state) { return state.strokes ? Math.round(state.correct / state.strokes * 1000) / 10 : 100; }
  function stormFloor(seconds) { return -4 + Math.max(0, seconds - 10) * 0.12 + Math.max(0, seconds - 10) ** 2 * 0.0003; }
  function tick(state, elapsed) {
    if (state.phase !== 'playing') return;
    state.elapsed = Math.max(state.elapsed, state.mode === 'challenge' ? Math.min(DURATION, elapsed) : elapsed);
    if (state.mode === 'challenge') {
      // Solve the catch time so background-tab throttling cannot extend survival.
      const caughtAt = 10 + (-0.12 + Math.sqrt(0.12 ** 2 + 0.0012 * (state.floor + 4))) / 0.0006;
      if (state.elapsed >= caughtAt) { state.elapsed = caughtAt; state.phase = 'finished'; state.reason = 'storm'; }
      else if (state.elapsed >= DURATION) { state.phase = 'finished'; state.reason = 'time'; }
    }
  }
  function input(state, value) {
    if (state.phase !== 'playing') return;
    const next = Array.from(value.normalize('NFC'));
    const prev = Array.from(state.text);
    const target = Array.from(prompt(state));
    let start = 0, endOld = prev.length, endNew = next.length;
    while (start < prev.length && start < next.length && prev[start] === next[start]) start++;
    while (endOld > start && endNew > start && prev[endOld - 1] === next[endNew - 1]) { endOld--; endNew--; }
    for (let i = start; i < endNew; i++) {
      state.strokes++;
      if (next[i] === target[i]) state.correct++;
      else state.sentenceErrors++;
    }
    state.text = next.join('');
  }
  function submit(state) {
    if (state.phase !== 'playing') return { success: false };
    if (state.text !== prompt(state)) return { success: false };
    const perfect = state.sentenceErrors === 0;
    state.combo = perfect ? state.combo + 1 : 0;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const boost = state.combo > 0 && state.combo % 3 === 0;
    const jump = boost ? 2 : 1;
    state.floor += jump;
    state.score += jump * 100 + prompt(state).length * 5 + (perfect ? 25 : 0);
    state.cleared++;
    state.index++;
    state.text = '';
    state.sentenceErrors = 0;
    return { success: true, boost, perfect };
  }
  function compare(a, b) { return b.score - a.score || b.accuracy - a.accuracy || a.elapsed - b.elapsed; }
  function record(state, nickname, now = Date.now()) {
    if (state.mode !== 'challenge' || state.phase !== 'finished' || !['storm', 'time'].includes(state.reason) || !state.cleared) return null;
    return { version: VERSION, nickname, score: state.score, floor: state.floor, accuracy: accuracy(state), elapsed: Math.round(state.elapsed * 10) / 10, createdAt: now };
  }
  const api = { VERSION, DURATION, COURSE, create, prompt, accuracy, stormFloor, tick, input, submit, compare, record };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CloudTowerDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
