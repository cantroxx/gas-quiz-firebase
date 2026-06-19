const INTERIORS_ROOT = '/images/room-assets/interiors';

export const SHELL_ASSETS = {
  woodbright: {
    floor: `${INTERIORS_ROOT}/floor_wall_tiles_128/floor_128_woodbright.png`,
    leftWall: `${INTERIORS_ROOT}/floor_wall_tiles_128/wall_l_128_woodbright.png`,
    rightWall: `${INTERIORS_ROOT}/floor_wall_tiles_128/wall_r_128_woodbright.png`
  },
  concrete: {
    floor: `${INTERIORS_ROOT}/floor_wall_tiles_128/floor_128_concrete.png`,
    leftWall: `${INTERIORS_ROOT}/floor_wall_tiles_128/wall_l_128_concrete.png`,
    rightWall: `${INTERIORS_ROOT}/floor_wall_tiles_128/wall_r_128_concrete.png`
  },
  bath: {
    floor: `${INTERIORS_ROOT}/floor_wall_tiles_128/floor_bath_1_128.png`,
    leftWall: `${INTERIORS_ROOT}/floor_wall_tiles_128/wall_bath_1_128.png`,
    rightWall: `${INTERIORS_ROOT}/floor_wall_tiles_128/wall_bath_2_128.png`
  },
  japanese: {
    floor: `${INTERIORS_ROOT}/japanese_room/floor_japanese_128.png`,
    leftWall: `${INTERIORS_ROOT}/japanese_room/wall_l_japanese_128.png`,
    rightWall: `${INTERIORS_ROOT}/japanese_room/wall_r_japanese_128.png`,
    leftTop: `${INTERIORS_ROOT}/japanese_room/wall_top_l_japanese_128.png`,
    rightTop: `${INTERIORS_ROOT}/japanese_room/wall_top_r_japanese_128.png`,
    leftWindow: `${INTERIORS_ROOT}/japanese_room/wall_window_l_japanese_128.png`,
    rightWindow: `${INTERIORS_ROOT}/japanese_room/wall_window_r_japanese_128.png`
  }
};

export const ROOM_ITEMS = {
  sofa3: {
    id: 'sofa3',
    name: '소파',
    category: 'floor',
    type: 'floor.object',
    anchor: 'floor',
    size: 128,
    footprint: { width: 2, depth: 1 },
    directions: ['a', 'b', 'c', 'd'],
    sprites: {
      a: `${INTERIORS_ROOT}/sofa/sofa_3_a_tile.png`,
      b: `${INTERIORS_ROOT}/sofa/sofa_3_b_tile.png`,
      c: `${INTERIORS_ROOT}/sofa/sofa_3_c_tile.png`,
      d: `${INTERIORS_ROOT}/sofa/sofa_3_d_tile.png`
    }
  },
  chair2: {
    id: 'chair2',
    name: '의자',
    category: 'floor',
    type: 'seat.object',
    anchor: 'floor',
    size: 64,
    footprint: { width: 1, depth: 1 },
    directions: ['a', 'b', 'c', 'd'],
    sprites: {
      a: `${INTERIORS_ROOT}/chairs/chair_2_a_tile.png`,
      b: `${INTERIORS_ROOT}/chairs/chair_2_b_tile.png`,
      c: `${INTERIORS_ROOT}/chairs/chair_2_c_tile.png`,
      d: `${INTERIORS_ROOT}/chairs/chair_2_d_tile.png`
    }
  },
  desk1: {
    id: 'desk1',
    name: '책상',
    category: 'floor',
    type: 'floor.object',
    anchor: 'floor',
    size: 128,
    footprint: { width: 2, depth: 1 },
    directions: ['a', 'b'],
    sprites: {
      a: `${INTERIORS_ROOT}/desks/desk_1_tile.png`,
      b: `${INTERIORS_ROOT}/desks/desk_1_b_tile.png`
    }
  },
  bed4: {
    id: 'bed4',
    name: '침대',
    category: 'floor',
    type: 'floor.object',
    anchor: 'floor',
    size: 128,
    footprint: { width: 2, depth: 2 },
    directions: ['a', 'b', 'c', 'd'],
    sprites: {
      a: `${INTERIORS_ROOT}/bedroom/bed_a_4.png`,
      b: `${INTERIORS_ROOT}/bedroom/bed_b_4.png`,
      c: `${INTERIORS_ROOT}/bedroom/bed_c_4.png`,
      d: `${INTERIORS_ROOT}/bedroom/bed_d_4.png`
    }
  },
  plant1: {
    id: 'plant1',
    name: '화분',
    category: 'floor',
    type: 'floor.object',
    anchor: 'floor',
    size: 32,
    footprint: { width: 1, depth: 1 },
    directions: ['a'],
    sprites: {
      a: `${INTERIORS_ROOT}/plants/plant_1.png`
    }
  },
  window7: {
    id: 'window7',
    name: '창문',
    category: 'wall',
    type: 'wall.object',
    anchor: 'wall',
    size: 128,
    directions: ['left', 'right'],
    sprites: {
      left: `${INTERIORS_ROOT}/windows/window_7_a_tile.png`,
      right: `${INTERIORS_ROOT}/windows/window_7_b_tile.png`
    }
  },
  poster1: {
    id: 'poster1',
    name: '포스터',
    category: 'wall',
    type: 'wall.object',
    anchor: 'wall',
    size: 64,
    directions: ['left', 'right'],
    sprites: {
      left: `${INTERIORS_ROOT}/poster/poster_1.png`,
      right: `${INTERIORS_ROOT}/poster/poster_1.png`
    }
  },
  boardEmpty: {
    id: 'boardEmpty',
    name: '칠판',
    category: 'wall',
    type: 'wall.object',
    anchor: 'wall',
    size: 128,
    directions: ['left', 'right'],
    sprites: {
      left: `${INTERIORS_ROOT}/office/board_empty.png`,
      right: `${INTERIORS_ROOT}/office/board_empty.png`
    }
  }
};

export function getItemDefinition(itemId) {
  return ROOM_ITEMS[itemId] || null;
}
