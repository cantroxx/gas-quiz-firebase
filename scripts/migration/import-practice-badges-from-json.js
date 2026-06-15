#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_INPUT = './exports/practice-export.json';
const PRACTICE_RECORDS_COLLECTION = 'practiceRecords';
const USER_PRACTICE_SUMMARY_COLLECTION = 'userPracticeSummary';
const USER_BADGES_COLLECTION = 'userBadges';
const MIGRATION_SOURCE = 'gas_practice_record';

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
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
      args.dryRun = true;
      args.commit = false;
    } else if (arg === '--input') {
      args.input = argv[i + 1] || DEFAULT_INPUT;
      i += 1;
    } else if (arg === '--sample') {
      args.sample = Number(argv[i + 1]) || args.sample;
      i += 1;
    }
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

function normalizeBoolean(value) {
  if (value === true) return true;
  const text = normalizeString(value).toLowerCase();
  return text === 'true' || text === 'y' || text === 'yes' || text === '사용' || text === '획득';
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

function parseCorrectIds(value) {
  if (Array.isArray(value)) return uniqueIds(value);
  return uniqueIds(normalizeString(value).split(','));
}

function uniqueIds(values) {
  const seen = new Set();
  const result = [];
  (values || []).forEach(value => {
    const id = normalizeString(value);
    if (!id || seen.has(id)) return;
    seen.add(id);
    result.push(id);
  });
  return result;
}

function fillLegacyIds(correctIds, correctCount) {
  const ids = parseCorrectIds(correctIds);
  if (ids.length || normalizeNumber(correctCount) <= 0) return ids;
  const count = normalizeNumber(correctCount);
  const result = [];
  for (let i = 1; i <= count; i += 1) result.push(`LEGACY_UNKNOWN_${i}`);
  return result;
}

function normalizeMathDetail(detail) {
  const text = normalizeString(detail);
  const compact = text.toLowerCase().replace(/\s+/g, '');
  if (['random-basic', 'math_muldiv', '난수퀴즈', '곱셈과나눗셈'].includes(compact)) return '곱셈과 나눗셈';
  return text;
}

function normalizeReadingDetail(detail) {
  const text = normalizeString(detail);
  const compact = text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/：/g, ':')
    .replace(/지앰오/g, '지엠오');
  if (['gmo', 'reading-gmo', '지엠오아이', '독서:지엠오아이', '독서지엠오아이'].includes(compact)) return '독서:지엠오 아이';
  return text;
}

function getAreaKey(area, detail) {
  const areaText = normalizeString(area);
  const detailText = normalizeString(detail);
  const compactDetail = detailText.replace(/\s+/g, '');

  if (areaText === '포켓몬') {
    const match = detailText.match(/^([1-9])세대$/);
    return match ? `포켓몬/gen${match[1]}` : `포켓몬/${slug(detailText)}`;
  }
  if (areaText === '국어') {
    const reading = normalizeReadingDetail(detailText);
    if (reading === '독서:지엠오 아이') return '국어/gmo';
    if (detailText === '다의어·동형이의어') return '국어/word-relation';
    return `국어/${slug(reading || detailText)}`;
  }
  if (areaText === '수학') {
    const math = normalizeMathDetail(detailText);
    if (math === '곱셈과 나눗셈') return '수학/random-basic';
    return `수학/${slug(math || detailText)}`;
  }
  if (areaText === '사회') {
    if (['삼국지', '삼국시대', 'three-kingdoms'].includes(compactDetail)) return '사회/three-kingdoms';
    if (compactDetail.includes('고대사') || compactDetail.includes('삼국시대')) return '사회/ancient-three-kingdoms';
    return `사회/${slug(detailText)}`;
  }
  if (areaText === '인물') return `인물/${slug(detailText)}`;
  if (areaText === '일상') return `일상/${slug(detailText)}`;
  return `${slug(areaText || '기타')}/${slug(detailText || '전체')}`;
}

function inferCompletionType(area, detail, explicitValue) {
  const explicit = normalizeString(explicitValue).toLowerCase();
  if (explicit === 'complete' || explicit === 'loop') return { completionType: explicit, inferred: false };
  if (normalizeString(area) === '국어' && normalizeReadingDetail(detail) === '독서:지엠오 아이') {
    return { completionType: 'complete', inferred: true };
  }
  return { completionType: 'loop', inferred: true };
}

