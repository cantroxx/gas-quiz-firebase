(() => {
  'use strict';
  const KEY = 'dj48-village-design-preview-v1';
  const empty = () => ({ coins:120, owned:[], placed:[], completed:[], quizSolved:false, style:'a', instant:false });
  const catalog = [
    { id:'plant', name:'햇살 화분', icon:'🪴', cost:30 },
    { id:'cushion', name:'별빛 쿠션', icon:'⭐', cost:40 },
    { id:'books', name:'이야기 꾸러미', icon:'📚', cost:50 }
  ];
  let state = empty();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(saved && typeof saved === 'object') {
      state = { ...state, coins:Number.isFinite(saved.coins)?Math.max(0,saved.coins):120,
        owned:Array.isArray(saved.owned)?saved.owned.filter(id=>catalog.some(item=>item.id===id)):[],
        placed:Array.isArray(saved.placed)?saved.placed.filter(id=>catalog.some(item=>item.id===id)&&saved.owned?.includes(id)):[],
        completed:Array.isArray(saved.completed)?[...new Set(saved.completed.filter(id=>['school','shop','home'].includes(id)))]:[],
        quizSolved:saved.quizSolved===true,style:saved.style==='b'?'b':'a',instant:saved.instant===true };
    }
  } catch (_) { /* Preview works with storage disabled. */ }
  const $ = id => document.getElementById(id);
  const scenes = {
    school:{title:'숲속 학교',kicker:'THE FOREST SCHOOL',tag:'부엉이 선생님의 한 문제',heading:'오늘도 하나 더 알아가자!',description:'정답을 찾아보고, 작은 발견의 기쁨을 모아봐요.',door:{x:29,y:50}},
    shop:{title:'도토리 잡화점',kicker:'THE ACORN STORE',tag:'너구리 사장님의 추천',heading:'작은 물건에 담긴 큰 행복',description:'마음에 드는 소품을 골라 내 집으로 가져가세요.',door:{x:74,y:78}},
    home:{title:'나의 작은 집',kicker:'MY LITTLE HOME',tag:'세상에서 가장 편안한 곳',heading:'내 취향이 자라는 방',description:'상점에서 고른 물건으로 나만의 공간을 꾸며봐요.',door:{x:73,y:46}}
  };
  let location='village', travel=0, animation=null, toastTimer;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){} updateStats();}
  function updateStats(){ $('coins').textContent=state.coins; $('bag-count').textContent=state.owned.length;
    document.querySelectorAll('[data-visit]').forEach(el=>{const done=state.completed.includes(el.dataset.visit);el.classList.toggle('done',done);el.querySelector('span').textContent=done?'✓':'○';});
    $('visit-progress').style.width=state.completed.length/3*100+'%';$('visit-summary').textContent=`${state.completed.length} / 3개의 장소에서 체험했어요`;
  }
  function complete(id){if(!state.completed.includes(id))state.completed.push(id);save();}
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
  function setStyle(style){state.style=style; $('map-art').src=`assets/village-${style}.png`;document.querySelectorAll('[data-style]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.style===style)));save();}
  function setMotion(){ $('motion-toggle').setAttribute('aria-pressed',String(state.instant));$('motion-toggle').textContent=state.instant?'바로 이동 켜짐':'발걸음 연출 켜짐'; }
  function centerMap(){const viewport=$('map-viewport');viewport.scrollTo({left:Math.max(0,($('map-world').clientWidth-viewport.clientWidth)/2),top:0,behavior:'auto'});}
  function cancelTravel(){travel++;if(animation){animation.cancel();animation=null;}$('map-hint').textContent='건물이나 간판을 눌러 들어가 보세요.';}
  function showVillage(){cancelTravel();location='village';$('village-view').hidden=false;$('destination-view').hidden=true;$('back-button').hidden=true;$('weather').hidden=false;$('location-kicker').textContent='OUR LITTLE VILLAGE';$('location-title').textContent='햇살 가득 숲속 마을';document.querySelectorAll('.quick-nav button').forEach(el=>el.removeAttribute('aria-current'));}
  async function go(id){if(!scenes[id])return;cancelTravel();const token=travel;
    if(location==='village'&&!state.instant&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const door=scenes[id].door;$('map-hint').textContent=`${scenes[id].title}로 가는 중이에요…`;
      animation=$('player').animate([{left:$('player').style.left||'49%',top:$('player').style.top||'65%'},{left:'49%',top:'61%',offset:.3},{left:`${door.x}%`,top:`${door.y}%`}],{duration:750,easing:'ease-in-out',fill:'forwards'});
      try{await animation.finished;}catch(_){return;}
      if(token!==travel)return;
      $('player').style.left=`${door.x}%`;$('player').style.top=`${door.y}%`;animation.cancel();animation=null;
    }
    if(token!==travel)return;window.location.hash=id;
    if(location!==id)showScene(id);
  }
  function showScene(id){cancelTravel();const scene=scenes[id];location=id;$('village-view').hidden=true;$('destination-view').hidden=false;$('back-button').hidden=false;$('weather').hidden=true;$('location-title').textContent=scene.title;$('location-kicker').textContent=scene.kicker;$('interior-art').src=`assets/${id}.png`;$('interior-art').alt=`${scene.title} 내부 일러스트`;$('scene-tag').textContent=scene.tag;$('scene-title').textContent=scene.heading;$('scene-description').textContent=scene.description;
    document.querySelectorAll('.quick-nav button').forEach(button=>{if(button.dataset.destination===id)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    renderActivity();$('location-title').tabIndex=-1;$('location-title').focus({preventScroll:true});
  }
  function renderActivity(){const panel=$('activity-panel');
    if(location==='school'){
      panel.innerHTML=`<div class="activity-header"><h3>오늘의 미니 퀴즈</h3><small>체험 문제 · 정답 시 20코인</small></div><p class="quiz-question">친구에게 책을 빌렸어요. 바르게 쓴 문장은?</p><div class="answers"><button data-answer="wrong">책을 깨끗이 쓸께.</button><button data-answer="correct">책을 깨끗이 쓸게.</button></div><p class="feedback" aria-live="polite"></p>`;
      const feedback=panel.querySelector('.feedback');
      if(state.quizSolved){panel.querySelector('[data-answer="correct"]').classList.add('correct');panel.querySelectorAll('[data-answer]').forEach(b=>b.disabled=true);feedback.textContent='이미 발견했어요! 약속을 나타내는 말은 ‘-ㄹ게’로 적어요. 체험 코인 20장을 받았어요.';}
      panel.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>{
        if(button.dataset.answer==='wrong'){button.classList.add('wrong');feedback.textContent='한 번 더 생각해 볼까요? 소리가 아니라 올바른 표기를 골라봐요.';return;}
        if(state.quizSolved)return;state.quizSolved=true;state.coins+=20;complete('school');renderActivity();toast('정답! 체험 코인 20장을 받았어요.');
      }));
    } else if(location==='shop'){
      panel.innerHTML=`<div class="activity-header"><h3>오늘의 작은 보물</h3><small>실제 결제 없는 체험 상점</small></div><div class="items">${catalog.map(item=>`<article class="item"><span class="item-icon" aria-hidden="true">${item.icon}</span><h4>${item.name}</h4><small>✦ ${item.cost} 체험 코인</small><button data-buy="${item.id}" ${state.owned.includes(item.id)||state.coins<item.cost?'disabled':''}>${state.owned.includes(item.id)?'내 가방에 있어요':state.coins<item.cost?'코인이 부족해요':'가방에 담기'}</button></article>`).join('')}</div><p class="feedback">구매한 물건은 내 집에서 꺼내 놓을 수 있어요.</p>`;
      panel.querySelectorAll('[data-buy]').forEach(button=>button.addEventListener('click',()=>{const item=catalog.find(item=>item.id===button.dataset.buy);if(state.owned.includes(item.id)||state.coins<item.cost)return;state.coins-=item.cost;state.owned.push(item.id);complete('shop');renderActivity();toast(`${item.name}을 가방에 담았어요.`);}));
    } else {
      panel.innerHTML=`<div class="activity-header"><h3>내 방의 작은 선반</h3><small>${state.placed.length}개의 소품</small></div><div class="room-shelf">${state.placed.length?state.placed.map(id=>`<span title="${catalog.find(item=>item.id===id).name}">${catalog.find(item=>item.id===id).icon}</span>`).join(''):'<p>어떤 물건으로 채워볼까요?</p>'}</div><div class="items">${state.owned.map(id=>{const item=catalog.find(item=>item.id===id);return `<article class="item"><span class="item-icon">${item.icon}</span><h4>${item.name}</h4><button data-place-item="${id}">${state.placed.includes(id)?'가방에 넣기':'선반에 놓기'}</button></article>`;}).join('')}</div>${state.owned.length?'':'<p class="feedback">아직 가방이 비어 있어요. 도토리 잡화점에서 소품을 골라보세요.</p><button class="primary" id="visit-shop">상점 구경하기 →</button>'}`;
      panel.querySelectorAll('[data-place-item]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.placeItem;if(state.placed.includes(id))state.placed=state.placed.filter(value=>value!==id);else{state.placed.push(id);complete('home');}save();renderActivity();}));
      panel.querySelector('#visit-shop')?.addEventListener('click',()=>go('shop'));
    }
  }
  function fromHash(){const id=locationFromHash();if(scenes[id])showScene(id);else showVillage();}
  function locationFromHash(){return window.location.hash.slice(1);}
  document.querySelectorAll('[data-destination]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.destination)));
  document.querySelectorAll('[data-style]').forEach(button=>button.addEventListener('click',()=>setStyle(button.dataset.style)));
  $('back-button').addEventListener('click',()=>{window.location.hash='village';showVillage();});
  $('center-map').addEventListener('click',()=>{$('map-viewport').scrollTo({left:parseFloat($('player').style.left||49)/100*$('map-world').clientWidth-$('map-viewport').clientWidth/2,top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  $('motion-toggle').addEventListener('click',()=>{state.instant=!state.instant;setMotion();save();});
  $('help-button').addEventListener('click',()=>$('help-dialog').showModal());$('close-help').addEventListener('click',()=>$('help-dialog').close());
  $('reset-demo').addEventListener('click',()=>{state=empty();setStyle('a');setMotion();save();window.location.hash='village';showVillage();$('help-dialog').close();toast('체험 기록을 처음으로 되돌렸어요.');});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')cancelTravel();});window.addEventListener('hashchange',fromHash);
  $('map-art').addEventListener('load',()=>{if(!window.__mapCentered){centerMap();window.__mapCentered=true;}});
  setStyle(state.style);setMotion();updateStats();fromHash();requestAnimationFrame(centerMap);
})();
