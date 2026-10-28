(function (root) {
  'use strict';
  const C = typeof module !== 'undefined' && module.exports ? require('./content.js') : root.SpaceContent;
  function fresh(mode = 'practice') { return { version:1, mode:mode === 'assessment' ? mode : 'practice', destination:'moon', mission:0, phase:0, photos:[], answers:{}, drafts:{}, finished:false, color:'#9de5d6', startedAt:new Date().toISOString() }; }
  function photoKey(target, day) { return target === 'observatory' ? `${target}:${day}` : target; }
  function ready(state, mission) { return (mission.days || [null]).every(day => state.photos.some(p => p.key === photoKey(mission.target, day))); }
  function grade() { return null; }
  function validAnswer(m, value) {
    if(m.type === 'short') return typeof value === 'string' && value.trim().length >= 5 && value.length <= 400;
    if(!Array.isArray(value) || !value.length || new Set(value).size !== value.length) return false;
    if(m.type === 'star') return value.length === 1 && C.stars.some(star => star.id === value[0]);
    if(value.some(v => !Number.isInteger(v) || v < 0 || v >= m.options.length)) return false;
    return m.type === 'order' ? value.length === m.options.length : m.type === 'choice' ? value.length === 1 : value.length <= m.options.length;
  }
  function submit(state, id, answer) {
    const m = C.missions.find(item => item.id === id);
    if(!m || state.finished || !ready(state,m)) return false;
    if(!validAnswer(m, answer)) return false;
    state.answers[id] = {value: m.type === 'short' ? answer.trim() : [...answer], correct:grade(m,answer), submittedAt:new Date().toISOString()};
    return true;
  }
  function summary(state) {
    return Object.entries(C.areas).map(([id,label]) => {
      const items=C.missions.filter(m=>m.area===id), auto=items.filter(m=>m.type!=='short');
      return {id,label,total:auto.length,correct:auto.filter(m=>state.answers[m.id] && grade(m,state.answers[m.id].value)).length,submitted:items.filter(m=>state.answers[m.id]).length,count:items.length,manual:items.filter(m=>m.type==='short' && state.answers[m.id]).length};
    });
  }
  function restore(raw) {
    let p; try { p=JSON.parse(raw); } catch (_) { return null; }
    if(!p || p.version!==1 || !['practice','assessment'].includes(p.mode)) return null;
    const s=fresh(p.mode);
    s.destination=C.bodies.some(b=>b.id===p.destination)?p.destination:'moon';
    s.mission=Number.isInteger(p.mission)?Math.max(0,Math.min(C.missions.length-1,p.mission)):0;
    s.phase=Number.isInteger(p.phase)?Math.max(0,Math.min(C.phases.length-1,p.phase)):0;
    s.color=['#9de5d6','#ffc777','#c5b5ff'].includes(p.color)?p.color:s.color;
    const allowed=new Set(C.bodies.filter(b=>b.id!=='observatory').map(b=>b.id).concat(C.phases.map(p=>photoKey('observatory',p.day))));
    s.photos=Array.isArray(p.photos)?p.photos.filter(x=>x && allowed.has(x.key) && typeof x.image==='string' && /^data:image\/png;base64,[a-z0-9+/=]+$/i.test(x.image) && x.image.length<500000).slice(0,30).map(x=>({key:x.key,image:x.image,captureVersion:[2,3].includes(x.captureVersion)?x.captureVersion:1,textureId:x.captureVersion===3 && x.textureId===x.key && C.bodies.slice(0,10).some(b=>b.id===x.textureId)?x.textureId:null,mediaId:x.captureVersion===2 && x.key.startsWith('observatory:') && x.mediaId===(x.key==='observatory:15'?'moon':'phase-'+x.key.split(':')[1])?x.mediaId:x.captureVersion===2 && x.key==='sky' && ['ursa-minor','ursa-major','cassiopeia'].includes(x.mediaId)?x.mediaId:x.captureVersion===2 && x.mediaId===x.key && C.bodies.slice(0,10).concat(C.bodies.filter(b=>b.id==='galaxy')).some(b=>b.id===x.mediaId)?x.mediaId:null})):[];
    for(const m of C.missions) {
      const a=p.answers?.[m.id];
      const valid=a && validAnswer(m,a.value);
      if(valid && ready(s,m)) s.answers[m.id]={value:a.value,correct:grade(m,a.value)};
      const d=p.drafts?.[m.id];
      if(m.type==='short' && typeof d==='string') s.drafts[m.id]=d.slice(0,400);
    }
    s.finished=p.finished===true && Object.keys(s.answers).length===C.missions.length;
    if(typeof p.startedAt==='string' && !Number.isNaN(Date.parse(p.startedAt))) s.startedAt=p.startedAt;
    return s;
  }
  const api={fresh,photoKey,ready,grade,submit,summary,restore};
  if(typeof module!=='undefined' && module.exports) module.exports=api; else root.SpaceDomain=api;
})(typeof window !== 'undefined' ? window : globalThis);
