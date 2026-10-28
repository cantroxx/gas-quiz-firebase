/* Read-only game rankings, sharing the subject ranking cards and profile loader. */
(function () {
  'use strict';
  const BOARD = 'hideout';
  const games = [
    {
      id: 'word-bomb-rank', label: '말폭탄 낱말', icon: '💣', callable: 'wordBombAction', identity: 'member',
      desc: '온라인 경기 우승 횟수 순위 · 같은 횟수는 공동 순위', order: 'wins',
      score: row => `${Number(row.wins) || 0}승`, meta: () => '말폭탄 낱말'
    },
    {
      id: 'study-town-rank', label: '스터디 타운', icon: '🌗',
      href: 'https://dj48-fraction-world.vercel.app/',
      desc: '난이도별 최고 기록 · 보스 → 완료한 방 → 첫 시도 정답률 → 맞힌 문제 수 순서 · 같은 기록은 공동 순위',
      callable: 'studyTownAction', identity: 'member',
      tiers: { beginner: '초보', intermediate: '중수', advanced: '고수' },
      score: row => `보스 ${Number(row.bosses) || 0}명 · 방 ${Number(row.rooms) || 0}개`,
      meta: row => `첫 정답률 ${row.attempts ? Math.round(row.correct / row.attempts * 1000) / 10 : 0}% · ${Number(row.correct) || 0}/${Number(row.attempts) || 0}문제`
    },
    {
      id: 'mathsurvivor-rank', label: '퀴즈 서바이버', icon: '✏️', href: '/mathsurvivor/',
      desc: '최고 점수 순위예요. 같은 점수는 공동 순위로 표시해요.',
      path: ['mathsurvivorRanking'], order: 'bestScore', identity: 'uid',
      score: row => `${Number(row.bestScore) || 0}점`,
      meta: row => `${Number(row.plays) || 0}판 · 정답률 ${Number(row.accPct) || 0}%${row.bestVictory ? ' · 생존 성공' : ''}`
    },
    {
      id: 'town-marble-rank', label: '두근두근 마블', icon: '🎲', href: '/town-marble/?mode=online',
      desc: '3분 이상 진행한 온라인 경기 · 단독 우승 3점 / 공동 우승 1점 · 같은 점수는 공동 순위 · 연습 제외',
      path: ['townMarbleRanking', 'town-v1', 'entries'], order: 'total', identity: 'member',
      score: row => `${Number(row.total) || 0}점`,
      meta: row => `${Number(row.games) || 0}판 · ${Number(row.wins) || 0}승 · 공동 ${Number(row.draws) || 0}회`
    },
    {
      id: 'cloud-tower-rank', label: '타닥타닥 구름탑', icon: '☁️', href: '/cloud-tower/',
      desc: '챌린지·실시간 레이스 최고 기록 · 점수 → 정확도 → 짧은 시간순',
      path: ['cloudTowerRanking', 'cloud-120-v1', 'entries'], order: 'sortKey', identity: 'uid',
      score: row => `${Number(row.score) || 0}점`,
      meta: row => `${Number(row.floor) || 0}층 · 정확도 ${Number(row.accuracy) || 0}%`
    },
    {
      id: 'fruit-bell-rank', label: '딩동! 과일종', icon: '🔔',
      desc: '90초 카드 대결 · 우승 3점 / 공동 우승 1점 · 45초 이상 모두 직접 참여한 경기 · 연습·취소 제외',
      localTrial: ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('emulator') !== '1',
      callable: 'fruitBellAction', identity: 'member', order: 'total',
      score: row => `${Number(row.total) || 0}점`,
      meta: row => `${Number(row.games) || 0}판 · ${Number(row.wins) || 0}승 ${Math.max(0, (Number(row.games) || 0) - (Number(row.wins) || 0) - (Number(row.draws) || 0))}패 · 공동 우승 ${Number(row.draws) || 0}회`
    }
  ];
  const TTL = 60000;
  const dailyGame = () => games[Math.floor((Date.now() + 9 * 3600000) / 86400000) % games.length];
  function renderHall() {
    const grid = document.querySelector('.ranking-hall-grid');
    if(!grid) return;
    grid.querySelector('[data-hideout-king]')?.remove();
    const game = dailyGame(), state = states.get(game.id), winner = state.rows?.[0];
    const card = window.DJ48RankingRender.createRankingCard({ icon: game.icon, category: '아지트왕 · ' + game.label,
      rank: winner ? '1위' : '', nickname: winner ? window.DJ48RankingRender.normalizeRankingDisplayName(winner) : '—',
      title: winner ? game.score(winner) : state.message || '오늘의 분야 · 아직 기록이 없어요' });
    card.dataset.hideoutKing = game.id; grid.append(card);
  }
  const states = new Map(games.map(game => [game.id, { rows: null, loading: false, message: '', tier: 'beginner', request: 0, cache: new Map() }]));
  let generation = 0, selected = games[0].id, active = false;
  const rootId = game => `${game.id}-rows`;
  const visible = game => {
    const root = document.getElementById(rootId(game));
    return Boolean(root && !root.closest('[hidden]'));
  };

  async function enrichRows(db, game, docs) {
    // UID-based games predate member IDs in their records. Presence supplies only
    // a lookup hint; verify it against the profile's authUid before using it.
    const rows = await Promise.all(docs.map(async doc => {
      const row = { ...doc.data(), recordId: doc.id, memberUserId: '' };
      if(game.identity === 'member') row.memberUserId = doc.id;
      else {
        const presence = await window.DJ48RankingRepository.readRankingDocument(db, `presence/${doc.id}`).catch(() => null);
        row.memberUserId = String(presence?.data()?.memberUserId || '');
      }
      return row;
    }));
    const repository = window.DJ48RankingRepository;
    const profiles = await repository.loadMemberProfilesForRankingRowsForDb(db, rows, {
      getFirebaseStorage: () => window.firebase.storage?.() || null
    });
    return rows.map(row => {
      const profile = profiles[row.memberUserId];
      if(game.identity === 'uid' && (!profile || profile.authUid !== row.recordId)) {
        return { ...row, memberUserId: '' };
      }
      return window.DJ48RankingData.mergeRankingRowWithMemberProfile(row, profiles);
    }).filter(repository.isPublicRankingRowVisible).slice(0, 50);
  }

  function render(game) {
    if(game.id === dailyGame().id) renderHall();
    const root = document.getElementById(rootId(game));
    if(!root) return;
    root.replaceChildren();
    const state = states.get(game.id);
    const message = game.unavailable || state.message;
    if(message || !state.rows?.length) {
      const empty = document.createElement('p');
      empty.className = 'ranking-board-empty';
      empty.textContent = message || '아직 표시할 기록이 없어요. 첫 도전에 나서 보세요!';
      root.append(empty);
      if(!state.rows?.length) return;
    }
    const tiers = { bronze: '브론즈', silver: '실버', gold: '골드' };
    window.DJ48RankingRender.renderRankingRows(root, state.rows, {
      ...game, showRowAvatars: true,
      rank: row => game.callable ? row.rank : state.rows.findIndex(other => other[game.order] === row[game.order]) + 1,
      meta: row => {
        const tier = tiers[row.tier] || row.tier || '';
        return [game.meta(row), tier ? `${tier} 등급` : ''].filter(Boolean).join(' · ');
      }
    }, window.getRankingRenderDeps?.() || {
      getLevelMedalAsset: level => window.DJ48LevelMedalAssets?.getLevelMedalAsset(level)
    });
  }

  async function load(game, force = false, hall = false) {
    if(game.unavailable || (!hall && !visible(game))) return;
    const state = states.get(game.id);
    if(state.loading) return;
    if(game.localTrial) {
      const stamp = generation, request = ++state.request;
      const cached = state.cache.get('local');
      if(cached && !force && Date.now() - cached.at < TTL) { state.rows = cached.rows; state.message = ''; render(game); return; }
      state.loading = true; state.message = '시험 기록을 불러오는 중…'; render(game);
      try {
        const response = await fetch('/api/fruit-bell/ranking', { signal: AbortSignal.timeout(4000) });
        if(!response.ok) throw Error('local-server-unavailable');
        const value = await response.json();
        if(value.mode !== 'local' || !Array.isArray(value.rows)) throw Error('invalid-trial-ranking');
        if(stamp !== generation || request !== state.request) return;
        state.rows = value.rows; state.message = '';
        state.cache.set('local', { rows: state.rows, at: Date.now() });
      } catch (_) {
        if(stamp !== generation || request !== state.request) return;
        state.rows = null; state.message = '과일종 로컬 서버를 실행하면 시험 랭킹을 볼 수 있어요. 공식 학생 기록에는 반영되지 않아요.';
      } finally {
        if(stamp === generation && request === state.request) { state.loading = false; render(game); }
      }
      return;
    }
    if(!window.firebase?.auth?.().currentUser) {
      state.rows = null;
      state.message = '퀴즈타운 로그인 후 랭킹을 볼 수 있어요.';
      render(game);
      return;
    }
    const stamp = generation;
    const request = ++state.request;
    const current = () => stamp === generation && request === state.request;
    const tier = state.tier;
    const cached = state.cache.get(tier);
    state.rows = cached?.rows || null;
    if(cached && !force && Date.now() - cached.at < TTL) {
      state.message = ''; render(game); return;
    }
    if(force) window.DJ48RankingRepository.clearRankingReadCache();
    state.loading = true;
    state.message = '기록을 불러오는 중…';
    render(game);
    try {
      const db = window.firebase.firestore();
      let docs;
      if(game.callable) {
        const functions = window.getFirebaseFunctions?.() || window.firebase.functions('asia-northeast3');
        const result = await functions.httpsCallable(game.callable)({ action: 'list', tier });
        docs = (result.data.rows || []).slice(0, 50).map(row => ({ id: row.memberUserId || row.memberId || '', data: () => row }));
      } else {
        let query = db.collection(game.path[0]);
        if(game.path.length > 1) query = query.doc(game.path[1]).collection(game.path[2]);
        const snapshot = await query.orderBy(game.order, 'desc').limit(51).get();
        docs = snapshot.docs;
      }
      if(!current()) return;
      const rows = await enrichRows(db, game, docs);
      if(!current()) return;
      state.rows = rows;
      state.cache.set(tier, { rows, at: Date.now() });
      state.message = '';
    } catch (_) {
      if(!current()) return;
      state.message = '랭킹을 불러오지 못했어요. 연결을 확인한 뒤 새로고침해 주세요.';
    } finally {
      if(current()) { state.loading = false; render(game); }
    }
  }

  function inject(root) {
    const tabs = root.querySelector('.ranking-board-tabs');
    const panels = root.querySelector('.ranking-board-panels');
    if(!tabs || !panels || tabs.querySelector(`[data-ranking-board-id="${BOARD}"]`)) return;
    const tab = document.createElement('button');
    tab.type = 'button'; tab.className = 'ranking-board-tab';
    tab.dataset.rankingBoardId = BOARD; tab.textContent = '아지트 랭킹';
    tab.classList.toggle('is-active', active);
    tabs.append(tab);
    const panel = document.createElement('section');
    panel.className = 'ranking-board-panel'; panel.dataset.rankingBoardPanel = BOARD; panel.hidden = !active;
    const header = document.createElement('div'); header.className = 'ranking-board-header';
    const title = document.createElement('h3'); title.textContent = '🎮 아지트 랭킹';
    const desc = document.createElement('p'); desc.textContent = '분야별 기록과 친구들의 프로필을 만나 보세요.';
    header.append(title, desc);
    const subTabs = document.createElement('div'); subTabs.className = 'ranking-sub-tabs';
    panel.append(header, subTabs);
    for(const game of games) {
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'ranking-sub-tab'; button.classList.toggle('is-active', selected === game.id);
      button.dataset.rankingSubGroupId = game.id; button.dataset.rankingParentBoardId = BOARD;
      button.textContent = `${game.icon} ${game.label}`; subTabs.append(button);
      const sub = document.createElement('div'); sub.className = 'ranking-sub-panel';
      sub.dataset.rankingSubPanel = game.id; sub.hidden = selected !== game.id;
      const intro = document.createElement('p'); intro.textContent = game.desc;
      const actions = document.createElement('div'); actions.className = 'hideout-ranking-actions';
      if(!game.unavailable) {
        const refresh = document.createElement('button'); refresh.type = 'button';
        refresh.className = 'mini-pill-button'; refresh.textContent = '새로고침';
        refresh.addEventListener('click', () => load(game, true)); actions.append(refresh);
      }
      const list = document.createElement('div'); list.id = rootId(game); list.setAttribute('aria-live', 'polite');
      sub.append(intro, actions);
      if(game.tiers) {
        const choices = document.createElement('div'); choices.className = 'ranking-sub-tabs';
        choices.setAttribute('aria-label', '스터디 타운 난이도');
        for(const [tier, label] of Object.entries(game.tiers)) {
          const choice = document.createElement('button'); choice.type = 'button';
          choice.className = 'mini-pill-button'; choice.textContent = label;
          choice.setAttribute('aria-pressed', states.get(game.id).tier === tier);
          choice.addEventListener('click', () => {
            const state = states.get(game.id);
            if(state.tier === tier) return;
            state.tier = tier; state.loading = false;
            choices.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', button === choice));
            load(game);
          });
          choices.append(choice);
        }
        sub.append(choices);
      }
      sub.append(list); panel.append(sub);
    }
    if(active) {
      tabs.querySelectorAll('[data-ranking-board-id]').forEach(button => button.classList.toggle('is-active', button === tab));
      panels.querySelectorAll('[data-ranking-board-panel]').forEach(other => { other.hidden = true; });
    }
    panels.append(panel);
    games.forEach(render);
  }

  function init() {
    const root = document.getElementById('ranking-board-root');
    if(!root) return;
    root.addEventListener('click', event => {
      const tab = event.target.closest('[data-ranking-board-id]');
      if(tab) active = tab.dataset.rankingBoardId === BOARD;
      const sub = event.target.closest(`[data-ranking-parent-board-id="${BOARD}"]`);
      if(sub) selected = sub.dataset.rankingSubGroupId;
    });
    inject(root);
    const hallGrid = document.getElementById('ranking-card-grid');
    if(hallGrid) new MutationObserver(() => { renderHall(); }).observe(hallGrid, { childList: true });
    document.addEventListener('toggle', event => {
      if(event.target.id === 'spatial-panel-hall' && event.newState === 'open') { renderHall(); load(dailyGame(), false, true); }
    }, true);
    new MutationObserver(() => inject(root)).observe(root, { childList: true });
    games.filter(game => !game.unavailable).forEach(game => window.DJ48RankingVisibility.register(rootId(game), () => load(game)));
    const invalidate = () => {
      generation++;
      window.DJ48RankingRepository.clearRankingReadCache();
      games.forEach(game => {
        Object.assign(states.get(game.id), { rows: null, loading: false, message: '', cache: new Map() });
        render(game); load(game);
      });
    };
    window.firebase?.auth?.().onAuthStateChanged(invalidate);
    window.addEventListener('dj48-ranking-invalidated', invalidate);
    window.addEventListener('storage', event => { if(event.key === 'dj48-fruit-bell-ranking-updated') invalidate(); });
    const rankingParams = new URLSearchParams(location.search);
    const rankingShortcut = rankingParams.get('fruitBellRanking') === '1' ? ['fruitBellRanking', 'fruit-bell-rank'] : rankingParams.get('townMarbleRanking') === '1' ? ['townMarbleRanking', 'town-marble-rank'] : null;
    if(rankingShortcut) {
      let opened = false;
      const timer = setInterval(async () => {
        if(!window.DJ48AccountState?.getCurrentMemberProfile?.() || typeof window.showRankingView !== 'function') return;
        if(!opened) { opened = true; await window.showRankingView(); }
        const button = root.querySelector(`[data-ranking-sub-group-id="${rankingShortcut[1]}"]`);
        if(!button || document.getElementById('ranking-view')?.hidden) return;
        root.querySelector(`[data-ranking-board-id="${BOARD}"]`)?.click(); button.click(); clearInterval(timer);
        const url = new URL(location.href); url.searchParams.delete(rankingShortcut[0]); history.replaceState(null, '', url);
      }, 700);
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
