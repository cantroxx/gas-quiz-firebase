const assert = require('node:assert/strict');

const elements = new Map();
function getElement(id) {
  if(!elements.has(id)) {
    elements.set(id, {
      id,
      hidden: false,
      textContent: '',
      scrollCount: 0,
      scrollIntoView() {
        this.scrollCount += 1;
      }
    });
  }
  return elements.get(id);
}

globalThis.document = {
  getElementById: getElement
};

const appView = require('../../public/js/features/app-view.js');

function testEnterKnownPlaceView() {
  const calls = [];
  appView.enterKnownPlaceView({
    viewId: 'ranking-view',
    placeKey: 'ranking'
  }, {
    appViewIds: ['home-view', 'ranking-view'],
    placeDetails: {
      ranking: { icon: 'R', title: '랭킹', desc: '기록 보기' }
    },
    leaveQuizPlaySession: () => calls.push('leave')
  });

  assert.deepEqual(calls, ['leave']);
  assert.equal(getElement('place-modal').hidden, true);
  assert.equal(getElement('place-info-icon').textContent, 'R');
  assert.equal(getElement('place-info-title').textContent, '랭킹');
  assert.equal(getElement('place-info-desc').textContent, '기록 보기');
  assert.equal(getElement('home-view').hidden, true);
  assert.equal(getElement('ranking-view').hidden, false);
  assert.equal(getElement('ranking-view').scrollCount, 1);
}

testEnterKnownPlaceView();
console.log('Application tests passed: app-view');
