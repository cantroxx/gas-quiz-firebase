const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/securities/market.json'), 'utf8'));
fs.writeFileSync(path.join(root, 'public/js/data/securities-fixture.js'), `/* Generated from fixtures/securities/market.json; fictional classroom examples only. */\nwindow.DJ48SecuritiesFixture = ${JSON.stringify(fixture)};\n`);
