const assert = require('node:assert/strict');

const calls = [];
const functions = {
  httpsCallable: name => async payload => {
    calls.push([name, payload]);
    return { data: { name, payload } };
  }
};

const { createEventRepository } = require('../../public/js/infrastructure/event-repository.js');

async function testEventRepositoryCallsEventFunctions() {
  const repository = createEventRepository({
    getFirebaseFunctions: () => functions
  });

  assert.deepEqual(await repository.loadEventProgress({ memberUserId: 'member-1' }), {
    name: 'getEventProgress',
    payload: { memberUserId: 'member-1' }
  });
  assert.deepEqual(await repository.claimEventQuestReward({ memberUserId: 'member-1', questId: 'quest-1' }), {
    name: 'claimEventQuestReward',
    payload: { memberUserId: 'member-1', questId: 'quest-1' }
  });
  assert.equal(await repository.claimEventQuestReward({ memberUserId: 'member-1' }), null);
  assert.deepEqual(calls, [
    ['getEventProgress', { memberUserId: 'member-1' }],
    ['claimEventQuestReward', { memberUserId: 'member-1', questId: 'quest-1' }]
  ]);
}

testEventRepositoryCallsEventFunctions()
  .then(() => console.log('Infrastructure tests passed: event-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
