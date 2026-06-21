const fs = require('fs');
const os = require('os');
const path = require('path');

const CLASS_ID = 'G4-C8';
const DEFAULT_PROJECT_ID = 'dj48-quiztown-firebase';

const SHOP_ITEMS = [
  {
    itemId: 'snack-coupon',
    title: '간식',
    desc: '간단한 젤리같은 간식',
    priceBerry: 15,
    stock: 791,
    itemType: 'coupon',
    icon: '🍌',
    sortOrder: 10
  },
  {
    itemId: 'bring-toy',
    title: '장난감 가져오기',
    desc: '원하는 장난감 1가지 가져오기',
    priceBerry: 30,
    stock: 4,
    itemType: 'coupon',
    icon: '🧸',
    sortOrder: 20
  },
  {
    itemId: 'open-shop',
    title: '상점 개설권',
    desc: '원하는 물품 1가지 판매할 수 있음',
    priceBerry: 10,
    stock: 7,
    itemType: 'coupon',
    icon: '🛒',
    sortOrder: 30
  },
  {
    itemId: 'lunch-dj',
    title: '점심 시간 노래 DJ',
    desc: '점심 시간 노래 들기권',
    priceBerry: 50,
    stock: 2,
    itemType: 'coupon',
    icon: '🎧',
    sortOrder: 40
  },
  {
    itemId: 'homework-pass',
    title: '숙제 면제권',
    desc: '숙제 한번 면제권',
    priceBerry: 100,
    stock: 1,
    itemType: 'coupon',
    icon: '💳',
    sortOrder: 50
  },
  {
    itemId: 'lunch-order',
    title: '급식 순서 정하기',
    desc: '급식 순서를 하루 마음대로 정하기',
    priceBerry: 200,
    stock: 9,
    itemType: 'coupon',
    icon: '👥',
    sortOrder: 60
  },
  {
    itemId: 'seat-change',
    title: '자리 바꾸기',
    desc: '나 포함 4명까지 일주일동안 바꾸기',
    priceBerry: 200,
    stock: 8,
    itemType: 'coupon',
    icon: '📝',
    sortOrder: 70
  }
];

function parseArgs(argv) {
  const args = {
    commit: false,
    classId: CLASS_ID
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') {
      args.commit = true;
    } else if (arg === '--dry-run') {
      args.commit = false;
    } else if (arg === '--class-id') {
      args.classId = argv[index + 1] || args.classId;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
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
  const writes = SHOP_ITEMS.map(item => ({
    path: `classrooms/${args.classId}/shopItems/${item.itemId}`,
    data: {
      ...item,
      classId: args.classId,
      active: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'seed-classroom-shop-items',
      seedSource: 'seed-classroom-shop-items'
    }
  }));

  console.log(`${args.commit ? 'COMMIT' : 'DRY RUN'} classroom shop item seed`);
  writes.forEach(write => {
    console.log(`- ${write.path}: ${write.data.title} / ${write.data.priceBerry}포인트 / 재고 ${write.data.stock}`);
  });

  if (!args.commit) {
    console.log('No Firestore writes performed. Re-run with --commit to seed.');
    return;
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID;
  const accessToken = getFirebaseToolsAccessToken();
  for (const write of writes) {
    await patchFirestoreDocument({
      projectId,
      accessToken,
      documentPath: write.path,
      data: write.data
    });
  }
  console.log(`Seeded ${writes.length} classroom shop items.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
