'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:1000,height:800}});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());
 if(u.hostname!=='localhost'||u.pathname.startsWith('/__/firebase/')||u.pathname.endsWith('/net.js'))return route.fulfill({contentType:'application/javascript',body:''});
 const file=path.resolve('public','.'+(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname));if(!file.startsWith(path.resolve('public')+'/')||!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css':'text/html; charset=utf-8'});
 });
 await context.addInitScript(()=>{window.quizCalls=[];window.offline=false;window.gradeFailure=false;window.firebase={auth:()=>({currentUser:{uid:'fixture'}}),functions:()=>{},app:()=>({functions:()=>({httpsCallable:name=>async p=>{window.quizCalls.push({name,p});if(window.offline||(window.gradeFailure&&p.action==='answer'))throw Error('offline');return {data:p.action==='question'?{questionId:'fixture-question',unit:'덧셈',text:'서버에서 받은 문제 2+2',subject:'수학',choices:['3','4','5','6'],numeric:true}:{correct:p.answer==='4',answerIndex:1}};}})})};});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto('http://localhost/mathsurvivor/');await page.evaluate(()=>{MS_debug.setQuizConfig({subjective:false,subjects:['math'],grade:4,sem:1});MS_debug.start();MS_debug.openQuiz();});
 await page.getByText('서버에서 받은 문제 2+2',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>MS_debug.state().currentQuiz.answerIndex),undefined);
 await page.evaluate(()=>window.gradeFailure=true);await page.locator('.quiz-choice').filter({hasText:/^4$/}).click();await page.getByText('채점 연결에 실패했어요. 다시 선택해 주세요.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>MS_debug.state().quiz.correct),0);
 await page.evaluate(()=>window.gradeFailure=false);await page.locator('.quiz-choice').filter({hasText:/^4$/}).click();await page.waitForFunction(()=>MS_debug.state().quiz.correct===1);assert(await page.evaluate(()=>quizCalls.some(c=>c.p.action==='answer'&&c.p.answer==='4')));
 await page.reload();await page.evaluate(()=>{MS_debug.setQuizConfig({subjective:true,subjects:['math'],grade:4,sem:1});MS_debug.startStudy();});await page.locator('#quizInput').waitFor({state:'visible'});await page.locator('#quizInput').fill('4');await page.locator('#btnQuizSubmit').click();await page.waitForFunction(()=>MS_debug.state().quiz.correct===1);
 await page.reload();await page.evaluate(()=>{window.offline=true;MS_debug.startStudy();});await page.locator('#quizWhy').filter({hasText:'반영되지 않아요'}).waitFor();assert.equal(await page.evaluate(()=>MS_debug.state().currentQuiz.questionId),undefined);
 assert.deepEqual(errors,[]);console.log('PASS Survivor UI: server question without answer, multiple choice, grading failure/retry, numeric input, offline fallback notice, no script errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
