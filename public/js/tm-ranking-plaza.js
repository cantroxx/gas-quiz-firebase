/* 두근두근 마블: 서버 확정 결과만 읽는 온라인 대전 하위 탭. */
(function () {
  'use strict';
  const SUB = 'town-marble-rank', ROOT = 'town-marble-ranking-root';
  let rows = null, loading = false, generation = 0;
  function render(message) {
    const root = document.getElementById(ROOT); if (!root) return;
    root.replaceChildren();
    if (message || !rows?.length) {
      const p = document.createElement('p'); p.className = 'wb-rank-empty';
      p.textContent = message || '아직 마블 기록이 없어요. 친구와 첫 세계여행을 떠나 보세요!'; root.append(p); return;
    }
    rows.forEach((row, index) => {
      const item = document.createElement('div'); item.className = 'wb-rank-row' + (index < 3 ? ' top' : '');
      const rank = rows.findIndex(other => other.total === row.total) + 1;
      for (const [cls, text] of [['wb-rank-pos', rank + '위'], ['wb-rank-name', row.name || '여행가'],
        ['wb-rank-meta', `${row.games || 0}판 · ${row.wins || 0}승 · 공동 ${row.draws || 0}회`], ['wb-rank-total', `${row.total || 0}점`]]) {
        const span = document.createElement('span'); span.className = cls; span.textContent = text; item.append(span);
      }
      root.append(item);
    });
  }
  async function load() {
    if (window.DJ48RankingVisibility && !window.DJ48RankingVisibility.isVisible(ROOT)) return;
    if (loading) return;
    if (!window.firebase?.auth().currentUser) { rows = null; render('퀴즈타운 로그인 후 랭킹을 볼 수 있어요.'); return; }
    loading = true; const stamp = ++generation; render('여행 기록을 불러오는 중…');
    try {
      const snap = await window.firebase.firestore().collection('townMarbleRanking').doc('town-v1').collection('entries').orderBy('total', 'desc').limit(50).get();
      if (stamp !== generation) return; rows = snap.docs.map(doc => doc.data()); render();
    } catch (_) { if (stamp === generation) render('랭킹을 불러오지 못했어요. 퀴즈타운 로그인과 연결을 확인해 주세요.'); }
    finally { if (stamp === generation) loading = false; }
  }
  function inject() {
    const panel = document.querySelector('[data-ranking-board-panel="wordbattle"]'), tabs = panel?.querySelector('.ranking-sub-tabs');
    if (!tabs || tabs.querySelector(`[data-ranking-sub-group-id="${SUB}"]`)) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'ranking-sub-tab';
    button.dataset.rankingSubGroupId = SUB; button.dataset.rankingParentBoardId = 'wordbattle'; button.textContent = '두근두근 마블'; tabs.append(button);
    const sub = document.createElement('div'); sub.className = 'ranking-sub-panel'; sub.dataset.rankingSubPanel = SUB; sub.hidden = true;
    const intro = document.createElement('p'); intro.textContent = '3분 이상 진행한 온라인 경기 · 단독 우승 3점 / 공동 우승 1점 · 같은 점수는 공동 순위 · 연습 제외';
    const link = document.createElement('a'); link.href = '/town-marble/?mode=online'; link.textContent = '🎲 친구와 마블 시작하기'; link.style.marginRight = '16px';
    const refresh = document.createElement('button'); refresh.type = 'button'; refresh.className = 'ranking-sub-tab'; refresh.textContent = '새로고침'; refresh.addEventListener('click', load);
    const list = document.createElement('div'); list.id = ROOT; list.className = 'wb-rank-root'; sub.append(intro, link, refresh, list); panel.append(sub);
    const head = panel.querySelector('.ranking-board-header p'); if (head) head.textContent = '퀴즈타운 온라인 게임의 공용 랭킹입니다.';
    if (rows) render(); else load();
  }
  function init() {
    const root = document.getElementById('ranking-board-root');
    if (!root || !window.firebase?.auth) { setTimeout(init, 700); return; }
    window.DJ48RankingVisibility?.register(ROOT, load);
    inject(); new MutationObserver(inject).observe(root, { childList: true, subtree: true });
    root.addEventListener('click', event => { if (event.target.closest(`[data-ranking-sub-group-id="${SUB}"]`)) load(); });
    window.firebase.auth().onAuthStateChanged(() => { generation++; loading = false; rows = null; render(); load(); });
    // A result-screen link opens the existing, feature-flag-aware ranking view.
    if (new URLSearchParams(location.search).get('townMarbleRanking') === '1') {
      let opened = false;
      const timer = setInterval(async () => {
        if (!window.DJ48AccountState?.getCurrentMemberProfile?.() || typeof window.showRankingView !== 'function') return;
        if (!opened) { opened = true; await window.showRankingView(); }
        const button = document.querySelector(`[data-ranking-sub-group-id="${SUB}"]`);
        if (!button || document.getElementById('ranking-view')?.hidden) return;
        document.querySelector('[data-ranking-board-id="wordbattle"]')?.click(); button.click(); clearInterval(timer);
        const url = new URL(location.href); url.searchParams.delete('townMarbleRanking'); history.replaceState(null, '', url);
      }, 700);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
