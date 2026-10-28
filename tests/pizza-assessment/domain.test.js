'use strict';
const assert = require('node:assert/strict');
const Q = require('../../functions/pizza-assessment/questions');
assert.equal(Q.questions.length, 25);
assert.equal(new Set(Q.questions.map(q => q.id)).size, 25);
assert.ok(Q.publicQuestions().every(q => !('answer' in q) && !('feedback' in q)));
// Independently checked answer values, including carry, borrowing and word problems.
const expected = ['5/8', '1/3', '4/7', '0', '1/10', '3/2', '5/4', '1', '12/7', '1 4/5', '26/7', '22/5', '35/8', '6', '8/3', '16/7', '13/5', '3/2', '19/8', '9/4', '33/8', '8/5', '1/2', '12/7', '1'];
expected.forEach((a, i) => assert.ok(Q.isCorrect(Q.questions[i], a), `Independent answer for ${i + 1}`));
assert.equal(Q.grade(expected).score, 100);
assert.equal(Q.grade(Array(25).fill('')).score, 0);
assert.equal(Q.grade(['5/8']).score, 4);
for (const value of ['NaN', 'Infinity', '-1/3', '1/0', '<img>', '1e2', '0.625', '1/2/3', '1 2', '', '999999/1']) assert.equal(Q.rational(value), null);
assert.ok(Q.isCorrect(Q.questions[0], '10/16'));
assert.ok(Q.isCorrect(Q.questions[5], '1 3/6'));
assert.ok(!Q.isCorrect(Q.questions[9], '9/5'), 'Mixed-number conversion question requires mixed form');
assert.ok(!Q.isCorrect(Q.questions[9], '0 9/5'));
assert.ok(!Q.isCorrect(Q.questions[24], '5/7'), 'Reasoning question must select the reason');
console.log('Pizza assessment: 25 independent answers, equivalent fractions, mixed-form requirement, invalid inputs and scoring passed.');
