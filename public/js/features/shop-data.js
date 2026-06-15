(function () {
  function isUsableImageUrl(value) {
    if(typeof value !== 'string') return false;
    const imageUrl = value.trim();
    return imageUrl && imageUrl !== 'TODO' && /^https?:\/\//.test(imageUrl);
  }

  function normalizeShopItemFromFirestore(doc, deps = {}) {
    const data = doc.data();
    const itemId = data.itemId || doc.id;
    const price = Number(data.price);
    const sortOrder = Number(data.sortOrder);
    const category = data.category || '';
    const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '';
    const categoryLabels = deps.shopCategoryLabels || {};

    return {
      itemId,
      rawCategory: category,
      category: categoryLabels[category] || category || '기타',
      name: data.name || itemId,
      desc: data.desc || '상점 아이템 설명을 준비 중입니다.',
      price: Number.isFinite(price) ? price : 0,
      icon: deps.getShopFallbackIcon?.(itemId, category) || '🛍️',
      enabled: data.enabled === true,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 999,
      priceType: data.priceType || 'djCoin',
      imageUrl: imageUrl && imageUrl !== 'TODO' ? imageUrl : '',
      assetId: data.assetId || '',
      rarity: data.rarity || 'common'
    };
  }

  function isRoomFurnitureShopItem(item) {
    const rawCategory = String(item?.rawCategory || item?.category || '').trim();
    const assetId = String(item?.assetId || '').trim();
    const itemId = String(item?.itemId || '').trim();
    return rawCategory === '방 가구' || assetId.startsWith('room_') || itemId.startsWith('room_');
  }

  function normalizeAssetCatalogFromFirestore(doc) {
    const data = doc.data();
    const assetId = data.assetId || doc.id;
    const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '';

    return {
      assetId,
      type: data.type || '',
      name: data.name || assetId,
      storagePath: data.storagePath || '',
      imageUrl: isUsableImageUrl(imageUrl) ? imageUrl : '',
      fallbackIcon: data.fallbackIcon || '',
      enabled: data.enabled === true
    };
  }

  function normalizeUserEconomyFromFirestore(doc, deps = {}) {
    if(!doc.exists) return null;
    const data = doc.data();
    const djCoin = Number(data.djCoin ?? data.coin);
    const totalEarned = Number(data.totalEarned ?? data.lifetimeEarnedCoin);
    const totalSpent = Number(data.totalSpent ?? data.lifetimeSpentCoin);

    return {
      userId: data.userId || doc.id,
      djCoin: Number.isFinite(djCoin) ? djCoin : deps.fallbackCoin || 0,
      totalEarned: Number.isFinite(totalEarned) ? totalEarned : 0,
      totalSpent: Number.isFinite(totalSpent) ? totalSpent : 0
    };
  }

  function getInitialUserEconomy(userId, deps = {}) {
    const fieldValue = deps.getFirestoreFieldValue?.();
    const now = fieldValue.serverTimestamp();
    return {
      userId,
      djCoin: 0,
      totalEarned: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
      source: 'initial_grant'
    };
  }

  function getDefaultRoomSettings(userId = '') {
    return {
      userId,
      selectedBackgroundItemId: '',
      selectedAvatarItemId: '',
      selectedDecorItemIds: [],
      selectedTitleFrameItemId: ''
    };
  }

  function normalizeRoomSettingsFromFirestore(doc, deps = {}) {
    const userId = deps.userId || '';
    if(!doc.exists) return getDefaultRoomSettings(userId);
    const data = doc.data();
    return {
      userId: data.userId || userId,
      selectedBackgroundItemId: data.selectedBackgroundItemId || '',
      selectedAvatarItemId: data.selectedAvatarItemId || '',
      selectedDecorItemIds: Array.isArray(data.selectedDecorItemIds) ? data.selectedDecorItemIds : [],
      selectedTitleFrameItemId: data.selectedTitleFrameItemId || ''
    };
  }

  function getRoomItemCategory(item) {
    const category = item.rawCategory || item.category;
    const categoryMap = {
      '배경': 'background',
      '아바타': 'avatar',
      '방 장식': 'roomDecor',
      '칭호 프레임': 'titleFrame'
    };
    return categoryMap[category] || category;
  }

  function isRoomItemSelected(item, roomSettings = getDefaultRoomSettings()) {
    const category = getRoomItemCategory(item);
    if(category === 'background') return roomSettings.selectedBackgroundItemId === item.itemId;
    if(category === 'avatar') return roomSettings.selectedAvatarItemId === item.itemId;
    if(category === 'roomDecor') return roomSettings.selectedDecorItemIds.includes(item.itemId);
    if(category === 'titleFrame') return roomSettings.selectedTitleFrameItemId === item.itemId;
    return false;
  }

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
    isUsableImageUrl,
    normalizeShopItemFromFirestore,
    isRoomFurnitureShopItem,
    normalizeAssetCatalogFromFirestore,
    normalizeUserEconomyFromFirestore,
    getInitialUserEconomy,
    getDefaultRoomSettings,
    normalizeRoomSettingsFromFirestore,
    getRoomItemCategory,
    isRoomItemSelected,
    callShopCallable,
    purchaseShopItem,
    getShopPurchaseErrorMessage,
    buildRoomItemSelectionUpdate,
    saveRoomItemSelection,
    getRoomItemSaveErrorMessage
  };
})();
