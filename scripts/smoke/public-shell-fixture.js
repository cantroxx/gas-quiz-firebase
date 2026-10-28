'use strict';
// Public shell checks are offline: no production Auth, Functions, Firestore or Storage.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const ORIGIN = 'https://dj48-public-smoke.invalid';
async function install(context) {
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if(url.origin !== ORIGIN || !['GET','HEAD'].includes(request.method())) return route.abort('blockedbyclient');
    if(url.pathname === '/__/firebase/init.js') return route.fulfill({contentType:'text/javascript',body:'firebase.initializeApp({apiKey:"synthetic-public-shell",projectId:"demo-dj48-rules",appId:"synthetic"});'});
    const sdk = /^\/__\/firebase\/[^/]+\/(firebase-(?:app|auth|firestore|storage|functions)-compat\.js)$/.exec(url.pathname);
    const publicRoot = path.join(ROOT,'public');
    const relative=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
    const file = sdk ? path.join(ROOT,'node_modules/firebase',sdk[1]) : process.env.TOWN_UI_STAGE ? await require('./town-ui-candidate-fixture').file(relative) : path.resolve(publicRoot,'.'+relative);
    if(!sdk && !process.env.TOWN_UI_STAGE && !file.startsWith(publicRoot+path.sep)) return route.abort('blockedbyclient');
    if(!fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({status:404,body:''});
    const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'}[path.extname(file)] || 'application/octet-stream';
    return route.fulfill({path:file,contentType:type});
  });
}
function isExpectedBlockedConsole(text) {
  return text.includes('net::ERR_BLOCKED_BY_CLIENT') || (text.includes('@firebase/firestore:') && text.includes('Could not reach Cloud Firestore backend.'));
}
module.exports={ORIGIN,install,isExpectedBlockedConsole};
