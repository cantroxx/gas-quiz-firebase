(function(global) {
  'use strict';

  const DIRECTION_DEFS = {
    left: { label: '왼쪽', frames: [[12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2]], idle: [2, 0] },
    up: { label: '위쪽', frames: [[6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2]], idle: [1, 0] },
    right: { label: '오른쪽', frames: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2]], idle: [0, 0] },
    down: { label: '아래쪽', frames: [[18, 2], [19, 2], [20, 2], [21, 2], [22, 2], [23, 2]], idle: [3, 0] }
  };

  function cloneAvatar(avatar) {
    return {
      avatarId: avatar.avatarId || 'default',
      parts: Object.assign({}, avatar.parts || {}),
      x: avatar.x,
      y: avatar.y,
      dir: avatar.dir || 'down',
      frame: avatar.frame || 0
    };
  }

  function cloneParts(parts) {
    return Object.assign({}, parts || {});
  }

  function getDirection(dir) {
    return DIRECTION_DEFS[dir] || DIRECTION_DEFS.down;
  }

  function getFrame(avatar, isWalking) {
    const direction = getDirection(avatar.dir);
    if (!isWalking) return direction.idle;
    return direction.frames[avatar.frame % direction.frames.length];
  }

  function directionLabel(dir) {
    return getDirection(dir).label;
  }

  global.DJ48RoomAvatar = {
    DIRECTION_DEFS,
    cloneAvatar,
    cloneParts,
    directionLabel,
    getFrame
  };
})(window);
