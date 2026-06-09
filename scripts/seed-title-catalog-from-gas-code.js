#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const admin = require('firebase-admin');

const DEFAULT_GAS_CODE = '../gas-quiz/Code.js';
const COLLECTION = 'titleCatalog';

function parseArgs(argv) {
  const args = {
    gasCode: DEFAULT_GAS_CODE,
    dryRun: true,
    commit: false,
    sample: 5
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.commit = false;
      args.dryRun = true;
    } else if (arg === '--gas-code') {
      args.gasCode = argv[i + 1] || DEFAULT_GAS_CODE;
      i += 1;
    } else if (arg === '--sample') {
      args.sample = Number(argv[i + 1]) || args.sample;
      i += 1;
    }
  }
  return args;
}

function extractDefinitions(gasCodePath) {
  const codePath = path.resolve(process.cwd(), gasCodePath);
  const code = fs.readFileSync(codePath, 'utf8');
  const sandbox = {
    console,
    Logger: { log() {} },
    SpreadsheetApp: { getActiveSpreadsheet() { return null; } },
    Utilities: { formatDate() { return ''; } },
    Session: { getScriptTimeZone() { return 'Asia/Seoul'; } }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${code}
getTitleListFromSheet_ = function(){ return []; };
__titleDefinitions = buildAllTitleDefinitions_();`, sandbox);
  return Array.isArray(sandbox.__titleDefinitions) ? sandbox.__titleDefinitions : [];
}

function normalizeTitle(definition) {
  const id = String(definition.id || '').trim();
  if (!id) return null;
  return {
    titleId: id,
    titleName: String(definition.title || id).trim(),
    category: String(definition.category || '').trim(),
    theme: String(definition.theme || '').trim(),
    themeClass: String(definition.themeClass || '').trim(),
    tier: Number(definition.tier) || 0,
    tierClass: String(definition.tierClass || '').trim(),
    effectClass: String(definition.effectClass || '').trim(),
    source: String(definition.source || '').trim(),
    sourceType: String(definition.sourceType || '').trim(),
    subjectGroup: String(definition.subjectGroup || '').trim(),
    conditionText: String(definition.conditionText || '').trim(),
    description: String(definition.description || '').trim(),
    requiredBadgeCount: Number(definition.requiredBadgeCount) || 0,
    requiredGenCount: Number(definition.requiredGenCount) || 0,
    fieldKey: String(definition.fieldKey || '').trim(),
    generation: String(definition.generation || '').trim(),
    order: Number(definition.order) || 999,
    legacyNames: Array.isArray(definition.legacyNames) ? definition.legacyNames.map(String) : [],
    legacyIds: Array.isArray(definition.legacyIds) ? definition.legacyIds.map(String) : [],
    active: true,
    migrationSource: 'gas_title_definitions'
  };
}

function initializeAdmin() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  return admin.firestore();
}

async function commitTitles(titles) {
  const db = initializeAdmin();
  let committed = 0;
  for (let i = 0; i < titles.length; i += 450) {
    const batch = db.batch();
    titles.slice(i, i + 450).forEach(title => {
      batch.set(db.collection(COLLECTION).doc(title.titleId), {
        ...title,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
    committed += Math.min(450, titles.length - i);
  }
  console.log(`Committed ${committed} titleCatalog documents.`);
}

async function main() {
  const args = parseArgs(process.argv);
  const titles = extractDefinitions(args.gasCode).map(normalizeTitle).filter(Boolean);
  console.log(`Prepared ${titles.length} titleCatalog documents.`);
  titles.slice(0, Math.max(0, args.sample)).forEach(title => {
    console.log(JSON.stringify({
      path: `${COLLECTION}/${title.titleId}`,
      titleName: title.titleName,
      conditionText: title.conditionText,
      themeClass: title.themeClass,
      tierClass: title.tierClass,
      effectClass: title.effectClass
    }, null, 2));
  });
  if (!args.commit) {
    console.log('No Firestore writes performed. Re-run with --commit to seed.');
    return;
  }
  await commitTitles(titles);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
