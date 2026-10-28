(function(root) {
  'use strict';
  const S = root.DJ48SecuritiesState, D = root.DJ48SecuritiesDomain, R = root.DJ48SecuritiesRender;
  let context = null, loading = null, dialog = null, focusReturn = null;
  function isEnabled() {
    return ['localhost','127.0.0.1','[::1]'].includes(location.hostname)
      && new URLSearchParams(location.search).get('securitiesPreview') === '1';
  }
  function closeOrder() {
    dialog?.close(); dialog?.remove(); dialog = null;
    if(focusReturn?.isConnected) focusReturn.focus();
    focusReturn = null;
  }
  function reset() { closeOrder(); S.reset(); context=null; const p=document.getElementById('classroom-securities-panel'); if(p) p.replaceChildren(); }
  async function loadFixture() {
    if(root.DJ48SecuritiesFixture) return root.DJ48SecuritiesFixture;
    if(!loading) loading = new Promise((resolve,reject) => {
      const script=document.createElement('script'); script.src='/js/data/securities-fixture.js';
      script.onload=()=>{script.remove();resolve(root.DJ48SecuritiesFixture);};
      script.onerror=()=>{script.remove();reject(new Error('연습 자료를 불러오지 못했어요. 다시 시도해 주세요.'));};
      document.head.append(script);
    }).finally(()=>{loading=null;});
    return loading;
  }
  function render(focusSelector) {
    const state=S.get(), panel=document.getElementById('classroom-securities-panel');
    if(!state || !panel) return;
    R.render(state,panel);
    if(focusSelector) panel.querySelector(focusSelector)?.focus();
  }
  function message(error) {
    const s=S.get(); s.message=R.friendlyText(error.message); s.error=true;
    const el=document.getElementById('sec-message'); el.textContent=s.message; el.className='sec-error';
  }
  function orderDialog(side, source) {
    closeOrder(); focusReturn=source;
    const s=S.get(), company=s.companies.find(c=>c.id===s.selected);
    const version=s.market.priceVersion;
    dialog=document.createElement('dialog');dialog.className='sec-dialog';dialog.setAttribute('aria-labelledby','sec-order-title');
    dialog.innerHTML=`<h2 id="sec-order-title">${R.esc(company.name)} ${side==='buy'?'주식 사기':'주식 팔기'}</h2><p>${s.market.date}에 정한 값</p><p>1주 ${R.money(s.market.prices[company.id])} 연습머니</p><form id="sec-order-form"><label>몇 주를 사고팔까요?<input name="quantity" type="number" min="1" max="100" step="1" value="1" required></label>${side==='buy'?'<label>이 회사를 고른 이유<textarea name="reason" maxlength="300" required placeholder="회사 소식과 하는 일을 생각하며 적어요. 띄어쓰기를 빼고 10~200자"></textarea></label>':''}<p id="sec-order-error" role="alert"></p><div id="sec-order-quote" aria-live="polite"></div><div class="sec-row"><button type="submit">코인 계산해 보기</button><button type="button" id="sec-order-cancel">취소</button></div></form>`;
    document.body.append(dialog);
    dialog.addEventListener('cancel', event=>{event.preventDefault();closeOrder();});
    dialog.querySelector('#sec-order-cancel').onclick=closeOrder;
    const form=dialog.querySelector('form');let confirmed=null;
    const submit=form.querySelector('[type="submit"]');
    form.addEventListener('input',()=>{confirmed=null;submit.textContent='코인 계산해 보기';dialog.querySelector('#sec-order-quote').textContent='';});
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const order={companyId:company.id,side,quantity:Number(form.elements.quantity.value),reason:form.elements.reason?.value.trim()||'',expectedPriceVersion:version};
      try {
        dialog.querySelector('#sec-order-error').textContent='';
        const result=D.quote(s.account,s.market,order);
        if(!confirmed) {
          confirmed=order; submit.textContent=side==='buy'?'이대로 살게요':'이대로 팔게요';
          dialog.querySelector('#sec-order-quote').innerHTML=`<p>주식값 합계 ${R.money(result.grossMinor)}<br>이용료 ${R.money(result.feeMinor)}<br><strong>거래 뒤 증권 지갑 코인 ${R.money(result.cashMinor)}</strong></p>`;
          return;
        }
        const settled=D.trade(s.account,s.market,confirmed);s.account=settled.account;
        s.journal.push({id:crypto.randomUUID(),order:confirmed,result:settled.result,reflection:''});
        s.message='연습 거래를 마쳤어요. 생각 노트에서 돌아보세요.';s.error=false;
        closeOrder();render(`[data-sec-action="${side}"]`);
      } catch(error) {confirmed=null;submit.textContent='코인 계산해 보기';dialog.querySelector('#sec-order-quote').textContent='';dialog.querySelector('#sec-order-error').textContent=R.friendlyText(error.message);}
    });
    dialog.showModal();form.elements.quantity.focus();
  }
  function bind(panel) {
    if(panel.dataset.secBound) return; panel.dataset.secBound='1';
    panel.addEventListener('input',event=>{
      const s=S.get(); if(!s)return;
      if(event.target.id==='sec-search') {s.search=event.target.value;panel.querySelector('#sec-company-grid').innerHTML=R.companies(s);}
    });
    panel.addEventListener('change',event=>{
      const s=S.get();if(s && event.target.id==='sec-sort'){s.sort=event.target.value;panel.querySelector('#sec-company-grid').innerHTML=R.companies(s);}
    });
    panel.addEventListener('click',event=>{
      const b=event.target.closest('[data-sec-action]');if(!b || b.disabled)return;
      if(b.dataset.secAction==='retry'){enter();return;}
      const s=S.get();if(!s)return;
      try {
        switch(b.dataset.secAction) {
          case 'open': if(!s.account)s.account=D.openAccount();s.message='1,000 연습머니로 시작했어요.';break;
          case 'section':s.section=b.dataset.section;s.selected=null;s.message='';break;
          case 'company':s.selected=b.dataset.company;s.section='market';break;
          case 'back':s.selected=null;break;
          case 'buy':case 'sell':orderDialog(b.dataset.secAction,b);return;
          case 'reflect': {
            const j=s.journal.find(j=>j.id===b.dataset.trade);j.reflection=b.closest('article').querySelector(`[data-reflection="${j.id}"]`).value.trim().slice(0,500);s.message='돌아보기를 이 페이지에 저장했어요.';break;
          }
          case 'pause': {
            if(!s.teacher)return;
            const reason=panel.querySelector('#sec-admin-reason').value.trim();if(!reason)throw new Error('변경 사유를 적어 주세요.');
            s.market.lifecycle=s.market.lifecycle==='paused'?'enabled':'paused';s.audit.push(`${s.market.lifecycle==='paused'?'거래 중지':'거래 재개'}: ${reason}`);s.message='로컬 시장 상태를 변경했어요.';break;
          }
          default:return;
        }
        s.error=false;render(b.dataset.secAction==='company'?'#sec-company-title':b.dataset.secAction==='section'?`[data-section="${s.section}"]`:undefined);
      } catch(error){message(error);}
    });
    panel.addEventListener('submit',event=>{
      if(event.target.id!=='sec-news-form')return;event.preventDefault();
      const s=S.get();if(!s.teacher)return;
      const f=new FormData(event.target),title=String(f.get('title')).trim(),body=String(f.get('body')).trim();
      if(!title||!body){message(new Error('뉴스 제목과 본문을 적어 주세요.'));return;}
      s.news.unshift({id:crypto.randomUUID(),companyId:'all',title:title.slice(0,80),body:body.slice(0,500),type:'교사 작성',publishedAt:'2026-10-16T10:00:00+09:00',effectiveDate:'2026-10-19'});
      s.audit.push(`로컬 뉴스 발행: ${title}`);s.message='다음 거래일용 뉴스를 로컬에 추가했어요.';s.section='news';render();
    });
  }
  async function enter() {
    if(!isEnabled() || !context)return;
    const panel=document.getElementById('classroom-securities-panel');if(!panel)return;
    bind(panel);
    if(S.get()){render();return;}
    const generation=S.generation(),current=context;
    panel.innerHTML='<p role="status">연습 자료를 준비하고 있어요…</p>';
    try {
      const fixture=await loadFixture();
      if(generation!==S.generation() || current!==context)return;
      S.create(fixture,current.identity,current.teacher);render();
    } catch(error) {
      if(generation!==S.generation() || current!==context)return;
      panel.innerHTML=`<p role="alert">${R.esc(error.message)}</p><button type="button" data-sec-action="retry">다시 시도</button>`;
    }
  }
  function configure(data={},deps={}) {
    if(!isEnabled())return;
    const next={identity:`${data.settings?.classId}:${deps.currentMemberUserId}`,teacher:deps.isCurrentClassroomTeacher?.(data.settings)===true};
    if(!context || context.identity!==next.identity || context.teacher!==next.teacher){reset();context=next;}
    if(document.getElementById('classroom-view')?.dataset.activeTab==='securities')enter();
  }
  root.DJ48Securities={isEnabled,configure,enter,reset,closeOrder};
})(window);
