(function(global) {
  'use strict';

  const CATEGORY_LABELS = {
    body: '몸',
    eyes: '눈',
    outfit: '의상',
    hair: '헤어',
    accessory: '액세서리'
  };

  function createRoomAvatarPanel(elements, config, handlers, session) {
    const order = config.avatar.partOrder || ['body', 'eyes', 'outfit', 'hair', 'accessory'];

    function render() {
      const snapshot = session.snapshot(false);
      const activeParts = snapshot.avatar.parts || {};
      elements.avatarList.innerHTML = '';
      order.forEach(type => {
        const entries = snapshot.avatarPartCatalog[type] || [];
        const group = document.createElement('section');
        const title = document.createElement('h3');
        const list = document.createElement('div');

        group.className = 'avatar-part-group';
        title.textContent = CATEGORY_LABELS[type] || type;
        list.className = 'avatar-part-list';
        group.append(title, list);

        if (type === 'accessory') {
          list.appendChild(createPartButton(type, { partId: 'none', name: '없음', imagePath: '' }, activeParts[type]));
        }

        entries.forEach(entry => {
          list.appendChild(createPartButton(type, entry, activeParts[type]));
        });
        elements.avatarList.appendChild(group);
      });
    }

    function createPartButton(type, entry, activePartId) {
      const button = document.createElement('button');
      const preview = document.createElement('span');
      const label = document.createElement('span');
      button.type = 'button';
      button.className = 'avatar-part-option';
      button.dataset.partType = type;
      button.dataset.partId = entry.partId;
      button.setAttribute('aria-pressed', String(entry.partId === activePartId));
      button.title = entry.name;

      preview.className = entry.imagePath ? 'avatar-part-preview' : 'avatar-part-preview is-empty';
      if (entry.imagePath) {
        preview.style.backgroundImage = `url("${entry.imagePath}")`;
        preview.style.backgroundSize = `${(entry.sourceWidth || 1792) * 1.375}px ${(entry.sourceHeight || 1312) * 1.375}px`;
        preview.style.backgroundPosition = '-528px 0';
      }

      label.textContent = entry.name;
      button.append(preview, label);
      button.addEventListener('click', () => {
        handlers.selectAvatarPart(type, entry.partId);
        render();
      });
      return button;
    }

    return {
      render
    };
  }

  global.DJ48RoomAvatarPanel = {
    createRoomAvatarPanel
  };
})(window);
