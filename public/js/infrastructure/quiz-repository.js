(function (root) {
  function createQuizRepository(deps = {}) {
    return {
      getFirestoreDb() {
        return deps.getFirestoreDb?.() || null;
      },
      getFirestoreFieldValue() {
        return deps.getFirestoreFieldValue?.() || null;
      },
      getFirebaseFunctions() {
        return deps.getFirebaseFunctions?.() || null;
      },
      getFirebaseAuthUser() {
        return deps.getFirebaseAuthUser?.() || null;
      },
      getCurrentDataOwnerId() {
        return deps.getCurrentDataOwnerId?.() || '';
      },
      loadFeatureFlags() {
        return deps.loadFeatureFlags?.();
      },
      loadFirebaseQuizMeta(quizId) {
        return deps.loadFirebaseQuizMeta?.(quizId);
      },
      isFirestorePermissionDeniedError(error) {
        return deps.isFirestorePermissionDeniedError?.(error) || false;
      },
      resetUserEconomyCache() {
        return deps.resetUserEconomyCache?.();
      },
      resetTitleCatalogCache() {
        return deps.resetTitleCatalogCache?.();
      }
    };
  }

  function getQuizPlayRepositoryDeps(repository) {
    return {
      getFirestoreDb: () => repository.getFirestoreDb(),
      getFirestoreFieldValue: () => repository.getFirestoreFieldValue(),
      getFirebaseFunctions: () => repository.getFirebaseFunctions(),
      getFirebaseAuthUser: () => repository.getFirebaseAuthUser(),
      getCurrentDataOwnerId: () => repository.getCurrentDataOwnerId(),
      loadFeatureFlags: () => repository.loadFeatureFlags(),
      loadFirebaseQuizMeta: quizId => repository.loadFirebaseQuizMeta(quizId),
      isFirestorePermissionDeniedError: error => repository.isFirestorePermissionDeniedError(error),
      resetUserEconomyCache: () => repository.resetUserEconomyCache(),
      resetTitleCatalogCache: () => repository.resetTitleCatalogCache()
    };
  }

  const api = {
    createQuizRepository,
    getQuizPlayRepositoryDeps
  };

  root.DJ48QuizRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
