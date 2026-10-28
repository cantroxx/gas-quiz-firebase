(function () {
  'use strict';
  const D = window.FruitBellDomain, $ = id => document.getElementById(id);
  const fruitNames = ['사과', '바나나', '포도', '수박'], avatars = ['🐰', '🐻', '🐱', '🐸'];
  let practice = null, game = null, room = null, me = 'me', online = false, connected = false;
  let cloud = null, cloudFirebase = null, source = null, offset = 0, rtt = 0, lastEvent = -1, shownResult = false, sentRound = -1, busy = false;
  let audio = null, sound = true, ringTimer, botPlans = [], botRound = -1, generation = 0;
  let practiceEmote = null, emotePending = false, nextEmoteAt = 0;
  const emoteLabels = { laugh: 'ㅋㅋ', tease: '메롱', surprise: '헉', clap: '짝짝' };
  const monotonic = () => performance.timeOrigin + performance.now();
  const now = () => monotonic() + (practice ? 0 : offset);
  function node(tag, text, cls) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; }
  function status(text = '') { $('status').textContent = text; }
  async function tone(kind = 'bell') {
    if (!sound) return;
    try {
      const requestedAt = performance.now();
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
      if (audio.state !== 'running') await audio.resume();
      // Do not replay old sounds after a background tab or a blocked audio gesture.
      if (!sound || audio.state !== 'running' || performance.now() - requestedAt > 300) return;
      const start = audio.currentTime;
      // A bright strike with a warm, longer fundamental and quickly fading metallic partials.
      const notes = kind === 'bell'
        ? [[1046.5, .24, .9], [2093, .12, .55], [2815, .065, .3], [4186, .035, .14]]
        : kind === 'flip' ? [[330, .035, .1]] : [[220, .08, .1], [196, .04, .1]];
      for (const [frequency, volume, decay] of notes) {
        const osc = audio.createOscillator(), gain = audio.createGain();
        osc.type = 'sine'; osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + .003);
        gain.gain.exponentialRampToValueAtTime(.0001, start + decay);
        gain.gain.linearRampToValueAtTime(0, start + decay + .02);
        osc.connect(gain); gain.connect(audio.destination);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        osc.start(start); osc.stop(start + decay + .03);
      }
    } catch (_) { /* Play remains available when audio is blocked. */ }
  }
  function feedback() {
    tone(); const bell = $('bell'); bell.classList.remove('ringing'); void bell.offsetWidth; bell.classList.add('ringing');
    clearTimeout(ringTimer); ringTimer = setTimeout(() => bell.classList.remove('ringing'), 550);
    $('ring-feedback').textContent = practice ? '딩!' : '딩! 판정 중…';
  }
  async function request(action, data = {}) {
    if (cloud) return cloud.action(action, { ...data, ...(action === 'flip' ? { round: game?.round } : {}) });
    const res = await fetch(`/api/fruit-bell/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(5000) });
    const value = await res.json(); if (!res.ok) throw Error(value.error || '연결을 확인해 주세요.'); return value;
  }
  async function guarded(work) {
    if (busy) return; busy = true; status();
    try { await work(); } catch (error) { status(error.message); } finally { busy = false; }
  }
  function accept(value) {
    if (!value || practice) return;
    if (cloud) { ({ offset, rtt } = cloud.clock()); }
    if (room?.code === value.code && value.revision !== undefined && value.revision < room.revision) return;
    if (room?.code === value.code && game && value.game && value.game.revision < game.revision) return;
    room = value;
    if (room.game) {
      game = room.game;
      if ($('match').hidden) enterMatch();
      updateEvent();
    } else {
      game = null; $('lobby').hidden = true; $('waiting').hidden = false; $('match').hidden = true;
      $('code-display').textContent = room.code;
      $('waiting-players').replaceChildren(...room.players.map(p => {
        const line = node('div', undefined, 'waiting-player');
        line.append(node('b', `${p.name}${p.id === me ? ' · 나' : ''}${p.id === room.host ? ' · 방장' : ''}`), node('span', !p.connected ? '연결 중' : p.ready ? '✓ 준비 완료' : '기다리는 중')); return line;
      }));
      $('ready').textContent = room.players.find(p => p.id === me)?.ready ? '준비 취소' : '준비하기';
      $('start').hidden = room.host !== me;
      $('start').disabled = room.players.length < 2 || !room.players.every(p => p.ready && p.connected);
    }
  }
  function stream() {
    if (cloud) { if (room) void cloud.watch(room.code); return; }
    source?.close(); source = new EventSource('/api/fruit-bell/events');
    source.onopen = () => { connected = true; status(); };
    source.onmessage = event => { connected = true; try { accept(JSON.parse(event.data).room); } catch (_) { status('테이블 정보를 다시 기다리고 있어요.'); } };
    source.onerror = () => { connected = false; if (room) status('다시 연결하고 있어요. 12초 이상 끊기면 경기가 취소돼요.'); };
  }
  async function connectLocal() {
    try {
      // A static Hosting preview never initializes Firebase or writes student records.
      const response = await fetch('/api/fruit-bell/ping', { signal: AbortSignal.timeout(2500) });
      if (!response.ok || (await response.json()).version !== D.VERSION) throw Error();
      const samples = [];
      for (let i = 0; i < 4; i++) {
        const start = monotonic(), res = await fetch('/api/fruit-bell/ping', { cache: 'no-store', signal: AbortSignal.timeout(2500) });
        const value = await res.json(), end = monotonic(); samples.push({ rtt: end - start, offset: value.serverNow - (start + end) / 2 });
      }
      samples.sort((a, b) => a.rtt - b.rtt); offset = samples[0].offset; rtt = Math.round(samples[0].rtt);
      const session = await request('session'); online = true;
      if (!practice) { me = session.id; stream(); }
      $('online-note').textContent = '로컬 친구 대전 · 같은 서버에서 방 코드로 만나요. 공식 랭킹에는 저장되지 않아요.';
      $('create').disabled = $('join').disabled = false;
      if (session.room && !practice) accept(session.room);
    } catch (_) {
      $('online-note').textContent = '친구 대전은 현재 로컬 플레이테스트 중이에요. 지금은 동물 친구와 연습할 수 있어요.';
    }
  }
  async function connect() {
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (local && new URLSearchParams(location.search).get('emulator') !== '1') return connectLocal();
    try {
      cloudFirebase = await FruitBellNet.load();
      cloud = FruitBellNet.create(cloudFirebase, accept, (value, error) => {
        connected = value;
        if (value) status();
        else status(error?.message || '다시 연결하고 있어요. 35초 이상 끊기면 경기가 취소돼요.');
      });
      $('nickname').readOnly = true;
      $('nickname').value = '';
      $('login-link').hidden = false;
      $('online-note').textContent = '퀴즈타운 로그인 상태를 확인하고 있어요.';
      cloudFirebase.auth().onAuthStateChanged(async user => {
        const token = ++generation;
        cloud.stop(); online = connected = false; $('create').disabled = $('join').disabled = true;
        if (!user) {
          $('login-link').hidden = false; $('nickname').value = '';
          $('ranking-dialog').close(); $('ranking-rows').replaceChildren();
          $('online-note').textContent = '퀴즈타운에 로그인하면 친구와 대전하고 랭킹을 남길 수 있어요.';
          if (room) { room = game = null; $('waiting').hidden = $('match').hidden = true; $('lobby').hidden = false; document.querySelectorAll('dialog[open]').forEach(d => d.close()); }
          return;
        }
        try {
          const session = await cloud.action('session');
          if (token !== generation) return;
          online = connected = true;
          $('nickname').value = session.name; $('login-link').hidden = true;
          $('create').disabled = $('join').disabled = false;
          $('online-note').textContent = `${session.name} 님, 친구에게 방 코드를 알려 주세요. 완료한 대전은 과일종 랭킹에 저장돼요.`;
          if (!practice) { me = session.id; if (session.room) { accept(session.room); void cloud.watch(session.room.code); } }
        } catch (error) {
          if (token !== generation) return;
          $('online-note').textContent = error.message; $('login-link').hidden = false;
        }
      });
      $('ranking-title').textContent = '과일종 랭킹';
      $('rank-open').textContent = '🏆 과일종 랭킹 보기';
      $('result-rank').textContent = '과일종 랭킹 보기';
      $('ranking-note').textContent = '우승 3점 · 공동 우승 1점. 45초 이상 진행하고 모두 직접 참여한 대전만 집계해요. 연습·중도 취소는 제외해요.';
      $('waiting-note').textContent = '친구도 퀴즈타운에 로그인한 뒤 이 코드를 입력하면 돼요.';
    } catch (error) { $('online-note').textContent = error.message; $('login-link').hidden = false; }
  }
  function svgFruit(card) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < card.count; i++) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      svg.setAttribute('aria-hidden', 'true'); use.setAttribute('href', `#fruit-${card.fruit}`); svg.append(use); fragment.append(svg);
    }
    return fragment;
  }
  function enterMatch() {
    $('lobby').hidden = $('waiting').hidden = true; $('match').hidden = false;
    $('mode-label').textContent = practice ? '동물 친구와 연습 · 랭킹 제외' : `친구 대전 · ${room.code}${cloud ? ' · 랭킹전' : ' · 시험 경기'}`;
    $('seats').replaceChildren(); lastEvent = -1; shownResult = false; sentRound = -1;
    practiceEmote = null; nextEmoteAt = 0; $('emote-announcement').textContent = '';
    const selfIndex = game.players.findIndex(p => p.id === me);
    for (let i = 0; i < game.players.length; i++) {
      const p = game.players[(selfIndex + i) % game.players.length], pos = game.players.length === 2 && i === 1 ? 2 : i;
      const seat = node('article', undefined, `seat seat-${pos}${p.id === me ? ' is-me' : ''}`); seat.dataset.id = p.id;
      const heading = node('div', undefined, 'seat-head'), avatar = node('span', avatars[i], 'avatar'), bubble = node('span', '', 'emote-bubble');
      bubble.hidden = true; bubble.setAttribute('aria-hidden', 'true'); avatar.append(bubble);
      heading.append(avatar, node('span', p.name, 'seat-name'));
      const cards = node('div', undefined, 'seat-cards'), deck = node('div', '', 'deck'), wrap = node('div', undefined, 'face-wrap'), face = node('div', undefined, 'face empty');
      face.setAttribute('role', 'img'); wrap.append(face); cards.append(deck, wrap); seat.append(heading, cards, node('div', '', 'seat-meta')); $('seats').append(seat);
    }
    status(); updateEvent();
  }
  async function sendEmote(kind) {
    if (!Object.hasOwn(D.EMOTES, kind) || !game || game.phase !== 'playing' || emotePending || now() < nextEmoteAt || (!practice && !connected)) return;
    const token = generation;
    nextEmoteAt = now() + D.EMOTE_COOLDOWN;
    if (practice) { practiceEmote = { kind, at: now() }; return; }
    emotePending = true;
    try { const value = await request('emote', { kind }); if (token === generation) accept(value.room); }
    catch (error) { if (token === generation) status(error.message); }
    finally { emotePending = false; }
  }
  function drawEmotes(time, playing) {
    const own = practice ? practiceEmote : room?.players.find(p => p.id === me)?.emote;
    const remaining = Math.max(0, nextEmoteAt - time, (own?.at || 0) + D.EMOTE_COOLDOWN - time);
    for (const button of $('emotes').querySelectorAll('button')) button.disabled = !playing || emotePending || remaining > 0 || (!practice && !connected);
    $('emote-hint').textContent = remaining > 0 ? `${Math.ceil(remaining / 1000)}초 뒤에 또!` : '가볍게 한마디';
    for (const seat of $('seats').children) {
      const emote = practice ? (seat.dataset.id === me ? practiceEmote : null) : room?.players.find(p => p.id === seat.dataset.id)?.emote;
      const bubble = seat.querySelector('.emote-bubble');
      bubble.hidden = !playing || !emote || !Object.hasOwn(D.EMOTES, emote.kind) || time >= emote.at + D.EMOTE_DURATION;
      if (!bubble.hidden && bubble.dataset.at !== String(emote.at)) {
        bubble.dataset.at = String(emote.at); bubble.textContent = D.EMOTES[emote.kind];
        $('emote-announcement').textContent = `${game.players.find(p => p.id === seat.dataset.id)?.name}: ${emoteLabels[emote.kind]}`;
      }
    }
  }
  function collectCards(winner) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = [...$('seats').children].find(seat => seat.dataset.id === winner)?.querySelector('.deck');
    if (!target) return;
    const destination = target.getBoundingClientRect();
    for (const face of $('seats').querySelectorAll('.face:not(.empty):not(.back)')) {
      const bounds = face.getBoundingClientRect(), flying = face.cloneNode(true);
      flying.className = 'face flight-card'; flying.setAttribute('aria-hidden', 'true');
      Object.assign(flying.style, { left: bounds.x + 'px', top: bounds.y + 'px', width: bounds.width + 'px', height: bounds.height + 'px' });
      document.body.append(flying);
      const animation = flying.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${destination.x - bounds.x}px, ${destination.y - bounds.y}px) rotate(14deg) scale(.5)`, opacity: 0 }
      ], { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)' });
      animation.finished.catch(() => {}).finally(() => flying.remove());
    }
  }
  function updateEvent() {
    if (!game || game.event.id === lastEvent) return;
    lastEvent = game.event.id; $('message').textContent = game.event.text;
    if (game.event.type === 'flip') tone('flip');
    if (['flip', 'reveal'].includes(game.event.type)) $('ring-feedback').textContent = '';
    if (game.event.type === 'win') { collectCards(game.event.player); $('ring-feedback').textContent = `${game.event.count}장 획득!`; }
    if (game.event.type === 'tie') $('ring-feedback').textContent = '거의 동시에!';
    if (game.event.type === 'miss') { tone('miss'); $('ring-feedback').textContent = '아직 5개가 아니에요'; }
    for (const seat of $('seats').children) {
      seat.classList.toggle('won', game.event.type === 'win' && game.event.player === seat.dataset.id);
      seat.classList.toggle('wrong', game.event.type === 'miss' && game.event.player === seat.dataset.id);
    }
    if (['finished', 'aborted'].includes(game.phase) && !shownResult) showResult();
  }
  function draw() {
    if (game && !$('match').hidden) {
      const time = now(), playing = game.phase === 'playing';
      drawEmotes(time, playing);
      const seconds = Math.max(0, Math.ceil((game.endsAt - time) / 1000));
      $('clock').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      $('bell').disabled = !playing || !game.round || !!game.pending || game.locked.includes(me) || sentRound === game.round || (!practice && !connected) || seconds === 0;
      $('flip').disabled = !playing || !!game.pending || !!game.contest || game.players[game.turn]?.id !== me || time < game.revealAt + 650 || (!practice && !connected) || !game.players[game.turn]?.hand;
      $('bell-caption').textContent = game.pending ? '뒤집는 중…' : '정확히 5개면';
      $('connection').textContent = practice ? '내 차례: F키 · 종 치기: 스페이스바' : `${connected ? `연결됨 · 왕복 약 ${rtt}ms` : '재연결 중…'} · ${cloud ? '온라인 대전' : '서버 도착 기준 시험 판정'}`;
      for (const seat of $('seats').children) {
        const p = game.players.find(player => player.id === seat.dataset.id), index = game.players.indexOf(p);
        seat.classList.toggle('active', playing && game.turn === index);
        const deck = seat.querySelector('.deck'); deck.textContent = p.hand; deck.classList.toggle('empty', !p.hand); deck.setAttribute('aria-label', `남은 덱 ${p.hand}장`);
        seat.querySelector('.seat-meta').textContent = `보유 ${p.total + (game.pending?.seat === index ? 1 : 0)}장 · 성공 ${p.hits}번`;
        const pending = game.pending?.seat === index ? game.pending : null;
        const card = p.card;
        const back = !!pending;
        const key = back ? `back-${game.round}` : card ? `${game.round}-${card.fruit}-${card.count}` : 'empty';
        const face = seat.querySelector('.face');
        if (face.dataset.key !== key) {
          const wasBack = face.classList.contains('back'); face.dataset.key = key;
          face.className = `face ${back ? 'back' : card ? `count-${card.count}${wasBack ? ' revealed' : ''}` : 'empty'}`;
          face.replaceChildren(...(!back && card ? [svgFruit(card)] : []));
          face.setAttribute('aria-label', back ? '카드 뒤집는 중' : card ? `${fruitNames[card.fruit]} ${card.count}개` : '아직 펼친 카드가 없어요');
        }
      }
    }
    requestAnimationFrame(draw);
  }
  function practiceStart() {
    me = 'me'; room = null; cloud?.stop(); source?.close(); source = null;
    practice = D.create([{ id: me, name: '나' }, { id: 'bear', name: '느긋한 곰', bot: true }, { id: 'cat', name: '눈치냥', bot: true }, { id: 'frog', name: '폴짝 개굴', bot: true }], monotonic());
    botRound = -1; botPlans = []; game = D.view(practice); tone('flip'); enterMatch();
  }
  setInterval(() => {
    if (!practice || practice.phase !== 'playing') return;
    const time = monotonic(); D.tick(practice, time);
    if (!practice.pending && practice.round !== botRound) {
      botRound = practice.round;
      botPlans = practice.players.filter(p => p.bot).map(p => ({ id: p.id, at: practice.revealAt + 650 + Math.random() * 1100, tries: D.matches(practice) || Math.random() < .06 }));
    }
    if (!practice.pending) for (const plan of botPlans) if (plan.tries && time >= plan.at) { D.ring(practice, plan.id, botRound, time); plan.tries = false; }
    game = D.view(practice); updateEvent();
  }, 15);
  function ring() {
    if (!game || $('bell').disabled || document.querySelector('dialog[open]')) return;
    sentRound = game.round; feedback();
    if (practice) { D.ring(practice, me, game.round, monotonic()); game = D.view(practice); updateEvent(); }
    else {
      const token = generation;
      request('ring', { round: game.round }).then(value => { if (token === generation) accept(value.room); }).catch(() => { if (token === generation) status('입력을 확인하지 못했어요. 연결 상태를 확인해 주세요.'); });
    }
  }
  function flip() {
    if (!game || $('flip').disabled) return;
    if (practice) { D.flip(practice, me, monotonic()); game = D.view(practice); updateEvent(); }
    else void guarded(async () => accept((await request('flip')).room));
  }
  function showResult() {
    shownResult = true;
    const aborted = game.phase === 'aborted', winner = game.winners?.includes(me), draw = game.winners?.length > 1;
    $('result-title').textContent = aborted ? '잠깐 쉬어 가요' : winner ? (draw ? '함께 우승했어요!' : '딩동! 내가 우승!') : '다음 종은 내 거!';
    $('result-desc').textContent = aborted ? game.event.text : '남은 덱과 내 앞에 쌓인 카드를 합쳤어요.';
    $('result-rows').replaceChildren(...[...game.players].sort((a, b) => b.total - a.total).map(p => {
      const row = node('div', undefined, `result-row${!aborted && game.winners.includes(p.id) ? ' winner' : ''}`), copy = node('div', p.name);
      copy.append(node('small', `성공 ${p.hits} · 오종 ${p.misses}${p.bestReaction !== null ? ` · 가장 빠른 종 ${p.bestReaction}ms` : ''}`)); row.append(copy, node('strong', `${p.total}장`)); return row;
    }));
    $('result-note').textContent = practice ? '연습 경기는 랭킹에 넣지 않아요. 친구와 대전해 보세요!' : aborted ? '취소된 경기는 시험 랭킹에도 저장하지 않아요.' : '이 서버의 시험 랭킹에 반영돼요. 공식 퀴즈타운 랭킹 저장은 아직 열리지 않았어요.';
    if (cloud && !practice) {
      const reasons = { saved: '과일종 랭킹에 저장했어요! 우승 3점 · 공동 우승 1점.', cancelled: '취소된 경기는 랭킹에 넣지 않아요.', short: '45초 미만의 짧은 경기는 랭킹에 넣지 않아요.', 'inactive-play': '모두 한 번 이상 직접 뒤집거나 종을 쳐야 랭킹에 저장돼요.', 'inactive-account': '참가 계정 상태가 바뀌어 랭킹에 저장하지 않았어요.' };
      $('result-note').textContent = reasons[room.rankingStatus] || '경기 기록을 확인하고 있어요.';
      if (room.rankingStatus === 'saved') {
        try { localStorage.setItem('dj48-fruit-bell-ranking-updated', String(Date.now())); } catch (_) {}
      }
    }
    $('result-rank').hidden = !!practice || aborted;
    $('result-dialog').showModal();
  }
  async function reset() {
    if (room) await request('leave');
    generation++; room = game = practice = null; shownResult = false; source?.close(); source = null;
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    $('lobby').hidden = false; $('waiting').hidden = $('match').hidden = true; status();
    if (online) { const session = await request('session'); me = session.id; if (cloud) { connected = true; } else stream(); }
  }
  async function rankings() {
    const token = generation;
    $('ranking-dialog').showModal(); $('ranking-rows').textContent = '기록을 불러오는 중…';
    try {
      if (!online) throw Error(cloud ? '퀴즈타운에 로그인하면 랭킹을 볼 수 있어요.' : '친구 대전용 로컬 서버에서 시험 랭킹을 볼 수 있어요.');
      let rows;
      if (cloud) ({ rows } = await cloud.request('list'));
      else { const res = await fetch('/api/fruit-bell/ranking', { signal: AbortSignal.timeout(4000) }); if (!res.ok) throw Error('랭킹을 불러오지 못했어요.'); ({ rows } = await res.json()); }
      if (token !== generation) return;
      $('ranking-rows').replaceChildren(...rows.map(p => {
        const row = node('div', undefined, 'result-row'), copy = node('div', `${p.rank}위 · ${p.name}`);
        copy.append(node('small', `${p.games}판 · ${p.wins}승 ${Math.max(0, p.games - p.wins - p.draws)}패 · 공동 우승 ${p.draws}회`)); row.append(copy, node('strong', `${p.total}점`)); return row;
      }));
      if (!rows.length) $('ranking-rows').textContent = '아직 마친 친구 대전이 없어요. 첫 테이블을 열어 보세요!';
    } catch (error) { if (token === generation) $('ranking-rows').textContent = error.message; }
  }
  $('practice').addEventListener('click', practiceStart);
  $('create').addEventListener('click', () => guarded(async () => { const session = await request('session'); me = session.id; if (!source) stream(); accept((await request('create', { name: $('nickname').value })).room); }));
  $('join-form').addEventListener('submit', event => { event.preventDefault(); void guarded(async () => { const session = await request('session'); me = session.id; if (!source) stream(); accept((await request('join', { name: $('nickname').value, code: $('room-code').value.trim() })).room); }); });
  $('ready').addEventListener('click', () => guarded(async () => accept((await request('ready', { ready: !room.players.find(p => p.id === me).ready })).room)));
  $('start').addEventListener('click', () => guarded(async () => accept((await request('start')).room)));
  $('leave-room').addEventListener('click', () => guarded(reset));
  $('bell').addEventListener('pointerdown', event => { if (event.button === 0) { event.preventDefault(); ring(); } });
  $('bell').addEventListener('click', event => { if (event.detail === 0) ring(); });
  $('flip').addEventListener('click', flip);
  for (const [kind, emoji] of Object.entries(D.EMOTES)) {
    const button = node('button', undefined, 'emote-button'); button.type = 'button'; button.dataset.emote = kind;
    button.setAttribute('aria-label', `${emoteLabels[kind]} 보내기`);
    button.append(node('span', emoji), node('small', emoteLabels[kind]));
    button.addEventListener('click', event => { void sendEmote(kind); if (event.detail > 0) button.blur(); }); $('emotes').append(button);
  }
  document.addEventListener('keydown', event => {
    if (event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || document.querySelector('dialog[open]') || $('match').hidden) return;
    if (event.target.closest('[data-emote]') && event.code === 'Space') return;
    if (event.code === 'Space') { event.preventDefault(); ring(); }
    if (event.code === 'KeyF') { event.preventDefault(); flip(); }
  });
  $('sound').addEventListener('click', () => { sound = !sound; $('sound').setAttribute('aria-pressed', sound); $('sound').textContent = sound ? '소리 켜짐' : '소리 꺼짐'; if (sound) tone(); });
  $('help').addEventListener('click', () => $('help-dialog').showModal());
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  $('leave').addEventListener('click', () => $('leave-dialog').showModal());
  $('confirm-leave').addEventListener('click', () => guarded(reset));
  $('again').addEventListener('click', () => guarded(reset));
  $('result-dialog').addEventListener('cancel', event => { event.preventDefault(); void guarded(reset); });
  $('rank-open').addEventListener('click', rankings); $('result-rank').addEventListener('click', rankings);
  window.addEventListener('pagehide', () => { source?.close(); cloud?.stop(); });
  window.addEventListener('pageshow', event => { if (event.persisted && online && !practice) stream(); });
  // Read-only inspection for local QA. Never accepted as a server result.
  window.FruitBellApp = { state: () => game, room: () => room };
  void connect(); requestAnimationFrame(draw);
})();
