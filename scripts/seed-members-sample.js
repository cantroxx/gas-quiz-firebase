const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const SAMPLE_PATH = path.join(__dirname, '..', 'MEMBER_MIGRATION_SAMPLE.json');
const USERS_COLLECTION = 'users';

function initializeAdminApp() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

function readSampleMembers() {
  const raw = fs.readFileSync(SAMPLE_PATH, 'utf8');
  const members = JSON.parse(raw);
  if (!Array.isArray(members)) {
    throw new Error('MEMBER_MIGRATION_SAMPLE.json must contain an array.');
  }
  return members;
}

function validateMember(member) {
  if (!member || typeof member !== 'object') {
    throw new Error('Member item must be an object.');
  }
  if (!member.userId || typeof member.userId !== 'string') {
    throw new Error('Member item is missing userId.');
  }
  if (!member.legacyMemberId || typeof member.legacyMemberId !== 'string') {
    throw new Error(`Member ${member.userId} is missing legacyMemberId.`);
  }
  if (!['student', 'admin'].includes(member.role)) {
    throw new Error(`Member ${member.userId} has invalid role.`);
  }
  if (!['active', 'inactive'].includes(member.status)) {
    throw new Error(`Member ${member.userId} has invalid status.`);
  }
  if (typeof member.active !== 'boolean') {
    throw new Error(`Member ${member.userId} active must be boolean.`);
  }
}

function buildUserDocument(member) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  return {
    userId: member.userId,
    legacyMemberId: member.legacyMemberId,
    authUid: member.authUid || '',
    school: member.school || '',
    grade: String(member.grade || ''),
    classNumber: String(member.classNumber || ''),
    studentNumber: String(member.studentNumber || ''),
    name: member.name || '',
    nickname: member.nickname || '',
    role: member.role,
    active: member.active,
    status: member.status,
    passwordMode: member.passwordMode || 'migration_required',
    initialPasswordChanged: member.initialPasswordChanged === true,
    profileImageUrl: member.profileImageUrl || '',
    selectedTitleId: member.selectedTitleId || '',
    rankingMessage: member.rankingMessage || '',
    createdAt: now,
    updatedAt: now,
    migratedAt: now
  };
}

async function seedMembersSample() {
  initializeAdminApp();
  const db = admin.firestore();
  const members = readSampleMembers();
  const batch = db.batch();

  members.forEach(member => {
    validateMember(member);
    const ref = db.collection(USERS_COLLECTION).doc(member.userId);
    batch.set(ref, buildUserDocument(member), { merge: true });
  });

  await batch.commit();
  console.log(`Seeded ${members.length} sample users into ${USERS_COLLECTION}.`);
  members.forEach(member => console.log(`- ${member.userId}`));
}

seedMembersSample().catch(error => {
  console.error(error);
  process.exit(1);
});
