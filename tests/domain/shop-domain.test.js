#!/usr/bin/env node

const assert = require('node:assert/strict');
const { resolveShopItemVisual, getShopItemState } = require('../../public/js/domain/shop-domain.js');

function testOwnedItemState() {
  const state = getShopItemState(
    { itemId: 'desk-a', price: 30 },
    { djCoin: 100 },
    new Set(['desk-a'])
  );

  assert.deepEqual(state, {
    label: '보유중',
    buttonLabel: '보유중',
    className: 'shop-state-ready',
    disabled: true
  });
}

function testPurchasableItemState() {
  const state = getShopItemState(
    { itemId: 'desk-a', price: 30 },
    { djCoin: 30 },
    new Set()
  );

  assert.deepEqual(state, {
    label: '구매 가능',
    buttonLabel: '구매하기',
    className: 'shop-state-ready',
    disabled: false
  });
}

function testShortCoinItemStateUsesFallbackEconomy() {
  const state = getShopItemState(
    { itemId: 'desk-a', price: 30 },
    null,
    new Set(),
    { userRewardData: { coin: 20 } }
  );

  assert.deepEqual(state, {
    label: '코인 부족',
    buttonLabel: '코인 부족',
    className: 'shop-state-short',
    disabled: true
  });
}

function testEnabledAssetVisualWins() {
  const visual = resolveShopItemVisual(
    { itemId: 'chair-a', assetId: 'asset-chair', imageUrl: 'fallback.png', icon: 'C', name: 'Chair' },
    {
      'asset-chair': {
        enabled: true,
        imageUrl: 'asset.png',
        fallbackIcon: 'A',
        name: 'Asset Chair'
      }
    },
    { isUsableImageUrl: value => value.endsWith('.png') }
  );

  assert.deepEqual(visual, {
    imageUrl: 'asset.png',
    fallbackIcon: 'A',
    alt: 'Asset Chair'
  });
}

function testDisabledAssetFallsBackToItemVisual() {
  const visual = resolveShopItemVisual(
    { itemId: 'chair-a', category: 'chair', assetId: 'asset-chair', imageUrl: 'item.png', name: 'Chair' },
    {
      'asset-chair': {
        enabled: false,
        imageUrl: 'asset.png',
        fallbackIcon: 'A',
        name: 'Asset Chair'
      }
    },
    {
      isUsableImageUrl: value => value.endsWith('.png'),
      getShopFallbackIcon: () => 'F'
    }
  );

  assert.deepEqual(visual, {
    imageUrl: 'item.png',
    fallbackIcon: 'F',
    alt: 'Asset Chair'
  });
}

function run() {
  testOwnedItemState();
  testPurchasableItemState();
  testShortCoinItemStateUsesFallbackEconomy();
  testEnabledAssetVisualWins();
  testDisabledAssetFallsBackToItemVisual();
  console.log('Domain tests passed: shop-domain');
}

run();
