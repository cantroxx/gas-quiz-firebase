"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
for (const name of ["dictionary.js", "word-policy.js", "domain.js"]) {
  const source = path.join(root, "functions/word-bomb", name),
    target = path.join(root, "public/word-bomb", name);
  if (process.argv.includes("--check")) {
    if (fs.readFileSync(source, "utf8") !== fs.readFileSync(target, "utf8"))
      throw Error("Word Bomb shared file differs: " + name);
  } else fs.copyFileSync(source, target);
}
console.log("Word Bomb shared dictionary and domain are identical.");
