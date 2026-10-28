/* Read-only display of the authenticated member's purchased and saved outfit. */
(function(root) {
  'use strict';
function savedLookPayload(profile = {}, catalog = {}) {
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

  if(typeof module === 'object' && module.exports) { module.exports = { savedLookPayload }; return; }
  let owner = '', generation = 0, signature = '', imageUrl = '', pending = null, previousView = '', previewScript;
  let avatarState = {status:'idle',message:''};
  function report(status,message='') {
    avatarState = {status,message};
    window.dispatchEvent(new CustomEvent('dj48-avatar-state',{detail:avatarState}));
  }
  const actors = () => document.querySelectorAll('.spatial-guide, .saved-coordi-avatar');
  const identity = () => {
    const state = root.DJ48AccountState;
    const member = state?.getCurrentMemberUserId?.(), uid = state?.getFirebaseAuthUser?.()?.uid;
    return member && uid ? `${uid}:${member}` : '';
  };
  function display(url = '') {
    actors().forEach(actor => {
      // Fresh image nodes prevent obsolete load/error/crop handlers from changing a new account's avatar.
      const img = document.createElement('img'); img.alt = ''; img.draggable = false; img.hidden = !url;
      actor.replaceChildren(img); actor.dataset.avatarState = url ? 'ready' : 'fallback';
      if(url) {
        const failed = () => { if(img.parentElement === actor) { img.hidden = true; actor.dataset.avatarState = 'fallback'; report('error','아바타 이미지를 불러오지 못했어요. 다시 불러와 주세요.'); } };
        if(root.DJ48ClassroomPortrait?.setAvatarImageSource) root.DJ48ClassroomPortrait.setAvatarImageSource(img, url, failed);
        else { img.onerror = failed; img.src = url; }
      }
    });
  }
  function previewRenderer() {
    if(root.DJ48CoordiPreviewRenderer) return Promise.resolve(root.DJ48CoordiPreviewRenderer);
    if(!previewScript) previewScript = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = '/coordi-shop/preview-renderer.js?v=20261028';
      script.onload = () => resolve(root.DJ48CoordiPreviewRenderer);
      script.onerror = () => { script.remove(); previewScript = null; reject(Error('Avatar renderer unavailable')); };
      document.head.append(script);
    });
    return previewScript;
  }
  async function refresh(force = false) {
    const current = identity();
    if(current !== owner) { owner = current; generation++; pending = null; signature = ''; imageUrl = ''; display(); }
    if(!owner) {report('idle');return;}
    if(pending) {
      if(!force) return pending;
      // A save can finish while the previous status/render is still in flight.
      // Read the saved outfit again after it settles instead of dropping that refresh.
      const waiting = pending, waitingGeneration = generation;
      await waiting;
      if(waitingGeneration !== generation || current !== identity()) return;
      if(pending === waiting) pending = null;
      return refresh(true);
    }
    if(!force && imageUrl) { display(imageUrl); return; }
    const token = generation, account = owner;
    const valid = () => token === generation && account === identity();
    const functions = root.DJ48Firebase?.getFirebaseFunctions?.();
    if(!functions) {report('error','아바타 연결을 준비하지 못했어요. 다시 불러와 주세요.');return;}
    const memberUserId = root.DJ48AccountState.getCurrentMemberUserId();
    report('loading','저장한 코디를 불러오는 중이에요.');
    const task = (async () => {
      try {
        const response = await functions.httpsCallable('coordiShopAction')({ action: 'status', memberUserId });
        if(!valid()) return;
        const { profile, prices } = response.data || {};
        // No saved outfit yet: show a neutral location marker rather than an unrelated character.
        if(!profile?.owned?.some(id => Object.values(profile.look?.equipped || {}).includes(id))) {
          signature = ''; imageUrl = ''; display(); report('empty','아직 장착한 코디가 없어 위치 표시로 보여요. 상점에서 코디를 고른 뒤 ‘내 코디로 장착’을 눌러 주세요.'); return;
        }
        const look = savedLookPayload(profile, prices);
        if(!look) { signature = ''; imageUrl = ''; display(); report('empty','아직 장착한 코디가 없어 위치 표시로 보여요. 상점에서 코디를 고른 뒤 ‘내 코디로 장착’을 눌러 주세요.'); return; }
        const nextSignature = JSON.stringify(look);
        if(signature === nextSignature && imageUrl) {report('ready');return;}
        const preview = await previewRenderer(); if(!valid()) return;
        const render = preview.createRenderer({
          assertCurrent: () => { if(!valid()) throw Error('Account changed'); },
          render: async look => (await functions.httpsCallable('renderCoordiShopPreview')({look})).data
        });
        const result = await render(look); if(!valid()) return;
        if(!result?.success || !result.imageUrl?.startsWith('data:image/png;base64,')) throw Error('Avatar unavailable');
        signature = nextSignature; imageUrl = result.imageUrl; display(imageUrl); report('ready');
      } catch(_) { if(valid()) { signature = ''; imageUrl = ''; display(); report('error','코디를 불러오지 못해 위치 표시로 보여요. 다시 불러와 주세요.'); } }
    })();
    pending = task;
    try { await task; } finally { if(pending === task) pending = null; }
  }
  function sync() {
    const view = document.querySelector('.app-view:not([hidden])');
    const id = view?.id || '';
    const enteringTown = id === 'town-view' && previousView !== id;
    previousView = id;
    if(identity() !== owner) { owner = ''; generation++; pending = null; signature = ''; imageUrl = ''; display(); report('idle'); }
    if(view?.querySelector('.spatial-guide, .saved-coordi-avatar')) refresh(enteringTown);
  }
  function init() {
    document.querySelectorAll('.app-view').forEach(view => new MutationObserver(sync).observe(view, {attributes:true,attributeFilter:['hidden']}));
    root.DJ48Firebase?.getFirebaseAuth?.()?.onAuthStateChanged?.(() => {
      // Auth callback can precede AccountState's reset: never retain the preceding image.
      owner = ''; generation++; pending = null; signature = ''; imageUrl = ''; display();
      queueMicrotask(sync);
    });
    sync();
  }
  root.DJ48TownAvatar = { savedLookPayload, refresh, sync, getState:()=>({...avatarState}) };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})(typeof window === 'undefined' ? globalThis : window);
