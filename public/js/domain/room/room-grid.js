(function(global) {
  'use strict';

  const DIRECTIONS = [
    { dx: 1, dy: 0, dir: 'right' },
    { dx: -1, dy: 0, dir: 'left' },
    { dx: 0, dy: 1, dir: 'down' },
    { dx: 0, dy: -1, dir: 'up' }
  ];

  function cellKey(x, y) {
    return `${x},${y}`;
  }

  function createBlockedSet(cells) {
    return new Set((cells || []).map(cell => cellKey(cell.x, cell.y)));
  }

  function canWalk(grid, x, y) {
    const blocked = grid.blocked || new Set();
    return x >= 0 && x < grid.cols && y >= 0 && y < grid.rows && !blocked.has(cellKey(x, y));
  }

  function findPath(grid, start, target) {
    if (!canWalk(grid, target.x, target.y)) return [];

    const queue = [{ x: start.x, y: start.y, path: [] }];
    const seen = new Set([cellKey(start.x, start.y)]);

    while (queue.length) {
      const current = queue.shift();
      if (current.x === target.x && current.y === target.y) return current.path;

      DIRECTIONS.forEach(delta => {
        const x = current.x + delta.dx;
        const y = current.y + delta.dy;
        const key = cellKey(x, y);
        if (seen.has(key) || !canWalk(grid, x, y)) return;
        seen.add(key);
        queue.push({ x, y, path: current.path.concat(delta) });
      });
    }

    return [];
  }

  global.DJ48RoomGrid = {
    DIRECTIONS,
    canWalk,
    cellKey,
    createBlockedSet,
    findPath
  };
})(window);
