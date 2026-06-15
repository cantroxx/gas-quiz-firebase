const assert = require('node:assert/strict');
const domain = require('../../public/js/domain/account-domain.js');

assert.equal(
  domain.buildLegacyMemberUserId('서울동자초등학교', 4, 8, 23, { defaultMemberSchool: '동자' }),
  'G4-C8-N23'
);

assert.equal(
  domain.buildLegacyMemberUserId('다른초', 4, 8, 3, { defaultMemberSchool: '동자' }),
  'S다른-G4-C8-N03'
);

assert.equal(
  domain.getTemporaryPasswordText({ grade: 4, classNumber: 8, studentNumber: 3 }),
  '4803'
);

assert.equal(
  domain.shouldWaitForRequiredPasswordChange({
    pendingPasswordChange: { memberUserId: 'member-a' },
    currentMemberUserId: 'member-a'
  }),
  true
);

assert.deepEqual(
  domain.getResolvedUserChangeState({
    lastResolvedUserId: 'u1',
    nextUserId: 'u2',
    testShopUserId: 'test'
  }),
  {
    nextLastResolvedUserId: 'u2',
    shouldClearMemberProfile: true,
    shouldClearLinkedMemberHint: true,
    shouldResetUserScopedRuntimeData: true
  }
);

assert.equal(domain.normalizeRankingMessageInput(' hi   there  '), 'hi there');

