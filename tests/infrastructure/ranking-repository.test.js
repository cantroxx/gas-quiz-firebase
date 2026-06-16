const assert = require('assert');
const { createRankingRepository } = require('../../public/js/infrastructure/ranking-repository.js');

function makeDoc(id, data) {
  return { id, data: () => data };
}

function makeDb(collections, documents = {}) {
  const calls = [];
  const getDocumentSnapshot = path => {
    const data = documents[path];
    return data
      ? { id: path.split('/').pop(), exists: true, data: () => data }
      : { id: path.split('/').pop(), exists: false, data: () => ({}) };
  };
  const makeDocumentReference = path => ({
    collection(childName) {
      calls.push(['collection', `${path}/${childName}`]);
      return {
        doc(childId) {
          calls.push(['doc', `${path}/${childName}/${childId}`]);
          return makeDocumentReference(`${path}/${childName}/${childId}`);
        }
      };
    },
    async get() {
      calls.push(['docGet', path]);
      return getDocumentSnapshot(path);
    }
  });
  return {
    calls,
    collection(name) {
      calls.push(['collection', name]);
      const docs = collections[name] || [];
      const query = {
        doc(id) {
          calls.push(['doc', `${name}/${id}`]);
          return makeDocumentReference(`${name}/${id}`);
        },
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
  }, {
    'users/u1': {
      nickname: 'Student',
      selectedTitleId: 'title-1',
      profileImageStoragePath: 'profiles/u1.png'
    },
    'userTitleSummary/u1': {},
    'userTitles/u1/titles/title-1': {
      titleName: 'Quiz Master'
    }
  });
  let rankContextDb = null;
  const storageCalls = [];
  const storage = {
    ref(path) {
      storageCalls.push(path);
      return {
        getDownloadURL: async () => `https://cdn.test/${path}`
      };
    }
  };
  const repository = createRankingRepository({ db }, {
    rankingPlazaCategoryKeys: ['math'],
    getEnabledRankingCategoryKeys: keys => keys,
    getRankingPlazaCategoryRecordLimit: () => 3,
    getRankingMemberUserId: row => row.memberUserId,
    getFirebaseStorage: () => storage,
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
  assert.deepEqual(plazaRecords, [{ recordId: 'r1', memberUserId: 'u1', score: 90 }]);
  assert.deepEqual(profileMap.u1.nickname, 'Student');
  assert.deepEqual(profileMap.u1.selectedTitleName, 'Quiz Master');
  assert.deepEqual(profileMap.u1.profileImageUrl, 'https://cdn.test/profiles/u1.png');
  assert.deepEqual(storageCalls, ['profiles/u1.png']);
  assert.equal(rankContextDb, db);
  assert.deepEqual(rankContext, { count: 1 });
  assert.ok(db.calls.some(call => call[0] === 'collection' && call[1] === 'quizKingSummary'));
  assert.ok(db.calls.some(call => call[0] === 'where' && call[1] === 'memberUserId'));
  assert.ok(db.calls.some(call => call[0] === 'docGet' && call[1] === 'users/u1'));
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
