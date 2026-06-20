#!/usr/bin/env node

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const REMOVED_TITLE_PREFIXES = ['social_regional_specialties_'];

function parseArgs(argv) {
  const args = { commit: false };
  argv.slice(2).forEach(arg => {
    if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
    else throw new Error(`Unknown argument: ${arg}`);
  });
  return args;
}

function initializeAdmin() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }
  return getFirestore();
}

async function collectTitleDocs(db) {
  const snapshot = await db.collection('titleCatalog').get();
  return snapshot.docs.filter(doc => REMOVED_TITLE_PREFIXES.some(prefix => doc.id.startsWith(prefix)));
}

async function main() {
  const args = parseArgs(process.argv);
  const db = initializeAdmin();
  const titleDocs = await collectTitleDocs(db);
  console.log(`Regional specialty title docs: ${titleDocs.length}`);
  titleDocs.forEach(doc => {
    const data = doc.data() || {};
    console.log(`- titleCatalog/${doc.id} · ${data.titleName || doc.id}`);
  });

  if (!args.commit) {
    console.log('No Firestore deletes performed. Re-run with --commit to delete.');
    return;
  }

  const batch = db.batch();
  titleDocs.forEach(doc => batch.delete(doc.ref));
  if (titleDocs.length) await batch.commit();
  console.log(`Deleted ${titleDocs.length} regional specialty title docs.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
