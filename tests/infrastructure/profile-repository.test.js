const assert = require('node:assert/strict');

const calls = [];
const serverTimestamp = { type: 'timestamp' };
const db = {
  collection: name => ({
    where: (field, operator, value) => ({
      limit: count => ({
        get: () => {
          calls.push(['query', name, field, operator, value, count]);
          return Promise.resolve({
            docs: [
              { id: 'candidate-1', data: () => ({ imageUrl: 'url-1' }) }
            ]
          });
        }
      })
    }),
    doc: id => ({
      collection: subName => ({
        doc: subId => ({
          get: () => {
            calls.push(['get', name, id, subName, subId]);
            return Promise.resolve({ exists: subId === 'title-1' });
          }
        })
      }),
      set: (data, options) => {
        calls.push(['set', name, id, data, options]);
        return Promise.resolve();
      }
    })
  })
};
globalThis.DJ48AccountDomain = {
  normalizeRankingMessageInput: value => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 24)
};
globalThis.DJ48AccountData = {
  saveProfileImageEditorSelection: (options, deps) => {
    calls.push(['image', options.memberUserId, !!deps.getFirestoreFieldValue]);
    return { nextProfile: { profileImageUrl: 'url' } };
  }
};

const { createProfileRepository } = require('../../public/js/infrastructure/profile-repository.js');

async function testProfileRepositoryDelegatesToAccountData() {
  const repository = createProfileRepository({
    getFirestoreFieldValue: () => ({ serverTimestamp: () => serverTimestamp })
  });

  assert.deepEqual(await repository.searchProfileImageCandidates({ db, query: 'pika', limit: 12 }), [
    { candidateId: 'candidate-1', imageUrl: 'url-1' }
  ]);
  assert.deepEqual(await repository.saveProfileImageEditorSelection({ memberUserId: 'member-1' }), { nextProfile: { profileImageUrl: 'url' } });
  assert.deepEqual(await repository.saveRankingMessageForMember({ db, memberUserId: 'member-1', message: ' hi   there ' }), {
    rankingMessage: 'hi there',
    updatedAt: serverTimestamp
  });
  assert.deepEqual(await repository.saveSelectedTitleForMember({ db, memberUserId: 'member-1', titleId: 'title-1' }), {
    selectedTitleId: 'title-1',
    updatedAt: serverTimestamp
  });
  await assert.rejects(
    () => repository.saveSelectedTitleForMember({ db, memberUserId: 'member-1', titleId: 'missing-title' }),
    /title-not-owned/
  );
  assert.deepEqual(calls, [
    ['query', 'profileImageCandidates', 'keywords', 'array-contains', 'pika', 12],
    ['image', 'member-1', true],
    ['set', 'users', 'member-1', { rankingMessage: 'hi there', updatedAt: serverTimestamp }, { merge: true }],
    ['get', 'userTitles', 'member-1', 'titles', 'title-1'],
    ['set', 'users', 'member-1', { selectedTitleId: 'title-1', updatedAt: serverTimestamp }, { merge: true }],
    ['get', 'userTitles', 'member-1', 'titles', 'missing-title']
  ]);
}

testProfileRepositoryDelegatesToAccountData()
  .then(() => console.log('Infrastructure tests passed: profile-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
