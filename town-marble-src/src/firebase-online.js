const STORAGE = "dj48-town-marble-firebase-v1";
export const usesFirebase = () =>
  !["127.0.0.1", "localhost"].includes(location.hostname) ||
  new URLSearchParams(location.search).get("emulator") === "1";
export function cloudSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE)) || null;
  } catch {
    return null;
  }
}
function save(session) {
  try {
    if (session) sessionStorage.setItem(STORAGE, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE);
  } catch {
    /* optional */
  }
}
let loading;
export function loadFirebase() {
  if (loading) return loading;
  loading = (async () => {
    const emulator =
      ["127.0.0.1", "localhost"].includes(location.hostname) &&
      new URLSearchParams(location.search).get("emulator") === "1";
    if (!usesFirebase()) throw Error("로컬 대전은 개발 서버에 연결돼요.");
    for (const name of ["app", "auth", "firestore", "functions"]) {
      if (window.firebase?.[name] || (name === "app" && window.firebase?.apps))
        continue;
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `/__/firebase/10.12.2/firebase-${name}-compat.js`;
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          reject(
            Error("온라인 연결 파일을 불러오지 못했어요. 새로고침해 주세요."),
          );
        };
        document.head.append(script);
      });
    }
    const firebase = window.firebase;
    if (!firebase.apps.length) {
      if (emulator) {
        firebase.initializeApp({
          apiKey: "demo-key",
          projectId: "demo-dj48-rules",
          authDomain: "localhost",
          appId: "demo-town-marble",
        });
        firebase
          .auth()
          .useEmulator("http://127.0.0.1:9191", { disableWarnings: true });
        firebase.firestore().useEmulator("127.0.0.1", 8181);
        firebase
          .app()
          .functions("asia-northeast3")
          .useEmulator("127.0.0.1", 5001);
      } else {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "/__/firebase/init.js";
          script.onload = resolve;
          script.onerror = () =>
            reject(Error("퀴즈타운 연결을 확인해 주세요."));
          document.head.append(script);
        });
      }
    }
    await new Promise((resolve) => {
      const off = firebase.auth().onAuthStateChanged(() => {
        off();
        resolve();
      });
    });
    return firebase;
  })().catch((error) => {
    loading = null;
    throw error;
  });
  return loading;
}
export class FirebaseOnlineClient {
  constructor(callbacks) {
    Object.assign(this, callbacks);
    this.session = cloudSession();
    this.state = null;
    this.epoch = 0;
    this.offset = 0;
  }
  async request(type, payload = {}) {
    const epoch = this.epoch;
    if (!this.firebase?.auth().currentUser)
      throw Error("퀴즈타운에 먼저 로그인해 주세요.");
    const sent = Date.now(),
      result = (await this.call({ type, code: this.session?.code, ...payload }))
        .data;
    if (epoch !== this.epoch) return result;
    if (result.state) {
      this.offset = result.state.serverNow - (sent + Date.now()) / 2;
      this.accept(result.state);
    }
    this.onConnection({ status: "connected", latency: Date.now() - sent });
    return result;
  }
  accept(state) {
    if (
      !this.state ||
      state.code !== this.state.code ||
      state.version >= this.state.version
    ) {
      this.state = { ...state, serverNow: Date.now() + this.offset };
      this.onState(this.state);
    }
  }
  async initialize() {
    this.onConnection({ status: "connecting" });
    this.firebase = await loadFirebase();
    if (!this.firebase.auth().currentUser)
      throw Error("퀴즈타운에 먼저 로그인해 주세요.");
    this.call = this.firebase
      .app()
      .functions("asia-northeast3")
      .httpsCallable("townMarbleAction", { timeout: 12000 });
    if (
      this.session &&
      this.session.uid !== this.firebase.auth().currentUser.uid
    ) {
      this.session = null;
      save(null);
      this.onSession(null);
    }
  }
  async connect() {
    await this.initialize();
    if (!this.session) {
      const profile = await this.request("profile");
      if (profile.code)
        this.session = {
          code: profile.code,
          playerId: profile.id,
          transport: "firebase",
          uid: this.firebase.auth().currentUser.uid,
        };
    }
    if (!this.session)
      throw Error("이어 할 방이 없어요. 새 방을 만들어 주세요.");
    try {
      const result = await this.request("resume");
      this.setSession(result.session);
      this.watch();
    } catch (error) {
      if (
        [
          "functions/not-found",
          "functions/permission-denied",
          "functions/failed-precondition",
        ].includes(error.code)
      ) {
        this.stop({ forget: true });
        this.onSession(null);
      }
      throw error;
    }
  }
  setSession(session) {
    this.session = session;
    save(session);
    this.onSession(session);
  }
  async enter(type, profile) {
    await this.initialize();
    const result = await this.request(type, profile);
    this.setSession(result.session);
    this.watch();
    return result;
  }
  watch() {
    this.stop();
    const epoch = this.epoch,
      code = this.session.code;
    this.unsubscribe = this.firebase
      .firestore()
      .collection("townMarbleRooms")
      .doc(code)
      .onSnapshot(
        { includeMetadataChanges: true },
        (snap) => {
          if (epoch !== this.epoch) return;
          if (
            snap.exists &&
            snap.data().participantIds.includes(this.session.uid)
          )
            this.accept(snap.data());
          this.onConnection({
            status: snap.metadata.fromCache ? "offline" : "connected",
          });
        },
        (error) => {
          if (epoch !== this.epoch) return;
          this.onError(
            error.code === "permission-denied"
              ? "방 참가 권한이 바뀌었어요. 퀴즈타운 로그인과 방 번호를 확인해 주세요."
              : "연결이 끊겼어요. 잠시 후 다시 연결해요.",
          );
          this.onConnection({ status: "offline" });
        },
      );
    let pending = false,
      lastSync = 0;
    const sync = async () => {
      const due =
        this.state?.game?.status === "playing" &&
        Date.now() + this.offset >= this.state.game.deadline;
      if (pending || Date.now() - lastSync < (due ? 2000 : 15000)) return;
      pending = true;
      lastSync = Date.now();
      try {
        await this.request("sync");
      } catch (error) {
        if (epoch === this.epoch) this.onConnection({ status: "offline" });
      } finally {
        pending = false;
      }
    };
    this.timer = setInterval(sync, 1000);
    this.authOff = this.firebase.auth().onAuthStateChanged((user) => {
      if (user?.uid !== this.session?.uid) {
        this.stop({ forget: true });
        this.onSession(null);
        this.onError("로그인 계정이 바뀌었어요. 다시 참가해 주세요.");
      }
    });
  }
  action(action) {
    return this.request("action", {
      action,
      version: this.state.version,
      id: crypto.randomUUID(),
    });
  }
  stop({ forget = false } = {}) {
    this.epoch++;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.authOff?.();
    this.authOff = null;
    clearInterval(this.timer);
    if (forget) {
      this.session = null;
      this.state = null;
      save(null);
    }
  }
}
