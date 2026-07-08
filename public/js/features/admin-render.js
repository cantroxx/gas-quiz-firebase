(function () {
  function formatAdminTimestamp(value) {
    const seconds = Number(value?._seconds || value?.seconds || 0);
    const millis = seconds ? seconds * 1000 : Date.parse(value || '');
    if(!millis || Number.isNaN(millis)) return '-';
    return new Date(millis).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function createAdminInfoChip(label, value) {
    const chip = document.createElement('span');
    chip.className = 'admin-info-chip';
    chip.textContent = `${label} ${value ?? '-'}`;
    return chip;
  }

  function getAdminPasswordStateLabel(member) {
    const state = member?.passwordState || {};
    if(state.locked) return '비밀번호 잠김';
    if(state.forcePasswordChange) return '초기화 후 변경 필요';
    if(state.passwordConfigured) return '비밀번호 설정 완료';
    return '비밀번호 미설정';
  }

  function createAdminDetailMetric(label, value) {
    const item = document.createElement('article');
    const strong = document.createElement('strong');
    const span = document.createElement('span');
    strong.textContent = value ?? '-';
    span.textContent = label;
    item.append(strong, span);
    return item;
  }

  function createAdminDetailList(title, rows, formatter) {
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    const list = document.createElement('div');
    section.className = 'admin-detail-section';
    heading.textContent = title;
    list.className = 'admin-detail-list';
    if(!rows?.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = '표시할 데이터가 없습니다.';
      list.appendChild(empty);
    } else {
      rows.forEach(row => {
        const item = document.createElement('p');
        item.textContent = formatter(row);
        list.appendChild(item);
      });
    }
    section.append(heading, list);
    return section;
  }

  function createAdminStructuredSection(title, rows, renderRow) {
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    const list = document.createElement('div');
    section.className = 'admin-detail-section';
    heading.textContent = title;
    list.className = 'admin-structured-list';
    if(!rows?.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = '표시할 데이터가 없습니다.';
      list.appendChild(empty);
    } else {
      rows.forEach(row => list.appendChild(renderRow(row)));
    }
    section.append(heading, list);
    return section;
  }

  function createAdminRankingCleanupList(title, rows, deps = {}) {
    const formatRankingElapsedText = deps.formatRankingElapsedText || (value => `${value || 0}초`);
    return createAdminStructuredSection(title, rows, row => {
      const card = document.createElement('article');
      const heading = document.createElement('strong');
      const meta = document.createElement('div');
      const command = document.createElement('code');
      card.className = 'admin-audit-card';
      heading.textContent = `${row.category || '-'} · ${row.score || 0}점 · ${formatRankingElapsedText(row.elapsedSeconds || 0)}`;
      meta.className = 'admin-audit-card-meta';
      meta.append(
        createAdminInfoChip('학생', row.memberUserId || '-'),
        createAdminInfoChip('모드', row.rankingMode || 'normal'),
        createAdminInfoChip('기록ID', row.recordId || '-')
      );
      command.textContent = `node scripts/maintenance/cleanup-long-ranking-records.js --dry-run --record-id ${row.recordId || ''}`;
      card.append(heading, meta, command);
      return card;
    });
  }

  function createAdminDailyUsageList(title, rows, deps = {}) {
    const formatRankingElapsedText = deps.formatRankingElapsedText || (value => `${value || 0}초`);
    return createAdminStructuredSection(title, rows, row => {
      const card = document.createElement('article');
      const heading = document.createElement('strong');
      const meta = document.createElement('div');
      card.className = 'admin-audit-card';
      heading.textContent = `${row.memberUserId || '-'} · ${row.date || '-'}`;
      meta.className = 'admin-audit-card-meta';
      meta.append(
        createAdminInfoChip('인기', formatRankingElapsedText(row.funSeconds || 0)),
        createAdminInfoChip('16시 이후', formatRankingElapsedText(row.after4FunSeconds || 0)),
        createAdminInfoChip('교육 정답', `${row.eduCorrectCount || 0}개`),
        createAdminInfoChip('갱신', formatAdminTimestamp(row.updatedAt))
      );
      card.append(heading, meta);
      return card;
    });
  }

  function renderAdminDashboard(dashboard, deps = {}) {
    const grid = document.getElementById('admin-dashboard-grid');
    const recent = document.getElementById('admin-dashboard-recent');
    if(!grid || !recent) return;
    const data = dashboard || {};
    const isSuperAdmin = data.adminLevel === 'superAdmin';
    const createAdminDetailMetric = deps.createAdminDetailMetric;
    const formatAdminLogAction = deps.formatAdminLogAction || (action => action || '관리자 작업');
    if(typeof createAdminDetailMetric !== 'function') return;

    grid.innerHTML = '';
    [
      ['권한 범위', data.scopeLabel || '-'],
      ['활성 학생', data.activeStudents || 0],
      ['연결 없음', data.authUnlinked || 0],
      ['비번 미설정', data.passwordMissing || 0],
      ['변경 필요', data.passwordForceChange || 0],
      ['잠김', data.passwordLocked || 0],
      ['오늘 기록', data.todayPracticeCount || 0],
      ['오늘 보상', data.todayRewardCount || 0]
    ].forEach(([label, value]) => {
      grid.appendChild(createAdminDetailMetric(label, value));
    });

    recent.innerHTML = '';
    const heading = document.createElement('h3');
    heading.textContent = isSuperAdmin ? '최근 관리자 작업' : '반 관리자 모드';
    recent.appendChild(heading);
    if(isSuperAdmin && data.recentLogs?.length) {
      data.recentLogs.forEach(log => {
        const item = document.createElement('p');
        item.textContent = `${formatAdminTimestamp(log.createdAt)} · ${formatAdminLogAction(log.action)} · ${log.targetUserId || '-'}`;
        recent.appendChild(item);
      });
    } else {
      const item = document.createElement('p');
      item.textContent = isSuperAdmin ? '최근 작업 이력이 없습니다.' : '자기 반 학생 관리만 가능합니다.';
      recent.appendChild(item);
    }
  }

  function renderAdminOperationalAudit(audit, deps = {}) {
    const summaryRoot = document.getElementById('admin-audit-summary');
    const listRoot = document.getElementById('admin-audit-list');
    if(!summaryRoot || !listRoot) return;
    const data = audit || {};
    summaryRoot.innerHTML = '';
    listRoot.innerHTML = '';
    [
      ['회원', data.metrics?.users || 0],
      ['활성 학생', data.metrics?.activeStudents || 0],
      ['연결 없음', data.metrics?.missingAuthUid || 0],
      ['연습 orphan', data.metrics?.orphanPracticeRecords || 0],
      ['랭킹 orphan', data.metrics?.orphanRankingRecords || 0],
      ['이름기반 legacy', data.metrics?.legacyNameRankingRecords || 0],
      ['20분 초과 랭킹', data.metrics?.overLimitRankingRecords || 0],
      ['인기퀴즈 사용기록', data.metrics?.dailyUsageRecords || 0],
      ['퀴즈왕 불일치', data.metrics?.quizKingMismatch || 0]
    ].forEach(([label, value]) => {
      summaryRoot.appendChild(createAdminDetailMetric(label, value));
    });

    const sections = [
      ['회원 연결 점검', data.issues?.memberAuth || [], item => `${item.memberUserId} · ${item.nickname || '-'} · ${item.reason}`],
      ['연습기록 orphan 후보', data.issues?.orphanPracticeRecords || [], item => `${item.recordId} · ${item.memberUserId || '-'} · ${item.area || '-'} / ${item.detail || '-'}`],
      ['랭킹기록 orphan 후보', data.issues?.orphanRankingRecords || [], item => `${item.recordId} · ${item.memberUserId || '-'} · ${item.category || '-'} · ${item.score || 0}점${item.legacyNameOnly ? ' · 이름만 있던 과거 기록' : ''}`],
      ['퀴즈왕 summary 불일치 후보', data.issues?.quizKingMismatch || [], item => `${item.memberUserId} · 저장 ${item.storedTotalScore}점/${item.storedCategoryCount}영역 · 계산 ${item.calculatedTotalScore}점/${item.calculatedCategoryCount}영역`],
      ['비정상 랭킹 후보', data.issues?.suspiciousRankingRecords || [], item => `${item.recordId} · ${item.memberUserId || '-'} · ${item.category || '-'} · ${item.score || 0}점 · ${item.elapsedSeconds || 0}초`]
    ];
    listRoot.appendChild(createAdminRankingCleanupList('20분 초과 랭킹 후보', data.issues?.overLimitRankingRecords || [], deps));
    listRoot.appendChild(createAdminDailyUsageList('인기퀴즈 사용기록 최근 후보', data.issues?.latestDailyUsage || [], deps));
    sections.forEach(([title, rows, formatter]) => {
      listRoot.appendChild(createAdminDetailList(title, rows, formatter));
    });
  }

  function renderAdminQuizQualityAudit(audit) {
    const summaryRoot = document.getElementById('admin-quiz-quality-summary');
    const listRoot = document.getElementById('admin-quiz-quality-list');
    if(!summaryRoot || !listRoot) return;
    const data = audit || {};
    summaryRoot.innerHTML = '';
    listRoot.innerHTML = '';
    [
      ['퀴즈', data.metrics?.quizCount || 0],
      ['문항', data.metrics?.questionCount || 0],
      ['비활성 퀴즈', data.metrics?.disabledQuizCount || 0],
      ['오류 후보', data.metrics?.invalidQuestionCount || 0],
      ['이미지 누락', data.metrics?.missingImageCount || 0],
      ['중복 ID 후보', data.metrics?.duplicateQuestionIdCount || 0]
    ].forEach(([label, value]) => {
      summaryRoot.appendChild(createAdminDetailMetric(label, value));
    });

    [
      ['퀴즈별 문항 수', data.quizSummaries || [], row => `${row.quizId} · ${row.title || '-'} · ${row.questionCount}문항${row.expectedQuestionCount && row.expectedQuestionCount !== row.questionCount ? ` · 기준 ${row.expectedQuestionCount}` : ''}${row.disabled ? ' · 닫힘' : ''}`],
      ['문항 오류 후보', data.issues?.invalidQuestions || [], row => `${row.quizId}/${row.questionId} · ${row.reason}`],
      ['이미지 누락 후보', data.issues?.missingImages || [], row => `${row.quizId}/${row.questionId} · ${row.answer || row.prompt || '-'}`],
      ['중복 questionId 후보', data.issues?.duplicateQuestionIds || [], row => `${row.quizId} · ${row.questionId} · ${row.count}건`]
    ].forEach(([title, rows, formatter]) => {
      listRoot.appendChild(createAdminDetailList(title, rows, formatter));
    });
  }

  function renderAdminSummary(summary) {
    const root = document.getElementById('admin-summary');
    if(!root) return;
    const data = summary || {};
    root.innerHTML = '';
    [
      ['전체', data.total || 0],
      ['활성 학생', data.activeStudents || 0],
      ['비활성', data.inactive || 0],
      ['관리자', data.admins || 0],
      ['비번 설정', data.displayedPasswordConfigured || 0],
      ['변경 필요', data.displayedForcePasswordChange || 0]
    ].forEach(([label, value]) => {
      const item = document.createElement('article');
      const strong = document.createElement('strong');
      const span = document.createElement('span');
      strong.textContent = value;
      span.textContent = label;
      item.append(strong, span);
      root.appendChild(item);
    });
  }

  function renderAdminStudentEconomySummary(summary) {
    const root = document.getElementById('admin-student-economy-summary');
    if(!root) return;
    const data = summary || {};
    const metric = getAdminStudentEconomyMetric();
    root.innerHTML = '';
    const rows = [
      ['표시 학생', data.total || 0],
      ['필터 일치', data.matchingStudents || data.total || 0]
    ];
    if(metric === 'all' || metric === 'point') rows.push(['교실 포인트 합계', formatAdminNumber(data.classroomPoint || 0, 'P')]);
    if(metric === 'all' || metric === 'xp') rows.push(['레벨 경험치 합계', formatAdminNumber(data.totalXp || 0, 'XP')]);
    if(metric === 'all' || metric === 'djCoin') rows.push(['DJ코인 합계', formatAdminNumber(data.djCoin || 0, '개')]);
    rows.forEach(([label, value]) => {
      const item = document.createElement('article');
      const strong = document.createElement('strong');
      const span = document.createElement('span');
      strong.textContent = value;
      span.textContent = label;
      item.append(strong, span);
      root.appendChild(item);
    });
  }

  function renderAdminMemberList(members, options = {}) {
    const root = document.getElementById('admin-member-list');
    if(!root) return;
    // 재화 조정 callable(adminAdjustMemberWallet/adminAdjustAdminWallet)은 서버에서 슈퍼관리자 전용이므로
    // 학급관리자에게는 버튼 자체를 렌더링하지 않는다
    const canAdjustWallet = options.isSuperAdmin === true;
    root.innerHTML = '';
    const items = members || [];
    if(!items.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = '조회된 회원이 없습니다.';
      root.appendChild(empty);
      return;
    }
    items.forEach(member => {
      const card = document.createElement('article');
      const main = document.createElement('div');
      const title = document.createElement('h4');
      const meta = document.createElement('p');
      const state = document.createElement('p');
      const passwordState = document.createElement('p');
      const actions = document.createElement('div');
      const detailButton = document.createElement('button');
      const resetButton = document.createElement('button');
      const unlinkButton = document.createElement('button');
      const statusButton = document.createElement('button');
      const walletButton = document.createElement('button');
      const visibilityButton = document.createElement('button');

      card.className = 'admin-member-card';
      card.dataset.memberUserId = member.userId;
      title.textContent = `${member.nickname || '이름 없음'} · ${member.userId}`;
      meta.textContent = `${member.school || '동자'} ${member.grade || '-'}학년 ${member.classNumber || '-'}반 ${member.studentNumber || '-'}번`;
      state.className = 'admin-member-state';
      state.textContent = `${member.role === 'admin' ? (member.adminLevel === 'classAdmin' ? `반 관리자 ${member.adminScopeGrade || member.grade || '-'}-${member.adminScopeClassNumber || member.classNumber || '-'}` : '관리자') : '학생'} · ${member.status || 'unknown'} · ${member.authLinked ? '연결됨' : '연결 없음'}${member.classroomHidden ? ' · 교실 숨김' : ''}`;
      passwordState.className = 'admin-member-password-state';
      passwordState.textContent = getAdminPasswordStateLabel(member);
      detailButton.type = 'button';
      detailButton.className = 'admin-action-button';
      detailButton.dataset.adminAction = 'detail';
      detailButton.textContent = '상세';
      resetButton.type = 'button';
      resetButton.className = 'admin-action-button';
      resetButton.dataset.adminAction = 'resetPassword';
      resetButton.textContent = '비밀번호 초기화';
      unlinkButton.type = 'button';
      unlinkButton.className = 'admin-action-button';
      unlinkButton.dataset.adminAction = 'unlinkAuth';
      unlinkButton.disabled = !member.authLinked || member.role === 'admin';
      unlinkButton.textContent = '연결 해제';
      statusButton.type = 'button';
      statusButton.className = 'admin-action-button';
      statusButton.dataset.adminAction = member.status === 'active' ? 'deactivate' : 'activate';
      statusButton.disabled = member.role === 'admin';
      statusButton.textContent = member.status === 'active' ? '비활성화' : '활성화';
      if(canAdjustWallet) {
        walletButton.type = 'button';
        walletButton.className = 'admin-action-button';
        walletButton.dataset.adminAction = member.role === 'admin' ? 'adjustAdminWallet' : 'adjustWallet';
        walletButton.textContent = member.role === 'admin' ? '관리자 코인 조정' : '재화 조정';
      }
      visibilityButton.type = 'button';
      visibilityButton.className = 'admin-action-button';
      visibilityButton.dataset.adminAction = member.classroomHidden ? 'showClassroom' : 'hideClassroom';
      visibilityButton.disabled = member.role === 'admin';
      visibilityButton.textContent = member.classroomHidden ? '교실 표시' : '교실 숨김';
      actions.className = 'admin-member-actions';
      if(canAdjustWallet) {
        actions.append(detailButton, walletButton, visibilityButton, resetButton, unlinkButton, statusButton);
      } else {
        actions.append(detailButton, visibilityButton, resetButton, unlinkButton, statusButton);
      }
      main.append(title, meta, state, passwordState);
      card.append(main, actions);
      root.appendChild(card);
    });
  }

  function formatAdminNumber(value, suffix = '') {
    const number = Number(value || 0);
    const text = Number.isFinite(number) ? number.toLocaleString('ko-KR') : '0';
    return suffix ? `${text}${suffix}` : text;
  }

  function getAdminStudentEconomyMetric() {
    const value = String(document.getElementById('admin-economy-filter-metric')?.value || 'all').trim();
    return ['all', 'point', 'xp', 'djCoin'].includes(value) ? value : 'all';
  }

  function getAdminStudentEconomySortOptions() {
    const root = document.getElementById('admin-student-economy-list');
    const sortMetric = String(root?.dataset.adminEconomySortMetric || 'point').trim();
    const sortDirection = String(root?.dataset.adminEconomySortDirection || 'desc').trim();
    return {
      sortMetric: ['point', 'level', 'xp', 'totalXp', 'djCoin'].includes(sortMetric) ? sortMetric : 'point',
      sortDirection: sortDirection === 'asc' ? 'asc' : 'desc'
    };
  }

  function getAdminStudentEconomySortValue(student = {}, sortMetric = 'point') {
    const level = student.levelSummary || {};
    if(sortMetric === 'level') return Number(level.level || 1);
    if(sortMetric === 'xp') return Number(level.xp || 0);
    if(sortMetric === 'totalXp') return Number(level.totalXp || 0);
    if(sortMetric === 'djCoin') return Number(student.djCoin || 0);
    return Number(student.classroomPoint || 0);
  }

  function appendAdminTableCell(row, text, cellTag = 'td', className = '') {
    const cell = document.createElement(cellTag);
    cell.textContent = text;
    if(className) cell.className = className;
    row.appendChild(cell);
    return cell;
  }

  function appendAdminSortableTableHeader(row, column, sortMetric, sortDirection) {
    const [key, label, sortKey] = column;
    const cell = document.createElement('th');
    if(sortKey) {
      const button = document.createElement('button');
      const arrow = sortMetric === sortKey ? (sortDirection === 'asc' ? '▲' : '▼') : '↕';
      button.type = 'button';
      button.className = 'admin-student-economy-sort-button';
      button.dataset.adminEconomySortKey = sortKey;
      button.setAttribute('aria-label', `${label} 기준 ${sortMetric === sortKey && sortDirection === 'desc' ? '오름차순' : '내림차순'} 정렬`);
      button.textContent = `${label} ${arrow}`;
      cell.appendChild(button);
    } else {
      cell.textContent = label;
    }
    row.appendChild(cell);
    return cell;
  }

  function renderAdminStudentEconomyList(students) {
    const root = document.getElementById('admin-student-economy-list');
    if(!root) return;
    root.innerHTML = '';
    const items = students || [];
    if(!items.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = '조회된 학생 재화가 없습니다.';
      root.appendChild(empty);
      return;
    }
    const metric = getAdminStudentEconomyMetric();
    const { sortMetric, sortDirection } = getAdminStudentEconomySortOptions();
    const sortedItems = items.slice().sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      const valueDiff = getAdminStudentEconomySortValue(a, sortMetric) - getAdminStudentEconomySortValue(b, sortMetric);
      if(valueDiff !== 0) return valueDiff * direction;
      const classDiff = Number(a.grade || 0) - Number(b.grade || 0)
        || Number(a.classNumber || 0) - Number(b.classNumber || 0)
        || Number(a.studentNumber || 0) - Number(b.studentNumber || 0);
      if(classDiff !== 0) return classDiff;
      return String(a.userId || '').localeCompare(String(b.userId || ''));
    });
    const tableWrap = document.createElement('div');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headRow = document.createElement('tr');
    const columns = [
      ['rank', '순위'],
      ['studentNumber', '번호'],
      ['name', '학생'],
      ['classId', '교실']
    ];
    if(metric === 'all' || metric === 'point') columns.push(['point', '교실 포인트', 'point']);
    if(metric === 'all' || metric === 'xp') {
      columns.push(['level', '레벨', 'level']);
      columns.push(['xp', '현재 경험치', 'xp']);
      columns.push(['totalXp', '누적 경험치', 'totalXp']);
    }
    if(metric === 'all' || metric === 'djCoin') columns.push(['djCoin', 'DJ코인', 'djCoin']);
    columns.push(['status', '상태']);
    tableWrap.className = 'admin-student-economy-table-wrap';
    table.className = 'admin-student-economy-table';
    columns.forEach(column => appendAdminSortableTableHeader(headRow, column, sortMetric, sortDirection));
    thead.appendChild(headRow);
    sortedItems.forEach((student, index) => {
      const row = document.createElement('tr');
      const level = student.levelSummary || {};
      const nextLevelXp = Number(level.nextLevelXp || 0);
      const xpText = nextLevelXp > 0
        ? `${formatAdminNumber(level.xp)} / ${formatAdminNumber(nextLevelXp)} XP`
        : `${formatAdminNumber(level.totalXp)} XP`;
      const values = {
        rank: `${index + 1}위`,
        studentNumber: student.studentNumber ? `${student.studentNumber}번` : '-',
        name: `${student.nickname || '이름 없음'} · ${student.userId}`,
        classId: student.classId || '-',
        point: formatAdminNumber(student.classroomPoint, 'P'),
        level: `Lv.${formatAdminNumber(level.level || 1)}`,
        xp: xpText,
        totalXp: formatAdminNumber(level.totalXp || 0, 'XP'),
        djCoin: formatAdminNumber(student.djCoin, '개'),
        status: `${student.status || 'unknown'}${student.classroomHidden ? ' · 교실 숨김' : ''}`
      };
      columns.forEach(([key]) => {
        const className = key === 'name'
          ? 'admin-student-economy-table-student'
          : ['rank', 'point', 'level', 'xp', 'totalXp', 'djCoin'].includes(key)
            ? 'admin-student-economy-table-number'
            : '';
        appendAdminTableCell(row, values[key] || '-', 'td', className);
      });
      tbody.appendChild(row);
    });
    table.append(thead, tbody);
    tableWrap.appendChild(table);
    root.appendChild(tableWrap);
  }

  function renderAdminMemberDetail(data) {
    const content = document.getElementById('admin-member-detail-content');
    const title = document.getElementById('admin-member-detail-title');
    const desc = document.getElementById('admin-member-detail-desc');
    if(!content) return;
    const profile = data.profile || {};
    title.textContent = `${profile.nickname || '이름 없음'} · ${data.memberUserId}`;
    desc.textContent = `${profile.school || '동자'} ${profile.grade || '-'}학년 ${profile.classNumber || '-'}반 ${profile.studentNumber || '-'}번`;
    content.innerHTML = '';

    const metrics = document.createElement('div');
    metrics.className = 'admin-detail-metrics';
    metrics.append(
      createAdminDetailMetric('연결', profile.authLinked ? '연결됨' : '연결 없음'),
      createAdminDetailMetric('비밀번호', getAdminPasswordStateLabel({ passwordState: data.passwordState })),
      createAdminDetailMetric('DJ코인', Number(data.economy?.djCoin || 0)),
      createAdminDetailMetric('포인트', Number(data.classroomWallet?.point || 0)),
      createAdminDetailMetric('연습 기록', Number(data.practiceSummary?.recordCount || 0)),
      createAdminDetailMetric('완주 별', Number(data.practiceSummary?.totalStars || 0)),
      createAdminDetailMetric('칭호', Number(data.titleSummary?.ownedCount || data.counts?.titles || 0)),
      createAdminDetailMetric('뱃지', Number(data.counts?.badges || 0)),
      createAdminDetailMetric('대표 칭호', data.titleSummary?.selectedTitleName || data.titleSummary?.selectedTitleId || '없음')
    );

    content.append(
      metrics,
      createAdminDetailList('최근 연습 기록', data.practiceRecords || [], row => `${row.area || '-'} / ${row.detail || row.areaKey || '-'} · ${row.correctCount}/${row.totalCount} · 별 ${row.starCount} · ${formatAdminTimestamp(row.updatedAt)}`),
      createAdminDetailList('보유 뱃지', data.badges || [], row => `${row.label || row.badgeId} · ${row.correct}/${row.total} · 별 ${row.starCount}${row.completed ? ' · 완료' : ''}`),
      createAdminDetailList('보유 칭호', data.titles || [], row => `${row.selected ? '대표 · ' : ''}${row.titleName || row.titleId}`)
    );
  }

  function renderAdminExternalQuizRows(externalQuizzes, deps = {}) {
    const root = document.getElementById('admin-external-quiz-list');
    const normalizeExternalQuizzes = deps.normalizeExternalQuizzes;
    const defaultExternalQuizzes = deps.defaultExternalQuizzes || {};
    const maxRows = Number(deps.maxRows || 0);
    if(!root || typeof normalizeExternalQuizzes !== 'function' || !maxRows) return;
    const items = normalizeExternalQuizzes(externalQuizzes || defaultExternalQuizzes).items;
    root.innerHTML = '';
    for(let index = 0; index < maxRows; index += 1) {
      const item = items[index] || {};
      const row = document.createElement('article');
      row.className = 'admin-external-quiz-row';
      row.innerHTML = `
        <label>
          퀴즈 이름
          <input data-external-quiz-field="title" data-external-quiz-index="${index}" type="text" maxlength="40" value="">
        </label>
        <label>
          설명
          <input data-external-quiz-field="description" data-external-quiz-index="${index}" type="text" maxlength="120" value="">
        </label>
        <label>
          링크
          <input data-external-quiz-field="url" data-external-quiz-index="${index}" type="url" maxlength="500" placeholder="https://..." value="">
        </label>
        <label class="admin-checkbox-label">
          <input data-external-quiz-field="active" data-external-quiz-index="${index}" type="checkbox">
          활성
        </label>
      `;
      row.querySelector('[data-external-quiz-field="title"]').value = item.title || '';
      row.querySelector('[data-external-quiz-field="description"]').value = item.description || '';
      row.querySelector('[data-external-quiz-field="url"]').value = item.url || '';
      row.querySelector('[data-external-quiz-field="active"]').checked = item.active !== false;
      root.appendChild(row);
    }
  }

  function renderAdminSeasonEventRows(seasonEvents, deps = {}) {
    const root = document.getElementById('admin-season-event-list');
    const normalizeSeasonEvents = deps.normalizeSeasonEvents;
    const defaultSeasonEvents = deps.defaultSeasonEvents || {};
    const iconOptions = deps.iconOptions || ['📖', '🏯', '🧮', '⭐', '🔥', '🎯', '🏆', '✨'];
    const maxRows = Number(deps.maxRows || 0);
    if(!root || typeof normalizeSeasonEvents !== 'function' || !maxRows) return;
    const items = normalizeSeasonEvents(seasonEvents || defaultSeasonEvents).items;
    root.innerHTML = '';
    for(let index = 0; index < maxRows; index += 1) {
      const item = items[index] || {};
      const row = document.createElement('article');
      row.className = 'admin-external-quiz-row';
      row.innerHTML = `
        <label>
          시즌 타이틀
          <input data-season-event-field="title" data-season-event-index="${index}" type="text" maxlength="60" value="">
        </label>
        <label>
          설명
          <input data-season-event-field="desc" data-season-event-index="${index}" type="text" maxlength="180" value="">
        </label>
        <label>
          기간 유형
          <select data-season-event-field="periodType" data-season-event-index="${index}">
            <option value="monthly">월간</option>
            <option value="weekly">주간</option>
          </select>
        </label>
        <label>
          월간 대상 월
          <input data-season-event-field="targetMonth" data-season-event-index="${index}" type="month" value="">
        </label>
        <label>
          주간 시작일
          <input data-season-event-field="startDate" data-season-event-index="${index}" type="date" value="">
        </label>
        <label>
          주간 종료일
          <input data-season-event-field="endDate" data-season-event-index="${index}" type="date" value="">
        </label>
        <label>
          지정 퀴즈 ID
          <input data-season-event-field="quizIds" data-season-event-index="${index}" type="text" maxlength="500" placeholder="예: gmo, time_store" value="">
        </label>
        <label>
          아이콘
          <span class="admin-season-icon-toggle-list"></span>
        </label>
        <label class="admin-checkbox-label">
          <input data-season-event-field="active" data-season-event-index="${index}" type="checkbox">
          활성
        </label>
      `;
      row.querySelector('[data-season-event-field="title"]').value = item.title || '';
      row.querySelector('[data-season-event-field="desc"]').value = item.desc || '';
      row.querySelector('[data-season-event-field="periodType"]').value = item.periodType === 'weekly' ? 'weekly' : 'monthly';
      row.querySelector('[data-season-event-field="targetMonth"]').value = item.targetMonth || '';
      row.querySelector('[data-season-event-field="startDate"]').value = item.startDate || item.periodStartDate || '';
      row.querySelector('[data-season-event-field="endDate"]').value = item.endDate || item.periodEndDate || '';
      row.querySelector('[data-season-event-field="quizIds"]').value = (item.quizIds || []).join(', ');
      const iconList = row.querySelector('.admin-season-icon-toggle-list');
      iconOptions.forEach(iconValue => {
        const iconLabel = document.createElement('span');
        const iconInput = document.createElement('input');
        const iconText = document.createElement('span');
        iconLabel.className = 'admin-season-icon-toggle';
        iconInput.type = 'radio';
        iconInput.name = `season-event-icon-${index}`;
        iconInput.value = iconValue;
        iconInput.dataset.seasonEventField = 'icon';
        iconInput.dataset.seasonEventIndex = String(index);
        iconInput.checked = (item.icon || '✨') === iconValue;
        iconText.textContent = iconValue;
        iconLabel.append(iconInput, iconText);
        iconList.appendChild(iconLabel);
      });
      if(!iconList.querySelector('input:checked')) {
        const firstInput = iconList.querySelector('input');
        if(firstInput) firstInput.checked = true;
      }
      row.querySelector('[data-season-event-field="active"]').checked = item.active !== false;
      root.appendChild(row);
    }
  }

  function renderAdminTodayQuizPoolGrid(flags, deps = {}) {
    const root = document.getElementById('admin-today-quiz-pool-grid');
    const getAdminQuizToggleGroups = deps.getAdminQuizToggleGroups;
    const quizCatalog = deps.quizCatalog || {};
    if(!root || typeof getAdminQuizToggleGroups !== 'function') return;
    const selected = new Set(flags?.todayQuizRandomPoolIds || []);
    root.innerHTML = '';
    getAdminQuizToggleGroups().forEach(group => {
      const section = document.createElement('section');
      const heading = document.createElement('h4');
      const list = document.createElement('div');
      section.className = 'admin-quiz-toggle-group';
      heading.textContent = group.label;
      list.className = 'admin-quiz-toggle-list';
      group.quizIds.forEach(quizId => {
        const quiz = quizCatalog[quizId];
        if(!quiz) return;
        const label = document.createElement('label');
        const input = document.createElement('input');
        const text = document.createElement('span');
        label.className = 'admin-quiz-toggle';
        input.type = 'checkbox';
        input.checked = selected.has(quizId);
        input.dataset.adminTodayQuizPoolToggle = quizId;
        text.textContent = String(quiz.title || quizId).replace(' 퀴즈', '');
        label.append(input, text);
        list.appendChild(label);
      });
      section.append(heading, list);
      root.appendChild(section);
    });
  }

  function renderAdminQuizToggleGrid(flags, deps = {}) {
    const root = document.getElementById('admin-quiz-toggle-grid');
    const getDisabledQuizIdSet = deps.getDisabledQuizIdSet;
    const getAdminQuizToggleGroups = deps.getAdminQuizToggleGroups;
    const quizCatalog = deps.quizCatalog || {};
    if(!root || typeof getDisabledQuizIdSet !== 'function' || typeof getAdminQuizToggleGroups !== 'function') return;
    const disabled = getDisabledQuizIdSet(flags);
    root.innerHTML = '';
    getAdminQuizToggleGroups().forEach(group => {
      const section = document.createElement('section');
      const heading = document.createElement('h4');
      const list = document.createElement('div');
      section.className = 'admin-quiz-toggle-group';
      heading.textContent = group.label;
      list.className = 'admin-quiz-toggle-list';
      group.quizIds.forEach(quizId => {
        const quiz = quizCatalog[quizId];
        if(!quiz) return;
        const label = document.createElement('label');
        const input = document.createElement('input');
        const text = document.createElement('span');
        label.className = 'admin-quiz-toggle';
        input.type = 'checkbox';
        input.checked = !disabled.has(quizId);
        input.dataset.adminQuizToggle = quizId;
        text.textContent = String(quiz.title || quizId).replace(' 퀴즈', '');
        label.append(input, text);
        list.appendChild(label);
      });
      section.append(heading, list);
      root.appendChild(section);
    });
  }

  function renderAdminLogs(logs, deps = {}) {
    const root = document.getElementById('admin-logs-list');
    if(!root) return;
    const formatAdminLogAction = deps.formatAdminLogAction || (action => action || '관리자 작업');
    root.innerHTML = '';
    const items = logs || [];
    if(!items.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = '표시할 작업 이력이 없습니다.';
      root.appendChild(empty);
      return;
    }
    items.forEach(log => {
      const card = document.createElement('article');
      const title = document.createElement('h4');
      const meta = document.createElement('p');
      const reason = document.createElement('p');
      card.className = 'admin-log-card';
      title.textContent = formatAdminLogAction(log.action);
      meta.textContent = `${formatAdminTimestamp(log.createdAt)} · 관리자 ${log.adminUserId || '-'} · 대상 ${log.targetUserId || '-'}`;
      reason.textContent = log.reason ? `사유: ${log.reason}` : '';
      card.append(title, meta);
      if(reason.textContent) card.appendChild(reason);
      root.appendChild(card);
    });
  }

  window.DJ48AdminRender = {
    formatAdminTimestamp,
    createAdminInfoChip,
    getAdminPasswordStateLabel,
    createAdminDetailMetric,
    createAdminDetailList,
    createAdminStructuredSection,
    createAdminRankingCleanupList,
    createAdminDailyUsageList,
    renderAdminOperationalAudit,
    renderAdminQuizQualityAudit,
    renderAdminSummary,
    renderAdminStudentEconomySummary,
    renderAdminMemberList,
    renderAdminStudentEconomyList,
    renderAdminMemberDetail,
    renderAdminExternalQuizRows,
    renderAdminSeasonEventRows,
    renderAdminTodayQuizPoolGrid,
    renderAdminQuizToggleGrid,
    renderAdminDashboard,
    renderAdminLogs
  };
})();
