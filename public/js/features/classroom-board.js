(function(root){
  'use strict';
  let active=null;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
  const btn=(text,fn,cls='')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
  const D=()=>root.DJ48ClassroomBoardDomain;
  function modal(title){const d=el('dialog','classroom-board-dialog');d.setAttribute('aria-label',title);document.body.append(d);d.showModal();return d;}
  async function open(deps){
    if(active)return;
    const member=deps.getMemberUserId(),uid=deps.getAuthUid();if(!member||!uid)return;
    const opener=document.activeElement,dialog=modal('전자칠판 수업 보드');active=dialog;
    let state=null,day=D().dateKey(),questId='',locked=true,pin='',busy=false,loading=false,closed=false,selected=new Set(),counts={},lastInput=Date.now(),mode='cards';
    const scope=()=>!closed&&deps.getMemberUserId()===member&&deps.getAuthUid()===uid;
    async function call(p){if(!scope())throw Error('계정이 바뀌었습니다. 보드를 다시 열어 주세요.');const r=await deps.call({classId:deps.classId,memberUserId:member,dateKey:day,...p});if(!scope())throw Error('계정이 바뀌었습니다.');return r;}
    dialog.innerHTML=`<header class="board-header"><div><span>우리 교실 · 함께 확인해요</span><h2>수업 보드</h2></div><div class="board-actions"><button data-full>전체화면</button><button data-lock>교사 조작 열기</button><button data-close>교실로 돌아가기</button></div></header>
      <div class="board-toolbar"><button data-sidebar aria-expanded="true">활동 목록 접기</button><label>활동 날짜 <input type="date" data-day></label><button data-refresh>새로고침</button><span data-connection role="status" aria-live="polite">불러오는 중…</span></div>
      <div class="board-layout"><aside class="board-sidebar"><label>활동 검색<input type="search" data-search placeholder="활동 이름 검색"></label><div class="board-filters"><select data-period aria-label="활동 기간"><option value="today">선택한 날</option><option value="week">이번 주</option><option value="all">전체</option></select><select data-category aria-label="활동 분류"><option value="">모든 분류</option></select></div><nav data-quests aria-label="활동 목록"></nav></aside>
      <main class="board-main"><div class="board-heading"><div><h3 data-title>활동을 선택해 주세요</h3><p data-meta></p></div><div class="board-actions"><button data-cards aria-pressed="true">카드</button><button data-list aria-pressed="false">리스트</button><label>한 줄 <select data-columns><option value="auto">자동</option><option value="5">5명</option><option value="6">6명</option><option value="7">7명</option><option value="8">8명</option></select></label></div></div>
      <p class="board-public-note">공개 보기 · 잔액과 제출 내용은 표시하지 않아요.</p><div class="board-batch" hidden><button data-all>전체 선택</button><button data-none>선택 해제</button><button data-complete>선택 학생 완료·승인</button><button data-import>이전 자료 사전 검증</button><span data-selected></span></div>
      <p data-result role="status" aria-live="polite"></p><section class="board-students" aria-label="학생 완료 현황"></section><section class="board-detail" hidden></section></main></div>`;
    const $=s=>dialog.querySelector(s),status=$('[data-connection]'),grid=$('.board-students'),detail=$('.board-detail');
    $('[data-day]').value=day;$('[data-day]').max=day;
    function close(){if(busy)return;closed=true;clearInterval(timer);dialog.close();dialog.remove();active=null;opener?.focus();deps.onClosed?.();}
    $('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('pointerdown',()=>{lastInput=Date.now();});dialog.addEventListener('keydown',()=>{lastInput=Date.now();});
    function lock(){locked=true;selected.clear();detail.hidden=true;detail.replaceChildren();if(state)state.students.forEach(s=>{delete s.submission;s.boostPoint=0;});render();}
    $('[data-lock]').onclick=async()=>{
      if(busy||loading)return;
      if(!locked){lock();await refresh();return;}
      const value=await ask(pin?'교사 조작 암호':'이 보드에서 사용할 조작 암호 설정',pin?'처음 설정한 암호를 입력하세요.':'수업 중 잠금을 풀 때 사용할 4자 이상 암호입니다. 이 창을 닫으면 사라집니다.','password');
      if(value===null)return;if(value.length<4||pin&&value!==pin){$('[data-result]').textContent='조작 암호를 확인해 주세요.';return;}
      pin=value;locked=false;await refresh();
    };
    $('[data-full]').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await dialog.requestFullscreen();}catch(_){$('[data-result]').textContent='이 브라우저에서는 전체화면을 사용할 수 없습니다.';}};
    $('[data-sidebar]').onclick=()=>{const collapsed=dialog.classList.toggle('board-collapsed');$('[data-sidebar]').textContent=collapsed?'활동 목록 펼치기':'활동 목록 접기';$('[data-sidebar]').setAttribute('aria-expanded',String(!collapsed));};
    $('[data-refresh]').onclick=()=>refresh();
    $('[data-day]').onchange=()=>{if(busy||loading)return;$('[data-result]').textContent='';day=$('[data-day]').value;detail.hidden=true;detail.replaceChildren();selected.clear();counts={};refresh();};
    $('[data-search]').oninput=renderActivities;$('[data-period]').onchange=renderActivities;$('[data-category]').onchange=renderActivities;
    $('[data-columns]').onchange=()=>{const v=$('[data-columns]').value;grid.style.setProperty('--board-cols',v==='auto'?'':v);};
    $('[data-cards]').onclick=()=>{mode='cards';render();};$('[data-list]').onclick=()=>{mode='list';render();};
    $('[data-all]').onclick=()=>{if(!locked&&!busy)selected=new Set(state.students.filter(s=>canComplete(s)).map(s=>s.memberUserId));render();};$('[data-none]').onclick=()=>{selected.clear();render();};
    $('[data-complete]').onclick=()=>complete(state.students.filter(s=>selected.has(s.memberUserId)));
    $('[data-import]').onclick=showImport;
    const timer=setInterval(()=>{if(!scope()){close();return;}if(!locked&&Date.now()-lastInput>300000)lock();if(!busy&&!loading&&!document.hidden&&!detail.contains(document.activeElement))refresh(true);},15000);
    function quest(){return state?.quests.find(q=>q.id===state.questId);}
    function canComplete(s){return !locked&&D().available(quest()||{},day)&&s.record?.rewardStatus!=='paid'&&!s.history?.some(h=>h.status==='completed');}
    function renderActivities(){
      if(!state)return;const search=$('[data-search]').value.trim(),kind=$('[data-category]').value,filter=$('[data-period]').value;
      const start=D().period({repeatRule:'weekly'},day).slice(5),end=new Date(Date.parse(start)+6*86400000).toISOString().slice(0,10);
      const list=$('[data-quests]');list.replaceChildren();
      state.quests.filter(q=>(!search||(q.title+' '+q.desc).includes(search))&&(!kind||q.category===kind)&&(filter==='all'||filter==='week'?filter==='all'||(!q.startDate||q.startDate<=end)&&(!q.endDate||q.endDate>=start):D().available(q,day))).forEach(q=>{
        const b=btn('',()=>{if(busy||loading)return;questId=q.id;selected.clear();detail.hidden=true;$('[data-result]').textContent='';refresh();},'board-activity');b.setAttribute('aria-current',q.id===state.questId?'true':'false');
        const count=counts[q.id];b.append(el('strong','',q.title),el('span','',`${q.category||'활동'} · ${q.rewardCoin||0}P · ${{once:'한 번',daily:'매일',weekly:'매주'}[q.repeatRule||'once']}`),el('span','',`${q.startDate||'시작 제한 없음'} ~ ${q.endDate||'종료 제한 없음'}`),el('b','',count?`${count.completed}/${count.total} 완료`:'현황 확인 전'));
        if(!D().available(q,day))b.append(el('span','',q.active===false?'비공개':'선택 날짜에 진행하지 않는 활동'));list.append(b);
      });
      if(!list.children.length)list.append(el('p','','해당하는 활동이 없습니다.'));
    }
    function render(){
      if(!state)return;
      const q=quest(),completed=state.students.filter(s=>s.record?.rewardStatus==='paid'||s.history?.some(h=>h.status==='completed')).length;
      $('[data-title]').textContent=q?.title||'등록된 활동이 없습니다.';$('[data-meta]').textContent=`${day} · ${completed}/${state.students.length} 완료${q?' · '+D().period(q,day):''}`;
      dialog.classList.toggle('board-editing',!locked);
      $('[data-lock]').textContent=locked?'교사 조작 열기':'공개 보기로 잠그기';$('.board-public-note').textContent=locked?'공개 보기 · 잔액과 제출 내용은 표시하지 않아요.':'교사 조작 중 · 제출 내용은 상세에서만 확인합니다. 5분 동안 조작하지 않으면 잠깁니다.';
      $('.board-batch').hidden=locked;$('[data-selected]').textContent=`${selected.size}명 선택`;
      $('[data-cards]').setAttribute('aria-pressed',String(mode==='cards'));$('[data-list]').setAttribute('aria-pressed',String(mode==='list'));grid.classList.toggle('board-list',mode==='list');
      grid.replaceChildren();
      for(const s of state.students){
        const paid=s.record?.rewardStatus==='paid',imported=s.history?.some(h=>h.status==='completed'),pending=s.record?.rewardStatus==='pending_teacher_review';
        const card=el('article','board-student'+(paid||imported?' is-complete':pending?' is-pending':''));card.dataset.student=s.memberUserId;
        const face=el('div','board-face');if(s.profileImageUrl){const img=el('img');const url=deps.normalizeDisplayImageUrl?.(s.profileImageUrl)||s.profileImageUrl;if(/^(https:\/\/|\/(?!\/)|data:image\/(png|jpeg|webp);base64,)/.test(url)){img.src=url;img.alt='';img.onerror=()=>{img.remove();face.textContent='☺';};face.append(img);}else face.textContent='☺';}else face.textContent='☺';
        card.append(face,el('h4','',`${s.studentNumber} ${s.nickname}`),el('strong','board-state',paid?'✓ 완료':imported?'✓ 이전 완료':pending?'◷ 검토 대기':'○ 미완료'));
        if(paid)card.append(el('small','',`보상 지급됨 · ${s.record.rewardAmount}P`));if(imported)card.append(el('small','','그라운드 기록 · 새 보상 없음'));
        if(!locked){const controls=el('div','board-card-actions');const label=el('label','board-select'),checkbox=el('input');checkbox.setAttribute('aria-label',`${s.studentNumber}번 ${s.nickname} 선택`);checkbox.type='checkbox';checkbox.checked=selected.has(s.memberUserId);checkbox.disabled=busy||!canComplete(s);checkbox.onchange=()=>{checkbox.checked?selected.add(s.memberUserId):selected.delete(s.memberUserId);$('[data-selected]').textContent=`${selected.size}명 선택`;};label.append(checkbox,document.createTextNode('선택'));card.prepend(label);
          if(!paid&&!imported){const b=btn(pending?'승인':'완료 처리',()=>complete([s]),'board-primary');b.disabled=busy||!canComplete(s);controls.append(b);}
          const b=btn('상세 보기',()=>showDetail(s));b.disabled=busy;controls.append(b);card.append(controls);
        }
        grid.append(card);
      }
      if(!state.students.length)grid.append(el('p','','대상 학생이 없습니다. 활동의 대상 설정을 확인해 주세요.'));
      dialog.querySelectorAll('[data-day],[data-lock],[data-complete],[data-all],[data-none],[data-import]').forEach(n=>{n.disabled=busy||loading;});
      renderActivities();
    }
    async function refresh(quiet=false){
      if(busy||loading||!scope())return;loading=true;if(!quiet)status.textContent='불러오는 중…';
      try{const next=await call({action:'list',questId,private:!locked});state=next;questId=next.questId;counts=next.counts||{};selected=new Set([...selected].filter(id=>next.students.some(s=>s.memberUserId===id&&canComplete(s))));
        const category=$('[data-category]'),value=category.value;category.replaceChildren();const all=el('option','','모든 분류');all.value='';category.append(all);for(const c of [...new Set(next.quests.map(q=>q.category).filter(Boolean))]){const o=el('option','',c);o.value=c;category.append(o);}category.value=value;
        if($('[data-result]').textContent==='표시 중인 현황은 최신 정보가 아닐 수 있습니다.')$('[data-result]').textContent='';
        status.textContent=`${new Date(next.updatedAt).toLocaleTimeString('ko-KR')} 갱신 · 15초마다 확인`;
      }catch(e){status.textContent=`연결 실패 · ${e.message}. 새로고침해 주세요.`;if(!quiet)$('[data-result]').textContent='표시 중인 현황은 최신 정보가 아닐 수 있습니다.';}
      finally{loading=false;if(scope())render();}
    }
    async function complete(rows){
      rows=rows.filter(canComplete);if(!rows.length||busy||locked)return;
      const q=quest(),amount=D().money(rows.reduce((n,s)=>n+Number(q.rewardCoin||0)+(q.rewardCoin>0?Number(s.boostPoint||0):0),0));
      const ok=await confirmAction(`${rows.length}명 완료·승인`,`${rows.length}명에게 활동 보상 약 ${amount}P를 지급합니다. 젬 달성 보상은 별도로 반영되며, 이미 완료한 학생은 다시 지급하지 않습니다.`);if(!ok||locked)return;
      busy=true;render();const results=[];
      for(const s of rows){try{const r=await call({action:'complete',questId:q.id,targetMemberUserId:s.memberUserId,expectedRevision:s.record?.revision||0,requestId:crypto.randomUUID()});results.push(`${s.studentNumber}번 ${r.duplicate?'이미 완료':'완료'}`);selected.delete(s.memberUserId);}catch(e){results.push(`${s.studentNumber}번 실패: ${e.message}`);}}
      busy=false;$('[data-result]').textContent=results.join(' · ');await refresh();
    }
    function showDetail(s){
      if(locked)return;detail.hidden=false;detail.replaceChildren(el('h3','',`${s.studentNumber}번 ${s.nickname}의 기록`));
      const sub=s.submission?.submission;
      if(sub){if(sub.text)detail.append(el('p','board-submission-text',sub.text));if(sub.rating)detail.append(el('p','',`자기 평가: ${{high:'상',middle:'중',low:'하'}[sub.rating]}`));if(sub.labels)detail.append(el('p','',sub.labels.map((v,i)=>`${sub.checked.includes(i)?'✓':'○'} ${v}`).join('\n')));if(sub.imageData){const b=btn('제출 이미지 화면에 표시',()=>{const img=el('img','board-submission-image');img.src=sub.imageData;img.alt=sub.caption||'제출 이미지';b.replaceWith(img);});detail.append(b);}if(sub.type==='complete')detail.append(el('p','','완료 체크 제출'));}else detail.append(el('p','','별도 제출 내용이 없습니다.'));
      for(const h of s.history||[])detail.append(el('p','',`그라운드 · ${h.dateKey} · ${h.status} · 원본 ${h.sourceId} · 원본 보상 ${h.rewardPaid?'지급됨':'미지급'} · 새 보상 없음`));
      if(s.record){const f=el('textarea');f.maxLength=1000;f.value=s.submission?.feedback||'';f.setAttribute('aria-label','교사 피드백');detail.append(f,btn('피드백 저장',()=>perform('feedback',s,{feedback:f.value})));
        if(s.record.rewardStatus==='paid')detail.append(btn('완료 취소·보상 회수',async()=>{const reason=await ask('완료 취소','사유를 입력하세요. 포인트와 젬을 함께 회수하며, 안전하게 회수할 수 없으면 변경하지 않습니다.');if(reason)await perform('cancel',s,{reason});},'board-danger'));
        if(s.record.rewardStatus==='pending_teacher_review')detail.append(btn('반려',async()=>{const reason=await ask('제출 반려','학생에게 전달할 사유');if(reason)await perform('reject',s,{reason});}));
      }
      detail.append(btn('상세 닫기',()=>{detail.hidden=true;detail.replaceChildren();}));detail.scrollIntoView({block:'nearest'});
    }
    async function perform(action,s,extra){if(locked||busy)return;busy=true;render();try{await call({action,questId,targetMemberUserId:s.memberUserId,expectedRevision:s.record?.revision||0,requestId:crypto.randomUUID(),...extra});detail.hidden=true;$('[data-result]').textContent='처리했습니다.';}catch(e){$('[data-result]').textContent=e.message;}finally{busy=false;await refresh();}}
    function showImport(){
      if(locked)return;detail.hidden=false;detail.replaceChildren(el('h3','','그라운드 이전 사전 검증'),el('p','','version 1 JSON 파일을 선택하세요. 학생·활동·젬 ID 매핑과 잔액을 검사합니다. 이 화면은 운영 기록을 저장하지 않습니다.'));
      const input=el('input');input.type='file';input.accept='.json,application/json';input.setAttribute('aria-label','이전 자료 JSON');const output=el('pre','board-import-result');
      input.onchange=async()=>{if(!input.files[0])return;try{if(input.files[0].size>2000000)throw Error('2MB 이하의 자료를 선택하세요.');const r=await call({action:'previewImport',input:JSON.parse(await input.files[0].text())});output.textContent=JSON.stringify({ready:r.ready,issues:r.issues,students:r.wallets.length,records:r.records.length,totals:r.totals,currencyMap:r.currencyMap},null,2);}catch(e){output.textContent=e.message;}};
      detail.append(input,output,btn('닫기',()=>{detail.hidden=true;detail.replaceChildren();}));
    }
    await refresh();
  }
  async function ask(title,description,type='text'){
    const d=modal(title);d.className='board-prompt';d.append(el('h3','',title),el('p','',description));const input=el('input');input.type=type;input.maxLength=300;input.setAttribute('aria-label',title);d.append(input);
    return new Promise(resolve=>{const done=v=>{d.close();d.remove();resolve(v);};d.append(btn('취소',()=>done(null)),btn('확인',()=>done(input.value.trim()),'board-primary'));d.oncancel=e=>{e.preventDefault();done(null);};input.focus();input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();done(input.value.trim());}};});
  }
  async function confirmAction(title,description){const d=modal(title);d.className='board-prompt';d.append(el('h3','',title),el('p','',description));return new Promise(resolve=>{const done=v=>{d.close();d.remove();resolve(v);};d.append(btn('취소',()=>done(false)),btn('처리하기',()=>done(true),'board-primary'));d.oncancel=e=>{e.preventDefault();done(false);};});}
  async function submit(deps,quest){
    const member=deps.getMemberUserId(),uid=deps.getAuthUid(),d=modal('활동 제출');d.className='board-prompt board-submit';d.append(el('h3','',quest.title));let imageData='',busy=false,currentRevision=0;
    const body=el('div','board-submit-body'),status=el('p');status.setAttribute('role','status');d.append(body,status);
    const type=quest.submissionType||'complete';
    if(type==='text'){const n=el('textarea');n.maxLength=3000;n.rows=6;n.setAttribute('aria-label','제출 내용');body.append(n);}
    if(type==='rating'){const select=el('select');select.setAttribute('aria-label','자기 평가');for(const [v,t] of [['','선택하세요'],['high','상'],['middle','중'],['low','하']]){const o=el('option','',t);o.value=v;select.append(o);}body.append(select);}
    if(type==='checklist')for(const [i,t] of (quest.checklistItems||[]).entries()){const label=el('label'),n=el('input');n.type='checkbox';n.value=String(i);label.append(n,document.createTextNode(t));body.append(label);}
    if(type==='image'){const input=el('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.setAttribute('aria-label','제출 이미지');const preview=el('img','board-submission-image');body.append(input,preview,el('p','','사진은 긴 변 720px 이하로 줄여 비공개 제출합니다.'));
      input.onchange=async()=>{try{imageData='';if(!input.files[0])return;if(!['image/png','image/jpeg','image/webp'].includes(input.files[0].type)||input.files[0].size>10000000)throw Error('PNG·JPG·WebP, 10MB 이하를 선택하세요.');const bitmap=await createImageBitmap(input.files[0]);const canvas=document.createElement('canvas'),scale=Math.min(1,720/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();for(const quality of [.8,.6,.4,.25]){imageData=canvas.toDataURL('image/jpeg',quality);if(imageData.length<=180000)break;}if(imageData.length>180000)throw Error('사진이 너무 복잡합니다. 더 작은 사진을 선택하세요.');preview.src=imageData;status.textContent='사진을 준비했습니다.';}catch(e){imageData='';status.textContent=e.message;}};
    }
    if(type==='complete')body.append(el('p','','활동을 마쳤나요? 완료를 제출해 주세요.'));
    const cancel=btn('닫기',()=>{if(!busy){d.close();d.remove();}}),save=btn('제출하기',async()=>{
      if(busy)return;busy=true;save.disabled=true;cancel.disabled=true;
      try{if(member!==deps.getMemberUserId()||uid!==deps.getAuthUid())throw Error('계정이 바뀌었습니다. 다시 열어 주세요.');const submission=D().validateSubmission(quest,{text:body.querySelector('textarea')?.value,rating:body.querySelector('select')?.value,checked:[...body.querySelectorAll('input[type=checkbox]:checked')].map(n=>Number(n.value)),imageData});const r=await deps.call({classId:deps.classId,memberUserId:member,action:'submit',questId:quest.id,submission,expectedRevision:currentRevision,requestId:crypto.randomUUID()});status.textContent=r.rewardStatus==='paid'?'완료했어요. 보상을 받았습니다.':'제출했어요. 선생님의 확인을 기다려 주세요.';save.hidden=true;await deps.onSaved?.();}catch(e){status.textContent=e.message;}finally{busy=false;save.disabled=false;cancel.disabled=false;}
    },'board-primary');d.append(cancel,save);d.oncancel=e=>{if(busy)e.preventDefault();else d.remove();};
    save.disabled=true;
    try {
      const result=await deps.call({classId:deps.classId,memberUserId:member,action:'mine',questId:quest.id});
      if(!d.isConnected||member!==deps.getMemberUserId()||uid!==deps.getAuthUid())return;
      const row=result.students[0],old=row?.submission?.submission;currentRevision=row?.record?.revision||0;
      if(row?.submission?.feedback)body.prepend(el('p','board-submission-text','선생님: '+row.submission.feedback));
      if(old?.text&&body.querySelector('textarea'))body.querySelector('textarea').value=old.text;
      if(old?.imageData&&body.querySelector('img')){imageData=old.imageData;body.querySelector('img').src=imageData;}
      if(old?.rating&&body.querySelector('select'))body.querySelector('select').value=old.rating;
      if(old?.checked)body.querySelectorAll('input[type=checkbox]').forEach(n=>{n.checked=old.checked.includes(Number(n.value));});
      if(['paid','pending_teacher_review'].includes(row?.record?.rewardStatus)){save.hidden=true;status.textContent=row.record.rewardStatus==='paid'?'이미 완료한 활동입니다.':'선생님의 확인을 기다리고 있어요.';}
      else save.disabled=false;
    }catch(e){status.textContent='제출 상태를 불러오지 못했습니다. 닫고 다시 열어 주세요. '+e.message;}

  }
  root.DJ48ClassroomBoard={open,submit};
})(typeof window!=='undefined'?window:globalThis);
