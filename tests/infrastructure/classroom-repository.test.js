const assert = require('node:assert/strict');

const calls = [];
const functions = {
  httpsCallable: name => async payload => {
    calls.push([name, payload]);
    return { data: { students: [{ memberUserId: payload.memberUserId, classId: payload.classId }] } };
  }
};
globalThis.DJ48ClassroomData = {
  loadClassroomSettings: (options, deps) => {
    calls.push(['settings', options.prototype.classId, !!deps.getFirestoreDb, !!deps.warn]);
    return { classId: options.prototype.classId };
  },
  loadClassroomQuestProgress: options => {
    calls.push(['progress', options.db.id, options.memberUserId]);
    return { quest: true };
  },
  loadClassroomWallet: (options, deps) => {
    calls.push(['wallet', options.db.id, options.memberUserId, !!deps.warn]);
    return { berry: 10 };
  },
  loadClassroomGemProgress: options => {
    calls.push(['gems', options.db.id, options.memberUserId]);
    return [];
  },
  loadClassroomEconomyBoard: (options, deps) => {
    calls.push(['economy', options.memberUserId, !!deps.getFirebaseFunctions]);
    return { jobs: [] };
  },
  loadClassroomReviewItems: options => {
    calls.push(['review', options.db.id, options.canReview]);
    return [];
  },
  setClassroomSelectedBadge: (options, deps) => {
    calls.push(['badge', options.badgeId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  saveClassroomQuest: (options, deps) => {
    calls.push(['quest-save', options.classId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  awardClassroomBadgeCampaign: (options, deps) => {
    calls.push(['campaign', options.classId, !!deps.getFirebaseFunctions]);
    return { winners: [] };
  },
  saveClassroomJob: (options, deps) => {
    calls.push(['job-save', options.classId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  saveClassroomShopItem: (options, deps) => {
    calls.push(['shop-save', options.classId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  callClassroomEconomyAction: (name, payload, options, deps) => {
    calls.push(['action', name, payload.itemId, options.memberUserId, !!deps.getFirebaseFunctions]);
    return { success: true };
  },
  saveClassroomRoutine: (options, deps) => {
    calls.push(['routine-save', options.memberUserId, !!deps.getFirebaseFunctions]);
    return { ok: true };
  },
  completeClassroomAutoQuest: (options, deps) => {
    calls.push(['auto-quest', options.questId, !!deps.getFirebaseFunctions]);
    return { success: true };
  },
  saveClassroomManualQuestProgress: (options, deps) => {
    calls.push(['manual-quest', options.db.id, options.questId, !!deps.getFirestoreFieldValue]);
    return { recordId: 'record-1' };
  },
  reviewClassroomQuestProgress: (options, deps) => {
    calls.push(['review-progress', options.recordId, options.nextStatus, !!deps.getFirebaseFunctions]);
    return { success: true };
  }
};

const { createClassroomRepository } = require('../../public/js/infrastructure/classroom-repository.js');

async function testClassroomRepositoryDelegatesToClassroomData() {
  const repository = createClassroomRepository({
    getFirestoreDb: () => ({ id: 'db' }),
    getFirestoreFieldValue: () => ({}),
    getFirebaseFunctions: () => functions,
    warn: () => {}
  });

  const settings = { classId: 'c1' };
  assert.deepEqual(await repository.loadClassroomSettings({ prototype: { classId: 'c1' } }), { classId: 'c1' });
  assert.deepEqual(await repository.loadClassroomQuestProgress({ memberUserId: 'member-1' }), { quest: true });
  assert.deepEqual(await repository.loadClassroomWallet({ memberUserId: 'member-1' }), { berry: 10 });
  assert.deepEqual(await repository.loadClassroomGemProgress({ memberUserId: 'member-1' }), []);
  assert.deepEqual(await repository.loadClassroomStudentCards({ settings, memberUserId: 'member-1' }), [{ memberUserId: 'member-1', classId: 'c1' }]);
  assert.deepEqual(await repository.loadClassroomStudentCards({ settings }), []);
  assert.deepEqual(await repository.loadClassroomEconomyBoard({ memberUserId: 'member-1' }), { jobs: [] });
  assert.deepEqual(await repository.loadClassroomReviewItems({ canReview: true }), []);
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

  assert.deepEqual(calls.map(call => call[0]), [
    'settings',
    'progress',
    'wallet',
    'gems',
    'getClassroomStudentCards',
    'economy',
    'review',
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

testClassroomRepositoryDelegatesToClassroomData()
  .then(() => console.log('Infrastructure tests passed: classroom-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
