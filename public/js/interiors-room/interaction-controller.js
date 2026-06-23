import { ROOM_ITEMS, getItemDefinition } from './asset-manifest.js';
import { ROOM_SHELL_PRESETS, cloneDefaultPlaced, getShellPreset } from './shell-presets.js';

export class InteriorsRoomInteractionController {
  constructor({ renderer, elements }) {
    this.renderer = renderer;
    this.elements = elements;
    this.itemFilter = 'all';
    this.isDirty = false;
    const preset = clonePreset(getShellPreset('interiors_room'));
    this.state = {
      preset,
      items: cloneDefaultPlaced(preset),
      selectedId: null,
      placement: null
    };
  }

  start() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.renderer.setSelectHandler(itemId => {
      this.state.selectedId = itemId;
      this.render();
    });

    this.renderer.stage.addEventListener('pointermove', event => {
      this.updatePlacementPreview(event);
    });

    this.renderer.stage.addEventListener('click', event => {
      if(this.commitPlacement(event)) return;
      this.state.selectedId = null;
      this.render();
    });

    this.elements.presetButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.selectPreset(button.dataset.presetChoice);
      });
    });

    this.elements.itemFilterButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.itemFilter = button.dataset.itemFilter || 'all';
        this.renderItemDock();
      });
    });

    this.elements.itemTray.addEventListener('click', event => {
      const button = event.target.closest('[data-add-item]');
      if(!button) return;
      this.startPlacement(button.dataset.addItem);
    });

    this.elements.exitButton.addEventListener('click', () => {
      this.exitToHome();
    });

    this.elements.resetButton.addEventListener('click', () => {
      if(this.isDirty && !window.confirm('처음 상태로 돌릴까요? 지금 꾸민 내용은 사라져요.')) return;
      this.state.items = cloneDefaultPlaced(this.state.preset);
      this.state.selectedId = null;
      this.state.placement = null;
      this.isDirty = false;
      this.render();
    });

    this.elements.commandButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.runCommand(button);
      });
    });

    this.elements.wallHeightInput?.addEventListener('input', () => {
      this.changeRoomWallHeight(Number(this.elements.wallHeightInput.value));
    });

    window.addEventListener('resize', () => this.render());
  }

  selectPreset(presetId) {
    if(presetId === this.state.preset.id) return;
    if(this.isDirty && !window.confirm('방을 바꾸면 꾸민 내용이 처음 상태로 돌아가요. 바꿀까요?')) return;
    const preset = clonePreset(getShellPreset(presetId));
    this.state.preset = preset;
    this.state.items = cloneDefaultPlaced(preset);
    this.state.selectedId = null;
    this.state.placement = null;
    this.isDirty = false;
    this.render();
  }

  exitToHome() {
    if(window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'dj48-close-room-decorator' }, window.location.origin);
      return;
    }
    if(window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign('/');
  }

  addItem(itemId) {
    const definition = getItemDefinition(itemId);
    if(!definition) return;

    const id = `${itemId}-${Date.now().toString(36)}`;
    const item = definition.anchor === 'wall'
      ? {
          id,
          itemId,
          anchor: 'wall',
          wall: 'left',
          segment: 2,
          height: 1,
          direction: definition.directions.includes('left') ? 'left' : definition.directions[0]
        }
      : {
          id,
          itemId,
          anchor: 'floor',
          x: Math.floor(this.state.preset.grid.width / 2),
          y: Math.floor(this.state.preset.grid.depth / 2),
          direction: definition.directions[0]
        };

    this.state.items = [...this.state.items, item];
    this.state.selectedId = id;
    this.isDirty = true;
    this.render();
  }

  startPlacement(itemId, existingItem = null) {
    const definition = getItemDefinition(itemId);
    if(!definition) return;
    const direction = existingItem?.direction || (definition.directions.includes('left') ? 'left' : definition.directions[0]);
    const preview = existingItem
      ? this.placementPreviewFromItem(existingItem)
      : this.defaultPlacementPreview(definition, direction);
    this.state.placement = {
      isActive: true,
      itemId,
      existingId: existingItem?.id || null,
      direction,
      preview
    };
    this.state.selectedId = existingItem?.id || null;
    this.render();
  }

  runCommand(button) {
    const selected = this.getSelectedItem();
    const command = button.dataset.command;
    if(command === 'clear') {
      this.state.selectedId = null;
      this.render();
      return;
    }
    if(!selected) return;

    if(command === 'delete') {
      this.state.items = this.state.items.filter(item => item.id !== selected.id);
      this.state.selectedId = null;
      this.isDirty = true;
      this.render();
      return;
    }

    if(command === 'begin-place') {
      this.startPlacement(selected.itemId, selected);
    } else if(command === 'rotate') {
      this.rotateItem(selected);
    } else if(command === 'move-floor') {
      this.moveFloorItem(selected, Number(button.dataset.dx), Number(button.dataset.dy));
    } else if(command === 'move-wall') {
      this.moveWallItem(selected, Number(button.dataset.ds));
    } else if(command === 'wall-height') {
      this.changeWallHeight(selected, Number(button.dataset.dh));
    } else if(command === 'place-surface') {
      this.placeOnNearestSurface(selected);
    } else if(command === 'detach-surface') {
      this.detachFromSurface(selected);
    } else if(command === 'next-surface-slot') {
      this.moveToNextSurfaceSlot(selected);
    } else if(command === 'nudge-surface') {
      this.nudgeSurfaceItem(selected, Number(button.dataset.dx), Number(button.dataset.dy));
    } else if(command === 'attach-seat') {
      this.attachSeatToNearestSocket(selected);
    }

    this.isDirty = true;
    this.render();
  }

  changeRoomWallHeight(wallHeight) {
    this.state.preset = {
      ...this.state.preset,
      currentWallHeight: clamp(wallHeight, 80, 140)
    };
    this.isDirty = true;
    this.render();
  }

  defaultPlacementPreview(definition, direction) {
    if(definition.anchor === 'wall') {
      return {
        anchor: 'wall',
        wall: direction === 'right' ? 'right' : 'left',
        segment: 2,
        height: 1
      };
    }
    return {
      anchor: 'floor',
      x: Math.floor(this.state.preset.grid.width / 2),
      y: Math.floor(this.state.preset.grid.depth / 2)
    };
  }

  placementPreviewFromItem(item) {
    if(item.anchor === 'wall') {
      return {
        anchor: 'wall',
        wall: item.wall,
        segment: item.segment,
        height: item.height || 1
      };
    }
    if(item.anchor === 'surface') {
      const host = this.state.items.find(candidate => candidate.id === item.hostId);
      return {
        anchor: 'floor',
        x: clamp(host?.x ?? Math.floor(this.state.preset.grid.width / 2), 0, this.state.preset.grid.width - 1),
        y: clamp((host?.y ?? Math.floor(this.state.preset.grid.depth / 2)) + 1, 0, this.state.preset.grid.depth - 1)
      };
    }
    return {
      anchor: 'floor',
      x: item.x,
      y: item.y
    };
  }

  updatePlacementPreview(event) {
    if(!this.state.placement?.isActive) return;
    const definition = getItemDefinition(this.state.placement.itemId);
    if(!definition) return;
    const point = this.renderer.stagePointFromEvent(event);
    if(definition.anchor === 'wall') {
      const wallCell = this.renderer.wallCellFromStagePoint(point);
      this.state.placement.preview = {
        anchor: 'wall',
        wall: wallCell.wall,
        segment: wallCell.segment,
        height: this.state.placement.preview?.height || 1
      };
      this.state.placement.direction = wallCell.wall === 'right' && definition.directions.includes('right') ? 'right' : definition.directions[0];
    } else {
      this.state.placement.preview = {
        anchor: 'floor',
        ...this.renderer.floorCellFromStagePoint(point)
      };
    }
    this.render();
  }

  commitPlacement(event) {
    const placement = this.state.placement;
    if(!placement?.isActive) return false;
    this.updatePlacementPreview(event);
    const definition = getItemDefinition(placement.itemId);
    if(!definition || !placement.preview) return true;

    const existing = placement.existingId
      ? this.state.items.find(item => item.id === placement.existingId)
      : null;
    const item = existing || {
      id: `${placement.itemId}-${Date.now().toString(36)}`,
      itemId: placement.itemId
    };
    Object.assign(item, placement.preview, {
      direction: placement.direction || definition.directions[0]
    });
    delete item.hostId;
    delete item.slotId;
    delete item.slotOrder;
    delete item.offsetX;
    delete item.offsetY;
    delete item.seatHostId;
    delete item.seatSocketId;
    delete item.visualOffsetX;
    delete item.visualOffsetY;
    delete item.z;

    if(!existing) this.state.items = [...this.state.items, item];
    this.state.selectedId = item.id;
    this.state.placement = null;
    this.isDirty = true;
    this.render();
    return true;
  }

  rotateItem(item) {
    const definition = getItemDefinition(item.itemId);
    if(!definition || definition.directions.length < 2) return;
    const index = definition.directions.indexOf(item.direction);
    item.direction = definition.directions[(index + 1) % definition.directions.length];
    if(item.anchor === 'wall' && definition.directions.includes('left') && definition.directions.includes('right')) {
      item.wall = item.direction === 'right' ? 'right' : 'left';
    }
  }

  moveFloorItem(item, dx, dy) {
    if(item.anchor !== 'floor') return;
    item.x = clamp(item.x + dx, 0, this.state.preset.grid.width - 1);
    item.y = clamp(item.y + dy, 0, this.state.preset.grid.depth - 1);
    this.clearSeatAttachment(item);
  }

  moveWallItem(item, ds) {
    if(item.anchor !== 'wall') return;
    const limit = item.wall === 'left' ? this.state.preset.grid.depth - 1 : this.state.preset.grid.width - 1;
    item.segment = clamp(item.segment + ds, 0, limit);
  }

  changeWallHeight(item, dh) {
    if(item.anchor !== 'wall') return;
    item.height = clamp((item.height || 0) + dh, 0, 3);
  }

  placeOnNearestSurface(item) {
    const definition = getItemDefinition(item.itemId);
    if(!definition || definition.type !== 'surface.object') return;
    const target = this.findNearestSurfaceSlot(item, definition);
    if(!target) return;
    item.anchor = 'surface';
    item.hostId = target.host.id;
    item.slotId = target.slot.id;
    item.slotOrder = target.slotIndex;
    item.offsetX = 0;
    item.offsetY = 0;
    delete item.x;
    delete item.y;
  }

  detachFromSurface(item) {
    if(item.anchor !== 'surface') return;
    const host = this.state.items.find(candidate => candidate.id === item.hostId);
    item.anchor = 'floor';
    item.x = clamp(host?.x ?? Math.floor(this.state.preset.grid.width / 2), 0, this.state.preset.grid.width - 1);
    item.y = clamp((host?.y ?? Math.floor(this.state.preset.grid.depth / 2)) + 1, 0, this.state.preset.grid.depth - 1);
    delete item.hostId;
    delete item.slotId;
    delete item.slotOrder;
    delete item.offsetX;
    delete item.offsetY;
  }

  moveToNextSurfaceSlot(item) {
    const definition = getItemDefinition(item.itemId);
    if(!definition || definition.type !== 'surface.object') return;
    if(item.anchor !== 'surface') {
      this.placeOnNearestSurface(item);
      return;
    }

    const host = this.state.items.find(candidate => candidate.id === item.hostId);
    const hostDefinition = host ? getItemDefinition(host.itemId) : null;
    const slots = hostDefinition ? this.getAcceptingSurfaceSlots(hostDefinition, definition) : [];
    if(!host || !slots.length) {
      this.detachFromSurface(item);
      return;
    }

    const currentIndex = Math.max(0, slots.findIndex(slot => slot.id === item.slotId));
    const orderedSlots = [...slots.slice(currentIndex + 1), ...slots.slice(0, currentIndex + 1)];
    const nextSlot = orderedSlots.find(slot => !this.isSurfaceSlotOccupied(host.id, slot.id, item.id));
    if(!nextSlot) return;
    item.slotId = nextSlot.id;
    item.slotOrder = slots.findIndex(slot => slot.id === nextSlot.id);
  }

  findNearestSurfaceSlot(item, definition) {
    const sourceX = Number(item.x ?? 0);
    const sourceY = Number(item.y ?? 0);
    const candidates = [];

    this.state.items.forEach(host => {
      if(host.id === item.id || host.anchor !== 'floor') return;
      const hostDefinition = getItemDefinition(host.itemId);
      const slots = hostDefinition ? this.getAcceptingSurfaceSlots(hostDefinition, definition) : [];
      slots.forEach((slot, slotIndex) => {
        if(this.isSurfaceSlotOccupied(host.id, slot.id, item.id)) return;
        const distance = Math.abs((host.x ?? 0) - sourceX) + Math.abs((host.y ?? 0) - sourceY);
        candidates.push({ host, slot, slotIndex, distance });
      });
    });

    return candidates.sort((a, b) => a.distance - b.distance || a.slotIndex - b.slotIndex)[0] || null;
  }

  getAcceptingSurfaceSlots(hostDefinition, itemDefinition) {
    const tags = itemDefinition.surfaceTags || [];
    return (hostDefinition.surfaceSlots || []).filter(slot => {
      return !slot.accepts?.length || slot.accepts.some(tag => tags.includes(tag));
    });
  }

  isSurfaceSlotOccupied(hostId, slotId, ignoreItemId = null) {
    return this.state.items.some(item => {
      return item.id !== ignoreItemId && item.anchor === 'surface' && item.hostId === hostId && item.slotId === slotId;
    });
  }

  nudgeSurfaceItem(item, dx, dy) {
    if(item.anchor !== 'surface') return;
    item.offsetX = clamp(Number(item.offsetX || 0) + dx, -24, 24);
    item.offsetY = clamp(Number(item.offsetY || 0) + dy, -18, 18);
  }

  attachSeatToNearestSocket(item) {
    const definition = getItemDefinition(item.itemId);
    if(!definition || definition.type !== 'seat.object') return;
    const target = this.findNearestSeatSocket(item);
    if(!target) return;
    item.anchor = 'floor';
    item.x = target.x;
    item.y = target.y;
    item.direction = target.socket.preferredDirection || item.direction;
    item.seatHostId = target.host.id;
    item.seatSocketId = target.socket.id;
    item.visualOffsetX = target.socket.visualOffsetX || 0;
    item.visualOffsetY = target.socket.visualOffsetY || 0;
    item.z = target.socket.z || 0;
  }

  clearSeatAttachment(item) {
    delete item.seatHostId;
    delete item.seatSocketId;
    delete item.visualOffsetX;
    delete item.visualOffsetY;
    delete item.z;
  }

  findNearestSeatSocket(item) {
    const sourceX = Number(item.x ?? 0);
    const sourceY = Number(item.y ?? 0);
    const candidates = [];
    this.state.items.forEach(host => {
      if(host.id === item.id || host.anchor !== 'floor') return;
      const hostDefinition = getItemDefinition(host.itemId);
      (hostDefinition?.seatSockets || []).forEach((socket, socketIndex) => {
        const x = clamp((host.x ?? 0) + socket.x, 0, this.state.preset.grid.width - 1);
        const y = clamp((host.y ?? 0) + socket.y, 0, this.state.preset.grid.depth - 1);
        const distance = Math.abs(x - sourceX) + Math.abs(y - sourceY);
        candidates.push({ host, socket, socketIndex, x, y, distance });
      });
    });
    return candidates.sort((a, b) => a.distance - b.distance || a.socketIndex - b.socketIndex)[0] || null;
  }

  getSelectedItem() {
    return this.state.items.find(item => item.id === this.state.selectedId) || null;
  }

  render() {
    this.renderer.render(this.state);
    this.renderPresetChoices();
    this.renderItemDock();
    this.renderStatus();
    this.updateCommandState();
  }

  renderPresetChoices() {
    this.elements.presetButtons.forEach(button => {
      const isActive = button.dataset.presetChoice === this.state.preset.id;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  renderItemDock() {
    this.elements.itemFilterButtons.forEach(button => {
      const isActive = button.dataset.itemFilter === this.itemFilter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    const items = Object.values(ROOM_ITEMS).filter(item => {
      return this.itemFilter === 'all' || item.category === this.itemFilter;
    });

    this.elements.itemTray.replaceChildren();
    items.forEach(item => {
      const button = document.createElement('button');
      const image = document.createElement('img');
      const label = document.createElement('span');
      const direction = item.directions[0];
      button.className = 'item-card';
      button.type = 'button';
      button.dataset.addItem = item.id;
      image.src = item.sprites[direction];
      image.alt = '';
      image.draggable = false;
      label.textContent = item.name;
      button.append(image, label);
      this.elements.itemTray.append(button);
    });
  }

  renderStatus() {
    const selected = this.getSelectedItem();
    this.elements.selectedCard.classList.toggle('has-selection', Boolean(selected));
    this.elements.selectedCard.classList.toggle('is-floor-selection', selected?.anchor === 'floor');
    this.elements.selectedCard.classList.toggle('is-wall-selection', selected?.anchor === 'wall');
    this.elements.selectedCard.classList.toggle('is-surface-selection', this.canUseSurfaceCommands(selected));
    this.elements.selectedCard.classList.toggle('is-seat-selection', this.canUseSeatCommands(selected));

    if(this.state.placement?.isActive) {
      const definition = getItemDefinition(this.state.placement.itemId);
      this.elements.selectedLabel.textContent = `${definition?.name || '물건'} 놓는 중`;
      this.elements.selectedDetail.textContent = '방 위에서 움직인 다음 놓을 곳을 눌러요.';
      return;
    }

    if(!selected) {
      this.elements.selectedLabel.textContent = '물건을 골라보세요';
      this.elements.selectedDetail.textContent = this.isDirty
        ? '아직 저장되지 않았어요. 지금은 연습장처럼 꾸며볼 수 있어요.'
        : '보관함에서 물건을 놓거나 방 안의 물건을 눌러요.';
      return;
    }

    const definition = getItemDefinition(selected.itemId);
    this.elements.selectedLabel.textContent = definition ? `${definition.name} 선택됨` : '물건 선택됨';
    if(selected.anchor === 'wall') {
      this.elements.selectedDetail.textContent = `${selected.wall === 'left' ? '왼쪽 벽' : '오른쪽 벽'}에 붙어 있어요.`;
    } else if(selected.anchor === 'surface') {
      const host = this.state.items.find(item => item.id === selected.hostId);
      const hostDefinition = host ? getItemDefinition(host.itemId) : null;
      this.elements.selectedDetail.textContent = `${hostDefinition?.name || '가구'} 위에 올려져 있어요.`;
    } else if(selected.seatHostId) {
      const host = this.state.items.find(item => item.id === selected.seatHostId);
      const hostDefinition = host ? getItemDefinition(host.itemId) : null;
      this.elements.selectedDetail.textContent = `${hostDefinition?.name || '가구'}에 붙어 있어요.`;
    } else if(definition?.type === 'surface.object') {
      this.elements.selectedDetail.textContent = '가까운 책상이나 탁자 위에 올릴 수 있어요.';
    } else {
      this.elements.selectedDetail.textContent = '바닥에 놓여 있어요.';
    }
  }

  updateCommandState() {
    const selected = this.getSelectedItem();
    this.elements.commandButtons.forEach(button => {
      const command = button.dataset.command;
      const definition = selected ? getItemDefinition(selected.itemId) : null;
      if(command === 'place-surface') {
        button.disabled = !selected || definition?.type !== 'surface.object' || selected.anchor === 'surface';
        return;
      }
      if(command === 'detach-surface' || command === 'next-surface-slot') {
        button.disabled = !selected || definition?.type !== 'surface.object' || selected.anchor !== 'surface';
        return;
      }
      if(command === 'nudge-surface') {
        button.disabled = !selected || definition?.type !== 'surface.object' || selected.anchor !== 'surface';
        return;
      }
      if(command === 'attach-seat') {
        button.disabled = !selected || definition?.type !== 'seat.object';
        return;
      }
      button.disabled = command !== 'clear' && !selected;
    });

    if(this.elements.wallHeightInput) {
      const wallHeight = Number(this.state.preset.currentWallHeight ?? this.state.preset.wallHeight);
      this.elements.wallHeightInput.value = String(wallHeight);
      if(this.elements.wallHeightValue) this.elements.wallHeightValue.textContent = String(wallHeight);
    }
  }

  canUseSurfaceCommands(item) {
    if(!item) return false;
    const definition = getItemDefinition(item.itemId);
    return definition?.type === 'surface.object';
  }

  canUseSeatCommands(item) {
    if(!item) return false;
    const definition = getItemDefinition(item.itemId);
    return definition?.type === 'seat.object';
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clonePreset(preset) {
  return {
    ...preset,
    currentWallHeight: preset.currentWallHeight ?? preset.wallHeight,
    grid: { ...preset.grid },
    assets: { ...preset.assets },
    defaultPlaced: preset.defaultPlaced.map(item => ({ ...item })),
    shellDecor: preset.shellDecor?.map(item => ({ ...item })) || undefined
  };
}
