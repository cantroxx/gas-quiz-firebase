#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_INPUT = './exports/ranking-export.json';
const RANKING_RECORDS_COLLECTION = 'rankingRecords';
const USER_RANKING_SUMMARY_COLLECTION = 'userRankingSummary';
const QUIZ_KING_SUMMARY_COLLECTION = 'quizKingSummary';
const MIGRATION_SOURCE = 'gas_ranking_record';
const QUIZ_KING_MODES = new Set(['normal', 'onechance', 'nohint', 'speed']);

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    dryRun: true,
    commit: false,
    sample: 5,
    cutoff: '',
    replace: false
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
    } else if (arg === '--cutoff') {
      args.cutoff = argv[i + 1] || '';
      i += 1;
    } else if (arg.startsWith('--cutoff=')) {
      args.cutoff = arg.slice('--cutoff='.length);
    } else if (arg === '--replace') {
      args.replace = true;
    }
  }

  if (args.cutoff && Number.isNaN(new Date(args.cutoff).getTime())) {
    throw new Error('--cutoff must be a valid date string.');
  }

  return args;
}

function readJson(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function slug(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[：]/g, ':')
    .replace(/지앰오/g, '지엠오')
    .replace(/[^0-9a-z가-힣:_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeRankingMode(value, legacy) {
  if (legacy) return 'legacy';
  const mode = normalizeString(value);
  return ['normal', 'onechance', 'silhouette', 'nohint', 'speed'].includes(mode) ? mode : 'normal';
}

function normalizeRankingCategory(value) {
  const category = normalizeString(value);
  if (category === '애니' || category === '인물(애니 캐릭터)') return '인물(애니)';
  if (category === '수학(난수퀴즈)') return '수학(곱셈과 나눗셈)';
  return category;
}

function getReadingBookTitle(category) {
  const match = normalizeString(category).match(/^독서\((.+)\)$/);
  return match ? match[1].trim() : '';
}

function getAggregationCategories(category) {
  const normalized = normalizeRankingCategory(category);
  const categories = [normalized];
  if (getReadingBookTitle(normalized) && !categories.includes('독서')) categories.push('독서');
  return categories;
}

function getSubFilter(category) {
  const match = normalizeString(category).match(/^(.+?)\((.+)\)$/);
  return match ? match[2].trim() : '';
}

function makeLegacyMemberUserId(row) {
  const grade = normalizeString(row.grade);
  const classNo = normalizeString(row.classNo);
  const number = normalizeString(row.number);
  if (grade && classNo && number) return `legacy_gcn_${slug(`${grade}_${classNo}_${number}`)}`;
  const name = normalizeString(row.name);
  if (name) return `legacy_name_${slug(name)}`;
  return '';
}

function makeRecordId(row) {
  const source = row.legacy ? 'legacy' : 'ranking';
  const sheet = slug(row.sourceSheet || source) || source;
  const rowNumber = normalizeNumber(row.sourceRowNumber);
  return `${source}_${sheet}_${rowNumber || slug(`${row.memberUserId}_${row.rawCategory}_${row.score}`)}`;
}

function toFirestoreDateValue(value) {
  const raw = normalizeString(value);
  if (!raw) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;
  return admin.firestore.Timestamp.fromDate(date);
}

function dateMillis(value) {
  const raw = normalizeString(value);
  if (!raw) return 0;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function extractRows(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.records)) return input.records;
  if (Array.isArray(input.rankingRecords)) return input.rankingRecords;
  throw new Error('Input must be an array or an object with records or rankingRecords.');
}

function transformRow(raw) {
  const sourceSheet = normalizeString(raw.sourceSheet || (raw.legacy ? '기록저장' : '랭킹기록'));
  const legacy = raw.legacy === true || sourceSheet === '기록저장';
  const userId = normalizeString(raw.userId || raw.memberUserId);
  const rawCategory = normalizeString(raw.category || raw.rawCategory);
  const category = normalizeRankingCategory(rawCategory);
  const score = normalizeNumber(raw.score);
  const base = {
    sourceSheet,
    sourceRowNumber: normalizeNumber(raw.sourceRowNumber),
    legacy,
    userId,
    grade: normalizeString(raw.grade),
    classNo: normalizeString(raw.classNo),
    number: normalizeString(raw.number),
    name: normalizeString(raw.name || raw.displayName),
    rawCategory,
    category,
    score,
    elapsedSeconds: normalizeNumber(raw.elapsedSeconds),
    elapsedText: normalizeString(raw.elapsedText),
    rankingMode: normalizeRankingMode(raw.rankingMode, legacy),
    recordedAt: normalizeString(raw.recordedAt)
  };

  const memberUserId = userId || makeLegacyMemberUserId(base);
  if (!memberUserId || !rawCategory || score <= 0) {
    return {
      skipped: true,
      reason: !memberUserId ? 'missing-identity' : (!rawCategory ? 'missing-category' : 'invalid-score'),
      raw
    };
  }

  const categoryKey = slug(category);
  const record = {
    recordId: '',
    memberUserId,
    userId,
    displayName: base.name || '익명',
    grade: base.grade,
    classNo: base.classNo,
    number: base.number,
    category,
    categoryKey,
    rawCategory,
    subFilter: getSubFilter(category),
    score,
    elapsedSeconds: base.elapsedSeconds,
    elapsedText: base.elapsedText,
    rankingMode: base.rankingMode,
    sourceSheet,
    sourceRowNumber: base.sourceRowNumber,
    legacy,
    hasUserId: !!userId,
    recordedAt: base.recordedAt,
    migrationSource: MIGRATION_SOURCE
  };
  record.recordId = makeRecordId(record);
  return record;
}

function isBetterEntry(next, current, useElapsedTime) {
  if (!current) return true;
  if (next.score !== current.score) return next.score > current.score;
  if (!useElapsedTime) return false;
  const nextTime = Number(next.elapsedSeconds) || 999999999;
  const currentTime = Number(current.elapsedSeconds) || 999999999;
  if (nextTime !== currentTime) return nextTime < currentTime;
  return Number(next.sourceRowNumber) < Number(current.sourceRowNumber);
}

function buildCategoryRankings(records) {
  const byModeCategoryUser = new Map();

  records.forEach(record => {
    const categories = getAggregationCategories(record.category);
    categories.forEach(category => {
      const categoryKey = slug(category);
      const modeKey = record.rankingMode;
      const groupKey = `${modeKey}__${categoryKey}`;
      if (!byModeCategoryUser.has(groupKey)) {
        byModeCategoryUser.set(groupKey, { modeKey, category, categoryKey, users: new Map() });
      }

      const group = byModeCategoryUser.get(groupKey);
      const entry = { ...record, category, categoryKey };
      const current = group.users.get(record.memberUserId);
      if (isBetterEntry(entry, current, !record.legacy)) group.users.set(record.memberUserId, entry);
    });
  });

  return Array.from(byModeCategoryUser.values()).map(group => {
    const ranked = Array.from(group.users.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (group.modeKey === 'legacy') return 0;
      const aTime = Number(a.elapsedSeconds) || 999999999;
      const bTime = Number(b.elapsedSeconds) || 999999999;
      if (aTime !== bTime) return aTime - bTime;
      return Number(a.sourceRowNumber) - Number(b.sourceRowNumber);
    });
    return { ...group, ranked };
  });
}

function buildUserRankingSummaries(records) {
  const summaries = new Map();
  const groups = buildCategoryRankings(records);

  records.forEach(record => {
    if (!summaries.has(record.memberUserId)) {
      summaries.set(record.memberUserId, {
        memberUserId: record.memberUserId,
        userId: record.userId,
        displayName: record.displayName,
        hasUserId: !!record.userId,
        totalRecordCount: 0,
        legacyRecordCount: 0,
        byMode: {},
        bestScoresByMode: {},
        migrationSource: MIGRATION_SOURCE
      });
    }
    const summary = summaries.get(record.memberUserId);
    summary.totalRecordCount += 1;
    if (record.legacy) summary.legacyRecordCount += 1;
  });

  groups.forEach(group => {
    const total = group.ranked.length;
    group.ranked.forEach((entry, index) => {
      const summary = summaries.get(entry.memberUserId);
      if (!summary) return;
      if (!summary.byMode[group.modeKey]) summary.byMode[group.modeKey] = { byCategory: {} };
      summary.byMode[group.modeKey].byCategory[group.categoryKey] = {
        rank: index + 1,
        total,
        score: entry.score,
        elapsedSeconds: entry.elapsedSeconds,
        elapsedText: entry.elapsedText,
        recordId: entry.recordId,
        category: group.category
      };
      if (!summary.bestScoresByMode[group.modeKey]) summary.bestScoresByMode[group.modeKey] = {};
      summary.bestScoresByMode[group.modeKey][group.categoryKey] = {
        score: entry.score,
        elapsedSeconds: entry.elapsedSeconds,
        recordId: entry.recordId
      };
    });
  });

  return Array.from(summaries.values());
}

function buildQuizKingSummaries(records) {
  const byUser = new Map();

  records.forEach(record => {
    if (record.legacy || !QUIZ_KING_MODES.has(record.rankingMode)) return;
    if (!record.category || record.score <= 0) return;

    if (!byUser.has(record.memberUserId)) {
      byUser.set(record.memberUserId, {
        memberUserId: record.memberUserId,
        userId: record.userId,
        displayName: record.displayName,
        hasUserId: !!record.userId,
        bestByCategory: {},
        totalScore: 0,
        categoryCount: 0,
        categories: [],
        migrationSource: MIGRATION_SOURCE
      });
    }

    const user = byUser.get(record.memberUserId);
    const current = user.bestByCategory[record.categoryKey];
    if (isBetterEntry(record, current, true)) user.bestByCategory[record.categoryKey] = record;
  });

  const rankedUsers = Array.from(byUser.values()).map(user => {
    const bestRecords = Object.values(user.bestByCategory);
    user.totalScore = bestRecords.reduce((sum, record) => sum + (record.score || 0), 0);
    user.categoryCount = bestRecords.length;
    user.categories = bestRecords.sort((a, b) => a.category.localeCompare(b.category, 'ko')).map(record => ({
      categoryKey: record.categoryKey,
      category: record.category,
      score: record.score,
      elapsedSeconds: record.elapsedSeconds,
      elapsedText: record.elapsedText,
      rankingMode: record.rankingMode,
      recordId: record.recordId
    }));
    delete user.bestByCategory;
    return user;
  }).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.categoryCount !== a.categoryCount) return b.categoryCount - a.categoryCount;
    return String(a.displayName || a.memberUserId).localeCompare(String(b.displayName || b.memberUserId), 'ko');
  });

  rankedUsers.forEach((user, index) => {
    user.rank = index + 1;
  });

  return rankedUsers;
}

