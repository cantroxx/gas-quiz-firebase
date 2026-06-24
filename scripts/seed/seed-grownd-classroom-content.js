#!/usr/bin/env node
'use strict';

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const DEFAULT_CLASS_ID = 'G4-C8';

const GEMSTONES = [
  { gemId: 'reading-gem', gemName: '독서젬', targetXp: 10, icon: 'gemReading' },
  { gemId: 'shining-reading-gem', gemName: '빛나는 독서젬', targetXp: 20, icon: 'gemReading' },
  { gemId: 'brilliant-reading-gem', gemName: '찬란한 독서젬', targetXp: 35, icon: 'gemReading' },
  { gemId: 'planner-gem', gemName: '플래너젬', targetXp: 10, icon: 'gemDiligence' },
  { gemId: 'shining-planner-gem', gemName: '빛나는 플래너젬', targetXp: 20, icon: 'gemDiligence' },
  { gemId: 'meal-gem', gemName: '맛있는젬', targetXp: 8, icon: 'gemKindness' },
  { gemId: 'perfect-score-gem', gemName: '백점젬', targetXp: 10, icon: 'gemChallenge' },
  { gemId: 'typing-gem', gemName: '타자젬', targetXp: 10, icon: 'gemFocus' },
  { gemId: 'advanced-typing-gem', gemName: '고수 타자젬', targetXp: 25, icon: 'gemFocus' },
  { gemId: 'teamwork-gem', gemName: '협동젬', targetXp: 12, icon: 'gemTeamwork' },
  { gemId: 'kindness-gem', gemName: '친절젬', targetXp: 12, icon: 'gemKindness' },
  { gemId: 'presentation-gem', gemName: '발표젬', targetXp: 10, icon: 'gemSpeech' }
];

const SHOP_ITEMS = [
  {
    itemId: 'homework-pass',
    title: '숙제 면제권',
    desc: '정해진 날 숙제 1회를 면제받는 교실 쿠폰',
    pricePoint: 60,
    priceType: 'point',
    itemType: 'coupon',
    icon: 'shopHomeworkPass'
  },
  {
    itemId: 'seat-choice',
    title: '자리 선택권',
    desc: '하루 동안 원하는 자리를 먼저 고를 수 있는 쿠폰',
    pricePoint: 120,
    priceType: 'point',
    itemType: 'coupon',
    icon: 'shopSeatChoice'
  },
  {
    itemId: 'praise-card',
    title: '칭찬 카드',
    desc: '선생님의 칭찬 카드 또는 게시판 칭찬을 받을 수 있는 쿠폰',
    pricePoint: 50,
    priceType: 'point',
    itemType: 'coupon',
    icon: 'shopPraiseCard'
  },
  {
    itemId: 'presentation-pass',
    title: '발표 순서 조정권',
    desc: '발표 순서를 한 번 조정할 수 있는 쿠폰',
    pricePoint: 80,
    priceType: 'point',
    itemType: 'coupon',
    icon: 'shopPresentationPass'
  },
  {
    itemId: 'helper-ticket',
    title: '도우미 우선권',
    desc: '원하는 교실 도우미 역할에 먼저 지원할 수 있는 쿠폰',
    pricePoint: 90,
    priceType: 'point',
    itemType: 'coupon',
    icon: 'shopHelperTicket'
  },
  {
    itemId: 'music-coupon',
    title: '음악 신청권',
    desc: '쉬는 시간 또는 정해진 시간에 들을 음악을 신청하는 쿠폰',
    pricePoint: 70,
    priceType: 'point',
    itemType: 'coupon',
    icon: 'shopMusicCoupon'
  },
  {
    itemId: 'free-time',
    title: '자유시간권',
    desc: '교실 규칙 안에서 짧은 자유시간을 요청할 수 있는 쿠폰',
    pricePoint: 180,
    priceType: 'point',
    itemType: 'coupon',
    icon: 'shopFreeTime'
  },
  {
    itemId: 'mini-badge',
    title: '미니 배지 제작권',
    desc: '학생카드에 전시할 작은 배지를 신청하는 쿠폰',
    pricePoint: 140,
    priceType: 'point',
    itemType: 'coupon',
    icon: 'shopMiniBadge'
  },
  {
    itemId: 'billboard-ticket',
    title: '전광판 한마디권',
    desc: '우리반 게시판 전광판에 한마디를 올릴 수 있는 쿠폰',
    pricePoint: 40,
    priceType: 'point',
    itemType: 'billboardTicket',
    icon: 'billboard'
  },
  {
    itemId: 'boost-farmer-friend',
    title: '허수아비 친구',
    desc: '교실 포인트를 받을 때마다 +0.35P를 더 받습니다.',
    priceCoin: 35,
    priceType: 'djCoin',
    itemType: 'pointBoost',
    boostPoint: 0.35,
    icon: 'boost-farmer-friend'
  },
  {
    itemId: 'boost-big-tree',
    title: '잎이 무성한 나무',
    desc: '교실 포인트를 받을 때마다 +0.40P를 더 받습니다.',
    priceCoin: 40,
    priceType: 'djCoin',
    itemType: 'pointBoost',
    boostPoint: 0.4,
    icon: 'boost-big-tree'
  },
  {
    itemId: 'effect-star-classroom',
    title: '별빛 교실 효과',
    desc: '교실 포인트를 받을 때마다 +0.50P를 더 받는 장식 효과',
    priceCoin: 80,
    priceType: 'djCoin',
    itemType: 'pointBoostEffect',
    boostPoint: 0.5,
    icon: 'effect-star-classroom'
  }
];

