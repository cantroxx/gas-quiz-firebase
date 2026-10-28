(function(root){
  'use strict';
  // baseUrl must be a versioned, same-origin directory containing only web/ files.
  function createReader(baseUrl){
    const base=new URL(baseUrl,location.href);if(base.origin!==location.origin||!base.pathname.endsWith('/'))throw Error('Expected same-origin version directory');
    const cache=new Map();let cachedBytes=0;
    const url=p=>{if(typeof p!=='string'||p.includes('\\'))throw Error('Invalid asset path');const u=new URL(p,base);if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname))throw Error('Asset path outside snapshot');return u;};
    async function read(p,max){const response=await fetch(url(p));if(!response.ok)throw Error('자료를 읽을 수 없습니다: '+p);if(response.headers.get('content-encoding'))throw Error('Bundle requires raw gzip bytes without Content-Encoding');const reader=response.body.getReader(),chunks=[];let length=0;try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>max)throw Error('Asset size limit');chunks.push(value);}}finally{await reader.cancel();}const b=new Uint8Array(length);let i=0;for(const c of chunks){b.set(c,i);i+=c.length;}return b;}
    async function cached(key,fn){if(cache.has(key))return cache.get(key).data;const data=await fn(),bytes=JSON.stringify(data).length*2;while(cache.size&&(cache.size>=128||cachedBytes+bytes>64*1024*1024)){const k=cache.keys().next().value;cachedBytes-=cache.get(k).bytes;cache.delete(k);}if(bytes<=64*1024*1024){cache.set(key,{data,bytes});cachedBytes+=bytes;}return data;}
    const json=p=>cached(p,async()=>JSON.parse(new TextDecoder().decode(await read(p,8000000))));
    async function asset(d){if(!d||d.encoding!=='gzip-json')throw Error('파츠 자료가 없습니다.');return cached(d.path+'|'+d.sha256,async()=>{
      if(!Number.isSafeInteger(d.decodedBytes)||d.decodedBytes>64*1024*1024)throw Error('Decoded asset size limit');
      const raw=await read(d.path,d.bytes);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(n=>n.toString(16).padStart(2,'0')).join('');if(raw.length!==d.bytes||hash!==d.sha256)throw Error('Asset hash mismatch');
      const r=new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();let total=0;const chunks=[];try{while(true){const {done,value}=await r.read();if(done)break;total+=value.length;if(total>d.decodedBytes)throw Error('Decoded asset size limit');chunks.push(value);}}finally{await r.cancel();}
      if(total!==d.decodedBytes)throw Error('Decoded asset size mismatch');const all=new Uint8Array(total);let at=0;for(const c of chunks){all.set(c,at);at+=c.length;}return JSON.parse(new TextDecoder().decode(all));
    });}
    async function manifest(){const m=await json('manifest.json');if(m.schemaVersion!==1||m.bundleKind!=='complete-data'||!base.pathname.includes(m.sourceSnapshot))throw Error('Snapshot version mismatch');return m;}
    const baseIndex=async()=>json((await manifest()).baseIndex),common=async key=>asset((await baseIndex()).entries[key]);
    async function item(id){if(!Number.isSafeInteger(id)||id<=0)throw Error('Invalid item ID');const row=(await json(`index/items/${Math.floor(id/1000)}.json`)).items[id];if(!row||row.id!==id)throw Error('Item absent from bundle: '+id);return row;}
    return {manifest,item,baseIndex,part:async id=>{const r=await item(id);if(!r.part)throw Error(r.errors?.item||'Missing item part');return asset(r.part);},body:(s,a)=>common(`base:${s}:${a}:0:False`),head:(s,e)=>common(`base:${s}:head:${e}:True`),order:()=>common('order'),slots:()=>common('slots')};
  }
  root.DJ48CoordiBundleReader={createReader};
})(globalThis);
