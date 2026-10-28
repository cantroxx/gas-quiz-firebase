'use strict';
const renderer = require('./render.cjs');
const { withDefaultOutfit } = require('./default-outfit');

// Server-selected adapter. Neither the caller nor catalog data selects an upstream URL.
function createOfficialProvider({ ErrorType, fetchImage = fetch, renderHash = renderer.requestMeaegiOfficialCoordiHash }) {
  return {
    id: 'meaegi-nexon',
    version: '2-default-outfit',
    normalize: look => withDefaultOutfit(renderer.normalizeMapleOfficialCoordiPayload(look)),
    async render(payload) {
      const hash = await renderHash(payload);
      const response = await fetchImage(renderer.buildMapleOfficialImageUrl(hash, '180'), { signal: AbortSignal.timeout(12000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png')) throw new ErrorType('unavailable', '코디 이미지를 불러오지 못했습니다.');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 500000) throw new ErrorType('resource-exhausted', '이미지가 너무 큽니다.');
      return { success: true, hash, imageUrl: 'data:image/png;base64,' + bytes.toString('base64') };
    }
  };
}
module.exports = { createOfficialProvider };
