(()=>{
  'use strict';
  const $=id=>document.getElementById(id),G=window.CloudTowerGame;
  let net=null,connected=false,rows=[],room=null,activeProfile=null,launching=false,lastLaunched='',pending=false,lastFinishReason='';
  const status=text=>{$('online-status').textContent=text;};
  const errorText=error=>String(error?.message||'서버에 연결하지 못했어요.');
  function renderRanks(){
    if(!connected)return;
    $('best-scope').textContent='퀴즈타운 공용 최고 기록';
    $('rank-scope').textContent='공용';$('ranking-note').textContent='로그인한 퀴즈타운 친구들의 서버 확인 최고 기록 · 점수, 정확도, 짧은 시간순';
    $('leaderboard').replaceChildren();$('ranking-empty').hidden=rows.length>0;
    rows.slice(0,10).forEach((row,index)=>{const li=document.createElement('li'),pos=document.createElement('span'),name=document.createElement('span'),meta=document.createElement('small'),score=document.createElement('span');pos.className='rank-number';pos.textContent=index+1;name.className='rank-name';name.textContent=row.nickname;meta.textContent=`${row.floor}층 · 정확도 ${row.accuracy}%`;name.append(meta);score.className='rank-score';score.textContent=row.score.toLocaleString()+'점';li.append(pos,name,score);$('leaderboard').append(li);});
    $('best-score').textContent=rows.length?`${rows[0].floor}층 · ${rows[0].score.toLocaleString()}점`:'첫 공용 기록에 도전!';
  }
  async function refreshRanks(){if(!connected)return;try{rows=await net.ranks();renderRanks();}catch(error){status(errorText(error));}}
  async function exclusive(fn){if(pending)return;pending=true;document.querySelectorAll('#online-controls button,.room-actions button').forEach(b=>b.disabled=true);try{return await fn();}catch(error){status(errorText(error));G.feedback(errorText(error),true);}finally{pending=false;document.querySelectorAll('#online-controls button,.room-actions button').forEach(b=>b.disabled=false);if(room)renderRoom(room);}}
  function raceOrder(players){return [...players].sort((a,b)=>(a.status==='abandon')-(b.status==='abandon')||b.score-a.score||b.accuracy-a.accuracy||(a.elapsed||0)-(b.elapsed||0));}
  function renderRoom(value){
    room=value;if(!room)return;document.body.classList.add('in-race-room');
    const me=net.me(),mine=room.players.find(p=>p.uid===me.uid);
    $('room-lobby').hidden=false;$('room-number').textContent=room.code;$('room-members').replaceChildren();
    for(const player of room.players){const row=document.createElement('div');row.className='room-member';const stale=net.now()-player.lastSeen>16000;row.textContent=`${player.uid===room.hostUid?'♛ ':''}${player.nickname}${player.uid===me.uid?' (나)':''} · ${stale?'연결 확인 중':room.status==='waiting'?(player.ready?'준비 완료':'준비 중'):player.floor+'층 · '+player.score+'점'}`;$('room-members').append(row);}
    $('room-ready').hidden=room.status!=='waiting';$('room-ready').textContent=mine?.ready?'준비 취소':'준비 완료';
    $('room-start').hidden=room.status!=='waiting'||room.hostUid!==me.uid;$('room-start').disabled=pending||room.players.length<2||room.players.some(p=>!p.ready);
    $('room-create').disabled=true;$('room-join-form').querySelector('button').disabled=true;
    const players=raceOrder(room.players);$('race-standings').hidden=room.status==='waiting';$('race-standings').replaceChildren();
    players.forEach((player,index)=>{const item=document.createElement('span');item.className=player.uid===me.uid?'mine':'';item.textContent=`${index+1}. ${player.nickname} ${player.floor}층${player.status==='abandon'?' · 포기':''}`;$('race-standings').append(item);});
    G.peers(room.players.filter(p=>p.uid!==me.uid&&!p.left));
    if(room.status==='finished'){
      const competitors=players.filter(p=>p.status!=='abandon');
      const top=competitors[0],winners=top?competitors.filter(p=>p.score===top.score&&p.accuracy===top.accuracy&&p.elapsed===top.elapsed):[];
      $('race-result').textContent=top?`레이스 종료! ${winners.length>1?'공동 ':''}1위 ${winners.map(p=>p.nickname).join(', ')} · ${top.score}점`:'레이스가 종료됐어요.';refreshRanks();
    }else $('race-result').textContent=room.status==='playing'?'모두 같은 시간에 출발! 친구들의 기록이 실시간으로 보여요.':'';
    if(room.status==='playing'&&mine?.runId&&mine.status==='playing'&&!mine.left&&lastLaunched!==mine.runId&&!launching){
      launching=true;net.resume(mine.runId).then(run=>{lastLaunched=run.runId;G.beginRemote(run);}).catch(error=>status(errorText(error))).finally(()=>{launching=false;});
    }
  }
  async function leaveRoom(){
    if(!net||!room)return;
    await net.leave();room=null;lastLaunched='';document.body.classList.remove('in-race-room');$('room-lobby').hidden=true;$('race-standings').hidden=true;G.peers([]);$('room-create').disabled=false;$('room-join-form').querySelector('button').disabled=false;status('방에서 나왔어요. 새 도전을 시작할 수 있어요.');
  }
  async function connect(){
    return exclusive(async()=>{
      status('퀴즈타운 로그인을 확인하는 중…');
      const firebase=await window.CloudTowerNet.load();net=window.CloudTowerNet.create(firebase);activeProfile=await net.connect();connected=true;
      $('online-connect').hidden=true;$('online-controls').hidden=false;$('nickname').value=activeProfile.nickname;$('nickname').readOnly=true;renderRanks();
      status(activeProfile.nickname+' 님으로 연결됐어요. 공용 기록은 서버에서 확인해요.');document.querySelector('.online-login').hidden=true;
      $('online-resume').hidden=!activeProfile.active;
      net.on((kind,value)=>{if(kind==='room')renderRoom(value);else status(errorText(value)+' 연결이 돌아오면 자동으로 다시 확인해요.');});
      firebase.auth().onAuthStateChanged(user=>{if(connected&&user?.uid!==activeProfile.uid){connected=false;net.stop();G.signedOut();room=null;$('online-controls').hidden=true;$('room-lobby').hidden=true;$('online-connect').hidden=false;status('로그인이 바뀌었어요. 온라인 연결을 다시 눌러 주세요.');$('rank-scope').textContent='이 기기';G.refreshLocalRanks();}});
      await refreshRanks();
    });
  }
  async function startChallenge(){
    if(launching)return;launching=true;
    try{if(room){if(room.status!=='finished'&&room.status!=='closed')throw Error('대전방에서는 함께 출발하거나 방에서 나가 주세요.');await leaveRoom();}const run=await net.createRun();G.beginRemote(run);}
    catch(error){status(errorText(error));G.feedback(errorText(error),true);$('online-resume').hidden=false;}
    finally{launching=false;}
  }
  async function confirmFinish(reason){
    lastFinishReason=reason;$('retry-save').hidden=true;
    try{
      let result=await net.finish(reason==='abandon');
      // An estimated browser clock can be slightly ahead of the server.
      if(result.state.phase!=='finished'&&reason!=='abandon'){await new Promise(resolve=>setTimeout(resolve,700));result=await net.finish(false);}
      if(result.state.phase!=='finished')throw Error('아직 서버 종료를 확인하지 못했어요. 아래에서 다시 확인해 주세요.');
      G.confirm(result);$('save-message').textContent=result.ranked?'공용 랭킹에 서버 확인 기록을 반영했어요. 최고 기록을 유지해요.':result.state.reason==='abandon'?'중도 포기 기록은 공용 랭킹에 저장하지 않아요.':'이번 도전은 공용 랭킹 등록 대상이 아니에요.';
      if(room)$('save-message').textContent+=' 다른 친구들의 결과는 방에서 확인해 주세요.';
      await refreshRanks();
    }catch(error){$('save-message').textContent='기록 확인 대기: '+errorText(error);$('retry-save').hidden=false;}
  }
  $('online-connect').addEventListener('click',connect);
  $('room-create').addEventListener('click',()=>exclusive(async()=>renderRoom(await net.createRoom())));
  $('room-join-form').addEventListener('submit',event=>{event.preventDefault();exclusive(async()=>renderRoom(await net.joinRoom($('room-code').value.trim())));});
  $('room-ready').addEventListener('click',()=>exclusive(async()=>{const mine=room.players.find(p=>p.uid===net.me().uid);const reply=await net.ready(!mine.ready);renderRoom(reply.room);}));
  $('room-start').addEventListener('click',()=>exclusive(async()=>renderRoom((await net.startRoom()).room)));
  $('room-leave').addEventListener('click',()=>exclusive(leaveRoom));
  $('online-resume').addEventListener('click',()=>exclusive(async()=>{const profile=await net.connect();if(!profile.active){$('online-resume').hidden=true;status('진행 중인 게임이 없어요.');return;}if(profile.active.roomCode){net.watch(profile.active.roomCode);}else G.beginRemote(await net.resume(profile.active.runId));}));
  $('retry-save').addEventListener('click',()=>confirmFinish(lastFinishReason));
  window.CloudTowerOnline={connected:()=>connected,useShared:()=>connected&&$('shared-challenge').checked,nickname:()=>net?.me()?.nickname||'탐험가',now:()=>net?.now()||Date.now(),startChallenge,renderRanks,confirmFinish,submit:trace=>net.submit(trace)};
})();
