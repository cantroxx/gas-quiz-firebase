(function () {
  function getClassroomRewardCurrencyLabel(currency) {
    return currency === 'djCoin' ? 'DJ코인' : '베리';
  }

  function slugifyClassroomGemId(name) {
    return String(name || '')
      .trim()
      .toLowerCase()
      .replace(/[^0-9a-z가-힣_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  function normalizeClassroomQuestConfig(rawQuest = {}, index = 0) {
    const id = String(rawQuest.id || rawQuest.questId || `quest-${index + 1}`).trim();
    const rewardCoin = Math.max(0, Math.round(Number(rawQuest.rewardCoin) || 0));
    const rewardCurrency = 'berry';
    const rewardMode = ['auto', 'teacherReview', 'quizAchieved'].includes(rawQuest.rewardMode)
      ? rawQuest.rewardMode
      : 'auto';
    const rewardLabel = getClassroomRewardCurrencyLabel(rewardCurrency);
    const linkedGemName = String(rawQuest.linkedGemName || '').trim();
    const linkedGemId = String(rawQuest.linkedGemId || slugifyClassroomGemId(linkedGemName)).trim();
    const gemXp = Math.max(0, Math.round(Number(rawQuest.gemXp) || 0));
    return {
      id,
      questId: id,
      type: String(rawQuest.type || rawQuest.questType || '수락형 · 체크형').trim(),
      title: String(rawQuest.title || '교실 퀘스트').trim(),
      desc: String(rawQuest.desc || '').trim(),
      rewardMode,
      rewardCoin,
      rewardCurrency,
      status: String(rawQuest.status || (rewardMode === 'auto' ? '완료할 때마다 즉시 지급' : '학생 체크 후 완료 후보')).trim(),
      studentAction: String(rawQuest.studentAction || (rewardMode === 'auto' ? `완료하고 ${rewardCoin} ${rewardLabel} 받기` : '완료 체크')).trim().replace(/코인/g, '베리'),
      linkedGemId,
      linkedGemName,
      gemXp,
      gemTargetXp: Math.max(1, Math.round(Number(rawQuest.gemTargetXp) || 10)),
      gemRewardBerry: Math.max(0, Math.round(Number(rawQuest.gemRewardBerry) || 0)),
      saveEnabled: rawQuest.saveEnabled !== false,
      active: rawQuest.active !== false
    };
  }

  function normalizeClassroomSettings(data = {}, prototype = {}) {
    const prototypeQuests = Array.isArray(prototype.quests) ? prototype.quests : [];
    const quests = Array.isArray(data.quests) && data.quests.length ? data.quests : prototypeQuests;
    return {
      ...prototype,
      ...data,
      quests: quests.map(normalizeClassroomQuestConfig),
      routines: prototype.routines || []
    };
  }

  async function loadClassroomSettings(options = {}, deps = {}) {
    const prototype = options.prototype || {};
    const db = deps.getFirestoreDb?.();
    if(!db) return normalizeClassroomSettings({}, prototype);
    try {
      const snapshot = await db.collection('classrooms').doc(prototype.classId).get();
      return normalizeClassroomSettings(snapshot.exists ? snapshot.data() : {}, prototype);
    } catch(error) {
      deps.warn?.('Classroom settings load failed. Using prototype fallback.', error);
      return normalizeClassroomSettings({}, prototype);
    }
  }

  window.DJ48ClassroomData = {
    getClassroomRewardCurrencyLabel,
    slugifyClassroomGemId,
    normalizeClassroomQuestConfig,
    normalizeClassroomSettings,
    loadClassroomSettings
  };
})();
