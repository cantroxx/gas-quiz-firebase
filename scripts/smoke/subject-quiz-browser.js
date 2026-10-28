#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),C=require('../../functions/subject-quiz/curriculum'),G=require('../../functions/subject-quiz/generator');
const E=require('../../functions/subject-quiz/case-expansion');
const P=require('../../functions/subject-quiz/pool'),M=require('../../functions/subject-quiz/math-pool');
const fixtures=Object.fromEntries(C.units.map(u=>{
 const qs=[0,1,2].map(i=>G.generateBase(u.id,'browser',i));
 if(E.catalog[u.id])for(const variant of [0,1]){
  for(let i=0;i<200;i++){const q=G.generateExpanded(u.id,'browser-case-'+i,i);if(q.materialVariant===variant){qs.push(q);break;}}
  assert.equal(qs.length,4+variant,'Missing expansion fixture '+u.id);
 }
 const pool=P.get(u.id);
 if(pool.math)for(let t=0;t<4;t++)qs.push(P.question(u.id,P.NUMERIC_VERSION+'-'+(M.count(u)-4+t),'browser-pool'));
 else{
  const longest=[...pool.questions].sort((a,b)=>(b.passage.length+b.choices.join('').length)-(a.passage.length+a.choices.join('').length));
  const added=new Set(P.parse(u.id).map(row=>row.id));
  const paired=longest.find(q=>q.kind==='paired'&&q.sourceIds.some(id=>added.has(id)))||longest.find(q=>q.kind==='paired')||longest[0];
  const other=longest.find(q=>q.poolId!==paired.poolId&&q.kind==='single')||longest.find(q=>q.poolId!==paired.poolId);
  qs.push(P.question(u.id,paired.poolId,'browser-pool'),P.question(u.id,other.poolId,'browser-pool'));
 }
 for(const q of pool.questions.filter(q=>q.diagram?.kind==='evidence'))qs.push({...q,reviewFor:q.objective});
 const learning=pool.questions.find(q=>q.kind==='learning'&&q.difficulty===3);if(learning)qs.push({...learning,reviewFor:learning.objective});
 // Exercise the new content actually served by the candidate pool, including
 // long proofreading choices and the changed-condition maths explanations.
 const added=pool.questions.filter(q=>q.skill.includes(':unit-transfer-')||q.skill.includes(':transfer-')||q.skill.includes(':inquiry-')||q.skill.includes(':spelling-'));
 for(const family of new Set(added.map(q=>q.family))){
  const q=added.filter(q=>q.family===family).sort((a,b)=>b.passage.length+b.choices.join('').length-a.passage.length-a.choices.join('').length)[0];
  qs.push({...q,reviewFor:q.objective});
 }
 let selected=process.env.SUBJECT_VISUAL_ONLY&&pool.questions.some(q=>q.diagram?.kind==='evidence')?qs.filter(q=>q.diagram?.kind==='evidence'):qs;
 if(process.env.SUBJECT_VISUAL_LAYOUT&&selected.some(q=>q.diagram?.kind==='evidence'))selected=[...new Map(selected.map(q=>[JSON.stringify(q.diagram),q])).values()];
 return [u.id,selected];
}));
async function main(){
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const out='/tmp/subject-quiz-browser';fs.mkdirSync(out,{recursive:true});
 try{for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!=='https://subject.invalid')return route.abort();const file=path.join(__dirname,'../../public',u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});});
  await page.addInitScript(({subjects,units,questions})=>{
   let active=null,coins=0;const totals={korean:59,math:0,social:0,science:0};window.mock={failAnswer:false,calls:[]};
   window.SubjectQuizTransport=async p=>{window.mock.calls.push(p);if(p.action==='profile')return {subjects,units,totals,progress:{},activeRunId:active?.status==='playing'?active.runId:null};if(p.action==='board')return {totalScore:totals[p.subject],rows:[{nickname:'배움 친구',totalScore:80},{nickname:'나',totalScore:totals[p.subject],self:true}]};if(p.action==='start'){active={runId:'test-run',unitId:p.unitId,mode:p.mode,seq:0,correct:0,answered:0,hearts:3,startedAt:Date.now(),deadline:Date.now()+300000,status:'playing',totalScore:totals[units.find(u=>u.id===p.unitId).subject]};}
    if(p.action==='answer'){if(window.mock.failAnswer){window.mock.failAnswer=false;throw Error('테스트 연결 끊김');}if(p.seq===active.seq){const q=questions[active.unitId][active.seq%questions[active.unitId].length],correct=p.choice===q.answer;active.feedback={correct,answerText:q.choices[q.answer],explanation:q.explanation,selectedReason:correct?'':q.rationales[p.choice],passage:q.passage,prompt:q.prompt,diagram:q.diagram,rewardCoin:correct&&active.mode==='practice'?++coins:0};active.seq++;active.answered++;if(correct){active.correct++;if(active.mode==='ranking'){active.totalScore++;totals[units.find(u=>u.id===active.unitId).subject]++;}}else if(active.mode==='ranking')active.hearts--;if(!active.hearts){active.status='finished';active.reason='hearts';}}}
    if(p.action==='finish'){active.status='finished';active.reason='quit';}if(Date.now()>=active.deadline){active.status='finished';active.reason='time';}
    const q=questions[active.unitId][active.seq%questions[active.unitId].length];active.learning=active.mode==='practice'?{stage:2,pending:1,confirmed:1}:null;active.question={unitId:q.unitId,passage:q.passage,prompt:q.prompt,choices:q.choices,diagram:q.diagram,difficulty:q.difficulty,review:Boolean(q.reviewFor)};return structuredClone({...active,serverNow:Date.now()});
   };
   window.subjectTest={expire:()=>{active.deadline=Date.now()-1;},answer:()=>questions[active.unitId][active.seq%questions[active.unitId].length].answer};
  },{subjects:C.subjects,units:C.units,questions:fixtures});
  await page.goto('https://subject.invalid/subject-quiz/');await page.getByRole('heading',{name:'국어 학습하기'}).waitFor();
  assert.equal(await page.locator('.unit').count(),8);assert.doesNotMatch(await page.locator('main').innerText(),/원코|스피드|노힌트/);
  await page.screenshot({path:`${out}/home-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'랭킹전',exact:true}).first().click();await page.locator('.choice').first().waitFor();
  assert.equal(await page.locator('.choice').count(),4);assert.match(await page.locator('.hearts').innerText(),/♥♥♥/);
  await page.screenshot({path:`${out}/question-${width}.png`,fullPage:true});
  let correct=await page.evaluate(()=>subjectTest.answer());await page.evaluate(()=>mock.failAnswer=true);await page.locator('.choice').nth(correct).click();await page.getByRole('button',{name:'다시 시도',exact:true}).click();await page.getByRole('heading',{name:'정답이에요!'}).waitFor();
  await page.getByRole('button',{name:'다음 문제 →'}).click();for(let i=0;i<3;i++){correct=await page.evaluate(()=>subjectTest.answer());await page.locator('.choice').nth((correct+1)%4).click();await page.getByRole('heading',{name:'다시 배워 볼까요?'}).waitFor();if(i<2)await page.getByRole('button',{name:'다음 문제 →'}).click();}
  assert.match(await page.locator('.result').innerText(),/통합 누적 60점/);assert.equal(await page.locator('.choice').count(),0);await page.screenshot({path:`${out}/result-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'단원으로 돌아가기'}).click();await page.getByRole('button',{name:'➗ 수학',exact:true}).click();assert.equal(await page.locator('.unit').count(),6);
  await page.locator('.unit').filter({hasText:'막대그래프'}).getByRole('button',{name:'연습전',exact:true}).click();await page.locator('.diagram svg').waitFor();assert.equal(await page.locator('.diagram table tr').count(),2);await page.screenshot({path:`${out}/graph-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'그만 풀기'}).click();await page.getByRole('button',{name:'단원으로 돌아가기'}).click();await page.getByRole('button',{name:'랭킹전',exact:true}).first().click();await page.evaluate(()=>subjectTest.expire());await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.getByRole('heading',{name:'풀이 시간이 끝났어요'}).waitFor();
  await page.getByRole('button',{name:'단원으로 돌아가기'}).click();await page.getByRole('button',{name:'🏛️ 사회',exact:true}).click();await page.getByRole('button',{name:'역사',exact:true}).click();assert.equal(await page.locator('.unit').count(),4);await page.getByRole('button',{name:'세계사',exact:true}).click();assert.equal(await page.locator('.unit').count(),2);
  await page.getByRole('button',{name:/랭킹 보기/}).click();await page.locator('.leaderboard').waitFor();assert.equal(await page.locator('.leaderboard tr').count(),3);
  // Base tasks, every diagram, and both authored-case tasks at all three widths.
  for(const u of C.units.filter(u=>!process.env.SUBJECT_VISUAL_ONLY||fixtures[u.id].some(q=>q.diagram?.kind==='evidence'))){
   await page.goto(`https://subject.invalid/subject-quiz/?subject=${u.subject}&group=${u.group}`);
   const unit=page.locator('.unit').filter({has:page.getByRole('heading',{name:u.title,exact:true})});
   await unit.getByRole('button',{name:'연습전',exact:true}).click();
   for(let i=0;i<fixtures[u.id].length;i++){
    await page.locator('.question .reading').waitFor();assert.equal(await page.locator('.reading p').textContent(),fixtures[u.id][i].passage,u.id+' lost passage text');
    assert.equal(await page.locator('.choice').count(),4);if(fixtures[u.id][i].reviewFor){assert.match(await page.locator('main').innerText(),/복습/);assert.match(await page.locator('main').innerText(),/재확인 1개/);}assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,u.id);
    if(await page.locator('.diagram').count()){assert.ok((await page.locator('.diagram svg').getAttribute('aria-label')).length>10);const within=await page.locator('.diagram svg').evaluate(svg=>[...svg.querySelectorAll('circle,rect')].every(e=>!e.hasAttribute('cy')||Number(e.getAttribute('cy'))>=0));assert.ok(within,u.id+' graph exceeded viewport');}
    if(width===390&&(i===0||i===3||i===fixtures[u.id].length-2)&&['korean:4-1:1','math:4-2:2','math:4-2:4','science:4-2:2','social:world-history:1'].includes(u.id))await page.screenshot({path:`${out}/review-${u.id.replaceAll(':','-')}-${i}.png`,fullPage:true});
    if(fixtures[u.id][i].diagram?.kind==='evidence'){
     const outside=await page.locator('.evidence-visual svg').evaluate(svg=>{const v=svg.viewBox.baseVal;return [...svg.querySelectorAll('text')].filter(e=>{const b=e.getBBox();return b.x<0||b.y<0||b.x+b.width>v.width+1||b.y+b.height>v.height+1;}).map(e=>e.textContent);});
     assert.deepEqual(outside,[],u.id+' clipped visual labels '+fixtures[u.id][i].skill);
     await page.locator('.visual-description summary').click();assert.equal(await page.locator('.visual-description p').textContent(),fixtures[u.id][i].diagram.description);await page.locator('.visual-description summary').click();
     if(width===390&&(process.env.SUBJECT_VISUAL_LAYOUT||fixtures[u.id][i].skill.endsWith('-0')))await page.screenshot({path:`${out}/visual-${u.id.replaceAll(':','-')}-${fixtures[u.id][i].diagram.type}-${i}.png`,fullPage:true});
    }
    const correct=await page.evaluate(()=>subjectTest.answer());await page.locator('.choice').nth((correct+1)%4).click();
    await page.getByRole('heading',{name:'다시 배워 볼까요?'}).waitFor();assert.ok((await page.locator('.feedback').innerText()).length>30);await page.locator('.review-material > summary').click();assert.equal(await page.locator('.review-material .reading p').textContent(),fixtures[u.id][i].passage,u.id+' lost review passage');
    if(fixtures[u.id][i].diagram)assert.equal(await page.locator('.review-material .diagram svg').count(),1,'Missing feedback diagram');
    await page.getByRole('button',{name:'다음 문제 →'}).click();
   }
   await page.getByRole('button',{name:'그만 풀기'}).click();await page.getByRole('button',{name:'단원으로 돌아가기'}).click();
   assert.equal(new URL(page.url()).searchParams.get('group'),u.group);assert.equal(await page.locator('.topbar a').getAttribute('href'),'/?subjectQuizReturn='+u.subject);
  }
  await page.reload();assert.equal(new URL(page.url()).searchParams.get('group'),'4-2');
  assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close();}
 const tested=C.units.filter(u=>!process.env.SUBJECT_VISUAL_ONLY||fixtures[u.id].some(q=>q.diagram?.kind==='evidence'));const taskCount=tested.reduce((n,u)=>n+fixtures[u.id].length,0);
 console.log(`PASS subject browser: ${tested.length} units, ${taskCount} base/expanded/pool tasks × 1440/390/320px (${taskCount*3} screens), all menu levels, four choices, retry, feedback, hearts, 5-minute expiry, cumulative scores, graphs, rankings. ${out}`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
