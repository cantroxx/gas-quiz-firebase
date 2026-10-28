const assert = require('node:assert/strict');
const { resolveSeasonMonth } = require('../../functions/season-period');

const rolling = { autoRenew: true, targetMonth: '2026-07' };
assert.equal(resolveSeasonMonth(rolling, '2026-09-30'), '2026-09');
assert.equal(resolveSeasonMonth(rolling, '2026-10-01'), '2026-10');
assert.equal(resolveSeasonMonth(rolling, '2027-01-01'), '2027-01');
assert.equal(resolveSeasonMonth(rolling, '2028-02-29'), '2028-02');
assert.equal(resolveSeasonMonth({ autoRenew: false, targetMonth: '2026-07' }, '2026-10-01'), '2026-07');
assert.equal(resolveSeasonMonth({ targetMonth: '2026-07' }, '2026-10-01'), '2026-07');
assert.equal(resolveSeasonMonth({ targetMonth: '' }, '2026-10-01'), '2026-10');
assert.equal(resolveSeasonMonth({ targetMonth: '2026-13' }, '2026-10-01'), '2026-10');
assert.deepEqual(rolling, { autoRenew: true, targetMonth: '2026-07' });
console.log('Season period: monthly rollover, year boundary, leap year, fixed-period compatibility and unchanged source settings passed.');
