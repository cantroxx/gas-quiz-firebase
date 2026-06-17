#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const DEFAULT_MANIFEST_PATH = path.join('public', 'images', 'room-assets', 'manifest.json');
const ROTATION_KEYS = ['0', '90', '180', '270'];

function parseArgs(argv) {
  const args = {
    dryRun: true,
    commit: false,
    manifestPath: DEFAULT_MANIFEST_PATH,
    sample: 0
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.commit = false;
      args.dryRun = true;
    } else if (arg === '--manifest') {
      args.manifestPath = argv[i + 1] || args.manifestPath;
      i += 1;
    } else if (arg === '--sample') {
      args.sample = Math.max(0, Number(argv[i + 1]) || 0);
      i += 1;
    }
  }
  return args;
}

function initializeAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: 'dj48-quiztown-firebase'
    });
  }
  return getFirestore();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeUrl(value) {
  const url = normalizeText(value);
  if (!url) return '';
  if (/^https:\/\//i.test(url)) return url;
  if (/^\//.test(url)) return url;
  throw new Error(`Only https:// or root-relative asset URLs are supported: ${url}`);
}

function normalizeRotationSprites(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return ROTATION_KEYS.reduce((next, key) => {
    next[key] = normalizeUrl(source[key]);
    return next;
  }, {});
}

function hasRotationSprites(rotationSprites = {}) {
  return ROTATION_KEYS.some(key => !!rotationSprites[key]);
}

function normalizeItem(raw = {}) {
  const id = normalizeText(raw.id || raw.itemId || raw.assetId);
  if (!/^room_[a-z0-9_-]+$/i.test(id)) {
    throw new Error(`Invalid room item id: ${id || '(empty)'}`);
  }
  const name = normalizeText(raw.name);
  if (!name) throw new Error(`Missing room item name: ${id}`);
  const cat = normalizeText(raw.cat || 'furniture');
  if (!['furniture', 'deco'].includes(cat)) throw new Error(`Invalid category for ${id}: ${cat}`);
  const renderType = normalizeText(raw.renderType || 'image') === 'draw' ? 'draw' : 'image';
  const assetUrl = normalizeUrl(raw.assetUrl);
  const thumbUrl = normalizeUrl(raw.thumbUrl);
  const rotationSprites = normalizeRotationSprites(raw.rotationSprites);
  if (renderType === 'image' && !assetUrl && !hasRotationSprites(rotationSprites)) {
    throw new Error(`Image room item requires assetUrl or rotationSprites: ${id}`);
  }
  const free = raw.free === true;
  const price = free ? 0 : Math.max(0, Math.round(Number(raw.price) || 0));
  if (!free && price <= 0) throw new Error(`Paid room item requires price: ${id}`);

  return {
    itemId: id,
    assetId: id,
    name,
    cat,
    renderType,
    drawKey: normalizeText(raw.drawKey),
    assetUrl,
    thumbUrl,
    rotationSprites,
    w: Math.max(1, Math.min(4, Math.round(Number(raw.w) || 1))),
    d: Math.max(1, Math.min(4, Math.round(Number(raw.d) || 1))),
    h: Math.max(1, Math.min(120, Math.round(Number(raw.h) || 30))),
    surface: normalizeText(raw.surface) === 'wall' ? 'wall' : '',
    wall: normalizeText(raw.wall) === 'right' ? 'right' : 'left',
    ww: Math.max(0, Math.min(8, Number(raw.ww || 0))),
    wh: Math.max(0, Math.min(104, Number(raw.wh || 0))),
    flat: raw.flat === true,
    free,
    price,
    enabled: raw.enabled !== false,
    sortOrder: Math.max(0, Math.min(9999, Math.round(Number(raw.sortOrder) || 100))),
    pixelWidth: Math.max(0, Math.min(1000, Math.round(Number(raw.pixelWidth) || 0))),
    pixelHeight: Math.max(0, Math.min(1000, Math.round(Number(raw.pixelHeight) || 0))),
    anchorX: Math.max(0, Math.min(1000, Math.round(Number(raw.anchorX) || 0))),
    anchorY: Math.max(0, Math.min(1000, Math.round(Number(raw.anchorY) || 0))),
    offsetX: Math.max(-500, Math.min(500, Math.round(Number(raw.offsetX) || 0))),
    offsetY: Math.max(-500, Math.min(500, Math.round(Number(raw.offsetY) || 0))),
    zIndexOffset: Math.max(-100, Math.min(100, Math.round(Number(raw.zIndexOffset) || 0)))
  };
}

function loadManifest(manifestPath) {
  const absolutePath = path.resolve(manifestPath);
  const data = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  const items = Array.isArray(data.items) ? data.items.map(normalizeItem) : [];
  if (!items.length) throw new Error(`Room asset manifest has no items: ${absolutePath}`);
  return { absolutePath, version: data.version || 1, style: data.style || '', items };
}

function buildAssetPayload(item) {
  return {
    type: 'roomFurniture',
    assetId: item.itemId,
    itemId: item.itemId,
    name: item.name,
    cat: item.cat,
    renderType: item.renderType,
    drawKey: item.drawKey,
    assetUrl: item.assetUrl,
    thumbUrl: item.thumbUrl,
    rotationSprites: item.rotationSprites,
    w: item.w,
    d: item.d,
    h: item.h,
    surface: item.surface,
    wall: item.surface === 'wall' ? item.wall : '',
    ww: item.surface === 'wall' ? item.ww : 0,
    wh: item.surface === 'wall' ? item.wh : 0,
    flat: item.flat,
    free: item.free,
    price: item.price,
    sortOrder: item.sortOrder,
    pixelWidth: item.pixelWidth,
    pixelHeight: item.pixelHeight,
    anchorX: item.anchorX,
    anchorY: item.anchorY,
    offsetX: item.offsetX,
    offsetY: item.offsetY,
    zIndexOffset: item.zIndexOffset,
    updatedAt: FieldValue.serverTimestamp()
  };
}

function buildShopPayload(item) {
  return {
    itemId: item.itemId,
    name: item.name,
    desc: '내 방 꾸미기에서 사용하는 이미지 기반 방 가구입니다.',
    price: item.price,
    priceType: 'djCoin',
    enabled: item.enabled,
    assetId: item.itemId,
    category: '방 가구',
    sortOrder: item.sortOrder,
    updatedAt: FieldValue.serverTimestamp()
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const manifest = loadManifest(args.manifestPath);
  const items = args.sample > 0 ? manifest.items.slice(0, args.sample) : manifest.items;
  console.log(`Room asset manifest: ${manifest.absolutePath}`);
  console.log(`Mode: ${args.dryRun ? 'dry-run' : 'commit'}, items: ${items.length}`);
  items.forEach(item => {
    console.log(`- ${item.itemId} (${item.name}) ${item.renderType} ${item.free ? 'free' : `${item.price} coin`}`);
  });

  if (args.dryRun) return;
  const db = initializeAdmin();
  const batch = db.batch();
  items.forEach(item => {
    batch.set(db.collection('assetCatalog').doc(item.itemId), buildAssetPayload(item), { merge: true });
    const shopRef = db.collection('shopItems').doc(item.itemId);
    if (item.free) {
      batch.delete(shopRef);
    } else {
      batch.set(shopRef, buildShopPayload(item), { merge: true });
    }
  });
  await batch.commit();
  console.log(`Seeded ${items.length} room asset catalog items.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
