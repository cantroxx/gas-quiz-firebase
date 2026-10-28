'use strict';
const crypto=require('node:crypto');
const D=require('./domain');
const MAX_PLAYERS=4;
function createService({db,now=()=>Date.now(),ErrorType=Error}){
  const fail=(code,message)=>{const error=new ErrorType(code,message);error.code=code;if(ErrorType===Error)error.message=message;throw error;};
  const ref=(collection,id)=>db.collection(collection).doc(id);
  const rankRef=uid=>db.collection('cloudTowerRanking').doc(D.VERSION).collection('entries').doc(uid);
  const id=value=>{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(value))fail('invalid-argument','게임 번호를 확인해 주세요.');return value;};
  const clone=value=>JSON.parse(JSON.stringify(value));
  function newRun(uid,nickname,startAt,roomCode,rankEligible,memberId){return {uid,nickname,startAt,roomCode,rankEligible,memberId,version:D.VERSION,state:D.create('challenge'),seq:0,lastAcceptedAt:startAt,createdAt:startAt,finishedAt:0,ranked:false,lastDigest:''};}
  const summary=run=>({score:run.state.score,floor:run.state.floor,accuracy:D.accuracy(run.state),elapsed:run.state.elapsed,status:run.state.phase==='finished'?run.state.reason:'playing'});
  const response=(run,runId,time)=>({runId,startAt:run.startAt,state:run.state,seq:run.seq,roomCode:run.roomCode,serverNow:time,ranked:run.ranked});
  async function identity(tx,uid){
    const link=await tx.get(ref('authLinks',uid));const memberId=link.data()?.memberUserId;
    if(!memberId)fail('permission-denied','퀴즈타운에 로그인한 뒤 이용해 주세요.');
    const snap=await tx.get(ref('users',memberId));const user=snap.data();
    if(!user||user.authUid!==uid||user.active===false||user.status!=='active')fail('permission-denied','활성 퀴즈타운 계정이 필요해요.');
    return {uid,memberId,nickname:String(user.nickname||user.displayNickname||'탐험가').normalize('NFC').slice(0,20),rankEligible:memberId!=='G4-C8-N23'};
  }
  function finishRun(run,time,abandon=false){
    if(run.state.phase==='finished')return;
    D.tick(run.state,Math.max(0,(time-run.startAt)/1000));
    if(abandon&&run.state.phase!=='finished'){run.state.phase='finished';run.state.reason='abandon';}
    if(run.state.phase==='finished')run.finishedAt=time;
  }
  function saveRank(tx,run,uid,snapshot,time){
    if(run.memberId&&run.state.phase==='finished'&&run.state.cleared>=15&&!run.heartAwarded){
      require('../achievements/games').award(tx,db,run.memberId,'cloud-tower','hearts');run.heartAwarded=true;
    }
    const row=D.record(run.state,run.nickname,time);
    if(!row||!run.rankEligible)return;
    const old=snapshot.data();
    if(!old||D.compare(row,old)<0){
      // Single-field total order avoids broad scans and additional composite indexes.
      row.sortKey=row.score*100000000+Math.round(row.accuracy*10)*10000+(1200-Math.round(row.elapsed*10));
      tx.set(rankRef(uid),row);
    }
    run.ranked=true;
  }
  async function act(uid,payload){
    if(!uid)fail('unauthenticated','퀴즈타운에 로그인해 주세요.');
    if(!payload||typeof payload!=='object')fail('invalid-argument','요청을 확인해 주세요.');
    const action=payload.action,time=now(),newId=crypto.randomUUID(),code=String(crypto.randomInt(100000,1000000));
    return db.runTransaction(async tx=>{
      const me=await identity(tx,uid);
      const controlRef=ref('cloudTowerPlayers',uid),controlSnap=await tx.get(controlRef),control=controlSnap.data()||{};
      if(action==='profile')return {...me,active:control.activeUntil>time?control:null,serverNow:time};
      if(action==='createRun'||action==='createRoom'){
        if(control.activeUntil>time)fail('failed-precondition','진행 중인 게임으로 돌아가거나 먼저 나가 주세요.');
        if(action==='createRun'){
          const run=newRun(uid,me.nickname,time+4000,'',me.rankEligible,me.memberId);
          tx.create(ref('cloudTowerRuns',newId),run);tx.set(controlRef,{runId:newId,roomCode:'',activeUntil:time+180000});
          return response(run,newId,time);
        }
        const roomRef=ref('cloudTowerRooms',code);if((await tx.get(roomRef)).exists)fail('aborted','방 번호를 다시 만들어 주세요.');
        const room={code,hostUid:uid,participantIds:[uid],players:[{uid,memberId:me.memberId,nickname:me.nickname,ready:false,score:0,floor:0,accuracy:100,status:'waiting',lastSeen:time,rankEligible:me.rankEligible}],status:'waiting',createdAt:time,expiresAt:time+900000,startAt:0,version:D.VERSION};
        tx.create(roomRef,room);tx.set(controlRef,{roomCode:code,runId:'',activeUntil:room.expiresAt});return {room,serverNow:time};
      }
      if(['submit','finish','resumeRun'].includes(action)){
        const runId=id(payload.runId),runRef=ref('cloudTowerRuns',runId),snap=await tx.get(runRef);if(!snap.exists)fail('not-found','게임 기록이 없어요.');
        const run=clone(snap.data());if(run.uid!==uid)fail('permission-denied','내 게임만 진행할 수 있어요.');
        if(run.version!==D.VERSION)fail('failed-precondition','코스가 바뀌었어요. 새로 시작해 주세요.');
        const roomRef=run.roomCode?ref('cloudTowerRooms',run.roomCode):null,roomSnap=roomRef?await tx.get(roomRef):null;
        const rankSnap=await tx.get(rankRef(uid));let jump=null;
        if(action==='submit'){
          if(!Number.isInteger(payload.seq)||payload.seq<1)fail('invalid-argument','문장 순서가 올바르지 않아요.');
          if(!Array.isArray(payload.trace)||!payload.trace.length||payload.trace.length>240||payload.trace.some(value=>typeof value!=='string'||value.length>100))fail('invalid-argument','입력 기록을 확인해 주세요.');
          const digest=crypto.createHash('sha256').update(JSON.stringify(payload.trace)).digest('hex');
          if(payload.seq===run.seq&&digest===run.lastDigest)return {...response(run,runId,time),jump:run.lastJump,duplicate:true};
          if(payload.seq!==run.seq+1)fail('failed-precondition','문장 진행을 다시 불러와 주세요.');
          finishRun(run,time);
          if(time<run.startAt)fail('failed-precondition','출발 신호를 기다려 주세요.');
          if(run.state.phase!=='finished'){
            const target=D.prompt(run.state),trace=payload.trace;
            if(!Array.isArray(trace)||!trace.length||trace.length>240)fail('invalid-argument','입력 기록을 확인해 주세요.');
            if(time-run.lastAcceptedAt<Math.max(350,target.length*45))fail('resource-exhausted','너무 빠른 제출이에요. 잠시 후 다시 눌러 주세요.');
            for(const value of trace){if(typeof value!=='string'||value.length>100)fail('invalid-argument','입력 길이를 확인해 주세요.');D.input(run.state,value);}
            jump=D.submit(run.state);if(!jump.success)fail('invalid-argument','문장을 정확히 완성해 주세요.');
            if(jump?.success)require('../growth/activity').record(tx,db,{source:'tower:'+runId+':'+payload.seq,uid,counts:{towerClear:1},time});
          run.seq=payload.seq;run.lastDigest=digest;run.lastAcceptedAt=time;run.lastJump=jump;
          }
        }else finishRun(run,time,action==='finish'&&payload.abandon===true);
        saveRank(tx,run,uid,rankSnap,time);tx.set(runRef,run);
        if(run.state.phase==='finished'&&control.runId===runId&&!run.roomCode)tx.set(controlRef,{...control,activeUntil:0});
        if(roomSnap?.exists){const room=clone(roomSnap.data()),player=room.players.find(p=>p.uid===uid);if(player){Object.assign(player,summary(run),{lastSeen:time});if(room.players.every(p=>!['playing','waiting'].includes(p.status)))room.status='finished';tx.set(roomRef,room);}}
        return {...response(run,runId,time),jump};
      }
      if(!['joinRoom','ready','startRoom','syncRoom','leaveRoom'].includes(action))fail('invalid-argument','지원하지 않는 동작이에요.');
      const roomCode=id(payload.code),roomRef=ref('cloudTowerRooms',roomCode),roomSnap=await tx.get(roomRef);
      if(!roomSnap.exists)fail('not-found','방 번호를 다시 확인해 주세요.');
      const room=clone(roomSnap.data());let player=room.players.find(p=>p.uid===uid);
      if(action==='joinRoom'){
        if(player)return {room,serverNow:time};
        if(room.status!=='waiting'||room.expiresAt<=time)fail('failed-precondition','이미 시작했거나 만료된 방이에요.');
        if(room.players.length>=MAX_PLAYERS)fail('resource-exhausted','방이 꽉 찼어요. 최대 4명이에요.');
        if(control.activeUntil>time)fail('failed-precondition','진행 중인 게임을 먼저 마쳐 주세요.');
        room.players.push({uid,memberId:me.memberId,nickname:me.nickname,ready:false,score:0,floor:0,accuracy:100,status:'waiting',lastSeen:time,rankEligible:me.rankEligible});room.participantIds.push(uid);
        tx.set(roomRef,room);tx.set(controlRef,{roomCode,runId:'',activeUntil:room.expiresAt});return {room,serverNow:time};
      }
      if(!player)fail('permission-denied','방 참가자만 이용할 수 있어요.');
      if(action==='ready'){
        if(room.status!=='waiting'||room.expiresAt<=time)fail('failed-precondition','대기 중인 방에서 준비해 주세요.');
        player.ready=payload.ready===true;player.lastSeen=time;tx.set(roomRef,room);return {room,serverNow:time};
      }
      if(action==='startRoom'){
        if(room.hostUid!==uid)fail('permission-denied','방장만 출발할 수 있어요.');
        if(room.status!=='waiting')return {room,serverNow:time};
        if(room.expiresAt<=time||room.players.length<2||room.players.some(p=>!p.ready||time-p.lastSeen>20000))fail('failed-precondition','2명 이상이 모두 준비하면 출발할 수 있어요.');
        room.startAt=time+5000;room.status='playing';room.expiresAt=time+300000;
        // Lock every participant's control document, including during concurrent leave/start.
        const controls=await Promise.all(room.players.map(p=>tx.get(ref('cloudTowerPlayers',p.uid))));
        room.players.forEach((p,i)=>{if(controls[i].data()?.roomCode!==roomCode)fail('failed-precondition','참가 상태가 바뀌었어요.');p.runId=roomCode+'_'+p.uid;p.status='playing';const run=newRun(p.uid,p.nickname,room.startAt,roomCode,p.rankEligible,p.memberId||null);tx.create(ref('cloudTowerRuns',p.runId),run);tx.set(ref('cloudTowerPlayers',p.uid),{runId:p.runId,roomCode,activeUntil:room.expiresAt});});
        tx.set(roomRef,room);return {room,serverNow:time};
      }
      if(action==='leaveRoom'&&room.status==='waiting'){
        room.players=room.players.filter(p=>p.uid!==uid);room.participantIds=room.participantIds.filter(value=>value!==uid);
        if(room.hostUid===uid)room.hostUid=room.players[0]?.uid||'';if(!room.players.length)room.status='closed';
        if(control.roomCode===roomCode)tx.set(controlRef,{...control,activeUntil:0});tx.set(roomRef,room);return {left:true,serverNow:time};
      }
      if(room.status==='playing'){
        const runs=await Promise.all(room.players.map(p=>tx.get(ref('cloudTowerRuns',p.runId))));
        const ranks=await Promise.all(room.players.map(p=>tx.get(rankRef(p.uid))));
        room.players.forEach((p,i)=>{if(!runs[i].exists)return;const run=clone(runs[i].data());finishRun(run,time,action==='leaveRoom'&&p.uid===uid);saveRank(tx,run,p.uid,ranks[i],time);Object.assign(p,summary(run));tx.set(runs[i].ref,run);});
        if(room.players.every(p=>!['playing','waiting'].includes(p.status)))room.status='finished';
      }
      if(action==='leaveRoom'){if(control.roomCode===roomCode)tx.set(controlRef,{...control,activeUntil:0});player.left=true;}
      player.lastSeen=time;tx.set(roomRef,room);return {room,left:action==='leaveRoom',serverNow:time};
    });
  }
  return {act};
}
module.exports={createService};
