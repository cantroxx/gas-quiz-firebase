(function(root) {
  'use strict';
  const el = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if(text !== undefined) n.textContent = text; return n; };
  const button = (label, dataset, cls = '') => { const n = el('button', cls, label); n.type = 'button'; Object.assign(n.dataset, dataset); return n; };
  const art = (name, cls = '') => { const n = el('img', cls); n.src = `/images/classroom/cards/${name}-320.webp`; n.alt = ''; n.width = 160; n.height = 160; n.decoding = 'async'; return n; };
  const amount = value => Number(value || 0).toLocaleString('ko-KR', {maximumFractionDigits: 2});
  function render(data, deps, helpers) {
    const grid = document.getElementById('classroom-today-grid');
    if(!grid) return;
    const me = (data.home || data.studentCards || []).find(s => s.memberUserId === deps.currentMemberUserId) || {};
    const ready = deps.previewReadyKeys ? new Set(deps.previewReadyKeys) : null;
    const region = (node, name, loaded) => {
      node.dataset.classroomHomeRegion = name;
      if(ready && !loaded(ready)) { node.replaceChildren(el('span','','불러오는 중…')); node.setAttribute('aria-busy','true'); }
      return node;
    };
    const economy = data.economyBoard || {}, progress = data.progressMap || {};
    const quests = helpers.quests, pending = quests.filter(q => !progress[q.id]);
    grid.replaceChildren();
    const layout = el('div', 'classroom-card-home');
    const main = el('div', 'classroom-card-home-main');
    const greeting = el('header', 'classroom-card-welcome');
    greeting.append(el('p', '', '오늘도 함께 자라는 우리 교실'), el('h3', '', `${me.nickname || me.name || '나'}의 하루`));
    main.append(greeting);
    const card = el('section', 'classroom-personal-card');
    card.setAttribute('aria-label', '내 학생 카드');
    const profile = el('div', 'classroom-personal-profile');
    const portrait = button('', {classroomEditPortrait: ''}, 'classroom-home-avatar');
    portrait.setAttribute('aria-label', '내 교실 이미지 설정');
    helpers.fillPortrait(portrait, me, deps);
    const identity = el('div', 'classroom-personal-identity');
    identity.append(el('span', 'classroom-image-source', me.portraitSource === 'avatar' ? '상점 코디 사용 중' : '내 설정 이미지'),
      el('h4', '', `${me.studentNumber ? `${me.studentNumber} ` : ''}${me.nickname || me.name || '나'}`),
      button('이미지 변경', {classroomEditPortrait: ''}, 'classroom-portrait-edit'));
    identity.append(el('small', '', '내 이미지 또는 상점 아바타 선택'));
    profile.append(portrait, identity); card.append(region(profile,'identity',r=>r.has('home')||r.has('students')));
    const shortcuts = el('div', 'classroom-card-shortcuts');
    for(const [label, icon, target] of [['일기 쓰기','/images/classroom/stationery/notebook-160.webp',{classroomDiary:'mine'}], ['우리반 일기','/images/classroom/cards/owl-notice-320.webp',{classroomDiary:'friends'}], ['나의 젬','/images/classroom-icons/keyring-gem.svg',{classroomTodayTab:'gems'}]]) {
      const action = button('', target); const symbol = el('img',''); symbol.src=icon;symbol.alt='';symbol.width=64;symbol.height=64;symbol.decoding='async';
      action.append(symbol, el('strong','',label)); shortcuts.append(action);
    }
    card.append(shortcuts);
    const wallet = el('div','classroom-card-wallet');
    const level = me.levelSummary?.level ?? me.level;
    wallet.append(el('div','',`레벨 ${level ?? '—'}`), region(button(`${amount(data.wallet?.point)} P`,{classroomTodayTab:'bank'}),'point',r=>r.has('wallet')),
      region(button(`${amount(economy.myDjCoin ?? me.djCoin)} DJ코인`,{classroomTodayTab:'market'}),'coin',r=>r.has('home')||r.has('economy')));
    card.append(wallet); main.append(card);
    const invitation = button('', {classroomDiary:'mine'}, 'classroom-diary-invite');
    invitation.append(el('span','classroom-invite-sun','☀'), el('strong','','오늘 어떤 하루였어?'), el('span','','마음 일기 쓰기 →'));
    main.append(invitation);
    const friends = el('section','classroom-home-friends');
    const friendsHead = el('div','classroom-card-section-heading');
    friendsHead.append(el('h4','','우리반 친구들'),button('공개 일기 보기',{classroomDiary:'friends'})); friends.append(friendsHead);
    if(deps.homeOnly) friends.append(el('p','','친구들의 공개 일기는 ‘공개 일기 보기’에서 만나요.'));
    else {
      const strip = el('div','classroom-friend-strip');
      (data.studentCards || []).filter(s => s.memberUserId !== deps.currentMemberUserId).forEach(student => {
        const b = button('',{classroomDiary:'friend',classroomDiaryOwner:student.memberUserId});
        const face = el('span','classroom-friend-face'); helpers.fillPortrait(face,student,deps);
        b.append(face,el('span','',student.nickname || student.name || '친구'));strip.append(b);
      });
      friends.append(strip);
    }
    main.append(friends);
    const aside = el('aside','classroom-card-activities classroom-checklist-section');
    aside.append(el('h3','','오늘의 활동'));
    const notices = (economy.classNotices?.slots || []).filter(n => n.text);
    const notice = el('details','classroom-activity-tile classroom-activity-notice');
    const summary = el('summary',''); summary.append(art('owl-notice'),el('strong','','학급 알림'));
    notice.append(summary);
    if(deps.homeOnly) notice.append(button('학급 소식 불러오기',{classroomHomeDetails:''}));
    else if(notices.length) notices.forEach(n => notice.append(el('p','',`${n.label || '알림'} · ${n.text}`)));
    else notice.append(el('p','','새로운 학급 소식이 없습니다.'));
    aside.append(notice);
    const questTile = el('section','classroom-activity-tile classroom-activity-quest');
    const questHead = button('',{classroomTodayTab:'quest'},'classroom-activity-heading');
    questHead.append(art('fox-quest'),el('strong','','오늘의 퀘스트'),el('span','',`${quests.length}개 중 ${quests.length-pending.length}개 확인`));
    questTile.append(questHead);
    pending.slice(0,2).forEach(q => { const row=el('div','classroom-card-quest'); row.append(el('span','',q.title),
      button(q.rewardMode === 'auto' ? '완료 체크' : '검토 요청',{classroomQuestAction:q.id}));questTile.append(row); });
    if(!pending.length) questTile.append(el('p','',quests.length ? '오늘 퀘스트를 모두 확인했어요.' : '오늘 등록된 퀘스트가 없습니다.'));
    aside.append(region(questTile,'quests',r=>r.has('settings')&&r.has('progress')));
    const routine = button('',{classroomTodayTab:'routine'},'classroom-activity-tile classroom-activity-routine');
    routine.append(art('bunny-routine'),el('strong','','성장루틴'),el('span','','오늘의 습관 체크하기 →'));aside.append(routine);
    const mission = button('',{classroomTodayTab:'mission'},'classroom-activity-tile classroom-activity-mission');
    const tree=el('img','');tree.src='/images/classroom/community-tree-320.webp';tree.alt='';tree.width=160;tree.height=160;tree.decoding='async';
    mission.append(tree,el('strong','','우리반 미션'),el('span','',economy.classMission?.title || '함께 만드는 목표 보기 →'));aside.append(mission);
    layout.append(main,aside);grid.append(layout);
  }
  root.DJ48ClassroomCardHome = {render};
})(window);
