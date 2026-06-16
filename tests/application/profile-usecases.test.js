const assert = require('node:assert/strict');
const usecases = require('../../public/js/application/profile-usecases.js');

function createInput(value = '') {
  return { value };
}

function createStatus() {
  return { textContent: '' };
}

function createButton() {
  return { disabled: false };
}

async function testSaveProfileRankingMessageFlow() {
  const input = createInput('  hello  ');
  const status = createStatus();
  const button = createButton();
  let profile = { nickname: '학생' };
  const calls = [];

  const updateData = await usecases.saveProfileRankingMessageFlow({}, {
    getCurrentMemberUserId: () => 'member-a',
    getFirestoreDb: () => ({ db: true }),
    initializeAuthUser: async () => calls.push('auth'),
    getInput: () => input,
    getStatus: () => status,
    getButton: () => button,
    normalizeRankingMessageInput: value => value.trim(),
    saveRankingMessageForMember: async options => {
      calls.push(['save', options.memberUserId, options.message]);
      return { rankingMessage: options.message };
    },
    getCurrentMemberProfile: () => profile,
    setCurrentMemberProfile: next => { profile = next; }
  });

  assert.deepEqual(updateData, { rankingMessage: 'hello' });
  assert.equal(input.value, 'hello');
  assert.equal(status.textContent, '한마디를 저장했습니다.');
  assert.equal(button.disabled, false);
  assert.equal(profile.rankingMessage, 'hello');
  assert.deepEqual(calls, ['auth', ['save', 'member-a', 'hello']]);
}

async function testSearchProfileImageCandidatesFlow() {
  const input = createInput('  Pi Ka ');
  const status = createStatus();
  const calls = [];
  const result = await usecases.searchProfileImageCandidatesFlow({}, {
    getFirestoreDb: () => ({ db: true }),
    initializeAuthUser: async () => calls.push('auth'),
    getInput: () => input,
    getStatus: () => status,
    normalizeProfileImageInput: value => String(value || '').trim(),
    searchProfileImageCandidates: async options => {
      calls.push(['search', options.query, options.limit]);
      return [{ candidateId: 'candidate-1' }];
    },
    setProfileImageOptions: candidates => {
      calls.push(['set', candidates.length]);
      return candidates.map(candidate => ({ ...candidate, selected: false }));
    },
    renderProfileImageSearchResults: options => calls.push(['render', options.length])
  });

  assert.deepEqual(result, [{ candidateId: 'candidate-1', selected: false }]);
  assert.equal(status.textContent, '이미지를 검색하는 중...');
  assert.deepEqual(calls, ['auth', ['search', 'pika', 24], ['set', 1], ['render', 1]]);
}

async function testSearchProfileImageCandidatesFlowShortQuery() {
  const status = createStatus();
  const result = await usecases.searchProfileImageCandidatesFlow({}, {
    getFirestoreDb: () => ({ db: true }),
    initializeAuthUser: async () => {},
    getInput: () => createInput('a'),
    getStatus: () => status,
    normalizeProfileImageInput: value => value
  });

  assert.deepEqual(result, []);
  assert.equal(status.textContent, '검색어를 2글자 이상 입력해 주세요.');
}

async function testSelectProfileImageCandidateFlow() {
  const status = createStatus();
  const calls = [];
  const result = await usecases.selectProfileImageCandidateFlow({ index: 2 }, {
    getCurrentMemberUserId: () => 'member-a',
    getStatus: () => status,
    getProfileImageOption: index => ({ index, imageUrl: 'url' }),
    buildCandidateProfileImageEditorOptions: option => ({ source: 'candidate', imageUrl: option.imageUrl }),
    openProfileImageEditor: options => calls.push(['open', options])
  });

  assert.deepEqual(result, { source: 'candidate', imageUrl: 'url' });
  assert.deepEqual(calls, [['open', { source: 'candidate', imageUrl: 'url' }]]);
}

async function testSelectProfileImageCandidateFlowMissingOption() {
  const status = createStatus();
  const result = await usecases.selectProfileImageCandidateFlow({ index: 2 }, {
    getCurrentMemberUserId: () => 'member-a',
    getStatus: () => status,
    getProfileImageOption: () => null
  });

  assert.equal(result, null);
  assert.equal(status.textContent, '저장할 이미지를 다시 선택해 주세요.');
}

async function testPreviewProfileImageUploadFlow() {
  const status = createStatus();
  const file = { name: 'avatar.png' };
  const calls = [];
  const result = await usecases.previewProfileImageUploadFlow({ file }, {
    getCurrentMemberUserId: () => 'member-a',
    getStatus: () => status,
    validateProfileImageUploadFile: nextFile => ({ ok: nextFile === file }),
    readProfileImageFilePreview: async nextFile => {
      calls.push(['read', nextFile.name]);
      return 'data-url';
    },
    buildUploadProfileImageEditorOptions: (nextFile, previewUrl) => ({ source: 'upload', fileName: nextFile.name, previewUrl }),
    openProfileImageEditor: options => calls.push(['open', options])
  });

  assert.deepEqual(result, { source: 'upload', fileName: 'avatar.png', previewUrl: 'data-url' });
  assert.equal(status.textContent, '이미지 미리보기를 준비하고 있습니다...');
  assert.deepEqual(calls, [
    ['read', 'avatar.png'],
    ['open', { source: 'upload', fileName: 'avatar.png', previewUrl: 'data-url' }]
  ]);
}

