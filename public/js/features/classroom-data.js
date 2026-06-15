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

  async function loadClassroomQuestProgress(options = {}) {
    const { db, settings = {}, memberUserId = '' } = options;
    if(!memberUserId || !db) return {};
    const saveEnabledQuests = (settings.quests || []).filter(quest => quest.saveEnabled && quest.rewardMode !== 'auto');
    const entries = await Promise.all(saveEnabledQuests.map(async quest => {
      const recordId = buildClassroomQuestProgressId(memberUserId, quest.id);
      const snapshot = await db.collection('classrooms')
        .doc(settings.classId)
        .collection('questProgress')
        .doc(recordId)
        .get()
        .catch(() => null);
      return [quest.id, snapshot?.exists ? snapshot.data() : null];
    }));
    return Object.fromEntries(entries.filter(([, data]) => !!data));
  }

  async function loadClassroomWallet(options = {}, deps = {}) {
    const { db, settings = {}, memberUserId = '' } = options;
    if(!memberUserId || !db) return { berry: 0 };
    try {
      const snapshot = await db.collection('classrooms')
        .doc(settings.classId)
        .collection('studentWallets')
        .doc(memberUserId)
        .get();
      return snapshot.exists ? snapshot.data() : { berry: 0 };
    } catch(error) {
      deps.warn?.('Classroom wallet load failed.', error);
      return { berry: 0 };
    }
  }

  async function loadClassroomGemProgress(options = {}, deps = {}) {
    const { db, settings = {}, memberUserId = '' } = options;
    if(!memberUserId || !db) return [];
    try {
      const snapshot = await db.collection('classrooms')
        .doc(settings.classId)
        .collection('studentGemProgress')
        .where('memberUserId', '==', memberUserId)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(error) {
      deps.warn?.('Classroom gem progress load failed.', error);
      return [];
    }
  }

  async function loadClassroomStudentCards(options = {}, deps = {}) {
    const { settings = {}, memberUserId = '' } = options;
    if(!memberUserId) return [];
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) return [];
    try {
      const callable = functions.httpsCallable('getClassroomStudentCards');
      const response = await callable({
        classId: settings.classId,
        memberUserId
      });
      return Array.isArray(response?.data?.students) ? response.data.students : [];
    } catch(error) {
      deps.warn?.('Classroom student cards load failed.', error);
      return [];
    }
  }

  function getEmptyClassroomEconomyBoard() {
    return {
      jobs: [],
      shopItems: [],
      applications: [],
      assignments: [],
      routines: []
    };
  }

  async function loadClassroomEconomyBoard(options = {}, deps = {}) {
    const { settings = {}, memberUserId = '' } = options;
    if(!memberUserId) return getEmptyClassroomEconomyBoard();
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) return getEmptyClassroomEconomyBoard();
    try {
      const callable = functions.httpsCallable('getClassroomEconomyBoard');
      const response = await callable({
        classId: settings.classId,
        memberUserId
      });
      const data = response?.data || {};
      return {
        jobs: Array.isArray(data.jobs) ? data.jobs : [],
        shopItems: Array.isArray(data.shopItems) ? data.shopItems : [],
        applications: Array.isArray(data.applications) ? data.applications : [],
        assignments: Array.isArray(data.assignments) ? data.assignments : [],
        routines: Array.isArray(data.routines) ? data.routines : [],
        myAssignment: data.myAssignment || null
      };
    } catch(error) {
      deps.warn?.('Classroom economy board load failed.', error);
      return getEmptyClassroomEconomyBoard();
    }
  }

  async function loadClassroomReviewItems(options = {}, deps = {}) {
    const { db, settings = {}, canReview = false } = options;
    if(!canReview || !db) return [];
    try {
      const snapshot = await db.collection('classrooms')
        .doc(settings.classId)
        .collection('questProgress')
        .where('rewardStatus', '==', 'pending_teacher_review')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(error) {
      deps.warn?.('Classroom review items load failed.', error);
      return [];
    }
  }

  function getClassroomFunctions(deps = {}, unavailableMessage = 'functions-unavailable') {
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) throw new Error(unavailableMessage);
    return functions;
  }

  async function saveClassroomQuest(options = {}, deps = {}) {
    const functions = getClassroomFunctions(deps, 'classroom-quest-functions-unavailable');
    const values = options.values || {};
    const callable = functions.httpsCallable('saveClassroomQuest');
    await callable({
      classId: options.classId,
      quest: {
        title: values.title,
        desc: values.desc,
        rewardCoin: values.rewardCoin,
        rewardCurrency: values.rewardCurrency,
        rewardMode: values.rewardMode,
        linkedGemId: values.linkedGemId,
        linkedGemName: values.linkedGemName,
        gemXp: values.gemXp,
        gemTargetXp: values.gemTargetXp,
        gemRewardBerry: values.gemRewardBerry,
        type: values.rewardMode === 'quizAchieved' ? '달성형 · 미니퀴즈' : '수락형 · 체크형'
      }
    });
  }

  async function awardClassroomBadgeCampaign(options = {}, deps = {}) {
    const functions = getClassroomFunctions(deps, 'classroom-badge-functions-unavailable');
    const callable = functions.httpsCallable('awardClassroomBadgeCampaign');
    const response = await callable({
      classId: options.classId,
      campaign: options.values || {}
    });
    return response?.data || {};
  }

  async function saveClassroomJob(options = {}, deps = {}) {
    const functions = getClassroomFunctions(deps, 'classroom-job-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomJob');
    await callable({
      classId: options.classId,
      job: options.values || {}
    });
  }

  async function saveClassroomShopItem(options = {}, deps = {}) {
    const functions = getClassroomFunctions(deps, 'classroom-shop-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomShopItem');
    await callable({
      classId: options.classId,
      item: options.values || {}
    });
  }

  window.DJ48ClassroomData = {
    getClassroomRewardCurrencyLabel,
    slugifyClassroomGemId,
    normalizeClassroomQuestConfig,
    normalizeClassroomSettings,
    loadClassroomSettings,
    buildClassroomQuestProgressId,
    isCurrentClassroomTeacher,
    loadClassroomQuestProgress,
    loadClassroomWallet,
    loadClassroomGemProgress,
    loadClassroomStudentCards,
    loadClassroomEconomyBoard,
    loadClassroomReviewItems,
    getEmptyClassroomEconomyBoard,
    saveClassroomQuest,
    awardClassroomBadgeCampaign,
    saveClassroomJob,
    saveClassroomShopItem
  };
})();
