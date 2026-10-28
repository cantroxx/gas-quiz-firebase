'use strict';
// All requests are intercepted: public renderer JS + version-scoped web/ only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
(async()=>{
  assert(process.argv[2],'Pass Windows bundle root');const bundle=path.resolve(process.argv[2]),web=path.join(bundle,'web'),manifest=JSON.parse(fs.readFileSync(path.join(web,'manifest.json'))),origin='https://coordi-render.test',prefix='/codi/'+manifest.sourceSnapshot+'/';
  const cases=JSON.parse(fs.readFileSync(path.join(bundle,'reference/cases/results.json'))).cases,results=[];
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try{
    const page=await browser.newPage();const external=[];
    await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){external.push(u.origin);return route.abort();}if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ko"><body>Renderer verification</body></html>'});if(!u.pathname.startsWith(prefix))return route.abort();const target=path.resolve(web,u.pathname.slice(prefix.length));if(!target.startsWith(web+path.sep))return route.abort();return route.fulfill({path:target,contentType:target.endsWith('.gz')?'application/octet-stream':'application/json'});});
    await page.goto(origin);
    for(const name of ['png','pixels','core','browser-reader'])await page.addScriptTag({path:path.resolve('public/coordi-shop/renderer/'+name+'.js')});
    await page.evaluate(prefix=>{window.reader=DJ48CoordiBundleReader.createReader(prefix);},prefix);
    for(const c of cases){const look=JSON.parse(fs.readFileSync(path.join(bundle,'reference/cases',c.id,'look.json')));
      const result=await page.evaluate(async look=>{try{const image=await DJ48CoordiLocalRenderer.render(look,reader);const rgbaSha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',image.data))].map(n=>n.toString(16).padStart(2,'0')).join('');return {width:image.width,height:image.height,rgbaSha256};}catch(e){return {error:e.message};}},look);
      const ok=c.status==='rendered'?result.rgbaSha256===c.rgbaSha256&&result.width===c.width&&result.height===c.height:result.error===c.error;results.push({id:c.id,ok,...result});
    }
    assert.deepEqual(external,[]);const report={ok:results.every(r=>r.ok),snapshot:manifest.sourceSnapshot,externalRequests:external.length,results};fs.writeFileSync('/tmp/coordi-windows-browser-reference.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({ok:report.ok,cases:results.length,failed:results.filter(r=>!r.ok)},null,2));assert(report.ok);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
