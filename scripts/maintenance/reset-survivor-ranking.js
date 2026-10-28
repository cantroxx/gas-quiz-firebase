#!/usr/bin/env node
'use strict';
// Explicitly scoped to the user-approved Quiz Survivor leaderboard reset.
// Back up Firestore REST values verbatim; delete only the exact backed-up versions.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth');
const { requireAuth } = require(base + 'requireAuth');
const { Client } = require(base + 'apiv2');
const projectId = 'dj48-quiztown-firebase';
const parent = `projects/${projectId}/databases/(default)/documents`;
const collection = 'mathsurvivorRanking';
const prefix = `${parent}/${collection}/`;
const directory = path.resolve(__dirname, '../../private/maintenance/survivor-reset');
const client = new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1', auth: true });

async function readAll() {
  let token = ''; const documents = [];
  do {
    const response = await client.get(`${parent}/${collection}`, { queryParams: { pageSize: 200, ...(token ? { pageToken: token } : {}) } });
    documents.push(...(response.body.documents || []));
    token = response.body.nextPageToken || '';
  } while(token);
  return documents;
}

(async () => {
  assert(!process.env.FIRESTORE_EMULATOR_HOST, 'Production reset cannot target emulator');
  await requireAuth({ project: projectId, ...auth.getGlobalDefaultAccount() });
  const option = process.argv.find(arg => arg.startsWith('--commit='));
  if(!option) {
    const documents = await readAll();
    assert(documents.length <= 500, 'Review required for more than one atomic batch');
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const backup = { projectId, collection, createdAt: new Date().toISOString(), documents };
    const file = path.join(directory, `backup-${Date.now()}.json`);
    const bytes = JSON.stringify(backup, null, 2);
    fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
    assert.equal(fs.readFileSync(file, 'utf8'), bytes);
    console.log(JSON.stringify({ mode: 'backed-up', collection, records: documents.length, backupPath: file, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }));
  } else {
    const file = path.resolve(option.slice('--commit='.length));
    assert.equal(path.dirname(file), directory, 'Use this reset tool’s exact backup directory');
    const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(backup.projectId, projectId); assert.equal(backup.collection, collection);
    assert(backup.documents.length <= 500);
    assert(Date.now() - Date.parse(backup.createdAt) < 30 * 60 * 1000, 'Backup is older than 30 minutes');
    for(const doc of backup.documents) assert(doc.name.startsWith(prefix) && !doc.name.slice(prefix.length).includes('/') && doc.updateTime);
    const current = await readAll();
    const versions = rows => rows.map(row => `${row.name}|${row.updateTime}`).sort();
    assert.deepEqual(versions(current), versions(backup.documents), 'Records changed since backup; prepare a fresh backup');
    if(current.length) {
      await client.post(`projects/${projectId}/databases/(default)/documents:commit`, {
        writes: backup.documents.map(doc => ({ delete: doc.name, currentDocument: { updateTime: doc.updateTime } }))
      });
    }
    const remaining = await readAll();
    console.log(JSON.stringify({ mode: 'reset', collection, deleted: current.length, remaining: remaining.length, backupPath: file }));
    assert.equal(remaining.length, 0, 'New records appeared after the reset; do not delete them automatically');
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
