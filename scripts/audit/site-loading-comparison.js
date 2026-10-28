#!/usr/bin/env node
'use strict';
// Matched synthetic before/after browser trials. No production account or data.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { measure: measureCoordi } = require('../smoke/coordi-loading-browser');
const ROOT = path.resolve(__dirname, '../..');
const PUBLIC = path.resolve(process.env.CLASSROOM_PUBLIC_DIR || path.join(ROOT, 'public'));
const BEFORE = process.env.CLASSROOM_BASELINE_DIR || '/tmp/classroom-loading-20261004/before';
const COORDI_BEFORE = process.env.COORDI_LOADING_BASELINE || '/tmp/coordi-loading-before-20261004/dressing-room.js';
const SAMPLES = Number(process.env.LOADING_SAMPLES || 7);
const modules = ['domain/classroom-domain.js', 'application/classroom-usecases.js', 'features/classroom-state.js',
  'data/level-medal-assets.js', 'features/classroom-form.js', 'features/classroom-portrait.js',
  'features/classroom-workspace.js', 'features/classroom-render.js'];
const changed = new Set(['classroom-usecases.js', 'classroom-state.js', 'classroom-render.js']);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function classroom(browser, variant, cpuRate) {
  const original = variant === 'before';
  const html = fs.readFileSync(path.join(original ? BEFORE : PUBLIC, 'index.html'), 'utf8');
  const startMarker = original ? '    let classroomRenderPromise =' : '    let classroomRenderRequest =';
  const start = html.indexOf(startMarker), end = html.indexOf('    function setClassroomQuestEditorStatus', start);
  assert(start > 0 && end > start);
  const coordinator = html.slice(start, end);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if(url.origin !== 'https://loading-comparison.test') return route.abort();
    if(url.pathname === '/') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '') });
    const file = original && url.pathname === '/classroom.css' ? path.join(BEFORE, 'classroom.css') : path.resolve(PUBLIC, '.' + url.pathname);
    if(!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: file });
  });
  try {
    await page.goto('https://loading-comparison.test/');
    for(const file of modules) await page.addScriptTag({ path: original && changed.has(path.basename(file))
      ? path.join(BEFORE, path.basename(file)) : path.join(PUBLIC, 'js', file) });
    await page.addScriptTag({ content: `
      window.DJ48AccountState = {getCurrentMemberUserId:()=> 'S1'};
      const isCurrentClassroomTeacher = () => false;
      const getClassroomRenderDeps = () => ({isCurrentClassroomTeacher,currentMemberUserId:'S1',getTodayDateKey:()=> '2026-10-04',normalizeDisplayImageUrl:x=>x,getLevelMedalAsset:DJ48LevelMedalAssets.getLevelMedalAsset});
      const settings = DJ48ClassroomDomain.normalizeClassroomSettings({classId:'demo',quests:[{id:'q1',title:'샘플 독서 활동',active:true,rewardMode:'auto',rewardCoin:5}]});
      const delay = (ms, value) => new Promise(resolve=>setTimeout(()=>resolve(value),ms));
      const loadClassroomSettings = () => delay(30,settings);
      const loadClassroomQuestProgress = () => delay(30,{});
      const loadClassroomReviewItems = () => delay(30,[]);
      const loadClassroomWallet = () => delay(30,{point:17});
      const loadClassroomGemProgress = () => delay(30,[]);
      const loadClassroomStudentCards = () => delay(30,Array.from({length:22},(_,i)=>({memberUserId:'S'+(i+1),nickname:'샘플학생 '+(i+1),point:17})));
      let economyReads = 0;
      const loadClassroomEconomyBoard = () => {economyReads++;return delay(600,{myDjCoin:123,classroomGems:[],routines:[],classNotices:{slots:[]}});};
      document.querySelectorAll('.app-view').forEach(view=>view.hidden=view.id!=='classroom-view');
      DJ48ClassroomForm.setClassroomUnlocked(true);DJ48ClassroomForm.setActiveClassroomTab('today');
      ${coordinator}
      window.profileClassroom = async () => {
        const started = performance.now(), stats = {firstInfoMs:null,interactiveMs:null};
        const view = document.getElementById('classroom-view');
        const panel = document.querySelector('[data-classroom-panel="today"]');
        function observeFrame() {
          const grid = document.getElementById('classroom-today-grid');
          const visible = panel.getClientRects().length > 0 && !panel.hidden;
          if(stats.firstInfoMs === null && visible && grid.textContent.includes('17 P') && grid.textContent.includes('샘플 독서 활동')) stats.firstInfoMs = performance.now()-started;
          if(stats.firstInfoMs !== null && !panel.inert && view.getAttribute('aria-busy')==='false') stats.interactiveMs = performance.now()-started;
          else requestAnimationFrame(observeFrame);
        }
        const load = renderClassroomPrototype();
        requestAnimationFrame(observeFrame);
        await load;
        while(stats.interactiveMs === null) await new Promise(resolve=>requestAnimationFrame(resolve));
        const before = economyReads;
        await Promise.all([renderClassroomPrototype(true),renderClassroomPrototype(true),renderClassroomPrototype(true)]);
        stats.economyReadsForThreeRefreshes = economyReads-before;
        return stats;
      };
    ` });
    const result = await page.evaluate(() => window.profileClassroom());
    assert.deepEqual(errors, []);
    return result;
  } finally { await context.close(); }
}

function summarize(rows, field) {
  const values = rows.map(row=>row[field]).sort((a,b)=>a-b);
  return { median: Math.round(values[Math.floor(values.length/2)]*10)/10, min: Math.round(values[0]*10)/10, max: Math.round(values.at(-1)*10)/10, samples: values.length };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const result = { measuredAt: new Date().toISOString(), scope: 'Synthetic offline browser trials, fixed provider delays. Frame-observed content readiness, not field latency or exact paint timing. Coordi includes local iframe startup. Before/after order alternates.',
    settingsDelayMs:30, ordinaryDelayMs:30, economyDelayMs:600, coordiCatalogAndStatusDelayMs:400,
    baseline: { htmlSha256:sha(path.join(BEFORE,'index.html')),coordiSha256:sha(COORDI_BEFORE) }, classroom:[], coordi:[] };
  try {
    for(let sample=1; sample<=SAMPLES; sample++) {
      for(const variant of sample%2 ? ['before','after'] : ['after','before']) {
        for(const cpuRate of [1,4]) {
          const row = {sample,variant,cpuRate,...await classroom(browser,variant,cpuRate)};
          result.classroom.push(row);console.log(JSON.stringify({kind:'classroom',...row}));
        }
        const row = {sample,variant,readyMs:await measureCoordi(browser,variant==='before'?COORDI_BEFORE:undefined)};
        result.coordi.push(row);console.log(JSON.stringify({kind:'coordi',...row}));
      }
    }
    result.summary = { classroom:[],coordi:[] };
    for(const variant of ['before','after']) {
      for(const cpuRate of [1,4]) {
        const rows=result.classroom.filter(r=>r.variant===variant && r.cpuRate===cpuRate);
        result.summary.classroom.push({variant,cpuRate,firstInfoMs:summarize(rows,'firstInfoMs'),interactiveMs:summarize(rows,'interactiveMs'),refreshReads:summarize(rows,'economyReadsForThreeRefreshes')});
      }
      result.summary.coordi.push({variant,readyMs:summarize(result.coordi.filter(r=>r.variant===variant),'readyMs')});
    }
    const out=process.env.LOADING_COMPARISON_OUTPUT || '/tmp/site-loading-release-20261004/comparison.json';
    fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result.summary));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
