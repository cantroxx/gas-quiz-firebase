import { InteriorsRoomInteractionController } from './interaction-controller.js';
import { InteriorsRoomRenderer } from './renderer.js';

const stage = document.getElementById('interiors-room-stage');

const controller = new InteriorsRoomInteractionController({
  renderer: new InteriorsRoomRenderer(stage),
  elements: {
    presetButtons: [...document.querySelectorAll('[data-preset-choice]')],
    itemTray: document.getElementById('interiors-item-tray'),
    itemFilterButtons: [...document.querySelectorAll('[data-item-filter]')],
    exitButton: document.getElementById('interiors-exit-button'),
    resetButton: document.getElementById('interiors-reset-button'),
    commandButtons: [...document.querySelectorAll('[data-command]')],
    selectedCard: document.getElementById('interiors-selected-card'),
    selectedLabel: document.getElementById('interiors-selected-label'),
    selectedDetail: document.getElementById('interiors-selected-detail')
  }
});

controller.start();
