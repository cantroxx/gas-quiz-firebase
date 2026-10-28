const assert = require('assert');
const rankingUsecases = require('../../public/js/application/ranking-usecases.js');

async function testLoadRankingPlazaData() {
  let initialized = false;
  const model = await rankingUsecases.loadRankingPlazaData({
    rowLimit: 10,
    koreanCategoryKeys: ['korean'],
    socialCategoryKeys: ['social'],
    mathCategoryKeys: ['math'],
    scienceCategoryKeys: ['science'],
    popularCategoryKeys: ['popular'],
    pokemonCategoryKeys: ['pokemon'],
    tinipingCategoryKeys: ['tiniping']
  }, {
    getRankingRepository: () => ({
      loadQuizKingSummaries: async () => [
        { memberUserId: 'u1', totalScore: 300, categoryCount: 3, nickname: 'Before' }
      ],
      loadLimitedRankingRecordsForPlaza: async () => [
        { recordId: 'r1', memberUserId: 'u1', categoryKey: 'korean', score: 90 },
        { recordId: 'r2', memberUserId: 'u2', categoryKey: 'social', score: 80, disabled: true }
      ],
      loadMemberProfilesForRankingRows: async () => ({
        u1: { nickname: 'Student One' }
      })
    }),
    initializeAuthUser: async () => { initialized = true; },
    isRankingRowEnabledByFlags: row => !row.disabled,
    mergeRankingRowWithMemberProfile: (row, profiles) => ({
      ...row,
      nickname: profiles[row.memberUserId]?.nickname || row.nickname
    }),
    buildQuizKingSummariesFromRankingRecords: rows => rows,
    getTopQuizKingSummaries: rows => rows.slice(0, 1),
    getBestRankingRecordByCategoryKeys: (records, keys) => records.find(record => keys.includes(record.categoryKey)) || null,
    buildQuizKingCard: row => ({ rankId: 'quiz_king', nickname: row.nickname }),
    buildRankingRecordCard: (rankId, icon, label, record) => ({ rankId, icon, label, score: record?.score || 0 }),
    getRankingBoardModels: (summaries, records) => [{ id: 'quizKing', summaries, records }]
  });

  assert.equal(initialized, true);
  assert.deepEqual(model.cards.map(card => card.rankId), [
    'korean_king',
    'social_king',
    'math_king',
    'science_king',
    'flags_king',
    'pokemon_king',
    'tiniping_king'
  ]);
  assert.equal(model.cards[0].score, 90);
  assert.equal(model.cards[1].score, 0);
  assert.equal(model.boards[0].records.length, 1);
}

async function testRenderRankingViewSuccess() {
  const calls = [];
  const model = await rankingUsecases.renderRankingView({
    fallbackCards: [{ title: 'Fallback' }],
    loadingTitle: 'Loading'
  }, {
    renderRankingCards: cards => calls.push(['cards', cards[0].title]),
    renderRankingBoards: board => calls.push(['boards', board]),
    loadRankingPlazaCards: async () => ({ cards: [{ title: 'Loaded' }], boards: [] })
  });

  assert.deepEqual(calls.map(call => call[0]), ['cards', 'boards', 'cards', 'boards']);
  assert.equal(calls[0][1], 'Loading');
  assert.equal(calls[2][1], 'Loaded');
  assert.ok(model);
}

async function testRenderRankingViewFallback() {
  const calls = [];
  const model = await rankingUsecases.renderRankingView({
    fallbackCards: [{ title: 'Fallback' }]
  }, {
    renderRankingCards: cards => calls.push(cards[0].title),
    renderRankingBoards: () => {},
    loadRankingPlazaCards: async () => { throw new Error('fail'); },
    warn: () => {}
  });

  assert.equal(model, null);
  assert.equal(calls[calls.length - 1], 'Fallback');
}

async function testRenderProfileRankingRecordsFlow() {
  let loadingCalled = false;
  let rendered = null;
  const records = await rankingUsecases.renderProfileRankingRecordsFlow({
    memberUserId: 'u1',
    recordLimit: 500,
    bestContextLimit: 5
  }, {
    getRankingRepository: () => ({
      loadMemberRankingRecords: async () => [
        { recordId: 'r1', memberUserId: 'u1', categoryKey: 'korean', score: 100 },
        { recordId: 'r2', memberUserId: 'u1', categoryKey: 'math', score: 0 }
      ],
      loadProfileRankingRankContext: async bestRows => ({ bestCount: bestRows.length })
    }),
    isRankingRowEnabledByFlags: () => true,
    getProfileBestRankingRecords: rows => rows,
    compareProfileBestRankingRecords: (a, b) => b.score - a.score,
    renderProfileRankingRecords: (rows, rankContext) => { rendered = { rows, rankContext }; },
    setProfileRankingLoading: () => { loadingCalled = true; }
  });

  assert.equal(loadingCalled, true);
  assert.equal(records.length, 2);
  assert.equal(rendered.rows.length, 2);
  assert.equal(rendered.rankContext.bestCount, 1);
}

