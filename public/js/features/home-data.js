(function () {
  function getBadgeIconForGroup(group) {
    const icons = {
      korean: '📚',
      social: '🏛️',
      math: '➗',
      people: '🖼️',
      daily: '✅',
      pokemon: '⭐'
    };
    return icons[group] || '🏅';
  }

  function normalizeTitleCardFromFirestore(doc) {
    const data = doc.data() || {};
    return {
      titleId: data.titleId || doc.id,
      icon: '🏷️',
      name: data.titleName || data.name || data.titleId || doc.id,
      desc: data.description || data.conditionText || data.sourceCategory || data.sourceType || '획득한 칭호입니다.',
      themeClass: data.themeClass || (data.theme ? `title-theme-${data.theme}` : ''),
      tierClass: data.tierClass || (data.tier ? `title-tier-${data.tier}` : ''),
      effectClass: data.effectClass || data.effect || '',
      selected: data.selected === true
    };
  }

  function normalizeBadgeCardFromFirestore(doc) {
    const data = doc.data() || {};
    const correct = Number(data.correct) || 0;
    const total = Number(data.total) || 0;
    const starCount = Number(data.starCount) || 0;
    const progressText = total ? `${correct}/${total}` : '진행 기록 있음';
    const rawGroup = data.group || 'other';
    const badgeKeyText = [
      data.badgeId,
      data.label,
      data.areaKey,
      data.sourceId
    ].filter(Boolean).join(' ');
    let group = rawGroup;
    if(data.badgeId === 'daily_맞춤법' || data.label === '맞춤법' || data.areaKey === '일상/맞춤법') {
      group = 'korean';
    } else if(badgeKeyText.includes('역사인물') || badgeKeyText.includes('역사-인물')) {
      group = 'social';
    } else if(badgeKeyText.includes('아재개그')) {
      group = 'people';
    } else if(rawGroup === 'daily') {
      group = 'people';
    }
    return {
      badgeId: data.badgeId || doc.id,
      icon: getBadgeIconForGroup(group),
      name: data.label || data.badgeId || doc.id,
      desc: `진행도 ${progressText}${starCount ? ` · 완주 ${starCount}회` : ''}`,
      group,
      correct,
      total,
      starCount,
      completed: data.completed === true,
      progressPercent: Number(data.progressPercent) || 0
    };
  }

  function getSelectedTitleNameFromHomeData(profile, titleSummary, titleCards, options = {}) {
    const selectedTitleId = titleSummary?.selectedTitleId || profile?.selectedTitleId || '';
    const selectedTitleName = titleSummary?.selectedTitleName || '';
    if(selectedTitleName) return selectedTitleName;
    const selected = titleCards.find(title => title.titleId === selectedTitleId);
    if(selected?.name) return selected.name;
    const knownTitleName = options.getKnownTitleName?.(selectedTitleId);
    if(knownTitleName) return knownTitleName;
    if(options.hasMemberUserId) return selectedTitleId ? '선택한 칭호 없음' : '보유 칭호 없음';
    return options.fallbackTitleName || '';
  }

  function getRepresentativeBadgeName(badgeCards, options = {}) {
    const earnedBadge = badgeCards.find(badge => badge.completed || Number(badge.starCount) > 0);
    if(earnedBadge?.name) return earnedBadge.name;
    return options.hasMemberUserId ? '취득한 뱃지 없음' : options.fallbackBadgeName || '';
  }

  function buildHomeMemberModel(data = {}, deps = {}) {
    const {
      profile,
      profileData = {},
      userRewardData = {},
      economy,
      titleSummarySnapshot,
      titlesSnapshot,
      badgesSnapshot,
      dataOwnerId,
      memberUserId
    } = data;
    const titleCards = titlesSnapshot?.docs?.map(normalizeTitleCardFromFirestore) || [];
    const badgeCards = (badgesSnapshot?.docs?.map(normalizeBadgeCardFromFirestore) || [])
      .filter(badge => deps.isPracticeBadgeVisibleByFlags?.(badge) !== false);
    const titleSummary = titleSummarySnapshot?.exists ? titleSummarySnapshot.data() : null;
    const hasMemberUserId = !!memberUserId;
    const schoolText = profile
      ? `${profile.school || ''} ${profile.grade || ''}학년 ${profile.classNumber || ''}반 ${profile.studentNumber || ''}번`.trim()
      : profileData.school;

    return {
      profile: {
        userId: profile?.userId || memberUserId || dataOwnerId || '',
        role: profile?.role || '',
        adminLevel: profile?.adminLevel || '',
        avatar: profileData.avatar,
        profileImageUrl: profile?.profileImageUrl || '',
        profileImageSource: profile?.profileImageSource || '',
        profileImageStoragePath: profile?.profileImageStoragePath || '',
        profileImageScale: profile?.profileImageScale,
        profileImageOffsetX: profile?.profileImageOffsetX,
        profileImageOffsetY: profile?.profileImageOffsetY,
        nickname: profile?.nickname || profileData.nickname,
        school: schoolText || profileData.school,
        titleName: getSelectedTitleNameFromHomeData(profile, titleSummary, titleCards, {
          hasMemberUserId,
          getKnownTitleName: deps.getKnownTitleName,
          fallbackTitleName: deps.fallbackTitleName
        }),
        badgeName: getRepresentativeBadgeName(badgeCards, {
          hasMemberUserId,
          fallbackBadgeName: deps.fallbackBadgeName
        }),
        coinText: economy ? `${Number(economy.djCoin) || 0} DJ코인` : `${userRewardData.coin} DJ코인`,
        rankingMessage: profile?.rankingMessage || ''
      },
      titleCards,
      badgeCards,
      dataOwnerId
    };
  }

  function buildTitleCardsForRender(titleCards = [], selectedTitleId = '') {
    return titleCards.map(title => ({
      ...title,
      selected: title.titleId === selectedTitleId || title.selected === true,
      actionLabel: title.titleId === selectedTitleId ? '선택됨' : '대표 칭호로 선택'
    }));
  }

  function getDefaultTitleCards() {
    return [{
      titleId: 'none',
      icon: '🏷️',
      name: '보유 칭호 없음',
      desc: '보유 칭호가 없습니다.'
    }];
  }

  function getDefaultBadgeCards() {
    return [{
      badgeId: 'none',
      icon: '🏅',
      name: '연습 현황 없음',
      desc: '아직 표시할 연습기록 기반 뱃지 현황이 없습니다.'
    }];
  }

  window.DJ48HomeData = {
    getBadgeIconForGroup,
    normalizeTitleCardFromFirestore,
    normalizeBadgeCardFromFirestore,
    getSelectedTitleNameFromHomeData,
    getRepresentativeBadgeName,
    buildHomeMemberModel,
    buildTitleCardsForRender,
    getDefaultTitleCards,
    getDefaultBadgeCards
  };
})();
