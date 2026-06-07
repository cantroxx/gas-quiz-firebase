#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_INPUT = './title-export.json';
const USER_TITLES_COLLECTION = 'userTitles';
const USER_TITLE_SUMMARY_COLLECTION = 'userTitleSummary';

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    dryRun: true,
    commit: false,
    sample: 5,
    writeSummary: true
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
      args.commit = false;
    } else if (arg === '--input') {
      args.input = argv[i + 1] || DEFAULT_INPUT;
      i += 1;
    } else if (arg === '--sample') {
      args.sample = Number(argv[i + 1]) || args.sample;
      i += 1;
    } else if (arg === '--no-summary') {
      args.writeSummary = false;
    }
  }

  return args;
}

function readJson(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(raw);
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function valueFrom(source, names, fallback = '') {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(source, name)) return source[name];
  }
  return fallback;
}

function extractTitleRows(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.titles)) return input.titles;
  if (Array.isArray(input.rows)) return input.rows;
  if (Array.isArray(input.titleRows)) return input.titleRows;
  throw new Error('Input must be an array or an object with titles, rows, or titleRows.');
}

function extractSelectedTitleMap(input) {
  const map = {};
  const users = Array.isArray(input.users) ? input.users : [];
  users.forEach(user => {
    const userId = normalizeString(valueFrom(user, ['userId', 'memberUserId', 'legacyMemberId']));
    const selectedTitleId = normalizeString(valueFrom(user, ['selectedTitleId', 'selectedTitle', '대표타이틀']));
    if (userId && selectedTitleId) map[userId] = selectedTitleId;
  });
  return map;
}

function extractUserIds(input) {
  const ids = new Set();
  const users = Array.isArray(input.users) ? input.users : [];
  users.forEach(user => {
    const userId = normalizeString(valueFrom(user, ['userId', 'memberUserId', 'legacyMemberId']));
    if (userId) ids.add(userId);
  });
  return ids;
}

function toFirestoreDateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return admin.firestore.Timestamp.fromDate(value);

  const raw = normalizeString(value);
  if (!raw) return null;

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;
  return admin.firestore.Timestamp.fromDate(date);
}

function transformTitle(rawTitle, selectedTitleMap) {
  const userId = normalizeString(valueFrom(rawTitle, ['userId', 'memberUserId', 'legacyMemberId', '회원ID']));
  const titleId = normalizeString(valueFrom(rawTitle, ['titleId', 'id', '타이틀ID']));
  const titleName = normalizeString(valueFrom(rawTitle, ['titleName', 'title', 'name', '타이틀명'], titleId)) || titleId;
  const selectedTitleId = selectedTitleMap[userId] || '';
  const acquiredAt = toFirestoreDateValue(valueFrom(rawTitle, ['acquiredAt', '획득일시']));
  const updatedAt = toFirestoreDateValue(valueFrom(rawTitle, ['updatedAt', '수정일시']));

  if (!userId || !titleId) {
    return {
      skipped: true,
      reason: !userId ? 'missing-userId' : 'missing-titleId',
      rawTitle
    };
  }

  return {
    userId,
    memberUserId: userId,
    titleId,
    titleName,
    theme: normalizeString(valueFrom(rawTitle, ['theme', '테마'])),
    tier: normalizeNumber(valueFrom(rawTitle, ['tier', '등급'])),
    effect: normalizeString(valueFrom(rawTitle, ['effect', 'effectClass', '효과'])),
    source: {
      type: normalizeString(valueFrom(rawTitle, ['sourceType', '출처유형'])),
      category: normalizeString(valueFrom(rawTitle, ['sourceCategory', '출처카테고리'])),
      group: normalizeString(valueFrom(rawTitle, ['sourceGroup', '출처그룹']))
    },
    sourceType: normalizeString(valueFrom(rawTitle, ['sourceType', '출처유형'])),
    sourceCategory: normalizeString(valueFrom(rawTitle, ['sourceCategory', '출처카테고리'])),
    sourceGroup: normalizeString(valueFrom(rawTitle, ['sourceGroup', '출처그룹'])),
    acquiredAt: acquiredAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: updatedAt || admin.firestore.FieldValue.serverTimestamp(),
    active: true,
    selected: selectedTitleId === titleId,
    migrationSource: 'gas_title_status'
  };
}

