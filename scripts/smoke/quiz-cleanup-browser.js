'use strict';
// Local renderer only: every network request is blocked.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../..');
async function main(){
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const output=process.env.QUIZ_CLEANUP_SCREENSHOT_DIR||'/tmp/quiz-cleanup-stages-20261018/screenshots';
  fs.mkdirSync(output,{recursive:true});
  try{
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>route.abort());
    await page.setContent('<main class="admin-panel"><div id="admin-quiz-quality-summary"></div><div id="admin-quiz-quality-list"></div></main>');
    await page.addStyleTag({path:path.join(root,'public/styles.css')});
    await page.addScriptTag({path:path.join(root,'public/js/features/admin-render.js')});
    for(const width of [390,1440]){
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>DJ48AdminRender.renderAdminQuizQualityAudit({
        scope:'current',complete:false,scopeDescription:'현재 인기 퀴즈 문제은행 11개 점검. 생성형 과목과 아이돌·애니 팩은 별도 검사 대상입니다.',
        metrics:{quizCount:11,questionCount:1200},quizSummaries:[{quizId:'pokemon-gen1',title:'포켓몬',questionCount:1200}],
        issues:{readIssues:[{quizId:'pokemon-gen1',reason:'1200문항까지만 검사함'},{quizId:'tiniping',reason:'문항 읽기 실패'}]}
      }));
      const text=await page.locator('#admin-quiz-quality-list').innerText();
      assert.match(text,/검사가 끝나지 않았습니다/);assert.match(text,/문항 읽기 실패/);assert.match(text,/1200문항까지만/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(output,`audit-partial-${width}.png`),fullPage:true});
    }
    await page.evaluate(()=>DJ48AdminRender.renderAdminQuizQualityAudit({scope:'archive',complete:true,scopeDescription:'지정한 보관 문제만 점검',issues:{}}));
    assert(!/검사가 끝나지/.test(await page.locator('#admin-quiz-quality-list').innerText()));
    assert.deepEqual(errors,[]);console.log('PASS cleanup admin UI: scope, partial/truncated/read-failure notice, complete refresh, 390/1440px, no network');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
