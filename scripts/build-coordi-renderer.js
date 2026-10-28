'use strict';
// Canonical portable renderer lives with Functions; browser receives byte-identical code.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),files=['png.js','pixels.js','core.js','browser-reader.js'];
for(const file of files){const source=fs.readFileSync(path.join(root,'functions/coordi-shop/local-renderer',file));const dest=path.join(root,'public/coordi-shop/renderer',file);if(process.argv.includes('--check'))assert(source.equals(fs.readFileSync(dest)),file+' differs; run node scripts/build-coordi-renderer.js');else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,source);}}
console.log('Coordi renderer: '+files.length+' shared modules '+(process.argv.includes('--check')?'verified':'built'));
