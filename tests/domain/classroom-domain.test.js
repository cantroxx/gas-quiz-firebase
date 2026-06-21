const assert = require('node:assert/strict');
const domain = require('../../public/js/domain/classroom-domain.js');

assert.equal(domain.slugifyClassroomGemId('우리 보석!!'), '우리-보석');

const quest = domain.normalizeClassroomQuestConfig({
  id: 'q1',
  rewardMode: 'teacherReview',
  rewardCoin: '12.7',
  linkedGemName: '성실 보석',
  studentAction: '완료하고 13 코인 받기'
});

assert.equal(quest.rewardCoin, 13);
assert.equal(quest.rewardCurrency, 'berry');
assert.equal(quest.linkedGemId, '성실-보석');
assert.equal(quest.studentAction, '완료하고 13 포인트 받기');

assert.equal(
  domain.buildClassroomQuestProgressId('u', 'q', '2026-06-16'),
  'u__q__2026-06-16'
);

assert.equal(
  domain.isCurrentClassroomTeacher(
    {
      role: 'admin',
      adminLevel: 'classAdmin',
      adminScopeGrade: '4',
      adminScopeClassNumber: '8'
    },
    { grade: '4', classNumber: '8' }
  ),
  true
);

assert.equal(domain.getClassroomProgressStatusLabel({ rewardStatus: 'approved' }), '담임 승인됨');
assert.equal(domain.getClassroomProgressStatusClass({ rewardStatus: 'approved' }), 'quest-status-claimed');
