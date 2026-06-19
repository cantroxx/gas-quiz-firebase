import { getItemDefinition } from './asset-manifest.js';

const LAYER_NAMES = ['floor', 'walls', 'wallObjects', 'floorObjects', 'surfaceObjects', 'selection', 'debug'];

export class InteriorsRoomRenderer {
  constructor(stage) {
    this.stage = stage;
    this.layers = new Map();
    this.preset = null;
    this.scale = 1;
    this.stageOffset = { x: 0, y: 0 };
    this.metrics = null;
    this.selectedId = null;
    this.onSelect = null;
    this.createLayers();
  }

  setSelectHandler(handler) {
    this.onSelect = handler;
  }

  render(roomState) {
    this.preset = roomState.preset;
    this.selectedId = roomState.selectedId;
    this.metrics = this.createMetrics(roomState.preset);
    this.scale = this.getStageScale(this.metrics);
    this.stageOffset = this.getStageOffset(this.metrics);
    this.stage.style.setProperty('--interiors-room-scale', this.scale);
    this.stage.classList.toggle('is-debugging', this.shouldShowDebug());
    this.clearLayers();
    this.renderShell(roomState.preset);
    this.renderPlacedItems(roomState.items);
    this.renderSelectionAnchor(roomState.items);
    this.renderDebugOverlay(roomState.preset);
  }

  createLayers() {
    this.stage.replaceChildren();
    LAYER_NAMES.forEach(name => {
      const layer = document.createElement('div');
      layer.className = `interiors-room-layer interiors-room-layer--${name}`;
      layer.dataset.layer = name;
      this.layers.set(name, layer);
      this.stage.append(layer);
    });
  }

  clearLayers() {
    this.layers.forEach(layer => layer.replaceChildren());
  }

  createMetrics(preset) {
    const module = preset.tileWidth;
    const stepX = module / 2;
    const stepY = module / 4;
    const floorWidth = (preset.grid.width + preset.grid.depth) * stepX + module;
    const floorHeight = (preset.grid.width + preset.grid.depth) * stepY + module;
    const roomWidth = floorWidth + module;
    const roomHeight = floorHeight + preset.wallHeight + module * 0.4;
    return {
      module,
      stepX,
      stepY,
      wallRise: Number(preset.wallAlignment?.rise ?? Math.round(module * 0.5)),
      leftWallOffsetX: Number(preset.wallAlignment?.leftX ?? 0),
      rightWallOffsetX: Number(preset.wallAlignment?.rightX ?? 0),
      floorWidth,
      floorHeight,
      roomWidth,
      roomHeight,
      originX: roomWidth / 2 - stepX,
      originY: preset.wallHeight + 34
    };
  }

  getStageScale(metrics) {
    const rect = this.stage.getBoundingClientRect();
    if(!rect.width || !rect.height) return 1;
    const availableWidth = rect.width - 36;
    const availableHeight = rect.height - 30;
    return Math.min(1.25, Math.max(0.36, Math.min(availableWidth / metrics.roomWidth, availableHeight / metrics.roomHeight)));
  }

  getStageOffset(metrics) {
    const rect = this.stage.getBoundingClientRect();
    return {
      x: Math.max(0, (rect.width - metrics.roomWidth * this.scale) / 2),
      y: Math.max(0, (rect.height - metrics.roomHeight * this.scale) / 2)
    };
  }

  renderShell(preset) {
    const floorLayer = this.layers.get('floor');
    const wallLayer = this.layers.get('walls');

    for(let y = 0; y < preset.grid.depth; y += 1) {
      for(let x = 0; x < preset.grid.width; x += 1) {
        const point = this.floorPoint(x, y);
        floorLayer.append(this.createImageTile(preset.assets.floor, point.left, point.top, 1));
      }
    }

    for(let segment = 0; segment < preset.grid.depth; segment += 1) {
      const point = this.leftWallPoint(segment);
      wallLayer.append(this.createImageTile(preset.assets.leftWall, point.left, point.top, 5 + segment));
    }

    for(let segment = 0; segment < preset.grid.width; segment += 1) {
      const point = this.rightWallPoint(segment);
      wallLayer.append(this.createImageTile(preset.assets.rightWall, point.left, point.top, 5 + segment));
    }

    if(preset.assets.leftTop) {
      const point = this.leftWallPoint(0);
      wallLayer.append(this.createImageTile(preset.assets.leftTop, point.left, point.top - 12, 20));
    }

    if(preset.assets.rightTop) {
      const point = this.rightWallPoint(0);
      wallLayer.append(this.createImageTile(preset.assets.rightTop, point.left, point.top - 12, 20));
    }

    (preset.shellDecor || []).forEach(decor => {
      const point = decor.wall === 'left' ? this.leftWallPoint(decor.segment) : this.rightWallPoint(decor.segment);
      wallLayer.append(this.createImageTile(decor.src, point.left, point.top, 24 + decor.segment));
    });
  }

