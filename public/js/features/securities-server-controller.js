/* Server-authoritative market. Pilot scope is explicit; the server verifies membership again. */
(function(root){
 'use strict';
 if(['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).get('securitiesPreview')==='1')return;
 const R=root.DJ48SecuritiesRender;let context=null,repo=null,state=null,generation=0,refreshSequence=0,selectionSequence=0,dialog=null,returnFocus=null,memberNames={};
 const panel=()=>document.getElementById('classroom-securities-panel');
 const preview=()=>['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).get('securitiesServer')==='1';
 const enabled=()=>preview()||context?.classId==='G4-C8';
 const transport=async(method,payload)=>{try{return (await root.firebase.app().functions('asia-northeast3').httpsCallable({query:'classroomSecuritiesQuery',action:'classroomSecuritiesAction',admin:'classroomSecuritiesAdminAction'}[method])(payload)).data;}catch(e){e.code=String(e.code||'internal').replace(/^functions\//,'');throw e;}};
 const button=(label,action,extra='')=>`<button type="button" data-server-action="${action}" ${extra}>${label}</button>`;
 function closeOrder(){dialog?.close();dialog?.remove();dialog=null;if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null;}
 function reset(){generation++;refreshSequence++;selectionSequence++;closeOrder();context=null;repo=null;state=null;memberNames={};const tab=document.querySelector('[data-classroom-tab="securities"]');if(tab)tab.hidden=true;panel()?.replaceChildren();panel()?.removeAttribute('aria-busy');}
 const adminView=()=>context?.teacher&&!state?.studentPreview;
 function render(focus){
  if(!state)return;
  const view={...state,teacher:false,server:true,canManage:context.teacher,memberNames,adminView:adminView()};
  if(adminView())R.renderTeacher(view,panel());else R.render(view,panel());
  if(state.market.mode==='coin'&&!adminView()&&state.section==='account'&&state.account)panel().querySelector('#sec-transfer-slot').insertAdjacentHTML('afterbegin',`<article class="sec-card"><h3>주식을 살 코인 옮기기</h3><div class="sec-transfer-route"><div>내 지갑 <strong>${state.walletCoin}코인</strong><small>상점에서도 쓰는 DJ코인</small></div><span aria-hidden="true">↔</span><div>증권 지갑 <strong>${R.money(state.account.cashMinor)}코인</strong><small>주식을 살 때 쓰는 코인</small></div></div><p>코인 1개를 넣으면 증권 지갑에도 1.00코인이 들어가요.</p><div class="sec-row">${button('증권 지갑에 넣기','deposit',state.market.lifecycle!=='enabled'||state.market.riskHalted||state.account.status!=='active'?'disabled':'')}${button('내 지갑으로 꺼내기','withdraw',state.account.cashMinor<100||state.account.status!=='active'?'disabled':'')}</div><p>오늘 넣은 코인 ${R.money(state.dailyDepositsMinor)} / 100 · 지금 꺼낼 수 있는 코인 ${Math.floor(state.account.cashMinor/100)}개</p><details><summary>코인을 옮길 때 알아두세요</summary><p>하루에 100코인까지 넣을 수 있어요. 지금까지 넣은 코인에서 꺼낸 코인을 뺀 값은 300코인까지예요. 증권 지갑 코인과 주식의 지금 값 합계가 500코인을 넘게 넣을 수는 없어요.</p><p>코인은 1개씩 꺼낼 수 있어요. 1개보다 작은 나머지는 증권 지갑에 남아요.</p></details></article>`);
  if(repo.pending())panel().querySelector('#sec-message').insertAdjacentHTML('afterend',button('이전 요청 결과 다시 확인','retry'));
  if(!adminView()&&state.section==='news'&&state.newsCursor)panel().querySelector('#sec-content').insertAdjacentHTML('beforeend',button('뉴스 더 보기','moreNews'));
  if(!adminView()&&state.section==='journal'&&state.journalCursor)panel().querySelector('#sec-content').insertAdjacentHTML('beforeend',button('투자일지 더 보기','moreJournal'));
  if(focus)panel().querySelector(focus)?.focus();
 }
 const newsRows=rows=>rows.map(n=>({...n,publishedAt:new Date(n.publishedAt+9*3600000).toISOString().replace('Z','+09:00')}));
 async function refresh(){
  if(!repo)return;const ticket=generation,current=repo,sequence=++refreshSequence;
  if(!state)panel().innerHTML='<p role="status">증권 자료를 불러오고 있어요…</p>';
  const [m,a,n,j]=await Promise.all([current.query({action:'market'}),current.query({action:'account'}),current.query({action:'news'}),current.query({action:'journal'})]);
  if(ticket!==generation||sequence!==refreshSequence)return;
  const previous=state;
  state={...previous,market:m.market,account:a.account,walletCoin:a.walletCoin,dailyDepositsMinor:a.dailyDepositsMinor,news:newsRows(n.rows),newsCursor:n.cursor,journal:j.rows,journalCursor:j.cursor,maximumBuy:{},companies:m.companies.map(c=>({...c,history:[{date:m.market.priceDate||'',priceMinor:m.market.prices[c.id]}]})),section:previous?.section||'market',selected:previous?.selected||null,search:previous?.search||'',sort:previous?.sort||'name',message:previous?.message||'',error:false};
  if(adminView())await management();else if(state.selected)await selectCompany(state.selected,ticket);else render();
 }
 function error(e){if(!state){panel().innerHTML=`<p role="alert">${R.esc(R.friendlyText(e.message))}</p>${button('다시 시도','refresh')}`;return;}state.message=R.friendlyText(e.message);state.error=true;render();}
 async function selectCompany(id,ticket=generation){const selection=++selectionSequence;const c=await repo.query({action:'company',companyId:id});if(ticket!==generation||selection!==selectionSequence)return;state.selected=id;state.section='market';if(adminView())state.adminTab='market';const company=state.companies.find(x=>x.id===id);company.history=c.history.length?c.history:[{date:'시세 없음',priceMinor:company.initialPriceMinor}];state.maximumBuy[id]=c.maximumBuy;render('#sec-company-title');}
 async function mutate(method,payload){const ticket=generation;const result=await repo.mutate(method,payload);if(ticket!==generation)return null;await refresh();return result;}
 async function order(side,source){
  closeOrder();returnFocus=source;const ticket=generation,current=repo,id=state.selected,market=state.market;
  dialog=document.createElement('dialog');const d=dialog;d.className='sec-dialog';d.setAttribute('aria-labelledby','sec-server-order-title');
  d.innerHTML=`<h2 id="sec-server-order-title">${R.esc(state.companies.find(c=>c.id===id).name)} ${side==='buy'?'주식 사기':'주식 팔기'}</h2><p>1주 ${R.money(market.prices[id])} ${market.mode==='coin'?'DJ코인':'연습머니'} · ${market.priceDate}에 정한 값</p><form><label>몇 주를 ${side==='buy'?'살까요':'팔까요'}?<input name="quantity" type="number" min="1" max="${market.limits.maxOrderQuantity}" value="1" required></label>${side==='buy'?'<label>이 회사를 고른 이유<textarea name="reason" required maxlength="300" placeholder="회사 소식과 하는 일을 생각하며 적어요. 띄어쓰기를 빼고 10~200자"></textarea></label>':''}<div class="sec-server-quote" aria-live="polite"></div><p class="sec-error" role="alert"></p><button type="submit">코인 계산해 보기</button> <button type="button" data-close>취소</button></form>`;
  document.body.append(d);d.showModal();d.querySelector('input').focus();d.oncancel=e=>{e.preventDefault();closeOrder();};d.querySelector('[data-close]').onclick=closeOrder;
  const f=d.querySelector('form'),submit=f.querySelector('[type="submit"]');let confirmation=null,busy=false;
  f.oninput=()=>{confirmation=null;submit.textContent='코인 계산해 보기';d.querySelector('.sec-server-quote').textContent='';};
  f.onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;submit.disabled=true;
   const p={action:side,companyId:id,quantity:Number(f.elements.quantity.value),reason:f.elements.reason?.value.trim()||'',expectedPriceVersion:market.priceVersion,expectedConfigVersion:market.configVersion};
   try{
    if(!confirmation){const response=await current.query({...p,action:'quote',side});if(ticket!==generation||!d.isConnected)return;confirmation=p;const q=response.quote;d.querySelector('.sec-server-quote').innerHTML=`<p>주식값 합계 ${R.money(q.grossMinor)} · 이용료 ${R.money(q.feeMinor)}<br>거래 뒤 증권 지갑 코인 <strong>${R.money(q.cashMinor)}</strong></p>`;submit.textContent=side==='buy'?'이대로 살게요':'이대로 팔게요';}
    else{await current.mutate('action',confirmation);if(ticket!==generation)return;closeOrder();state.message=side==='buy'?'주식을 샀어요. 투자일지에 기록이 남았어요.':'주식을 팔았어요. 투자일지에서 돌아보세요.';await refresh();panel().querySelector(`[data-sec-action="${side}"]`)?.focus();}
   }catch(err){if(ticket!==generation)return;if(current.pending()){closeOrder();error(err);}else{confirmation=null;submit.textContent='코인 계산해 보기';d.querySelector('[role="alert"]').textContent=R.friendlyText(err.message);}}
   finally{busy=false;submit.disabled=false;}
  };
 }
 function transferDialog(action,source){
  closeOrder();returnFocus=source;const ticket=generation,current=repo,deposit=action==='deposit';
  const d=document.createElement('dialog');dialog=d;d.className='sec-dialog';d.setAttribute('aria-labelledby','sec-transfer-title');
  d.innerHTML=`<h2 id="sec-transfer-title">${deposit?'증권 지갑에 코인 넣기':'내 지갑으로 코인 꺼내기'}</h2><p>내 지갑 ${state.walletCoin}코인 · 증권 지갑 ${R.money(state.account.cashMinor)}코인</p><form><label>코인 수<input name="amount" type="number" min="1" max="${deposit?100:Math.floor(state.account.cashMinor/100)}" step="1" required></label><p data-summary aria-live="polite">금액을 입력하고 확인해 주세요.</p><p role="alert"></p><button type="submit">금액 확인</button> <button type="button" data-close>취소</button></form>`;
  document.body.append(d);d.showModal();d.querySelector('input').focus();d.oncancel=e=>{e.preventDefault();closeOrder();};d.querySelector('[data-close]').onclick=closeOrder;
  const f=d.querySelector('form'),submit=f.querySelector('[type="submit"]');let confirmed=null,busy=false;
  f.oninput=()=>{confirmed=null;submit.textContent='금액 확인';};
  f.onsubmit=async e=>{e.preventDefault();if(busy)return;const amount=Number(f.elements.amount.value);if(!Number.isSafeInteger(amount)||amount<1)return;
   if(confirmed!==amount){confirmed=amount;d.querySelector('[data-summary]').textContent=deposit?`내 지갑에서 ${amount}코인을 빼서 증권 지갑에 넣어요.`:`증권 지갑에서 ${amount}코인을 빼서 내 지갑에 넣어요.`;submit.textContent=deposit?'이대로 넣을게요':'이대로 꺼낼게요';return;}
   busy=true;submit.disabled=true;
   try{await current.mutate('action',{action,amount});if(ticket!==generation)return;closeOrder();state.message=deposit?'증권 지갑에 코인을 넣었어요.':'내 지갑으로 코인을 꺼냈어요.';root.DJ48ClassroomState?.resetClassroomDataCaches({economy:true,wallet:true});root.DJ48ShopState?.resetUserEconomyCache();root.dispatchEvent(new Event('dj48-securities-wallet-changed'));await refresh();panel().querySelector(`[data-server-action="${action}"]`)?.focus();}
   catch(err){if(ticket!==generation)return;if(current.pending()){closeOrder();error(err);}else{confirmed=null;submit.textContent='금액 확인';d.querySelector('[role="alert"]').textContent=R.friendlyText(err.message);}}
   finally{busy=false;submit.disabled=false;}
  };
 }
 async function management(cursor){
  const ticket=generation,current=repo;
  const [accounts,drafts,dashboard,templateData,reports]=await Promise.all([current.query({action:'accounts',limit:10,...(cursor?{cursor}: {})}),current.query({action:'drafts',limit:50}),current.query({action:'dashboard'}),current.query({action:'templates'}),current.query({action:'dailyReports',limit:50})]);
  if(ticket!==generation)return;
  state.drafts=drafts.rows;state.templates=templateData.templates;
  state.adminData={accounts:cursor?[...(state.adminData?.accounts||[]),...accounts.rows]:accounts.rows,accountsCursor:accounts.cursor,draftsCursor:drafts.cursor,dashboard,reports:reports.rows};
  if(state.selected)await selectCompany(state.selected,ticket);else render();
 }

 async function inspect(ownerId,cursor){
  const ticket=generation;const [a,j,l,audit]=await Promise.all([repo.query({action:'account',ownerId}),repo.query({action:'journal',ownerId,limit:10,...(cursor?{cursor}: {})}),repo.query({action:'ledger',ownerId,limit:10}),repo.query({action:'audit',ownerId})]);
  if(ticket!==generation)return;
  state.inspectionHtml=`<article class="sec-card"><h3>${R.esc(memberNames[ownerId]||ownerId)} 계좌</h3><p>지갑 코인 ${R.money(a.account?.cashMinor||0)} · 주식의 지금 값 ${R.money(a.summary?.valueMinor||0)}</p><p>원장 ${audit.complete?audit.issues.length?'불일치 발견':'일치':'전체 검토 필요'}</p><p>${R.esc(audit.issues.join(', '))}</p><details><summary>원장 보기</summary>${l.rows.map(e=>`<p>${R.esc(({buy:'주식 사기',sell:'주식 팔기',deposit:'코인 넣기',withdraw:'코인 꺼내기',openAccount:'계좌 만들기'})[e.kind]||e.kind)} · 전 ${R.money(e.before.cashMinor)} → 후 ${R.money(e.after.cashMinor)}</p>`).join('')}${l.cursor?button('원장 다음 페이지','ledgerNext',`data-owner="${ownerId}" data-cursor="${l.cursor}"`):''}</details>${j.rows.map(e=>`<article><p><strong>${R.esc(state.companies.find(c=>c.id===e.order.companyId)?.name||e.order.companyId)} ${e.order.quantity}주 · ${e.order.side==='buy'?'샀어요':'팔았어요'}</strong></p><p>고른 이유: ${R.esc(e.order.reason||'주식을 팔았어요')}</p><p>돌아보기: ${R.esc(e.reflection)}</p><label>선생님 피드백<textarea maxlength="500">${R.esc(e.feedback)}</textarea></label>${button('피드백 저장','feedback',`data-owner="${ownerId}" data-trade="${e.id}" data-revision="${e.revision}"`)}</article>`).join('')}${j.cursor?button('다음 거래일지','inspectNext',`data-owner="${ownerId}" data-cursor="${j.cursor}"`):''}</article>`;
  document.getElementById('sec-b-inspection').innerHTML=state.inspectionHtml;
 }
 function newsTarget(form,scope,target){const options=scope==='company'?state.companies.map(c=>[c.id,c.name]):scope==='sector'?[...new Set(state.companies.map(c=>c.sector))].map(s=>[s,s]):[['all','시장 전체']];form.elements.target.innerHTML=options.map(([id,label])=>`<option value="${R.esc(id)}">${R.esc(label)}</option>`).join('');if(target)form.elements.target.value=target;}
 async function handleServer(b){
  const action=b.dataset.serverAction,ticket=generation;
  if(action==='studentView'||action==='teacherView'){state.studentPreview=action==='studentView';state.selected=null;if(adminView())await management();else render();return;}
  if(action==='adminTab'){state.adminTab=b.dataset.tab;panel().querySelectorAll('[data-admin-pane]').forEach(p=>p.hidden=p.dataset.adminPane!==state.adminTab);panel().querySelectorAll('[data-server-action=adminTab]').forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.tab===state.adminTab)));return;}
  if(action==='deposit'||action==='withdraw'){transferDialog(action,b);return;}
  if(action==='refresh'){await refresh();return;}
  if(action==='retry'){await repo.retryPending();if(ticket===generation){root.DJ48ClassroomState?.resetClassroomDataCaches({economy:true,wallet:true});root.DJ48ShopState?.resetUserEconomyCache();await refresh();}return;}
  if(action==='manage'||action==='accountsNext'){await management(b.dataset.cursor);return;}
  if(action==='inspect'||action==='inspectNext'){await inspect(b.dataset.owner,b.dataset.cursor);return;}
  if(action==='editNews'){const n=state.drafts.find(n=>n.id===b.dataset.news),f=document.getElementById('sec-b-news');f.dataset.news=n.id;f.dataset.revision=n.revision;for(const k of ['title','body','type','scope'])f.elements[k].value=n[k];newsTarget(f,n.scope,n.target);f.elements.effect.value=n.effectBps/100;f.elements.correction.value=n.correctionOf||'';f.elements.date.value=n.publishAt?new Date(n.publishAt+9*3600000).toISOString().slice(0,10):'';f.elements.title.focus();return;}
  if(action==='moreNews'||action==='moreJournal'){
   const news=action==='moreNews',result=await repo.query({action:news?'news':'journal',cursor:news?state.newsCursor:state.journalCursor});if(ticket!==generation)return;
   if(news){state.news.push(...newsRows(result.rows));state.newsCursor=result.cursor;}else{state.journal.push(...result.rows);state.journalCursor=result.cursor;}render();return;
  }
  if(action==='draftsNext'||action==='ledgerNext'){
   const response=await repo.query({action:action==='draftsNext'?'drafts':'ledger',cursor:b.dataset.cursor,...(b.dataset.owner?{ownerId:b.dataset.owner}:{}),limit:50});if(ticket!==generation)return;
   if(action==='draftsNext')state.drafts.push(...response.rows);
   b.insertAdjacentHTML('beforebegin',response.rows.map(n=>action==='draftsNext'?`<article class="sec-card"><strong>${R.esc(n.title)}</strong><p>${R.esc(n.id)} · ${R.esc(n.status)}</p>${n.status!=='published'?button('초안 수정','editNews',`data-news="${n.id}"`)+button('지금 발행','publish',`data-news="${n.id}" data-revision="${n.revision}"`):''}</article>`:`<p>${R.esc(n.kind)} · ${R.money(n.after.cashMinor)}</p>`).join(''));if(response.cursor)b.dataset.cursor=response.cursor;else b.remove();return;
  }
  const reason=document.getElementById('sec-b-reason')?.value.trim()||'';
  if(action==='openStudents')await mutate('admin',{action:'updateSettings',reason,expectedRevision:state.market.configVersion,patch:{studentAccess:true}});
  if(action==='toggleEnabled')await mutate('admin',{action:'updateSettings',reason,expectedRevision:state.market.configVersion,patch:{lifecycle:state.market.lifecycle==='disabled'?'enabled':'disabled'}});
  if(action==='pause')await mutate('admin',{action:state.market.lifecycle==='enabled'?'pause':'resume',reason,expectedRevision:state.market.configVersion});
  if(action==='publish')await mutate('admin',{action:'publishNews',newsId:b.dataset.news,reason,expectedRevision:Number(b.dataset.revision)});
  if(action==='feedback')await mutate('admin',{action:'feedback',ownerId:b.dataset.owner,tradeId:b.dataset.trade,feedback:b.closest('article').querySelector('textarea').value,reason,expectedRevision:Number(b.dataset.revision)});
  if(action==='feedback'&&ticket===generation)await inspect(b.dataset.owner);
 }
 function bind(){const p=panel();if(p.dataset.serverBound)return;p.dataset.serverBound='1';
  p.addEventListener('input',e=>{if(state&&e.target.id==='sec-search'){state.search=e.target.value;p.querySelector('#sec-company-grid').innerHTML=R.companies(state);}});
  p.addEventListener('change',e=>{if(state&&e.target.name==='template'){const n=state.templates.find(n=>n.id===e.target.value);if(n){const f=e.target.form;f.elements.title.value=n.title;f.elements.body.value=n.body;f.elements.type.value=n.type;f.elements.scope.value='company';newsTarget(f,'company',n.companyId);}}if(state&&e.target.name==='scope')newsTarget(e.target.form,e.target.value);if(state&&e.target.id==='sec-sort'){state.sort=e.target.value;p.querySelector('#sec-company-grid').innerHTML=R.companies(state);}});
  p.addEventListener('click',async e=>{
   const b=e.target.closest('[data-sec-action],[data-server-action]');if(!b||b.disabled||p.getAttribute('aria-busy')==='true')return;const ticket=generation;b.disabled=true;p.setAttribute('aria-busy','true');
   try{
    if(b.dataset.serverAction){await handleServer(b);return;}
    const a=b.dataset.secAction;
    if(a==='open')await mutate('action',{action:'openAccount'});
    else if(a==='section'){selectionSequence++;state.section=b.dataset.section;state.selected=null;render(`[data-section="${state.section}"]`);}
    else if(a==='company')await selectCompany(b.dataset.company);
    else if(a==='back'){const id=state.selected;state.selected=null;render(`[data-company="${id}"]`);}
    else if(a==='buy'||a==='sell')await order(a,b);
    else if(a==='reflect'){const j=state.journal.find(j=>j.id===b.dataset.trade);await mutate('action',{action:'reflect',tradeId:j.id,reflection:b.closest('article').querySelector('textarea').value,expectedRevision:j.revision});}
   }catch(err){if(ticket===generation)error(err);}finally{b.disabled=false;if(ticket===generation)p.removeAttribute('aria-busy');}
  });
  p.addEventListener('submit',async e=>{
   if(!['sec-b-settings','sec-b-news'].includes(e.target.id))return;e.preventDefault();const ticket=generation,f=new FormData(e.target),reason=document.getElementById('sec-b-reason').value.trim(),submit=e.target.querySelector('button');submit.disabled=true;p.setAttribute('aria-busy','true');
   try{
    if(e.target.id==='sec-b-settings'){const minutes=v=>{const[a,b]=v.split(':').map(Number);return a*60+b;};await mutate('admin',{action:'updateSettings',reason,expectedRevision:state.market.configVersion,patch:{sessionSchedule:{newsMinute:minutes(f.get('news')),openMinute:minutes(f.get('open')),closeMinute:minutes(f.get('close'))},holidayDates:String(f.get('holidays')).split(',').map(x=>x.trim()).filter(Boolean),limits:{dailyTrades:Number(f.get('dailyTrades')),maxOrderQuantity:Number(f.get('maxOrderQuantity')),maxWeightBps:Number(f.get('weight'))*100},feeBps:Math.round(Number(f.get('fee'))*100)}});}
    else{const date=f.get('date'),publishAt=date?Date.parse(`${date}T00:00:00+09:00`)+state.market.sessionSchedule.newsMinute*60000:null;await mutate('admin',{action:'saveNews',newsId:e.target.dataset.news||crypto.randomUUID(),reason,expectedRevision:Number(e.target.dataset.revision)||1,title:f.get('title'),body:f.get('body'),type:f.get('type'),scope:f.get('scope'),target:f.get('target'),effectBps:Math.round(Number(f.get('effect'))*100),correctionOf:f.get('correction')||null,publishAt});}
    if(ticket===generation){state.message='저장했어요.';render();}
   }catch(err){if(ticket===generation)error(err);}finally{submit.disabled=false;if(ticket===generation)p.removeAttribute('aria-busy');}
  });
 }
 async function enter(){if(!enabled()||!repo)return;bind();const ticket=generation;try{await refresh();}catch(e){if(ticket===generation)error(e);}}
 function configure(data={},deps={}){
  if(!data.settings?.classId||!deps.currentMemberUserId)return;
  if(!preview()&&data.settings.classId!=='G4-C8'){reset();return;}
  const next={classId:data.settings.classId,marketId:preview()&&!new URLSearchParams(location.search).has('securitiesCoin')?'practice-v1':'coin-v1',memberUserId:deps.currentMemberUserId,teacher:deps.isCurrentClassroomTeacher?.(data.settings)===true};
  if(!context||JSON.stringify(next)!==JSON.stringify(context)){reset();context=next;repo=root.DJ48SecuritiesRepository.create({identity:{classId:next.classId,marketId:next.marketId,memberUserId:next.memberUserId},storage:sessionStorage,call:preview()?root.DJ48SecuritiesTransport:transport});}
  memberNames=Object.fromEntries((data.studentCards||[]).filter(s=>s.memberUserId).map(s=>[s.memberUserId,`${s.studentNumber?s.studentNumber+'번 ':''}${s.nickname||s.name||s.memberUserId}`]));
  const tab=document.querySelector('[data-classroom-tab="securities"]');if(tab)tab.hidden=false;
  if(document.getElementById('classroom-view').dataset.activeTab==='securities')enter();
 }
 root.DJ48Securities={isEnabled:enabled,configure,enter,reset,closeOrder};
})(window);