function makeRecordId(userId, areaKey) {
  return `${userId}__${slug(areaKey).replace(/-/g, '_')}`;
}

function badgeMetaFromAreaKey(areaKey, area, detail) {
  const [groupRaw, detailRaw] = normalizeString(areaKey).split('/');
  const groupMap = {
    '포켓몬': 'pokemon',
    '인물': 'people',
    '일상': 'daily',
    '국어': 'korean',
    '수학': 'math',
    '사회': 'social'
  };
  const group = groupMap[groupRaw] || slug(groupRaw || area);
  const sourceId = `${group}_${slug(detailRaw || detail).replace(/-/g, '_')}`;
  return {
    badgeId: sourceId,
    sourceId,
    group,
    label: normalizeString(detail) || detailRaw || sourceId
  };
}

function transformPracticeRecord(row) {
  const userId = normalizeString(row.userId || row.memberUserId || row['회원ID']);
  const area = normalizeString(row.area || row['영역']);
  const detail = normalizeString(row.detail || row.quizKey || row.subFilter || row['세부구분'] || '전체');
  if (!userId || !area || !detail) {
    return { skipped: true, reason: !userId ? 'missing-userId' : 'missing-area-detail', raw: row };
  }

  const correctCount = normalizeNumber(row.correctCount ?? row.correct ?? row.progress ?? row['맞힌개수']);
  const totalCount = normalizeNumber(row.totalCount ?? row.total ?? row['전체개수']);
  const correctIds = fillLegacyIds(row.correctIds ?? row.solvedIds ?? row['맞힌목록'], correctCount);
  const legacyUnknownCount = correctIds.filter(id => id.indexOf('LEGACY_UNKNOWN_') === 0).length;
  const completion = inferCompletionType(area, detail, row.completionType);
  const starCount = normalizeNumber(row.starCount ?? row.stars ?? row['별개수']);
  const areaKey = getAreaKey(area, detail);
  const completed = totalCount > 0 && (correctCount >= totalCount || starCount > 0);

  return {
    recordId: makeRecordId(userId, areaKey),
    userId,
    memberUserId: userId,
    grade: normalizeString(row.grade || row['학년']),
    classNo: normalizeString(row.classNo || row['반']),
    number: normalizeString(row.number || row['번호']),
    nickname: normalizeString(row.nickname || row['닉네임']),
    area,
    detail,
    areaKey,
    completionType: completion.completionType,
    inferredCompletionType: completion.inferred,
    correctCount,
    totalCount,
    correctIds,
    starCount,
    completed,
    hasLegacyUnknown: legacyUnknownCount > 0,
    legacyUnknownCount,
    firstCompletedAt: normalizeString(row.firstCompletedAt || row['최초완주일시']),
    lastCompletedAt: normalizeString(row.lastCompletedAt || row['최근완주일시']),
    lastAchievedAt: normalizeString(row.lastAchievedAt || row.bestAchievedAt || row['최근성취일시']),
    mode: normalizeString(row.mode || row['모드'] || 'practice') || 'practice',
    sourceSheet: normalizeString(row.sourceSheet || '연습기록'),
    sourceRowNumber: normalizeNumber(row.sourceRowNumber),
    mergedSources: [normalizeString(row.sourceSheet || '연습기록')],
    migrationSource: MIGRATION_SOURCE
  };
}

function transformPokemonRecord(row) {
  const generation = normalizeString(row.generation || row['세대']);
  const match = generation.match(/^([1-9])세대$/);
  if (!match) return { skipped: true, reason: 'invalid-pokemon-generation', raw: row };
  const normalized = {
    ...row,
    area: '포켓몬',
    detail: `${match[1]}세대`,
    completionType: 'loop',
    starCount: normalizeBoolean(row.earned ?? row['획득여부']) ? 1 : 0,
    firstCompletedAt: normalizeString(row.earnedAt || row['획득일시']),
    lastCompletedAt: normalizeString(row.earnedAt || row['획득일시']),
    lastAchievedAt: normalizeString(row.bestAchievedAt || row['최고성취일시']),
    sourceSheet: normalizeString(row.sourceSheet || '포켓몬연습기록')
  };
  return transformPracticeRecord(normalized);
}

