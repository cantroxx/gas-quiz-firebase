(() => {
  'use strict';
  const D = window.CloudTowerDomain;
  const $ = id => document.getElementById(id);
  let storage;
  try { storage = window.localStorage; } catch (_) { storage = { getItem() { throw Error('unavailable'); }, setItem() { throw Error('unavailable'); } }; }
  const store = window.CloudTowerStore.create(storage, D);
  const scene = window.CloudTowerScene.create($('sky'));
  let state = null, mode = 'challenge', startingAt = 0, startedAt = 0, composing = false, sound = false, audio = null, nickname = '', assetsReady = false, currentZone = 0, bestFloor = 0, bannerUntil = 0;
  let remoteRun=null,inputTrace=[],submissionPending=false;
  const clock = () => performance.now();
  const busy = () => startingAt > 0 || ['playing','ending'].includes(state?.phase);
  function feedback(message, error = false) { $('feedback').textContent = message; $('feedback').classList.toggle('error', error); }
  function playTone(boost) {
    if (!sound || !audio) return;
    try {
      [523,659,boost?1047:784].forEach((frequency,i)=>{
        const osc=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime+i*.075;
        osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(.035,at);gain.gain.exponentialRampToValueAtTime(.001,at+.2);
        osc.connect(gain);gain.connect(audio.destination);osc.start(at);osc.stop(at+.21);
      });
    } catch (_) { /* Audio is optional. */ }
  }
  function landSound(){
    if(!sound||!audio)return;
    const osc=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime;
    osc.frequency.setValueAtTime(160,at);osc.frequency.exponentialRampToValueAtTime(45,at+.12);gain.gain.setValueAtTime(.06,at);gain.gain.exponentialRampToValueAtTime(.001,at+.16);osc.connect(gain);gain.connect(audio.destination);osc.start(at);osc.stop(at+.17);
  }
  $('sky').addEventListener('tower-land',landSound);
  function banner(text){$('action-banner').textContent=text;$('action-banner').classList.add('visible');bannerUntil=clock()+1800;}
  function renderRanking() {
    if(window.CloudTowerOnline?.connected()){window.CloudTowerOnline.renderRanks();return;}
    const rows=store.best();$('leaderboard').replaceChildren();$('ranking-empty').hidden=rows.length>0;
    rows.slice(0,5).forEach((row,i)=>{
      const li=document.createElement('li'),rank=document.createElement('span'),name=document.createElement('span'),detail=document.createElement('small'),score=document.createElement('span');
      rank.className='rank-number';rank.textContent=i+1;name.className='rank-name';name.textContent=row.nickname;
      detail.textContent=`${row.floor}층 · 정확도 ${row.accuracy}%`;name.append(detail);score.className='rank-score';score.textContent=row.score.toLocaleString()+'점';li.append(rank,name,score);$('leaderboard').append(li);
    });
    $('best-score').textContent=rows.length?`${rows[0].floor}층 · ${rows[0].score.toLocaleString()}점`:'첫 기록을 세워 봐!';
  }
  function renderPrompt() {
    const target=state?D.prompt(state):D.COURSE[0];
    const typed=Array.from(state?.text||'');$('prompt').replaceChildren();
    Array.from(target).forEach((char,i)=>{
      const span=document.createElement('span');span.textContent=char;
      if(i<typed.length)span.className=typed[i]===char?'correct':'wrong';
      else if(i===typed.length)span.className='cursor';
      $('prompt').append(span);
    });
    $('prompt-label').textContent=state?`${state.cleared+1}번째 문장 · 다음 발판 ${state.floor+1}층`:'첫 번째 발판';
    let matched=0;while(matched<typed.length&&typed[matched]===Array.from(target)[matched])matched++;
    $('charge-fill').style.width=`${matched/Array.from(target).length*100}%`;
    $('typing-form').classList.toggle('charged',matched===Array.from(target).length);
  }
  function renderHUD() {
    $('floor').textContent=state?.floor||0;$('score').textContent=(state?.score||0).toLocaleString();$('accuracy').textContent=state?D.accuracy(state):100;
    const elapsed=remoteRun&&['playing','countdown'].includes(state?.phase)?Math.max(0,(window.CloudTowerOnline.now()-remoteRun.startAt)/1000):(state?.elapsed||0);
    const seconds=mode==='practice'?Math.floor(state?.elapsed||0):Math.max(0,Math.ceil(D.DURATION-elapsed));
    $('timer').textContent=mode==='practice'&&!state?'∞':`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    $('timer-label').textContent=mode==='practice'?'연습 시간':'남은 시간';
    $('combo').textContent=state?.combo?`✦ ${state.combo}연속 정확!`:'정확하게 쓰고 Enter ↵';
    const floor=state?.floor||0,zone=Math.min(3,Math.floor(floor/10));
    $('zone-label').querySelector('small').textContent=`STAGE ${String(zone+1).padStart(2,'0')}`;$('zone-label').querySelector('strong').textContent=scene.zones[zone].name;
    $('course-label').textContent=zone<3?`다음 지역 · ${(zone+1)*10}층`:`무지개 정상 · ${floor}층`;
    $('course-fill').style.width=`${zone<3?floor%10*10:100}%`;
    $('personal-best-marker').textContent=bestFloor>0?floor>bestFloor?'⚑ 내 최고 높이 돌파!':`⚑ 내 최고 높이 ${bestFloor}층`:'';
    if(zone!==currentZone){currentZone=zone;banner('✦ '+scene.zones[zone].name+' 도착!');}
  }
  function lock(locked) {
    document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=locked);$('nickname').disabled=locked;$('start').hidden=locked;$('stop').hidden=!locked;
    $('stop').textContent=mode==='practice'?'연습 마치기':'도전 그만두기';
  }
  function selectMode(next) {
    if(busy()||!assetsReady)return;mode=next;state=null;scene.reset();document.body.classList.remove('is-racing');
    remoteRun=null;inputTrace=[];
    document.querySelectorAll('[data-mode]').forEach(b=>{const selected=b.dataset.mode===mode;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
    $('start').innerHTML=mode==='challenge'?'챌린지 시작 <span>↗</span>':'연습 시작 <span>↗</span>';
    $('mode-description').textContent=mode==='challenge'?'먹구름을 피해 더 높이! 끝까지 도전한 기록이 랭킹에 올라가요.':'먹구름도 시간 제한도 없어요. 편하게 연습하고 준비되면 챌린지에 도전해요.';
    $('start-note').textContent=mode==='challenge'?'같은 문장, 같은 시간. 나의 최고 기록에 도전!':'연습 기록은 랭킹에 올라가지 않아요.';
    $('scene-intro').hidden=false;$('scene-chip').textContent=mode==='challenge'?'☀ 준비 완료 · 구름 위로 출발!':'☀ 자유 연습 · 나만의 속도로';
    $('storm-label').hidden=true;$('combo-chip').textContent='✦ 3연속 정확하게 치면 슈퍼 점프!';$('typing').value='';$('typing').placeholder='시작 버튼을 누르면 모험이 시작돼요';
    feedback('띄어쓰기도 똑같이! 한글 입력이 끝나면 Enter를 눌러 주세요.');renderPrompt();renderHUD();
  }
  function start(remote=null) {
    if(busy()||!assetsReady)return;
    remote=remote?.runId?remote:null;
    if(!remote&&mode==='challenge'&&window.CloudTowerOnline?.useShared()){window.CloudTowerOnline.startChallenge();return;}
    nickname=$('nickname').value.normalize('NFC').trim().replace(/\s+/g,' ').slice(0,12);
    if(!nickname){feedback('랭킹에 표시할 탐험가 별명을 먼저 적어 주세요.',true);$('nickname').focus();return;}
    $('nickname').value=nickname;
    if($('result').open)$('result').close();
    state=D.create(mode);state.phase='countdown';startingAt=clock()||.001;composing=false;scene.reset();
    remoteRun=remote;inputTrace=[];submissionPending=false;
    if(remote){state={...remote.state};nickname=window.CloudTowerOnline.nickname();startedAt=clock()-(window.CloudTowerOnline.now()-remote.startAt);startingAt=startedAt-3000;state.phase='countdown';}
    bestFloor=store.best().find(r=>r.nickname===nickname)?.floor||0;scene.setBest(bestFloor);currentZone=0;document.body.classList.add('is-racing');$('action-banner').classList.remove('visible');bannerUntil=0;
    $('typing').value='';$('typing').disabled=true;$('submit').disabled=true;$('scene-intro').hidden=true;
    $('countdown').hidden=false;$('countdown').textContent='3';$('storm-label').hidden=true;
    $('combo-chip').textContent='✦ 3연속 정확하게 치면 슈퍼 점프!';
    $('scene-chip').textContent=mode==='challenge'?'⚑ 챌린지 · 120초 고정 코스':'☀ 자유 연습 · 천천히 해도 괜찮아';
    if(remote?.roomCode)$('scene-chip').textContent='⚑ 실시간 레이스 · 방 '+remote.roomCode;
    lock(true);renderHUD();renderPrompt();feedback('준비! 문장을 똑같이 쓰고 Enter를 눌러 주세요.');
    if(audio)audio.resume().catch(()=>{});
  }
  function finish(reason) {
    if(!state || ['shown','ending'].includes(state.phase))return;
    startingAt=0;$('countdown').hidden=true;state.phase='finished';state.reason=reason;
    const row=remoteRun?null:D.record(state,nickname),outcome=row?store.save(row):null;
    state.phase='ending';scene.finish(reason);$('typing').disabled=true;$('submit').disabled=true;$('stop').hidden=true;renderHUD();renderRanking();
    $('scene-chip').textContent='☁ 모험 완료 · 한 뼘 더 자랐어요';
    $('result-eyebrow').textContent=mode==='practice'?'PRACTICE COMPLETE':'CHALLENGE COMPLETE';
    $('result-title').textContent=reason==='abandon'?'잠깐 쉬어 가도 괜찮아':reason==='storm'?'먹구름이 따라잡았네!':mode==='practice'?'차근차근, 잘했어!':'120초 도전 성공!';
    $('result-summary').textContent=`${nickname}, ${state.cleared}문장을 완성하고 ${state.floor}층에 도착했어요.`;
    $('result-stats').replaceChildren();
    [[state.score.toLocaleString(),'도전 점수'],[state.floor+'층','도착 높이'],[D.accuracy(state)+'%','정확도']].forEach(([value,label])=>{const item=document.createElement('div'),strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=value;span.textContent=label;item.append(strong,span);$('result-stats').append(item);});
    let message=mode==='practice'?'연습 완료! 챌린지에서 최고 기록을 남겨 봐요.':reason==='abandon'?'중간에 그만둔 도전은 랭킹에 저장하지 않아요.':!row?'한 문장 이상 완성하면 랭킹에 기록돼요.':!outcome.saved?'브라우저 저장이 꺼져 있어 이번 화면에서만 기록을 볼 수 있어요.':outcome.improved?'✦ 나의 최고 기록! 이 기기 랭킹에 저장했어요.':'도전 완료! 기존의 더 높은 최고 기록을 유지했어요.';
    if(row){const rank=store.best().findIndex(r=>r.nickname===nickname)+1;if(rank)message+=` 현재 최고 기록 순위 ${rank}위.`;}
    $('save-message').textContent=message;$('retry').textContent=mode==='practice'?'한 번 더 연습 ↗':'한 번 더 도전 ↗';
    if(remoteRun){$('save-message').textContent='서버에서 최종 기록을 확인하고 있어요…';window.CloudTowerOnline.confirmFinish(reason);}
    banner(reason==='storm'?'먹구름에게 잡혔어!':'FINISH! 멋진 도전!');
    setTimeout(()=>{state.phase='shown';lock(false);$('result').showModal();},scene.isReduced()?0:1250);
  }
  function advance() {
    if(state?.phase!=='playing')return;
    D.tick(state,(clock()-startedAt)/1000);
    if(state.phase==='finished')finish(state.reason);
  }
  function acceptInput() {
    if(composing)return;advance();if(state?.phase!=='playing')return;
    D.input(state,$('typing').value);renderPrompt();renderHUD();
    if(remoteRun&&inputTrace[inputTrace.length-1]!==state.text){inputTrace.push(state.text);if(inputTrace.length>240){feedback('입력이 너무 길어졌어요. 이번 문장을 새로 입력해 주세요.',true);}}
  }
  $('typing').addEventListener('compositionstart',()=>{composing=true;});
  $('typing').addEventListener('compositionend',()=>{composing=false;acceptInput();});
  $('typing').addEventListener('input',event=>{if(!event.isComposing)acceptInput();});
  $('typing').addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.isComposing||composing||event.keyCode===229))event.preventDefault();});
  $('typing').addEventListener('beforeinput',event=>{
    if(['insertFromPaste','insertFromDrop'].includes(event.inputType)){event.preventDefault();feedback('한 글자씩 직접 입력하며 올라가요.',true);}
  });
  ['paste','drop'].forEach(type=>$('typing').addEventListener(type,event=>{event.preventDefault();feedback('한 글자씩 직접 입력하며 올라가요.',true);}));
  $('typing-form').addEventListener('submit',async event=>{
    event.preventDefault();if(composing||submissionPending)return;acceptInput();if(state?.phase!=='playing')return;
    let result;
    if(remoteRun){
      if(state.text!==D.prompt(state)){feedback('문장과 띄어쓰기를 다시 확인해 주세요.',true);return;}
      submissionPending=true;$('typing').disabled=true;$('submit').disabled=true;
      try{const reply=await window.CloudTowerOnline.submit(inputTrace.slice());remoteRun=reply;state={...reply.state};inputTrace=[];result=reply.jump||{success:true,boost:false,perfect:state.combo>0};if(state.phase==='finished'){finish(state.reason);return;}}
      catch(error){feedback(error.message+' 같은 입력으로 다시 눌러도 중복 기록되지 않아요.',true);return;}
      finally{submissionPending=false;if(state?.phase==='playing'){$('typing').disabled=false;$('submit').disabled=false;}}
    }else result=D.submit(state);
    if(!result.success){feedback('문장과 띄어쓰기를 다시 살펴봐요. 틀린 부분을 고친 뒤 Enter!',true);$('typing').focus();return;}
    $('typing').value='';scene.jump(result.boost,state.floor);playTone(result.boost);renderPrompt();renderHUD();
    if(result.boost)banner('SUPER JUMP!  두 층을 한 번에');
    else if(bestFloor>0&&state.floor===bestFloor+1)banner('NEW BEST! 내 최고 높이 돌파');
    $('combo-chip').textContent=result.boost?'✦ 슈퍼 점프! 두 층을 한 번에!':state.combo?`✦ ${state.combo}연속 정확! 다음 슈퍼 점프까지 ${3-state.combo%3}문장`:'☁ 다시 차근차근 올라가요';
    feedback(result.boost?'슈퍼 점프! 정확한 타자로 두 층 올라갔어요.':result.perfect?'완벽해요! 한 층 더 높이 올라왔어요.':'잘 고쳤어요! 한 층 올라왔어요.');$('typing').focus();
  });
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.mode)));
  $('start').addEventListener('click',start);$('retry').addEventListener('click',start);
  $('stop').addEventListener('click',()=>{advance();if(['shown','ending'].includes(state?.phase))return;finish(mode==='practice'?'practice':'abandon');});
  $('close-result').addEventListener('click',()=>$('result').close());
  $('result').addEventListener('close',()=>{if(!busy()){document.body.classList.remove('is-racing');$('start').focus();}});
  $('motion-toggle').setAttribute('aria-pressed',!scene.isReduced());$('motion-toggle').textContent=scene.isReduced()?'모션 줄임':'역동 모션 ON';
  $('motion-toggle').addEventListener('click',()=>{const reduced=scene.setReduced(!scene.isReduced());$('motion-toggle').setAttribute('aria-pressed',!reduced);$('motion-toggle').textContent=reduced?'모션 줄임':'역동 모션 ON';});
  $('expand').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.play-card').requestFullscreen();}catch(_){feedback('이 브라우저에서는 전체 화면을 지원하지 않아요.');}});
  document.addEventListener('fullscreenchange',()=>{$('expand').textContent=document.fullscreenElement?'전체 화면 닫기':'전체 화면 ⛶';});
  $('sound').addEventListener('click',()=>{
    sound=!sound;
    if(sound)try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch(_){sound=false;feedback('이 브라우저에서는 효과음을 사용할 수 없어요.');}
    $('sound').setAttribute('aria-pressed',sound);$('sound').setAttribute('aria-label',sound?'게임 효과음 끄기':'게임 효과음 켜기');$('sound').innerHTML=`♪ <span>소리 ${sound?'켜짐':'꺼짐'}</span>`;if(sound)playTone(false);
  });
  window.addEventListener('storage',event=>{if(event.key===window.CloudTowerStore.KEY){store.read();renderRanking();}});
  // A hidden tab never pauses a challenge or grants extra time.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)advance();});
  function frame(now) {
    if(startingAt){const elapsed=(now-startingAt)/1000;if(elapsed>=3){startedAt=startingAt+3000;startingAt=0;state.phase='playing';$('countdown').hidden=true;$('typing').disabled=false;$('submit').disabled=false;$('typing').placeholder='위 문장을 그대로 입력하세요';$('typing').focus();}else $('countdown').textContent=Math.ceil(3-elapsed);}
    if(!submissionPending)advance();
    if(state?.phase==='playing'){
      renderHUD();const danger=mode==='challenge'&&state.floor-D.stormFloor(state.elapsed)<2;
      $('storm-label').hidden=!danger;
    }
    scene.draw(now,state,!!state);requestAnimationFrame(frame);
    if(bannerUntil&&now>bannerUntil){$('action-banner').classList.remove('visible');bannerUntil=0;}
  }
  document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=true);
  scene.ready.then(()=>{assetsReady=true;$('start').disabled=false;document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=false);selectMode('challenge');document.body.dataset.artReady='true';}).catch(error=>{feedback(error.message+' 새로고침해서 다시 시도해 주세요.',true);$('start').textContent='아트 불러오기 실패 · 새로고침해 주세요';});
  window.CloudTowerGame={
    beginRemote(run){if(run.state.phase==='finished'){remoteRun=run;state={...run.state};nickname=window.CloudTowerOnline.nickname();mode='challenge';finish(state.reason);return;}mode='challenge';start(run);},
    isBusy:busy,
    runId:()=>remoteRun?.runId,
    refreshRanks:renderRanking,
    feedback,
    peers:players=>scene.setPeers(players),
    confirm(run){const phase=state?.phase;if(run?.state){state={...run.state,phase};renderHUD();const values=[state.score.toLocaleString(),state.floor+'층',D.accuracy(state)+'%'];$('result-stats').querySelectorAll('strong').forEach((el,i)=>{el.textContent=values[i];});}},
    signedOut(){if(busy())finish('abandon');remoteRun=null;},
    refreshLocalRanks(){renderRanking();}
  };
  renderRanking();renderPrompt();renderHUD();requestAnimationFrame(frame);
})();
