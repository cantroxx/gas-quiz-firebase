(function () {
  async function callShopCallable(callableName, payload = {}, deps = {}, errorCode = '') {
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) throw new Error('functions-unavailable');
    const callable = functions.httpsCallable(callableName);
    const response = await callable(payload);
    const result = response?.data || {};
    if(!result.success) throw new Error(errorCode || `${callableName || 'shop-call'}-failed`);
    return result;
  }

  function purchaseShopItem(payload = {}, deps = {}) {
    return callShopCallable('purchaseShopItem', payload, deps, 'purchase-function-failed');
  }

  function getShopPurchaseErrorMessage(error) {
    const messages = {
      'login-required': '로그인 후 구매할 수 있어요.',
      'member-not-linked': '회원 연결 후 구매할 수 있어요.',
      'functions-unavailable': '구매 서버를 불러올 수 없어요.',
      'functions/not-found': '아이템 정보를 찾을 수 없어요.',
      'functions/already-exists': '이미 보유한 아이템이에요.',
      'functions/failed-precondition': '구매 조건을 만족하지 못했어요. 코인과 아이템 상태를 확인해 주세요.',
      'functions/permission-denied': '현재 로그인 정보로는 구매할 수 없어요.',
      'functions/invalid-argument': '구매 요청 정보가 올바르지 않아요.',
      'item-not-found': '아이템 정보를 찾을 수 없어요.',
      'economy-not-found': '테스트 사용자 지갑 정보를 찾을 수 없어요.',
      'already-owned': '이미 보유한 아이템이에요.',
      'item-disabled': '지금은 구매할 수 없는 아이템이에요.',
      'unsupported-price-type': '지원하지 않는 가격 유형이에요.',
      'invalid-price': '아이템 가격 정보가 올바르지 않아요.',
      'coin-short': 'DJ코인이 부족해요.'
    };
    return messages[error?.message] || '구매 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
  }

  function buildRoomItemSelectionUpdate(options = {}, deps = {}) {
    const {
      itemId,
      userId,
      item,
      currentSettings
    } = options;
    const category = deps.getRoomItemCategory?.(item);
    const isSelected = deps.isRoomItemSelected?.(item, currentSettings);
    const fieldValue = deps.getFirestoreFieldValue?.();
    const updateData = {
      userId,
      updatedAt: fieldValue.serverTimestamp()
    };

    if(category === 'background') {
      updateData.selectedBackgroundItemId = isSelected ? '' : itemId;
    } else if(category === 'avatar') {
      updateData.selectedAvatarItemId = isSelected ? '' : itemId;
    } else if(category === 'roomDecor') {
      const decorSet = new Set(currentSettings.selectedDecorItemIds);
      if(decorSet.has(itemId)) {
        decorSet.delete(itemId);
      } else {
        decorSet.add(itemId);
      }
      updateData.selectedDecorItemIds = Array.from(decorSet);
    } else if(category === 'titleFrame') {
      updateData.selectedTitleFrameItemId = isSelected ? '' : itemId;
    } else {
      throw new Error('unsupported-category');
    }

    return updateData;
  }

  async function saveRoomItemSelection(options = {}, deps = {}) {
    const {
      db,
      userId,
      itemId
    } = options;
    if(!db) throw new Error('firestore-unavailable');

    const itemRef = db.collection('shopItems').doc(itemId);
    const inventoryRef = db.collection('userInventory').doc(userId).collection('items').doc(itemId);
    const settingsRef = db.collection('userRoomSettings').doc(userId);
    const [itemSnapshot, inventorySnapshot, settingsSnapshot] = await Promise.all([
      itemRef.get(),
      inventoryRef.get(),
      settingsRef.get()
    ]);

    if(!itemSnapshot.exists) throw new Error('item-not-found');
    if(!inventorySnapshot.exists) throw new Error('not-owned');

    const item = deps.normalizeShopItemFromFirestore(itemSnapshot);
    const currentSettings = deps.normalizeRoomSettingsFromFirestore(settingsSnapshot);
    const updateData = buildRoomItemSelectionUpdate({
      itemId,
      userId,
      item,
      currentSettings
    }, deps);

    await settingsRef.set(updateData, { merge: true });
    return updateData;
  }

  function getRoomItemSaveErrorMessage(error) {
    const messages = {
      'login-required': '로그인 후 내 집 설정을 저장할 수 있어요.',
      'firestore-unavailable': '내 집 설정을 저장할 수 없어요.',
      'item-not-found': '아이템 정보를 찾을 수 없어요.',
      'not-owned': '보유한 아이템만 내 집에 적용할 수 있어요.',
      'unsupported-category': '아직 내 집에 적용할 수 없는 아이템 종류예요.'
    };
    return messages[error?.message] || '내 집 설정 저장 중 문제가 생겼어요.';
  }

  window.DJ48ShopData = {
    callShopCallable,
    purchaseShopItem,
    getShopPurchaseErrorMessage,
    buildRoomItemSelectionUpdate,
    saveRoomItemSelection,
    getRoomItemSaveErrorMessage
  };
})();
