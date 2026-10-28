(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  // Same-origin popups use the town's already initialized auth/Firestore connection.
  let backend=window.firebase, town=null;
  try { if(parent!==window && parent.location.origin===location.origin && parent.firebase?.apps?.length) { backend=parent.firebase;town=parent; } } catch (_) {}
  function bounded(promise,ms=12000) {
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('timeout')),ms);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
  }
  function currentRequest(request,current){return request===epoch && current.uid===user?.uid;}

  // A cached pre-journal HTML document may load a newer script after deployment.
  // Upgrade that DOM before any auth callback clears or renders its sections.
  if(!byId('quest-fold') && byId('quest-section')) {
    const fold=document.createElement('details');fold.id='quest-fold';fold.dataset.toggle='quest-overview';
    const summary=document.createElement('summary');summary.textContent='퀘스트 ';
    const count=document.createElement('span');count.id='quest-count';summary.append(count);fold.append(summary);
    byId('quest-section').before(fold);fold.append(byId('quest-section'));
  }
  let epoch = 0, user = null, refreshing = false, scopeFilter='all';
  const expanded=new Map();
  const questView=new URLSearchParams(location.search).get('view')==='quests';
  if(questView){document.querySelector('h1').textContent='나의 퀘스트';byId('earnings').before(byId('quest-fold'));byId('quest-fold').open=true;}
  function applyFilter(){document.querySelectorAll('#quests [data-scope]').forEach(n=>n.hidden=scopeFilter!=='all'&&n.dataset.scope!==scopeFilter);document.querySelectorAll('#quest-filters button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scope===scopeFilter)));}
  byId('quest-filters').addEventListener('click',e=>{const b=e.target.closest('[data-scope]');if(b){scopeFilter=b.dataset.scope;document.querySelectorAll('#quests details[data-scope]').forEach(n=>{if(scopeFilter!=='all'&&n.dataset.scope===scopeFilter)n.open=true;});applyFilter();}});
  const text = (tag, value) => { const n = document.createElement(tag); n.textContent = value; return n; };
  const number = value => Math.max(0, Number(value) || 0);
  function remember(){document.querySelectorAll('details[data-toggle]').forEach(n=>expanded.set(n.dataset.toggle,n.open));}
  function fold(key,label,open=false){const d=document.createElement('details');d.dataset.toggle=key;d.open=expanded.has(key)?expanded.get(key):open;d.append(text('summary',label));return d;}
  function clear() { for (const id of ['profile', 'earnings', 'quests','reward-summary','quest-count']) byId(id)?.replaceChildren(); }
  function meter(parent, label, value, max) {
    parent.append(text('p', label)); const p = document.createElement('progress'); p.max = Math.max(1, number(max)); p.value = Math.min(number(value), p.max); p.setAttribute('aria-label', label); parent.append(p);
  }
  async function refresh(quiet=false) {
    remember();const request = ++epoch; refreshing=true;if(!quiet)clear();
    if (!user) { byId('notice').textContent = '퀴즈타운에 로그인하면 내 기록을 볼 수 있어요.'; byId('refresh').disabled = false; refreshing=false; return; }
    const current = user; byId('refresh').disabled = true; byId('notice').textContent = '최신 기록을 가져오고 있어요…';
    try {
      const db = town?.DJ48Firebase?.getFirestoreDb?.() || backend.firestore();
      if(!town) {try{db.settings({experimentalAutoDetectLongPolling:true,useFetchStreams:false,merge:true});}catch(_){} }
      const memberId=town?.DJ48AccountState?.getCurrentMemberUserId?.();
      let member;
      if(memberId) {
        member=await bounded(db.collection('users').doc(memberId).get());
        if(!member.exists || member.data()?.authUid!==current.uid)throw Error('member');
      } else {
        const members=await bounded(db.collection('users').where('authUid','==',current.uid).limit(2).get());
        if(members.size!==1)throw Error('member');member=members.docs[0];
      }
      if (!currentRequest(request,current)) return;
      const data = member.data();
      const call = name => backend.app().functions('asia-northeast3').httpsCallable(name)({ memberUserId: member.id }).then(r => r.data);
      const core=Promise.allSettled([bounded(db.collection('userEconomy').doc(member.id).get()),bounded(db.collection('userLevelSummary').doc(member.id).get())]);
      const extra=Promise.allSettled([bounded(call('getDailyRewardStatus')),bounded(call('getEventProgress'))]);
      clear();
      const profile = byId('profile');
      const identity=text('div','');identity.className='profile-identity';
      const portrait=text('div',data.avatar||'🙂');portrait.className='profile-portrait';
      const imageUrl=String(data.profileImageUrl||'').trim();
      if(imageUrl && /^(https?:\/\/|\/(?!\/))/.test(imageUrl)){
        const img=document.createElement('img');img.alt='내 프로필 사진';img.referrerPolicy='no-referrer';
        const clamp=(v,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):fallback));
        img.style.transform=`translate(${clamp(data.profileImageOffsetX,-45,45,0)}%,${clamp(data.profileImageOffsetY,-45,45,0)}%) scale(${clamp(data.profileImageScale||1,.7,2.2,1)})`;
        img.onerror=()=>{portrait.textContent=data.avatar||'🙂';};img.src=imageUrl;portrait.replaceChildren(img);
      }
      const name=text('div','');name.append(text('h2',data.nickname||data.displayNickname||'나의 기록'),text('p',data.rankingMessage||''));
      identity.append(portrait,name);profile.append(identity);
      const loading=text('p','코인과 레벨을 확인하고 있어요…');loading.dataset.loading='core';profile.append(loading);
      byId('earnings').append(text('p','획득 현황을 확인하고 있어요…'));
      byId('quest-count').textContent='확인 중';
      const [money,level]=await core;
      if(!currentRequest(request,current))return;
      loading.remove();


      if (money.status === 'fulfilled') {const balance=text('p', `보유 DJ코인 ${number(money.value.data()?.djCoin ?? money.value.data()?.coin).toLocaleString()}`);balance.className='profile-balance';profile.append(balance);}
      else profile.append(text('p', '보유 코인을 불러오지 못했어요.'));
      if (level.status === 'fulfilled') {
        const v = level.value.data() || {}; const asset=window.DJ48LevelMedalAssets?.getLevelMedalAsset(v.level);if(asset){const medal=document.createElement('img');medal.className='profile-medal';medal.src=asset.path;medal.alt=asset.name;medal.onerror=()=>medal.remove();profile.append(medal);}profile.append(text('strong', `Lv.${number(v.level) || 1}`));const extra=fold('profile','내 프로필 자세히');extra.append(text('p','누적 XP '+number(v.totalXp)));if(data.titleName)extra.append(text('p','선택 타이틀: '+data.titleName));profile.append(extra);
        if (number(v.level) >= 50) profile.append(text('p', '최고 레벨에 도달했어요.'));
        else meter(profile, `레벨 진행 ${number(v.xp)} / ${number(v.nextLevelXp) || 50} XP`, v.xp, number(v.nextLevelXp) || 50);
      } else profile.append(text('p', '경험치를 불러오지 못했어요.'));
      byId('notice').textContent='기본 정보를 표시했어요. 퀘스트와 획득 현황을 확인하고 있어요…';
      const [daily,quests]=await extra;
      if(!currentRequest(request,current))return;
      byId('earnings').replaceChildren();
      const results=[money,level,daily,quests];
      const earnings = fold('earnings','획득 현황 · 코인·경험치 한도');byId('earnings').append(earnings);
      if (daily.status === 'fulfilled') {
        const v = daily.value;
        for (const [key, label] of [['coin', '오늘 연습 정답 코인'], ['weeklyXp', '이번 주 한도 적용 XP']]) if(v[key]) meter(earnings, `${label} ${number(v[key].used)} / ${number(v[key].limit)}`, v[key].used, v[key].limit);
        earnings.append(text('small', '정답 코인 한도에는 타이틀·레벨업·퀘스트 코인이 포함되지 않아요. 주간 XP 한도에는 타이틀 XP가 포함되지 않아요.'));
      } else earnings.append(text('p', '획득 현황을 불러오지 못했어요.'));
      const list = byId('quests');
      if (quests.status === 'fulfilled') {
        const summary=quests.value;
        list.append(text('p','보상 수령 · 오늘 '+number(summary.dailyClaimed)+'/5 · 이번 주 '+number(summary.weeklyClaimed)+'/5 (기본 3개 + 추가 2개)'));
        list.append(text('p','오늘 퀘스트로 얻은 XP '+number(summary.todayQuestXp)+' · DJ코인 '+number(summary.todayQuestCoin)+' (연계 레벨업 코인 포함)'));
        // The simplified town presents daily/weekly quests only; server history is retained.
        const rows = (summary.quests||[]).filter(q=>['daily','weekly'].includes(q.scope));
        const available=['daily','weekly'].flatMap(scope=>rows.filter(q=>q.scope===scope&&q.claimable).slice(0,Math.max(0,3-number(scope==='daily'?summary.dailyClaimed:summary.weeklyClaimed))));
        const baseCoin=available.reduce((sum,q)=>sum+number(q.rewardCoin),0),baseXp=available.reduce((sum,q)=>sum+number(q.xpReward),0);
        byId('quest-count').textContent=available.length ? '받을 보상 '+available.length+'개' : '진행 보기';
        const rewardSummary=byId('reward-summary');rewardSummary.append(text('strong','지금 수령 가능한 기본 보상 · DJ코인 '+baseCoin+' / XP '+baseXp));
        rewardSummary.append(text('p','완료한 퀘스트 '+available.length+'개 · 실제 XP는 주간 잔여 한도와 최고 레벨에 따라 달라져요. 레벨업 코인은 별도예요.'));
        if(daily.status==='fulfilled'&&daily.value.weeklyXp)rewardSummary.append(text('small','이번 주 XP 잔여 한도 '+Math.max(0,number(daily.value.weeklyXp.limit)-number(daily.value.weeklyXp.used))));
        if (!rows.length) list.append(text('p', '오늘 표시할 퀘스트가 없어요.'));
        let scope='',group; 
        for (const q of [...rows].sort((a,b)=>['daily','weekly','season'].indexOf(a.scope)-['daily','weekly','season'].indexOf(b.scope))) {
          if(scope!==(q.eventKey||(q.legacy?'legacy':q.scope))){scope=q.eventKey||(q.legacy?'legacy':q.scope);const scoped=rows.filter(r=>(r.eventKey||(r.legacy?'legacy':r.scope))===scope);group=fold('quests-'+scope,(q.legacy?'이전 월간 · '+(summary.legacySeasonKey||''):q.eventTitle|| (q.scope==='season'?'시즌 달성 조건':q.scope==='weekly'?'이번 주 퀘스트':'오늘의 퀘스트'))+' · 수령 가능 '+scoped.filter(r=>r.claimable).length+' / 완료 '+scoped.filter(r=>r.claimed).length+' / 전체 '+scoped.length,q.scope==='daily'||(!q.legacy&&scoped.some(r=>r.claimable)));group.dataset.scope=q.scope;list.append(group);}
          const card=document.createElement('article');card.dataset.scope=q.scope;card.className=q.claimed?'quest-claimed':q.claimable?'quest-ready':'quest-progress';
          const headline=text('div','');headline.className='quest-headline';headline.append(text('strong',q.title),text('span',q.claimed?'수령 완료':q.claimable?'보상 받기 가능':'진행 중'));card.append(headline);
          meter(card,q.progress||number(q.current)+' / '+number(q.target),q.current,q.target);
          card.append(text('p',q.reward||'XP +'+number(q.xpReward)+' · DJ코인 +'+number(q.rewardCoin)));
          const detail=fold('quest-'+q.questId,'조건·보상 안내');detail.append(text('p',q.status|| (q.claimed?'수령 완료':'진행 중')),text('small','서버에 기록된 정상 플레이만 집계돼요. '+(q.scope==='season'?'해당 시즌 조건별 1회 수령할 수 있어요.':q.scope==='daily'?'일일 5종을 모두 받을 수 있어요.':'주간 기본 3개와 추가 조건 2개의 보상을 받을 수 있어요.')));card.append(detail);
          if(q.claimable){const button=text('button','보상 받기');button.type='button';button.addEventListener('click',async()=>{
            button.disabled=true;refreshing=true;try{await backend.app().functions('asia-northeast3').httpsCallable('claimEventQuestReward')({memberUserId:member.id,questId:q.questId});if(request===epoch)await refresh();}
            catch(error){if(request===epoch){byId('notice').textContent=error.message||'수령 결과를 확인하지 못했어요. 새로고침해 주세요.';button.disabled=false;refreshing=false;}}
          });card.append(button);}group.append(card);
        }
      } else list.append(text('p', '퀘스트를 불러오지 못했어요. 이벤트 광장 운영 설정 또는 연결을 확인해 주세요.'));
      applyFilter();
      byId('notice').textContent = results.some(r => r.status === 'rejected') ? '일부 기록을 가져오지 못했어요. 새로고침으로 다시 확인해 주세요.' : `확인 시각 ${new Date().toLocaleTimeString('ko-KR')}`;
    } catch (error) { if (request === epoch) byId('notice').textContent = error.message === 'member' ? '연결된 회원을 확인하지 못했어요. 퀴즈타운에서 로그인해 주세요.' : error.message === 'timeout' ? '연결이 지연되고 있어요. 새로고침을 눌러 다시 확인해 주세요.' : '기록을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.'; }
    finally { if(request === epoch){byId('refresh').disabled = false;refreshing=false;} }
  }
  byId('refresh').addEventListener('click', ()=>refresh());
  if (!backend?.apps?.length) { byId('notice').textContent = '퀴즈타운 서버에 연결하지 못했어요. 운영 사이트에서 다시 열어 주세요.'; byId('refresh').disabled = true; return; }
  setInterval(()=>{if(user&&!refreshing&&document.visibilityState==='visible')refresh(true);},30000);
  const unsubscribe=backend.auth().onAuthStateChanged(next => { if(user?.uid!==next?.uid){expanded.clear();clear();}user = next; refresh(); },()=>{clear();byId('notice').textContent='로그인 상태를 확인하지 못했어요. 퀴즈타운에서 다시 로그인해 주세요.';});
  window.addEventListener('pagehide',()=>{epoch++;unsubscribe?.();},{once:true});
})();
