"use strict";

function resolveSeasonMonth(item = {}, dateKey) {
  const currentMonth = String(dateKey).slice(0, 7);
  const configuredMonth = String(item.targetMonth || item.month || "");
  return item.autoRenew === true || !/^\d{4}-(0[1-9]|1[0-2])$/.test(configuredMonth)
    ? currentMonth : configuredMonth;
}

module.exports = { resolveSeasonMonth };
