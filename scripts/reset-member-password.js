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
    grade: '',
    classNumber: '',
    studentNumber: '',
    password: ''
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      args.dryRun = true;
      args.commit = false;
    } else if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--school') {
      index += 1;
      args.school = argv[index] || DEFAULT_MEMBER_SCHOOL;
    } else if (arg === '--grade') {
      index += 1;
      args.grade = argv[index] || '';
    } else if (arg === '--class') {
      index += 1;
      args.classNumber = argv[index] || '';
    } else if (arg === '--number') {
      index += 1;
      args.studentNumber = argv[index] || '';
    } else if (arg === '--password') {
      index += 1;
      args.password = argv[index] || '';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const grade = Number(args.grade);
  const classNumber = Number(args.classNumber);
  const studentNumber = Number(args.studentNumber);
  if (!grade || !classNumber || !studentNumber) {
    throw new Error('--grade, --class, and --number are required positive numbers.');
  }
  args.grade = grade;
  args.classNumber = classNumber;
  args.studentNumber = studentNumber;
  args.password = args.password || `${grade}${classNumber}${studentNumber}`;
  if (String(args.password).length < 4) {
    throw new Error('Temporary password must be at least 4 characters.');
  }
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
  const temporaryPassword = String(args.password);
  console.log(`Target member: ${memberUserId}`);
  console.log(`Temporary password: ${temporaryPassword}`);
  console.log('forcePasswordChange: true');

  if (!args.commit || args.dryRun) {
    console.log('No Firestore writes were performed. Use --commit to reset this member password.');
    return;
  }

  initializeAdminApp();
  const db = admin.firestore();
  const memberRef = db.collection('users').doc(memberUserId);
  const credentialsRef = db.collection('memberCredentials').doc(memberUserId);
  const memberSnapshot = await memberRef.get();
  if (!memberSnapshot.exists) {
    throw new Error(`Member not found: ${memberUserId}`);
  }

  await credentialsRef.set({
    memberUserId,
    ...createPasswordHash(temporaryPassword),
    forcePasswordChange: true,
    failedAttempts: 0,
    lockedUntil: null,
    resetAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'reset-member-password'
  }, { merge: true });
  console.log(`Reset memberCredentials/${memberUserId}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
