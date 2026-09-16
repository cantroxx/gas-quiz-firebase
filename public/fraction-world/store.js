(function () {
  'use strict';
  const KEY = 'dj48.study-town.v1', LEGACY_KEY = 'dj48.fraction-world.v1';
  const fresh = () => ({
    version: 1, settings: { level: 'all', sound: false, music: true, musicVolume: 30, effectsVolume: 65, studyUnits:['fraction'] },
    studyStats:{}, studyAnswers:[],
    stats: Array.from({ length: 6 }, () => ({ attempts: 0, first: 0, solved: 0 })),
    total: 0, tower: null, studio: null, quiz: null, collection: [], trophies: [], records: []
  });
  const finite = (n, min = 0, max = 1e9) => Number.isFinite(n) && n >= min && n <= max;
  const count = n => Number.isInteger(n) && finite(n) ? n : 0;
  const known = (list, id) => list.some(item => item.id === id);
  let warning = '', active = 0, data, preview = null, resetNotice = false;

  function validRun(s, type) {
    if (!s || s.version !== 1 || !['hard', 'expert'].includes(s.difficulty)) return null;
    if (type === 'tower') {
      if (!finite(s.hp, 0, 500) || !Number.isInteger(s.room) || !finite(s.room, 1, s.expedition==='long'?32:24) ||
          !known(FWContent.weapons, s.weapon) || !Array.isArray(s.relics) || s.relics.length > 8 ||
          !s.relics.every(id => known(FWContent.relics, id)) || new Set(s.relics).size !== s.relics.length ||
          !Array.isArray(s.offers) || !s.offers.every(id => known(FWContent.relics, id)) ||
          !['route', 'charge', 'combat', 'reward', 'room', 'ended'].includes(s.phase) ||
          !finite(s.crystals) || !finite(s.kills) || !finite(s.best, 0, 32)) return null;
      if(s.expedition&&(!window.FWExpedition||!FWExpedition.valid(s)))return null;if(!s.expedition&&s.phase==='room')return null;
      s.upgrades=Object.fromEntries(Object.entries(s.upgrades&&typeof s.upgrades==='object'?s.upgrades:{}).filter(([id,n])=>known(FWContent.relics,id)&&Number.isInteger(n)&&n>=0&&n<=3));
      if (s.combat) {
        const b = s.combat;
        b.pending=Array.isArray(b.pending)?b.pending.filter(f=>f&&f.kind==='meteor'&&finite(f.x,0,960)&&finite(f.y,0,600)&&finite(f.delay,0,1)&&finite(f.damage,0,10000)&&finite(f.radius,0,300)):[];
        if (!b.p || !['x', 'y', 'inv', 'dash', 'skill', 'burst', 'dx', 'dy'].every(k => finite(b.p[k], -1000, 10000)) ||
            !['enemies', 'bullets', 'shots'].every(k => Array.isArray(b[k]) && b[k].length < 1000 && b[k].every(o => o && finite(o.x, -2000, 3000) && finite(o.y, -2000, 3000))) ||
            !finite(b.time) || !finite(b.spawned)) return null;
      }
      return s;
    }
    if (!Number.isInteger(s.day) || !finite(s.day, 1, 28) || !Array.isArray(s.members) || s.members.length !== 3 ||
        !s.members.every(m => known(FWContent.members, m.id) && ['energy', 'vocal', 'dance', 'charm'].every(k => finite(m[k], 0, 100))) ||
        new Set(s.members.map(m => m.id)).size !== 3 || !finite(s.cash) || !finite(s.fans) || !finite(s.team, 0, 100) ||
        !known(FWContent.songs, s.song) || !known(FWContent.outfits, s.outfit) ||
        !Array.isArray(s.owned) || !s.owned.every(id => known(FWContent.outfits, id)) ||
        !s.masteries || !Object.values(s.masteries).every(v => finite(v, 0, 100)) ||
        !s.facilities || !Object.values(s.facilities).every(v => Number.isInteger(v) && finite(v, 0, 3)) ||
        !Array.isArray(s.history) || !s.history.every(h => Array.isArray(h.checks)) ||
        !Array.isArray(s.plan) || !s.plan.every(id => id === '' || known(FWContent.activities, id)) ||
        !['plan', 'charge', 'event', 'concert', 'summary', 'ended'].includes(s.phase)) return null;
    if (s.phase === 'charge' && (s.plan.length !== 3 || s.plan.some(id => !id))) return null;
    if (['event', 'concert', 'summary'].includes(s.phase) && (!s.last || !Array.isArray(s.last.notes))) return null;
    if (s.phase === 'event' && !FWContent.events[s.event]) return null;
    return s;
  }

  function normalize(raw) {
    const p = { ...fresh(), ...raw };
    p.settings = { level: ['all', 'basic', 'mixed'].includes(raw?.settings?.level) ? raw.settings.level : 'all', sound: raw?.settings?.sound === true, music: raw?.settings?.music !== false, musicVolume: finite(raw?.settings?.musicVolume,0,100)?raw.settings.musicVolume:30, effectsVolume: finite(raw?.settings?.effectsVolume,0,100)?raw.settings.effectsVolume:65 };
    p.settings.studyUnits=Array.from(new Set((Array.isArray(raw?.settings?.studyUnits)?raw.settings.studyUnits:['fraction']).filter(id=>['fraction','triangle','decimal','quadrilateral','graph','polygon'].includes(id))));if(!p.settings.studyUnits.length)p.settings.studyUnits=['fraction'];
    p.studyStats=Object.fromEntries(Object.entries(raw?.studyStats&&typeof raw.studyStats==='object'?raw.studyStats:{}).filter(([id])=>window.FWStudy?.templates.some(t=>t.id===id)).map(([id,s])=>[id,{attempts:count(s?.attempts),correct:Math.min(count(s?.attempts),count(s?.correct)),submitted:count(s?.submitted),partsCorrect:Math.min(count(s?.partsTotal),count(s?.partsCorrect)),partsTotal:count(s?.partsTotal)}]));
    p.studyAnswers=(Array.isArray(raw?.studyAnswers)?raw.studyAnswers:[]).filter(a=>a&&window.FWStudy?.validDescriptor(a.question)&&typeof a.id==='string'&&typeof a.date==='string'&&['correct','incorrect','submitted'].includes(a.status)).slice(0,120).map(a=>({...a,teacherReview:a.teacherReview&&Array.isArray(a.teacherReview.criteria)&&a.teacherReview.criteria.length===3&&a.teacherReview.criteria.every(n=>Number.isInteger(n)&&n>=0&&n<=2)?{date:String(a.teacherReview.date||'').slice(0,30),criteria:a.teacherReview.criteria,feedback:String(a.teacherReview.feedback||'').slice(0,300)}:undefined,answer:typeof a.answer==='string'?a.answer.slice(0,600):a.answer&&typeof a.answer==='object'?a.answer:{},selfCheck:Array.isArray(a.selfCheck)?a.selfCheck.slice(0,3).map(x=>x===true):[]}));
    p.stats = Array.from({ length: 6 }, (_, i) => {
      const s = raw?.stats?.[i]; const attempts = count(s?.attempts);
      return { attempts, first: Math.min(attempts, count(s?.first)), solved: count(s?.solved) };
    });
    p.total = p.stats.reduce((sum, s) => sum + s.solved, 0)+Object.values(p.studyStats).reduce((sum,s)=>sum+s.correct,0);
    p.collection = [...new Set((Array.isArray(p.collection) ? p.collection : []).filter(id => known(FWContent.relics, id)))];
    p.trophies = [...new Set((Array.isArray(p.trophies) ? p.trophies : []).filter(id => ['tower', 'studio'].includes(id)))];
    p.records = (Array.isArray(p.records) ? p.records : []).filter(r => r && ['tower', 'studio'].includes(r.mode) && typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(r.date)).slice(0, 40);
    p.unlocks=[...new Set((Array.isArray(p.unlocks)?p.unlocks:[]).filter(id=>FWContent.unlockNames[id]))];
    p.tower = validRun(p.tower, 'tower'); p.studio = validRun(p.studio, 'studio');
    if ((raw?.tower && !p.tower) || (raw?.studio && !p.studio)) warning = '일부 진행 기록을 읽지 못했어요. 읽을 수 있는 학습 기록과 다른 저장 칸은 유지했어요.';
    const q = p.quiz;
    if(q?.engine===2){
      const valid=window.FWStudy&&['practice','tower-entry','tower-reward','study-writing'].includes(q.mode)&&Number.isInteger(q.count)&&finite(q.count,1,10)&&Number.isInteger(q.index)&&finite(q.index,0,q.count)&&finite(q.correct,0,q.count)&&finite(q.wrong,0,q.count)&&typeof q.title==='string'&&Array.isArray(q.units)&&q.units.length>0&&q.units.length<=6&&q.units.every(id=>FWStudy.units.some(u=>u.id===id))&&Array.isArray(q.recent)&&q.recent.length<=12&&(!q.reviewQueue||Array.isArray(q.reviewQueue)&&q.reviewQueue.length<=10&&q.reviewQueue.every(d=>FWStudy.validDescriptor(d)))&&q.answers&&typeof q.answers==='object'&&!Array.isArray(q.answers)&&(!q.question||FWStudy.validDescriptor(q.question))&&(!q.review||q.question&&['correct','incorrect','submitted'].includes(q.review.status)&&Array.isArray(q.review.parts));
      if(!valid)p.quiz=null;
    }else if (q) {
      const valid = ['practice', 'tower-entry', 'tower-reward', 'studio-day', 'studio-concert'].includes(q.mode) &&
        Number.isInteger(q.count) && finite(q.count, 1, 10) && Number.isInteger(q.index) && finite(q.index, 0, q.count) &&
        typeof q.title === 'string' && finite(q.tries) && (!q.question ||
          (Number.isInteger(q.question.kind) && finite(q.question.kind, 0, 5) && Number.isInteger(q.question.d) && finite(q.question.d, 3, 12) &&
          finite(q.question.a) && finite(q.question.b) && ['+', '−'].includes(q.question.op) &&
          q.question.n === (q.question.op === '+' ? q.question.a + q.question.b : q.question.a - q.question.b)));
      if (!valid || (q.single&&(!['tower-entry','tower-reward'].includes(q.mode)||!p.tower?.expedition||!finite(q.correct||0,0,q.count)||!finite(q.wrong||0,0,q.count))) || (q.review&&(!q.question||typeof q.review.correct!=='boolean'))) p.quiz = null;
    }
    return p;
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (parsed?.version === 1 && Array.isArray(parsed.slots) && parsed.slots.length === 3) {
      data = parsed;
      active = Number.isInteger(parsed.active) && finite(parsed.active, 0, 2) ? parsed.active : 0;
      data.slots = data.slots.map(normalize);
    } else data = { version: 1, active: 0, slots: [fresh(), fresh(), fresh()] };
  } catch (error) {
    data = { version: 1, active: 0, slots: [fresh(), fresh(), fresh()] };
    warning = '저장 기록을 읽지 못했어요. 기존 저장값은 다음 저장 전까지 유지돼요.';
  }
  function save() {
    if (preview) return true;
    try {
      data.active = active; localStorage.setItem(KEY, JSON.stringify(data)); warning = ''; return true;
    } catch (error) {
      warning = '이 브라우저에 저장할 수 없어요. 현재 화면에서는 계속할 수 있지만 창을 닫으면 진행이 사라질 수 있어요.';
      return false;
    }
  }
  // Replace one active slot only; failed writes leave its in-memory progress intact.
  function replaceSlot(n, next) {
    if (preview || n !== active || !Number.isInteger(n) || n < 0 || n > 2) return false;
    const previous = data.slots[n]; data.slots[n] = next;
    if (save()) return true;
    data.slots[n] = previous; return false;
  }
  function discardTower(n) {
    if (n !== active) return false;
    const p = data.slots[n];
    return replaceSlot(n, { ...p, tower: null, quiz: p.quiz?.mode?.startsWith('tower-') ? null : p.quiz });
  }
  // A separate save namespace prevents old open tabs from restoring pre-reset progress.
  try {
    if (localStorage.getItem(LEGACY_KEY) !== null) {
      if (save()) { localStorage.removeItem(LEGACY_KEY); resetNotice = true; }
    }
  } catch (_) { warning = '새 기록은 준비했지만 이전 기록 정리가 끝나지 않았어요. 다시 접속해 주세요.'; }
  window.FWStore = {
    resetNotice: () => resetNotice, isPreview: () => !!preview,
    beginPreview: tower => { preview = fresh(); preview.tower = tower; preview.unlocks = Object.keys(FWContent.unlockNames); },
    endPreview: () => { preview = null; },
    get: () => preview || data.slots[active], resetSlot: n => replaceSlot(n, fresh()), discardTower, save, slot: () => active, warning: () => warning,
    switchSlot: n => { if (!preview && Number.isInteger(n) && finite(n, 0, 2)) { active = n; save(); } },
    record: (mode, result) => {
      const p = preview || data.slots[active]; p.records.unshift({ mode, ...result, date: new Date().toISOString() });
      p.records = p.records.slice(0, 40); save();
    }
  };
})();
