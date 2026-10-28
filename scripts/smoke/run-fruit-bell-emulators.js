'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dj48-fruit-bell-emulator-'));
const config = { functions: { source: 'functions' }, firestore: { rules: 'firestore.rules' }, emulators: {
  firestore: { port: 8497 }, auth: { port: 9497 }, functions: { port: 5297 }, hub: { port: 4697 }, logging: { port: 4797 },
  eventarc: { port: 9597 }, tasks: { port: 9697 }, ui: { enabled: false }, singleProjectMode: true } };
fs.mkdirSync(path.join(dir, 'functions/fruit-bell'), { recursive: true });
for (const name of ['domain.js', 'service.js']) fs.copyFileSync(path.join(root, 'functions/fruit-bell', name), path.join(dir, 'functions/fruit-bell', name));
fs.mkdirSync(path.join(dir,'functions/achievements'),{recursive:true});
fs.copyFileSync(path.join(root,'functions/achievements/games.js'),path.join(dir,'functions/achievements/games.js'));
fs.symlinkSync(path.join(root, 'functions/node_modules'), path.join(dir, 'functions/node_modules'), 'dir');
fs.copyFileSync(path.join(root, 'firestore.rules'), path.join(dir, 'firestore.rules'));
fs.copyFileSync(path.join(root, 'functions/package.json'), path.join(dir, 'functions/package.json'));
fs.writeFileSync(path.join(dir, 'functions/index.js'), `const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');const {onCall,HttpsError}=require('firebase-functions/v2/https');
initializeApp();const service=require('./fruit-bell/service').createService({db:getFirestore(),ErrorType:HttpsError});
exports.fruitBellAction=onCall({region:'asia-northeast3',maxInstances:5,timeoutSeconds:35},request=>service.act(request.auth?.uid,request.data));\n`);
fs.writeFileSync(path.join(dir, 'firebase.json'), JSON.stringify(config));
const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
const command = ['tests/fruit-bell/online.emulator.js', 'scripts/smoke/fruit-bell-online-browser.js'].map(file => 'node ' + quote(path.join(root, file))).join(' && ');
const result = spawnSync('firebase', ['emulators:exec', '--config', path.join(dir, 'firebase.json'), '--project', 'demo-fruit-bell', '--only', 'firestore,auth,functions', command], { cwd: root, stdio: 'inherit', timeout: 360000 });
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
