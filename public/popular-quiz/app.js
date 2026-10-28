(function(){
 'use strict';
 const root=document.getElementById('app'),notice=document.getElementById('notice'),params=new URLSearchParams(location.search);
 let exitTransport,transport,profile,run=null,category=params.get('category')||'idol',mode=params.get('mode')==='ranking'?'ranking':'practice',practiceGeneration=Number(params.get('generation'))||1,rankingGenerations=[],busy=false,feedback=false;
 if(!Number.isInteger(practiceGeneration)||practiceGeneration<1||practiceGeneration>9)practiceGeneration=1;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function button(text,fn,cls='btn'){const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;}
 function error(e,retry){notice.replaceChildren(el('div','',e.message||'연결을 확인한 뒤 다시 시도해 주세요.'));if(retry)notice.append(button('다시 시도',()=>{notice.hidden=true;retry();}));notice.append(button('닫기',()=>notice.hidden=true,'btn quiet'));notice.hidden=false;}
 async function request(action,data={}){return transport({action,...data});}
 async function task(fn){
  if(busy)return;busy=true;notice.hidden=true;
  const buttons=[...root.querySelectorAll('button')].map(b=>[b,b.disabled]);buttons.forEach(([b])=>b.disabled=true);
  try{await fn();}catch(e){error(e,()=>task(fn));}finally{busy=false;buttons.forEach(([b,disabled])=>{if(b.isConnected)b.disabled=disabled;});}
 }
 const selected=()=>profile.categories.find(c=>c.id===category)||profile.categories[0];
 const gens=()=>category==='pokemon'?(mode==='practice'?[practiceGeneration]:[...rankingGenerations].sort((a,b)=>a-b)):[];
 const unavailable=()=>!profile.enabled||profile.disabledQuizIds.includes(category)||(category==='pokemon'&&gens().some(g=>profile.disabledQuizIds.includes(`pokemon-gen${g}`)));
 const canStart=()=>!unavailable()&&(mode!=='ranking'||profile.rankingEnabled)&&(category!=='pokemon'||mode!=='ranking'||rankingGenerations.length>=3);
 function remember(){const url=new URL(location.href);url.searchParams.set('category',category);url.searchParams.set('mode',mode);if(category==='pokemon'&&mode==='practice')url.searchParams.set('generation',practiceGeneration);else url.searchParams.delete('generation');history.replaceState(null,'',url);}
 function home(){
  run=null;feedback=false;root.replaceChildren();category=selected().id;remember();
  const hero=el('header','hero');hero.append(el('span','eyebrow','PHOTO QUIZ CLUB'),el('h1','','좋아하는 분야, 한 판 더!'),el('p','','사진 속 주인공을 찾아요. 연습으로 익숙해지고 랭킹전에 도전해 보세요.'));root.append(hero);
  if(profile.activeRunId){const resume=el('section','resume');resume.append(el('strong','','아직 풀고 있는 퀴즈가 있어요.'),el('p','','시간 제한이 없으니, 하던 문제부터 이어 갈 수 있어요.'));const actions=el('div','actions');actions.append(button('이어 풀기',()=>task(async()=>openRun(await request('resume',{runId:profile.activeRunId})))),button('이전 판 종료',()=>task(async()=>{await request('finish',{runId:profile.activeRunId});profile=await request('profile');home();}),'btn quiet'));resume.append(actions);root.append(resume);}
  const categories=el('nav','categories');categories.setAttribute('aria-label','퀴즈 분야');for(const c of profile.categories){const b=button('',()=>{category=c.id;home();},'category');b.setAttribute('aria-pressed',c.id===category);b.append(el('span','icon',c.icon),el('span','',c.title));categories.append(b);}root.append(categories);
  const c=selected(),panel=el('section','panel');panel.append(el('h2','',`${c.icon} ${c.title} 퀴즈`),el('p','muted',c.description));
  const tabs=el('nav','tabs');tabs.setAttribute('aria-label','게임 모드');for(const [id,label]of [['practice','연습전'],['ranking','랭킹전']]){const b=button(label,()=>{mode=id;home();},'tab');b.setAttribute('aria-pressed',mode===id);tabs.append(b);}panel.append(tabs);
  if(category==='pokemon'){
   const field=el('fieldset','generations');field.append(el('legend','',mode==='practice'?'연습할 세대를 하나 골라요':'랭킹에 도전할 세대를 3개 이상 골라요'));const grid=el('div','generation-grid');
   for(let g=1;g<=9;g++){const b=button(`${g}세대`,()=>{if(mode==='practice')practiceGeneration=g;else rankingGenerations=rankingGenerations.includes(g)?rankingGenerations.filter(x=>x!==g):[...rankingGenerations,g];home();},'gen');b.setAttribute('aria-pressed',gens().includes(g));b.disabled=profile.disabledQuizIds.includes(`pokemon-gen${g}`);grid.append(b);}field.append(grid,el('p','selection-note',mode==='ranking'?`${rankingGenerations.length}개 세대 선택 · 선택한 세대에서 고르게 출제해요.`:`${practiceGeneration}세대의 포켓몬만 만나요.`));panel.append(field);
  }
  const extra=category==='idol'?' · 개인 15문제 + 그룹 5문제':category==='anime'?' · 다양한 작품을 골고루':category==='pokemon'&&mode==='ranking'?' · 같은 세대 조합끼리 순위 비교':'';
  panel.append(el('p','rule',mode==='practice'?`끝없이 연습 · 정오답 모두 100번 답하면 1회 완주 · 시간 제한 없음${extra}`:`문제 수 제한 없음 · 하트 3개 · 나가면 자동 기록`));
  const actions=el('div','actions'),startButton=button(mode==='practice'?'연습 시작 →':'랭킹 도전 →',start,'btn primary');startButton.disabled=!canStart()||!!profile.activeRunId;actions.append(startButton);
  const boardButton=button('랭킹 보기',()=>task(board),'btn quiet');boardButton.disabled=category==='pokemon'&&rankingGenerations.length<3;
  if(category!=='pokemon'||mode==='ranking')actions.append(boardButton);panel.append(actions);
  if(unavailable())panel.append(el('p','muted','이 분야는 지금 점검 중이에요.'));
  else if(mode==='ranking'&&!profile.rankingEnabled)panel.append(el('p','muted','랭킹전을 점검하고 있어요. 연습전을 이용해 주세요.'));
  panel.append(el('p','reward','좋아하는 분야를 자유롭게 연습해요. 일일 XP와 DJ코인 연습 보상은 국어·수학·사회·과학 퀴즈에서 받을 수 있어요.'));
  const progressKey=category==='pokemon'&&mode==='practice'?`pokemon-gen${practiceGeneration}`:category,p=profile.progress[progressKey]||{};
  panel.append(el('p','progress-note',`연습 ${p.answered||0}번 답하기 · ${Math.floor((p.answered||0)/100)}회 완주 · 다음 완주 ${(p.answered||0)%100}/100`));root.append(panel);
 }
 function openRun(value){run=value;category=run.category;mode=run.mode;profile.activeRunId=run.status==='playing'?run.runId:null;if(category==='pokemon'){if(mode==='practice')practiceGeneration=run.generations[0];else rankingGenerations=[...run.generations];}feedback=Boolean(run.feedback);remember();play();window.scrollTo(0,0);}
 function start(){if(!canStart()||profile.activeRunId)return;const data={category,mode,generations:gens(),requestId:crypto.randomUUID()};task(async()=>openRun(await request('start',data)));}
 function imageCard(q,choices){
  const box=el('div','photo'),img=el('img'),message=el('div','photo-message','사진을 불러오는 중…');img.alt='이름을 맞힐 퀴즈 사진';img.decoding='async';img.referrerPolicy='no-referrer';
  function lock(value){if(choices)choices.querySelectorAll('button').forEach(b=>b.disabled=value);}
  lock(true);img.onload=()=>{message.hidden=true;lock(false);};
  img.onerror=()=>{lock(true);message.hidden=false;message.replaceChildren(el('p','','사진을 불러오지 못했어요. 다시 불러온 뒤 답을 골라 주세요.'),button('사진 다시 불러오기',()=>{message.replaceChildren(el('p','','다시 불러오는 중…'));img.src=q.imageUrl;} ,'btn quiet'));};
  box.append(img,message);img.src=q.imageUrl;return box;
 }
 function completionText(){return '답한 횟수는 연습기록에 쌓여요. 100번마다 1회 완주예요.';}
 function play(){
  root.replaceChildren();const c=selected(),head=el('div','section-head');head.append(el('h2','',`${c.icon} ${c.title} · ${run.mode==='ranking'?'랭킹전':'연습전'}`));
  if(run.status==='playing')head.append(button('그만 풀기',()=>task(async()=>{run=await request('finish',{runId:run.runId});feedback=false;play();}),'btn quiet'));root.append(head);
  if(run.category==='pokemon')root.append(el('p','muted',run.generations.map(g=>`${g}세대`).join(' · ')));
  const hud=el('div','hud');hud.append(el('span','',run.mode==='practice'?`${run.seq}번 답했어요`:`${run.seq}문제 도전`),el('span','',`정답 ${run.correct}`));if(run.mode==='ranking')hud.append(el('span','hearts','♥'.repeat(run.hearts)+'♡'.repeat(3-run.hearts)));else hud.append(el('span','','천천히 풀어도 괜찮아요'));root.append(hud);
  const track=el('div','progress-track'),fill=el('div','progress-fill');fill.style.width=`${(run.seq%100)}%`;track.append(fill);if(run.mode==='practice')root.append(track);
  if(feedback&&run.feedback){
   const f=run.feedback,card=el('section','question');card.append(el('h2','',f.prompt),imageCard(f));const choices=el('div','choices');f.choices.forEach((text,i)=>{const b=button('',()=>{},'choice'+(i===f.answerIndex?' correct':i===f.choice?' wrong':''));b.append(el('b','',i+1),el('span','',text));b.disabled=true;choices.append(b);});card.append(choices);
   const result=el('div','feedback'+(f.correct?'':' wrong'));result.setAttribute('role','status');result.append(el('h3','',f.correct?'정답이에요!':'다음에는 맞힐 수 있어요'),el('p','',`정답은 ${f.answerText}${f.groupLabel?' · '+f.groupLabel:''}`));
   if(run.mode==='practice'){result.append(el('p','',completionText()));}
   result.append(button(run.status==='finished'?'결과 보기':'다음 문제 →',()=>{feedback=false;play();}));card.append(result);root.append(card);return;
  }
  if(run.status==='finished'){
   profile.activeRunId=null;const card=el('section','result');card.append(el('div','eyebrow','NICE PLAY!'),el('h2','',run.reason==='rules-updated'?'연습 규칙이 바뀌었어요':run.reason==='hearts'?'하트를 모두 사용했어요':run.reason==='quit'?'여기까지 풀었어요':'한 판을 마쳤어요!'),el('p','big',`${run.correct}점`),el('p','muted',run.mode==='practice'?`${run.seq}번 답하기 · ${run.correct}문제 정답`:`${run.seq}문제 중 ${run.correct}문제 정답`),el('p','',run.reason==='rules-updated'?'이전 판은 종료했어요. 새 연습은 끝없이 이어지고 100번 답할 때마다 완주로 기록돼요.':run.mode==='practice'?completionText():run.rankingSaved?'랭킹에 기록했어요. 최고 기록으로 순위를 비교해요.':'정답이 있는 판부터 랭킹에 기록해요.'));
   const actions=el('div','actions');actions.append(button('다시 고르기',()=>task(async()=>{profile=await request('profile');home();})));if(run.mode==='ranking')actions.append(button('랭킹 보기',()=>task(board),'btn quiet'));card.append(actions);root.append(card);return;
  }
  const q=run.question,card=el('section','question'),choices=el('div','choices');card.append(el('span','badge',q.kind==='group'?'그룹 이름을 찾아요':q.kind==='person'?'개인 이름을 찾아요':run.category==='flag-country'?'나라 이름을 찾아요':'캐릭터 이름을 찾아요'),el('h2','',q.prompt));
  q.choices.forEach((text,i)=>{const b=button('',()=>answer(i),'choice');b.append(el('b','',i+1),el('span','',text));choices.append(b);});card.append(imageCard(q,choices),choices);root.append(card);
 }
 function answer(choice){if(!run||run.status!=='playing'||feedback)return;const data={runId:run.runId,seq:run.seq,choice};task(async()=>{run=await request('answer',data);feedback=true;profile.activeRunId=run.status==='playing'?run.runId:null;play();});}
 async function board(){
  const generations=category==='pokemon'?[...rankingGenerations].sort((a,b)=>a-b):[],data=await request('board',{category,generations});root.replaceChildren();
  const head=el('div','section-head');head.append(el('h2','',`${selected().icon} ${selected().title} 랭킹`),button('← 분야 선택',()=>task(async()=>{profile=await request('profile');home();}),'btn quiet'));root.append(head,el('p','rule',`도전한 판의 최고 정답 수로 비교해요. 같은 점수라면 더 짧게 푼 기록이 앞서요.${category==='pokemon'?' 선택 세대: '+generations.map(g=>`${g}세대`).join('·'):''}`));
  const table=el('table','leaderboard'),headRow=el('tr');['순위','이름','정답','풀이 시간'].forEach(t=>headRow.append(el('th','',t)));const thead=el('thead');thead.append(headRow);table.append(thead);const body=el('tbody');let rank=0,last='';data.rows.forEach((r,i)=>{const key=`${r.score}:${r.elapsedSeconds}`;if(key!==last)rank=i+1;last=key;const tr=el('tr',r.self?'mine':'');[`${rank}위`,r.nickname+(r.self?' (나)':''),`${r.score}점`,`${Math.floor(r.elapsedSeconds/60)}분 ${r.elapsedSeconds%60}초`].forEach(t=>tr.append(el('td','',t)));body.append(tr);});table.append(body);root.append(table);if(!data.rows.length)root.append(el('p','empty','아직 기록이 없어요. 첫 번째 기록을 남겨 보세요!'));
 }
 async function load(){
  if(window.PopularQuizTransport){exitTransport=window.PopularQuizExitTransport||window.PopularQuizTransport;return window.PopularQuizTransport;}
  const local=['localhost','127.0.0.1'].includes(location.hostname),emulator=local&&params.get('emulator')==='1';if(local&&!emulator)throw Error('로컬 검증은 Firebase 에뮬레이터로 실행해 주세요.');
  const script=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('연결 파일을 불러오지 못했어요.'));document.head.append(s);});
  for(const name of ['app','auth','functions'])await script(`/__/firebase/10.12.2/firebase-${name}-compat.js`);
  if(emulator){firebase.initializeApp({apiKey:'demo-key',projectId:'demo-dj48-rules',authDomain:'localhost'});firebase.auth().useEmulator('http://127.0.0.1:9191',{disableWarnings:true});firebase.app().functions('asia-northeast3').useEmulator('127.0.0.1',5001);}else await script('/__/firebase/init.js');
  await new Promise(resolve=>{const off=firebase.auth().onAuthStateChanged(()=>{off();resolve();});});if(!firebase.auth().currentUser)throw Error('퀴즈타운에서 로그인한 뒤 다시 들어와 주세요.');
  let exitToken=await firebase.auth().currentUser.getIdToken();
  firebase.auth().onIdTokenChanged(async user=>{exitToken='';if(user){try{const token=await user.getIdToken();if(firebase.auth().currentUser===user)exitToken=token;}catch(_){}}});
  const projectId=firebase.app().options.projectId;
  const endpoint=emulator?`http://127.0.0.1:5001/${projectId}/asia-northeast3/popularQuizAction`:`https://asia-northeast3-${projectId}.cloudfunctions.net/popularQuizAction`;
  exitTransport=data=>exitToken?fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+exitToken},body:JSON.stringify({data}),keepalive:true}):Promise.resolve();
  const call=firebase.app().functions('asia-northeast3').httpsCallable('popularQuizAction');return async data=>(await call(data)).data;
 }
 async function init(){try{root.replaceChildren(el('p','loading','퀴즈 클럽 문을 여는 중…'));transport=transport||await load();profile=await request('profile');if(profile.activeRunId){const previous=await request('resume',{runId:profile.activeRunId});if(previous.mode==='ranking'){await request('finish',{runId:previous.runId});profile=await request('profile');}}home();}catch(e){root.replaceChildren(el('p','empty',e.message),button('다시 연결',init));}}
 document.addEventListener('keydown',event=>{if(busy||feedback||!run||run.status!=='playing'||event.repeat)return;const number=Number(event.key);if(number>=1&&number<=4){const b=root.querySelectorAll('.choice')[number-1];if(b&&!b.disabled){event.preventDefault();b.click();}}});
 window.addEventListener('pagehide',()=>{if(run?.mode==='ranking'&&run.status==='playing'){try{Promise.resolve(exitTransport({action:'finish',runId:run.runId})).catch(()=>{});}catch(_){}}});
 document.querySelector('.topbar a')?.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||run?.mode!=='ranking'||run.status!=='playing')return;
  event.preventDefault();const href=event.currentTarget.href;
  task(async()=>{run=await request('finish',{runId:run.runId});location.assign(href);});
 });
 window.addEventListener('pageshow',event=>{if(event.persisted)init();});init();
})();