async function testRenderCurrentMemberProfileRankingFlow() {
  let rendered = null;
  const records = await rankingUsecases.renderCurrentMemberProfileRankingFlow({
    recordLimit: 10,
    bestContextLimit: 2
  }, {
    getCurrentMemberUserId: () => 'member-a',
    getRankingRepository: () => ({
      loadMemberRankingRecords: async (memberUserId, limit) => [
        { recordId: 'r1', memberUserId, categoryKey: 'korean', score: limit },
        { recordId: 'r2', memberUserId, categoryKey: 'math', score: 0 }
      ],
      loadProfileRankingRankContext: async bestRows => ({ bestIds: bestRows.map(row => row.recordId) })
    }),
    isRankingRowEnabledByFlags: () => true,
    getProfileBestRankingRecords: rows => rows,
    compareProfileBestRankingRecords: (a, b) => b.score - a.score,
    renderProfileRankingRecords: (rows, rankContext) => { rendered = { rows, rankContext }; }
  });

  assert.equal(records.length, 2);
  assert.equal(rendered.rows[0].memberUserId, 'member-a');
  assert.deepEqual(rendered.rankContext.bestIds, ['r1']);
}

async function testOnlySelectedBoardLoads() {
  let calls = [];
  const deps = {
    getRankingRepository: () => ({
      loadQuizKingSummaries: async () => { calls.push('quizKing'); return [{ memberUserId: 'u1' }]; },
      loadLimitedRankingRecordsForPlaza: async keys => { calls.push(keys); return []; },
      loadSeasonRankingRecordsForPlaza: async keys => { calls.push(['season', ...keys]); return []; },
      loadMemberProfilesForRankingRows: async () => ({})
    }),
    loadSeasonEventsForRanking: async () => { calls.push('events'); return [{ id: 'season-event' }]; },
    getSeasonRankingCategoryKeys: events => events.length ? ['season-key'] : [],
    getRankingBoardModels: () => [{ id: 'math', groups: [{ keys: ['math1', 'math2'] }, { keys: ['math1'] }] }],
    buildQuizKingSummariesFromRankingRecords: rows => rows,
    getTopQuizKingSummaries: rows => rows,
    buildQuizKingCard: () => ({}), buildRankingRecordCard: () => ({})
  };
  await rankingUsecases.loadRankingPlazaData({ boardId: 'math' }, deps);
  assert.deepEqual(calls, [['math1', 'math2']]);
  calls = [];
  await rankingUsecases.loadRankingPlazaData({ boardId: 'quizKing' }, deps);
  assert.deepEqual(calls, ['quizKing']);
  calls = [];
  await rankingUsecases.loadRankingPlazaData({ boardId: 'season' }, deps);
  assert.deepEqual(calls, ['events', ['season', 'season-key']]);
}

async function run() {
  await testLoadRankingPlazaData();
  await testRenderRankingViewSuccess();
  await testRenderRankingViewFallback();
  await testRenderProfileRankingRecordsFlow();
  await testRenderCurrentMemberProfileRankingFlow();
  await testOnlySelectedBoardLoads();
  await testGeneratedBoardAvoidsFullSnapshot();
  console.log('Application tests passed: ranking-usecases');
}

async function testGeneratedBoardAvoidsFullSnapshot() {
  const calls=[];
  const result=await rankingUsecases.loadRankingPlazaData({boardId:'math',rowLimit:10},{
    getRankingRepository:()=>({
      loadSubjectRankingSnapshot:async()=>assert.fail('single subject requested full snapshot'),
      loadSubjectRankingRecords:async(subject,limit)=>{calls.push([subject,limit]);return {records:[{recordId:'math-1',subject:'math',score:9}]};},
      loadLimitedRankingRecordsForPlaza:async()=>assert.fail('generated board queried legacy records'),
      loadMemberProfilesForRankingRows:async rows=>{assert.equal(rows.length,1);return {};}
    }),
    getRankingBoardModels:(summaries,records)=>[{id:'math',groups:[{keys:['subject-math']}],records}],
    buildQuizKingSummariesFromRankingRecords:()=>[],getTopQuizKingSummaries:()=>[],
    buildQuizKingCard:()=>({}),buildRankingRecordCard:()=>({})
  });
  assert.deepEqual(calls,[['math',10]]);assert.equal(result.boards[0].records.length,1);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
