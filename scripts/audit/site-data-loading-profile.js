#!/usr/bin/env node
'use strict';

// Pure synthetic dependency probes. No Firebase connection or production data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const ROOT = path.resolve(__dirname, '../..');
const classroom = require('../../public/js/application/classroom-usecases.js');
const { createClassroomRepository } = require('../../public/js/infrastructure/classroom-repository.js');
const account = require('../../public/js/application/account-usecases.js');
const delay = (ms, value) => new Promise(resolve => setTimeout(() => resolve(value), ms));

(async () => {
  const started = performance.now();
  const completed = {};
  const partialReadyMs = {};
  const read = (name, ms, value) => async () => {
    const result = await delay(ms, value);
    completed[name] = Math.round(performance.now() - started);
    return result;
  };
  await classroom.getClassroomPrototypeViewData({}, {
    onPartialData: (data, keys) => keys.forEach(key => { partialReadyMs[key] ??= Math.round(performance.now() - started); }),
    loadClassroomSettings: read('settings', 30, {}),
    loadClassroomQuestProgress: read('progress', 30, {}),
    loadClassroomReviewItems: read('review', 30, []),
    loadClassroomWallet: read('wallet', 30, {}),
    loadClassroomGemProgress: read('gems', 30, []),
    loadClassroomStudentCards: read('students', 30, []),
    loadClassroomEconomyBoard: read('economy', 600, {})
  });
  const classroomResolvedMs = Math.round(performance.now() - started);

  let studentCallableCount = 0, levelDocReadCount = 0;
  const repository = createClassroomRepository({
    getFirebaseFunctions: () => ({ httpsCallable: () => async () => {
      studentCallableCount++;
      return { data: { students: Array.from({ length: 22 }, (_, i) => ({ memberUserId: `synthetic-${i}` })) } };
    } }),
    getFirestoreDb: () => ({ collection: name => {
      if(name !== 'userLevelSummary') throw new Error(`Unexpected collection: ${name}`);
      return { doc: () => ({ get: async () => {
        levelDocReadCount++;
        return { exists: true, data: () => ({ totalXp: 50 }) };
      } }) };
    } })
  });
  await repository.loadClassroomStudentCards({ memberUserId: 'synthetic-self', settings: {} });

  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'public/js/features/account-data.js'), 'utf8'), sandbox);
  const data = sandbox.window.DJ48AccountData;
  let authListener, initPromise, restores = 0, destinations = 0;
  const user = { uid: 'synthetic-auth' };
  await account.initializeAuthUserLifecycle({}, {
    getFirebaseAuth: () => ({
      currentUser: null,
      onAuthStateChanged: handler => { authListener = handler; },
      signInAnonymously: async () => { queueMicrotask(() => authListener(user)); return { user }; }
    }),
    getFirebaseAuthInitPromise: () => initPromise,
    setFirebaseAuthInitPromise: value => { initPromise = value; },
    handleAuthStateUser: data.handleAuthStateUser,
    initializeAuthUserFlow: data.initializeAuthUserFlow,
    restoreLinkedMemberFromAuthUid: async () => { restores++; return delay(30, {}); },
    openRestoredMemberDestination: () => { destinations++; }
  });
  await delay(40);
  const result = {
    scope: 'Synthetic timings and mock provider call counts only; not production latency, billed reads, or unique network requests.',
    classroom: { configuredDelayMs: { settings: 30, ordinary: 30, economy: 600 }, completed, partialReadyMs, classroomResolvedMs },
    studentCards: { syntheticStudentCount: 22, studentCallableCount, levelDocReadCount },
    authOverlap: { scenario: 'Auth callback overlaps anonymous sign-in completion', restores, destinations }
  };
  fs.writeFileSync(process.env.SITE_DATA_PROFILE_OUTPUT || path.join(ROOT, 'docs/operations/SITE_DATA_LOADING_PROFILE_2026-10-04.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
