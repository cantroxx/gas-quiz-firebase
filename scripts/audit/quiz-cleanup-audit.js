#!/usr/bin/env node
'use strict';

// Offline evidence only: no Firebase SDK, credentials, network or data mutation.
// Usage: node scripts/audit/quiz-cleanup-audit.js > /tmp/quiz-cleanup-audit.json
// Text references are candidates, not proof of reachability or permission to delete.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function walk(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => {
      if(e.name.startsWith('.') || ['node_modules', 'dev-assets'].includes(e.name) || e.isSymbolicLink()) return [];
      const p = `${dir}/${e.name}`;
      return e.isDirectory() ? walk(p) : e.isFile() ? [p] : [];
    });
}
const runtimePaths = [...walk('functions'), ...walk('public')]
  .filter(p => /\.(?:js|html|cjs|mjs)$/.test(p) && p !== 'public/js/app.bundle.js');
const source = new Map(runtimePaths.map(p => [p, read(p)]));
function references(name, paths = runtimePaths) {
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
  return paths.flatMap(p => {
    const text = source.get(p);
    const hits = [...text.matchAll(re)];
    return hits.length ? [{ path: p, count: hits.length, lines: hits.map(m => text.slice(0, m.index).split('\n').length) }] : [];
  });
}
function catalog() {
  const context = vm.createContext({ window: {}, URLSearchParams });
  for(const file of ['quiz-catalog', 'subject-quiz-catalog', 'popular-quiz-catalog'])
    vm.runInContext(read(`public/js/data/${file}.js`), context, { timeout: 2000 });
  const c = context.window.DJ48QuizCatalog;
  return {
    subjects: Object.fromEntries(Object.entries(c.SUBJECT_CATALOG).map(([k, s]) => [k, s.quizzes])),
    legacySubjectIds: context.window.DJ48SubjectQuiz.legacyQuizIds,
    disabled: Object.entries(c.QUIZ_CATALOG).filter(([, q]) => q.enabled === false).map(([id]) => id)
  };
}
function fileInventory() {
  const files = walk('public').map(p => {
    const bytes = fs.readFileSync(path.join(ROOT, p));
    return { path: p, bytes: bytes.length, sha256: hash(bytes) };
  });
  const groups = new Map();
  for(const f of files) {
    if(!groups.has(f.sha256)) groups.set(f.sha256, []);
    groups.get(f.sha256).push(f);
  }
  const duplicates = [...groups.values()].filter(g => g.length > 1)
    .map(g => ({ bytesEach: g[0].bytes, duplicateBytes: g[0].bytes * (g.length - 1), paths: g.map(f => f.path) }))
    .sort((a, b) => b.duplicateBytes - a.duplicateBytes);
  return { fileCount: files.length, totalBytes: files.reduce((n, f) => n + f.bytes, 0),
    duplicateGroupCount: duplicates.length, duplicateBytes: duplicates.reduce((n, g) => n + g.duplicateBytes, 0),
    largest: files.sort((a, b) => b.bytes - a.bytes).slice(0, 20), duplicates,
    caveat: 'Byte duplicates only; independent entrypoints and generated outputs may require both copies. Not download or database-read savings.' };
}
function popularAssets() {
  const pack = JSON.parse(read('functions/popular-quiz/catalog.json'));
  const referenced = new Set(pack.questions.map(q => `public${q.imageUrl}`));
  const originals = new Set(pack.questions.filter(q => q.originalImageUrl).map(q => `public${q.originalImageUrl}`));
  const files = walk('public/popular-quiz/assets').map(p => ({ path: p, bytes: fs.statSync(path.join(ROOT, p)).size }));
  return { questions: pack.questions.length, files: files.length,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
    largerThanOneMillionBytes: files.filter(f => f.bytes > 1000000).length,
    notReferencedByCurrentPack: files.filter(f => !referenced.has(f.path)),
    retainedForSourceValidationAndOldRuns: files.filter(f => originals.has(f.path)),
    neitherDisplayNorOriginalReference: files.filter(f => !referenced.has(f.path) && !originals.has(f.path)),
    currentDisplayBytes: [...referenced].reduce((sum, p) => sum + (fs.existsSync(path.join(ROOT, p)) ? fs.statSync(path.join(ROOT, p)).size : 0), 0),
    missingFromDisk: [...referenced].filter(p => !fs.existsSync(path.join(ROOT, p))),
    caveat: 'Current display references and retained original provenance are distinct. Originals remain necessary for hash validation and old in-flight runs; neither list is a deletion authorization.' };
}
async function probes() {
  const context = vm.createContext({ console, URLSearchParams });
  context.window = context;
  vm.runInContext(read('public/js/data/quiz-catalog.js'), context);
  vm.runInContext(read('public/js/data/subject-quiz-catalog.js'), context);
  vm.runInContext(read('public/js/infrastructure/ranking-repository.js'), context);
  const calls = [];
  context.firebase = { auth: () => ({ currentUser: { uid: 'audit-uid' } }), app: () => ({
    functions: () => ({ httpsCallable: name => async payload => {
      calls.push({ name, action: payload.action });
      return { data: { records: [{ memberUserId: 'audit-member', score: 1 }], summaries: [] } };
    } })
  }) };
  const query = { where() { return this; }, limit() { return this; }, async get() { return { docs: [] }; } };
  const repo = context.DJ48RankingRepository.createRankingRepository({ db: { collection: () => query } });
  await repo.loadMemberRankingRecords('audit-member');
  await repo.loadMemberRankingRecords('audit-member');
  assert.equal(calls.length, 2);

  const service = require('../../functions/subject-quiz/service');
  const curriculum = require('../../functions/subject-quiz/curriculum');
  const reads = [];
  const dbRef = (p, kind = 'document') => ({ path: p, kind,
    collection: n => dbRef(`${p}/${n}`, 'query'), doc: id => dbRef(`${p}/${id}`),
    get parent() { return dbRef(p.split('/').slice(0, -1).join('/'), 'query'); },
    limit(n) { return { ...this, maximum: n }; }
  });
  const db = { collection: n => dbRef(n, 'query'), runTransaction: fn => fn({
    async get(ref) {
      reads.push({ path: ref.path, kind: ref.kind, limit: ref.maximum || null });
      if(ref.kind === 'query') {
        const docs = Array.from({ length: 30 }, (_, i) => ({ id: `audit-${i}`, data: () => ({ nickname: 'synthetic', totalScore: 1, categories: [] }) }));
        return { docs, size: docs.length };
      }
      const data = ref.path.startsWith('authLinks/') ? { memberUserId: 'audit-member' }
        : ref.path.startsWith('users/') ? { authUid: 'audit-uid', status: 'active', active: true } : {};
      return { exists: true, data: () => data };
    }
  }) };
  const result = await service.createService({ db }).act('audit-uid', { action: 'rankingSnapshot' });
  assert.equal(result.records.length, 30 * curriculum.subjects.length);
  assert.equal(reads.filter(r => r.kind === 'query').length, 5);

  const admin = vm.createContext({ window: {} });
  vm.runInContext(read('public/js/infrastructure/admin-repository.js'), admin);
  const freshnessReads = [];
  const freshnessDb = { collection: c => ({ doc: id => ({ async get() {
    freshnessReads.push(`${c}/${id}`); return { exists: true, data: () => ({}) };
  } }) }) };
  await admin.window.DJ48AdminRepository.createAdminRepository({ getFirestoreDb: () => freshnessDb }).loadServerFreshnessSignature();
  assert(!freshnessReads.includes('appSettings/seasonEvents'));
  assert.equal(freshnessReads.length, 3);

  // Evaluate only pure legacy quest definitions/helpers, with an inert write recorder.
  const index = read('functions/index.js');
  const definitions = index.slice(index.indexOf('const EVENT_DAILY_QUEST_POOL'), index.indexOf('const DEFAULT_CLASSROOM_SETTINGS'));
  const helpers = index.slice(index.indexOf('function hashStringForSelection'), index.indexOf('function slugifyClassroomGemId'));
  const writes = [];
  const event = vm.createContext({ crypto, db: { collection: c => ({ doc: id => ({ path: `${c}/${id}` }) }) },
    FieldValue: { increment: n => n, serverTimestamp: () => 0 }, rewardLogId: parts => parts.join('__'),
    getKstDateKey: () => '2026-10-18', getKstWeekKey: () => '2026-10-12' });
  vm.runInContext(definitions + '\n' + helpers, event);
  for(const quizId of ['subject-korean', 'subject-math', 'subject-social', 'subject-science', 'flag-country', 'idol']) {
    const paths = [];
    event.updateEventQuestProgressForKinds({ set: ref => paths.push(ref.path) }, {
      memberUserId: 'audit-member', kinds: event.getPracticeQuestKindsForQuiz(quizId)
    });
    writes.push({ quizId, date: '2026-10-18', legacyProgressWrites: paths.length });
  }
  assert(writes.find(x => x.quizId === 'subject-math').legacyProgressWrites > 0);
  return { personalRanking: { invocations: 2, callableCalls: calls },
    subjectRankingSnapshot: { syntheticMembersPerCollection: 30, returnedRecords: result.records.length,
      documentGets: reads.filter(r => r.kind === 'document').length, queries: reads.filter(r => r.kind === 'query'),
      modeledDocumentsReturned: reads.filter(r => r.kind === 'document').length + 30 * 5,
      caveat: 'One synthetic transaction attempt; not measured production usage or billing.' },
    freshnessReads, legacyEventWrites: writes,
    legacyEventWriteProbeCaveat: 'Direct invocation of the retained legacy helper only; this does not show writes from current reward callsites.',
    legacyEventCallsiteTextCount: Math.max(0, (index.match(/\bupdateEventQuestProgressForKinds\b/g) || []).length - 1) };
}
async function main() {
  const index = read('functions/index.js');
  const functionPaths = runtimePaths.filter(p => p.startsWith('functions/'));
  const declarations = [...index.matchAll(/^(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => ({
    name: m[1], line: index.slice(0, m.index).split('\n').length, references: references(m[1], functionPaths)
  }));
  const exports = [...index.matchAll(/^exports\.([\w$]+)\s*=\s*(\w+)/gm)].map(m => ({
    name: m[1], trigger: m[2], line: index.slice(0, m.index).split('\n').length,
    publicReferences: references(m[1], runtimePaths.filter(p => p.startsWith('public/')))
  }));
  const status = execFileSync('git', ['status', '--porcelain', '-uall'], { cwd: ROOT, encoding: 'utf8' }).trimEnd().split('\n').filter(Boolean);
  const evidencePaths = ['functions/index.js', 'functions/growth/quests.js', 'functions/subject-quiz/service.js',
    'functions/popular-quiz/service.js', 'public/index.html', 'public/js/app.bundle.js',
    'public/js/infrastructure/ranking-repository.js', 'public/js/application/ranking-usecases.js',
    'public/js/infrastructure/admin-repository.js'];
  const report = { generatedAt: new Date().toISOString(),
    scope: 'Local functions/public sources only; excludes private, exports, root Apps Script, remote data and credentials.',
    limitations: ['Lexical references include strings/comments, not a complete call graph.',
      'Scheduled/Firestore triggers and external clients do not require public callsites.',
      'No collection counts, orphan determinations, runtime traffic or production Functions source verification.'],
    git: { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
      trackedModifiedEntries: status.filter(s => !s.startsWith('??')).length, untrackedFiles: status.filter(s => s.startsWith('??')).length },
    sourceHashes: evidencePaths.map(p => ({ path: p, sha256: hash(read(p)) })),
    effectiveCatalog: catalog(), probes: await probes(),
    localFunctionExportCount: exports.length,
    exportsWithoutPublicTextReferences: exports.filter(e => !e.publicReferences.length),
    singleOccurrenceServerFunctionCandidates: declarations.filter(d => d.references.reduce((n, r) => n + r.count, 0) === 1),
    publicFiles: fileInventory(), popularAssets: popularAssets() };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
