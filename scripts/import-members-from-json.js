const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_INPUT_PATH = path.join(process.cwd(), 'member-export.json');
const USERS_COLLECTION = 'users';
const PASSWORD_FIELD_NAMES = new Set([
  'password',
  '비밀번호',
  'initialPassword',
  'plainPassword',
  'passwordHash'
]);

function parseArgs(argv) {
  const args = {
    inputPath: DEFAULT_INPUT_PATH,
    dryRun: true,
    commit: false,
    limitSample: 3
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      args.dryRun = true;
      args.commit = false;
    } else if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--input') {
      index += 1;
      if (!argv[index]) throw new Error('--input requires a file path.');
      args.inputPath = path.resolve(process.cwd(), argv[index]);
    } else if (arg.startsWith('--input=')) {
      args.inputPath = path.resolve(process.cwd(), arg.slice('--input='.length));
    } else if (arg === '--sample') {
      index += 1;
      args.limitSample = Number(argv[index] || 3);
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

function readMemberExport(inputPath) {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const parsed = JSON.parse(raw);
  const members = Array.isArray(parsed) ? parsed : parsed.members;
  if (!Array.isArray(members)) {
    throw new Error('Input JSON must be an array or an object with a members array.');
  }
  return members;
}

function valueFrom(source, names, fallback = '') {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(source, name) && source[name] !== undefined && source[name] !== null) {
      return source[name];
    }
  }
  return fallback;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const normalized = normalizeString(value).toLowerCase();
  if (['true', '1', 'y', 'yes', 'active', '활성', '사용'].includes(normalized)) return true;
  if (['false', '0', 'n', 'no', 'inactive', '비활성', '중지'].includes(normalized)) return false;
  return fallback;
}

function normalizeRole(value) {
  return normalizeString(value).toLowerCase() === 'admin' ? 'admin' : 'student';
}

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

function deriveUserId(member) {
  const explicit = normalizeString(valueFrom(member, ['userId', 'legacyMemberId', '회원ID', '학생ID']));
  if (explicit) return explicit;

  const grade = normalizeString(valueFrom(member, ['grade', '학년']));
  const classNumber = normalizeString(valueFrom(member, ['classNumber', 'classNo', 'class', '반']));
  const studentNumber = normalizeString(valueFrom(member, ['studentNumber', 'number', 'num', '번호']));
  if (!grade || !classNumber || !studentNumber) return '';

  const paddedNumber = String(Number(studentNumber)).padStart(2, '0');
  if (paddedNumber === 'NaN') return '';
  return `G${Number(grade)}-C${Number(classNumber)}-N${paddedNumber}`;
}

function toFirestoreTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return admin.firestore.Timestamp.fromDate(value);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(parsed);
}

function hasPasswordField(member) {
  return Object.keys(member).some(key => PASSWORD_FIELD_NAMES.has(key));
}

function removePasswordFields(member) {
  const next = { ...member };
  PASSWORD_FIELD_NAMES.forEach(name => {
    if (Object.prototype.hasOwnProperty.call(next, name)) delete next[name];
  });
  return next;
}

function transformMember(rawMember) {
  if (!rawMember || typeof rawMember !== 'object') {
    throw new Error('Each member must be an object.');
  }

  const member = removePasswordFields(rawMember);
  const userId = deriveUserId(rawMember);
  if (!userId) throw new Error('Member is missing userId and identity fields.');

  const status = normalizeStatus(valueFrom(member, ['status', '상태'], 'active'));
  const role = normalizeRole(valueFrom(member, ['role', '권한'], 'student'));
  const active = normalizeBoolean(valueFrom(member, ['active', '사용여부'], status === 'active'), status === 'active');
  const createdAt = toFirestoreTimestamp(valueFrom(member, ['createdAt', 'created_at', '생성일시']));
  const updatedAt = toFirestoreTimestamp(valueFrom(member, ['updatedAt', 'updated_at', 'lastLoginAt', '최근로그인일시', '최근수정일시']));
  const serverTime = admin.firestore.FieldValue.serverTimestamp();
  const authUid = normalizeString(valueFrom(member, ['authUid'], ''));

  const userDocument = {
    userId,
    legacyMemberId: normalizeString(valueFrom(member, ['legacyMemberId', 'userId', '회원ID', '학생ID'], userId)) || userId,
    school: normalizeString(valueFrom(member, ['school', '학교'])),
    grade: normalizeString(valueFrom(member, ['grade', '학년'])),
    classNumber: normalizeString(valueFrom(member, ['classNumber', 'classNo', 'class', '반'])),
    studentNumber: normalizeString(valueFrom(member, ['studentNumber', 'number', 'num', '번호'])),
    name: normalizeString(valueFrom(member, ['name', '이름'])),
    nickname: normalizeString(valueFrom(member, ['nickname', '닉네임'])),
    role,
    active,
    status,
    passwordMode: normalizeString(valueFrom(member, ['passwordMode'])) || (hasPasswordField(rawMember) ? 'legacy_password_excluded' : 'migration_required'),
    initialPasswordChanged: normalizeBoolean(valueFrom(member, ['initialPasswordChanged'], false), false),
    profileImageUrl: normalizeString(valueFrom(member, ['profileImageUrl', '프로필이미지URL'])),
    selectedTitleId: normalizeString(valueFrom(member, ['selectedTitleId', 'selectedTitle', '선택타이틀'])),
    rankingMessage: normalizeString(valueFrom(member, ['rankingMessage', '랭킹한마디'])),
    createdAt: createdAt || serverTime,
    updatedAt: updatedAt || serverTime,
    migratedAt: serverTime
  };

  // Preserve an existing users/{userId}.authUid mapping unless the export explicitly provides one.
  if (authUid) userDocument.authUid = authUid;
  return userDocument;
}

function summarizeForDryRun(users, sampleLimit) {
  const roleCounts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});
  const statusCounts = users.reduce((acc, user) => {
    acc[user.status] = (acc[user.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`Dry run: ${users.length} users would be imported into ${USERS_COLLECTION}.`);
  console.log('Role counts:', JSON.stringify(roleCounts));
  console.log('Status counts:', JSON.stringify(statusCounts));
  console.log('Sample documents:');
  users.slice(0, Math.max(0, sampleLimit)).forEach(user => {
    const printable = {
      ...user,
      createdAt: '[Timestamp]',
      updatedAt: '[Timestamp]',
      migratedAt: '[serverTimestamp]'
    };
    console.log(JSON.stringify(printable, null, 2));
  });
}

async function commitUsers(users) {
  initializeAdminApp();
  const db = admin.firestore();
  let batch = db.batch();
  let pending = 0;
  let committed = 0;

  for (const user of users) {
    const ref = db.collection(USERS_COLLECTION).doc(user.userId);
    batch.set(ref, user, { merge: true });
    pending += 1;

    if (pending === 450) {
      await batch.commit();
      committed += pending;
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) {
    await batch.commit();
    committed += pending;
  }

  console.log(`Imported ${committed} users into ${USERS_COLLECTION}.`);
}

async function main() {
  const args = parseArgs(process.argv);
  const rawMembers = readMemberExport(args.inputPath);
  const users = rawMembers.map(transformMember);

  if (args.dryRun || !args.commit) {
    summarizeForDryRun(users, args.limitSample);
    console.log('No Firestore writes were performed. Use --commit to import.');
    return;
  }

  await commitUsers(users);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
