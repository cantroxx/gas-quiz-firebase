(function(root){
  'use strict';
  // Shared Node/browser HTTP reader. All paths stay in one pinned snapshot.
  function createReader(baseUrl, options={}){
    const base=new URL(baseUrl,root.location?.href),origin=options.origin||root.location?.origin;
    if(base.origin!==origin||!/^\/codi\/[A-F0-9]{64}\/$/.test(base.pathname)||base.search||base.hash||base.username||base.password)throw Error('Expected same-origin version directory');
    const snapshot=base.pathname.split('/')[2],fetchData=options.fetch||((...args)=>root.fetch(...args));
    const cache=new Map(),pending=new Map();let cachedBytes=0;
    const metrics={requests:0,bytes:0,hits:0};
    const digest=async b=>[...new Uint8Array(await root.crypto.subtle.digest('SHA-256',b))].map(n=>n.toString(16).padStart(2,'0')).join('');
    function url(p){
      if(typeof p!=='string'||!p||p.includes('\\')||p.includes('%')||p.startsWith('/')||p.split('/').some(s=>s==='.'||s==='..'))throw Error('Invalid asset path');
      const u=new URL(p,base);if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname)||u.search||u.hash)throw Error('Asset path outside snapshot');return u;
    }
    async function read(p,max=8000000){
      if(!Number.isSafeInteger(max)||max<1||max>64*1024*1024)throw Error('Asset size limit');
      const response=await fetchData(url(p),{redirect:'error',signal:AbortSignal.timeout(15000)});metrics.requests++;
      if(!response.ok)throw Error('자료를 읽을 수 없습니다: '+p);
      if(p.endsWith('.gz')&&response.headers.get('content-encoding'))throw Error('Bundle requires raw gzip bytes without Content-Encoding');
      const r=response.body.getReader(),chunks=[];let length=0;
      try{while(true){const {value,done}=await r.read();if(done)break;length+=value.length;if(length>max)throw Error('Asset size limit');chunks.push(value);}}finally{await r.cancel();}
      const b=new Uint8Array(length);let i=0;for(const c of chunks){b.set(c,i);i+=c.length;}metrics.bytes+=length;return b;
    }
    async function cached(key,fn){
      if(cache.has(key)){metrics.hits++;const v=cache.get(key);cache.delete(key);cache.set(key,v);return v.data;}
      if(pending.has(key)){metrics.hits++;return pending.get(key);}
      const task=(async()=>{const data=await fn(),bytes=JSON.stringify(data).length*2;
        while(cache.size&&(cache.size>=128||cachedBytes+bytes>64*1024*1024)){const k=cache.keys().next().value;cachedBytes-=cache.get(k).bytes;cache.delete(k);}
        if(bytes<=64*1024*1024){cache.set(key,{data,bytes});cachedBytes+=bytes;}return data;
      })();pending.set(key,task);try{return await task;}finally{pending.delete(key);}
    }
    const json=p=>cached(p,async()=>JSON.parse(new TextDecoder().decode(await read(p))));
    async function asset(d){
      if(!d||d.encoding!=='gzip-json'||!/^[a-f0-9]{64}$/.test(d.sha256))throw Error('파츠 자료가 없습니다.');
      return cached(d.path+'|'+d.sha256,async()=>{
        if(!Number.isSafeInteger(d.decodedBytes)||d.decodedBytes<1||d.decodedBytes>64*1024*1024)throw Error('Decoded asset size limit');
        const raw=await read(d.path,d.bytes);if(raw.length!==d.bytes||await digest(raw)!==d.sha256)throw Error('Asset hash mismatch');
        const r=new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();let total=0;const chunks=[];
        try{while(true){const {done,value}=await r.read();if(done)break;total+=value.length;if(total>d.decodedBytes)throw Error('Decoded asset size limit');chunks.push(value);}}finally{await r.cancel();}
        if(total!==d.decodedBytes)throw Error('Decoded asset size mismatch');const all=new Uint8Array(total);let at=0;for(const c of chunks){all.set(c,at);at+=c.length;}return JSON.parse(new TextDecoder().decode(all));
      });
    }
    async function manifest(){return cached('@manifest',async()=>{
      const raw=await read('manifest.json');if(options.manifestSha256&&await digest(raw)!==options.manifestSha256)throw Error('Manifest hash mismatch');
      const m=JSON.parse(new TextDecoder().decode(raw));if(m.schemaVersion!==1||m.bundleKind!=='complete-data'||m.sourceSnapshot!==snapshot)throw Error('Snapshot version mismatch');return m;
    });}
    const baseIndex=async()=>json((await manifest()).baseIndex),common=async key=>asset((await baseIndex()).entries[key]);
    async function item(id){
      if(!Number.isSafeInteger(id)||id<=0)throw Error('Invalid item ID');
      const row=(await json(`index/items/${Math.floor(id/1000)}.json`)).items[id];if(!row||row.id!==id)throw Error('Item absent from bundle: '+id);return row;
    }
    return {manifest,item,baseIndex,
      catalogPage:async(category,page)=>{const c=(await manifest()).catalogs.find(c=>c.category===category);if(!c||!Number.isInteger(page)||!c.pages[page])throw Error('Invalid catalog page');return json(c.pages[page]);},
      part:async id=>{const r=await item(id);if(!r.part){const e=Error(r.errors?.item||'Missing item part');e.code='coordi-unsupported';e.details={itemId:id};throw e;}return asset(r.part);},
      body:(s,a)=>common(`base:${s}:${a}:0:False`),head:(s,e)=>common(`base:${s}:head:${e}:True`),order:()=>common('order'),slots:()=>common('slots'),
      stats:()=>({...metrics,cachedBytes,entries:cache.size,pending:pending.size})};
  }
  const api={createReader};if(typeof module==='object'&&module.exports)module.exports=api;else root.DJ48CoordiBundleReader=api;
})(globalThis);
