#!/usr/bin/env node
'use strict';
// Preserve the audit source; publish only the data the storefront consumes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public/coordi-shop/data/verified-top50.json');
const output = path.join(root, 'public/coordi-shop/data/verified-top50-display.json');

function projectCatalog(data) {
  assert(data.itemsByCategoryGender && typeof data.itemsByCategoryGender === 'object');
  return { itemsByCategoryGender: Object.fromEntries(Object.entries(data.itemsByCategoryGender).map(([category, genders]) => [
    category, Object.fromEntries(Object.entries(genders).map(([gender, items]) => {
      assert(Array.isArray(items), `${category}/${gender}: expected items`);
      return [gender, items.map(({ hash, imageBytes, ...item }) => item)];
    }))
  ])) };
}

if(require.main === module) {
  const content = JSON.stringify(projectCatalog(JSON.parse(fs.readFileSync(source, 'utf8')))) + '\n';
  if(process.argv.includes('--check')) assert.equal(fs.readFileSync(output, 'utf8'), content, 'Run npm run build:coordi-catalog');
  else fs.writeFileSync(output, content);
  console.log(`Coordi display catalog ${process.argv.includes('--check') ? 'verified' : 'built'}: ${Buffer.byteLength(content)} bytes`);
}
module.exports = { projectCatalog };
