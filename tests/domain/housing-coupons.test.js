const assert = require('node:assert/strict');
const { getCouponWeekKey, getWeeklyCouponState, WEEKLY_COUPONS } = require('../../functions/housing-coupons');
assert.equal(WEEKLY_COUPONS, 0);
assert.equal(getCouponWeekKey('2026-09-20T15:00:00Z'), '2026-09-21');
for (const date of ['2026-09-14T03:00:00Z', '2026-10-18T15:00:00Z', '2027-01-03T15:00:00Z']) {
  for (const balance of [0, 2, 10, 35]) {
    assert.deepEqual(getWeeklyCouponState({ housingCoupons: balance }, date), {
      granted: false, coupons: 0, weekKey: getCouponWeekKey(date)
    });
  }
}
console.log('PASS retired housing coupons: no grant or usable balance across Monday boundaries.');