  renderPlacedItems(items) {
    items.forEach(item => {
      const definition = getItemDefinition(item.itemId);
      if(!definition) return;

      const sprite = this.resolveSprite(definition, item);
      const point = this.objectPoint(item, definition, items);
      const image = this.createObjectImage(sprite, point.left, point.top, point.zIndex, item, definition);
      const layer = this.objectLayer(item);
      layer.append(image);
    });
  }

  renderSelectionAnchor(items) {
    const item = items.find(candidate => candidate.id === this.selectedId);
    if(!item) return;
    const definition = getItemDefinition(item.itemId);
    if(!definition) return;
    const point = this.anchorPoint(item, definition, items);
    const anchor = document.createElement('div');
    anchor.className = 'interiors-room-anchor';
    this.setPosition(anchor, point.left, point.top, 1000);
    this.layers.get('selection').append(anchor);
  }

  renderDebugOverlay(preset) {
    if(!this.shouldShowDebug()) return;
    const debugLayer = this.layers.get('debug');

    for(let segment = 0; segment < preset.grid.depth; segment += 1) {
      this.appendDebugPoint(debugLayer, this.floorPoint(0, segment), `L${segment} floor`, 'floor');
      this.appendDebugPoint(debugLayer, this.leftWallPoint(segment), `L${segment} wall`, 'wall');
    }

    for(let segment = 0; segment < preset.grid.width; segment += 1) {
      this.appendDebugPoint(debugLayer, this.floorPoint(segment, 0), `R${segment} floor`, 'floor');
      this.appendDebugPoint(debugLayer, this.rightWallPoint(segment), `R${segment} wall`, 'wall');
    }
  }

  appendDebugPoint(layer, point, label, type) {
    const marker = document.createElement('span');
    marker.className = `interiors-room-debug-point interiors-room-debug-point--${type}`;
    marker.textContent = label;
    this.setPosition(marker, point.left, point.top, 2000);
    layer.append(marker);
  }

  shouldShowDebug() {
    return new URLSearchParams(window.location.search).has('debug');
  }

  floorPoint(x, y) {
    return {
      left: this.metrics.originX + (x - y) * this.metrics.stepX,
      top: this.metrics.originY + (x + y) * this.metrics.stepY
    };
  }

  floorAnchorPoint(item) {
    const point = this.floorPoint(item.x, item.y);
    return {
      left: point.left + this.metrics.module / 2,
      top: point.top + this.metrics.module / 2
    };
  }

  anchorPoint(item, definition, items) {
    if(item.anchor === 'wall') return this.wallAnchorPoint(item);
    if(item.anchor === 'surface') return this.surfaceAnchorPoint(item, definition, items);
    return this.floorAnchorPoint(item);
  }

  objectPoint(item, definition, items) {
    if(item.anchor === 'wall') return this.wallObjectPoint(item, definition);
    if(item.anchor === 'surface') return this.surfaceObjectPoint(item, definition, items);
    return this.floorObjectPoint(item, definition);
  }

  objectLayer(item) {
    if(item.anchor === 'wall') return this.layers.get('wallObjects');
    if(item.anchor === 'surface') return this.layers.get('surfaceObjects');
    return this.layers.get('floorObjects');
  }

  floorObjectPoint(item, definition) {
    const anchor = this.floorAnchorPoint(item);
    const imageSize = definition.size || this.metrics.module;
    const verticalLift = imageSize >= this.metrics.module ? this.metrics.module / 2 : imageSize * 0.68;
    return {
      left: anchor.left - imageSize / 2,
      top: anchor.top - verticalLift,
      zIndex: 100 + (item.x + item.y) * 10 + (item.z || 0)
    };
  }

