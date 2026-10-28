/* Cloud Tower server-confirmed leaderboard within the existing online battle board. */
(function(){
  'use strict';
  const VERSION='cloud-120-v1',SUB='cloud-tower-rank';
  let rows=null,loading=false,generation=0;
  function render(message){
    const root=document.getElementById('cloud-tower-ranking-root');if(!root)return;root.replaceChildren();
    if(message||!rows?.length){const p=document.createElement('p');p.className='wb-rank-empty';p.textContent=message||'아직 구름탑 공용 기록이 없어요. 첫 하늘섬 도전에 나서 보세요!';root.append(p);return;}
    rows.forEach((row,index)=>{const item=document.createElement('div');item.className='wb-rank-row'+(index<3?' top':'');for(const [cls,text] of [['wb-rank-pos',(index+1)+'위'],['wb-rank-name',row.nickname||'탐험가'],['wb-rank-meta',`${row.floor}층 · 정확도 ${row.accuracy}%`],['wb-rank-total',`${row.score}점`]]){const span=document.createElement('span');span.className=cls;span.textContent=text;item.append(span);}root.append(item);});
  }
  async function load(){
    if (window.DJ48RankingVisibility && !window.DJ48RankingVisibility.isVisible('cloud-tower-ranking-root')) return;
    if(loading)return;const user=window.firebase?.auth?.().currentUser;
    if(!user){rows=null;render('로그인 후 구름탑 공용 랭킹을 볼 수 있어요.');return;}
    loading=true;const stamp=++generation;render('공용 기록을 불러오는 중…');
    try{const snap=await window.firebase.firestore().collection('cloudTowerRanking').doc(VERSION).collection('entries').orderBy('sortKey','desc').limit(50).get();if(stamp!==generation)return;rows=snap.docs.map(doc=>doc.data());render();}
    catch(_){if(stamp===generation)render('공용 기록을 불러오지 못했어요. 퀴즈타운 로그인과 서버 연결을 확인해 주세요.');}
    finally{if(stamp===generation)loading=false;}
  }
  function inject(){
    const panel=document.querySelector('[data-ranking-board-panel="wordbattle"]'),tabs=panel?.querySelector('.ranking-sub-tabs');
    if(!tabs||tabs.querySelector(`[data-ranking-sub-group-id="${SUB}"]`))return;
    const button=document.createElement('button');button.type='button';button.className='ranking-sub-tab';button.dataset.rankingSubGroupId=SUB;button.dataset.rankingParentBoardId='wordbattle';button.textContent='구름탑';tabs.append(button);
    const sub=document.createElement('div');sub.className='ranking-sub-panel';sub.dataset.rankingSubPanel=SUB;sub.hidden=true;
    const intro=document.createElement('p');intro.textContent='구름탑 챌린지·실시간 레이스의 서버 확인 최고 기록입니다. 점수 → 정확도 → 짧은 시간순입니다.';
    const link=document.createElement('a');link.href='/cloud-tower/';link.textContent='☁ 구름탑 도전하기';
    const refresh=document.createElement('button');refresh.type='button';refresh.className='ranking-sub-tab';refresh.textContent='새로고침';refresh.addEventListener('click',load);
    const list=document.createElement('div');list.id='cloud-tower-ranking-root';list.className='wb-rank-root';sub.append(intro,link,refresh,list);panel.append(sub);
    const head=panel.querySelector('.ranking-board-header p');if(head)head.textContent='퀴즈타운 온라인 게임의 공용 랭킹입니다.';
    if(rows)render();else load();
  }
  function init(){
    const root=document.getElementById('ranking-board-root');if(!root||!window.firebase?.auth){setTimeout(init,700);return;}
    window.DJ48RankingVisibility?.register('cloud-tower-ranking-root', load);
    inject();new MutationObserver(inject).observe(root,{childList:true,subtree:true});
    root.addEventListener('click',event=>{if(event.target.closest(`[data-ranking-sub-group-id="${SUB}"]`))load();});
    window.firebase.auth().onAuthStateChanged(()=>{generation++;loading=false;rows=null;load();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
