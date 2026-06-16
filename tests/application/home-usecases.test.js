const assert = require('node:assert/strict');
const usecases = require('../../public/js/application/home-usecases.js');

function createDocSnapshot(data = {}) {
  return {
    exists: true,
    data: () => data
  };
}

function createCollectionSnapshot(docs = []) {
  return { docs };
}

function createDoc(id, data = {}) {
  return {
    id,
    data: () => data
  };
}

async function testLoadHomeMemberDataBuildsModel() {
  const calls = [];
  const homeRepository = {
    getUserEconomyForRender: async () => ({ djCoin: 7 }),
    getUserTitleSummary: async memberUserId => {
      calls.push(['title-summary', memberUserId]);
      return createDocSnapshot({ selectedTitleId: 'title-1' });
    },
    getUserTitles: async memberUserId => {
      calls.push(['titles', memberUserId]);
      return createCollectionSnapshot([createDoc('owned-1', { name: '획득' })]);
    },
    getUserBadges: async memberUserId => {
      calls.push(['badges', memberUserId]);
      return createCollectionSnapshot([createDoc('badge-1', { name: '뱃지' })]);
    }
  };

  const result = await usecases.loadHomeMemberData({
    memberUserId: 'member-a',
    profile: { nickname: '학생' },
    profileData: {},
    userRewardData: {}
  }, {
    homeRepository,
    initializeAuthUser: async () => calls.push(['auth']),
    loadFeatureFlags: async () => calls.push(['flags']),
    getCurrentDataOwnerId: () => 'owner-a',
    buildHomeMemberModel: data => ({ builtFrom: data.memberUserId, economy: data.economy, dataOwnerId: data.dataOwnerId })
  });

  assert.deepEqual(result, {
    builtFrom: 'member-a',
    economy: { djCoin: 7 },
    dataOwnerId: 'owner-a'
  });
  assert.deepEqual(calls.slice(0, 2), [['auth'], ['flags']]);
}

async function testRenderHomeMemberDataFallbacks() {
  const calls = [];
  const result = await usecases.renderHomeMemberData({
    selectedTitleId: 't1'
  }, {
    loadHomeMemberData: async () => ({
      profile: { nickname: '학생' },
      titleCards: [],
      badgeCards: []
    }),
    renderProfileCard: profile => calls.push(['profile', profile]),
    buildTitleCardsForRender: (cards, selectedTitleId) => {
      calls.push(['title-build', cards, selectedTitleId]);
      return [];
    },
    getDefaultTitleCards: () => [{ titleId: 'none' }],
    getDefaultBadgeCards: () => [{ badgeId: 'none' }],
    renderCollectionCards: (...args) => calls.push(['cards', ...args]),
    renderBadgeProgressGroups: (...args) => calls.push(['badges', ...args]),
    renderProfileRankingRecords: async () => calls.push(['ranking'])
  });

  assert.equal(result.error, null);
  assert.deepEqual(calls[0], ['profile', { nickname: '학생' }]);
  assert.deepEqual(calls.at(-1), ['ranking']);
}

async function testOwnedItemsWithoutMember() {
  const data = await usecases.getHomeOwnedItemsData({
    memberUserId: ''
  }, {
    getDefaultRoomSettings: () => ({ userId: '' })
  });

  assert.deepEqual(data, {
    items: [],
    assetCatalogMap: {},
    roomSettings: { userId: '' }
  });
}

async function testOwnedItemsWithMember() {
  const data = await usecases.getHomeOwnedItemsData({
    memberUserId: 'member-a'
  }, {
    getShopItemsForRender: async () => [{ itemId: 'a' }, { itemId: 'b' }],
    getAssetCatalogMap: async () => ({ a: true }),
    getInventoryItemIdsForRender: async () => new Set(['b']),
    getRoomSettingsForRender: async () => ({ selectedAvatarItemId: 'b' }),
    getOwnedShopItems: (items, inventory) => items.filter(item => inventory.has(item.itemId))
  });

  assert.deepEqual(data, {
    items: [{ itemId: 'b' }],
    assetCatalogMap: { a: true },
    roomSettings: { selectedAvatarItemId: 'b' }
  });
}

(async () => {
  await testLoadHomeMemberDataBuildsModel();
  await testRenderHomeMemberDataFallbacks();
  await testOwnedItemsWithoutMember();
  await testOwnedItemsWithMember();
})();
