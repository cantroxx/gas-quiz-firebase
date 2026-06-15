const crypto = require('crypto');
const admin = require('firebase-admin');

const DEFAULT_MEMBER_SCHOOL = '동자';
const PASSWORD_HASH_ITERATIONS = 210000;
const PASSWORD_HASH_KEY_LENGTH = 32;

function parseArgs(argv) {
  const args = {
    dryRun: true,
    commit: false,
    school: DEFAULT_MEMBER_SCHOOL,
    grade: 9,
    classNumber: 9,
    studentNumber: 99,
    password: '',
    adminLevel: 'teacherAdmin',
    claimsOnly: false,
    resetPassword: true
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.commit = false;
      args.dryRun = true;
    } else if (arg === '--school') {
      index += 1;
      args.school = argv[index] || DEFAULT_MEMBER_SCHOOL;
    } else if (arg === '--grade') {
      index += 1;
      args.grade = Number(argv[index]) || args.grade;
    } else if (arg === '--class') {
      index += 1;
      args.classNumber = Number(argv[index]) || args.classNumber;
    } else if (arg === '--number') {
      index += 1;
      args.studentNumber = Number(argv[index]) || args.studentNumber;
    } else if (arg === '--password') {
      index += 1;
      args.password = argv[index] || '';
    } else if (arg === '--admin-level') {
      index += 1;
      args.adminLevel = argv[index] || args.adminLevel;
    } else if (arg === '--claims-only') {
      args.claimsOnly = true;
      args.resetPassword = false;
    } else if (arg === '--no-reset-password') {
      args.resetPassword = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  args.password = args.password || `${args.grade}${args.classNumber}${String(args.studentNumber).padStart(2, '0')}`;
  if (args.resetPassword && String(args.password).length < 4) throw new Error('Admin password must be at least 4 characters.');
  return args;
}

function normalizeLegacyMemberSchool(school) {
  const value = String(school || '').trim();
  if (!value) return DEFAULT_MEMBER_SCHOOL;
  const normalized = value
    .replace(/^서울/, '')
    .replace(/초등학교$/, '')
    .replace(/초$/, '')
    .trim();
  return normalized || DEFAULT_MEMBER_SCHOOL;
}

function buildLegacyMemberUserId(school, grade, classNumber, studentNumber) {
  const normalizedSchool = normalizeLegacyMemberSchool(school);
  const baseUserId = `G${grade}-C${classNumber}-N${String(studentNumber).padStart(2, '0')}`;
  if (normalizedSchool === DEFAULT_MEMBER_SCHOOL) return baseUserId;
  const schoolKey = normalizedSchool.replace(/[^0-9A-Za-z가-힣_-]/g, '');
  return schoolKey ? `S${schoolKey}-${baseUserId}` : baseUserId;
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    passwordSalt: salt,
    passwordHash: crypto
      .pbkdf2Sync(password, salt, PASSWORD_HASH_ITERATIONS, PASSWORD_HASH_KEY_LENGTH, 'sha256')
      .toString('hex'),
    passwordHashAlgorithm: 'pbkdf2_sha256',
    passwordHashIterations: PASSWORD_HASH_ITERATIONS,
    passwordVersion: 1
  };
}

function initializeAdminApp() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const memberUserId = buildLegacyMemberUserId(args.school, args.grade, args.classNumber, args.studentNumber);
  console.log(`Target admin member: ${memberUserId}`);
  console.log(`Temporary password: ${args.password}`);
  console.log(`Admin level: ${args.adminLevel}`);
  console.log(`Claims only: ${args.claimsOnly}`);
  console.log(`Reset password: ${args.resetPassword}`);

  initializeAdminApp();
  const db = admin.firestore();
  const memberRef = db.collection('users').doc(memberUserId);
  const credentialsRef = db.collection('memberCredentials').doc(memberUserId);
  const memberSnapshot = await memberRef.get();
  const existing = memberSnapshot.exists ? memberSnapshot.data() || {} : {};

  console.log(JSON.stringify({
    exists: memberSnapshot.exists,
    currentRole: existing.role || '',
    currentStatus: existing.status || '',
    authUid: existing.authUid || ''
  }, null, 2));

  if (!args.commit || args.dryRun) {
    console.log('No writes performed. Re-run with --commit to grant admin.');
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  if (!args.claimsOnly) {
    await memberRef.set({
      userId: memberUserId,
      legacyMemberId: existing.legacyMemberId || memberUserId,
      school: normalizeLegacyMemberSchool(args.school),
      grade: existing.grade || args.grade,
      classNumber: existing.classNumber || args.classNumber,
      studentNumber: existing.studentNumber || args.studentNumber,
      nickname: existing.nickname || existing.name || '관리자',
      role: 'admin',
      adminLevel: args.adminLevel,
      status: 'active',
      active: true,
      updatedAt: now,
      adminGrantedAt: now,
      adminGrantSource: 'grant-admin-member-script'
    }, { merge: true });
  }

  if (args.resetPassword) {
    await credentialsRef.set({
      memberUserId,
      ...createPasswordHash(args.password),
      forcePasswordChange: true,
      failedAttempts: 0,
      lockedUntil: null,
      resetAt: now,
      updatedAt: now,
      updatedBy: 'grant-admin-member-script'
    }, { merge: true });
  }

  if (existing.authUid) {
    await admin.auth().setCustomUserClaims(existing.authUid, {
      admin: true,
      adminLevel: args.adminLevel,
      memberUserId
    });
    console.log(`Custom claims set for authUid ${existing.authUid}.`);
  } else {
    console.log('No authUid is linked yet. Custom claims will need to be set after first admin login if direct admin Rules access is needed.');
  }

  console.log(`Admin grant script completed for ${memberUserId}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
