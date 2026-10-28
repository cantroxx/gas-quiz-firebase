#!/usr/bin/env node
'use strict';
// Only the four public JSON catalogs; no app, authentication, or callable APIs.
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const base='https://dj48-quiztown-firebase.web.app';
const paths=['maple-cosmetics-catalog.json','maple-featured-hair-catalog.json',process.env.COORDI_TOP_CATALOG || 'verified-top50-display.json','maple-item-effects.json?v=20260703-cape-effects-top50'];
(async()=>{
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const result={measuredAt:new Date().toISOString(),scope:'Public static catalog fetches only, not complete shop readiness. 4 Mbps down, 80 ms latency, CPU 4x; cache:no-store as in application. Empty same-origin audit document, no app scripts.',runs:[]};
  try {
    const context=await browser.newContext(),page=await context.newPage();
    await context.route('**/*',route=>{
      const url=route.request().url();
      if(url===base+'/__catalog_audit__') return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Catalog audit</title>'});
      if(paths.some(p=>url===base+'/coordi-shop/data/'+p)) return route.continue();
      return route.abort();
    });
    const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:500000,uploadThroughput:125000});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await page.goto(base+'/__catalog_audit__');
    let network=new Map();
    cdp.on('Network.responseReceived',({requestId,response})=>{
      if(response.url.includes('/coordi-shop/data/')) network.set(requestId,{url:response.url,status:response.status,encoding:response.headers['content-encoding'],cacheControl:response.headers['cache-control']});
    });
    cdp.on('Network.loadingFinished',({requestId,encodedDataLength})=>{const row=network.get(requestId);if(row)row.wireBytes=encodedDataLength;});
    for(let sample=1;sample<=3;sample++) {
      network=new Map();
      const timing=await page.evaluate(async paths=>{
        const start=performance.now();
        const catalogs=await Promise.all(paths.map(async file=>{
          const response=await fetch('/coordi-shop/data/'+file,{cache:'no-store'});
          if(!response.ok)throw new Error('HTTP '+response.status);
          const text=await response.text(),parsedAt=performance.now();JSON.parse(text);
          return {file,readyMs:performance.now()-start,parseMs:performance.now()-parsedAt,decodedCharacters:text.length};
        }));
        return {readyMs:performance.now()-start,catalogs};
      },paths);
      await page.waitForTimeout(100);
      const row={sample,...timing,network:[...network.values()]};
      row.wireBytes=row.network.reduce((sum,r)=>sum+(r.wireBytes||0),0);
      result.runs.push(row);console.log(JSON.stringify(row));
    }
    fs.writeFileSync(process.env.COORDI_CATALOG_PROFILE_OUTPUT||'/tmp/site-loading-release-20261004/catalog-network.json',JSON.stringify(result,null,2)+'\n');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
