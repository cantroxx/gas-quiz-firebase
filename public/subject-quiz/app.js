(function(){
 'use strict';
 const root=document.getElementById('app'),notice=document.getElementById('notice');
 let transport,exitTransport,leaving=false,profile,run=null,subject=new URLSearchParams(location.search).get('subject')||'korean',group=new URLSearchParams(location.search).get('group')||'4-1',busy=false,offset=0,feedback=false,expiryRequested=false;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function button(text,fn,cls='btn'){const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
 function error(e,retry){notice.replaceChildren(el('span','',e.message||'연결을 확인하고 다시 시도해 주세요.'));if(retry)notice.append(button('다시 시도',()=>{notice.hidden=true;retry();}));notice.append(button('닫기',()=>{notice.hidden=true;}));notice.hidden=false;}
 async function request(action,data={}){const value=await transport({action,clientVersion:'subject-depth-2026-10-17',visualVersion:1,...data});if(Number.isFinite(value.serverNow))offset=value.serverNow-Date.now();if(leaving&&value.status==='playing')closeOnExit(value.runId);return value;}
 async function task(fn){if(busy)return;notice.hidden=true;busy=true;root.querySelectorAll('button').forEach(x=>x.disabled=true);try{await fn();}catch(e){error(e,()=>task(fn));}finally{busy=false;root.querySelectorAll('button').forEach(x=>x.disabled=false);}}
 const selected=()=>profile.subjects.find(s=>s.id===subject)||profile.subjects[0];
 function tabs(items,current,change){const nav=el('nav','tabs');for(const [id,title]of items){const b=button(title,()=>change(id),'tab');b.setAttribute('aria-pressed',id===current);nav.append(b);}return nav;}
 function rememberLocation(){
  const url=new URL(location.href);url.searchParams.set('subject',subject);url.searchParams.set('group',group);history.replaceState(null,'',url);
  const back=document.querySelector('.topbar a');if(back)back.href='/?subjectQuizReturn='+encodeURIComponent(subject);
 }
 function reading(passage){const box=el('section','reading');box.setAttribute('aria-label','읽기 자료');box.append(el('strong','reading-label','읽기 자료'),el('p','',passage));return box;}
 function home(){
  run=null;feedback=false;expiryRequested=false;root.replaceChildren();const s=selected();subject=s.id;
  const hero=el('header','hero');hero.append(el('div','eyebrow','LEARNING CLASSROOM'),el('h1','',`${s.icon} ${s.title} · 배움의 교실`),el('p','', '단원을 골라 차근차근 연습하고, 랭킹전에 도전해 보세요.'),el('p','rule','랭킹전 · 하트 3개 · 한 판 5분 · 정답마다 1점 누적'));root.append(hero);
  root.append(tabs(profile.subjects.map(x=>[x.id,x.icon+' '+x.title]),subject,id=>{subject=id;group='4-1';home();}));
  const head=el('div','section-head');head.append(el('h2','',`${s.title} 학습하기`),button(`누적 ${profile.totals[subject]||0}점 · 랭킹 보기`,()=>task(board),'btn quiet'));root.append(head);
  root.append(tabs([...s.groups.filter(g=>!g.parent).map(g=>[g.id,g.title]),...(s.groups.some(g=>g.parent)?[['history','역사']]:[])],['korean-history','world-history'].includes(group)?'history':group,id=>{group=id==='history'?'korean-history':id;home();}));
  if(group.endsWith('history'))root.append(tabs(s.groups.filter(g=>g.parent).map(g=>[g.id,g.title]),group,id=>{group=id;home();}));
  const g=s.groups.find(x=>x.id===group)||s.groups[0];group=g.id;rememberLocation();
  root.append(el('p','small',`${s.publisher} · ${g.description||'2022 개정 교육과정의 단원별 개념을 연습합니다.'}`));
  const grid=el('div','grid');for(const u of profile.units.filter(x=>x.subject===subject&&x.group===group)){
   const card=el('article','unit'),progress=profile.progress[u.id]||{};
   card.append(el('div','number',group.startsWith('4-')&&u.number<=6?`${u.number}단원`:'배움 주제'),el('h3','',u.title),el('p','small',`연습 ${progress.practiceCorrect||0}/${progress.practiceAnswered||0} 정답 · 랭킹 누적 ${progress.rankingCorrect||0}점`));
   const actions=el('div','actions');for(const [mode,label]of [['practice','연습전'],['ranking','랭킹전']])actions.append(button(label,()=>start(u.id,mode),mode==='practice'?'btn':'btn secondary'));card.append(actions);grid.append(card);
  }root.append(grid,el('p','footer-note','랭킹은 이 과목의 모든 학기·단원 기록을 합산해요. 오답과 시간 초과는 점수에 더하지 않아요. 연습전에는 하트·5분 제한이 없으며, 정답 보상은 기존 하루 한도를 함께 사용해요.'));
 }
 function openRun(value){run=value;profile.activeRunId=run.status==='playing'?run.runId:null;feedback=Boolean(run.feedback);expiryRequested=false;play();window.scrollTo(0,0);}
 // A closed page never asks the learner to manage an abandoned session.
 async function closePrevious(){
  profile=await request('profile');
  if(profile.activeRunId){await request('finish',{runId:profile.activeRunId});profile=await request('profile');}
 }
 async function begin(unitId,mode,requestId){
  try{openRun(await request('start',{unitId,mode,requestId}));}
  catch(e){
   if(e.code!=='functions/failed-precondition'&&e.code!=='failed-precondition')throw e;
   profile=await request('profile');if(!profile.activeRunId)throw e;
   await request('finish',{runId:profile.activeRunId});
   openRun(await request('start',{unitId,mode,requestId}));
  }
 }
 function start(unitId,mode){
  const requestId=crypto.randomUUID();let prepared=false;
  task(async()=>{if(!prepared){await closePrevious();prepared=true;}await begin(unitId,mode,requestId);});
 }
 function closeOnExit(runId){
  if(!runId||!exitTransport)return;
  try{Promise.resolve(exitTransport({action:'finish',runId,clientVersion:'subject-depth-2026-10-17',visualVersion:1})).catch(()=>{});}catch(_){}
 }
 function svgNode(tag,attrs){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs||{}))n.setAttribute(k,String(v));return n;}
 function diagram(data){
  if(data.kind==='evidence'){
   const box=el('figure','diagram evidence-visual'),svg=svgNode('svg',{viewBox:`0 0 ${data.width} ${data.height}`,role:'img','aria-label':data.description});
   box.append(el('figcaption','',data.title),svg);
   const tags=new Set(['text','line','rect','circle','polygon','ellipse','path']);
   const attrs=new Set(['x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','width','height','points','d','fill','stroke','stroke-width','font-size','text-anchor','stroke-dasharray']);
   for(const m of data.marks||[]){if(!tags.has(m.tag))continue;const safe=Object.fromEntries(Object.entries(m.attrs||{}).filter(([k,v])=>attrs.has(k)&&!String(v).includes('url(')));const n=svgNode(m.tag,safe);if(m.tag==='text')n.textContent=m.text||'';svg.append(n);}
   if(data.note)box.append(el('p','visual-note',data.note));
   const alt=el('details','visual-description');alt.append(el('summary','','그림을 글로 읽기'),el('p','',data.description));box.append(alt);return box;
  }
  const box=el('figure','diagram'),svg=svgNode('svg',{viewBox:'0 0 500 240',role:'img'});box.append(svg);
  const line=(x1,y1,x2,y2)=>svg.append(svgNode('line',{x1,y1,x2,y2,stroke:'#426a50','stroke-width':3}));
  if(['bar','line'].includes(data.kind)){
   svg.setAttribute('aria-label',`${data.kind==='bar'?'막대':'꺾은선'}그래프. ${data.labels.map((x,i)=>x+' '+data.values[i]+data.unit).join(', ')}`);
   const tick=Math.max(5,Math.ceil(Math.max(...data.values)/30)*5),scale=168/(tick*6);
   for(let i=0;i<=6;i++){const y=200-i*28;svg.append(svgNode('line',{x1:40,y1:y,x2:475,y2:y,stroke:'#dce4d3'}));const text=svgNode('text',{x:8,y:y+5,'font-size':14,fill:'#4a654c'});text.textContent=i*tick;svg.append(text);}
   data.values.forEach((v,i)=>{const x=90+i*110,y=200-v*scale;if(data.kind==='bar')svg.append(svgNode('rect',{x:x-23,y,width:46,height:v*scale,fill:'#80a565',rx:4}));else{if(i)line(x-110,200-data.values[i-1]*scale,x,y);svg.append(svgNode('circle',{cx:x,cy:y,r:6,fill:'#2e7152'}));}const text=svgNode('text',{x,y:224,'text-anchor':'middle','font-size':16});text.textContent=data.labels[i];svg.append(text);});
   const table=el('table'),head=el('tr'),values=el('tr');head.append(el('th','','구분'));values.append(el('th','',data.unit));data.labels.forEach((x,i)=>{head.append(el('th','',x));values.append(el('td','',data.values[i]));});table.append(head,values);box.append(table);
  }else if(data.kind==='angle'){
   const rad=data.angle*Math.PI/180;line(130,180,340,180);line(130,180,130+170*Math.cos(rad),180-170*Math.sin(rad));const text=svgNode('text',{x:200,y:160,'font-size':25});text.textContent=data.label===false?'?':data.angle+'°';svg.append(text);svg.setAttribute('aria-label',data.label===false?'한 변이 오른쪽을 향하고 다른 변이 위쪽으로 벌어진 각. 눈금 정보는 읽기 자료에 있습니다.':data.angle+'도인 각');
  }else if(data.kind==='polygon-grid'){
   for(let i=0;i<=8;i++)svg.append(svgNode('line',{x1:70+i*40,y1:10,x2:70+i*40,y2:210,stroke:'#dce4d3'}));
   for(let i=0;i<=5;i++)svg.append(svgNode('line',{x1:70,y1:210-i*40,x2:390,y2:210-i*40,stroke:'#dce4d3'}));
   svg.append(svgNode('polygon',{points:data.points.map(([x,y])=>`${70+x*40},${210-y*40}`).join(' '),fill:'#dce9c9',stroke:'#426a50','stroke-width':3}));
   const [x,y]=data.points[0],text=svgNode('text',{x:70+x*40-18,y:210-y*40+20,'font-size':18});text.textContent='가';svg.append(text);svg.setAttribute('aria-label','모눈에 그린 이동 전 도형. 꼭짓점 가는 왼쪽에서 '+x+'칸, 아래에서 '+y+'칸입니다.');
  }else if(data.kind==='triangle'){
   const half=90,height=half/Math.tan(data.top*Math.PI/360),factor=Math.min(1,165/height),h=height*factor,w=half*factor;
   svg.append(svgNode('polygon',{points:`250,${205-h} ${250-w},205 ${250+w},205`,fill:'#edf3e3',stroke:'#426a50','stroke-width':3}));
   const text=svgNode('text',{x:250,y:205-h+30,'text-anchor':'middle','font-size':18});text.textContent=data.top+'°';svg.append(text);
   for(const side of [-1,1]){const x=250+side*w/2,y=205-h/2;line(x-6,y-4,x+6,y+4);}
   svg.setAttribute('aria-label',`양쪽 빗변의 길이가 같은 이등변삼각형. 꼭대기 각 ${data.top}도. 밑각은 표시하지 않음.`);
  }else if(data.kind==='quadrilaterals'){
   svg.append(svgNode('rect',{x:35,y:75,width:150,height:90,fill:'#edf3e3',stroke:'#426a50','stroke-width':3}));
   svg.append(svgNode('polygon',{points:'270,165 370,165 420,78.397 320,78.397',fill:'#edf3e3',stroke:'#426a50','stroke-width':3}));
   for(const [x,y,t]of [[110,195,'가'],[345,195,'나'],[110,65,'5cm'],[17,125,'3cm'],[345,65,'4cm'],[303,156,'60°']]){const text=svgNode('text',{x,y,'text-anchor':'middle','font-size':16});text.textContent=t;svg.append(text);}
   svg.setAttribute('aria-label','가: 이웃한 변 3cm와 5cm인 직사각형. 나: 네 변 4cm, 한 각 60도인 마름모. 도형 사이 축척은 다름.');
  }else if(data.kind==='regular-polygon'){
   const points=Array.from({length:data.sides},(_,i)=>{const rad=2*Math.PI*i/data.sides-Math.PI/2;return [250+90*Math.cos(rad),120+90*Math.sin(rad)];});
   svg.append(svgNode('polygon',{points:points.map(p=>p.join(',')).join(' '),fill:'#edf3e3',stroke:'#426a50','stroke-width':3}));
   const text=svgNode('text',{x:250,y:22,'text-anchor':'middle','font-size':18});text.textContent='가';svg.append(text);svg.setAttribute('aria-label',`${data.sides}각형. 맨 위 꼭짓점의 이름은 가.`);
  }else if(data.kind==='grid'){
   for(let i=0;i<=8;i++){line(60+i*40,30,60+i*40,210);}for(let i=0;i<=4;i++)line(60,210-i*40,380,210-i*40);
   const x=60+data.x*40,y=210-data.y*40;svg.append(svgNode('circle',{cx:x,cy:y,r:8,fill:'#be6341'}));line(x,y,x+data.dx*40,y);svg.append(svgNode('circle',{cx:x+data.dx*40,cy:y,r:8,fill:'#2e7152'}));svg.setAttribute('aria-label',`가로 ${data.x}칸 세로 ${data.y}칸의 점을 오른쪽 ${data.dx}칸 이동`);
  }return box;
 }
 function play(){
  root.replaceChildren();const u=profile.units.find(x=>x.id===run.unitId),s=profile.subjects.find(x=>x.id===u.subject);subject=s.id;group=u.group;rememberLocation();
  const head=el('div','section-head');head.append(el('h2','',`${s.icon} ${s.title} · ${run.mode==='ranking'?'랭킹전':'연습전'}`));if(run.status==='playing')head.append(button('그만 풀기',()=>task(async()=>{run=await request('finish',{runId:run.runId});play();}),'btn quiet'));root.append(head,el('p','small',`${u.groupTitle} / ${u.title}`));
  const hud=el('div','hud');hud.append(el('span','',`이번 판 ${run.correct}점`));if(run.mode==='ranking'){const remaining=Math.ceil(Math.max(0,run.deadline-(Date.now()+offset))/1000);hud.append(el('span','hearts','♥'.repeat(run.hearts)+'♡'.repeat(3-run.hearts)),el('span','time',`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`));}else hud.append(el('span','',run.learning?`복습할 개념 ${run.learning.pending}개 · 재확인 ${run.learning.confirmed}개`:'차근차근 연습해요'));root.append(hud);
  if(feedback&&run.feedback){const f=run.feedback,card=el('section','feedback'+(f.correct?'':' wrong'));card.append(el('h2','',f.correct?'정답이에요!':'다시 배워 볼까요?'),el('p','',`정답: ${f.answerText}`),el('p','',f.explanation));if(!f.correct&&f.selectedReason&&f.selectedReason!==f.explanation)card.append(el('p','selected-reason','선택한 보기 살펴보기: '+f.selectedReason));if(f.passage||f.diagram){const details=el('details','review-material');details.append(el('summary','','자료 다시 보기'),reading(f.passage),el('p','',f.prompt||''));if(f.diagram)details.append(diagram(f.diagram));card.append(details);}if(f.rewardCoin||f.xpDelta)card.append(el('p','small',`${f.rewardCoin?`+${f.rewardCoin} DJ코인 `:''}${f.xpDelta?`+${f.xpDelta} 경험치`:''}`));if(run.status==='playing')card.append(button('다음 문제 →',()=>{feedback=false;play();}));root.append(card);}
  if(run.status==='finished'){
   profile.activeRunId=null;profile.totals[subject]=run.totalScore;
   const result=el('section','result');result.append(el('h2','',run.reason==='time'?'풀이 시간이 끝났어요':run.reason==='hearts'?'하트를 모두 사용했어요':'이번 학습을 마쳤어요'),el('p','big',`${run.correct}점`),el('p','',`${run.answered}문제 중 ${run.correct}문제 정답`),el('p','score',run.mode==='ranking'?`${s.title} 통합 누적 ${run.totalScore}점`:'연습 기록에 저장했어요'),button('단원으로 돌아가기',()=>task(async()=>{profile=await request('profile');home();})));root.append(result);return;
  }
  if(!feedback){const q=run.question,card=el('section','question');card.append(el('span','small',`${run.seq+1}번째 문제${q.difficulty?' · '+({1:'기초 확인',2:'근거 적용',3:'추론·오류 분석'}[q.difficulty]):''}${q.review?' · 다른 문제로 다시 확인해요':''}`));if(q.passage)card.append(reading(q.passage));card.append(el('h2','',q.prompt));if(q.diagram)card.append(diagram(q.diagram));const choices=el('div','choices');q.choices.forEach((text,i)=>{const b=button('',()=>answer(i),'choice');b.append(el('b','',String(i+1)),el('span','',text));choices.append(b);});card.append(choices);root.append(card);}
  tick();
 }
 function answer(choice){if(!run||run.status!=='playing')return;const payload={runId:run.runId,seq:run.seq,choice};task(async()=>{run=await request('answer',payload);feedback=true;profile.totals[subject]=run.totalScore;play();});}
 function tick(){
  if(!run||run.mode!=='ranking'||run.status!=='playing')return;const ms=Math.max(0,run.deadline-(Date.now()+offset)),seconds=Math.ceil(ms/1000),clock=root.querySelector('.time');if(clock)clock.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  if(ms===0&&!busy&&!expiryRequested){expiryRequested=true;root.querySelectorAll('.choice').forEach(x=>x.disabled=true);task(async()=>{run=await request('resume',{runId:run.runId});if(run.status==='playing')expiryRequested=false;play();});}
 }
 async function board(){
  const data=await request('board',{subject});root.replaceChildren();const head=el('div','section-head');head.append(el('h2','',`${selected().icon} ${selected().title} 통합 랭킹`),button('← 단원으로',home,'btn quiet'));root.append(head,el('p','banner','모든 학기·단원·역사·맞춤법의 정답 수를 과목별로 합산합니다. 한 판 5분, 하트 3개. 재도전 점수도 더해져요. 같은 점수는 같은 순위입니다.'));
  const table=el('table','leaderboard'),tr=el('tr');['순위','이름','누적 점수'].forEach(x=>tr.append(el('th','',x)));table.append(tr);let rank=0,last=null;data.rows.forEach((row,i)=>{if(row.totalScore!==last)rank=i+1;last=row.totalScore;const tr=el('tr',row.self?'mine':'');[`${rank}위`,row.nickname+(row.self?' (나)':''),`${row.totalScore}점`].forEach(x=>tr.append(el('td','',x)));table.append(tr);});root.append(table);if(!data.rows.length)root.append(el('p','banner','아직 기록이 없어요. 첫 정답으로 랭킹을 시작해 보세요!'));root.append(el('p','score',`나의 ${selected().title} 누적 ${data.totalScore}점`));
 }
 async function load(){
  if(window.SubjectQuizTransport){exitTransport=window.SubjectQuizExitTransport||window.SubjectQuizTransport;return window.SubjectQuizTransport;}
  const local=['localhost','127.0.0.1'].includes(location.hostname),emulator=local&&new URLSearchParams(location.search).get('emulator')==='1';
  if(local&&!emulator)throw Error('로컬 검증은 Firebase 에뮬레이터로 실행해 주세요.');
  const script=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('연결 파일을 불러오지 못했어요.'));document.head.append(s);});
  for(const name of ['app','auth','functions'])await script(`/__/firebase/10.12.2/firebase-${name}-compat.js`);
  if(emulator){firebase.initializeApp({apiKey:'demo-key',projectId:'demo-dj48-rules',authDomain:'localhost'});firebase.auth().useEmulator('http://127.0.0.1:9191',{disableWarnings:true});firebase.app().functions('asia-northeast3').useEmulator('127.0.0.1',5001);}else await script('/__/firebase/init.js');
  await new Promise(resolve=>{const off=firebase.auth().onAuthStateChanged(()=>{off();resolve();});});
  if(!firebase.auth().currentUser)throw Error('퀴즈타운에서 로그인한 뒤 다시 들어와 주세요.');
  let exitToken=await firebase.auth().currentUser.getIdToken();
  firebase.auth().onIdTokenChanged(async user=>{exitToken='';if(user){try{const token=await user.getIdToken();if(firebase.auth().currentUser===user)exitToken=token;}catch(_){}}});
  const projectId=firebase.app().options.projectId;
  const endpoint=emulator?`http://127.0.0.1:5001/${projectId}/asia-northeast3/subjectQuizAction`:`https://asia-northeast3-${projectId}.cloudfunctions.net/subjectQuizAction`;
  // No async token refresh during pagehide: keepalive uses the already refreshed token.
  exitTransport=data=>exitToken?fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+exitToken},body:JSON.stringify({data}),keepalive:true}):Promise.resolve();
  const call=firebase.app().functions('asia-northeast3').httpsCallable('subjectQuizAction');return async data=>(await call(data)).data;
 }
 async function init(){try{leaving=false;run=null;root.replaceChildren(el('p','loading','교실 문을 여는 중…'));transport=transport||await load();await closePrevious();home();}catch(e){root.replaceChildren(el('p','banner',e.message),button('다시 연결',init));}}
 window.addEventListener('pagehide',()=>{leaving=true;if(run?.status==='playing')closeOnExit(run.runId);});
 window.addEventListener('pageshow',event=>{if(event.persisted)init();});
 document.querySelector('.topbar a')?.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||run?.status!=='playing')return;
  event.preventDefault();const href=event.currentTarget.href;
  task(async()=>{run=await request('finish',{runId:run.runId});location.assign(href);});
 });
 setInterval(tick,250);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&run?.status==='playing'&&!busy)task(async()=>{run=await request('resume',{runId:run.runId});play();});});init();
})();
