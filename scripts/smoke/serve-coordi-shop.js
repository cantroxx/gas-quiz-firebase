'use strict';
// Standalone local preview. Uses only in-memory demo data; never loads Firebase credentials.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const commerce = require('../../functions/coordi-shop/commerce');
class PreviewError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details; } }
const records = new Map([
  ['authLinks/demo', { memberUserId: 'local-shop-demo' }],
  ['appSettings/featureFlags', { shopEnabled: true }],
  ['userEconomy/local-shop-demo', { djCoin: 10000, totalSpent: 0 }]
]);
let queue = Promise.resolve();
const db = {
  doc: key => ({ path: key }), collection: name => ({ doc: id => ({ path: `${name}/${id}` }) }),
  runTransaction(fn) {
    const task = queue.then(async () => {
      const next = structuredClone(records);
      const set = (ref, value, options) => {
        const old = options?.merge ? next.get(ref.path) || {} : {};
        const merged = { ...old };
        for(const [key, val] of Object.entries(value)) merged[key] = val?.__increment !== undefined ? Number(old[key] || 0) + val.__increment : structuredClone(val);
        next.set(ref.path, merged);
      };
      const result = await fn({
        get: async ref => ({ exists: next.has(ref.path), data: () => structuredClone(next.get(ref.path)) }),
        set, create: (ref, value) => { if(next.has(ref.path)) throw Error('Duplicate receipt'); set(ref, value); }
      });
      records.clear(); for(const [key, value] of next) records.set(key, value);
      return result;
    });
    queue = task.catch(() => {}); return task;
  }
};
const service = commerce.createService({ db, FieldValue: { increment: n => ({ __increment: n }), serverTimestamp: () => Date.now() }, ErrorType: PreviewError, authorize: async () => ({ role: 'student' }) });
// Explicit opt-in only. The default/production provider remains unchanged.
const bundleRoot = process.env.COORDI_BUNDLE_ROOT;
const {configFor,displayCatalog}=require('../build-coordi-local-release');
const config=bundleRoot?configFor(bundleRoot):{schemaVersion:1,mode:'official'};
const dataPrefix=config.baseUrl||'';
const dataRoot=bundleRoot?fs.realpathSync(path.resolve(bundleRoot,'web')):'';
let previewService;
async function render(uid,payload) {
 if(!previewService)previewService=require('../../functions/coordi-shop/runtime').createConfiguredPreviewService({
  config:{...config,baseUrl:config.baseUrl?`http://127.0.0.1:${server.address().port}${config.baseUrl}`:null},allowLoopback:true,authorize:async()=>{},ErrorType:PreviewError,
  fetchData:(url,options)=>{if(new URL(url).origin!==`http://127.0.0.1:${server.address().port}`)throw Error('External data prohibited');return fetch(url,options);}
 });
 return previewService(uid,payload);
}

const root = path.resolve(__dirname, '../../public');
const shell = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>코디 상점 로컬 확인</title>
<style>body{margin:0;font-family:system-ui;background:#f6f8f3}header{padding:10px 16px;font-size:13px;background:#e8f1e4}iframe{display:block;width:100%;height:calc(100vh - 42px);border:0}</style>
<header>로컬 테스트 · ${bundleRoot ? '자체 렌더러 · 미지원 아이템은 오류로 표시' : '기존 외부 렌더러'} · 구매/장착은 임시 저장 · 운영 계정과 무관</header>
<script>window.DJ48CoordiLocalDataBase=${JSON.stringify(dataPrefix)};window.DJ48AccountState={getCurrentMemberUserId:()=> 'local-shop-demo'};
window.DJ48Firebase={getFirebaseFunctions:()=>({httpsCallable:name=>async p=>{const r=await fetch('/preview-call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,p})});const result=await r.json();if(!r.ok)throw Error(result.message);return result;}})};</script>
<iframe title="코디 상점" src="/coordi-shop/"></iframe></html>`;
const server = http.createServer(async (req, res) => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  if(req.headers.host !== new URL(origin).host) return res.writeHead(403).end();
  const url = new URL(req.url, origin);
  const send = (status, type, data) => res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(data);
  if(url.pathname === '/coordi-shop/runtime-config.json')return send(200,'application/json',JSON.stringify(config));
  if(dataPrefix&&url.pathname === dataPrefix+'quiztown-display.json')return send(200,'application/json',JSON.stringify(displayCatalog()));
  if(url.pathname === '/preview-stats')return send(200,'application/json',JSON.stringify({...previewService?.stats?.(),process:{node:process.version,memory:process.memoryUsage()}}));
  if(url.pathname === '/') return send(200, 'text/html; charset=utf-8', shell);
  if(url.pathname === '/preview-call') {
    if(req.method !== 'POST' || req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')) return res.writeHead(403).end();
    try {
      let body = ''; for await(const chunk of req) { body += chunk; if(body.length > 15000) throw Error('Request too large'); }
      const { name, p } = JSON.parse(body);
      const data = name === 'renderCoordiShopPreview' ? await render('demo', p) : name === 'coordiShopAction' ? await service.act('demo', p) : (() => { throw Error('로컬 상점에서 지원하지 않는 기능입니다.'); })();
      return send(200, 'application/json', JSON.stringify({ data }));
    } catch(error) { return send(400, 'application/json', JSON.stringify({ message: error.message+(error.details?.itemId ? ' (아이템 '+error.details.itemId+')' : ''), details:error.details })); }
  }
  // Only version-scoped web/ is served; references/reports/tools stay private.
  if(dataPrefix && url.pathname.startsWith(dataPrefix)) {
    const file=path.resolve(dataRoot,decodeURIComponent(url.pathname.slice(dataPrefix.length)));
    if(!file.startsWith(dataRoot+path.sep))return res.writeHead(403).end();
    try {const real=await fs.promises.realpath(file);if(!real.startsWith(dataRoot+path.sep))return res.writeHead(403).end();
      return send(200,file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':'application/octet-stream',await fs.promises.readFile(real));
    }catch {return res.writeHead(404).end();}
  }
  // The unrelated global status panel is unnecessary in this isolated preview.
  if(url.pathname === '/js/player-status-shortcut.js') return send(200, 'text/javascript', '');
  if(!url.pathname.startsWith('/coordi-shop/')) return res.writeHead(404).end();
  let file; try { file = path.resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : '')); } catch { return res.writeHead(400).end(); }
  if(!file.startsWith(path.join(root, 'coordi-shop') + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => error ? res.writeHead(404).end() : send(200, ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream', data));
});
server.listen(Number(process.env.PORT || 0), '127.0.0.1', () => console.log(`Local coordi preview: http://127.0.0.1:${server.address().port}/`));
