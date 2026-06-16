const assert = require('node:assert/strict');

const calls = [];
globalThis.DJ48AccountData = {
  saveProfileImageEditorSelection: (options, deps) => {
    calls.push(['image', options.memberUserId, !!deps.getFirestoreFieldValue]);
    return { nextProfile: { profileImageUrl: 'url' } };
  },
  saveRankingMessageForMember: (options, deps) => {
    calls.push(['message', options.memberUserId, options.message, !!deps.getFirestoreFieldValue]);
    return { rankingMessage: options.message };
  },
  saveSelectedTitleForMember: (options, deps) => {
    calls.push(['title', options.memberUserId, options.titleId, !!deps.getFirestoreFieldValue]);
    return { selectedTitleId: options.titleId };
  }
};

const { createProfileRepository } = require('../../public/js/infrastructure/profile-repository.js');

async function testProfileRepositoryDelegatesToAccountData() {
  const repository = createProfileRepository({
    getFirestoreFieldValue: () => ({})
  });

  assert.deepEqual(await repository.saveProfileImageEditorSelection({ memberUserId: 'member-1' }), { nextProfile: { profileImageUrl: 'url' } });
  assert.deepEqual(await repository.saveRankingMessageForMember({ memberUserId: 'member-1', message: 'hi' }), { rankingMessage: 'hi' });
  assert.deepEqual(await repository.saveSelectedTitleForMember({ memberUserId: 'member-1', titleId: 'title-1' }), { selectedTitleId: 'title-1' });
  assert.deepEqual(calls, [
    ['image', 'member-1', true],
    ['message', 'member-1', 'hi', true],
    ['title', 'member-1', 'title-1', true]
  ]);
}

testProfileRepositoryDelegatesToAccountData()
  .then(() => console.log('Infrastructure tests passed: profile-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
