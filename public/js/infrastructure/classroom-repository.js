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
      routines: []
    };
  }

  function getClassroomFunctions(deps = {}) {
    return deps.getFirebaseFunctions?.() || null;
  }

  function getClassroomDb(deps = {}) {
    return deps.getFirestoreDb?.() || null;
  }

  function buildClassroomQuestProgressId(memberUserId, questId, dateKey = '') {
    return root.DJ48ClassroomDomain.buildClassroomQuestProgressId(memberUserId, questId, dateKey);
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
      return Array.isArray(response?.data?.students) ? response.data.students : getEmptyClassroomStudentCards();
    } catch(error) {
      deps.warn?.('Classroom student cards load failed.', error);
      return getEmptyClassroomStudentCards();
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
    const { settings = {}, memberUserId = '' } = options;
    const db = getClassroomDb(deps);
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

  async function loadClassroomReviewItems(options = {}, deps = {}) {
    const { settings = {}, canReview = false } = options;
    const db = getClassroomDb(deps);
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

  async function loadClassroomQuestProgress(options = {}, deps = {}) {
    const { settings = {}, memberUserId = '' } = options;
    const db = getClassroomDb(deps);
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

  function createClassroomRepository(deps = {}) {
    const firestoreDeps = {
      getFirestoreDb: deps.getFirestoreDb,
      getFirestoreFieldValue: deps.getFirestoreFieldValue,
      warn: deps.warn
    };
    const callableDeps = {
      getFirebaseFunctions: deps.getFirebaseFunctions,
      warn: deps.warn
    };

    return {
      loadClassroomSettings: options => root.DJ48ClassroomData.loadClassroomSettings(options, firestoreDeps),
      loadClassroomQuestProgress: options => loadClassroomQuestProgress(options, firestoreDeps),
      loadClassroomWallet: options => loadClassroomWallet(options, firestoreDeps),
      loadClassroomGemProgress: options => loadClassroomGemProgress(options, firestoreDeps),
      loadClassroomStudentCards: options => loadClassroomStudentCards(options, callableDeps),
      loadClassroomEconomyBoard: options => loadClassroomEconomyBoard(options, callableDeps),
      loadClassroomReviewItems: options => loadClassroomReviewItems(options, firestoreDeps),
      setClassroomSelectedBadge: options => root.DJ48ClassroomData.setClassroomSelectedBadge(options, callableDeps),
      saveClassroomQuest: options => root.DJ48ClassroomData.saveClassroomQuest(options, callableDeps),
      awardClassroomBadgeCampaign: options => root.DJ48ClassroomData.awardClassroomBadgeCampaign(options, callableDeps),
      saveClassroomJob: options => root.DJ48ClassroomData.saveClassroomJob(options, callableDeps),
      saveClassroomShopItem: options => root.DJ48ClassroomData.saveClassroomShopItem(options, callableDeps),
      callClassroomEconomyAction: (functionName, payload, options) => (
        root.DJ48ClassroomData.callClassroomEconomyAction(functionName, payload, options, callableDeps)
      ),
      saveClassroomRoutine: options => root.DJ48ClassroomData.saveClassroomRoutine(options, callableDeps),
      completeClassroomAutoQuest: options => root.DJ48ClassroomData.completeClassroomAutoQuest(options, callableDeps),
      saveClassroomManualQuestProgress: options => root.DJ48ClassroomData.saveClassroomManualQuestProgress({
        ...options,
        db: deps.getFirestoreDb?.()
      }, firestoreDeps),
      reviewClassroomQuestProgress: options => root.DJ48ClassroomData.reviewClassroomQuestProgress(options, callableDeps)
    };
  }

  const api = {
    createClassroomRepository
  };

  root.DJ48ClassroomRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
