const assert = require('node:assert/strict');

const calls = [];
const dataCalls = [];
const fieldValue = { serverTimestamp: () => ({ type: 'timestamp' }) };

globalThis.DJ48ClassroomDomain = {
  buildClassroomQuestProgressId: (memberUserId, questId, dateKey = '') => [memberUserId, questId, dateKey].filter(Boolean).join('__')
};

function makeDocSnapshot(exists, data) {
  return {
    exists,
    data: () => data
  };
}

function makeQuerySnapshot(rows) {
  return {
    docs: rows.map(row => ({
      id: row.id,
      data: () => row.data
    }))
  };
}

function makeDb() {
  return {
    collection(name) {
      calls.push(['collection', name]);
      return makeCollection([name]);
    }
  };
}

function makeCollection(path) {
  return {
    doc(id) {
      calls.push(['doc', path.join('/'), id]);
      return makeDocument(path.concat(id));
    },
    where(field, operator, value) {
      calls.push(['where', path.join('/'), field, operator, value]);
      return {
        async get() {
          calls.push(['query-get', path.join('/')]);
          if(path.at(-1) === 'studentGemProgress') {
            return makeQuerySnapshot([{ id: 'gem-1', data: { memberUserId: value, xp: 12 } }]);
          }
          if(path.at(-1) === 'questProgress') {
            return makeQuerySnapshot([{ id: 'review-1', data: { rewardStatus: value } }]);
          }
          return makeQuerySnapshot([]);
        }
      };
    }
  };
}

function makeDocument(path) {
  return {
    collection(name) {
      calls.push(['subcollection', path.join('/'), name]);
      return makeCollection(path.concat(name));
    },
    async get() {
      calls.push(['doc-get', path.join('/')]);
      if(path.includes('studentWallets')) return makeDocSnapshot(true, { berry: 10 });
      if(path.includes('questProgress') && path.at(-1) === 'member-1__quest-1') return makeDocSnapshot(true, { checked: true });
      return makeDocSnapshot(false, {});
    },
    async set(data, options) {
      calls.push(['set', path.join('/'), data, options]);
    }
  };
}

const functions = {
  httpsCallable: name => async payload => {
    calls.push([name, payload]);
    if(name === 'getClassroomStudentCards') {
      return { data: { students: [{ memberUserId: payload.memberUserId, classId: payload.classId }] } };
    }
    if(name === 'getClassroomEconomyBoard') {
      return {
        data: {
          jobs: [{ id: 'job-1' }],
          shopItems: [{ id: 'shop-1' }],
          applications: [{ id: 'app-1' }],
          assignments: [{ id: 'assign-1' }],
          routines: [{ id: 'routine-1' }],
          myAssignment: { id: 'mine' }
        }
      };
    }
    return { data: { success: true } };
  }
};

