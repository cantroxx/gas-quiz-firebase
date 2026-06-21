(function () {
  function getEnabledRankingCategoryKeys(keys, deps = {}) {
    const categoryQuizIdMap = deps.rankingCategoryQuizIdMap || {};
    const isQuizEnabledByFlags = deps.isQuizEnabledByFlags || (() => true);
    return (keys || []).filter(key => {
      const quizId = categoryQuizIdMap[key];
      return quizId ? isQuizEnabledByFlags(quizId) : true;
    });
  }

  function getEnabledRankingGroupDefinitions(definitions, deps = {}) {
    return (definitions || [])
      .map(definition => ({
        ...definition,
        keys: getEnabledRankingCategoryKeys(definition.keys, deps)
      }))
      .filter(definition => definition.keys.length);
  }

  function normalizeRankingRecordFromFirestore(doc) {
    return { recordId: doc.id, ...doc.data() };
  }

  function getRankingPlazaCategoryRecordLimit(categoryKey, deps = {}) {
    const isTinipingRankingCategoryKey = deps.isTinipingRankingCategoryKey || (() => false);
    const isPokemonRankingCategoryKey = deps.isPokemonRankingCategoryKey || (() => false);
    const categoryRecordLimit = Number(deps.rankingPlazaCategoryRecordLimit) || 40;
    if(isTinipingRankingCategoryKey(categoryKey)) return 800;
    return isPokemonRankingCategoryKey(categoryKey) ? 240 : categoryRecordLimit;
  }

  function getRankingMemberUserId(row) {
    return String(row?.memberUserId || row?.userId || '').trim();
  }

  function mergeRankingRowWithMemberProfile(row, profileMap, deps = {}) {
    const getKnownTitleName = deps.getKnownTitleName || (() => '');
    const memberUserId = getRankingMemberUserId(row);
    const profile = memberUserId ? profileMap[memberUserId] : null;
    if(!profile) return row;
    return {
      ...row,
      displayNickname: profile.nickname || row.nickname || row.displayName || row.name || '',
      displayName: profile.nickname || row.displayName || row.nickname || row.name,
      nickname: profile.nickname || row.nickname || row.displayName || row.name,
      profileImageUrl: profile.profileImageUrl || profile.profileImageId || row.profileImageUrl || row.profileImageId || row.imageUrl || '',
      profileImageId: profile.profileImageId || row.profileImageId || '',
      profileImageSource: profile.profileImageSource || row.profileImageSource || '',
      profileImageStoragePath: profile.profileImageStoragePath || row.profileImageStoragePath || '',
      profileImageScale: profile.profileImageScale ?? row.profileImageScale,
      profileImageOffsetX: profile.profileImageOffsetX ?? row.profileImageOffsetX,
      profileImageOffsetY: profile.profileImageOffsetY ?? row.profileImageOffsetY,
      rankingMessage: profile.rankingMessage || row.rankingMessage || '',
      selectedTitleId: profile.selectedTitleId || row.selectedTitleId || '',
      selectedTitle: profile.selectedTitleName || getKnownTitleName(profile.selectedTitleId) || row.selectedTitle || '',
      school: profile.school || row.school || '',
      grade: profile.grade || row.grade || '',
      classNo: profile.classNumber || row.classNo || '',
      number: profile.studentNumber || row.number || '',
      level: profile.level || row.level || 0,
      xp: profile.xp ?? row.xp,
      totalXp: profile.totalXp ?? row.totalXp,
      tier: profile.tier || row.tier || '',
      medalId: profile.medalId || row.medalId || '',
      rankIconUrl: profile.rankIconUrl || row.rankIconUrl || '',
      selectedTitleFrameItemId: profile.selectedTitleFrameItemId || row.selectedTitleFrameItemId || ''
    };
  }

  function buildRankingGroups(records, definitions, deps = {}) {
    const getTopRankingRecordsByCategoryKeys = deps.getTopRankingRecordsByCategoryKeys || (() => []);
    const rowLimit = Number(deps.rankingPlazaRowLimit) || 10;
    return definitions.map(definition => ({
      id: definition.id,
      label: definition.label,
      keys: definition.keys,
      sourceRows: records,
      rows: getTopRankingRecordsByCategoryKeys(records, definition.keys, rowLimit, definition.rankingModes || null)
    }));
  }

  function buildSubjectRankingGroups(records, allKeys, definitions, deps = {}) {
    const getTopRankingRecordsByCategoryKeys = deps.getTopRankingRecordsByCategoryKeys || (() => []);
    return [
      { id: 'all', label: '전체', keys: allKeys, sourceRows: records, rows: getTopRankingRecordsByCategoryKeys(records, allKeys) },
      ...buildRankingGroups(records, definitions, deps)
    ];
  }

  function getKstPeriodRange(periodType) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);
    const lookup = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const kstDate = new Date(Date.UTC(Number(lookup.year), Number(lookup.month) - 1, Number(lookup.day)));
    const startKstDate = new Date(kstDate);
    if(periodType === 'weekly') {
      const day = startKstDate.getUTCDay() || 7;
      startKstDate.setUTCDate(startKstDate.getUTCDate() - day + 1);
    } else {
      startKstDate.setUTCDate(1);
    }
    return {
      startMillis: startKstDate.getTime() - (9 * 60 * 60 * 1000),
      endMillis: now.getTime()
    };
  }

  function getSeasonRankingEvents(seasonEvents = [], periodType) {
    return (seasonEvents || [])
      .filter(eventItem => eventItem?.active !== false && eventItem?.periodType === periodType)
      .filter(eventItem => Array.isArray(eventItem.quizIds) && eventItem.quizIds.length);
  }

  function getSeasonRankingCategoryKeys(events = [], deps = {}) {
    const quizCategoryMap = deps.rankingQuizIdCategoryMap || {};
    return Array.from(new Set(events
      .flatMap(eventItem => eventItem.quizIds || [])
      .map(quizId => quizCategoryMap[quizId])
      .filter(Boolean)));
  }

  function getSeasonRankingRecords(records = [], events = [], periodType, deps = {}) {
    const getRankingRecordTimeValue = deps.getRankingRecordTimeValue || (() => 0);
    const getTopRankingRecordsByCategoryKeys = deps.getTopRankingRecordsByCategoryKeys || (() => []);
    const rowLimit = Number(deps.rankingPlazaRowLimit) || 10;
    const range = getKstPeriodRange(periodType);
    const keys = getSeasonRankingCategoryKeys(events, deps);
    const periodRecords = records.filter(record => {
      const time = getRankingRecordTimeValue(record);
      return time >= range.startMillis && time <= range.endMillis;
    });
    return getTopRankingRecordsByCategoryKeys(periodRecords, keys, rowLimit);
  }

  function getSeasonQuizAreaLabel(eventItem = {}, deps = {}) {
    const quizCatalog = deps.quizCatalog || {};
    const subjectLabels = deps.subjectLabels || {};
    const quizIds = Array.isArray(eventItem.quizIds) ? eventItem.quizIds : [];
    const subjectIds = Array.from(new Set(quizIds.map(quizId => quizCatalog[quizId]?.subjectId).filter(Boolean)));
    if(subjectIds.length === 1) return subjectLabels[subjectIds[0]] || quizCatalog[quizIds[0]]?.title?.replace(' 퀴즈', '') || eventItem.title || '시즌';
    if(quizIds.length === 1) return quizCatalog[quizIds[0]]?.title?.replace(' 퀴즈', '') || eventItem.title || '시즌';
    return eventItem.title || '시즌';
  }

  function buildSeasonRankingGroups(records = [], seasonEvents = [], deps = {}) {
    const getRankingCategoryLabel = deps.getRankingCategoryLabel || (() => '');
    return (seasonEvents || [])
      .filter(eventItem => eventItem?.active !== false && Array.isArray(eventItem.quizIds) && eventItem.quizIds.length)
      .map(eventItem => ({
      id: `season-${eventItem.periodType || 'monthly'}-${eventItem.eventId || getSeasonQuizAreaLabel(eventItem, deps)}`,
      label: getSeasonQuizAreaLabel(eventItem, deps),
      desc: eventItem.periodType === 'weekly'
        ? '이번주 전용 시즌 랭킹탭입니다.'
        : '이번달 전용 시즌 랭킹탭입니다.',
      keys: getSeasonRankingCategoryKeys([eventItem], deps),
      rows: getSeasonRankingRecords(records, [eventItem], eventItem.periodType === 'weekly' ? 'weekly' : 'monthly', deps),
      sourceRows: records,
      meta: row => getRankingCategoryLabel(row) || '시즌',
      score: row => `${Number(row.score) || 0}점${row.elapsedText ? ` · ${row.elapsedText}` : ''}`
    }));
  }

  function buildSeasonRankingBoard(records = [], seasonEvents = [], deps = {}) {
    const groups = buildSeasonRankingGroups(records, seasonEvents, deps);
    return {
      id: 'season',
      label: '시즌',
      title: '시즌 랭킹',
      desc: '이번달/이번주로 설정된 시즌 퀴즈 랭킹입니다.',
      rows: groups.flatMap(group => group.rows || []),
      groups: groups.length ? groups : [{ id: 'season-empty', label: '시즌', desc: '시즌 이벤트에 지정된 퀴즈가 없습니다.', rows: [] }]
    };
  }

  function getRankingBoardModels(quizKingSummaries, rankingRecords, seasonEvents = [], deps = {}) {
    const getTopQuizKingSummaries = deps.getTopQuizKingSummaries || (() => []);
    const getTopRankingRecordsByCategoryKeys = deps.getTopRankingRecordsByCategoryKeys || (() => []);
    const getRankingCategoryLabel = deps.getRankingCategoryLabel || (() => '');
    const getPopularAreaForRecord = deps.getPopularAreaForRecord || (() => ({ label: '인기' }));
    const getPopularRankingDetailLabel = deps.getPopularRankingDetailLabel || (() => '');
    const createPopularRankingMeta = deps.createPopularRankingMeta || null;
    const tinipingRankingCategoryKeys = deps.tinipingRankingCategoryKeys || [];
    const pokemonRankingCategoryKeys = deps.pokemonRankingCategoryKeys || [];
    const rowLimit = Number(deps.rankingPlazaRowLimit) || 10;
    const groupDeps = { ...deps, getTopRankingRecordsByCategoryKeys, rankingPlazaRowLimit: rowLimit };
    const koreanDefinitions = getEnabledRankingGroupDefinitions([
      { id: 'spelling', label: '맞춤법', keys: ['맞춤법'] },
      { id: 'wordRelation', label: '다의어·동형이의어', keys: ['단어다의어-동형이의어'] },
      { id: 'spacing', label: '띄어쓰기', keys: ['국어띄어쓰기'] },
      { id: 'proverb', label: '속담', keys: ['국어속담'] },
      { id: 'idiom', label: '사자성어', keys: ['국어사자성어'] },
      { id: 'readingGmo', label: '지엠오 아이', keys: ['독서지엠오-아이'] },
      { id: 'timeStore', label: '시간가게', keys: ['독서시간가게'] }
    ], deps);
    const socialDefinitions = getEnabledRankingGroupDefinitions([
      { id: 'samgukji', label: '삼국지', keys: ['사회삼국지'] },
      { id: 'ancientHistory', label: '고대사~삼국시대', keys: ['사회고대사-삼국시대'] },
      { id: 'unifiedSillaBalhae', label: '통일신라~발해', keys: ['사회통일신라-발해'] },
      { id: 'culturalHeritage', label: '문화유산', keys: ['사회문화유산'] },
      { id: 'historyPeople', label: '역사 인물', keys: ['인물역사-인물'] }
    ], deps);
    const mathDefinitions = getEnabledRankingGroupDefinitions([
      { id: 'randomBasic', label: '곱셈과 나눗셈', keys: ['수학곱셈과-나눗셈'] },
      { id: 'fractionBasic', label: '분수', keys: ['수학분수', '수학분수-기초'] }
    ], deps);
    const scienceDefinitions = getEnabledRankingGroupDefinitions([
      { id: 'scienceGeneral', label: '과학 상식', keys: ['과학과학-상식'] }
    ], deps);
    const koreanKeys = koreanDefinitions.flatMap(definition => definition.keys);
    const socialKeys = socialDefinitions.flatMap(definition => definition.keys);
    const mathKeys = mathDefinitions.flatMap(definition => definition.keys);
    const scienceKeys = scienceDefinitions.flatMap(definition => definition.keys);
    const popularKeys = getEnabledRankingCategoryKeys(['아재개그', '인물아이돌', '인물애니', '인기국기', '인기간식', '인기이모지-k-pop', '인기이모지-애니', '인기이모지-티니핑', ...tinipingRankingCategoryKeys, ...pokemonRankingCategoryKeys], deps);
    const koreanGroups = buildSubjectRankingGroups(rankingRecords, koreanKeys, [
      ...koreanDefinitions
    ], groupDeps);
    const socialGroups = buildSubjectRankingGroups(rankingRecords, socialKeys, [
      ...socialDefinitions
    ], groupDeps);
    const mathGroups = buildSubjectRankingGroups(rankingRecords, mathKeys, [
      ...mathDefinitions
    ], groupDeps);
    const scienceGroups = buildSubjectRankingGroups(rankingRecords, scienceKeys, [
      ...scienceDefinitions
    ], groupDeps);
    return [
      buildSeasonRankingBoard(rankingRecords, seasonEvents, groupDeps),
      {
        id: 'quizKing',
        label: '퀴즈왕',
        title: '종합 퀴즈왕',
        desc: '여러 분야의 최고 점수를 합산한 종합 순위입니다.',
        rows: getTopQuizKingSummaries(quizKingSummaries),
        meta: row => `${Number(row.categoryCount) || 0}영역 반영`,
        score: row => `총 ${Number(row.totalScore) || 0}점`
      },
      {
        id: 'korean',
        label: '국어',
        title: '국어 랭킹',
        desc: '맞춤법, 다의어·동형이의어, 독서 퀴즈의 랭킹 기록입니다.',
        rows: getTopRankingRecordsByCategoryKeys(rankingRecords, koreanKeys),
        groups: koreanGroups,
        meta: row => getRankingCategoryLabel(row) || '국어',
        score: row => `${Number(row.score) || 0}점${row.elapsedText ? ` · ${row.elapsedText}` : ''}`
      },
      {
        id: 'social',
        label: '사회',
        title: '사회 랭킹',
        desc: '삼국지, 고대사, 역사 인물 퀴즈의 랭킹 기록입니다.',
        rows: getTopRankingRecordsByCategoryKeys(rankingRecords, socialKeys),
        groups: socialGroups,
        meta: row => getRankingCategoryLabel(row) || '사회',
        score: row => `${Number(row.score) || 0}점${row.elapsedText ? ` · ${row.elapsedText}` : ''}`
      },
      {
        id: 'math',
        label: '수학',
        title: '수학 랭킹',
        desc: '곱셈과 나눗셈, 분수 랭킹전 기록입니다.',
        rows: getTopRankingRecordsByCategoryKeys(rankingRecords, mathKeys),
        groups: mathGroups,
        meta: row => getRankingCategoryLabel(row) || '수학',
        score: row => `${Number(row.score) || 0}점${row.elapsedText ? ` · ${row.elapsedText}` : ''}`
      },
      {
        id: 'science',
        label: '과학',
        title: '과학 랭킹',
        desc: '과학 상식 퀴즈의 랭킹전 기록입니다.',
        rows: getTopRankingRecordsByCategoryKeys(rankingRecords, scienceKeys),
        groups: scienceGroups,
        meta: row => getRankingCategoryLabel(row) || '과학',
        score: row => `${Number(row.score) || 0}점${row.elapsedText ? ` · ${row.elapsedText}` : ''}`
      },
      {
        id: 'popular',
        label: '인기',
        title: '인기 퀴즈 랭킹',
        desc: '아재개그, 아이돌, 애니, 이모지, 포켓몬 퀴즈의 랭킹 기록입니다.',
        rows: getTopRankingRecordsByCategoryKeys(rankingRecords, popularKeys),
        sourceRows: rankingRecords,
        meta: row => `[${getPopularAreaForRecord(row).label}] ${getPopularRankingDetailLabel(row)}`,
        metaElement: createPopularRankingMeta,
        score: row => `${Number(row.score) || 0}점${row.elapsedText ? ` · ${row.elapsedText}` : ''}`
      }
    ];
  }

  window.DJ48RankingData = {
    getEnabledRankingCategoryKeys,
    getEnabledRankingGroupDefinitions,
    normalizeRankingRecordFromFirestore,
    getRankingPlazaCategoryRecordLimit,
    getRankingMemberUserId,
    mergeRankingRowWithMemberProfile,
    buildRankingGroups,
    buildSubjectRankingGroups,
    getSeasonRankingCategoryKeys,
    buildSeasonRankingGroups,
    buildSeasonRankingBoard,
    getRankingBoardModels
  };
})();