async function testPreviewProfileImageUploadFlowInvalidFile() {
  const status = createStatus();
  const result = await usecases.previewProfileImageUploadFlow({ file: null }, {
    getCurrentMemberUserId: () => 'member-a',
    getStatus: () => status,
    validateProfileImageUploadFile: () => ({ ok: false, message: '이미지 파일을 선택해 주세요.' })
  });

  assert.equal(result, null);
  assert.equal(status.textContent, '이미지 파일을 선택해 주세요.');
}

async function testSaveProfileNicknameFlowError() {
  const status = createStatus();
  const button = createButton();
  const result = await usecases.saveProfileNicknameFlow({}, {
    getInput: () => createInput(''),
    getStatus: () => status,
    getButton: () => button,
    updateCurrentMemberNickname: async () => {
      throw new Error('nickname-required');
    },
    getProfileNicknameErrorMessage: error => `error:${error.message}`,
    warn: () => {}
  });

  assert.equal(result, null);
  assert.equal(status.textContent, 'error:nickname-required');
  assert.equal(button.disabled, false);
}

async function testSaveProfilePasswordFlowClearsInputs() {
  const currentInput = createInput('1111');
  const newInput = createInput('2222');
  const confirmInput = createInput('2222');
  const status = createStatus();
  const button = createButton();
  const calls = [];

  await usecases.saveProfilePasswordFlow({}, {
    getCurrentInput: () => currentInput,
    getNewInput: () => newInput,
    getConfirmInput: () => confirmInput,
    getStatus: () => status,
    getButton: () => button,
    changeCurrentMemberPasswordWithCurrentPassword: async (...values) => calls.push(values)
  });

  assert.deepEqual(calls, [['1111', '2222', '2222']]);
  assert.equal(currentInput.value, '');
  assert.equal(newInput.value, '');
  assert.equal(confirmInput.value, '');
  assert.match(status.textContent, /비밀번호를 변경했습니다/);
  assert.equal(button.disabled, false);
}

async function testSaveProfileSelectedTitleFlow() {
  let profile = { selectedTitleId: '' };
  const calls = [];
  const updateData = await usecases.saveProfileSelectedTitleFlow({ titleId: 'title-1' }, {
    getCurrentMemberUserId: () => 'member-a',
    getFirestoreDb: () => ({ db: true }),
    initializeAuthUser: async () => calls.push('auth'),
    saveSelectedTitleForMember: async options => {
      calls.push(['save', options.memberUserId, options.titleId]);
      return { selectedTitleId: options.titleId };
    },
    getCurrentMemberProfile: () => profile,
    setCurrentMemberProfile: next => { profile = next; },
    renderHomeMemberDataFromFirestore: () => calls.push('render')
  });

  assert.deepEqual(updateData, { selectedTitleId: 'title-1' });
  assert.equal(profile.selectedTitleId, 'title-1');
  assert.deepEqual(calls, ['auth', ['save', 'member-a', 'title-1'], 'render']);
}

async function testSaveProfileImageEditorSelectionFlowUploadErrorMessage() {
  const button = createButton();
  const statusCalls = [];
  const result = await usecases.saveProfileImageEditorSelectionFlow({}, {
    getCurrentMemberUserId: () => 'member-a',
    getFirestoreDb: () => ({ db: true }),
    initializeAuthUser: async () => {},
    getProfileImageEditorState: () => ({ source: 'upload' }),
    getSaveButton: () => button,
    getProfileImageEditModel: () => ({ profileImageScale: 1 }),
    setProfileImageEditorStatus: (...args) => statusCalls.push(args),
    saveProfileImageEditorSelection: async () => {
      throw new Error('storage-unavailable');
    },
    warn: () => {}
  });

  assert.equal(result, null);
  assert.equal(button.disabled, false);
  assert.deepEqual(statusCalls[0], ['프로필 이미지를 저장하고 있습니다...']);
  assert.match(statusCalls[1][0], /Firebase Storage/);
  assert.equal(statusCalls[1][1], true);
}

async function run() {
  await testSearchProfileImageCandidatesFlow();
  await testSearchProfileImageCandidatesFlowShortQuery();
  await testSelectProfileImageCandidateFlow();
  await testSelectProfileImageCandidateFlowMissingOption();
  await testPreviewProfileImageUploadFlow();
  await testPreviewProfileImageUploadFlowInvalidFile();
  await testSaveProfileRankingMessageFlow();
  await testSaveProfileNicknameFlowError();
  await testSaveProfilePasswordFlowClearsInputs();
  await testSaveProfileSelectedTitleFlow();
  await testSaveProfileImageEditorSelectionFlowUploadErrorMessage();
}

run().then(() => {
  console.log('profile-usecases tests passed');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
