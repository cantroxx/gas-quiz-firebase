const assert = require('node:assert/strict');

const controller = require('../../public/js/features/home-controller.js');

function testResetProfileImageEditor() {
  const calls = [];
  const nextState = controller.resetProfileImageEditor({
    getProfileImageEditorState: () => ({
      source: 'candidate',
      profileImageScale: 1.4,
      profileImageOffsetX: 10,
      profileImageOffsetY: -5
    }),
    setProfileImageEditorState: state => {
      calls.push(['set', state]);
      return state;
    },
    setProfileImageEditorControls: state => calls.push(['controls', state.profileImageScale]),
    updateProfileImageEditorPreview: () => calls.push(['preview'])
  });

  assert.deepEqual(nextState, {
    source: 'candidate',
    profileImageScale: 1,
    profileImageOffsetX: 0,
    profileImageOffsetY: 0
  });
  assert.deepEqual(calls.map(call => call[0]), ['set', 'controls', 'preview']);
}

function testUpdateProfileImageEditorPreview() {
  const image = { style: {} };
  const calls = [];
  const nextState = controller.updateProfileImageEditorPreview({
    getProfileImageEditorState: () => ({ source: 'candidate', profileImageScale: 1 }),
    getProfileImageEditorControlValues: () => ({ profileImageScale: 1.2 }),
    applyProfileImageEditorControlValues: (state, values) => ({ ...state, ...values }),
    setProfileImageEditorState: state => {
      calls.push(['set', state.profileImageScale]);
      return state;
    },
    getProfileImageEditorPreviewImage: () => image,
    applyProfileImageTransform: (target, state) => calls.push(['transform', target === image, state.profileImageScale])
  });

  assert.deepEqual(nextState, { source: 'candidate', profileImageScale: 1.2 });
  assert.deepEqual(calls, [
    ['set', 1.2],
    ['transform', true, 1.2]
  ]);
}

function testUpdateProfileImageEditorPreviewSkipsWithoutState() {
  assert.equal(controller.updateProfileImageEditorPreview({
    getProfileImageEditorState: () => null
  }), null);
}

function testOpenProfileImageEditor() {
  const calls = [];
  const state = controller.openProfileImageEditor({ source: 'candidate' }, {
    getCurrentMemberProfile: () => ({ profileImageScale: 1.1 }),
    getProfileImageEditModel: profile => {
      calls.push(['edit', profile.profileImageScale]);
      return { profileImageScale: profile.profileImageScale };
    },
    buildProfileImageEditorState: (options, currentEdit, deps) => {
      calls.push(['build', options.source, currentEdit.profileImageScale, deps.normalizeDisplayImageUrl('x')]);
      return { source: options.source, profileImageScale: currentEdit.profileImageScale };
    },
    normalizeDisplayImageUrl: value => `display:${value}`,
    setProfileImageEditorState: nextState => {
      calls.push(['set', nextState.source]);
      return nextState;
    },
    renderProfileImageEditorModal: (nextState, deps) => {
      calls.push(['render', nextState.profileImageScale, typeof deps.updateProfileImageEditorPreview]);
    },
    updateProfileImageEditorPreview: () => {}
  });

  assert.deepEqual(state, { source: 'candidate', profileImageScale: 1.1 });
  assert.deepEqual(calls, [
    ['edit', 1.1],
    ['build', 'candidate', 1.1, 'display:x'],
    ['set', 'candidate'],
    ['render', 1.1, 'function']
  ]);
}

function testCloseProfileImageEditor() {
  const calls = [];
  assert.equal(controller.closeProfileImageEditor({
    closeProfileImageEditorModal: () => calls.push('close'),
    clearProfileImageEditorState: () => calls.push('clear')
  }), undefined);
  assert.deepEqual(calls, ['close', 'clear']);
}

testResetProfileImageEditor();
testUpdateProfileImageEditorPreview();
testUpdateProfileImageEditorPreviewSkipsWithoutState();
testOpenProfileImageEditor();
testCloseProfileImageEditor();
console.log('Application tests passed: home-controller');
