/* 수학 서바이버 — 게임 엔진
 * 뱀서류: 이동만 하면 공격은 자동. 10분을 버티고 최종보스를 물리치면 승리.
 * 문제 풀이는 "벌칙"이 아니라 보상의 열쇠: 레벨업 강화·별 보너스·보스 방어막이 전부 문제로 열린다. */
(function () {
  'use strict';

  const S = window.MS_Sprites;
  const P = window.MS_Problems;
  const GAME_SECONDS = 600; // 10분 뒤 최종보스

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const $ = (id) => document.getElementById(id);
  const ui = {
    hud: $('hud'), level: $('hudLevel'), kills: $('hudKills'), timer: $('hudTimer'),
    grade: $('hudGrade'), acc: $('hudAcc'),
    hpFill: $('hudHpFill'), hpText: $('hudHpText'), xpFill: $('hudXpFill'),
    bossBar: $('bossBar'), bossFill: $('bossFill'), bossName: $('bossName'),
    start: $('startScreen'), gradeGrid: $('gradeGrid'), subjectRow: $('subjectRow'),
    modeRow: $('modeRow'), subjectPick: $('subjectPick'), gradePick: $('gradePick'), diffRow: $('diffRow'),
    codex: $('codexModal'), codexBody: $('codexBody'),
    levelup: $('levelupModal'), upgradeList: $('upgradeList'),
    quiz: $('quizModal'), quizUnit: $('quizUnit'), quizWhy: $('quizWhy'),
    quizText: $('quizText'), quizChoices: $('quizChoices'), quizFeedback: $('quizFeedback'),
    pause: $('pauseModal'), pauseStats: $('pauseStats'),
    end: $('endScreen'), endTitle: $('endTitle'), endStats: $('endStats'), endWrong: $('endWrong'), endNetMsg: $('endNetMsg'),
    hall: $('hallModal'), hallList: $('hallList'), semRow: $('semRow'),
  };

  // ---------- 화면 크기 ----------
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- 교실 바닥 타일 ----------
  const floorTile = (function () {
    const size = 192, plank = 24;
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const c = cv.getContext('2d');
    c.fillStyle = '#e8cfa0'; c.fillRect(0, 0, size, size);
    for (let y = 0; y < size / plank; y++) {
      c.fillStyle = y % 2 ? '#e3c691' : '#e8cfa0';
      c.fillRect(0, y * plank, size, plank);
      c.fillStyle = '#d4b57e';
      c.fillRect(0, y * plank, size, 2);
      const off = (y * 67) % size;
      c.fillRect(off, y * plank, 2, plank);
    }
    return cv;
  })();

  // 역사 모드 시대별 바닥 (고조선 들판 / 삼국 산성 돌 / 고려 청자빛 / 조선 궁궐 마당)
  const eraTiles = (function () {
    const size = 192;
    function make(fn) {
      const cv = document.createElement('canvas');
      cv.width = size; cv.height = size;
      fn(cv.getContext('2d'));
      return cv;
    }
    const rand = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
    return [
      make((c) => { // 고조선: 풀밭 + 고인돌
        c.fillStyle = '#a5c96a'; c.fillRect(0, 0, size, size);
        const r = rand(7);
        c.fillStyle = '#93b95c';
        for (let i = 0; i < 40; i++) c.fillRect(r() * size, r() * size, 4, 4);
        c.fillStyle = '#9e9e9e'; c.fillRect(30, 40, 10, 26); c.fillRect(56, 40, 10, 26);
        c.fillStyle = '#8d8d8d'; c.fillRect(24, 32, 48, 10);
      }),
      make((c) => { // 삼국시대: 산성 돌바닥
        c.fillStyle = '#b3ac9e'; c.fillRect(0, 0, size, size);
        const r = rand(13);
        for (let y = 0; y < size; y += 32) {
          for (let x = 0; x < size; x += 48) {
            const off = (y / 32) % 2 ? 24 : 0;
            c.fillStyle = r() < 0.5 ? '#a89f8f' : '#bdb5a6';
            c.fillRect(x + off + 2, y + 2, 44, 28);
          }
        }
      }),
      make((c) => { // 고려: 청자빛 + 상감 무늬
        c.fillStyle = '#a7ccc2'; c.fillRect(0, 0, size, size);
        const r = rand(21);
        c.strokeStyle = '#c4ded6'; c.lineWidth = 3;
        for (let i = 0; i < 7; i++) {
          c.beginPath();
          c.arc(r() * size, r() * size, 8 + r() * 10, 0, Math.PI * 2);
          c.stroke();
        }
      }),
      make((c) => { // 조선: 궁궐 마당 모래
        c.fillStyle = '#e3cfa5'; c.fillRect(0, 0, size, size);
        const r = rand(31);
        c.fillStyle = '#d6bf90';
        for (let i = 0; i < 30; i++) c.fillRect(r() * size, r() * size, 5, 3);
        c.fillStyle = '#c9b283';
        for (let i = 0; i < 10; i++) c.fillRect(r() * size, r() * size, 8, 4);
      }),
    ];
  })();

  // ---------- 입력 ----------
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape' && state === 'play') pauseGame();
    else if (e.key === 'Escape' && state === 'paused') resumeGame();
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  const stick = { on: false, ox: 0, oy: 0, x: 0, y: 0 };
  canvas.addEventListener('pointerdown', (e) => {
    stick.on = true; stick.ox = stick.x = e.clientX; stick.oy = stick.y = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (stick.on) { stick.x = e.clientX; stick.y = e.clientY; }
  });
  window.addEventListener('pointerup', () => { stick.on = false; });

  function inputVector() {
    let dx = 0, dy = 0;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (stick.on) {
      const sx = stick.x - stick.ox, sy = stick.y - stick.oy;
      const len = Math.hypot(sx, sy);
      if (len > 8) { dx = sx / len; dy = sy / len; }
    }
    const len = Math.hypot(dx, dy);
    return len > 0 ? { x: dx / len, y: dy / len } : { x: 0, y: 0 };
  }

  // ---------- 게임 모드: 교실 생존 / 역사 시간여행 ----------
  const B = window.MS_Bank;
  const MODES = {
    classic: { name: '교실 생존', icon: '🏫', desc: '고른 과목의 문제가 나와요' },
    history: { name: '역사 시간여행', icon: '🏯', desc: '고조선→삼국→고려→조선! 시대별 역사 문제' },
  };
  let mode = localStorage.getItem('ms.mode') || 'classic';
  if (!MODES[mode]) mode = 'classic';

  // 역사 모드의 시대 (시간이 지나면 다음 시대로 — 보스가 시대의 문지기)
  const ERAS = [
    { name: '고조선', icon: '🗿', from: 0 },
    { name: '삼국시대', icon: '⚔️', from: 180 },
    { name: '고려', icon: '🏺', from: 360 },
    { name: '조선', icon: '🏯', from: 600 },
  ];
  function eraIdx(t) {
    for (let i = ERAS.length - 1; i >= 0; i--) if (t >= ERAS[i].from) return i;
    return 0;
  }

  function buildModeRow() {
    ui.modeRow.innerHTML = '';
    for (const id in MODES) {
      const m = MODES[id];
      const btn = document.createElement('button');
      btn.className = 'mode-chip' + (mode === id ? ' sel' : '');
      btn.innerHTML = `<b>${m.icon} ${m.name}</b><small>${m.desc}</small>`;
      btn.onclick = () => {
        mode = id;
        localStorage.setItem('ms.mode', id);
        buildModeRow();
        drawTitleSprite();
        applyModeUi();
      };
      ui.modeRow.appendChild(btn);
    }
  }
  // 역사 모드에선 과목·학년 선택이 문제에 영향을 주지 않아 흐리게 (역사 문제만 나옴)
  function applyModeUi() {
    const off = mode === 'history';
    ui.subjectPick.classList.toggle('dimmed', off);
    ui.gradePick.classList.toggle('dimmed', off);
  }

  // ---------- 난이도 ----------
  const DIFFS = {
    easy:   { name: '쉬움', icon: '😊', desc: '천천히 배우기', hp: 0.8, spd: 0.85, dmg: 0.8, spawn: 1.25, score: 0.8 },
    normal: { name: '보통', icon: '🙂', desc: '딱 알맞게', hp: 1, spd: 1, dmg: 1, spawn: 1, score: 1 },
    hard:   { name: '어려움', icon: '🔥', desc: '점수 1.3배!', hp: 1.3, spd: 1.1, dmg: 1.3, spawn: 0.8, score: 1.3 },
  };
  let diff = localStorage.getItem('ms.diff') || 'normal';
  if (!DIFFS[diff]) diff = 'normal';
  function buildDiffRow() {
    ui.diffRow.innerHTML = '';
    for (const id in DIFFS) {
      const d = DIFFS[id];
      const btn = document.createElement('button');
      btn.className = 'subject-chip' + (diff === id ? ' sel' : '');
      btn.textContent = `${d.icon} ${d.name}`;
      btn.title = d.desc;
      btn.onclick = () => {
        diff = id;
        localStorage.setItem('ms.diff', id);
        buildDiffRow();
      };
      ui.diffRow.appendChild(btn);
    }
  }

  // ---------- 무기·보조 장비 정의 ----------
  const WEAPON_DEFS = {
    pencil:   { icon: '✏️', name: '연필 미사일', desc: '가까운 적을 자동 조준하는 미사일' },
    notebook: { icon: '📚', name: '공책 부메랑', desc: '내 주위를 빙글빙글 도는 지식 방패' },
    chalk:    { icon: '🖍️', name: '분필 관통샷', desc: '적을 줄줄이 꿰뚫는 관통 공격' },
    recorder: { icon: '🎵', name: '리코더 음파', desc: '주기적으로 사방에 퍼지는 충격파' },
    balloon:  { icon: '💧', name: '물풍선 던지기', desc: '적진에 던져서 펑! 범위 공격' },
  };
  const PASSIVE_DEFS = {
    ruler:  { icon: '📏', name: '모눈 자',   desc: '연필이 더 세고 빨라짐', pair: 'pencil' },
    clip:   { icon: '📎', name: '왕클립',   desc: '공책 궤도가 넓어짐', pair: 'notebook' },
    glove:  { icon: '🧤', name: '체육 장갑', desc: '분필이 더 아파짐', pair: 'chalk' },
    sheet:  { icon: '🎼', name: '악보',     desc: '음파가 더 넓게 퍼짐', pair: 'recorder' },
    bottle: { icon: '🥤', name: '큰 물병',  desc: '물풍선이 더 크게 펑!', pair: 'balloon' },
    bag:    { icon: '🎒', name: '책가방',   desc: '최대 체력 +15', pair: null },
    watch:  { icon: '⌚', name: '손목시계', desc: '모든 무기 공격속도 5% 빨라짐', pair: null },
    shoes:  { icon: '👟', name: '실내화',   desc: '이동 속도 6% 빨라짐', pair: null },
  };
  const MAX_WEAPONS = 3, MAX_PASSIVES = 3; // 슬롯 제한: 고른 것만 계속 키우는 빌드 재미

  // ---------- 각성 (무기 진화) ----------
  // 조합(무기 Lv.5 + 짝꿍 보조 Lv.3) 또는 도전 조건 중 하나만 이뤄도 각성!
  const EVOLVE = {
    pencil:   { icon: '🖋️', evoName: '만년필 미사일',  desc: '더 빠르고 아픈 잉크 미사일!', alt: () => quizStats.correct >= 10, altText: '한 판에 문제 10개 정답' },
    notebook: { icon: '📖', evoName: '백과사전 부메랑', desc: '두꺼운 지식의 방패가 2권 더!', alt: () => breadEaten >= 3, altText: '급식빵(주먹밥) 3개 먹기' },
    chalk:    { icon: '🔦', evoName: '레이저 포인터',  desc: '적을 줄줄이 태우는 빛줄기!', alt: () => killCount >= 120, altText: '몬스터 120마리 처치' },
    recorder: { icon: '🎺', evoName: '황금 나팔',      desc: '운동장을 뒤흔드는 응원 파동!', alt: () => waveCount >= 3, altText: '몬스터 러시 3번 맞이하기' },
    balloon:  { icon: '🌧️', evoName: '소나기 구름',    desc: '물풍선이 두 개씩 펑펑!', alt: () => itemsPicked >= 8, altText: '아이템 8개 줍기' },
  };
  function pairKeyOf(weaponKey) {
    for (const k in PASSIVE_DEFS) if (PASSIVE_DEFS[k].pair === weaponKey) return k;
    return null;
  }
  function evolveCondText(weaponKey) {
    const pk = pairKeyOf(weaponKey);
    return `${WEAPON_DEFS[weaponKey].name} Lv.5 + ${PASSIVE_DEFS[pk].name} Lv.3 (또는 ${EVOLVE[weaponKey].altText})`;
  }
  let codexUnlocks;
  try { codexUnlocks = JSON.parse(localStorage.getItem('ms.codex') || '{}'); } catch (e) { codexUnlocks = {}; }
  function unlockCodex(key) {
    if (codexUnlocks[key]) return;
    codexUnlocks[key] = true;
    localStorage.setItem('ms.codex', JSON.stringify(codexUnlocks));
  }
  function evolveReady(key) {
    const pk = pairKeyOf(key);
    if (pk && player.passives[pk] >= 3) return true; // 조합 각성
    return EVOLVE[key].alt(); // 도전 각성
  }
  function checkEvolve() {
    for (const key in WEAPON_DEFS) {
      const w = player.weapons[key];
      if (w.lv >= 5 && !w.evolved && evolveReady(key)) {
        w.evolved = true;
        unlockCodex(key);
        SFX.play('evolve');
        addFloat(player.x, player.y - 50, `✨ 각성! ${EVOLVE[key].evoName}!!`, '#f9a825');
      }
    }
  }

  // ---------- 과목 선택 (여러 개 가능, 최소 1개) ----------
  let subjects;
  try { subjects = JSON.parse(localStorage.getItem('ms.subjects') || '["math"]'); } catch (e) { subjects = ['math']; }
  if (!Array.isArray(subjects) || !subjects.length || subjects.some((s) => !B.SUBJECTS[s])) subjects = ['math'];
  function buildSubjectRow() {
    ui.subjectRow.innerHTML = '';
    for (const id in B.SUBJECTS) {
      const s = B.SUBJECTS[id];
      const btn = document.createElement('button');
      btn.className = 'subject-chip' + (subjects.includes(id) ? ' sel' : '');
      btn.textContent = `${s.icon} ${s.name}`;
      btn.title = s.desc;
      btn.onclick = () => {
        if (subjects.includes(id)) {
          if (subjects.length > 1) subjects = subjects.filter((x) => x !== id); // 최소 1과목
        } else {
          subjects.push(id);
        }
        localStorage.setItem('ms.subjects', JSON.stringify(subjects));
        buildSubjectRow();
      };
      ui.subjectRow.appendChild(btn);
    }
  }

  // 문제 하나 만들기: 역사 모드=지금 시대의 역사 문제, 교실/공부 모드=켜진 과목 중 랜덤
  function makeProblem() {
    // 오답노트 복습: 노트에 문제가 있으면 30% 확률로 우선 출제
    const note = loadNote();
    const filteringUnits = subjects.some((sid) => allowedUnits(sid, grade, sem));
    if (!studyMode && !filteringUnits && note.length && Math.random() < 0.3) {
      const it = note[Math.floor(Math.random() * note.length)];
      const idx = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      return {
        unit: '📕 복습 · ' + it.unit, subject: it.subject || '복습',
        text: it.q, choices: idx.map((i) => it.c[i]), answerIndex: idx.indexOf(it.c.indexOf(it.a)),
      };
    }
    if (mode === 'history' && !studyMode) {
      const p = B.serveHistory(ERAS[eraIdx(elapsed)].name);
      p.subject = '역사';
      return p;
    }
    const sid = subjects[Math.floor(Math.random() * subjects.length)];
    const gradeBased = sid === 'math' || sid === 'social' || sid === 'science';
    // 어려움 모드: 학년별 과목만 30% 확률로 한 학년 위 문제 (6학년은 그대로)
    const gradeUp = diff === 'hard' && !studyMode && gradeBased && grade < 6 && Math.random() < 0.3;
    const g = gradeUp ? grade + 1 : grade;
    const allowed = allowedUnits(sid, g, sem);
    const requestedUnit = allowed ? allowed[Math.floor(Math.random() * allowed.length)] : null;
    let p;
    if (sid === 'math') {
      p = P.generate(g, sem, requestedUnit);
      p.unit = '수학 · ' + p.unit + (gradeUp ? ` (${g}학년 도전!)` : '');
      p.subject = '수학';
    } else {
      p = B.serve(sid, g, sem, requestedUnit);
      p.subject = B.SUBJECTS[sid].name;
    }
    return p;
  }

  // ---------- 단원 골라 풀기 ----------
  let unitPrefs;
  try { unitPrefs = JSON.parse(localStorage.getItem('ms.units') || '{}'); } catch (e) { unitPrefs = {}; }
  if (!unitPrefs || typeof unitPrefs !== 'object' || Array.isArray(unitPrefs)) unitPrefs = {};
  function unitKey(sid, g = grade, s = sem) {
    return (sid === 'korean' || sid === 'fun') ? sid : `${sid}|${g}|${s}`;
  }
  function sampleUnits(sid, g = grade, s = sem) {
    return sid === 'math' ? P.unitList(g, s) : B.unitList(sid, g, s);
  }
  function allowedUnits(sid, g = grade, s = sem) {
    const selected = unitPrefs[unitKey(sid, g, s)];
    if (!Array.isArray(selected) || !selected.length) return null;
    const valid = sampleUnits(sid, g, s);
    const usable = selected.filter((u) => valid.includes(u));
    return usable.length ? usable : null;
  }
  function openUnitModal() {
    const body = $('unitBody');
    body.innerHTML = '';
    for (const sid of subjects) {
      const subject = B.SUBJECTS[sid];
      const h = document.createElement('div');
      h.className = 'codex-section';
      h.textContent = `${subject.icon} ${subject.name}`;
      body.appendChild(h);
      const row = document.createElement('div');
      row.className = 'subject-row';
      const key = unitKey(sid);
      const selected = Array.isArray(unitPrefs[key]) ? unitPrefs[key] : [];
      const allChip = document.createElement('button');
      allChip.className = 'subject-chip' + (selected.length ? '' : ' sel');
      allChip.textContent = '전체';
      allChip.onclick = () => {
        delete unitPrefs[key];
        localStorage.setItem('ms.units', JSON.stringify(unitPrefs));
        openUnitModal();
      };
      row.appendChild(allChip);
      for (const u of sampleUnits(sid, grade, sem)) {
        const chip = document.createElement('button');
        chip.className = 'subject-chip' + (selected.includes(u) ? ' sel' : '');
        chip.textContent = u;
        chip.onclick = () => {
          let cur = unitPrefs[key] || [];
          if (cur.includes(u)) cur = cur.filter((x) => x !== u);
          else cur.push(u);
          if (cur.length) unitPrefs[key] = cur;
          else delete unitPrefs[key];
          localStorage.setItem('ms.units', JSON.stringify(unitPrefs));
          openUnitModal();
        };
        row.appendChild(chip);
      }
      body.appendChild(row);
    }
    $('unitModal').classList.remove('hidden');
  }

  // ---------- 수학 주관식 선택 ----------
  let subjectiveOn = localStorage.getItem('ms.subj') === '1';
  function updateSubjectiveButton() {
    $('btnSubjective').textContent = subjectiveOn
      ? '✍️ 수학 주관식 켜짐'
      : '✍️ 수학 주관식 꺼짐';
    $('btnSubjective').classList.toggle('active', subjectiveOn);
    $('btnSubjective').setAttribute('aria-pressed', String(subjectiveOn));
  }
  function toggleSubjective() {
    subjectiveOn = !subjectiveOn;
    localStorage.setItem('ms.subj', subjectiveOn ? '1' : '0');
    updateSubjectiveButton();
  }

  // ---------- 학년·학기 선택 ----------
  let grade = Number(localStorage.getItem('ms.grade')) || 4;
  const nowMonth = new Date().getMonth() + 1;
  let sem = Number(localStorage.getItem('ms.sem')) || ((nowMonth >= 8 || nowMonth <= 1) ? 2 : 1);
  if (sem !== 1 && sem !== 2) sem = 1;
  function buildSemRow() {
    ui.semRow.innerHTML = '';
    for (const t of [1, 2]) {
      const btn = document.createElement('button');
      btn.className = 'subject-chip' + (sem === t ? ' sel' : '');
      btn.textContent = t === 1 ? '🌸 1학기' : '🍂 2학기';
      btn.onclick = () => {
        sem = t;
        localStorage.setItem('ms.sem', String(t));
        buildSemRow();
        buildGradeGrid(); // 학기에 맞는 단원 표시로 갱신
      };
      ui.semRow.appendChild(btn);
    }
  }
  function buildGradeGrid() {
    ui.gradeGrid.innerHTML = '';
    for (const g of [3, 4, 5, 6]) {
      const info = P.GRADES[g];
      const btn = document.createElement('button');
      btn.className = 'grade-card' + (g === grade ? ' sel' : '');
      btn.innerHTML = `<b>${info.name}</b><small>${sem === 2 && info.units2 ? info.units2 : info.units}</small>`;
      btn.onclick = () => {
        grade = g;
        localStorage.setItem('ms.grade', String(g));
        buildGradeGrid();
      };
      ui.gradeGrid.appendChild(btn);
    }
  }
  buildGradeGrid();
  buildSubjectRow();
  buildSemRow();

  // ---------- 게임 상태 ----------
  // state: title | play | quiz | levelup | paused | end
  let state = 'title';
  let player, enemies, bullets, gems, items, floats, elapsed, killCount, spawnTimer, lastTime;
  let starTimer, bossSpawned, finalSpawned, bossQuizDelay, flashTimer, orbitAngle;
  let quizStats, currentQuiz, quizAfter, quizFail, quizOneShot, quizWhyText;
  let revivesLeft, wrongList, breadEaten, lastEra, eBullets, waveTimer;
  let freezeTimer, hintCharges, scoreBonus, itemsPicked, waveCount, effects;
  let quizTimerId = null, quizTimeLeft = 0; // 어려움 모드 문제 제한시간
  let studyMode = false, studyCount = 0, studyCorrect = 0; // 공부 모드(몬스터 없음)
  let quizAnswered = false;

  function newPlayer() {
    return {
      x: 0, y: 0, speed: 145, hp: 100, maxHp: 100,
      level: 1, xp: 0, xpNeed: 7,
      invuln: 0, faceLeft: false, moving: false,
      magnet: 28,
      weapons: {
        pencil: { lv: 1, timer: 0 },
        notebook: { lv: 0 },
        chalk: { lv: 0, timer: 0 },
        recorder: { lv: 0, timer: 0 },
        balloon: { lv: 0, timer: 0 },
      },
      passives: { ruler: 0, clip: 0, glove: 0, sheet: 0, bottle: 0, bag: 0, watch: 0, shoes: 0 },
    };
  }

  function startGame() {
    studyMode = false;
    stopQuizTimer();
    player = newPlayer();
    enemies = []; bullets = []; gems = []; items = []; floats = [];
    elapsed = 0; killCount = 0; spawnTimer = 0.5; starTimer = 38;
    bossSpawned = { 180: false, 360: false }; finalSpawned = false;
    bossQuizDelay = 0; flashTimer = 0; orbitAngle = 0;
    quizStats = { correct: 0, total: 0, by: {} };
    revivesLeft = 1; wrongList = []; breadEaten = 0; lastEra = 0;
    eBullets = []; waveTimer = 60;
    freezeTimer = 0; hintCharges = 0; scoreBonus = 0; itemsPicked = 0; waveCount = 0; effects = [];
    state = 'play';
    ui.start.classList.add('hidden');
    ui.end.classList.add('hidden');
    ui.hud.classList.remove('hidden');
    ui.grade.textContent = `${P.GRADES[grade].name}·${sem}학기`;
    lastTime = performance.now();
    updateHud();
  }

  // ---------- 무기 수치 (보조 장비·각성 반영) ----------
  const watchF = () => 1 - 0.05 * player.passives.watch; // 손목시계: 공격속도
  function pencilStats(w) {
    const pv = player.passives;
    const s = { interval: 1.05 * Math.pow(0.93, w.lv - 1) * watchF(), count: Math.ceil(w.lv / 2), dmg: 8 + 5 * w.lv + 3 * pv.ruler, speed: 340 * (1 + 0.12 * pv.ruler) };
    if (w.evolved) { s.interval *= 0.75; s.count += 1; s.dmg = Math.round(s.dmg * 1.8); }
    return s;
  }
  function notebookStats(w) {
    const s = { count: Math.min(w.lv + 1, 6), radius: 58 + 8 * player.passives.clip, dmg: 6 + 4 * w.lv };
    if (w.evolved) { s.count += 2; s.radius += 14; s.dmg = Math.round(s.dmg * 1.8); }
    return s;
  }
  function chalkStats(w) {
    const s = { interval: 1.7 * Math.pow(0.9, w.lv - 1) * watchF(), dmg: 9 + 5 * w.lv + 4 * player.passives.glove };
    if (w.evolved) { s.interval *= 0.7; s.dmg = Math.round(s.dmg * 1.8); }
    return s;
  }
  function recorderStats(w) {
    const s = { interval: 2.6 * Math.pow(0.9, w.lv - 1) * watchF(), dmg: 8 + 4 * w.lv, radius: 90 + 8 * w.lv + 12 * player.passives.sheet };
    if (w.evolved) { s.interval *= 0.8; s.dmg = Math.round(s.dmg * 1.8); s.radius += 30; }
    return s;
  }
  function balloonStats(w) {
    const s = { interval: 2.8 * Math.pow(0.92, w.lv - 1) * watchF(), dmg: 12 + 6 * w.lv, radius: 62 + 10 * player.passives.bottle, count: 1 };
    if (w.evolved) { s.dmg = Math.round(s.dmg * 1.6); s.radius += 25; s.count = 2; }
    return s;
  }

  // ---------- 몬스터 ----------
  // 유형: slime(직진) / ghost(빠른 직진) / dasher(조준→돌진, 피해야 함) / shooter(원거리 투사체)
  function spawnEnemy(forceAng) {
    if (enemies.length >= 170) return;
    const min = elapsed / 60;
    const roll = Math.random();
    let type = 'slime';
    if (elapsed > 120 && roll < 0.14) type = 'dasher';
    else if (elapsed > 150 && roll < 0.27) type = 'shooter';
    else if (elapsed > 90 && roll < 0.55) type = 'ghost';
    const base = {
      slime:   { hp: 14, speed: 48, dmg: 10, xp: 1, r: 15 },
      ghost:   { hp: 26, speed: 66, dmg: 15, xp: 2, r: 16 },
      dasher:  { hp: 20, speed: 42, dmg: 14, xp: 2, r: 13 },
      shooter: { hp: 22, speed: 46, dmg: 8, xp: 2, r: 14 },
    }[type];
    const D = DIFFS[diff];
    const late = Math.max(0, min - 5); // 5분 이후엔 더 가파르게 강해진다 (후반 화력 인플레 대응)
    const stat = {
      hp: Math.round(base.hp * (1 + min * 0.35) * (1 + late * 0.18) * D.hp),
      speed: base.speed * (1 + min * 0.05) * D.spd,
      dmg: Math.round(base.dmg * (1 + min * 0.03) * D.dmg),
    };
    // 첫 30초만 조작 연습용으로 살짝 약하게
    if (elapsed < 30) { stat.hp = Math.round(stat.hp * 0.85); stat.speed *= 0.9; }
    const ang = forceAng !== undefined ? forceAng : Math.random() * Math.PI * 2;
    const dist = Math.hypot(W, H) / 2 + 40;
    const spriteMap = mode === 'history'
      ? { slime: 'dokkaebi', ghost: 'jeoseung', dasher: 'wisp', shooter: 'jangseung' }
      : { slime: 'slime', ghost: 'ghost', dasher: 'paperplane', shooter: 'inkslime' };
    const e = {
      type, x: player.x + Math.cos(ang) * dist, y: player.y + Math.sin(ang) * dist,
      hp: stat.hp, maxHp: stat.hp, speed: stat.speed, dmg: stat.dmg, xp: base.xp, r: base.r,
      wobble: Math.random() * Math.PI * 2, orbitCd: 0,
      sprite: spriteMap[type],
    };
    if (type === 'dasher') { e.beh = 'dash'; e.ds = 'chase'; e.dashT = 0; e.dashSpeed = 340 * D.spd; e.windupT = 0.8; }
    if (type === 'shooter') { e.beh = 'shoot'; e.fireT = 1.2; e.shotDmg = Math.round(10 * D.dmg); }
    // 엘리트: 가끔 크고 튼튼한 놈이 섞여 나온다 (잡으면 아이템 확정!)
    if (elapsed > 120 && Math.random() < 0.04) {
      e.elite = true;
      e.hp = e.maxHp = e.hp * 6;
      e.r = Math.round(e.r * 1.4); e.scale = 1.5;
      e.speed *= 0.85; e.dmg = Math.round(e.dmg * 1.5); e.xp = 6;
    }
    enemies.push(e);
  }

  function spawnStar() {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.hypot(W, H) / 2 + 30;
    const min = elapsed / 60;
    enemies.push({
      type: 'star', x: player.x + Math.cos(ang) * dist, y: player.y + Math.sin(ang) * dist,
      hp: Math.round(28 * (1 + min * 0.3)), maxHp: 999, speed: 80, dmg: 0, xp: 0, r: 14,
      wobble: 0, orbitCd: 0, life: 14, wander: 0, vx: 0, vy: 0,
    });
  }

  function spawnMidBoss(which) {
    const min = elapsed / 60;
    const history = mode === 'history';
    const name = history
      ? (which === 180 ? '👑 대왕 도깨비' : '👑 구미호')
      : (which === 180 ? '👑 숙제 유령 대왕' : '👑 지우개 대마왕');
    const D = DIFFS[diff];
    const hp = Math.round((which === 180 ? 380 : 950) * D.hp);
    enemies.push({
      type: 'ghost', boss: 'mid', scale: 2.2,
      sprite: history ? (which === 180 ? 'dokkaebi' : 'gumiho') : 'ghost',
      x: player.x + (Math.random() < 0.5 ? -1 : 1) * (W / 2 + 60), y: player.y,
      hp, maxHp: hp,
      speed: (46 + min * 2) * D.spd, dmg: Math.round(20 * D.dmg), xp: 0, r: 34, wobble: 0, orbitCd: 0,
      name,
      // 보스 패턴: 가까워지면 경고 후 돌진 + 부하 소환
      beh: 'dash', ds: 'chase', dashT: 0, dashSpeed: 300 * D.spd, windupT: 1.0, summonT: 8,
    });
    addFloat(player.x, player.y - 60, `${name} 등장!`, '#7b1fa2');
    SFX.play('boss');
  }

  function spawnFinalBoss() {
    const history = mode === 'history';
    const name = history ? '👑 시간도둑 대마왕' : '👑 시험지 대마왕';
    const D = DIFFS[diff];
    const hp = Math.round(1300 * D.hp);
    enemies.push({
      type: 'examboss', boss: 'final', scale: 2,
      sprite: history ? 'clockboss' : 'examboss',
      x: player.x, y: player.y - H / 2 - 80,
      hp, maxHp: hp, speed: 42 * D.spd, dmg: Math.round(25 * D.dmg), xp: 0, r: 40, wobble: 0, orbitCd: 0,
      shield: true, shieldTimer: 0, summonTimer: 5,
      ringT: 4, // 사방으로 투사체를 뿌리는 패턴
      name,
    });
    bossQuizDelay = 1.0;
    addFloat(player.x, player.y - 60, `${name} 등장!!`, '#c62828');
    SFX.play('boss');
  }

  const anyBoss = () => enemies.some((e) => e.boss);
  const finalBoss = () => enemies.find((e) => e.boss === 'final');

  // ---------- 오답노트 (기기에 누적 저장, 최대 50문제) ----------
  function loadNote() {
    try { return JSON.parse(localStorage.getItem('ms.note') || '[]'); } catch (e) { return []; }
  }
  function saveNote(n) { localStorage.setItem('ms.note', JSON.stringify(n.slice(0, 50))); }
  function noteAdd(quiz) {
    const n = loadNote();
    const found = n.find((it) => it.q === quiz.text);
    if (found) found.n = (found.n || 1) + 1;
    else n.unshift({ q: quiz.text, a: quiz.choices[quiz.answerIndex], c: quiz.choices, unit: quiz.unit.replace('📕 복습 · ', ''), subject: quiz.subject, n: 1 });
    saveNote(n);
    updateNoteBtn();
  }
  function noteResolve(quiz) { // 맞히면 노트에서 졸업
    const n = loadNote();
    const idx = n.findIndex((it) => it.q === quiz.text);
    if (idx >= 0) {
      n.splice(idx, 1);
      saveNote(n);
      updateNoteBtn();
      if (player) addFloat(player.x, player.y - 46, '📕 오답노트 졸업!', '#6d4c41');
    }
  }
  function updateNoteBtn() {
    const n = loadNote().length;
    $('btnNote').textContent = n ? `📕 오답노트 (${n})` : '📕 오답노트';
  }
  function openNoteModal() {
    const n = loadNote();
    const list = $('noteList');
    if (!n.length) {
      list.innerHTML = '<p class="hall-empty">아직 틀린 문제가 없어요. 완벽한데?!</p>';
    } else {
      list.innerHTML = n.map((it) =>
        `<div class="wrong-row"><span class="wrong-q">[${it.unit}] ${it.q} <b>×${it.n}</b></span><span class="wrong-a">정답: ${it.a}</span></div>`
      ).join('');
    }
    $('noteModal').classList.remove('hidden');
  }

  // ---------- 효과음 (코드로 만드는 8비트 소리, 기본은 꺼짐) ----------
  const SFX = (function () {
    let ac = null;
    let on = localStorage.getItem('ms.sound') === '1';
    const last = {};
    function ctx() {
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
      return ac;
    }
    function tone(freq, dur, type, gain, delay) {
      const c = ctx(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      const t0 = c.currentTime + (delay || 0);
      g.gain.setValueAtTime(gain || 0.04, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
    const bank = {
      gem: () => tone(880, 0.06, 'square', 0.02),
      correct: () => { tone(660, 0.09); tone(880, 0.12, 'square', 0.04, 0.09); },
      wrong: () => tone(140, 0.25, 'sawtooth', 0.05),
      levelup: () => { tone(523, 0.09); tone(659, 0.09, 'square', 0.04, 0.09); tone(784, 0.14, 'square', 0.04, 0.18); },
      item: () => { tone(523, 0.07); tone(784, 0.1, 'square', 0.035, 0.07); },
      boss: () => { tone(98, 0.4, 'sawtooth', 0.06); tone(82, 0.4, 'sawtooth', 0.06, 0.2); },
      evolve: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.04, i * 0.1)); },
      win: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.14, 'square', 0.045, i * 0.12)); },
      lose: () => { [330, 262, 196].forEach((f, i) => tone(f, 0.2, 'sawtooth', 0.05, i * 0.18)); },
    };
    return {
      play(name) {
        if (!on || !bank[name]) return;
        const now = performance.now();
        if (name === 'gem') { if (now - (last.gem || 0) < 80) return; last.gem = now; }
        bank[name]();
      },
      isOn: () => on,
      toggle() {
        on = !on;
        localStorage.setItem('ms.sound', on ? '1' : '0');
        if (on) bank.item();
        return on;
      },
    };
  })();
  function updateSoundBtns() {
    const label = SFX.isOn() ? '🔊 소리 켜짐' : '🔇 소리 꺼짐';
    $('btnSound').textContent = label;
    $('btnSoundPause').textContent = label;
  }

  // ---------- 문제(퀴즈) ----------
  // mode: 'levelup' 강화 선택 전 / 'star' 별 보너스 / 'boss' 보스 방어막 / 'revive' 부활(단 한 번!)
  const QUIZ_WHY = {
    levelup: '문제를 맞히면 강화를 고를 수 있어! (틀려도 다시 도전!)',
    star: '⭐ 보너스 문제! 맞히면 아이템이 떨어져!',
    boss: '🛡 보스 방어막은 문제를 풀어야 깨져!',
    revive: '💫 부활 문제! 기회는 한 번뿐 — 맞히면 다시 일어난다!',
    study: '📚 공부 모드 — 몬스터 없이 편하게! 틀린 건 오답노트로.',
  };
  function openQuiz(mode, onCorrect, onFail) {
    state = 'quiz';
    quizAfter = onCorrect;
    quizFail = onFail || null;
    quizOneShot = (mode === 'revive'); // 부활 문제는 재도전 없음
    quizWhyText = QUIZ_WHY[mode];
    $('btnStudyStop').classList.toggle('hidden', mode !== 'study');
    nextProblem();
    ui.quiz.classList.remove('hidden');
  }

  // ---- 어려움 모드: 문제 제한시간 15초 (시간 내 정답 = 남은 초×2점 보너스) ----
  function stopQuizTimer() {
    if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; }
    $('quizTimerWrap').classList.add('hidden');
  }
  function startQuizTimer() {
    stopQuizTimer();
    if (studyMode || diff !== 'hard') { quizTimeLeft = 0; return; }
    quizTimeLeft = 15;
    $('quizTimerWrap').classList.remove('hidden');
    $('quizTimerFill').style.width = '100%';
    quizTimerId = setInterval(() => {
      quizTimeLeft -= 0.1;
      $('quizTimerFill').style.width = `${Math.max(0, quizTimeLeft / 15) * 100}%`;
      if (quizTimeLeft <= 0) {
        stopQuizTimer();
        onQuizTimeout();
      }
    }, 100);
  }
  function onQuizTimeout() {
    if (state !== 'quiz') return;
    answerCore(false, null, true);
  }

  function updateStudyWhy() {
    ui.quizWhy.textContent = `📚 공부 모드 · ${studyCount}문제 도전 · ${studyCorrect}개 정답`;
  }

  function nextProblem() {
    quizAnswered = false;
    currentQuiz = makeProblem();
    ui.quizUnit.textContent = currentQuiz.unit.startsWith('역사') || currentQuiz.unit.startsWith('📕') || currentQuiz.unit.startsWith('우리반')
      ? currentQuiz.unit
      : `${P.GRADES[grade].name} · ${currentQuiz.unit}`;
    ui.quizWhy.textContent = quizWhyText;
    if (studyMode) updateStudyWhy();
    ui.quizText.textContent = currentQuiz.text;
    ui.quizFeedback.textContent = '';
    ui.quizChoices.innerHTML = '';
    $('btnQuizSubmit').disabled = false;
    // ✍️ 주관식(수학): 정답이 순수한 숫자면 직접 입력
    const ansText = currentQuiz.choices[currentQuiz.answerIndex];
    const isNumeric = /^-?[\d,]+(\.\d+)?$/.test(ansText);
    const useInput = subjectiveOn && currentQuiz.subject === '수학' && isNumeric;
    $('quizInputRow').classList.toggle('hidden', !useInput);
    if (useInput) {
      const inp = $('quizInput');
      inp.value = '';
      setTimeout(() => inp.focus(), 50);
    } else {
      const btns = [];
      currentQuiz.choices.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-choice';
        btn.textContent = c;
        btn.onclick = () => answer(i, btn);
        ui.quizChoices.appendChild(btn);
        btns.push(btn);
      });
      // 📜 족보: 오답 보기 2개를 지워 준다
      if (hintCharges > 0) {
        hintCharges--;
        const wrongs = [0, 1, 2, 3].filter((i) => i !== currentQuiz.answerIndex);
        wrongs.sort(() => Math.random() - 0.5);
        for (const i of wrongs.slice(0, 2)) {
          btns[i].disabled = true;
          btns[i].classList.add('eliminated');
        }
        ui.quizWhy.textContent += ' — 📜 족보 발동! 보기 2개 제거!';
      }
    }
    startQuizTimer();
  }

  function submitSubjective() {
    if (state !== 'quiz') return;
    const raw = $('quizInput').value.trim();
    if (!raw) return;
    const ans = currentQuiz.choices[currentQuiz.answerIndex].replace(/,/g, '');
    answerCore(Number(raw.replace(/,/g, '')) === Number(ans), null);
  }

  function answerCore(correct, btn, timedOut) {
    if (state !== 'quiz' || quizAnswered) return;
    quizAnswered = true;
    stopQuizTimer();
    $('btnQuizSubmit').disabled = true;
    const subj = currentQuiz.subject || '기타';
    if (!quizStats.by[subj]) quizStats.by[subj] = { correct: 0, total: 0 };
    quizStats.total++;
    quizStats.by[subj].total++;
    if (correct) {
      quizStats.correct++;
      quizStats.by[subj].correct++;
      if (btn) btn.classList.add('right');
      SFX.play('correct');
      noteResolve(currentQuiz);
      // 어려움 타이머 보너스: 남은 초 × 2점
      let bonusTxt = '';
      if (!studyMode && diff === 'hard' && quizTimeLeft > 0) {
        const b = Math.ceil(quizTimeLeft) * 2;
        scoreBonus += b;
        bonusTxt = ` ⚡빠른 정답 +${b}점!`;
      }
      ui.quizFeedback.textContent = '⭕ 정답!' + bonusTxt;
      if (studyMode) {
        studyCount++; studyCorrect++;
        updateStudyWhy();
        setTimeout(() => { if (state === 'quiz' && studyMode) nextProblem(); }, 700);
      } else {
        setTimeout(() => {
          ui.quiz.classList.add('hidden');
          const after = quizAfter; quizAfter = null; quizFail = null;
          state = 'play'; lastTime = performance.now();
          updateHud();
          if (after) after();
        }, 550);
      }
    } else {
      // 오답 다시보기용 기록 (같은 문제는 한 번만, 최대 10개)
      if (wrongList.length < 10 && !wrongList.some((w) => w.q === currentQuiz.text)) {
        wrongList.push({ q: currentQuiz.text, a: currentQuiz.choices[currentQuiz.answerIndex], unit: currentQuiz.unit });
      }
      SFX.play('wrong');
      noteAdd(currentQuiz); // 오답노트에 누적
      if (btn) { btn.classList.add('wrong'); btn.disabled = true; }
      const ansTxt = currentQuiz.choices[currentQuiz.answerIndex];
      const head = timedOut ? '⏰ 시간 초과!' : '❌ 아쉽다!';
      if (studyMode) {
        studyCount++;
        updateStudyWhy();
        ui.quizFeedback.textContent = `${head} 정답은 "${ansTxt}"`;
        setTimeout(() => { if (state === 'quiz' && studyMode) nextProblem(); }, 1300);
      } else if (quizOneShot) {
        ui.quizFeedback.textContent = `${head} 정답은 "${ansTxt}"…`;
        setTimeout(() => {
          ui.quiz.classList.add('hidden');
          const fail = quizFail; quizAfter = null; quizFail = null;
          if (fail) fail();
        }, 1300);
      } else {
        ui.quizFeedback.textContent = `${head} 새 문제로 다시 도전!`;
        setTimeout(() => { if (state === 'quiz') nextProblem(); }, 900);
      }
    }
    updateHud();
  }
  function answer(i, btn) { answerCore(i === currentQuiz.answerIndex, btn); }

  // ---- 공부 모드: 몬스터 없이 문제만 연속으로 ----
  function startStudy() {
    stopQuizTimer();
    studyMode = true; studyCount = 0; studyCorrect = 0;
    quizStats = { correct: 0, total: 0, by: {} };
    wrongList = [];
    player = null;
    elapsed = 0;
    $('studyResult').textContent = '';
    ui.hud.classList.add('hidden');
    ui.start.classList.add('hidden');
    openQuiz('study', null, null);
  }
  function stopStudy() {
    studyMode = false;
    stopQuizTimer();
    ui.quiz.classList.add('hidden');
    state = 'title';
    ui.start.classList.remove('hidden');
    const acc = studyCount ? Math.round((studyCorrect / studyCount) * 100) : 0;
    $('studyResult').textContent = studyCount
      ? `📚 공부 모드 결과: ${studyCount}문제 중 ${studyCorrect}개 정답 (${acc}%)`
      : '';
    updateNoteBtn();
  }

  // ---------- 강화 ----------
  function buildUpgradePool() {
    const w = player.weapons, pv = player.passives;
    const pool = [];
    const ownedW = Object.keys(WEAPON_DEFS).filter((k) => w[k].lv > 0).length;
    const ownedP = Object.keys(PASSIVE_DEFS).filter((k) => pv[k] > 0).length;
    // 무기: 슬롯이 남을 때만 새 무기 제안, 가진 무기는 레벨업 제안
    for (const k in WEAPON_DEFS) {
      const def = WEAPON_DEFS[k];
      if (w[k].lv === 0 && ownedW < MAX_WEAPONS) {
        pool.push({ icon: def.icon, name: `새 무기: ${def.name}`, desc: def.desc, apply: () => { w[k].lv = 1; } });
      } else if (w[k].lv > 0 && w[k].lv < 5) {
        pool.push({ icon: def.icon, name: `${def.name} Lv.${w[k].lv + 1}`, desc: def.desc, apply: () => { w[k].lv++; } });
      }
    }
    // 보조 장비: 짝꿍 무기 각성의 열쇠 (Lv.3까지)
    for (const k in PASSIVE_DEFS) {
      const def = PASSIVE_DEFS[k];
      const tag = def.pair ? ` (${WEAPON_DEFS[def.pair].name} 짝꿍)` : '';
      if (pv[k] === 0 && ownedP < MAX_PASSIVES) {
        pool.push({ icon: def.icon, name: `새 장비: ${def.name}`, desc: def.desc + tag, apply: () => { pv[k] = 1; applyPassive(k); } });
      } else if (pv[k] > 0 && pv[k] < 3) {
        pool.push({ icon: def.icon, name: `${def.name} Lv.${pv[k] + 1}`, desc: def.desc + tag, apply: () => { pv[k]++; applyPassive(k); } });
      }
    }
    // 슬롯이 꽉 차고 만렙이어도 뽑을 게 있도록 급식은 항상 등장
    pool.push({ icon: '🍙', name: '급식 든든하게', desc: '최대 체력 +20, 체력 25 회복', apply: () => { player.maxHp += 20; player.hp = Math.min(player.maxHp, player.hp + 25); } });
    return pool;
  }
  // 즉시 반영이 필요한 보조 효과 (책가방·실내화)
  function applyPassive(k) {
    if (k === 'bag') { player.maxHp += 15; player.hp = Math.min(player.maxHp, player.hp + 15); }
    if (k === 'shoes') { player.speed = 145 * (1 + 0.06 * player.passives.shoes); }
  }
  function openLevelup() {
    state = 'levelup';
    SFX.play('levelup');
    const pool = buildUpgradePool();
    const picks = [];
    while (picks.length < 3 && pool.length) {
      picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    ui.upgradeList.innerHTML = '';
    picks.forEach((u) => {
      const btn = document.createElement('button');
      btn.className = 'upgrade-card';
      btn.innerHTML = `<span class="icon">${u.icon}</span><span><div class="name">${u.name}</div><div class="desc">${u.desc}</div></span>`;
      btn.onclick = () => {
        u.apply(player);
        ui.levelup.classList.add('hidden');
        state = 'play';
        lastTime = performance.now();
        updateHud();
      };
      ui.upgradeList.appendChild(btn);
    });
    ui.levelup.classList.remove('hidden');
  }

  // ---------- 아이템 ----------
  function pickDrop() {
    const table = [['bread', 30], ['candy', 24], ['clock', 14], ['jokbo', 12], ['bomb', 8], ['magnet', 7], ['clover', 5]];
    let roll = Math.random() * 100;
    for (const [ty, wgt] of table) { roll -= wgt; if (roll <= 0) return ty; }
    return 'bread';
  }
  function dropItem(type, x, y) {
    items.push({ type, x, y });
  }
  function useItem(type) {
    if (type === 'bread') {
      player.hp = Math.min(player.maxHp, player.hp + 40);
      breadEaten++;
      addFloat(player.x, player.y - 34, '+40 🍞', '#43a047');
    } else if (type === 'magnet') {
      for (const g of gems) g.pull = true;
      addFloat(player.x, player.y - 34, '🧲 전부 끌어와!', '#1e88e5');
    } else if (type === 'bomb') {
      flashTimer = 0.25;
      for (const e of enemies) {
        e.hp -= e.boss ? 100 : 300;
      }
      cleanupDead();
      addFloat(player.x, player.y - 34, '💥 꽝!!', '#e53935');
    } else if (type === 'clock') {
      freezeTimer = 3;
      addFloat(player.x, player.y - 34, '⏰ 3초 얼음!', '#0288d1');
    } else if (type === 'jokbo') {
      hintCharges++;
      addFloat(player.x, player.y - 34, '📜 족보! 다음 문제 보기 2개 제거', '#6d4c41');
    } else if (type === 'clover') {
      revivesLeft++;
      addFloat(player.x, player.y - 34, '🍀 부활 기회 +1!', '#2e7d32');
    } else if (type === 'candy') {
      scoreBonus += 100;
      addFloat(player.x, player.y - 34, '⭐ +100점!', '#f9a825');
    }
  }

  function killEnemy(e, idx) {
    enemies.splice(idx, 1);
    killCount++;
    if (e.boss === 'final') {
      return endGame(true);
    }
    if (e.boss === 'mid') {
      for (let k = 0; k < 12; k++) {
        const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 40;
        gems.push({ x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d, xp: 2, pull: false });
      }
      dropItem('bread', e.x - 24, e.y);
      dropItem('magnet', e.x + 24, e.y);
      dropItem('jokbo', e.x, e.y + 24);
      addFloat(e.x, e.y - 30, '👑 중간보스 격파!', '#7b1fa2');
      return;
    }
    if (e.type === 'star') {
      const sx = e.x, sy = e.y;
      openQuiz('star', () => {
        const reward = Math.random() < 0.1 ? 'clover'
          : ['magnet', 'bomb', 'clock', 'jokbo'][Math.floor(Math.random() * 4)];
        dropItem(reward, sx, sy);
      });
      return;
    }
    gems.push({ x: e.x, y: e.y, xp: e.xp, pull: false });
    if (e.elite) dropItem(pickDrop(), e.x, e.y + 14); // 엘리트는 확정 드랍
    else if (Math.random() < 0.035) dropItem(pickDrop(), e.x, e.y + 14);
  }
  function cleanupDead() {
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0) killEnemy(enemies[i], i);
      if (state !== 'play' && state !== 'quiz') return;
    }
  }

  function damageEnemy(e, dmg) {
    if (e.boss === 'final' && e.shield) {
      addFloat(e.x, e.y - 40, '🛡', '#1565c0');
      return;
    }
    e.hp -= dmg;
    addFloat(e.x, e.y - 20, `${dmg}`, '#fb8c00');
  }

  // ---------- 진행 ----------
  function update(dt) {
    const frozen = anyBoss(); // 보스전에는 타이머가 멈춘다
    if (!frozen) elapsed += dt;

    // 보스 등장 타이밍
    if (!bossSpawned[180] && elapsed >= 180) { bossSpawned[180] = true; spawnMidBoss(180); }
    if (!bossSpawned[360] && elapsed >= 360) { bossSpawned[360] = true; spawnMidBoss(360); }
    if (!finalSpawned && elapsed >= GAME_SECONDS) { finalSpawned = true; spawnFinalBoss(); }

    // 역사 모드: 시대가 바뀌면 알려주기 (배경도 자동으로 바뀜)
    if (mode === 'history') {
      const ei = eraIdx(elapsed);
      if (ei !== lastEra) {
        lastEra = ei;
        addFloat(player.x, player.y - 70, `${ERAS[ei].icon} ${ERAS[ei].name} 시대에 도착!`, '#1565c0');
      }
    }
    checkEvolve(); // 각성 조건 확인

    // 플레이어 이동
    const iv = inputVector();
    player.moving = iv.x !== 0 || iv.y !== 0;
    if (iv.x !== 0) player.faceLeft = iv.x < 0;
    player.x += iv.x * player.speed * dt;
    player.y += iv.y * player.speed * dt;
    if (player.invuln > 0) player.invuln -= dt;
    if (flashTimer > 0) flashTimer -= dt;

    // 일반 몬스터 스폰 (최종보스전에는 보스 소환만)
    const fb = finalBoss();
    if (!fb) {
      spawnTimer -= dt;
      const interval = Math.max(0.3, 1.35 - elapsed / 350) * DIFFS[diff].spawn;
      while (spawnTimer <= 0) { spawnEnemy(); spawnTimer += interval; }
      if (!frozen) {
        starTimer -= dt;
        if (starTimer <= 0) { spawnStar(); starTimer = 45 + Math.random() * 15; }
        // 몬스터 러시: 한쪽 방향에서 떼로 몰려온다 → 도망 방향을 판단해야 함
        waveTimer -= dt;
        if (waveTimer <= 0) {
          waveTimer = 75;
          addFloat(player.x, player.y - 70, '⚠️ 몬스터 러시!', '#d84315');
          waveCount++;
          const baseAng = Math.random() * Math.PI * 2;
          for (let k = 0; k < 14; k++) spawnEnemy(baseAng + (Math.random() - 0.5) * 0.9);
        }
      }
    } else {
      // 방어막 사이클: 문제를 맞히면 12초 동안 공격 가능
      if (fb.shield && bossQuizDelay > 0) {
        bossQuizDelay -= dt;
        if (bossQuizDelay <= 0) {
          return openQuiz('boss', () => {
            const b = finalBoss();
            if (b) { b.shield = false; b.shieldTimer = 12; addFloat(b.x, b.y - 50, '🛡 방어막 깨짐!', '#1565c0'); }
          });
        }
      }
      if (!fb.shield) {
        fb.shieldTimer -= dt;
        if (fb.shieldTimer <= 0) {
          fb.shield = true;
          bossQuizDelay = 0.8;
          addFloat(fb.x, fb.y - 50, '🛡 방어막 복구!', '#1565c0');
        }
      }
      fb.summonTimer -= dt;
      if (fb.summonTimer <= 0) {
        fb.summonTimer = 7;
        for (let k = 0; k < 2; k++) spawnEnemy();
      }
    }

    // 알람시계: 몬스터 전체가 얼어붙는다
    if (freezeTimer > 0) freezeTimer -= dt;

    // 몬스터 이동
    for (const e of enemies) {
      if (freezeTimer > 0) continue; // 얼어 있는 동안은 움직이지도, 때리지도 못함
      if (e.type === 'star') {
        e.life -= dt;
        e.wander -= dt;
        if (e.wander <= 0) {
          e.wander = 1.2;
          const a = Math.random() * Math.PI * 2;
          e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed;
        }
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.wobble += dt * 8;
        continue;
      }
      let dx = player.x - e.x, dy = player.y - e.y;
      let d = Math.hypot(dx, dy) || 1;
      // 보스는 너무 멀어지면 순간이동으로 따라붙는다 (도망만 치면 보스전이 안 끝나는 것 방지)
      if (e.boss && d > 700) {
        const a = Math.random() * Math.PI * 2;
        e.x = player.x + Math.cos(a) * 430;
        e.y = player.y + Math.sin(a) * 430;
        dx = player.x - e.x; dy = player.y - e.y; d = 430;
        addFloat(e.x, e.y - 50, '👑 순간이동!', '#6a1b9a');
      }

      if (e.beh === 'dash') {
        // 돌진형: 조준(빨간 고리 경고) → 돌진 → 숨 고르기. 경고 때 옆으로 피하자!
        e.dashT -= dt;
        if (e.ds === 'windup') {
          if (e.dashT <= 0) {
            e.ds = 'dash'; e.dashT = 0.55;
            e.dvx = (dx / d) * e.dashSpeed; e.dvy = (dy / d) * e.dashSpeed;
          }
        } else if (e.ds === 'dash') {
          e.x += e.dvx * dt; e.y += e.dvy * dt;
          if (e.dashT <= 0) { e.ds = 'cool'; e.dashT = 1.1; }
        } else if (e.ds === 'cool') {
          e.x += (dx / d) * e.speed * 0.5 * dt; e.y += (dy / d) * e.speed * 0.5 * dt;
          if (e.dashT <= 0) e.ds = 'chase';
        } else {
          e.x += (dx / d) * e.speed * dt; e.y += (dy / d) * e.speed * dt;
          if (d < 300) { e.ds = 'windup'; e.dashT = e.windupT; }
        }
      } else if (e.beh === 'shoot') {
        // 원거리형: 거리를 유지하며 투사체 발사 → 날아오는 걸 피해야 함
        if (d > 300) { e.x += (dx / d) * e.speed * dt; e.y += (dy / d) * e.speed * dt; }
        else if (d < 170) { e.x -= (dx / d) * e.speed * 0.8 * dt; e.y -= (dy / d) * e.speed * 0.8 * dt; }
        else { e.x += (-dy / d) * e.speed * 0.4 * dt; e.y += (dx / d) * e.speed * 0.4 * dt; }
        e.fireT -= dt;
        if (e.fireT <= 0 && d < 430) {
          eBullets.push({ x: e.x, y: e.y, vx: (dx / d) * 180, vy: (dy / d) * 180, life: 3.5, dmg: e.shotDmg });
          e.fireT = 2.2;
        }
      } else {
        e.x += (dx / d) * e.speed * dt;
        e.y += (dy / d) * e.speed * dt;
      }

      // 중간보스: 부하 소환 / 최종보스: 사방 투사체
      if (e.boss === 'mid') {
        e.summonT -= dt;
        if (e.summonT <= 0) { e.summonT = 8; spawnEnemy(); spawnEnemy(); }
      }
      if (e.boss === 'final') {
        e.ringT -= dt;
        if (e.ringT <= 0) {
          e.ringT = 6;
          for (let k = 0; k < 8; k++) {
            const a = (Math.PI * 2 * k) / 8;
            eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 4, dmg: Math.round(12 * DIFFS[diff].dmg) });
          }
        }
      }

      e.wobble += dt * (e.ds === 'windup' ? 18 : 6);
      if (e.orbitCd > 0) e.orbitCd -= dt;
      if (d < e.r + 12 && player.invuln <= 0) {
        player.hp -= e.dmg;
        player.invuln = 0.8;
        addFloat(player.x, player.y - 30, `-${e.dmg}`, '#e53935');
        if (player.hp <= 0) return playerDown();
      }
    }

    // 적 투사체 비행 + 명중
    for (let i = eBullets.length - 1; i >= 0; i--) {
      const b = eBullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let gone = b.life <= 0;
      if (!gone && Math.hypot(player.x - b.x, player.y - b.y) < 13 && player.invuln <= 0) {
        player.hp -= b.dmg;
        player.invuln = 0.8;
        addFloat(player.x, player.y - 30, `-${b.dmg}`, '#e53935');
        gone = true;
        if (player.hp <= 0) return playerDown();
      }
      if (gone) eBullets.splice(i, 1);
    }
    // 수명이 다한 별은 사라진다
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].type === 'star' && enemies[i].life <= 0) enemies.splice(i, 1);
    }

    // ---- 무기 1: 연필 미사일 (가까운 적 자동 조준) ----
    const wp = player.weapons;
    const ps = pencilStats(wp.pencil);
    wp.pencil.timer -= dt;
    if (wp.pencil.timer <= 0 && enemies.length) {
      const targets = enemies
        .map((e) => ({ e, d: Math.hypot(e.x - player.x, e.y - player.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, ps.count);
      for (const t of targets) {
        const d = t.d || 1;
        bullets.push({
          x: player.x, y: player.y,
          vx: ((t.e.x - player.x) / d) * ps.speed, vy: ((t.e.y - player.y) / d) * ps.speed,
          life: 1.6, dmg: ps.dmg, kind: 'pencil',
        });
      }
      wp.pencil.timer = ps.interval;
    }

    // ---- 무기 2: 공책 부메랑 (주위를 도는 공책) ----
    if (wp.notebook.lv > 0) {
      const ns = notebookStats(wp.notebook);
      orbitAngle += dt * 2.4;
      for (let k = 0; k < ns.count; k++) {
        const a = orbitAngle + (Math.PI * 2 * k) / ns.count;
        const bx = player.x + Math.cos(a) * ns.radius;
        const by = player.y + Math.sin(a) * ns.radius;
        for (const e of enemies) {
          if (e.orbitCd <= 0 && Math.hypot(e.x - bx, e.y - by) < e.r + 12) {
            damageEnemy(e, ns.dmg);
            e.orbitCd = 0.5;
          }
        }
      }
    }

    // ---- 무기 3: 분필 관통샷 ----
    if (wp.chalk.lv > 0) {
      const cs = chalkStats(wp.chalk);
      wp.chalk.timer -= dt;
      if (wp.chalk.timer <= 0 && enemies.length) {
        let near = null, nd = Infinity;
        for (const e of enemies) {
          const d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d < nd) { nd = d; near = e; }
        }
        const d = nd || 1;
        bullets.push({
          x: player.x, y: player.y,
          vx: ((near.x - player.x) / d) * 300, vy: ((near.y - player.y) / d) * 300,
          life: 1.4, dmg: cs.dmg, kind: 'chalk', pierce: true, hit: new Set(),
        });
        wp.chalk.timer = cs.interval;
      }
    }

    // ---- 무기 4: 리코더 음파 (내 주변 원형 충격파) ----
    if (wp.recorder.lv > 0) {
      const rs = recorderStats(wp.recorder);
      wp.recorder.timer -= dt;
      if (wp.recorder.timer <= 0) {
        for (const e of enemies) {
          if (Math.hypot(e.x - player.x, e.y - player.y) < rs.radius + e.r) damageEnemy(e, rs.dmg);
        }
        effects.push({ kind: 'pulse', x: player.x, y: player.y, max: rs.radius, life: 0.45, full: 0.45 });
        wp.recorder.timer = rs.interval;
      }
    }

    // ---- 무기 5: 물풍선 (적진에 던져서 범위 폭발) ----
    if (wp.balloon.lv > 0) {
      const bs = balloonStats(wp.balloon);
      wp.balloon.timer -= dt;
      if (wp.balloon.timer <= 0 && enemies.length) {
        for (let k = 0; k < bs.count; k++) {
          const t = enemies[Math.floor(Math.random() * enemies.length)];
          const tx = t.x + (Math.random() - 0.5) * 40, ty = t.y + (Math.random() - 0.5) * 40;
          const d = Math.hypot(tx - player.x, ty - player.y) || 1;
          bullets.push({
            kind: 'balloon', x: player.x, y: player.y, tx, ty,
            vx: ((tx - player.x) / d) * 260, vy: ((ty - player.y) / d) * 260,
            life: 3, dmg: bs.dmg, splash: bs.radius,
          });
        }
        wp.balloon.timer = bs.interval;
      }
    }

    // 효과(음파·폭발) 수명
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].life -= dt;
      if (effects[i].life <= 0) effects.splice(i, 1);
    }

    // 탄환 비행 + 명중
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.kind === 'balloon') {
        if (Math.hypot(b.tx - b.x, b.ty - b.y) < 14 || b.life <= 0) {
          for (const e of enemies) {
            if (Math.hypot(e.x - b.x, e.y - b.y) < b.splash + e.r) damageEnemy(e, b.dmg);
          }
          effects.push({ kind: 'boom', x: b.x, y: b.y, max: b.splash, life: 0.35, full: 0.35 });
          bullets.splice(i, 1);
        }
        continue;
      }
      let remove = b.life <= 0;
      for (const e of enemies) {
        if (b.pierce && b.hit.has(e)) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 5) {
          damageEnemy(e, b.dmg);
          if (b.pierce) b.hit.add(e);
          else { remove = true; break; }
        }
      }
      if (remove) bullets.splice(i, 1);
    }
    cleanupDead();
    if (state !== 'play') return; // 별 보너스 문제 등으로 멈췄으면 여기서 끝

    // 보석 줍기
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      const dx = player.x - g.x, dy = player.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < player.magnet) g.pull = true;
      if (g.pull) { g.x += (dx / d) * 380 * dt; g.y += (dy / d) * 380 * dt; }
      if (d < 14) {
        gems.splice(i, 1);
        SFX.play('gem');
        player.xp += g.xp;
        if (player.xp >= player.xpNeed) {
          player.xp -= player.xpNeed;
          player.level++;
          player.xpNeed = 4 + player.level * 3;
          updateHud();
          return openQuiz('levelup', openLevelup); // ★문제를 맞혀야 강화 선택!
        }
      }
    }

    // 아이템 줍기
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (Math.hypot(player.x - it.x, player.y - it.y) < 24) {
        items.splice(i, 1);
        itemsPicked++;
        SFX.play('item');
        useItem(it.type);
        if (state !== 'play') return;
      }
    }

    // 떠오르는 글자
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= 30 * dt; f.life -= dt;
      if (f.life <= 0) floats.splice(i, 1);
    }

    updateHud();
  }

  function addFloat(x, y, text, color) {
    if (floats.length > 40) floats.shift();
    floats.push({ x, y, text, color, life: 0.9 });
  }

  // ---------- 그리기 ----------
  function draw() {
    const camX = player.x - W / 2, camY = player.y - H / 2;

    const tile = mode === 'history' ? eraTiles[eraIdx(elapsed)] : floorTile;
    const ts = tile.width;
    const startX = Math.floor(camX / ts) * ts, startY = Math.floor(camY / ts) * ts;
    for (let x = startX; x < camX + W; x += ts) {
      for (let y = startY; y < camY + H; y += ts) {
        ctx.drawImage(tile, x - camX, y - camY);
      }
    }

    for (const g of gems) {
      ctx.drawImage(S.gem, g.x - camX - S.gem.width / 2, g.y - camY - S.gem.height / 2);
    }
    for (const it of items) {
      const skin = mode === 'history' ? { bread: 'riceball', bomb: 'club' } : {};
      const sp = S[skin[it.type] || it.type];
      const bob = Math.sin(performance.now() / 200) * 3;
      drawShadow(it.x - camX, it.y - camY + sp.height / 2 + 2, sp.width * 0.4);
      ctx.drawImage(sp, it.x - camX - sp.width / 2, it.y - camY - sp.height / 2 + bob);
    }

    for (const e of enemies) {
      const sp = S[e.sprite || e.type];
      const sc = e.scale || 1;
      const w = sp.width * sc, h = sp.height * sc;
      const bounce = Math.sin(e.wobble) * 2;
      // 수명이 얼마 안 남은 별은 깜빡인다
      if (e.type === 'star' && e.life < 3 && Math.floor(e.life * 6) % 2 === 0) continue;
      drawShadow(e.x - camX, e.y - camY + h / 2, w * 0.4);
      ctx.drawImage(sp, e.x - camX - w / 2, e.y - camY - h / 2 + bounce, w, h);
      if (freezeTimer > 0) {
        ctx.fillStyle = 'rgba(120,190,255,.4)';
        ctx.fillRect(e.x - camX - w / 2, e.y - camY - h / 2 + bounce, w, h);
      }
      if (e.boss === 'final' && e.shield) {
        ctx.strokeStyle = 'rgba(30,136,229,.8)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x - camX, e.y - camY, e.r + 14 + Math.sin(performance.now() / 150) * 3, 0, Math.PI * 2); ctx.stroke();
      }
      // 엘리트: 금색 고리
      if (e.elite) {
        ctx.strokeStyle = 'rgba(249,168,37,.9)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x - camX, e.y - camY, e.r + 8, 0, Math.PI * 2); ctx.stroke();
      }
      // 돌진 조준 중: 빨간 고리 경고 (지금 피해!)
      if (e.ds === 'windup') {
        ctx.strokeStyle = 'rgba(229,57,53,.85)'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x - camX, e.y - camY, e.r + 10 + Math.sin(performance.now() / 60) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#e53935';
        ctx.font = "bold 18px 'Jua', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('!', e.x - camX, e.y - camY - h / 2 - 12);
      }
      if (!e.boss && e.type !== 'star' && e.hp < e.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(e.x - camX - w / 2, e.y - camY - h / 2 - 8, w, 4);
        ctx.fillStyle = '#66bb6a';
        ctx.fillRect(e.x - camX - w / 2, e.y - camY - h / 2 - 8, w * (e.hp / e.maxHp), 4);
      }
    }

    // 탄환
    for (const b of bullets) {
      ctx.save();
      ctx.translate(b.x - camX, b.y - camY);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      if (b.kind === 'chalk') {
        ctx.fillStyle = '#fff'; ctx.fillRect(-8, -3, 16, 6);
        ctx.fillStyle = '#e0e0e0'; ctx.fillRect(-8, 1, 16, 2);
      } else {
        ctx.fillStyle = '#fbc02d'; ctx.fillRect(-9, -3, 14, 6);
        ctx.fillStyle = '#f48fb1'; ctx.fillRect(-13, -3, 4, 6);
        ctx.fillStyle = '#8d6e63';
        ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(11, 0); ctx.lineTo(5, 3); ctx.fill();
      }
      ctx.restore();
    }

    // 음파(초록 고리)·물풍선 폭발(파란 고리)
    for (const f of effects) {
      const t = 1 - f.life / f.full;
      ctx.strokeStyle = f.kind === 'pulse'
        ? `rgba(102,187,106,${0.8 * (1 - t)})`
        : `rgba(41,182,246,${0.8 * (1 - t)})`;
      ctx.lineWidth = f.kind === 'pulse' ? 4 : 6;
      ctx.beginPath();
      ctx.arc(f.x - camX, f.y - camY, f.max * (f.kind === 'pulse' ? t : 0.4 + 0.6 * t), 0, Math.PI * 2);
      ctx.stroke();
    }

    // 적 투사체 (물감 방울 / 나무 구슬)
    for (const b of eBullets) {
      ctx.fillStyle = mode === 'history' ? '#6d4c41' : '#5e35b1';
      ctx.beginPath(); ctx.arc(b.x - camX, b.y - camY, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.arc(b.x - camX - 2, b.y - camY - 2, 2, 0, Math.PI * 2); ctx.fill();
    }

    // 공책 부메랑
    if (player.weapons.notebook.lv > 0) {
      const ns = notebookStats(player.weapons.notebook);
      for (let k = 0; k < ns.count; k++) {
        const a = orbitAngle + (Math.PI * 2 * k) / ns.count;
        const bx = W / 2 + Math.cos(a) * ns.radius;
        const by = H / 2 + Math.sin(a) * ns.radius;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(a);
        ctx.fillStyle = '#66bb6a'; ctx.fillRect(-8, -10, 16, 20);
        ctx.fillStyle = '#fff'; ctx.fillRect(-5, -10, 2, 20);
        ctx.restore();
      }
    }

    // 플레이어 (역사 모드는 한복 학생)
    const sp = mode === 'history' ? S.hanbok : S.student;
    const px = W / 2, py = H / 2;
    drawShadow(px, py + sp.height / 2, sp.width * 0.42);
    if (!(player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0)) {
      const bob = player.moving ? Math.sin(performance.now() / 90) * 2 : 0;
      ctx.save();
      ctx.translate(px, py + bob);
      if (player.faceLeft) ctx.scale(-1, 1);
      ctx.drawImage(sp, -sp.width / 2, -sp.height / 2);
      ctx.restore();
    }

    // 떠오르는 글자
    ctx.font = "16px 'Jua', sans-serif";
    ctx.textAlign = 'center';
    for (const f of floats) {
      ctx.globalAlpha = Math.min(1, f.life / 0.4);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x - camX, f.y - camY);
    }
    ctx.globalAlpha = 1;

    // 폭탄 번쩍임
    if (flashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flashTimer * 2.4})`;
      ctx.fillRect(0, 0, W, H);
    }

    // 가상 조이스틱
    if (stick.on) {
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 34, 0, Math.PI * 2); ctx.stroke();
      const sx = stick.x - stick.ox, sy = stick.y - stick.oy;
      const len = Math.hypot(sx, sy) || 1, cl = Math.min(len, 34);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.arc(stick.ox + (sx / len) * cl, stick.oy + (sy / len) * cl, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawShadow(x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- HUD ----------
  function updateHud() {
    if (!player) return; // 공부 모드 등 게임 밖에서는 건너뜀
    ui.level.textContent = `Lv.${player.level}`;
    ui.kills.textContent = `⚔️ ${killCount}`;
    const fb = enemies && finalBoss();
    if (fb) {
      ui.timer.textContent = '👑 보스전!';
    } else {
      const remain = Math.max(0, GAME_SECONDS - elapsed);
      const m = Math.floor(remain / 60), s = Math.floor(remain % 60);
      ui.timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    if (mode === 'history') {
      const era = ERAS[eraIdx(elapsed)];
      ui.grade.textContent = `${era.icon} ${era.name}`;
    }
    ui.acc.textContent = quizStats.total
      ? `📝 ${Math.round((quizStats.correct / quizStats.total) * 100)}%`
      : '📝 -';
    ui.hpFill.style.width = `${Math.max(0, player.hp / player.maxHp) * 100}%`;
    ui.hpText.textContent = `${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`;
    ui.xpFill.style.width = `${(player.xp / player.xpNeed) * 100}%`;
    // 보스 체력바
    const boss = enemies && enemies.find((e) => e.boss);
    if (boss) {
      ui.bossBar.classList.remove('hidden');
      ui.bossName.textContent = boss.name;
      ui.bossFill.style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`;
    } else {
      ui.bossBar.classList.add('hidden');
    }
  }

  // ---------- 일시정지 / 종료 ----------
  function weaponsHtml() {
    const rows = [];
    for (const k in WEAPON_DEFS) {
      const wp = player.weapons[k];
      if (!wp.lv) continue;
      rows.push(wp.evolved
        ? `✨${EVOLVE[k].icon} ${EVOLVE[k].evoName}`
        : `${WEAPON_DEFS[k].icon} ${WEAPON_DEFS[k].name} Lv.${wp.lv}`);
    }
    for (const k in PASSIVE_DEFS) {
      if (player.passives[k]) rows.push(`${PASSIVE_DEFS[k].icon} ${PASSIVE_DEFS[k].name} Lv.${player.passives[k]}`);
    }
    return rows.join(' · ');
  }
  function statsHtml() {
    const t = Math.floor(elapsed);
    const acc = quizStats.total ? `${quizStats.correct}/${quizStats.total} (${Math.round((quizStats.correct / quizStats.total) * 100)}%)` : '-';
    const bySubj = Object.entries(quizStats.by)
      .map(([s, v]) => `${s} ${v.correct}/${v.total}`).join(' · ');
    return `⏱ 버틴 시간: <b>${Math.floor(t / 60)}분 ${t % 60}초</b><br>` +
      `⚔️ 물리친 몬스터: <b>${killCount}</b>마리<br>` +
      `📈 레벨: <b>Lv.${player.level}</b> · ${weaponsHtml()}<br>` +
      `📝 문제 정답률: <b>${acc}</b>` +
      (bySubj ? `<br><span class="by-subject">${bySubj}</span>` : '') +
      `<br>🏆 점수: <b>${score()}</b>점 (${DIFFS[diff].icon} ${DIFFS[diff].name})`;
  }

  // 이번 판에서 틀렸던 문제 목록 (복습용)
  function wrongListHtml() {
    if (!wrongList.length) return '';
    const rows = wrongList.map((w) =>
      `<div class="wrong-row"><span class="wrong-q">${w.q}</span><span class="wrong-a">정답: ${w.a}</span></div>`
    ).join('');
    return `<div class="wrong-title">📖 이번 판에 틀린 문제 — 한 번 더 볼까?</div>${rows}`;
  }
  function score() {
    const victoryBonus = (state === 'end' && lastVictory) ? 500 : 0;
    const base = killCount * 10 + Math.floor(elapsed) * 5 + (player.level - 1) * 50 +
      quizStats.correct * 30 + victoryBonus + scoreBonus;
    return Math.round(base * DIFFS[diff].score); // 어려움일수록 점수 보너스
  }

  function pauseGame() {
    state = 'paused';
    ui.pauseStats.innerHTML = statsHtml();
    ui.pause.classList.remove('hidden');
  }
  function resumeGame() {
    ui.pause.classList.add('hidden');
    state = 'play';
    lastTime = performance.now();
  }

  // 쓰러졌을 때: 아직 부활을 안 썼으면 부활 문제(한 번뿐), 썼으면 게임 오버
  function playerDown() {
    if (revivesLeft > 0) {
      revivesLeft--;
      openQuiz('revive',
        () => { // 정답 → 체력 절반으로 부활 + 잠시 무적
          player.hp = Math.ceil(player.maxHp / 2);
          player.invuln = 2.5;
          addFloat(player.x, player.y - 40, '💪 부활!', '#2e7d32');
          updateHud();
        },
        () => endGame(false));
      return;
    }
    endGame(false);
  }

  let lastVictory = false;
  function endGame(victory) {
    stopQuizTimer();
    state = 'end';
    lastVictory = victory;
    SFX.play(victory ? 'win' : 'lose');
    ui.hud.classList.add('hidden');
    ui.quiz.classList.add('hidden');
    ui.endTitle.textContent = victory
      ? (mode === 'history' ? '🎉 시간도둑을 물리치고 역사를 지켰다!' : '🎉 시험지 대마왕을 물리쳤다!')
      : '💫 쓰러졌다…';
    ui.endStats.innerHTML = statsHtml();
    ui.endWrong.innerHTML = wrongListHtml();
    ui.endNetMsg.textContent = '';
    ui.end.classList.remove('hidden');
    // 퀴즈타운 반 랭킹 기록 (온라인일 때만)
    if (window.MS_Net) {
      window.MS_Net.recordScore({
        grade, score: score(), survived: Math.floor(elapsed), level: player.level,
        kills: killCount, correct: quizStats.correct, total: quizStats.total, victory,
        bySubject: quizStats.by, mode, diff,
      }).then((msg) => { ui.endNetMsg.textContent = msg; })
        .catch(() => { ui.endNetMsg.textContent = ''; });
    }
  }

  // ---------- 명예의 전당 (점수왕 / 정답률왕) ----------
  function hallBadges(r) {
    const m = r.bestMode === 'history' ? '🏯' : '';
    const d = r.bestDiff === 'hard' ? '🔥' : (r.bestDiff === 'easy' ? '😊' : '');
    return m + d;
  }
  function openHall(kind) {
    kind = kind || 'score';
    $('hallTabScore').classList.toggle('sel', kind === 'score');
    $('hallTabAcc').classList.toggle('sel', kind === 'acc');
    ui.hallList.innerHTML = '<p class="hall-empty">불러오는 중…</p>';
    ui.hall.classList.remove('hidden');
    if (!window.MS_Net) {
      ui.hallList.innerHTML = '<p class="hall-empty">퀴즈타운 사이트에서 열면 우리 반 랭킹이 보여요!</p>';
      return;
    }
    const medal = ['🥇', '🥈', '🥉'];
    const p = kind === 'score' ? window.MS_Net.topList(20) : window.MS_Net.topAcc(20);
    p.then((rows) => {
      if (!rows.length) {
        ui.hallList.innerHTML = kind === 'score'
          ? '<p class="hall-empty">아직 기록이 없어요. 첫 용사가 되어 보자!</p>'
          : '<p class="hall-empty">문제를 10개 이상 풀면 정답률왕에 오를 수 있어요!</p>';
        return;
      }
      ui.hallList.innerHTML = rows.map((r, i) =>
        `<div class="hall-row"><span class="hall-rank">${medal[i] || (i + 1) + '위'}</span>` +
        `<span class="hall-name">${r.name} ${hallBadges(r)}</span>` +
        (kind === 'score'
          ? `<span class="hall-score">${r.bestScore.toLocaleString('ko-KR')}점${r.bestVictory ? ' 👑' : ''}</span>`
          : `<span class="hall-score">${r.accPct}% <small>(${r.quizTotal}문제)</small></span>`)
      ).join('');
    }).catch(() => {
      ui.hallList.innerHTML = '<p class="hall-empty">퀴즈타운 사이트에서 열면 우리 반 랭킹이 보여요!</p>';
    });
  }

  $('btnStart').onclick = () => {
    if (!localStorage.getItem('ms.intro')) { $('introModal').classList.remove('hidden'); return; }
    startGame();
  };
  $('btnRetry').onclick = startGame;
  $('btnPause').onclick = () => { if (state === 'play') pauseGame(); };
  $('btnResume').onclick = resumeGame;
  $('btnQuit').onclick = () => {
    ui.pause.classList.add('hidden');
    ui.hud.classList.add('hidden');
    ui.start.classList.remove('hidden');
    state = 'title';
  };
  $('btnHall').onclick = () => openHall('score');
  $('hallTabScore').onclick = () => openHall('score');
  $('hallTabAcc').onclick = () => openHall('acc');
  $('btnHallClose').onclick = () => ui.hall.classList.add('hidden');
  $('btnNote').onclick = openNoteModal;
  $('btnNoteClose').onclick = () => $('noteModal').classList.add('hidden');
  $('btnNoteClear').onclick = () => { saveNote([]); updateNoteBtn(); openNoteModal(); };
  $('btnUnits').onclick = openUnitModal;
  $('btnUnitClose').onclick = () => $('unitModal').classList.add('hidden');
  $('btnSubjective').onclick = toggleSubjective;
  $('btnStudy').onclick = startStudy;
  $('btnStudyStop').onclick = stopStudy;
  $('btnQuizSubmit').onclick = submitSubjective;
  $('quizInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitSubjective();
  });
  $('btnSound').onclick = () => { SFX.toggle(); updateSoundBtns(); };
  $('btnSoundPause').onclick = () => { SFX.toggle(); updateSoundBtns(); };
  $('btnIntroGo').onclick = () => {
    localStorage.setItem('ms.intro', '1');
    $('introModal').classList.add('hidden');
    startGame();
  };
  updateNoteBtn();
  updateSoundBtns();
  updateSubjectiveButton();
  $('btnCodex').onclick = openCodex;
  $('btnCodexPause').onclick = openCodex;
  $('btnCodexClose').onclick = () => ui.codex.classList.add('hidden');

  // 시작 화면에 주인공 크게 보여주기 (모드에 따라 교복/한복)
  function drawTitleSprite() {
    const box = $('titleSprite');
    box.innerHTML = '';
    const src = mode === 'history' ? S.hanbok : S.student;
    const big = document.createElement('canvas');
    big.width = src.width * 2; big.height = src.height * 2;
    const c = big.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(src, 0, 0, big.width, big.height);
    box.appendChild(big);
  }
  drawTitleSprite();
  buildModeRow();
  buildDiffRow();
  applyModeUi();

  // ---------- 도감 ----------
  function thumb(name, scale) {
    const src = S[name];
    const cv = document.createElement('canvas');
    const k = scale || 1.5;
    cv.width = src.width * k; cv.height = src.height * k;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(src, 0, 0, cv.width, cv.height);
    cv.className = 'codex-thumb';
    return cv;
  }
  function codexRow(iconOrSprite, title, desc, isSprite) {
    const row = document.createElement('div');
    row.className = 'codex-row';
    if (isSprite) row.appendChild(thumb(iconOrSprite));
    else {
      const ic = document.createElement('span');
      ic.className = 'codex-icon'; ic.textContent = iconOrSprite;
      row.appendChild(ic);
    }
    const txt = document.createElement('span');
    txt.innerHTML = `<b>${title}</b><small>${desc}</small>`;
    row.appendChild(txt);
    return row;
  }
  function codexSection(title) {
    const h = document.createElement('div');
    h.className = 'codex-section'; h.textContent = title;
    return h;
  }
  function openCodex() {
    const body = ui.codexBody;
    body.innerHTML = '';
    body.appendChild(codexSection('⚔️ 무기 (최대 3개까지 배울 수 있어!)'));
    for (const k in WEAPON_DEFS) {
      body.appendChild(codexRow(WEAPON_DEFS[k].icon, WEAPON_DEFS[k].name, WEAPON_DEFS[k].desc));
    }
    body.appendChild(codexSection('✨ 각성 무기'));
    for (const key in WEAPON_DEFS) {
      const e = EVOLVE[key];
      if (codexUnlocks[key]) {
        body.appendChild(codexRow(e.icon, `✨ ${e.evoName}`, e.desc + ' (각성 달성!)'));
      } else {
        body.appendChild(codexRow('❓', '??? (각성 무기)', `조건: ${evolveCondText(key)}`));
      }
    }
    body.appendChild(codexSection('🎒 보조 장비 (최대 3개, Lv.3까지)'));
    for (const k in PASSIVE_DEFS) {
      const d = PASSIVE_DEFS[k];
      const tag = d.pair ? ` · ${WEAPON_DEFS[d.pair].name} 짝꿍!` : '';
      body.appendChild(codexRow(d.icon, d.name, d.desc + tag));
    }
    body.appendChild(codexSection('🔮 각성 조합표'));
    for (const key in WEAPON_DEFS) {
      const pk = pairKeyOf(key);
      body.appendChild(codexRow('🔮',
        `${WEAPON_DEFS[key].icon} + ${PASSIVE_DEFS[pk].icon} = ${EVOLVE[key].icon}`,
        `${WEAPON_DEFS[key].name} Lv.5 + ${PASSIVE_DEFS[pk].name} Lv.3 → ${EVOLVE[key].evoName} (또는 ${EVOLVE[key].altText})`));
    }
    body.appendChild(codexSection('🎁 아이템'));
    body.appendChild(codexRow('gem', '지식 보석', '몬스터가 떨어뜨림. 모으면 레벨업!', true));
    body.appendChild(codexRow('magnet', '자석', '화면의 모든 보석을 한 번에 끌어옴', true));
    body.appendChild(codexRow('bomb', '폭탄', '화면 전체 몬스터에게 큰 피해 (역사 모드: 도깨비 방망이)', true));
    body.appendChild(codexRow('bread', '급식빵', '체력 +40 회복 (역사 모드: 주먹밥)', true));
    body.appendChild(codexRow('clock', '알람시계', '몬스터 전체를 3초 동안 얼려요', true));
    body.appendChild(codexRow('jokbo', '시험 족보', '다음 문제에서 보기 2개를 지워 줌', true));
    body.appendChild(codexRow('clover', '네잎클로버', '부활 기회 +1 (희귀!)', true));
    body.appendChild(codexRow('candy', '별사탕', '점수 +100', true));
    body.appendChild(codexRow('star', '별 몬스터', '잡으면 보너스 문제! 맞히면 아이템', true));
    body.appendChild(codexSection('🏫 교실 몬스터'));
    body.appendChild(codexRow('slime', '지우개 가루 슬라임', '느리지만 떼로 몰려온다', true));
    body.appendChild(codexRow('ghost', '숙제 유령', '1분 30초부터 나타나는 빠른 유령', true));
    body.appendChild(codexRow('paperplane', '종이비행기', '빨간 고리가 보이면 돌진 신호 — 옆으로 피하자!', true));
    body.appendChild(codexRow('inkslime', '물감 슬라임', '멀리서 물감 방울을 던진다. 방울을 피해!', true));
    body.appendChild(codexRow('examboss', '시험지 대마왕', '10분에 등장! 방어막은 문제로 깨고, 사방 투사체를 피하자', true));
    body.appendChild(codexSection('🏯 역사 몬스터'));
    body.appendChild(codexRow('dokkaebi', '도깨비', '옛이야기 속 장난꾸러기 (3분 대왕 도깨비!)', true));
    body.appendChild(codexRow('jeoseung', '저승사자', '검은 갓을 쓴 무서운 추격자', true));
    body.appendChild(codexRow('wisp', '도깨비불', '파란 불꽃 — 조준한 뒤 쌩! 돌진한다', true));
    body.appendChild(codexRow('jangseung', '장승', '멀리서 나무 구슬을 던지는 마을 지킴이', true));
    body.appendChild(codexRow('gumiho', '구미호', '꼬리 아홉 여우 — 6분의 문지기', true));
    body.appendChild(codexRow('clockboss', '시간도둑 대마왕', '역사를 뒤죽박죽 만든 최종보스', true));
    body.appendChild(codexSection('📜 역사 시간여행의 시대'));
    for (const era of ERAS) {
      const descs = {
        '고조선': '단군왕검의 첫 나라 — 고인돌 들판 (시작~3분)',
        '삼국시대': '고구려·백제·신라 — 산성 돌바닥 (3~6분)',
        '고려': '고려청자의 나라 — 청자빛 들판 (6~10분)',
        '조선': '한글과 과학의 나라 — 궁궐 마당 (최종보스전)',
      };
      body.appendChild(codexRow(era.icon, era.name, descs[era.name]));
    }
    ui.codex.classList.remove('hidden');
  }

  // 시험용 디버그 훅: 로컬 개발 환경에서만 켜진다.
  // (운영 사이트에서 켜져 있으면 콘솔로 점수를 조작해 랭킹을 어지럽힐 수 있음)
  const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  if (IS_LOCAL) {
    const debugQuizButton = document.createElement('button');
    debugQuizButton.id = 'msDebugQuiz';
    debugQuizButton.setAttribute('aria-label', '로컬 퀴즈 테스트');
    debugQuizButton.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:.01;z-index:99';
    debugQuizButton.onclick = () => {
      if (state === 'title' || !player) startGame();
      if (state === 'play') openQuiz('levelup', () => {});
    };
    document.body.appendChild(debugQuizButton);
    window.MS_debug = {
    start: startGame,
    startStudy,
    stopStudy,
    openQuiz(kind = 'levelup') {
      if (!quizStats) quizStats = { correct: 0, total: 0, by: {} };
      if (!wrongList) wrongList = [];
      openQuiz(kind, () => {}, () => {});
    },
    step(dt, n = 1) { for (let i = 0; i < n && state === 'play'; i++) update(dt); if (state === 'play') draw(); },
    state: () => ({ state, elapsed, killCount, grade, sem, diff, subjects: [...subjects], studyMode, studyCount, studyCorrect, quizTimeLeft, currentQuiz, hp: player && player.hp, level: player && player.level, enemies: enemies && enemies.length, boss: enemies && enemies.filter((e) => e.boss).map((e) => ({ name: e.name, hp: e.hp, shield: e.shield })), gems: gems && gems.length, eBullets: eBullets && eBullets.length, items: items && items.map((i) => i.type), quiz: quizStats, revives: revivesLeft, freeze: freezeTimer, hints: hintCharges, waves: waveCount, picked: itemsPicked }),
    press(key, down) { keys[key] = down; },
    answerQuiz(ok) {
      if (state !== 'quiz') return 'no quiz';
      const question = currentQuiz.text;
      if (!$('quizInputRow').classList.contains('hidden')) {
        $('quizInput').value = ok ? currentQuiz.choices[currentQuiz.answerIndex] : '__wrong__';
        submitSubjective();
        return question;
      }
      const btns = ui.quizChoices.querySelectorAll('.quiz-choice');
      const idx = ok ? currentQuiz.answerIndex : (currentQuiz.answerIndex + 1) % btns.length;
      btns[idx].click();
      return question;
    },
    sampleProblems(n = 100) { return Array.from({ length: n }, () => makeProblem()); },
    setQuizConfig(config) {
      if (config.grade && P.GRADES[config.grade]) grade = config.grade;
      if (config.sem === 1 || config.sem === 2) sem = config.sem;
      if (config.diff && DIFFS[config.diff]) diff = config.diff;
      if (Array.isArray(config.subjects) && config.subjects.length && config.subjects.every((s) => B.SUBJECTS[s])) subjects = [...config.subjects];
      if (typeof config.subjective === 'boolean') subjectiveOn = config.subjective;
      buildGradeGrid(); buildSemRow(); buildDiffRow(); buildSubjectRow(); updateSubjectiveButton();
    },
    setElapsed(t) { elapsed = t; },
    setMode(m) { mode = m; },
    pull() { // 시험용: 모든 보스를 플레이어 옆으로
      for (const e of enemies) if (e.boss) { e.x = player.x + 120; e.y = player.y; }
    },
    buff() { // 보스전 시험용 강화
      for (const k in player.weapons) player.weapons[k].lv = 5;
      player.maxHp = 500; player.hp = 500; player.speed = 200;
    },
    give(type) { dropItem(type, player.x + 10, player.y); },
    setP(key, lv) { player.passives[key] = lv; applyPassive(key); },
    };
  }

  // ---------- 메인 루프 ----------
  function loop(now) {
    if (state === 'play') {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      update(dt);
      if (state === 'play' || state === 'levelup' || state === 'quiz') draw();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
