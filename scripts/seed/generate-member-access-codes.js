const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

const USERS_COLLECTION = 'users';
const ACCESS_CODES_COLLECTION = 'memberAccessCodes';
const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), 'private', 'member-access-codes.csv');
const DEFAULT_CODE_LENGTH = 8;
const DEFAULT_MAX_FAILED_ATTEMPTS = 5;

function parseArgs(argv) {
  const args = {
    dryRun: true,
    commit: false,
    outputPath: DEFAULT_OUTPUT_PATH,
    memberIds: [],
    grade: '',
    classNumber: '',
    codeLength: DEFAULT_CODE_LENGTH,
    expiresDays: 0,
    maxFailedAttempts: DEFAULT_MAX_FAILED_ATTEMPTS,
    oneTime: false,
    force: false,
    sample: 5
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      args.dryRun = true;
      args.commit = false;
    } else if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--output') {
      index += 1;
      if (!argv[index]) throw new Error('--output requires a file path.');
      args.outputPath = path.resolve(process.cwd(), argv[index]);
    } else if (arg.startsWith('--output=')) {
      args.outputPath = path.resolve(process.cwd(), arg.slice('--output='.length));
    } else if (arg === '--member') {
      index += 1;
      if (!argv[index]) throw new Error('--member requires a memberUserId.');
      args.memberIds.push(argv[index]);
    } else if (arg.startsWith('--member=')) {
      args.memberIds.push(arg.slice('--member='.length));
    } else if (arg === '--grade') {
      index += 1;
      args.grade = String(argv[index] || '').trim();
    } else if (arg === '--class') {
      index += 1;
      args.classNumber = String(argv[index] || '').trim();
    } else if (arg === '--length') {
      index += 1;
      args.codeLength = Number(argv[index] || DEFAULT_CODE_LENGTH);
    } else if (arg === '--expires-days') {
      index += 1;
      args.expiresDays = Number(argv[index] || 0);
    } else if (arg === '--max-failed-attempts') {
      index += 1;
      args.maxFailedAttempts = Number(argv[index] || DEFAULT_MAX_FAILED_ATTEMPTS);
    } else if (arg === '--one-time') {
      args.oneTime = true;
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg === '--sample') {
      index += 1;
      args.sample = Number(argv[index] || 5);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.codeLength) || args.codeLength < 6 || args.codeLength > 32) {
    throw new Error('--length must be an integer between 6 and 32.');
  }
  if (!Number.isFinite(args.expiresDays) || args.expiresDays < 0) {
    throw new Error('--expires-days must be 0 or a positive number.');
  }
  if (!Number.isInteger(args.maxFailedAttempts) || args.maxFailedAttempts < 1) {
    throw new Error('--max-failed-attempts must be a positive integer.');
  }

  return args;
}

function initializeAdminApp() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

function randomAccessCode(length) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }
  return code;
}

function hashAccessCode(accessCode, salt) {
  return crypto
    .createHash('sha256')
    .update(`${String(salt || '')}:${accessCode}`, 'utf8')
    .digest('hex');
}

function maskCode(code) {
  if (!code) return '';
  if (code.length <= 4) return '*'.repeat(code.length);
  return `${code.slice(0, 2)}${'*'.repeat(code.length - 4)}${code.slice(-2)}`;
}

function csvValue(value) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
  const headers = [
    'memberUserId',
    'school',
    'grade',
    'classNumber',
    'studentNumber',
    'nickname',
    'accessCode',
    'expiresAt'
  ];
  const lines = [headers.join(',')];
  rows.forEach(row => {
    lines.push(headers.map(header => csvValue(row[header])).join(','));
  });
  return `${lines.join('\n')}\n`;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function isActiveStudent(user) {
  return user
    && user.role === 'student'
    && user.status === 'active'
    && user.active === true;
}

function matchesFilters(user, args) {
  if (args.grade && normalizeString(user.grade) !== args.grade) return false;
  if (args.classNumber && normalizeString(user.classNumber) !== args.classNumber) return false;
  return true;
}

