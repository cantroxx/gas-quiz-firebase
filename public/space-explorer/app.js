(function () {
  'use strict';
  const C=window.SpaceContent,D=window.SpaceDomain,S=window.SpaceScene,$=id=>document.getElementById(id);
  const M=window.SpaceMedia;
  const prefix='dj48.space-explorer.v1.';
  let classCredentials=null,networkBusy=false;
  const storageKey=()=>classCredentials?`class.${classCredentials.roomId}.${classCredentials.number}`:state.mode;
  let state=null, selection=[], message='', timer, active=false;
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function button(text,action,cls){const b=el('button',text,cls);b.type='button';b.addEventListener('click',action);return b;}
  function read(mode){try{return D.restore(localStorage.getItem(prefix+mode));}catch(_){return null;}}
  function lastMode(){try{return localStorage.getItem(prefix+'last')||'practice';}catch(_){return'practice';}}
  function save(){try{localStorage.setItem(prefix+storageKey(),JSON.stringify(state));localStorage.setItem(prefix+'last',state.mode);$('save-status').textContent='· 브라우저에 저장됨';}catch(_){$('save-status').textContent='· 저장 불가: 브라우저 설정·공간을 확인해 주세요';}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
  function showModal(title){$('modal-title').textContent=title;$('modal-body').replaceChildren();if(!$('modal').open)$('modal').showModal();S.pause(true);return $('modal-body');}
  function closeModal(){$('modal').close();}
  $('modal-close').addEventListener('click',closeModal);
  $('modal').addEventListener('close',()=>{if(active)S.pause(false);else S.stop();});
  function mediaIds(target){return target==='sky'?['ursa-minor','ursa-major','cassiopeia']:target==='observatory'?['moon']:[target];}
  function mediaLink(text,url){const a=el('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function attribution(asset){
    const wrap=el('div',undefined,'media-attribution');wrap.append(el('p',asset.credit));
    const links=el('div',undefined,'photo-links');links.append(mediaLink('사진 출처 · Wikimedia Commons',asset.source),mediaLink(asset.license,asset.licenseUrl));wrap.append(links);return wrap;
  }
  function showMedia(ids){
    const body=showModal('실제 관측 사진');
    body.append(el('p','탐사선과 망원경이 기록한 우주를 자세히 살펴보세요. 색 보정·합성 여부와 촬영자를 사진마다 표시했어요.','modal-intro'));
    ids.forEach(id=>{const asset=M[id];if(!asset)return;const section=el('section',undefined,'media-view'),img=el('img');img.src=asset.src;img.alt=asset.title;img.loading='lazy';
      img.onerror=()=>{img.hidden=true;section.append(el('p','사진을 불러오지 못했어요. 창을 닫고 다시 열어 주세요.','photo-error'));};
      section.append(el('h3',asset.title),el('p',asset.kind,'photo-type'),img,attribution(asset),el('p',asset.changes,'media-changes'));body.append(section);
    });
  }
  function renderPhotoCredit(){
    if(!state)return;
    const target=state.destination,asset=M[target==='sky'?S.skyPhotoId():target==='observatory'?(C.phases[state.phase].day===15?'moon':`phase-${C.phases[state.phase].day}`):target],box=$('photo-credit');box.replaceChildren();
    $('capture').disabled=!S.isArrived() || !S.canCapture();
    if(asset){
      const status=S.mediaStatus();
      $('scene-note').textContent=status==='ready'?S.is3D()?'관측 자료 기반 3D 우주 · 크기·거리·공전 속도·배경 별은 체험용':`${asset.kind}`:status==='error'?'자료 로딩 실패 · 아래에서 다시 불러오기':S.is3D()?'3D 표면 지도 로딩 중':'실제 관측 사진 로딩 중';
      box.append(el('p',S.is3D()?S.textureCredit():asset.kind,'photo-type'));if(S.is3D()){box.append(mediaLink('3D 지도 출처·이용 조건','TEXTURE_CREDITS.md'));}else box.append(attribution(asset));
      if(status==='error')box.append(button('사진 다시 불러오기',()=>{S.retryPhoto();renderPhotoCredit();}));
    }else{
      $('scene-note').textContent=target==='sky'?'학습 지도 · 실제 별자리 사진은 아래에서 비교':'달의 모양 변화 모형 · 실제 관측 사진과 구분';
      box.append(el('p',target==='sky'?'별자리 모양을 단순화한 학습 지도예요. 실제 사진과 비교해 보세요.':'달의 밝은 부분 변화를 보여 주는 학습 모형이에요. 실제 달 표면은 관측 사진으로 살펴보세요.'));
    }
    box.append(button(asset?'실제 사진 크게 보기 ↗':'실제 관측 사진과 비교 ↗',()=>showMedia(target==='sky'?[S.skyPhotoId()]:target==='observatory'?[C.phases[state.phase].day===15?'moon':`phase-${C.phases[state.phase].day}`]:mediaIds(target))));
  }
  window.addEventListener('space-image-change',event=>{if(state && (event.detail.id===state.destination||state.destination==='sky'||state.destination==='observatory'))renderPhotoCredit();});
  const defaultMissions=[...C.missions];
  function start(mode,resume=false){
    if(!classCredentials)C.missions=defaultMissions;
    state=resume?read(mode):D.fresh(mode);if(!state)state=D.fresh(mode);
    active=true;$('classroom').hidden=true;$('welcome').hidden=true;$('game').hidden=false;$('mode-label').textContent=state.mode==='assessment'?'ASSESSMENT / 관측 평가 · 최종 제출 전 수정 가능':'FREE EXPLORATION / 자유 탐험';
    $('scale-open').hidden=true;S.start();S.setColor(state.color);S.setPhase(state.phase);selection=[];message='';renderRoutes();travel(state.destination);gotoMission(state.mission);save();window.scrollTo(0,0);
  }
  function chooseStart(mode){
    const old=read(mode);const body=showModal(mode==='assessment'?'단원 평가를 시작할까요?':'새로운 탐험을 떠나요');
    body.append(el('p',mode==='assessment'?'25개 임무에서 관측 사진을 모으고 답을 제출해요. 최종 제출 전에는 답을 고칠 수 있어요. 정답과 해설은 제공하지 않아요. 조종 시간은 점수에 들어가지 않아요.':'행성을 자유롭게 방문하고 사진과 관측 기록을 모아요. 임무는 다시 도전할 수 있어요.','modal-intro'));
    if(old)body.append(el('p','이 모드의 기록이 있어요. 새로 시작하면 이 브라우저의 해당 모드 기록이 바뀌어요.','small'));
    const actions=el('div',undefined,'modal-actions');
    if(old)actions.append(button('이전 기록 이어가기',()=>{closeModal();start(mode,true);}));
    actions.append(button(old?'새 기록으로 시작':'출발하기',()=>{closeModal();start(mode,false);},'primary'));body.append(actions);
  }
  $('start-practice').onclick=()=>chooseStart('practice');$('start-assessment').onclick=()=>chooseStart('assessment');
  $('resume').hidden=!read(lastMode());$('resume').onclick=()=>start(lastMode(),true);
  $('home').onclick=()=>{save();window.SpaceClass.leave();classCredentials=null;active=false;S.stop();$('game').hidden=true;$('welcome').hidden=false;$('resume').hidden=false;window.scrollTo(0,0);};
  function renderRoutes(){
    const list=$('destinations');list.replaceChildren();
    (state.mode==='assessment'?[...C.bodies].sort((a,b)=>a.name.localeCompare(b.name,'ko')):C.bodies).forEach((b,i)=>{if(i===9 || i===12)list.append(el('div',undefined,'destination-divider'));const n=button('',()=>travel(b.id),'destination'+(state.destination===b.id?' active':''));n.dataset.destination=b.id;n.setAttribute('aria-pressed',String(state.destination===b.id));const dot=el('span',undefined,'planet-dot');dot.style.background=b.color;n.append(dot,el('span',b.name));n.append(el('small',state.photos.some(p=>p.key===b.id)?'✓':b.kind==='확장 탐험'?'+':''));list.append(n);});
  }
  function travel(id){
    state.destination=id;const body=C.bodies.find(b=>b.id===id);$('destination-en').textContent=body.en;$('destination-name').textContent=body.name;
    $('flight-status').textContent='항해 준비';$('capture').disabled=true;$('autopilot').disabled=false;$('autopilot').textContent='자동 항해';$('phase-controls').hidden=true;$('sky-controls').hidden=true;$('star-targets').hidden=true;
    $('flight-help').textContent='W/S: 전후진 · A/D: 좌우 이동 · Z/X: 상승·하강 · Q/E: 행성 돌려보기 · 드래그·휠·터치도 가능';
    S.travel(id,arrive);if(!S.is3D())$('flight-help').textContent='자동 항해로 관측 지점에 도착한 뒤 날짜나 별 표식을 선택해요.';renderPhotoCredit();renderRoutes();save();
  }
  function arrive(){
    $('flight-status').textContent='관측 준비 완료';$('capture').disabled=!S.canCapture();$('autopilot').disabled=true;$('autopilot').textContent='도착 완료';
    $('flight-help').textContent=S.is3D()?'W/S: 전후진 · A/D: 좌우 이동 · Z/X: 상승·하강 · Q/E: 행성 돌려보기. 터치는 한 손가락 회전·두 손가락 거리 조절.':'관측 날짜나 별자리 표식을 선택하고 사진을 찍어 보세요.';
    const b=C.bodies.find(v=>v.id===state.destination);
    renderPhotoCredit();
    $('phase-controls').hidden=b.id!=='observatory';$('sky-controls').hidden=b.id!=='sky';$('star-targets').hidden=b.id!=='sky';updatePhase();renderStarTargets();toast(`${b.name}에 도착했어요!`);
  }
  $('autopilot').onclick=()=>{S.auto();$('flight-status').textContent='자동 항해 중';$('autopilot').disabled=true;$('flight-help').textContent='목표 지점으로 이동 중이에요. 방향키를 누르면 직접 조종으로 바뀌어요.';};
  // Manual intervention must leave autopilot available again.
  function manual(){if(active&&!S.isArrived()){$('autopilot').disabled=false;$('flight-status').textContent='직접 조종 중';}}
  window.addEventListener('space-manual-flight',manual);
  $('observation').addEventListener('keydown',manual);
  $('space').addEventListener('keydown',e=>{if(/^(Arrow(Up|Down|Left|Right)|[wasdqe])$/i.test(e.key))manual();});document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',manual);b.addEventListener('click',manual);});
  function updatePhase(){$('phase-range').value=state.phase;$('phase-label').textContent=`${C.phases[state.phase].day}일` ;S.setPhase(state.phase);}
  $('phase-range').oninput=e=>{state.phase=Number(e.target.value);updatePhase();renderPhotoCredit();save();};$('guides').onchange=e=>S.setGuides(e.target.checked);
  function renderStarTargets(){
    $('star-targets').replaceChildren();S.skyTargets().forEach((star,i)=>{const b=button('',()=>{const m=C.missions[state.mission];if(m.type!=='star'){toast('북극성 임무에서 이 표식을 제출할 수 있어요.');return;}if(state.finished){toast('이미 제출한 표식이에요.');return;}selection=[star.id];S.select(star.id);renderMission();renderStarTargets();},'star-hit');b.style.left=star.x+'%';b.style.top=star.y+'%';b.setAttribute('aria-label',`관측 별 ${i+1}`);b.setAttribute('aria-pressed',String(selection[0]===star.id));b.dataset.star=star.id;$('star-targets').append(b);});
  }
  $('capture').onclick=()=>{
    if(!S.isArrived() || !S.canCapture())return;const key=D.photoKey(state.destination,C.phases[state.phase].day);
    const photo={key,image:S.photo(),captureVersion:S.is3D()?3:2,textureId:S.is3D()?state.destination:null,mediaId:state.destination==='observatory'?(C.phases[state.phase].day===15?'moon':`phase-${C.phases[state.phase].day}`):state.destination==='sky'?S.skyPhotoId():!S.is3D()&&M[state.destination]?state.destination:null};
    const existing=state.photos.findIndex(p=>p.key===key);
    if(existing<0)state.photos.push(photo);else state.photos[existing]=photo;
    save();renderRoutes();renderMission();toast('관측 사진을 우주도감에 담았어요.');
  };
  function currentAnswer(){return C.missions[state.mission].type==='short'?($('written-answer')?.value || state.drafts[C.missions[state.mission].id] || ''):selection;}
  function renderMission(){
    const m=C.missions[state.mission],record=state.answers[m.id],locked=state.finished,count=Object.keys(state.answers).length;
    $('photo-count').textContent=state.photos.length;$('progress-label').textContent=`${count} / ${C.missions.length}`;$('progress').max=C.missions.length;$('progress').value=count;
    $('mission-number').textContent=`MISSION ${String(state.mission+1).padStart(2,'0')} / ${C.missions.length}`;$('prev-mission').disabled=state.mission===0;$('next-mission').disabled=state.mission===C.missions.length-1;
    $('mission-content').replaceChildren(el('p',C.areas[m.area],'area-label'),el('h3',m.title),el('p',m.brief));
    const controls=$('answer-controls');controls.replaceChildren();
    if(m.type==='short'){
      const label=el('label','관찰한 특징 두 가지 (5~400자)','small');label.htmlFor='written-answer';const input=el('textarea');input.id='written-answer';input.maxLength=400;input.placeholder='직접 관찰한 특징을 써 주세요.';input.value=state.drafts[m.id] ?? record?.value ?? '';input.disabled=locked;
      input.addEventListener('input',()=>{state.drafts[m.id]=input.value;save();updateSubmit();});controls.append(label,input,el('p','이 설명은 선생님 확인 항목이에요.','tiny'));
    }else if(m.type==='star')controls.append(el('p',selection.length?'사진에 탐사 표식을 남겼어요. 아래에서 제출해 주세요.':'사진 속 별을 눌러 주세요.','small'));
    else{
      if(m.type==='order')controls.append(el('p','순서대로 누르세요. 누른 카드를 다시 누르면 그 뒤 순서도 취소돼요.','tiny'));
      m.options.forEach((text,i)=>{const selected=selection.includes(i),b=button('',()=>{message='';if(m.type==='choice')selection=[i];else if(m.type==='order'){const index=selection.indexOf(i);selection=index<0?[...selection,i]:selection.slice(0,index);}else selection=selected?selection.filter(v=>v!==i):[...selection,i];renderMission();},'answer-option'+(selected?' selected':''));b.setAttribute('aria-pressed',String(selected));b.disabled=locked;b.dataset.option=i;b.append(el('span',m.type==='order'&&selected?String(selection.indexOf(i)+1):selected?'✓':String(i+1),'option-index'),el('span',text));controls.append(b);});
    }
    const remaining=(m.days||[null]).filter(day=>!state.photos.some(p=>p.key===D.photoKey(m.target,day)));
    $('evidence-status').textContent=remaining.length?(m.days?`필요한 관측 사진: ${remaining.join('일 · ')}일`:`먼저 ${C.bodies.find(b=>b.id===m.target).name} 사진을 찍어 주세요.`):'✓ 관측 증거를 모두 모았어요';
    $('mission-travel').hidden=state.destination===m.target;$('submit-answer').textContent=locked?'제출 완료':record?'관측 결과 다시 제출':'관측 결과 제출';
    $('feedback').textContent=message || (record?'답안을 저장했어요. 최종 제출 전까지 수정할 수 있어요.':'');
    $('finish').hidden=count!==C.missions.length || state.finished;updateSubmit();
    document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===state.color)));
  }
  function updateSubmit(){const m=C.missions[state.mission],a=currentAnswer();$('submit-answer').disabled=networkBusy || state.finished || !D.ready(state,m) || (m.type==='short'?a.trim().length<5:m.type==='order'?a.length!==m.options.length:a.length===0);}
  $('phase-enlarge').onclick=()=>showMedia([C.phases[state.phase].day===15?'moon':`phase-${C.phases[state.phase].day}`]);
  $('sky-enlarge').onclick=()=>showMedia([S.skyPhotoId()]);
  function chooseSkyPhoto(id){S.setSkyPhoto(id);renderStarTargets();renderPhotoCredit();document.querySelectorAll('[data-sky-photo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skyPhoto===id)));}
  document.querySelectorAll('[data-sky-photo]').forEach(b=>b.onclick=()=>chooseSkyPhoto(b.dataset.skyPhoto));
  function gotoMission(index){state.mission=index;if(C.missions[index].target==='sky')chooseSkyPhoto(C.missions[index].id==='cassiopeia'?'cassiopeia':'ursa-minor');message='';const record=state.answers[C.missions[index].id];selection=Array.isArray(record?.value)?[...record.value]:[];S.select(C.missions[index].type==='star'?selection[0]:null);renderMission();renderStarTargets();save();}
  $('prev-mission').onclick=()=>gotoMission(state.mission-1);$('next-mission').onclick=()=>gotoMission(state.mission+1);
  $('mission-travel').onclick=()=>{travel(C.missions[state.mission].target);$('space').scrollIntoView({block:'center',behavior:'instant'});};
  $('submit-answer').onclick=async()=>{
    if(networkBusy||state.finished)return;const m=C.missions[state.mission],value=currentAnswer();networkBusy=true;updateSubmit();
    try{if(classCredentials)await window.SpaceClass.save(state.mission,value,(m.days||[null]).map(day=>D.photoKey(m.target,day)));
      if(D.submit(state,m.id,value)){message='답안을 저장했어요.';save();renderMission();toast('답안 저장 완료');}
    }catch(e){message=e.message;renderMission();}finally{networkBusy=false;updateSubmit();}
  };
  $('finish').onclick=async()=>{if(networkBusy||Object.keys(state.answers).length!==C.missions.length)return;if(JSON.stringify(currentAnswer())!==JSON.stringify(state.answers[C.missions[state.mission].id]?.value)){toast('현재 바꾼 답을 먼저 저장해 주세요.');return;}networkBusy=true;$('finish').disabled=true;
    try{if(classCredentials)await window.SpaceClass.submit();state.finished=true;save();renderMission();report();}catch(e){toast(e.message);}finally{networkBusy=false;$('finish').disabled=false;}
  };
  document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{state.color=b.dataset.color;S.setColor(state.color);save();renderMission();});
  function codex(){
    const body=showModal('나의 우주도감');body.append(el('p',`${state.photos.length}장의 관측 기록 · ${Object.keys(state.answers).length}개의 임무 보고서`,'modal-intro'));
    if(!state.photos.length){body.append(el('p','천체에 도착해서 첫 사진을 찍어 보세요.','empty-note'));return;}
    const grid=el('div',undefined,'photo-grid');state.photos.forEach(p=>{const [id,day]=p.key.split(':'),b=C.bodies.find(b=>b.id===id),card=el('article',undefined,'photo-card'),img=el('img');img.src=p.image;img.alt=`${b.name}${day?' '+day+'일':''} ${p.mediaId?'관측 사진':'학습 모형 기록'}`;if(!p.image)img.hidden=true;const copy=el('div');copy.append(el('h3',`${b.name}${day?' · '+day+'일':''}`),el('p','탐사 중 수집한 관측 기록'));if(!p.image)copy.append(el('p','다른 기기에서 저장한 관측 기록'));if(p.textureId)copy.append(el('p','관측 자료 기반 3D 재현','photo-type'),mediaLink('3D 지도 출처·이용 조건','TEXTURE_CREDITS.md'));else if(p.mediaId && M[p.mediaId])copy.append(el('p',M[p.mediaId].kind,'photo-type'),attribution(M[p.mediaId]));else copy.append(el('p',p.captureVersion===2?'학습 모형 기록':'이전 모형 기록 · 다시 촬영하면 새 사진으로 바뀌어요.'));card.append(img,copy);grid.append(card);});body.append(grid);
  }
  $('codex-open').onclick=codex;
  function answerText(m,value){if(typeof value==='string')return value;if(!Array.isArray(value))return'미제출';return value.map(v=>m.type==='star'?`지도 표식 ${C.stars.findIndex(s=>s.id===v)+1}`:m.options[v]).join(m.type==='order'?' → ':' / ');}
  function report(){
    const body=showModal(state.closedWithoutSubmit?'평가가 마감되었어요':state.finished?'탐사 제출 완료':'내 답안 기록');
    body.append(el('p',`${Object.keys(state.answers).length}/${C.missions.length}개 저장 · ${state.photos.length}개 관측 기록`,'modal-intro'),el('p',state.closedWithoutSubmit?'평가가 마감되어 저장된 답안까지만 기록되었어요.':state.finished?'탐사 기록을 제출했어요. 정답과 해설은 제공하지 않아요.':'관찰한 내용을 바탕으로 스스로 답해 보세요. 최종 제출 전에는 답을 수정할 수 있어요.'));
    C.missions.forEach((m,i)=>{const item=el('section',undefined,'report-item');item.append(el('h3',`${i+1}. ${m.title}`),el('p',`내 답: ${answerText(m,state.answers[m.id]?.value)}`));body.append(item);});
  }
  $('report-open').onclick=report;
  $('scale-open').onclick=()=>{const body=showModal('실제 크기와 거리 비교');body.append(el('p','행성의 지름은 지구를 1로, 태양까지의 평균 거리는 지구–태양 거리를 1로 비교했어요. 막대는 지름 비율이에요.','modal-intro'));const wrap=el('div',undefined,'table-scroll'),table=el('table'),thead=el('thead'),tr=el('tr');['천체','지름 (지구 = 1)','평균 거리 (AU)'].forEach(t=>tr.append(el('th',t)));thead.append(tr);table.append(thead);const tb=el('tbody');C.bodies.slice(1,9).forEach(b=>{const row=el('tr'),size=el('td'),bar=el('span',undefined,'compare-bar');bar.style.width=(b.size/11.2*120)+'px';size.append(el('span',`${b.size} `),bar);row.append(el('th',b.name),size,el('td',String(b.au)));tb.append(row);});table.append(tb);wrap.append(table);body.append(wrap,el('p','태양의 지름은 지구의 약 109배예요. 행성들은 늘 일렬로 놓여 있지 않아요. 항해 지도는 순서를 익히기 위한 모형이에요.','small'));};
  $('sources').onclick=()=>{const body=showModal('학습 범위와 자료 출처');body.append(el('p','2022 개정 교육과정 [4과13-01~03]을 바탕으로 구성했어요. 교과서의 별자리 구성·평가 기준에 따라 선생님의 확인이 필요해요.','modal-intro'),el('p','달·태양·행성은 관측 자료 기반 표면 지도를 입힌 3D 모형입니다. 원본 관측 사진은 별도 비교할 수 있습니다. 비행 중 별 배치와 거리·속도는 체험용이며 실제 우주 비율이 아닙니다. 은하수는 실제 밤하늘 사진입니다. 색 강조·합성 사진은 따로 표시합니다. 달의 날짜 변화는 학습 모형입니다. 별자리 탐사는 위키미디어의 실제 사진을 사용하며 원본의 연결선과 이름을 유지합니다.','small'));
    body.append(button('사용한 실제 사진 20장과 이용 조건 보기',()=>showMedia(Object.keys(M)),'primary'));
    const sources=[['경기도교육청 · 수업·평가 계획 (83~84쪽)','https://www.goe.go.kr/resource/goe/na/bbs_2675/2025/07/f4c15fac-ae7b-46aa-8e16-b8d86b710d44.pdf'],['NASA · 태양계와 행성','https://science.nasa.gov/solar-system/planets/'],['NASA · 달의 특징','https://science.nasa.gov/moon/facts/'],['NASA · 북극성과 별자리','https://science.nasa.gov/skywatching/faq/'],['NASA · 행성 크기와 거리','https://nssdc.gsfc.nasa.gov/planetary/factsheet/']];const list=el('ul');sources.forEach(([name,url])=>{const li=el('li'),a=el('a',name);a.href=url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);});body.append(list,el('p','학급 평가는 번호와 답안을 서버에 저장합니다. 촬영 이미지는 이 기기에 보관하고, 관측한 대상 기록만 답안과 함께 저장합니다. 학생 화면에는 정답·해설을 공개하지 않습니다.','small'));};
  $('toggle-route').onclick=()=>{const open=$('game').classList.toggle('route-open');$('toggle-route').setAttribute('aria-expanded',String(open));};
  $('toggle-mission').onclick=()=>{const closed=$('game').classList.toggle('mission-closed');$('toggle-mission').setAttribute('aria-expanded',String(!closed));};
  window.SpaceGame={
    openClass(snapshot,credentials){
      classCredentials=credentials;C.missions=snapshot.questions;let stored=null;try{stored=D.restore(localStorage.getItem(prefix+`class.${credentials.roomId}.${credentials.number}`));}catch{}
      start('assessment');if(stored){state.photos=stored.photos;state.destination=stored.destination;state.phase=stored.phase;state.mission=stored.mission;state.drafts=stored.drafts;}
      state.answers={};snapshot.student.answers.forEach((raw,i)=>{if(!raw)return;try{const a=JSON.parse(raw);state.answers[C.missions[i].id]={value:a.value,correct:null};for(const key of a.evidence)if(!state.photos.some(p=>p.key===key))state.photos.push({key,image:null});}catch{}});
      state.finished=snapshot.student.submitted||snapshot.room.status!=='open'||snapshot.room.expired;state.closedWithoutSubmit=state.finished&&!snapshot.student.submitted;
      $('mode-label').textContent=`${snapshot.room.school} ${snapshot.room.grade}학년 ${snapshot.room.classNo}반 · ${credentials.number}번`;
      travel(state.destination);gotoMission(state.mission);save();if(state.finished)report();
    },
    classStatus(snapshot){if(!classCredentials)return;if(snapshot.student.submitted||snapshot.room.status!=='open'||snapshot.room.expired){state.finished=true;state.closedWithoutSubmit=!snapshot.student.submitted;renderMission();$('save-status').textContent='· 제출 완료 또는 평가 마감';}},
    connectionError(text){$('save-status').textContent='· '+text;}
  };
})();
