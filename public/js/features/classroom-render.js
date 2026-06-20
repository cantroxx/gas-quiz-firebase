(function () {
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
      meta.textContent = `${item.memberUserId || '-'} · 보상 예정 ${Number(item.rewardCoin || 0)} ${deps.getClassroomRewardCurrencyLabel?.(item.rewardCurrency) || '베리'}`;
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

  function renderClassroomRoleState(settings, wallet = {}, deps = {}) {
    const teacherState = document.getElementById('classroom-teacher-state');
    const studentState = document.getElementById('classroom-student-state');
    const questCount = document.getElementById('classroom-summary-quest-count');
    const rewardCurrency = document.getElementById('classroom-summary-reward-currency');
    const berryCount = document.getElementById('classroom-summary-berry-count');
    if(questCount) questCount.textContent = `${(settings.quests || []).filter(quest => quest.active !== false).length}개`;
    if(rewardCurrency) rewardCurrency.textContent = '베리';
    if(berryCount) berryCount.textContent = `${Number(wallet.berry || 0).toLocaleString('ko-KR')}`;
    if(teacherState) {
      teacherState.textContent = deps.isCurrentClassroomTeacher?.(settings)
        ? `${settings.teacherScope || settings.name} 담임 권한으로 완료 후보를 확인할 수 있습니다. 현재 담임: ${settings.teacherName || '담임 설정 예정'}`
        : `${settings.teacherScope || settings.name} 담임 권한과 퀘스트 설정 UI를 연결할 예정입니다. 현재 담임: ${settings.teacherName || '담임 설정 예정'}`;
    }
    if(studentState) {
      studentState.textContent = deps.currentMemberUserId
        ? '학생은 체크형 퀘스트를 완료 후보로 저장할 수 있습니다. 보상 지급은 아직 대기 상태입니다.'
        : '회원 연결 후 체크형 퀘스트 저장을 확인할 수 있습니다.';
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
    const berryLogs = Array.isArray(economyBoard.berryLogs) ? economyBoard.berryLogs : [];
    const totalBerry = studentCards.reduce((sum, student) => sum + Number(student.berry || 0), 0);
    const pendingApplications = applications.filter(item => item.status === 'pending').length;
    const activeAssignments = assignments.filter(item => item.status === 'active').length;
    const activeRoutines = routines.filter(item => item.status !== 'deleted').length;
    const pendingUseRequests = purchases.filter(item => item.status === 'use_requested').length;
    const unassignedStudents = studentCards.filter(student => !assignments.some(item => item.memberUserId === student.memberUserId && item.status === 'active')).length;
    const earnedBerry = berryLogs.filter(item => Number(item.rewardAmount || item.rewardBerry || 0) > 0)
      .reduce((sum, item) => sum + Number(item.rewardAmount || item.rewardBerry || 0), 0);
    const spentBerry = Math.abs(berryLogs.filter(item => Number(item.rewardAmount || item.rewardBerry || 0) < 0)
      .reduce((sum, item) => sum + Number(item.rewardAmount || item.rewardBerry || 0), 0));
    const items = [
      ['확인 대기', `${reviewItems.length}건`, '퀘스트 승인/반려가 필요한 기록'],
      ['쿠폰 요청', `${pendingUseRequests}건`, '학생이 사용 승인을 기다리는 상점 쿠폰'],
      ['직업 지원', `${pendingApplications}건`, `${activeAssignments}명이 현재 직업을 맡고 있습니다`],
      ['미배정 학생', `${unassignedStudents}명`, `전체 학생 ${studentCards.length}명 중 직업 미배정`],
      ['베리 지급', `${earnedBerry.toLocaleString('ko-KR')}`, '최근 교실 활동으로 지급된 베리'],
      ['베리 사용', `${spentBerry.toLocaleString('ko-KR')}`, '최근 상점 구매로 사용된 베리'],
      ['학생 현황', `${studentCards.length}명`, `전체 보유 베리 ${totalBerry.toLocaleString('ko-KR')}`],
      ['상점 상품', `${shopItems.length}개`, '학생이 베리로 구매할 수 있는 상품'],
      ['성장루틴', `${activeRoutines}개`, '현재 학생 계정에서 확인되는 루틴']
    ];

    items.forEach(([label, value, detail]) => {
      const card = document.createElement('article');
      const labelEl = document.createElement('span');
      const valueEl = document.createElement('strong');
      const detailEl = document.createElement('p');
      card.className = 'classroom-teacher-dashboard-card';
      labelEl.textContent = label;
      valueEl.textContent = value;
      detailEl.textContent = detail;
      card.append(labelEl, valueEl, detailEl);
      grid.appendChild(card);
    });
  }

  function renderClassroomTodayHome(data = {}, deps = {}) {
    const grid = document.getElementById('classroom-today-grid');
    if(!grid) return;
    const settings = data.settings || {};
    const economyBoard = data.economyBoard || {};
    const progressMap = data.progressMap || {};
    const wallet = data.wallet || {};
    const currentMemberUserId = deps.currentMemberUserId || '';
    const quests = (settings.quests || []).filter(quest => quest.active !== false && quest.saveEnabled !== false);
    const pendingQuests = quests.filter(quest => !progressMap[quest.id]);
    const routines = Array.isArray(economyBoard.routines) ? economyBoard.routines : [];
    const todayRoutines = routines.filter(routine => (
      routine.status !== 'completed'
      && routine.checkedToday !== true
      && routine.canCheckToday !== false
    ));
    const assignments = Array.isArray(economyBoard.assignments) ? economyBoard.assignments : [];
    const myAssignment = economyBoard.myAssignment
      || assignments.find(item => item.memberUserId === currentMemberUserId && item.status === 'active')
      || null;
    const gemProgress = Array.isArray(data.gemProgress) ? data.gemProgress : [];
    const completedGems = gemProgress.filter(gem => gem.completed === true);
    const studentCards = Array.isArray(data.studentCards) ? data.studentCards : [];
    const myStudentCard = studentCards.find(student => student.memberUserId === currentMemberUserId) || {};
    const selectedBadgeLabel = myStudentCard.selectedBadge?.label || '';
    const shopItems = Array.isArray(economyBoard.shopItems) ? economyBoard.shopItems : [];
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const berry = Number(wallet.berry || 0);
    const affordableItems = shopItems.filter(item => berry >= Number(item.priceBerry || 0)).length;
    const usableCoupons = purchases.filter(item => !['used'].includes(item.status)).length;
    const cards = [
      ['내 베리', `${berry.toLocaleString('ko-KR')}개`, affordableItems ? `구매 가능한 상품 ${affordableItems}개` : '퀘스트와 루틴으로 베리를 모아 보세요'],
      ['오늘 퀘스트', `${pendingQuests.length}개`, pendingQuests[0]?.title || (quests.length ? '오늘 가능한 퀘스트를 모두 처리했습니다' : '담임이 퀘스트를 만들면 표시됩니다')],
      ['성장루틴', `${todayRoutines.length}개`, todayRoutines[0]?.title || (routines.length ? '오늘 체크할 루틴이 없습니다' : '나만의 반복 목표를 만들어 보세요')],
      ['내 직업', myAssignment?.jobTitle || myAssignment?.jobId || '미배정', myAssignment ? '맡은 역할을 꾸준히 수행해 보세요' : '직업 탭에서 지원할 수 있습니다'],
      ['내 쿠폰', `${usableCoupons}개`, usableCoupons ? '상점 탭에서 사용 요청할 수 있습니다' : '상점에서 베리로 쿠폰을 구매해 보세요'],
      ['젬·뱃지', selectedBadgeLabel || `${completedGems.length}개 획득`, selectedBadgeLabel ? '대표 뱃지가 학생카드에 표시됩니다' : '젬 목표를 달성하면 대표 뱃지로 설정할 수 있습니다']
    ];

    grid.innerHTML = '';
    cards.forEach(([label, value, detail]) => {
      const card = document.createElement('article');
      const labelEl = document.createElement('span');
      const valueEl = document.createElement('strong');
      const detailEl = document.createElement('p');
      card.className = 'classroom-today-card';
      labelEl.textContent = label;
      valueEl.textContent = value;
      detailEl.textContent = detail;
      card.append(labelEl, valueEl, detailEl);
      grid.appendChild(card);
    });
  }

  function getClassroomPurchaseStatusLabel(status = '') {
    if(status === 'use_requested') return '사용 요청';
    if(status === 'use_approved') return '사용 승인';
    if(status === 'used') return '사용 완료';
    return '보유 중';
  }

  function getClassroomActivityLabel(item = {}) {
    if(item.itemTitle) return `${item.memberUserId || '학생'} · ${item.itemTitle} 구매`;
    if(item.jobTitle) return `${item.memberUserId || '학생'} · ${item.jobTitle} 월급`;
    if(item.type === 'classroom_routine_reward') return `${item.memberUserId || '학생'} · 루틴 보상`;
    return `${item.memberUserId || '학생'} · 베리 ${Number(item.rewardAmount || item.rewardBerry || 0).toLocaleString('ko-KR')}`;
  }

  function renderClassroomActivityFeed(economyBoard = {}) {
    const feed = document.getElementById('classroom-activity-feed');
    if(!feed) return;
    const berryLogs = Array.isArray(economyBoard.berryLogs) ? economyBoard.berryLogs : [];
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const useRequests = purchases.filter(item => ['use_requested', 'use_approved', 'used'].includes(item.status))
      .map(item => ({
        label: `${item.memberUserId || '학생'} · ${item.itemTitle || '쿠폰'} ${getClassroomPurchaseStatusLabel(item.status)}`,
        createdAtMillis: item.usedAtMillis || item.approvedAtMillis || item.requestedAtMillis || item.createdAtMillis || 0
      }));
    const activities = [
      ...useRequests,
      ...berryLogs.map(item => ({
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

  function renderClassroomQuestCards(settings = {}, progressMap = {}, deps = {}) {
    const grid = document.getElementById('classroom-quest-grid');
    if(!grid) return;
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    grid.innerHTML = '';
    (settings.quests || []).filter(quest => quest.active !== false).forEach(quest => {
      const progress = progressMap[quest.id] || null;
      const card = document.createElement('article');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const button = document.createElement('button');
      const actions = document.createElement('div');
      const rewardCurrencyLabel = deps.getClassroomRewardCurrencyLabel?.(quest.rewardCurrency) || '베리';
      card.className = 'classroom-card';
      card.dataset.classroomQuestId = quest.id;
      badge.className = 'classroom-card-badge';
      badge.textContent = quest.type;
      title.textContent = quest.title;
      desc.textContent = quest.desc;
      reward.className = 'classroom-card-reward';
      reward.textContent = quest.linkedGemId && quest.gemXp > 0
        ? `예상 보상: ${quest.rewardCoin} ${rewardCurrencyLabel} · ${quest.linkedGemName || quest.linkedGemId} +${quest.gemXp}xp`
        : `예상 보상: ${quest.rewardCoin} ${rewardCurrencyLabel}`;
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
        const deactivateButton = document.createElement('button');
        editButton.className = 'quest-claim-button';
        editButton.type = 'button';
        editButton.dataset.classroomQuestEditId = quest.id || '';
        editButton.textContent = '수정';
        deactivateButton.className = 'quest-claim-button danger';
        deactivateButton.type = 'button';
        deactivateButton.dataset.classroomQuestDeactivateId = quest.id || '';
        deactivateButton.textContent = '비활성화';
        actions.append(editButton, deactivateButton);
      }
      card.append(badge, title, desc, reward, status, actions);
      grid.appendChild(card);
    });
  }

  function renderEmptyClassroomCard(grid, badgeText, titleText, descText) {
    const card = document.createElement('article');
    const badge = document.createElement('span');
    const title = document.createElement('h4');
    const desc = document.createElement('p');
    card.className = 'classroom-card';
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
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const progress = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const button = document.createElement('button');
      card.className = 'classroom-card';
      badge.className = 'classroom-card-badge';
      badge.textContent = gem.completed ? '획득 완료' : '진행 중';
      title.textContent = gem.gemName || gem.gemId || '교실 젬';
      progress.className = 'classroom-card-progress';
      progress.textContent = `진행도 ${currentXp}/${targetXp}xp (${percent}%)`;
      reward.className = 'classroom-card-reward';
      reward.textContent = `획득 보상: ${Number(gem.rewardBerry || 0)} 베리`;
      status.className = `quest-status ${gem.completed ? 'quest-status-claimed' : 'quest-status-active'}`;
      status.textContent = gem.completed ? '젬을 획득했습니다' : '연결 퀘스트를 완료해 경험치를 모으세요';
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomBadgeGemId = gem.gemId || '';
      button.disabled = !gem.completed;
      button.textContent = gem.completed ? '대표 뱃지로 설정' : '목표 달성 후 설정';
      card.append(badge, title, progress, reward, status, button);
      grid.appendChild(card);
    });
  }

  function renderClassroomGemSummary(gemProgress = []) {
    const summary = document.getElementById('classroom-gem-summary');
    if(!summary) return;
    const completed = gemProgress.filter(gem => gem.completed === true).length;
    const active = gemProgress.filter(gem => gem.completed !== true).length;
    const totalXp = gemProgress.reduce((sum, gem) => sum + Number(gem.currentXp || 0), 0);
    const items = [
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
      const desc = document.createElement('p');
      const status = document.createElement('span');
      card.className = 'classroom-card classroom-student-card';
      badge.className = 'classroom-card-badge';
      badge.textContent = `${student.studentNumber || '-'}번`;
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
      identity.append(title, portrait);
      desc.textContent = `${student.grade || '-'}학년 ${student.classNumber || '-'}반 · 베리 ${Number(student.berry || 0).toLocaleString('ko-KR')}`;
      status.className = `quest-status ${student.selectedBadge?.label ? 'quest-status-claimed' : 'quest-status-ready'}`;
      status.textContent = student.selectedBadge?.label ? `대표 뱃지: ${student.selectedBadge.label}` : '대표 뱃지 미설정';
      card.append(badge, identity, desc, status);
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
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const actions = document.createElement('div');
      const ownApplication = applications.find(item => item.jobId === job.jobId && item.memberUserId === currentMemberUserId);
      const assignedHere = assignments.find(item => item.jobId === job.jobId && item.status === 'active');
      card.className = 'classroom-card';
      badge.className = 'classroom-card-badge';
      badge.textContent = assignedHere ? '배정됨' : '모집 중';
      title.textContent = job.title || '교실 직업';
      desc.textContent = job.desc || '직업 설명이 없습니다.';
      reward.className = 'classroom-card-reward';
      reward.textContent = `월급: ${Number(job.weeklyPayBerry || 0).toLocaleString('ko-KR')} 베리`;
      status.className = `quest-status ${assignedHere ? 'quest-status-claimed' : ownApplication ? 'quest-status-ready' : 'quest-status-active'}`;
      status.textContent = assignedHere
        ? `담당: ${assignedHere.memberUserId || '-'}`
        : ownApplication
          ? '지원 완료'
          : myAssignment
            ? '이미 맡은 직업이 있습니다'
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
        button.disabled = !!myAssignment || !!ownApplication || !!assignedHere;
        button.textContent = myAssignment
          ? '이미 직업 배정됨'
          : ownApplication
            ? '지원 완료'
            : assignedHere
              ? '모집 마감'
              : '지원하기';
        actions.appendChild(button);
      }
      card.append(badge, title, desc, reward, status, actions);
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
    const berry = Number(wallet.berry || 0);
    grid.innerHTML = '';
    if(!items.length) {
      renderEmptyClassroomCard(grid, '준비 중', '아직 등록된 교실 상품이 없습니다', deps.isCurrentClassroomTeacher?.(settings) ? '담임 관리 영역에서 교실 상품을 만들어 주세요.' : '담임이 상품을 만들면 베리로 구매할 수 있습니다.');
      return;
    }
    items.forEach(item => {
      const price = Number(item.priceBerry || 0);
      const card = document.createElement('article');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const button = document.createElement('button');
      card.className = 'classroom-card';
      badge.className = 'classroom-card-badge';
      badge.textContent = '쿠폰';
      title.textContent = item.title || '교실 상품';
      desc.textContent = item.desc || '상품 설명이 없습니다.';
      reward.className = 'classroom-card-reward';
      reward.textContent = `가격: ${price.toLocaleString('ko-KR')} 베리`;
      status.className = `quest-status ${berry >= price ? 'quest-status-active' : 'quest-status-ready'}`;
      status.textContent = berry >= price ? '구매 가능' : '베리가 부족합니다';
      button.className = 'quest-claim-button';
      button.type = 'button';
      button.dataset.classroomShopBuyId = item.itemId || '';
      button.disabled = price <= 0 || berry < price;
      button.textContent = '구매하기';
      card.append(badge, title, desc, reward, status, button);
      grid.appendChild(card);
    });
  }

  function renderClassroomShopHistory(settings, economyBoard = {}, deps = {}) {
    const wrap = document.getElementById('classroom-shop-history');
    if(!wrap) return;
    const purchases = Array.isArray(economyBoard.purchases) ? economyBoard.purchases : [];
    const canManage = deps.isCurrentClassroomTeacher?.(settings) === true;
    wrap.innerHTML = '';
    const heading = document.createElement('div');
    const title = document.createElement('h4');
    const note = document.createElement('p');
    const list = document.createElement('div');
    heading.className = 'event-section-heading compact';
    title.textContent = canManage ? '쿠폰 사용 요청' : '내 쿠폰';
    note.textContent = canManage ? '학생의 사용 요청을 승인하거나 사용 완료 처리합니다.' : '구매한 쿠폰은 담임에게 사용 요청할 수 있습니다.';
    list.className = 'classroom-shop-history-list';
    heading.append(title, note);
    wrap.append(heading, list);
    if(!purchases.length) {
      const empty = document.createElement('p');
      empty.className = 'classroom-review-status';
      empty.textContent = canManage ? '아직 구매 내역이 없습니다.' : '아직 보유한 쿠폰이 없습니다.';
      list.appendChild(empty);
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
      titleEl.textContent = purchase.itemTitle || '교실 쿠폰';
      meta.textContent = `${canManage ? `${purchase.memberUserId || '학생'} · ` : ''}${Number(purchase.priceBerry || 0).toLocaleString('ko-KR')} 베리 · ${getClassroomPurchaseStatusLabel(status)}`;
      actions.className = 'classroom-review-actions';
      if(canManage) {
        if(status === 'use_requested') {
          const approveButton = document.createElement('button');
          approveButton.className = 'quest-claim-button';
          approveButton.type = 'button';
          approveButton.dataset.classroomShopApproveUseId = purchase.purchaseId || '';
          approveButton.textContent = '사용 승인';
          actions.appendChild(approveButton);
        }
        if(status === 'use_requested' || status === 'use_approved') {
          const completeButton = document.createElement('button');
          completeButton.className = 'quest-claim-button';
          completeButton.type = 'button';
          completeButton.dataset.classroomShopCompleteUseId = purchase.purchaseId || '';
          completeButton.textContent = '사용 완료';
          actions.appendChild(completeButton);
        }
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
      const completed = routine.status === 'completed' || currentCount >= targetCount;
      const card = document.createElement('article');
      const badge = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const progress = document.createElement('p');
      const reward = document.createElement('p');
      const button = document.createElement('button');
      card.className = 'classroom-card';
      badge.className = 'classroom-card-badge';
      badge.textContent = completed ? '달성 완료' : '학생 설정형';
      title.textContent = routine.title || '성장루틴';
      desc.textContent = routine.desc || '학생이 직접 만든 루틴입니다.';
      progress.className = 'classroom-card-progress';
      progress.textContent = `진행도 ${currentCount}/${targetCount}회 · ${getClassroomRoutineScheduleLabel(routine)}`;
      reward.className = 'classroom-card-reward';
      reward.textContent = `달성 보상: ${Number(routine.rewardBerry || 0).toLocaleString('ko-KR')} 베리`;
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
      card.append(badge, title, desc, progress, reward, button);
      grid.appendChild(card);
    });
  }

  function renderClassroomSections(data = {}, deps = {}) {
    const settings = data.settings || {};
    const economyBoard = data.economyBoard || {};
    renderClassroomRoleState(settings, data.wallet || {}, deps);
    renderClassroomTeacherDashboard(data, deps);
    renderClassroomTodayHome(data, deps);
    renderClassroomActivityFeed(economyBoard);
    renderClassroomReviewPanel(settings, data.reviewItems || [], deps);
    renderClassroomQuestCards(settings, data.progressMap || {}, deps);
    renderClassroomStudentCards(data.studentCards || [], deps);
    renderClassroomGemSummary(data.gemProgress || []);
    renderClassroomGemCards(data.gemProgress || []);
    renderClassroomJobSummary(settings, economyBoard, deps);
    renderClassroomJobCards(settings, economyBoard, deps);
    renderClassroomShopCards(settings, economyBoard, data.wallet || {}, deps);
    renderClassroomShopHistory(settings, economyBoard, deps);
    renderClassroomRoutineCards(economyBoard);
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
    renderClassroomTodayHome,
    renderClassroomActivityFeed,
    renderClassroomQuestCards,
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
