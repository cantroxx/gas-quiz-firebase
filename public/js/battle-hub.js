/* School entrance to the shared game room; older shells fall back to /battle/. */
(function () {
  'use strict';

  function go(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if(window.DJ48SchoolHubs?.open) window.DJ48SchoolHubs.open('games');
    else window.location.href = '/battle/';
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
    icon.textContent = '🎲';
    var title = document.createElement('h3');
    title.textContent = '게임 아지트';
    var desc = document.createElement('p');
    desc.textContent = '친구와 대결하고 나만의 기록에 도전해요!';
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
