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

  window.DJ48ShopData = {
    callShopCallable,
    purchaseShopItem,
    buildRoomItemSelectionUpdate,
    saveRoomItemSelection
  };
})();
