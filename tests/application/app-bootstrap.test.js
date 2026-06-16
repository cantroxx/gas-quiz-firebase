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

function testCreateRoomDecorInitializerOnlyRunsOnce() {
  let initCount = 0;
  const initialize = bootstrap.createRoomDecorInitializer({
    getUserId: () => 'u1',
    onBack: () => {}
  }, {
    getRoomDecor: () => ({
      init(options) {
        initCount += 1;
        assert.equal(options.getUserId(), 'u1');
      }
    })
  });

  assert.equal(initialize(), true);
  assert.equal(initialize(), false);
  assert.equal(initCount, 1);
}

async function testStartApp() {
  const calls = [];
  await bootstrap.startApp({
    getRoomDecorUserId: () => 'u1',
    onRoomDecorBack: () => {}
  }, {
    appEventsController: makeController('bindCommonAppEvents', calls, 'app'),
    commonAppEvents: {},
    initializeAuthUser: async () => calls.push(['auth']),
    getRoomDecor: () => ({
      init() {
        calls.push(['room']);
      }
    }),
    addWindowLoadListener: handler => {
      calls.push(['load-listener']);
      handler();
    },
    defer: handler => {
      calls.push(['defer']);
      handler();
    }
  });

  assert.deepEqual(calls.map(call => call[0]), ['app', 'auth', 'room', 'load-listener', 'defer']);
}

async function run() {
  testBindAppControllers();
  testBindControllerSections();
  testDefaultControllerSections();
  testCreateRoomDecorInitializerOnlyRunsOnce();
  await testStartApp();
  console.log('Application tests passed: app-bootstrap');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
