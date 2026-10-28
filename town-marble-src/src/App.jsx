import React, { useEffect, useRef, useState } from "react";
import Board, { Character } from "./Stage.jsx";
import {
  BOARD,
  CHARACTERS,
  BUILD_NAMES,
  TURN_MS,
  RULESET,
  money,
} from "../shared/data.js";
import {
  createGame,
  applyAction,
  botAction,
  netWorth,
  owned,
  rentAt,
  resale,
  timeoutGame,
} from "../shared/game.js";
import { OnlineClient, storedSession } from "./online.js";
import {
  FirebaseOnlineClient,
  cloudSession,
  usesFirebase,
  loadFirebase,
} from "./firebase-online.js";
import { Cash, PaymentEffects } from "./Effects.jsx";

const secureRandom = (n) => {
  const max = Math.floor(4294967296 / n) * n,
    values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= max);
  return values[0] % n;
};
const defaultName = () => {
  try {
    return localStorage.getItem("town-marble-name") || "여행가";
  } catch {
    return "여행가";
  }
};
function Dice({ value = 1, rolling }) {
  const dots = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  }[value];
  return (
    <span
      className={`dice ${rolling ? "rolling" : ""}`}
      role="img"
      aria-label={`주사위 ${value}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <i className={dots.includes(i) ? "dot visible" : "dot"} key={i} />
      ))}
    </span>
  );
}
function Modal({ title, children, close }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const cancel = (event) => {
      event.preventDefault();
      close();
    };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={close} aria-label="닫기">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  const [speed, setSpeed] = useState(() => {
    try {
      const saved = Number(localStorage.getItem("town-marble-speed"));
      return [1, 1.5, 2].includes(saved) ? saved : 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("town-marble-speed", String(speed));
    } catch {
      /* optional */
    }
  }, [speed]);
  const [emotions, setEmotions] = useState({});
  useEffect(() => {
    if (!Object.keys(emotions).length) return;
    const timer = setTimeout(() => setEmotions({}), 1600);
    return () => clearTimeout(timer);
  }, [emotions]);
  const [name, setName] = useState(defaultName),
    [character, setCharacter] = useState(0),
    [minutes, setMinutes] = useState(0);
  const [mode, setMode] = useState("home"),
    [game, setGame] = useState(null),
    [room, setRoom] = useState(null);
  const [session, setSession] = useState(() =>
      usesFirebase() ? cloudSession() : storedSession(),
    ),
    [connection, setConnection] = useState({ status: "idle" });
  const [busy, setBusy] = useState(false),
    [moving, setMoving] = useState(false),
    [rolling, setRolling] = useState(false);
  const [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState(null),
    [selected, setSelected] = useState(null);
  const [code, setCode] = useState(""),
    [tab, setTab] = useState(() =>
      new URLSearchParams(location.search).get("mode") === "online"
        ? "online"
        : "practice",
    );
  const [account, setAccount] = useState(null);
  const [assetsReady, setAssetsReady] = useState(false),
    [assetError, setAssetError] = useState(false);
  const [reduced, setReduced] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [sound, setSound] = useState(false);
  const [now, setNow] = useState(Date.now()),
    [offset, setOffset] = useState(0);
  const online = useRef(null),
    gameRef = useRef(game),
    audioRef = useRef(null),
    pendingRef = useRef(false);
  gameRef.current = game;
  const makeOnline = () => {
    if (!online.current)
      online.current = new (
        usesFirebase() ? FirebaseOnlineClient : OnlineClient
      )({
        onState: (state) => {
          setRoom(state);
          setGame(state.game);
          setOffset(state.serverNow - Date.now());
          setMode("online");
        },
        onConnection: setConnection,
        onSession: (next) => {
          setSession(next);
          if (!next) {
            setMode("home");
            setRoom(null);
            setGame(null);
            setModal(null);
            setSelected(null);
          }
        },
        onError: setError,
      });
    return online.current;
  };
  useEffect(() => {
    if (!usesFirebase()) return;
    let live = true,
      off;
    loadFirebase()
      .then((firebase) => {
        if (!live) return;
        off = firebase.auth().onAuthStateChanged(async (user) => {
          if (!user) {
            setAccount(null);
            return;
          }
          try {
            const profile = (
              await firebase
                .app()
                .functions("asia-northeast3")
                .httpsCallable("townMarbleAction")({ type: "profile" })
            ).data;
            if (!live || firebase.auth().currentUser?.uid !== user.uid) return;
            setAccount(profile);
            setName(profile.name);
            if (profile.code)
              setSession({
                code: profile.code,
                playerId: profile.id,
                uid: user.uid,
                transport: "firebase",
              });
          } catch (error) {
            if (live) setError(error.message);
          }
        });
      })
      .catch((error) => {
        if (live) setError(error.message);
      });
    return () => {
      live = false;
      off?.();
    };
  }, []);
  useEffect(() => {
    let live = true;
    Promise.all(
      ["sky-v2", "characters"].map(
        (asset) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = resolve;
            image.onerror = reject;
            image.src = `/town-marble/art/${asset}.png`;
          }),
      ),
    )
      .then(() => {
        if (live) setAssetsReady(true);
      })
      .catch(() => {
        if (live) setAssetError(true);
      });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      live = false;
      clearInterval(timer);
      online.current?.stop();
      audioRef.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (
      mode !== "practice" ||
      !game ||
      game.status !== "playing" ||
      !game.players[game.current].bot ||
      moving ||
      busy
    )
      return;
    const timer = setTimeout(
      () => act(botAction(game), true),
      (reduced ? 450 : 1200) / speed,
    );
    return () => clearTimeout(timer);
  }, [mode, game?.revision, moving, busy, reduced, speed]);
  useEffect(() => {
    if (
      mode === "practice" &&
      game?.status === "playing" &&
      game.endsAt &&
      now >= game.endsAt
    )
      setGame(timeoutGame(game, secureRandom, now));
  }, [now, mode, game?.endsAt, game?.status]);
  const meId = mode === "practice" ? "me" : session?.playerId;
  const current = game?.players[game.current],
    me = game?.players.find((p) => p.id === meId);
  const mine = current?.id === meId && game?.status === "playing";
  const locked =
    busy || moving || (mode === "online" && connection.status !== "connected");
  const previewSeats = CHARACTERS.map((c) => ({
    id: `preview-${c.id}`,
    name: c.name,
    character: c.id,
  }));
  const seats =
    room && mode === "online" ? room.seats : game?.players || previewSeats;
  const mySeat = room?.seats.find((s) => s.id === session?.playerId);
  const beep = () => {
    if (!sound) return;
    try {
      audioRef.current ||= new AudioContext();
      audioRef.current.resume();
      const audio = audioRef.current,
        gain = audio.createGain(),
        oscillator = audio.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(640, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        960,
        audio.currentTime + 0.12,
      );
      gain.gain.setValueAtTime(0.05, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.22);
    } catch {
      /* sound is optional */
    }
  };
  async function act(action, bot = false) {
    if (pendingRef.current || (!bot && locked)) return;
    pendingRef.current = true;
    setBusy(true);
    setError("");
    if (action.type === "ROLL") {
      setRolling(true);
      beep();
    }
    try {
      if (action.type === "ROLL")
        await new Promise((resolve) =>
          setTimeout(resolve, (reduced ? 80 : 380) / speed),
        );
      if (mode === "practice") {
        const state = gameRef.current;
        setGame(
          applyAction(
            state,
            bot ? state.players[state.current].id : "me",
            action,
            secureRandom,
          ),
        );
      } else await makeOnline().action(action);
      if (action.type === "BUY" || action.type === "BUILD") beep();
      if (action.type !== "ROLL") setSelected(null);
    } catch (error) {
      setError(error.message);
    } finally {
      pendingRef.current = false;
      setBusy(false);
      setRolling(false);
    }
  }
  function startPractice() {
    if (!name.trim()) {
      setError("여행에 사용할 별명을 적어 주세요.");
      return;
    }
    try {
      localStorage.setItem("town-marble-name", name.trim());
    } catch {
      /* optional */
    }
    const other = CHARACTERS.filter((c) => c.id !== character);
    setGame(
      createGame(
        [
          { id: "me", name: name.trim().slice(0, 12), character },
          ...other.map((c) => ({
            id: `bot-${c.id}`,
            name: c.name,
            character: c.id,
            bot: true,
          })),
        ],
        { minutes },
      ),
    );
    setMode("practice");
    setRoom(null);
    setError("");
    setSelected(null);
  }
  async function enter(type) {
    if (busy) return;
    if (!name.trim()) {
      setError("여행에 사용할 별명을 적어 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await makeOnline().enter(type, {
        name: name.trim(),
        character,
        minutes,
        code: code.trim().toUpperCase(),
      });
      setMode("online");
      setModal(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function resume() {
    setBusy(true);
    setError("");
    try {
      await makeOnline().connect();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  function home() {
    online.current?.stop({ forget: true });
    online.current = null;
    setSession(null);
    setRoom(null);
    setGame(null);
    setMode("home");
    setSelected(null);
    setModal(null);
    setError("");
    setConnection({ status: "idle" });
  }
  async function leave() {
    if (mode === "online") {
      if (connection.status !== "connected") {
        setError(
          "연결된 뒤 나가거나 이 창을 닫아 주세요. 자리는 다시 접속할 수 있도록 보존돼요.",
        );
        return;
      }
      try {
        if (!game) await makeOnline().action({ type: "LEAVE" });
        else if (game.status === "playing" && !me?.out)
          await makeOnline().action({ type: "SURRENDER" });
      } catch (error) {
        setError(error.message);
        return;
      }
    }
    home();
  }
  const selectTile = (index) => {
    setSelected(index);
    setModal("tile");
  };
  const tile = selected !== null ? BOARD[selected] : null;
  const lot = tile && game?.properties[selected];
  const owner = lot?.owner && game?.players.find((p) => p.id === lot.owner);
  const remaining = game
    ? Math.max(0, Math.ceil((game.deadline - (now + offset)) / 1000))
    : 45;
  const timeLeft = game?.endsAt
    ? Math.max(
        0,
        Math.ceil(
          (game.endsAt - (now + (mode === "online" ? offset : 0))) / 60000,
        ),
      )
    : null;
  const myProperties = me ? owned(game, me.id) : [];
  const canBankrupt =
    game?.debt &&
    me &&
    me.cash +
      myProperties.reduce(
        (sum, property) => sum + resale(property, property.index),
        0,
      ) <
      game.debt.amount;

  return (
    <div
      className={`app cinematic ${game ? "in-game" : "in-lobby"} ${reduced ? "reduced" : ""}`}
    >
      <header className="app-header">
        <a
          className="brand"
          href="/town-marble/"
          onClick={(e) => {
            if (mode !== "home") {
              e.preventDefault();
              setModal("leave");
            }
          }}
        >
          <span className="brand-dice">⚄</span>
          <span>
            두근두근 <b>마블</b>
            <small>DJ48 · LITTLE WORLD CLUB</small>
          </span>
        </a>
        <nav>
          {mode === "home" ? (
            <a
              className="town-return"
              href={
                usesFirebase()
                  ? "/battle/"
                  : "https://dj48-quiztown-firebase.web.app/battle/"
              }
            >
              퀴즈타운
            </a>
          ) : (
            <button
              className="speed-control"
              aria-label={`진행 배속 ${speed}배, 눌러서 변경`}
              title="연출 속도 조절 · 온라인 턴 제한 시간은 같아요"
              onClick={() =>
                setSpeed((old) => (old === 1 ? 1.5 : old === 1.5 ? 2 : 1))
              }
            >
              <span>{speed}×</span>
              <span className="speed-word"> 속도</span>
            </button>
          )}
          <button onClick={() => setModal("rules")}>
            게임 방법 <span className="help-circle">?</span>
          </button>
          {game && (
            <button onClick={() => setModal("journal")}>여행 기록</button>
          )}
        </nav>
        <div className="header-actions">
          <button
            className={`icon-button ${sound ? "on" : ""}`}
            aria-label={sound ? "소리 끄기" : "소리 켜기"}
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
          >
            {sound ? "♫" : "♪"}
          </button>
          <button
            className="motion-button"
            onClick={() => setReduced(!reduced)}
            aria-pressed={reduced}
          >
            {reduced ? "모션 적게" : "모션 켜짐"}
          </button>
          <span className="club-tag">DJ48 퀴즈타운</span>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              WORLD TOUR <span>01</span>
            </div>
            <h1>
              파스텔 아일랜드 <span>✦</span>
            </h1>
            <p>주사위를 굴려요. 나만의 도시를 만나요.</p>
          </div>
          <div className="room-status">
            <span
              className={`status-dot ${connection.status === "offline" ? "offline" : ""}`}
            />
            {mode === "online"
              ? connection.status === "connected"
                ? "친구들과 연결됨"
                : "다시 연결 중"
              : mode === "practice"
                ? "봇과 연습 여행"
                : "새로운 여행을 기다리는 중"}
            <small>
              {mode === "online"
                ? `방 ${room?.code || "…"}${connection.latency !== undefined ? ` · ${connection.latency}ms` : ""}`
                : "2–4 PLAYERS · BASIC RULES"}
            </small>
          </div>
        </div>
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="알림 닫기">
              ×
            </button>
          </div>
        )}
        {mode === "online" && connection.status !== "connected" && (
          <div className="reconnect-banner" role="status">
            연결을 복구하고 있어요. 캐릭터와 자산은 서버의 최신 상태로 이어져요.
          </div>
        )}
        <div className="workspace">
          <section className="board-column" aria-label="여행 게임판">
            <div className="player-strip">
              {Array.from({ length: 4 }, (_, i) => {
                const seat = seats[i],
                  p = game?.players.find((p) => p.id === seat?.id),
                  c = CHARACTERS[seat?.character ?? i];
                return (
                  <div
                    key={seat?.id || i}
                    data-player={seat?.id}
                    className={`player-card ${p?.id === current?.id && game ? "current" : ""} ${p?.out ? "out" : ""} ${!seat ? "empty" : ""}`}
                    style={{
                      "--player-color": c.color,
                      "--player-soft": c.soft,
                    }}
                  >
                    <div className="avatar">
                      <Character character={c.id} />
                    </div>
                    <div>
                      <strong>
                        {seat?.name || "빈 자리"}
                        {seat?.id === meId && <em>나</em>}
                      </strong>
                      {p && !p.out ? (
                        <Cash amount={p.cash} />
                      ) : (
                        <span>
                          {p
                            ? "여행 끝 · 응원 중"
                            : mode === "online"
                              ? seat
                                ? seat.ready
                                  ? "준비 완료"
                                  : "준비 중"
                                : "친구를 기다려요"
                              : c.tag}
                        </span>
                      )}
                    </div>
                    {game &&
                      p?.id === current?.id &&
                      game.status === "playing" && <i className="turn-dot" />}
                  </div>
                );
              })}
            </div>
            <Board
              game={game}
              seats={seats}
              selected={selected}
              onSelect={selectTile}
              canTravel={mine && game?.phase === "travel" && !locked}
              reduced={reduced}
              speed={speed}
              onMoving={setMoving}
              onEmotion={({ playerId, kind }) =>
                setEmotions((old) => ({ ...old, [playerId]: kind }))
              }
              rolling={rolling}
              previewCharacter={character}
              onBrowse={() => setModal("cities")}
            />
            <div className="board-footnote">
              <span>✧ {RULESET}</span>
              <span>게임머니는 이번 여행에서만 사용해요.</span>
            </div>
          </section>
          <aside className="sidebar">
            {mode === "home" && (
              <section className="panel setup-panel">
                <div className="section-kicker">YOUR NEXT ADVENTURE</div>
                <h2>어떤 친구로 떠날까요?</h2>
                <p className="muted">작은 발걸음으로, 큰 세상을 만나요.</p>
                <div className="character-picker">
                  {CHARACTERS.map((c) => (
                    <button
                      key={c.id}
                      className={character === c.id ? "picked" : ""}
                      style={{
                        "--player-soft": c.soft,
                        "--player-color": c.color,
                      }}
                      onClick={() => setCharacter(c.id)}
                      aria-label={`${c.animal} ${c.name} 선택`}
                      aria-pressed={character === c.id}
                    >
                      <Character character={c.id} />
                      <span>{c.name}</span>
                      {character === c.id && <i>✓</i>}
                    </button>
                  ))}
                </div>
                <label className="field">
                  여행가 이름
                  <input
                    maxLength={12}
                    readOnly={tab === "online" && usesFirebase()}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="별명을 적어 주세요"
                    autoComplete="off"
                  />
                </label>
                <label className="field">
                  여행 규칙
                  <select
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                  >
                    <option value={0}>기본 모드 · 마지막까지 살아남기</option>
                    <option value={20}>20분 모드 · 총자산으로 승리</option>
                    <option value={30}>30분 모드 · 총자산으로 승리</option>
                  </select>
                </label>
                <div
                  className="mode-tabs"
                  role="group"
                  aria-label="플레이 모드"
                >
                  <button
                    className={tab === "practice" ? "active" : ""}
                    onClick={() => setTab("practice")}
                  >
                    혼자 연습
                  </button>
                  <button
                    className={tab === "online" ? "active" : ""}
                    onClick={() => setTab("online")}
                  >
                    친구와 대전
                  </button>
                </div>
                {tab === "practice" ? (
                  <>
                    <button
                      className="primary large"
                      disabled={!assetsReady || busy}
                      onClick={startPractice}
                    >
                      여행 시작하기 <span>→</span>
                    </button>
                    <p className="button-note">
                      봇 친구 3명과 함께 · 내 속도로 천천히
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      className="primary large"
                      disabled={
                        !assetsReady || busy || (usesFirebase() && !account)
                      }
                      onClick={() => enter("create")}
                    >
                      {busy ? "연결하는 중…" : "새로운 방 만들기"}{" "}
                      <span>＋</span>
                    </button>
                    <div className="join-row">
                      <input
                        aria-label="참가할 방 코드"
                        placeholder="6자리 방 코드"
                        maxLength={6}
                        value={code}
                        onChange={(e) =>
                          setCode(
                            e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, ""),
                          )
                        }
                      />
                      <button
                        className="secondary"
                        disabled={
                          !assetsReady ||
                          busy ||
                          code.length !== 6 ||
                          (usesFirebase() && !account)
                        }
                        onClick={() => enter("join")}
                      >
                        참가
                      </button>
                    </div>
                    <p className="button-note">
                      {usesFirebase() ? (
                        account ? (
                          `${account.name} · 퀴즈타운 친구 2~4명`
                        ) : (
                          <a href="/">
                            퀴즈타운 로그인 후 친구와 대전할 수 있어요 →
                          </a>
                        )
                      ) : (
                        "개발 대전 서버 · 랭킹 미집계 · 최대 4명"
                      )}
                    </p>
                  </>
                )}
                {!assetsReady && (
                  <p className="asset-status" role="status">
                    {assetError
                      ? "그림을 불러오지 못했어요. 새로고침해 주세요."
                      : "여행 가방에 그림을 담고 있어요…"}
                  </p>
                )}
                {session && (
                  <button
                    className="resume-button"
                    disabled={busy || !assetsReady}
                    onClick={resume}
                  >
                    ↻ 방 {session.code} 이어서 하기
                  </button>
                )}
              </section>
            )}
            {mode === "online" && !game && (
              <section className="panel lobby-panel">
                <div className="section-kicker">BOARDING PASS</div>
                <h2>친구들을 기다려요</h2>
                <p className="muted">이 코드를 친구에게 알려 주세요.</p>
                <button
                  className="room-code"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(room.code);
                      setToast("방 코드를 복사했어요.");
                    } catch {
                      setToast(`방 코드: ${room.code}`);
                    }
                  }}
                  aria-label={`방 코드 ${room?.code} 복사`}
                >
                  {room?.code}
                  <small>눌러서 복사하기</small>
                </button>
                <div className="lobby-members">
                  {seats.map((s) => (
                    <div key={s.id}>
                      <Character character={s.character} />
                      <strong>
                        {s.name}
                        {s.id === room.hostId && <small>방장</small>}
                      </strong>
                      <span className={s.ready ? "ready" : ""}>
                        {!s.connected
                          ? "연결 끊김"
                          : s.ready
                            ? "준비 완료 ✓"
                            : "준비 중"}
                      </span>
                      {!s.connected && room.hostId === session?.playerId && (
                        <button
                          className="vacate-seat"
                          disabled={locked}
                          onClick={() =>
                            act({ type: "REMOVE_DISCONNECTED", playerId: s.id })
                          }
                        >
                          자리 비우기
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  className={
                    mySeat?.ready ? "secondary large" : "primary large"
                  }
                  disabled={locked || !assetsReady}
                  onClick={() => act({ type: "READY", ready: !mySeat?.ready })}
                >
                  {mySeat?.ready ? "준비 취소" : "준비 완료!"}
                </button>
                {room?.hostId === session?.playerId && (
                  <button
                    className="primary large"
                    disabled={
                      locked ||
                      seats.length < 2 ||
                      !seats.every((s) => s.ready && s.connected)
                    }
                    onClick={() => act({ type: "START" })}
                  >
                    다 함께 출발하기 →
                  </button>
                )}
                <p className="button-note">
                  {room?.minutes
                    ? `${room.minutes}분 뒤 총자산으로 순위를 정해요.`
                    : "마지막까지 남은 여행가가 우승해요."}
                </p>
                <button
                  className="text-button"
                  onClick={() => setModal("leave")}
                >
                  대기실 나가기
                </button>
              </section>
            )}
            {game && game.status === "playing" && (
              <section className="panel action-panel">
                <div className="turn-top">
                  <span className="section-kicker">
                    ROUND {String(game.round).padStart(2, "0")}
                  </span>
                  <span>
                    {timeLeft !== null ? `약 ${timeLeft}분 남음` : "기본 모드"}
                  </span>
                </div>
                <div className="active-player">
                  <div
                    className="active-avatar"
                    style={{ background: CHARACTERS[current.character].soft }}
                  >
                    <Character
                      character={current.character}
                      emotion={emotions[current.id]}
                    />
                  </div>
                  <div>
                    <span>
                      {mine ? "이번엔 내 차례!" : `${current.name}의 차례`}
                    </span>
                    <h2>
                      {mine ? "어디로 떠나볼까요?" : "친구의 여행을 응원해요"}
                    </h2>
                  </div>
                </div>
                {mode === "online" && (
                  <div
                    className="turn-timer"
                    aria-label={`선택 시간 ${remaining}초`}
                  >
                    <i
                      style={{
                        width: `${(remaining / (TURN_MS / 1000)) * 100}%`,
                      }}
                    />
                    <span>{remaining}초</span>
                  </div>
                )}
                <div className="dice-tray">
                  <Dice value={game.dice?.[0] || 3} rolling={rolling} />
                  <Dice value={game.dice?.[1] || 4} rolling={rolling} />
                  <span>
                    {rolling
                      ? "두근두근…"
                      : game.dice
                        ? `${game.dice[0] + game.dice[1]}칸의 설렘`
                        : "오늘은 어떤 여행이 될까요?"}
                  </span>
                </div>
                <div className="action-notice" aria-live="polite">
                  {moving
                    ? `${current.name}의 발걸음을 따라가요!`
                    : game.notice}
                </div>
                {game.card && (
                  <div className="golden-card">
                    <span>✦ 황금열쇠</span>
                    <strong>{game.card.title}</strong>
                    <p>{game.card.text}</p>
                  </div>
                )}
                {mine ? (
                  <div className="action-buttons">
                    {game.phase === "roll" && (
                      <button
                        className="primary large"
                        disabled={locked}
                        onClick={() => act({ type: "ROLL" })}
                      >
                        {current.jail
                          ? current.escape
                            ? "탈출권 쓰고 주사위 굴리기"
                            : "더블로 무인도 탈출하기"
                          : "주사위 굴리기"}{" "}
                        <span>⚄</span>
                      </button>
                    )}
                    {game.phase === "property" && (
                      <>
                        {!game.properties[current.position].owner && (
                          <button
                            className="primary large"
                            disabled={
                              locked ||
                              current.cash < BOARD[current.position].price
                            }
                            onClick={() => act({ type: "BUY" })}
                          >
                            땅 구매 · {money(BOARD[current.position].price)}{" "}
                            <span>⚑</span>
                          </button>
                        )}
                        {game.properties[current.position].owner === meId &&
                          game.properties[current.position].level < 3 && (
                            <button
                              className="primary large"
                              disabled={
                                locked ||
                                current.cash < BOARD[current.position].build
                              }
                              onClick={() => act({ type: "BUILD" })}
                            >
                              {
                                BUILD_NAMES[
                                  game.properties[current.position].level + 1
                                ]
                              }{" "}
                              짓기 · {money(BOARD[current.position].build)}
                            </button>
                          )}
                        <button
                          className="secondary large"
                          disabled={locked}
                          onClick={() => act({ type: "END" })}
                        >
                          선택 마치기 →
                        </button>
                      </>
                    )}
                    {game.phase === "end" && (
                      <button
                        className="primary large"
                        disabled={locked}
                        onClick={() => act({ type: "END" })}
                      >
                        {game.extraTurn
                          ? "더블! 한 번 더 →"
                          : "다음 친구에게 →"}
                      </button>
                    )}
                    {game.phase === "travel" && (
                      <button
                        className="primary large"
                        disabled={locked}
                        onClick={() => setModal("travel")}
                      >
                        여행할 도시 고르기 🚀
                      </button>
                    )}
                    {game.phase === "debt" && (
                      <>
                        <p className="debt-note">
                          {game.debt.label}까지{" "}
                          {money(Math.max(0, game.debt.amount - current.cash))}{" "}
                          부족해요.
                        </p>
                        <button
                          className="primary large"
                          disabled={locked || !myProperties.length}
                          onClick={() => setModal("assets")}
                        >
                          내 땅 팔기
                        </button>
                        {canBankrupt && (
                          <button
                            className="secondary large"
                            disabled={locked}
                            onClick={() => act({ type: "BANKRUPT" })}
                          >
                            파산 처리하고 응원하기
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="waiting-note">
                    <span className="waiting-dots">● ● ●</span>
                    {me?.out
                      ? "여행은 끝났지만, 응원은 계속!"
                      : "내 차례가 되면 알려드릴게요."}
                  </div>
                )}
                <div className="quick-actions">
                  <button onClick={() => setModal("assets")}>
                    ⚑ 내 도시 <b>{myProperties.length}</b>
                  </button>
                  <button onClick={() => setModal("leave")}>여행 나가기</button>
                </div>
              </section>
            )}
            {game?.status === "ended" && (
              <section className="panel results-panel">
                <div className="section-kicker">WHAT A LOVELY JOURNEY</div>
                <span className="trophy">🏆</span>
                <h2>
                  {game.winners.includes(meId)
                    ? "멋진 여행이었어요, 우승!"
                    : "우리의 여행이 끝났어요!"}
                </h2>
                <p className="muted">
                  {game.reason === "time"
                    ? "여행 시간이 끝나 총자산으로 순위를 정했어요."
                    : "마지막까지 남은 여행가가 우승했어요."}
                </p>
                {[...game.players]
                  .sort(
                    (a, b) =>
                      Number(a.out) - Number(b.out) ||
                      netWorth(game, b.id) - netWorth(game, a.id),
                  )
                  .map((p, i) => (
                    <div className="result-row" key={p.id}>
                      <span>{i + 1}</span>
                      <Character character={p.character} />
                      <strong>
                        {p.name}
                        <small>
                          {p.out ? "여행 종료" : money(netWorth(game, p.id))}
                        </small>
                      </strong>
                      {game.winners.includes(p.id) && <b>★</b>}
                    </div>
                  ))}
                <p className="button-note" role="status">
                  {mode === "practice" || !usesFirebase()
                    ? "연습·개발 경기는 랭킹에 기록되지 않아요."
                    : room?.ranking?.status === "saved"
                      ? "경기 결과가 퀴즈타운 마블 랭킹에 저장됐어요."
                      : "3분 미만 경기는 랭킹에 기록되지 않아요."}
                </p>
                {usesFirebase() && mode === "online" && (
                  <a className="town-return" href="/?townMarbleRanking=1">
                    마블 랭킹 보기 →
                  </a>
                )}
                <button className="primary large" onClick={home}>
                  새 여행 준비하기 →
                </button>
              </section>
            )}
            <section className="panel journey-panel">
              <div className="journal-title">
                <h3>{game ? "우리의 여행 기록" : "여행을 더 즐겁게"}</h3>
                <span>{game ? "JOURNAL" : "TRAVEL TIP"}</span>
              </div>
              {game ? (
                <ol className="journal">
                  {game.log.slice(0, 5).map((item, i) => (
                    <li key={`${item.id}-${i}`}>
                      <i />
                      <span>{item.text}</span>
                    </li>
                  ))}
                  {!game.log.length && (
                    <li>
                      <i />
                      <span>첫 발걸음을 기다리고 있어요.</span>
                    </li>
                  )}
                </ol>
              ) : (
                <>
                  <div className="tip">
                    <span>⚑</span>
                    <p>
                      <b>내 도시를 차곡차곡</b>땅을 사고 건물을 지으면
                      <br />
                      친구에게 통행료를 받아요.
                    </p>
                  </div>
                  <div className="tip">
                    <span>✦</span>
                    <p>
                      <b>행운도 여행의 일부</b>황금열쇠에는 어떤 이야기가
                      <br />
                      기다리고 있을까요?
                    </p>
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>
        <footer>
          <span>
            DJ48 <b>두근두근 마블</b>
          </span>
          <span>함께라서 더 즐거운, 우리의 작은 세계.</span>
          <button onClick={() => setModal("rules")}>규칙 자세히 보기 ↗</button>
        </footer>
      </main>
      <PaymentEffects payment={game?.payment} reduced={reduced} />
      {toast && (
        <div className="toast" role="status">
          ✓ {toast}
        </div>
      )}
      {modal === "journal" && game && (
        <Modal title="우리의 여행 기록" close={() => setModal(null)}>
          <ol className="journal">
            {game.log.map((item, i) => (
              <li key={`${item.id}-${i}`}>
                <i />
                <span>{item.text}</span>
              </li>
            ))}
          </ol>
        </Modal>
      )}
      {modal === "rules" && (
        <Modal title="우리의 여행 규칙" close={() => setModal(null)}>
          <p className="muted">
            {RULESET} · 부루마블의 핵심 흐름을 바탕으로 한 독자 구성
          </p>
          <ol className="rules-list">
            <li>
              <b>200만으로 출발해요.</b> 주사위 2개를 굴리고 나온 눈의 합만큼
              이동해요. 출발지를 지나거나 도착하면 20만을 받아요.
            </li>
            <li>
              <b>땅을 사고 건물을 지어요.</b> 주인 없는 땅을 구매할 수 있어요.
              내가 도착한 내 땅에는 별장 → 빌딩 → 호텔 순서로 지어요. 한 차례에
              여러 단계도 가능해요.
            </li>
            <li>
              <b>친구의 땅에는 통행료를 내요.</b> 땅만 있으면 기본 요금, 건물
              단계마다 기본 요금의 3배·7배·13배예요. 내 땅과 건물은 구매·건설
              합계의 절반(소수점 버림)에 은행으로 팔 수 있어요.
            </li>
            <li>
              <b>더블이면 한 번 더!</b> 3연속 더블이면 무인도로 가요.
              무인도에서는 더블로 탈출하거나 3번 쉬어요. 탈출권은 내 차례에
              자동으로 써요. 무인도 탈출 더블은 추가 턴이 없어요.
            </li>
            <li>
              <b>특별한 칸도 있어요.</b> 황금열쇠는 12가지 카드 중 무작위로
              뽑아요. 기부금은 복지기금에 모이고 도착한 친구가 전부 받아요.
              우주여행에 도착하면 다음 턴에 다른 칸을 골라 이동해요. 이동
              방향으로 출발지를 지나면 월급도 받아요.
            </li>
            <li>
              <b>마지막까지 남으면 우승!</b> 가진 땅을 모두 팔아도 비용이
              부족하면 파산해요. 채권자가 친구면 남은 돈과 땅·건물을 넘겨요.
              은행에 낼 돈이면 땅은 빈 땅으로 돌아가요.
            </li>
            <li>
              <b>20분·30분 모드는 선택 규칙이에요.</b> 시간이 끝나면 현금 + 땅
              구매가 + 건설비로 총자산을 계산해요. 같으면 공동 우승이에요.
            </li>
            <li>
              <b>온라인 선택 시간은 45초예요.</b> 시간이 지나면 자동으로
              주사위를 굴리고 구매를 넘겨요. 부족한 비용은 땅 매각 또는 파산으로
              처리해요. 연습 모드는 천천히 생각해도 괜찮아요.
            </li>
          </ol>
          <p className="rule-footnote">
            퀴즈타운 온라인 랭킹은 3분 이상 진행한 경기만 집계해요. 단독 우승
            3점, 공동 우승 1점, 나머지는 0점이며 연습 경기는 제외해요. 캐릭터
            능력은 모두 같아요. DJ코인과 연결되지 않는 게임머니예요. 현재 32칸과
            카드·가격표는 DJ48 자체 구성이며, 상용 부루마불 판본의 전체 규칙을
            그대로 재현한 버전은 아니에요.
          </p>
          <button className="primary large" onClick={() => setModal(null)}>
            좋아요, 떠나볼까요!
          </button>
        </Modal>
      )}
      {modal === "cities" && (
        <Modal title="도시 안내" close={() => setModal(null)}>
          <p className="muted">
            도시를 선택하면 가격과 통행료, 소유자를 자세히 볼 수 있어요.
          </p>
          <div className="city-directory">
            {BOARD.map((place) => {
              const property = game?.properties[place.index],
                owner = game?.players.find((p) => p.id === property?.owner);
              return (
                <button
                  key={place.index}
                  onClick={() => selectTile(place.index)}
                >
                  <strong>{place.name}</strong>
                  <small>
                    {owner
                      ? `${owner.name} · ${BUILD_NAMES[property.level]}`
                      : place.price
                        ? money(place.price)
                        : "특별한 칸"}
                  </small>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {modal === "tile" && tile && (
        <Modal title={tile.name} close={() => setModal(null)}>
          <div className="tile-detail-icon">{tile.icon}</div>
          <p className="muted">
            {tile.type === "city"
              ? owner
                ? `${owner.name}의 도시 · ${BUILD_NAMES[lot.level]}`
                : "새로운 주인을 기다리는 도시"
              : tile.caption || "12가지 행운 카드 중 한 장을 만나요."}
          </p>
          {tile.type === "city" && (
            <dl className="tile-prices">
              <div>
                <dt>땅 가격</dt>
                <dd>{money(tile.price)}</dd>
              </div>
              <div>
                <dt>단계별 건설비</dt>
                <dd>{money(tile.build)}</dd>
              </div>
              {BUILD_NAMES.map((n, i) => (
                <div key={n}>
                  <dt>{n} 통행료</dt>
                  <dd>{money(tile.rent * [1, 3, 7, 13][i])}</dd>
                </div>
              ))}
            </dl>
          )}
          {mine && game.phase === "travel" && selected !== current.position && (
            <button
              className="primary large"
              disabled={locked}
              onClick={() => {
                act({ type: "TRAVEL", index: selected });
                setModal(null);
              }}
            >
              여기로 여행하기 🚀
            </button>
          )}
        </Modal>
      )}
      {modal === "travel" && (
        <Modal title="어디로 여행할까요?" close={() => setModal(null)}>
          <p className="muted">도착한 칸의 구매·통행료·이벤트가 적용돼요.</p>
          <div className="travel-list">
            {BOARD.filter((t) => t.index !== current.position).map((t) => (
              <button
                className="secondary"
                key={t.index}
                disabled={locked}
                onClick={() => {
                  act({ type: "TRAVEL", index: t.index });
                  setModal(null);
                }}
              >
                {t.icon} {t.name}
                <small>
                  {game.properties[t.index].owner &&
                  game.properties[t.index].owner !== meId
                    ? `통행료 ${money(rentAt(game, t.index))}`
                    : t.price
                      ? `구매 ${money(t.price)}`
                      : t.caption || "이벤트"}
                </small>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === "assets" && (
        <Modal title="내 도시 보관함" close={() => setModal(null)}>
          <p className="muted">
            땅과 건물을 함께 팔면 사용한 금액의 절반을 받아요.
          </p>
          {!myProperties.length && (
            <div className="empty-assets">
              아직 내 도시가 없어요.
              <br />
              다음 여행에서 첫 도시를 만나보세요!
            </div>
          )}
          {myProperties.map((property) => (
            <div className="asset-row" key={property.index}>
              <span>{BOARD[property.index].icon}</span>
              <div>
                <strong>{BOARD[property.index].name}</strong>
                <small>
                  {BUILD_NAMES[property.level]} · 통행료{" "}
                  {money(rentAt(game, property.index))}
                </small>
              </div>
              <button
                className="secondary"
                disabled={!mine || locked}
                onClick={() => act({ type: "SELL", index: property.index })}
              >
                {money(resale(property, property.index))}에 팔기
              </button>
            </div>
          ))}
          <p className="rule-footnote">
            내 차례에만 팔 수 있어요. 판매한 땅은 주인 없는 땅으로 돌아가요.
          </p>
        </Modal>
      )}
      {modal === "leave" && (
        <Modal title="여행에서 나갈까요?" close={() => setModal(null)}>
          <p>
            {game?.status === "playing"
              ? mode === "online"
                ? "지금 나가면 내 여행은 항복으로 끝나고, 친구들은 계속 진행해요. 잠깐 연결이 끊긴 경우에는 나가지 않고 다시 접속할 수 있어요."
                : "연습 여행의 진행 내용이 초기화돼요."
              : "대기실을 나와 새 여행을 준비해요."}
          </p>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              계속 여행하기
            </button>
            <button className="primary" onClick={leave}>
              나가기
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
