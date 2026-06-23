(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48ClassroomDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  function getClassroomRewardCurrencyLabel(currency) {
    return currency === 'djCoin' ? 'DJ코인' : '포인트';
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
    const rewardCurrency = 'point';
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
      studentAction: String(rawQuest.studentAction || (rewardMode === 'auto' ? `완료하고 ${rewardCoin} ${rewardLabel} 받기` : '완료 체크')).trim().replace(/코인/g, '포인트').replace(/베리/g, '포인트'),
      linkedGemId,
      linkedGemName,
      gemXp,
      gemTargetXp: Math.max(1, Math.round(Number(rawQuest.gemTargetXp) || 10)),
      gemRewardPoint: Math.max(0, Math.round(Number(rawQuest.gemRewardPoint) || 0)),
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

  function buildClassroomQuestProgressId(memberUserId, questId, dateKey = '') {
    return dateKey ? `${memberUserId}__${questId}__${dateKey}` : `${memberUserId}__${questId}`;
  }

  function isCurrentClassroomTeacher(profile = {}, settings = {}) {
    if(profile.role !== 'admin') return false;
    const adminLevel = String(profile.adminLevel || '').toLowerCase();
    if(['superadmin', 'fulladmin'].includes(adminLevel)) return true;
    if(adminLevel !== 'classadmin') return false;
    return String(profile.adminScopeGrade || profile.grade || '') === String(settings.grade || '')
      && String(profile.adminScopeClassNumber || profile.classNumber || '') === String(settings.classNumber || '');
  }

  function getClassroomQuestTitle(settings, questId) {
    const quest = (settings.quests || []).find(item => item.id === questId);
    return quest?.title || questId || '교실 퀘스트';
  }

  function getClassroomProgressStatusLabel(progress) {
    if(!progress) return '';
    if(progress.rewardStatus === 'paid') return '오늘 완료';
    if(progress.rewardStatus === 'approved') return '담임 승인됨';
    if(progress.rewardStatus === 'rejected') return '담임 반려됨';
    return '완료 후보 저장됨';
  }

  function getClassroomProgressButtonLabel(progress) {
    if(!progress) return '';
    if(progress.rewardStatus === 'paid') return '오늘은 완료했습니다.';
    if(progress.rewardStatus === 'approved') return '승인 완료';
    if(progress.rewardStatus === 'rejected') return '반려됨';
    return '저장 완료';
  }

  function getClassroomProgressStatusClass(progress) {
    if(progress?.rewardStatus === 'paid') return 'quest-status-claimed';
    if(progress?.rewardStatus === 'approved') return 'quest-status-claimed';
    if(progress?.rewardStatus === 'rejected') return 'quest-status-waiting';
    return 'quest-status-ready';
  }

  return {
    getClassroomRewardCurrencyLabel,
    slugifyClassroomGemId,
    normalizeClassroomQuestConfig,
    normalizeClassroomSettings,
    buildClassroomQuestProgressId,
    isCurrentClassroomTeacher,
    getClassroomQuestTitle,
    getClassroomProgressStatusLabel,
    getClassroomProgressButtonLabel,
    getClassroomProgressStatusClass
  };
});
