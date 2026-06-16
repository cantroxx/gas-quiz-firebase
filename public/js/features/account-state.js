(function () {
  let memberLinkInProgress = false;
  let memberLinkSubmitAction = 'login';
  let pendingPasswordChange = null;
  let firebaseAuthUser = null;
  let firebaseAuthInitPromise = null;
  let authStateListenerAttached = false;

  function isMemberLinkInProgress() {
    return memberLinkInProgress;
  }

  function setMemberLinkInProgress(value) {
    memberLinkInProgress = !!value;
    return memberLinkInProgress;
  }

  function getMemberLinkSubmitAction() {
    return memberLinkSubmitAction;
  }

  function setMemberLinkSubmitAction(action) {
    memberLinkSubmitAction = action || 'login';
    return memberLinkSubmitAction;
  }

  function getPendingPasswordChange() {
    return pendingPasswordChange;
  }

  function setPendingPasswordChange(value) {
    pendingPasswordChange = value || null;
    return pendingPasswordChange;
  }

  function clearPendingPasswordChange() {
    pendingPasswordChange = null;
  }

  function getFirebaseAuthUser() {
    return firebaseAuthUser;
  }

  function setFirebaseAuthUser(value) {
    firebaseAuthUser = value || null;
    return firebaseAuthUser;
  }

  function getFirebaseAuthInitPromise() {
    return firebaseAuthInitPromise;
  }

  function setFirebaseAuthInitPromise(value) {
    firebaseAuthInitPromise = value || null;
    return firebaseAuthInitPromise;
  }

  function isAuthStateListenerAttached() {
    return authStateListenerAttached;
  }

  function setAuthStateListenerAttached(value) {
    authStateListenerAttached = !!value;
    return authStateListenerAttached;
  }

  function resetFirebaseAuthState() {
    firebaseAuthUser = null;
    firebaseAuthInitPromise = null;
  }

  window.DJ48AccountState = {
    isMemberLinkInProgress,
    setMemberLinkInProgress,
    getMemberLinkSubmitAction,
    setMemberLinkSubmitAction,
    getPendingPasswordChange,
    setPendingPasswordChange,
    clearPendingPasswordChange,
    getFirebaseAuthUser,
    setFirebaseAuthUser,
    getFirebaseAuthInitPromise,
    setFirebaseAuthInitPromise,
    isAuthStateListenerAttached,
    setAuthStateListenerAttached,
    resetFirebaseAuthState
  };
})();
