import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { Rooms } from "./rooms.js";

const root = resolve(
  fileURLToPath(new URL("../../public/town-marble/", import.meta.url)),
);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
export function createMarbleServer({ port = 5188, host = "127.0.0.1" } = {}) {
  const sockets = new Map();
  const send = (ws, body) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (ws.bufferedAmount > 256 * 1024) {
        ws.close(1013, "Reconnect for current state");
        return;
      }
      ws.send(JSON.stringify(body));
    }
  };
  const rooms = new Rooms({
    onChange: (code) => {
      for (const [ws, session] of sockets)
        if (session.code === code) {
          try {
            send(ws, { type: "state", state: rooms.snapshot(code) });
          } catch {
            send(ws, {
              type: "expired",
              error: "방이 종료되었어요. 새 여행을 시작해 주세요.",
            });
            ws.close();
          }
        }
    },
  });
  const server = createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405).end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (pathname === "/health") {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ ok: true, mode: "development", persistent: false }),
      );
      return;
    }
    if (pathname === "/") {
      res.writeHead(302, { Location: "/town-marble/" }).end();
      return;
    }
    if (!pathname.startsWith("/town-marble/")) {
      res.writeHead(404).end();
      return;
    }
    const relative = pathname.slice("/town-marble/".length) || "index.html";
    const path = resolve(root, relative);
    if (!path.startsWith(root + sep) || !mime[extname(path)]) {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = await readFile(path);
      res.setHeader("Content-Type", mime[extname(path)]);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader(
        "Cache-Control",
        relative === "index.html"
          ? "no-cache"
          : relative.startsWith("assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
      );
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.writeHead(404).end("Build the game first: npm run build");
    }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  server.on("upgrade", (req, socket, head) => {
    let origin;
    try {
      origin = new URL(req.headers.origin);
    } catch {
      socket.destroy();
      return;
    }
    let reqHost;
    try {
      reqHost = new URL(`http://${req.headers.host}`).hostname;
    } catch {
      socket.destroy();
      return;
    }
    const allowed =
      origin.hostname === reqHost ||
      (["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) &&
        ["localhost", "127.0.0.1", "[::1]"].includes(reqHost));
    if (
      !allowed ||
      req.url !== "/town-marble/socket" ||
      wss.clients.size >= 450
    ) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  });
  const connectionRates = new Map();
  wss.on("connection", (ws, req) => {
    let lastWindow = Date.now(),
      count = 0,
      alive = true;
    const ip = req.socket.remoteAddress;
    ws.on("pong", () => {
      alive = true;
    });
    ws.pulse = () => {
      if (!alive) ws.terminate();
      else {
        alive = false;
        ws.ping();
      }
    };
    ws.on("message", (buffer) => {
      let message;
      try {
        if (Date.now() - lastWindow > 1000) {
          lastWindow = Date.now();
          count = 0;
        }
        if (++count > 15) throw new Error("조금만 천천히 눌러 주세요.");
        message = JSON.parse(buffer.toString());
        if (!message || typeof message !== "object")
          throw new Error("요청을 확인해 주세요.");
        if (message.type === "ping") {
          send(ws, {
            type: "pong",
            sentAt: message.sentAt,
            serverNow: Date.now(),
          });
          return;
        }
        if (["create", "join", "resume"].includes(message.type)) {
          if (sockets.has(ws)) throw new Error("이미 방에 참가하고 있어요.");
          if (message.type !== "resume") {
            const rate = connectionRates.get(ip) || {
              at: Date.now(),
              count: 0,
            };
            if (Date.now() - rate.at > 60000) {
              rate.at = Date.now();
              rate.count = 0;
            }
            if (++rate.count > 40)
              throw new Error("방 입장이 많아요. 잠시 뒤 다시 시도해 주세요.");
            connectionRates.set(ip, rate);
          }
          let session;
          if (message.type === "create") session = rooms.create(message);
          if (message.type === "join") session = rooms.join(message);
          if (message.type === "resume") {
            const { seat } = rooms.auth(message.code, message.token);
            session = {
              code: message.code,
              token: message.token,
              playerId: seat.id,
            };
            // One authoritative browser per seat; a reconnect takes over its old connection.
            for (const [other, prior] of sockets)
              if (prior.token === session.token) {
                sockets.delete(other);
                send(other, {
                  type: "replaced",
                  error: "다른 창에서 이 여행을 이어가고 있어요.",
                });
                other.close();
              }
          }
          sockets.set(ws, session);
          rooms.connection(session.code, session.token, true);
          send(ws, {
            type: "welcome",
            id: message.id,
            session,
            state: rooms.snapshot(session.code),
          });
          return;
        }
        const session = sockets.get(ws);
        if (!session) throw new Error("먼저 방에 입장해 주세요.");
        if (message.type !== "action")
          throw new Error("지원하지 않는 요청이에요.");
        const state = rooms.command(session.code, session.token, message);
        send(ws, { type: "ack", id: message.id, state });
        if (message.action.type === "LEAVE") {
          sockets.delete(ws);
          ws.close(1000);
        }
      } catch (error) {
        send(ws, { type: "error", id: message?.id, error: error.message });
      }
    });
    ws.on("close", () => {
      const session = sockets.get(ws);
      sockets.delete(ws);
      if (session)
        try {
          rooms.connection(session.code, session.token, false);
        } catch {
          /* expired */
        }
    });
    ws.on("error", () => ws.close());
  });
  const tick = setInterval(() => rooms.tick(), 1000);
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) ws.pulse?.();
    for (const [ip, rate] of connectionRates)
      if (Date.now() - rate.at > 60000) connectionRates.delete(ip);
  }, 15000);
  server.listen(port, host);
  return {
    server,
    rooms,
    close: () =>
      new Promise((resolveClose) => {
        clearInterval(tick);
        clearInterval(heartbeat);
        for (const ws of wss.clients) ws.terminate();
        wss.close();
        server.close(resolveClose);
      }),
  };
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const port = Number(process.env.PORT || 5188),
    host = process.env.MARBLE_HOST || "127.0.0.1";
  const app = createMarbleServer({ port, host });
  app.server.on("listening", () =>
    console.log(
      `두근두근 마블: http://${host}:${app.server.address().port}/town-marble/ (development; rooms are in memory)`,
    ),
  );
  app.server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
    app.close();
  });
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => app.close().then(() => process.exit()));
}
