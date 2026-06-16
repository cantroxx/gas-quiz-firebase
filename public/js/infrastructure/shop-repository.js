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

  function requireFirestoreDb(db) {
    if(!db) throw new Error('firestore-unavailable');
    return db;
  }

  function getDocs(snapshot) {
    return Array.isArray(snapshot?.docs) ? snapshot.docs : [];
  }

  async function loadShopItemsFromDb(db, deps = {}) {
    const snapshot = await requireFirestoreDb(db).collection('shopItems').get();
    return getDocs(snapshot)
      .map(doc => deps.normalizeShopItemFromFirestore(doc))
      .filter(item => item.enabled && !deps.isRoomFurnitureShopItem(item))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async function loadAssetCatalogFromDb(db, deps = {}) {
    const snapshot = await requireFirestoreDb(db).collection('assetCatalog').get();
    return getDocs(snapshot).reduce((map, doc) => {
      const asset = deps.normalizeAssetCatalogFromFirestore(doc);
      map[asset.assetId] = asset;
      return map;
    }, {});
  }

  async function loadUserEconomyFromDb(options = {}, deps = {}) {
    const { db, userId } = options;
    const snapshot = await requireFirestoreDb(db).collection('userEconomy').doc(userId).get();
    return deps.normalizeUserEconomyFromFirestore(snapshot, {
      fallbackCoin: deps.fallbackCoin
    });
  }

  async function ensureUserEconomyInitializedForDb(options = {}, deps = {}) {
    const { db, ownerId, testShopUserId } = options;
    if(!ownerId || ownerId === testShopUserId) return null;
    const snapshot = await requireFirestoreDb(db).collection('userEconomy').doc(ownerId).get();
    if(snapshot.exists) {
      return deps.normalizeUserEconomyFromFirestore(snapshot, {
        fallbackCoin: deps.fallbackCoin
      });
    }

    const initialEconomy = deps.getInitialUserEconomy(ownerId);
    return {
      userId: ownerId,
      djCoin: initialEconomy.djCoin,
      totalEarned: initialEconomy.totalEarned,
      totalSpent: initialEconomy.totalSpent
    };
  }

  async function loadInventoryItemIdsFromDb(options = {}) {
    const { db, userId, memberUserId, testShopUserId } = options;
    if(!memberUserId || userId === testShopUserId) return new Set();
    const snapshot = await requireFirestoreDb(db).collection('userInventory').doc(userId).collection('items').get();
    return new Set(getDocs(snapshot).map(doc => doc.id));
  }

  async function loadRoomSettingsFromDb(options = {}, deps = {}) {
    const { db, userId, memberUserId, testShopUserId } = options;
    if(!memberUserId || userId === testShopUserId) return deps.getDefaultRoomSettings(userId || '');
    const snapshot = await requireFirestoreDb(db).collection('userRoomSettings').doc(userId).get();
    return deps.normalizeRoomSettingsFromFirestore(snapshot, { userId });
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
        return loadShopItemsFromDb(deps.getFirestoreDb?.(), {
          normalizeShopItemFromFirestore: doc => root.DJ48ShopData.normalizeShopItemFromFirestore(doc, {
            shopCategoryLabels: deps.shopCategoryLabels,
            getShopFallbackIcon: deps.getShopFallbackIcon
          }),
          isRoomFurnitureShopItem: root.DJ48ShopData.isRoomFurnitureShopItem
        });
      },
      loadAssetCatalog() {
        return loadAssetCatalogFromDb(deps.getFirestoreDb?.(), {
          normalizeAssetCatalogFromFirestore: root.DJ48ShopData.normalizeAssetCatalogFromFirestore
        });
      },
      loadUserEconomy(options = {}) {
        return loadUserEconomyFromDb({
          db: deps.getFirestoreDb?.(),
          userId: options.userId
        }, {
          normalizeUserEconomyFromFirestore: root.DJ48ShopData.normalizeUserEconomyFromFirestore,
          fallbackCoin: deps.fallbackCoin
        });
      },
      ensureUserEconomyInitialized(options = {}) {
        return ensureUserEconomyInitializedForDb({
          db: deps.getFirestoreDb?.(),
          ownerId: options.ownerId,
          testShopUserId: deps.testShopUserId
        }, {
          normalizeUserEconomyFromFirestore: root.DJ48ShopData.normalizeUserEconomyFromFirestore,
          getInitialUserEconomy: userId => root.DJ48ShopData.getInitialUserEconomy(userId, {
            getFirestoreFieldValue: deps.getFirestoreFieldValue
          }),
          fallbackCoin: deps.fallbackCoin
        });
      },
      loadInventoryItemIds(options = {}) {
        return loadInventoryItemIdsFromDb({
          db: deps.getFirestoreDb?.(),
          userId: options.userId,
          memberUserId: options.memberUserId,
          testShopUserId: deps.testShopUserId
        });
      },
      loadRoomSettings(options = {}) {
        return loadRoomSettingsFromDb({
          db: deps.getFirestoreDb?.(),
          userId: options.userId,
          memberUserId: options.memberUserId,
          testShopUserId: deps.testShopUserId
        }, {
          getDefaultRoomSettings: root.DJ48ShopData.getDefaultRoomSettings,
          normalizeRoomSettingsFromFirestore: root.DJ48ShopData.normalizeRoomSettingsFromFirestore
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
    createShopRepository,
    loadAssetCatalogFromDb,
    loadInventoryItemIdsFromDb,
    loadRoomSettingsFromDb,
    loadShopItemsFromDb,
    loadUserEconomyFromDb,
    ensureUserEconomyInitializedForDb
  };

  root.DJ48ShopRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
