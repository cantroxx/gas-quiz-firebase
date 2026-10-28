import {
  BOARD,
  CARDS,
  INITIAL_CASH,
  SALARY,
  TURN_MS,
  BUILD_NAMES,
} from "./data.js";

const copy = (value) => structuredClone(value);
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const player = (state) => state.players[state.current];
const log = (state, text) => {
  state.notice = text;
  state.log = [{ id: state.revision, text }, ...state.log].slice(0, 24);
};
export const owned = (state, uid) =>
  state.properties
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.owner === uid);
export const resale = (property, index) =>
  Math.floor((BOARD[index].price + property.level * BOARD[index].build) / 2);
export const netWorth = (state, uid) => {
  const p = state.players.find((p) => p.id === uid);
  return (
    p.cash +
    owned(state, uid).reduce(
      (sum, lot) =>
        sum + BOARD[lot.index].price + lot.level * BOARD[lot.index].build,
      0,
    )
  );
};
export function rentAt(state, index) {
  const lot = state.properties[index],
    tile = BOARD[index];
  return tile.type === "city" && lot.owner
    ? tile.rent * [1, 3, 7, 13][lot.level]
    : 0;
}
export function createGame(seats, { minutes = 0, now = Date.now() } = {}) {
  check(
    seats.length >= 2 && seats.length <= 4,
    "2~4명이 함께 시작할 수 있어요.",
  );
  check(
    new Set(seats.map((s) => s.id)).size === seats.length,
    "플레이어가 중복되었어요.",
  );
  check(
    minutes === 0 || minutes === 20 || minutes === 30,
    "지원하지 않는 시간 설정이에요.",
  );
  return {
    revision: 0,
    players: seats.map((s) => ({
      id: s.id,
      name: s.name,
      character: s.character,
      bot: !!s.bot,
      cash: INITIAL_CASH,
      position: 0,
      jail: 0,
      escape: false,
      out: false,
    })),
    properties: BOARD.map(() => ({ owner: null, level: 0 })),
    current: 0,
    turn: 1,
    round: 1,
    phase: "roll",
    dice: null,
    doubles: 0,
    extraTurn: false,
    debt: null,
    fund: 0,
    card: null,
    motion: null,
    payment: null,
    log: [],
    notice: `${seats[0].name}의 여행을 시작해요!`,
    startedAt: now,
    endsAt: minutes ? now + minutes * 60000 : null,
    deadline: now + TURN_MS,
    status: "playing",
    winners: [],
    reason: null,
  };
}
function finish(state, reason) {
  state.status = "ended";
  state.phase = "ended";
  state.reason = reason;
  state.debt = null;
  const active = state.players.filter((p) => !p.out);
  const highest = Math.max(...active.map((p) => netWorth(state, p.id)));
  state.winners = active
    .filter((p) => netWorth(state, p.id) === highest)
    .map((p) => p.id);
  log(
    state,
    reason === "time"
      ? "여행 시간이 끝났어요. 총자산으로 순위를 정해요!"
      : "마지막까지 남은 여행가가 우승했어요!",
  );
}
function turnEnd(state, now) {
  if (state.players.filter((p) => !p.out).length <= 1) {
    finish(state, "survivor");
    return;
  }
  if (state.endsAt && now >= state.endsAt) {
    finish(state, "time");
    return;
  }
  const p = player(state);
  if (
    state.extraTurn &&
    !p.out &&
    !p.jail &&
    BOARD[p.position].type !== "travel"
  ) {
    state.extraTurn = false;
    state.phase = "roll";
    state.card = null;
    state.deadline = now + TURN_MS;
    log(state, `${p.name}, 더블! 주사위를 한 번 더 굴려요.`);
    return;
  }
  const old = state.current;
  do {
    state.current = (state.current + 1) % state.players.length;
  } while (player(state).out);
  if (state.current <= old) state.round++;
  state.turn++;
  state.doubles = 0;
  state.extraTurn = false;
  state.card = null;
  state.phase =
    BOARD[player(state).position].type === "travel" ? "travel" : "roll";
  state.deadline = now + TURN_MS;
  log(state, `${player(state).name}의 차례예요.`);
}
function settle(state) {
  const debt = state.debt,
    p = player(state);
  if (!debt || p.cash < debt.amount) return;
  p.cash -= debt.amount;
  if (debt.to === "fund") state.fund += debt.amount;
  else if (debt.to !== "bank") {
    const recipient = state.players.find((p) => p.id === debt.to);
    if (recipient && !recipient.out) recipient.cash += debt.amount;
  }
  log(state, `${p.name}, ${debt.label} ${debt.amount}만을 냈어요.`);
  state.payment = {
    id: state.revision,
    from: p.id,
    to: debt.to,
    amount: debt.amount,
  };
  state.debt = null;
  state.phase = "end";
}
function charge(state, amount, to, label) {
  if (!amount) {
    state.phase = "end";
    return;
  }
  state.debt = { amount, to, label };
  state.phase = "debt";
  settle(state);
  if (state.debt)
    log(
      state,
      `${player(state).name}, ${label}가 ${amount - player(state).cash}만 부족해요. 땅을 팔아 마련해요.`,
    );
}
function move(
  state,
  destination,
  { salary = true, teleport = false, steps } = {},
) {
  const p = player(state),
    from = p.position;
  const length = steps ?? (destination - from + BOARD.length) % BOARD.length;
  const path = Array.from({ length }, (_, i) => (from + i + 1) % BOARD.length);
  if (salary && path.includes(0)) {
    p.cash += SALARY;
    log(state, `${p.name}, 출발지를 지나 월급 ${SALARY}만을 받았어요!`);
  }
  p.position = destination;
  // A turn can contain a dice walk followed by a card flight. Preserve both segments.
  const previous =
    state.motion?.id === state.revision ? state.motion.segments : [];
  state.motion = {
    id: state.revision,
    playerId: p.id,
    segments: [
      ...previous,
      { from, path: teleport ? [destination] : path, teleport },
    ],
  };
}
function island(state) {
  move(state, 8, { salary: false, teleport: true });
  player(state).jail = 3;
  state.extraTurn = false;
  state.doubles = 0;
  state.phase = "end";
  log(state, `${player(state).name}, 무인도에서 쉬어요. 더블이 나오면 탈출!`);
}
function land(state, rng, fromCard = false) {
  const p = player(state),
    tile = BOARD[p.position],
    lot = state.properties[p.position];
  state.phase = "end";
  if (tile.type === "city") {
    if (!lot.owner || lot.owner === p.id) {
      state.phase = "property";
      log(
        state,
        `${tile.name}에 도착했어요. ${lot.owner ? "건물을 지을 수 있어요!" : "새로운 땅의 주인이 되어볼까요?"}`,
      );
    } else
      charge(
        state,
        rentAt(state, p.position),
        lot.owner,
        `${tile.name} 통행료`,
      );
  } else if (tile.type === "island") {
    p.jail = 3;
    state.extraTurn = false;
    state.doubles = 0;
    log(state, `${p.name}, 무인도 도착! 다음 차례부터 탈출을 시도해요.`);
  } else if (tile.type === "fundPay") charge(state, 5, "fund", "기부금");
  else if (tile.type === "fundGet") {
    const amount = state.fund;
    p.cash += amount;
    state.fund = 0;
    log(state, `${p.name}, 복지기금 ${amount}만을 받았어요!`);
  } else if (tile.type === "travel") {
    state.extraTurn = false;
    log(state, "우주여행 준비 완료! 다음 차례에 원하는 칸으로 떠나요.");
  } else if (tile.type === "card" && !fromCard) {
    const card = CARDS[rng(CARDS.length)];
    state.card = card;
    log(state, `황금열쇠 · ${card.title}`);
    if (card.cash > 0) p.cash += card.cash;
    if (card.cash < 0) charge(state, -card.cash, "bank", card.title);
    if (card.fund) charge(state, card.fund, "fund", "기부금");
    if (card.repair)
      charge(
        state,
        owned(state, p.id).reduce(
          (sum, lot) => sum + lot.level * card.repair,
          0,
        ),
        "bank",
        "수리비",
      );
    if (card.escape) p.escape = true;
    if (card.island) island(state);
    if (card.move !== undefined) {
      move(state, card.move, { teleport: true });
      land(state, rng, true);
    }
  }
}
function bankrupt(state, uid, now) {
  const p = state.players.find((p) => p.id === uid);
  const to = state.current === state.players.indexOf(p) ? state.debt?.to : null;
  const recipient = state.players.find((p) => p.id === to && !p.out);
  if (recipient) recipient.cash += p.cash;
  else if (to === "fund") state.fund += p.cash;
  for (const lot of state.properties)
    if (lot.owner === uid) {
      lot.owner = recipient?.id ?? null;
      if (!recipient) lot.level = 0;
    }
  p.cash = 0;
  p.out = true;
  log(state, `${p.name}의 여행이 끝났어요. 친구들의 여행을 응원해요!`);
  if (state.players.filter((p) => !p.out).length <= 1)
    finish(state, "survivor");
  else if (player(state).id === uid) {
    state.debt = null;
    state.extraTurn = false;
    turnEnd(state, now);
  }
}
export function applyAction(
  previous,
  uid,
  action,
  rng = (n) => Math.floor(Math.random() * n),
  now = Date.now(),
) {
  check(previous.status === "playing", "이미 끝난 여행이에요.");
  check(action && typeof action.type === "string", "올바른 행동이 아니에요.");
  const state = copy(previous);
  state.revision++;
  const member = state.players.find((p) => p.id === uid);
  check(member && !member.out, "참가 중인 여행가만 선택할 수 있어요.");
  if (state.endsAt && now >= state.endsAt) {
    finish(state, "time");
    return state;
  }
  if (action.type === "SURRENDER") {
    bankrupt(state, uid, now);
    return state;
  }
  const p = player(state);
  check(p.id === uid, "내 차례를 기다려 주세요.");
  const tile = BOARD[p.position],
    lot = state.properties[p.position];
  switch (action.type) {
    case "ROLL": {
      check(state.phase === "roll", "지금은 주사위를 굴릴 수 없어요.");
      state.card = null;
      state.dice = [rng(6) + 1, rng(6) + 1];
      const isDouble = state.dice[0] === state.dice[1];
      if (p.jail) {
        if (p.escape) {
          p.escape = false;
          p.jail = 0;
          log(state, "탈출권을 사용했어요!");
        } else if (isDouble) {
          p.jail = 0;
          log(state, "더블! 무인도를 탈출했어요!");
        } else {
          p.jail--;
          state.phase = "end";
          state.extraTurn = false;
          log(
            state,
            p.jail
              ? `무인도에서 휴식 중이에요. ${p.jail}번 더 시도해요.`
              : "무인도 휴가 끝! 다음 차례부터 이동해요.",
          );
          break;
        }
        state.extraTurn = false;
        state.doubles = 0;
      } else {
        state.doubles = isDouble ? state.doubles + 1 : 0;
        state.extraTurn = isDouble;
      }
      if (state.doubles >= 3) {
        island(state);
        break;
      }
      const steps = state.dice[0] + state.dice[1];
      move(state, (p.position + steps) % BOARD.length, { steps });
      land(state, rng);
      break;
    }
    case "BUY":
      check(
        state.phase === "property" && tile.type === "city" && !lot.owner,
        "이 땅은 지금 살 수 없어요.",
      );
      check(p.cash >= tile.price, "땅을 살 돈이 부족해요.");
      p.cash -= tile.price;
      lot.owner = uid;
      log(state, `${p.name}, ${tile.name}의 새 주인이 되었어요!`);
      break;
    case "BUILD":
      check(
        state.phase === "property" &&
          tile.type === "city" &&
          lot.owner === uid &&
          lot.level < 3,
        "지금은 건물을 지을 수 없어요.",
      );
      check(p.cash >= tile.build, "건물을 지을 돈이 부족해요.");
      p.cash -= tile.build;
      lot.level++;
      log(state, `${tile.name}에 ${BUILD_NAMES[lot.level]} 완성!`);
      break;
    case "SELL": {
      check(
        ["property", "debt", "end", "roll", "travel"].includes(state.phase),
        "지금은 팔 수 없어요.",
      );
      const index = action.index;
      check(
        Number.isInteger(index) &&
          BOARD[index]?.type === "city" &&
          state.properties[index].owner === uid,
        "내 땅을 골라 주세요.",
      );
      const amount = resale(state.properties[index], index);
      state.properties[index] = { owner: null, level: 0 };
      p.cash += amount;
      log(state, `${BOARD[index].name}과 건물을 ${amount}만에 팔았어요.`);
      settle(state);
      break;
    }
    case "TRAVEL":
      check(
        state.phase === "travel" &&
          Number.isInteger(action.index) &&
          action.index >= 0 &&
          action.index < BOARD.length &&
          action.index !== p.position,
        "여행할 다른 칸을 골라 주세요.",
      );
      state.card = null;
      state.dice = null;
      state.extraTurn = false;
      move(state, action.index, { teleport: true });
      land(state, rng);
      break;
    case "END":
      check(
        state.phase === "property" || state.phase === "end",
        "먼저 이번 선택을 마쳐 주세요.",
      );
      turnEnd(state, now);
      break;
    case "BANKRUPT":
      check(
        state.phase === "debt" &&
          p.cash +
            owned(state, uid).reduce(
              (sum, lot) => sum + resale(lot, lot.index),
              0,
            ) <
            state.debt.amount,
        "땅을 팔면 비용을 낼 수 있어요.",
      );
      bankrupt(state, uid, now);
      break;
    default:
      throw new Error("지원하지 않는 행동이에요.");
  }
  return state;
}
export function botAction(state, { timeout = false } = {}) {
  const p = player(state),
    tile = BOARD[p.position],
    lot = state.properties[p.position];
  if (state.phase === "roll") return { type: "ROLL" };
  if (state.phase === "travel") {
    const candidate = BOARD.find(
      (t) =>
        t.type === "city" &&
        !state.properties[t.index].owner &&
        t.price < p.cash / 2,
    );
    return { type: "TRAVEL", index: timeout ? 0 : (candidate?.index ?? 0) };
  }
  if (state.phase === "debt") {
    const assets = owned(state, p.id).sort(
      (a, b) => resale(a, a.index) - resale(b, b.index),
    );
    if (
      p.cash +
        assets.reduce((sum, asset) => sum + resale(asset, asset.index), 0) <
      state.debt.amount
    )
      return { type: "BANKRUPT" };
    return { type: "SELL", index: assets[0].index };
  }
  if (state.phase === "property" && !timeout) {
    if (!lot.owner && p.cash >= tile.price + 15) return { type: "BUY" };
    if (lot.owner === p.id && lot.level < 3 && p.cash >= tile.build + 30)
      return { type: "BUILD" };
  }
  return { type: "END" };
}
export function timeoutGame(previous, rng, now = Date.now()) {
  if (previous.status !== "playing") return previous;
  if (previous.endsAt && now >= previous.endsAt) {
    const state = copy(previous);
    state.revision++;
    finish(state, "time");
    return state;
  }
  if (now < previous.deadline) return previous;
  let state = previous;
  const uid = player(state).id,
    turn = state.turn;
  // Complete only this turn, including debt disposal, without waiting for a disconnected browser.
  for (
    let i = 0;
    i < 40 && state.status === "playing" && state.turn === turn;
    i++
  ) {
    state = applyAction(
      state,
      uid,
      botAction(state, { timeout: true }),
      rng,
      now,
    );
    if (state.phase === "roll" && state.extraTurn === false) break;
  }
  return state;
}
