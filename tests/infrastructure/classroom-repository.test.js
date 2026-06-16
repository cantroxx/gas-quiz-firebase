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
    dataCalls.push(['legacy-badge', options.badgeId, !!deps.getFirebaseFunctions]);
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
    dataCalls.push(['legacy-routine-save', options.memberUserId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  completeClassroomAutoQuest: (options, deps) => {
    dataCalls.push(['legacy-auto-quest', options.questId, !!deps.getFirebaseFunctions]);
    return { success: true };
  },
  saveClassroomManualQuestProgress: (options, deps) => {
    dataCalls.push(['manual-quest', options.db.id, options.questId, !!deps.getFirestoreFieldValue]);
    return { recordId: 'record-1' };
  },
  reviewClassroomQuestProgress: (options, deps) => {
    dataCalls.push(['legacy-review-progress', options.recordId, options.nextStatus, !!deps.getFirebaseFunctions]);
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
    getFirestoreDb: () => makeDb(),
    getFirestoreFieldValue: () => fieldValue,
    getFirebaseFunctions: () => functions,
    warn: () => {}
  });

  assert.deepEqual(await repository.loadClassroomSettings({ prototype: { classId: 'c1' } }), { classId: 'c1' });
  assert.equal(await repository.setClassroomSelectedBadge({ classId: 'c1', memberUserId: 'member-1', badgeId: 'gem-1' }), undefined);
  assert.equal(await repository.saveClassroomQuest({ classId: 'c1', values: { title: 'Quest', rewardMode: 'manual' } }), undefined);
  assert.deepEqual(await repository.awardClassroomBadgeCampaign({ classId: 'c1', values: { badgeId: 'badge-1' } }), { success: true });
  assert.equal(await repository.saveClassroomJob({ classId: 'c1', values: { title: 'Helper' } }), undefined);
  assert.equal(await repository.saveClassroomShopItem({ classId: 'c1', values: { title: 'Snack' } }), undefined);
  assert.deepEqual(await repository.callClassroomEconomyAction('purchaseClassroomShopItem', { itemId: 'item-1' }, { classId: 'c1', memberUserId: 'member-1' }), { success: true });
  assert.equal(await repository.saveClassroomRoutine({ classId: 'c1', memberUserId: 'member-1', values: { title: 'Read' } }), undefined);
  assert.deepEqual(await repository.completeClassroomAutoQuest({ classId: 'c1', memberUserId: 'member-1', questId: 'quest-1' }), { success: true });
  assert.deepEqual(await repository.saveClassroomManualQuestProgress({
    settings: { classId: 'c1' },
    quest: { type: 'manual', rewardCoin: 7 },
    questId: 'quest-1',
    memberUserId: 'member-1'
  }), { recordId: 'member-1__quest-1' });
  assert.deepEqual(await repository.reviewClassroomQuestProgress({ classId: 'c1', recordId: 'record-1', nextStatus: 'approved' }), { success: true });

  assert.deepEqual(dataCalls.map(call => call[0]), [
    'settings'
  ]);
  assert(calls.some(call => call[0] === 'setClassroomSelectedBadge' && call[1].badgeId === 'gem-1'));
  assert(calls.some(call => call[0] === 'saveClassroomQuest' && call[1].quest.title === 'Quest'));
  assert(calls.some(call => call[0] === 'awardClassroomBadgeCampaign' && call[1].campaign.badgeId === 'badge-1'));
  assert(calls.some(call => call[0] === 'saveClassroomJob' && call[1].job.title === 'Helper'));
  assert(calls.some(call => call[0] === 'saveClassroomShopItem' && call[1].item.title === 'Snack'));
  assert(calls.some(call => call[0] === 'purchaseClassroomShopItem' && call[1].itemId === 'item-1'));
  assert(calls.some(call => call[0] === 'saveClassroomRoutine' && call[1].routine.title === 'Read'));
  assert(calls.some(call => call[0] === 'completeClassroomAutoQuest' && call[1].questId === 'quest-1'));
  assert(calls.some(call => call[0] === 'set' && call[1] === 'classrooms/c1/questProgress/member-1__quest-1'));
  assert(calls.some(call => call[0] === 'reviewClassroomQuestProgress' && call[1].nextStatus === 'approved'));
}

async function testClassroomRepositoryCallableErrors() {
  const repository = createClassroomRepository({
    getFirestoreDb: () => ({ id: 'db' }),
    getFirestoreFieldValue: () => fieldValue,
    getFirebaseFunctions: () => null,
    warn: () => {}
  });

  await assert.rejects(
    () => repository.setClassroomSelectedBadge({ classId: 'c1', badgeId: 'gem-1' }),
    /classroom-member-unavailable/
  );
  await assert.rejects(
    () => repository.setClassroomSelectedBadge({ classId: 'c1', memberUserId: 'member-1', badgeId: 'gem-1' }),
    /classroom-badge-select-functions-unavailable/
  );
  await assert.rejects(
    () => repository.saveClassroomRoutine({ classId: 'c1', memberUserId: 'member-1' }),
    /classroom-routine-functions-unavailable/
  );
  await assert.rejects(
    () => repository.saveClassroomQuest({ classId: 'c1' }),
    /classroom-quest-functions-unavailable/
  );
  await assert.rejects(
    () => repository.awardClassroomBadgeCampaign({ classId: 'c1' }),
    /classroom-badge-functions-unavailable/
  );
  await assert.rejects(
    () => repository.saveClassroomJob({ classId: 'c1' }),
    /classroom-job-functions-unavailable/
  );
  await assert.rejects(
    () => repository.saveClassroomShopItem({ classId: 'c1' }),
    /classroom-shop-functions-unavailable/
  );
  await assert.rejects(
    () => repository.callClassroomEconomyAction('purchaseClassroomShopItem', {}, { classId: 'c1' }),
    /classroom-member-unavailable/
  );
  await assert.rejects(
    () => repository.callClassroomEconomyAction('purchaseClassroomShopItem', {}, { classId: 'c1', memberUserId: 'member-1' }),
    /classroom-economy-functions-unavailable/
  );
  await assert.rejects(
    () => repository.completeClassroomAutoQuest({ classId: 'c1', memberUserId: 'member-1', questId: 'quest-1' }),
    /classroom-auto-quest-functions-unavailable/
  );
  await assert.rejects(
    () => repository.saveClassroomManualQuestProgress({ settings: { classId: 'c1' }, questId: 'quest-1' }),
    /classroom-member-unavailable/
  );
  await assert.rejects(
    () => repository.reviewClassroomQuestProgress({ classId: 'c1', recordId: 'record-1', nextStatus: 'approved' }),
    /classroom-review-functions-unavailable/
  );
}

testClassroomRepositoryReadPaths()
  .then(testClassroomRepositoryFallbacksAndDelegates)
  .then(testClassroomRepositoryCallableErrors)
  .then(() => console.log('Infrastructure tests passed: classroom-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
