'use strict';
// Local trial ranking. No Firebase writes, student identifiers, or coin rewards.
function createRanking() {
  const rows = new Map(), recorded = new Set();
  return {
    record(matchId, result) {
      if (!result || result.practice || recorded.has(matchId)) return false;
      recorded.add(matchId);
      for (const player of result.players) {
        const row = rows.get(player.id) || { id: player.id, name: player.name, total: 0, games: 0, wins: 0, draws: 0, hits: 0, misses: 0 };
        const won = result.winners.includes(player.id), draw = result.winners.length > 1;
        row.name = player.name; row.games++; row.hits += player.hits; row.misses += player.misses;
        if (won) { row.total += draw ? 1 : 3; row[draw ? 'draws' : 'wins']++; }
        rows.set(player.id, row);
      }
      return true;
    },
    list() {
      const list = [...rows.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
      return list.slice(0, 50).map(row => ({ ...row, rank: list.findIndex(other => other.total === row.total) + 1 }));
    }
  };
}
module.exports = { createRanking };
