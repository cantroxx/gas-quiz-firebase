(function (root) {
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
      loadClassroomQuestProgress: options => root.DJ48ClassroomData.loadClassroomQuestProgress({
        ...options,
        db: deps.getFirestoreDb?.()
      }),
      loadClassroomWallet: options => root.DJ48ClassroomData.loadClassroomWallet({
        ...options,
        db: deps.getFirestoreDb?.()
      }, firestoreDeps),
      loadClassroomGemProgress: options => root.DJ48ClassroomData.loadClassroomGemProgress({
        ...options,
        db: deps.getFirestoreDb?.()
      }, firestoreDeps),
      loadClassroomStudentCards: options => root.DJ48ClassroomData.loadClassroomStudentCards(options, callableDeps),
      loadClassroomEconomyBoard: options => root.DJ48ClassroomData.loadClassroomEconomyBoard(options, callableDeps),
      loadClassroomReviewItems: options => root.DJ48ClassroomData.loadClassroomReviewItems({
        ...options,
        db: deps.getFirestoreDb?.()
      }, firestoreDeps),
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
