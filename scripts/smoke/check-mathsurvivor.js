const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const gameDir = path.join(root, 'public/mathsurvivor');
const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const referencedIds = new Set([...game.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]));
const missingIds = [...referencedIds].filter((id) => !ids.has(id));
assert.deepEqual(missingIds, [], `mathsurvivor DOM ids missing: ${missingIds.join(', ')}`);

for (const asset of ['style.css', 'problems.js', 'bank.js', 'game.js']) {
  assert.match(html, new RegExp(`${asset.replace('.', '\\.')}\\?v=8`), `${asset} cache version must be 8`);
}

const sandbox = { window: {}, console };
vm.createContext(sandbox);
for (const file of ['problems.js', 'bank.js']) {
  vm.runInContext(fs.readFileSync(path.join(gameDir, file), 'utf8'), sandbox, { filename: file });
}

const P = sandbox.window.MS_Problems;
const B = sandbox.window.MS_Bank;

function validProblem(problem, label) {
  assert.equal(typeof problem.text, 'string', `${label}: missing text`);
  assert.ok(problem.text.trim(), `${label}: empty text`);
  assert.equal(typeof problem.unit, 'string', `${label}: missing unit`);
  assert.equal(problem.choices.length, 4, `${label}: choices must have four items`);
  assert.ok(Number.isInteger(problem.answerIndex), `${label}: answerIndex must be an integer`);
  assert.ok(problem.answerIndex >= 0 && problem.answerIndex < 4, `${label}: answerIndex out of range`);
}

for (const grade of [3, 4, 5, 6]) {
  for (const sem of [1, 2]) {
    const units = P.unitList(grade, sem);
    assert.ok(units.length > 0, `math ${grade}-${sem}: no units`);
    assert.equal(new Set(units).size, units.length, `math ${grade}-${sem}: duplicate units`);
    for (const unit of units) {
      for (let i = 0; i < 12; i++) {
        const problem = P.generate(grade, sem, unit);
        validProblem(problem, `math ${grade}-${sem} ${unit}`);
        assert.equal(problem.unit, unit, `math ${grade}-${sem}: unit filter escaped`);
      }
    }
  }
}

for (const subject of Object.keys(B.SUBJECTS).filter((id) => id !== 'math')) {
  for (const grade of [3, 4, 5, 6]) {
    for (const sem of [1, 2]) {
      const units = B.unitList(subject, grade, sem);
      assert.ok(units.length > 0, `${subject} ${grade}-${sem}: no units`);
      for (const unit of units) {
        const problem = B.serve(subject, grade, sem, unit);
        validProblem(problem, `${subject} ${grade}-${sem} ${unit}`);
        assert.ok(problem.unit.endsWith(` · ${unit}`), `${subject} ${grade}-${sem}: unit filter escaped`);
      }
    }
  }
}

console.log('Mathsurvivor checks passed: DOM ids, cache versions, grades, semesters, subjects, and unit filters.');
