'use strict';
// Read-only content audit. No Firebase SDK, network, or student records.
// IDs, source reuse, and numeric-template reuse are separate measurements.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const C = require('../../functions/subject-quiz/curriculum');
const P = require('../../functions/subject-quiz/pool');
const D = require('../../functions/subject-quiz/deck');
const spelling = require('../../functions/subject-quiz/spelling');
const history = require('../../functions/subject-quiz/history-data');
const groups = ['korean-semester', 'spelling', 'math', 'social-semester', 'history', 'science'];
const group = u => u.subject === 'math' || u.subject === 'science' ? u.subject : u.group === 'spelling' ? 'spelling' : u.group.endsWith('history') ? 'history' : u.subject + '-semester';
const normalize = text => text.replace(/\d+(?:\.\d+)?/g, '#').replace(/\s+/g, ' ').trim();
const pct = (n, d) => d ? +(100 * n / d).toFixed(2) : null;
function atoms(u, q, materials) {
  if (u.subject === 'math') return [q.skill]; // Number changes are NOT new skills.
  if(q.contentTopics?.length)return q.contentTopics;
  if (u.group === 'spelling') {
    const found = spelling.filter(x => [x.sentence, x.sentence.replace('□', x.wrong), x.sentence.replace('□', x.correct)].some(s => q.passage.includes(s))).map(x => 'spelling:' + x.sentence);
    if(!found.length)return q.sourceIds.map(id=>'spelling-context:'+id);
    assert.equal(found.length, 2);
    return found;
  }
  return q.sourceIds.flatMap(id => {
    const source = materials.get(id);
    assert(source);
    if (history[u.id] && (q.skill.endsWith(':chronology-context') || q.skill.includes(':history-'))) {
      const found = history[u.id].filter(x => source.passage.includes(x[2])).map(x => 'event:' + x[0]);
      if(q.skill.endsWith(':chronology-context'))assert.equal(found.length, 4);else assert.ok(found.length>=1);
      return found;
    }
    return [id];
  });
}
function blindLength(q, longest) {
  const lengths = q.choices.map(x => [...x.replace(/\s/g, '')].length);
  const chosen = (longest ? Math.max : Math.min)(...lengths);
  return lengths[q.answer] === chosen ? 1 / lengths.filter(x => x === chosen).length : 0;
}
const rows = [], samples = [];
for (const u of C.units) {
  const pool = P.get(u.id), ids = P.ids(pool), materials = new Map(pool.materials.map(m => [m.id, m]));
  const exact = new Set(), stems = new Set(), shapes = new Set(), skills = {}, sources = new Set(), atomic = new Set();
  let paired = 0, longest = 0, shortest = 0, explanation = 0, diagram = 0, chronology = 0, binaryPair = 0;
  const sourceTexts = new Set(),difficulty={};
  for (const id of ids) {
    const q = P.question(u.id, id, 'learning-quality-20261018');
    exact.add(q.fingerprint);
    const stem = JSON.stringify([q.passage, q.prompt, q.diagram]);
    stems.add(stem); shapes.add(normalize(stem));
    skills[q.skill] = (skills[q.skill] || 0) + 1;
    for (const s of q.sourceIds) { sources.add(s); if (materials.has(s)) sourceTexts.add(normalize(materials.get(s).passage)); }
    for (const a of atoms(u, q, materials)) atomic.add(a);
    paired += q.kind === 'paired';
    binaryPair += q.kind === 'paired' || (u.group === 'spelling' && !q.contentTopics?.length && /:(paired-context|proofread|spelling-context)$/.test(q.skill));
    difficulty[q.difficulty]=(difficulty[q.difficulty]||0)+1;
    chronology += q.skill.endsWith(':chronology-context');
    longest += blindLength(q, true); shortest += blindLength(q, false);
    explanation += Boolean(q.explanation); diagram += Boolean(q.diagram);
  }
  const sequence = {};
  for (const horizon of [30, 100]) {
    let exactRepeat = 0, sourceRepeat = 0, atomRepeat = 0, allAtomsOld = 0, distinctAtoms = 0, extras = 0;
    const firstAtomRepeats = [],levels={},families={};
    for (let trial = 0; trial < 10; trial++) {
      let state = {}, first = null;
      const seen = new Set(), seenSource = new Set(), seenAtom = new Set();
      for (let i = 0; i < horizon; i++) {
        const out = D.next(u.id, state, 'learning-quality-20261018-' + trial);
        state = out.history;levels[out.question.difficulty]=(levels[out.question.difficulty]||0)+1;families[out.question.family]=(families[out.question.family]||0)+1;
        const q = out.question, aa = atoms(u, q, materials);
        exactRepeat += seen.has(q.fingerprint);
        sourceRepeat += q.sourceIds.some(id => seenSource.has(id));
        const repeated = aa.some(id => seenAtom.has(id));
        atomRepeat += repeated; allAtomsOld += aa.every(id => seenAtom.has(id));
        if (repeated && first === null) first = i + 1;
        extras += u.subject === 'math' && q.kind !== 'parameterized';
        seen.add(q.fingerprint); q.sourceIds.forEach(id => seenSource.add(id)); aa.forEach(id => seenAtom.add(id));
      }
      distinctAtoms += seenAtom.size; firstAtomRepeats.push(first);
    }
    sequence[horizon] = { trials: 10, observations: horizon * 10, exactRepeat, sourceRepeat, atomRepeat, allAtomsOld, distinctAtomsMean: distinctAtoms / 10, extras, firstAtomRepeats, levels, families };
  }
  const authored = P.parse(u.id);
  if (authored.length) {
    const selected = [...authored].sort((a, b) => P.hash('review:' + a.id).localeCompare(P.hash('review:' + b.id)))[0];
    samples.push({ unitId: u.id, title: u.title, source: 'authored-stratified-one-per-unit', ...selected });
  } else if (u.subject !== 'math') {
    const q = pool.questions.find(q => u.group === 'spelling' || q.skill.endsWith(':chronology-context'));
    samples.push({ unitId: u.id, title: u.title, source: 'dominant-family-example', ...q });
  }
  rows.push({ id: u.id, title: u.title, group: group(u), size: pool.size, difficulty, numeric: pool.numericSize || 0, paired, binaryPair, chronology, exactDuplicates: pool.size - exact.size, stemDuplicates: pool.size - stems.size, numericNormalizedShapes: shapes.size, skillCounts: skills, sourceCount: u.subject === 'math' ? null : sources.size, atomicCount: atomic.size, sourceTexts: [...sourceTexts], longestExpectedCorrect: longest, shortestExpectedCorrect: shortest, explanation, diagram, sequence });
}
const summary = groups.map(g => {
  const rr = rows.filter(r => r.group === g), sum = key => rr.reduce((n, r) => n + r[key], 0), count = sum('size');
  const sequence = Object.fromEntries([30, 100].map(h => {
    const n = rr.length * 10 * h, s = key => rr.reduce((n, r) => n + r.sequence[h][key], 0);
    return [h, { observations: n, exactRepeatPct: pct(s('exactRepeat'), n), sourceRepeatPct: pct(s('sourceRepeat'), n), atomRepeatPct: pct(s('atomRepeat'), n), allAtomsOldPct: pct(s('allAtomsOld'), n), meanDistinctAtomsPerUnit: +(s('distinctAtomsMean') / rr.length).toFixed(2), mathExtras: s('extras') }];
  }));
  return { group: g, units: rr.length, questions: count, numeric: sum('numeric'), paired: sum('paired'), pairedPct: pct(sum('paired'), count), binaryPairPct: pct(sum('binaryPair'), count), chronology: sum('chronology'), chronologyPct: pct(sum('chronology'), count), sourceCount: g === 'math' ? null : sum('sourceCount'), distinctSourceTextsAcrossGroup: new Set(rr.flatMap(r => r.sourceTexts)).size, atomicCount: sum('atomicCount'), numericNormalizedShapes: sum('numericNormalizedShapes'), exactDuplicates: sum('exactDuplicates'), stemDuplicates: sum('stemDuplicates'), longestChoiceExpectedPct: pct(sum('longestExpectedCorrect'), count), shortestChoiceExpectedPct: pct(sum('shortestExpectedCorrect'), count), explanationPct: pct(sum('explanation'), count), diagramPct: pct(sum('diagram'), count), sequence };
});
const spellingPool = P.get('korean:spelling:1');
const spellingPairs = new Set(spellingPool.questions.filter(q=>!q.contentTopics?.length&&!q.skill.includes(':meaning-')).map(q => atoms(C.unitById[q.unitId], q, null).sort().join('\n')));
let lineGraphs = 0, strictlyIncreasing = 0, minAngleQuestions = 0, minAnswerAlwaysGivenB = 0;
for (let i = 0; i < 2000; i++) {
  const q = P.question('math:4-2:5', P.NUMERIC_VERSION+'-' + i, 'shape-audit');
  lineGraphs++;
  strictlyIncreasing += q.diagram.values.every((v, n, a) => n === 0 || v > a[n - 1]);
  if (i % 4 === 2) {
    const t = P.question('math:4-2:2', P.NUMERIC_VERSION+'-' + i, 'angle-audit');
    minAngleQuestions++;
    const b = Number(t.passage.match(/나는 (\d+)°/)[1]);
    minAnswerAlwaysGivenB += t.choices[t.answer] === b + '°';
  }
}
const dir = path.resolve(__dirname, '../../functions/subject-quiz');
const sourceHashes = Object.fromEntries(fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex')]));
const result = { measuredAt: new Date().toISOString(), revision: P.REVISION, scope: 'local candidate; no production or learner data', sourceHashes, method: { fullPool: true, seeds: 'learning-quality-20261018-{0..9}', horizons: [30, 100], atomDefinition: 'math=skill (numeric variants collapsed); spelling=new learning item ID, legacy=fixed sentence; history=explicit content topic or legacy event; other=underlying source ID', sourceIdsCaveat: 'A source ID may itself be a combination. A numeric math ID is not an independent learning task.', blindLength: 'Ignore stem and content; choose a longest/shortest whitespace-stripped option; ties share probability equally. Descriptive leakage probe, not student performance.' }, structuralProbes: { spellingQuestions: spellingPool.size, unorderedSpellingRulePairs: spellingPairs.size, spellingLearningItems: require('../../functions/subject-quiz/spelling-lessons').rows.length, historyCoreTopics: Object.fromEntries(C.units.filter(u=>u.group.endsWith('history')).map(u=>[u.id,new Set(P.get(u.id).questions.flatMap(q=>q.contentTopics||[])).size])), lineGraphs, strictlyIncreasing, minAngleQuestions, minAnswerAlwaysGivenB }, summary, rows, samples };
const output = process.argv.find(a => a.startsWith('--out='));
if (output) fs.writeFileSync(path.resolve(output.slice(6)), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ revision: result.revision, summary }, null, 2));
