/* battle-hub.js — 학교 화면 카드 줄에 '온라인 대전' 카드를 주입한다.
 *  카드 클릭 → /battle/ (온라인 대전 선택 페이지)로 이동.
 *  과목 카드가 과목관으로 "화면 이동"하듯, 대전도 선택 페이지로 이동하는 구조.
 *  (v1의 body 오버레이 방식은 SPA 화면 전환과 얽혀 폐기)
 *  카드 위치는 styles.css 의 .school-quiz-card-battle 좌표가 담당한다.
 */
(function () {
  'use strict';

  function go(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    window.location.href = '/battle/';
  }

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
