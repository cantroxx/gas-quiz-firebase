(function(global) {
  'use strict';

  function createRoomRenderer(elements, config) {
    const tileSize = config.render.tileSize;
    const frameSize = config.avatar.frameSize;
    const avatarScale = config.avatar.scale || 2.5;
    const sortBase = config.avatar.sortBase || 30;

    function render(snapshot) {
      renderPlacements(snapshot);
      renderAvatar(snapshot);
      renderTarget(snapshot.target);
      renderEditor(snapshot);
      elements.walkGrid.classList.toggle('is-visible', snapshot.showGrid);
      elements.positionLabel.textContent = `x ${snapshot.avatar.x}, y ${snapshot.avatar.y}, ${snapshot.directionLabel}`;
    }

    function renderAvatar(snapshot) {
      const avatar = snapshot.avatar;
      const frame = snapshot.avatarFrame;
      const layers = snapshot.avatarLayers && snapshot.avatarLayers.length
        ? snapshot.avatarLayers
        : snapshot.avatarAsset ? [snapshot.avatarAsset] : [];

      elements.avatar.innerHTML = '';
      layers.forEach((layer, index) => {
        const node = document.createElement('span');
        const sourceWidth = layer.sourceWidth || 1792;
        const sourceHeight = layer.sourceHeight || 1312;
        node.className = 'avatar-layer';
        node.style.backgroundImage = `url("${layer.imagePath}")`;
        node.style.backgroundSize = `${sourceWidth * avatarScale}px ${sourceHeight * avatarScale}px`;
        node.style.backgroundPosition = `-${frame[0] * frameSize}px -${frame[1] * frameSize}px`;
        node.style.zIndex = String(index + 1);
        elements.avatar.appendChild(node);
      });

      elements.avatar.style.left = `${avatar.x * tileSize}px`;
      elements.avatar.style.top = `${avatar.y * tileSize}px`;
      elements.avatar.style.zIndex = String(sortBase + avatar.y);
    }

    function renderPlacements(snapshot) {
      elements.placements.innerHTML = '';
      snapshot.placements.forEach(item => {
        const furniture = item.furniture;
        const placement = item.placement;
        const node = document.createElement('button');
        const image = document.createElement('img');
        const displayWidth = furniture.width * (furniture.scale || 2);
        const displayHeight = furniture.height * (furniture.scale || 2);
        node.type = 'button';
        node.className = 'furniture-placement';
        node.dataset.placementId = placement.placementId;
        node.setAttribute('aria-label', `${furniture.name} 선택`);
        node.setAttribute('aria-pressed', String(item.selected));
        node.style.height = `${displayHeight}px`;
        node.style.left = `${placement.x * tileSize}px`;
        node.style.top = `${(placement.y + 1) * tileSize - displayHeight}px`;
        node.style.width = `${displayWidth}px`;
        node.style.zIndex = String((furniture.sortBase || 12) + placement.y);
        image.src = furniture.imagePath;
        image.alt = '';
        image.draggable = false;
        node.addEventListener('click', event => {
          event.stopPropagation();
          elements.onPlacementSelect(placement.placementId);
        });
        node.appendChild(image);
        elements.placements.appendChild(node);
      });
    }

    function renderTarget(target) {
      if (!target) {
        elements.targetMarker.hidden = true;
        return;
      }
      elements.targetMarker.hidden = false;
      elements.targetMarker.style.left = `${target.x * tileSize + tileSize / 2}px`;
      elements.targetMarker.style.top = `${target.y * tileSize + tileSize / 2}px`;
    }

    function renderEditor(snapshot) {
      if (!elements.editorStatus) return;
      const selectedFurniture = snapshot.furnitureCatalog.find(item => item.furnitureId === snapshot.editor.selectedFurnitureId);
      const mode = selectedFurniture ? `배치: ${selectedFurniture.name}` : '이동/선택';
      elements.editorStatus.textContent = `${mode} · ${snapshot.editor.message}`;
    }

    return {
      render
    };
  }

  global.DJ48RoomRender = {
    createRoomRenderer
  };
})(window);
