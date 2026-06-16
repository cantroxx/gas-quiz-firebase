const assert = require('node:assert/strict');

const calls = [];
globalThis.DJ48EventData = {
  loadEventProgress: (options, deps) => {
    calls.push(['load', options.memberUserId, !!deps.getFirebaseFunctions]);
    return { memberUserId: options.memberUserId };
  },
  claimEventQuestReward: (options, deps) => {
    calls.push(['claim', options.memberUserId, options.questId, !!deps.getFirebaseFunctions]);
    return { questId: options.questId };
  }
};

const { createEventRepository } = require('../../public/js/infrastructure/event-repository.js');

async function testEventRepositoryDelegatesToEventData() {
  const repository = createEventRepository({
    getFirebaseFunctions: () => ({})
  });

  assert.deepEqual(await repository.loadEventProgress({ memberUserId: 'member-1' }), { memberUserId: 'member-1' });
  assert.deepEqual(await repository.claimEventQuestReward({ memberUserId: 'member-1', questId: 'quest-1' }), { questId: 'quest-1' });
  assert.deepEqual(calls, [
    ['load', 'member-1', true],
    ['claim', 'member-1', 'quest-1', true]
  ]);
}

testEventRepositoryDelegatesToEventData()
  .then(() => console.log('Infrastructure tests passed: event-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
