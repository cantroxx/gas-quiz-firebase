(function(global) {
  'use strict';

  function createRoomSession(config, options) {
    const gridApi = global.DJ48RoomGrid;
    const avatarApi = global.DJ48RoomAvatar;
    const layoutApi = global.DJ48RoomLayout;
    const repository = options && options.repository;
    const baseBlocked = gridApi.createBlockedSet(config.blockedCells);
    const grid = { cols: config.grid.cols, rows: config.grid.rows, baseBlocked, blocked: new Set(baseBlocked) };
    const initialAvatar = avatarApi.cloneAvatar(config.initialAvatar);
    const avatarCatalog = config.avatarCatalog || [];
    const avatarPartCatalog = config.avatarPartCatalog || {};
    const furnitureCatalog = config.furnitureCatalog || [];
    const initialPlacements = (config.initialPlacements || []).map(layoutApi.clonePlacement);
    const state = {
      avatar: avatarApi.cloneAvatar(initialAvatar),
      editor: {
        selectedFurnitureId: null,
        selectedPlacementId: null,
        message: '가구를 선택하거나 바닥을 클릭해 이동하세요.'
      },
      moving: false,
      placements: initialPlacements.map(layoutApi.clonePlacement),
      showGrid: false,
      target: null
    };

    restore();
    rebuildBlocked();

    function restore() {
      if (!repository) return;
      const saved = repository.load();
      if (!saved) return;
      if (saved.avatar) {
        state.avatar = avatarApi.cloneAvatar(Object.assign({}, initialAvatar, saved.avatar));
        state.avatar.parts = Object.assign({}, initialAvatar.parts || {}, saved.avatar.parts || {});
      }
      if (Array.isArray(saved.placements)) {
        state.placements = saved.placements.map(layoutApi.clonePlacement);
      }
    }

    function persist() {
      if (!repository) return false;
      return repository.save({
        avatar: {
          avatarId: state.avatar.avatarId,
          parts: avatarApi.cloneParts(state.avatar.parts),
          x: state.avatar.x,
          y: state.avatar.y,
          dir: state.avatar.dir
        },
        placements: state.placements.map(layoutApi.clonePlacement)
      });
    }

    function rebuildBlocked() {
      const placementBlocked = layoutApi.createPlacementBlockedSet(gridApi, furnitureCatalog, state.placements);
      grid.blocked = new Set(baseBlocked);
      placementBlocked.forEach(key => grid.blocked.add(key));
    }

    function canWalk(x, y) {
      return gridApi.canWalk(grid, x, y);
    }

    function reset() {
      state.avatar = avatarApi.cloneAvatar(initialAvatar);
      state.editor.selectedFurnitureId = null;
      state.editor.selectedPlacementId = null;
      state.editor.message = '초기 상태로 되돌렸습니다.';
      state.moving = false;
      state.placements = initialPlacements.map(layoutApi.clonePlacement);
      state.target = null;
      rebuildBlocked();
      persist();
      return snapshot(false);
    }

    function clearSavedState() {
      if (repository) repository.clear();
      state.editor.message = '저장된 상태를 지웠습니다.';
      return reset();
    }

    function getAvatarAsset(avatarId) {
      return avatarCatalog.find(entry => entry.avatarId === avatarId) || avatarCatalog[0] || null;
    }

    function getAvatarPart(type, partId) {
      const list = avatarPartCatalog[type] || [];
      return list.find(entry => entry.partId === partId) || null;
    }

    function selectAvatar(avatarId) {
      if (!getAvatarAsset(avatarId)) return snapshot(false);
      state.avatar.avatarId = avatarId;
      state.avatar.frame = 0;
      persist();
      return snapshot(false);
    }

    function selectAvatarPart(type, partId) {
      const list = avatarPartCatalog[type] || [];
      if (partId !== 'none' && !list.find(entry => entry.partId === partId)) return snapshot(false);
      state.avatar.avatarId = 'custom';
      state.avatar.parts[type] = partId;
      state.avatar.frame = 0;
      persist();
      return snapshot(false);
    }

    function getAvatarLayers() {
      const order = config.avatar.partOrder || ['body', 'eyes', 'outfit', 'hair', 'accessory'];
      if (state.avatar.avatarId !== 'custom') return [];
      return order.map(type => {
        const partId = state.avatar.parts[type];
        if (!partId || partId === 'none') return null;
        const part = getAvatarPart(type, partId);
        if (!part) return null;
        return Object.assign({ type }, part);
      }).filter(Boolean);
    }

    function move(dx, dy, dir) {
      const next = { x: state.avatar.x + dx, y: state.avatar.y + dy };
      state.avatar.dir = dir;
      if (!canWalk(next.x, next.y)) return snapshot(false);
      state.avatar.x = next.x;
      state.avatar.y = next.y;
      state.avatar.frame += 1;
      persist();
      return snapshot(true);
    }

    function findPath(target) {
      return gridApi.findPath(grid, state.avatar, target);
    }

    function setTarget(target) {
      state.target = target;
      return snapshot(false);
    }

    function clearTarget() {
      state.target = null;
      return snapshot(false);
    }

    function toggleGrid() {
      state.showGrid = !state.showGrid;
      return snapshot(false);
    }

    function selectFurniture(furnitureId) {
      if (furnitureId && !layoutApi.getFurniture(furnitureCatalog, furnitureId)) return snapshot(false);
      state.editor.selectedFurnitureId = furnitureId;
      state.editor.selectedPlacementId = null;
      state.editor.message = furnitureId ? '바닥을 클릭하면 선택한 가구가 배치됩니다.' : '이동 모드로 돌아왔습니다.';
      return snapshot(false);
    }

    function selectPlacement(placementId) {
      const placement = state.placements.find(item => item.placementId === placementId);
      if (!placement) return snapshot(false);
      state.editor.selectedFurnitureId = null;
      state.editor.selectedPlacementId = placementId;
      state.editor.message = '다른 바닥 칸을 클릭하면 선택한 가구가 이동합니다.';
      return snapshot(false);
    }

    function addPlacement(furnitureId, cell) {
      const placement = {
        placementId: layoutApi.createPlacementId(),
        furnitureId,
        x: cell.x,
        y: cell.y
      };
      if (!layoutApi.validatePlacement({ grid, gridApi, catalog: furnitureCatalog, placement, placements: state.placements })) {
        state.editor.message = '여기에는 배치할 수 없습니다.';
        return snapshot(false);
      }
      state.placements.push(placement);
      state.editor.selectedPlacementId = placement.placementId;
      state.editor.message = '가구를 배치했습니다.';
      rebuildBlocked();
      persist();
      return snapshot(false);
    }

    function movePlacement(placementId, cell) {
      const placement = state.placements.find(item => item.placementId === placementId);
      if (!placement) return snapshot(false);
      const next = Object.assign({}, placement, { x: cell.x, y: cell.y });
      if (!layoutApi.validatePlacement({ grid, gridApi, catalog: furnitureCatalog, placement: next, placements: state.placements, ignorePlacementId: placementId })) {
        state.editor.message = '선택한 가구를 여기로 옮길 수 없습니다.';
        return snapshot(false);
      }
      placement.x = cell.x;
      placement.y = cell.y;
      state.editor.message = '가구 위치를 옮겼습니다.';
      rebuildBlocked();
      persist();
      return snapshot(false);
    }

    function deleteSelectedPlacement() {
      const placementId = state.editor.selectedPlacementId;
      if (!placementId) {
        state.editor.message = '삭제할 가구를 먼저 선택하세요.';
        return snapshot(false);
      }
      state.placements = state.placements.filter(item => item.placementId !== placementId);
      state.editor.selectedPlacementId = null;
      state.editor.message = '선택한 가구를 삭제했습니다.';
      rebuildBlocked();
      persist();
      return snapshot(false);
    }

    function resetPlacements() {
      state.placements = initialPlacements.map(layoutApi.clonePlacement);
      state.editor.selectedFurnitureId = null;
      state.editor.selectedPlacementId = null;
      state.editor.message = '가구 배치를 초기 상태로 되돌렸습니다.';
      rebuildBlocked();
      persist();
      return snapshot(false);
    }

    function handleEditorCell(cell) {
      if (state.editor.selectedFurnitureId) return addPlacement(state.editor.selectedFurnitureId, cell);
      if (state.editor.selectedPlacementId) return movePlacement(state.editor.selectedPlacementId, cell);
      const placement = layoutApi.findPlacementAt(furnitureCatalog, state.placements, cell);
      if (placement) return selectPlacement(placement.placementId);
      return null;
    }

    function getPlacementViews() {
      return state.placements.map(placement => {
        return {
          furniture: layoutApi.getFurniture(furnitureCatalog, placement.furnitureId),
          placement: layoutApi.clonePlacement(placement),
          selected: placement.placementId === state.editor.selectedPlacementId
        };
      }).filter(item => item.furniture);
    }

    function snapshot(isWalking) {
      return {
        avatar: avatarApi.cloneAvatar(state.avatar),
        avatarAsset: getAvatarAsset(state.avatar.avatarId),
        avatarCatalog: avatarCatalog.slice(),
        avatarFrame: avatarApi.getFrame(state.avatar, Boolean(isWalking)),
        avatarLayers: getAvatarLayers(),
        avatarPartCatalog,
        directionLabel: avatarApi.directionLabel(state.avatar.dir),
        editor: Object.assign({}, state.editor),
        furnitureCatalog: furnitureCatalog.slice(),
        isWalking: Boolean(isWalking),
        placements: getPlacementViews(),
        showGrid: state.showGrid,
        target: state.target ? { x: state.target.x, y: state.target.y } : null
      };
    }

    return {
      canWalk,
      clearSavedState,
      clearTarget,
      deleteSelectedPlacement,
      findPath,
      grid,
      handleEditorCell,
      move,
      reset,
      resetPlacements,
      selectAvatar,
      selectAvatarPart,
      selectFurniture,
      selectPlacement,
      setTarget,
      snapshot,
      toggleGrid
    };
  }

  global.DJ48RoomUsecases = {
    createRoomSession
  };
})(window);
