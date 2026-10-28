(function(root) {
  'use strict';
  let hairScript;
  function loadLegacyHairRenderer() {
    if(root.DJ48HairPrism) return Promise.resolve(root.DJ48HairPrism);
    if(!hairScript) hairScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/coordi-shop/hair-prism.js?v=hair-pixels-20261002';
      script.onload = () => resolve(root.DJ48HairPrism);
      script.onerror = () => { script.remove(); hairScript = null; reject(Error('코디 도구를 불러오지 못했어요. 다시 시도해 주세요.')); };
      document.head.append(script);
    });
    return hairScript;
  }
  // Shared shop/town/classroom boundary. render is the authenticated transport,
  // never the commerce API. Preserve native mix and legacy HSL until comparison QA.
  function createRenderer({ render, assertCurrent = () => {}, loadHair = loadLegacyHairRenderer }) {
    let composed;
    const transport = async look => {
      assertCurrent();
      const result = await render(look);
      assertCurrent();
      return result;
    };
    return async look => {
      assertCurrent();
      if(!composed) {
        const hair = await loadHair();
        assertCurrent();
        composed = hair.createRenderer(transport, hair.decode, hair.encode);
      }
      const result = await composed(look);
      // Also guard a legacy hair-cache hit and the asynchronous canvas encoding.
      assertCurrent();
      if(!result?.success || !result.imageUrl?.startsWith('data:image/png;base64,')) throw Error('코디 이미지를 불러오지 못했어요. 다시 시도해 주세요.');
      return result;
    };
  }
  const api = { createRenderer };
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.DJ48CoordiPreviewRenderer = api;
})(typeof window === 'undefined' ? globalThis : window);
