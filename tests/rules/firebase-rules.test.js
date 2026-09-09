const fs = require('node:fs');
const path = require('node:path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} = require('@firebase/rules-unit-testing');
const {
  doc,
  getDoc,
  setLogLevel,
  setDoc,
  updateDoc
} = require('firebase/firestore');
const {
  getBytes,
  ref,
  uploadBytes
} = require('firebase/storage');

const projectRoot = path.resolve(__dirname, '../..');
const projectId = 'demo-dj48-rules';

setLogLevel('silent');

async function seedFixtures(testEnv) {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'shopItems/item-1'), { name: '연필' });
    await setDoc(doc(db, 'quizzes/quiz-1'), { title: '테스트 퀴즈' });
    await setDoc(doc(db, 'users/member-1'), {
      userId: 'member-1',
      authUid: 'uid-student',
      role: 'student',
      status: 'active',
      active: true,
      rankingMessage: ''
    });
    await setDoc(doc(db, 'users/member-2'), {
      userId: 'member-2',
      authUid: 'uid-other',
      role: 'student',
      status: 'inactive',
      active: false
    });
    await setDoc(doc(db, 'users/unsafe-user'), {
      userId: 'unsafe-user',
      authUid: 'uid-unsafe',
      role: 'student',
      status: 'active',
      active: true,
      password: 'must-never-be-readable'
    });
    await setDoc(doc(db, 'userEconomy/member-1'), { coin: 100 });
    await setDoc(doc(db, 'authLinks/uid-student'), { memberUserId: 'member-1' });

    const storage = context.storage();
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    await uploadBytes(ref(storage, 'profileImages/uid-student/avatar.png'), png, {
      contentType: 'image/png'
    });
    await uploadBytes(ref(storage, 'housingAssets/furni-bundle-v6.json.gz'), new Uint8Array([31, 139]), {
      contentType: 'application/gzip'
    });
  });
}

async function testFirestoreRules(testEnv) {
  const guestDb = testEnv.unauthenticatedContext().firestore();
  const memberDb = testEnv.authenticatedContext('uid-student').firestore();
  const otherDb = testEnv.authenticatedContext('uid-other').firestore();
  const adminDb = testEnv.authenticatedContext('uid-admin', { admin: true }).firestore();

  await assertSucceeds(getDoc(doc(guestDb, 'shopItems/item-1')));
  await assertFails(getDoc(doc(guestDb, 'quizzes/quiz-1')));
  await assertSucceeds(getDoc(doc(memberDb, 'quizzes/quiz-1')));

  await assertSucceeds(getDoc(doc(memberDb, 'users/member-1')));
  await assertFails(getDoc(doc(memberDb, 'users/member-2')));
  await assertFails(getDoc(doc(adminDb, 'users/unsafe-user')));
  await assertFails(getDoc(doc(memberDb, 'memberCredentials/member-1')));
  await assertFails(getDoc(doc(memberDb, 'authLinks/uid-student')));

  await assertSucceeds(getDoc(doc(memberDb, 'userEconomy/member-1')));
  await assertFails(getDoc(doc(otherDb, 'userEconomy/member-1')));
  await assertSucceeds(updateDoc(doc(memberDb, 'users/member-1'), {
    rankingMessage: '즐겁게 풀자',
    updatedAt: 1
  }));
  await assertFails(updateDoc(doc(memberDb, 'users/member-1'), { coin: 999999 }));
  await assertSucceeds(updateDoc(doc(adminDb, 'users/member-1'), { active: false }));
}

async function testStorageRules(testEnv) {
  const guestStorage = testEnv.unauthenticatedContext().storage();
  const memberStorage = testEnv.authenticatedContext('uid-student').storage();
  const otherStorage = testEnv.authenticatedContext('uid-other').storage();
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  await assertFails(getBytes(ref(guestStorage, 'profileImages/uid-student/avatar.png')));
  await assertSucceeds(getBytes(ref(memberStorage, 'profileImages/uid-student/avatar.png')));
  await assertSucceeds(uploadBytes(ref(memberStorage, 'profileImages/uid-student/new.png'), png, {
    contentType: 'image/png'
  }));
  await assertFails(uploadBytes(ref(otherStorage, 'profileImages/uid-student/other.png'), png, {
    contentType: 'image/png'
  }));
  await assertFails(uploadBytes(ref(memberStorage, 'profileImages/uid-student/not-image.txt'), png, {
    contentType: 'text/plain'
  }));

  await assertSucceeds(getBytes(ref(memberStorage, 'housingAssets/furni-bundle-v6.json.gz')));
  await assertFails(getBytes(ref(otherStorage, 'housingAssets/furni-bundle-v6.json.gz')));
  await assertFails(uploadBytes(ref(memberStorage, 'housingAssets/new-bundle.json.gz'), png, {
    contentType: 'application/gzip'
  }));
  await assertFails(getBytes(ref(memberStorage, 'private/unknown.txt')));
}

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8181,
      rules: fs.readFileSync(path.join(projectRoot, 'firestore.rules'), 'utf8')
    },
    storage: {
      host: '127.0.0.1',
      port: 9299,
      rules: fs.readFileSync(path.join(projectRoot, 'storage.rules'), 'utf8')
    }
  });

  try {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
    await seedFixtures(testEnv);
    await testFirestoreRules(testEnv);
    await testStorageRules(testEnv);
    console.log('Firebase Rules behavior tests passed: Firestore and Storage');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
