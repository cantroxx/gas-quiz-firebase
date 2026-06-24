(function (root) {
  function getEmptyClassroomStudentCards() {
    return [];
  }

  function getEmptyClassroomEconomyBoard() {
    return {
      jobs: [],
      shopItems: [],
      applications: [],
      assignments: [],
      routines: [],
      purchases: [],
      pointLogs: [],
      classNotices: { slots: [] },
      billboardMessages: [],
      classMission: null,
      publicWallet: { point: 0 },
      myDjCoin: 0,
      exchangeSettings: {
        pointToCoinEnabled: true,
        coinToPointEnabled: true,
        pointToCoinPointCost: 10,
        coinToPointReward: 10
      },
      groupPurchases: [],
      savingsProducts: [],
      savingsAccounts: [],
      taxPresets: [],
      classroomGems: []
    };
  }

  function normalizeClassroomWallet(data = {}) {
    return {
      ...data,
      point: Number(data.point ?? data.berry ?? 0) || 0
    };
  }

  function getClassroomFunctions(deps = {}) {
    return deps.getFirebaseFunctions?.() || null;
  }

  function getRequiredClassroomFunctions(deps = {}, unavailableMessage = 'functions-unavailable') {
    const functions = getClassroomFunctions(deps);
    if(!functions) throw new Error(unavailableMessage);
    return functions;
  }

  function getClassroomDb(deps = {}) {
    return deps.getFirestoreDb?.() || null;
  }

  function buildClassroomQuestProgressId(memberUserId, questId, dateKey = '') {
    return root.DJ48ClassroomDomain.buildClassroomQuestProgressId(memberUserId, questId, dateKey);
  }

  function getKstDateKey() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  function normalizeClassroomSettings(data = {}, prototype = {}) {
    return root.DJ48ClassroomDomain.normalizeClassroomSettings(data, prototype);
  }

  async function loadClassroomSettings(options = {}, deps = {}) {
    const prototype = options.prototype || {};
    const db = getClassroomDb(deps);
    if(!db) return normalizeClassroomSettings({}, prototype);
    try {
      const snapshot = await db.collection('classrooms').doc(prototype.classId).get();
      return normalizeClassroomSettings(snapshot.exists ? snapshot.data() : {}, prototype);
    } catch(error) {
      deps.warn?.('Classroom settings load failed. Using prototype fallback.', error);
      return normalizeClassroomSettings({}, prototype);
    }
  }

  async function loadClassroomStudentCards(options = {}, deps = {}) {
    const { settings = {}, memberUserId = '' } = options;
    if(!memberUserId) return getEmptyClassroomStudentCards();
    const functions = getClassroomFunctions(deps);
    if(!functions) return getEmptyClassroomStudentCards();
    try {
      const callable = functions.httpsCallable('getClassroomStudentCards');
      const response = await callable({
        classId: settings.classId,
        memberUserId
      });
      const students = Array.isArray(response?.data?.students) ? response.data.students : getEmptyClassroomStudentCards();
      return mergeClassroomStudentLevelSummaries(students, deps);
    } catch(error) {
      deps.warn?.('Classroom student cards load failed.', error);
      return getEmptyClassroomStudentCards();
    }
  }

  async function mergeClassroomStudentLevelSummaries(students = [], deps = {}) {
    const db = getClassroomDb(deps);
    const memberIds = Array.from(new Set(students.map(student => String(student.memberUserId || student.userId || '').trim()).filter(Boolean)));
    if(!db || !memberIds.length) return students;
    try {
      const snapshots = await Promise.all(memberIds.map(id => db.collection('userLevelSummary').doc(id).get().catch(() => null)));
      const levelMap = {};
      snapshots.forEach((snapshot, index) => {
        if(snapshot?.exists) {
          const summary = snapshot.data() || {};
          const totalXp = Math.max(0, Math.round(Number(summary.totalXp) || 0));
          const level = Math.min(50, Math.floor(totalXp / 50) + 1);
          levelMap[memberIds[index]] = {
            ...summary,
            level,
            xp: level >= 50 ? 0 : totalXp % 50,
            totalXp,
            nextLevelXp: level >= 50 ? 0 : 50
          };
        }
      });
      return students.map(student => {
        const id = String(student.memberUserId || student.userId || '').trim();
        return levelMap[id] ? { ...student, levelSummary: levelMap[id] } : student;
      });
    } catch(error) {
      deps.warn?.('Classroom student level summaries load failed.', error);
      return students;
    }
  }

  async function loadClassroomEconomyBoard(options = {}, deps = {}) {
    const { settings = {}, memberUserId = '' } = options;
    if(!memberUserId) return getEmptyClassroomEconomyBoard();
    const functions = getClassroomFunctions(deps);
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
        purchases: Array.isArray(data.purchases) ? data.purchases : [],
        pointLogs: Array.isArray(data.pointLogs) ? data.pointLogs : [],
        classNotices: data.classNotices || { slots: [] },
        billboardMessages: Array.isArray(data.billboardMessages) ? data.billboardMessages : [],
        classMission: data.classMission || null,
        publicWallet: data.publicWallet || { point: 0 },
        myDjCoin: Number(data.myDjCoin || 0),
        exchangeSettings: data.exchangeSettings || {
          pointToCoinEnabled: true,
          coinToPointEnabled: true,
          pointToCoinPointCost: 10,
          coinToPointReward: 10
        },
        groupPurchases: Array.isArray(data.groupPurchases) ? data.groupPurchases : [],
        savingsProducts: Array.isArray(data.savingsProducts) ? data.savingsProducts : [],
        savingsAccounts: Array.isArray(data.savingsAccounts) ? data.savingsAccounts : [],
        taxPresets: Array.isArray(data.taxPresets) ? data.taxPresets : [],
        classroomGems: Array.isArray(data.classroomGems) ? data.classroomGems : [],
        myAssignment: data.myAssignment || null
      };
    } catch(error) {
      deps.warn?.('Classroom economy board load failed.', error);
      return getEmptyClassroomEconomyBoard();
    }
  }

  async function loadClassroomWallet(options = {}, deps = {}) {
    const { settings = {}, memberUserId = '' } = options;
    const db = getClassroomDb(deps);
    if(!memberUserId || !db) return { point: 0 };
    try {
      const snapshot = await db.collection('classrooms')
        .doc(settings.classId)
        .collection('studentWallets')
        .doc(memberUserId)
        .get();
      return snapshot.exists ? normalizeClassroomWallet(snapshot.data() || {}) : { point: 0 };
    } catch(error) {
      deps.warn?.('Classroom wallet load failed.', error);
      return { point: 0 };
    }
  }

  async function loadClassroomGemProgress(options = {}, deps = {}) {
    const { settings = {}, memberUserId = '' } = options;
    const db = getClassroomDb(deps);
    if(!memberUserId || !db) return [];
    try {
      const [progressSnapshot, catalogSnapshot] = await Promise.all([
        db.collection('classrooms')
        .doc(settings.classId)
        .collection('studentGemProgress')
        .where('memberUserId', '==', memberUserId)
        .get(),
        db.collection('classrooms')
          .doc(settings.classId)
          .collection('classroomGems')
          .where('active', '==', true)
          .get()
      ]);
      const progressByGemId = new Map(progressSnapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        return [String(data.gemId || doc.id), data];
      }));
      catalogSnapshot.docs.forEach(doc => {
        const gem = { gemId: doc.id, ...doc.data() };
        const progress = progressByGemId.get(String(gem.gemId || doc.id));
        progressByGemId.set(String(gem.gemId || doc.id), {
          ...gem,
          ...(progress || {}),
          currentXp: Number(progress?.currentXp || 0),
          targetXp: Number(progress?.targetXp || gem.targetXp || 10),
          rewardPoint: Number(progress?.rewardPoint || gem.rewardPoint || 0),
          rewardCoin: Number(progress?.rewardCoin || gem.rewardCoin || 0),
          completed: progress?.completed === true
        });
      });
      return Array.from(progressByGemId.values()).sort((a, b) => String(a.gemName || a.gemId).localeCompare(String(b.gemName || b.gemId), 'ko'));
    } catch(error) {
      if(!deps.isFirestorePermissionDeniedError?.(error)) {
        deps.warn?.('Classroom gem progress load failed.', error);
      }
      return [];
    }
  }

  async function loadClassroomReviewItems(options = {}, deps = {}) {
    const { settings = {}, canReview = false } = options;
    if(!canReview) return [];
    const functions = getClassroomFunctions(deps);
    if(!functions) return [];
    try {
      const callable = functions.httpsCallable('getClassroomReviewItems');
      const response = await callable({
        classId: settings.classId
      });
      return Array.isArray(response?.data?.reviewItems) ? response.data.reviewItems : [];
    } catch(error) {
      deps.warn?.('Classroom review items load failed.', error);
      return [];
    }
  }

  async function loadClassroomQuestProgress(options = {}, deps = {}) {
    const { settings = {}, memberUserId = '' } = options;
    const db = getClassroomDb(deps);
    if(!memberUserId || !db) return {};
    const todayKey = getKstDateKey();
    const saveEnabledQuests = (settings.quests || []).filter(quest => quest.saveEnabled);
    const entries = await Promise.all(saveEnabledQuests.map(async quest => {
      const recordId = buildClassroomQuestProgressId(memberUserId, quest.id, quest.rewardMode === 'auto' ? todayKey : '');
      const snapshot = await db.collection('classrooms')
        .doc(settings.classId)
        .collection('questProgress')
        .doc(recordId)
        .get()
        .catch(() => null);
      const data = snapshot?.exists ? snapshot.data() : null;
      if(['cancelled', 'rejected'].includes(String(data?.rewardStatus || ''))) return [quest.id, null];
      return [quest.id, data];
    }));
    return Object.fromEntries(entries.filter(([, data]) => !!data));
  }

  async function verifyClassroomEntryCode(options = {}, deps = {}) {
    if(!options.memberUserId) throw new Error('classroom-member-unavailable');
    const functions = getRequiredClassroomFunctions(deps, 'classroom-entry-functions-unavailable');
    const callable = functions.httpsCallable('verifyClassroomEntryCode');
    const response = await callable({
      classId: options.classId,
      memberUserId: options.memberUserId,
      entryCode: options.entryCode
    });
    return response?.data || {};
  }

  async function setClassroomSelectedBadge(options = {}, deps = {}) {
    if(!options.memberUserId) throw new Error('classroom-member-unavailable');
    const functions = getRequiredClassroomFunctions(deps, 'classroom-badge-select-functions-unavailable');
    const callable = functions.httpsCallable('setClassroomSelectedBadge');
    await callable({
      classId: options.classId,
      memberUserId: options.memberUserId,
      badgeType: options.badgeType || 'gem',
      badgeId: options.badgeId
    });
  }

  async function saveClassroomQuest(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-quest-functions-unavailable');
    const values = options.values || {};
    const callable = functions.httpsCallable('saveClassroomQuest');
    await callable({
      classId: options.classId,
      quest: {
        id: values.id,
        title: values.title,
        desc: values.desc,
        rewardCoin: values.rewardCoin,
        rewardCurrency: values.rewardCurrency,
        rewardMode: values.rewardMode,
        category: values.category,
        startDate: values.startDate,
        endDate: values.endDate,
        targetStudentIds: values.targetStudentIds,
        repeatRule: values.repeatRule,
        linkedGemId: values.linkedGemId,
        linkedGemName: values.linkedGemName,
        linkedGemIds: values.linkedGemIds,
        linkedGemNames: values.linkedGemNames,
        gemXp: values.gemXp,
        gemTargetXp: values.gemTargetXp,
        gemRewardPoint: values.gemRewardPoint,
        gemRewardCoin: values.gemRewardCoin,
        active: values.active !== false,
        type: values.rewardMode === 'quizAchieved' ? '달성형 · 미니퀴즈' : '수락형 · 체크형'
      }
    });
  }

  async function awardClassroomBadgeCampaign(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-badge-functions-unavailable');
    const callable = functions.httpsCallable('awardClassroomBadgeCampaign');
    const response = await callable({
      classId: options.classId,
      campaign: options.values || {}
    });
    return response?.data || {};
  }

  async function saveClassroomJob(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-job-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomJob');
    await callable({
      classId: options.classId,
      job: options.values || {}
    });
  }

  async function deleteClassroomJob(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-job-functions-unavailable');
    const callable = functions.httpsCallable('deleteClassroomJob');
    await callable({
      classId: options.classId,
      jobId: options.jobId
    });
  }

  async function saveClassroomShopItem(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-shop-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomShopItem');
    await callable({
      classId: options.classId,
      item: options.values || {}
    });
  }

  async function deleteClassroomShopItem(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-shop-functions-unavailable');
    const callable = functions.httpsCallable('deleteClassroomShopItem');
    await callable({
      classId: options.classId,
      itemId: options.itemId
    });
  }

  async function deleteClassroomQuest(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-quest-functions-unavailable');
    const callable = functions.httpsCallable('deleteClassroomQuest');
    await callable({
      classId: options.classId,
      questId: options.questId
    });
  }

  async function saveClassroomNotices(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-notice-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomNotices');
    await callable({
      classId: options.classId,
      slots: options.slots || []
    });
  }

  async function saveClassroomMissionConfig(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-mission-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomMissionConfig');
    const response = await callable({
      classId: options.classId,
      mission: options.values || {}
    });
    return response?.data || {};
  }

  async function saveClassroomGroupPurchase(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-group-purchase-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomGroupPurchase');
    const response = await callable({
      classId: options.classId,
      groupPurchase: options.values || {}
    });
    return response?.data || {};
  }

  async function saveClassroomSavingsProduct(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-savings-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomSavingsProduct');
    const response = await callable({
      classId: options.classId,
      product: options.values || {}
    });
    return response?.data || {};
  }

  async function saveClassroomExchangeSettings(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-exchange-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomExchangeSettings');
    const response = await callable({
      classId: options.classId,
      settings: options.values || {}
    });
    return response?.data || {};
  }

  async function saveClassroomTaxPreset(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-tax-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomTaxPreset');
    const response = await callable({
      classId: options.classId,
      preset: options.values || {}
    });
    return response?.data || {};
  }

  async function saveClassroomGem(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-gem-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomGem');
    const response = await callable({
      classId: options.classId,
      gem: options.values || {}
    });
    return response?.data || {};
  }

  async function callClassroomEconomyAction(functionName, payload = {}, options = {}, deps = {}) {
    if(!options.memberUserId) throw new Error('classroom-member-unavailable');
    const functions = getRequiredClassroomFunctions(deps, 'classroom-economy-functions-unavailable');
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
    const functions = getRequiredClassroomFunctions(deps, 'classroom-routine-functions-unavailable');
    const callable = functions.httpsCallable('saveClassroomRoutine');
    await callable({
      classId: options.classId,
      memberUserId: options.memberUserId,
      routine: options.values || {}
    });
  }

  async function completeClassroomAutoQuest(options = {}, deps = {}) {
    if(!options.memberUserId) throw new Error('classroom-member-unavailable');
    const functions = getRequiredClassroomFunctions(deps, 'classroom-auto-quest-functions-unavailable');
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
      settings = {},
      quest = {},
      questId = '',
      memberUserId = ''
    } = options;
    if(!memberUserId) throw new Error('classroom-member-unavailable');
    const db = getClassroomDb(deps);
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
        questTitle: quest.title || '',
        questType: quest.type || '수락형 · 체크형',
        memberUserId,
        userId: memberUserId,
        checked: true,
        status: 'student_checked',
        rewardCoin: Number(quest.rewardCoin) || 0,
        rewardCurrency: 'point',
        rewardStatus: 'pending_teacher_review',
        source: 'firebase-app',
        version: 1,
        createdAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp()
      }, { merge: true });
    return { recordId };
  }

  async function reviewClassroomQuestProgress(options = {}, deps = {}) {
    const functions = getRequiredClassroomFunctions(deps, 'classroom-review-functions-unavailable');
    const callable = functions.httpsCallable('reviewClassroomQuestProgress');
    const response = await callable({
      classId: options.classId,
      recordId: options.recordId,
      nextStatus: options.nextStatus,
      ...(options.rewardPointOverride !== undefined ? { rewardPointOverride: options.rewardPointOverride } : {})
    });
    return response?.data || {};
  }

  function createClassroomRepository(deps = {}) {
    const firestoreDeps = {
      getFirestoreDb: deps.getFirestoreDb,
      getFirestoreFieldValue: deps.getFirestoreFieldValue,
      isFirestorePermissionDeniedError: deps.isFirestorePermissionDeniedError,
      warn: deps.warn
    };
    const callableDeps = {
      getFirestoreDb: deps.getFirestoreDb,
      getFirebaseFunctions: deps.getFirebaseFunctions,
      warn: deps.warn
    };

    return {
      loadClassroomSettings: options => loadClassroomSettings(options, firestoreDeps),
      loadClassroomQuestProgress: options => loadClassroomQuestProgress(options, firestoreDeps),
      loadClassroomWallet: options => loadClassroomWallet(options, firestoreDeps),
      loadClassroomGemProgress: options => loadClassroomGemProgress(options, firestoreDeps),
      loadClassroomStudentCards: options => loadClassroomStudentCards(options, callableDeps),
      loadClassroomEconomyBoard: options => loadClassroomEconomyBoard(options, callableDeps),
      loadClassroomReviewItems: options => loadClassroomReviewItems(options, callableDeps),
      verifyClassroomEntryCode: options => verifyClassroomEntryCode(options, callableDeps),
      setClassroomSelectedBadge: options => setClassroomSelectedBadge(options, callableDeps),
      saveClassroomQuest: options => saveClassroomQuest(options, callableDeps),
      deleteClassroomQuest: options => deleteClassroomQuest(options, callableDeps),
      awardClassroomBadgeCampaign: options => awardClassroomBadgeCampaign(options, callableDeps),
      saveClassroomJob: options => saveClassroomJob(options, callableDeps),
      deleteClassroomJob: options => deleteClassroomJob(options, callableDeps),
      saveClassroomShopItem: options => saveClassroomShopItem(options, callableDeps),
      deleteClassroomShopItem: options => deleteClassroomShopItem(options, callableDeps),
      saveClassroomNotices: options => saveClassroomNotices(options, callableDeps),
      saveClassroomMissionConfig: options => saveClassroomMissionConfig(options, callableDeps),
      saveClassroomGroupPurchase: options => saveClassroomGroupPurchase(options, callableDeps),
      saveClassroomSavingsProduct: options => saveClassroomSavingsProduct(options, callableDeps),
      saveClassroomExchangeSettings: options => saveClassroomExchangeSettings(options, callableDeps),
      saveClassroomTaxPreset: options => saveClassroomTaxPreset(options, callableDeps),
      saveClassroomGem: options => saveClassroomGem(options, callableDeps),
      callClassroomEconomyAction: (functionName, payload, options) => callClassroomEconomyAction(
        functionName,
        payload,
        options,
        callableDeps
      ),
      saveClassroomRoutine: options => saveClassroomRoutine(options, callableDeps),
      completeClassroomAutoQuest: options => completeClassroomAutoQuest(options, callableDeps),
      saveClassroomManualQuestProgress: options => saveClassroomManualQuestProgress(options, firestoreDeps),
      reviewClassroomQuestProgress: options => reviewClassroomQuestProgress(options, callableDeps)
    };
  }

  const api = {
    createClassroomRepository
  };

  root.DJ48ClassroomRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
