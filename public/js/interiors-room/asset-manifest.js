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

function asset(path) {
  return `${INTERIORS_ROOT}/${path}`;
}

function floorItems(items) {
  return Object.fromEntries(items.map(item => {
    const directions = item.directions || ['a'];
    const sprites = item.sprites || { [directions[0]]: asset(item.path) };
    return [item.id, {
      id: item.id,
      name: item.name,
      category: item.category || 'floor',
      type: item.type || 'floor.object',
      anchor: item.anchor || 'floor',
      size: item.size || 128,
      footprint: item.footprint || { width: 1, depth: 1 },
      surfaceTags: item.surfaceTags || [],
      surfaceSlots: item.surfaceSlots || [],
      seatSockets: item.seatSockets || [],
      directions,
      sprites
    }];
  }));
}

function wallItems(items) {
  return Object.fromEntries(items.map(item => {
    const directions = item.directions || ['left', 'right'];
    const sprite = asset(item.path);
    return [item.id, {
      id: item.id,
      name: item.name,
      category: 'wall',
      type: item.type || 'wall.object',
      anchor: 'wall',
      size: item.size || 128,
      wallOffset: item.wallOffset || {
        left: { x: item.leftX ?? 58, y: item.y ?? 72 },
        right: { x: item.rightX ?? 76, y: item.y ?? 72 }
      },
      directions,
      sprites: item.sprites || {
        left: sprite,
        right: sprite
      }
    }];
  }));
}

