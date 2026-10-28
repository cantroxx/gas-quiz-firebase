#!/usr/bin/env node
"use strict";
// Word Bomb only: preserve every unrelated live file and Hosting setting.
const fs = require("node:fs"),
  path = require("node:path"),
  zlib = require("node:zlib"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const base = "/opt/homebrew/lib/node_modules/firebase-tools/lib/";
const auth = require(base + "auth"),
  { requireAuth } = require(base + "requireAuth"),
  api = require(base + "hosting/api"),
  { Client } = require(base + "apiv2");
const site = "dj48-quiztown-firebase",
  root = path.resolve(__dirname, "../.."),
  stage = "/tmp/word-bomb-release";
const client = new Client({
  urlPrefix: "https://firebasehosting.googleapis.com",
  apiVersion: "v1beta1",
  auth: true,
});
const digest = (b) => crypto.createHash("sha256").update(b).digest("hex"),
  pack = (b) => zlib.gzipSync(b, { level: 9 });
async function files(version) {
  let token = "",
    all = {};
  do {
    const r = await client.get(version + "/files", {
      queryParams: { pageSize: 1000, ...(token ? { pageToken: token } : {}) },
    });
    for (const f of r.body.files || []) all[f.path] = f.hash;
    token = r.body.nextPageToken || "";
  } while (token);
  return all;
}
function localFiles(dir, prefix = "word-bomb") {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? localFiles(path.join(dir, e.name), prefix + "/" + e.name)
        : [prefix + "/" + e.name],
    );
}
async function main() {
  await requireAuth({ project: site, ...auth.getGlobalDefaultAccount() });
  const live = await api.getChannel("-", site, "live"),
    source = live.release.version.name;
  if (process.argv.includes("--release")) {
    const plan = JSON.parse(fs.readFileSync(stage + "/hosting-plan.json"));
    assert.equal(source, plan.source, "Live changed; prepare again");
    assert.deepEqual(await files(plan.version), plan.files);
    assert.deepEqual(
      (await client.get(plan.version)).body.config,
      live.release.version.config,
    );
    for (const [file, hash] of Object.entries(plan.rawHashes))
      assert.equal(digest(fs.readFileSync(stage + "/candidate/" + file)), hash);
    const result = await api.createRelease(site, "live", plan.version, {
      message:
        "Word Bomb: eight players, seated human characters and bouncing handoffs",
    });
    const receipt = {
      release: result.name,
      version: plan.version,
      previous: source,
      changed: plan.changed,
    };
    fs.writeFileSync(stage + "/receipt.json", JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify(receipt));
    return;
  }
  const before = await files(source);
  if (!process.argv.includes("--prepare")) {
    console.log(
      JSON.stringify({
        source,
        files: Object.keys(before).length,
        existingWordBomb: Object.keys(before).filter((p) =>
          p.startsWith("/word-bomb/"),
        ),
      }),
    );
    return;
  }
  const response = await fetch(
    `https://${site}.web.app/battle/?word-bomb-review=${Date.now()}`,
  );
  assert(response.ok);
  const old = Buffer.from(await response.arrayBuffer());
  assert.equal(
    digest(pack(old)),
    before["/battle/index.html"],
    "Live battle manifest mismatch",
  );
  const html = old.toString("utf8");
  const local = fs.readFileSync(root + "/public/battle/index.html", "utf8");
  const card = local.match(
    /    <a class="entry" href="\/word-bomb\/"[\s\S]*?<\/a>/,
  )?.[0];
  assert(card);
  const prior = html.includes('href="/word-bomb/"')
    ? /    <a class="entry" href="\/word-bomb\/"[\s\S]*?<\/a>/
    : /    <a class="entry" href="\/wordbattle\/"[\s\S]*?<\/a>/;
  assert(prior.test(html), "Legacy game entry missing");
  const replacements = {
    "battle/index.html": Buffer.from(html.replace(prior, card)),
  };
  for (const file of localFiles(root + "/public/word-bomb"))
    replacements[file] = fs.readFileSync(root + "/public/" + file);
  const changes = {},
    uploads = {},
    rawHashes = {};
  for (const [file, bytes] of Object.entries(replacements)) {
    fs.mkdirSync(path.dirname(stage + "/candidate/" + file), {
      recursive: true,
    });
    fs.writeFileSync(stage + "/candidate/" + file, bytes);
    const packed = pack(bytes),
      hash = digest(packed);
    if (before["/" + file] === hash) continue;
    changes["/" + file] = hash;
    uploads[hash] = packed;
    rawHashes[file] = digest(bytes);
  }
  assert.equal(
    (await api.getChannel("-", site, "live")).release.version.name,
    source,
    "Live changed",
  );
  const clone = await api.cloneVersion(site, source, false),
    version = clone.name || clone.response?.name;
  assert.match(version, /sites\/[^/]+\/versions\//);
  const pop = await client.post(version + ":populateFiles", { files: changes }),
    uploader = new Client({ urlPrefix: pop.body.uploadUrl, auth: true });
  for (const hash of pop.body.uploadRequiredHashes || []) {
    const r = await uploader.request({
      method: "POST",
      path: "/" + hash,
      body: require("node:stream").Readable.from(uploads[hash]),
      responseType: "stream",
      resolveOnHTTPError: true,
    });
    assert(r.status < 400, "Upload failed");
  }
  await api.updateVersion(site, version.split("/").pop(), {
    status: "FINALIZED",
  });
  const expected = { ...before, ...changes };
  assert.deepEqual(
    await files(version),
    expected,
    "Unrelated Hosting files changed",
  );
  assert.deepEqual(
    (await client.get(version)).body.config,
    live.release.version.config,
    "Hosting settings changed",
  );
  fs.writeFileSync(
    stage + "/hosting-plan.json",
    JSON.stringify(
      {
        source,
        version,
        files: expected,
        rawHashes,
        changed: Object.keys(changes),
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      prepared: version,
      stage,
      changed: Object.keys(changes),
      preservedFiles: Object.keys(before).filter((p) => !changes[p]).length,
    }),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
