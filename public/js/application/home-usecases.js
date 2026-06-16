(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48HomeUsecases = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  async function loadHomeMemberData(options = {}, deps = {}) {
    const repository = deps.homeRepository || deps.createHomeRepository?.();
    if(!repository) throw new Error('home-repository-unavailable');
    await deps.initializeAuthUser?.();
    await deps.loadFeatureFlags?.();

    const dataOwnerId = deps.getCurrentDataOwnerId?.() || '';
    const memberUserId = options.memberUserId || '';
    const profile = options.profile || null;
    const economyPromise = repository.getUserEconomyForRender()
      .catch(error => {
        deps.warn?.('Home userEconomy read failed. Using profile fallback economy.', error);
        return null;
      });
    const titleSummaryPromise = memberUserId
      ? repository.getUserTitleSummary(memberUserId)
      : Promise.resolve(null);
    const titlesPromise = memberUserId
      ? repository.getUserTitles(memberUserId)
      : Promise.resolve(null);
    const badgesPromise = memberUserId
      ? repository.getUserBadges(memberUserId)
      : Promise.resolve(null);

    const [economy, titleSummarySnapshot, titlesSnapshot, badgesSnapshot] = await Promise.all([
      economyPromise,
      titleSummaryPromise,
      titlesPromise,
      badgesPromise
    ]);

    return deps.buildHomeMemberModel({
      profile,
      profileData: options.profileData,
      userRewardData: options.userRewardData,
      economy,
      titleSummarySnapshot,
      titlesSnapshot,
      badgesSnapshot,
      dataOwnerId,
      memberUserId
    });
  }

  async function renderHomeMemberData(options = {}, deps = {}) {
    try {
      const model = await deps.loadHomeMemberData();
      deps.renderProfileCard?.(model.profile);
      const selectedTitleId = options.selectedTitleId || '';
      const titleCards = deps.buildTitleCardsForRender(model.titleCards, selectedTitleId);
      deps.renderCollectionCards?.(
        'title-card-grid',
        titleCards.length ? titleCards : deps.getDefaultTitleCards(),
        'title-card'
      );
      deps.renderBadgeProgressGroups?.(
        'badge-card-grid',
        model.badgeCards.length ? model.badgeCards : deps.getDefaultBadgeCards()
      );
      await deps.renderProfileRankingRecords?.();
      return { model, error: null };
    } catch(error) {
      deps.warn?.('Firestore home member data read failed. Using static home fallback.', error);
      return { model: null, error };
    }
  }

  async function getHomeOwnedItemsData(options = {}, deps = {}) {
    if(!options.memberUserId) {
      return {
        items: [],
        assetCatalogMap: {},
        roomSettings: deps.getDefaultRoomSettings?.()
      };
    }
    const [items, assetCatalogMap, inventoryItemIds, roomSettings] = await Promise.all([
      deps.getShopItemsForRender(),
      deps.getAssetCatalogMap(),
      deps.getInventoryItemIdsForRender(),
      deps.getRoomSettingsForRender()
    ]);
    return {
      items: deps.getOwnedShopItems(items, inventoryItemIds),
      assetCatalogMap,
      roomSettings
    };
  }

  async function renderHomeOwnedItems(options = {}, deps = {}) {
    try {
      const data = await getHomeOwnedItemsData(options, deps);
      deps.renderHomeOwnedItems?.(data.items, data.assetCatalogMap, data.roomSettings);
      return { data, error: null };
    } catch(error) {
      deps.warn?.('Home inventory read failed. Keeping owned item fallback.', error);
      deps.renderHomeOwnedItems?.([], {});
      return { data: null, error };
    }
  }

  return {
    loadHomeMemberData,
    renderHomeMemberData,
    getHomeOwnedItemsData,
    renderHomeOwnedItems
  };
});
