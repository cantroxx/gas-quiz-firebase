// Firebase deploys functions/ only. Keep its rules engine byte-identical to the game.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'functions/town-marble/domain');
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, 'package.json'), '{"type":"module"}\n');
for (const file of ['game.js', 'data.js']) {
  const source = fs.readFileSync(path.join(root, 'town-marble-src/shared', file));
  if (process.argv.includes('--check')) {
    if (!fs.readFileSync(path.join(target, file)).equals(source)) throw Error('Stale Town Marble server domain: ' + file);
  } else fs.writeFileSync(path.join(target, file), source);
}
