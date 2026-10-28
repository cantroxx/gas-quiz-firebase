'use strict';
const crypto = require('node:crypto');
class SecuritiesError extends Error {
  constructor(code, message, extra = {}) { super(message); this.code = code; this.details = { retryable: ['aborted','unavailable'].includes(code), ...extra }; }
}
function fail(code, message, extra) { throw new SecuritiesError(code, message, extra); }
function id(v) { if(typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(v)) fail('invalid-argument','식별자를 확인해 주세요.'); return v; }
function requestId(v) { if(typeof v !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v)) fail('invalid-argument','요청 번호를 확인해 주세요.'); return v.toLowerCase(); }
function integer(v,min,max) { if(!Number.isSafeInteger(v)||v<min||v>max) fail('invalid-argument','입력 범위를 확인해 주세요.'); return v; }
function text(v,min,max) { if(typeof v!=='string'||v.trim().length<min||v.trim().length>max) fail('invalid-argument',`내용을 ${min}~${max}자로 적어 주세요.`); return v.trim(); }
function date(v) { if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v) fail('invalid-argument','날짜를 확인해 주세요.'); return v; }
function canonical(v) { if(Array.isArray(v))return v.map(canonical); if(v && typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])); return v; }
function hash(v) { return crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex'); }
function revision(actual, expected) { if(!Number.isSafeInteger(expected)||actual!==expected) fail('aborted','다른 창에서 내용이 바뀌었어요. 다시 불러와 주세요.'); }
function page(query,p) { const limit=p.limit===undefined?20:integer(p.limit,1,50); query=query.orderBy('__name__'); if(p.cursor)query=query.startAfter(id(p.cursor)); return {query:query.limit(limit+1),limit}; }
function paginate(snapshot,limit,project=(d)=>({id:d.id,...d.data()})) {return {rows:snapshot.docs.slice(0,limit).map(project),cursor:snapshot.size>limit?snapshot.docs[limit-1].id:null};}
module.exports={SecuritiesError,fail,id,requestId,integer,text,date,hash,revision,page,paginate};
