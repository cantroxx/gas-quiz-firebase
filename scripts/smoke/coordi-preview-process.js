'use strict';
const {spawn}=require('node:child_process');
const path=require('node:path');
// Test-only loopback process; no Firebase credentials or production writes.
function startPreview(bundleRoot){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[path.join(__dirname,'serve-coordi-shop.js')],{env:{...process.env,COORDI_BUNDLE_ROOT:bundleRoot,PORT:'0'},stdio:['ignore','pipe','pipe']});
  let errors='';const timer=setTimeout(()=>{child.kill();reject(Error('Preview startup timeout: '+errors));},15000);
  child.stderr.on('data',b=>{errors=(errors+String(b)).slice(-2000);});
  child.once('error',e=>{clearTimeout(timer);reject(e);});
  child.once('exit',code=>{clearTimeout(timer);reject(Error('Preview exited '+code+': '+errors));});
  child.stdout.on('data',b=>{const match=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve({origin:match[0],stop:()=>child.kill()});}});
 });
}
module.exports={startPreview};
