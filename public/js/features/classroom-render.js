(function () {
  const CLASSROOM_ICON_BASE = 'images/classroom-icons/';
  const CLASSROOM_ICON_ASSETS = {
    djCoin: `${CLASSROOM_ICON_BASE}dj-coin.svg`,
    pointToken: `${CLASSROOM_ICON_BASE}point-token.svg`,
    bank: `${CLASSROOM_ICON_BASE}bank.svg`,
    exchange: `${CLASSROOM_ICON_BASE}exchange.svg`,
    pointShop: `${CLASSROOM_ICON_BASE}point-shop.svg`,
    coinShop: `${CLASSROOM_ICON_BASE}coin-shop.svg`,
    groupPurchase: `${CLASSROOM_ICON_BASE}group-purchase.svg`,
    inventory: `${CLASSROOM_ICON_BASE}inventory.svg`,
    studentCard: `${CLASSROOM_ICON_BASE}student-card.svg`,
    quest: `${CLASSROOM_ICON_BASE}quest.svg`,
    routine: `${CLASSROOM_ICON_BASE}routine.svg`,
    mission: `${CLASSROOM_ICON_BASE}mission.svg`,
    keyringStar: `${CLASSROOM_ICON_BASE}keyring-star.svg`,
    keyringGem: `${CLASSROOM_ICON_BASE}keyring-gem.svg`,
    keyringHeart: `${CLASSROOM_ICON_BASE}keyring-heart.svg`,
    billboard: `${CLASSROOM_ICON_BASE}billboard.svg`,
    'boost-farmer-friend': `${CLASSROOM_ICON_BASE}boost-scarecrow.svg`,
    'boost-big-tree': `${CLASSROOM_ICON_BASE}boost-tree.svg`,
    'boost-fountain': `${CLASSROOM_ICON_BASE}boost-fountain.svg`,
    'boost-mini-tractor': `${CLASSROOM_ICON_BASE}boost-tractor.svg`,
    'boost-ripe-rice': `${CLASSROOM_ICON_BASE}boost-rice.svg`,
    'boost-truck': `${CLASSROOM_ICON_BASE}boost-truck.svg`,
    'boost-log-pile': `${CLASSROOM_ICON_BASE}boost-logs.svg`,
    'boost-bird-speaker': `${CLASSROOM_ICON_BASE}boost-bird-speaker.svg`,
    'boost-chick': `${CLASSROOM_ICON_BASE}boost-chick.svg`,
    'boost-liquid-fertilizer': `${CLASSROOM_ICON_BASE}boost-fertilizer.svg`
  };

  function getClassroomIconAssetUrl(key) {
    return CLASSROOM_ICON_ASSETS[String(key || '')] || '';
  }

  function createClassroomIconImage(key, alt = '', className = 'classroom-inline-icon') {
    const src = getClassroomIconAssetUrl(key);
    if(!src) return null;
    const image = document.createElement('img');
    image.className = className;
    image.src = src;
    image.alt = alt;
    image.loading = 'lazy';
    return image;
  }

  function getClassroomShopIconKey(item = {}) {
    if(item.imageUrl || item.iconUrl || item.thumbnailUrl) return '';
    if(item.itemId && getClassroomIconAssetUrl(item.itemId)) return item.itemId;
    if(item.icon && getClassroomIconAssetUrl(item.icon)) return item.icon;
    if(item.itemType === 'billboardTicket') return 'billboard';
    if(item.priceType === 'djCoin') return 'coinShop';
    return 'pointShop';
  }

  function getClassroomKeyringIconKey(student = {}) {
    const keyring = student.selectedKeyring || {};
    const badge = student.selectedBadge || {};
    const haystack = `${keyring.keyringId || ''} ${keyring.label || ''} ${keyring.icon || ''} ${badge.badgeId || ''} ${badge.label || ''} ${badge.icon || ''}`.toLowerCase();
    if(haystack.includes('keyringgem') || haystack.includes('gem') || haystack.includes('젬') || haystack.includes('◇') || haystack.includes('◆')) return 'keyringGem';
    if(haystack.includes('keyringheart') || haystack.includes('heart') || haystack.includes('하트') || haystack.includes('♥')) return 'keyringHeart';
    return 'keyringStar';
  }

  function getClassroomQuestTitle(settings, questId) {
    return window.DJ48ClassroomDomain.getClassroomQuestTitle(settings, questId);
  }

  function getClassroomProgressStatusLabel(progress) {
    return window.DJ48ClassroomDomain.getClassroomProgressStatusLabel(progress);
  }

  function getClassroomProgressButtonLabel(progress) {
    return window.DJ48ClassroomDomain.getClassroomProgressButtonLabel(progress);
  }

  function getClassroomProgressStatusClass(progress) {
    return window.DJ48ClassroomDomain.getClassroomProgressStatusClass(progress);
  }

  function renderClassroomReviewList(settings, reviewItems = [], options = {}, deps = {}) {
    const status = document.getElementById(options.statusId || 'classroom-review-status');
    const grid = document.getElementById(options.gridId || 'classroom-review-grid');
    if(!status || !grid) return;

    const canReview = deps.isCurrentClassroomTeacher?.(settings) === true;
    grid.innerHTML = '';
    if(!canReview) {
      status.textContent = '담임 권한이 있어야 확인 대기 목록을 볼 수 있습니다.';
      return;
    }

    if(!reviewItems.length) {
      status.textContent = '현재 확인 대기 중인 퀘스트가 없습니다.';
      return;
    }

    status.textContent = `${reviewItems.length}건이 담임 확인을 기다리고 있습니다.`;
    reviewItems.forEach(item => {
      const card = document.createElement('article');
      const title = document.createElement('h4');
      const meta = document.createElement('p');
      const state = document.createElement('span');
      const actions = document.createElement('div');
      const approveButton = document.createElement('button');
      const rejectButton = document.createElement('button');
      card.className = 'classroom-review-card';
      title.textContent = getClassroomQuestTitle(settings, item.questId);
      meta.textContent = `${item.memberUserId || '-'} · 보상 예정 ${Number(item.rewardCoin || 0)} ${deps.getClassroomRewardCurrencyLabel?.(item.rewardCurrency) || '포인트'}`;
      state.className = 'quest-status quest-status-ready';
      state.textContent = '확인 대기';
      actions.className = 'classroom-review-actions';
      approveButton.className = 'quest-claim-button';
      approveButton.type = 'button';
      approveButton.dataset.classroomReviewAction = 'approved';
      approveButton.dataset.classroomReviewId = item.recordId || item.id || '';
      approveButton.textContent = '승인';
      rejectButton.className = 'quest-claim-button danger';
      rejectButton.type = 'button';
      rejectButton.dataset.classroomReviewAction = 'rejected';
      rejectButton.dataset.classroomReviewId = item.recordId || item.id || '';
      rejectButton.textContent = '반려';
      actions.append(approveButton, rejectButton);
      card.append(title, meta, state, actions);
      grid.appendChild(card);
    });
  }

  function renderClassroomReviewPanel(settings, reviewItems = [], deps = {}) {
    const panel = document.getElementById('classroom-teacher-review-panel');
    if(!panel) return;
    panel.hidden = deps.isCurrentClassroomTeacher?.(settings) !== true;
    if(panel.hidden) return;
    renderClassroomReviewList(settings, reviewItems, {
      statusId: 'classroom-review-status',
      gridId: 'classroom-review-grid'
    }, deps);
  }

  function renderClassroomRoleState(settings, wallet = {}, deps = {}, data = {}) {
    const questAlert = document.getElementById('classroom-alert-quest');
    const routineAlert = document.getElementById('classroom-alert-routine');
    const pointCount = document.getElementById('classroom-summary-point-count');
    const progressMap = data.progressMap || {};
    const quests = (settings.quests || []).filter(quest => quest.active !== false && quest.saveEnabled !== false);
    const pendingQuestCount = quests.filter(quest => !progressMap[quest.id]).length;
    const routines = Array.isArray(data.economyBoard?.routines) ? data.economyBoard.routines : [];
    const pendingRoutineCount = routines.filter(routine => (
      routine.status !== 'completed'
      && routine.checkedToday !== true
      && routine.canCheckToday !== false
    )).length;
    if(pointCount) pointCount.textContent = `${Number(wallet.point || 0).toLocaleString('ko-KR')}점`;
    if(questAlert) {
      questAlert.classList.toggle('is-active', pendingQuestCount > 0);
      questAlert.textContent = pendingQuestCount > 0 ? `퀘스트 ${pendingQuestCount}` : '퀘스트';
      questAlert.setAttribute('aria-pressed', String(pendingQuestCount > 0));
    }
    if(routineAlert) {
      routineAlert.classList.toggle('is-active', pendingRoutineCount > 0);
      routineAlert.textContent = pendingRoutineCount > 0 ? `성장루틴 ${pendingRoutineCount}` : '성장루틴';
      routineAlert.setAttribute('aria-pressed', String(pendingRoutineCount > 0));
    }
  }

  function renderClassroomTeacherDashboard(data = {}, deps = {}) {
    const panel = document.getElementById('classroom-teacher-dashboard');
    const grid = document.getElementById('classroom-teacher-dashboard-grid');
    if(!panel || !grid) return;

    const settings = data.settings || {};
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    panel.hidden = !canManage;
    grid.innerHTML = '';
    if(!canManage) return;

    const economyBoard = data.economyBoard || {};
    const studentCards = Array.isArray(data.studentCards) ? data.studentCards : [];
    const reviewItems = Array.isArray(data.reviewItems) ? data.reviewItems : [];
    const applications = Array.isArray(economyBoard.applications) ? economyBoard.applications : [];
    const assignments = Array.isArray(economyBoard.assignments) ? economyBoard.assignments : [];
    const shopItems = Array.isArray(economyBoard.shopItems) ? economyBoard.shopItems : [];
    const routines = Array.isArray(economyBoard.routines) ? economyBoard.routines : [];
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const pointLogs = Array.isArray(economyBoard.pointLogs) ? economyBoard.pointLogs : [];
    const totalPoint = studentCards.reduce((sum, student) => sum + Number(student.point || 0), 0);
    const pendingApplications = applications.filter(item => item.status === 'pending').length;
    const activeAssignments = assignments.filter(item => item.status === 'active').length;
    const activeRoutines = routines.filter(item => item.status !== 'deleted').length;
    const pendingUseRequests = purchases.filter(item => item.status === 'use_requested').length;
    const unassignedStudents = studentCards.filter(student => !assignments.some(item => item.memberUserId === student.memberUserId && item.status === 'active')).length;
    const earnedPoint = pointLogs.filter(item => Number(item.rewardAmount || item.rewardPoint || 0) > 0)
      .reduce((sum, item) => sum + Number(item.rewardAmount || item.rewardPoint || 0), 0);
    const spentPoint = Math.abs(pointLogs.filter(item => Number(item.rewardAmount || item.rewardPoint || 0) < 0)
      .reduce((sum, item) => sum + Number(item.rewardAmount || item.rewardPoint || 0), 0));
    const items = [
      ['확인 대기', `${reviewItems.length}건`, '퀘스트 승인/반려가 필요한 기록', 'review'],
      ['쿠폰 요청', `${pendingUseRequests}건`, '학생이 사용 승인을 기다리는 상점 쿠폰', 'shop'],
      ['직업 지원', `${pendingApplications}건`, `${activeAssignments}명이 현재 직업을 맡고 있습니다`, 'job'],
      ['미배정 학생', `${unassignedStudents}명`, `전체 학생 ${studentCards.length}명 중 직업 미배정`, 'student'],
      ['포인트 지급', `${earnedPoint.toLocaleString('ko-KR')}`, '최근 교실 활동으로 지급된 포인트', 'reward'],
      ['포인트 사용', `${spentPoint.toLocaleString('ko-KR')}`, '최근 상점 구매로 사용된 포인트', 'shop'],
      ['학생 현황', `${studentCards.length}명`, `전체 보유 포인트 ${totalPoint.toLocaleString('ko-KR')}`, 'student'],
      ['상점 상품', `${shopItems.length}개`, '학생이 포인트로 구매할 수 있는 상품', 'shop'],
      ['성장루틴', `${activeRoutines}개`, '현재 학생 계정에서 확인되는 루틴', 'routine']
    ];

    items.forEach(([label, value, detail, tone]) => {
      const card = document.createElement('article');
      const labelEl = document.createElement('span');
      const valueEl = document.createElement('strong');
      const detailEl = document.createElement('p');
      card.className = `classroom-teacher-dashboard-card classroom-teacher-dashboard-card--${tone}`;
      labelEl.textContent = label;
      valueEl.textContent = value;
      detailEl.textContent = detail;
      card.append(labelEl, valueEl, detailEl);
      grid.appendChild(card);
    });
  }

  function renderClassroomTeacherReport(data = {}, deps = {}) {
    const report = document.getElementById('classroom-teacher-report');
    if(!report) return;
    const settings = data.settings || {};
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    report.innerHTML = '';
    if(!canManage) return;
    const economyBoard = data.economyBoard || {};
    const studentCards = Array.isArray(data.studentCards) ? data.studentCards : [];
    const reviewItems = Array.isArray(data.reviewItems) ? data.reviewItems : [];
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const assignments = Array.isArray(economyBoard.assignments) ? economyBoard.assignments : [];
    const applications = Array.isArray(economyBoard.applications) ? economyBoard.applications : [];
    const pointLogs = Array.isArray(economyBoard.pointLogs) ? economyBoard.pointLogs : [];
    const sections = [
      ['포인트 상위 학생', studentCards.slice().sort((a, b) => Number(b.point || 0) - Number(a.point || 0)).slice(0, 5).map(item => `${item.nickname || item.memberUserId}: ${Number(item.point || 0).toLocaleString('ko-KR')}점`)],
      ['퀘스트 대기', reviewItems.slice(0, 5).map(item => `${item.memberUserId || '-'} · ${getClassroomQuestTitle(settings, item.questId)} · ${getClassroomProgressStatusLabel(item)}`)],
      ['쿠폰 현황', purchases.slice(0, 5).map(item => `${item.memberUserId || '-'} · ${item.itemTitle || '쿠폰'} · ${getClassroomPurchaseStatusLabel(item.status)}`)],
      ['직업 현황', assignments.slice(0, 5).map(item => `${item.memberUserId || '-'} · ${item.jobTitle || item.jobId || '직업'} · ${item.status || '-'}`)],
      ['지원 대기', applications.filter(item => item.status === 'pending').slice(0, 5).map(item => `${item.memberUserId || '-'} · ${item.jobTitle || item.jobId || '직업'}`)],
      ['최근 포인트 로그', pointLogs.slice(0, 5).map(getClassroomActivityLabel)]
    ];
    sections.forEach(([titleText, rows], index) => {
      const section = document.createElement('article');
      const title = document.createElement('h4');
      const list = document.createElement('ul');
      section.className = `classroom-report-section classroom-report-section--${index + 1}`;
      title.textContent = titleText;
      (rows.length ? rows : ['표시할 항목이 없습니다.']).forEach(text => {
        const row = document.createElement('li');
        row.textContent = text;
        list.appendChild(row);
      });
      section.append(title, list);
      report.appendChild(section);
    });
  }

  function renderClassroomTodayHome(data = {}, deps = {}) {
    const grid = document.getElementById('classroom-today-grid');
    if(!grid) return;
    const settings = data.settings || {};
    const economyBoard = data.economyBoard || {};
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const progressMap = data.progressMap || {};
    const currentMemberUserId = deps.currentMemberUserId || '';
    const quests = (settings.quests || []).filter(quest => quest.active !== false && quest.saveEnabled !== false);
    const pendingQuests = quests.filter(quest => !progressMap[quest.id]);
    const routines = Array.isArray(economyBoard.routines) ? economyBoard.routines : [];
    const todayRoutines = routines.filter(routine => (
      routine.status !== 'completed'
      && routine.checkedToday !== true
      && routine.canCheckToday !== false
    ));
    const gemProgress = Array.isArray(data.gemProgress) ? data.gemProgress : [];
    const completedGems = gemProgress.filter(gem => gem.completed === true);
    const studentCards = Array.isArray(data.studentCards) ? data.studentCards : [];
    const myStudentCard = studentCards.find(student => student.memberUserId === currentMemberUserId) || {};
    const studentNameMap = Object.fromEntries(studentCards.map(student => [
      String(student.memberUserId || ''),
      student.nickname || student.name || ''
    ]).filter(([id]) => id));
    const selectedKeyringLabel = myStudentCard.selectedKeyring?.label || myStudentCard.selectedBadge?.label || '';
    const classMission = economyBoard.classMission || null;
    const shopItems = Array.isArray(economyBoard.shopItems) ? economyBoard.shopItems : [];
    const billboardMessages = Array.isArray(economyBoard.billboardMessages) ? economyBoard.billboardMessages : [];
    const noticeSlots = Array.isArray(economyBoard.classNotices?.slots) ? economyBoard.classNotices.slots : [];
    const activeNoticeSlots = noticeSlots.filter(slot => String(slot.text || '').trim());
    grid.innerHTML = '';
    const map = document.createElement('article');
    const boardSection = document.createElement('section');
    const boardHeading = document.createElement('h3');
    const board = document.createElement('div');
    const noteGrid = document.createElement('div');
    const marquee = document.createElement('div');
    const featureGrid = document.createElement('div');
    const checklistSection = document.createElement('section');
    const checklistHeading = document.createElement('h3');
    const checklistGrid = document.createElement('div');
    const messageItems = billboardMessages.length
      ? billboardMessages.slice(0, 5).map(item => {
        const nickname = studentNameMap[String(item.memberUserId || '')] || '';
        return {
          id: item.messageId || '',
          text: nickname ? `${nickname}: ${item.text}` : item.text
        };
      })
      : [];
    const featureItems = [
      ['교실', '+', 'classroom', 'secondary'],
      ['젬스톤', '◇', 'gems', 'primary'],
      ['직업', '■', 'jobs', 'secondary'],
      ['마켓', '▥', 'market', 'shop']
    ];
    const checklistItems = [
      classMission ? ['학급 미션', classMission.remainingPoint ? `${Number(classMission.remainingPoint || 0).toLocaleString('ko-KR')}점 남음` : '전체 달성!', 'classroom', 'mission'] : null,
      ['체크할 퀘스트', `${pendingQuests.length}건 대기중`, 'classroom', 'assignment'],
      ['성장루틴 확인', todayRoutines.length ? `${todayRoutines.length}건 남음` : '모두 완료됨', 'classroom', 'routine']
    ].filter(Boolean).concat(canManage ? [['승인 대기', `${(Array.isArray(data.reviewItems) ? data.reviewItems.length : 0)}건 확인`, 'teacher', 'review']] : []);
    const marqueeText = activeNoticeSlots[0]?.text || '이번 주 금요일은 현장체험학습일입니다. 준비물을 꼭 확인해 주세요.';

    const createNavButton = (tabName, teacherTarget = '') => {
      const button = document.createElement('button');
      button.className = 'classroom-feature-button';
      button.type = 'button';
      button.dataset.classroomTodayTab = tabName;
      if(teacherTarget) button.dataset.classroomTeacherTarget = teacherTarget;
      return button;
    };

    map.className = 'classroom-visual-map';
    boardSection.className = 'classroom-bulletin-section';
    boardHeading.className = 'classroom-visual-section-title';
    boardHeading.textContent = '우리반 게시판';
    board.className = 'classroom-bulletin-board';
    noteGrid.className = 'classroom-bulletin-notes';
    if(!messageItems.length) {
      const emptyNote = document.createElement('article');
      emptyNote.className = 'classroom-bulletin-note classroom-bulletin-note--empty';
      emptyNote.textContent = '아직 올라온 한마디가 없습니다.';
      noteGrid.appendChild(emptyNote);
    }
    messageItems.forEach((message, index) => {
      const note = document.createElement('article');
      const text = document.createElement('span');
      note.className = `classroom-bulletin-note classroom-bulletin-note--${(index % 4) + 1}`;
      text.textContent = message.text || '';
      note.appendChild(text);
      if(canManage && message.id) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'classroom-billboard-delete-button';
        deleteButton.type = 'button';
        deleteButton.dataset.classroomBillboardDeleteId = message.id;
        deleteButton.setAttribute('aria-label', '전광판 글 삭제');
        deleteButton.textContent = '×';
        note.appendChild(deleteButton);
      }
      noteGrid.appendChild(note);
    });
    marquee.className = 'classroom-bulletin-marquee';
    marquee.innerHTML = '<span aria-hidden="true">📣</span>';
    const marqueeCopy = document.createElement('p');
    marqueeCopy.textContent = marqueeText;
    marquee.appendChild(marqueeCopy);
    board.append(noteGrid, marquee);
    if(activeNoticeSlots.length) {
      const noticePanel = document.createElement('details');
      const noticeSummary = document.createElement('summary');
      const noticeList = document.createElement('div');
      noticePanel.className = 'classroom-notice-panel';
      noticeSummary.textContent = '학급 알림';
      noticeList.className = 'classroom-notice-slot-list';
      activeNoticeSlots.forEach(slot => {
        const item = document.createElement('article');
        const label = document.createElement('strong');
        const text = document.createElement('p');
        item.className = 'classroom-notice-slot';
        item.style.setProperty('--notice-slot-color', slot.color || '#64a8fe');
        label.textContent = slot.label || '알림';
        text.textContent = slot.text || '';
        item.append(label, text);
        noticeList.appendChild(item);
      });
      noticePanel.append(noticeSummary, noticeList);
      board.appendChild(noticePanel);
    }
    boardSection.append(boardHeading, board);

    if(classMission) {
      const missionPanel = document.createElement('section');
      const missionTitle = document.createElement('h3');
      const missionDesc = document.createElement('p');
      const missionTrack = document.createElement('div');
      const missionList = document.createElement('div');
      const targetMax = Math.max(...(classMission.thresholds || []).map(item => Number(item.targetPoint || 0)), 1);
      missionPanel.className = 'classroom-mission-panel';
      missionTitle.className = 'classroom-visual-section-title';
      missionTitle.textContent = classMission.title || '학급 미션';
      missionDesc.textContent = `${Number(classMission.totalPoint || 0).toLocaleString('ko-KR')}점 모음${classMission.remainingPoint ? ` · 다음 목표까지 ${Number(classMission.remainingPoint || 0).toLocaleString('ko-KR')}점` : ' · 모든 목표 달성'}`;
      missionTrack.className = 'classroom-mission-track';
      missionList.className = 'classroom-mission-step-list';
      (classMission.thresholds || []).forEach(step => {
        const marker = document.createElement('span');
        const row = document.createElement('span');
        marker.className = `classroom-mission-marker${step.achieved ? ' is-achieved' : ''}`;
        marker.style.setProperty('--mission-position', `${Math.min(100, Math.round((Number(step.targetPoint || 0) / targetMax) * 100))}%`);
        marker.textContent = step.achieved ? '✓' : Number(step.targetPoint || 0).toLocaleString('ko-KR');
        marker.title = `${step.label || '목표'} ${Number(step.targetPoint || 0).toLocaleString('ko-KR')}점${step.rewardText ? ` · ${step.rewardText}` : ''}`;
        missionTrack.appendChild(marker);
        row.className = `classroom-mission-step${step.achieved ? ' is-achieved' : ''}`;
        row.textContent = `${step.achieved ? '✓ ' : ''}${step.label || `${Number(step.targetPoint || 0).toLocaleString('ko-KR')}점`} · ${Number(step.targetPoint || 0).toLocaleString('ko-KR')}점${step.rewardText ? ` · ${step.rewardText}` : ''}`;
        missionList.appendChild(row);
      });
      missionPanel.append(missionTitle, missionDesc, missionTrack, missionList);
      boardSection.appendChild(missionPanel);
    }

    featureGrid.className = 'classroom-feature-grid';
    featureItems.forEach(([label, icon, tabName, tone, teacherTarget]) => {
      const button = createNavButton(tabName, teacherTarget);
      const iconEl = document.createElement('span');
      const labelEl = document.createElement('strong');
      button.classList.add(`classroom-feature-button--${tone}`);
      iconEl.className = 'classroom-feature-icon';
      iconEl.textContent = icon;
      labelEl.textContent = label;
      button.append(iconEl, labelEl);
      featureGrid.appendChild(button);
    });

    checklistSection.className = 'classroom-checklist-section';
    checklistHeading.className = 'classroom-visual-section-title classroom-visual-section-title--checklist';
    checklistHeading.textContent = '오늘 확인할 일';
    checklistGrid.className = 'classroom-checklist-grid';
    checklistItems.forEach(([label, detail, tabName, tone, teacherTarget]) => {
      const item = document.createElement('button');
      const iconEl = document.createElement('span');
      const copy = document.createElement('span');
      const labelEl = document.createElement('strong');
      const detailEl = document.createElement('small');
      const arrow = document.createElement('span');
      item.className = `classroom-checklist-item classroom-checklist-item--${tone}`;
      item.type = 'button';
      item.dataset.classroomTodayTab = tabName;
      if(teacherTarget) item.dataset.classroomTeacherTarget = teacherTarget;
      iconEl.className = 'classroom-checklist-icon';
      copy.className = 'classroom-checklist-copy';
      arrow.className = 'classroom-checklist-arrow';
      iconEl.textContent = tone === 'assignment' ? '▣' : tone === 'routine' ? '✓' : '!';
      labelEl.textContent = label;
      detailEl.textContent = detail;
      arrow.textContent = '›';
      copy.append(labelEl, detailEl);
      item.append(iconEl, copy, arrow);
      checklistGrid.appendChild(item);
    });
    checklistSection.append(checklistHeading, checklistGrid);

    map.append(boardSection, featureGrid, checklistSection);
    grid.appendChild(map);
  }

  function getClassroomPurchaseStatusLabel(status = '') {
    if(status === 'use_requested') return '사용 요청';
    if(status === 'use_approved') return '사용 승인';
    if(status === 'use_rejected') return '요청 반려';
    if(status === 'used') return '사용 완료';
    if(status === 'refunded') return '환불 완료';
    return '보유 중';
  }

  function getClassroomActivityLabel(item = {}) {
    if(item.itemTitle) return `${item.memberUserId || '학생'} · ${item.itemTitle} 구매`;
    if(item.jobTitle) return `${item.memberUserId || '학생'} · ${item.jobTitle} 월급`;
    if(item.type === 'classroom_routine_reward') return `${item.memberUserId || '학생'} · 루틴 보상`;
    return `${item.memberUserId || '학생'} · 포인트 ${Number(item.rewardAmount || item.rewardPoint || 0).toLocaleString('ko-KR')}`;
  }

  function renderClassroomActivityFeed(economyBoard = {}) {
    const feed = document.getElementById('classroom-activity-feed');
    if(!feed) return;
    const pointLogs = Array.isArray(economyBoard.pointLogs) ? economyBoard.pointLogs : [];
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const useRequests = purchases.filter(item => ['use_requested', 'use_approved', 'used'].includes(item.status))
      .map(item => ({
        label: `${item.memberUserId || '학생'} · ${item.itemTitle || '쿠폰'} ${getClassroomPurchaseStatusLabel(item.status)}`,
        createdAtMillis: item.usedAtMillis || item.approvedAtMillis || item.requestedAtMillis || item.createdAtMillis || 0
      }));
    const activities = [
      ...useRequests,
      ...pointLogs.map(item => ({
        label: getClassroomActivityLabel(item),
        createdAtMillis: item.createdAtMillis || 0
      }))
    ].sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0)).slice(0, 5);
    feed.innerHTML = '';
    if(!activities.length) return;
    const title = document.createElement('h4');
    const list = document.createElement('ul');
    title.textContent = '최근 교실 활동';
    activities.forEach(item => {
      const row = document.createElement('li');
      row.textContent = item.label;
      list.appendChild(row);
    });
    feed.append(title, list);
  }

  function createClassroomCardIcon(kind = 'default', text = '') {
    const icon = document.createElement('span');
    icon.className = `classroom-card-icon classroom-card-icon--${kind}`;
    icon.textContent = text;
    return icon;
  }

  function createClassroomProgressMeter(percent = 0) {
    const meter = document.createElement('span');
    const fill = document.createElement('span');
    const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    meter.className = 'classroom-progress-meter';
    fill.style.width = `${safePercent}%`;
    meter.appendChild(fill);
    return meter;
  }

  function formatClassroomPoint(value) {
    return Number(value || 0).toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function renderClassroomQuestCards(settings = {}, progressMap = {}, deps = {}) {
    const grid = document.getElementById('classroom-quest-grid');
    if(!grid) return;
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    grid.innerHTML = '';
    (settings.quests || []).filter(quest => quest.active !== false).forEach(quest => {
      const progress = progressMap[quest.id] || null;
      const card = document.createElement('article');
      const icon = createClassroomCardIcon('quest', 'Q');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const button = document.createElement('button');
      const actions = document.createElement('div');
      const rewardCurrencyLabel = deps.getClassroomRewardCurrencyLabel?.(quest.rewardCurrency) || '포인트';
      const targetCount = Array.isArray(quest.targetStudentIds) ? quest.targetStudentIds.length : 0;
      const repeatLabel = quest.repeatRule === 'daily' ? '매일' : quest.repeatRule === 'weekly' ? '매주' : '한 번';
      card.className = `classroom-card classroom-card--quest${progress ? ' is-complete' : ''}`;
      card.dataset.classroomQuestId = quest.id;
      badge.className = 'classroom-card-badge';
      badge.textContent = quest.type;
      title.textContent = quest.title;
      desc.textContent = quest.desc;
      reward.className = 'classroom-card-reward';
      reward.textContent = quest.linkedGemId && quest.gemXp > 0
        ? `예상 보상: ${quest.rewardCoin} ${rewardCurrencyLabel} · ${quest.linkedGemName || quest.linkedGemId} +${quest.gemXp}xp · ${repeatLabel} · ${targetCount ? `${targetCount}명 대상` : '전체 대상'}`
        : `예상 보상: ${quest.rewardCoin} ${rewardCurrencyLabel} · ${repeatLabel} · ${targetCount ? `${targetCount}명 대상` : '전체 대상'}`;
      status.className = `quest-status ${progress ? getClassroomProgressStatusClass(progress) : 'quest-status-active'}`;
      status.textContent = progress ? getClassroomProgressStatusLabel(progress) : quest.status;
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomQuestAction = quest.id;
      button.disabled = !quest.saveEnabled || !!progress;
      button.textContent = progress ? getClassroomProgressButtonLabel(progress) : (quest.studentAction || '저장 연결 예정');
      actions.className = 'classroom-review-actions';
      actions.appendChild(button);
      if(canManage) {
        const editButton = document.createElement('button');
        const duplicateButton = document.createElement('button');
        const upButton = document.createElement('button');
        const downButton = document.createElement('button');
        const deactivateButton = document.createElement('button');
        editButton.className = 'quest-claim-button';
        editButton.type = 'button';
        editButton.dataset.classroomQuestEditId = quest.id || '';
        editButton.textContent = '수정';
        duplicateButton.className = 'quest-claim-button';
        duplicateButton.type = 'button';
        duplicateButton.dataset.classroomQuestDuplicateId = quest.id || '';
        duplicateButton.textContent = '복제';
        upButton.className = 'quest-claim-button';
        upButton.type = 'button';
        upButton.dataset.classroomQuestMoveId = quest.id || '';
        upButton.dataset.classroomQuestMoveDirection = 'up';
        upButton.textContent = '위로';
        downButton.className = 'quest-claim-button';
        downButton.type = 'button';
        downButton.dataset.classroomQuestMoveId = quest.id || '';
        downButton.dataset.classroomQuestMoveDirection = 'down';
        downButton.textContent = '아래로';
        deactivateButton.className = 'quest-claim-button danger';
        deactivateButton.type = 'button';
        deactivateButton.dataset.classroomQuestDeactivateId = quest.id || '';
        deactivateButton.textContent = '비활성화';
        actions.append(editButton, duplicateButton, upButton, downButton, deactivateButton);
      }
      card.append(icon, badge, title, desc, reward, status, actions);
      grid.appendChild(card);
    });
  }

  function renderClassroomInactiveQuestCards(settings = {}, deps = {}) {
    const grid = document.getElementById('classroom-inactive-quest-grid');
    if(!grid) return;
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const inactiveQuests = (settings.quests || []).filter(quest => quest.active === false);
    grid.innerHTML = '';
    if(!canManage || !inactiveQuests.length) return;
    const heading = document.createElement('article');
    heading.className = 'classroom-card classroom-card-muted';
    const title = document.createElement('h4');
    const desc = document.createElement('p');
    title.textContent = '비활성 퀘스트';
    desc.textContent = '숨긴 퀘스트를 다시 복구할 수 있습니다.';
    heading.append(title, desc);
    grid.appendChild(heading);
    inactiveQuests.forEach(quest => {
      const card = document.createElement('article');
      const badge = document.createElement('span');
      const titleEl = document.createElement('h4');
      const descEl = document.createElement('p');
      const button = document.createElement('button');
      card.className = 'classroom-card classroom-card-muted';
      badge.className = 'classroom-card-badge';
      badge.textContent = '숨김';
      titleEl.textContent = quest.title || '교실 퀘스트';
      descEl.textContent = quest.desc || '설명이 없습니다.';
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomQuestRestoreId = quest.id || quest.questId || '';
      button.textContent = '복구';
      card.append(badge, titleEl, descEl, button);
      grid.appendChild(card);
    });
  }

  function renderEmptyClassroomCard(grid, badgeText, titleText, descText) {
    const card = document.createElement('article');
    const badge = document.createElement('span');
    const title = document.createElement('h4');
    const desc = document.createElement('p');
    card.className = 'classroom-card classroom-card--empty';
    badge.className = 'classroom-card-badge';
    badge.textContent = badgeText;
    title.textContent = titleText;
    desc.textContent = descText;
    card.append(badge, title, desc);
    grid.appendChild(card);
  }

  function renderClassroomGemCards(gemProgress = []) {
    const grid = document.getElementById('classroom-gem-grid');
    if(!grid) return;
    grid.innerHTML = '';
    if(!gemProgress.length) {
      renderEmptyClassroomCard(grid, '진행 전', '아직 쌓인 젬 경험치가 없습니다', '젬이 연결된 교실 퀘스트를 완료하면 이곳에 진행도가 표시됩니다.');
      return;
    }
    gemProgress.forEach(gem => {
      const currentXp = Number(gem.currentXp || 0);
      const targetXp = Math.max(1, Number(gem.targetXp || 1));
      const percent = Math.min(100, Math.round((currentXp / targetXp) * 100));
      const card = document.createElement('article');
      const icon = createClassroomCardIcon('gem', gem.completed ? '◆' : '◇');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const progress = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const button = document.createElement('button');
      card.className = `classroom-card classroom-card--gem${gem.completed ? ' is-complete' : ''}`;
      badge.className = 'classroom-card-badge';
      badge.textContent = gem.completed ? '획득 완료' : '진행 중';
      title.textContent = gem.gemName || gem.gemId || '교실 젬';
      progress.className = 'classroom-card-progress';
      progress.textContent = `진행도 ${currentXp}/${targetXp}xp (${percent}%)`;
      reward.className = 'classroom-card-reward';
      reward.textContent = `획득 보상: ${Number(gem.rewardPoint || 0)} 포인트`;
      status.className = `quest-status ${gem.completed ? 'quest-status-claimed' : 'quest-status-active'}`;
      status.textContent = gem.completed ? '젬을 획득했습니다' : '연결 퀘스트를 완료해 경험치를 모으세요';
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomBadgeGemId = gem.gemId || '';
      button.disabled = !gem.completed;
      button.textContent = gem.completed ? '대표 키링으로 설정' : '목표 달성 후 설정';
      card.append(icon, badge, title, progress, createClassroomProgressMeter(percent), reward, status, button);
      grid.appendChild(card);
    });
  }

  function renderClassroomGemSummary(gemProgress = [], settings = {}) {
    const summary = document.getElementById('classroom-gem-summary');
    if(!summary) return;
    const completed = gemProgress.filter(gem => gem.completed === true).length;
    const active = gemProgress.filter(gem => gem.completed !== true).length;
    const totalXp = gemProgress.reduce((sum, gem) => sum + Number(gem.currentXp || 0), 0);
    const linkedQuests = (settings.quests || []).filter(quest => quest.active !== false && quest.linkedGemId);
    const linkedGemIds = new Set(linkedQuests.map(quest => quest.linkedGemId));
    const items = [
      ['연결 젬', `${linkedGemIds.size}개`],
      ['연결 퀘스트', `${linkedQuests.length}개`],
      ['진행 젬', `${active}개`],
      ['획득 젬', `${completed}개`],
      ['누적 XP', `${totalXp.toLocaleString('ko-KR')}xp`]
    ];
    summary.innerHTML = '';
    items.forEach(([label, value]) => {
      const item = document.createElement('span');
      item.textContent = `${label} ${value}`;
      summary.appendChild(item);
    });
  }

  function renderClassroomStudentCards(students = [], deps = {}) {
    const grid = document.getElementById('classroom-student-card-grid');
    if(!grid) return;
    grid.innerHTML = '';
    if(!students.length) {
      renderEmptyClassroomCard(grid, '준비 중', '학생카드를 불러오지 못했습니다', '교실 입장 상태를 확인한 뒤 다시 열어 주세요.');
      return;
    }
    students.forEach(student => {
      const card = document.createElement('article');
      const badge = document.createElement('span');
      const identity = document.createElement('div');
      const title = document.createElement('h4');
      const portrait = document.createElement('div');
      const imageUrl = deps.normalizeDisplayImageUrl?.(student.profileImageUrl || '') || '';
      const levelSummary = student.levelSummary || {};
      const level = Math.max(1, Math.round(Number(student.level || levelSummary.level) || 1));
      const medalAsset = level ? deps.getLevelMedalAsset?.(level) : null;
      const balanceRow = document.createElement('div');
      const pointBadge = document.createElement('span');
      const coinBadge = document.createElement('span');
      const levelBadge = document.createElement('span');
      const metaGrid = document.createElement('div');
      const boostGrid = document.createElement('div');
      const titleChip = document.createElement('span');
      const keyringChip = document.createElement('span');
      const selectedTitleName = student.selectedTitle?.titleName || '';
      const selectedKeyringLabel = student.selectedKeyring?.label || student.selectedBadge?.label || '';
      const boostItems = Array.isArray(student.boostItems) ? student.boostItems : [];
      card.className = [
        'classroom-card',
        'classroom-card--student',
        'classroom-student-card',
        selectedTitleName ? 'has-title' : '',
        selectedKeyringLabel ? 'has-keyring' : ''
      ].filter(Boolean).join(' ');
      badge.className = 'classroom-card-badge';
      badge.textContent = `${student.studentNumber || '-'}번`;
      balanceRow.className = 'classroom-student-balance-row';
      pointBadge.className = 'classroom-student-point-badge';
      pointBadge.appendChild(createClassroomIconImage('pointToken', '포인트', 'classroom-badge-icon'));
      pointBadge.appendChild(document.createTextNode(`${formatClassroomPoint(student.point)}P`));
      coinBadge.className = 'classroom-student-coin-badge';
      coinBadge.appendChild(createClassroomIconImage('djCoin', 'DJ코인', 'classroom-badge-icon'));
      coinBadge.appendChild(document.createTextNode(`${Number(student.djCoin || 0).toLocaleString('ko-KR')} DJ`));
      balanceRow.append(pointBadge, coinBadge);
      identity.className = 'classroom-student-identity';
      title.textContent = student.nickname || student.name || student.memberUserId || '학생';
      portrait.className = 'classroom-student-portrait';
      if(imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = `${student.nickname || student.name || '학생'} 프로필`;
        portrait.appendChild(image);
      } else {
        portrait.textContent = '🙂';
      }
      if(level) {
        const levelImage = document.createElement('img');
        levelBadge.className = 'classroom-student-level-badge';
        levelBadge.title = `Lv.${level}`;
        if(medalAsset?.path) {
          levelImage.src = medalAsset.path;
          levelImage.alt = `Lv.${level} 훈장`;
          levelImage.loading = 'lazy';
          levelBadge.appendChild(levelImage);
        }
        const levelText = document.createElement('span');
        levelText.textContent = `Lv.${level}`;
        levelBadge.appendChild(levelText);
      }
      identity.append(title, portrait);
      if(level) identity.appendChild(levelBadge);
      metaGrid.className = 'classroom-student-card-meta';
      if(selectedTitleName) {
        titleChip.className = 'quest-status quest-status-active';
        titleChip.textContent = selectedTitleName;
        metaGrid.appendChild(titleChip);
      }
      if(selectedKeyringLabel) {
        const keyringIcon = createClassroomIconImage(getClassroomKeyringIconKey(student), selectedKeyringLabel, 'classroom-chip-icon');
        keyringChip.className = 'quest-status quest-status-claimed';
        if(keyringIcon) keyringChip.appendChild(keyringIcon);
        keyringChip.appendChild(document.createTextNode(selectedKeyringLabel));
        metaGrid.appendChild(keyringChip);
      }
      boostGrid.className = 'classroom-student-boost-grid';
      boostItems.forEach(item => {
        const boost = document.createElement('span');
        const boostIcon = createClassroomIconImage(item.itemId, item.title || '부스터', 'classroom-student-boost-image');
        boost.className = 'classroom-student-boost-icon';
        boost.title = `${item.title || '부스터'} +${formatClassroomPoint(item.boostPoint)}P`;
        if(boostIcon) {
          boost.appendChild(boostIcon);
        } else {
          boost.textContent = item.icon || '+P';
        }
        boostGrid.appendChild(boost);
      });
      if(Number(student.pointBoostAmount || 0) > 0) {
        const totalBoost = document.createElement('span');
        totalBoost.className = 'quest-status quest-status-active';
        totalBoost.textContent = `획득 +${formatClassroomPoint(student.pointBoostAmount)}P`;
        metaGrid.appendChild(totalBoost);
      }
      card.append(badge, balanceRow, identity);
      if(metaGrid.children.length) card.appendChild(metaGrid);
      if(boostGrid.children.length) card.appendChild(boostGrid);
      grid.appendChild(card);
    });
  }

  function renderClassroomJobCards(settings, economyBoard = {}, deps = {}) {
    const grid = document.getElementById('classroom-job-grid');
    if(!grid) return;
    const jobs = Array.isArray(economyBoard.jobs) ? economyBoard.jobs : [];
    const applications = Array.isArray(economyBoard.applications) ? economyBoard.applications : [];
    const assignments = Array.isArray(economyBoard.assignments) ? economyBoard.assignments : [];
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const currentMemberUserId = deps.currentMemberUserId || '';
    const myAssignment = economyBoard.myAssignment || assignments.find(item => item.memberUserId === currentMemberUserId && item.status === 'active') || null;
    grid.innerHTML = '';
    if(!jobs.length) {
      renderEmptyClassroomCard(grid, '준비 중', '아직 등록된 직업이 없습니다', canManage ? '담임 관리 영역에서 직업을 먼저 만들어 주세요.' : '담임이 직업을 만들면 이곳에서 지원할 수 있습니다.');
      return;
    }
    jobs.forEach(job => {
      const card = document.createElement('article');
      const icon = createClassroomCardIcon('job', 'JOB');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const actions = document.createElement('div');
      const ownApplication = applications.find(item => item.jobId === job.jobId && item.memberUserId === currentMemberUserId);
      const assignedList = assignments.filter(item => item.jobId === job.jobId && item.status === 'active');
      const assignedHere = assignedList[0] || null;
      const maxAssignees = Math.max(1, Number(job.maxAssignees || 1));
      const isFull = assignedList.length >= maxAssignees;
      card.className = `classroom-card classroom-card--job${assignedHere ? ' is-complete' : ''}`;
      badge.className = 'classroom-card-badge';
      badge.textContent = isFull ? '정원 마감' : assignedHere ? '배정 중' : '모집 중';
      title.textContent = job.title || '교실 직업';
      desc.textContent = job.desc || '직업 설명이 없습니다.';
      reward.className = 'classroom-card-reward';
      reward.textContent = `월급: ${Number(job.weeklyPayPoint || 0).toLocaleString('ko-KR')} 포인트 · 정원 ${assignedList.length}/${maxAssignees}`;
      status.className = `quest-status ${assignedHere ? 'quest-status-claimed' : ownApplication ? 'quest-status-ready' : 'quest-status-active'}`;
      status.textContent = assignedHere
        ? `담당: ${assignedList.map(item => item.memberUserId || '-').join(', ')}`
        : ownApplication
          ? '지원 완료'
          : myAssignment
            ? '이미 맡은 직업이 있습니다'
            : isFull
              ? '정원이 찼습니다'
              : '지원 가능';
      actions.className = 'classroom-review-actions';
      if(canManage) {
        if(assignedHere) {
          const releaseButton = document.createElement('button');
          releaseButton.className = 'quest-claim-button danger';
          releaseButton.type = 'button';
          releaseButton.dataset.classroomJobReleaseId = assignedHere.assignmentId || assignedHere.memberUserId || '';
          releaseButton.textContent = `${assignedHere.memberUserId || '학생'} 해제`;
          const salaryButton = document.createElement('button');
          salaryButton.className = 'quest-claim-button';
          salaryButton.type = 'button';
          salaryButton.dataset.classroomJobSalaryId = assignedHere.assignmentId || assignedHere.memberUserId || '';
          salaryButton.textContent = `${assignedHere.memberUserId || '학생'} 월급 지급`;
          actions.append(salaryButton, releaseButton);
        }
        applications
          .filter(item => item.jobId === job.jobId && item.status === 'pending')
          .forEach(application => {
            const assignButton = document.createElement('button');
            assignButton.className = 'quest-claim-button';
            assignButton.type = 'button';
            assignButton.dataset.classroomJobAssignId = application.applicationId || '';
            assignButton.textContent = `${application.memberUserId || '학생'} 배정`;
            actions.appendChild(assignButton);
          });
        if(!actions.children.length) {
          const empty = document.createElement('p');
          empty.textContent = '대기 중인 지원자가 없습니다.';
          actions.appendChild(empty);
        }
      } else {
        const button = document.createElement('button');
        button.className = 'quest-claim-button';
        button.type = 'button';
        button.dataset.classroomJobApplyId = job.jobId || '';
        button.disabled = !!myAssignment || !!ownApplication || isFull;
        button.textContent = myAssignment
          ? '이미 직업 배정됨'
          : ownApplication
            ? '지원 완료'
            : isFull
              ? '모집 마감'
              : '지원하기';
        actions.appendChild(button);
      }
      card.append(icon, badge, title, desc, reward, status, actions);
      grid.appendChild(card);
    });
  }

  function renderClassroomJobSummary(settings, economyBoard = {}, deps = {}) {
    const summary = document.getElementById('classroom-job-summary');
    if(!summary) return;
    const jobs = Array.isArray(economyBoard.jobs) ? economyBoard.jobs : [];
    const applications = Array.isArray(economyBoard.applications) ? economyBoard.applications : [];
    const assignments = Array.isArray(economyBoard.assignments) ? economyBoard.assignments : [];
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const pending = applications.filter(item => item.status === 'pending').length;
    const assigned = assignments.filter(item => item.status === 'active').length;
    const openJobs = Math.max(0, jobs.length - assigned);
    const items = canManage
      ? [['등록 직업', `${jobs.length}개`], ['대기 지원', `${pending}건`], ['미배정 직업', `${openJobs}개`]]
      : [['지원 가능', `${openJobs}개`], ['내 지원', `${applications.length}건`], ['배정 현황', assigned ? `${assigned}명 활동 중` : '모집 중']];
    summary.innerHTML = '';
    items.forEach(([label, value]) => {
      const item = document.createElement('span');
      item.textContent = `${label} ${value}`;
      summary.appendChild(item);
    });
  }

  function renderClassroomShopCards(settings, economyBoard = {}, wallet = {}, deps = {}) {
    const grid = document.getElementById('classroom-shop-grid');
    if(!grid) return;
    const items = Array.isArray(economyBoard.shopItems) ? economyBoard.shopItems : [];
    const point = Number(wallet.point || 0);
    const djCoin = Number(economyBoard.myDjCoin || 0);
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const ownedItemIds = new Set(purchases
      .filter(purchase => ['purchased', 'use_requested', 'use_approved', 'used'].includes(purchase.status))
      .map(purchase => String(purchase.itemId || ''))
      .filter(Boolean));
    grid.innerHTML = '';
    const activeMarketPane = document.querySelector('[data-classroom-market-tab].is-active')?.dataset.classroomMarketTab || 'point';
    const renderShopSection = (paneKey, titleText, noteText, sectionItems, emptyText = '') => {
      const section = document.createElement('section');
      const heading = document.createElement('div');
      const title = document.createElement('h4');
      const note = document.createElement('p');
      const list = document.createElement('div');
      section.className = `classroom-market-section${activeMarketPane === paneKey ? ' is-active' : ''}`;
      section.dataset.classroomMarketPane = paneKey;
      heading.className = 'event-section-heading compact';
      title.textContent = titleText;
      list.className = 'classroom-card-grid classroom-market-card-grid';
      heading.appendChild(title);
      if(noteText) {
        note.textContent = noteText;
        heading.appendChild(note);
      }
      section.append(heading, list);
      if(!sectionItems.length) {
        const empty = document.createElement('p');
        empty.className = 'classroom-review-status';
        empty.textContent = emptyText || '아직 등록된 상품이 없습니다.';
        list.appendChild(empty);
      }
      sectionItems.forEach(item => {
      const priceType = item.priceType === 'djCoin' ? 'djCoin' : 'point';
      const price = priceType === 'djCoin' ? Number(item.priceCoin || 0) : Number(item.pricePoint || 0);
      const canAfford = priceType === 'djCoin' ? djCoin >= price : point >= price;
      const isOwned = item.itemType === 'pointBoost' && ownedItemIds.has(String(item.itemId || ''));
      const card = document.createElement('article');
      const visual = document.createElement('div');
      const imageUrl = deps.normalizeDisplayImageUrl?.(item.imageUrl || item.iconUrl || item.thumbnailUrl || '') || '';
      const assetIcon = createClassroomIconImage(getClassroomShopIconKey(item), item.title || '교실 상품', 'classroom-shop-card-image');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const button = document.createElement('button');
      card.className = `classroom-card classroom-card--shop${canAfford ? ' is-affordable' : ''}${isOwned ? ' is-complete' : ''}`;
      visual.className = 'classroom-shop-card-visual';
      if(imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = `${item.title || '교실 상품'} 이미지`;
        image.loading = 'lazy';
        visual.appendChild(image);
      } else if(assetIcon) {
        visual.appendChild(assetIcon);
      } else {
        visual.textContent = item.icon || (item.itemType === 'billboardTicket' ? '📣' : '선물');
      }
      badge.className = 'classroom-card-badge';
      badge.textContent = isOwned ? '보유중' : item.itemType === 'pointBoost' ? '포인트 부스터' : item.itemType === 'billboardTicket' ? '전광판' : '쿠폰';
      title.textContent = item.title || '교실 상품';
      desc.textContent = item.desc || '상품 설명이 없습니다.';
      reward.className = 'classroom-card-reward';
      reward.textContent = item.itemType === 'pointBoost'
        ? `효과: +${formatClassroomPoint(item.boostPoint)}P · 가격: ${price.toLocaleString('ko-KR')} DJ코인`
        : `가격: ${price.toLocaleString('ko-KR')} ${priceType === 'djCoin' ? 'DJ코인' : '포인트'}`;
      status.className = `quest-status ${isOwned ? 'quest-status-claimed' : canAfford ? 'quest-status-active' : 'quest-status-ready'}`;
      status.textContent = isOwned ? '학생카드에 배치됨' : canAfford ? '구매 가능' : `${priceType === 'djCoin' ? 'DJ코인' : '포인트'}가 부족합니다`;
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomShopBuyId = item.itemId || '';
      button.disabled = price <= 0 || !canAfford || isOwned;
      button.textContent = isOwned ? '보유중' : '구매하기';
      card.append(visual, badge, title, desc, reward, status, button);
        list.appendChild(card);
      });
      grid.appendChild(section);
    };
    const pointItems = items.filter(item => item.priceType !== 'djCoin');
    const coinItems = items.filter(item => item.priceType === 'djCoin');
    renderShopSection('point', '포인트샵', '', pointItems, '포인트로 살 수 있는 상품이 없습니다.');
    renderShopSection('coin', '코인샵', '', coinItems, 'DJ코인으로 살 수 있는 상품이 없습니다.');
  }

  function renderClassroomShopHistory(settings, economyBoard = {}, deps = {}) {
    const wrap = document.getElementById('classroom-shop-history');
    if(!wrap) return;
    const activeMarketPane = document.querySelector('[data-classroom-market-tab].is-active')?.dataset.classroomMarketTab || 'point';
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    wrap.innerHTML = '';
    wrap.dataset.classroomMarketPane = 'inventory';
    wrap.classList.toggle('is-active', activeMarketPane === 'inventory');
    const heading = document.createElement('div');
    const title = document.createElement('h4');
    const note = document.createElement('p');
    const list = document.createElement('div');
    heading.className = 'event-section-heading compact';
    title.textContent = canManage ? '인벤토리 사용 요청' : '내 인벤토리';
    note.textContent = canManage ? '학생의 사용 요청을 승인하거나 사용 완료 처리합니다.' : '구매한 상품을 이곳에서 사용할 수 있습니다.';
    list.className = 'classroom-shop-history-list';
    heading.append(title, note);
    wrap.append(heading, list);
    if(!purchases.length) {
      const empty = document.createElement('p');
      empty.className = 'classroom-review-status';
      empty.textContent = canManage ? '아직 구매 내역이 없습니다.' : '아직 보유한 쿠폰이 없습니다.';
      list.appendChild(empty);
    }
    purchases.slice(0, 12).forEach(purchase => {
      const row = document.createElement('article');
      const body = document.createElement('div');
      const titleEl = document.createElement('strong');
      const meta = document.createElement('p');
      const actions = document.createElement('div');
      const status = String(purchase.status || 'purchased');
      row.className = 'classroom-shop-history-row';
      const isBillboardTicket = purchase.itemId === 'billboard-ticket' || purchase.itemType === 'billboardTicket';
      titleEl.textContent = purchase.itemTitle || (isBillboardTicket ? '전광판 이용권' : '교실 쿠폰');
      const memoText = purchase.rejectReason || purchase.refundReason || purchase.useMemo || purchase.approvalMemo || purchase.requestMemo || '';
      meta.textContent = `${canManage ? `${purchase.memberUserId || '학생'} · ` : ''}${Number(purchase.pricePoint || 0).toLocaleString('ko-KR')} 포인트 · ${getClassroomPurchaseStatusLabel(status)}${memoText ? ` · ${memoText}` : ''}`;
      actions.className = 'classroom-review-actions';
      if(canManage) {
        if(status === 'use_requested') {
          const approveButton = document.createElement('button');
          const rejectButton = document.createElement('button');
          approveButton.className = 'quest-claim-button';
          approveButton.type = 'button';
          approveButton.dataset.classroomShopApproveUseId = purchase.purchaseId || '';
          approveButton.textContent = '사용 승인';
          rejectButton.className = 'quest-claim-button danger';
          rejectButton.type = 'button';
          rejectButton.dataset.classroomShopRejectUseId = purchase.purchaseId || '';
          rejectButton.textContent = '반려';
          actions.append(approveButton, rejectButton);
        }
        if(status === 'use_requested' || status === 'use_approved') {
          const completeButton = document.createElement('button');
          completeButton.className = 'quest-claim-button';
          completeButton.type = 'button';
          completeButton.dataset.classroomShopCompleteUseId = purchase.purchaseId || '';
          completeButton.textContent = '사용 완료';
          actions.appendChild(completeButton);
        }
        if(!['used', 'refunded'].includes(status)) {
          const refundButton = document.createElement('button');
          refundButton.className = 'quest-claim-button danger';
          refundButton.type = 'button';
          refundButton.dataset.classroomShopRefundId = purchase.purchaseId || '';
          refundButton.textContent = '환불';
          actions.appendChild(refundButton);
        }
      } else if(status === 'purchased' && isBillboardTicket) {
        const billboardButton = document.createElement('button');
        billboardButton.className = 'quest-claim-button';
        billboardButton.type = 'button';
        billboardButton.dataset.classroomBillboardUseId = purchase.purchaseId || '';
        billboardButton.textContent = '전광판에 올리기';
        actions.appendChild(billboardButton);
      } else if(status === 'purchased') {
        const requestButton = document.createElement('button');
        requestButton.className = 'quest-claim-button';
        requestButton.type = 'button';
        requestButton.dataset.classroomShopRequestUseId = purchase.purchaseId || '';
        requestButton.textContent = '사용 요청';
        actions.appendChild(requestButton);
      }
      if(!actions.children.length) {
        const chip = document.createElement('span');
        chip.className = `quest-status ${status === 'used' ? 'quest-status-claimed' : 'quest-status-ready'}`;
        chip.textContent = getClassroomPurchaseStatusLabel(status);
        actions.appendChild(chip);
      }
      body.append(titleEl, meta);
      row.append(body, actions);
      list.appendChild(row);
    });
    renderClassroomGroupPurchaseSection(document.getElementById('classroom-group-purchase-shop'), economyBoard, deps);
  }

  function renderClassroomMissionView(economyBoard = {}) {
    const wrap = document.getElementById('classroom-mission-view');
    if(!wrap) return;
    const mission = economyBoard.classMission || null;
    wrap.innerHTML = '';
    if(!mission) {
      const empty = document.createElement('p');
      empty.className = 'classroom-review-status';
      empty.textContent = '아직 설정된 학급 포인트 미션이 없습니다.';
      wrap.appendChild(empty);
      return;
    }
    const panel = document.createElement('section');
    const title = document.createElement('h4');
    const desc = document.createElement('p');
    const track = document.createElement('div');
    const list = document.createElement('div');
    const targetMax = Math.max(...(mission.thresholds || []).map(item => Number(item.targetPoint || 0)), 1);
    panel.className = 'classroom-mission-panel';
    title.textContent = mission.title || '학급 포인트 미션';
    desc.textContent = `${Number(mission.totalPoint || 0).toLocaleString('ko-KR')}점 모음${mission.remainingPoint ? ` · 다음 기준까지 ${Number(mission.remainingPoint || 0).toLocaleString('ko-KR')}점` : ' · 모든 기준 달성'}`;
    track.className = 'classroom-mission-track';
    list.className = 'classroom-mission-step-list';
    (mission.thresholds || []).forEach(step => {
      const marker = document.createElement('span');
      const row = document.createElement('span');
      marker.className = `classroom-mission-marker${step.achieved ? ' is-achieved' : ''}`;
      marker.style.setProperty('--mission-position', `${Math.min(100, Math.round((Number(step.targetPoint || 0) / targetMax) * 100))}%`);
      marker.textContent = step.achieved ? '✓' : Number(step.targetPoint || 0).toLocaleString('ko-KR');
      marker.title = `${step.label || `${Number(step.targetPoint || 0).toLocaleString('ko-KR')}점`}${step.rewardText ? ` · ${step.rewardText}` : ''}`;
      track.appendChild(marker);
      row.className = `classroom-mission-step${step.achieved ? ' is-achieved' : ''}`;
      row.textContent = `${step.achieved ? '✓ ' : ''}${step.label || `${Number(step.targetPoint || 0).toLocaleString('ko-KR')}점`} · ${Number(step.targetPoint || 0).toLocaleString('ko-KR')}점${step.rewardText ? ` · ${step.rewardText}` : ''}`;
      list.appendChild(row);
    });
    panel.append(title, desc, track, list);
    wrap.appendChild(panel);
  }

  function renderClassroomGroupPurchaseSection(wrap, economyBoard = {}, deps = {}) {
    const items = Array.isArray(economyBoard.groupPurchases) ? economyBoard.groupPurchases : [];
    if(!wrap) return;
    const activeMarketPane = document.querySelector('[data-classroom-market-tab].is-active')?.dataset.classroomMarketTab || 'point';
    wrap.innerHTML = '';
    const section = document.createElement('section');
    const heading = document.createElement('div');
    const title = document.createElement('h4');
    const note = document.createElement('p');
    const list = document.createElement('div');
    section.className = `classroom-shop-history classroom-market-section${activeMarketPane === 'group' ? ' is-active' : ''}`;
    section.dataset.classroomMarketPane = 'group';
    heading.className = 'event-section-heading compact';
    title.textContent = '공동구매';
    note.textContent = '학생들이 포인트를 모아 학급 상품을 달성합니다.';
    list.className = 'classroom-shop-history-list';
    heading.append(title, note);
    section.append(heading, list);
    if(!items.length) {
      const empty = document.createElement('p');
      empty.className = 'classroom-review-status';
      empty.textContent = '진행 중인 공동구매가 없습니다.';
      list.appendChild(empty);
      wrap.appendChild(section);
      return;
    }
    items.slice(0, 8).forEach(item => {
      const row = document.createElement('article');
      const body = document.createElement('div');
      const titleEl = document.createElement('strong');
      const meta = document.createElement('p');
      const actions = document.createElement('div');
      const button = document.createElement('button');
      const status = String(item.status || 'open');
      row.className = 'classroom-shop-history-row';
      actions.className = 'classroom-review-actions';
      titleEl.textContent = item.title || '공동구매';
      meta.textContent = `${Number(item.raisedPoint || 0).toLocaleString('ko-KR')} / ${Number(item.targetPoint || 0).toLocaleString('ko-KR')} 포인트 · ${status === 'funded' ? '목표 달성' : '진행 중'}${item.dueDate ? ` · ${item.dueDate}까지` : ''}`;
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomGroupPurchaseId = item.groupPurchaseId || '';
      button.disabled = status !== 'open';
      button.textContent = status === 'funded' ? '달성 완료' : '포인트 보태기';
      body.append(titleEl, meta, createClassroomProgressMeter(Number(item.progressPercent || 0)));
      actions.appendChild(button);
      row.append(body, actions);
      list.appendChild(row);
    });
    wrap.appendChild(section);
  }

  function renderClassroomSavingsSection(wrap, economyBoard = {}, deps = {}) {
    if(!wrap) return;
    const products = Array.isArray(economyBoard.savingsProducts) ? economyBoard.savingsProducts : [];
    const accounts = Array.isArray(economyBoard.savingsAccounts) ? economyBoard.savingsAccounts : [];
    if(!products.length && !accounts.length) return;
    const section = document.createElement('section');
    const heading = document.createElement('div');
    const title = document.createElement('h4');
    const note = document.createElement('p');
    const list = document.createElement('div');
    const todayKey = deps.getTodayDateKey?.() || new Date().toISOString().slice(0, 10);
    section.className = 'classroom-shop-history';
    heading.className = 'event-section-heading compact';
    title.append(createClassroomIconImage('bank', '은행', 'classroom-heading-icon'), document.createTextNode('은행 적금'));
    note.textContent = '포인트를 예치하고 만기일에 이자와 함께 수령합니다.';
    list.className = 'classroom-shop-history-list';
    heading.append(title, note);
    section.append(heading, list);
    products.slice(0, 6).forEach(product => {
      const row = document.createElement('article');
      const body = document.createElement('div');
      const titleEl = document.createElement('strong');
      const meta = document.createElement('p');
      const actions = document.createElement('div');
      const button = document.createElement('button');
      row.className = 'classroom-shop-history-row';
      actions.className = 'classroom-review-actions';
      titleEl.textContent = product.title || '적금 상품';
      meta.textContent = `최소 ${Number(product.minDepositPoint || product.depositPoint || 1).toLocaleString('ko-KR')}포인트 · ${Number(product.interestRatePercent || 0)}% 이자 · ${Number(product.termDays || 0)}일`;
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomSavingsProductId = product.productId || '';
      button.textContent = '가입하기';
      body.append(titleEl, meta);
      actions.appendChild(button);
      row.append(body, actions);
      list.appendChild(row);
    });
    accounts.slice(0, 8).forEach(account => {
      const row = document.createElement('article');
      const body = document.createElement('div');
      const titleEl = document.createElement('strong');
      const meta = document.createElement('p');
      const actions = document.createElement('div');
      const button = document.createElement('button');
      const mature = String(account.maturityDate || '') <= todayKey;
      row.className = 'classroom-shop-history-row';
      actions.className = 'classroom-review-actions';
      titleEl.textContent = account.productTitle || '내 적금';
      meta.textContent = `${Number(account.depositPoint || 0).toLocaleString('ko-KR')} + 이자 ${Number(account.interestPoint || 0).toLocaleString('ko-KR')} · 만기 ${account.maturityDate || '-'}`;
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomSavingsAccountId = account.accountId || '';
      button.disabled = account.status !== 'active' || !mature;
      button.textContent = account.status === 'claimed' ? '수령 완료' : mature ? '만기 수령' : '만기 대기';
      body.append(titleEl, meta);
      actions.appendChild(button);
      row.append(body, actions);
      list.appendChild(row);
    });
    wrap.appendChild(section);
  }

  function renderClassroomExchangeSection(wrap, economyBoard = {}, wallet = {}) {
    if(!wrap) return;
    const settings = economyBoard.exchangeSettings || {};
    const pointToCoinCost = Math.max(1, Math.round(Number(settings.pointToCoinPointCost || 10) || 10));
    const coinToPointReward = Math.max(1, Math.round(Number(settings.coinToPointReward || 10) || 10));
    const pointBalance = Math.max(0, Number(wallet.point || wallet.balance || 0) || 0);
    const coinBalance = Math.max(0, Number(economyBoard.myDjCoin || 0) || 0);
    const section = document.createElement('section');
    const heading = document.createElement('div');
    const title = document.createElement('h4');
    const note = document.createElement('p');
    const list = document.createElement('div');
    section.className = 'classroom-shop-history classroom-exchange-section';
    heading.className = 'event-section-heading compact';
    title.append(createClassroomIconImage('exchange', '환전', 'classroom-heading-icon'), document.createTextNode('환전 은행'));
    note.textContent = `내 포인트 ${pointBalance.toLocaleString('ko-KR')}P · 내 DJ코인 ${coinBalance.toLocaleString('ko-KR')}개`;
    list.className = 'classroom-shop-history-list classroom-exchange-list';
    heading.append(title, note);
    section.append(heading, list);

    [
      {
        direction: 'pointToCoin',
        title: '포인트를 DJ코인으로',
        meta: `${pointToCoinCost.toLocaleString('ko-KR')}P → 1 DJ코인`,
        enabled: settings.pointToCoinEnabled !== false,
        disabledText: '교환 중지',
        buttonText: 'DJ코인 받기'
      },
      {
        direction: 'coinToPoint',
        title: 'DJ코인을 포인트로',
        meta: `1 DJ코인 → ${coinToPointReward.toLocaleString('ko-KR')}P`,
        enabled: settings.coinToPointEnabled !== false,
        disabledText: '교환 중지',
        buttonText: '포인트 받기'
      }
    ].forEach(item => {
      const row = document.createElement('article');
      const body = document.createElement('div');
      const titleEl = document.createElement('strong');
      const meta = document.createElement('p');
      const actions = document.createElement('div');
      const button = document.createElement('button');
      row.className = 'classroom-shop-history-row classroom-exchange-row';
      actions.className = 'classroom-review-actions';
      titleEl.textContent = item.title;
      meta.textContent = item.meta;
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomExchangeDirection = item.direction;
      button.disabled = !item.enabled;
      button.textContent = item.enabled ? item.buttonText : item.disabledText;
      body.append(titleEl, meta);
      actions.appendChild(button);
      row.append(body, actions);
      list.appendChild(row);
    });
    wrap.appendChild(section);
  }

  function renderClassroomTaxPresetList(economyBoard = {}) {
    const list = document.getElementById('classroom-tax-preset-list');
    if(!list) return;
    const presets = Array.isArray(economyBoard.taxPresets) ? economyBoard.taxPresets : [];
    list.innerHTML = '';
    if(!presets.length) {
      const empty = document.createElement('p');
      empty.className = 'classroom-preset-empty';
      empty.textContent = '저장된 세금 프리셋이 없습니다.';
      list.appendChild(empty);
      return;
    }
    presets.forEach(preset => {
      const button = document.createElement('button');
      const title = document.createElement('strong');
      const meta = document.createElement('span');
      button.className = 'classroom-preset-button';
      button.type = 'button';
      button.dataset.classroomTaxPresetRate = String(preset.ratePercent || 0);
      button.dataset.classroomTaxPresetReason = preset.reason || preset.title || '';
      title.textContent = preset.title || preset.reason || '세금 프리셋';
      meta.textContent = `${Number(preset.ratePercent || 0)}% · ${preset.reason || '학급 공공 포인트 적립'}`;
      button.append(title, meta);
      list.appendChild(button);
    });
  }

  function getClassroomRoutineScheduleLabel(routine = {}) {
    const labels = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금' };
    const weekdays = Array.isArray(routine.weekdays) && routine.weekdays.length
      ? routine.weekdays.map(day => labels[day]).filter(Boolean).join(',')
      : '월~금';
    const start = String(routine.startDate || '').trim();
    const end = String(routine.endDate || '').trim();
    const period = start && end ? `${start}~${end}` : '기간 미설정';
    return `${period} · ${weekdays}`;
  }

  function renderClassroomRoutineCards(economyBoard = {}) {
    const grid = document.getElementById('classroom-routine-grid');
    if(!grid) return;
    const routines = Array.isArray(economyBoard.routines) ? economyBoard.routines : [];
    grid.innerHTML = '';
    if(!routines.length) {
      renderEmptyClassroomCard(grid, '준비 중', '아직 만든 성장루틴이 없습니다', '내가 반복하고 싶은 습관을 만들고 매일 체크해 보세요.');
      return;
    }
    routines.forEach(routine => {
      const currentCount = Number(routine.currentCount || 0);
      const targetCount = Math.max(1, Number(routine.targetCount || 1));
      const percent = Math.min(100, Math.round((currentCount / targetCount) * 100));
      const completed = routine.status === 'completed' || currentCount >= targetCount;
      const card = document.createElement('article');
      const icon = createClassroomCardIcon('routine', completed ? 'OK' : 'DAY');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const progress = document.createElement('p');
      const reward = document.createElement('p');
      const button = document.createElement('button');
      card.className = `classroom-card classroom-card--routine${completed ? ' is-complete' : ''}`;
      badge.className = 'classroom-card-badge';
      badge.textContent = completed ? '달성 완료' : '학생 설정형';
      title.textContent = routine.title || '성장루틴';
      desc.textContent = routine.desc || '학생이 직접 만든 루틴입니다.';
      progress.className = 'classroom-card-progress';
      progress.textContent = `진행도 ${currentCount}/${targetCount}회 · ${getClassroomRoutineScheduleLabel(routine)}`;
      reward.className = 'classroom-card-reward';
      reward.textContent = `달성 보상: ${Number(routine.rewardPoint || 0).toLocaleString('ko-KR')} 포인트`;
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomRoutineCheckId = routine.routineId || '';
      button.disabled = completed || routine.checkedToday === true || routine.canCheckToday === false;
      button.textContent = completed
        ? '달성 완료'
        : routine.checkedToday
          ? '오늘 체크 완료'
          : routine.canCheckToday === false
            ? '체크 요일 아님'
            : '오늘 체크';
      card.append(icon, badge, title, desc, progress, createClassroomProgressMeter(percent), reward, button);
      grid.appendChild(card);
    });
  }

  function renderClassroomSections(data = {}, deps = {}) {
    const settings = data.settings || {};
    const economyBoard = data.economyBoard || {};
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const teacherTab = document.getElementById('classroom-teacher-tab');
    if(teacherTab) {
      teacherTab.hidden = !canManage;
      if(!canManage && teacherTab.classList.contains('is-active')) {
        window.DJ48ClassroomForm?.setActiveClassroomTab?.('today');
      }
    }
    renderClassroomRoleState(settings, data.wallet || {}, deps, data);
    renderClassroomTeacherDashboard(data, deps);
    renderClassroomTeacherReport(data, deps);
    renderClassroomTodayHome(data, deps);
    renderClassroomActivityFeed(economyBoard);
    renderClassroomReviewPanel(settings, data.reviewItems || [], deps);
    renderClassroomQuestCards(settings, data.progressMap || {}, deps);
    renderClassroomInactiveQuestCards(settings, deps);
    renderClassroomStudentCards(data.studentCards || [], deps);
    renderClassroomGemSummary(data.gemProgress || [], settings);
    renderClassroomGemCards(data.gemProgress || []);
    renderClassroomJobSummary(settings, economyBoard, deps);
    renderClassroomJobCards(settings, economyBoard, deps);
    renderClassroomShopCards(settings, economyBoard, data.wallet || {}, deps);
    renderClassroomShopHistory(settings, economyBoard, deps);
    renderClassroomMissionView(economyBoard);
    const bankGrid = document.getElementById('classroom-bank-grid');
    if(bankGrid) bankGrid.innerHTML = '';
    renderClassroomExchangeSection(bankGrid, economyBoard, data.wallet || {});
    renderClassroomSavingsSection(bankGrid, economyBoard, deps);
    renderClassroomTaxPresetList(economyBoard);
    renderClassroomRoutineCards(economyBoard);
    deps.setClassroomNoticeForm?.(economyBoard.classNotices?.slots || []);
    deps.setClassroomExchangeSettingsForm?.(economyBoard.exchangeSettings || {});
  }

  window.DJ48ClassroomRender = {
    getClassroomQuestTitle,
    getClassroomProgressStatusLabel,
    getClassroomProgressButtonLabel,
    getClassroomProgressStatusClass,
    renderClassroomReviewList,
    renderClassroomReviewPanel,
    renderClassroomRoleState,
    renderClassroomTeacherDashboard,
    renderClassroomTeacherReport,
    renderClassroomTodayHome,
    renderClassroomActivityFeed,
    renderClassroomQuestCards,
    renderClassroomInactiveQuestCards,
    renderClassroomGemCards,
    renderClassroomGemSummary,
    renderClassroomStudentCards,
    renderClassroomJobCards,
    renderClassroomJobSummary,
    renderClassroomShopCards,
    renderClassroomShopHistory,
    getClassroomRoutineScheduleLabel,
    renderClassroomRoutineCards,
    renderClassroomSections
  };
})();
