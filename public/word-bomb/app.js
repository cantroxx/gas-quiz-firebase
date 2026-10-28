(function () {
  "use strict";
  const D = WordBombDomain,
    $ = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );
  const names = ["나", "지우", "민준", "서연", "도윤", "하린", "시우", "유나"];
  const looks = [
    "네이비 셔츠",
    "아이보리 니트",
    "세이지 맨투맨",
    "오렌지 후디",
    "차콜 재킷",
    "블루 셔츠",
    "버건디 니트",
    "올리브 재킷",
    "머스터드 재킷",
    "라일락 가디건",
    "틸 폴로",
    "데님 재킷",
    "그레이 후디",
    "레드 체크",
    "그린 트랙 재킷",
    "크림 맨투맨",
  ];
  let selectedCharacter = 0;
  let selectedMode = "normal",
    game = null,
    room = null,
    net = null,
    online = false,
    me = "local",
    busy = false,
    botAt = 0,
    botTurn = 0,
    lastEvent = "",
    resultShown = false,
    lastTickSound = -1;
  let sound = false,
    reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
    audioContext = null,
    animationTimer = null,
    uiEpoch = 0,
    connecting = null;
  const now = () => (online && net ? net.now() : Date.now());
  const config = () =>
    D.settings({
      mode: selectedMode === "challenge" ? "challenge" : "normal",
      allowOneShot: $("one-shot").value === "on",
      speed: Number($("game-speed").value),
      turnSeconds: Number($("turn-seconds").value),
      hearts: Number($("hearts").value),
      durationSeconds: Number($("duration").value),
    });
  const playbackSpeed = () =>
    game?.options.speed || room?.options.speed || config().speed;
  function bomb() {
    const path = "M30 32 Q27 19 39 13 Q52 9 49 2";
    return (
      '<img class="bomb-prop" src="assets/bomb-body-v6.png" alt="" draggable="false"><svg class="live-fuse" viewBox="0 0 60 80" aria-hidden="true"><g fill="none" stroke-linecap="round"><path class="fuse-rope fuse-shadow" pathLength="1" d="' +
      path +
      '"/><path class="fuse-rope fuse-tan" pathLength="1" d="' +
      path +
      '"/><path class="fuse-rope fuse-light" pathLength="1" d="' +
      path +
      '"/></g><g class="ember-position" transform="translate(49 2)"><g class="ember-flame"><circle class="ember-halo" r="6"/><circle class="ember-core" r="2.5"/><path class="ember-sparks" d="M-5 -2l-4 -2 M3 -5l2 -4 M5 1l4 2"/></g><circle class="fuse-smoke" cy="-6" r="3"/></g></svg>'
    );
  }
  function burnFuse(holder, fraction) {
    const ratio = Math.max(0, Math.min(1, fraction));
    holder.dataset.fuseRemaining = ratio.toFixed(3);
    holder
      .querySelectorAll(".fuse-rope")
      .forEach((path) => path.setAttribute("stroke-dasharray", ratio + " 1"));
    const path = holder.querySelector(".fuse-tan");
    const point = path.getPointAtLength(path.getTotalLength() * ratio);
    holder
      .querySelector(".ember-position")
      .setAttribute("transform", "translate(" + point.x + " " + point.y + ")");
  }
  function character(index) {
    return `<div class="character human-art ${index >= 8 ? "human-extra" : ""}" style="--sprite-x:${((index % 4) * 100) / 3}%;--sprite-y:${index % 8 < 4 ? 0 : 100}%" aria-hidden="true"></div>`;
  }
  function playSound(type) {
    if (!sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const t = audioContext.currentTime,
        osc = audioContext.createOscillator(),
        gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = type === "explode" ? "triangle" : "sine";
      const f = type === "pass" ? 660 : type === "explode" ? 180 : 880;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(
        type === "pass" ? 990 : type === "explode" ? 60 : 650,
        t + 0.16,
      );
      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch (_) {}
  }
  function renderSeats() {
    const players =
      game?.players ||
      room?.players ||
      Array.from({ length: Number($("bot-count").value) + 1 }, (_, i) => ({
        id: i ? "preview-" + i : "local",
        name: names[i],
        characterId: (selectedCharacter + i) % looks.length,
      }));
    $("arena").style.setProperty("--players", players.length);
    $("seats").innerHTML = players
      .map((p, i) => {
        const active = game?.phase === "playing" && game.current === i;
        const isMe = p?.id === me,
          stat = p
            ? game
              ? game.options.mode === "challenge"
                ? p.score + "점"
                : p.out
                  ? "관전 중"
                  : "♥".repeat(Math.max(0, p.hearts)) +
                    "♡".repeat(game.options.hearts - p.hearts)
              : room
                ? p.ready
                  ? "준비 완료"
                  : Number.isInteger(p.characterId)
                    ? "준비 중"
                    : "캐릭터 선택 중"
                : "기다리는 중"
            : "빈 자리";
        return `<div class="seat ${active ? "active" : ""} ${p?.out ? "out" : ""} ${!p ? "empty" : ""}" data-seat="${i}" style="--seat:${i}">${active ? `<div class="bomb-holder">${bomb()}<span class="bomb-number">${game.options.turnSeconds}</span></div>` : ""}${character(p.characterId ?? i)}<div class="seat-label">${esc(p?.name || "친구를 기다려요")}${isMe ? '<span class="seat-you">나</span>' : ""}</div><span class="seat-sub">${esc(stat)}</span></div>`;
      })
      .join("");
  }
  function renderPicker(container, selected, lobby) {
    container.innerHTML =
      '<p class="picker-title">내 캐릭터 선택 <small>시작 전 바꿀 수 있어요</small></p><div class="character-options">' +
      looks
        .map((name, id) => {
          const owner = lobby
            ? room.players.find((p, i) => p.id !== me && p.characterId === id)
            : null;
          return (
            '<button type="button" data-character="' +
            id +
            '" aria-label="' +
            name +
            '" aria-pressed="' +
            (id === selected) +
            '" ' +
            (owner ? "disabled" : "") +
            ' class="character-option ' +
            (id === selected ? "selected" : "") +
            '">' +
            character(id) +
            "<span>" +
            esc(owner ? owner.name + " 선택" : name) +
            "</span></button>"
          );
        })
        .join("") +
      "</div>";
    container.querySelectorAll("[data-character]").forEach(
      (button) =>
        (button.onclick = () => {
          const id = Number(button.dataset.character);
          if (lobby) work(() => net.action("character", { characterId: id }));
          else {
            selectedCharacter = id;
            render();
          }
        }),
    );
  }
  function renderWord() {
    const word = game?.word || "사과";
    $("current-word").style.setProperty(
      "--word-size",
      (word.length > 16
        ? 18
        : word.length > 8
          ? 24
          : word.length > 4
            ? 32
            : 43) + "px",
    );
    $("current-word").title = word;
    $("current-word").innerHTML =
      esc(word.slice(0, -1)) + "<span>" + esc(word.slice(-1)) + "</span>";
    $("next-letter").innerHTML =
      "다음 낱말은 <b>" +
      D.initials(word.slice(-1)).map(esc).join(" / ") +
      "</b>로 시작!";
    $("word-caption").textContent =
      game?.phase === "finished"
        ? "함께 이어 준 낱말"
        : game
          ? "지금 이어야 할 낱말"
          : "마음을 모아, 낱말을 이어요";
    const history = game?.history || [];
    $("history").innerHTML =
      '<span class="history-label">이어 온 낱말</span>' +
      (history.length
        ? history
            .slice(-5)
            .map(
              (item, i) =>
                (i ? '<span class="arrow">→</span>' : "") +
                `<span class="word-chip" title="${esc(item.name)} · ${esc(item.word)}${item.agreed ? " · 친구 동의" : ""}">${esc(item.word)}${item.agreed ? " ✓" : ""}</span>`,
            )
            .join("")
        : '<span class="history-empty">우리의 낱말 이야기가 여기에 쌓여요</span>');
  }
  function summary() {
    const options = game?.options || room?.options || config();
    $("mode-tag").textContent =
      options.mode === "challenge"
        ? "챌린지"
        : !online && !room && selectedMode === "bot"
          ? "봇과 대전"
          : "친구랑 해요";
    document
      .querySelector(".mode-summary")
      .classList.toggle("challenge", options.mode === "challenge");
    $("top-timer").textContent =
      options.mode === "normal"
        ? "시간 제한 없이"
        : formatTime(
            game
              ? Math.max(0, (game.endsAt - now()) / 1000)
              : options.durationSeconds,
          );
    $("turn-summary").textContent =
      `한 차례 ${options.turnSeconds}초 · ${options.mode === "normal" ? "하트 " + options.hearts + "개" : "성공 +10 / 폭발 −10"} · 한방 ${options.allowOneShot ? "허용" : "제한"} · ${options.speed || 1}배`;
    document.querySelector(".note-time").innerHTML =
      options.turnSeconds + "<small>SEC</small>";
  }
  function formatTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return (
      String(Math.floor(s / 60)).padStart(2, "0") +
      ":" +
      String(s % 60).padStart(2, "0")
    );
  }
  function animateEvent(previous) {
    if (!game) return;
    const key =
      (room?.code || "local") + ":" + game.event.seq + ":" + game.event.type;
    if (key === lastEvent) return;
    lastEvent = key;
    if (!previous || game.event.type === "start") return;
    const event = game.event;
    if (event.type === "pass") {
      playSound("pass");
      $("word-board").classList.remove("pop");
      void $("word-board").offsetWidth;
      $("word-board").classList.add("pop");
      if (
        !reduced &&
        game.turn === previous.turn + 1 &&
        now() < game.turnStartsAt
      ) {
        const from = document.querySelector(`[data-seat="${event.from}"]`),
          to = document.querySelector(`[data-seat="${event.to}"]`),
          arena = $("arena-stage").getBoundingClientRect();
        const a = from.querySelector(".human-art").getBoundingClientRect(),
          b = to.querySelector(".human-art").getBoundingClientRect(),
          start = {
            x: a.left + a.width / 2 - arena.left - 30,
            y: a.top - arena.top - 88,
          },
          end = {
            x: b.left + b.width / 2 - arena.left - 30,
            y: b.top - arena.top - 88,
          };
        const flight = $("flight");
        flight.innerHTML = bomb();
        flight.hidden = false;
        const holder = to.querySelector(".bomb-holder");
        if (holder) holder.style.visibility = "hidden";
        flight.getAnimations().forEach((a) => a.cancel());
        const duration = Math.min(
          800 / playbackSpeed(),
          Math.max(100, game.turnStartsAt - now()),
        );
        const frames = Array.from({ length: 25 }, (_, i) => {
          const t = i / 24,
            lift = Math.abs(Math.sin(t * Math.PI * 2)) * 36;
          return {
            transform: `translate(${start.x + (end.x - start.x) * t}px,${start.y + (end.y - start.y) * t - lift}px) rotate(${Math.sin(t * Math.PI * 4) * 12}deg)`,
            offset: t,
          };
        });
        const anim = flight.animate(frames, {
          duration,
          easing: "linear",
          fill: "forwards",
        });
        anim.onfinish = () => {
          flight.hidden = true;
          if (holder) {
            holder.style.visibility = "";
            if (!reduced)
              holder
                .querySelector(".bomb-prop")
                .animate(
                  [
                    { transform: "scale(1.12,.88)" },
                    { transform: "scale(.96,1.04)" },
                    { transform: "scale(1)" },
                  ],
                  { duration: 240 / playbackSpeed() },
                );
          }
        };
      }
    }
    if (event.type === "explode") {
      playSound("explode");
      const seat = document.querySelector(`[data-seat="${event.from}"]`),
        arena = $("arena-stage").getBoundingClientRect(),
        rect = seat.querySelector(".human-art").getBoundingClientRect();
      const burst = $("burst");
      burst.hidden = false;
      if (!reduced)
        seat
          .querySelector(".human-art")
          .animate(
            [
              { transform: "translateY(0)" },
              { transform: "translateY(-5px) rotate(-3deg)" },
              { transform: "translateY(0)" },
            ],
            { duration: 420 / playbackSpeed() },
          );
      burst.style.left = rect.left + rect.width / 2 - arena.left + "px";
      burst.style.top = rect.top - 48 - arena.top + "px";
      $("arena").classList.remove("explosion");
      void $("arena").offsetWidth;
      $("arena").classList.add("explosion");
      clearTimeout(animationTimer);
      animationTimer = setTimeout(() => {
        burst.hidden = true;
        $("arena").classList.remove("explosion");
      }, 850 / playbackSpeed());
      feedback(event.name + "의 폭탄이 펑! 새 낱말로 다시 이어요.");
    }
    if (event.reset) feedback("이을 낱말이 부족해서 새 시작 낱말을 드렸어요.");
  }
  function renderRoom() {
    if (!room || room.status !== "waiting") return;
    const mine = room.players.find((p) => p.id === me),
      allReady = room.players.length >= 2 && room.players.every((p) => p.ready),
      o = room.options;
    $("room-panel").innerHTML =
      `<span class="section-kicker">FRIENDS LOBBY</span><h2>친구들을 기다려요</h2><span class="small-note">친구에게 이 번호를 알려 주세요</span><div class="room-number" id="room-number">${room.code}</div><div class="room-rules">${o.mode === "normal" ? "친구랑 해요 · 하트 " + o.hearts + "개" : "챌린지 · " + o.durationSeconds / 60 + "분"}<br>매 차례 ${o.turnSeconds}초 · ${room.players.length}/8명 · 한방 ${o.allowOneShot ? "허용" : "제한"} · ${o.speed || 1}배</div><div>${room.players.map((p) => `<div class="room-player"><span>${esc(p.name)} ${p.id === room.hostId ? "♔" : ""}</span><span class="ready-badge ${p.ready ? "" : "waiting"}">${p.ready ? "준비 완료" : "준비 중"}</span></div>`).join("")}</div><div id="room-characters" class="character-picker"></div><div class="room-actions"><button id="ready" ${Number.isInteger(mine?.characterId) ? "" : "disabled"} class="${mine?.ready ? "ready" : ""}">${mine?.ready ? "준비 취소" : "준비 완료"}</button><button id="copy-code">번호 복사</button></div>${me === room.hostId ? `<button class="primary" id="start-room" ${allReady ? "" : "disabled"}>다 같이 시작! ↗</button>` : '<p class="small-note">모두 준비하면 방장이 시작해요.</p>'}<button class="leave-button" id="leave-room">대기실 나가기</button>`;
    renderPicker($("room-characters"), mine?.characterId, true);
    $("ready").onclick = () =>
      work(() => net.action("ready", { ready: !mine.ready }));
    $("copy-code").onclick = () =>
      work(async () => {
        await navigator.clipboard.writeText(room.code);
        status("방 번호를 복사했어요.");
      });
    if ($("start-room"))
      $("start-room").onclick = () => work(() => net.action("start"));
    $("leave-room").onclick = () => work(exit);
  }
  function renderMatch() {
    if (!game) return;
    const o = game.options;
    $("match-panel").innerHTML =
      `<span class="section-kicker">${online ? "FRIENDS MATCH" : "PRACTICE MATCH"}</span><h2>${online ? "우리들의 대결" : "봇과 대전 중"}</h2><div class="room-rules">${online ? "방 번호 " + esc(room.code) : "실수해도 괜찮아요!"}<br>${o.mode === "normal" ? "마지막 생존자가 승리해요." : "전체 시간 안에 더 많은 점수를!"}</div>${game.players.map((p, i) => `<div class="score-row ${i === game.current ? "current" : ""}"><span>${esc(p.name)}${p.left ? " · 나감" : p.out ? " · 관전" : ""}</span><strong>${o.mode === "normal" ? "♥ " + p.hearts : p.score + "점"}</strong></div>`).join("")}<p class="match-note">${o.mode === "normal" ? "폭탄을 받으면 시간이 다시 시작돼요. 하트가 없어지면 친구들을 응원해요." : "성공 +10점 · 폭발 −10점<br>탈락 없이 끝까지 함께해요."}</p><button class="leave-button" id="leave-match">${game.phase === "finished" ? "처음으로" : "경기 나가기"}</button>${game.phase === "finished" ? '<button class="primary" id="show-result">결과 다시 보기</button>' : ""}`;
    $("leave-match").onclick = () =>
      game.phase === "finished" ? work(exit) : $("leave-dialog").showModal();
    if ($("show-result")) $("show-result").onclick = () => showResult();
  }
  function renderProposal() {
    const proposal = game?.proposal,
      panel = $("proposal-panel");
    panel.hidden = !proposal;
    if (!proposal) {
      panel.innerHTML = "";
      return;
    }
    const proposer = game.players.find((p) => p.id === proposal.proposerId),
      vote = proposal.votes.find((v) => v.id === me);
    const canVote =
      proposal.eligibleIds.includes(me) &&
      !game.players.find((p) => p.id === me)?.out;
    const yes = proposal.votes.filter((v) => v.agree).length;
    panel.innerHTML = `<div class="proposal-heading"><span class="section-kicker">LET’S DECIDE TOGETHER</span><span id="vote-timer"></span></div><h3>${esc(proposer.name)}의 낱말 제안</h3><strong class="proposal-word">${esc(proposal.word)}</strong><p>제안자를 제외한 ${proposal.eligibleIds.length}명 중 <b>${proposal.required}명 동의</b>하면 통과!</p><div class="vote-progress">${proposal.eligibleIds
      .map((id) => {
        const p = game.players.find((p) => p.id === id),
          v = proposal.votes.find((v) => v.id === id);
        return `<span class="${v ? (v.agree ? "yes" : "no") : ""}">${esc(p.name)} · ${v ? (v.agree ? "동의" : "반대") : "생각 중"}</span>`;
      })
      .join(
        "",
      )}</div><div class="vote-actions">${canVote && !vote ? '<button id="vote-yes">동의해요 ✓</button><button id="vote-no">다른 낱말로 해요</button>' : `<span>${vote ? "투표했어요. 친구들을 기다려요." : "친구들이 낱말을 확인하고 있어요."}</span>`}</div><p class="small-note">동의 ${yes}/${proposal.required} · 투표 중에는 폭탄과 전체 타이머가 멈춰요.</p>`;
    if ($("vote-yes"))
      $("vote-yes").onclick = () =>
        work(() =>
          net.action("vote", { proposalId: proposal.id, agree: true }),
        );
    if ($("vote-no"))
      $("vote-no").onclick = () =>
        work(() =>
          net.action("vote", { proposalId: proposal.id, agree: false }),
        );
  }
  function render(previous) {
    document.body.classList.toggle("in-game", !!game);
    $("setup").hidden = !!room || !!game;
    $("room-panel").hidden = !room || room.status !== "waiting";
    $("match-panel").hidden = !game;
    $("welcome-note").hidden = !!game;
    $("word-form").hidden = !game;
    $("hint").hidden = online || !game || game.phase !== "playing";
    $("dictionary-info").disabled = !!game && game.phase === "playing";
    if (game && $("dictionary-dialog").open) $("dictionary-dialog").close();
    $("connection-status").textContent = online
      ? room?.status === "waiting"
        ? "친구들과 연결됐어요"
        : "친구와 온라인 대전"
      : game
        ? "봇과 대전 중"
        : selectedMode === "bot"
          ? "봇과 가볍게 대결해 봐요"
          : "친구와 함께할 방을 만들거나 참가해요";
    summary();
    $("arena").style.setProperty("--playback-speed", playbackSpeed());
    renderSeats();
    if (!game && !room && selectedMode === "bot")
      renderPicker($("practice-characters"), selectedCharacter, false);
    renderWord();
    renderRoom();
    renderMatch();
    renderProposal();
    if (previous?.proposal && !game?.proposal) {
      const result = game?.lastProposal;
      if (result?.accepted) {
        feedback("친구들이 동의했어요! 낱말을 인정하고 폭탄을 넘겨요.");
        if (previous.proposal.proposerId === me) $("word-input").value = "";
      } else
        feedback(
          result?.reason === "timeout"
            ? "투표 시간이 끝났어요. 다른 낱말을 써 주세요."
            : "이번 제안은 통과하지 못했어요. 다른 낱말을 써 주세요.",
        );
    }
    animateEvent(previous);
    if (game && (!previous || previous.turn !== game.turn)) {
      const seat = $("seats").children[game.current],
        viewport = $("arena");
      if (seat)
        viewport.scrollTo({
          left:
            seat.offsetLeft + seat.offsetWidth / 2 - viewport.clientWidth / 2,
          behavior: "instant",
        });
    }
    tickDisplay();
    if (!game)
      $("arena-hint").textContent = "폭탄을 받으면, 내 시간이 새로 시작돼요.";
    if (game?.phase === "finished" && !resultShown) {
      resultShown = true;
      setTimeout(() => {
        if (game?.phase === "finished") showResult();
      }, 900);
    }
  }
  function feedback(text, error = false) {
    $("word-feedback").textContent = text;
    $("word-feedback").classList.toggle("error", error);
  }
  function status(text) {
    $("status").textContent = text;
  }
  async function work(fn) {
    if (busy) return;
    busy = true;
    tickDisplay();
    try {
      status("");
      return await fn();
    } catch (error) {
      status(error.message);
      feedback(error.message, true);
    } finally {
      busy = false;
      tickDisplay();
    }
  }
  async function connect() {
    if (net) return;
    if (connecting) return connecting;
    connecting = connectOnce().finally(() => {
      connecting = null;
    });
    return connecting;
  }
  async function connectOnce() {
    status("퀴즈타운에 연결하고 있어요…");
    const firebase = await WordBombNet.load(),
      connection = WordBombNet.create(firebase);
    const profile = await connection.connect();
    net = connection;
    me = profile.me.id;
    net.on((type, value) => {
      if (type === "room") {
        if (room?.code === value.code && room.revision >= value.revision)
          return;
        const previous = game;
        room = value;
        game = room.game;
        online = true;
        status("");
        render(previous);
      } else if (type === "error") {
        $("connection-status").textContent = "다시 연결하는 중…";
        status(value.message);
      } else if (type === "connected") {
        $("connection-status").textContent = "친구와 연결됐어요";
        status("");
      }
    });
    if (profile.activeCode) {
      $("resume").hidden = false;
      $("resume").dataset.code = profile.activeCode;
    }
    status("");
  }
  function reset() {
    uiEpoch++;
    net?.stop();
    game = null;
    room = null;
    online = false;
    me = "local";
    botTurn = 0;
    lastEvent = "";
    resultShown = false;
    $("word-input").value = "";
    $("flight").hidden = true;
    $("burst").hidden = true;
    $("countdown").hidden = true;
    $("resume").hidden = true;
    $("flight")
      .getAnimations()
      .forEach((a) => a.cancel());
    for (const id of ["result-dialog", "leave-dialog"])
      if ($(id).open) $(id).close();
    status("");
    feedback("두 글자 이상 · 중복 금지 · 두음법칙 허용");
    render();
  }
  async function exit() {
    if (online && net) await net.leave();
    reset();
  }
  function startPractice() {
    if (room || game || selectedMode !== "bot") return;
    online = false;
    me = "local";
    const count = Number($("bot-count").value);
    game = D.create(
      Array.from({ length: count + 1 }, (_, i) => ({
        id: i ? "bot-" + i : "local",
        name: names[i],
        bot: i > 0,
        characterId: (selectedCharacter + i) % looks.length,
      })),
      config(),
      Date.now(),
    );
    botTurn = 0;
    lastEvent = "";
    resultShown = false;
    status("");
    feedback("두 글자 이상 · 중복 금지 · 두음법칙 허용");
    render();
    $("word-form").scrollIntoView({
      block: "nearest",
      behavior: reduced ? "instant" : "smooth",
    });
  }
  function showResult() {
    if (!game) return;
    const winners = game.players.filter((p) => game.winners.includes(p.id));
    $("result-title").textContent = winners.length
      ? winners.map((p) => p.name).join(" · ") +
        " " +
        (winners.length > 1 ? "공동 우승!" : "우승!")
      : "함께해서 즐거웠어요!";
    $("result-subtitle").textContent =
      game.options.mode === "challenge"
        ? "시간 안에 차곡차곡 이은 우리의 낱말"
        : "끝까지 두근두근, 멋진 대결이었어요!";
    $("result-rows").innerHTML = [...game.players]
      .sort((a, b) =>
        game.options.mode === "challenge"
          ? b.score - a.score
          : b.hearts - a.hearts,
      )
      .map(
        (p) =>
          `<div class="result-row ${game.winners.includes(p.id) ? "winner" : ""}"><span>${esc(p.name)}${p.left ? " · 항복" : ""}<small>연결 ${p.successes}번 · 폭발 ${p.explosions}번</small></span><strong>${game.options.mode === "challenge" ? p.score + "점" : "♥ " + p.hearts}</strong></div>`,
      )
      .join("");
    if (!$("result-dialog").open) $("result-dialog").showModal();
  }
  function tickDisplay() {
    if (!game) return;
    const realTime = now(),
      voting = !!game.proposal;
    const t = voting ? game.proposal.startedAt : realTime,
      pre = t < game.startsAt,
      remaining = Math.max(
        0,
        Math.ceil((game.turnEndsAt - Math.max(t, game.turnStartsAt)) / 1000),
      );
    const live = game.phase === "playing",
      mine = game.players[game.current]?.id === me,
      arrived = t >= game.turnStartsAt;
    $("countdown").hidden = !pre || !live;
    $("countdown").textContent = String(
      Math.max(1, Math.ceil((game.startsAt - t) / 1000)),
    );
    const number = document.querySelector(".bomb-number"),
      holder = document.querySelector(".bomb-holder");
    if (number) number.textContent = String(remaining);
    if (holder) {
      holder.classList.toggle("urgent", !voting && remaining <= 3 && arrived);
      holder.classList.toggle("voting", voting);
      burnFuse(
        holder,
        (game.turnEndsAt - Math.max(t, game.turnStartsAt)) /
          (game.options.turnSeconds * 1000),
      );
    }
    if (
      live &&
      !voting &&
      remaining <= 3 &&
      arrived &&
      lastTickSound !== game.turn + ":" + remaining
    ) {
      lastTickSound = game.turn + ":" + remaining;
      playSound("tick");
    }
    $("submit-word").disabled =
      busy || voting || !live || !mine || !arrived || remaining <= 0;
    $("propose-word").disabled =
      !online || $("submit-word").disabled || game.proposalTurn === game.turn;
    $("proposal-help").textContent = !online
      ? "제안 투표는 친구와 하는 온라인 대전에서 이용해요."
      : game.proposalTurn === game.turn
        ? "제안은 한 차례에 한 번만 할 수 있어요."
        : "사전에 없으면 친구들의 동의를 받아요.";
    if ($("vote-timer"))
      $("vote-timer").textContent =
        Math.max(0, Math.ceil((game.proposal.expiresAt - realTime) / 1000)) +
        "초 남음";
    for (const id of ["vote-yes", "vote-no"]) if ($(id)) $(id).disabled = busy;
    $("word-input").disabled =
      !live || voting || !!game.players.find((p) => p.id === me)?.out;
    $("input-label").textContent = voting
      ? "친구들과 낱말을 확인하고 있어요 · 타이머 잠시 멈춤"
      : !live
        ? "이번 경기가 끝났어요"
        : pre
          ? "출발 신호를 기다려요"
          : !arrived
            ? "폭탄이 날아오고 있어요!"
            : mine
              ? "내 차례! " +
                D.initials(game.word.slice(-1)).join(" / ") +
                "로 시작하는 낱말은?"
              : game.players[game.current].name +
                "의 차례 · 내 낱말을 미리 생각해 봐요";
    $("arena-hint").textContent = voting
      ? "함께 결정해요! 투표가 끝나면 게임을 이어 가요."
      : !live
        ? "좋은 경기였어요. 다음에 또 만나요!"
        : game.options.mode === "normal"
          ? "차례마다 카운트 초기화 · 마지막 생존자가 승리!"
          : "개인 카운트는 초기화 · 전체 경기 시간은 계속 흘러요";
    if (game.options.mode === "challenge")
      $("top-timer").textContent = formatTime(
        (game.endsAt - Math.max(game.finishedAt || t, game.startsAt)) / 1000,
      );
  }
  function tick() {
    if (game?.phase === "playing" && !online) {
      const previous = D.clone(game);
      D.advance(game, Date.now());
      if (previous.turn !== game.turn || game.phase !== previous.phase)
        render(previous);
      if (game.phase === "playing" && game.players[game.current].bot) {
        if (botTurn !== game.turn) {
          botTurn = game.turn;
          botAt =
            game.turnStartsAt +
            (1200 +
              Math.random() * Math.min(3200, game.options.turnSeconds * 500)) /
              playbackSpeed();
          if (Math.random() < 0.15) botAt = game.turnEndsAt + 100;
        }
        if (Date.now() >= botAt && Date.now() < game.turnEndsAt) {
          const words = D.practiceChoices(game);
          botAt = Infinity;
          if (words.length) {
            const before = game;
            game = D.submit(
              game,
              game.players[game.current].id,
              words[Math.floor(Math.random() * words.length)],
              game.turn,
              Date.now(),
            ).state;
            render(before);
          }
        }
      }
    }
    tickDisplay();
  }
  $("word-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (busy || !game || $("submit-word").disabled) return;
    work(async () => {
      const text = $("word-input").value,
        turn = game.turn,
        token = uiEpoch;
      if (!text.trim()) throw Error("낱말을 먼저 써 주세요.");
      if (online) {
        const result = await net.action("submit", { word: text, turn });
        if (token !== uiEpoch) return;
        if (!result.accepted) {
          feedback(result.message, true);
          return;
        }
      } else {
        const previous = game,
          result = D.submit(game, me, text, turn, Date.now());
        game = result.state;
        render(previous);
        if (!result.accepted) {
          feedback(result.message, true);
          return;
        }
      }
      $("word-input").value = "";
      feedback("성공! 다음 친구에게 폭탄을 넘겼어요.");
      $("word-input").focus({ preventScroll: true });
    });
  });
  $("propose-word").onclick = () => {
    if (!online || !game || $("propose-word").disabled) return;
    work(async () => {
      const result = await net.action("propose", {
        word: $("word-input").value,
        turn: game.turn,
      });
      if (result.message) feedback(result.message, true);
      else
        $("proposal-panel").scrollIntoView({
          block: "nearest",
          behavior: reduced ? "instant" : "smooth",
        });
    });
  };
  $("word-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.isComposing || event.keyCode === 229))
      event.preventDefault();
  });
  $("hint").onclick = () => {
    if (!game || online) return;
    const word = D.practiceChoices(game)[0];
    feedback(word ? "연습 힌트: " + word : "다른 시작 낱말을 기다려 주세요.");
  };
  function chooseMode(mode) {
    if (game || room) return;
    selectedMode = mode;
    for (const name of ["normal", "challenge", "bot"]) {
      $("mode-" + name).classList.toggle("selected", name === mode);
      $("mode-" + name).setAttribute("aria-pressed", String(name === mode));
    }
    $("duration-setting").hidden = mode !== "challenge";
    $("hearts-setting").hidden = mode === "challenge";
    $("friend-actions").hidden = mode === "bot";
    $("bot-settings").hidden = mode !== "bot";
    $("mode-description").innerHTML = {
      normal:
        "친구와 방을 만들고 하트를 지켜요!<br>캐릭터는 방에 들어가서 골라요.",
      challenge:
        "친구끼리 시간 안에 낱말 점수를 모아요!<br>탈락 없이 도전 · 캐릭터는 대기실에서 선택",
      bot: "혼자서도 바로, 봇과 하트 대결!<br>아래에서 인원과 내 캐릭터를 골라요.",
    }[mode];
    render();
  }
  $("mode-normal").onclick = () => chooseMode("normal");
  $("mode-bot").onclick = () => chooseMode("bot");
  $("mode-challenge").onclick = () => chooseMode("challenge");
  for (const id of [
    "turn-seconds",
    "hearts",
    "duration",
    "one-shot",
    "game-speed",
  ])
    $(id).onchange = summary;
  $("bot-count").onchange = () => {
    if (!game && !room) render();
  };
  $("practice").onclick = startPractice;
  $("create-room").onclick = () =>
    work(async () => {
      await connect();
      me = net.me().id;
      resultShown = false;
      lastEvent = "";
      if (selectedMode === "bot") return;
      await net.create(config());
    });
  $("join-room").onclick = () =>
    work(async () => {
      const code = $("room-code").value.trim();
      if (!/^\d{6}$/.test(code))
        throw Error("여섯 자리 방 번호를 입력해 주세요.");
      await connect();
      me = net.me().id;
      resultShown = false;
      lastEvent = "";
      await net.join(code);
    });
  $("resume").onclick = () =>
    work(async () => {
      await connect();
      me = net.me().id;
      resultShown = false;
      await net.join($("resume").dataset.code);
    });
  $("room-code").addEventListener("keydown", (event) => {
    if (event.key === "Enter") $("join-room").click();
  });
  $("confirm-leave").onclick = () => work(exit);
  $("play-again").onclick = () => work(exit);
  $("close-result").onclick = () => $("result-dialog").close();
  $("help").onclick = () => $("help-dialog").showModal();
  document
    .querySelectorAll("[data-close]")
    .forEach(
      (button) => (button.onclick = () => $(button.dataset.close).close()),
    );
  $("sound").onclick = () => {
    sound = !sound;
    $("sound").textContent = sound ? "소리 켜짐" : "소리 꺼짐";
    $("sound").setAttribute("aria-pressed", String(sound));
    if (sound) playSound("pass");
  };
  function motion() {
    document.body.classList.toggle("reduced-motion", reduced);
    $("motion").setAttribute("aria-pressed", String(reduced));
    $("motion").textContent = reduced ? "움직임 최소" : "움직임 줄이기";
    if (reduced) {
      $("flight").hidden = true;
      $("flight")
        .getAnimations()
        .forEach((a) => a.cancel());
      document
        .querySelectorAll(".bomb-holder")
        .forEach((el) => (el.style.visibility = ""));
    }
  }
  $("motion").onclick = () => {
    reduced = !reduced;
    motion();
  };
  motion();
  $("dictionary-count").textContent = D.wordCount;
  function searchDictionary() {
    const query = $("dictionary-search").value.trim().normalize("NFC");
    const words = WordBombDictionary.words
      .filter((word) => word.includes(query))
      .slice(0, 100);
    $("dictionary-list").innerHTML = words.length
      ? words.map((word) => "<span>" + esc(word) + "</span>").join("")
      : "<p>교실 사전에 없는 낱말이에요.</p>";
  }
  $("dictionary-info").onclick = () => {
    searchDictionary();
    $("dictionary-dialog").showModal();
  };
  $("dictionary-search").oninput = searchDictionary;
  window.addEventListener("beforeunload", (event) => {
    if (online && game?.phase === "playing") {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  chooseMode("normal");
  setInterval(tick, 100);
  // Restore active room affordance after reload, without signing in anonymously.
  if (
    !["localhost", "127.0.0.1"].includes(location.hostname) ||
    new URLSearchParams(location.search).get("emulator") === "1"
  )
    connect().catch(() => {
      if (!game && !room)
        status(
          "친구 대전은 퀴즈타운 로그인 후 이용해요. 봇 연습은 바로 시작할 수 있어요.",
        );
    });
  window.WordBombApp = { state: () => game, room: () => room };
})();
