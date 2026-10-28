'use strict';
/* Single-process local playtest server. Deliberately not exported from Firebase Functions. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const D = require('../../public/fruit-bell/domain');
const { createRanking } = require('./ranking');
const ROOT = path.resolve(__dirname, '../../public');
const secret = () => randomBytes(18).toString('hex');
const fail = text => { throw new Error(text); };
function createServer() {
  const sessions = new Map(), rooms = new Map(), ranking = createRanking();
  function send(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
  function roomView(room) {
    return { code: room.code, host: room.host, mode: 'local', players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready, connected: !!sessions.get(p.id)?.stream,
      emote: p.emote && Date.now() < p.emote.at + D.EMOTE_COOLDOWN ? p.emote : null })), game: room.game ? D.view(room.game) : null };
  }
  function publish(room) {
    const data = `data: ${JSON.stringify({ room: roomView(room), serverNow: Date.now() })}\n\n`;
    for (const p of room.players) { const stream = sessions.get(p.id)?.stream; if (stream && !stream.destroyed) stream.write(data); }
  }
  function current(session) { return rooms.get(session.code); }
  function endRoom(room) {
    if (room.game?.phase === 'playing') D.finish(room.game, 'disconnect');
    publish(room);
  }
  function leave(session) {
    const room = current(session);
    if (!room) return;
    if (room.game?.phase === 'playing') endRoom(room);
    room.players = room.players.filter(p => p.id !== session.id);
    session.code = '';
    if (!room.players.length) rooms.delete(room.code);
    else { room.host = room.players[0].id; publish(room); }
  }
  async function body(req) {
    let data = '';
    for await (const chunk of req) { data += chunk; if (data.length > 4096) fail('요청이 너무 커요.'); }
    try { return JSON.parse(data || '{}'); } catch (_) { fail('요청을 읽지 못했어요.'); }
  }
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith('/api/fruit-bell/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, {});
        let name = decodeURIComponent(url.pathname);
        if (name.endsWith('/')) name += 'index.html';
        const file = path.resolve(ROOT, '.' + name);
        if (!file.startsWith(ROOT + path.sep)) return send(res, 403, {});
        let data; try { data = await fs.readFile(file); } catch (_) { return send(res, 404, { error: '파일을 찾지 못했어요.' }); }
        res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        return res.end(req.method === 'HEAD' ? undefined : data);
      }
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(res, 403, { error: '같은 게임 창에서 다시 시도해 주세요.' });
      const action = url.pathname.split('/').at(-1);
      if (action === 'ping') return send(res, 200, { serverNow: Date.now(), mode: 'local', version: D.VERSION });
      if (action === 'ranking') return send(res, 200, { mode: 'local', rows: ranking.list() });
      const id = /(?:^|; )fruit_bell_session=([a-f0-9]{36})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      let session = sessions.get(id);
      if (action === 'session' && req.method === 'POST') {
        if (!session) {
          if (sessions.size >= 200) fail('시험 서버가 가득 찼어요.');
          session = { id: secret(), name: '친구', code: '', seen: Date.now(), stream: null, rate: 0, rateAt: 0 };
          sessions.set(session.id, session);
          res.setHeader('Set-Cookie', `fruit_bell_session=${session.id}; HttpOnly; SameSite=Strict; Path=/api/fruit-bell; Max-Age=7200`);
        }
        return send(res, 200, { id: session.id, room: current(session) ? roomView(current(session)) : null });
      }
      if (!session) return send(res, 401, { error: '연결이 만료됐어요. 새로고침해 주세요.' });
      session.seen = Date.now();
      if (action === 'events' && req.method === 'GET') {
        if (session.stream) session.stream.end();
        session.stream = res;
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(': connected\n\n');
        if (current(session)) publish(current(session));
        req.on('close', () => { if (session.stream === res) { session.stream = null; session.seen = Date.now(); if (current(session)) publish(current(session)); } });
        return;
      }
      if (req.method !== 'POST') return send(res, 405, {});
      if (Date.now() - session.rateAt > 1000) { session.rateAt = Date.now(); session.rate = 0; }
      if (++session.rate > 20) return send(res, 429, { error: '잠깐 기다렸다 눌러 주세요.' });
      const data = await body(req), now = Date.now();
      let room = current(session);
      if (action === 'create' || action === 'join') {
        if (room) fail('현재 방에서 나간 뒤 새 방에 들어갈 수 있어요.');
        session.name = String(data.name || '친구').trim().slice(0, 12) || '친구';
        if (action === 'create') {
          if (rooms.size >= 50) fail('방이 가득 찼어요.');
          let code; do { code = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
          room = { code, host: session.id, players: [], game: null, created: now, matchId: secret() };
          rooms.set(code, room);
        } else {
          room = rooms.get(String(data.code || '').toUpperCase());
          if (!room) fail('방 코드를 다시 확인해 주세요.');
          if (room.game || room.players.length >= 4) fail('이미 시작했거나 가득 찬 방이에요.');
        }
        room.players.push({ id: session.id, name: session.name, ready: false }); session.code = room.code;
      } else if (action === 'leave') { leave(session); return send(res, 200, { room: null }); }
      else {
        if (!room) fail('먼저 방에 들어가 주세요.');
        if (action === 'ready') {
          if (room.game) fail('이미 시작한 경기예요.');
          room.players.find(p => p.id === session.id).ready = data.ready === true;
        } else if (action === 'start') {
          if (room.host !== session.id) fail('방장만 시작할 수 있어요.');
          if (room.game || room.players.length < 2 || !room.players.every(p => p.ready && sessions.get(p.id)?.stream)) fail('모두 연결하고 준비를 눌러 주세요.');
          room.game = D.create(room.players, now);
        } else if (action === 'ring' || action === 'flip') {
          if (!room.game) fail('아직 경기를 시작하지 않았어요.');
          D.tick(room.game, now);
          if (action === 'ring') D.ring(room.game, session.id, data.round, now);
          else D.flip(room.game, session.id, now);
        } else if (action === 'emote') {
          if (room.game?.phase !== 'playing' || now >= room.game.endsAt) fail('경기 중에만 감정표현을 보낼 수 있어요.');
          if (!Object.hasOwn(D.EMOTES, data.kind)) fail('감정표현을 다시 골라 주세요.');
          const player = room.players.find(p => p.id === session.id);
          if (player.emote && now - player.emote.at < D.EMOTE_COOLDOWN) fail('감정표현은 3초에 한 번씩 보내요.');
          player.emote = { kind: data.kind, at: now };
        } else fail('알 수 없는 요청이에요.');
      }
      publish(room); send(res, 200, { room: roomView(room), serverNow: Date.now() });
    } catch (error) { if (!res.headersSent) send(res, 400, { error: error.message }); else res.end(); }
  });
  let counter = 0;
  const timer = setInterval(() => {
    const now = Date.now(); counter++;
    for (const room of rooms.values()) {
      if (room.game?.phase === 'playing') {
        if (room.players.some(p => !sessions.get(p.id)?.stream && now - (sessions.get(p.id)?.seen || 0) > 12000)) endRoom(room);
        else if (D.tick(room.game, now)) publish(room);
      }
      if (room.game?.phase === 'finished') ranking.record(room.matchId, D.result(room.game));
      if (now - room.created > 30 * 60 * 1000) { for (const p of room.players) { const s = sessions.get(p.id); if (s) s.code = ''; } rooms.delete(room.code); }
    }
    if (counter % 200 === 0) {
      for (const s of sessions.values()) {
        if (s.stream) s.stream.write(': heartbeat\n\n');
        else if (!s.code && now - s.seen > 2 * 3600000) sessions.delete(s.id);
      }
    }
  }, 15);
  timer.unref();
  return { server, ranking, rooms,
    async listen(port = 0, host = '127.0.0.1') { await new Promise(resolve => server.listen(port, host, resolve)); return `http://${host}:${server.address().port}`; },
    async close() { clearInterval(timer); for (const s of sessions.values()) s.stream?.end(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  };
}
module.exports = { createServer };
if (require.main === module) {
  const app = createServer();
  app.listen(Number(process.env.FRUIT_BELL_PORT) || 5327, process.env.FRUIT_BELL_HOST || '127.0.0.1').then(url => console.log(`과일종 로컬 플레이테스트: ${url}/fruit-bell/\n운영 Firebase 연결 없음 · 시험 랭킹은 서버 종료 시 초기화됩니다.`));
  process.on('SIGINT', () => app.close().then(() => process.exit(0)));
}
