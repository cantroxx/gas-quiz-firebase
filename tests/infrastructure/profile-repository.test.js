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

const { createProfileRepository } = require('../../public/js/infrastructure/profile-repository.js');

async function testProfileRepositoryWritesProfileData() {
  const repository = createProfileRepository({
    getFirestoreFieldValue: () => ({ serverTimestamp: () => serverTimestamp })
  });
  const storage = {
    ref: path => {
      calls.push(['storage-ref', path]);
      return {
        put: (file, metadata) => {
          calls.push(['storage-put', file.name, metadata]);
          return Promise.resolve();
        },
        getDownloadURL: () => Promise.resolve('https://cdn.example/profile.png')
      };
    }
  };

  assert.deepEqual(await repository.searchProfileImageCandidates({ db, query: 'pika', limit: 12 }), [
    { candidateId: 'candidate-1', imageUrl: 'url-1' }
  ]);
  assert.deepEqual(await repository.saveProfileImageEditorSelection({
    db,
    memberUserId: 'member-1',
    editorState: {
      source: 'candidate',
      imageUrl: 'https://cdn.example/candidate.png'
    },
    edit: {
      profileImageScale: 1.2,
      profileImageOffsetX: 3,
      profileImageOffsetY: -1
    },
    currentProfile: { nickname: '학생' }
  }), {
    updateData: {
      profileImageUrl: 'https://cdn.example/candidate.png',
      profileImageSource: 'candidate',
      profileImageStoragePath: '',
      profileImageScale: 1.2,
      profileImageOffsetX: 3,
      profileImageOffsetY: -1,
      updatedAt: serverTimestamp
    },
    nextProfile: {
      nickname: '학생',
      profileImageUrl: 'https://cdn.example/candidate.png',
      profileImageSource: 'candidate',
      profileImageStoragePath: '',
      profileImageScale: 1.2,
      profileImageOffsetX: 3,
      profileImageOffsetY: -1,
      updatedAt: serverTimestamp
    }
  });
  assert.deepEqual(await repository.saveProfileImageEditorSelection({
    db,
    memberUserId: 'member-1',
    editorState: {
      source: 'upload',
      file: { name: 'profile.png', type: 'image/png' }
    },
    edit: {
      profileImageScale: 1,
      profileImageOffsetX: 0,
      profileImageOffsetY: 0
    },
    storage,
    authUid: 'auth-1',
    currentProfile: {}
  }).then(result => result.updateData.profileImageUrl), 'https://cdn.example/profile.png');
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
  const uploadPath = calls.find(call => call[0] === 'storage-ref')?.[1] || '';
  assert.match(uploadPath, /^profileImages\/auth-1\/member-1_\d+\.png$/);
  assert.deepEqual(calls, [
    ['query', 'profileImageCandidates', 'keywords', 'array-contains', 'pika', 12],
    ['set', 'users', 'member-1', {
      profileImageUrl: 'https://cdn.example/candidate.png',
      profileImageSource: 'candidate',
      profileImageStoragePath: '',
      profileImageScale: 1.2,
      profileImageOffsetX: 3,
      profileImageOffsetY: -1,
      updatedAt: serverTimestamp
    }, { merge: true }],
    ['storage-ref', uploadPath],
    ['storage-put', 'profile.png', {
      contentType: 'image/png',
      customMetadata: {
        memberUserId: 'member-1',
        source: 'profile-upload'
      }
    }],
    ['set', 'users', 'member-1', {
      profileImageUrl: 'https://cdn.example/profile.png',
      profileImageSource: 'upload',
      profileImageStoragePath: uploadPath,
      profileImageScale: 1,
      profileImageOffsetX: 0,
      profileImageOffsetY: 0,
      updatedAt: serverTimestamp
    }, { merge: true }],
    ['set', 'users', 'member-1', { rankingMessage: 'hi there', updatedAt: serverTimestamp }, { merge: true }],
    ['get', 'userTitles', 'member-1', 'titles', 'title-1'],
    ['set', 'users', 'member-1', { selectedTitleId: 'title-1', updatedAt: serverTimestamp }, { merge: true }],
    ['get', 'userTitles', 'member-1', 'titles', 'missing-title']
  ]);
}

testProfileRepositoryWritesProfileData()
  .then(() => console.log('Infrastructure tests passed: profile-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
