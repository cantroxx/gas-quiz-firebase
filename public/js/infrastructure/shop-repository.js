(function (root) {
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
        return root.DJ48ShopData.purchaseShopItem(payload, {
          getFirebaseFunctions: deps.getFirebaseFunctions
        });
      },
      saveRoomItemSelection(options = {}) {
        return root.DJ48ShopData.saveRoomItemSelection({
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
      }
    };
  }

  const api = {
    createShopRepository
  };

  root.DJ48ShopRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
