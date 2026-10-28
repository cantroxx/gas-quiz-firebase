'use strict';
const { createOfficialProvider } = require('./official-provider');
function stableKey(value) {
  if (Array.isArray(value)) return '[' + value.map(stableKey).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableKey(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function createCoordiPreviewService({ authorize, ErrorType, fetchImage, renderHash, provider = createOfficialProvider({ ErrorType, fetchImage, renderHash }) }) {
  const cache = new Map();
  const pending = new Map();
  return async function render(uid, input) {
    if (!uid) throw new ErrorType('unauthenticated', '로그인이 필요합니다.');
    await authorize(uid); // Shared member/shop access check must run before every cache read.
    if (!input?.look || typeof input.look !== 'object') throw new ErrorType('invalid-argument', '코디 정보가 필요합니다.');
    const payload = provider.normalize(input.look);
    if (!payload || JSON.stringify(payload).length > 12000) throw new ErrorType('invalid-argument', '잘못된 코디입니다.');
    const key = stableKey([provider.id, provider.version, payload]);
    if (cache.has(key)) return cache.get(key);
    if (pending.has(key)) return pending.get(key);
    const task = (async () => {
      const result = await provider.render(payload);
      if (!result?.success || !result.imageUrl?.startsWith('data:image/png;base64,')) throw new ErrorType('unavailable', '코디 이미지를 불러오지 못했습니다.');
      cache.set(key, result);
      if (cache.size > 100) cache.delete(cache.keys().next().value);
      return result;
    })();
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  };
}
module.exports = { createCoordiPreviewService };
