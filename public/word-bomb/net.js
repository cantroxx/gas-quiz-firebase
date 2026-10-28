(function (root) {
  "use strict";
  let loading;
  async function load() {
    if (root.firebase?.apps?.length) return root.firebase;
    if (loading) return loading;
    loading = (async () => {
      const local = ["localhost", "127.0.0.1"].includes(location.hostname);
      const emulator =
        local && new URLSearchParams(location.search).get("emulator") === "1";
      if (local && !emulator)
        throw Error(
          "지금은 로컬 미리보기예요. 봇 연습을 이용해 주세요. 친구 대전은 온라인 배포 후 이용할 수 있어요.",
        );
      for (const name of ["app", "auth", "functions"]) {
        await script("/__/firebase/10.12.2/firebase-" + name + "-compat.js");
      }
      if (emulator) {
        root.firebase.initializeApp({
          apiKey: "demo-key",
          projectId: "demo-word-bomb",
          authDomain: "localhost",
          appId: "demo-word-bomb",
        });
        root.firebase
          .auth()
          .useEmulator("http://127.0.0.1:9393", { disableWarnings: true });
        root.firebase
          .app()
          .functions("asia-northeast3")
          .useEmulator("127.0.0.1", 5203);
      } else await script("/__/firebase/init.js");
      return root.firebase;
    })().catch((error) => {
      loading = null;
      throw error;
    });
    return loading;
  }
  function script(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () =>
        reject(
          Error("온라인 연결 파일을 불러오지 못했어요. 다시 시도해 주세요."),
        );
      document.head.append(s);
    });
  }
  function create(firebase) {
    const auth = firebase.auth();
    const callable = firebase
      .app()
      .functions("asia-northeast3")
      .httpsCallable("wordBombAction", { timeout: 35000 });
    let offset = 0,
      me = null,
      room = null,
      epoch = 0,
      code = "",
      stopped = true;
    const listeners = new Set();
    const emit = (type, value) => listeners.forEach((fn) => fn(type, value));
    async function request(action, data = {}) {
      if (!auth.currentUser) throw Error("먼저 퀴즈타운에 로그인해 주세요.");
      const sent = Date.now(),
        result = (await callable({ action, ...data })).data;
      if (action !== "watch" && Number.isFinite(result.serverNow))
        offset = result.serverNow - (sent + Date.now()) / 2;
      return result;
    }
    function accept(value) {
      if (
        !value ||
        value.code !== code ||
        (room && value.revision < room.revision)
      )
        return;
      room = value;
      emit("room", room);
    }
    async function watch(value) {
      const token = ++epoch;
      code = value;
      room = null;
      stopped = false;
      try {
        const result = await request("sync", { code });
        if (token !== epoch) return;
        accept(result.room);
      } catch (error) {
        if (token === epoch) {
          stopped = true;
          emit("error", error);
        }
        return;
      }
      let failures = 0;
      while (
        !stopped &&
        token === epoch &&
        room &&
        !["finished", "closed"].includes(room.status)
      ) {
        try {
          const result = await request("watch", {
            code,
            revision: room.revision,
          });
          if (token !== epoch) return;
          failures = 0;
          emit("connected", true);
          accept(result.room);
        } catch (error) {
          if (token !== epoch) return;
          failures++;
          emit(
            "error",
            Error("연결을 다시 시도하고 있어요. 경기 시간은 계속 흘러요."),
          );
          if (
            /permission-denied|unauthenticated|not-found/.test(error.code || "")
          ) {
            stopped = true;
            emit("error", error);
            return;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(5000, 500 * failures)),
          );
          if (token !== epoch) return;
          try {
            const sync = await request("sync", { code });
            if (token !== epoch) return;
            accept(sync.room);
          } catch (_) {}
        }
      }
    }
    return {
      now: () => Date.now() + offset,
      me: () => me,
      room: () => room,
      on(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      request,
      async connect() {
        await new Promise((resolve) => {
          const off = auth.onAuthStateChanged(() => {
            off();
            resolve();
          });
        });
        const result = await request("profile");
        me = result.me;
        return result;
      },
      async create(options) {
        const result = await request("create", { options });
        watch(result.room.code);
        return result;
      },
      async join(value) {
        const result = await request("join", { code: value });
        watch(result.room.code);
        return result;
      },
      watch,
      async action(action, data = {}) {
        const token = epoch;
        const result = await request(action, { code, ...data });
        if (token === epoch) accept(result.room);
        return result;
      },
      async leave() {
        const result = await request("leave", { code });
        epoch++;
        stopped = true;
        room = null;
        code = "";
        return result;
      },
      stop() {
        epoch++;
        stopped = true;
        room = null;
        code = "";
      },
    };
  }
  root.WordBombNet = { load, create };
})(globalThis);
