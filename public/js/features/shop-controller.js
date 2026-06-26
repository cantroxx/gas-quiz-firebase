(function () {
  function bindShopRoomEvents(deps = {}) {
    document.getElementById('shop-category-list')?.addEventListener('click', event => {
      const button = event.target.closest('[data-shop-tab]');
      if(!button) return;
      deps.setActiveShopTab?.(button.dataset.shopTab || 'all');
      deps.renderShop?.();
    });

    document.getElementById('shop-item-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-shop-item-id]');
      if(!button || button.disabled) return;
      if(button.dataset.shopAvatarAction === 'toggle') {
        deps.toggleAvatarEquipment?.(button.dataset.shopItemId);
        deps.renderShop?.();
        return;
      }
      deps.purchaseShopItem?.(button.dataset.shopItemId);
    });

    document.getElementById('owned-item-grid')?.addEventListener('click', event => {
      const card = event.target.closest('[data-room-item-id]');
      if(!card) return;
      deps.saveRoomItemSelection?.(card.dataset.roomItemId);
    });

    document.getElementById('owned-item-grid')?.addEventListener('keydown', event => {
      if(event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('[data-room-item-id]');
      if(!card) return;
      event.preventDefault();
      deps.saveRoomItemSelection?.(card.dataset.roomItemId);
    });
  }

  window.DJ48ShopController = {
    bindShopRoomEvents
  };
})();
