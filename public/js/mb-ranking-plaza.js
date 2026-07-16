/* mb-ranking-plaza.js — 랭킹 광장에 "특산물 마블" 탭을 끼워 넣는다.
 *  wb-ranking-plaza.js(낱말대전)와 동일한 방식. marbleRanking 컬렉션만 따로 읽어 표시.
 *  퀴즈타운 public/js/ 에 두고, index.html 에서 wb-ranking-plaza.js 옆에 개별 <script> 로 로드.
 *  기존 랭킹 로직/데이터는 건드리지 않는다.
 */
(function () {
  'use strict';
  var BOARD_ID = 'marble';
  var ROOT_ID = 'marble-ranking-root';

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
      root.innerHTML = '<p class="wb-rank-empty">아직 특산물 마블 기록이 없어요. 학교 → 특산물 마블에서 한 판 해보세요!</p>';
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
    window.firebase.firestore().collection('marbleRanking').orderBy('total', 'desc').limit(50).get()
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
    tab.textContent = '특산물 마블';
    tabs.appendChild(tab);

    var panel = document.createElement('section');
    panel.className = 'ranking-board-panel';
    panel.dataset.rankingBoardPanel = BOARD_ID;
    panel.hidden = true;
    panel.innerHTML =
      '<div class="ranking-board-header">' +
        '<h3>🧑‍🌾 특산물 마블</h3>' +
        '<p>1:1 특산물 무역 대전의 랭크 순위입니다. (승 +30 / 패 +5)</p>' +
      '</div>' +
      '<div class="ranking-sub-tabs">' +
        '<button type="button" class="ranking-sub-tab is-active" ' +
          'data-ranking-sub-group-id="marble-rank" data-ranking-parent-board-id="' + BOARD_ID + '">마블 대전</button>' +
      '</div>' +
      '<div class="ranking-sub-panel" data-ranking-sub-panel="marble-rank">' +
        '<div id="' + ROOT_ID + '" class="wb-rank-root"></div>' +
      '</div>';
    panels.appendChild(panel);

    if (cachedRows) renderList(cachedRows); else load();
  }

  function init() {
    if (!(window.firebase && window.firebase.auth)) { setTimeout(init, 800); return; }
    var root = document.getElementById('ranking-board-root');
    if (!root) { setTimeout(init, 800); return; }

    injectTab(root);
    if (window.MutationObserver) {
      new MutationObserver(function () { injectTab(root); }).observe(root, { childList: true });
    }
    window.firebase.auth().onAuthStateChanged(function (u) { if (u) { loading = false; load(); } });
    if (window.firebase.auth().currentUser) load();
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
