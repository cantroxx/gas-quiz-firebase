(function () {
  'use strict';
  let step=0,seen=0;
  const ids=['mode','weapon','look','monster','diff','playmode'];
  const names=['모험 길','내 무기','내 모습','몬스터','도전 크기','출발!'];
  const titles=['보물 찾으러 떠나 볼까?','내 손에 딱! 무기를 골라 봐','어떤 모습으로 떠날까?','어떤 몬스터를 만날까?','얼마나 힘센 적과 싸울까?','넘어져도 다시 도전할까?'];
  const tips=['짧게 한 바퀴? 더 길게 탐험? 가고 싶은 길을 눌러 봐!','공격 버튼을 누르면 이 무기로 싸워! 잠긴 무기는 보스를 이기면 열려.','마음에 드는 모험가를 골라 봐. 어떤 모습을 골라도 힘은 같아!','말랑한 친구들? 멋진 수호자들? 모습만 다르고 힘과 보상은 같아.','처음이라면 기본 난이도부터! 익숙해지면 심화에 도전해 봐.','처음이라면 코인 모드도 좋아! 길잡이를 켜면 다음에 할 일을 알려 줘.'];
  function reset(){step=0;seen=0;}
  function advance(id){const i=ids.indexOf(id);if(i>=0&&i<5){step=i+1;seen=Math.max(seen,step);}}
  function decorateChoices(groups){
    const art=(button,html)=>{const picture=document.createElement('span');picture.className='departure-choice-art';picture.setAttribute('aria-hidden','true');picture.innerHTML=html;button.prepend(picture);};
    groups[0].querySelectorAll('button').forEach(b=>{const long=b.dataset.mode==='long';art(b,`<span class="departure-landscape ${long?'is-long':''}"><span class="trail-dots">● · ● · ${long?'● · ● · ':''}★</span><b>${long?'32':'24'}<small>개의 방</small></b></span>`);});
    groups[4].querySelectorAll('button').forEach(b=>art(b,FWExpeditionUI.weaponArt(b.dataset.diff==='hard'?'shield':'blades')));
    groups[5].querySelectorAll('button').forEach(b=>art(b,b.dataset.playmode==='coin'?'<span class="departure-coin"><img src="./assets/crystal-coin.svg" alt="" width="86" height="86"><b>↻</b></span>':FWExpeditionUI.weaponArt('spear')));
    for(const group of groups)group.querySelectorAll('.choice').forEach(b=>{const badge=document.createElement('span');badge.className='departure-choice-badge';badge.textContent=b.disabled?'아직 잠겨 있어':b.classList.contains('selected')?'✓ 내가 고른 것':'눌러서 고르기';b.setAttribute('aria-pressed',String(b.classList.contains('selected')));b.append(badge);});
  }
  function apply(redraw){
    const U=FWUI,root=U.$('app'),groups=ids.map(id=>root.querySelector('.grid:has([data-'+id+'])')),start=U.$('tower-start'),parry=U.$('setup-parry'),guide=U.$('setup-guide');
    const labels=groups.map(g=>g?.querySelector('.selected strong')?.textContent||'선택하기'),look=groups[2].querySelector('.selected')?.dataset.look||'dawn',weapon=groups[1].querySelector('.selected')?.dataset.weapon||'wand';
    decorateChoices(groups);
    root.innerHTML=`<section class="setup-wizard departure"><header class="departure-hero"><div class="departure-welcome"><span class="departure-ticket">스터디 타운 · 균열의 탑</span><h1>오늘은 내가<br><em>모험가!</em></h1><p>무기를 고르고, 보물을 찾으러 출발!</p></div><div class="departure-party" aria-hidden="true"><span class="departure-spark">✦</span>${FWExpeditionUI.portrait(look)}${FWExpeditionUI.weaponArt(weapon)}<span class="departure-party-label">나의 모험가</span></div></header><nav class="setup-steps" aria-label="모험 준비 단계">${names.map((name,i)=>`<button data-setup-step="${i}" ${i>seen?'disabled':''} ${i===step?'aria-current="step"':''}><span class="departure-step-number" aria-hidden="true">${i<step?'✓':i+1}</span><span><b>${name}</b><small>${i>seen?'곧 고를 차례':labels[i]}</small></span></button>`).join('')}</nav><section class="panel" id="setup-active"><div class="departure-question"><span class="departure-count">${step+1}<small>/ 6</small></span><div><h2>${titles[step]}</h2><p>${tips[step]}</p></div></div><div id="departure-choices"></div><div class="departure-actions" id="departure-actions"></div></section><p class="departure-footnote">앞에서 고른 걸 바꾸고 싶으면 위의 칸을 눌러 봐!</p></section>`;
    U.$('departure-choices').append(groups[step]);if(step===1||step===2){const locked=[...groups[step].querySelectorAll('button:disabled')];if(locked.length){const details=document.createElement('details');details.className='departure-locked';details.innerHTML='<summary>🔒 나중에 열리는 '+(step===1?'무기':'모습')+' '+locked.length+'개 구경하기</summary><div class="grid cols3"></div>';locked.forEach(b=>details.querySelector('.grid').append(b));U.$('departure-choices').append(details);}}const actions=U.$('departure-actions');
    if(step>0){const back=document.createElement('button');back.className='departure-back';back.id='setup-back';back.textContent='← 앞에서 다시 고르기';back.onclick=()=>{step--;redraw();};actions.append(back);}
    if(step===5){const tools=document.createElement('div');tools.className='departure-support';guide.classList.add('departure-guide');guide.innerHTML=`<b>길잡이 ${guide.getAttribute('aria-pressed')==='true'?'켜짐 ✓':'꺼짐'}</b><span>길 추천과 쉬운 설명을 보여 줘요</span>`;const practice=document.createElement('button');practice.className='departure-practice';practice.innerHTML='<b>먼저 연습해 볼래?</b><span>이동 · 공격 · 회피 · 받아치기</span>';practice.onclick=()=>FWGuide.practice();parry.textContent='별탄 받아치기만 연습';tools.append(guide,practice,parry);U.$('departure-choices').append(tools);start.textContent='좋아, 모험 출발! →';actions.append(start);}else{const next=document.createElement('button');next.id='setup-next';next.className='primary';next.textContent='이걸로 골랐어! 다음 →';next.onclick=()=>{step++;seen=Math.max(seen,step);redraw();};actions.append(next);}
    root.querySelectorAll('[data-setup-step]').forEach(b=>b.onclick=()=>{step=Number(b.dataset.setupStep);redraw();});
  }
  window.FWStart={apply,advance,reset};
})();
