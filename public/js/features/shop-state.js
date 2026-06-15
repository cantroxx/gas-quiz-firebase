(function () {
  let shopItems = null;
  let shopItemsLoadPromise = null;
  let assetCatalogMap = null;
  let assetCatalogLoadPromise = null;
  let userEconomy = null;
  let userEconomyLoadPromise = null;
  let inventoryItemIds = null;
  let inventoryLoadPromise = null;
  let roomSettings = null;
  let roomSettingsLoadPromise = null;

  function getShopItems() { return shopItems; }
  function setShopItems(value) { shopItems = value; return shopItems; }
  function getShopItemsLoadPromise() { return shopItemsLoadPromise; }
  function setShopItemsLoadPromise(value) { shopItemsLoadPromise = value; return shopItemsLoadPromise; }

  function getAssetCatalogMap() { return assetCatalogMap; }
  function setAssetCatalogMap(value) { assetCatalogMap = value; return assetCatalogMap; }
  function getAssetCatalogLoadPromise() { return assetCatalogLoadPromise; }
  function setAssetCatalogLoadPromise(value) { assetCatalogLoadPromise = value; return assetCatalogLoadPromise; }

  function getUserEconomy() { return userEconomy; }
  function setUserEconomy(value) { userEconomy = value; return userEconomy; }
  function getUserEconomyLoadPromise() { return userEconomyLoadPromise; }
  function setUserEconomyLoadPromise(value) { userEconomyLoadPromise = value; return userEconomyLoadPromise; }

  function getInventoryItemIds() { return inventoryItemIds; }
  function setInventoryItemIds(value) { inventoryItemIds = value; return inventoryItemIds; }
  function getInventoryLoadPromise() { return inventoryLoadPromise; }
  function setInventoryLoadPromise(value) { inventoryLoadPromise = value; return inventoryLoadPromise; }

  function getRoomSettings() { return roomSettings; }
  function setRoomSettings(value) { roomSettings = value; return roomSettings; }
  function getRoomSettingsLoadPromise() { return roomSettingsLoadPromise; }
  function setRoomSettingsLoadPromise(value) { roomSettingsLoadPromise = value; return roomSettingsLoadPromise; }

  function resetUserEconomyCache() {
    userEconomy = null;
    userEconomyLoadPromise = null;
  }

  function resetRoomSettingsCache() {
    roomSettings = null;
    roomSettingsLoadPromise = null;
  }

  function resetShopRuntimeData() {
    shopItems = null;
    shopItemsLoadPromise = null;
    assetCatalogMap = null;
    assetCatalogLoadPromise = null;
    resetUserEconomyCache();
    inventoryItemIds = null;
    inventoryLoadPromise = null;
  }

  window.DJ48ShopState = {
    getShopItems,
    setShopItems,
    getShopItemsLoadPromise,
    setShopItemsLoadPromise,
    getAssetCatalogMap,
    setAssetCatalogMap,
    getAssetCatalogLoadPromise,
    setAssetCatalogLoadPromise,
    getUserEconomy,
    setUserEconomy,
    getUserEconomyLoadPromise,
    setUserEconomyLoadPromise,
    getInventoryItemIds,
    setInventoryItemIds,
    getInventoryLoadPromise,
    setInventoryLoadPromise,
    getRoomSettings,
    setRoomSettings,
    getRoomSettingsLoadPromise,
    setRoomSettingsLoadPromise,
    resetShopRuntimeData,
    resetUserEconomyCache,
    resetRoomSettingsCache
  };
})();
