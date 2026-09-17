(function(){
  'use strict';
  const U=FWUI,C=FWContent;let mode='hub';
  function setMode(next){mode=next;document.body.dataset.world=next;}
  function home(){FWTower.suspend();setMode('hub');const p=FWStore.get(),attempts=p.stats.reduce((n,s)=>n+s.attempts,0)+Object.values(p.studyStats||{}).reduce((n,s)=>n+s.attempts,0),correct=p.stats.reduce((n,s)=>n+s.first,0)+Object.values(p.studyStats||{}).reduce((n,s)=>n+s.correct,0);
    U.render(`<section class="camp-home"><div class="camp-art">${U.art('tower')}<div class="camp-title"><small>스터디 타운</small><h1>균열의 탑</h1><p>내 무기, 내 선택으로 떠나는 모험</p></div></div><div class="camp-desk"><div><label for="save-slot">모험가의 자리</label><select id="save-slot">${[0,1,2].map(i=>`<option value="${i}" ${FWStore.slot()===i?'selected':''}>모험가 ${i+1}</option>`).join('')}</select><p>${p.tower?`${p.tower.best}개 방을 지나왔어요.`:'오늘은 어떤 보물을 만나게 될까?'}</p><button id="enter-tower" class="primary">${p.tower?p.tower.phase==='ended'?'지난 모험 결과':'모험 이어가기':'새 모험 출발'} →</button>${p.tower&&p.tower.phase!=='ended'?'<button data-abandon-tower class="quiet">이번 모험 그만두기</button>':''}</div><div class="camp-keepsakes"><button id="camp-journal"><span class="book-emblem">✎</span><b>모험 수첩</b><small>내 풀이와 발자취</small></button><button id="collection-button"><span class="book-emblem">✦</span><b>보물 도감</b><small>발견한 유물 ${p.collection.length} / ${C.relics.length}</small></button></div></div>${FWStore.warning()?`<p class="warning">${U.esc(FWStore.warning())}</p>`:''}<footer class="camp-footer"><a href="https://dj48-quiztown-firebase.web.app/">← 퀴즈타운</a><details><summary>저장 칸 관리</summary><p>진행은 이 기기에 저장돼요. 랭킹은 연결한 계정에 남아요.</p><button id="reset-slot" class="quiet danger">이 저장 칸 처음부터</button></details></footer></section>`);
    U.$('enter-tower').onclick=FWTower.enter;U.$('save-slot').onchange=e=>{FWStore.switchSlot(Number(e.target.value));home();soundLabel();};U.$('collection-button').onclick=collection;U.$('camp-journal').onclick=journal;U.$('reset-slot').onclick=()=>resetProgress('slot');
  }

  function resetProgress(kind){
    const slot=FWStore.slot(),profile=FWStore.get(),all=kind==='slot';let confirmed=false,restart=false;
    if(!all&&!profile.tower)return;
    U.modal(`<section class="reset-progress"><span class="eyebrow">모험가 ${slot+1} 저장 칸</span><h2>${all?'이 저장 칸을 처음부터 시작할까요?':'이번 탐험을 그만둘까요?'}</h2><p>${all?'이 칸의 기록이 모두 지워져요.':'지금 탐험하는 방과 무기 강화, 유물 가방, 결정이 사라져요.'}</p><div class="panel"><b>${all?'지워지는 것':'남아 있는 것'}</b><p>${all?'탑 탐험 · 풀었던 문제 기록<br>발견 도감 · 얻은 무기와 코스튬 · 트로피':'얻은 무기와 코스튬 · 발견 도감 · 풀었던 문제 기록<br>이전 탐험 기록'}</p></div><p class="fine">${all?'다른 저장 칸은 그대로예요. 지운 기록은 되돌릴 수 없어요.':'다음 탐험은 무기와 난이도를 다시 골라 시작해요.'}</p><p id="reset-error" role="alert"></p><div class="confirm-actions"><button id="reset-cancel" class="primary">${all?'지우지 않기':'계속할래요'}</button><button id="reset-confirm" class="danger">${all?'모험가 '+(slot+1)+' 기록 모두 지우기':'그만두고 새 탐험 준비'}</button></div></section>`,()=>{
      U.$('reset-cancel').focus();U.$('reset-cancel').onclick=U.close;
      U.$('modal').addEventListener('close',()=>{if(restart&&!confirmed)FWTower.enter();},{once:true});
      U.$('reset-confirm').onclick=()=>{
        if(confirmed||FWStore.slot()!==slot||FWStore.get()!==profile)return;
        const clearQuiz=all||profile.quiz?.mode?.startsWith('tower-');
        FWTower.suspend();restart=mode==='tower';if(profile.tower?.ranking){const previous=JSON.parse(JSON.stringify(profile.tower));previous.phase='ended';previous.retryPending=false;window.FWRanking?.finish(previous);}
        if(!(all?FWStore.resetSlot(slot):FWStore.discardTower(slot))){U.$('reset-error').textContent='기록을 저장하지 못해서 지우지 않았어요. 잠시 뒤 다시 해 주세요.';return;}
        confirmed=true;if(clearQuiz)FWQuiz.dismiss();U.close();home();soundLabel();
        if(!all)FWTower.enter();U.toast(all?'모험가 '+(slot+1)+' 저장 칸을 비웠어요.':'새 탐험을 준비해 보세요!');
      };
    });
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-abandon-tower]'))resetProgress('tower');});
  function journal(){FWStudyHub.journal();}
  function collection(){FWCodex.open();}
  function help(){FWHelp.enter();}
  function soundLabel(){U.$('sound-button').textContent=FWStore.get().settings.sound?'효과음 켜짐':'효과음 꺼짐';U.$('sound-button').setAttribute('aria-label',FWStore.get().settings.sound?'효과음 끄기':'효과음 켜기');}
  U.$('home-button').onclick=home;U.$('journal-button').onclick=journal;U.$('help-button').onclick=help;U.$('sound-button').onclick=()=>{const p=FWStore.get();p.settings.sound=!p.settings.sound;U.save();soundLabel();U.sound('good');};
  // A normal link also checkpoints the active battle before navigation.
  window.addEventListener('pagehide',()=>{FWTower.suspend();FWStore.save();});
  window.FWApp={home,journal,setMode,soundLabel};home();soundLabel();
})();
