/* geosang-hub.js — 학교 화면 카드 줄에 '팔도 특산물 대상인' 카드를 주입한다.
 *  battle-hub.js 와 같은 패턴. 카드 클릭 → /geosang/ (거상식 지도 무역 게임)로 이동.
 *  카드 위치는 styles.css 의 .school-quiz-card-geosang 좌표가 담당한다.
 */
(function () {
  'use strict';

  function go(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    window.location.href = '/geosang/';
  }

  function injectCard() {
    var grid = document.getElementById('school-quiz-grid');
    if (!grid) return;
    if (grid.querySelector('[data-geosang-hub]')) return; // 이미 있음

    var item = document.createElement('article');
    item.className = 'school-quiz-card school-quiz-card-geosang';
    item.dataset.geosangHub = 'true';
    item.tabIndex = 0;
    item.setAttribute('role', 'button');

    var icon = document.createElement('span');
    icon.className = 'school-quiz-icon';
    icon.textContent = '🛞';
    var title = document.createElement('h3');
    title.textContent = '팔도 특산물 대상인';
    var desc = document.createElement('p');
    desc.textContent = '전국 지도를 누비는 특산물 무역 — 도감 55종 모으기';
    var button = document.createElement('button');
    button.className = 'school-ready-button';
    button.type = 'button';
    button.textContent = '입장하기';

    item.append(icon, title, desc, button);
    item.addEventListener('click', go);
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') go(e);
    });
    grid.appendChild(item);
  }

  function init() {
    var grid = document.getElementById('school-quiz-grid');
    if (!grid) { setTimeout(init, 600); return; }
    injectCard();
    if (window.MutationObserver) {
      new MutationObserver(function () { injectCard(); }).observe(grid, { childList: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
