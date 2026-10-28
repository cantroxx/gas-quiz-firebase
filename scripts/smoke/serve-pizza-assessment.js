'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
function serve(port = 5324) {
  const root = path.resolve(__dirname, '../../public');
  const server = http.createServer((req, res) => {
    let name; try { name = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400).end(); return; }
    if (name.endsWith('/')) name += 'index.html';
    const sdk = name.match(/^\/__\/firebase\/10\.12\.2\/(firebase-(?:app|auth|functions)-compat\.js)$/);
    const file = sdk ? path.resolve(__dirname, '../../node_modules/firebase', sdk[1]) : path.resolve(root, '.' + name);
    if (!sdk && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => { if (error) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store'); res.end(data); });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}
if (require.main === module) serve().then(() => console.log('Pizza assessment preview: http://127.0.0.1:5324/pizza-assessment/?emulator=1'));
module.exports = { serve };
