'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/fruit-bell/domain.js'));
const target = path.join(root, 'functions/fruit-bell/domain.js');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || !source.equals(fs.readFileSync(target))) throw Error('Run npm run build:fruit-bell to sync the shared rules.');
} else fs.writeFileSync(target, source);