const JOBS = [
  { jobId: 'board-manager', title: '게시판 관리자', desc: '학급 게시판과 공지 확인을 돕습니다.', weeklyPayPoint: 15, maxAssignees: 2 },
  { jobId: 'library-helper', title: '도서 도우미', desc: '교실 책 정리와 독서 활동 준비를 돕습니다.', weeklyPayPoint: 15, maxAssignees: 2 },
  { jobId: 'clean-desk-leader', title: '정리 리더', desc: '책상 정리와 교실 환경 확인을 돕습니다.', weeklyPayPoint: 12, maxAssignees: 3 },
  { jobId: 'tech-helper', title: '기기 도우미', desc: '수업 기기 준비와 정리를 돕습니다.', weeklyPayPoint: 18, maxAssignees: 2 },
  { jobId: 'mission-reporter', title: '미션 리포터', desc: '학급 미션 진행 상황을 친구들에게 알려 줍니다.', weeklyPayPoint: 14, maxAssignees: 2 },
  { jobId: 'kindness-captain', title: '친절 대장', desc: '친구 칭찬과 배려 활동을 발견해 알려 줍니다.', weeklyPayPoint: 14, maxAssignees: 2 }
];

const MISSION = {
  missionId: 'current',
  title: '우리반 공동 미션',
  desc: '우리반이 함께 모은 포인트로 단계별 보상을 달성합니다.',
  thresholds: [
    { label: '2,000점', targetPoint: 2000, rewardText: '10분 자유 활동' },
    { label: '4,000점', targetPoint: 4000, rewardText: '학급 놀이 1회' },
    { label: '6,000점', targetPoint: 6000, rewardText: '자리 바꾸기 이벤트' },
    { label: '8,000점', targetPoint: 8000, rewardText: '영화/영상 감상 시간' },
    { label: '10,000점', targetPoint: 10000, rewardText: '학급 파티 또는 특별 활동' },
    { label: '15,000점', targetPoint: 15000, rewardText: '선생님과 협의하는 최고 보상' }
  ],
  active: true
};

function parseArgs(argv) {
  const args = { commit: false, classId: DEFAULT_CLASS_ID, sample: 6 };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
    else if (arg === '--class-id') args.classId = String(argv[++index] || DEFAULT_CLASS_ID).trim();
    else if (arg === '--sample') args.sample = Number(argv[++index]) || args.sample;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function initializeAdminApp() {
  if (!getApps().length) initializeApp({ credential: applicationDefault() });
}

function withCommonFields(item) {
  return {
    ...item,
    active: item.active !== false,
    source: 'seed_grownd_classroom_content',
    updatedAt: FieldValue.serverTimestamp()
  };
}

async function writeCollectionBatch(db, classId, collectionName, idField, items) {
  const batch = db.batch();
  const classRef = db.collection('classrooms').doc(classId);
  items.forEach(item => {
    batch.set(classRef.collection(collectionName).doc(item[idField]), {
      ...withCommonFields(item),
      classId
    }, { merge: true });
  });
  await batch.commit();
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = getFirestore();
  const summary = {
    commit: args.commit,
    classId: args.classId,
    gemstones: GEMSTONES.length,
    shopItems: SHOP_ITEMS.length,
    jobs: JOBS.length,
    missionThresholds: MISSION.thresholds.length,
    sample: {
      gemstones: GEMSTONES.slice(0, args.sample),
      shopItems: SHOP_ITEMS.slice(0, args.sample),
      jobs: JOBS.slice(0, args.sample),
      mission: MISSION
    }
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!args.commit) {
    console.log('No writes performed. Re-run with --commit to seed Grownd classroom content.');
    return;
  }
  await writeCollectionBatch(db, args.classId, 'classroomGems', 'gemId', GEMSTONES.map(item => ({ ...item, rewardPoint: 0 })));
  await writeCollectionBatch(db, args.classId, 'shopItems', 'itemId', SHOP_ITEMS);
  await writeCollectionBatch(db, args.classId, 'jobs', 'jobId', JOBS);
  await db.collection('classrooms').doc(args.classId).collection('classMissions').doc('current').set({
    ...MISSION,
    classId: args.classId,
    source: 'seed_grownd_classroom_content',
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  console.log(`Seeded Grownd classroom content for ${args.classId}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
