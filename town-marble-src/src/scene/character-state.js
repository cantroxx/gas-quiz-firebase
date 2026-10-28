import { BOARD } from "../../shared/data.js";

// Tile-local coordinates, independent of camera angle. The rear strip is for buildings.
export function standingSlot(count, slot) {
  const layouts = {
    1: [[0, 0.25]],
    2: [
      [-0.45, 0.3],
      [0.45, 0.3],
    ],
    3: [
      [0, -0.02],
      [-0.45, 0.62],
      [0.45, 0.62],
    ],
    4: [
      [-0.45, -0.02],
      [0.45, -0.02],
      [-0.45, 0.62],
      [0.45, 0.62],
    ],
  };
  const [x, z] = layouts[count]?.[slot] || layouts[1][0];
  return { x, z, scale: count === 1 ? 0.82 : count === 2 ? 0.58 : 0.47 };
}

export function characterReactions(before, after) {
  if (
    !before ||
    !after ||
    before.startedAt !== after.startedAt ||
    before.revision === after.revision
  )
    return [];
  const reactions = new Map();
  const put = (id, kind) => reactions.set(id, { playerId: id, kind });
  for (const player of after.players) {
    const old = before.players.find((p) => p.id === player.id);
    if (!old || player.out) continue;
    if (old.position !== player.position) {
      const owner = after.properties[player.position]?.owner;
      put(
        player.id,
        BOARD[player.position].type === "island"
          ? "sad"
          : owner && owner !== player.id
            ? "surprise"
            : "arrive",
      );
    }
    if (player.cash > old.cash) put(player.id, "happy");
  }
  if (after.debt && !before.debt) put(after.players[after.current].id, "cry");
  if (after.payment && after.payment.id !== before.payment?.id) {
    const payment = after.payment;
    const cash = before.players.find((p) => p.id === payment.from)?.cash || 1;
    put(payment.from, payment.amount >= cash * 0.25 ? "cry" : "sad");
    if (after.players.some((p) => p.id === payment.to && !p.out))
      put(payment.to, "happy");
  }
  after.properties.forEach((lot, index) => {
    if (
      lot.owner &&
      (lot.owner !== before.properties[index].owner ||
        lot.level > before.properties[index].level)
    )
      put(lot.owner, "happy");
  });
  return [...reactions.values()];
}