function buildImportModel(input) {
  const rawRows = extractRows(input);
  const cutoffMillis = input.__cutoffMillis || 0;
  const filteredRows = cutoffMillis
    ? rawRows.filter(raw => {
      const recordedAtMillis = dateMillis(raw && raw.recordedAt);
      return !recordedAtMillis || recordedAtMillis < cutoffMillis;
    })
    : rawRows;
  const skipped = [];
  const byRecordId = new Map();

  filteredRows.forEach(raw => {
    const record = transformRow(raw);
    if (record.skipped) {
      skipped.push(record);
      return;
    }
    byRecordId.set(record.recordId, record);
  });

  const records = Array.from(byRecordId.values());
  const userSummaries = buildUserRankingSummaries(records);
  const quizKingSummaries = buildQuizKingSummaries(records);

  return {
    exportedAt: normalizeString(input.exportedAt),
    exportRankingCount: normalizeNumber(input.rankingCount),
    exportLegacyCount: normalizeNumber(input.legacyCount),
    totalInputRows: rawRows.length,
    filteredOutRows: rawRows.length - filteredRows.length,
    duplicateCount: filteredRows.length - skipped.length - records.length,
    records,
    userSummaries,
    quizKingSummaries,
    skipped,
    userIdMissingCount: records.filter(record => !record.userId).length,
    legacyRowsCount: records.filter(record => record.legacy).length,
    unresolvedRowsCount: skipped.length
  };
}

