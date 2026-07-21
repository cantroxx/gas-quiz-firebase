/* gs-ranking-plaza.js — 랭킹 광장 "온라인 대전" 보드 안에
 *  '특산물 대상인(거상)' 하위 탭을 끼워 넣는다. (mb-ranking-plaza.js 와 같은 패턴)
 *  대전 랭크가 아니라 "학습 진도" 보드: 도감(55종)을 많이 모은 순.
 *  데이터는 geosangRanking 컬렉션만 읽는다 (기존 랭킹 코드/데이터 불변).
 */
(function () {
  'use strict';
  var PARENT_BOARD = 'wordbattle'; // wb-ranking-plaza.js 가 만든 "온라인 대전" 보드
  var SUB_ID = 'geosang-rank';
  var ROOT_ID = 'geosang-ranking-root';
  var CODEX_TOTAL = 55; // 특산물 종 수 (geosang-src/src/data.js 와 맞춰 유지)

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
      root.innerHTML = '<p class="wb-rank-empty">아직 대상인 기록이 없어요. 학교 → 팔도 특산물 대상인에서 한 판 해보세요!</p>';
      return;
    }
    root.innerHTML = rows.map(function (r, i) {
      var medal = ['🥇', '🥈', '🥉'][i] || (i + 1) + '위';
      var n = r.codexCount || 0;
      var pct = Math.min(100, Math.round((n / CODEX_TOTAL) * 100));
      var bar =
        '<span style="display:block;height:7px;background:#efebe9;border-radius:99px;overflow:hidden;margin-top:3px;">' +
        '<span style="display:block;height:100%;width:' + pct + '%;background:#ffb300;border-radius:99px;"></span></span>';
      return '<div class="wb-rank-row' + (i < 3 ? ' top' : '') + '">' +
        '<span class="wb-rank-pos">' + medal + '</span>' +
        '<span class="wb-rank-name">' + esc(r.nickname || '친구') +
        ' <small style="color:#a1887f;">' + esc(r.classCode || '') + '</small>' + bar + '</span>' +
        '<span class="wb-rank-meta">' + esc(r.bestTitle || '') + ' · ' + (r.games || 0) + '판</span>' +
        '<span class="wb-rank-total">📖 ' + n + '/' + CODEX_TOTAL + '</span>' +
        '</div>';
    }).join('');
  }

  var loading = false;
  function load() {
    if (loading) return;
    if (!(window.firebase && window.firebase.firestore && window.firebase.auth && window.firebase.auth().currentUser)) return;
    loading = true;
    var root = document.getElementById(ROOT_ID);
    if (root && !root.innerHTML) root.innerHTML = '<p class="wb-rank-empty">진도 불러오는 중…</p>';
    window.firebase.firestore().collection('geosangRanking').orderBy('codexCount', 'desc').limit(50).get()
      .then(function (snap) {
        var rows = []; snap.forEach(function (d) { rows.push(d.data()); });
        cachedRows = rows; loading = false; renderList(rows);
      })
      .catch(function () {
        loading = false;
        var el = document.getElementById(ROOT_ID);
        if (el) el.innerHTML = '<p class="wb-rank-empty">진도를 불러오지 못했어요.</p>';
      });
  }

  // "온라인 대전" 보드 패널 안에 '특산물 대상인' 하위 탭 + 진도 패널 주입
  function injectSubTab() {
    var panel = document.querySelector('[data-ranking-board-panel="' + PARENT_BOARD + '"]');
    if (!panel) return;
    var tabs = panel.querySelector('.ranking-sub-tabs');
    if (!tabs) return;
    if (tabs.querySelector('[data-ranking-sub-group-id="' + SUB_ID + '"]')) return; // 이미 있음

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ranking-sub-tab';
    btn.dataset.rankingSubGroupId = SUB_ID;
    btn.dataset.rankingParentBoardId = PARENT_BOARD;
    btn.textContent = '특산물 대상인';
    tabs.appendChild(btn);

    var sub = document.createElement('div');
    sub.className = 'ranking-sub-panel';
    sub.dataset.rankingSubPanel = SUB_ID;
    sub.hidden = true; // 처음엔 낱말 대전 탭이 활성
    sub.innerHTML = '<div id="' + ROOT_ID + '" class="wb-rank-root"></div>';
    panel.appendChild(sub);

    if (cachedRows) renderList(cachedRows); else load();
  }

  function init() {
    if (!(window.firebase && window.firebase.auth)) { setTimeout(init, 800); return; }
    var root = document.getElementById('ranking-board-root');
    if (!root) { setTimeout(init, 800); return; }

    injectSubTab();
    // 랭킹 보드가 다시 그려지거나 다른 탭이 늦게 주입돼도 따라 붙는다
    if (window.MutationObserver) {
      new MutationObserver(function () { injectSubTab(); }).observe(root, { childList: true, subtree: true });
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