function buildImportModel(input) {
  const selectedTitleMap = extractSelectedTitleMap(input);
  const userIds = extractUserIds(input);
  const rows = extractTitleRows(input);
  const skipped = [];
  const byDocKey = new Map();

  rows.forEach(row => {
    const transformed = transformTitle(row, selectedTitleMap);
    if (transformed.skipped) {
      skipped.push(transformed);
      return;
    }

    const key = `${transformed.userId}/${transformed.titleId}`;
    byDocKey.set(key, transformed);
  });

  const titles = Array.from(byDocKey.values());
  const summaries = buildSummaries(titles, selectedTitleMap, userIds);
  return {
    titles,
    summaries,
    skipped,
    duplicateCount: rows.length - skipped.length - titles.length
  };
}

function buildSummaries(titles, selectedTitleMap, userIds = new Set()) {
  const map = new Map();

  titles.forEach(title => {
    if (!map.has(title.userId)) {
      map.set(title.userId, {
        userId: title.userId,
        memberUserId: title.userId,
        titleCount: 0,
        selectedTitleId: selectedTitleMap[title.userId] || '',
        selectedTitleName: '',
        missingSelectedTitle: false,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        migrationSource: 'gas_title_status'
      });
    }

    const summary = map.get(title.userId);
    summary.titleCount += 1;
    if (title.selected) summary.selectedTitleName = title.titleName;
  });

  Object.keys(selectedTitleMap).forEach(userId => {
    userIds.add(userId);
  });

  userIds.forEach(userId => {
    if (!map.has(userId)) {
      map.set(userId, {
        userId,
        memberUserId: userId,
        titleCount: 0,
        selectedTitleId: selectedTitleMap[userId] || '',
        selectedTitleName: '',
        missingSelectedTitle: !!selectedTitleMap[userId],
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        migrationSource: 'gas_title_status'
      });
      return;
    }

    const summary = map.get(userId);
    summary.missingSelectedTitle = !!summary.selectedTitleId && !summary.selectedTitleName;
  });

  return Array.from(map.values());
}

function summarize(model, sampleLimit) {
  const userIds = new Set(model.titles.map(title => title.userId));
  const selectedCount = model.titles.filter(title => title.selected).length;

  console.log(`Dry run: ${model.titles.length} user title documents prepared.`);
  console.log(`Users with titles: ${userIds.size}`);
  console.log(`Summaries prepared: ${model.summaries.length}`);
  console.log(`Selected title matches: ${selectedCount}`);
  console.log(`Skipped rows: ${model.skipped.length}`);
  console.log(`Duplicate rows collapsed: ${model.duplicateCount}`);

  model.titles.slice(0, Math.max(0, sampleLimit)).forEach(title => {
    console.log(JSON.stringify({
      path: `${USER_TITLES_COLLECTION}/${title.userId}/titles/${title.titleId}`,
      data: {
        userId: title.userId,
        titleId: title.titleId,
        titleName: title.titleName,
        tier: title.tier,
        selected: title.selected,
        sourceType: title.sourceType
      }
    }, null, 2));
  });

  if (model.skipped.length) {
    console.log('Skipped row samples:');
    model.skipped.slice(0, Math.max(0, sampleLimit)).forEach(item => {
      console.log(JSON.stringify({ reason: item.reason, rawTitle: item.rawTitle }, null, 2));
    });
  }
}

function initializeAdmin() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
  return admin.firestore();
}

async function commitModel(model, options) {
  const db = initializeAdmin();
  const writes = [];

  model.titles.forEach(title => {
    const ref = db
      .collection(USER_TITLES_COLLECTION)
      .doc(title.userId)
      .collection('titles')
      .doc(title.titleId);
    writes.push({ ref, data: { ...title, migratedAt: admin.firestore.FieldValue.serverTimestamp() } });
  });

  if (options.writeSummary) {
    model.summaries.forEach(summary => {
      const ref = db.collection(USER_TITLE_SUMMARY_COLLECTION).doc(summary.userId);
      writes.push({ ref, data: summary });
    });
  }

  let committed = 0;
  for (let i = 0; i < writes.length; i += 450) {
    const batch = db.batch();
    writes.slice(i, i + 450).forEach(write => {
      batch.set(write.ref, write.data, { merge: true });
    });
    await batch.commit();
    committed += Math.min(450, writes.length - i);
  }

  console.log(`Committed ${committed} Firestore writes.`);
}

async function main() {
  const args = parseArgs(process.argv);
  const input = readJson(args.input);
  const model = buildImportModel(input);

  summarize(model, args.sample);

  if (!args.commit) {
    console.log('No Firestore writes performed. Re-run with --commit to import.');
    return;
  }

  await commitModel(model, args);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
