"use strict";

const FIRST_WEEK = "2026-09-21";
const WEEKLY_COUPONS = 0;

function getCouponWeekKey(now = new Date()) {
  const kst = new Date(new Date(now).getTime() + 9 * 60 * 60 * 1000);
  if (!Number.isFinite(kst.getTime())) throw new Error("Invalid coupon date");
  kst.setUTCDate(kst.getUTCDate() - (kst.getUTCDay() + 6) % 7);
  return kst.toISOString().slice(0, 10);
}

function getWeeklyCouponState(economy = {}, now = new Date()) {
  const weekKey = getCouponWeekKey(now);
  return { granted: false, coupons: 0, weekKey };
}

// Retain the legacy API for old clients; retired coupons never read or write balances.
function createCouponService({ db }) {
  async function resetMember(memberUserId, now = new Date(), authorize) {
    if (authorize) await db.runTransaction(transaction => authorize(transaction));
    return getWeeklyCouponState({}, now);
  }
  async function resetAll(now = new Date()) {
    return { weekKey: getCouponWeekKey(now), checked: 0, reset: 0 };
  }
  return { resetMember, resetAll };
}

module.exports = { FIRST_WEEK, WEEKLY_COUPONS, getCouponWeekKey, getWeeklyCouponState, createCouponService };
