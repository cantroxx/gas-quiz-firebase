(function(global) {
  'use strict';

  function clonePlacement(placement) {
    return {
      placementId: placement.placementId,
      furnitureId: placement.furnitureId,
      x: placement.x,
      y: placement.y
    };
  }

  function createPlacementId() {
    return `placed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function getFurniture(catalog, furnitureId) {
    return (catalog || []).find(item => item.furnitureId === furnitureId) || null;
  }

  function getBlockedCellsForPlacement(catalog, placement) {
    const furniture = getFurniture(catalog, placement.furnitureId);
    if (!furniture || furniture.blocks === false) return [];
    const width = furniture.blockWidth || furniture.tileWidth || 1;
    const height = furniture.blockHeight || 1;
    const cells = [];
    for (let dx = 0; dx < width; dx += 1) {
      for (let dy = 0; dy < height; dy += 1) {
        cells.push({ x: placement.x + dx, y: placement.y - dy });
      }
    }
    return cells;
  }

  function createPlacementBlockedSet(gridApi, catalog, placements) {
    const blocked = new Set();
    (placements || []).forEach(placement => {
      getBlockedCellsForPlacement(catalog, placement).forEach(cell => {
        blocked.add(gridApi.cellKey(cell.x, cell.y));
      });
    });
    return blocked;
  }

  function isCellInsidePlacement(catalog, placement, cell) {
    const furniture = getFurniture(catalog, placement.furnitureId);
    if (!furniture) return false;
    const width = furniture.tileWidth || 1;
    const height = furniture.tileHeight || 1;
    return cell.x >= placement.x &&
      cell.x < placement.x + width &&
      cell.y <= placement.y &&
      cell.y > placement.y - height;
  }

  function findPlacementAt(catalog, placements, cell) {
    return (placements || []).slice().reverse().find(placement => {
      return isCellInsidePlacement(catalog, placement, cell);
    }) || null;
  }

  function validatePlacement(params) {
    const grid = params.grid;
    const gridApi = params.gridApi;
    const catalog = params.catalog;
    const placement = params.placement;
    const placements = params.placements || [];
    const ignorePlacementId = params.ignorePlacementId || null;
    const furniture = getFurniture(catalog, placement.furnitureId);
    if (!furniture) return false;

    const width = furniture.tileWidth || 1;
    const height = furniture.tileHeight || 1;
    if (placement.x < 0 || placement.x + width > grid.cols) return false;
    if (placement.y < 0 || placement.y - height + 1 < 0 || placement.y >= grid.rows) return false;

    const baseBlocked = grid.baseBlocked || new Set();
    const otherPlacements = placements.filter(item => item.placementId !== ignorePlacementId);
    const placementBlocked = createPlacementBlockedSet(gridApi, catalog, otherPlacements);
    const cells = getBlockedCellsForPlacement(catalog, placement);
    return cells.every(cell => {
      const key = gridApi.cellKey(cell.x, cell.y);
      return !baseBlocked.has(key) && !placementBlocked.has(key);
    });
  }

  global.DJ48RoomLayout = {
    clonePlacement,
    createPlacementBlockedSet,
    createPlacementId,
    findPlacementAt,
    getBlockedCellsForPlacement,
    getFurniture,
    validatePlacement
  };
})(window);
