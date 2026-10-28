/* Scene navigation only. Existing account, reward, commerce and quiz controllers remain authoritative. */
(function () {
  'use strict';
  const ART = '/images/town-spatial-20261018/';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const byId = id => document.getElementById(id);
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if(className) node.className = className;
    if(text) node.textContent = text;
    return node;
  }
  function guide(scene) {
    const actor = element('span', 'spatial-guide');
    actor.setAttribute('aria-hidden', 'true');
    const img = element('img'); img.hidden = true; img.alt = ''; img.draggable = false;
    actor.dataset.avatarState = 'fallback';
    actor.append(img); scene.append(actor);
    return actor;
  }
  function sceneZoom(scroll) {
    if(!scroll) return;
    scroll.classList.add('spatial-viewport');
    const button = element('button','spatial-zoom','크게 보기'); button.type = 'button';
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>{
      const large = scroll.classList.toggle('is-enlarged');
      button.setAttribute('aria-pressed',String(large)); button.textContent = large?'전체 보기':'크게 보기';
      if(!large) scroll.scrollLeft = 0;
    });
    scroll.before(button);
  }
  function town() {
    const view = byId('town-view'), map = view?.querySelector('.town-map');
    if(!map) return;
    const actor = guide(map);
    let timer, sequence = 0, position = [50, 83];
    // Connected ground waypoints keep the guide off buildings, water and the trophy.
    const nodes = [[50,83],[50,68],[35,55],[30,37],[47,31],[63,37],[74,34],[67,60],[80,77],[24,75],[52,58]];
    const edges = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[1,7],[7,8],[1,9],[1,10]];
    const destinations = {home:6,school:3,shop:8,ranking:10,event:9};
    const distance = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1]);
    function nearest(point) { return nodes.reduce((best,p,i)=>distance(p,point)<distance(nodes[best],point)?i:best,0); }
    function routeTo(target) {
      const start = nearest(position), queue = [[start]], seen = new Set([start]);
      while(queue.length) {
        const path = queue.shift(), last = path[path.length-1];
        if(last === target) return path.map(i=>nodes[i]);
        for(const edge of edges) if(edge.includes(last)) {
          const next = edge[0] === last ? edge[1] : edge[0];
          if(!seen.has(next)) { seen.add(next); queue.push([...path,next]); }
        }
      }
      return [nodes[target]];
    }
    const status = element('p','spatial-walk-status','길을 누르면 이동하고, 건물을 누르면 입장해요.');
    status.setAttribute('role','status');
    view.querySelector('.storybook-map-tip')?.replaceWith(status);
    function cancel() { clearTimeout(timer); sequence++; actor.classList.remove('is-walking'); }
    function walk(target, done, label) {
      cancel(); const ticket = sequence;
      const path = routeTo(target);
      status.textContent = label ? `${label}(으)로 가는 중… 다른 곳을 누르면 목적지를 바꿀 수 있어요.` : '길을 따라 천천히 이동해요.';
      actor.classList.add('is-walking');
      const step = () => {
        if(ticket !== sequence || view.hidden) return;
        const next = path.shift();
        if(!next) { actor.classList.remove('is-walking'); status.textContent = label ? `${label}에 도착했어요!` : '다음에는 어디로 갈까요? 건물이나 아래 빠른 이동을 눌러보세요.'; done?.(); return; }
        const duration = reduceMotion.matches ? 0 : Math.min(650,Math.max(120,distance(position,next)*18));
        actor.style.transitionDuration = `${duration}ms`;
        actor.style.left = `${next[0]}%`; actor.style.top = `${next[1]}%`; position = next;
        timer = setTimeout(step,duration);
      };
      step();
    }
    actor.style.left = '50%'; actor.style.top = '83%';
    map.addEventListener('click', event => {
      const place = event.target.closest('[data-place]');
      if(place) {
        if(event.detail === 0 || reduceMotion.matches) { cancel(); return; }
        event.preventDefault(); event.stopImmediatePropagation();
        walk(destinations[place.dataset.place],()=>place.click(),place.querySelector('.place-name')?.textContent || '목적지');
      } else if(!event.target.closest('button,a')) {
        const rect = map.getBoundingClientRect();
        walk(nearest([(event.clientX-rect.left)/rect.width*100,(event.clientY-rect.top)/rect.height*100]));
      }
    },true);
    view.querySelector('.map-buttons:not(.town-info-shortcuts)')?.addEventListener('click',cancel,true);
    view.addEventListener('keydown',event=>{if(event.key==='Escape') {cancel();status.textContent='산책을 멈췄어요. 원하는 건물을 골라보세요.';}});
    new MutationObserver(()=>{if(view.hidden) cancel();}).observe(view,{attributes:true,attributeFilter:['hidden']});
    const nav = view.querySelector('.map-buttons:not(.town-info-shortcuts)');
    if(nav) nav.setAttribute('aria-label','마을 장소');
    const places = ['home','school','shop','ranking','event'];
    places.forEach((place,index)=>view.querySelectorAll(`[data-place="${place}"]`).forEach(button=>button.dataset.sceneNumber = String(index+1)));
    sceneZoom(view.querySelector('.storybook-map-scroll'));
    view.classList.add('spatial-town-ready');
    townControls(view);
  }
  function townControls(view) {
    const scroll = view.querySelector('.storybook-map-scroll');
    const frame = element('div','town-map-frame'); scroll.before(frame); frame.append(scroll);
    const left = element('div','town-map-tools town-map-tools-left');
    const right = element('div','town-map-tools town-map-tools-right'); right.id = 'town-status-slot';
    const picture = name => { const img = element('img'); img.src = '/images/town-controls-20261018/'+name+'.webp'; img.alt = ''; return img; };
    const friends = byId('town-friends-button'), news = byId('global-refresh-button');
    if(friends) {
      const count = byId('town-friends-count'), notes = byId('town-notes-badge');
      friends.replaceChildren(picture('people'),count,notes); friends.classList.add('town-map-control');
      const label = () => friends.setAttribute('aria-label',`접속 중 ${count.textContent}명 · 친구와 쪽지${!notes.hidden ? ' · 새 쪽지 '+notes.textContent+'개' : ''}`);
      new MutationObserver(label).observe(friends,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});label();left.append(friends);
    }
    if(news) {
      const text = element('span','town-refresh-label spatial-sr-only',news.textContent);
      news.replaceChildren(picture('news'),text); news.classList.add('town-map-control');
      news.setAttribute('aria-label',news.classList.contains('needs-refresh')?'새 소식 있음 — 최신 정보 확인':'새 소식 확인');left.append(news);
    }
    const bottom = element('div','town-map-tools town-map-tools-bottom-left');
    const inquiry = byId('btn-open-inquiry');
    if(inquiry) {
      inquiry.replaceChildren(picture('mailbox')); inquiry.classList.add('town-map-control');
      inquiry.setAttribute('aria-label','선생님께 문의하기'); inquiry.title = '선생님께 문의하기';
      bottom.append(inquiry); // Move the original button, keeping its existing inquiry handler.
    }
    frame.append(left,right,bottom);
    // The shared status component retains its real dialog/iframe and returns to the shell in other views.
    window.dispatchEvent(new Event('dj48-town-controls-ready'));
    view.querySelector('.town-info-shortcuts')?.remove();
    const notice = byId('daily-notice-drop'); if(notice) notice.classList.add('town-retired-notice');
  }
  function panel(view, key, title, nodes) {
    const dialog = element('dialog','spatial-panel'); dialog.id = 'spatial-panel-'+key;
    dialog.setAttribute('aria-labelledby',dialog.id+'-title');
    const header = element('div','spatial-panel-header');
    const heading = element('h2','',title); heading.id = dialog.id+'-title';
    const close = element('button','spatial-close','닫기 ×'); close.type = 'button'; close.autofocus = true;
    const body = element('div','spatial-panel-body');
    header.append(heading,close); dialog.append(header,body); nodes.filter(Boolean).forEach(node=>body.append(node)); view.append(dialog);
    let opener;
    close.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{
      if(event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) dialog.close();
    });
    dialog.addEventListener('close',()=>{
      if(dialog.open) return;
      if(!document.querySelector('.spatial-panel[open]')) document.body.classList.remove('spatial-modal-open');
      if(!dialog.dataset.spatialSuspended && !view.hidden && opener?.isConnected && !opener.closest('[hidden]')) opener.focus({preventScroll:true});
    });
    new MutationObserver(()=>{if(view.hidden && dialog.open) dialog.close();}).observe(view,{attributes:true,attributeFilter:['hidden']});
    return {
      dialog,
      open(button) {
        if(view.hidden) return;
        if(!dialog.open) {
          opener = button || document.activeElement;
          view.querySelectorAll('.spatial-panel[open]').forEach(other=>other.close());
          dialog.showModal(); document.body.classList.add('spatial-modal-open'); body.scrollTop = 0;
        }
      }
    };
  }
  function room(view, kind, description, actions) {
    const wrapper = element('section','spatial-room'); wrapper.dataset.scene = kind;
    const heading = element('div','spatial-room-heading');
    const title = view.querySelector('h2'); if(title) heading.append(title);
    heading.append(element('p','',description));
    const scroll = element('div','spatial-scene-scroll'); scroll.tabIndex = 0;
    scroll.setAttribute('aria-label','그림 속 사물을 눌러보세요. 작은 화면에서는 옆으로 밀거나 아래 메뉴를 이용하세요.');
    const scene = element('div','spatial-scene');
    const img = element('img','spatial-scene-art'); img.src = ART+kind+'-v1.webp'; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 1536; img.height = 1024;
    scene.append(img); scroll.append(scene);
    const quick = element('nav','spatial-quick'); quick.setAttribute('aria-label',title?.textContent+' 빠른 선택');
    const message = element('p','spatial-scene-hint','사물이나 이름표를 눌러보세요. 아래 메뉴에서도 바로 열 수 있어요.'); message.setAttribute('role','status');
    for(const [index,action] of actions.entries()) {
      function button(hotspot) {
        const node = element(action.href?'a':'button',hotspot?'spatial-hotspot':'spatial-quick-button');
        if(action.href) node.href = action.href; else node.type = 'button';
        node.dataset.spatialAction = action.key;
        node.dataset.sceneNumber = String(index+1);
        if(action.panel) { node.setAttribute('aria-haspopup','dialog'); node.setAttribute('aria-controls',action.panel.dialog.id); }
        node.append(element('span','spatial-sign',action.label));
        if(hotspot) { const [x,y,w,h] = action.rect; node.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%`; }
        node.addEventListener('click',()=>{
          if(action.available && !action.available()) {
            message.classList.add('is-feedback');
            message.textContent = action.unavailable?.() || '잠시 뒤 다시 눌러주세요.';
            return;
          }
          action.panel?.open(node);
          action.run?.(node,message);
        });
        return node;
      }
      scene.append(button(true));quick.append(button(false));
    }
    const actor = guide(scene); actor.style.left = '50%'; actor.style.top = '87%';
    wrapper.append(heading,scroll,message,quick);
    sceneZoom(scroll);
    const topbar = view.querySelector(':scope > [class$="-topbar"]');
    if(topbar) topbar.after(wrapper); else view.prepend(wrapper);
    view.classList.add('spatial-room-ready');
    return wrapper;
  }
  function home() {
    const view = byId('home-view'); if(!view) return;
    byId('home-title').textContent = '내 집';
    const profile = panel(view,'profile','내 정보 수첩',[byId('profile-card-root')]);
    const toggles = view.querySelector('.home-detail-toggle-grid');
    const details = panel(view,'collection','나의 기록',[toggles,view.querySelector('.home-detail-root')]);
    function openDetail(key,opener) {
      details.open(opener);
      const toggle = toggles.querySelector(`[data-home-detail-toggle="${key}"]`);
      if(toggle && !toggle.classList.contains('is-active')) toggle.click();
    }
    room(view,'home','내 정보와 랭킹 기록, 타이틀과 뱃지를 확인해요.',[
      {key:'profile',label:'내 정보',rect:[10,24,31,26],panel:profile},
      {key:'records',label:'내 랭킹 기록',rect:[44,11,25,37],panel:details,run:node=>openDetail('ranking',node)},
      {key:'collection',label:'타이틀·뱃지',rect:[73,12,23,42],panel:details,run:node=>openDetail('titles',node)}
    ]);
    // Existing classroom/title links may activate a detail tab programmatically.
    // Observe the existing controller's state instead of replacing its data-loading behavior.
    new MutationObserver(()=>{
      const active = toggles.querySelector('.is-active');
      if(active && !view.hidden && !details.dialog.open) details.open(view.querySelector('[data-spatial-action="collection"]'));
    }).observe(toggles,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  function plazas() {
    const ranking = byId('ranking-view');
    if(ranking) {
      const hall = panel(ranking,'hall','우리 마을 명예의 전당',[ranking.querySelector('.plaza-section-title'),byId('ranking-card-grid')]);
      const board = panel(ranking,'ranking','랭킹 기록 게시판',[byId('ranking-board-root')]);
      const refresh = element('button', 'mini-pill-button plaza-header-refresh', '새로고침');
      refresh.type = 'button';
      refresh.onclick = () => {
        const active = byId('ranking-board-root').querySelector('[data-ranking-board-panel]:not([hidden])');
        const target = active?.querySelector('[data-ranking-sub-panel]:not([hidden]) .hideout-ranking-actions button') || active?.querySelector('[data-ranking-refresh]');
        target?.click();
      };
      board.dialog.querySelector('.spatial-close').before(refresh);
      room(ranking,'ranking','트로피에는 빛나는 친구들, 게시판에는 차곡차곡 쌓인 기록이 있어요.',[
        {key:'hall',label:'명예의 전당',rect:[10,10,34,53],panel:hall},
        {key:'ranking',label:'순위 게시판',rect:[63,18,32,45],panel:board}
      ]);
    }
    const event = byId('event-view');
    if(event) {
      const quests = panel(event,'quests','오늘의 퀘스트',[event.querySelector('.event-section')]);
      const rewards = element('div','quest-card-grid'); rewards.id = 'special-reward-grid';
      const special = panel(event,'special-rewards','특별한 보상',[rewards]);
      const refresh = element('button','mini-pill-button plaza-header-refresh','새로고침'); refresh.type = 'button';
      refresh.onclick = () => window.DJ48SpecialRewards?.load();
      special.dialog.querySelector('.spatial-close').before(refresh);
      room(event,'event','오늘의 퀘스트를 확인하고, 해낸 만큼 보상을 받아요.',[
        {key:'quests',label:'오늘의 퀘스트',rect:[5,15,34,48],panel:quests,run:()=>{ byId('quest-card-grid').hidden=false; window.renderEventProgressFromFunctions?.(true); }},
        {key:'special-rewards',label:'특별한 보상',rect:[65,28,30,46],panel:special}
      ]);
      if(ranking) {
        const button = element('button','ranking-map-quest'); button.type = 'button';
        button.dataset.spatialAction = 'quests';
        const icon = element('span','ranking-map-quest-icon','📜'); icon.setAttribute('aria-hidden','true');
        button.append(icon,element('span','', '오늘의 퀘스트'));
        button.onclick = async () => {
          await window.showEventView();
          event.querySelector('[data-spatial-action="quests"]')?.click();
        };
        ranking.querySelector('.spatial-scene').append(button);
      }
    }
  }
  function shop() {
    const view = byId('shop-view'), market = byId('shop-avatar-market'); if(!view || !market) return;
    const shopPanel = panel(view,'shop','코디 상점 · 무료로 입어보고 골라요',[market]);
    let requestedMode = 'shop', pendingMode = false;
    function applyMode() {
      if(!pendingMode) return;
      const frame = market.querySelector('iframe');
      try {
        const doc = frame?.contentDocument;
        // Wait until the iframe's own handlers are installed (the body state is set by its controller).
        const button = doc?.querySelector(`[data-coordi-mode="${requestedMode}"]`);
        if(doc?.body?.dataset.coordiMode && button && !button.disabled) {
          pendingMode = false;
          if(doc.body.dataset.coordiMode !== requestedMode) button.click();
        }
      } catch (_) { /* Existing iframe error/retry UI remains available. */ }
    }
    const watched = new WeakSet();
    function watchFrame() {
      const frame = market.querySelector('iframe'); if(!frame || watched.has(frame)) return;
      watched.add(frame);
      let observer;
      const ready = () => {
        observer?.disconnect();
        try {
          if(frame.contentDocument?.body) {
            observer = new MutationObserver(applyMode);
            observer.observe(frame.contentDocument.body,{subtree:true,attributes:true,attributeFilter:['data-coordi-mode','disabled']});
          }
        } catch (_) { /* The market itself renders connection errors. */ }
        applyMode();
      };
      frame.addEventListener('load',ready); ready();
    }
    new MutationObserver(watchFrame).observe(market,{childList:true}); watchFrame();
    const availability = {available:()=>!market.hidden && !market.inert,unavailable:()=>byId('shop-entry-status')?.textContent || '상점 연결을 확인하고 있어요. 잠시 뒤 다시 눌러주세요.'};
    room(view,'shop','진열대에서 옷을 고르고, 거울 앞에서 무료로 코디해보세요.',[
      {key:'shop',label:'코디 상점',rect:[4,14,34,51],panel:shopPanel,...availability,run:()=>{requestedMode='shop';pendingMode=true;applyMode();}},
      {key:'fitting',label:'무료 드레스룸',rect:[68,16,27,53],panel:shopPanel,...availability,run:()=>{requestedMode='dressroom';pendingMode=true;applyMode();}}
    ]);
  }
  function school() {
    const view = byId('school-view'), grid = byId('school-quiz-grid'); if(!view || !grid) return;
    const quick = element('nav','spatial-quick'); quick.setAttribute('aria-label','학교 빠른 입장');
    sceneZoom(view.querySelector('.school-map-scroll'));
    view.querySelector('.school-map-hint')?.after(quick);
    function update() {
      quick.replaceChildren();
      const targets = [view.querySelector('.school-homeroom-door'),...grid.querySelectorAll('.school-quiz-card')];
      for(const [index,target] of targets.filter(Boolean).entries()) {
        const original = target.matches('button') ? target : target.querySelector('button') || target;
        const label = target.querySelector('h3')?.textContent || target.textContent.trim();
        const button = element('button','spatial-quick-button',label); button.type = 'button'; button.disabled = !!original.disabled;
        target.dataset.sceneNumber = String(index+1); button.dataset.sceneNumber = String(index+1);
        button.addEventListener('click',()=>original.click()); quick.append(button);
      }
    }
    new MutationObserver(update).observe(grid,{childList:true});update();
  }
  function legacyModalBridge() {
    // Existing title catalog / profile image editors use custom overlays outside the view.
    // Suspend the native top layer while they are open, then restore the originating panel.
    const overlays = [...document.querySelectorAll('body > .modal')];
    let suspended, previousFocus;
    const update = () => {
      const overlay = overlays.find(node=>!node.hidden);
      if(overlay) {
        const active = document.querySelector('.spatial-panel[open]');
        if(active) {
          suspended = active; previousFocus = document.activeElement;
          active.dataset.spatialSuspended = 'true'; active.close();
          overlay.querySelector('button,input,[tabindex="0"]')?.focus();
        }
      } else if(suspended) {
        const dialog = suspended; suspended = null;
        delete dialog.dataset.spatialSuspended;
        if(!dialog.closest('.app-view')?.hidden) {
          dialog.showModal(); document.body.classList.add('spatial-modal-open');
          if(previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
        }
      }
    };
    const observer = new MutationObserver(update);
    overlays.forEach(node=>observer.observe(node,{attributes:true,attributeFilter:['hidden']}));
  }
  function placeControls() {
    for(const id of ['home','shop','ranking','event','school']) {
      const view = byId(id+'-view');
      const scroll = view?.querySelector('.spatial-scene-scroll,.school-map-scroll');
      if(!scroll) continue;
      const frame = element('div','town-map-frame place-map-frame'); scroll.before(frame); frame.append(scroll);
      const left = element('div','town-map-tools town-map-tools-left');
      const right = element('div','town-map-tools town-map-tools-right');
      const status = element('div','place-status-slot'); right.append(status);
      const back = view.querySelector('[data-back-to-town]');
      if(back) {
        back.className = 'town-map-control'; back.setAttribute('aria-label','타운으로 돌아가기'); back.title='타운으로 돌아가기';
        back.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20 9 7 22l13 13V26h8c8 0 10 5 10 12 8-15 1-24-10-24h-8Z" fill="#71895c" stroke="#6b5738" stroke-width="2.5" stroke-linejoin="round"/><path d="m18 15-7 7 7 7" fill="none" stroke="#c9d5a2" stroke-width="2.5" stroke-linecap="round"/></svg>';
        left.append(back);
      }
      const logout = view.querySelector('[data-member-unlink]');
      if(logout) {
        logout.className='town-map-control';logout.setAttribute('aria-label','로그아웃');logout.title='로그아웃';
        const img=element('img');img.src='/images/town-controls-20261018/logout.webp';img.alt='';logout.replaceChildren(img);
        let confirmed=false;
        const dialog=element('dialog','spatial-logout-dialog');dialog.setAttribute('aria-label','로그아웃 확인');
        const question=element('p','','로그아웃하시겠습니까?');
        const cancel=element('button','','취소'), accept=element('button','','로그아웃');cancel.type=accept.type='button';
        dialog.append(question,cancel,accept);view.append(dialog);
        logout.addEventListener('click',event=>{if(confirmed){confirmed=false;return;}event.preventDefault();event.stopImmediatePropagation();dialog.showModal();cancel.focus();},true);
        cancel.addEventListener('click',()=>dialog.close());
        accept.addEventListener('click',()=>{dialog.close();confirmed=true;logout.click();});
        dialog.addEventListener('close',()=>logout.focus());right.append(logout);
      }
      frame.append(left,right);view.classList.add('place-controls-ready');
    }
    window.dispatchEvent(new Event('dj48-town-controls-ready'));
  }
  function init() {
    if(document.documentElement.dataset.spatialReady) return;
    document.documentElement.dataset.spatialReady = 'true';
    town();
    home(); plazas(); shop(); school();
    placeControls();
    legacyModalBridge();
    window.DJ48TownAvatar?.sync();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
