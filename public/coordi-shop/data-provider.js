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
    let bundleBase='',local=false,configured=false,configTask,displayTask;
    async function configure(){
      if(!configTask)configTask=(async()=>{
        const response=await fetchData('/coordi-shop/runtime-config.json',{cache:'no-store'});
        if(!response.ok)throw Error('코디 데이터 설정을 읽을 수 없습니다.');
        const config=await response.json();
        if(config.schemaVersion!==1||!['official','local'].includes(config.mode))throw Error('Invalid coordi runtime config');
        if(config.mode==='local'){
          if(!/^[A-F0-9]{64}$/.test(config.snapshot)||config.baseUrl!=='/codi/'+config.snapshot+'/'||!/^[a-f0-9]{64}$/.test(config.manifestSha256))throw Error('Invalid local snapshot config');
          bundleBase=config.baseUrl;local=true;
        }
        configured=true;return config;
      })().catch(e=>{configTask=null;throw e;});
      return configTask;
    }
    async function display(){
      if(!displayTask)displayTask=(async()=>{const r=await fetchData(bundleBase+'quiztown-display.json');if(!r.ok)throw Error('Local display catalog unavailable');return r.json();})().catch(e=>{displayTask=null;throw e;});
      return displayTask;
    }
    const metadata = new Map(), buckets = new Map();
    return {
      configure, isLocal:()=>local,
      async prepareItems(items) {
        await configure();
        if(!bundleBase) return false;
        let changed = false;
        const ids = [...new Set(items.filter(i => i.category !== 'skin').map(i => Math.floor(Number(i.code)/1000)))];
        for(const id of ids) {
          if(!buckets.has(id)) buckets.set(id, (async () => {
            const response = await fetchData(bundleBase+'index/items/'+id+'.json', {cache:'no-store'});
            if(!response.ok) throw Error('Local icon index unavailable: '+id);
            const data = await response.json();
            for(const row of Object.values(data.items || {})) {
              metadata.set(row.id, {...row, iconUrl:row.icon?.path && /^icons\/[0-9]+\/[0-9]+\.png$/.test(row.icon.path)?bundleBase+row.icon.path:''});
            }
            changed = true;
          })().catch(e=>{buckets.delete(id);throw e;}));
          await buckets.get(id);
        }
        return changed;
      },
      isIcon: item => !!metadata.get(Number(item.code))?.iconUrl,
      note: item => { const row=metadata.get(Number(item.code)); return row && row.behavior!=='invisible' && !row.capabilities?.actions?.stand1?.candidate ? '이 코디는 자체 미리보기 지원 확인이 필요해요.' : ''; },
      async load(kind) {
        if(!Object.hasOwn(paths, kind)) throw Error('Unknown coordi data kind');
        await configure();
        if(local){if(kind==='effects')return {};if(kind==='featuredHair')return {items:[]};return display();}
        const response = await fetchData(paths[kind], { cache: 'no-store' });
        if(!response.ok) throw Error(`${kind}-http-${response.status}`);
        return response.json();
      },
      thumbnail(item, rows) {
        if(!configured)return '';
        if(local)return metadata.get(Number(item.code))?.iconUrl || '';
        return rows.find(row => Number(row.code) === Number(item.code))?.thumbnail || '';
      }
    };
  }
  if(typeof module === 'object' && module.exports) module.exports = { createProvider };
  else root.DJ48CoordiDataProvider = { createProvider };
})(typeof window === 'undefined' ? globalThis : window);
