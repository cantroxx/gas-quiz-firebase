(function () {
  function getClassroomRewardCurrencyLabel(currency) {
    return window.DJ48ClassroomDomain.getClassroomRewardCurrencyLabel(currency);
  }

  function slugifyClassroomGemId(name) {
    return window.DJ48ClassroomDomain.slugifyClassroomGemId(name);
  }

  function isCurrentClassroomTeacher(profile = {}, settings = {}) {
    return window.DJ48ClassroomDomain.isCurrentClassroomTeacher(profile, settings);
  }

  function findClassroomQuest(settings = {}, questId = '') {
    return (settings.quests || []).find(item => item.id === questId) || null;
  }

  window.DJ48ClassroomData = {
    getClassroomRewardCurrencyLabel,
    slugifyClassroomGemId,
    isCurrentClassroomTeacher,
    findClassroomQuest
  };
})();
