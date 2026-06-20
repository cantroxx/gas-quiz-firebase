#!/usr/bin/env node

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const OBSOLETE_TITLE_IDS = ['science_grade4_1', 'science_grade4_3', 'science_grade4_5'];

function parseArgs(argv) {
  const args = { commit: false, sample: 20 };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
    else if (arg === '--sample') args.sample = Number(argv[++index] || args.sample);
    else if (arg.startsWith('--sample=')) args.sample = Number(arg.slice('--sample='.length)) || args.sample;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function initializeAdmin() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }
  return getFirestore();
}

async function collectCatalogDocs(db) {
  const docs = await Promise.all(OBSOLETE_TITLE_IDS.map(titleId => db.collection('titleCatalog').doc(titleId).get()));
  return docs.filter(doc => doc.exists);
}

async function collectUserTitleDocs(db) {
  const snapshot = await db.collectionGroup('titles').get();
  return snapshot.docs.filter(doc => OBSOLETE_TITLE_IDS.includes(doc.id));
}

async function buildSummaryUpdates(db, userTitleDocs) {
  const memberUserIds = Array.from(new Set(userTitleDocs.map(doc => doc.ref.parent.parent?.id).filter(Boolean)));
  const updates = [];
  for (const memberUserId of memberUserIds) {
    const remaining = await db.collection('userTitles').doc(memberUserId).collection('titles').get();
    const remainingIds = remaining.docs
      .map(doc => doc.id)
      .filter(id => !OBSOLETE_TITLE_IDS.includes(id));
    const ref = db.collection('userTitleSummary').doc(memberUserId);
    const summary = await ref.get();
    const summaryData = summary.exists ? summary.data() || {} : {};
    const selectedTitleId = OBSOLETE_TITLE_IDS.includes(String(summaryData.selectedTitleId || '').trim())
      ? ''
      : String(summaryData.selectedTitleId || '').trim();
    updates.push({
      ref,
      data: {
        titleCount: remainingIds.length,
        ownedCount: remainingIds.length,
        selectedTitleId,
        selectedTitleName: selectedTitleId ? String(summaryData.selectedTitleName || '') : '',
        obsoleteTitleCleanupAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }
    });
  }
  return updates;
}

async function main() {
  const args = parseArgs(process.argv);
  const db = initializeAdmin();
  const [catalogDocs, userTitleDocs] = await Promise.all([
    collectCatalogDocs(db),
    collectUserTitleDocs(db)
  ]);
  console.log(`Obsolete titleCatalog docs: ${catalogDocs.length}`);
  catalogDocs.forEach(doc => console.log(`- titleCatalog/${doc.id}`));
  console.log(`Obsolete user title docs: ${userTitleDocs.length}`);
  userTitleDocs.slice(0, args.sample).forEach(doc => console.log(`- ${doc.ref.path}`));
  if (userTitleDocs.length > args.sample) {
    console.log(`... ${userTitleDocs.length - args.sample} more user title docs`);
  }

  if (!args.commit) {
    console.log('No Firestore deletes performed. Re-run with --commit to delete.');
    return;
  }

  let committed = 0;
  const allDeletes = [...catalogDocs.map(doc => doc.ref), ...userTitleDocs.map(doc => doc.ref)];
  const summaryUpdates = await buildSummaryUpdates(db, userTitleDocs);
  for (let index = 0; index < allDeletes.length; index += 400) {
    const batch = db.batch();
    allDeletes.slice(index, index + 400).forEach(ref => batch.delete(ref));
    await batch.commit();
    committed += Math.min(400, allDeletes.length - index);
  }
  for (let index = 0; index < summaryUpdates.length; index += 400) {
    const batch = db.batch();
    summaryUpdates.slice(index, index + 400).forEach(update => batch.set(update.ref, update.data, { merge: true }));
    await batch.commit();
  }
  console.log(`Deleted ${committed} obsolete title docs and updated ${summaryUpdates.length} summaries.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
