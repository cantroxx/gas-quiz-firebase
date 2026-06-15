(function () {
  function getClassroomRewardCurrencyLabel(currency) {
    return window.DJ48ClassroomDomain.getClassroomRewardCurrencyLabel(currency);
  }

  function slugifyClassroomGemId(name) {
    return window.DJ48ClassroomDomain.slugifyClassroomGemId(name);
  }

  function normalizeClassroomQuestConfig(rawQuest = {}, index = 0) {
    return window.DJ48ClassroomDomain.normalizeClassroomQuestConfig(rawQuest, index);
  }

  function normalizeClassroomSettings(data = {}, prototype = {}) {
    return window.DJ48ClassroomDomain.normalizeClassroomSettings(data, prototype);
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
    return window.DJ48ClassroomDomain.buildClassroomQuestProgressId(memberUserId, questId, dateKey);
  }

  function isCurrentClassroomTeacher(profile = {}, settings = {}) {
    return window.DJ48ClassroomDomain.isCurrentClassroomTeacher(profile, settings);
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

  async function callClassroomEconomyAction(functionName, payload = {}, options = {}, deps = {}) {
    if(!options.memberUserId) throw new Error('classroom-member-unavailable');
    const functions = getClassroomFunctions(deps, 'classroom-economy-functions-unavailable');
    const callable = functions.httpsCallable(functionName);
    const response = await callable({
      classId: options.classId,
      memberUserId: options.memberUserId,
      ...payload
    });
    return response?.data || {};
  }

  async function saveClassroomRoutine(options = {}, deps = {}) {
    if(!options.memberUserId) throw new Error('classroom-member-unavailable');
    const functions = getClassroomFunctions(deps, 'classroom-routine-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomRoutine');
    await callable({
      classId: options.classId,
      memberUserId: options.memberUserId,
      routine: options.values || {}
    });
  }

  function findClassroomQuest(settings = {}, questId = '') {
    return (settings.quests || []).find(item => item.id === questId) || null;
  }

  async function completeClassroomAutoQuest(options = {}, deps = {}) {
    if(!options.memberUserId) throw new Error('classroom-member-unavailable');
    const functions = getClassroomFunctions(deps, 'classroom-auto-quest-functions-unavailable');
    const callable = functions.httpsCallable('completeClassroomAutoQuest');
    const response = await callable({
      memberUserId: options.memberUserId,
      classId: options.classId,
      questId: options.questId
    });
    return response?.data || {};
  }

  async function saveClassroomManualQuestProgress(options = {}, deps = {}) {
    const {
      db,
      settings = {},
      quest = {},
      questId = '',
      memberUserId = ''
    } = options;
    if(!memberUserId) throw new Error('classroom-member-unavailable');
    if(!db) throw new Error('classroom-quest-progress-db-unavailable');
    const fieldValue = deps.getFirestoreFieldValue?.();
    const recordId = buildClassroomQuestProgressId(memberUserId, questId);
    await db.collection('classrooms')
      .doc(settings.classId)
      .collection('questProgress')
      .doc(recordId)
      .set({
        recordId,
        classId: settings.classId,
        questId,
        questType: quest.type || '수락형 · 체크형',
        memberUserId,
        userId: memberUserId,
        checked: true,
        status: 'student_checked',
        rewardCoin: Number(quest.rewardCoin) || 0,
        rewardCurrency: 'berry',
        rewardStatus: 'pending_teacher_review',
        source: 'firebase-app',
        version: 1,
        createdAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp()
      }, { merge: true });
    return { recordId };
  }

  async function reviewClassroomQuestProgress(options = {}, deps = {}) {
    const functions = getClassroomFunctions(deps, 'classroom-review-functions-unavailable');
    const callable = functions.httpsCallable('reviewClassroomQuestProgress');
    const response = await callable({
      classId: options.classId,
      recordId: options.recordId,
      nextStatus: options.nextStatus
    });
    return response?.data || {};
  }

  async function setClassroomSelectedBadge(options = {}, deps = {}) {
    if(!options.memberUserId) throw new Error('classroom-member-unavailable');
    const functions = getClassroomFunctions(deps, 'classroom-badge-select-functions-unavailable');
    const callable = functions.httpsCallable('setClassroomSelectedBadge');
    await callable({
      classId: options.classId,
      memberUserId: options.memberUserId,
      badgeType: options.badgeType || 'gem',
      badgeId: options.badgeId
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
    saveClassroomShopItem,
    callClassroomEconomyAction,
    saveClassroomRoutine,
    findClassroomQuest,
    completeClassroomAutoQuest,
    saveClassroomManualQuestProgress,
    reviewClassroomQuestProgress,
    setClassroomSelectedBadge
  };
})();