globalThis.DJ48ClassroomData = {
  loadClassroomSettings: (options, deps) => {
    dataCalls.push(['settings', options.prototype.classId, !!deps.getFirestoreDb, !!deps.warn]);
    return { classId: options.prototype.classId };
  },
  setClassroomSelectedBadge: (options, deps) => {
    dataCalls.push(['badge', options.badgeId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  saveClassroomQuest: (options, deps) => {
    dataCalls.push(['quest-save', options.classId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  awardClassroomBadgeCampaign: (options, deps) => {
    dataCalls.push(['campaign', options.classId, !!deps.getFirebaseFunctions]);
    return { winners: [] };
  },
  saveClassroomJob: (options, deps) => {
    dataCalls.push(['job-save', options.classId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  saveClassroomShopItem: (options, deps) => {
    dataCalls.push(['shop-save', options.classId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  callClassroomEconomyAction: (name, payload, options, deps) => {
    dataCalls.push(['action', name, payload.itemId, options.memberUserId, !!deps.getFirebaseFunctions]);
    return { success: true };
  },
  saveClassroomRoutine: (options, deps) => {
    dataCalls.push(['routine-save', options.memberUserId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  completeClassroomAutoQuest: (options, deps) => {
    dataCalls.push(['auto-quest', options.questId, !!deps.getFirebaseFunctions]);
    return { success: true };
  },
  saveClassroomManualQuestProgress: (options, deps) => {
    dataCalls.push(['manual-quest', options.db.id, options.questId, !!deps.getFirestoreFieldValue]);
    return { recordId: 'record-1' };
  },
  reviewClassroomQuestProgress: (options, deps) => {
    dataCalls.push(['review-progress', options.recordId, options.nextStatus, !!deps.getFirebaseFunctions]);
    return { success: true };
  }
};

const { createClassroomRepository } = require('../../public/js/infrastructure/classroom-repository.js');

async function testClassroomRepositoryReadPaths() {
  const db = makeDb();
  const repository = createClassroomRepository({
    getFirestoreDb: () => db,
    getFirestoreFieldValue: () => fieldValue,
    getFirebaseFunctions: () => functions,
    warn: () => {}
  });
  const settings = {
    classId: 'c1',
    quests: [
      { id: 'quest-1', saveEnabled: true, rewardMode: 'manual' },
      { id: 'quest-auto', saveEnabled: true, rewardMode: 'auto' },
      { id: 'quest-off', saveEnabled: false, rewardMode: 'manual' }
    ]
  };

  assert.deepEqual(await repository.loadClassroomQuestProgress({ settings, memberUserId: 'member-1' }), {
    'quest-1': { checked: true }
  });
  assert.deepEqual(await repository.loadClassroomWallet({ settings, memberUserId: 'member-1' }), { berry: 10 });
  assert.deepEqual(await repository.loadClassroomGemProgress({ settings, memberUserId: 'member-1' }), [
    { id: 'gem-1', memberUserId: 'member-1', xp: 12 }
  ]);
  assert.deepEqual(await repository.loadClassroomStudentCards({ settings, memberUserId: 'member-1' }), [
    { memberUserId: 'member-1', classId: 'c1' }
  ]);
  assert.deepEqual(await repository.loadClassroomEconomyBoard({ settings, memberUserId: 'member-1' }), {
    jobs: [{ id: 'job-1' }],
    shopItems: [{ id: 'shop-1' }],
    applications: [{ id: 'app-1' }],
    assignments: [{ id: 'assign-1' }],
    routines: [{ id: 'routine-1' }],
    myAssignment: { id: 'mine' }
  });
  assert.deepEqual(await repository.loadClassroomReviewItems({ settings, canReview: true }), [
    { id: 'review-1', rewardStatus: 'pending_teacher_review' }
  ]);

  assert(calls.some(call => call[0] === 'getClassroomStudentCards' && call[1].classId === 'c1'));
  assert(calls.some(call => call[0] === 'getClassroomEconomyBoard' && call[1].memberUserId === 'member-1'));
  assert(calls.some(call => call[0] === 'where' && call[2] === 'rewardStatus' && call[4] === 'pending_teacher_review'));
}

async function testClassroomRepositoryFallbacksAndDelegates() {
  const repository = createClassroomRepository({
    getFirestoreDb: () => ({ id: 'db' }),
    getFirestoreFieldValue: () => fieldValue,
    getFirebaseFunctions: () => null,
    warn: () => {}
  });

  assert.deepEqual(await repository.loadClassroomStudentCards({ memberUserId: 'member-1' }), []);
  assert.deepEqual(await repository.loadClassroomEconomyBoard({ memberUserId: 'member-1' }), {
    jobs: [],
    shopItems: [],
    applications: [],
    assignments: [],
    routines: []
  });
  assert.deepEqual(await repository.loadClassroomSettings({ prototype: { classId: 'c1' } }), { classId: 'c1' });
  assert.deepEqual(await repository.setClassroomSelectedBadge({ badgeId: 'gem-1' }), { ok: true });
  assert.deepEqual(await repository.saveClassroomQuest({ classId: 'c1' }), { ok: true });
  assert.deepEqual(await repository.awardClassroomBadgeCampaign({ classId: 'c1' }), { winners: [] });
  assert.deepEqual(await repository.saveClassroomJob({ classId: 'c1' }), { ok: true });
  assert.deepEqual(await repository.saveClassroomShopItem({ classId: 'c1' }), { ok: true });
  assert.deepEqual(await repository.callClassroomEconomyAction('purchaseClassroomShopItem', { itemId: 'item-1' }, { memberUserId: 'member-1' }), { success: true });
  assert.deepEqual(await repository.saveClassroomRoutine({ memberUserId: 'member-1' }), { ok: true });
  assert.deepEqual(await repository.completeClassroomAutoQuest({ questId: 'quest-1' }), { success: true });
  assert.deepEqual(await repository.saveClassroomManualQuestProgress({ questId: 'quest-1' }), { recordId: 'record-1' });
  assert.deepEqual(await repository.reviewClassroomQuestProgress({ recordId: 'record-1', nextStatus: 'approved' }), { success: true });

  assert.deepEqual(dataCalls.map(call => call[0]), [
    'settings',
    'badge',
    'quest-save',
    'campaign',
    'job-save',
    'shop-save',
    'action',
    'routine-save',
    'auto-quest',
    'manual-quest',
    'review-progress'
  ]);
}

testClassroomRepositoryReadPaths()
  .then(testClassroomRepositoryFallbacksAndDelegates)
  .then(() => console.log('Infrastructure tests passed: classroom-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
