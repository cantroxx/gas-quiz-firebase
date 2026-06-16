(function (root) {
  function getDefaultControllerSections(deps = {}) {
    return [
      { controller: deps.appEventsController, bind: 'bindCommonAppEvents', events: deps.commonAppEvents },
      { controller: deps.eventController, bind: 'bindEventPlazaEvents', events: deps.eventEvents },
      { controller: deps.classroomController, bind: 'bindClassroomEvents', events: deps.classroomEvents },
      { controller: deps.schoolController, bind: 'bindSchoolQuizSelectEvents', events: deps.schoolEvents },
      { controller: deps.quizController, bind: 'bindQuizPlayEvents', events: deps.quizEvents },
      { controller: deps.shopController, bind: 'bindShopRoomEvents', events: deps.shopEvents },
      { controller: deps.homeController, bind: 'bindProfileHomeEvents', events: deps.homeEvents },
      { controller: deps.adminController, bind: 'bindAdminEvents', events: deps.adminEvents },
      { controller: deps.accountController, bind: 'bindAccountEvents', events: deps.accountEvents }
    ];
  }

  function getControllerSectionsFromRegistry(registry = {}) {
    const order = [
      ['appEvents', 'bindCommonAppEvents'],
      ['event', 'bindEventPlazaEvents'],
      ['classroom', 'bindClassroomEvents'],
      ['school', 'bindSchoolQuizSelectEvents'],
      ['quiz', 'bindQuizPlayEvents'],
      ['shop', 'bindShopRoomEvents'],
      ['home', 'bindProfileHomeEvents'],
      ['admin', 'bindAdminEvents'],
      ['account', 'bindAccountEvents']
    ];
    return order.map(([key, bind]) => ({
      controller: registry.controllers?.[key],
      bind,
      events: registry.events?.[key]
    }));
  }

  function bindControllerSections(sections = []) {
    sections.forEach(section => {
      const bind = section?.bind;
      if(!bind || typeof section?.controller?.[bind] !== 'function') return;
      section.controller[bind](section.events);
    });
  }

  function bindAppControllers(deps = {}) {
    bindControllerSections(deps.controllerSections || getDefaultControllerSections(deps));
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
    getDefaultControllerSections,
    getControllerSectionsFromRegistry,
    bindControllerSections,
    bindAppControllers,
    createRoomDecorInitializer,
    startApp
  };

  root.DJ48AppBootstrap = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
