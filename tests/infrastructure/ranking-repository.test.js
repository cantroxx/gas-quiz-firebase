const assert = require('assert');
const { createRankingRepository } = require('../../public/js/infrastructure/ranking-repository.js');

function makeDoc(id, data) {
  return { id, data: () => data };
}

function makeDb(collections) {
  const calls = [];
  return {
    calls,
    collection(name) {
      calls.push(['collection', name]);
      const docs = collections[name] || [];
      const query = {
        orderBy(field, direction) {
          calls.push(['orderBy', field, direction]);
          return query;
        },
        where(field, op, value) {
          calls.push(['where', field, op, value]);
          return query;
        },
        limit(value) {
          calls.push(['limit', value]);
          return query;
        },
        async get() {
          calls.push(['get']);
          return { docs };
        }
      };
      return query;
    }
  };
}

async function testRepositoryReadsRankingCollections() {
  const db = makeDb({
    quizKingSummary: [makeDoc('u1', { totalScore: 120 })],
    rankingRecords: [makeDoc('r1', { memberUserId: 'u1', score: 90 })]
  });
  let plazaDb = null;
  let profileRows = null;
  let rankContextDb = null;
  const repository = createRankingRepository({ db }, {
    loadLimitedRankingRecordsForPlaza: async nextDb => {
      plazaDb = nextDb;
      return [{ recordId: 'r2', score: 70 }];
    },
    loadMemberProfilesForRankingRows: async (nextDb, rows) => {
      profileRows = rows;
      assert.equal(nextDb, db);
      return { u1: { nickname: 'Student' } };
    },
    loadProfileRankingRankContext: async (nextDb, bestRows) => {
      rankContextDb = nextDb;
      return { count: bestRows.length };
    }
  });

  const summaries = await repository.loadQuizKingSummaries(3);
  const records = await repository.loadMemberRankingRecords('u1', 5);
  const plazaRecords = await repository.loadLimitedRankingRecordsForPlaza();
  const profileMap = await repository.loadMemberProfilesForRankingRows(summaries);
  const rankContext = await repository.loadProfileRankingRankContext(records);

  assert.deepEqual(summaries, [{ memberUserId: 'u1', totalScore: 120 }]);
  assert.deepEqual(records, [{ recordId: 'r1', memberUserId: 'u1', score: 90 }]);
  assert.deepEqual(plazaRecords, [{ recordId: 'r2', score: 70 }]);
  assert.equal(plazaDb, db);
  assert.equal(profileRows, summaries);
  assert.deepEqual(profileMap, { u1: { nickname: 'Student' } });
  assert.equal(rankContextDb, db);
  assert.deepEqual(rankContext, { count: 1 });
  assert.ok(db.calls.some(call => call[0] === 'collection' && call[1] === 'quizKingSummary'));
  assert.ok(db.calls.some(call => call[0] === 'where' && call[1] === 'memberUserId'));
}

async function testRepositoryBuildsProfileRankContext() {
  const db = makeDb({
    rankingRecords: [
      makeDoc('r1', { memberUserId: 'u1', categoryKey: 'math', score: 90, elapsedSeconds: 20 }),
      makeDoc('r2', { memberUserId: 'u2', categoryKey: 'math', score: 80, elapsedSeconds: 10 })
    ]
  });
  const repository = createRankingRepository({ db }, {
    getProfileRankingCategoryKey: record => record.categoryKey,
    getRankingPlazaCategoryRecordLimit: () => 10,
    getTopRankingRecordsByCategoryKeys: records => records,
    getProfileRankingRowKey: record => record.recordId,
    getRankingRecordUserKey: record => record.memberUserId,
    getCurrentMemberUserId: () => 'u2',
    profileRankingContextLimit: 5
  });

  const rankContext = await repository.loadProfileRankingRankContext([{ categoryKey: 'math' }]);

  assert.deepEqual(rankContext.r1, { rank: 1, total: 2 });
  assert.deepEqual(rankContext.r2, { rank: 2, total: 2 });
  assert.deepEqual(rankContext.math, { rank: 2, total: 2 });
  assert.ok(db.calls.some(call => call[0] === 'orderBy' && call[1] === 'score'));
}

async function run() {
  await testRepositoryReadsRankingCollections();
  await testRepositoryBuildsProfileRankContext();
  console.log('Infrastructure tests passed: ranking-repository');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
