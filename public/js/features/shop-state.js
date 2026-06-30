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
  let activeShopTab = 'all';
  let avatarEquipment = {
    card: '',
    keyring: '',
    badge: '',
    medal: '',
    nameplate: ''
  };

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
  function getActiveShopTab() { return activeShopTab; }
  function setActiveShopTab(value) { activeShopTab = value || 'all'; return activeShopTab; }
  function getAvatarEquipment() { return { ...avatarEquipment }; }
  function setAvatarEquipment(value = {}) {
    avatarEquipment = { ...avatarEquipment, ...value };
    return getAvatarEquipment();
  }
  function toggleAvatarEquipment(item = {}) {
    const slot = item.avatarSlot || '';
    if(!slot) return getAvatarEquipment();
    avatarEquipment = {
      ...avatarEquipment,
      [slot]: avatarEquipment[slot] === item.itemId ? '' : item.itemId
    };
    return getAvatarEquipment();
  }

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
    activeShopTab = 'all';
    resetUserEconomyCache();
    inventoryItemIds = null;
    inventoryLoadPromise = null;
  }

  function getShopItemsCacheAccessors() {
    return {
      getValue: getShopItems,
      setValue: setShopItems,
      getLoadPromise: getShopItemsLoadPromise,
      setLoadPromise: setShopItemsLoadPromise
    };
  }

  function getAssetCatalogCacheAccessors() {
    return {
      getValue: getAssetCatalogMap,
      setValue: setAssetCatalogMap,
      getLoadPromise: getAssetCatalogLoadPromise,
      setLoadPromise: setAssetCatalogLoadPromise
    };
  }

  function getUserEconomyCacheAccessors() {
    return {
      getValue: getUserEconomy,
      setValue: setUserEconomy,
      getLoadPromise: getUserEconomyLoadPromise,
      setLoadPromise: setUserEconomyLoadPromise
    };
  }

  function getInventoryCacheAccessors() {
    return {
      getValue: getInventoryItemIds,
      setValue: setInventoryItemIds,
      getLoadPromise: getInventoryLoadPromise,
      setLoadPromise: setInventoryLoadPromise
    };
  }

  function getRoomSettingsCacheAccessors() {
    return {
      getValue: getRoomSettings,
      setValue: setRoomSettings,
      getLoadPromise: getRoomSettingsLoadPromise,
      setLoadPromise: setRoomSettingsLoadPromise
    };
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
    getActiveShopTab,
    setActiveShopTab,
    getAvatarEquipment,
    setAvatarEquipment,
    toggleAvatarEquipment,
    getShopItemsCacheAccessors,
    getAssetCatalogCacheAccessors,
    getUserEconomyCacheAccessors,
    getInventoryCacheAccessors,
    getRoomSettingsCacheAccessors,
    resetShopRuntimeData,
    resetUserEconomyCache,
    resetRoomSettingsCache
  };
})();
