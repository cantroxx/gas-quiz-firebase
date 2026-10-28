import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { createGame, applyAction, timeoutGame } from "../shared/game.js";

const requireThat = (value, text) => {
  if (!value) throw new Error(text);
};
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export class Rooms {
  constructor({
    now = () => Date.now(),
    rng = randomInt,
    onChange = () => {},
  } = {}) {
    this.rooms = new Map();
    this.now = now;
    this.rng = rng;
    this.onChange = onChange;
  }
  profile(data) {
    requireThat(
      typeof data.name === "string" &&
        data.name.trim().length >= 1 &&
        data.name.trim().length <= 12 &&
        !/[\x00-\x1f\x7f]/.test(data.name),
      "별명은 1~12글자로 적어 주세요.",
    );
    requireThat(
      Number.isInteger(data.character) &&
        data.character >= 0 &&
        data.character <= 3,
      "캐릭터를 골라 주세요.",
    );
    return {
      id: randomUUID(),
      token: randomBytes(32).toString("hex"),
      name: data.name.trim(),
      character: data.character,
      ready: false,
      connected: true,
    };
  }
  create(data) {
    this.cleanup();
    requireThat(
      this.rooms.size < 100,
      "지금은 방이 많아요. 잠시 뒤 다시 만들어 주세요.",
    );
    requireThat(
      [0, 20, 30].includes(data.minutes ?? 0),
      "시간 설정을 확인해 주세요.",
    );
    let code;
    do {
      code = Array.from(
        { length: 6 },
        () => ALPHABET[randomInt(ALPHABET.length)],
      ).join("");
    } while (this.rooms.has(code));
    const seat = this.profile(data);
    const room = {
      code,
      version: 1,
      hostId: seat.id,
      seats: [seat],
      minutes: data.minutes ?? 0,
      game: null,
      createdAt: this.now(),
      updatedAt: this.now(),
      seen: new Map(),
    };
    this.rooms.set(code, room);
    return { code, token: seat.token, playerId: seat.id };
  }
  room(code) {
    const room = this.rooms.get(code);
    requireThat(room, "방을 찾을 수 없어요. 코드를 확인해 주세요.");
    return room;
  }
  join(data) {
    const room = this.room(data.code);
    requireThat(!room.game, "이미 여행을 시작한 방이에요.");
    requireThat(room.seats.length < 4, "방이 가득 찼어요.");
    const seat = this.profile(data);
    if (room.seats.some((s) => s.character === seat.character))
      seat.character = [0, 1, 2, 3].find(
        (c) => !room.seats.some((s) => s.character === c),
      );
    room.seats.push(seat);
    this.changed(room);
    return { code: room.code, token: seat.token, playerId: seat.id };
  }
  auth(code, token) {
    const room = this.room(code),
      seat = room.seats.find((s) => s.token === token);
    requireThat(seat, "참가 정보가 만료되었어요. 다시 입장해 주세요.");
    return { room, seat };
  }
  snapshot(code) {
    const room = this.room(code);
    return {
      code,
      version: room.version,
      hostId: room.hostId,
      minutes: room.minutes,
      seats: room.seats.map(({ id, name, character, ready, connected }) => ({
        id,
        name,
        character,
        ready,
        connected,
      })),
      game: room.game,
      serverNow: this.now(),
    };
  }
  changed(room) {
    room.version++;
    room.updatedAt = this.now();
    this.onChange(room.code);
  }
  connection(code, token, connected) {
    const { room, seat } = this.auth(code, token);
    if (seat.connected === connected) return;
    seat.connected = connected;
    if (!connected && !room.game) {
      seat.ready = false;
      if (seat.id === room.hostId)
        room.hostId = room.seats.find((s) => s.connected)?.id ?? room.hostId;
    }
    this.changed(room);
  }
  command(code, token, message) {
    const { room, seat } = this.auth(code, token);
    requireThat(
      typeof message.id === "string" &&
        message.id.length <= 80 &&
        message.id.length >= 8,
      "요청 번호가 올바르지 않아요.",
    );
    const key = `${seat.id}:${message.id}`;
    if (room.seen.has(key)) return this.snapshot(code);
    requireThat(
      Number.isInteger(message.version) && message.version === room.version,
      "화면이 갱신되었어요. 확인한 뒤 다시 선택해 주세요.",
    );
    const data = message.action;
    requireThat(
      data && typeof data.type === "string",
      "선택 내용을 확인해 주세요.",
    );
    if (!room.game) {
      if (data.type === "READY") {
        requireThat(
          typeof data.ready === "boolean",
          "준비 상태를 확인해 주세요.",
        );
        seat.ready = data.ready;
      } else if (data.type === "START") {
        requireThat(seat.id === room.hostId, "방장만 시작할 수 있어요.");
        requireThat(
          room.seats.length >= 2 &&
            room.seats.every((s) => s.ready && s.connected),
          "친구들이 모두 준비하면 시작할 수 있어요.",
        );
        room.game = createGame(room.seats, {
          minutes: room.minutes,
          now: this.now(),
        });
      } else if (data.type === "REMOVE_DISCONNECTED") {
        requireThat(
          seat.id === room.hostId,
          "방장만 빈 자리를 정리할 수 있어요.",
        );
        const absent = room.seats.find((s) => s.id === data.playerId);
        requireThat(
          absent && !absent.connected,
          "연결이 끊긴 친구의 자리만 정리할 수 있어요.",
        );
        room.seats = room.seats.filter((s) => s.id !== data.playerId);
      } else if (data.type === "LEAVE") {
        room.seats = room.seats.filter((s) => s.id !== seat.id);
        if (!room.seats.length) {
          this.rooms.delete(code);
          this.onChange(code);
          return null;
        }
        if (room.hostId === seat.id) room.hostId = room.seats[0].id;
      } else throw new Error("대기실에서 할 수 없는 행동이에요.");
    } else {
      room.game = applyAction(room.game, seat.id, data, this.rng, this.now());
    }
    room.seen.set(key, true);
    if (room.seen.size > 400) room.seen.delete(room.seen.keys().next().value);
    this.changed(room);
    return this.snapshot(code);
  }
  tick() {
    for (const room of this.rooms.values()) {
      if (!room.game || room.game.status !== "playing") continue;
      const next = timeoutGame(room.game, this.rng, this.now());
      if (next !== room.game) {
        room.game = next;
        this.changed(room);
      }
    }
    this.cleanup();
  }
  cleanup() {
    for (const [code, room] of this.rooms) {
      const expired = !room.game
        ? this.now() - room.updatedAt > 30 * 60000
        : this.now() - room.createdAt > 6 * 3600000;
      if (expired) {
        this.rooms.delete(code);
        this.onChange(code);
      }
    }
  }
}
