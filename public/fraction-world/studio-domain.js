(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./content.js'):root.FWContent;
  const clamp=(v,min=0,max=100)=>Math.min(max,Math.max(min,v));
  function create(ids,difficulty='hard'){
    if(ids.length!==3||new Set(ids).size!==3||ids.some(id=>!C.members.some(m=>m.id===id)))throw new Error('멤버 세 명을 골라 주세요.');
    return {version:1,day:1,difficulty,phase:'plan',members:ids.map(id=>({...C.members.find(m=>m.id===id),energy:86})),cash:150,fans:0,team:20,song:'first',masteries:{first:10},outfit:'basic',owned:['basic'],facilities:{},history:[],event:null,plan:[],last:null,cleared:false};
  }
  function growth(m){const xp=Number.isFinite(m.xp)?Math.max(0,m.xp):0;const level=Math.min(10,1+Math.floor(xp/45));return {xp,level,progress:level===10?45:xp%45,title:level>=8?'헤드라이너':level>=5?'라이징 스타':level>=3?'무대 신인':'연습생'};}
  function focus(s,id){if(s.phase!=='plan'||!s.members.some(m=>m.id===id))return false;s.focus=id;return true;}
  function rhythmGrade(error){return Math.abs(error)<=.09?100:Math.abs(error)<=.18?70:Math.abs(error)<=.27?35:0;}
  function average(s,key){return s.members.reduce((n,m)=>n+m[key],0)/s.members.length;}
  function upcoming(s){return C.concerts.find(c=>c.day>=s.day)||C.concerts[3];}
  function requirements(s,c=upcoming(s)){
    const k=s.difficulty==='expert'?1.12:1;
    return {...c,score:Math.ceil(c.score*k),team:Math.ceil(c.team*k),fans:Math.ceil(c.fans*k)};
  }
  function forecast(s,c=upcoming(s)){
    const song=C.songs.find(x=>x.id===s.song),outfit=C.outfits.find(x=>x.id===s.outfit);
    const skill=average(s,'vocal')*song.vocal+average(s,'dance')*song.dance+average(s,'charm')*song.charm;
    const mastery=s.masteries[s.song]||0;
    const concept=c.concept==='자유'||song.concept===c.concept;
    const costume=outfit.concept==='자유'||outfit.concept===song.concept;
    const score=Math.round(skill*.65+mastery*.18+s.team*.12+(s.facilities.stage||0)*2+(costume?outfit.bonus:0)+(concept?4:-4)+Math.min(5,(song.tier-1)*2));
    const req=requirements(s,c),energy=Math.floor(average(s,'energy'));
    const checks=[['무대 점수',score,req.score],['팀워크',Math.floor(s.team),req.team],['컨디션',energy,req.energy],['팬',s.fans,req.fans]];
    return {score,energy,checks,passed:checks.every(x=>x[1]>=x[2]),concept,mastery};
  }
  function validatePlan(s,plan){
    if(s.phase!=='plan')return '지금은 일정을 실행할 수 없어요.';
    if(!Array.isArray(plan)||plan.length!==3)return '오전·오후·저녁 활동을 모두 골라 주세요.';
    let cash=s.cash;
    for(const id of plan){const a=C.activities.find(x=>x.id===id);if(!a)return '알 수 없는 활동이에요.';cash-=a.cost;if(cash<0)return '활동 순서대로 사용할 자금이 부족해요. 거리 공연이나 휴식을 넣어 보세요.';}
    return '';
  }
  function effects(s,e){
    s.cash=Math.max(0,s.cash+(e.cash||0));s.fans=Math.max(0,s.fans+(e.fans||0));s.team=clamp(s.team+(e.team||0));
    s.masteries[s.song]=clamp((s.masteries[s.song]||0)+(e.mastery||0));
    s.members.forEach(m=>{for(const key of ['vocal','dance','charm','energy'])m[key]=clamp(m[key]+(e[key]||0));});
  }
  function applyDay(s,plan){
    const error=validatePlan(s,plan);if(error)throw new Error(error);
    const notes=[],growthLog=[];
    for(const id of plan){
      const a=C.activities.find(x=>x.id===id);s.cash-=a.cost;
      let fatigued=false;
      s.members.forEach(m=>{
        const before=growth(m);m.xp=before.xp+(a.energy<0?(s.focus===m.id?9:5):2);const after=growth(m);if(after.level>before.level){growthLog.push(`${m.name} Lv.${after.level} · ${after.title}`);if([3,5,8].includes(after.level)){const key=['vocal','dance','charm'].includes(m.trait)?m.trait:'charm';m[key]=clamp(m[key]+2);growthLog.push(`${m.name} 특기 해금! ${key==='vocal'?'보컬':key==='dance'?'댄스':'표현'} +2`);}}const gain=m.energy<25?.45:m.energy<45?.75:1;if(gain<1&&a.energy<0)fatigued=true;
        for(const key of ['vocal','dance','charm']){if(a[key])m[key]=clamp(m[key]+(a[key]+(s.facilities[key]||0)+(m.trait===key?1:0))*gain);}
        m.energy=clamp(m.energy+a.energy+(id==='rest'?(s.facilities.rest||0)*4+(m.trait==='rest'?4:0):0));
      });
      s.team=clamp(s.team+(a.team||0)+(id==='team'?s.members.filter(m=>m.trait==='team').length:0));
      s.fans+=a.fans?(a.fans+(s.facilities.promo||0)*4):0;
      s.masteries[s.song]=clamp((s.masteries[s.song]||0)+(a.mastery||0));
      notes.push(a.name+(fatigued?' · 피로로 실력 성장 감소':''));
    }
    s.members.forEach(m=>{m.energy=clamp(m.energy+5);});
    s.plan=plan.slice();s.last={day:s.day,notes,growth:growthLog};
    s.phase=s.day%3===2?'event':s.day%7===0?'concert':'summary';
    if(s.phase==='event')s.event=Math.floor(s.day/3)%C.events.length;
    return s;
  }
  function chooseEvent(s,index){
    if(s.phase!=='event'||![0,1].includes(index))throw new Error('지금 선택할 이벤트가 없어요.');
    effects(s,C.events[s.event].choices[index]);s.last.notes.push(C.events[s.event].choices[index].name);s.event=null;s.phase=s.day%7===0?'concert':'summary';
  }
  function perform(s,accuracy=0){
    if(s.phase!=='concert')throw new Error('아직 공연 시간이 아니에요.');
    const c=upcoming(s),result={...forecast(s,c),day:s.day,name:c.name};
    const live=Math.max(0,Math.min(100,Number.isFinite(accuracy)?accuracy:0));result.accuracy=Math.round(live);result.liveBonus=Math.floor(live/20);result.score+=result.liveBonus;result.checks[0][1]=result.score;result.passed=result.checks.every(x=>x[1]>=x[2]);s.history.push(result);s.cash+=result.passed?c.reward:Math.floor(c.reward*.3);s.fans+=result.passed?25:8;
    s.members.forEach(m=>{m.energy=clamp(m.energy-12);});
    s.last.concert=result;s.phase='summary';return result;
  }
  function advance(s){
    if(s.phase!=='summary')throw new Error('오늘의 활동을 먼저 마쳐 주세요.');
    if(s.day===28){s.phase='ended';s.cleared=!!s.history.find(c=>c.day===28&&c.passed);}
    else{s.day++;s.phase='plan';s.plan=[];}
  }
  function buy(s,type,id){
    if(s.phase!=='plan')return false;
    if(type==='outfit'){
      const o=C.outfits.find(o=>o.id===id);if(!o)return false;
      if(!s.owned.includes(id)){if(s.cash<o.cost)return false;s.cash-=o.cost;s.owned.push(id);}s.outfit=id;return true;
    }
    const f=C.facilities.find(f=>f.id===id);if(!f)return false;const level=s.facilities[id]||0,cost=f.cost*(level+1);
    if(level>=3||s.cash<cost)return false;s.cash-=cost;s.facilities[id]=level+1;return true;
  }
  function selectSong(s,id){const song=C.songs.find(x=>x.id===id);if(s.phase!=='plan'||!song||song.tier>Math.ceil(s.day/7))return false;s.song=id;return true;}
  const api={growth,focus,rhythmGrade,create,average,upcoming,requirements,forecast,validatePlan,applyDay,chooseEvent,perform,advance,buy,selectSong};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FWStudioDomain=api;
})(typeof window!=='undefined'?window:globalThis);
