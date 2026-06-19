import { ROOM_ITEMS, getItemDefinition } from './asset-manifest.js';
import { ROOM_SHELL_PRESETS, cloneDefaultPlaced, getShellPreset } from './shell-presets.js';

export class InteriorsRoomInteractionController {
  constructor({ renderer, elements }) {
    this.renderer = renderer;
    this.elements = elements;
    this.itemFilter = 'all';
    this.isDirty = false;
    this.state = {
      preset: getShellPreset('interiors_room'),
      items: cloneDefaultPlaced(getShellPreset('interiors_room')),
      selectedId: null
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

    this.renderer.stage.addEventListener('click', () => {
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
      this.addItem(button.dataset.addItem);
    });

    this.elements.exitButton.addEventListener('click', () => {
      this.exitToHome();
    });

    this.elements.resetButton.addEventListener('click', () => {
      if(this.isDirty && !window.confirm('처음 상태로 돌릴까요? 지금 꾸민 내용은 사라져요.')) return;
      this.state.items = cloneDefaultPlaced(this.state.preset);
      this.state.selectedId = null;
      this.isDirty = false;
      this.render();
    });

    this.elements.commandButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.runCommand(button);
      });
    });

    window.addEventListener('resize', () => this.render());
  }

  selectPreset(presetId) {
    if(presetId === this.state.preset.id) return;
    if(this.isDirty && !window.confirm('방을 바꾸면 꾸민 내용이 처음 상태로 돌아가요. 바꿀까요?')) return;
    const preset = getShellPreset(presetId);
    this.state.preset = preset;
    this.state.items = cloneDefaultPlaced(preset);
    this.state.selectedId = null;
    this.isDirty = false;
    this.render();
  }

  exitToHome() {
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

    if(command === 'rotate') {
      this.rotateItem(selected);
    } else if(command === 'move-floor') {
      this.moveFloorItem(selected, Number(button.dataset.dx), Number(button.dataset.dy));
    } else if(command === 'move-wall') {
      this.moveWallItem(selected, Number(button.dataset.ds));
    } else if(command === 'wall-height') {
      this.changeWallHeight(selected, Number(button.dataset.dh));
    }

    this.isDirty = true;
    this.render();
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

    if(!selected) {
      this.elements.selectedLabel.textContent = '물건을 골라보세요';
      this.elements.selectedDetail.textContent = this.isDirty
        ? '아직 저장되지 않았어요. 지금은 연습장처럼 꾸며볼 수 있어요.'
        : '보관함에서 물건을 놓거나 방 안의 물건을 눌러요.';
      return;
    }

    const definition = getItemDefinition(selected.itemId);
    this.elements.selectedLabel.textContent = definition ? `${definition.name} 선택됨` : '물건 선택됨';
    this.elements.selectedDetail.textContent = selected.anchor === 'wall'
      ? `${selected.wall === 'left' ? '왼쪽 벽' : '오른쪽 벽'}에 붙어 있어요.`
      : '바닥에 놓여 있어요.';
  }

  updateCommandState() {
    const selected = this.getSelectedItem();
    this.elements.commandButtons.forEach(button => {
      button.disabled = button.dataset.command !== 'clear' && !selected;
    });
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
