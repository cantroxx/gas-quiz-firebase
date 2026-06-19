const assert = require('assert');
const bootstrap = require('../../public/js/app/bootstrap.js');

function makeController(methodName, calls, name) {
  return {
    [methodName](deps) {
      calls.push([name, deps]);
    }
  };
}

function testBindAppControllers() {
  const calls = [];
  bootstrap.bindAppControllers({
    appEventsController: makeController('bindCommonAppEvents', calls, 'app'),
    eventController: makeController('bindEventPlazaEvents', calls, 'event'),
    classroomController: makeController('bindClassroomEvents', calls, 'classroom'),
    schoolController: makeController('bindSchoolQuizSelectEvents', calls, 'school'),
    quizController: makeController('bindQuizPlayEvents', calls, 'quiz'),
    shopController: makeController('bindShopRoomEvents', calls, 'shop'),
    homeController: makeController('bindProfileHomeEvents', calls, 'home'),
    adminController: makeController('bindAdminEvents', calls, 'admin'),
    accountController: makeController('bindAccountEvents', calls, 'account'),
    commonAppEvents: { id: 'common' },
    eventEvents: { id: 'event' },
    classroomEvents: { id: 'classroom' },
    schoolEvents: { id: 'school' },
    quizEvents: { id: 'quiz' },
    shopEvents: { id: 'shop' },
    homeEvents: { id: 'home' },
    adminEvents: { id: 'admin' },
    accountEvents: { id: 'account' }
  });

  assert.deepEqual(calls.map(call => call[0]), [
    'app',
    'event',
    'classroom',
    'school',
    'quiz',
    'shop',
    'home',
    'admin',
    'account'
  ]);
  assert.equal(calls[0][1].id, 'common');
  assert.equal(calls.at(-1)[1].id, 'account');
}

function testBindControllerSections() {
  const calls = [];
  bootstrap.bindControllerSections([
    {
      controller: makeController('bindProfileHomeEvents', calls, 'home'),
      bind: 'bindProfileHomeEvents',
      events: { id: 'home' }
    },
    {
      controller: makeController('bindQuizPlayEvents', calls, 'quiz'),
      bind: 'bindQuizPlayEvents',
      events: { id: 'quiz' }
    }
  ]);

  assert.deepEqual(calls.map(call => call[0]), ['home', 'quiz']);
  assert.equal(calls[0][1].id, 'home');
  assert.equal(calls[1][1].id, 'quiz');
}

function testDefaultControllerSections() {
  const sections = bootstrap.getDefaultControllerSections({
    homeController: {},
    homeEvents: { id: 'home' },
    accountController: {},
    accountEvents: { id: 'account' }
  });

  assert.equal(sections.length, 9);
  assert.equal(sections[6].bind, 'bindProfileHomeEvents');
  assert.equal(sections[6].events.id, 'home');
  assert.equal(sections[8].bind, 'bindAccountEvents');
  assert.equal(sections[8].events.id, 'account');
}

function testControllerSectionsFromRegistry() {
  const sections = bootstrap.getControllerSectionsFromRegistry({
    controllers: {
      appEvents: { id: 'app-controller' },
      quiz: { id: 'quiz-controller' },
      account: { id: 'account-controller' }
    },
    events: {
      appEvents: { id: 'common-events' },
      quiz: { id: 'quiz-events' },
      account: { id: 'account-events' }
    }
  });

  assert.equal(sections.length, 9);
  assert.equal(sections[0].bind, 'bindCommonAppEvents');
  assert.equal(sections[0].controller.id, 'app-controller');
  assert.equal(sections[0].events.id, 'common-events');
  assert.equal(sections[4].bind, 'bindQuizPlayEvents');
  assert.equal(sections[4].controller.id, 'quiz-controller');
  assert.equal(sections[8].events.id, 'account-events');
}

async function testStartApp() {
  const calls = [];
  await bootstrap.startApp({}, {
    appEventsController: makeController('bindCommonAppEvents', calls, 'app'),
    commonAppEvents: {},
    initializeAuthUser: async () => calls.push(['auth'])
  });

  assert.deepEqual(calls.map(call => call[0]), ['app', 'auth']);
}

async function run() {
  testBindAppControllers();
  testBindControllerSections();
  testDefaultControllerSections();
  testControllerSectionsFromRegistry();
  await testStartApp();
  console.log('Application tests passed: app-bootstrap');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
