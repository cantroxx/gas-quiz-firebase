'use strict';
// Fresh browser, actual HTTP assets; every origin except the selected asset host is blocked.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
(async()=>{
  assert(process.argv[2],'Pass Windows bundle root');const bundle=path.resolve(process.argv[2]),web=path.join(bundle,'web'),manifest=JSON.parse(fs.readFileSync(path.join(web,'manifest.json'))),prefix='/codi/'+manifest.sourceSnapshot+'/';
  const cases=JSON.parse(fs.readFileSync(path.join(bundle,'reference/cases/results.json'))).cases,results=[];
  const productionCdn=process.argv.includes('--production-cdn');
  const preview=productionCdn?null:await require('./coordi-preview-process').startPreview(bundle),origin=productionCdn?'https://dj48-quiztown-firebase.web.app':preview.origin;let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
    const page=await browser.newPage();const external=[];
    const paths=[],headers=[];
    await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){external.push(u.origin);return route.abort();}if(u.pathname==='/renderer-test')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="ko"><meta charset="utf-8"><body>HTTP renderer verification</body></html>'});paths.push(u.pathname);return route.continue();});
    page.on('response',response=>{if(new URL(response.url()).pathname.endsWith('.gz'))headers.push(response.headers());});
    await page.goto(origin+'/renderer-test');
    for(const name of ['png','pixels','core','browser-reader'])await page.addScriptTag({url:origin+'/coordi-shop/renderer/'+name+'.js'});
    const config=require('../build-coordi-local-release').configFor(bundle);
    await page.evaluate(config=>{window.reader=DJ48CoordiBundleReader.createReader(config.baseUrl,{manifestSha256:config.manifestSha256});},config);
    for(const c of cases){const look=JSON.parse(fs.readFileSync(path.join(bundle,'reference/cases',c.id,'look.json')));
      const result=await page.evaluate(async look=>{try{const image=await DJ48CoordiLocalRenderer.render(look,reader);const rgbaSha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',image.data))].map(n=>n.toString(16).padStart(2,'0')).join('');return {width:image.width,height:image.height,rgbaSha256};}catch(e){return {error:e.message};}},look);
      const ok=c.status==='rendered'?result.rgbaSha256===c.rgbaSha256&&result.width===c.width&&result.height===c.height:result.error===c.error;results.push({id:c.id,ok,...result});
    }
    assert.deepEqual(external,[]);assert(headers.length>0);assert(headers.every(h=>h['content-type']==='application/octet-stream'));const report={ok:results.every(r=>r.ok),snapshot:manifest.sourceSnapshot,externalRequests:external.length,hostNode:process.version,transport:productionCdn?'production-cdn':'actual-loopback-http',gzipResponses:headers.length,gzipContentType:'application/octet-stream',httpTransportEncodings:[...new Set(headers.map(h=>h['content-encoding']||'identity'))],readerStats:await page.evaluate(()=>reader.stats()),results};fs.writeFileSync(process.argv[3]||'/tmp/coordi-windows-browser-reference.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({ok:report.ok,cases:results.length,failed:results.filter(r=>!r.ok)},null,2));assert(report.ok);
  }finally{await browser?.close();preview?.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
