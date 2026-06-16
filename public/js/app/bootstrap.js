(function (root) {
  function bindAppControllers(deps = {}) {
    deps.appEventsController?.bindCommonAppEvents(deps.commonAppEvents);
    deps.eventController?.bindEventPlazaEvents(deps.eventEvents);
    deps.classroomController?.bindClassroomEvents(deps.classroomEvents);
    deps.schoolController?.bindSchoolQuizSelectEvents(deps.schoolEvents);
    deps.quizController?.bindQuizPlayEvents(deps.quizEvents);
    deps.shopController?.bindShopRoomEvents(deps.shopEvents);
    deps.homeController?.bindProfileHomeEvents(deps.homeEvents);
    deps.adminController?.bindAdminEvents(deps.adminEvents);
    deps.accountController?.bindAccountEvents(deps.accountEvents);
  }

  function createRoomDecorInitializer(options = {}, deps = {}) {
    let initialized = false;
    return function initializeRoomDecorIfAvailable() {
      if(initialized) return false;
      const roomDecor = deps.getRoomDecor?.() || root.RoomDecor;
      if(!roomDecor || typeof roomDecor.init !== 'function') return false;
      try {
        roomDecor.init({
          getUserId: options.getUserId,
          onBack: options.onBack
        });
        initialized = true;
        return true;
      } catch(error) {
        deps.warn?.('RoomDecor init failed.', error);
        return false;
      }
    };
  }

  function startApp(options = {}, deps = {}) {
    bindAppControllers(deps);
    const initializeRoomDecor = createRoomDecorInitializer({
      getUserId: options.getRoomDecorUserId,
      onBack: options.onRoomDecorBack
    }, {
      getRoomDecor: deps.getRoomDecor,
      warn: deps.warn
    });

    const authPromise = Promise.resolve().then(() => deps.initializeAuthUser?.());
    return authPromise.finally(() => {
      initializeRoomDecor();
      deps.addWindowLoadListener?.(initializeRoomDecor);
      deps.defer?.(initializeRoomDecor);
    });
  }

  const api = {
    bindAppControllers,
    createRoomDecorInitializer,
    startApp
  };

  root.DJ48AppBootstrap = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
