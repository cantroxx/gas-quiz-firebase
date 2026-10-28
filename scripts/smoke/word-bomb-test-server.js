"use strict";
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
async function serve() {
  const root = path.resolve(__dirname, "../../public");
  const server = http.createServer((req, res) => {
    let name;
    try {
      name = decodeURIComponent(req.url.split("?")[0]);
    } catch (_) {
      res.writeHead(400).end();
      return;
    }
    if (name.endsWith("/")) name += "index.html";
    const sdk = name.match(
      /^\/__\/firebase\/10\.12\.2\/(firebase-(?:app|auth|functions)-compat\.js)$/,
    );
    const file = sdk
      ? path.resolve(__dirname, "../../node_modules/firebase", sdk[1])
      : path.resolve(root, "." + name);
    if (!sdk && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        {
          ".js": "text/javascript",
          ".html": "text/html",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".png": "image/png",
        }[path.extname(file)] || "application/octet-stream",
      );
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: "http://127.0.0.1:" + server.address().port,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}
module.exports = { serve };
