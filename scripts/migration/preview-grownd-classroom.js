#!/usr/bin/env node
'use strict';
// Offline validation only: no Firebase initialization, credentials, writes or uploads.
const fs=require('node:fs');
const {previewImport}=require('../../functions/classroom/board-domain');
const [inputFile,catalogFile]=process.argv.slice(2);
if(!inputFile||!catalogFile){console.error('Usage: node scripts/migration/preview-grownd-classroom.js <source.json> <target-catalog.json>');process.exitCode=2;}
else {try{const report=previewImport(JSON.parse(fs.readFileSync(inputFile,'utf8')),JSON.parse(fs.readFileSync(catalogFile,'utf8')));console.log(JSON.stringify(report,null,2));if(!report.ready)process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=2;}}
