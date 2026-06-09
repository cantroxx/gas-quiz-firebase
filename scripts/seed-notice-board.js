const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = {
    dryRun: true,
    commit: false
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.commit = false;
      args.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function initializeAdminApp() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const notice = {
    title: '알림판',
    desc: '공지와 오늘 추천 활동을 확인하고 바로 이동할 수 있습니다.',
    summary: '관리자 공지, 오늘의 퀘스트, 이벤트 추천 퀴즈를 보여주는 타운 알림판입니다.',
    announcement: '오늘도 연습전과 랭킹전을 자유롭게 이용할 수 있어요.',
    quest: '이벤트 광장에서 개인 미션을 확인하세요.',
    recommendedQuizLabel: '학교에서 과목관을 골라 바로 시작하세요.',
    recommendedQuizId: '',
    active: true
  };

  console.log(JSON.stringify({ path: 'noticeBoard/current', notice }, null, 2));
  if (!args.commit || args.dryRun) {
    console.log('No Firestore writes performed. Re-run with --commit to seed.');
    return;
  }

  initializeAdminApp();
  const db = admin.firestore();
  await db.collection('noticeBoard').doc('current').set({
    ...notice,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedByAdminUserId: 'seed-notice-board'
  }, { merge: true });
  console.log('Seeded noticeBoard/current.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
