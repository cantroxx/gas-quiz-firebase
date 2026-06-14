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
      number: profile.studentNumber || row.number || ''
    };
  }

  async function loadMemberProfilesForRankingRows(db, rows, deps = {}) {
    const lookupLimit = Number(deps.rankingProfileLookupLimit) || 180;
    const getFirebaseStorage = deps.getFirebaseStorage || (() => null);
    const userIds = Array.from(new Set(rows.map(getRankingMemberUserId).filter(Boolean))).slice(0, lookupLimit);
    if(!userIds.length) return {};
    const snapshots = await Promise.all(userIds.map(userId => Promise.all([
      db.collection('users').doc(userId).get().catch(() => null),
      db.collection('userTitleSummary').doc(userId).get().catch(() => null)
    ])));
    const profileMap = {};
    snapshots.forEach(([userSnapshot, titleSummarySnapshot], index) => {
      if(!userSnapshot?.exists) return;
      const data = userSnapshot.data() || {};
      const titleSummary = titleSummarySnapshot?.exists ? titleSummarySnapshot.data() || {} : {};
      profileMap[userIds[index]] = {
        userId: userIds[index],
        nickname: data.nickname || data.name || '',
        school: data.school || '',
        grade: data.grade || '',
        classNumber: data.classNumber || '',
        studentNumber: data.studentNumber || '',
        profileImageUrl: data.profileImageUrl || '',
        profileImageId: data.profileImageId || '',
        profileImageSource: data.profileImageSource || '',
        profileImageStoragePath: data.profileImageStoragePath || '',
        profileImageScale: data.profileImageScale,
        profileImageOffsetX: data.profileImageOffsetX,
        profileImageOffsetY: data.profileImageOffsetY,
        rankingMessage: data.rankingMessage || '',
        selectedTitleId: data.selectedTitleId || '',
        selectedTitleName: titleSummary.selectedTitleName || data.selectedTitleName || ''
      };
    });
    const missingTitleNameUsers = Object.values(profileMap).filter(profile => profile.selectedTitleId && !profile.selectedTitleName);
    if(missingTitleNameUsers.length) {
      const titleSnapshots = await Promise.all(missingTitleNameUsers.map(profile =>
        db.collection('userTitles').doc(profile.userId).collection('titles').doc(profile.selectedTitleId).get().catch(() => null)
      ));
      titleSnapshots.forEach((titleSnapshot, index) => {
        if(!titleSnapshot?.exists) return;
        const titleData = titleSnapshot.data() || {};
        missingTitleNameUsers[index].selectedTitleName = titleData.titleName || titleData.name || '';
      });
    }
    const stillMissingTitleUsers = Object.values(profileMap).filter(profile => profile.selectedTitleId && !profile.selectedTitleName);
    if(stillMissingTitleUsers.length) {
      const catalogSnapshots = await Promise.all(stillMissingTitleUsers.map(profile =>
        db.collection('titleCatalog').doc(profile.selectedTitleId).get().catch(() => null)
      ));
      catalogSnapshots.forEach((titleSnapshot, index) => {
        if(!titleSnapshot?.exists) return;
        const titleData = titleSnapshot.data() || {};
        stillMissingTitleUsers[index].selectedTitleName = titleData.titleName || titleData.title || titleData.name || '';
      });
    }
    const storage = getFirebaseStorage();
    const storageImageUsers = storage
      ? Object.values(profileMap).filter(profile => !profile.profileImageUrl && profile.profileImageStoragePath)
      : [];
    if(storageImageUsers.length) {
      const imageUrls = await Promise.all(storageImageUsers.map(profile =>
        storage.ref(profile.profileImageStoragePath).getDownloadURL().catch(() => '')
      ));
      imageUrls.forEach((url, index) => {
        if(url) storageImageUsers[index].profileImageUrl = url;
      });
    }
    return profileMap;
  }

  async function loadLimitedRankingRecordsForPlaza(db, deps = {}) {
    const rankingPlazaCategoryKeys = deps.rankingPlazaCategoryKeys || [];
    const enabledCategoryKeys = getEnabledRankingCategoryKeys(rankingPlazaCategoryKeys, deps);
    if(!enabledCategoryKeys.length) return [];
    const loadCategoryRecords = async categoryKey => {
      const limit = getRankingPlazaCategoryRecordLimit(categoryKey, deps);
      const baseQuery = db.collection('rankingRecords')
        .where('categoryKey', '==', categoryKey)
        .limit(limit);
      try {
        return await db.collection('rankingRecords')
          .where('categoryKey', '==', categoryKey)
          .orderBy('score', 'desc')
          .orderBy('elapsedSeconds', 'asc')
          .limit(limit)
          .get();
      } catch(error) {
        console.warn('Firestore ranking ordered query failed. Falling back to limited category query.', { categoryKey, error });
        return baseQuery.get();
      }
    };
    const snapshots = await Promise.all(enabledCategoryKeys.map(loadCategoryRecords));
    const byRecordId = new Map();
    snapshots.forEach(snapshot => {
      snapshot.docs.map(normalizeRankingRecordFromFirestore).filter(record => {
        const mode = String(record.rankingMode || '').trim();
        return !mode || mode === 'normal' || mode === 'speed' || mode === 'onechance' || mode === 'legacy' || mode === 'nohint';
      }).forEach(record => {
        byRecordId.set(record.recordId, record);
      });
    });
    return Array.from(byRecordId.values());
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

  function getRankingBoardModels(quizKingSummaries, rankingRecords, deps = {}) {
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
      { id: 'readingGmo', label: '지엠오 아이', keys: ['독서지엠오-아이'] },
      { id: 'timeStore', label: '시간가게', keys: ['독서시간가게'] }
    ], deps);
    const socialDefinitions = getEnabledRankingGroupDefinitions([
      { id: 'samgukji', label: '삼국지', keys: ['사회삼국지'] },
      { id: 'ancientHistory', label: '고대사~삼국시대', keys: ['사회고대사-삼국시대'] },
      { id: 'historyPeople', label: '역사 인물', keys: ['인물역사-인물'] }
    ], deps);
    const mathDefinitions = getEnabledRankingGroupDefinitions([
      { id: 'randomBasic', label: '곱셈과 나눗셈', keys: ['수학곱셈과-나눗셈'] }
    ], deps);
    const koreanKeys = koreanDefinitions.flatMap(definition => definition.keys);
    const socialKeys = socialDefinitions.flatMap(definition => definition.keys);
    const mathKeys = mathDefinitions.flatMap(definition => definition.keys);
    const popularKeys = getEnabledRankingCategoryKeys(['아재개그', '인물아이돌', '인물애니', ...tinipingRankingCategoryKeys, ...pokemonRankingCategoryKeys], deps);
    const koreanGroups = buildSubjectRankingGroups(rankingRecords, koreanKeys, [
      ...koreanDefinitions
    ], groupDeps);
    const socialGroups = buildSubjectRankingGroups(rankingRecords, socialKeys, [
      ...socialDefinitions
    ], groupDeps);
    const mathGroups = buildSubjectRankingGroups(rankingRecords, mathKeys, [
      ...mathDefinitions
    ], groupDeps);
    return [
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
        desc: '곱셈과 나눗셈 랭킹전 기록입니다.',
        rows: getTopRankingRecordsByCategoryKeys(rankingRecords, mathKeys),
        groups: mathGroups,
        meta: row => getRankingCategoryLabel(row) || '수학',
        score: row => `${Number(row.score) || 0}점${row.elapsedText ? ` · ${row.elapsedText}` : ''}`
      },
      {
        id: 'popular',
        label: '인기',
        title: '인기 퀴즈 랭킹',
        desc: '아재개그, 아이돌, 애니, 포켓몬 퀴즈의 랭킹 기록입니다.',
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
    loadMemberProfilesForRankingRows,
    loadLimitedRankingRecordsForPlaza,
    buildRankingGroups,
    buildSubjectRankingGroups,
    getRankingBoardModels
  };
})();
