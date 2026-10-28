(function (root) {
  async function loadRankingPlazaData(options = {}, deps = {}) {
    const repository = deps.getRankingRepository?.();
    if(!repository) throw new Error('ranking-repository-unavailable');
    await deps.initializeAuthUser?.();

    const rowLimit = Number(options.rowLimit) || 10;
    const boardId = options.boardId || '';
    const subjectBoard = ['korean','math','social','science'].includes(boardId) && repository.loadSubjectRankingRecords;
    const generated = subjectBoard
      ? { ...(await repository.loadSubjectRankingRecords(boardId, rowLimit)), summaries: [] }
      : repository.loadSubjectRankingSnapshot && (!boardId || boardId === 'quizKing')
        ? await repository.loadSubjectRankingSnapshot() : null;
    const needsSeason = !boardId || boardId === 'season';
    const seasonEvents = needsSeason ? await deps.loadSeasonEventsForRanking?.().catch(error => {
      deps.warn?.('Season events for ranking load failed.', error);
      return [];
    }) || [] : [];
    const seasonRankingCategoryKeys = deps.getSeasonRankingCategoryKeys?.(seasonEvents) || [];
    const definitions = boardId ? deps.getRankingBoardModels([], [], seasonEvents) : [];
    const board = definitions.find(item => item.id === boardId);
    const categoryKeys = boardId === 'popular' ? options.popularCategoryKeys
      : boardId === 'pokemon' ? options.pokemonCategoryKeys
        : boardId === 'tiniping' ? options.tinipingCategoryKeys
          : Array.from(new Set((board?.groups || []).flatMap(group => group.keys || [])));
    const [rawQuizKingSummaries, selectedRecords, seasonRankingRecords] = await Promise.all([
      generated ? generated.summaries.slice(0,rowLimit) : !boardId || boardId === 'quizKing' ? repository.loadQuizKingSummaries(rowLimit) : [],
      subjectBoard ? [] : !boardId ? repository.loadLimitedRankingRecordsForPlaza()
        : categoryKeys?.length && boardId !== 'season' ? repository.loadLimitedRankingRecordsForPlaza(categoryKeys) : [],
      seasonRankingCategoryKeys.length
        ? repository.loadSeasonRankingRecordsForPlaza?.(seasonRankingCategoryKeys, seasonEvents)
        : []
    ]);
    // Preserve the legacy aggregate fallback only when its summary is absent.
    const rankingRecords = boardId === 'quizKing' && !rawQuizKingSummaries.length
      ? await repository.loadLimitedRankingRecordsForPlaza() : selectedRecords;

    const byRecordId = new Map();
    const subjectRows = generated ? ['korean','math','social','science'].flatMap(subject => generated.records.filter(row => row.subject === subject).sort((a,b) => b.score-a.score).slice(0,rowLimit)) : [];
    [...(rankingRecords || []), ...(seasonRankingRecords || []), ...subjectRows].forEach(row => {
      if(root.DJ48SubjectQuiz?.isLegacyRecord(row)) return;
      const key = row?.recordId || `${row?.memberUserId || row?.userId || ''}::${row?.categoryKey || row?.category || ''}::${row?.createdAt || ''}`;
      if(key) byRecordId.set(key, row);
    });
    const filteredRankingRecords = Array.from(byRecordId.values()).filter(row => deps.isRankingRowEnabledByFlags?.(row) !== false);
    const profileMap = await repository.loadMemberProfilesForRankingRows(
      rawQuizKingSummaries.concat(filteredRankingRecords)
    );
    const mergeRankingRowWithMemberProfile = deps.mergeRankingRowWithMemberProfile || (row => row);
    const enrichedQuizKingSummaries = rawQuizKingSummaries.map(row => mergeRankingRowWithMemberProfile(row, profileMap));
    const enrichedRankingRecords = filteredRankingRecords.map(row => mergeRankingRowWithMemberProfile(row, profileMap));
    const quizKingSummaries = enrichedQuizKingSummaries.length
      ? enrichedQuizKingSummaries
      : deps.buildQuizKingSummariesFromRankingRecords(enrichedRankingRecords);
    const quizKing = deps.getTopQuizKingSummaries(quizKingSummaries, 1)[0] || null;
    const getBestRankingRecordByCategoryKeys = deps.getBestRankingRecordByCategoryKeys || (() => null);
    const popularCategoryKeys = options.popularCategoryKeys || [];
    const scienceCategoryKeys = options.scienceCategoryKeys || [];
    const pokemonCategoryKeys = options.pokemonCategoryKeys || [];
    const tinipingCategoryKeys = options.tinipingCategoryKeys || [];

    return {
      cards: [
        deps.buildRankingRecordCard('korean_king', '📚', '국어왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, options.koreanCategoryKeys || [])),
        deps.buildRankingRecordCard('social_king', '🏛️', '사회왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, options.socialCategoryKeys || [])),
        deps.buildRankingRecordCard('math_king', '➗', '수학왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, options.mathCategoryKeys || [])),
        deps.buildRankingRecordCard('science_king', '🔬', '과학왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, scienceCategoryKeys)),
        deps.buildRankingRecordCard('flags_king', '🏳️', '국기왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, ['popular-v2-flag-country'])),
        deps.buildRankingRecordCard('pokemon_king', '⚡', '포켓몬왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, pokemonCategoryKeys)),
        deps.buildRankingRecordCard('tiniping_king', '💎', '티니핑왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, tinipingCategoryKeys))
      ],
      boards: deps.getRankingBoardModels(quizKingSummaries, enrichedRankingRecords, seasonEvents)
    };
  }

  function renderRankingView(options = {}, deps = {}) {
    const fallbackCards = options.fallbackCards || [];
    const loadingCards = fallbackCards.map(entry => ({ ...entry, title: options.loadingTitle || '랭킹 불러오는 중' }));
    deps.renderRankingCards(loadingCards);
    deps.renderRankingBoards(null);
    return deps.loadRankingPlazaCards()
      .then(model => {
        deps.renderRankingCards(model?.cards?.length ? model.cards : fallbackCards);
        deps.renderRankingBoards(model);
        return model;
      })
      .catch(error => {
        deps.warn?.('Firestore ranking plaza read failed. Using static ranking fallback.', error);
        deps.renderRankingCards(fallbackCards);
        deps.renderRankingBoards(null);
        return null;
      });
  }

  async function loadProfileRankingRecordsData(options = {}, deps = {}) {
    const repository = deps.getRankingRepository?.();
    const memberUserId = String(options.memberUserId || '').trim();
    if(!repository || !memberUserId) return { records: [], rankContext: {} };

    const records = (await repository.loadMemberRankingRecords(memberUserId, Number(options.recordLimit) || 500))
      .filter(record => deps.isRankingRowEnabledByFlags?.(record) !== false);
    const positiveRows = records.filter(record => Number(record.score) > 0);
    const bestRows = deps.getProfileBestRankingRecords(positiveRows)
      .sort(deps.compareProfileBestRankingRecords)
      .slice(0, Number(options.bestContextLimit) || 5);
    const rankContext = await repository.loadProfileRankingRankContext(bestRows);
    return { records, rankContext };
  }

  async function renderProfileRankingRecordsFlow(options = {}, deps = {}) {
    deps.setProfileRankingLoading?.();
    const { records, rankContext } = await loadProfileRankingRecordsData(options, deps);
    deps.renderProfileRankingRecords(records, rankContext);
    return records;
  }

  async function renderCurrentMemberProfileRankingFlow(options = {}, deps = {}) {
    return renderProfileRankingRecordsFlow({
      memberUserId: deps.getCurrentMemberUserId?.() || '',
      recordLimit: options.recordLimit,
      bestContextLimit: options.bestContextLimit
    }, {
      getRankingRepository: deps.getRankingRepository,
      isRankingRowEnabledByFlags: deps.isRankingRowEnabledByFlags,
      getProfileBestRankingRecords: deps.getProfileBestRankingRecords,
      compareProfileBestRankingRecords: deps.compareProfileBestRankingRecords,
      renderProfileRankingRecords: deps.renderProfileRankingRecords,
      setProfileRankingLoading: deps.setProfileRankingLoading
    });
  }

  const api = {
    loadRankingPlazaData,
    renderRankingView,
    loadProfileRankingRecordsData,
    renderProfileRankingRecordsFlow,
    renderCurrentMemberProfileRankingFlow
  };

  root.DJ48RankingUsecases = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
