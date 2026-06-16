#!/usr/bin/env node

const assert = require('node:assert/strict');
const {
  getRankingModeFilterValues,
  normalizeRankingCategoryKey,
  getTopRankingRecordsByCategoryKeys,
  getLatestRankingRecords,
  buildQuizKingSummariesFromRankingRecords,
  getPopularFilteredRows
} = require('../../public/js/domain/ranking-domain.js');

function testModeFilterValues() {
  assert.equal(getRankingModeFilterValues('all'), null);
  assert.deepEqual(getRankingModeFilterValues('normal'), ['normal', 'legacy']);
  assert.deepEqual(getRankingModeFilterValues('speed'), ['speed']);
}

function testTinipingCategoryNormalization() {
  assert.equal(normalizeRankingCategoryKey('인물티니핑'), '티니핑');
  assert.equal(normalizeRankingCategoryKey('', '인물티니핑 퀴즈'), '티니핑');
  assert.equal(normalizeRankingCategoryKey('맞춤법'), '맞춤법');
}

function testTopRankingRecordsByCategoryKeys() {
  const records = [
    { recordId: 'a1', memberUserId: 'a', categoryKey: '맞춤법', rankingMode: 'normal', score: 8, elapsedSeconds: 20, recordedAt: '2026-01-01' },
    { recordId: 'a2', memberUserId: 'a', categoryKey: '맞춤법', rankingMode: 'normal', score: 8, elapsedSeconds: 15, recordedAt: '2026-01-02' },
    { recordId: 'b1', memberUserId: 'b', categoryKey: '맞춤법', rankingMode: 'legacy', score: 9, elapsedSeconds: 30, recordedAt: '2026-01-01' },
    { recordId: 'c1', memberUserId: 'c', categoryKey: '아재개그', rankingMode: 'normal', score: 10, elapsedSeconds: 10, recordedAt: '2026-01-01' }
  ];

  const rows = getTopRankingRecordsByCategoryKeys(records, ['맞춤법'], 10, ['normal', 'legacy']);
  assert.deepEqual(rows.map(row => row.recordId), ['b1', 'a2']);
}

function testLatestRankingRecords() {
  const records = [
    { recordId: 'old', recordedAt: '2026-01-01T00:00:00.000Z' },
    { recordId: 'new', recordedAt: '2026-01-03T00:00:00.000Z' },
    { recordId: 'middle', createdAt: { toMillis: () => Date.parse('2026-01-02T00:00:00.000Z') } }
  ];

  assert.deepEqual(getLatestRankingRecords(records, 2).map(row => row.recordId), ['new', 'middle']);
}

function testQuizKingSummaryBuildsBestByUserCategory() {
  const summaries = buildQuizKingSummariesFromRankingRecords([
    { memberUserId: 'a', displayName: 'A', categoryKey: '맞춤법', category: '맞춤법', score: 8, elapsedSeconds: 20 },
    { memberUserId: 'a', displayName: 'A', categoryKey: '맞춤법', category: '맞춤법', score: 9, elapsedSeconds: 30 },
    { memberUserId: 'a', displayName: 'A', categoryKey: '인물티니핑', category: '인물티니핑', score: 7, elapsedSeconds: 10 },
    { memberUserId: 'b', displayName: 'B', categoryKey: '맞춤법', category: '맞춤법', score: 5, elapsedSeconds: 10 }
  ]);

  const userA = summaries.find(item => item.memberUserId === 'a');
  assert.equal(userA.categoryCount, 2);
  assert.equal(userA.totalScore, 16);
  assert.equal(userA.categories['맞춤법'].score, 9);
  assert.equal(userA.categories['티니핑'].category, '티니핑');
}

function testPopularFilteredRows() {
  const records = [
    { recordId: 'dad-a', memberUserId: 'a', categoryKey: '아재개그', rankingMode: 'normal', score: 9, elapsedSeconds: 20 },
    { recordId: 'dad-a-speed', memberUserId: 'a', categoryKey: '아재개그', rankingMode: 'speed', score: 8, elapsedSeconds: 10 },
    { recordId: 'poke-b', memberUserId: 'b', categoryKey: '포켓몬쉬움', rankingMode: 'normal', score: 7, elapsedSeconds: 9 },
    { recordId: 'poke-b-speed', memberUserId: 'b', categoryKey: '포켓몬보통', rankingMode: 'speed', score: 10, elapsedSeconds: 9 },
    { recordId: 'tin-c', memberUserId: 'c', categoryKey: '티니핑', rankingMode: 'normal', score: 6, elapsedSeconds: 5 }
  ];
  const areas = [
    { id: 'all', keys: ['아재개그', '포켓몬쉬움', '포켓몬보통', '티니핑'] },
    { id: 'pokemon', keys: ['포켓몬쉬움', '포켓몬보통'] },
    { id: 'tiniping', keys: ['티니핑'] }
  ];
  const difficulties = [
    { id: 'all', keys: ['포켓몬쉬움', '포켓몬보통'] },
    { id: 'easy', keys: ['포켓몬쉬움'] }
  ];
  const deps = {
    rowLimit: 10,
    getPopularAreaForRecord: record => {
      if(String(record.categoryKey).startsWith('포켓몬')) return { id: 'pokemon' };
      if(record.categoryKey === '티니핑') return { id: 'tiniping' };
      return { id: 'dadJoke' };
    }
  };

  assert.deepEqual(getPopularFilteredRows(records, { areaId: 'all', areas }, deps).map(row => row.recordId), [
    'poke-b-speed',
    'dad-a',
    'dad-a-speed',
    'tin-c'
  ]);
  assert.deepEqual(getPopularFilteredRows(records, {
    areaId: 'pokemon',
    areas,
    difficultyId: 'easy',
    difficulties,
    modeId: 'normal',
    pokemonRankingCategoryKeys: ['포켓몬쉬움', '포켓몬보통']
  }, deps).map(row => row.recordId), ['poke-b']);
}

function run() {
  testModeFilterValues();
  testTinipingCategoryNormalization();
  testTopRankingRecordsByCategoryKeys();
  testLatestRankingRecords();
  testQuizKingSummaryBuildsBestByUserCategory();
  testPopularFilteredRows();
  console.log('Domain tests passed: ranking-domain');
}

run();
