import { SHELL_ASSETS } from './asset-manifest.js';

const DEFAULT_GRID = Object.freeze({
  width: 5,
  depth: 5
});

export const ROOM_SHELL_PRESETS = {
  interiors_room: {
    id: 'interiors_room',
    name: '아늑한 방',
    tileWidth: 128,
    tileHeight: 128,
    moduleCells: 2,
    wallHeight: 96,
    wallAlignment: { rise: 42, leftX: -32, rightX: 31 },
    grid: DEFAULT_GRID,
    assets: SHELL_ASSETS.woodbright,
    defaultPlaced: [
      { id: 'desk-start', itemId: 'desk1', anchor: 'floor', x: 2, y: 1, direction: 'a' },
      { id: 'chair-start', itemId: 'chair2', anchor: 'floor', x: 2, y: 2, direction: 'c' },
      { id: 'sofa-start', itemId: 'sofa3', anchor: 'floor', x: 0, y: 3, direction: 'b' },
      { id: 'plant-start', itemId: 'plant1', anchor: 'floor', x: 4, y: 2, direction: 'a' },
      { id: 'window-start', itemId: 'window7', anchor: 'wall', wall: 'right', segment: 2, height: 1, direction: 'right' },
      { id: 'poster-start', itemId: 'poster1', anchor: 'wall', wall: 'left', segment: 1, height: 1, direction: 'left' }
    ]
  },
  interiors_office: {
    id: 'interiors_office',
    name: '공부방',
    tileWidth: 128,
    tileHeight: 128,
    moduleCells: 2,
    wallHeight: 96,
    wallAlignment: { rise: 42, leftX: -32, rightX: 31 },
    grid: DEFAULT_GRID,
    assets: SHELL_ASSETS.concrete,
    defaultPlaced: [
      { id: 'office-desk', itemId: 'desk1', anchor: 'floor', x: 2, y: 2, direction: 'b' },
      { id: 'office-chair', itemId: 'chair2', anchor: 'floor', x: 1, y: 2, direction: 'a' },
      { id: 'office-board', itemId: 'boardEmpty', anchor: 'wall', wall: 'right', segment: 2, height: 1, direction: 'right' },
      { id: 'office-plant', itemId: 'plant1', anchor: 'floor', x: 4, y: 3, direction: 'a' }
    ]
  },
  interiors_bath: {
    id: 'interiors_bath',
    name: '타일 방',
    tileWidth: 128,
    tileHeight: 128,
    moduleCells: 2,
    wallHeight: 96,
    wallAlignment: { rise: 42, leftX: -32, rightX: 31 },
    grid: DEFAULT_GRID,
    assets: SHELL_ASSETS.bath,
    defaultPlaced: [
      { id: 'bath-window', itemId: 'window7', anchor: 'wall', wall: 'left', segment: 2, height: 1, direction: 'left' },
      { id: 'bath-plant', itemId: 'plant1', anchor: 'floor', x: 3, y: 3, direction: 'a' }
    ]
  },
  interiors_japanese: {
    id: 'interiors_japanese',
    name: '일본풍 방',
    tileWidth: 128,
    tileHeight: 128,
    moduleCells: 2,
    wallHeight: 96,
    wallAlignment: { rise: 51, leftX: -42, rightX: 34 },
    grid: DEFAULT_GRID,
    assets: SHELL_ASSETS.japanese,
    defaultPlaced: [
      { id: 'japanese-bed', itemId: 'bed4', anchor: 'floor', x: 2, y: 2, direction: 'd' },
      { id: 'japanese-window-left', itemId: 'window7', anchor: 'wall', wall: 'left', segment: 2, height: 1, direction: 'left' },
      { id: 'japanese-window-right', itemId: 'window7', anchor: 'wall', wall: 'right', segment: 2, height: 1, direction: 'right' }
    ],
    shellDecor: [
      { id: 'japanese-left-window-shell', src: SHELL_ASSETS.japanese.leftWindow, wall: 'left', segment: 3 },
      { id: 'japanese-right-window-shell', src: SHELL_ASSETS.japanese.rightWindow, wall: 'right', segment: 3 }
    ]
  }
};

export function getShellPreset(presetId) {
  return ROOM_SHELL_PRESETS[presetId] || ROOM_SHELL_PRESETS.interiors_room;
}

export function cloneDefaultPlaced(preset) {
  return preset.defaultPlaced.map(item => ({ ...item }));
}
