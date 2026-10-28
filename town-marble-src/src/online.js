const STORAGE = "dj48-town-marble-session-v1";
export function storedSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE)) || null;
  } catch {
    return null;
  }
}
const save = (session) => {
  try {
    session
      ? sessionStorage.setItem(STORAGE, JSON.stringify(session))
      : sessionStorage.removeItem(STORAGE);
  } catch {
    /* private browsing */
  }
};
export class OnlineClient {
  constructor({ onState, onConnection, onSession, onError }) {
    Object.assign(this, { onState, onConnection, onSession, onError });
    this.pending = new Map();
    this.session = storedSession();
    this.stopped = false;
    this.retry = 0;
    this.state = null;
  }
  connect() {
    if (this.connecting) return this.connecting;
    this.stopped = false;
    this.onConnection({ status: "connecting" });
    this.connecting = new Promise((resolve, reject) => {
      const socket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/town-marble/socket`,
      );
      this.socket = socket;
      const timer = setTimeout(() => {
        socket.close();
        reject(
          new Error(
            "대전 서버에 연결되지 않아요. 서버 실행 상태를 확인해 주세요.",
          ),
        );
      }, 6500);
      socket.onopen = async () => {
        clearTimeout(timer);
        this.retry = 0;
        clearInterval(this.pingTimer);
        try {
          if (this.session) await this.request("resume", this.session);
          this.onConnection({ status: "connected" });
          this.pingTimer = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN)
              socket.send(JSON.stringify({ type: "ping", sentAt: Date.now() }));
          }, 5000);
          resolve();
        } catch (error) {
          this.session = null;
          save(null);
          this.onSession(null);
          this.onConnection({ status: "offline" });
          reject(error);
        }
      };
      socket.onmessage = ({ data }) => {
        let message;
        try {
          message = JSON.parse(data);
        } catch {
          return;
        }
        if (message.type === "pong") {
          this.onConnection({
            status: "connected",
            latency: Date.now() - message.sentAt,
          });
          return;
        }
        if (message.type === "welcome") {
          this.session = message.session;
          save(this.session);
          this.onSession(this.session);
        }
        if (message.state) {
          if (
            !this.state ||
            this.state.code !== message.state.code ||
            message.state.version >= this.state.version
          ) {
            this.state = message.state;
            this.onState(message.state);
          }
        }
        if (["expired", "replaced"].includes(message.type)) {
          this.session = null;
          save(null);
          this.stopped = true;
          this.onSession(null);
          this.onError(message.error);
          this.onConnection({ status: "offline" });
        }
        const pending = this.pending.get(message.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pending.delete(message.id);
          message.type === "error"
            ? pending.reject(new Error(message.error))
            : pending.resolve(message);
        } else if (message.type === "error") this.onError(message.error);
      };
      socket.onerror = () => {
        clearTimeout(timer);
        reject(
          new Error(
            "대전 서버를 찾지 못했어요. 혼자 연습은 바로 할 수 있어요.",
          ),
        );
      };
      socket.onclose = () => {
        if (this.socket !== socket) return;
        clearTimeout(timer);
        clearInterval(this.pingTimer);
        this.connecting = null;
        for (const item of this.pending.values()) {
          clearTimeout(item.timer);
          item.reject(
            new Error(
              "연결이 잠시 끊겼어요. 다시 연결되면 화면을 확인해 주세요.",
            ),
          );
        }
        this.pending.clear();
        if (!this.stopped) {
          this.onConnection({ status: "offline" });
          if (this.session)
            this.reconnectTimer = setTimeout(
              () => this.connect().catch(() => {}),
              Math.min(1000 * 2 ** this.retry++, 8000),
            );
        }
      };
    });
    return this.connecting;
  }
  request(type, payload = {}) {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState !== WebSocket.OPEN) {
        reject(new Error("다시 연결 중이에요. 잠시 기다려 주세요."));
        return;
      }
      const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            "응답이 늦어지고 있어요. 최신 화면을 확인한 뒤 다시 선택해 주세요.",
          ),
        );
      }, 8000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ ...payload, type, id }));
    });
  }
  async enter(type, profile) {
    // An explicit new room is separate from the saved reconnect option.
    if (this.session) {
      this.stop({ forget: true });
      this.state = null;
    }
    await this.connect();
    return this.request(type, profile);
  }
  action(action) {
    return this.request("action", { action, version: this.state.version });
  }
  stop({ forget = false } = {}) {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingTimer);
    this.socket?.close();
    this.socket = null;
    this.connecting = null;
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error("연결을 종료했어요."));
    }
    this.pending.clear();
    if (forget) {
      this.session = null;
      save(null);
    }
  }
}
