#!/usr/bin/env node
'use strict';

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

function parseArgs(argv) {
  const args = { commit: false, sample: 20, user: '' };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
    else if (arg === '--sample') args.sample = Number(argv[++index]) || args.sample;
    else if (arg.startsWith('--sample=')) args.sample = Number(arg.slice('--sample='.length)) || args.sample;
    else if (arg === '--user') args.user = String(argv[++index] || '').trim();
    else if (arg.startsWith('--user=')) args.user = String(arg.slice('--user='.length)).trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function buildUserIds(targetUserId) {
  if (targetUserId) return [targetUserId];
  const [userSnapshot, titleSummaryRefs, titleParentRefs] = await Promise.all([
    db.collection('users').where('role', '==', 'student').limit(1000).get(),
    db.collection('userTitleSummary').listDocuments(),
    db.collection('userTitles').listDocuments()
  ]);
  const ids = new Set();
  userSnapshot.docs.forEach(doc => ids.add(doc.id));
  titleSummaryRefs.forEach(ref => ids.add(ref.id));
  titleParentRefs.forEach(ref => ids.add(ref.id));
  return Array.from(ids).sort();
}

function getSelectedTitleName(titleSnapshot) {
  if (!titleSnapshot?.exists) return '';
  const data = titleSnapshot.data() || {};
  return String(data.titleName || data.name || titleSnapshot.id || '').trim();
}

async function inspectUser(memberUserId) {
  const userRef = db.collection('users').doc(memberUserId);
  const summaryRef = db.collection('userTitleSummary').doc(memberUserId);
  const titlesRef = db.collection('userTitles').doc(memberUserId).collection('titles');
  const [userSnapshot, summarySnapshot, titleSnapshot] = await Promise.all([
    userRef.get(),
    summaryRef.get(),
    titlesRef.get()
  ]);
  const userData = userSnapshot.exists ? userSnapshot.data() || {} : {};
  const summaryData = summarySnapshot.exists ? summarySnapshot.data() || {} : {};
  const ownedTitleIds = titleSnapshot.docs.map(doc => doc.id);
  const ownedTitleIdSet = new Set(ownedTitleIds);
  const userSelectedTitleId = String(userData.selectedTitleId || '').trim();
  const summarySelectedTitleId = String(summaryData.selectedTitleId || '').trim();
  const selectedDocIds = titleSnapshot.docs
    .filter(doc => (doc.data() || {}).selected === true)
    .map(doc => doc.id);
  const desiredSelectedTitleId = userSelectedTitleId && ownedTitleIdSet.has(userSelectedTitleId)
    ? userSelectedTitleId
    : '';
  const desiredSelectedSnapshot = desiredSelectedTitleId
    ? titleSnapshot.docs.find(doc => doc.id === desiredSelectedTitleId)
    : null;
  const desiredSelectedTitleName = getSelectedTitleName(desiredSelectedSnapshot);
  const needsRepair = userSelectedTitleId !== desiredSelectedTitleId
    || summarySelectedTitleId !== desiredSelectedTitleId
    || String(summaryData.selectedTitleName || '') !== desiredSelectedTitleName
    || selectedDocIds.length !== (desiredSelectedTitleId ? 1 : 0)
    || (desiredSelectedTitleId && selectedDocIds[0] !== desiredSelectedTitleId)
    || Number(summaryData.ownedCount || summaryData.titleCount || 0) !== ownedTitleIds.length;

  return {
    memberUserId,
    userRef,
    summaryRef,
    titleDocs: titleSnapshot.docs,
    ownedTitleIds,
    userSelectedTitleId,
    summarySelectedTitleId,
    selectedDocIds,
    desiredSelectedTitleId,
    desiredSelectedTitleName,
    needsRepair
  };
}

async function repairUser(row, commit) {
  if (!row.needsRepair || !commit) return;
  const batch = db.batch();
  batch.set(row.userRef, {
    selectedTitleId: row.desiredSelectedTitleId,
    selectedTitleName: row.desiredSelectedTitleName,
    updatedAt: FieldValue.serverTimestamp(),
    source: 'repair_title_consistency_script'
  }, { merge: true });
  batch.set(row.summaryRef, {
    userId: row.memberUserId,
    memberUserId: row.memberUserId,
    titleCount: row.ownedTitleIds.length,
    ownedCount: row.ownedTitleIds.length,
    selectedTitleId: row.desiredSelectedTitleId,
    selectedTitleName: row.desiredSelectedTitleName,
    missingSelectedTitle: !!row.desiredSelectedTitleId && !row.ownedTitleIds.includes(row.desiredSelectedTitleId),
    migrationSource: 'repair_title_consistency_script',
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  row.titleDocs.forEach(doc => {
    batch.set(doc.ref, {
      selected: row.desiredSelectedTitleId ? doc.id === row.desiredSelectedTitleId : false,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
}

async function main() {
  const args = parseArgs(process.argv);
  const userIds = await buildUserIds(args.user);
  const repairs = [];
  for (const userId of userIds) {
    const row = await inspectUser(userId);
    if (!row.needsRepair) continue;
    repairs.push(row);
    await repairUser(row, args.commit);
  }
  console.log(`${args.commit ? 'Commit' : 'Dry run'}: ${repairs.length} title consistency repairs.`);
  repairs.slice(0, Math.max(0, args.sample)).forEach(row => {
    console.log(JSON.stringify({
      memberUserId: row.memberUserId,
      ownedTitleCount: row.ownedTitleIds.length,
      userSelectedTitleId: row.userSelectedTitleId,
      summarySelectedTitleId: row.summarySelectedTitleId,
      selectedDocIds: row.selectedDocIds,
      desiredSelectedTitleId: row.desiredSelectedTitleId,
      desiredSelectedTitleName: row.desiredSelectedTitleName
    }, null, 2));
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
