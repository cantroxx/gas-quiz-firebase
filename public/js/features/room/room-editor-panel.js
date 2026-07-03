(function(global) {
  'use strict';

  function createRoomEditorPanel(elements, config, handlers, session) {
    bindActions();

    function render() {
      const snapshot = session.snapshot(false);
      elements.furnitureList.innerHTML = '';
      snapshot.furnitureCatalog.forEach(entry => {
        elements.furnitureList.appendChild(createFurnitureButton(entry, snapshot.editor.selectedFurnitureId));
      });
    }

    function createFurnitureButton(entry, selectedFurnitureId) {
      const button = document.createElement('button');
      const preview = document.createElement('img');
      const body = document.createElement('span');
      const name = document.createElement('strong');
      const meta = document.createElement('span');
      button.type = 'button';
      button.className = 'furniture-option';
      button.dataset.furnitureId = entry.furnitureId;
      button.setAttribute('aria-pressed', String(entry.furnitureId === selectedFurnitureId));

      preview.src = entry.imagePath;
      preview.alt = '';
      body.className = 'furniture-option-body';
      name.textContent = entry.name;
      meta.textContent = entry.blocks === false ? '장식' : '충돌';
      body.append(name, meta);
      button.append(preview, body);
      button.addEventListener('click', () => {
        handlers.selectFurniture(entry.furnitureId);
        render();
      });
      return button;
    }

    function bindActions() {
      elements.clearFurnitureButton.addEventListener('click', () => {
        handlers.selectFurniture(null);
        render();
      });
      elements.deletePlacementButton.addEventListener('click', () => {
        handlers.deleteSelectedPlacement();
        render();
      });
      elements.resetPlacementsButton.addEventListener('click', () => {
        handlers.resetPlacements();
        render();
      });
    }

    return {
      render
    };
  }

  global.DJ48RoomEditorPanel = {
    createRoomEditorPanel
  };
})(window);
