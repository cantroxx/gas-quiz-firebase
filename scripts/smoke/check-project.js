#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function listFiles(dir, predicate) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for(const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if(entry.isDirectory()) {
      if(entry.name === 'node_modules' || entry.name === '.git') continue;
      files.push(...listFiles(fullPath, predicate));
    } else if(predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function runNodeCheck(filePath) {
  const result = spawnSync(process.execPath, ['--check', filePath], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  if(result.status !== 0) {
    const relativePath = path.relative(ROOT, filePath);
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`node --check failed for ${relativePath}\n${output}`);
  }
}

function checkJavaScriptFiles() {
  const files = [
    ...listFiles(path.join(ROOT, 'public', 'js'), file => file.endsWith('.js')),
    ...listFiles(path.join(ROOT, 'public', 'housing'), file => file.endsWith('.js')), // 하우징(내 방 꾸미기)도 문법 검사
    ...listFiles(path.join(ROOT, 'scripts'), file => file.endsWith('.js')),
    path.join(ROOT, 'functions', 'index.js')
  ];
  files.forEach(runNodeCheck);
  return files.length;
}

function checkInlineScripts() {
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  inlineScripts.forEach(code => {
    new Function(code);
  });
  return inlineScripts.length;
}

function checkRequiredPaths() {
  const requiredPaths = [
    'docs/README.md',
    'docs/architecture/REFACTOR_REMAINING_STEPS.md',
    'docs/operations/BROWSER_SMOKE_TEST.md',
    'scripts/smoke/browser-smoke-test.js',
    'public/index.html',
    'functions/index.js',
    'firebase.json',
    'firestore.rules',
    'storage.rules'
  ];
  requiredPaths.forEach(relativePath => {
    if(!fs.existsSync(path.join(ROOT, relativePath))) {
      throw new Error(`required path missing: ${relativePath}`);
    }
  });
  return requiredPaths.length;
}

function main() {
  const jsCount = checkJavaScriptFiles();
  const inlineScriptCount = checkInlineScripts();
  const requiredPathCount = checkRequiredPaths();
  console.log(`Project static check passed: ${jsCount} JS files, ${inlineScriptCount} inline scripts, ${requiredPathCount} required paths.`);
}

main();
