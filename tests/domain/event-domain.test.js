const assert = require('node:assert/strict');
const domain = require('../../public/js/domain/event-domain.js');

assert.deepEqual(
  domain.buildEventLoadingQuests([{ questId: 'q1', title: '퀘스트' }]),
  [{ questId: 'q1', title: '퀘스트', status: '불러오는 중', claimable: false }]
);

assert.deepEqual(
  domain.getEventProgressRenderData(null, {
    quests: [{ questId: 'fallback' }],
    classMissions: [{ id: 'class' }],
    seasonEvents: [{ id: 'season' }]
  }),
  {
    quests: [{ questId: 'fallback' }],
    classMissions: [{ id: 'class' }],
    seasonEvents: [{ id: 'season' }]
  }
);

assert.equal(domain.getQuestStatusClass('완료 가능'), 'quest-status-ready');
assert.equal(domain.getQuestStatusClass('수령 완료'), 'quest-status-claimed');
assert.equal(domain.getQuestStatusClass('준비 중'), 'quest-status-waiting');
assert.equal(domain.getQuestStatusClass('진행 중'), 'quest-status-active');

assert.equal(
  domain.getEventRewardClaimErrorMessage(new Error('member-required')),
  '로그인 후 이벤트 보상을 받을 수 있어요.'
);

assert.equal(
  domain.getEventRewardClaimErrorMessage(new Error('unknown')),
  '이벤트 보상 수령 중 문제가 생겼어요. 퀘스트 완료 상태를 다시 확인해 주세요.'
);
