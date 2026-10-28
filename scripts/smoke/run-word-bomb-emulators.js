"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "dj48-word-bomb-emulator-"));
fs.mkdirSync(path.join(dir, "functions"));
fs.cpSync(
  path.join(root, "functions/word-bomb"),
  path.join(dir, "functions/word-bomb"),
  { recursive: true },
);
fs.mkdirSync(path.join(dir, 'functions/growth'), {recursive:true});
fs.copyFileSync(path.join(root, 'functions/growth/activity.js'), path.join(dir, 'functions/growth/activity.js'));
fs.symlinkSync(
  path.join(root, "functions/node_modules"),
  path.join(dir, "functions/node_modules"),
  "dir",
);
fs.copyFileSync(
  path.join(root, "firestore.rules"),
  path.join(dir, "firestore.rules"),
);
fs.writeFileSync(
  path.join(dir, "functions/package.json"),
  JSON.stringify({
    name: "word-bomb-emulator",
    private: true,
    main: "index.js",
    engines: { node: "22" },
    dependencies: {
      "firebase-admin": "^14.3.0",
      "firebase-functions": "^7.3.2",
    },
  }),
);
fs.writeFileSync(
  path.join(dir, "functions/index.js"),
  `'use strict';
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
initializeApp();
const service=require('./word-bomb/service').createService({db:getFirestore(),ErrorType:HttpsError});
exports.wordBombAction=onCall({region:'asia-northeast3',maxInstances:5,timeoutSeconds:35},request=>service.act(request.auth?.uid,request.data));
`,
);
fs.copyFileSync(
  path.join(__dirname, "word-bomb-emulators.json"),
  path.join(dir, "firebase.json"),
);
const quote = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
const command = [
  "tests/word-bomb/online.test.js",
  "tests/word-bomb/voting-online.test.js",
  "scripts/smoke/word-bomb-online-browser.js",
]
  .map((file) => "node " + quote(path.join(root, file)))
  .join(" && ");
console.log(
  "Isolated demo-word-bomb emulator; production Rules and student data are not modified.",
);
const result = spawnSync(
  "firebase",
  [
    "emulators:exec",
    "--config",
    path.join(dir, "firebase.json"),
    "--project",
    "demo-word-bomb",
    "--only",
    "firestore,auth,functions",
    command,
  ],
  { cwd: root, stdio: "inherit", timeout: 240000 },
);
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
