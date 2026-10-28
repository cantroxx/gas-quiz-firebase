'use strict';
const assert = require('node:assert/strict');
const { createService, publicPortrait, savedLookPayload } = require('../../functions/classroom/portrait');
const catalog = require('../../functions/coordi-shop/catalog.json');
class AppError extends Error { constructor(code, message) { super(message); this.code = code; } }

function fakeDb() {
  const data = new Map();
  const snapshot = path => ({ exists: data.has(path), data: () => structuredClone(data.get(path)) });
  return { data, doc: path => ({ path, get: async () => snapshot(path) }),
    runTransaction: async callback => {
      const writes = [];
      const result = await callback({ get: async ref => { assert.equal(writes.length, 0); return snapshot(ref.path); },
        set: (ref, value, options) => writes.push([ref.path, options?.merge ? { ...data.get(ref.path), ...value } : value]) });
      for(const [path, value] of writes) data.set(path, structuredClone(value));
      return result;
    } };
}

(async () => {
  const db = fakeDb();
  const member = { authUid: 'auth-1', classId: 'G4-C8', profileImageUrl: 'https://example.test/photo.png', profileImageScale: 1.4, profileImageOffsetX: 12 };
  db.data.set('users/S1', member);
  db.data.set('classrooms/G4-C8/studentProfiles/S1', { selectedBadgeId: 'reading' });
  let reads = 0;
  let metadata = { size: 200, contentType: 'image/png', metadata: { memberUserId: 'S1', source: 'classroom-avatar' }, url: 'https://example.test/avatar.png' };
  const service = createService({ db, ErrorType: AppError, FieldValue: { serverTimestamp: () => 123 },
    authorize: async (tx, id, uid, classId) => {
      const user = (await tx.get(db.doc(`users/${id}`))).data();
      if(!user || user.authUid !== uid || user.classId !== classId) throw new AppError('permission-denied', 'scope');
      return user;
    }, readUpload: async () => { reads++; return structuredClone(metadata); } });
  const base = { memberUserId: 'S1', classId: 'G4-C8' };
  const path = 'profileImages/auth-1/S1_classroom_avatar_123_abcd.png';
  const saveAvatar = { ...base, action: 'save', source: 'avatar', storagePath: path };
  await assert.rejects(service('', base), { code: 'unauthenticated' });
  await assert.rejects(service('auth-2', saveAvatar), { code: 'permission-denied' });
  await assert.rejects(service('auth-1', { ...saveAvatar, memberUserId: 'S2' }), { code: 'permission-denied' });
  await assert.rejects(service('auth-1', { ...saveAvatar, classId: 'G4-C9' }), { code: 'permission-denied' });
  assert.equal(reads, 0, 'unauthorized callers must not inspect storage');
  const status = await service('auth-1', base);
  assert.equal(status.photoUrl, member.profileImageUrl);
  assert.equal(status.savedLook, null);
  assert.equal(status.profileImageScale, 1.4);
  await assert.rejects(service('auth-1', { ...base, action: 'save', source: 'avatar', url: 'https://evil.test/avatar.png' }), { code: 'failed-precondition' });
  for(const storagePath of ['profileImages/auth-2/S1_classroom_avatar_a.png', 'profileImages/auth-1/S2_classroom_avatar_a.png', path + '/evil', path.replace('avatar', 'photo')]) {
    await assert.rejects(service('auth-1', { ...saveAvatar, storagePath }), { code: 'permission-denied' });
  }
  for(const bad of [{ size: 2097153 }, { size: 0 }, { contentType: 'image/svg+xml' }, { metadata: { memberUserId: 'S2', source: 'classroom-avatar' } }, { url: '' }]) {
    const original = metadata; metadata = { ...metadata, ...bad };
    await assert.rejects(service('auth-1', saveAvatar), { code: 'invalid-argument' }); metadata = original;
  }
  const avatar = await service('auth-1', saveAvatar);
  assert.equal(avatar.portraitSource, 'avatar'); assert.equal(avatar.profileImageScale, 1);
  assert.equal(avatar.profileImageUrl, metadata.url);
  const profilePath = 'classrooms/G4-C8/studentProfiles/S1';
  assert.equal(db.data.get(profilePath).selectedBadgeId, 'reading');
  const photo = await service('auth-1', { ...base, action: 'save', source: 'photo' });
  assert.equal(photo.profileImageUrl, member.profileImageUrl); assert.equal(photo.profileImageScale, 1.4);
  assert.equal((await service('auth-1', { ...base, action: 'save', source: 'avatar' })).profileImageUrl, metadata.url);
  metadata = { ...metadata, metadata: { memberUserId: 'S1', source: 'classroom-photo' }, url: 'https://example.test/new-photo.png' };
  const uploaded = await service('auth-1', { ...base, action: 'save', source: 'photo', storagePath: path.replace('avatar', 'photo') });
  assert.equal(uploaded.profileImageScale, 1); assert.equal(uploaded.profileImageOffsetX, 0);
  assert.equal((await service('auth-1', base)).avatarUrl, 'https://example.test/avatar.png');
  assert.deepEqual(db.data.get('users/S1'), member, 'global profile must stay unchanged');
  assert.equal(publicPortrait(member, db.data.get(profilePath)).profileImageUrl, uploaded.profileImageUrl);

  const hair = Object.values(catalog).find(item => item.category === 'hair' && item.genders.includes('female'));
  const overall = Object.values(catalog).find(item => item.category === 'overall' && item.genders.includes('female'));
  const top = Object.values(catalog).find(item => item.category === 'top' && item.genders.includes('female'));
  const look = { owned: [hair.id, overall.id, top.id], look: { gender: 'female', equipped: { hair: hair.id, overall: overall.id, top: top.id, weapon: 'weapon-fake' } },
    prisms: { [hair.id]: { hairColor: 3, tone: 40 }, 'skin-12000': { brightness: -10, blackInclusive: 1 } } };
  const payload = savedLookPayload(look);
  assert.equal(payload.itemCode.hair, Math.floor(hair.code / 10) * 10 + 3);
  assert.equal(payload.itemCode.dress, overall.code); assert.equal(payload.itemCode.pants, undefined);
  assert.equal(payload.itemCode.weapon, undefined); assert.equal(payload.itemPrism.hair.tone, 40);
  assert.equal(payload.itemPrism.hair.hairColor, undefined); assert.equal(payload.itemPrism.skin.blackInclusive, undefined);
  assert.equal(savedLookPayload({ ...look, owned: [] }).itemCode.hair, 31000);
  db.data.set('coordiProfiles/S1', look);
  assert.deepEqual((await service('auth-1', base)).savedLook, payload);
  console.log('PASS classroom portrait: ownership, class scope, upload validation, source switching, crop fallback, badge preservation, global-profile isolation, saved outfit ownership and dye.');
})().catch(error => { console.error(error); process.exitCode = 1; });
