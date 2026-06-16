(function (root) {
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

  async function migrateRoomSettingsToMemberId(options = {}, deps = {}) {
    const {
      db,
      sourceUid,
      memberUserId
    } = options;
    if(!db) throw new Error('firestore-unavailable');
    if(!sourceUid || !memberUserId || sourceUid === memberUserId) return false;

    const sourceRef = db.collection('userRoomSettings').doc(sourceUid);
    const targetRef = db.collection('userRoomSettings').doc(memberUserId);
    const [sourceSnapshot, targetSnapshot] = await Promise.all([
      sourceRef.get(),
      targetRef.get()
    ]);

    if(targetSnapshot.exists || !sourceSnapshot.exists) return false;

    const fieldValue = deps.getFirestoreFieldValue?.();
    await targetRef.set({
      ...sourceSnapshot.data(),
      userId: memberUserId,
      migratedFromUid: sourceUid,
      migratedAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp()
    }, { merge: false });
    return true;
  }

  function createShopRepository(deps = {}) {
    return {
      loadShopItems() {
        return root.DJ48ShopData.loadShopItemsFromFirestore(deps.getFirestoreDb?.(), {
          shopCategoryLabels: deps.shopCategoryLabels,
          getShopFallbackIcon: deps.getShopFallbackIcon
        });
      },
      loadAssetCatalog() {
        return root.DJ48ShopData.loadAssetCatalogFromFirestore(deps.getFirestoreDb?.());
      },
      loadUserEconomy(options = {}) {
        return root.DJ48ShopData.loadUserEconomyFromFirestore({
          db: deps.getFirestoreDb?.(),
          userId: options.userId
        }, {
          fallbackCoin: deps.fallbackCoin
        });
      },
      ensureUserEconomyInitialized(options = {}) {
        return root.DJ48ShopData.ensureUserEconomyInitialized({
          db: deps.getFirestoreDb?.(),
          ownerId: options.ownerId,
          testShopUserId: deps.testShopUserId
        }, {
          getFirestoreFieldValue: deps.getFirestoreFieldValue,
          fallbackCoin: deps.fallbackCoin
        });
      },
      loadInventoryItemIds(options = {}) {
        return root.DJ48ShopData.loadInventoryItemIdsFromFirestore({
          db: deps.getFirestoreDb?.(),
          userId: options.userId,
          memberUserId: options.memberUserId,
          testShopUserId: deps.testShopUserId
        });
      },
      loadRoomSettings(options = {}) {
        return root.DJ48ShopData.loadRoomSettingsFromFirestore({
          db: deps.getFirestoreDb?.(),
          userId: options.userId,
          memberUserId: options.memberUserId,
          testShopUserId: deps.testShopUserId
        });
      },
      purchaseShopItem(payload = {}) {
        return purchaseShopItem(payload, {
          getFirebaseFunctions: deps.getFirebaseFunctions
        });
      },
      saveRoomItemSelection(options = {}) {
        return saveRoomItemSelection({
          db: deps.getFirestoreDb?.(),
          userId: options.userId,
          itemId: options.itemId
        }, {
          getFirestoreFieldValue: deps.getFirestoreFieldValue,
          normalizeShopItemFromFirestore: doc => root.DJ48ShopData.normalizeShopItemFromFirestore(doc, {
            shopCategoryLabels: deps.shopCategoryLabels,
            getShopFallbackIcon: deps.getShopFallbackIcon
          }),
          normalizeRoomSettingsFromFirestore: doc => root.DJ48ShopData.normalizeRoomSettingsFromFirestore(doc, {
            userId: options.userId
          }),
          getRoomItemCategory: root.DJ48ShopData.getRoomItemCategory,
          isRoomItemSelected: root.DJ48ShopData.isRoomItemSelected
        });
      },
      migrateRoomSettingsToMemberId(options = {}) {
        return migrateRoomSettingsToMemberId({
          db: deps.getFirestoreDb?.(),
          sourceUid: options.sourceUid,
          memberUserId: options.memberUserId
        }, {
          getFirestoreFieldValue: deps.getFirestoreFieldValue
        });
      }
    };
  }

  const api = {
    createShopRepository
  };

  root.DJ48ShopRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
