(function (root) {
  function createHomeRepository(deps = {}) {
    function getFirestoreDb() {
      return deps.getFirestoreDb?.() || null;
    }

    function getFirebaseFunctions() {
      return deps.getFirebaseFunctions?.() || null;
    }

    return {
      getUserEconomyForRender() {
        return deps.getUserEconomyForRender?.();
      },
      async getDailyRewardStatus(memberUserId) {
        const functions = getFirebaseFunctions();
        if(!functions || !memberUserId) return null;
        const callable = functions.httpsCallable('getDailyRewardStatus');
        const response = await callable({ memberUserId });
        return response?.data || null;
      },
      async getUserTitleSummary(memberUserId) {
        const db = getFirestoreDb();
        if(!db || !memberUserId) return null;
        return db.collection('userTitleSummary').doc(memberUserId).get().catch(() => null);
      },
      async getUserLevelSummary(memberUserId) {
        const db = getFirestoreDb();
        if(!db || !memberUserId) return null;
        return db.collection('userLevelSummary').doc(memberUserId).get().catch(() => null);
      },
      async getUserTitles(memberUserId) {
        const db = getFirestoreDb();
        if(!db || !memberUserId) return null;
        return db.collection('userTitles').doc(memberUserId).collection('titles').get().catch(() => null);
      },
      async syncTitles(memberUserId) {
        const response=await getFirebaseFunctions().httpsCallable('syncMemberTitles')({memberUserId});
        return response.data;
      },
      async getUserBadges(memberUserId) {
        const response=await getFirebaseFunctions().httpsCallable('getMemberAchievements')({memberUserId});
        return {gameHonors:response.data.gameHonors||{},docs:response.data.records.map(row=>({id:row.badgeId,data:()=>({...row,
          correct:row.answered%100,total:100,starCount:Math.floor(row.answered/100),
          completed:row.answered>=100,progressPercent:row.answered%100
        })}))};
      },
      async loadTitleCatalog(options = {}) {
        const memberUserId=root.DJ48AccountState?.getCurrentMemberUserId?.();
        const response=await getFirebaseFunctions().httpsCallable('getMemberAchievements')({memberUserId});
        const normalize=options.normalizeTitleCatalogDoc||(doc=>doc.data());
        return response.data.catalog.map(row=>normalize({id:row.titleId,data:()=>row}));
      }
    };
  }

  const api = {
    createHomeRepository
  };

  root.DJ48HomeRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