  leftWallPoint(segment) {
    const floor = this.floorPoint(0, segment);
    return {
      left: floor.left + this.metrics.leftWallOffsetX,
      top: floor.top - this.metrics.wallRise
    };
  }

  rightWallPoint(segment) {
    const floor = this.floorPoint(segment, 0);
    return {
      left: floor.left + this.metrics.rightWallOffsetX,
      top: floor.top - this.metrics.wallRise
    };
  }

  wallAnchorPoint(item) {
    const definition = getItemDefinition(item.itemId);
    const wallPoint = item.wall === 'left' ? this.leftWallPoint(item.segment) : this.rightWallPoint(item.segment);
    const offset = definition?.wallOffset?.[item.wall] || {};
    const xOffset = Number(offset.x ?? (item.wall === 'left' ? this.metrics.module * 0.44 : this.metrics.module * 0.62));
    const yOffset = Number(offset.y ?? this.metrics.module * 0.62);
    return {
      left: wallPoint.left + xOffset,
      top: wallPoint.top + yOffset - (item.height || 0) * 18
    };
  }

  wallObjectPoint(item, definition) {
    const anchor = this.wallAnchorPoint(item);
    const imageSize = definition.size || this.metrics.module;
    return {
      left: anchor.left - imageSize / 2,
      top: anchor.top - imageSize / 2,
      zIndex: 70 + item.segment * 8 + (item.height || 0)
    };
  }

  surfaceAnchorPoint(item, definition, items) {
    const host = items.find(candidate => candidate.id === item.hostId);
    const hostDefinition = host ? getItemDefinition(host.itemId) : null;
    if(!host || !hostDefinition) return this.floorAnchorPoint(item);
    const hostPoint = this.floorObjectPoint(host, hostDefinition);
    const slot = hostDefinition.surfaceSlots?.find(candidate => candidate.id === item.slotId) || hostDefinition.surfaceSlots?.[0];
    if(!slot) return this.floorAnchorPoint(item);
    return {
      left: hostPoint.left + slot.x,
      top: hostPoint.top + slot.y
    };
  }

  surfaceObjectPoint(item, definition, items) {
    const anchor = this.surfaceAnchorPoint(item, definition, items);
    const imageSize = definition.size || this.metrics.module;
    const host = items.find(candidate => candidate.id === item.hostId);
    const hostDefinition = host ? getItemDefinition(host.itemId) : null;
    const hostPoint = host && hostDefinition ? this.floorObjectPoint(host, hostDefinition) : { zIndex: 140 };
    return {
      left: anchor.left - imageSize / 2,
      top: anchor.top - imageSize / 2,
      zIndex: hostPoint.zIndex + 18 + (item.slotOrder || 0)
    };
  }

  createImageTile(src, left, top, zIndex) {
    const image = document.createElement('img');
    image.className = 'interiors-room-tile';
    image.alt = '';
    image.src = src;
    image.draggable = false;
    image.width = this.metrics.module;
    image.height = this.metrics.module;
    this.setPosition(image, left, top, zIndex);
    return image;
  }

  createObjectImage(src, left, top, zIndex, item, definition) {
    const image = document.createElement('img');
    image.className = 'interiors-room-object';
    if(item.id === this.selectedId) image.classList.add('is-selected');
    image.alt = definition.name;
    image.src = src;
    image.draggable = false;
    image.width = definition.size || this.metrics.module;
    image.height = definition.size || this.metrics.module;
    image.dataset.itemId = item.id;
    image.addEventListener('click', event => {
      event.stopPropagation();
      if(this.onSelect) this.onSelect(item.id);
    });
    this.setPosition(image, left, top, zIndex);
    return image;
  }

  setPosition(element, left, top, zIndex) {
    const x = this.stageOffset.x + left * this.scale;
    const y = this.stageOffset.y + top * this.scale;
    element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${this.scale})`;
    element.style.transformOrigin = 'left top';
    element.style.zIndex = String(zIndex);
  }

  resolveSprite(definition, item) {
    const direction = item.direction || definition.directions[0];
    return definition.sprites[direction] || definition.sprites[definition.directions[0]];
  }
}
