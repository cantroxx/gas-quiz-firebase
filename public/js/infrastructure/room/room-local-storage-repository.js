(function(global) {
  'use strict';

  function createRoomLocalStorageRepository(options) {
    const storage = options.storage || global.localStorage;
    const key = options.key || 'dj48.roomPrototype.limezu.v2';

    function load() {
      try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (error) {
        return null;
      }
    }

    function save(state) {
      try {
        storage.setItem(key, JSON.stringify(state));
        return true;
      } catch (error) {
        return false;
      }
    }

    function clear() {
      try {
        storage.removeItem(key);
        return true;
      } catch (error) {
        return false;
      }
    }

    return {
      clear,
      load,
      save
    };
  }

  global.DJ48RoomLocalStorageRepository = {
    createRoomLocalStorageRepository
  };
})(window);
