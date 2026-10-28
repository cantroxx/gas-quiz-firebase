/* Shared school rooms. Personal progress is never inferred from a link visit. */
(function () {
  'use strict';
  const rooms = {
    subjects: ['📚', '과목 퀴즈', '배운 내용을 익히는 연습 교실', '국어·수학·사회·과학을 고르고, 기초 연습부터 독서와 탐구까지 도전해요.'],
    learning: ['🔎', '학습 퀴즈', '직접 해 보는 학습 탐험', '탐사하고, 계산하고, 선택하며 배워요. 활동은 별도 사이트의 새 탭에서 열려요.'],
    popular: ['⭐', '인기 퀴즈', '좋아하는 사진으로 즐기는 퀴즈 클럽', '국기·아이돌·애니·티니핑·포켓몬! 시간 제한 없이 연습하고 랭킹에 도전해요.'],
    games: ['🎲', '게임 아지트', '함께 놀고 도전하는 휴게실', '혼자 차근차근, 또는 친구와 함께 한 판!']
  };
  // Presentation labels only. Quiz IDs, availability and reward/ranking rules stay in their existing catalogs.
  const quizActivityLabels = {
    reading: '독서 · 책 고르기', spelling: '기초 연습 · 맞춤법', 'word-relation': '기초 연습 · 낱말 뜻',
    spacing: '기초 연습 · 띄어쓰기', proverb: '어휘 넓히기 · 속담', idiom: '어휘 넓히기 · 사자성어',
    'random-basic': '기초 연습 · 계산', 'fraction-basic': '기초 연습 · 분수',
    calculation_practice: '기초 연습 · 계산',
    samgukji: '확장 읽기 · 삼국지 이야기', 'ancient-history': '확장 탐구 · 고대사',
    'history-people': '확장 탐구 · 역사 인물', 'unified-silla-balhae': '확장 탐구 · 한국사',
    cultural_heritage: '확장 탐구 · 문화유산', 'science-general': '생활 탐구 · 과학 상식',
    emoji: '그림 추리 · 이모지', 'flag-country': '그림 관찰 · 세계 국기', 'snack-food': '그림 관찰 · 간식',
    idol: '인물 알아보기', anime: '캐릭터 알아보기', tiniping: '캐릭터 알아보기',
    pokemon: '캐릭터 · 세대별 도전', 'dad-joke': '말놀이 · 수수께끼'
  };
  const subjectGuides = {
    korean: '4학년 국어 단원과 초등 맞춤법을 연습해요. 모든 정답은 국어 통합 랭킹에 모여요.',
    math: '아이스크림 4학년 수학의 단원별로 수와 조건이 달라지는 문제를 풀어요.',
    social: '비상 4학년 사회와 한국사·세계사를 배워요. 사진 맞히기는 포함하지 않아요.',
    science: '비상 4학년 과학의 개념과 실험 상황을 단원별로 알아봐요.'
  };
  const games = [
    ['sumbit', '🦎', '숨빛', '주변의 색으로 몸을 칠하고 숨어요. 과자 숲과 창작 정원에서 위장 숨바꼭질!', '/sumbit/', '학생 2~22명 · 교사 진행', '', 'together'],
    ['samgukji', '⚔️', '삼국지 조조전', '장수를 지휘하고 선택으로 이야기를 바꾸는 턴제 전술 모험.', 'https://dj48-samgukji.web.app/', '혼자 하기 · 30장', '이 브라우저에 저장', 'solo'],
    ['fruit-bell', '🔔', '딩동! 과일종', '같은 과일이 딱 5개! 먼저 종을 쳐서 카드를 가져와요.', '/fruit-bell/', '봇 연습 · 2~4인 온라인', '아지트 랭킹', 'both'],
    ['cloud', '☁️', '타닥타닥 구름탑', '타자로 달리고 점프하며 하늘섬을 올라요.', '/cloud-tower/', '혼자 · 2~4인', '아지트 랭킹', 'both'],
    ['marble', '🎲', '두근두근 마블', '도시를 사고 건물을 세우는 세계여행을 떠나요.', '/town-marble/?mode=online', '2~4인 온라인', '아지트 랭킹', 'together'],
    ['bomb', '💣', '두근두근 말폭탄', '끝말잇기로 폭탄을 넘겨요. 봇과 연습할 수도 있어요.', '/word-bomb/', '봇 연습 · 2~8인', '', 'both'],
    ['study', '🌗', '균열의 탑', '문제를 풀고 무기와 유물을 모으며 도전하는 생존 액션 게임.', 'https://dj48-fraction-world.vercel.app/', '혼자 도전', '아지트 랭킹', 'solo'],
    ['baseball', '⚾', '프로야구 구단주', '선수를 훈련하고 나만의 구단을 운영해요.', 'https://kbo-owner.vercel.app/', '혼자 운영', '', 'solo'],
    ['survivor', '✏️', '퀴즈 서바이버', '문제를 풀며 강해지는 10분 생존 대작전!', '/mathsurvivor/', '혼자 도전', '아지트 랭킹', 'solo']
  ];
  let deps = {}, request = 0, current = '', scope = '', configCache, configAt = 0, configPromise;
  let subject = 'korean', popularFilter = 'all', gameFilter = 'all';
  const positions = new Map(), recent = new Map();
  function el(tag, cls, text) { const node = document.createElement(tag); if(cls) node.className = cls; if(text !== undefined) node.textContent = text; return node; }
  function button(text, action, cls = 'room-button') { const node = el('button', cls, text); node.type = 'button'; node.addEventListener('click', action); return node; }
  function key() { return `${current}:${current === 'subjects' ? subject : current === 'popular' ? popularFilter : current === 'games' ? gameFilter : ''}`; }
  function savePosition() { if(current && !document.getElementById('school-room-view')?.hidden) positions.set(key(), window.scrollY); }
  function ensureScope() { const next = deps.memberId?.() || ''; if(next !== scope) { scope = next; recent.clear(); positions.clear(); subject = 'korean'; popularFilter = gameFilter = 'all'; } }
  function remember(id) { savePosition(); recent.set(current, id); }
  async function loadConfig(force = false) {
    if(configPromise) return configPromise;
    if(configCache && !force && Date.now() - configAt < 60000) return configCache;
    const pending = deps.loadConfig(force || Boolean(configCache)).then(value => { configCache = value; configAt = Date.now(); return value; }).finally(() => { if(configPromise === pending) configPromise = null; });
    configPromise = pending; return pending;
  }
  async function refreshLabel(force = true) {
    // Compatibility hook for the app shell. Concept entrance has been retired.
  }
  function tabs(root, options, selected, select) {
    const nav = el('nav', 'room-filters'); nav.setAttribute('aria-label', '활동 분류');
    for(const [id, label] of options) { const item = button(label, () => { savePosition(); select(id); }, 'room-filter'); item.setAttribute('aria-pressed', id === selected); nav.append(item); } root.append(nav);
  }
  function card(icon, name, description, tags = []) {
    const node = el('article', 'room-card'), visual = el('div', 'room-card-visual'), content = el('div', 'room-card-content');
    visual.setAttribute('aria-hidden', 'true'); visual.append(el('span', '', icon));
    content.append(el('h3', '', name), el('p', 'room-card-desc', description));
    const badges = el('div', 'room-tags'); tags.filter(Boolean).forEach(tag => badges.append(el('span', '', tag))); content.append(badges);
    const actions = el('div', 'room-card-actions'); content.append(actions); node.append(visual, content); return { node, actions };
  }
  function isSubjectPath(href) { try { const url = new URL(href, location.href); return url.origin === location.origin && url.pathname === '/subject-quiz/'; } catch (_) { return false; } }
  function isPopularPath(href) { try { const url = new URL(href, location.href); return url.origin === location.origin && url.pathname === '/popular-quiz/'; } catch (_) { return false; } }
  function link(text, href, id) {
    const node = el('a', 'room-button', text); node.href = href; if(!isSubjectPath(href) && !isPopularPath(href)) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
    node.addEventListener('click', () => remember(id)); return node;
  }
  function status(root, text, retry) { const node = el('div', 'room-status'); node.setAttribute('role', 'status'); node.append(el('p', '', text)); if(retry) node.append(button('다시 불러오기', retry)); root.append(node); }
  function recentStrip(root, items, activate) {
    const last = items.find(item => item.id === recent.get(current)); if(!last) return;
    const strip = el('aside', 'room-recent'); strip.append(el('span', '', '최근 열어본 활동'), el('strong', '', last.title), button('다시 열기 →', () => activate(last), 'room-button room-button-quiet')); root.append(strip);
  }
  function renderQuizzes(root) {
    const render = deps.getRenderDeps(), catalog = render.quizCatalog;
    if(current === 'subjects') tabs(root, ['korean', 'math', 'social', 'science'].map(id => [id, deps.subjectCatalog[id].title.replace(' 퀴즈', '')]), subject, id => { subject = id; open('subjects', { preservePosition: true }); });
    const category = current === 'popular' ? 'popular' : subject; deps.setSubject?.(category);
    const guide = el('aside', 'room-purpose');
    guide.append(el('strong', '', current === 'subjects' ? '무엇을 배울까요?' : '어떻게 즐길까요?'), el('p', '', current === 'subjects' ? subjectGuides[category] : '한 판 20문제, 시간 제한은 없어요. 연습 20문제를 모두 해결하면 XP·코인을 한 번 받아요.'));
    root.append(guide);
    const group = id => ['pokemon', 'tiniping', 'idol', 'anime'].includes(id) ? 'characters' : ['emoji', 'flag-country', 'snack-food'].includes(id) ? 'pictures' : 'trivia';
    const items = (deps.subjectCatalog[category]?.quizzes || []).filter(id => catalog[id] && render.isQuizEnabledByFlags(id)).map(id => ({ id, ...catalog[id] }));
    recentStrip(root, items.filter(item => item.enabled !== false), item => { remember(item.id); if(isSubjectPath(item.standalonePath) || isPopularPath(item.standalonePath)) location.assign(item.standalonePath); else if(item.standalonePath) window.open(item.standalonePath, '_blank', 'noopener,noreferrer'); else deps.showQuizSelectView(item.id); });
    const visible = items;
    root.append(el('h3', 'room-section-title', `${current === 'subjects' ? deps.subjectCatalog[category].title : '골라 보는 즐거움'} · ${visible.length}개`));
    const grid = el('div', 'room-grid'); root.append(grid);
    for(const item of visible) {
      const modes = item.modes || [], hub = modes.some(mode => /Hub$/.test(mode));
      const playable = item.enabled !== false && (item.standalonePath || hub || render.firebasePlayableQuizIds.has(render.normalizeFirebaseQuizId(item.id)));
      const { node, actions } = card(item.icon || '📘', item.title.replace(/ 퀴즈$/, ''), item.desc || '', [quizActivityLabels[item.id], isPopularPath(item.standalonePath) ? '연습전·랭킹전' : hub ? '종류를 골라요' : isSubjectPath(item.standalonePath) ? '단원별 연습·랭킹' : item.standalonePath ? '새 탭에서 참여' : '문제 풀기']);
      if(!playable) { const disabled = button('준비 중', () => {}); disabled.disabled = true; actions.append(disabled); }
      else if(isPopularPath(item.standalonePath)) {
        actions.append(link('연습전', item.standalonePath + '&mode=practice', item.id));
        if(render.featureFlags?.rankingEnabled !== false || deps.isAdmin()) actions.append(link('랭킹전', item.standalonePath + '&mode=ranking', item.id));
      }
      else if(item.standalonePath) actions.append(link(isSubjectPath(item.standalonePath) ? '퀴즈 시작 →' : '활동 열기 ↗', item.standalonePath, item.id));
      else if(hub) actions.append(button('골라보기 →', () => { remember(item.id); deps.showQuizSelectView(item.id); }));
      else {
        const start = async (mode, ranking = 'normal') => {
          remember(item.id); deps.setLastQuiz?.(item.id); actions.querySelectorAll('button').forEach(item => { item.disabled = true; });
          try { await deps.startQuiz(item.id, mode, ranking); } catch (_) { window.alert('퀴즈를 시작하지 못했어요. 다시 시도해 주세요.'); }
          finally { actions.querySelectorAll('button').forEach(item => { item.disabled = false; }); }
        };
        if(modes.includes('practice')) actions.append(button('연습하기', () => start('practice')));
        if(modes.includes('ranking') && (render.featureFlags?.rankingEnabled !== false || deps.isAdmin())) {
          const details = el('details', 'room-ranking-modes'); details.append(el('summary', 'room-button room-button-quiet', '랭킹전')); const choices = el('div', 'room-mode-options');
          for(const option of render.getRankingModeOptionsForQuiz(item.id)) choices.append(button(option.label, () => start('ranking', option.value), 'room-mode-button'));
          details.append(choices); actions.append(details);
        }
      }
      grid.append(node);
    }
    if(!visible.length) status(root, '지금 열 수 있는 퀴즈가 없어요. 다른 분류를 골라 보세요.');
  }
  function renderGames(root) {
    tabs(root, [['all', '전체'], ['solo', '혼자 하기'], ['together', '함께 하기']], gameFilter, id => { gameFilter = id; open('games', { preservePosition: true }); });
    root.append(el('p', 'room-hint', '게임은 새 탭에서 열려요. 이 탭으로 돌아오면 고르던 목록이 그대로 있어요.'));
    recentStrip(root, games.map(row => ({ id: row[0], title: row[2], href: row[4] })), item => { remember(item.id); window.open(item.href, '_blank', 'noopener,noreferrer'); });
    const grid = el('div', 'room-grid'); root.append(grid);
    for(const [id, icon, title, desc, href, players, rank, type] of games) {
      if(gameFilter !== 'all' && type !== 'both' && type !== gameFilter) continue;
      const item = card(icon, title, desc, [players, rank]); item.actions.append(link('게임 열기 ↗', href, id)); grid.append(item.node);
    }
  }
  async function open(hub, options = {}) {
    if(!rooms[hub] || !deps.enterView) return;
    if(hub === 'popular') { window.location.assign('/popular-quiz/'); return; }
    ensureScope(); if(!options.preservePosition) savePosition(); const id = ++request;
    if(id !== request) return;
    current = hub; if(options.subject) subject = options.subject;
    const root = document.getElementById('school-room-view'); root.dataset.room = hub; root.replaceChildren();
    const toolbar = el('div', 'room-toolbar'); toolbar.append(button('← 학교로 돌아가기', () => { savePosition(); ++request; deps.showSchoolView(); }, 'room-back'), el('span', 'room-breadcrumb', `학교 / ${rooms[hub][1]}`));
    const nav = el('nav', 'room-navigation'); nav.setAttribute('aria-label', '학교 공간');
    for(const [name, room] of Object.entries(rooms)) { const tab = button(`${room[0]} ${room[1]}`, () => open(name), 'room-nav-button'); if(name === hub) tab.setAttribute('aria-current', 'page'); nav.append(tab); }
    const hero = el('header', 'room-hero'), copy = el('div', 'room-hero-copy'), title = el('h2', '', rooms[hub][1]); title.id = 'school-room-title'; title.tabIndex = -1;
    copy.append(el('p', 'room-eyebrow', rooms[hub][2]), title, el('p', '', rooms[hub][3]));
    const art = el('div', 'room-hero-art'); art.setAttribute('aria-hidden', 'true'); art.append(el('span', '', rooms[hub][0]), el('i', 'room-art-book'), el('i', 'room-art-dot'));
    hero.append(copy, art); const body = el('div', 'room-body'); root.append(toolbar, nav, hero, body);
    deps.enterView({ viewId: 'school-room-view', placeKey: 'school' }); title.focus({ preventScroll: true });
    const restore = () => requestAnimationFrame(() => { if(id === request && !root.hidden) window.scrollTo({ top: positions.get(key()) || 0, behavior: 'instant' }); });
    if(hub === 'games') { renderGames(body); restore(); return; }
    status(body, '활동을 불러오는 중…');
    try {
      const flags = await deps.loadFlags(); if(id !== request || root.hidden) return; body.replaceChildren();
      if(hub === 'subjects' || hub === 'popular') { renderQuizzes(body); restore(); return; }
      if(flags.externalQuizzesEnabled === false && !deps.isAdmin()) { status(body, '학습 퀴즈는 지금 점검 중이에요.'); return; }
      status(body, '활동을 불러오는 중…'); const config = await loadConfig(options.refresh === true); if(id !== request || root.hidden) return; body.replaceChildren();
      const items = (config.items || []).filter(item => item.active !== false && (item.group || 'learning') === hub).filter(item => { try { return new URL(item.url).protocol === 'https:'; } catch (_) { return false; } }).map(item => ({ ...item, id: item.id || item.url }));
      recentStrip(body, items, item => { remember(item.id); window.open(item.url, '_blank', 'noopener,noreferrer'); });
      body.append(el('h3', 'room-section-title', '직접 해 보는 배움')); const grid = el('div', 'room-grid'); body.append(grid);
      if(hub === 'learning') {
        const guide = el('aside', 'room-purpose');
        guide.append(el('strong', '', '활동을 고르기 전에'), el('p', '', '활동마다 입장 방법과 기록 저장 방식이 달라요. 열린 사이트의 안내를 확인하고, 다른 활동을 고르려면 이 탭으로 돌아오세요.'));
        body.insertBefore(guide, grid);
      }
      for(const item of items) { const view = card('🔎', item.title, item.description || '새로운 활동을 열고 직접 탐험해 보세요.', ['체험·탐험 활동', '새 탭에서 열림']); view.actions.append(link('활동 열기 ↗', item.url, item.id)); grid.append(view.node); }
      if(!items.length) status(body, '아직 등록된 활동이 없어요. 새로운 소식을 기다려 주세요.');
      body.append(button('목록 새로고침', () => open(hub, { refresh: true }), 'room-back')); restore();
    } catch (_) { if(id === request && !root.hidden) { body.replaceChildren(); status(body, '활동을 불러오지 못했어요. 다시 시도해 주세요.', () => open(hub, { refresh: true })); } }
  }
  document.addEventListener('click', event => { const door = event.target.closest('#school-quiz-grid [data-school-hub]'); if(door) open(door.dataset.schoolHub); });
  document.addEventListener('keydown', event => { if(event.target.tagName === 'BUTTON' || !['Enter', ' '].includes(event.key)) return; const door = event.target.closest('#school-quiz-grid [data-school-hub]'); if(door) { event.preventDefault(); door.click(); } });
  window.DJ48SchoolHubs = { open, refresh: () => open(current, { refresh: true }), refreshLabel, configure(value) { deps = value; ensureScope(); refreshLabel(false); } };
})();
