'use strict';

const catalog = require('../coordi-shop/catalog.json');

// Only the purchased, saved outfit is used; unsaved dressing-room previews never enter this payload.
function savedLookPayload(profile = {}) {
  if(!profile.look || !['male', 'female'].includes(profile.look.gender)) return null;
  const gender = profile.look.gender;
  const owned = new Set(profile.owned || []);
  const equipped = profile.look.equipped || {};
  const slots = { skin: 'skin', face: 'face', hair: 'hair', hat: 'cap', faceAccessory: 'faceDeco',
    eyeAccessory: 'eyeDeco', earring: 'earring', overall: 'dress', top: 'dress', bottom: 'pants',
    shoes: 'shoes', glove: 'glove', cape: 'cape', weapon: 'weapon' };
  const items = {};
  for(const [slot, id] of Object.entries(equipped)) {
    const item = catalog[id];
    if(slots[slot] && item && owned.has(id) && item.category === slot && item.genders.includes(gender)) items[slot] = item;
  }
  const itemCode = { skin: 12000, face: gender === 'male' ? 20000 : 21000, hair: gender === 'male' ? 30000 : 31000 };
  const itemPrism = {};
  for(const [slot, key] of Object.entries(slots)) {
    if(items.overall && ['top', 'bottom'].includes(slot)) continue;
    const item = items[slot];
    if(item) itemCode[key] = item.code;
    const prism = profile.prisms?.[item?.id || (slot === 'skin' ? 'skin-12000' : '')];
    if(!prism || slot === 'face') continue;
    itemPrism[key] = { ...prism };
    delete itemPrism[key].hairColor;
    if(slot === 'skin') delete itemPrism[key].blackInclusive;
    if(slot === 'hair' && Number.isInteger(prism.hairColor) && prism.hairColor >= 0 && prism.hairColor <= 7) {
      itemCode.hair = Math.floor(itemCode.hair / 10) * 10 + prism.hairColor;
    }
  }
  return { gender: gender === 'male' ? 0 : 1, earType: 0, weaponMotion: 0, variation: 0, variationType: 0,
    weaponBaseEffect: 1, weaponJumpEffect: 1, weaponSpecialEffect: 1, capeEffect: 1, hideWeaponOnSkill: 1,
    capEffect: 1, floatEffect: 1, width: 220, height: 180, x: 110, y: 140, itemCode, itemPrism };
}

function publicPortrait(member = {}, profile = {}) {
  const portrait = profile.portrait || {};
  const source = portrait.source === 'avatar' && portrait.avatar?.url ? 'avatar' : 'photo';
  const selected = portrait[source];
  const custom = !!selected?.url;
  return {
    profileImageUrl: String(selected?.url || member.profileImageUrl || '').slice(0, 1600),
    portraitSource: source,
    profileImageScale: custom ? 1 : Number(member.profileImageScale) || 1,
    profileImageOffsetX: custom ? 0 : Number(member.profileImageOffsetX) || 0,
    profileImageOffsetY: custom ? 0 : Number(member.profileImageOffsetY) || 0
  };
}

function createService({ db, FieldValue, ErrorType, authorize, readUpload }) {
  const fail = (code, message) => { throw new ErrorType(code, message); };
  return async function act(uid, payload = {}) {
    if(!uid) fail('unauthenticated', '로그인이 필요해요.');
    const { memberUserId, classId, action = 'status', source, storagePath } = payload;
    if(![memberUserId, classId].every(value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value))) {
      fail('invalid-argument', '교실과 계정을 다시 확인해 주세요.');
    }
    if(!['status', 'save'].includes(action) || (action === 'save' && !['photo', 'avatar'].includes(source))) {
      fail('invalid-argument', '이미지 종류를 선택해 주세요.');
    }
    const ref = db.doc(`classrooms/${classId}/studentProfiles/${memberUserId}`);
    const read = async tx => {
      const member = await authorize(tx, memberUserId, uid, classId);
      const snapshot = await tx.get(ref);
      return { member, profile: snapshot.exists ? snapshot.data() : {} };
    };
    const initial = await db.runTransaction(read);
    if(action === 'status') {
      const look = await db.doc(`coordiProfiles/${memberUserId}`).get();
      const photo = publicPortrait(initial.member, { portrait: { ...initial.profile.portrait, source: 'photo' } });
      return { success: true, ...publicPortrait(initial.member, initial.profile),
        photoUrl: initial.profile.portrait?.photo?.url || initial.member.profileImageUrl || '',
        avatarUrl: initial.profile.portrait?.avatar?.url || '',
        photoCrop: { scale: photo.profileImageScale, x: photo.profileImageOffsetX, y: photo.profileImageOffsetY },
        savedLook: savedLookPayload(look.exists ? look.data() : {}) };
    }
    let upload = null;
    if(storagePath) {
      const prefix = `profileImages/${uid}/${memberUserId}_classroom_${source}_`;
      if(typeof storagePath !== 'string' || !storagePath.startsWith(prefix) || !/^[A-Za-z0-9_-]+\.(png|jpg|webp)$/.test(storagePath.slice(prefix.length))) {
        fail('permission-denied', '본인이 올린 이미지만 선택할 수 있어요.');
      }
      const metadata = await readUpload(storagePath);
      if(!metadata || Number(metadata.size) <= 0 || Number(metadata.size) > 2 * 1024 * 1024 ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(metadata.contentType) ||
        metadata.metadata?.memberUserId !== memberUserId || metadata.metadata?.source !== `classroom-${source}` || !metadata.url) {
        fail('invalid-argument', '2MB 이하의 JPG, PNG, WebP 이미지를 선택해 주세요.');
      }
      upload = { url: metadata.url, storagePath };
    }
    return db.runTransaction(async tx => {
      const { member, profile } = await read(tx);
      const portrait = { ...(profile.portrait || {}), source };
      if(upload) portrait[source] = upload;
      if(!(portrait[source]?.url || (source === 'photo' && member.profileImageUrl))) {
        fail('failed-precondition', source === 'avatar' ? '저장한 코디를 먼저 불러와 주세요.' : '사진을 먼저 올려 주세요.');
      }
      tx.set(ref, { portrait, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { success: true, ...publicPortrait(member, { portrait }) };
    });
  };
}

module.exports = { createService, savedLookPayload, publicPortrait };