function mergeRecords(existing, incoming) {
  const mergedIds = uniqueIds([...(existing.correctIds || []), ...(incoming.correctIds || [])]);
  const sourceSet = new Set([...(existing.mergedSources || []), ...(incoming.mergedSources || [])].filter(Boolean));
  const sourceSheet = existing.sourceSheet === '연습기록' ? existing.sourceSheet : incoming.sourceSheet;
  const canonical = sourceSheet === incoming.sourceSheet ? incoming : existing;
  const legacyUnknownCount = mergedIds.filter(id => id.indexOf('LEGACY_UNKNOWN_') === 0).length;

  return {
    ...existing,
    grade: existing.grade || incoming.grade,
    classNo: existing.classNo || incoming.classNo,
    number: existing.number || incoming.number,
    nickname: existing.nickname || incoming.nickname,
    correctCount: Math.max(existing.correctCount || 0, incoming.correctCount || 0),
    totalCount: Math.max(existing.totalCount || 0, incoming.totalCount || 0),
    correctIds: mergedIds,
    starCount: Math.max(existing.starCount || 0, incoming.starCount || 0),
    completed: existing.completed || incoming.completed,
    hasLegacyUnknown: legacyUnknownCount > 0,
    legacyUnknownCount,
    firstCompletedAt: existing.firstCompletedAt || incoming.firstCompletedAt,
    lastCompletedAt: incoming.lastCompletedAt || existing.lastCompletedAt,
    lastAchievedAt: incoming.lastAchievedAt || existing.lastAchievedAt,
    sourceSheet: canonical.sourceSheet,
    sourceRowNumber: canonical.sourceRowNumber,
    mergedSources: Array.from(sourceSet)
  };
}

function extractRows(input) {
  return {
    practiceRows: Array.isArray(input.practiceRecords) ? input.practiceRecords : (Array.isArray(input.records) ? input.records : []),
    pokemonRows: Array.isArray(input.pokemonPracticeRecords) ? input.pokemonPracticeRecords : []
  };
}

function buildImportModel(input) {
  const { practiceRows, pokemonRows } = extractRows(input);
  const skipped = [];
  const byRecordId = new Map();
  let duplicateMergeCount = 0;

  practiceRows.map(transformPracticeRecord).concat(pokemonRows.map(transformPokemonRecord)).forEach(record => {
    if (record.skipped) {
      skipped.push(record);
      return;
    }
    if (byRecordId.has(record.recordId)) {
      byRecordId.set(record.recordId, mergeRecords(byRecordId.get(record.recordId), record));
      duplicateMergeCount += 1;
      return;
    }
    byRecordId.set(record.recordId, record);
  });

  const records = Array.from(byRecordId.values());
  const badges = records.map(recordToBadge);
  const summaries = buildSummaries(records, badges);

  return {
    records,
    badges,
    summaries,
    skipped,
    duplicateMergeCount,
    legacyUnknownRecordCount: records.filter(record => record.hasLegacyUnknown).length
  };
}

function recordToBadge(record) {
  const meta = badgeMetaFromAreaKey(record.areaKey, record.area, record.detail);
  const correct = Math.min(record.correctCount || 0, record.totalCount || 0);
  const total = record.totalCount || 0;
  const completed = !!total && (correct >= total || (record.starCount || 0) > 0);
  const progressPercent = total ? Math.min(100, Math.round((correct / total) * 100)) : 0;
  return {
    userId: record.userId,
    memberUserId: record.memberUserId,
    badgeId: meta.badgeId,
    label: meta.label,
    group: meta.group,
    areaKey: record.areaKey,
    sourceId: meta.sourceId,
    correct,
    total,
    starCount: record.starCount || 0,
    completed,
    progressPercent,
    available: (record.starCount || 0) > 0 || completed,
    hasLegacyUnknown: !!record.hasLegacyUnknown,
    migrationSource: MIGRATION_SOURCE
  };
}

