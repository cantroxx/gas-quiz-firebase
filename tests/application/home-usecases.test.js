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
  const db = {
    collection: name => ({
      doc: id => ({
        get: async () => {
          calls.push(['get', name, id]);
          return createDocSnapshot({ selectedTitleId: 'title-1' });
        },
        collection: childName => ({
          get: async () => {
            calls.push(['get-sub', name, id, childName]);
            return createCollectionSnapshot([createDoc('owned-1', { name: '획득' })]);
          }
        })
      })
    })
  };

  const result = await usecases.loadHomeMemberData({
    memberUserId: 'member-a',
    profile: { nickname: '학생' },
    profileData: {},
    userRewardData: {}
  }, {
    getFirestoreDb: () => db,
    initializeAuthUser: async () => calls.push(['auth']),
    loadFeatureFlags: async () => calls.push(['flags']),
    getCurrentDataOwnerId: () => 'owner-a',
    getUserEconomyForRender: async () => ({ djCoin: 7 }),
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
