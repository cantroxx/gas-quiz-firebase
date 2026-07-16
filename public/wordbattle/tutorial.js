/* tutorial.js — 게임 방법 안내(단계별 예시 화면).
 *  처음 들어오면 자동으로 한 번 뜨고, "📖 게임 방법" 버튼으로 언제든 다시 볼 수 있다.
 *  window.WBTutorial: open() 강제로 열기 / maybeAuto() 처음이면 열기.
 */
(function (global) {
  'use strict';

  const SEEN_KEY = 'wb.tutorial.seen';

  // 예시용 작은 타일 (게임과 같은 색: 자음=파랑, 모음=주황, 완성글자=보라)
  function tile(ch, kind) { return '<span class="tut-tile ' + kind + '">' + ch + '</span>'; }
  function arrow() { return '<span class="tut-arrow">→</span>'; }

  const STEPS = [
    {
      title: '🎯 목표',
      body:
        '<p><b>내 손패(자음·모음 타일 14장)</b>를 친구보다 <b>먼저 다 내려놓으면 승리!</b></p>' +
        '<div class="tut-vis">' +
          tile('ㄱ', 'c') + tile('ㅅ', 'c') + tile('ㅁ', 'c') + tile('ㅏ', 'v') + tile('ㅗ', 'v') +
          '<span class="tut-more">… 14장</span>' +
        '</div>'
    },
    {
      title: '① 글자 만들기',
      body:
        '<p><b>자음 + 모음</b>을 합치면 <b>글자</b>가 돼요.</p>' +
        '<div class="tut-vis">' +
          tile('ㅅ', 'c') + tile('ㅗ', 'v') + tile('ㄱ', 'c') + arrow() + tile('속', 'w') +
        '</div>' +
        '<p class="tut-note">받침(맨 아래 자음)도 자음 타일로 붙여요.</p>'
    },
    {
      title: '② 낱말을 판에 내기',
      body:
        '<p>글자를 모아 <b>진짜 낱말</b>을 만들어 가운데 <b>공용 판</b>에 내려놓아요.</p>' +
        '<div class="tut-vis">' +
          tile('ㅅ', 'c') + tile('ㅏ', 'v') + tile('ㄱ', 'c') + tile('ㅗ', 'v') + tile('ㅏ', 'v') +
          arrow() + tile('사', 'w') + tile('과', 'w') +
        '</div>'
    },
    {
      title: '③ ★공용 판★ (루미큐브 핵심)',
      body:
        '<p>바닥에 놓인 글자는 <b>모두의 것</b>! 남이 낸 낱말에서 글자를 빼오거나 이어 붙여 새 낱말로 바꿀 수 있어요.</p>' +
        '<div class="tut-vis">' +
          '<span class="tut-label">바닥</span>' + tile('소', 'w') + '<span class="tut-plus">+ 내 손패</span>' + tile('ㄱ', 'c') +
          arrow() + tile('속', 'w') +
        '</div>' +
        '<p class="tut-note">단, <b>턴이 끝날 때 판의 모든 낱말이 말이 돼야</b> 하고, 내 손패에서 <b>1개 이상</b>은 꼭 내야 해요.</p>'
    },
    {
      title: '④ 조작법 / 못 만들 때',
      body:
        '<p>손패 타일을 <b>탭</b>하면 위 <b>"만드는 중"</b> 칸에 순서대로 이어져요. 낱말이 되면 <b>초록색</b>!</p>' +
        '<p>잘못 넣었으면 <b>만드는 중 칸의 타일을 탭</b>하면 손패로 돌아가요. 낱말을 하나 더 만들려면 <b>[＋ 낱말 하나 더]</b>.</p>' +
        '<p>만들 게 없으면 <b>[자음↓]</b>·<b>[모음↓]</b>로 타일을 뽑고 넘겨요.</p>'
    },
    {
      title: '🏆 승리',
      body:
        '<p>이렇게 반복해서 <b>손패를 먼저 다 비우면</b> "루미큐브!"를 외치고 <b>승리</b>해요.</p>' +
        '<div class="tut-vis"><span class="tut-win">🎉 손패 0장 = 승리!</span></div>'
    }
  ];

  let idx = 0;

  function render() {
    const s = STEPS[idx];
    return '' +
      '<div class="tut-overlay" id="tut-overlay">' +
        '<div class="tut-card">' +
          '<div class="tut-top"><span class="tut-count">' + (idx + 1) + ' / ' + STEPS.length + '</span>' +
            '<button class="tut-x" id="tut-x">×</button></div>' +
          '<h2 class="tut-title">' + s.title + '</h2>' +
          '<div class="tut-body">' + s.body + '</div>' +
          '<div class="tut-nav">' +
            '<button class="tut-btn ghost" id="tut-prev" ' + (idx === 0 ? 'disabled' : '') + '>◀ 이전</button>' +
            (idx < STEPS.length - 1
              ? '<button class="tut-btn primary" id="tut-next">다음 ▶</button>'
              : '<button class="tut-btn primary" id="tut-done">시작하기 ✅</button>') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function mount() {
    let holder = document.getElementById('tut-holder');
    if (!holder) { holder = document.createElement('div'); holder.id = 'tut-holder'; document.body.appendChild(holder); }
    holder.innerHTML = render();
    document.getElementById('tut-x').onclick = close;
    const prev = document.getElementById('tut-prev'); if (prev) prev.onclick = function () { if (idx > 0) { idx--; mount(); } };
    const next = document.getElementById('tut-next'); if (next) next.onclick = function () { if (idx < STEPS.length - 1) { idx++; mount(); } };
    const done = document.getElementById('tut-done'); if (done) done.onclick = close;
    // 바깥 어두운 곳 탭하면 닫기
    document.getElementById('tut-overlay').onclick = function (e) { if (e.target.id === 'tut-overlay') close(); };
  }

  function close() {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
    const holder = document.getElementById('tut-holder');
    if (holder) holder.innerHTML = '';
  }

  function open() { idx = 0; mount(); }
  function maybeAuto() {
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch (e) {}
    if (!seen) open();
  }

  global.WBTutorial = { open: open, maybeAuto: maybeAuto };
})(typeof window !== 'undefined' ? window : this);
