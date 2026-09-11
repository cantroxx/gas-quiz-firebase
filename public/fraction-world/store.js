(function () {
  'use strict';
  const KEY = 'dj48.fraction-world.v1';
  const fresh = () => ({
    version: 1, settings: { level: 'all', sound: false },
    stats: Array.from({ length: 6 }, () => ({ attempts: 0, first: 0, solved: 0 })),
    total: 0, tower: null, studio: null, quiz: null, collection: [], trophies: [], records: []
  });
  const finite = (n, min = 0, max = 1e9) => Number.isFinite(n) && n >= min && n <= max;
  const count = n => Number.isInteger(n) && finite(n) ? n : 0;
  const known = (list, id) => list.some(item => item.id === id);
  let warning = '', active = 0, data;

  function validRun(s, type) {
    if (!s || s.version !== 1 || !['hard', 'expert'].includes(s.difficulty)) return null;
    if (type === 'tower') {
      if (!finite(s.hp, 0, 200) || !Number.isInteger(s.room) || !finite(s.room, 1, 24) ||
          !known(FWContent.weapons, s.weapon) || !Array.isArray(s.relics) || s.relics.length > 8 ||
          !s.relics.every(id => known(FWContent.relics, id)) || new Set(s.relics).size !== s.relics.length ||
          !Array.isArray(s.offers) || !s.offers.every(id => known(FWContent.relics, id)) ||
          !['route', 'charge', 'combat', 'reward', 'ended'].includes(s.phase) ||
          !finite(s.crystals) || !finite(s.kills) || !finite(s.best, 0, 24)) return null;
      if (s.combat) {
        const b = s.combat;
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
    p.settings = { level: ['all', 'basic', 'mixed'].includes(raw?.settings?.level) ? raw.settings.level : 'all', sound: raw?.settings?.sound === true };
    p.stats = Array.from({ length: 6 }, (_, i) => {
      const s = raw?.stats?.[i]; const attempts = count(s?.attempts);
      return { attempts, first: Math.min(attempts, count(s?.first)), solved: count(s?.solved) };
    });
    p.total = p.stats.reduce((sum, s) => sum + s.solved, 0);
    p.collection = [...new Set((Array.isArray(p.collection) ? p.collection : []).filter(id => known(FWContent.relics, id)))];
    p.trophies = [...new Set((Array.isArray(p.trophies) ? p.trophies : []).filter(id => ['tower', 'studio'].includes(id)))];
    p.records = (Array.isArray(p.records) ? p.records : []).filter(r => r && ['tower', 'studio'].includes(r.mode) && typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(r.date)).slice(0, 40);
    p.tower = validRun(p.tower, 'tower'); p.studio = validRun(p.studio, 'studio');
    if ((raw?.tower && !p.tower) || (raw?.studio && !p.studio)) warning = '일부 진행 기록을 읽지 못했어요. 읽을 수 있는 학습 기록과 다른 저장 칸은 유지했어요.';
    const q = p.quiz;
    if (q) {
      const valid = ['practice', 'tower-entry', 'tower-reward', 'studio-day', 'studio-concert'].includes(q.mode) &&
        Number.isInteger(q.count) && finite(q.count, 1, 10) && Number.isInteger(q.index) && finite(q.index, 0, q.count) &&
        typeof q.title === 'string' && finite(q.tries) && (!q.question ||
          (Number.isInteger(q.question.kind) && finite(q.question.kind, 0, 5) && Number.isInteger(q.question.d) && finite(q.question.d, 3, 12) &&
          finite(q.question.a) && finite(q.question.b) && ['+', '−'].includes(q.question.op) &&
          q.question.n === (q.question.op === '+' ? q.question.a + q.question.b : q.question.a - q.question.b)));
      if (!valid) p.quiz = null;
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
    try {
      data.active = active; localStorage.setItem(KEY, JSON.stringify(data)); warning = ''; return true;
    } catch (error) {
      warning = '이 브라우저에 저장할 수 없어요. 현재 화면에서는 계속할 수 있지만 창을 닫으면 진행이 사라질 수 있어요.';
      return false;
    }
  }
  window.FWStore = {
    get: () => data.slots[active], save, slot: () => active, warning: () => warning,
    switchSlot: n => { if (Number.isInteger(n) && finite(n, 0, 2)) { active = n; save(); } },
    record: (mode, result) => {
      const p = data.slots[active]; p.records.unshift({ mode, ...result, date: new Date().toISOString() });
      p.records = p.records.slice(0, 40); save();
    }
  };
})();
