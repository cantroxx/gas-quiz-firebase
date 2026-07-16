/* wb-ranking-plaza.js — 랭킹 광장 하단 탭 줄(퀴즈왕·시즌·국어…)에
 *  "온라인 대전" 탭을 같은 크기로 끼워 넣고, 누르면 낱말대전 순위를 보여준다.
 *  퀴즈 랭킹 로직/데이터와 독립. wordbattleRanking 컬렉션만 따로 읽어 표시한다.
 *  탭 클릭 처리는 기존 위임 핸들러(#ranking-board-root)가 그대로 맡는다:
 *  내 탭에도 data-ranking-board-id="wordbattle", 내 패널에 data-ranking-board-panel="wordbattle"
 *  를 달아두면 다른 탭과 똑같이 보이기/숨기기가 된다.
 *  app.bundle.js 와 별도로 로드(번들 목록에 없음).
 */
(function () {
  'use strict';
  var BOARD_ID = 'wordbattle';
  var ROOT_ID = 'wordbattle-ranking-root';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var cachedRows = null;

  function renderList(rows) {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    if (!rows || !rows.length) {
      root.innerHTML = '<p class="wb-rank-empty">아직 낱말대전 기록이 없어요. 학교 → 온라인 대전에서 한 판 해보세요!</p>';
      return;
    }
    root.innerHTML = rows.map(function (r, i) {
      var medal = ['🥇', '🥈', '🥉'][i] || (i + 1) + '위';
      return '<div class="wb-rank-row' + (i < 3 ? ' top' : '') + '">' +
        '<span class="wb-rank-pos">' + medal + '</span>' +
        '<span class="wb-rank-name">' + esc(r.name || '친구') + '</span>' +
        '<span class="wb-rank-meta">' + (r.games || 0) + '판 · ' + (r.wins || 0) + '승</span>' +
        '<span class="wb-rank-total">' + (r.total || 0) + '점</span>' +
        '</div>';
    }).join('');
  }

  var loading = false;
  function load() {
    if (loading) return;
    if (!(window.firebase && window.firebase.firestore && window.firebase.auth && window.firebase.auth().currentUser)) return;
    loading = true;
    var root = document.getElementById(ROOT_ID);
    if (root && !root.innerHTML) root.innerHTML = '<p class="wb-rank-empty">순위 불러오는 중…</p>';
    window.firebase.firestore().collection('wordbattleRanking').orderBy('total', 'desc').limit(50).get()
      .then(function (snap) {
        var rows = []; snap.forEach(function (d) { rows.push(d.data()); });
        cachedRows = rows; loading = false; renderList(rows);
      })
      .catch(function () {
        loading = false;
        var el = document.getElementById(ROOT_ID);
        if (el) el.innerHTML = '<p class="wb-rank-empty">순위를 불러오지 못했어요.</p>';
      });
  }

  // 탭 줄(.ranking-board-tabs)과 패널 묶음(.ranking-board-panels)이 그려지면
  // 그 끝에 온라인 대전 탭/패널을 끼워 넣는다. 재렌더로 사라지면 다시 넣는다.
  function injectTab(root) {
    if (!root) return;
    var tabs = root.querySelector('.ranking-board-tabs');
    var panels = root.querySelector('.ranking-board-panels');
    if (!tabs || !panels) return;
    if (tabs.querySelector('[data-ranking-board-id="' + BOARD_ID + '"]')) return; // 이미 있음

    var tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'ranking-board-tab';
    tab.dataset.rankingBoardId = BOARD_ID;
    tab.textContent = '온라인 대전';
    tabs.appendChild(tab);

    var panel = document.createElement('section');
    panel.className = 'ranking-board-panel';
    panel.dataset.rankingBoardPanel = BOARD_ID;
    panel.hidden = true;
    // 국어 탭과 동일한 형태: 헤더 → 하위 탭 줄(낱말 대전 하나) → 하위 순위표.
    // 하위 탭 클릭은 기존 위임 핸들러(data-ranking-sub-group-id)가 그대로 처리한다.
    panel.innerHTML =
      '<div class="ranking-board-header">' +
        '<h3>🧩 온라인 대전</h3>' +
        '<p>실시간 낱말 대전(한글판 루미큐브)의 랭크 순위입니다.</p>' +
      '</div>' +
      '<div class="ranking-sub-tabs">' +
        '<button type="button" class="ranking-sub-tab is-active" ' +
          'data-ranking-sub-group-id="wordbattle-rank" data-ranking-parent-board-id="' + BOARD_ID + '">낱말 대전</button>' +
      '</div>' +
      '<div class="ranking-sub-panel" data-ranking-sub-panel="wordbattle-rank">' +
        '<div id="' + ROOT_ID + '" class="wb-rank-root"></div>' +
      '</div>';
    panels.appendChild(panel);

    // 데이터: 캐시가 있으면 즉시 표시, 없으면 불러온다.
    if (cachedRows) renderList(cachedRows); else load();
  }

  function init() {
    if (!(window.firebase && window.firebase.auth)) { setTimeout(init, 800); return; }
    var root = document.getElementById('ranking-board-root');
    if (!root) { setTimeout(init, 800); return; }

    injectTab(root);
    // 랭킹 목록이 다시 그려질 때마다(데이터 로드/필터) 탭을 다시 끼워 넣는다.
    if (window.MutationObserver) {
      new MutationObserver(function () { injectTab(root); })
        .observe(root, { childList: true });
    }
    // 로그인되면 최신 순위 갱신
    window.firebase.auth().onAuthStateChanged(function (u) { if (u) { loading = false; load(); } });
    if (window.firebase.auth().currentUser) load();
    // 랭킹 광장이 열릴 때마다 최신으로 갱신
    var view = document.getElementById('ranking-view');
    if (view && window.MutationObserver) {
      new MutationObserver(function () {
        if (!view.hidden) { loading = false; load(); }
      }).observe(view, { attributes: true, attributeFilter: ['hidden'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