function summarize(model, sampleLimit) {
  console.log(`Dry run: ${model.records.length} rankingRecords prepared.`);
  console.log(`Export ranking rows: ${model.exportRankingCount}`);
  console.log(`Export legacy rows: ${model.exportLegacyCount}`);
  console.log(`Total input rows: ${model.totalInputRows}`);
  console.log(`Legacy rows prepared: ${model.legacyRowsCount}`);
  console.log(`Rows without userId: ${model.userIdMissingCount}`);
  console.log(`Unresolved/skipped rows: ${model.unresolvedRowsCount}`);
  console.log(`Duplicate rows collapsed: ${model.duplicateCount}`);
  console.log(`User ranking summaries prepared: ${model.userSummaries.length}`);
  console.log(`QuizKing summaries prepared: ${model.quizKingSummaries.length}`);

  model.records.slice(0, Math.max(0, sampleLimit)).forEach(record => {
    console.log(JSON.stringify({
      rankingRecordPath: `${RANKING_RECORDS_COLLECTION}/${record.recordId}`,
      userRankingSummaryPath: `${USER_RANKING_SUMMARY_COLLECTION}/${record.memberUserId}`,
      data: {
        memberUserId: record.memberUserId,
        userId: record.userId,
        category: record.category,
        score: record.score,
        rankingMode: record.rankingMode,
        legacy: record.legacy
      }
    }, null, 2));
  });

  console.log('QuizKing sample:');
  model.quizKingSummaries.slice(0, Math.max(0, sampleLimit)).forEach(summary => {
    console.log(JSON.stringify({
      path: `${QUIZ_KING_SUMMARY_COLLECTION}/${summary.memberUserId}`,
      data: {
        memberUserId: summary.memberUserId,
        userId: summary.userId,
        rank: summary.rank,
        totalScore: summary.totalScore,
        categoryCount: summary.categoryCount
      }
    }, null, 2));
  });

  if (model.skipped.length) {
    console.log('Skipped row samples:');
    model.skipped.slice(0, Math.max(0, sampleLimit)).forEach(item => {
      console.log(JSON.stringify({ reason: item.reason, raw: item.raw }, null, 2));
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

function withWriteTimestamps(data, serverTimestamp) {
  const result = { ...data, migratedAt: serverTimestamp };
  if (result.recordedAt) result.recordedAt = toFirestoreDateValue(result.recordedAt);
  return result;
}

async function commitModel(model) {
  const db = initializeAdmin();
  const writes = [];
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

  model.records.forEach(record => {
    writes.push({
      ref: db.collection(RANKING_RECORDS_COLLECTION).doc(record.recordId),
      data: withWriteTimestamps(record, serverTimestamp)
    });
  });

  model.userSummaries.forEach(summary => {
    writes.push({
      ref: db.collection(USER_RANKING_SUMMARY_COLLECTION).doc(summary.memberUserId),
      data: { ...summary, updatedAt: serverTimestamp, migratedAt: serverTimestamp }
    });
  });

  model.quizKingSummaries.forEach(summary => {
    writes.push({
      ref: db.collection(QUIZ_KING_SUMMARY_COLLECTION).doc(summary.memberUserId),
      data: { ...summary, updatedAt: serverTimestamp, migratedAt: serverTimestamp }
    });
  });

  if (model.replace) {
    await deleteCollectionDocs(db, RANKING_RECORDS_COLLECTION);
    await deleteCollectionDocs(db, USER_RANKING_SUMMARY_COLLECTION);
    await deleteCollectionDocs(db, QUIZ_KING_SUMMARY_COLLECTION);
  }

  let committed = 0;
  for (let i = 0; i < writes.length; i += 450) {
    const batch = db.batch();
    writes.slice(i, i + 450).forEach(write => batch.set(write.ref, write.data, { merge: true }));
    await batch.commit();
    committed += Math.min(450, writes.length - i);
  }

  console.log(`Committed ${committed} Firestore writes.`);
}

async function deleteCollectionDocs(db, collectionPath) {
  let deleted = 0;
  while (true) {
    const snapshot = await db.collection(collectionPath).limit(450).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
  console.log(`Deleted ${deleted} existing ${collectionPath} documents.`);
}

async function main() {
  const args = parseArgs(process.argv);
  const input = readJson(args.input);
  if (args.cutoff) input.__cutoffMillis = new Date(args.cutoff).getTime();
  const model = buildImportModel(input);
  model.replace = args.replace === true;
  if (args.cutoff) console.log(`Cutoff filter: ${args.cutoff}`);
  if (model.filteredOutRows) console.log(`Rows filtered out by cutoff: ${model.filteredOutRows}`);
  if (model.replace) console.log('Replace mode: rankingRecords/userRankingSummary/quizKingSummary will be rebuilt.');
  summarize(model, args.sample);

  if (!args.commit) {
    console.log('No Firestore writes performed. Re-run with --commit to import.');
    return;
  }

  await commitModel(model);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
