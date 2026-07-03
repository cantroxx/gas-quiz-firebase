(function(global) {
  'use strict';

  function createRoomController(deps) {
    const session = deps.session;
    const renderer = deps.renderer;
    const elements = deps.elements;
    const timers = deps.timers || global;
    const stepDelayMs = deps.stepDelayMs || 135;
    const settleDelayMs = deps.settleDelayMs || 120;
    let moving = false;

    function render(isWalking) {
      renderer.render(session.snapshot(Boolean(isWalking)));
    }

    function move(dx, dy, dir) {
      if (moving) return;
      moving = true;
      renderer.render(session.move(dx, dy, dir));
      timers.setTimeout(() => {
        moving = false;
        render(false);
      }, settleDelayMs);
    }

    function walkPath(path) {
      if (!path.length) return;
      const step = path[0];
      const rest = path.slice(1);
      move(step.dx, step.dy, step.dir);
      timers.setTimeout(() => walkPath(rest), stepDelayMs);
    }

    function clickCell(cell) {
      const editorSnapshot = session.handleEditorCell(cell);
      if (editorSnapshot) {
        renderer.render(editorSnapshot);
        return;
      }
      if (!session.canWalk(cell.x, cell.y)) return;
      renderer.render(session.setTarget(cell));
      const path = session.findPath(cell);
      walkPath(path);
      timers.setTimeout(() => {
        renderer.render(session.clearTarget());
      }, Math.max(260, path.length * stepDelayMs));
    }

    function reset() {
      renderer.render(session.reset());
      elements.viewport.focus();
    }

    function toggleGrid() {
      renderer.render(session.toggleGrid());
    }

    function selectAvatar(avatarId) {
      renderer.render(session.selectAvatar(avatarId));
    }

    function selectAvatarPart(type, partId) {
      renderer.render(session.selectAvatarPart(type, partId));
    }

    function selectFurniture(furnitureId) {
      renderer.render(session.selectFurniture(furnitureId));
      elements.viewport.focus();
    }

    function selectPlacement(placementId) {
      renderer.render(session.selectPlacement(placementId));
      elements.viewport.focus();
    }

    function deleteSelectedPlacement() {
      renderer.render(session.deleteSelectedPlacement());
      elements.viewport.focus();
    }

    function resetPlacements() {
      renderer.render(session.resetPlacements());
      elements.viewport.focus();
    }

    function start() {
      render(false);
      elements.viewport.focus();
    }

    return {
      clickCell,
      deleteSelectedPlacement,
      move,
      reset,
      resetPlacements,
      selectAvatar,
      selectAvatarPart,
      selectFurniture,
      selectPlacement,
      start,
      toggleGrid
    };
  }

  global.DJ48RoomController = {
    createRoomController
  };
})(window);
