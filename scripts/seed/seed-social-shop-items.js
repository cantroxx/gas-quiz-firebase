const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_PROJECT_ID = 'dj48-quiztown-firebase';

const SHOP_ITEMS = [
  {
    itemId: 'chalk_nameplate_frame',
    assetId: 'asset_chalk_nameplate_frame',
    category: 'titleFrame',
    name: '칠판 이름표',
    desc: '랭킹과 프로필에서 대표 칭호를 칠판 느낌으로 보여주는 이름표입니다.',
    price: 160,
    priceType: 'djCoin',
    rarity: 'common',
    enabled: true,
    sortOrder: 810
  },
  {
    itemId: 'notebook_nameplate_frame',
    assetId: 'asset_notebook_nameplate_frame',
    category: 'titleFrame',
    name: '공책 이름표',
    desc: '대표 칭호에 공책 라벨 같은 깔끔한 테두리를 더합니다.',
    price: 180,
    priceType: 'djCoin',
    rarity: 'common',
    enabled: true,
    sortOrder: 820
  },
  {
    itemId: 'starlight_nameplate_frame',
    assetId: 'asset_starlight_nameplate_frame',
    category: 'titleFrame',
    name: '별빛 이름표',
    desc: '랭킹에서 대표 칭호를 반짝이는 별빛 분위기로 보여줍니다.',
    price: 320,
    priceType: 'djCoin',
    rarity: 'rare',
    enabled: true,
    sortOrder: 830
  },
  {
    itemId: 'honor_nameplate_frame',
    assetId: 'asset_honor_nameplate_frame',
    category: 'titleFrame',
    name: '명예의 전당 이름표',
    desc: '상위 랭킹에 어울리는 묵직한 명예 배지를 대표 칭호에 붙입니다.',
    price: 520,
    priceType: 'djCoin',
    rarity: 'epic',
    enabled: true,
    sortOrder: 840
  }
];

const ASSETS = [
  {
    assetId: 'asset_chalk_nameplate_frame',
    type: 'titleFrame',
    name: '칠판 이름표',
    fallbackIcon: '▰',
    enabled: true
  },
  {
    assetId: 'asset_notebook_nameplate_frame',
    type: 'titleFrame',
    name: '공책 이름표',
    fallbackIcon: '▣',
    enabled: true
  },
  {
    assetId: 'asset_starlight_nameplate_frame',
    type: 'titleFrame',
    name: '별빛 이름표',
    fallbackIcon: '✦',
    enabled: true
  },
  {
    assetId: 'asset_honor_nameplate_frame',
    type: 'titleFrame',
    name: '명예의 전당 이름표',
    fallbackIcon: '◆',
    enabled: true
  }
];

function parseArgs(argv) {
  return argv.slice(2).reduce((args, arg) => {
    if (arg === '--commit') return { ...args, commit: true };
    if (arg === '--dry-run') return { ...args, commit: false };
    throw new Error(`Unknown argument: ${arg}`);
  }, { commit: false });
}

function getFirebaseToolsAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const accessToken = config?.tokens?.access_token;
  if (!accessToken) throw new Error('Firebase CLI access token not found. Run firebase login first.');
  return accessToken;
}

function toFirestoreValue(value) {
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  return { stringValue: String(value || '') };
}

function toFirestoreDocument(data) {
  return {
    fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]))
  };
}

async function patchFirestoreDocument({ projectId, accessToken, documentPath, data }) {
  const updateMask = Object.keys(data)
    .map(field => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}?${updateMask}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(toFirestoreDocument(data))
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore PATCH failed for ${documentPath}: ${response.status} ${text}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const paths = [
    ...SHOP_ITEMS.map(item => `shopItems/${item.itemId}`),
    ...ASSETS.map(asset => `assetCatalog/${asset.assetId}`)
  ];

  console.log(`${args.commit ? 'COMMIT' : 'DRY RUN'} social shop item seed`);
  paths.forEach(path => console.log(`- ${path}`));

  if (!args.commit) {
    console.log('No writes performed. Re-run with --commit to write Firestore documents.');
    return;
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID;
  const accessToken = getFirebaseToolsAccessToken();
  const now = new Date().toISOString();
  const writes = [
    ...SHOP_ITEMS.map(item => ({
      path: `shopItems/${item.itemId}`,
      data: {
        ...item,
        updatedAt: now,
        seedSource: 'seed-social-shop-items'
      }
    })),
    ...ASSETS.map(asset => ({
      path: `assetCatalog/${asset.assetId}`,
      data: {
        storagePath: '',
        imageUrl: '',
        ...asset,
        updatedAt: now,
        seedSource: 'seed-social-shop-items'
      }
    }))
  ];
  for (const write of writes) {
    await patchFirestoreDocument({
      projectId,
      accessToken,
      documentPath: write.path,
      data: write.data
    });
  }
  console.log(`Seeded ${writes.length} Firestore documents.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
