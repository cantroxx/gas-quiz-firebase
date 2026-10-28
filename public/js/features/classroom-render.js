(function () {
  const CLASSROOM_ICON_BASE = 'images/classroom-icons/';
  const CLASSROOM_ICON_ASSETS = {
    djCoin: `${CLASSROOM_ICON_BASE}dj-coin.svg`,
    pointToken: `${CLASSROOM_ICON_BASE}point-token.svg`,
    bank: '/images/classroom/navigation-v2/bank-320.webp',
    exchange: '/images/classroom/economy-v2/exchange-320.webp',
    pointShop: '/images/classroom/economy-v2/point-shop-320.webp',
    coinShop: '/images/classroom/economy-v2/coin-shop-320.webp',
    groupPurchase: '/images/classroom/market-v2/gift-320.webp',
    inventory: '/images/classroom/market-reserve-v1/treasure-320.webp',
    studentCard: `${CLASSROOM_ICON_BASE}student-card.svg`,
    quest: '/images/classroom/cards/fox-quest-320.webp',
    routine: '/images/classroom/cards/bunny-routine-320.webp',
    mission: '/images/classroom/community-tree-320.webp',
    keyringStar: `${CLASSROOM_ICON_BASE}keyring-star.svg`,
    keyringGem: `${CLASSROOM_ICON_BASE}keyring-gem.svg`,
    keyringHeart: `${CLASSROOM_ICON_BASE}keyring-heart.svg`,
    keyringBook: `${CLASSROOM_ICON_BASE}keyring-book.svg`,
    keyringPencil: `${CLASSROOM_ICON_BASE}keyring-pencil.svg`,
    keyringCrown: `${CLASSROOM_ICON_BASE}keyring-crown.svg`,
    keyringMedal: `${CLASSROOM_ICON_BASE}keyring-medal.svg`,
    keyringTrophy: `${CLASSROOM_ICON_BASE}keyring-trophy.svg`,
    keyringSprout: `${CLASSROOM_ICON_BASE}keyring-sprout.svg`,
    keyringLightning: `${CLASSROOM_ICON_BASE}keyring-lightning.svg`,
    keyringRibbon: `${CLASSROOM_ICON_BASE}keyring-ribbon.svg`,
    keyringShield: `${CLASSROOM_ICON_BASE}keyring-shield.svg`,
    gemReading: `${CLASSROOM_ICON_BASE}gem-reading.svg`,
    gemMath: `${CLASSROOM_ICON_BASE}gem-math.svg`,
    gemHistory: `${CLASSROOM_ICON_BASE}gem-history.svg`,
    gemScience: `${CLASSROOM_ICON_BASE}gem-science.svg`,
    gemWriting: `${CLASSROOM_ICON_BASE}gem-writing.svg`,
    gemSpeech: `${CLASSROOM_ICON_BASE}gem-speech.svg`,
    gemTeamwork: `${CLASSROOM_ICON_BASE}gem-teamwork.svg`,
    gemDiligence: `${CLASSROOM_ICON_BASE}gem-diligence.svg`,
    gemChallenge: `${CLASSROOM_ICON_BASE}gem-challenge.svg`,
    gemKindness: `${CLASSROOM_ICON_BASE}gem-kindness.svg`,
    gemCreativity: `${CLASSROOM_ICON_BASE}gem-creativity.svg`,
    gemFocus: `${CLASSROOM_ICON_BASE}gem-focus.svg`,
    shopHomeworkPass: `${CLASSROOM_ICON_BASE}shop-homework-pass.svg`,
    shopSeatChoice: `${CLASSROOM_ICON_BASE}shop-seat-choice.svg`,
    shopPraiseCard: `${CLASSROOM_ICON_BASE}shop-praise-card.svg`,
    shopPresentationPass: `${CLASSROOM_ICON_BASE}shop-presentation-pass.svg`,
    shopMiniBadge: `${CLASSROOM_ICON_BASE}shop-mini-badge.svg`,
    shopHelperTicket: `${CLASSROOM_ICON_BASE}shop-helper-ticket.svg`,
    shopMusicCoupon: `${CLASSROOM_ICON_BASE}shop-music-coupon.svg`,
    shopFreeTime: `${CLASSROOM_ICON_BASE}shop-free-time.svg`,
    boostGreenhouse: `${CLASSROOM_ICON_BASE}boost-greenhouse.svg`,
    boostSprinkler: `${CLASSROOM_ICON_BASE}boost-sprinkler.svg`,
    boostSunLamp: `${CLASSROOM_ICON_BASE}boost-sun-lamp.svg`,
    effectGoldenGarden: `${CLASSROOM_ICON_BASE}effect-golden-garden.svg`,
    effectStarClassroom: `${CLASSROOM_ICON_BASE}effect-star-classroom.svg`,
    'boost-greenhouse': `${CLASSROOM_ICON_BASE}boost-greenhouse.svg`,
    'boost-sprinkler': `${CLASSROOM_ICON_BASE}boost-sprinkler.svg`,
    'boost-sun-lamp': `${CLASSROOM_ICON_BASE}boost-sun-lamp.svg`,
    'effect-golden-garden': `${CLASSROOM_ICON_BASE}effect-golden-garden.svg`,
    'effect-star-classroom': `${CLASSROOM_ICON_BASE}effect-star-classroom.svg`,
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
  const HIDDEN_CLASSROOM_MEMBER_IDS = new Set(['G4-C8-N23']);
  const CLASSROOM_MANAGEMENT_PANEL_MOVES = [
    ['classroom-icon-catalog-panel', 'classroom-card-management-slot'],
    ['classroom-quest-editor-panel', 'classroom-quest-management-slot'],
    ['classroom-badge-campaign-panel', 'classroom-gem-management-slot'],
    ['classroom-gem-editor-panel', 'classroom-gem-management-slot'],
    ['classroom-job-editor-panel', 'classroom-job-management-slot'],
    ['classroom-shop-editor-panel', 'classroom-market-management-slot'],
    ['classroom-group-purchase-editor-panel', 'classroom-market-management-slot'],
    ['classroom-tax-editor-panel', 'classroom-bank-management-slot'],
    ['classroom-savings-editor-panel', 'classroom-bank-management-slot'],
    ['classroom-exchange-editor-panel', 'classroom-bank-management-slot'],
    ['classroom-mission-editor-panel', 'classroom-mission-management-slot'],
    ['classroom-notice-editor-panel', 'classroom-home-management-slot']
  ];
  const classroomQuestFilterState = {
    category: 'all',
    status: 'all',
    audience: 'all'
  };
  let classroomStudentQuestFilter = 'all';
  let classroomShopRenderState = null;

  function isHiddenClassroomMember(memberUserId = '') {
    return HIDDEN_CLASSROOM_MEMBER_IDS.has(String(memberUserId || '').trim().toUpperCase());
  }

  function getClassroomMemberDisplayName(item = {}, fallback = '학생') {
    return item.memberNickname
      || item.nickname
      || item.displayName
      || item.memberName
      || item.name
      || item.memberUserId
      || item.userId
      || fallback;
  }

  function formatClassroomTimeLabel(millis) {
    const value = Number(millis || 0);
    if(!value) return '-';
    const date = new Date(value);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function getClassroomItemTimeMillis(item = {}) {
    const direct = [
      item.createdAtMillis,
      item.updatedAtMillis,
      item.requestedAtMillis,
      item.approvedAtMillis,
      item.usedAtMillis,
      item.reviewedAtMillis
    ].find(value => Number(value) > 0);
    if(direct) return Number(direct);
    const timestamp = item.createdAt || item.updatedAt || item.requestedAt || item.approvedAt || item.usedAt || item.reviewedAt;
    if(typeof timestamp === 'number' && Number.isFinite(timestamp)) return timestamp;
    if(timestamp && typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if(timestamp && Number(timestamp.seconds) > 0) return Number(timestamp.seconds) * 1000;
    return 0;
  }

  function getClassroomIconAssetUrl(key) {
    return CLASSROOM_ICON_ASSETS[String(key || '')] || '';
  }

  function arrangeClassroomManagementPanels(canManage = false) {
    const holding = document.getElementById('classroom-teacher-management-holding');
    CLASSROOM_MANAGEMENT_PANEL_MOVES.forEach(([panelId, slotId]) => {
      const panel = document.getElementById(panelId);
      const slot = document.getElementById(slotId);
      if(!panel) return;
      const target = canManage && slot ? slot : holding;
      if(target && panel.parentElement !== target) {
        target.appendChild(panel);
      }
      panel.hidden = !canManage;
    });
  }

  function createClassroomIconImage(key, alt = '', className = 'classroom-inline-icon') {
    const src = window.DJ48ClassroomShopArt?.hasIcon(key)
      ? window.DJ48ClassroomShopArt.getSource({icon:key}) : getClassroomIconAssetUrl(key);
    if(!src) return null;
    const image = document.createElement('img');
    image.className = className;
    image.src = src;
    image.alt = alt;
    image.loading = 'lazy';
    return image;
  }

  function createClassroomJobIcon(job = {}) {
    const roles = [
      ['board-manager', /게시판|공지/],
      ['library-helper', /독서|도서|책/],
      ['clean-desk-leader', /정리|청소|환경|칠판/],
      ['tech-helper', /기기|태블릿|컴퓨터|디지털/],
      ['mission-reporter', /미션|리포터|방송|소식/],
      ['kindness-captain', /친절|칭찬|배려|친구/]
    ];
    const role = roles.find(([id]) => id === job.jobId)
      || roles.find(([, pattern]) => pattern.test(job.title || job.jobTitle || ''));
    const defaultBase = '/images/classroom/navigation-v2/job';
    const base = role ? `/images/classroom/jobs-v1/${role[0]}` : defaultBase;
    const image = document.createElement('img');
    image.className = 'classroom-feature-visual classroom-job-art';
    image.alt = ''; image.width = 80; image.height = 80;
    image.decoding = 'async'; image.loading = 'lazy';
    image.srcset = `${base}-160.webp 1x, ${base}-320.webp 2x`;
    image.addEventListener('error', () => {
      image.removeAttribute('srcset');
      image.src = `${defaultBase}-160.webp`;
    }, { once: true });
    image.src = `${base}-160.webp`;
    return image;
  }

  const CLASSROOM_ILLUSTRATION_BASE = '/images/classroom/illustrations/';
  const CLASSROOM_SHOP_ILLUSTRATIONS = {
    shopSeatChoice: 'seat', shopMusicCoupon: 'music', shopHomeworkPass: 'homework',
    shopPresentationPass: 'presentation', shopPraiseCard: 'praise', shopHelperTicket: 'helper',
    shopFreeTime: 'freetime', billboard: 'billboard'
  };
  function createClassroomIllustration(src, className, eager = false, fallback = `${CLASSROOM_ILLUSTRATION_BASE}empty.svg`) {
    const image = document.createElement('img');
    image.className = className; image.alt = ''; image.width = 160; image.height = 160;
    image.decoding = 'async'; image.loading = eager ? 'eager' : 'lazy';
    image.src = src;
    if(src.includes('/stationery/') && src.endsWith('-160.webp')) image.srcset = `${src} 1x, ${src.replace('-160.webp','-320.webp')} 2x`;
    image.addEventListener('error', () => {
      image.removeAttribute('srcset');
      if(image.getAttribute('src') !== fallback) image.src = fallback;
      else { image.hidden = true; image.parentElement?.classList.add('has-missing-image'); }
    });
    return image;
  }
  function getClassroomShopArt(item = {}) {
    const title = String(item.title || '');
    if(/간식|과자|음료|주스/.test(title)) return `${CLASSROOM_ILLUSTRATION_BASE}snack.svg`;
    if(/급식|식판|배식/.test(title)) return `${CLASSROOM_ILLUSTRATION_BASE}lunch.svg`;
    const meanings = [[/자리|좌석/,'shopSeatChoice'],[/음악|노래|DJ/i,'shopMusicCoupon'],[/숙제/,'shopHomeworkPass'],[/발표/,'shopPresentationPass'],[/칭찬/,'shopPraiseCard'],[/도우미|도움/,'shopHelperTicket'],[/자유|보드게임|놀이/,'shopFreeTime']];
    const semantic = meanings.find(([pattern]) => pattern.test(title));
    const explicit = [item.itemId,item.icon].find(key => !['pointShop','coinShop'].includes(key) && getClassroomIconAssetUrl(key));
    const key = explicit || semantic?.[1] || (item.itemType === 'billboardTicket' ? 'billboard' : '');
    if(CLASSROOM_SHOP_ILLUSTRATIONS[key]) return `${CLASSROOM_ILLUSTRATION_BASE}${CLASSROOM_SHOP_ILLUSTRATIONS[key]}.svg`;
    const iconUrl = getClassroomIconAssetUrl(key);
    if(/\/(boost-|effect-|shop-mini-badge)/.test(iconUrl)) return CLASSROOM_ILLUSTRATION_BASE + iconUrl.split('/').pop();
    return iconUrl || `${CLASSROOM_ILLUSTRATION_BASE}empty.svg`;
  }
  function getClassroomQuestArt(quest) {
    const title = String(quest.title || '');
    const key = /독서|책|읽/.test(title) ? 'reading' : /친구|도움|돕|배려/.test(title) ? 'kindness' : /발표|말하기/.test(title) ? 'speech' : /청소|정리/.test(title) ? 'diligence' : 'notebook';
    const artwork = {reading: 'reading-sprout-320.webp', kindness: 'jobs-v1/kindness-captain-160.webp', speech: 'market-v2/presentation-320.webp', diligence: 'jobs-v1/clean-desk-leader-160.webp', notebook: 'stationery/notebook-160.webp'};
    return `/images/classroom/${artwork[key]}`;
  }
  function getClassroomKeyringIconKey(student = {}) {
    const keyring = student.selectedKeyring || {};
    const badge = student.selectedBadge || {};
    if(getClassroomIconAssetUrl(keyring.icon)) return keyring.icon;
    if(getClassroomIconAssetUrl(badge.icon)) return badge.icon;
    const haystack = `${keyring.keyringId || ''} ${keyring.label || ''} ${keyring.icon || ''} ${badge.badgeId || ''} ${badge.label || ''} ${badge.icon || ''}`.toLowerCase();
    if(haystack.includes('book') || haystack.includes('책')) return 'keyringBook';
    if(haystack.includes('pencil') || haystack.includes('연필')) return 'keyringPencil';
    if(haystack.includes('crown') || haystack.includes('왕관')) return 'keyringCrown';
    if(haystack.includes('medal') || haystack.includes('메달')) return 'keyringMedal';
    if(haystack.includes('trophy') || haystack.includes('트로피')) return 'keyringTrophy';
    if(haystack.includes('sprout') || haystack.includes('새싹')) return 'keyringSprout';
    if(haystack.includes('lightning') || haystack.includes('번개')) return 'keyringLightning';
    if(haystack.includes('ribbon') || haystack.includes('리본')) return 'keyringRibbon';
    if(haystack.includes('shield') || haystack.includes('방패')) return 'keyringShield';
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

  function appendClassroomTableCell(row, text = '', tagName = 'td', className = '') {
    const cell = document.createElement(tagName);
    cell.textContent = text;
    if(className) cell.className = className;
    row.appendChild(cell);
    return cell;
  }

  function createClassroomDataTable(headers = []) {
    const wrap = document.createElement('div');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const tbody = document.createElement('tbody');
    wrap.className = 'classroom-review-table-wrap classroom-feature-table-wrap';
    table.className = 'classroom-review-table';
    headers.forEach(label => appendClassroomTableCell(headerRow, label, 'th'));
    thead.appendChild(headerRow);
    table.append(thead, tbody);
    wrap.appendChild(table);
    return { wrap, tbody };
  }

  function renderClassroomFeatureStats(container, items = []) {
    const statGrid = document.createElement('div');
    statGrid.className = 'classroom-quest-stat-grid';
    items.forEach(([label, value]) => {
      const card = document.createElement('article');
      const labelEl = document.createElement('span');
      const valueEl = document.createElement('strong');
      labelEl.textContent = label;
      valueEl.textContent = value;
      card.append(labelEl, valueEl);
      statGrid.appendChild(card);
    });
    container.appendChild(statGrid);
  }

  function ensureClassroomPanelIntro(panelId, anchorId, className = '') {
    const anchor = document.getElementById(anchorId);
    if(!anchor?.parentElement) return null;
    let panel = document.getElementById(panelId);
    if(!panel) {
      panel = document.createElement('section');
      panel.id = panelId;
      panel.className = `classroom-feature-management-panel${className ? ` ${className}` : ''}`;
      anchor.parentElement.insertBefore(panel, anchor);
    }
    panel.innerHTML = '';
    return panel;
  }

  function renderClassroomReviewList(settings, reviewItems = [], options = {}, deps = {}) {
    const status = document.getElementById(options.statusId || 'classroom-review-status');
    const grid = document.getElementById(options.gridId || 'classroom-review-grid');
    if(!status || !grid) return;

    const canReview = deps.isCurrentClassroomTeacher?.(settings) === true;
    grid.innerHTML = '';
    grid.classList.remove('classroom-review-table-wrap');
    if(!canReview) {
      status.textContent = '담임 권한이 있어야 확인 대기 목록을 볼 수 있습니다.';
      return;
    }

    if(!reviewItems.length) {
      status.textContent = '현재 확인 대기 중인 퀘스트가 없습니다.';
      return;
    }

    status.textContent = `${reviewItems.length}건이 담임 확인을 기다리고 있습니다.`;
    grid.classList.add('classroom-review-table-wrap');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const tbody = document.createElement('tbody');
    table.className = 'classroom-review-table';
    ['구분', '학생', '내용', '상태', '보상/진행', '처리'].forEach(label => {
      appendClassroomTableCell(headerRow, label, 'th');
    });
    thead.appendChild(headerRow);
    table.append(thead, tbody);
    reviewItems.forEach(item => {
      const row = document.createElement('tr');
      const state = document.createElement('span');
      const actions = document.createElement('div');
      const approveButton = document.createElement('button');
      const rejectButton = document.createElement('button');
      const typeLabel = item.itemType === 'routine' ? '성장루틴' : '퀘스트';
      const studentLabel = item.memberNickname || item.memberUserId || '-';
      const titleText = item.itemType === 'routine'
        ? (item.routineTitle || item.title || '성장루틴')
        : getClassroomQuestTitle(settings, item.questId);
      let detailText = '';
      if(item.itemType === 'routine') {
        const percent = Math.max(0, Math.min(100, Math.round(Number(item.achievementPercent) || 0)));
        const currentCount = Math.max(0, Math.round(Number(item.currentCount) || 0));
        const targetCount = Math.max(1, Math.round(Number(item.targetCount) || 1));
        const baseReward = Number(item.baseRewardPoint || item.rewardPoint || 0);
        detailText = `달성 ${currentCount}/${targetCount}회(${percent}%) · 지급 예정 ${formatClassroomPoint(item.rewardPoint || 0)}/${formatClassroomPoint(baseReward)} 포인트`;
      } else {
        const rewardCurrencyLabel = deps.getClassroomRewardCurrencyLabel?.(item.rewardCurrency) || '포인트';
        const rewardAmount = rewardCurrencyLabel === '포인트'
          ? formatClassroomPoint(item.rewardPoint || item.rewardCoin || 0)
          : Number(item.rewardCoin || item.rewardPoint || 0).toLocaleString('ko-KR');
        detailText = `보상 예정 ${rewardAmount} ${rewardCurrencyLabel}`;
      }
      state.className = 'quest-status quest-status-ready';
      state.textContent = item.reviewMode === 'cancelOnly' ? '오늘 완료됨' : '확인 대기';
      actions.className = 'classroom-review-actions';
      rejectButton.className = 'quest-claim-button danger';
      rejectButton.type = 'button';
      rejectButton.dataset.classroomReviewAction = 'rejected';
      rejectButton.dataset.classroomReviewId = item.recordId || item.id || '';
      rejectButton.textContent = item.reviewMode === 'cancelOnly' ? '완료 취소' : '반려';
      if(item.reviewMode !== 'cancelOnly') {
        approveButton.className = 'quest-claim-button';
        approveButton.type = 'button';
        approveButton.dataset.classroomReviewAction = 'approved';
        approveButton.dataset.classroomReviewId = item.recordId || item.id || '';
        if(item.itemType === 'routine') {
          approveButton.dataset.classroomReviewItemType = 'routine';
          approveButton.dataset.classroomRoutineSuggestedReward = String(Math.max(0, Math.min(20, Math.round(Number(item.rewardPoint || 0) || 0))));
        }
        approveButton.textContent = '승인';
        actions.appendChild(approveButton);
      }
      actions.appendChild(rejectButton);
      if(item.itemType === 'routine' && options.routineBoardLink === true) {
        const boardLink = document.createElement('button');
        boardLink.className = 'quest-claim-button secondary';
        boardLink.type = 'button';
        boardLink.dataset.classroomTodayTab = 'routine';
        boardLink.textContent = '검토 화면';
        actions.appendChild(boardLink);
      }
      appendClassroomTableCell(row, typeLabel, 'td', 'classroom-review-table-kind');
      appendClassroomTableCell(row, studentLabel, 'td', 'classroom-review-table-student');
      appendClassroomTableCell(row, titleText, 'td', 'classroom-review-table-title');
      const stateCell = document.createElement('td');
      stateCell.appendChild(state);
      row.appendChild(stateCell);
      appendClassroomTableCell(row, detailText, 'td', 'classroom-review-table-detail');
      const actionCell = document.createElement('td');
      actionCell.appendChild(actions);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
    grid.appendChild(table);
  }

  function renderClassroomReviewPanel(settings, reviewItems = [], deps = {}) {
    const panel = document.getElementById('classroom-teacher-review-panel');
    if(!panel) return;
    panel.hidden = deps.isCurrentClassroomTeacher?.(settings) !== true;
    if(panel.hidden) return;
    renderClassroomReviewList(settings, reviewItems, {
      statusId: 'classroom-review-status',
      gridId: 'classroom-review-grid',
      routineBoardLink: true
    }, deps);
  }

  function renderClassroomRoleState(settings, wallet = {}, deps = {}, data = {}) {
    const questAlert = document.getElementById('classroom-alert-quest');
    const routineAlert = document.getElementById('classroom-alert-routine');
    const pointCount = document.getElementById('classroom-summary-point-count');
    const pointCard = document.getElementById('classroom-summary-my-point-card');
    // '내 포인트' 배지는 학생 전용 — 교사 뷰에서는 숨긴다
    if(pointCard) pointCard.hidden = deps.isCurrentClassroomTeacher?.(settings) === true;
    const progressMap = data.progressMap || {};
    const quests = getVisibleClassroomQuests(settings, deps);
    const pendingQuestCount = quests.filter(quest => !progressMap[quest.id]).length;
    const routines = Array.isArray(data.economyBoard?.routines) ? data.economyBoard.routines : [];
    const pendingRoutineCount = routines.filter(routine => routine.status === 'active' && routine.canCheckToday && !routine.checkedToday && !routine.reviewPending).length;
    if(pointCount) pointCount.textContent = `${formatClassroomPoint(wallet.point || 0)}점`;
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
    const reviewItems = (data.reviewItems || []).filter(item => item.reviewMode !== 'cancelOnly');
    const pendingApplications = (economyBoard.applications || []).filter(item => item.status === 'pending').length;
    const pendingUseRequests = (economyBoard.purchases || []).filter(item => item.status === 'use_requested').length;
    const items = [
      ['활동 검토', `${reviewItems.length}건`, '퀘스트와 성장루틴 확인 대기', 'review'],
      ['쿠폰 요청', `${pendingUseRequests}건`, '마켓에서 사용 요청을 처리해 주세요.', 'shop'],
      ['직업 지원', `${pendingApplications}건`, '직업에서 지원 학생을 확인해 주세요.', 'job']
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
    // 하단 '검토 처리' 목록과 같은 기준을 쓰도록 reviewItems는 숨김 학생 필터를 거치지 않는다
    const reviewItems = Array.isArray(data.reviewItems) ? data.reviewItems : [];
    // '쿠폰/상점 요청' 건수는 마켓 탭 처리 목록과 같은 기준 — 숨김 학생 필터 없음.
    // 최근 활동 표시(visiblePurchases)는 활동 피드와 같은 숨김 정책을 유지한다.
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const visiblePurchases = purchases
      .filter(item => !isHiddenClassroomMember(item.memberUserId || item.userId));
    const assignments = (Array.isArray(economyBoard.assignments) ? economyBoard.assignments : [])
      .filter(item => !isHiddenClassroomMember(item.memberUserId || item.userId));
    const applications = (Array.isArray(economyBoard.applications) ? economyBoard.applications : [])
      .filter(item => !isHiddenClassroomMember(item.memberUserId || item.userId));
    const pointLogs = (Array.isArray(economyBoard.pointLogs) ? economyBoard.pointLogs : [])
      .filter(item => !isHiddenClassroomMember(item.memberUserId || item.userId));
    const questReviews = reviewItems.filter(item => item.itemType !== 'routine');
    const routineReviews = reviewItems.filter(item => item.itemType === 'routine');
    const useRequests = purchases.filter(item => item.status === 'use_requested');
    const pendingApplications = applications.filter(item => item.status === 'pending');
    const recentActivities = [
      ...visiblePurchases
        .filter(item => ['use_requested', 'use_approved', 'used', 'refunded'].includes(item.status))
        .map(item => ({
          label: `${getClassroomMemberDisplayName(item)} · ${item.itemTitle || '쿠폰'} ${getClassroomPurchaseStatusLabel(item.status)}`,
          createdAtMillis: getClassroomItemTimeMillis(item)
        })),
      ...pointLogs.map(item => ({
        label: getClassroomActivityLabel(item),
        createdAtMillis: getClassroomItemTimeMillis(item)
      }))
    ].sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0)).slice(0, 10);
    const sections = [
      {
        title: '퀘스트 검토',
        count: `${questReviews.length}건`,
        tone: 'review',
        rows: questReviews.slice(0, 6).map(item => `${getClassroomMemberDisplayName(item)} · ${getClassroomQuestTitle(settings, item.questId)} · ${getClassroomProgressStatusLabel(item)}`)
      },
      {
        title: '성장루틴 검토',
        count: `${routineReviews.length}건`,
        tone: 'routine',
        rows: routineReviews.slice(0, 6).map(item => `${getClassroomMemberDisplayName(item)} · ${item.routineTitle || item.title || '성장루틴'} · 달성 ${Math.round(Number(item.achievementPercent || 0))}%`)
      },
      {
        title: '쿠폰/상점 요청',
        count: `${useRequests.length}건`,
        tone: 'shop',
        rows: useRequests.slice(0, 6).map(item => `${getClassroomMemberDisplayName(item)} · ${item.itemTitle || '쿠폰'} · 사용 승인 대기`)
      },
      {
        title: '직업 지원',
        count: `${pendingApplications.length}건`,
        tone: 'job',
        rows: pendingApplications.slice(0, 6).map(item => `${getClassroomMemberDisplayName(item)} · ${item.jobTitle || item.jobId || '직업'} 지원`)
      },
      {
        title: '포인트 상위 학생',
        count: `${studentCards.length}명`,
        tone: 'student',
        rows: studentCards.slice().sort((a, b) => Number(b.point || 0) - Number(a.point || 0)).slice(0, 5).map(item => `${getClassroomMemberDisplayName(item)} · ${formatClassroomPoint(item.point || 0)}점`)
      },
      {
        title: '최근 교실 활동',
        count: `${recentActivities.length}건`,
        tone: 'activity',
        rows: recentActivities.map(item => item.label)
      }
    ];
    sections.forEach((sectionData, index) => {
      const section = document.createElement('article');
      const title = document.createElement('h4');
      const count = document.createElement('strong');
      const list = document.createElement('ul');
      section.className = `classroom-report-section classroom-report-section--${index + 1} classroom-report-section--${sectionData.tone}`;
      title.textContent = sectionData.title;
      count.textContent = sectionData.count;
      (sectionData.rows.length ? sectionData.rows : ['표시할 항목이 없습니다.']).forEach(text => {
        const row = document.createElement('li');
        row.textContent = text;
        list.appendChild(row);
      });
      section.append(title, count, list);
      report.appendChild(section);
    });
  }

  function renderClassroomGrowndOverview(data = {}) {
    const wrap = document.getElementById('classroom-grownd-overview');
    if(!wrap) return;
    const economyBoard = data.economyBoard || {};
    const studentCards = Array.isArray(data.studentCards) ? data.studentCards : [];
    const wallet = data.wallet || {};
    const mission = economyBoard.classMission || null;
    const exchange = economyBoard.exchangeSettings || {};
    const gems = Array.isArray(economyBoard.classroomGems) ? economyBoard.classroomGems : [];
    const shopItems = Array.isArray(economyBoard.shopItems) ? economyBoard.shopItems : [];
    const savingsProducts = Array.isArray(economyBoard.savingsProducts) ? economyBoard.savingsProducts : [];
    const totalPoint = Number(economyBoard.classMission?.totalPoint ?? studentCards.reduce((sum, student) => sum + Number(student.point || 0), 0));
    const totalCoin = studentCards.reduce((sum, student) => sum + Number(student.djCoin || 0), 0);
    const nextMission = mission?.thresholds?.find(step => !step.achieved);
    const missionTotal = Number(mission?.totalPoint || 0);
    const missionTarget = Number(nextMission?.targetPoint || 0);
    const missionPercent = missionTarget ? Math.min(100, Math.round((missionTotal / missionTarget) * 100)) : 100;
    const items = [
      {
        key: 'point',
        icon: 'studentCard',
        label: '학급 총 포인트',
        value: `${formatClassroomPoint(totalPoint)}P`,
        detail: `학생 ${studentCards.length}명 합산`
      },
      {
        key: 'coin',
        icon: 'djCoin',
        label: '학급 총 DJ코인',
        value: `${Number(totalCoin || 0).toLocaleString('ko-KR')}개`,
        detail: `내 포인트 ${formatClassroomPoint(wallet.point || 0)}P`
      },
      {
        key: 'mission',
        icon: 'mission',
        label: '다음 학급 미션',
        value: nextMission ? `${formatClassroomPoint(nextMission.targetPoint || 0)}점` : mission?.thresholds?.length ? '전체 달성' : '등록 전',
        detail: nextMission
          ? `${formatClassroomPoint(missionTotal)} / ${formatClassroomPoint(missionTarget)}점 · ${missionPercent}% · ${nextMission.rewardText || '보상 준비'}`
          : mission?.thresholds?.length ? '등록된 목표를 모두 달성했습니다.' : '아직 등록된 학급 미션이 없습니다.'
      },
      {
        key: 'exchange',
        icon: 'exchange',
        label: '환전 은행',
        value: `${formatClassroomPoint(exchange.pointToCoinPointCost || 3)}P → 1 DJ`,
        detail: `1 DJ → ${formatClassroomPoint(exchange.coinToPointReward || 0.5)}P`
      },
      {
        key: 'savings',
        icon: 'bank',
        label: '예금 상품',
        value: `${savingsProducts.length}개`,
        detail: savingsProducts.map(item => `${item.termDays}일 ${item.interestRatePercent}%`).slice(0, 3).join(' · ') || '교사가 설정하면 표시됩니다.'
      },
      {
        key: 'gems',
        icon: 'keyringGem',
        label: '젬스톤',
        value: `${gems.length}개`,
        detail: gems.map(item => item.gemName || item.title || item.gemId).slice(0, 3).join(' · ') || '연결 젬을 준비 중입니다.'
      },
      {
        key: 'market',
        icon: 'pointShop',
        label: '마켓 상품',
        value: `${shopItems.length}개`,
        detail: '포인트샵·코인샵·공동구매'
      }
    ];
    wrap.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('article');
      const icon = createClassroomIconImage(item.icon, item.label, 'classroom-overview-icon');
      const label = document.createElement('span');
      const value = document.createElement('strong');
      const detail = document.createElement('p');
      card.className = 'classroom-overview-card';
      card.dataset.classroomOverviewKey = item.key;
      label.textContent = item.label;
      value.textContent = item.value;
      detail.textContent = item.detail;
      if(icon) card.appendChild(icon);
      card.append(label, value, detail);
      wrap.appendChild(card);
    });
    applyClassroomOverviewTabVisibility();
  }

  // 요약은 홈과 각 기능의 본문에서 제공한다. 이전 상단 요약 슬롯은 호환성을 위해 유지한다.
  const CLASSROOM_OVERVIEW_TAB_CARD_KEYS = {
    today: [],
    classroom: [],
    quest: [],
    routine: [],
    gems: [],
    jobs: [],
    market: [],
    bank: [],
    mission: [],
    teacher: []
  };

  function applyClassroomOverviewTabVisibility(tabName = '') {
    const wrap = document.getElementById('classroom-grownd-overview');
    if(!wrap) return;
    const activeTab = String(tabName
      || document.querySelector('.classroom-tab.is-active')?.dataset.classroomTab
      || 'today');
    const visibleKeys = new Set(CLASSROOM_OVERVIEW_TAB_CARD_KEYS[activeTab] || []);
    let visibleCount = 0;
    wrap.querySelectorAll('[data-classroom-overview-key]').forEach(card => {
      const visible = visibleKeys.has(card.dataset.classroomOverviewKey);
      card.hidden = !visible;
      if(visible) visibleCount += 1;
    });
    wrap.hidden = visibleCount === 0;
  }

  function fillClassroomPortrait(portrait, student = {}, deps = {}) {
    portrait.classList.add('classroom-member-portrait');
    portrait.classList.toggle('is-avatar', student.portraitSource === 'avatar');
    const fallback = () => { portrait.textContent = Array.from(student.nickname || student.name || '나')[0]; };
    const url = deps.normalizeDisplayImageUrl?.(student.profileImageUrl || '') || '';
    if(!url) { fallback(); return; }
    const image = document.createElement('img');
    const avatarSource = student.portraitSource === 'avatar' && window.DJ48ClassroomPortrait?.setAvatarImageSource;
    if(avatarSource) avatarSource(image, url, fallback);
    else image.src = url;
    image.alt = `${student.nickname || student.name || '내'} ${student.portraitSource === 'avatar' ? '아바타' : '프로필 사진'}`;
    image.loading = 'lazy';
    if(student.portraitSource !== 'avatar') {
      const scale = Math.max(.7, Math.min(2.2, Number(student.profileImageScale) || 1));
      const x = Math.max(-45, Math.min(45, Number(student.profileImageOffsetX) || 0));
      const y = Math.max(-45, Math.min(45, Number(student.profileImageOffsetY) || 0));
      image.style.transform = `translate(${x}%, ${y}%) scale(${scale})`;
    }
    if(!avatarSource) image.addEventListener('error', fallback, { once: true });
    portrait.append(image);
  }

  function renderClassroomTodayHome(data = {}, deps = {}) {
    if(deps.isCurrentClassroomTeacher?.(data.settings || {}) !== true && rootCardHome()) {
      window.DJ48ClassroomCardHome.render(data, deps, { fillPortrait: fillClassroomPortrait, quests: getVisibleClassroomQuests(data.settings || {}, deps) });
      return;
    }
    const grid = document.getElementById('classroom-today-grid');
    if(!grid) return;
    const previousRegions = new Map(Array.from(grid.querySelectorAll('[data-classroom-home-region]'))
      .map(element => [element.dataset.classroomHomeRegion, element]));
    const ready = deps.previewReadyKeys ? new Set(deps.previewReadyKeys) : null;
    const region = (element, name, keys, label) => {
      element.dataset.classroomHomeRegion = name;
      if(deps.homeOnly && !['identity','point','coin','quests'].includes(name)) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'classroom-text-action';
        button.dataset.classroomHomeDetails = '';
        button.textContent = `${label} 보기`;
        element.replaceChildren(button);
        return element;
      }
      if(ready && !keys.every(key => ready.has(key))) {
        const message = document.createElement('p');
        message.className = 'classroom-empty-copy';
        message.textContent = `${label} 불러오는 중…`;
        element.replaceChildren(message);
        element.setAttribute('aria-busy', 'true');
      }
      return element;
    };
    const settings = data.settings || {};
    const economy = data.economyBoard || {};
    const teacher = deps.isCurrentClassroomTeacher?.(settings) === true;
    const students = data.studentCards || [];
    const me = students.find(student => student.memberUserId === deps.currentMemberUserId) || {};
    const progress = data.progressMap || {};
    const quests = getVisibleClassroomQuests(settings, deps);
    const pending = quests.filter(quest => !progress[quest.id]);
    const routines = (economy.routines || []).filter(item => item.status !== 'deleted');
    const checkable = routines.filter(item => item.canCheckToday && !item.checkedToday && !item.reviewPending && item.status === 'active');
    const reviews = (data.reviewItems || []).filter(item => item.reviewMode !== 'cancelOnly');
    const node = (tag, className, text) => {
      const element = document.createElement(tag);
      element.className = className;
      if(text !== undefined) element.textContent = text;
      return element;
    };
    const link = (label, tab, className = 'classroom-text-action') => {
      const button = node('button', className, label);
      button.type = 'button';
      button.dataset.classroomTodayTab = tab;
      return button;
    };
    const section = (title, label, tab) => {
      const wrap = node('section', 'classroom-home-section');
      const heading = node('div', 'classroom-section-heading');
      heading.append(node('h3', '', title));
      if(label) heading.append(link(label, tab));
      wrap.append(heading);
      return wrap;
    };
    const row = (title, detail, button, iconKey) => {
      const wrap = node('div', 'classroom-action-row');
      const copy = node('div', 'classroom-action-copy');
      copy.append(node('strong', '', title), node('span', '', detail));
      if(iconKey) {
        const icon = createClassroomIconImage(iconKey, '', 'classroom-task-icon');
        if(icon) wrap.append(icon);
      }
      wrap.append(copy, button);
      return wrap;
    };
    const artwork = (name, className) => {
      const image = document.createElement('img');
      image.src = `/images/classroom/${name}-320.webp`; image.alt = ''; image.className = `classroom-home-art ${className}`;
      image.loading = 'lazy'; image.width = 160; image.height = 160; image.decoding = 'async'; image.setAttribute('aria-hidden', 'true');
      return image;
    };
    grid.replaceChildren();
    const hero = node('section', 'classroom-home-hero');
    const identity = node('div', 'classroom-home-identity');
    const portrait = node(teacher ? 'div' : 'button', 'classroom-home-avatar');
    if(teacher) portrait.append(createClassroomIconImage('studentCard', '', 'classroom-home-avatar-icon'));
    else {
      portrait.type = 'button'; portrait.dataset.classroomEditPortrait = '';
      portrait.setAttribute('aria-label', '내 교실 이미지 설정');
      portrait.title = '사진 또는 마켓 아바타 선택';
      fillClassroomPortrait(portrait, me, deps);
    }
    const greeting = node('div', 'classroom-home-greeting');
    greeting.append(node('p', 'classroom-kicker', teacher ? '담임 선생님' : '오늘의 교실'),
      node('h3', '', teacher ? '우리반의 하루' : `${me.nickname || me.name || '나'}의 오늘`),
      node('p', '', teacher ? (deps.homeOnly ? '학생과 검토할 활동은 메뉴에서 확인하세요.' : `학생 ${students.length}명 · 확인을 기다리는 활동 ${reviews.length}건`) :
        deps.homeOnly ? `퀘스트 ${pending.length}개 · 루틴은 메뉴에서 확인하세요.` : pending.length + checkable.length ? `퀘스트 ${pending.length}개 · 체크할 루틴 ${checkable.length}개` : quests.length || routines.length ? '오늘 할 일을 모두 확인했어요.' : '오늘의 활동을 여기서 확인하세요.'));
    identity.append(portrait, greeting);
    if(!teacher) {
      const edit = node('button', 'classroom-text-action classroom-portrait-edit', '이미지 바꾸기');
      edit.type = 'button'; edit.dataset.classroomEditPortrait = '';
      greeting.append(edit);
    }
    hero.append(identity);
    region(identity, 'identity', ['students', 'progress', 'economy', 'review'], '내 교실 정보');
    const wallet = node('div', 'classroom-home-wallet');
    if(teacher) {
      wallet.append(link('학생 살펴보기', 'classroom', 'classroom-main-action'), link('처리할 일', 'teacher'));
    } else {
      wallet.append(region(link(`${formatClassroomPoint(data.wallet?.point || 0)} P`, 'bank', 'classroom-wallet-link'), 'point', ['wallet'], '포인트'),
        region(link(`${Number(economy.myDjCoin ?? me.djCoin ?? 0).toLocaleString('ko-KR')} DJ코인`, 'market', 'classroom-wallet-link'), 'coin', ['economy'], 'DJ코인'));
    }
    hero.append(wallet);
    grid.append(hero);
    const layout = node('div', 'classroom-home-layout');
    const main = node('div', 'classroom-home-main');
    const aside = node('div', 'classroom-home-aside');
    layout.append(main, aside);
    grid.append(layout);

    const tasks = section(teacher ? '지금 처리할 일' : '오늘 할 일', teacher ? '모두 보기' : '퀘스트 전체', teacher ? 'teacher' : 'quest');
    tasks.classList.add('classroom-checklist-section');
    if(teacher) {
      const requests = (economy.purchases || []).filter(item => item.status === 'use_requested').length;
      const applications = (economy.applications || []).filter(item => item.status === 'pending').length;
      [['활동 검토', `${reviews.length}건 대기`, 'teacher'], ['쿠폰 사용 요청', `${requests}건 대기`, 'market'],
        ['직업 지원', `${applications}건 대기`, 'jobs']].forEach(([label, detail, tab]) => {
        const button = link('확인하기', tab, 'classroom-main-action');
        if(tab === 'market') button.dataset.classroomMarketTarget = 'inventory';
        tasks.append(row(label, detail, button, tab === 'teacher' ? 'quest' : tab === 'market' ? 'inventory' : 'studentCard'));
      });
      region(tasks, 'reviews', ['review', 'economy'], '처리할 일');
    } else {
      const questTasks = node('div', 'classroom-home-task-group');
      pending.slice(0, 3).forEach(quest => {
        const button = node('button', 'classroom-main-action', quest.rewardMode === 'auto' ? '완료 체크' : '검토 요청');
        button.type = 'button';
        button.dataset.classroomQuestAction = quest.id;
        questTasks.append(row(quest.title, getClassroomQuestRewardText(quest), button, 'quest'));
      });
      if(!pending.length) questTasks.append(node('p', 'classroom-empty-copy', quests.length ? '퀘스트를 모두 확인했어요.' : '오늘 등록된 퀘스트가 없습니다.'));
      tasks.append(region(questTasks, 'quests', ['settings', 'progress'], '오늘 할 일'));
      const routineTasks = node('div', 'classroom-home-task-group');
      const routineHeading = node('div', 'classroom-section-heading classroom-routine-home-heading');
      routineHeading.append(node('h4', '', '성장루틴'), link('루틴 보기', 'routine'));
      routineTasks.append(routineHeading);
      checkable.slice(0, 2).forEach(routine => routineTasks.append(row(routine.title || '성장루틴',
        `${routine.currentCount || 0}/${routine.targetCount || 1}회 · 오늘 체크할 수 있어요`, link('체크하러 가기', 'routine', 'classroom-main-action'), 'routine')));
      if(!checkable.length) routineTasks.append(node('p', 'classroom-empty-copy', routines.length ? '오늘 체크할 루틴을 모두 확인했어요.' : '반복하고 싶은 습관을 루틴으로 만들어 보세요.'));
      tasks.append(region(routineTasks, 'routines', ['economy'], '성장루틴'));
    }
    main.append(tasks);

    if(teacher) {
      const roster = section('우리반 학생', '전체 학생', 'classroom');
      const list = node('div', 'classroom-home-roster');
      students.slice().sort((a, b) => Number(a.studentNumber || 0) - Number(b.studentNumber || 0)).slice(0, 8).forEach(student => {
        const button = link('', 'classroom', 'classroom-roster-link');
        button.dataset.classroomStudentTarget = student.memberUserId || '';
        const face = node('span', 'classroom-roster-portrait');
        fillClassroomPortrait(face, student, deps);
        button.append(face, node('span', '', getClassroomMemberDisplayName(student)), node('small', '', `${formatClassroomPoint(student.point || 0)} P`));
        list.append(button);
      });
      if(!students.length) roster.append(node('p', 'classroom-empty-copy', '아직 등록된 학생이 없습니다.'));
      roster.append(list);
      main.append(region(roster, 'students', ['students'], '학생 목록'));
    } else {
      const growth = section('나의 성장', '젬스톤 보기', 'gems');
      growth.classList.add('classroom-growth-section');
      growth.append(artwork('reading-sprout', 'classroom-growth-art'));
      const gems = data.gemProgress || [];
      const next = gems.find(gem => !gem.completed);
      if(next) {
        const stage = getClassroomGemStage(next, Number(next.currentXp || 0));
        const target = Math.max(1, Number(stage.next?.xp || next.targetXp || 1));
        growth.append(node('strong', 'classroom-growth-name', next.gemName || '성장 중인 젬스톤'),
          node('p', '', `${next.currentXp || 0}/${target}회 · ${stage.next ? `${stage.next.label}까지 ${Math.max(0, target - Number(next.currentXp || 0))}회` : '목표 달성'}`),
          createClassroomProgressMeter(Math.min(100, Math.round(Number(next.currentXp || 0) / target * 100))));
      } else growth.append(node('p', 'classroom-empty-copy', gems.length ? '모든 젬스톤 목표를 달성했어요!' : '활동과 연결된 젬스톤이 이곳에 표시됩니다.'));
      const assignment = economy.myAssignment || (economy.assignments || []).find(item => item.memberUserId === deps.currentMemberUserId && item.status === 'active');
      growth.append(row('내 직업', assignment?.jobTitle || '아직 맡은 직업이 없어요.', link('직업 보기', 'jobs')));
      // The completed model merges authorized gem metadata before showing growth.
      aside.append(region(growth, 'growth', ['mergedGems'], '나의 성장'));
    }

    const mission = economy.classMission;
    if(deps.homeOnly || (ready && !ready.has('economy')) || (mission && (mission.thresholds || []).length)) {
      const missionSection = section('우리반 미션', '목표 보기', 'mission');
      missionSection.classList.add('classroom-mission-section');
      missionSection.append(artwork('community-tree', 'classroom-mission-art'));
      const next = mission?.thresholds?.find(step => !step.achieved);
      missionSection.append(node('strong', '', mission?.title || '함께 모으는 포인트'));
      if(next) {
        missionSection.append(node('p', '', `${formatClassroomPoint(mission.totalPoint || 0)} / ${formatClassroomPoint(next.targetPoint || 0)} P`),
          createClassroomProgressMeter(Math.min(100, Math.round(Number(mission.totalPoint || 0) / Math.max(1, Number(next.targetPoint || 0)) * 100))),
          node('p', '', next.rewardText || '다음 목표를 향해 함께 도전해요.'));
      } else missionSection.append(node('p', '', '등록된 목표를 모두 달성했어요!'));
      (teacher ? aside : main).append(region(missionSection, 'mission', ['economy'], '우리반 미션'));
    }
    const notices = (economy.classNotices?.slots || []).filter(slot => String(slot.text || '').trim());
    const messages = economy.billboardMessages || [];
    const bulletin = section('우리반 소식');
    notices.slice(0, 2).forEach(slot => {
      const notice = node('article', 'classroom-home-notice');
      notice.append(node('strong', '', slot.label || '학급 알림'), node('p', '', slot.text));
      bulletin.append(notice);
    });
    if(notices.length > 2) {
      const more = node('details', 'classroom-notices-more');
      more.append(node('summary', '', `알림 ${notices.length - 2}개 더 보기`));
      notices.slice(2).forEach(slot => more.append(row(slot.label || '학급 알림', slot.text, node('span', ''))));
      bulletin.append(more);
    }
    messages.slice(0, 5).forEach(message => {
      const note = node('div', 'classroom-home-message');
      const student = students.find(item => item.memberUserId === message.memberUserId);
      note.append(node('small', '', student ? getClassroomMemberDisplayName(student) : '우리반 한마디'), node('p', '', message.text || ''));
      if(teacher && message.messageId) {
        const button = node('button', 'classroom-text-action', '삭제');
        button.type = 'button';
        button.dataset.classroomBillboardDeleteId = message.messageId;
        button.setAttribute('aria-label', '게시판 한마디 삭제');
        note.append(button);
      }
      bulletin.append(note);
    });
    if(!notices.length && !messages.length) bulletin.append(node('p', 'classroom-empty-copy', '새로운 학급 소식이 없습니다.'));
    aside.append(region(bulletin, 'notices', ['economy', 'students'], '우리반 소식'));
    grid.querySelectorAll('[data-classroom-home-region]').forEach(element => {
      const previous = previousRegions.get(element.dataset.classroomHomeRegion);
      if(previous?.outerHTML === element.outerHTML) element.replaceWith(previous);
    });
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
    const name = getClassroomMemberDisplayName(item);
    const point = formatClassroomPoint(item.rewardAmount || item.rewardPoint || 0);
    if(item.type === 'classroom_auto_quest') return `${name} · ${item.questTitle || '퀘스트'} 완료, 포인트 ${point}`;
    if(item.type === 'classroom_review_quest') return `${name} · ${item.questTitle || '퀘스트'} 승인, 포인트 ${point}`;
    if(item.type === 'classroom_routine_review') return `${name} · ${item.routineTitle || '성장루틴'} 승인, 포인트 ${point}`;
    if(item.type === 'classroom_level_up_reward') return `${name} · 레벨업, 포인트 ${point}`;
    if(item.type === 'dj_coin_mirror_point' && item.sourceType === 'title_acquisition') return `${name} · ${item.sourceLabel || '타이틀'} 획득, 포인트 ${point}`;
    if(item.type === 'dj_coin_mirror_point') return `${name} · 보상 연동, 포인트 ${point}`;
    if(item.type === 'classroom_title_reward') return `${name} · ${item.titleName || '타이틀'} 획득, 포인트 ${point}`;
    if(item.itemTitle) return `${name} · ${item.itemTitle} 구매`;
    if(item.jobTitle) return `${name} · ${item.jobTitle} 월급`;
    if(item.routineTitle) return `${name} · ${item.routineTitle} 루틴 보상, 포인트 ${point}`;
    return `${name} · 포인트 ${point}`;
  }

  function renderClassroomActivityFeed(economyBoard = {}) {
    const feed = document.getElementById('classroom-activity-feed');
    if(!feed) return;
    const pointLogs = Array.isArray(economyBoard.pointLogs) ? economyBoard.pointLogs : [];
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const useRequests = purchases.filter(item => ['use_requested', 'use_approved', 'used'].includes(item.status))
      .map(item => ({
        label: `${getClassroomMemberDisplayName(item)} · ${item.itemTitle || '쿠폰'} ${getClassroomPurchaseStatusLabel(item.status)}`,
        memberUserId: item.memberUserId || '',
        createdAtMillis: getClassroomItemTimeMillis(item)
      }));
    const activities = [
      ...useRequests,
      ...pointLogs.map(item => ({
        label: getClassroomActivityLabel(item),
        memberUserId: item.memberUserId || '',
        createdAtMillis: getClassroomItemTimeMillis(item)
      }))
    ]
      .filter(item => !isHiddenClassroomMember(item.memberUserId))
      .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0))
      .slice(0, 10);
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

  function renderClassroomQuestPickers(data = {}) {
    const targetPicker = document.getElementById('classroom-quest-target-picker');
    const gemPicker = document.getElementById('classroom-quest-gem-picker');
    const targetInput = document.getElementById('classroom-quest-targets-input');
    const gemInput = document.getElementById('classroom-quest-gem-name-input');
    const studentCards = Array.isArray(data.studentCards) ? data.studentCards : [];
    const classroomGems = Array.isArray(data.economyBoard?.classroomGems) ? data.economyBoard.classroomGems : [];
    if(targetPicker && targetInput) {
      const selected = new Set(String(targetInput.value || '').replace('대상 없음', '__none__').split(',').map(value => value.trim()).filter(Boolean));
      const noTargetSelected = selected.has('__none__');
      targetPicker.innerHTML = '';
      const syncTargetInput = () => {
        const checkboxes = Array.from(targetPicker.querySelectorAll('input[type="checkbox"]'));
        const checkedValues = checkboxes.filter(item => item.checked).map(item => item.value);
        targetInput.value = checkedValues.length === checkboxes.length
          ? ''
          : checkedValues.length
            ? checkedValues.join(', ')
            : '대상 없음';
      };
      if(studentCards.length) {
        const toolbar = document.createElement('div');
        const allButton = document.createElement('button');
        const noneButton = document.createElement('button');
        toolbar.className = 'classroom-picker-toolbar';
        allButton.type = 'button';
        noneButton.type = 'button';
        allButton.textContent = '전체 선택';
        noneButton.textContent = '전체 해제';
        allButton.addEventListener('click', () => {
          targetPicker.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.checked = true;
          });
          targetInput.value = '';
        });
        noneButton.addEventListener('click', () => {
          targetPicker.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.checked = false;
          });
          targetInput.value = '대상 없음';
        });
        toolbar.append(allButton, noneButton);
        targetPicker.appendChild(toolbar);
      }
      if(!studentCards.length) {
        const empty = document.createElement('p');
        empty.textContent = '학생 목록을 불러오면 여기에서 대상 학생을 선택할 수 있습니다.';
        targetPicker.appendChild(empty);
      }
      studentCards.forEach(student => {
        const id = String(student.memberUserId || '').trim();
        if(!id) return;
        const label = document.createElement('label');
        const input = document.createElement('input');
        const name = document.createElement('span');
        input.type = 'checkbox';
        input.value = id;
        input.checked = !noTargetSelected && (!selected.size || selected.has(id));
        input.addEventListener('change', syncTargetInput);
        name.textContent = `${student.studentNumber ? `${student.studentNumber}번 ` : ''}${student.nickname || student.name || id}`;
        label.append(input, name);
        targetPicker.appendChild(label);
      });
    }
    if(gemPicker && gemInput) {
      if(data.requiredKeys?.includes('economy') && !data.loadedKeys?.includes('economy')) { gemPicker.textContent = window.DJ48ClassroomState?.hasLoadError?.('economy') ? '젬 목록을 불러오지 못했습니다. 다시 불러와 주세요.' : '젬 목록 로딩 중 · 계속 표시되면 다시 불러와 주세요.'; return; }
      const currentGems = new Set(String(gemInput.value || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean));
      gemPicker.innerHTML = '';
      const syncGemInput = () => {
        const checkedNames = Array.from(gemPicker.querySelectorAll('input[data-classroom-gem-choice]:checked'))
          .map(input => input.dataset.gemName)
          .filter(Boolean);
        gemInput.dataset.unresolved = '';
        gemInput.dataset.gemIds = Array.from(gemPicker.querySelectorAll('input[data-classroom-gem-choice]:checked')).map(input => input.value).join(',');
        gemInput.value = checkedNames.join(', ');
      };
      const noneLabel = document.createElement('label');
      const noneInput = document.createElement('input');
      const noneText = document.createElement('span');
      noneInput.type = 'radio';
      noneInput.name = 'classroom-quest-gem-choice';
      noneInput.value = '';
      noneInput.checked = !currentGems.size;
      noneInput.addEventListener('change', () => {
        if(noneInput.checked) {
          gemPicker.querySelectorAll('input[data-classroom-gem-choice]').forEach(input => {
            input.checked = false;
          });
          gemInput.value = '';
          gemInput.dataset.gemIds = '';
          gemInput.dataset.unresolved = '';
        }
      });
      noneText.textContent = '연결 없음';
      noneLabel.append(noneInput, noneText);
      gemPicker.appendChild(noneLabel);
      if(!classroomGems.length) { const empty=document.createElement('p'); empty.textContent='등록된 젬이 없습니다.'; gemPicker.appendChild(empty); }
      classroomGems.forEach(gem => {
        const gemName = String(gem.gemName || gem.title || gem.gemId || '').trim();
        if(!gemName) return;
        const label = document.createElement('label');
        const input = document.createElement('input');
        const name = document.createElement('span');
        const targetCount = Math.max(1, Math.round(Number(gem.targetXp || gem.gemTargetXp || 10) || 10));
        input.type = 'checkbox';
        input.dataset.classroomGemChoice = 'true';
        input.value = String(gem.gemId || gem.id || '');
        input.dataset.gemName = gemName;
        const selectedIds = (gemInput.dataset.gemIds || '').split(',').filter(Boolean);
        input.checked = selectedIds.length ? selectedIds.includes(input.value) : currentGems.has(gemName) && classroomGems.filter(g => g.gemName === gemName).length === 1;
        input.addEventListener('change', () => {
          if(input.checked) noneInput.checked = false;
          if(!gemPicker.querySelectorAll('input[data-classroom-gem-choice]:checked').length) noneInput.checked = true;
          syncGemInput();
        });
        name.textContent = `${gemName} (${input.value}) · ${targetCount}회 달성`;
        label.append(input, name);
        gemPicker.appendChild(label);
      });
      const savedIds = (gemInput.dataset.gemIds || '').split(',').filter(Boolean);
      const choices = Array.from(gemPicker.querySelectorAll('input[data-classroom-gem-choice]'));
      const unresolved = savedIds.length ? savedIds.some(id => !choices.some(n => n.value === id))
        : Array.from(currentGems).some(name => choices.filter(n => n.dataset.gemName === name).length !== 1);
      gemInput.dataset.unresolved = unresolved ? 'true' : '';
      if(unresolved) { const warning=document.createElement('p'); warning.textContent='기존 젬을 구분할 수 없습니다. ID를 확인하여 다시 선택하거나 연결 없음을 선택해 주세요.'; gemPicker.appendChild(warning); }
      else if(!savedIds.length && currentGems.size) syncGemInput();
    }
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

  function getVisibleClassroomQuests(settings = {}, deps = {}) {
    const teacher = deps.isCurrentClassroomTeacher?.(settings) === true;
    return (settings.quests || []).filter(quest => quest.active !== false && (teacher || quest.saveEnabled !== false))
      .filter(quest => isClassroomQuestVisibleForMember(quest, deps.currentMemberUserId || '', deps.getTodayDateKey?.() || '', teacher));
  }

  function getClassroomQuestRewardText(quest = {}) {
    const currency = quest.rewardCurrency === 'coin' || quest.rewardCurrency === 'djCoin' ? 'DJ코인' : 'P';
    const amount = Number(quest.rewardPoint ?? quest.rewardCoin ?? 0);
    const gems = quest.linkedGemNames?.length ? quest.linkedGemNames : quest.linkedGemName ? [quest.linkedGemName] : [];
    return [`+${formatClassroomPoint(amount)} ${currency}`, ...gems.map(name => `${name} +1`)].join(' · ');
  }

  function isClassroomQuestVisibleForMember(quest = {}, memberUserId = '', todayKey = '', canManage = false) {
    if(canManage) return true;
    const targetIds = Array.isArray(quest.targetStudentIds) ? quest.targetStudentIds.map(String) : [];
    if(targetIds.length && !targetIds.includes(String(memberUserId || ''))) return false;
    if(quest.startDate && todayKey && todayKey < String(quest.startDate)) return false;
    if(quest.endDate && todayKey && todayKey > String(quest.endDate)) return false;
    return true;
  }

  function getClassroomQuestPeriodLabel(quest = {}) {
    if(quest.startDate && quest.endDate) return `${quest.startDate}~${quest.endDate}`;
    if(quest.startDate) return `${quest.startDate}부터`;
    if(quest.endDate) return `${quest.endDate}까지`;
    return '상시 노출';
  }

  function getClassroomQuestAudienceLabel(quest = {}) {
    const targetCount = Array.isArray(quest.targetStudentIds) ? quest.targetStudentIds.length : 0;
    if(!targetCount) return '전체 대상';
    if(quest.targetStudentIds.includes('__none__')) return '대상 없음';
    return `${targetCount}명 대상`;
  }

  function getClassroomQuestStatusBucket(quest = {}, progress = null) {
    if(quest.active === false) return 'inactive';
    if(progress?.rewardStatus === 'paid' || progress?.rewardStatus === 'approved') return 'done';
    if(progress) return 'review';
    return 'todo';
  }

  function isClassroomQuestMatchedByFilter(quest = {}, progress = null) {
    const category = quest.category || '미분류';
    const status = getClassroomQuestStatusBucket(quest, progress);
    const targetIds = Array.isArray(quest.targetStudentIds) ? quest.targetStudentIds : [];
    const audience = targetIds.length && !targetIds.includes('__none__') ? 'targeted' : targetIds.includes('__none__') ? 'none' : 'all';
    if(classroomQuestFilterState.category !== 'all' && classroomQuestFilterState.category !== category) return false;
    if(classroomQuestFilterState.status !== 'all' && classroomQuestFilterState.status !== status) return false;
    if(classroomQuestFilterState.audience !== 'all' && classroomQuestFilterState.audience !== audience) return false;
    return true;
  }

  function renderClassroomQuestSummary(settings = {}, visibleQuests = [], filteredQuests = [], progressMap = {}, deps = {}) {
    const body = document.getElementById('classroom-quest-body');
    const grid = document.getElementById('classroom-quest-grid');
    if(!body || !grid) return;
    let wrap = document.getElementById('classroom-quest-summary');
    if(!wrap) {
      wrap = document.createElement('section');
      wrap.id = 'classroom-quest-summary';
      wrap.className = 'classroom-feature-management-panel classroom-quest-summary';
      body.insertBefore(wrap, grid);
    }
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const activeQuests = (settings.quests || []).filter(quest => quest.active !== false);
    const filtersWereExpanded = canManage && wrap.querySelector('[data-classroom-quest-filter-toggle]')?.getAttribute('aria-expanded') === 'true';
    const reviewCount = visibleQuests.filter(quest => getClassroomQuestStatusBucket(quest, progressMap[quest.id] || null) === 'review').length;
    const doneCount = visibleQuests.filter(quest => getClassroomQuestStatusBucket(quest, progressMap[quest.id] || null) === 'done').length;
    const categories = Array.from(new Set(activeQuests.map(quest => quest.category || '미분류'))).sort((a, b) => a.localeCompare(b, 'ko-KR'));
    const createSelect = (labelText, key, options) => {
      const label = document.createElement('label');
      const labelSpan = document.createElement('span');
      const select = document.createElement('select');
      labelSpan.textContent = labelText;
      select.dataset.classroomQuestFilter = key;
      options.forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
      });
      select.value = classroomQuestFilterState[key] || 'all';
      select.addEventListener('change', () => {
        classroomQuestFilterState[key] = select.value || 'all';
        renderClassroomQuestCards(settings, progressMap, deps);
        wrap.querySelector(`[data-classroom-quest-filter="${key}"]`)?.focus({ preventScroll: true });
      });
      label.append(labelSpan, select);
      return label;
    };
    wrap.innerHTML = '';
    const statGrid = document.createElement('div');
    const filterBar = document.createElement('div');
    statGrid.className = 'classroom-quest-stat-grid';
    filterBar.className = 'classroom-quest-filter-bar';
    (canManage ? [
      ['등록 퀘스트', `${activeQuests.length}개`],
      ['검토 요청', `${(deps.reviewItems || []).filter(item => item.itemType !== 'routine' && item.reviewMode !== 'cancelOnly').length}건`],
      ['현재 표시', `${filteredQuests.length}개`]
    ] : [
      ['할 일', `${visibleQuests.filter(quest => !progressMap[quest.id]).length}개`],
      ['검토 중', `${reviewCount}개`],
      ['완료', `${doneCount}개`]
    ]).forEach(([label, value]) => {
      const card = document.createElement('article');
      const labelEl = document.createElement('span');
      const valueEl = document.createElement('strong');
      labelEl.textContent = label;
      valueEl.textContent = value;
      card.append(labelEl, valueEl);
      statGrid.appendChild(card);
    });
    filterBar.append(
      createSelect('카테고리', 'category', [['all', '전체'], ...categories.map(category => [category, category])]),
      createSelect('상태', 'status', [
        ['all', '전체'],
        ['review', '검토 요청 있음']
      ]),
      createSelect('대상', 'audience', [
        ['all', '전체'],
        ['targeted', '대상 지정'],
        ['none', '대상 없음']
      ])
    );
    if(!canManage) {
      filterBar.replaceChildren();
      filterBar.classList.add('classroom-filter-pills');
      [['all', '전체'], ['todo', '할 일'], ['review', '검토 중'], ['done', '완료']].forEach(([key, label]) => {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.classroomStudentQuestFilter = key;
        button.className = 'classroom-filter-pill';
        button.setAttribute('aria-pressed', String(classroomStudentQuestFilter === key));
        const count = key === 'all' ? visibleQuests.length : visibleQuests.filter(quest => getClassroomQuestStatusBucket(quest, progressMap[quest.id]) === key).length;
        button.textContent = `${label} ${count}`;
        button.addEventListener('click', () => {
          classroomStudentQuestFilter = key;
          renderClassroomQuestCards(settings, progressMap, deps);
          wrap.querySelector(`[data-classroom-student-quest-filter="${key}"]`)?.focus();
        });
        filterBar.append(button);
      });
    }
    wrap.append(statGrid);
    if(canManage) {
      const activeFilterCount = Object.values(classroomQuestFilterState).filter(value => value !== 'all').length;
      const toggle = document.createElement('button');
      toggle.type = 'button'; toggle.className = 'classroom-quest-filter-toggle classroom-soft-action';
      toggle.dataset.classroomQuestFilterToggle = '';
      toggle.textContent = activeFilterCount ? `필터 · ${activeFilterCount}개 적용 중` : '필터';
      filterBar.id = 'classroom-quest-filters';
      toggle.setAttribute('aria-controls', filterBar.id);
      const setExpanded = expanded => {
        toggle.setAttribute('aria-expanded', String(expanded));
        filterBar.classList.toggle('is-collapsed', !expanded);
      };
      setExpanded(filtersWereExpanded || activeFilterCount > 0);
      toggle.addEventListener('click', () => setExpanded(toggle.getAttribute('aria-expanded') !== 'true'));
      wrap.append(toggle);
    }
    wrap.append(filterBar);
  }

  function renderClassroomQuestCards(settings = {}, progressMap = {}, deps = {}) {
    const grid = document.getElementById('classroom-quest-grid');
    if(!grid) return;
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const todayKey = deps.getTodayDateKey?.() || '';
    grid.innerHTML = '';
    const visibleQuests = getVisibleClassroomQuests(settings, deps);
    const filteredQuests = canManage
      ? visibleQuests.filter(quest => {
        const hasReview = (deps.reviewItems || []).some(item => item.questId === quest.id && item.itemType !== 'routine' && item.reviewMode !== 'cancelOnly');
        return isClassroomQuestMatchedByFilter(quest, hasReview ? { rewardStatus: 'pending_teacher_review' } : null);
      })
      : visibleQuests.filter(quest => classroomStudentQuestFilter === 'all' || getClassroomQuestStatusBucket(quest, progressMap[quest.id]) === classroomStudentQuestFilter);
    renderClassroomQuestSummary(settings, visibleQuests, filteredQuests, progressMap, deps);
    if(!visibleQuests.length) {
      renderEmptyClassroomCard(grid, '오늘 할 일', '표시할 교실 퀘스트가 없습니다', '담임이 퀘스트를 열면 이곳에 나타납니다.');
      return;
    }
    if(!filteredQuests.length) {
      renderEmptyClassroomCard(grid, '필터', '조건에 맞는 퀘스트가 없습니다', '카테고리, 상태, 대상 필터를 조정해 보세요.');
      return;
    }
    filteredQuests.forEach(quest => {
      const progress = progressMap[quest.id] || null;
      const card = document.createElement('article');
      const icon = createClassroomIllustration(getClassroomQuestArt(quest), 'classroom-feature-visual', document.getElementById('classroom-view')?.dataset.activeTab === 'quest');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const button = document.createElement('button');
      const actions = document.createElement('div');
      const repeatLabel = quest.repeatRule === 'daily' ? '매일' : quest.repeatRule === 'weekly' ? '매주' : '한 번';
      const categoryLabel = quest.category ? `${quest.category} · ` : '';
      card.className = `classroom-card classroom-card--quest${progress ? ' is-complete' : ''}`;
      card.dataset.classroomQuestId = quest.id;
      badge.className = 'classroom-card-badge';
      badge.textContent = `${categoryLabel}${repeatLabel}`;
      title.textContent = quest.title;
      desc.textContent = quest.desc;
      reward.className = 'classroom-card-reward';
      reward.textContent = getClassroomQuestRewardText(quest);
      status.className = `quest-status ${progress ? getClassroomProgressStatusClass(progress) : 'quest-status-active'}`;
      status.textContent = canManage
        ? (quest.startDate && todayKey < quest.startDate ? '시작 전' : quest.endDate && todayKey > quest.endDate ? '기간 종료' : '게시 중')
        : progress ? getClassroomProgressStatusLabel(progress) : (quest.status || '진행 가능');
      actions.className = 'classroom-review-actions';
      if(!canManage) {
        button.className = 'quest-claim-button';
        button.type = 'button';
        button.dataset.classroomQuestAction = quest.id;
        button.disabled = !quest.saveEnabled || !!progress;
        button.textContent = progress ? getClassroomProgressButtonLabel(progress) : !quest.saveEnabled ? '준비 중' : quest.rewardMode === 'auto' ? '완료 체크' : '검토 요청';
        actions.appendChild(button);
        if(progress) {
          const details = document.createElement('button');
          details.type = 'button'; details.className = 'quest-claim-button';
          details.dataset.classroomQuestAction = quest.id; details.textContent = '내 제출·피드백 보기';
          actions.appendChild(details);
        }
      }
      if(canManage) {
        const editButton = document.createElement('button');
        const duplicateButton = document.createElement('button');
        const upButton = document.createElement('button');
        const downButton = document.createElement('button');
        const deactivateButton = document.createElement('button');
        const deleteButton = document.createElement('button');
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
        deleteButton.className = 'quest-claim-button danger';
        deleteButton.type = 'button';
        deleteButton.dataset.classroomQuestDeleteId = quest.id || '';
        deleteButton.textContent = '삭제';
        const more = document.createElement('details');
        more.className = 'classroom-card-more';
        const summary = document.createElement('summary');
        summary.textContent = '더보기';
        const menu = document.createElement('div');
        menu.className = 'classroom-more-actions';
        menu.append(duplicateButton, upButton, downButton, deactivateButton, deleteButton);
        more.append(summary, menu);
        actions.append(editButton, more);
        const audience = document.createElement('p');
        audience.className = 'classroom-quest-audience';
        audience.textContent = `${getClassroomQuestAudienceLabel(quest)} · ${getClassroomQuestPeriodLabel(quest)}`;
        card.append(audience);
      }
      const copy = document.createElement('div'); copy.className = 'classroom-quest-copy';
      const footer = document.createElement('div'); footer.className = 'classroom-quest-action-area';
      copy.append(badge, title, desc, reward, ...Array.from(card.childNodes));
      if(!canManage && (quest.startDate || quest.endDate)) {
        const period = document.createElement('p'); period.className = 'classroom-quest-period';
        period.textContent = getClassroomQuestPeriodLabel(quest); copy.append(period);
      }
      footer.append(status, actions);
      card.replaceChildren(icon, copy, footer);
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
    card.append(createClassroomIllustration('/images/classroom/stationery/empty-160.webp', 'classroom-empty-art'), badge, title, desc);
    grid.appendChild(card);
  }

  function getClassroomGemMilestones(gem = {}) {
    const milestones = Array.isArray(gem.milestones) ? gem.milestones : [];
    if(milestones.length) {
      return milestones
        .map((item, index) => ({
          xp: Math.max(1, Math.round(Number(item.xp || item.targetXp || 0) || 0)),
          label: String(item.label || item.name || `${gem.gemName || '젬스톤'} ${index + 1}단계`).trim()
        }))
        .filter(item => item.xp > 0)
        .sort((a, b) => a.xp - b.xp);
    }
    const targetXp = Math.max(1, Math.round(Number(gem.targetXp || 10) || 10));
    return [
      { xp: targetXp, label: `${gem.gemName || '젬스톤'} I` },
      { xp: Math.max(targetXp, 50), label: `${gem.gemName || '젬스톤'} II` },
      { xp: Math.max(targetXp, 100), label: `${gem.gemName || '젬스톤'} III` }
    ].filter((item, index, arr) => index === 0 || item.xp !== arr[index - 1].xp);
  }

  function getClassroomGemStage(gem = {}, currentXp = 0) {
    const milestones = getClassroomGemMilestones(gem);
    const achieved = milestones.filter(item => currentXp >= item.xp);
    const next = milestones.find(item => currentXp < item.xp) || null;
    return {
      milestones,
      achieved,
      currentLabel: achieved.length ? achieved[achieved.length - 1].label : '성장 전',
      next
    };
  }

  function renderClassroomGemCards(gemProgress = [], economyBoard = {}) {
    const grid = document.getElementById('classroom-gem-grid');
    if(!grid) return;
    const progressByGemId = new Map((Array.isArray(gemProgress) ? gemProgress : []).map(gem => [String(gem.gemId || gem.id || ''), gem]));
    const catalog = Array.isArray(economyBoard.classroomGems) && economyBoard.classroomGems.length
      ? economyBoard.classroomGems
      : Array.isArray(gemProgress) ? gemProgress : [];
    const gems = catalog.map(gem => ({
      ...gem,
      ...(progressByGemId.get(String(gem.gemId || gem.id || '')) || {})
    }));
    grid.innerHTML = '';
    if(!gems.length) {
      renderEmptyClassroomCard(grid, '준비 중', '아직 생성된 젬스톤이 없습니다', '담임이 젬스톤을 만들면 이곳에 전체 목록이 표시됩니다.');
      return;
    }
    gems.forEach(gem => {
      const currentXp = Number(gem.currentXp || 0);
      const stage = getClassroomGemStage(gem, currentXp);
      const targetXp = Math.max(1, Number(stage.next?.xp || stage.milestones[stage.milestones.length - 1]?.xp || gem.targetXp || 1));
      const selectableXp = Math.max(1, Number(gem.targetXp || stage.milestones[0]?.xp || 1));
      const canSelectBadge = gem.completed === true || currentXp >= selectableXp;
      const percent = Math.min(100, Math.round((currentXp / targetXp) * 100));
      const completed = !stage.next && currentXp > 0;
      const card = document.createElement('article');
      const icon = createClassroomIconImage(gem.icon, gem.gemName || '교실 젬', 'classroom-card-icon-image')
        || createClassroomCardIcon('gem', completed ? '◆' : '◇');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const progress = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const button = document.createElement('button');
      const detail = document.createElement('details');
      const detailSummary = document.createElement('summary');
      const detailBody = document.createElement('div');
      card.className = `classroom-card classroom-card--gem${completed ? ' is-complete' : ''}`;
      card.dataset.classroomGemState = completed ? 'done' : currentXp > 0 ? 'growing' : 'new';
      badge.className = 'classroom-card-badge';
      badge.textContent = completed ? '최고 단계' : currentXp > 0 ? '성장 중' : '시작 전';
      title.textContent = gem.gemName || gem.gemId || '교실 젬';
      progress.className = 'classroom-card-progress';
      progress.textContent = `${stage.currentLabel} · ${currentXp}/${targetXp}회 (${percent}%)`;
      reward.className = 'classroom-card-reward';
      const rewardParts = [];
      if(Number(gem.rewardPoint || 0) > 0) rewardParts.push(`${formatClassroomPoint(gem.rewardPoint)} 포인트`);
      if(Number(gem.rewardCoin || 0) > 0) rewardParts.push(`${Number(gem.rewardCoin || 0).toLocaleString('ko-KR')} DJ코인`);
      reward.textContent = stage.next
        ? `다음 단계: ${stage.next.label}까지 ${Math.max(0, stage.next.xp - currentXp)}회${rewardParts.length ? ` · 최종 보상 ${rewardParts.join(' + ')}` : ''}`
        : `모든 성장 단계 달성${rewardParts.length ? ` · 보상 ${rewardParts.join(' + ')}` : ''}`;
      status.className = `quest-status ${completed ? 'quest-status-claimed' : 'quest-status-active'}`;
      status.textContent = stage.next ? '연결 퀘스트를 완료해 경험치를 모으세요' : '젬스톤 최고 단계입니다';
      detail.className = 'classroom-gem-progress-toggle';
      detail.open = true;
      detailSummary.textContent = '내 경험치 보기';
      detailBody.className = 'classroom-gem-progress-detail';
      stage.milestones.forEach(item => {
        const row = document.createElement('span');
        row.textContent = `${currentXp >= item.xp ? '획득 ' : ''}${item.label} · ${Math.min(currentXp, item.xp)}/${item.xp}`;
        row.className = currentXp >= item.xp ? 'is-achieved' : '';
        detailBody.appendChild(row);
      });
      detail.append(detailSummary, detailBody);
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomBadgeGemId = gem.gemId || '';
      button.disabled = !canSelectBadge;
      button.textContent = canSelectBadge ? '대표 키링으로 설정' : '첫 단계 달성 후 설정';
      card.append(icon, badge, title, progress, createClassroomProgressMeter(percent), reward, status, detail, button);
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
      ['누적 횟수', `${totalXp.toLocaleString('ko-KR')}회`]
    ];
    summary.innerHTML = '';
    items.forEach(([label, value]) => {
      const item = document.createElement('span');
      item.textContent = `${label} ${value}`;
      summary.appendChild(item);
    });
  }

  function renderClassroomGemManagementOverview(data = {}, deps = {}) {
    const settings = data.settings || {};
    const economyBoard = data.economyBoard || {};
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const panel = ensureClassroomPanelIntro('classroom-gem-management-overview', 'classroom-gem-grid');
    if(!panel) return;
    const progressList = Array.isArray(data.gemProgress) ? data.gemProgress : [];
    const classGems = Array.isArray(economyBoard.classroomGems) ? economyBoard.classroomGems : [];
    const studentCards = Array.isArray(data.studentCards) ? data.studentCards : [];
    const totalXp = progressList.reduce((sum, gem) => sum + Number(gem.currentXp || 0), 0);
    const completed = progressList.filter(gem => gem.completed === true).length;
    renderClassroomFeatureStats(panel, [
      ['생성 젬', `${classGems.length}개`],
      ['내 진행 젬', `${progressList.length}개`],
      ['내 완료 젬', `${completed}개`],
      ['내 누적 경험치', `${totalXp.toLocaleString('ko-KR')}회`],
      ['학생 수', `${studentCards.length}명`]
    ]);
    if(!canManage) return;
    const studentGemRows = studentCards
      .map(student => {
        const gemSummary = student.gemSummary || {};
        const gems = Array.isArray(gemSummary.gems) ? gemSummary.gems : [];
        return {
          student,
          gems,
          completedCount: Number(gemSummary.completedCount || 0),
          totalXp: Number(gemSummary.totalXp || 0)
        };
      })
      .sort((a, b) => b.totalXp - a.totalXp);
    const { wrap, tbody } = createClassroomDataTable(['학생', '완료 젬', '누적 경험치', '진행 중인 젬', '다음 단계']);
    studentGemRows.forEach(item => {
      const row = document.createElement('tr');
      const leadingGem = item.gems.slice().sort((a, b) => Number(b.currentXp || 0) - Number(a.currentXp || 0))[0] || null;
      const currentXp = Number(leadingGem?.currentXp || 0);
      const stage = leadingGem ? getClassroomGemStage(leadingGem, currentXp) : null;
      appendClassroomTableCell(row, `${item.student.studentNumber ? `${item.student.studentNumber}번 ` : ''}${getClassroomMemberDisplayName(item.student)}`, 'td', 'classroom-review-table-student');
      appendClassroomTableCell(row, `${item.completedCount}개`);
      appendClassroomTableCell(row, `${item.totalXp.toLocaleString('ko-KR')}회`);
      appendClassroomTableCell(row, leadingGem ? leadingGem.gemName || leadingGem.gemId || '젬스톤' : '진행 없음');
      appendClassroomTableCell(row, stage?.next ? `${stage.next.label}까지 ${Math.max(0, stage.next.xp - currentXp)}회` : leadingGem ? '최고 단계' : '-');
      tbody.appendChild(row);
    });
    if(!studentGemRows.length) {
      const row = document.createElement('tr');
      appendClassroomTableCell(row, '표시할 학생별 젬 진행도가 없습니다.', 'td');
      row.firstChild.colSpan = 5;
      tbody.appendChild(row);
    }
    panel.appendChild(wrap);
  }

  function renderClassroomStudentCards(students = [], settings = {}, deps = {}, economyBoard = {}) {
    const grid = document.getElementById('classroom-student-card-grid');
    if(!grid) return;
    const openStudentIds = new Set(Array.from(grid.querySelectorAll('.classroom-student-detail[open]'))
      .map(item => item.dataset.classroomStudentId));
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const assignments = Array.isArray(economyBoard.assignments) ? economyBoard.assignments : [];
    const activeAssignmentByMember = new Map(assignments
      .filter(item => item.status === 'active' && item.memberUserId)
      .map(item => [String(item.memberUserId), item]));
    const visibleStudents = students.filter(student => canManage || !isHiddenClassroomMember(student.memberUserId));
    grid.innerHTML = '';
    if(!visibleStudents.length) {
      renderEmptyClassroomCard(grid, '우리반', '아직 등록된 학생이 없습니다', '학생이 연결되면 이곳에 표시됩니다.');
      return;
    }
    visibleStudents.forEach(student => {
      const card = document.createElement('article');
      const badge = document.createElement('span');
      const identity = document.createElement('div');
      const title = document.createElement('h4');
      const portrait = document.createElement('div');
      const levelSummary = student.levelSummary || {};
      const level = Math.max(1, Math.round(Number(student.level || levelSummary.level) || 1));
      const medalAsset = level ? deps.getLevelMedalAsset?.(level) : null;
      const balanceRow = document.createElement('div');
      const pointBadge = document.createElement('span');
      const coinBadge = document.createElement('span');
      const levelBadge = document.createElement('span');
      const levelRow = document.createElement('div');
      const metaGrid = document.createElement('div');
      const boostGrid = document.createElement('div');
      const miniDropGrid = document.createElement('div');
      const teacherActions = document.createElement('div');
      const titleChip = document.createElement('span');
      const keyringChip = document.createElement('span');
      const selectedTitleName = student.selectedTitle?.titleName || '';
      const selectedKeyringLabel = student.selectedKeyring?.label || student.selectedBadge?.label || '';
      const activeAssignment = activeAssignmentByMember.get(String(student.memberUserId || '')) || null;
      const activeJobTitle = activeAssignment?.jobTitle || activeAssignment?.jobId || '';
      const gemSummary = student.gemSummary || {};
      const gemItems = Array.isArray(gemSummary.gems) ? gemSummary.gems : [];
      const boostItems = Array.isArray(student.boostItems) ? student.boostItems : [];
      const equippedItems = Array.isArray(student.equippedItems) ? student.equippedItems : [];
      const effectItemIds = boostItems.map(item => String(item.itemId || ''));
      card.dataset.classroomStudentId = student.memberUserId || '';
      card.className = [
        'classroom-card',
        'classroom-card--student',
        'classroom-student-card',
        selectedTitleName ? 'has-title' : '',
        selectedKeyringLabel ? 'has-keyring' : '',
        effectItemIds.includes('effect-golden-garden') ? 'has-effect-golden-garden' : '',
        effectItemIds.includes('effect-star-classroom') ? 'has-effect-star-classroom' : ''
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
      fillClassroomPortrait(portrait, student, deps);
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
      if(student.memberUserId === deps.currentMemberUserId) {
        const edit = document.createElement('button');
        edit.type = 'button'; edit.className = 'classroom-text-action'; edit.textContent = '이미지 바꾸기';
        edit.dataset.classroomEditPortrait = ''; identity.append(edit);
      }
      levelRow.className = 'classroom-student-level-row';
      if(level) levelRow.appendChild(levelBadge);
      if(selectedTitleName) {
        titleChip.className = 'quest-status quest-status-active classroom-student-title-chip';
        titleChip.textContent = selectedTitleName;
        levelRow.appendChild(titleChip);
      }
      if(levelRow.children.length) identity.appendChild(levelRow);
      miniDropGrid.className = 'classroom-student-mini-drops';
      const jobDrop = document.createElement('details');
      const jobSummary = document.createElement('summary');
      const jobBody = document.createElement('div');
      jobDrop.className = 'classroom-student-mini-drop';
      jobSummary.textContent = '직업';
      jobBody.className = 'classroom-student-mini-drop-body';
      jobBody.textContent = activeJobTitle
        ? `${activeJobTitle}${activeAssignment?.weeklyPayPoint ? ` · 월급 ${formatClassroomPoint(activeAssignment.weeklyPayPoint)}P` : ''}`
        : '아직 맡은 직업이 없습니다.';
      jobDrop.append(jobSummary, jobBody);
      const gemDrop = document.createElement('details');
      const gemSummaryButton = document.createElement('summary');
      const gemBody = document.createElement('div');
      gemDrop.className = 'classroom-student-mini-drop';
      gemSummaryButton.textContent = '젬스톤';
      gemBody.className = 'classroom-student-mini-drop-body';
      if(gemItems.length) {
        const list = document.createElement('ul');
        gemItems.slice(0, 6).forEach(gem => {
          const row = document.createElement('li');
          const currentXp = Number(gem.currentXp || 0);
          const stage = getClassroomGemStage(gem, currentXp);
          const targetXp = Math.max(1, Number(stage.next?.xp || stage.milestones[stage.milestones.length - 1]?.xp || gem.targetXp || 1));
          row.textContent = `${stage.currentLabel} · ${currentXp}/${targetXp}`;
          list.appendChild(row);
        });
        const overview = document.createElement('p');
        overview.textContent = `획득 ${Number(gemSummary.completedCount || 0)}개 · 누적 ${Number(gemSummary.totalXp || 0).toLocaleString('ko-KR')}회`;
        gemBody.append(overview, list);
      } else {
        gemBody.textContent = '아직 쌓인 젬스톤 경험치가 없습니다.';
      }
      gemDrop.append(gemSummaryButton, gemBody);
      miniDropGrid.append(jobDrop, gemDrop);
      identity.appendChild(miniDropGrid);
      metaGrid.className = 'classroom-student-card-meta';
      if(selectedKeyringLabel) {
        const keyringIcon = createClassroomIconImage(getClassroomKeyringIconKey(student), selectedKeyringLabel, 'classroom-chip-icon');
        keyringChip.className = 'quest-status quest-status-claimed';
        if(keyringIcon) keyringChip.appendChild(keyringIcon);
        keyringChip.appendChild(document.createTextNode(selectedKeyringLabel));
        metaGrid.appendChild(keyringChip);
      }
      if(activeJobTitle) {
        const jobChip = document.createElement('span');
        jobChip.className = 'quest-status quest-status-active classroom-student-job-chip';
        jobChip.textContent = `직업 ${activeJobTitle}`;
        metaGrid.appendChild(jobChip);
      }
      boostGrid.className = 'classroom-student-boost-grid';
      equippedItems.forEach(item => {
        const equipped = document.createElement('span');
        const equippedIcon = createClassroomIconImage(item.icon || item.itemId, item.title || '장착 상품', 'classroom-student-equipped-image');
        equipped.className = 'classroom-student-equipped-icon';
        equipped.title = item.title || '장착 상품';
        if(equippedIcon) {
          equipped.appendChild(equippedIcon);
        } else {
          equipped.textContent = item.icon || 'ITEM';
        }
        boostGrid.appendChild(equipped);
      });
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
      if(canManage) {
        const adjustButton = document.createElement('button');
        teacherActions.className = 'classroom-student-teacher-actions';
        adjustButton.className = 'quest-claim-button';
        adjustButton.type = 'button';
        adjustButton.dataset.classroomPointAdjustMemberId = student.memberUserId || '';
        adjustButton.textContent = '포인트 조정';
        teacherActions.appendChild(adjustButton);
      }
      card.append(badge, balanceRow, identity);
      if(metaGrid.children.length) card.appendChild(metaGrid);
      if(boostGrid.children.length) card.appendChild(boostGrid);
      if(teacherActions.children.length) card.appendChild(teacherActions);
      if(canManage) {
        const detail = document.createElement('details');
        const summary = document.createElement('summary');
        const number = document.createElement('span');
        const name = document.createElement('strong');
        const balances = document.createElement('small');
        detail.className = 'classroom-student-detail';
        detail.dataset.classroomStudentId = student.memberUserId || '';
        detail.open = openStudentIds.has(student.memberUserId);
        card.removeAttribute('data-classroom-student-id');
        number.className = 'classroom-student-number';
        fillClassroomPortrait(number, student, deps);
        name.textContent = getClassroomMemberDisplayName(student);
        balances.textContent = `${formatClassroomPoint(student.point || 0)} P · ${Number(student.djCoin || 0).toLocaleString('ko-KR')} DJ`;
        summary.append(number, name, balances);
        detail.append(summary, card);
        grid.append(detail);
      } else grid.appendChild(card);
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
      const icon = createClassroomJobIcon(job);
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const actions = document.createElement('div');
      const ownApplication = applications.find(item => item.jobId === job.jobId && item.memberUserId === currentMemberUserId);
      const pendingApplications = applications.filter(item => item.jobId === job.jobId && item.status === 'pending');
      const competitorApplications = pendingApplications.filter(item => item.memberUserId !== currentMemberUserId);
      const assignedList = assignments.filter(item => item.jobId === job.jobId && item.status === 'active');
      const assignedHere = assignedList[0] || null;
      const maxAssignees = Math.max(1, Number(job.maxAssignees || 1));
      const isFull = assignedList.length >= maxAssignees;
      card.className = `classroom-card classroom-card--job${assignedHere ? ' is-complete' : ''}`;
      card.dataset.classroomJobId = job.jobId || '';
      card.dataset.classroomJobOpen = String(!isFull);
      card.dataset.classroomJobMine = String(!!ownApplication || myAssignment?.jobId === job.jobId);
      badge.className = 'classroom-card-badge';
      badge.textContent = isFull ? '정원 마감' : assignedHere ? '배정 중' : '모집 중';
      title.textContent = job.title || '교실 직업';
      desc.textContent = job.desc || '직업 설명이 없습니다.';
      reward.className = 'classroom-card-reward';
      reward.textContent = `월급: ${formatClassroomPoint(job.weeklyPayPoint || 0)} 포인트 · 정원 ${assignedList.length}/${maxAssignees}`;
      status.className = `quest-status ${assignedHere ? 'quest-status-claimed' : ownApplication ? 'quest-status-ready' : 'quest-status-active'}`;
      status.textContent = assignedHere
        ? `담당: ${assignedList.map(item => item.memberUserId || '-').join(', ')}`
        : ownApplication
          ? `내 지원 · 경쟁 ${competitorApplications.length}명`
          : myAssignment
            ? '이미 맡은 직업이 있습니다'
            : isFull
              ? '정원이 찼습니다'
              : '지원 가능';
      actions.className = 'classroom-review-actions';
      if(canManage) {
        const editButton = document.createElement('button');
        const deleteButton = document.createElement('button');
        editButton.className = 'quest-claim-button';
        editButton.type = 'button';
        editButton.dataset.classroomJobEditId = job.jobId || '';
        editButton.textContent = '직업 수정';
        deleteButton.className = 'quest-claim-button danger';
        deleteButton.type = 'button';
        deleteButton.dataset.classroomJobDeleteId = job.jobId || '';
        deleteButton.textContent = '직업 삭제';
        actions.append(editButton, deleteButton);
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
        pendingApplications.forEach(application => {
            const assignButton = document.createElement('button');
            assignButton.className = 'quest-claim-button';
            assignButton.type = 'button';
            assignButton.dataset.classroomJobAssignId = application.applicationId || '';
            assignButton.textContent = `${application.memberUserId || '학생'} 배정`;
            actions.appendChild(assignButton);
          });
        if(actions.children.length <= 2 && !applications.some(item => item.jobId === job.jobId && item.status === 'pending') && !assignedHere) {
          const empty = document.createElement('p');
          empty.textContent = '대기 중인 지원자가 없습니다.';
          actions.appendChild(empty);
        }
      } else {
        if(ownApplication || competitorApplications.length) {
          const applicationDetail = document.createElement('p');
          const competitorNames = competitorApplications
            .map(item => item.memberNickname || item.nickname || item.memberName || item.memberUserId)
            .filter(Boolean)
            .slice(0, 6);
          applicationDetail.className = 'classroom-job-application-detail';
          applicationDetail.textContent = ownApplication
            ? `내 지원: ${ownApplication.status === 'assigned' ? '배정됨' : '대기 중'}${competitorNames.length ? ` · 경쟁자 ${competitorNames.join(', ')}` : ' · 경쟁자 없음'}`
            : competitorNames.length
              ? `지원자 ${competitorNames.join(', ')}`
              : '';
          if(applicationDetail.textContent) actions.appendChild(applicationDetail);
        }
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
    const capacity = jobs.reduce((sum, job) => sum + Math.max(1, Number(job.maxAssignees || 1)), 0);
    const openJobs = Math.max(0, capacity - assigned);
    const items = canManage
      ? [['등록 직업', `${jobs.length}개`], ['대기 지원', `${pending}건`], ['남은 자리', `${openJobs}자리`], ['배정 학생', `${assigned}명`]]
      : [['지원 가능', `${openJobs}자리`], ['내 지원', `${applications.filter(item => item.memberUserId === deps.currentMemberUserId).length}건`], ['배정 현황', assigned ? `${assigned}명 활동 중` : '모집 중']];
    summary.innerHTML = '';
    items.forEach(([label, value]) => {
      const item = document.createElement('span');
      item.textContent = `${label} ${value}`;
      summary.appendChild(item);
    });
  }

  function renderClassroomJobManagementOverview(settings, economyBoard = {}, deps = {}) {
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const panel = ensureClassroomPanelIntro('classroom-job-management-overview', 'classroom-job-grid');
    if(!panel) return;
    const jobs = Array.isArray(economyBoard.jobs) ? economyBoard.jobs : [];
    const applications = Array.isArray(economyBoard.applications) ? economyBoard.applications : [];
    const assignments = Array.isArray(economyBoard.assignments) ? economyBoard.assignments : [];
    const pendingApplications = applications.filter(item => item.status === 'pending');
    const activeAssignments = assignments.filter(item => item.status === 'active');
    const capacity = jobs.reduce((sum, job) => sum + Math.max(1, Number(job.maxAssignees || 1)), 0);
    const myAssignment = economyBoard.myAssignment || activeAssignments.find(item => item.memberUserId === deps.currentMemberUserId) || null;
    renderClassroomFeatureStats(panel, canManage
      ? [['등록 직업', `${jobs.length}개`], ['지원 대기', `${pendingApplications.length}건`], ['배정 학생', `${activeAssignments.length}명`], ['남은 자리', `${Math.max(0, capacity - activeAssignments.length)}자리`]]
      : [['내 직업', myAssignment?.jobTitle || myAssignment?.jobId || '없음'], ['지원 가능', `${Math.max(0, capacity - activeAssignments.length)}자리`], ['모집 직업', `${jobs.length}개`]]
    );
    if(!canManage) return;
    const { wrap, tbody } = createClassroomDataTable(['구분', '학생', '직업', '상태', '처리']);
    const rows = [
      ...pendingApplications.map(item => ({ type: '지원', item })),
      ...activeAssignments.map(item => ({ type: '배정', item }))
    ];
    rows.slice(0, 24).forEach(({ type, item }) => {
      const row = document.createElement('tr');
      const actions = document.createElement('div');
      actions.className = 'classroom-review-actions';
      appendClassroomTableCell(row, type, 'td', 'classroom-review-table-kind');
      appendClassroomTableCell(row, getClassroomMemberDisplayName(item), 'td', 'classroom-review-table-student');
      appendClassroomTableCell(row, item.jobTitle || item.jobId || '직업');
      appendClassroomTableCell(row, type === '지원' ? '승인 대기' : '활동 중');
      if(type === '지원') {
        const assignButton = document.createElement('button');
        assignButton.className = 'quest-claim-button';
        assignButton.type = 'button';
        assignButton.dataset.classroomJobAssignId = item.applicationId || '';
        assignButton.textContent = '배정';
        actions.appendChild(assignButton);
      } else {
        const salaryButton = document.createElement('button');
        const releaseButton = document.createElement('button');
        salaryButton.className = 'quest-claim-button';
        salaryButton.type = 'button';
        salaryButton.dataset.classroomJobSalaryId = item.assignmentId || item.memberUserId || '';
        salaryButton.textContent = '월급 지급';
        releaseButton.className = 'quest-claim-button danger';
        releaseButton.type = 'button';
        releaseButton.dataset.classroomJobReleaseId = item.assignmentId || item.memberUserId || '';
        releaseButton.textContent = '해제';
        actions.append(salaryButton, releaseButton);
      }
      const actionCell = document.createElement('td');
      actionCell.appendChild(actions);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
    if(!rows.length) {
      const row = document.createElement('tr');
      appendClassroomTableCell(row, '처리할 직업 지원/배정 항목이 없습니다.', 'td');
      row.firstChild.colSpan = 5;
      tbody.appendChild(row);
    }
    panel.appendChild(wrap);
  }

  function renderClassroomShopCards(settings, economyBoard = {}, wallet = {}, deps = {}) {
    const grid = document.getElementById('classroom-shop-grid');
    if(!grid) return;
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const items = Array.isArray(economyBoard.shopItems) ? economyBoard.shopItems : [];
    const point = Number(wallet.point || 0);
    const djCoin = Number(economyBoard.myDjCoin || 0);
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const ownedItemIds = new Set(purchases
      .filter(purchase => ['purchased', 'use_requested', 'use_approved', 'used'].includes(purchase.status))
      .map(purchase => String(purchase.itemId || ''))
      .filter(Boolean));
    // Retain the live catalog (including focus/selection) when its actual inputs did not change.
    // This is a presentation snapshot only; fresh server data still reaches every render.
    const imageUrls = new Map(items.map(item => [item, deps.normalizeDisplayImageUrl?.(item.imageUrl || item.iconUrl || item.thumbnailUrl || '') || '']));
    const signature = JSON.stringify([settings.classId, deps.currentMemberUserId, canManage, items, point, djCoin, [...ownedItemIds].sort(), [...imageUrls.values()]]);
    if(classroomShopRenderState?.grid === grid && classroomShopRenderState.signature === signature && grid.firstElementChild) return;
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
        list.append(createClassroomIllustration('/images/classroom/stationery/empty-160.webp', 'classroom-empty-art'), empty);
      }
      sectionItems.forEach((item, itemIndex) => {
      const priceType = item.priceType === 'djCoin' ? 'djCoin' : 'point';
      const priceInfo = window.DJ48ClassroomWorkspace.getPrice(item);
      const price = priceInfo.value;
      const canAfford = priceInfo.valid && (priceType === 'djCoin' ? djCoin >= price : point >= price);
      const isBoostItem = item.itemType === 'pointBoost' || item.itemType === 'pointBoostEffect';
      const isOwned = isBoostItem && ownedItemIds.has(String(item.itemId || ''));
      const card = document.createElement('article');
      const visual = document.createElement('div');
      const imageUrl = imageUrls.get(item);
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const button = document.createElement('button');
      card.className = `classroom-card classroom-card--shop${canAfford ? ' is-affordable' : ''}${isOwned ? ' is-complete' : ''}`;
      card.dataset.classroomShopItemId = item.itemId || '';
      card.dataset.classroomShopKind = isBoostItem ? 'decoration' : 'coupon';
      visual.className = 'classroom-shop-card-visual';
      const eager = document.getElementById('classroom-view')?.dataset.activeTab === 'market' && activeMarketPane === paneKey && itemIndex < 6;
      visual.append(window.DJ48ClassroomShopArt.createImage(item, imageUrl, eager));
      badge.className = 'classroom-card-badge';
      badge.textContent = isOwned ? '보유중' : item.itemType === 'pointBoostEffect' ? '적용 효과' : item.itemType === 'pointBoost' ? '배치 아이템' : item.itemType === 'billboardTicket' ? '전광판' : '쿠폰';
      title.textContent = item.title || '교실 상품';
      desc.textContent = item.desc || '상품 설명이 없습니다.';
      reward.className = 'classroom-card-reward';
      reward.textContent = priceInfo.valid ? `${formatClassroomPoint(price)} ${priceInfo.unit}` : '가격 미등록';
      if(isBoostItem) desc.textContent = `${item.desc || ''} · 효과 +${formatClassroomPoint(item.boostPoint)}P`;
      status.className = `quest-status ${isOwned ? 'quest-status-claimed' : canAfford && price > 0 ? 'quest-status-active' : 'quest-status-ready'}`;
      // Keep the existing purchase gate: the server enforces a minimum price of 1.
      status.textContent = isOwned ? '학생카드에 배치됨' : !priceInfo.valid ? '가격 확인 필요' : price === 0 ? '0원 등록 · 구매 준비 중' : canAfford ? '구매 가능' : `${priceInfo.unit} 부족`;
      button.className = 'quest-claim-button';
      button.type = 'button'; button.dataset.classroomShopBuyId = item.itemId || '';
      button.disabled = !priceInfo.valid || price <= 0 || !canAfford || isOwned;
      button.textContent = isOwned ? '보유중' : !priceInfo.valid ? '가격 확인 필요' : price === 0 ? '구매 준비 중' : '구매하기';
      if(canManage) {
        const actions = document.createElement('div');
        const editButton = document.createElement('button');
        const deleteButton = document.createElement('button');
        actions.className = 'classroom-review-actions';
        editButton.className = 'quest-claim-button';
        editButton.type = 'button';
        editButton.dataset.classroomShopEditId = item.itemId || '';
        editButton.textContent = '상품 수정';
        deleteButton.className = 'quest-claim-button danger';
        deleteButton.type = 'button';
        deleteButton.dataset.classroomShopDeleteId = item.itemId || '';
        deleteButton.textContent = '상품 삭제';
        actions.append(editButton, deleteButton);
        card.append(visual, badge, title, desc, reward, status, actions);
      } else {
        card.append(visual, badge, title, desc, reward, status, button);
      }
        list.appendChild(card);
      });
      grid.appendChild(section);
    };
    const pointItems = items.filter(item => item.priceType !== 'djCoin');
    const coinItems = items.filter(item => item.priceType === 'djCoin' && item.itemType !== 'pointBoostEffect');
    const coinEffectItems = items.filter(item => item.priceType === 'djCoin' && item.itemType === 'pointBoostEffect');
    renderShopSection('point', '포인트샵', '', pointItems, '포인트로 살 수 있는 상품이 없습니다.');
    renderShopSection('coin', '배치 아이템', '', coinItems, 'DJ코인으로 살 수 있는 배치 아이템이 없습니다.');
    renderShopSection('coin', '적용 효과', '', coinEffectItems, 'DJ코인으로 살 수 있는 적용 효과가 없습니다.');
    window.DJ48ClassroomWorkspace?.enhanceMarket?.(economyBoard, wallet, canManage);
    classroomShopRenderState = { grid, signature };
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
    if(canManage) {
      const requestItems = purchases.filter(purchase => ['use_requested', 'use_approved'].includes(String(purchase.status || 'purchased')));
      const { wrap: tableWrap, tbody } = createClassroomDataTable(['학생', '상품', '요청 시각', '상태', '메모', '처리']);
      requestItems.slice(0, 24).forEach(purchase => {
        const row = document.createElement('tr');
        const actions = document.createElement('div');
        const status = String(purchase.status || 'purchased');
        actions.className = 'classroom-review-actions';
        appendClassroomTableCell(row, getClassroomMemberDisplayName(purchase), 'td', 'classroom-review-table-student');
        appendClassroomTableCell(row, purchase.itemTitle || '교실 쿠폰', 'td', 'classroom-review-table-title');
        appendClassroomTableCell(row, formatClassroomTimeLabel(purchase.requestedAtMillis || getClassroomItemTimeMillis(purchase)));
        appendClassroomTableCell(row, getClassroomPurchaseStatusLabel(status));
        appendClassroomTableCell(row, purchase.requestMemo || purchase.approvalMemo || purchase.useMemo || '-');
        if(status === 'use_requested') {
          const approveButton = document.createElement('button');
          const rejectButton = document.createElement('button');
          approveButton.className = 'quest-claim-button';
          approveButton.type = 'button';
          approveButton.dataset.classroomShopApproveUseId = purchase.purchaseId || '';
          approveButton.textContent = '승인';
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
        const actionCell = document.createElement('td');
        actionCell.appendChild(actions);
        row.appendChild(actionCell);
        tbody.appendChild(row);
      });
      if(!requestItems.length) {
        const row = document.createElement('tr');
        appendClassroomTableCell(row, '현재 처리할 마켓 요청이 없습니다.', 'td');
        row.firstChild.colSpan = 6;
        tbody.appendChild(row);
      }
      list.appendChild(tableWrap);
    }
    if(!purchases.length) {
      const empty = document.createElement('p');
      empty.className = 'classroom-review-status';
      empty.textContent = canManage ? '아직 구매 내역이 없습니다.' : '아직 보유한 쿠폰이 없습니다.';
      list.appendChild(empty);
    }
    if(canManage) {
      renderClassroomGroupPurchaseSection(document.getElementById('classroom-group-purchase-shop'), economyBoard, deps);
      return;
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
      const canEquip = !canManage && status === 'purchased' && !isBillboardTicket && !['pointBoost', 'pointBoostEffect'].includes(String(purchase.itemType || ''));
      titleEl.textContent = purchase.itemTitle || (isBillboardTicket ? '전광판 이용권' : '교실 쿠폰');
      const memoText = purchase.rejectReason || purchase.refundReason || purchase.useMemo || purchase.approvalMemo || purchase.requestMemo || '';
      meta.textContent = `${canManage ? `${purchase.memberUserId || '학생'} · ` : ''}${formatClassroomPoint(purchase.pricePoint || 0)} 포인트 · ${getClassroomPurchaseStatusLabel(status)}${memoText ? ` · ${memoText}` : ''}`;
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
      } else if(canEquip) {
        const equipButton = document.createElement('button');
        const requestButton = document.createElement('button');
        equipButton.className = 'quest-claim-button';
        equipButton.type = 'button';
        equipButton.dataset.classroomShopEquipId = purchase.purchaseId || '';
        equipButton.dataset.classroomShopEquipState = purchase.equipped ? 'false' : 'true';
        equipButton.textContent = purchase.equipped ? '장착 해제' : '장착';
        requestButton.className = 'quest-claim-button';
        requestButton.type = 'button';
        requestButton.dataset.classroomShopRequestUseId = purchase.purchaseId || '';
        requestButton.textContent = '사용 요청';
        actions.append(equipButton, requestButton);
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
    const hero = document.createElement('div');
    const title = document.createElement('h4');
    const desc = document.createElement('p');
    const track = document.createElement('div');
    const list = document.createElement('div');
    const targetMax = Math.max(...(mission.thresholds || []).map(item => Number(item.targetPoint || 0)), 1);
    const nextStep = (mission.thresholds || []).find(step => !step.achieved);
    const currentPoint = Number(mission.totalPoint || 0);
    const nextTarget = Number(nextStep?.targetPoint || targetMax);
    const nextPercent = Math.min(100, Math.round((currentPoint / Math.max(1, nextTarget)) * 100));
    panel.className = 'classroom-mission-panel';
    hero.className = 'classroom-mission-hero';
    renderClassroomFeatureStats(wrap, [
      ['현재 포인트', `${formatClassroomPoint(currentPoint)}P`],
      ['다음 목표', nextStep ? `${formatClassroomPoint(nextTarget)}P` : '전체 달성'],
      ['진행률', `${nextPercent}%`],
      ['목표 단계', `${(mission.thresholds || []).length}개`]
    ]);
    title.textContent = mission.title || '학급 미션';
    desc.textContent = nextStep
      ? `${formatClassroomPoint(currentPoint)} / ${formatClassroomPoint(nextTarget)}점 · 다음 보상: ${nextStep.rewardText || nextStep.label || '보상 준비'}`
      : `${formatClassroomPoint(currentPoint)}점 · 모든 기준 달성`;
    hero.append(title, desc, createClassroomProgressMeter(nextPercent));
    const art = document.createElement('img');
    art.src = '/images/classroom/community-tree-320.webp'; art.width = 320; art.height = 320; art.loading = 'lazy'; art.decoding = 'async'; art.alt = ''; art.className = 'classroom-mission-illustration';
    hero.append(art);
    const current = document.createElement('strong'); current.className = 'classroom-mission-total';
    current.textContent = `${formatClassroomPoint(currentPoint)} P`;
    title.after(current);
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
      const state = document.createElement('small'); state.textContent = step.achieved ? '✓ 달성' : step === nextStep ? '다음 목표' : '도전할 목표';
      const label = document.createElement('strong'); label.textContent = step.label || `${formatClassroomPoint(step.targetPoint)} P`;
      const reward = document.createElement('span'); reward.textContent = step.rewardText || '보상이 아직 정해지지 않았어요.';
      const target = document.createElement('small'); target.textContent = `${formatClassroomPoint(step.targetPoint)} P${step.achievedDateKey ? ` · ${step.achievedDateKey} 달성` : ''}`;
      row.append(state, label, reward, target);
      list.appendChild(row);
    });
    panel.append(hero, track, list);
    wrap.appendChild(panel);
    const { wrap: tableWrap, tbody } = createClassroomDataTable(['단계', '목표 포인트', '보상', '상태', '달성일']);
    (mission.thresholds || []).forEach((step, index) => {
      const row = document.createElement('tr');
      appendClassroomTableCell(row, step.label || `${index + 1}단계`, 'td', 'classroom-review-table-kind');
      appendClassroomTableCell(row, `${formatClassroomPoint(step.targetPoint || 0)}P`);
      appendClassroomTableCell(row, step.rewardText || '-');
      appendClassroomTableCell(row, step.achieved ? '달성' : '진행중');
      appendClassroomTableCell(row, step.achievedDateKey || '-');
      tbody.appendChild(row);
    });
    const history = document.createElement('details'); history.className = 'classroom-mission-history';
    const summary = document.createElement('summary'); summary.textContent = '전체 목표 기록 보기';
    history.append(summary, tableWrap); wrap.append(history);
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
      meta.textContent = `${formatClassroomPoint(item.raisedPoint || 0)} / ${formatClassroomPoint(item.targetPoint || 0)} 포인트 · ${status === 'funded' ? '목표 달성' : '진행 중'}${item.dueDate ? ` · ${item.dueDate}까지` : ''}`;
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
    if(!products.length && !accounts.length) {
      const empty = document.createElement('p');
      empty.className = 'classroom-review-status';
      empty.textContent = '교사가 적금 상품을 설정하면 여기에 표시됩니다.';
      list.appendChild(empty);
      wrap.appendChild(section);
      return;
    }
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
      meta.textContent = `최소 ${formatClassroomPoint(product.minDepositPoint || product.depositPoint || 1)}포인트 · ${Number(product.interestRatePercent || 0)}% 이자 · ${Number(product.termDays || 0)}일`;
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
      meta.textContent = `${formatClassroomPoint(account.depositPoint || 0)} + 이자 ${formatClassroomPoint(account.interestPoint || 0)} · 만기 ${account.maturityDate || '-'}`;
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
    const pointToCoinCost = Math.max(0.01, Number(settings.pointToCoinPointCost || 3) || 3);
    const coinToPointReward = Math.max(0.01, Number(settings.coinToPointReward || 0.5) || 0.5);
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
    note.textContent = `내 포인트 ${formatClassroomPoint(pointBalance)}P · 내 DJ코인 ${coinBalance.toLocaleString('ko-KR')}개`;
    list.className = 'classroom-shop-history-list classroom-exchange-list';
    heading.append(title, note);
    section.append(heading, list);

    [
      {
        direction: 'pointToCoin',
        title: '포인트를 DJ코인으로',
        meta: `${formatClassroomPoint(pointToCoinCost)}P → 1 DJ코인`,
        enabled: settings.pointToCoinEnabled !== false,
        disabledText: '교환 중지',
        buttonText: 'DJ코인 받기'
      },
      {
        direction: 'coinToPoint',
        title: 'DJ코인을 포인트로',
        meta: `1 DJ코인 → ${formatClassroomPoint(coinToPointReward)}P`,
        enabled: settings.coinToPointEnabled !== false,
        disabledText: '교환 중지',
        buttonText: '포인트 받기'
      }
    ].forEach(item => {
      const row = document.createElement('article');
      const body = document.createElement('div');
      const titleEl = document.createElement('strong');
      const meta = document.createElement('p');
      const amountInput = document.createElement('input');
      const actions = document.createElement('div');
      const button = document.createElement('button');
      row.className = 'classroom-shop-history-row classroom-exchange-row';
      actions.className = 'classroom-review-actions';
      titleEl.textContent = item.title;
      meta.textContent = item.meta;
      amountInput.className = 'classroom-exchange-amount-input';
      amountInput.type = 'number';
      amountInput.min = '1';
      amountInput.step = '1';
      amountInput.inputMode = 'numeric';
      amountInput.placeholder = item.direction === 'pointToCoin' ? '받을 DJ코인 수' : '사용할 DJ코인 수';
      amountInput.dataset.classroomExchangeAmount = item.direction;
      amountInput.disabled = !item.enabled;
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomExchangeDirection = item.direction;
      button.disabled = !item.enabled;
      button.textContent = item.enabled ? item.buttonText : item.disabledText;
      body.append(titleEl, meta, amountInput);
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

  function renderClassroomBankOverview(data = {}, deps = {}) {
    const settings = data.settings || {};
    const economyBoard = data.economyBoard || {};
    const wallet = data.wallet || {};
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const panel = ensureClassroomPanelIntro('classroom-bank-overview', 'classroom-bank-grid');
    if(!panel) return;
    const studentCards = Array.isArray(data.studentCards) ? data.studentCards.filter(student => student.classroomHidden !== true) : [];
    const savingsProducts = Array.isArray(economyBoard.savingsProducts) ? economyBoard.savingsProducts : [];
    const savingsAccounts = Array.isArray(economyBoard.savingsAccounts) ? economyBoard.savingsAccounts : [];
    const pointLogs = Array.isArray(economyBoard.pointLogs) ? economyBoard.pointLogs : [];
    const totalPoint = Number(economyBoard.classMission?.totalPoint ?? studentCards.reduce((sum, student) => sum + Number(student.point || 0), 0));
    const totalCoin = studentCards.reduce((sum, student) => sum + Number(student.djCoin || 0), 0);
    const earnedPoint = pointLogs.filter(item => Number(item.rewardAmount || item.rewardPoint || 0) > 0)
      .reduce((sum, item) => sum + Number(item.rewardAmount || item.rewardPoint || 0), 0);
    const spentPoint = Math.abs(pointLogs.filter(item => Number(item.rewardAmount || item.rewardPoint || 0) < 0)
      .reduce((sum, item) => sum + Number(item.rewardAmount || item.rewardPoint || 0), 0));
    renderClassroomFeatureStats(panel, canManage
      ? [['학급 포인트', `${formatClassroomPoint(totalPoint)}P`], ['학급 DJ코인', `${totalCoin.toLocaleString('ko-KR')}개`], ['최근 지급', `${formatClassroomPoint(earnedPoint)}P`], ['최근 사용', `${formatClassroomPoint(spentPoint)}P`], ['적금 상품', `${savingsProducts.length}개`]]
      : [['내 포인트', `${formatClassroomPoint(wallet.point || 0)}P`], ['내 DJ코인', `${Number(economyBoard.myDjCoin || 0).toLocaleString('ko-KR')}개`], ['가입 적금', `${savingsAccounts.length}개`], ['적금 상품', `${savingsProducts.length}개`]]
    );
    if(!canManage) return;
    const { wrap, tbody } = createClassroomDataTable(['번호', '학생', '포인트', 'DJ코인', '대표 타이틀']);
    studentCards.slice().sort((a, b) => Number(b.point || 0) - Number(a.point || 0)).forEach(student => {
      const row = document.createElement('tr');
      appendClassroomTableCell(row, student.studentNumber ? `${student.studentNumber}번` : '-', 'td', 'classroom-review-table-kind');
      appendClassroomTableCell(row, getClassroomMemberDisplayName(student), 'td', 'classroom-review-table-student');
      appendClassroomTableCell(row, `${formatClassroomPoint(student.point || 0)}P`);
      appendClassroomTableCell(row, `${Number(student.djCoin || 0).toLocaleString('ko-KR')}개`);
      appendClassroomTableCell(row, student.selectedTitle?.titleName || '-');
      tbody.appendChild(row);
    });
    panel.appendChild(wrap);
  }

  function getClassroomRoutineItems(routine = {}) {
    const items = Array.isArray(routine.checkItems) ? routine.checkItems : [];
    const normalizedItems = items
      .map((item, index) => ({
        itemId: String(item?.itemId || `item-${index + 1}`),
        label: String(item?.label || '').trim()
      }))
      .filter(item => item.label)
      .slice(0, 10);
    return normalizedItems.length ? normalizedItems : [{
      itemId: 'item-1',
      label: routine.title || '성장루틴'
    }];
  }

  function getClassroomRoutineScheduleLabel(routine = {}) {
    const labels = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금' };
    const weekdays = Array.isArray(routine.weekdays) && routine.weekdays.length
      ? routine.weekdays.map(day => labels[day]).filter(Boolean).join(',')
      : '월~금';
    const start = String(routine.startDate || '').trim();
    const end = String(routine.endDate || '').trim();
    const period = start && end ? `${start}~${end}` : '날짜 미설정';
    return `${period} · ${weekdays} 해당 요일/날짜입니다.`;
  }

  // 성장루틴 교사 검토 보드 상태 (탭/학생 선택은 데이터 새로고침 후에도 유지)
  let classroomRoutineBoardSelection = { studentId: '', tab: '' };
  let classroomRoutineBoardLastArgs = null;

  function getClassroomRoutineBoardItems(data = {}) {
    const reviewItems = Array.isArray(data.reviewItems) ? data.reviewItems : [];
    const board = reviewItems.routineBoard && typeof reviewItems.routineBoard === 'object'
      ? reviewItems.routineBoard
      : null;
    return {
      hasBoardData: !!board,
      ongoing: Array.isArray(board?.ongoing) ? board.ongoing : [],
      reviewPending: Array.isArray(board?.reviewPending)
        ? board.reviewPending
        : reviewItems.filter(item => item.itemType === 'routine'),
      processed: Array.isArray(board?.processed) ? board.processed : []
    };
  }

  function getClassroomRoutineBoardStatusLabel(item = {}) {
    if(item.status === 'completed') return '승인 완료';
    if(item.status === 'review_rejected') return '반려';
    return '처리됨';
  }

  function setClassroomRoutineBoardSelection(partial = {}) {
    classroomRoutineBoardSelection = {
      ...classroomRoutineBoardSelection,
      ...(partial.studentId !== undefined ? { studentId: String(partial.studentId || '') } : {}),
      ...(partial.tab !== undefined ? { tab: String(partial.tab || '') } : {})
    };
    if(classroomRoutineBoardLastArgs) {
      renderClassroomRoutineTeacherBoard(classroomRoutineBoardLastArgs.data, classroomRoutineBoardLastArgs.deps);
    }
  }

  function appendClassroomRoutineBoardNoticeRow(tbody, text, colSpan) {
    const row = document.createElement('tr');
    appendClassroomTableCell(row, text, 'td');
    row.firstChild.colSpan = colSpan;
    tbody.appendChild(row);
  }

  function renderClassroomRoutineTeacherBoard(data = {}, deps = {}) {
    const boardRoot = document.getElementById('classroom-routine-teacher-board');
    if(!boardRoot) return;
    const settings = data.settings || {};
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    boardRoot.hidden = !canManage;
    boardRoot.innerHTML = '';
    if(!canManage) return;
    classroomRoutineBoardLastArgs = { data, deps };

    const { hasBoardData, ongoing, reviewPending, processed } = getClassroomRoutineBoardItems(data);
    const studentCards = Array.isArray(data.studentCards) ? data.studentCards : [];
    const boardMembers = studentCards.map(student => ({
      memberUserId: String(student.memberUserId || student.userId || ''),
      label: getClassroomMemberDisplayName(student)
    })).filter(member => member.memberUserId);
    [...ongoing, ...reviewPending, ...processed].forEach(item => {
      const memberUserId = String(item.memberUserId || '');
      if(memberUserId && !boardMembers.some(member => member.memberUserId === memberUserId)) {
        boardMembers.push({ memberUserId, label: getClassroomMemberDisplayName(item) });
      }
    });
    const pendingCountByMember = new Map();
    reviewPending.forEach(item => {
      const memberUserId = String(item.memberUserId || '');
      pendingCountByMember.set(memberUserId, (pendingCountByMember.get(memberUserId) || 0) + 1);
    });

    if(!classroomRoutineBoardSelection.tab) {
      classroomRoutineBoardSelection.tab = reviewPending.length ? 'review' : 'ongoing';
    }
    if(classroomRoutineBoardSelection.studentId
      && !boardMembers.some(member => member.memberUserId === classroomRoutineBoardSelection.studentId)) {
      classroomRoutineBoardSelection.studentId = '';
    }
    const activeTab = classroomRoutineBoardSelection.tab;
    const selectedStudentId = classroomRoutineBoardSelection.studentId;

    renderClassroomFeatureStats(boardRoot, [
      ['학생', `${boardMembers.length}명`],
      ['진행중', `${ongoing.length}개`],
      ['마감 검토', `${reviewPending.length}건`],
      ['처리 완료', `${processed.length}건`]
    ]);

    const layout = document.createElement('div');
    layout.className = 'classroom-routine-board-layout';

    const aside = document.createElement('aside');
    aside.className = 'classroom-routine-board-students';
    const asideTitle = document.createElement('h4');
    asideTitle.textContent = '학생 목록';
    aside.appendChild(asideTitle);
    const studentList = document.createElement('div');
    studentList.className = 'classroom-routine-board-student-list';
    const memberEntries = [{ memberUserId: '', label: '전체 학생' }, ...boardMembers];
    memberEntries.forEach(member => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'classroom-routine-board-student';
      button.dataset.routineBoardStudent = member.memberUserId;
      if(member.memberUserId === selectedStudentId) button.classList.add('is-active');
      const name = document.createElement('span');
      name.textContent = member.label;
      button.appendChild(name);
      const pendingCount = member.memberUserId
        ? pendingCountByMember.get(member.memberUserId) || 0
        : reviewPending.length;
      if(pendingCount > 0) {
        const badge = document.createElement('strong');
        badge.className = 'classroom-routine-board-badge';
        badge.textContent = `${pendingCount}`;
        button.appendChild(badge);
      }
      studentList.appendChild(button);
    });
    aside.appendChild(studentList);

    const detail = document.createElement('div');
    detail.className = 'classroom-routine-board-detail';
    const tabRow = document.createElement('div');
    tabRow.className = 'classroom-subtab-bar classroom-subtab-bar--three';
    [
      ['ongoing', '진행중', ongoing.length],
      ['review', '마감 검토', reviewPending.length],
      ['processed', '처리 완료', processed.length]
    ].forEach(([tabId, label, count]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'classroom-subtab';
      button.dataset.routineBoardTab = tabId;
      button.textContent = `${label} ${count}`;
      button.setAttribute('aria-pressed', tabId === activeTab ? 'true' : 'false');
      if(tabId === activeTab) button.classList.add('is-active');
      tabRow.appendChild(button);
    });
    detail.appendChild(tabRow);

    const filterByStudent = items => selectedStudentId
      ? items.filter(item => String(item.memberUserId || '') === selectedStudentId)
      : items;

    if(activeTab === 'ongoing') {
      const cards = document.createElement('div');
      cards.className = 'classroom-routine-teacher-cards';
      const rows = filterByStudent(ongoing);
      rows.forEach(item => {
        const card = document.createElement('article');
        card.className = 'classroom-card classroom-card--routine';
        const heading = document.createElement('div');
        heading.className = 'classroom-routine-card-heading';
        const copy = document.createElement('div');
        const student = document.createElement('span');
        student.className = 'classroom-card-badge';
        student.textContent = getClassroomMemberDisplayName(item);
        const title = document.createElement('h4');
        title.textContent = item.routineTitle || '성장루틴';
        const period = document.createElement('p');
        period.textContent = `${item.startDate || '-'} ~ ${item.endDate || '-'}`;
        copy.append(student, title, period);
        heading.append(createClassroomIconImage('routine', '', 'classroom-feature-visual'), copy);
        const progress = document.createElement('p');
        const percent = Math.max(0, Math.min(100, Number(item.achievementPercent) || 0));
        progress.className = 'classroom-card-progress';
        progress.textContent = `전체 달성률 ${percent}% · ${item.currentCount || 0}/${item.targetCount || 0}회`;
        const reward = document.createElement('p');
        reward.className = 'classroom-card-reward';
        reward.textContent = `기준 보상 ${formatClassroomPoint(item.baseRewardPoint || 0)} P`;
        card.append(heading, progress, createClassroomProgressMeter(percent), reward);
        cards.append(card);
      });
      if(!rows.length) {
        const empty = document.createElement('p');
        empty.textContent = hasBoardData ? '진행 중인 성장루틴이 없습니다.'
          : '진행 현황을 아직 불러오지 못했어요. 교실을 다시 열어 주세요.';
        cards.append(empty);
      }
      detail.appendChild(cards);
    } else if(activeTab === 'review') {
      const { wrap, tbody } = createClassroomDataTable(['학생', '루틴', '달성', '지급 예정', '처리']);
      const rows = filterByStudent(reviewPending);
      rows.forEach(item => {
        const row = document.createElement('tr');
        appendClassroomTableCell(row, getClassroomMemberDisplayName(item), 'td', 'classroom-review-table-student');
        appendClassroomTableCell(row, item.routineTitle || '성장루틴', 'td', 'classroom-review-table-title');
        appendClassroomTableCell(row, `${item.currentCount}/${item.targetCount}회 (${item.achievementPercent}%)`);
        appendClassroomTableCell(row, `${formatClassroomPoint(item.rewardPoint || 0)}/${formatClassroomPoint(item.baseRewardPoint || 0)} 포인트`);
        const actionCell = document.createElement('td');
        const actions = document.createElement('div');
        actions.className = 'classroom-review-actions';
        const approveButton = document.createElement('button');
        approveButton.className = 'quest-claim-button';
        approveButton.type = 'button';
        approveButton.dataset.classroomReviewAction = 'approved';
        approveButton.dataset.classroomReviewId = item.recordId || item.id || '';
        approveButton.dataset.classroomReviewItemType = 'routine';
        approveButton.dataset.classroomRoutineSuggestedReward = String(Math.max(0, Math.min(20, Math.round(Number(item.rewardPoint || 0) || 0))));
        approveButton.textContent = '승인';
        const rejectButton = document.createElement('button');
        rejectButton.className = 'quest-claim-button danger';
        rejectButton.type = 'button';
        rejectButton.dataset.classroomReviewAction = 'rejected';
        rejectButton.dataset.classroomReviewId = item.recordId || item.id || '';
        rejectButton.textContent = '반려';
        actions.append(approveButton, rejectButton);
        actionCell.appendChild(actions);
        row.appendChild(actionCell);
        tbody.appendChild(row);
      });
      if(!rows.length) {
        appendClassroomRoutineBoardNoticeRow(tbody, '마감 검토를 기다리는 성장루틴이 없습니다.', 5);
      }
      detail.appendChild(wrap);
    } else {
      const { wrap, tbody } = createClassroomDataTable(['학생', '루틴', '달성', '상태', '처리일']);
      const rows = filterByStudent(processed);
      rows.forEach(item => {
        const row = document.createElement('tr');
        appendClassroomTableCell(row, getClassroomMemberDisplayName(item), 'td', 'classroom-review-table-student');
        appendClassroomTableCell(row, item.routineTitle || '성장루틴', 'td', 'classroom-review-table-title');
        appendClassroomTableCell(row, `${item.currentCount}/${item.targetCount}회 (${item.achievementPercent}%)`);
        appendClassroomTableCell(row, getClassroomRoutineBoardStatusLabel(item));
        appendClassroomTableCell(row, item.reviewedAtMillis ? formatClassroomTimeLabel(item.reviewedAtMillis) : '-');
        tbody.appendChild(row);
      });
      if(!rows.length) {
        appendClassroomRoutineBoardNoticeRow(tbody, hasBoardData
          ? '처리 완료된 성장루틴이 없습니다.'
          : '처리 기록을 아직 불러오지 못했어요. 교실을 다시 열어 주세요.', 5);
      }
      detail.appendChild(wrap);
    }

    layout.append(aside, detail);
    boardRoot.appendChild(layout);
    window.DJ48ClassroomWorkspace?.decorateTables?.();
  }

  function renderClassroomRoutineOverview(settings = {}, economyBoard = {}, deps = {}) {
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    const panel = ensureClassroomPanelIntro('classroom-routine-overview', 'classroom-routine-grid');
    if(!panel) return;
    // 교사 뷰는 성장루틴 교사 검토 보드가 대신한다 (본인 루틴만 집계하는 이 개요는 학생 전용)
    panel.hidden = canManage;
    if(canManage) return;
    const routines = Array.isArray(economyBoard.routines) ? economyBoard.routines : [];
    const active = routines.filter(routine => routine.status !== 'completed' && routine.reviewPending !== true);
    const pending = routines.filter(routine => routine.reviewPending === true);
    const completed = routines.filter(routine => routine.status === 'completed');
    const checkable = routines.filter(routine => routine.canCheckToday && !routine.checkedToday && !routine.reviewPending);
    renderClassroomFeatureStats(panel, [
      ['진행중', `${active.length}개`],
      ['오늘 체크 가능', `${checkable.length}개`],
      ['검토중', `${pending.length}개`],
      ['완료', `${completed.length}개`]
    ]);
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
    const groups = [
      ['진행중', routines.filter(routine => routine.status !== 'completed' && routine.reviewPending !== true)],
      ['검토중', routines.filter(routine => routine.reviewPending === true)],
      ['완료', routines.filter(routine => routine.status === 'completed')]
    ];
    groups.forEach(([groupTitle, groupItems]) => {
      if(!groupItems.length) return;
      const heading = document.createElement('article');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      heading.className = 'classroom-card classroom-card-muted classroom-routine-group-heading';
      title.textContent = `${groupTitle} ${groupItems.length}`;
      desc.textContent = groupTitle === '진행중'
        ? '오늘 할 일을 체크하세요.'
        : groupTitle === '검토중'
          ? '확인을 기다리는 루틴입니다.'
          : '완료된 루틴입니다.';
      heading.append(title, desc);
      grid.appendChild(heading);
      groupItems.forEach(routine => {
      const currentCount = Number(routine.currentCount || 0);
      const targetCount = Math.max(1, Number(routine.targetCount || 1));
      const percent = Math.min(100, Math.round((currentCount / targetCount) * 100));
      const completed = routine.status === 'completed';
      const targetReached = currentCount >= targetCount;
      const routineItems = getClassroomRoutineItems(routine);
      const checkedItemIds = new Set(Array.isArray(routine.checkedItemIdsToday) ? routine.checkedItemIdsToday.map(String) : []);
      const canCheck = routine.status === 'active'
        && routine.canCheckToday === true
        && routine.reviewPending !== true;
      const card = document.createElement('article');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const progress = document.createElement('p');
      const reward = document.createElement('p');
      const checklist = document.createElement('div');
      const editButton = document.createElement('button');
      const actions = document.createElement('div');
      card.className = `classroom-card classroom-card--routine${completed ? ' is-complete' : ''}`;
      card.dataset.classroomRoutineState = completed ? 'done' : routine.reviewPending ? 'review' : 'active';
      badge.className = 'classroom-card-badge';
      badge.textContent = completed
        ? '검토 완료'
        : routine.reviewPending
          ? '담임 검토 대기'
          : targetReached
            ? '목표 횟수 달성'
            : '';
      badge.hidden = !badge.textContent;
      title.textContent = routine.title || '성장루틴';
      desc.textContent = getClassroomRoutineScheduleLabel(routine);
      progress.className = 'classroom-card-progress';
      progress.textContent = `전체 달성률 ${percent}% · ${currentCount}/${targetCount}회`;
      reward.className = 'classroom-card-reward';
      reward.textContent = `검토 보상 ${formatClassroomPoint(routine.rewardPoint ?? routine.baseRewardPoint ?? 0)} P`;
      checklist.className = 'classroom-routine-checklist';
      routineItems.forEach(item => {
        const row = document.createElement('button');
        const checked = checkedItemIds.has(String(item.itemId));
        row.className = `classroom-routine-check-item${checked ? ' is-checked' : ''}`;
        row.type = 'button';
        row.dataset.classroomRoutineCheckId = routine.routineId || '';
        row.dataset.classroomRoutineCheckItemId = item.itemId;
        row.disabled = !canCheck || checked;
        row.textContent = checked ? `✓ ${item.label}` : item.label;
        checklist.appendChild(row);
      });
      editButton.className = 'quest-claim-button';
      editButton.type = 'button';
      editButton.dataset.classroomRoutineEditId = routine.routineId || '';
      editButton.textContent = '수정';
      actions.className = 'classroom-review-actions';
      actions.appendChild(editButton);
      const visual = createClassroomIconImage('routine', '', 'classroom-feature-visual');
      const top = document.createElement('div'); top.className = 'classroom-routine-card-heading';
      const copy = document.createElement('div'); copy.append(badge, title, desc);
      top.append(visual, copy, progress);
      const checks = document.createElement('details'); checks.className = 'classroom-routine-checks'; checks.open = canCheck;
      const summary = document.createElement('summary');
      const checkedCount = routineItems.filter(item => checkedItemIds.has(String(item.itemId))).length;
      summary.textContent = `오늘의 실천 ${routineItems.length ? Math.round(checkedCount / routineItems.length * 100) : 0}% · ${checkedCount}/${routineItems.length}개`;
      checks.append(summary, checklist);
      card.append(top, createClassroomProgressMeter(percent), checks, reward, actions);
      grid.appendChild(card);
      });
    });
  }

  function renderClassroomLoadState(state) {
    const view = document.getElementById('classroom-view');
    const status = document.getElementById('classroom-load-status');
    if(!view || !status) return;
    view.classList.toggle('is-loading', state === 'loading');
    view.classList.toggle('has-load-error', state === 'error');
    view.setAttribute('aria-busy', String(state === 'loading'));
    view.querySelectorAll('[data-classroom-panel]').forEach(panel => { panel.inert = state !== 'ready'; });
    status.replaceChildren();
    status.hidden = state === 'ready';
    status.classList.toggle('is-error', state === 'error');
    if(state === 'ready') return;
    const message = document.createElement('span');
    message.textContent = state === 'error'
      ? '교실 기록을 불러오지 못했어요. 다시 시도해 주세요.'
      : '교실 기록을 불러오고 있어요. 확인이 끝나면 버튼을 누를 수 있어요.';
    status.append(message);
    if(state === 'error') {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'classroom-main-action';
      retry.dataset.classroomRetry = '';
      retry.textContent = '다시 시도';
      status.append(retry);
    }
  }

  function renderClassroomSections(data = {}, deps = {}) {
    const needs = (...tabs) => !deps.activeTab || tabs.includes(deps.activeTab);
    const settings = data.settings || {};
    const economyBoard = data.economyBoard || {};
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    deps = { ...deps, reviewItems: data.reviewItems || [] };
    const view = document.getElementById('classroom-view');
    if(view) {
      view.dataset.classroomRole = canManage ? 'teacher' : 'student';
      view.classList.toggle('is-teacher', canManage);
    }
    const boardEntry = document.querySelector('[data-classroom-board-entry]');
    if(boardEntry) boardEntry.hidden = !canManage;
    const manageGroup = document.querySelector('[data-classroom-group="manage"]');
    if(manageGroup) manageGroup.hidden = !canManage;
    const growthGroup = document.querySelector('[data-classroom-group="growth"]');
    if(growthGroup) growthGroup.textContent = canManage ? '성장' : '내 성장';
    const teacherTab = document.getElementById('classroom-teacher-tab');
    if(teacherTab) {
      teacherTab.hidden = !canManage;
      if(!canManage && teacherTab.classList.contains('is-active')) {
        window.DJ48ClassroomForm?.setActiveClassroomTab?.('today');
      }
    }
    arrangeClassroomManagementPanels(canManage);
    document.querySelectorAll('#classroom-icon-catalog-panel img').forEach(image => {
      const file = image.dataset.classroomIconFile || image.getAttribute('src').split('/').pop().replace('.svg', '');
      image.dataset.classroomIconFile = file;
      const key = file.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const source = window.DJ48ClassroomShopArt?.hasIcon(key)
        ? window.DJ48ClassroomShopArt.getSource({icon: key}) : getClassroomIconAssetUrl(key);
      if(source) image.src = source;
    });
    // '내 루틴 저장' 폼은 학생 전용 — 교사 뷰에서는 렌더 시점에 숨긴다
    const routineForm = document.getElementById('classroom-routine-form');
    if(routineForm) routineForm.hidden = canManage;
    const routineEditor = document.getElementById('classroom-routine-editor');
    if(routineEditor) routineEditor.hidden = canManage;
    if(needs('today')) renderClassroomRoleState(settings, data.wallet || {}, deps, data);
    if(needs('teacher')) renderClassroomGrowndOverview(data);
    if(needs('teacher')) renderClassroomTeacherDashboard(data, deps);
    if(needs('teacher')) renderClassroomTeacherReport(data, deps);
    if(needs('quest','teacher')) renderClassroomQuestPickers(data);
    if(needs('today')) renderClassroomTodayHome(data, { ...deps, homeOnly: !!data.home });
    if(needs('teacher')) renderClassroomActivityFeed(economyBoard);
    if(needs('teacher')) renderClassroomReviewPanel(settings, data.reviewItems || [], deps);
    if(needs('quest')) renderClassroomQuestCards(settings, data.progressMap || {}, deps);
    if(needs('quest')) renderClassroomInactiveQuestCards(settings, deps);
    if(needs('classroom')) renderClassroomStudentCards(data.studentCards || [], settings, deps, economyBoard);
    if(needs('gems')) renderClassroomGemSummary(data.gemProgress || [], settings);
    if(needs('gems')) renderClassroomGemManagementOverview(data, deps);
    if(needs('gems')) renderClassroomGemCards(data.gemProgress || [], economyBoard);
    if(needs('jobs')) renderClassroomJobSummary(settings, economyBoard, deps);
    if(needs('jobs')) renderClassroomJobManagementOverview(settings, economyBoard, deps);
    if(needs('jobs')) renderClassroomJobCards(settings, economyBoard, deps);
    if(needs('market')) renderClassroomShopCards(settings, economyBoard, data.wallet || {}, deps);
    if(needs('market')) renderClassroomShopHistory(settings, economyBoard, deps);
    if(needs('mission')) renderClassroomMissionView(economyBoard);
    const bankGrid = document.getElementById('classroom-bank-grid');
    if(needs('bank') && bankGrid) bankGrid.innerHTML = '';
    if(needs('bank')) renderClassroomBankOverview(data, deps);
    if(needs('bank')) renderClassroomExchangeSection(bankGrid, economyBoard, data.wallet || {});
    if(needs('bank')) renderClassroomSavingsSection(bankGrid, economyBoard, deps);
    if(needs('bank')) renderClassroomTaxPresetList(economyBoard);
    if(needs('routine')) renderClassroomRoutineTeacherBoard(data, deps);
    if(needs('routine')) renderClassroomRoutineOverview(settings, economyBoard, deps);
    if(needs('routine')) renderClassroomRoutineCards(economyBoard);
    if(needs('teacher')) deps.setClassroomNoticeForm?.(economyBoard.classNotices?.slots || []);
    if(needs('bank')) deps.setClassroomExchangeSettingsForm?.(economyBoard.exchangeSettings || {});
    window.DJ48ClassroomWorkspace?.render?.(data, deps);
    window.DJ48ClassroomForm?.setActiveClassroomTab?.(view?.dataset.activeTab || 'today');
  }

  window.DJ48ClassroomRender = {
    createClassroomJobIcon,
    fillClassroomPortrait,
    renderClassroomLoadState,
    getClassroomQuestTitle,
    getClassroomProgressStatusLabel,
    getClassroomProgressButtonLabel,
    getClassroomProgressStatusClass,
    renderClassroomQuestPickers,
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
    renderClassroomRoutineTeacherBoard,
    setClassroomRoutineBoardSelection,
    applyClassroomOverviewTabVisibility,
    renderClassroomSections
  };
  function rootCardHome() { return typeof window.DJ48ClassroomCardHome?.render === 'function'; }
})();
