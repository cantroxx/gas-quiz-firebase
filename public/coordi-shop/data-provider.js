(function(root) {
  'use strict';
  // Public display metadata only. Prices and ownership still come from coordiShopAction.
  function createProvider(fetchData = (...args) => root.fetch(...args)) {
    const paths = {
      catalog: '/coordi-shop/data/maple-cosmetics-catalog.json',
      featuredHair: '/coordi-shop/data/maple-featured-hair-catalog.json',
      verified: '/coordi-shop/data/verified-top50-display.json',
      effects: '/coordi-shop/data/maple-item-effects.json?v=20260703-cape-effects-top50'
    };
    const suppliedBase = root.parent && root.parent !== root ? root.parent.DJ48CoordiLocalDataBase : '';
    const bundleBase = typeof suppliedBase === 'string' && /^\/codi\/[A-F0-9]{64}\/$/.test(suppliedBase) ? suppliedBase : '';
    const metadata = new Map(), buckets = new Map();
    return {
      async prepareItems(items) {
        if(!bundleBase) return false;
        let changed = false;
        const ids = [...new Set(items.filter(i => i.category !== 'skin').map(i => Math.floor(Number(i.code)/1000)))];
        for(const id of ids) {
          if(!buckets.has(id)) buckets.set(id, (async () => {
            const response = await fetchData(bundleBase+'index/items/'+id+'.json', {cache:'no-store'});
            if(!response.ok) return;
            const data = await response.json();
            for(const row of Object.values(data.items || {})) {
              if(row.icon?.path && /^icons\/[0-9]+\/[0-9]+\.png$/.test(row.icon.path)) metadata.set(row.id, {...row, iconUrl:bundleBase+row.icon.path});
            }
            changed = true;
          })());
          await buckets.get(id);
        }
        return changed;
      },
      isIcon: item => !!metadata.get(Number(item.code))?.iconUrl,
      note: item => { const row=metadata.get(Number(item.code)); return row && row.behavior!=='invisible' && !row.capabilities?.actions?.stand1?.candidate ? '이 코디는 자체 미리보기 지원 확인이 필요해요.' : ''; },
      async load(kind) {
        if(!Object.hasOwn(paths, kind)) throw Error('Unknown coordi data kind');
        const response = await fetchData(paths[kind], { cache: 'no-store' });
        if(!response.ok) throw Error(`${kind}-http-${response.status}`);
        return response.json();
      },
      thumbnail(item, rows) {
        return metadata.get(Number(item.code))?.iconUrl || rows.find(row => Number(row.code) === Number(item.code))?.thumbnail || '';
      }
    };
  }
  if(typeof module === 'object' && module.exports) module.exports = { createProvider };
  else root.DJ48CoordiDataProvider = { createProvider };
})(typeof window === 'undefined' ? globalThis : window);
