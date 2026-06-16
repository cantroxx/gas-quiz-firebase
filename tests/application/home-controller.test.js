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

testResetProfileImageEditor();
testUpdateProfileImageEditorPreview();
testUpdateProfileImageEditorPreviewSkipsWithoutState();
console.log('Application tests passed: home-controller');
