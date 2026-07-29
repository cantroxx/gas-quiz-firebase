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
    levelup: $('levelupModal'), upgradeList: $('upgradeList'),
    quiz: $('quizModal'), quizUnit: $('quizUnit'), quizWhy: $('quizWhy'),
    quizText: $('quizText'), quizChoices: $('quizChoices'), quizFeedback: $('quizFeedback'),
    pause: $('pauseModal'), pauseStats: $('pauseStats'),
    end: $('endScreen'), endTitle: $('endTitle'), endStats: $('endStats'), endWrong: $('endWrong'), endNetMsg: $('endNetMsg'),
    hall: $('hallModal'), hallList: $('hallList'),
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

  // ---------- 과목 선택 (여러 개 가능, 최소 1개) ----------
  const B = window.MS_Bank;
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

  // 켜진 과목 중에서 문제 하나 만들기 (수학=자동 생성, 나머지=내장 문제은행)
  function makeProblem() {
    const sid = subjects[Math.floor(Math.random() * subjects.length)];
    if (sid === 'math') {
      const p = P.generate(grade);
      p.unit = '수학 · ' + p.unit;
      p.subject = '수학';
      return p;
    }
    const p = B.serve(sid, grade);
    p.subject = B.SUBJECTS[sid].name;
    return p;
  }

  // ---------- 학년 선택 ----------
  let grade = Number(localStorage.getItem('ms.grade')) || 4;
  function buildGradeGrid() {
    ui.gradeGrid.innerHTML = '';
    for (const g of [3, 4, 5, 6]) {
      const info = P.GRADES[g];
      const btn = document.createElement('button');
      btn.className = 'grade-card' + (g === grade ? ' sel' : '');
      btn.innerHTML = `<b>${info.name}</b><small>${info.units}</small>`;
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

  // ---------- 게임 상태 ----------
  // state: title | play | quiz | levelup | paused | end
  let state = 'title';
  let player, enemies, bullets, gems, items, floats, elapsed, killCount, spawnTimer, lastTime;
  let starTimer, bossSpawned, finalSpawned, bossQuizDelay, flashTimer, orbitAngle;
  let quizStats, currentQuiz, quizAfter, quizFail, quizOneShot, quizWhyText;
  let reviveUsed, wrongList;

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
      },
    };
  }

  function startGame() {
    player = newPlayer();
    enemies = []; bullets = []; gems = []; items = []; floats = [];
    elapsed = 0; killCount = 0; spawnTimer = 0.5; starTimer = 38;
    bossSpawned = { 180: false, 360: false }; finalSpawned = false;
    bossQuizDelay = 0; flashTimer = 0; orbitAngle = 0;
    quizStats = { correct: 0, total: 0, by: {} };
    reviveUsed = false; wrongList = [];
    state = 'play';
    ui.start.classList.add('hidden');
    ui.end.classList.add('hidden');
    ui.hud.classList.remove('hidden');
    ui.grade.textContent = P.GRADES[grade].name;
    lastTime = performance.now();
    updateHud();
  }

  // ---------- 무기 수치 ----------
  const pencilStats = (lv) => ({ interval: 1.05 * Math.pow(0.93, lv - 1), count: Math.ceil(lv / 2), dmg: 8 + 5 * lv });
  const notebookStats = (lv) => ({ count: Math.min(lv + 1, 6), radius: 58, dmg: 6 + 4 * lv });
  const chalkStats = (lv) => ({ interval: 1.7 * Math.pow(0.9, lv - 1), dmg: 9 + 5 * lv });

  // ---------- 몬스터 ----------
  function spawnEnemy() {
    if (enemies.length >= 150) return;
    const min = elapsed / 60;
    const type = (elapsed > 90 && Math.random() < 0.35) ? 'ghost' : 'slime';
    const stat = type === 'slime'
      ? { hp: 14, speed: 40, dmg: 8, xp: 1, r: 15 }
      : { hp: 26, speed: 58, dmg: 12, xp: 2, r: 16 };
    stat.hp = Math.round(stat.hp * (1 + min * 0.35));
    stat.speed *= 1 + min * 0.04;
    // 첫 50초는 조작을 익힐 수 있게 약하게
    if (elapsed < 50) { stat.hp = Math.round(stat.hp * 0.75); stat.speed *= 0.85; }
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.hypot(W, H) / 2 + 40;
    enemies.push({
      type, x: player.x + Math.cos(ang) * dist, y: player.y + Math.sin(ang) * dist,
      hp: stat.hp, maxHp: stat.hp, speed: stat.speed, dmg: stat.dmg, xp: stat.xp, r: stat.r,
      wobble: Math.random() * Math.PI * 2, orbitCd: 0,
    });
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
    enemies.push({
      type: 'ghost', boss: 'mid', scale: 2.2,
      x: player.x + (Math.random() < 0.5 ? -1 : 1) * (W / 2 + 60), y: player.y,
      hp: which === 180 ? 380 : 950, maxHp: which === 180 ? 380 : 950,
      speed: 46 + min * 2, dmg: 20, xp: 0, r: 34, wobble: 0, orbitCd: 0,
      name: which === 180 ? '👑 숙제 유령 대왕' : '👑 지우개 대마왕',
    });
    addFloat(player.x, player.y - 60, '👑 중간보스 등장!', '#7b1fa2');
  }

  function spawnFinalBoss() {
    enemies.push({
      type: 'examboss', boss: 'final', scale: 2,
      x: player.x, y: player.y - H / 2 - 80,
      hp: 1300, maxHp: 1300, speed: 42, dmg: 25, xp: 0, r: 40, wobble: 0, orbitCd: 0,
      shield: true, shieldTimer: 0, summonTimer: 5,
      name: '👑 시험지 대마왕',
    });
    bossQuizDelay = 1.0;
    addFloat(player.x, player.y - 60, '👑 시험지 대마왕 등장!!', '#c62828');
  }

  const anyBoss = () => enemies.some((e) => e.boss);
  const finalBoss = () => enemies.find((e) => e.boss === 'final');

  // ---------- 문제(퀴즈) ----------
  // mode: 'levelup' 강화 선택 전 / 'star' 별 보너스 / 'boss' 보스 방어막 / 'revive' 부활(단 한 번!)
  const QUIZ_WHY = {
    levelup: '문제를 맞히면 강화를 고를 수 있어! (틀려도 다시 도전!)',
    star: '⭐ 보너스 문제! 맞히면 아이템이 떨어져!',
    boss: '🛡 보스 방어막은 문제를 풀어야 깨져!',
    revive: '💫 부활 문제! 기회는 한 번뿐 — 맞히면 다시 일어난다!',
  };
  function openQuiz(mode, onCorrect, onFail) {
    state = 'quiz';
    quizAfter = onCorrect;
    quizFail = onFail || null;
    quizOneShot = (mode === 'revive'); // 부활 문제는 재도전 없음
    quizWhyText = QUIZ_WHY[mode];
    nextProblem();
    ui.quiz.classList.remove('hidden');
  }
  function nextProblem() {
    currentQuiz = makeProblem();
    ui.quizUnit.textContent = `${P.GRADES[grade].name} · ${currentQuiz.unit}`;
    ui.quizWhy.textContent = quizWhyText;
    ui.quizText.textContent = currentQuiz.text;
    ui.quizFeedback.textContent = '';
    ui.quizChoices.innerHTML = '';
    currentQuiz.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-choice';
      btn.textContent = c;
      btn.onclick = () => answer(i, btn);
      ui.quizChoices.appendChild(btn);
    });
  }
  function answer(i, btn) {
    if (state !== 'quiz') return;
    const subj = currentQuiz.subject || '기타';
    if (!quizStats.by[subj]) quizStats.by[subj] = { correct: 0, total: 0 };
    quizStats.total++;
    quizStats.by[subj].total++;
    if (i === currentQuiz.answerIndex) {
      quizStats.correct++;
      quizStats.by[subj].correct++;
      btn.classList.add('right');
      ui.quizFeedback.textContent = '⭕ 정답!';
      setTimeout(() => {
        ui.quiz.classList.add('hidden');
        const after = quizAfter; quizAfter = null; quizFail = null;
        state = 'play'; lastTime = performance.now();
        updateHud();
        if (after) after();
      }, 550);
    } else {
      // 오답 다시보기용 기록 (같은 문제는 한 번만, 최대 10개)
      if (wrongList.length < 10 && !wrongList.some((w) => w.q === currentQuiz.text)) {
        wrongList.push({ q: currentQuiz.text, a: currentQuiz.choices[currentQuiz.answerIndex], unit: currentQuiz.unit });
      }
      btn.classList.add('wrong');
      btn.disabled = true;
      if (quizOneShot) {
        ui.quizFeedback.textContent = `❌ 정답은 "${currentQuiz.choices[currentQuiz.answerIndex]}"…`;
        setTimeout(() => {
          ui.quiz.classList.add('hidden');
          const fail = quizFail; quizAfter = null; quizFail = null;
          if (fail) fail();
        }, 1300);
      } else {
        ui.quizFeedback.textContent = '❌ 아쉽다! 새 문제로 다시 도전!';
        setTimeout(() => { if (state === 'quiz') nextProblem(); }, 900);
      }
    }
    updateHud();
  }

  // ---------- 강화 ----------
  function buildUpgradePool() {
    const w = player.weapons;
    const pool = [];
    if (w.pencil.lv < 5) pool.push({ icon: '✏️', name: `연필 미사일 Lv.${w.pencil.lv + 1}`, desc: '더 세고, 더 빠르고, 더 많이!', apply: () => { w.pencil.lv++; } });
    if (w.notebook.lv === 0) pool.push({ icon: '📚', name: '새 무기: 공책 부메랑', desc: '내 주위를 빙글빙글 도는 공책 방패!', apply: () => { w.notebook.lv = 1; } });
    else if (w.notebook.lv < 5) pool.push({ icon: '📚', name: `공책 부메랑 Lv.${w.notebook.lv + 1}`, desc: '공책이 한 권 더 늘어나!', apply: () => { w.notebook.lv++; } });
    if (w.chalk.lv === 0) pool.push({ icon: '🖍️', name: '새 무기: 분필 관통샷', desc: '적을 줄줄이 꿰뚫는 분필 조각!', apply: () => { w.chalk.lv = 1; } });
    else if (w.chalk.lv < 5) pool.push({ icon: '🖍️', name: `분필 관통샷 Lv.${w.chalk.lv + 1}`, desc: '더 세고 더 자주 날아가!', apply: () => { w.chalk.lv++; } });
    pool.push({ icon: '🍙', name: '급식 든든하게', desc: '최대 체력 +20, 체력 25 회복', apply: () => { player.maxHp += 20; player.hp = Math.min(player.maxHp, player.hp + 25); } });
    pool.push({ icon: '👟', name: '실내화 끈 조이기', desc: '이동 속도 10% 빨라짐', apply: () => { player.speed *= 1.1; } });
    pool.push({ icon: '🧲', name: '보석 자석', desc: '보석 끌어오는 범위 40% 커짐', apply: () => { player.magnet *= 1.4; } });
    return pool;
  }
  function openLevelup() {
    state = 'levelup';
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
  function dropItem(type, x, y) {
    items.push({ type, x, y });
  }
  function useItem(type) {
    if (type === 'bread') {
      player.hp = Math.min(player.maxHp, player.hp + 40);
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
      dropItem('bread', e.x - 20, e.y);
      dropItem('magnet', e.x + 20, e.y);
      addFloat(e.x, e.y - 30, '👑 중간보스 격파!', '#7b1fa2');
      return;
    }
    if (e.type === 'star') {
      const sx = e.x, sy = e.y;
      openQuiz('star', () => {
        dropItem(Math.random() < 0.5 ? 'magnet' : 'bomb', sx, sy);
      });
      return;
    }
    gems.push({ x: e.x, y: e.y, xp: e.xp, pull: false });
    if (Math.random() < 0.02) dropItem('bread', e.x, e.y + 14);
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
      const interval = Math.max(0.35, 1.7 - elapsed / 400); // 처음엔 1.7초 간격 → 점점 빨라짐
      while (spawnTimer <= 0) { spawnEnemy(); spawnTimer += interval; }
      if (!frozen) {
        starTimer -= dt;
        if (starTimer <= 0) { spawnStar(); starTimer = 45 + Math.random() * 15; }
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

    // 몬스터 이동
    for (const e of enemies) {
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
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
      e.wobble += dt * 6;
      if (e.orbitCd > 0) e.orbitCd -= dt;
      if (d < e.r + 12 && player.invuln <= 0) {
        player.hp -= e.dmg;
        player.invuln = 1.0;
        addFloat(player.x, player.y - 30, `-${e.dmg}`, '#e53935');
        if (player.hp <= 0) return playerDown();
      }
    }
    // 수명이 다한 별은 사라진다
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].type === 'star' && enemies[i].life <= 0) enemies.splice(i, 1);
    }

    // ---- 무기 1: 연필 미사일 (가까운 적 자동 조준) ----
    const wp = player.weapons;
    const ps = pencilStats(wp.pencil.lv);
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
          vx: ((t.e.x - player.x) / d) * 340, vy: ((t.e.y - player.y) / d) * 340,
          life: 1.6, dmg: ps.dmg, kind: 'pencil',
        });
      }
      wp.pencil.timer = ps.interval;
    }

    // ---- 무기 2: 공책 부메랑 (주위를 도는 공책) ----
    if (wp.notebook.lv > 0) {
      const ns = notebookStats(wp.notebook.lv);
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
      const cs = chalkStats(wp.chalk.lv);
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

    // 탄환 비행 + 명중
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
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

    const ts = floorTile.width;
    const startX = Math.floor(camX / ts) * ts, startY = Math.floor(camY / ts) * ts;
    for (let x = startX; x < camX + W; x += ts) {
      for (let y = startY; y < camY + H; y += ts) {
        ctx.drawImage(floorTile, x - camX, y - camY);
      }
    }

    for (const g of gems) {
      ctx.drawImage(S.gem, g.x - camX - S.gem.width / 2, g.y - camY - S.gem.height / 2);
    }
    for (const it of items) {
      const sp = S[it.type];
      const bob = Math.sin(performance.now() / 200) * 3;
      drawShadow(it.x - camX, it.y - camY + sp.height / 2 + 2, sp.width * 0.4);
      ctx.drawImage(sp, it.x - camX - sp.width / 2, it.y - camY - sp.height / 2 + bob);
    }

    for (const e of enemies) {
      const sp = S[e.type];
      const sc = e.scale || 1;
      const w = sp.width * sc, h = sp.height * sc;
      const bounce = Math.sin(e.wobble) * 2;
      // 수명이 얼마 안 남은 별은 깜빡인다
      if (e.type === 'star' && e.life < 3 && Math.floor(e.life * 6) % 2 === 0) continue;
      drawShadow(e.x - camX, e.y - camY + h / 2, w * 0.4);
      ctx.drawImage(sp, e.x - camX - w / 2, e.y - camY - h / 2 + bounce, w, h);
      if (e.boss === 'final' && e.shield) {
        ctx.strokeStyle = 'rgba(30,136,229,.8)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x - camX, e.y - camY, e.r + 14 + Math.sin(performance.now() / 150) * 3, 0, Math.PI * 2); ctx.stroke();
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

    // 공책 부메랑
    if (player.weapons.notebook.lv > 0) {
      const ns = notebookStats(player.weapons.notebook.lv);
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

    // 플레이어
    const sp = S.student;
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
    const w = player.weapons;
    const rows = [`✏️ 연필 미사일 Lv.${w.pencil.lv}`];
    if (w.notebook.lv) rows.push(`📚 공책 부메랑 Lv.${w.notebook.lv}`);
    if (w.chalk.lv) rows.push(`🖍️ 분필 관통샷 Lv.${w.chalk.lv}`);
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
      `<br>🏆 점수: <b>${score()}</b>점`;
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
    return killCount * 10 + Math.floor(elapsed) * 5 + (player.level - 1) * 50 +
      quizStats.correct * 30 + victoryBonus;
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
    if (!reviveUsed) {
      reviveUsed = true;
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
    state = 'end';
    lastVictory = victory;
    ui.hud.classList.add('hidden');
    ui.quiz.classList.add('hidden');
    ui.endTitle.textContent = victory ? '🎉 시험지 대마왕을 물리쳤다!' : '💫 쓰러졌다…';
    ui.endStats.innerHTML = statsHtml();
    ui.endWrong.innerHTML = wrongListHtml();
    ui.endNetMsg.textContent = '';
    ui.end.classList.remove('hidden');
    // 퀴즈타운 반 랭킹 기록 (온라인일 때만)
    if (window.MS_Net) {
      window.MS_Net.recordScore({
        grade, score: score(), survived: Math.floor(elapsed), level: player.level,
        kills: killCount, correct: quizStats.correct, total: quizStats.total, victory,
        bySubject: quizStats.by,
      }).then((msg) => { ui.endNetMsg.textContent = msg; })
        .catch(() => { ui.endNetMsg.textContent = ''; });
    }
  }

  // ---------- 명예의 전당 ----------
  function openHall() {
    ui.hallList.innerHTML = '<p class="hall-empty">불러오는 중…</p>';
    ui.hall.classList.remove('hidden');
    if (!window.MS_Net) {
      ui.hallList.innerHTML = '<p class="hall-empty">퀴즈타운 사이트에서 열면 우리 반 랭킹이 보여요!</p>';
      return;
    }
    window.MS_Net.topList(20).then((rows) => {
      if (!rows.length) {
        ui.hallList.innerHTML = '<p class="hall-empty">아직 기록이 없어요. 첫 용사가 되어 보자!</p>';
        return;
      }
      const medal = ['🥇', '🥈', '🥉'];
      ui.hallList.innerHTML = rows.map((r, i) =>
        `<div class="hall-row"><span class="hall-rank">${medal[i] || (i + 1) + '위'}</span>` +
        `<span class="hall-name">${r.name}</span>` +
        `<span class="hall-score">${r.bestScore.toLocaleString('ko-KR')}점${r.bestVictory ? ' 👑' : ''}</span></div>`
      ).join('');
    }).catch(() => {
      ui.hallList.innerHTML = '<p class="hall-empty">퀴즈타운 사이트에서 열면 우리 반 랭킹이 보여요!</p>';
    });
  }

  $('btnStart').onclick = startGame;
  $('btnRetry').onclick = startGame;
  $('btnPause').onclick = () => { if (state === 'play') pauseGame(); };
  $('btnResume').onclick = resumeGame;
  $('btnQuit').onclick = () => {
    ui.pause.classList.add('hidden');
    ui.hud.classList.add('hidden');
    ui.start.classList.remove('hidden');
    state = 'title';
  };
  $('btnHall').onclick = openHall;
  $('btnHallClose').onclick = () => ui.hall.classList.add('hidden');

  // 시작 화면에 주인공 크게 보여주기
  (function () {
    const big = document.createElement('canvas');
    const src = S.student;
    big.width = src.width * 2; big.height = src.height * 2;
    const c = big.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(src, 0, 0, big.width, big.height);
    $('titleSprite').appendChild(big);
  })();

  // 시험용 디버그 훅: 로컬 개발 환경에서만 켜진다.
  // (운영 사이트에서 켜져 있으면 콘솔로 점수를 조작해 랭킹을 어지럽힐 수 있음)
  const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  if (IS_LOCAL) window.MS_debug = {
    start: startGame,
    step(dt, n = 1) { for (let i = 0; i < n && state === 'play'; i++) update(dt); if (state === 'play') draw(); },
    state: () => ({ state, elapsed, killCount, grade, hp: player && player.hp, level: player && player.level, enemies: enemies && enemies.length, boss: enemies && enemies.filter((e) => e.boss).map((e) => ({ name: e.name, hp: e.hp, shield: e.shield })), gems: gems && gems.length, items: items && items.map((i) => i.type), quiz: quizStats }),
    press(key, down) { keys[key] = down; },
    answerQuiz(ok) {
      if (state !== 'quiz') return 'no quiz';
      const btns = ui.quizChoices.querySelectorAll('.quiz-choice');
      const idx = ok ? currentQuiz.answerIndex : (currentQuiz.answerIndex + 1) % btns.length;
      btns[idx].click();
      return currentQuiz.text;
    },
    setElapsed(t) { elapsed = t; },
    pull() { // 시험용: 모든 보스를 플레이어 옆으로
      for (const e of enemies) if (e.boss) { e.x = player.x + 120; e.y = player.y; }
    },
    buff() { // 보스전 시험용 강화
      player.weapons.pencil.lv = 5; player.weapons.notebook.lv = 5; player.weapons.chalk.lv = 5;
      player.maxHp = 500; player.hp = 500; player.speed = 200;
    },
  };

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
