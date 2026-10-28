'use strict';
const catalog = require('./catalog.json');
const DEFAULT_OUTFIT = Object.freeze({ dress: 1042194, pants: 1062067 });
// Display-only clothing. Never add these IDs to ownership, receipts or saved outfits.
function withDefaultOutfit(payload) {
  const itemCode = { ...payload.itemCode };
  const needsBottom = !itemCode.dress || catalog['top-' + itemCode.dress]?.category === 'top';
  if (!itemCode.dress) itemCode.dress = DEFAULT_OUTFIT.dress;
  if (needsBottom && !itemCode.pants) itemCode.pants = DEFAULT_OUTFIT.pants;
  return { ...payload, itemCode };
}
module.exports = { DEFAULT_OUTFIT, withDefaultOutfit };
