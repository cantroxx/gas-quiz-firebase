(function(global) {
  'use strict';

  const KEY_ACTIONS = {
    ArrowLeft: [-1, 0, 'left'],
    a: [-1, 0, 'left'],
    A: [-1, 0, 'left'],
    ArrowRight: [1, 0, 'right'],
    d: [1, 0, 'right'],
    D: [1, 0, 'right'],
    ArrowUp: [0, -1, 'up'],
    w: [0, -1, 'up'],
    W: [0, -1, 'up'],
    ArrowDown: [0, 1, 'down'],
    s: [0, 1, 'down'],
    S: [0, 1, 'down']
  };

  function getKeyboardAction(key) {
    return KEY_ACTIONS[key] || null;
  }

  function getCellFromPointer(event, viewport, tileSize) {
    const rect = viewport.getBoundingClientRect();
    const scaleX = viewport.offsetWidth / rect.width;
    const scaleY = viewport.offsetHeight / rect.height;
    return {
      x: Math.floor(((event.clientX - rect.left) * scaleX) / tileSize),
      y: Math.floor(((event.clientY - rect.top) * scaleY) / tileSize)
    };
  }

  function bindRoomInput(elements, handlers, config) {
    const tileSize = config.render.tileSize;

    function handleKeydown(event) {
      const action = getKeyboardAction(event.key);
      if (!action) return;
      event.preventDefault();
      handlers.move(action[0], action[1], action[2]);
    }

    function handleClick(event) {
      handlers.clickCell(getCellFromPointer(event, elements.viewport, tileSize));
    }

    elements.viewport.addEventListener('keydown', handleKeydown);
    elements.viewport.addEventListener('click', handleClick);
    elements.resetButton.addEventListener('click', handlers.reset);
    elements.guideButton.addEventListener('click', handlers.toggleGrid);

    return function unbindRoomInput() {
      elements.viewport.removeEventListener('keydown', handleKeydown);
      elements.viewport.removeEventListener('click', handleClick);
      elements.resetButton.removeEventListener('click', handlers.reset);
      elements.guideButton.removeEventListener('click', handlers.toggleGrid);
    };
  }

  global.DJ48RoomInput = {
    bindRoomInput,
    getCellFromPointer,
    getKeyboardAction
  };
})(window);
