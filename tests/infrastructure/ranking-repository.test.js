const assert = require('assert');
const { createRankingRepository, readRankingDocument, clearRankingReadCache } = require('../../public/js/infrastructure/ranking-repository.js');

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
    quizKingSummary: [
      makeDoc('u1', { totalScore: 120 }),
      makeDoc('G4-C8-N23', { totalScore: 999 })
    ],
    rankingRecords: [
      makeDoc('r1', { memberUserId: 'u1', score: 90 }),
      makeDoc('hidden-r1', { memberUserId: 'G4-C8-N23', score: 999 })
    ]
  }, {
    'users/u1': {
      nickname: 'Student',
      selectedTitleId: 'title-1',
      profileImageStoragePath: 'profiles/u1.png'
    },
    'userTitleSummary/u1': {},
    'userRoomSettings/u1': {
      selectedTitleFrameItemId: 'chalk_nameplate_frame'
    },
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
    getCurrentMemberUserId: () => 'u1',
    loadProfileRankingRankContext: async (nextDb, bestRows) => {
      rankContextDb = nextDb;
      return { count: bestRows.length };
    }
  });

  const previousFirebase=globalThis.firebase;
  globalThis.firebase={auth:()=>({currentUser:{uid:'auth'}}),app:()=>({functions:()=>({httpsCallable:name=>async()=>({data:{summaries:[{memberUserId:'u1',totalScore:120}],records:name==='popularQuizAction'?[{recordId:'r1',memberUserId:'u1',score:90}]:[]}})})})};
  const summaries = await repository.loadQuizKingSummaries(3);
  const records = await repository.loadMemberRankingRecords('u1', 5);
  globalThis.firebase=previousFirebase;
  const plazaRecords = await repository.loadLimitedRankingRecordsForPlaza();
  const profileMap = await repository.loadMemberProfilesForRankingRows(summaries);
  const rankContext = await repository.loadProfileRankingRankContext(records);

  assert.deepEqual(summaries, [{ memberUserId: 'u1', totalScore: 120 }]);
  assert.deepEqual(records, [
    { recordId: 'r1', memberUserId: 'u1', score: 90 }
  ]);
  assert.deepEqual(plazaRecords, [{ recordId: 'r1', memberUserId: 'u1', score: 90 }]);
  assert.deepEqual(profileMap.u1.nickname, 'Student');
  assert.deepEqual(profileMap.u1.selectedTitleName, 'Quiz Master');
  assert.deepEqual(profileMap.u1.selectedTitleFrameItemId, 'chalk_nameplate_frame');
  assert.deepEqual(profileMap.u1.profileImageUrl, 'https://cdn.test/profiles/u1.png');
  assert.deepEqual(storageCalls, ['profiles/u1.png']);
  assert.equal(rankContextDb, db);
  assert.deepEqual(rankContext, { count: 1 });
  assert.ok(!db.calls.some(call => call[0] === 'collection' && call[1] === 'quizKingSummary'));
  assert.ok(!db.calls.some(call => call[0] === 'where' && call[1] === 'memberUserId'));
  assert.ok(db.calls.some(call => call[0] === 'docGet' && call[1] === 'users/u1'));
}

async function testRepositoryBuildsProfileRankContext() {
  const db = makeDb({
    rankingRecords: [
      makeDoc('hidden-r0', { memberUserId: 'G4-C8-N23', categoryKey: 'math', score: 999, elapsedSeconds: 1 }),
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

async function testScopedProfileCache() {
  const db = makeDb({}, { 'users/friend': { nickname: 'Friend', selectedTitleId: 'shared' }, 'titleCatalog/shared': { titleName: 'Shared title' } });
  let member = 'me';
  const repository = createRankingRepository({ db }, { getCurrentMemberUserId: () => member });
  const rows = [{ memberUserId: 'friend' }];
  const [first, second] = await Promise.all([repository.loadMemberProfilesForRankingRows(rows), repository.loadMemberProfilesForRankingRows(rows)]);
  assert.equal(first.friend.selectedTitleName, 'Shared title');
  assert.deepEqual(first, second);
  const gets = () => db.calls.filter(call => call[0] === 'docGet');
  assert.equal(gets().length, 3, 'Concurrent lists share users, level and public title reads');
  assert(!gets().some(call => /userRoomSettings|userTitleSummary|userTitles/.test(call[1])));
  await repository.loadMemberProfilesForRankingRows(rows);
  assert.equal(gets().length, 3);
  member = 'another-account';
  await repository.loadMemberProfilesForRankingRows(rows);
  assert.equal(gets().length, 6, 'Member scope isolates profiles');
  clearRankingReadCache();
  await repository.loadMemberProfilesForRankingRows(rows);
  assert.equal(gets().length, 9, 'Explicit refresh invalidates reads');
  const now = Date.now;
  try {
    Date.now = () => now() + 60001;
    await repository.loadMemberProfilesForRankingRows(rows);
    assert.equal(gets().length, 12, 'Expired profiles are read again');
  } finally { Date.now = now; }
  let attempts = 0;
  const failingDb = { collection: () => ({ doc: () => ({ get: async () => { attempts++; throw Error('offline'); } }) }) };
  await assert.rejects(readRankingDocument(failingDb, 'users/friend'));
  await assert.rejects(readRankingDocument(failingDb, 'users/friend'));
  assert.equal(attempts, 2, 'Failures never remain cached');
}

async function run() {
  await testRepositoryReadsRankingCollections();
  await testRepositoryBuildsProfileRankContext();
  await testScopedProfileCache();
  await testPersonalSubjectReadIsScoped();
  console.log('Infrastructure tests passed: ranking-repository');
}

async function testPersonalSubjectReadIsScoped() {
  const previousFirebase=globalThis.firebase,previousSubject=globalThis.DJ48SubjectQuiz;
  const calls=[];
  try {
    globalThis.DJ48SubjectQuiz={isLegacyRecord:row=>row.quizId==='spelling'};
    globalThis.firebase={auth:()=>({currentUser:{uid:'test-uid'}}),app:()=>({functions:()=>({
      httpsCallable:name=>async payload=>{calls.push([name,payload]);return {data:{records:[{memberUserId:'u1',quizId:name==='popularQuizAction'?'idol':'subject-math',score:7}]}};}
    })})};
    const db=makeDb({rankingRecords:[makeDoc('old',{quizId:'spelling'}),makeDoc('popular',{quizId:'idol'})]});
    const repo=createRankingRepository({db});
    const rows=await repo.loadMemberRankingRecords('u1');
    assert.deepEqual(rows.map(r=>r.quizId),['idol','subject-math']);
    assert.deepEqual(calls,[['popularQuizAction',{action:'memberRankings',memberUserId:'u1'}],['subjectQuizAction',{action:'memberRankings',memberUserId:'u1'}]]);
    assert(!db.calls.some(c=>c[0]==='collection'&&c[1]==='rankingRecords'),'client must not read legacy records');
    await repo.loadSubjectRankingRecords('math',10);
    assert.deepEqual(calls[2],['subjectQuizAction',{action:'subjectRankings',subject:'math',limit:10}]);
  } finally {
    if(previousFirebase===undefined)delete globalThis.firebase;else globalThis.firebase=previousFirebase;
    if(previousSubject===undefined)delete globalThis.DJ48SubjectQuiz;else globalThis.DJ48SubjectQuiz=previousSubject;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