export const ROOM_ITEMS = Object.freeze({
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
    surfaceSlots: [
      { id: 'left', x: 48, y: 55, accepts: ['book', 'desk.small', 'computer.small', 'gift'] },
      { id: 'right', x: 82, y: 58, accepts: ['book', 'desk.small', 'computer.small', 'dish', 'gift'] }
    ],
    seatSockets: [
      { id: 'front', x: 0, y: 1, preferredDirection: 'c', visualOffsetX: 0, visualOffsetY: -18, z: -14 },
      { id: 'side', x: -1, y: 0, preferredDirection: 'a', visualOffsetX: 14, visualOffsetY: 2, z: -8 }
    ],
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
    wallOffset: {
      left: { x: 56, y: 78 },
      right: { x: 79, y: 78 }
    },
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
    wallOffset: {
      left: { x: 58, y: 66 },
      right: { x: 70, y: 66 }
    },
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
    wallOffset: {
      left: { x: 58, y: 74 },
      right: { x: 76, y: 74 }
    },
    directions: ['left', 'right'],
    sprites: {
      left: `${INTERIORS_ROOT}/office/board_empty.png`,
      right: `${INTERIORS_ROOT}/office/board_empty.png`
    }
  },
  ...floorItems([
    {
      id: 'basicOfficeChair',
      name: '사무 의자',
      type: 'seat.object',
      size: 64,
      directions: ['a', 'b'],
      sprites: {
        a: asset('chairs/basic_office_chair_a.png'),
        b: asset('chairs/basic_office_chair_b.png')
      }
    },
    { id: 'officeMainChair', name: '회전 의자', type: 'seat.object', size: 128, path: 'chairs/office_main_chair.png' },
    { id: 'nightTable', name: '협탁', size: 64, path: 'bedroom/night_table_tile.png' },
    { id: 'pillowYellow', name: '베개', size: 32, path: 'bedroom/pillow_9.png' },
    { id: 'pillowSofa', name: '쿠션', size: 32, path: 'sofa/pillow_11.png' },
    { id: 'carpetRed', name: '빨간 카펫', size: 128, path: 'carpets/carpet_red.png', footprint: { width: 2, depth: 2 } },
    { id: 'carpetBlue', name: '파란 카펫', size: 128, path: 'carpets/carpet_3_tile.png', footprint: { width: 2, depth: 2 } },
    { id: 'carpetRound', name: '둥근 카펫', size: 128, path: 'carpets/carpet_7.png', footprint: { width: 2, depth: 2 } },
    { id: 'carpetGreen', name: '초록 카펫', size: 128, path: 'carpets/carpet_13.png', footprint: { width: 2, depth: 2 } },
    { id: 'carpetSoft', name: '폭신 카펫', size: 128, path: 'carpets/carpet_14.png', footprint: { width: 2, depth: 2 } },
    { id: 'lampA', name: '스탠드', size: 128, path: 'lamp/lamp_8_a_tile.png' },
    { id: 'lampB', name: '긴 스탠드', size: 128, path: 'lamp/lamp_8_b_tile.png' },
    { id: 'lavaLampOff', name: '용암 램프', size: 32, path: 'lavalamp_ani/lavalamp_9_off_tile.png' },
    {
      id: 'smallTable',
      name: '작은 탁자',
      size: 64,
      path: 'living_roon/smalltable_5.png',
      surfaceSlots: [
        { id: 'top', x: 32, y: 31, accepts: ['book', 'desk.small', 'dish', 'gift'] }
      ]
    },
    {
      id: 'livingTable',
      name: '거실 탁자',
      size: 128,
      path: 'living_roon/table_10.png',
      footprint: { width: 2, depth: 1 },
      surfaceSlots: [
        { id: 'left', x: 47, y: 54, accepts: ['book', 'desk.small', 'dish', 'gift'] },
        { id: 'right', x: 82, y: 57, accepts: ['book', 'desk.small', 'dish', 'gift'] }
      ],
      seatSockets: [
        { id: 'front-left', x: 0, y: 1, preferredDirection: 'c', visualOffsetX: 4, visualOffsetY: -14, z: -12 },
        { id: 'front-right', x: 1, y: 1, preferredDirection: 'c', visualOffsetX: -4, visualOffsetY: -14, z: -12 }
      ]
    },
    {
      id: 'shelving6',
      name: '책장',
      size: 128,
      path: 'living_roon/shelving_6.png',
      surfaceSlots: [
        { id: 'shelf', x: 68, y: 55, accepts: ['book', 'gift', 'desk.small'] }
      ]
    },
    {
      id: 'shelving7',
      name: '수납 선반',
      size: 128,
      path: 'living_roon/shelving_7.png',
      surfaceSlots: [
        { id: 'top', x: 66, y: 46, accepts: ['book', 'gift', 'desk.small'] }
      ]
    },
    { id: 'speaker6', name: '스피커', size: 64, path: 'living_roon/speaker_6_tile.png' },
    { id: 'airConditionerFloor', name: '에어컨', size: 128, path: 'living_roon/aircc_tile.png' },
    { id: 'book8', name: '큰 책', category: 'surface', type: 'surface.object', surfaceTags: ['book'], size: 32, path: 'living_roon/book_8.png' },
    { id: 'plant2', name: '큰 화분', size: 64, path: 'plants/plant_2.png' },
    { id: 'plant5', name: '잎 화분', size: 64, path: 'plants/plant_5.png' },
    { id: 'plantSmall', name: '작은 화분', size: 32, path: 'plants/plant_small.png' },
    { id: 'cactus1', name: '선인장', size: 32, path: 'plants/cactus_1.png' },
    { id: 'cactus2', name: '둥근 선인장', size: 32, path: 'plants/cactus_2.png' },
    { id: 'sunFlower', name: '해바라기', size: 32, path: 'plants/sun_flower.png' },
    { id: 'newImacA', name: '컴퓨터', size: 64, path: 'computer/newimac_a_tile.png' },
    { id: 'newImacB', name: '컴퓨터 옆면', size: 64, path: 'computer/newimac_b_tile.png' },
    { id: 'oldImacA', name: '옛날 컴퓨터', size: 64, path: 'computer/oldimac_a_tile.png' },
    { id: 'oldImacB', name: '옛날 컴퓨터 옆면', size: 64, path: 'computer/oldimac_b_tile.png' },
    { id: 'oldPcA', name: 'PC 모니터', size: 64, path: 'computer/oldpc_a_tile.png' },
    { id: 'oldPcB', name: 'PC 모니터 옆면', size: 64, path: 'computer/oldpc_b_tile.png' },
    { id: 'bendedScreen', name: '곡면 모니터', size: 64, path: 'computer/bendedscreen_a_tile.png' },
    {
      id: 'rotationScreen',
      name: '회전 모니터',
      size: 64,
      directions: ['a', 'b', 'c'],
      sprites: {
        a: asset('computer/rotationscreen_a_tile.png'),
        b: asset('computer/rotationscreen_b_tile.png'),
        c: asset('computer/rotationscreen_c_tile.png')
      }
    },
    { id: 'verticalScreen', name: '세로 모니터', size: 64, path: 'computer/vertical_screen.png' },
    { id: 'keyboardNew', name: '키보드', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'computer/newkeyboard_tile.png' },
    { id: 'keyboardOld', name: '옛날 키보드', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'computer/oldkeyboard_tile.png' },
    { id: 'pcTower', name: '컴퓨터 본체', size: 64, path: 'computer/pctower_tile.png' },
    { id: 'wacomTablet', name: '태블릿', size: 32, path: 'computer/wacomtablet.png' },
    {
      id: 'microwave5',
      name: '전자레인지',
      size: 64,
      directions: ['a', 'b', 'c', 'd'],
      sprites: {
        a: asset('microwave/microwave_5_tile.png'),
        b: asset('microwave/microwave_5_tile_b.png'),
        c: asset('microwave/microwave_5_tile_c.png'),
        d: asset('microwave/microwave_5_tile_d.png')
      }
    },
    { id: 'gameAtari', name: '게임기', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/atari.png' },
    { id: 'gameNes', name: '패미컴', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/nes.png' },
    { id: 'gameSnes', name: '슈퍼패미컴', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/snes.png' },
    { id: 'gameDreamcast', name: '드림캐스트', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/dreamcast.png' },
    { id: 'gameGamecube', name: '게임큐브', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/gamecube.png' },
    { id: 'gameSwitch', name: '스위치', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/nintendo_switch.png' },
    { id: 'gameBoy', name: '휴대 게임기', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/gameboy.png' },
    { id: 'gameBoyAdvance', name: '휴대 게임기 2', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/gameboy_advance.png' },
    { id: 'playstation', name: '플레이스테이션', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/playstation.png' },
    { id: 'playstation5', name: '새 게임기', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/playstation_5.png' },
    { id: 'xboxX', name: '검은 게임기', category: 'surface', type: 'surface.object', surfaceTags: ['computer.small'], size: 32, path: 'consoles/xbox_x.png' },
    {
      id: 'kitchenTable',
      name: '식탁',
      size: 128,
      path: 'kitchen/kitchen_table.png',
      footprint: { width: 2, depth: 1 },
      surfaceSlots: [
        { id: 'left', x: 48, y: 55, accepts: ['dish', 'book', 'desk.small', 'gift'] },
        { id: 'right', x: 83, y: 57, accepts: ['dish', 'book', 'desk.small', 'gift'] }
      ],
      seatSockets: [
        { id: 'front-left', x: 0, y: 1, preferredDirection: 'c', visualOffsetX: 4, visualOffsetY: -14, z: -12 },
        { id: 'front-right', x: 1, y: 1, preferredDirection: 'c', visualOffsetX: -4, visualOffsetY: -14, z: -12 }
      ]
    },
    { id: 'kitchenStool', name: '주방 의자', type: 'seat.object', size: 64, path: 'kitchen/kitchen_stool.png' },
    {
      id: 'kitchenCounter',
      name: '주방 가구',
      size: 128,
      path: 'kitchen/kitchen_a_tile.png',
      footprint: { width: 2, depth: 1 },
      surfaceSlots: [
        { id: 'counter', x: 74, y: 45, accepts: ['dish', 'desk.small'] }
      ]
    },
    {
      id: 'sink',
      name: '싱크대',
      size: 128,
      path: 'kitchen/sink.png',
      footprint: { width: 2, depth: 1 },
      surfaceSlots: [
        { id: 'rim', x: 74, y: 48, accepts: ['dish', 'desk.small'] }
      ]
    },
    { id: 'oven', name: '오븐', size: 128, path: 'kitchen/oven.png' },
    { id: 'stoves', name: '가스레인지', size: 64, path: 'kitchen/stoves.png' },
    { id: 'fridgeRed', name: '냉장고', size: 128, path: 'kitchen/fidge_red.png', footprint: { width: 1, depth: 2 } },
    { id: 'washingMachine', name: '세탁기', size: 128, path: 'kitchen/washingmachine_closed.png' },
    { id: 'toaster', name: '토스터', category: 'surface', type: 'surface.object', surfaceTags: ['desk.small'], size: 32, path: 'kitchen/toaster.png' },
    { id: 'kettle', name: '주전자', category: 'surface', type: 'surface.object', surfaceTags: ['dish'], size: 32, path: 'kitchen/ketel_7.png' },
    { id: 'teapot', name: '찻주전자', category: 'surface', type: 'surface.object', surfaceTags: ['dish'], size: 32, path: 'kitchen/teapot.png' },
    { id: 'pot', name: '냄비', category: 'surface', type: 'surface.object', surfaceTags: ['dish'], size: 32, path: 'kitchen/pot.png' },
    { id: 'potFull', name: '가득 찬 냄비', category: 'surface', type: 'surface.object', surfaceTags: ['dish'], size: 32, path: 'kitchen/pot_full.png' },
    { id: 'fryingPan', name: '프라이팬', category: 'surface', type: 'surface.object', surfaceTags: ['dish'], size: 32, path: 'kitchen/frying_pan.png' },
    { id: 'dish', name: '접시', category: 'surface', type: 'surface.object', surfaceTags: ['dish'], size: 32, path: 'kitchen/dish.png' },
    { id: 'cola', name: '콜라', category: 'surface', type: 'surface.object', surfaceTags: ['dish'], size: 16, path: 'kitchen/cola.png' },
    { id: 'cereals', name: '시리얼', category: 'surface', type: 'surface.object', surfaceTags: ['dish'], size: 32, path: 'kitchen/cereals.png' },
    { id: 'trashbinKitchen', name: '쓰레기통', size: 64, path: 'kitchen/trashbin_closed.png' },
    { id: 'kitchenRug', name: '주방 매트', size: 128, path: 'kitchen/kitchen_rug.png', footprint: { width: 2, depth: 1 } },
    {
      id: 'japaneseTable',
      name: '좌식 탁자',
      size: 128,
      path: 'japanese_room/japanese_table.png',
      footprint: { width: 2, depth: 1 },
      surfaceSlots: [
        { id: 'tea-left', x: 50, y: 56, accepts: ['dish', 'book', 'desk.small'] },
        { id: 'tea-right', x: 80, y: 56, accepts: ['dish', 'book', 'desk.small'] }
      ],
      seatSockets: [
        { id: 'front-left', x: 0, y: 1, preferredDirection: 'c', visualOffsetX: 4, visualOffsetY: -12, z: -12 },
        { id: 'front-right', x: 1, y: 1, preferredDirection: 'c', visualOffsetX: -4, visualOffsetY: -12, z: -12 }
      ]
    },
    { id: 'japaneseSeat', name: '방석', type: 'seat.object', size: 64, path: 'japanese_room/japanese_seat.png' },
    { id: 'japaneseShelf', name: '일본식 선반', size: 128, path: 'japanese_room/japanese_shelf.png' },
    { id: 'japaneseCloset', name: '일본식 장롱', size: 128, path: 'japanese_room/japanese_closet.png', footprint: { width: 1, depth: 2 } },
    { id: 'japaneseLamp', name: '일본식 등', size: 64, path: 'japanese_room/japanese_lamp.png' },
    { id: 'japanesePlant', name: '일본식 화분', size: 64, path: 'japanese_room/japanese_plant.png' },
    { id: 'bonsai', name: '분재', size: 64, path: 'japanese_room/bonsai.png' },
    { id: 'japaneseVase', name: '꽃병', size: 32, path: 'japanese_room/japanese_vase.png' },
    { id: 'japaneseToriGate', name: '작은 문 장식', size: 64, path: 'japanese_room/japanese_tori_gate.png' },
    { id: 'clothesCase', name: '옷 상자', size: 64, path: 'japanese_room/clothes_case.png' },
    {
      id: 'officeDrawingTable',
      name: '작업 책상',
      size: 128,
      path: 'office/drawing_table.png',
      footprint: { width: 2, depth: 1 },
      surfaceSlots: [
        { id: 'work', x: 68, y: 52, accepts: ['book', 'desk.small', 'computer.small'] }
      ],
      seatSockets: [
        { id: 'front', x: 0, y: 1, preferredDirection: 'c', visualOffsetX: 0, visualOffsetY: -16, z: -12 }
      ]
    },
    {
      id: 'officeKitchenTable',
      name: '사무실 탁자',
      size: 128,
      path: 'office/office_kitchen_table.png',
      footprint: { width: 2, depth: 1 },
      surfaceSlots: [
        { id: 'left', x: 50, y: 55, accepts: ['book', 'desk.small', 'dish'] },
        { id: 'right', x: 82, y: 57, accepts: ['book', 'desk.small', 'dish'] }
      ],
      seatSockets: [
        { id: 'front-left', x: 0, y: 1, preferredDirection: 'c', visualOffsetX: 4, visualOffsetY: -14, z: -12 },
        { id: 'front-right', x: 1, y: 1, preferredDirection: 'c', visualOffsetX: -4, visualOffsetY: -14, z: -12 }
      ]
    },
    { id: 'officePartition', name: '파티션', size: 128, path: 'office/office_partition.png' },
    { id: 'officeRack', name: '사무실 선반', size: 128, path: 'office/rack.png' },
    { id: 'officeLongRack', name: '긴 선반', size: 128, path: 'office/long_rack.png' },
    { id: 'telephone', name: '전화기', category: 'surface', type: 'surface.object', surfaceTags: ['desk.small'], size: 32, path: 'office/telephone.png' },
    { id: 'calculator', name: '계산기', category: 'surface', type: 'surface.object', surfaceTags: ['desk.small'], size: 32, path: 'office/calculator.png' },
    { id: 'pencilHolder', name: '연필꽂이', category: 'surface', type: 'surface.object', surfaceTags: ['desk.small'], size: 32, path: 'office/pencil_holder.png' },
    { id: 'headset', name: '헤드셋', category: 'surface', type: 'surface.object', surfaceTags: ['desk.small'], size: 32, path: 'office/headset.png' },
    { id: 'trashEmpty', name: '빈 휴지통', size: 64, path: 'office/trash_empty.png' },
    { id: 'trashFull', name: '가득 찬 휴지통', size: 64, path: 'office/trash_full.png' },
    { id: 'present2', name: '선물 상자', category: 'surface', type: 'surface.object', surfaceTags: ['gift'], size: 32, path: 'present/present_2.png' },
    { id: 'present3', name: '초록 선물', category: 'surface', type: 'surface.object', surfaceTags: ['gift'], size: 32, path: 'present/present_3.png' },
    { id: 'present4', name: '파란 선물', category: 'surface', type: 'surface.object', surfaceTags: ['gift'], size: 32, path: 'present/present_4.png' },
    { id: 'present5', name: '노란 선물', category: 'surface', type: 'surface.object', surfaceTags: ['gift'], size: 32, path: 'present/present_5.png' },
    { id: 'present6', name: '분홍 선물', category: 'surface', type: 'surface.object', surfaceTags: ['gift'], size: 32, path: 'present/present_6.png' },
    { id: 'present7', name: '하얀 선물', category: 'surface', type: 'surface.object', surfaceTags: ['gift'], size: 32, path: 'present/present_7.png' },
    { id: 'presentBig', name: '큰 선물', category: 'surface', type: 'surface.object', surfaceTags: ['gift'], size: 64, path: 'present/present_100.png' },
    { id: 'bookPile', name: '책 더미', category: 'surface', type: 'surface.object', surfaceTags: ['book'], size: 32, path: 'books/books_pile.png' },
    { id: 'notebooks', name: '공책', category: 'surface', type: 'surface.object', surfaceTags: ['book'], size: 32, path: 'books/notebooks.png' },
    { id: 'bookGreen', name: '초록 책', category: 'surface', type: 'surface.object', surfaceTags: ['book'], size: 16, path: 'books/book_green.png' },
    { id: 'bookBigLightblue', name: '큰 파란 책', category: 'surface', type: 'surface.object', surfaceTags: ['book'], size: 32, path: 'books/book_big_lightblue.png' },
    { id: 'ringBinderBlue', name: '파란 파일', category: 'surface', type: 'surface.object', surfaceTags: ['book'], size: 32, path: 'books/ring_binder_blue.png' },
    { id: 'ringBinderRed', name: '빨간 파일', category: 'surface', type: 'surface.object', surfaceTags: ['book'], size: 32, path: 'books/ring_binder_red.png' }
  ]),
  ...wallItems([
    {
      id: 'window8',
      name: '큰 창문',
      directions: ['left', 'right'],
      sprites: {
        left: asset('windows/window_8.png'),
        right: asset('windows/window_b_8.png')
      },
      wallOffset: { left: { x: 56, y: 78 }, right: { x: 79, y: 78 } }
    },
    {
      id: 'window11',
      name: '작은 창문',
      directions: ['left', 'right'],
      sprites: {
        left: asset('windows/window_11.png'),
        right: asset('windows/window_11_b.png')
      },
      wallOffset: { left: { x: 56, y: 74 }, right: { x: 78, y: 74 } }
    },
    { id: 'doorBeige', name: '베이지 문', path: 'doors/door_1_beige.png', y: 84 },
    { id: 'doorBrown', name: '갈색 문', path: 'doors/door_2_brown.png', y: 84 },
    { id: 'doorOrange', name: '주황 문', path: 'doors/door_3_orange.png', y: 84 },
    { id: 'doorRed', name: '빨간 문', path: 'doors/door_4_red.png', y: 84 },
    { id: 'doorGreen', name: '초록 문', path: 'doors/door_5_green.png', y: 84 },
    { id: 'doorBlue', name: '파란 문', path: 'doors/door_6_blue.png', y: 84 },
    { id: 'doorBlack', name: '검은 문', path: 'doors/door_7_black.png', y: 84 },
    { id: 'poster2', name: '포스터 2', size: 64, path: 'poster/poster_2.png', y: 66 },
    { id: 'poster3', name: '포스터 3', size: 64, path: 'poster/poster_3.png', y: 66 },
    { id: 'poster4', name: '포스터 4', size: 64, path: 'poster/poster_4.png', y: 66 },
    { id: 'poster5', name: '포스터 5', size: 64, path: 'poster/poster_5.png', y: 66 },
    { id: 'poster16', name: '그림 포스터', size: 64, path: 'poster/poster_16.png', y: 66 },
    { id: 'poster17', name: '별 포스터', size: 64, path: 'poster/poster_17.png', y: 66 },
    { id: 'posterFire', name: '불꽃 포스터', size: 64, path: 'poster/poster_fire.png', y: 66 },
    { id: 'posterMap', name: '지도 포스터', size: 64, path: 'poster/poster_map_6.png', y: 66 },
    { id: 'posterMedical', name: '구급 포스터', size: 64, path: 'poster/poster_medical.png', y: 66 },
    { id: 'boardFull', name: '알림 칠판', path: 'office/board_full.png', y: 74 },
    { id: 'corkboard1', name: '게시판', size: 64, path: 'office/corkboard_1.png', y: 66 },
    { id: 'corkboard2', name: '작은 게시판', size: 64, path: 'office/corkboard_2.png', y: 66 },
    { id: 'blueprint', name: '설계도', size: 64, path: 'office/blueprint.png', y: 66 },
    { id: 'diploma', name: '상장', size: 64, path: 'office/diploma.png', y: 66 },
    { id: 'pictureFrame', name: '액자', size: 64, path: 'office/picture_frame.png', y: 66 },
    { id: 'photos1', name: '사진 1', size: 64, path: 'office/photos_1.png', y: 66 },
    { id: 'photos2', name: '사진 2', size: 64, path: 'office/photos_2.png', y: 66 },
    { id: 'glassWall', name: '유리 벽', path: 'office/glass_wall.png', y: 78 },
    { id: 'officeAc', name: '벽걸이 에어컨', path: 'office/ac.png', y: 64 },
    { id: 'officeTvOff', name: '꺼진 TV', path: 'office/tv_off.png', y: 70 },
    { id: 'fireExtinguisher', name: '소화기', size: 64, path: 'office/fire_extinguisher.png', y: 82 },
    { id: 'kitchenWindow', name: '주방 창문', path: 'kitchen/kitchen_window.png', y: 76 },
    { id: 'kitchenShelf', name: '주방 선반', path: 'kitchen/shelf.png', y: 66 },
    { id: 'kitchenRack', name: '주방 걸이', path: 'kitchen/rack.png', y: 68 },
    { id: 'kitchenPainting', name: '주방 그림', size: 64, path: 'kitchen/painting.png', y: 66 },
    { id: 'wallProtection', name: '주방 벽판', path: 'kitchen/wall_protection.png', y: 76 },
    { id: 'bathWindow', name: '욕실 창문', path: 'bathroom/bath_window.png', y: 76 },
    { id: 'bathMirror', name: '거울', size: 64, path: 'bathroom/mirror.png', y: 66 },
    { id: 'bathShelfSmall', name: '욕실 선반', size: 64, path: 'bathroom/small_shelf.png', y: 68 },
    { id: 'bathShelfLong', name: '긴 욕실 선반', path: 'bathroom/long_shelf.png', y: 68 },
    { id: 'bathTowelBlue', name: '파란 수건', size: 32, path: 'bathroom/towel_blue.png', y: 72 },
    { id: 'bathTowelGreen', name: '초록 수건', size: 32, path: 'bathroom/towel_green.png', y: 72 },
    { id: 'bathTowelRed', name: '빨간 수건', size: 32, path: 'bathroom/towel_red.png', y: 72 },
    { id: 'japaneseCanvas', name: '일본식 그림', size: 64, path: 'japanese_room/japanese_canvas.png', y: 66 },
    { id: 'japaneseCanvasLetters', name: '글씨 그림', size: 64, path: 'japanese_room/japanese_canvas_leters.png', y: 66 }
  ])
});

export function getItemDefinition(itemId) {
  return ROOM_ITEMS[itemId] || null;
}
