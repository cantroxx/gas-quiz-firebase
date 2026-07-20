/* battle-hub.js — 학교 화면에 '온라인 대전' 카드를 과목 카드와 같은 모양으로 넣고,
 *  누르면 대전 선택 화면(낱말 대전 / 특산물 마블)을 띄운다.
 *  과목관처럼 "카드 입장 → 안에서 고르기" 흐름. 기존 렌더 코드는 건드리지 않고
 *  wb-ranking-plaza.js 와 같은 방식(주입 + MutationObserver)으로 동작한다.
 */
(function () {
  'use strict';

  var GAMES = [
    { href: '/wordbattle/', emoji: '🧩', title: '낱말 대전', desc: '자음·모음 타일로 낱말 만들기 — 친구들과 실시간 대결!' },
    { href: '/marble/', emoji: '🧑‍🌾', title: '특산물 마블', desc: '싸게 사서 비싸게 팔기! 특산물 무역 1:1 대결' }
  ];

  function buildOverlay() {
    if (document.getElementById('battle-hub-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'battle-hub-overlay';
    ov.className = 'battle-hub-overlay';
    ov.hidden = true;

    var card = document.createElement('div');
    card.className = 'battle-hub-card';
    card.innerHTML =
      '<h3 class="battle-hub-title">⚔️ 온라인 대전</h3>' +
      '<p class="battle-hub-desc">친구들과 실시간으로 겨루는 랭크전! 어떤 대전을 할까요?</p>';

    GAMES.forEach(function (g) {
      var a = document.createElement('a');
      a.className = 'online-battle-entry';
      a.href = g.href;
      a.innerHTML =
        '<span class="obe-emoji" aria-hidden="true">' + g.emoji + '</span>' +
        '<span class="obe-text"><b>' + g.title + '</b><small>' + g.desc + '</small></span>' +
        '<span class="obe-go" aria-hidden="true">▶</span>';
      card.appendChild(a);
    });

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'button secondary battle-hub-close';
    close.textContent = '닫기';
    close.addEventListener('click', function () { ov.hidden = true; });
    card.appendChild(close);

    ov.appendChild(card);
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.hidden = true; });
    document.body.appendChild(ov);
  }

  function openOverlay(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    buildOverlay();
    document.getElementById('battle-hub-overlay').hidden = false;
  }

  // 학교 퀴즈 카드 줄에 '온라인 대전' 카드를 같은 마크업으로 추가
  function injectCard() {
    var grid = document.getElementById('school-quiz-grid');
    if (!grid) return;
    if (grid.querySelector('[data-battle-hub]')) return; // 이미 있음

    var item = document.createElement('article');
    item.className = 'school-quiz-card school-quiz-card-battle';
    item.dataset.battleHub = 'true';
    item.tabIndex = 0;
    item.setAttribute('role', 'button');

    var icon = document.createElement('span');
    icon.className = 'school-quiz-icon';
    icon.textContent = '⚔️';
    var title = document.createElement('h3');
    title.textContent = '온라인 대전';
    var desc = document.createElement('p');
    desc.textContent = '낱말 대전 · 특산물 마블 — 친구와 실시간 대결 (랭크전)';
    var button = document.createElement('button');
    button.className = 'school-ready-button';
    button.type = 'button';
    button.textContent = '입장하기';

    item.append(icon, title, desc, button);
    item.addEventListener('click', openOverlay);
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') openOverlay(e);
    });
    grid.appendChild(item);
  }

  function init() {
    var grid = document.getElementById('school-quiz-grid');
    if (!grid) { setTimeout(init, 600); return; }
    buildOverlay();
    injectCard();
    // 학교 카드가 다시 그려질 때마다(로그인/새로고침 등) 다시 끼워 넣는다
    if (window.MutationObserver) {
      new MutationObserver(function () { injectCard(); }).observe(grid, { childList: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
