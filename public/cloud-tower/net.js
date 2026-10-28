(function(root){
  'use strict';
  function create(firebase){
    const db=firebase.firestore(),auth=firebase.auth(),call=firebase.app().functions('asia-northeast3').httpsCallable('cloudTowerAction');
    let offset=0,me=null,room=null,unsub=null,heartbeat=null,active=null,stopped=false,roomEpoch=0;
    const listeners=new Set();
    const emit=(kind,value)=>listeners.forEach(fn=>fn(kind,value));
    async function request(action,data={}){
      if(!auth.currentUser)throw Error('퀴즈타운에 로그인해 주세요.');
      const sent=Date.now(),result=(await call({action,...data})).data;
      if(Number.isFinite(result.serverNow))offset=result.serverNow-(sent+Date.now())/2;
      return result;
    }
    function stopRoom(){roomEpoch++;if(unsub)unsub();unsub=null;if(heartbeat)clearInterval(heartbeat);heartbeat=null;room=null;}
    function watch(code){
      stopRoom();stopped=false;const epoch=roomEpoch;
      unsub=db.collection('cloudTowerRooms').doc(code).onSnapshot(snap=>{
        if(!snap.exists||epoch!==roomEpoch)return;room=snap.data();emit('room',room);
      },error=>{if(epoch===roomEpoch)emit('error',error);});
      let pending=false;
      heartbeat=setInterval(async()=>{if(pending||stopped)return;pending=true;try{const result=await request('syncRoom',{code});if(epoch!==roomEpoch)return;room=result.room;emit('room',room);}catch(error){if(epoch===roomEpoch)emit('error',error);}finally{pending=false;}},5000);
      request('syncRoom',{code}).then(result=>{if(epoch!==roomEpoch)return;room=result.room;emit('room',room);}).catch(error=>{if(epoch===roomEpoch)emit('error',error);});
    }
    async function connect(){
      await new Promise(resolve=>{const off=auth.onAuthStateChanged(()=>{off();resolve();});});
      if(!auth.currentUser)throw Error('먼저 퀴즈타운에 로그인해 주세요.');
      me=await request('profile');return me;
    }
    async function ranks(){const snap=await db.collection('cloudTowerRanking').doc(root.CloudTowerDomain.VERSION).collection('entries').orderBy('sortKey','desc').limit(50).get();return snap.docs.map(doc=>({uid:doc.id,...doc.data()}));}
    return {
      connect,request,ranks,now:()=>Date.now()+offset,me:()=>me,room:()=>room,
      on(fn){listeners.add(fn);return()=>listeners.delete(fn);},
      async createRun(){active=await request('createRun');return active;},
      async resume(runId){active=await request('resumeRun',{runId});return active;},
      async submit(trace){if(!active)throw Error('진행 중인 게임이 없어요.');const result=await request('submit',{runId:active.runId,seq:active.seq+1,trace});active=result;return result;},
      async finish(abandon=false){if(!active)throw Error('진행 중인 게임이 없어요.');active=await request('finish',{runId:active.runId,abandon});return active;},
      async createRoom(){const result=await request('createRoom');watch(result.room.code);return result.room;},
      async joinRoom(code){const result=await request('joinRoom',{code});watch(result.room.code);return result.room;},
      watch,
      async ready(value){return request('ready',{code:room.code,ready:value});},
      async startRoom(){return request('startRoom',{code:room.code});},
      async leave(){const code=room?.code;stopped=true;stopRoom();if(code)try{return await request('leaveRoom',{code});}catch(error){watch(code);throw error;}},
      stop:stopRoom
    };
  }
  async function load(){
    if(root.firebase?.apps?.length)return root.firebase;
    const local=['localhost','127.0.0.1'].includes(location.hostname),emulator=local&&new URLSearchParams(location.search).get('emulator')==='1';
    if(local&&!emulator)throw Error('로컬 미리보기는 기기 기록 모드예요. 온라인 검증은 Firebase 에뮬레이터에서 진행해요.');
    for(const name of ['app','auth','firestore','functions'])await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=`/__/firebase/10.12.2/firebase-${name}-compat.js`;script.onload=resolve;script.onerror=()=>reject(Error('온라인 연결 파일을 불러오지 못했어요.'));document.head.append(script);});
    if(emulator){root.firebase.initializeApp({apiKey:'demo-key',projectId:'demo-dj48-rules',authDomain:'localhost',appId:'demo-cloud-tower'});root.firebase.auth().useEmulator('http://127.0.0.1:9191',{disableWarnings:true});root.firebase.firestore().useEmulator('127.0.0.1',8181);root.firebase.app().functions('asia-northeast3').useEmulator('127.0.0.1',5001);}
    else await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/__/firebase/init.js';script.onload=resolve;script.onerror=()=>reject(Error('퀴즈타운 서버에 연결하지 못했어요.'));document.head.append(script);});
    return root.firebase;
  }
  root.CloudTowerNet={create,load};
})(globalThis);