function buildSummaries(records, badges) {
  const byUser = new Map();

  records.forEach(record => {
    if (!byUser.has(record.userId)) {
      byUser.set(record.userId, {
        userId: record.userId,
        memberUserId: record.userId,
        totalStars: 0,
        earnedBadgeCount: 0,
        groupStars: {},
        recommendedBadgeId: '',
        recordCount: 0,
        legacyUnknownRecordCount: 0,
        groups: {},
        migrationSource: MIGRATION_SOURCE
      });
    }
    const summary = byUser.get(record.userId);
    summary.recordCount += 1;
    if (record.hasLegacyUnknown) summary.legacyUnknownRecordCount += 1;
  });

  badges.forEach(badge => {
    const summary = byUser.get(badge.userId);
    if (!summary) return;
    summary.totalStars += badge.starCount || 0;
    if (badge.available) summary.earnedBadgeCount += 1;
    summary.groupStars[badge.group] = (summary.groupStars[badge.group] || 0) + (badge.starCount || 0);
    if (!summary.groups[badge.group]) summary.groups[badge.group] = {};
    summary.groups[badge.group][badge.badgeId] = {
      correct: badge.correct,
      total: badge.total,
      starCount: badge.starCount,
      available: badge.available
    };
  });

  byUser.forEach(summary => {
    const userBadges = badges.filter(badge => badge.userId === summary.userId && badge.available);
    userBadges.sort((a, b) => {
      if ((b.starCount || 0) !== (a.starCount || 0)) return (b.starCount || 0) - (a.starCount || 0);
      if ((b.progressPercent || 0) !== (a.progressPercent || 0)) return (b.progressPercent || 0) - (a.progressPercent || 0);
      return a.badgeId.localeCompare(b.badgeId);
    });
    summary.recommendedBadgeId = userBadges[0] ? userBadges[0].badgeId : '';
  });

  return Array.from(byUser.values());
}

function summarize(model, sampleLimit) {
  console.log(`Dry run: ${model.records.length} practiceRecords prepared.`);
  console.log(`User badges prepared: ${model.badges.length}`);
  console.log(`User practice summaries prepared: ${model.summaries.length}`);
  console.log(`Pokemon/duplicate records merged: ${model.duplicateMergeCount}`);
  console.log(`LEGACY_UNKNOWN records: ${model.legacyUnknownRecordCount}`);
  console.log(`Skipped rows: ${model.skipped.length}`);

  model.records.slice(0, Math.max(0, sampleLimit)).forEach(record => {
    const badge = model.badges.find(item => item.userId === record.userId && item.areaKey === record.areaKey);
    console.log(JSON.stringify({
      practiceRecordPath: `${PRACTICE_RECORDS_COLLECTION}/${record.recordId}`,
      badgePath: `${USER_BADGES_COLLECTION}/${record.userId}/badges/${badge ? badge.badgeId : '(missing)'}`,
      summaryPath: `${USER_PRACTICE_SUMMARY_COLLECTION}/${record.userId}`,
      data: {
        userId: record.userId,
        areaKey: record.areaKey,
        correctCount: record.correctCount,
        totalCount: record.totalCount,
        starCount: record.starCount,
        hasLegacyUnknown: record.hasLegacyUnknown,
        mergedSources: record.mergedSources
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

async function commitModel(model) {
  const db = initializeAdmin();
  const writes = [];
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

  model.records.forEach(record => {
    writes.push({
      ref: db.collection(PRACTICE_RECORDS_COLLECTION).doc(record.recordId),
      data: { ...record, migratedAt: serverTimestamp }
    });
  });

  model.badges.forEach(badge => {
    writes.push({
      ref: db.collection(USER_BADGES_COLLECTION).doc(badge.userId).collection('badges').doc(badge.badgeId),
      data: { ...badge, updatedAt: serverTimestamp, migratedAt: serverTimestamp }
    });
  });

  model.summaries.forEach(summary => {
    writes.push({
      ref: db.collection(USER_PRACTICE_SUMMARY_COLLECTION).doc(summary.userId),
      data: { ...summary, migratedAt: serverTimestamp }
    });
  });

  let committed = 0;
  for (let i = 0; i < writes.length; i += 450) {
    const batch = db.batch();
    writes.slice(i, i + 450).forEach(write => batch.set(write.ref, write.data, { merge: true }));
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

  await commitModel(model);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