async function loadTargetMembers(db, args) {
  if (args.memberIds.length) {
    const snapshots = await Promise.all(
      args.memberIds.map(memberId => db.collection(USERS_COLLECTION).doc(memberId).get())
    );
    return snapshots
      .filter(snapshot => snapshot.exists)
      .map(snapshot => ({ userId: snapshot.id, ...snapshot.data() }))
      .filter(isActiveStudent)
      .filter(user => matchesFilters(user, args));
  }

  const snapshot = await db.collection(USERS_COLLECTION).where('role', '==', 'student').get();
  return snapshot.docs
    .map(doc => ({ userId: doc.id, ...doc.data() }))
    .filter(isActiveStudent)
    .filter(user => matchesFilters(user, args))
    .sort((a, b) => String(a.userId).localeCompare(String(b.userId)));
}

async function buildAccessCodeRows(db, members, args) {
  const rows = [];
  const skipped = [];
  const now = admin.firestore.Timestamp.now();
  const expiresAtDate = args.expiresDays
    ? new Date(Date.now() + args.expiresDays * 24 * 60 * 60 * 1000)
    : null;
  const expiresAt = expiresAtDate ? admin.firestore.Timestamp.fromDate(expiresAtDate) : null;

  for (const member of members) {
    const memberUserId = member.userId;
    const accessRef = db.collection(ACCESS_CODES_COLLECTION).doc(memberUserId);
    const existing = await accessRef.get();
    if (!args.force && existing.exists && existing.data()?.active === true) {
      skipped.push({ memberUserId, reason: 'active-code-exists' });
      continue;
    }

    const accessCode = randomAccessCode(args.codeLength);
    const salt = crypto.randomBytes(16).toString('hex');
    rows.push({
      memberUserId,
      school: normalizeString(member.school),
      grade: normalizeString(member.grade),
      classNumber: normalizeString(member.classNumber),
      studentNumber: normalizeString(member.studentNumber),
      nickname: normalizeString(member.nickname || member.name),
      accessCode,
      expiresAt: expiresAtDate ? expiresAtDate.toISOString() : '',
      doc: {
        memberUserId,
        active: true,
        salt,
        codeHash: hashAccessCode(accessCode, salt),
        failedAttempts: 0,
        maxFailedAttempts: args.maxFailedAttempts,
        oneTime: args.oneTime,
        consumeOnUse: args.oneTime,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        issuedAt: now
      }
    });
    if (expiresAt) rows[rows.length - 1].doc.expiresAt = expiresAt;
  }

  return { rows, skipped };
}

function summarize(rows, skipped, args) {
  console.log(`Target codes: ${rows.length}`);
  console.log(`Skipped members: ${skipped.length}`);
  console.log(`Output path: ${args.outputPath}`);
  console.log(`Mode: ${args.commit ? 'commit' : 'dry-run'}`);
  if (skipped.length) {
    console.log('Skipped sample:', JSON.stringify(skipped.slice(0, args.sample), null, 2));
  }
  if (rows.length) {
    console.log('Code sample (masked):');
    rows.slice(0, args.sample).forEach(row => {
      console.log(JSON.stringify({
        memberUserId: row.memberUserId,
        grade: row.grade,
        classNumber: row.classNumber,
        studentNumber: row.studentNumber,
        nickname: row.nickname,
        accessCode: maskCode(row.accessCode)
      }));
    });
  }
}

async function commitRows(db, rows, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, toCsv(rows), 'utf8');

  let batch = db.batch();
  let pending = 0;
  let committed = 0;
  for (const row of rows) {
    const ref = db.collection(ACCESS_CODES_COLLECTION).doc(row.memberUserId);
    batch.set(ref, row.doc, { merge: true });
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

  console.log(`Wrote ${committed} access code documents to ${ACCESS_CODES_COLLECTION}.`);
  console.log(`Raw access codes were written to ${outputPath}. Do not commit this file.`);
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = admin.firestore();
  const members = await loadTargetMembers(db, args);
  const { rows, skipped } = await buildAccessCodeRows(db, members, args);

  summarize(rows, skipped, args);
  if (!args.commit || args.dryRun) {
    console.log('No Firestore writes or output files were created. Use --commit to issue codes.');
    return;
  }

  await commitRows(db, rows, args.outputPath);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
