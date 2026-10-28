(function () {
  'use strict';
  const load=document.getElementById('growth-season-load'),roll=document.getElementById('growth-season-reroll'),output=document.getElementById('growth-season-preview');
  const labels={practice:'연습전 새 정답',ranking:'랭킹전 정상 완료',study:'스터디 타운 정답',survivor:'퀴즈 서바이버 정답',marble:'두근두근 마블 완주',tower:'구름탑 문장',bomb:'말폭탄 낱말'};
  let plan=null;
  async function run(action){
    load.disabled=roll.disabled=true;
    try {
      const result=await firebase.app().functions('asia-northeast3').httpsCallable('adminGrowthSeasonPlan')({action,month:plan?.month,revision:plan?.revision});
      plan=result.data.plan;output.replaceChildren();
      for(const [label,value] of [['이번 달 적용 중',result.data.currentPlan],['다음 달 예정 · 리롤 대상',plan]]){
        if(!value)continue;
        const title=document.createElement('strong');title.textContent=label+' · '+value.month+' · 리롤 '+value.revision+'회';output.append(title);
        const list=document.createElement('ul');for(const [id,target]of Object.entries(value.targets)){const row=document.createElement('li');row.textContent=labels[id]+' '+target+'회 · XP 50 / DJ코인 40';list.append(row);}output.append(list);
      }

    }catch(error){plan=null;output.textContent=error.message||'구성을 불러오지 못했어요.';}
    finally{load.disabled=false;roll.disabled=!plan;}
  }
  load.addEventListener('click',()=>run('preview'));roll.addEventListener('click',()=>run('reroll'));
})();
