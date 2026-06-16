(function () {
  let memberLinkInProgress = false;
  let memberLinkSubmitAction = 'login';
  let pendingPasswordChange = null;
  let firebaseAuthUser = null;
  let firebaseAuthInitPromise = null;
  let authStateListenerAttached = false;
  let currentMemberUserId = '';
  let currentMemberProfile = null;

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

  function getCurrentMemberUserId() {
    return currentMemberUserId;
  }

  function setCurrentMemberUserId(value) {
    currentMemberUserId = value || '';
    return currentMemberUserId;
  }

  function getCurrentMemberProfile() {
    return currentMemberProfile;
  }

  function setCurrentMemberProfile(value) {
    currentMemberProfile = value || null;
    return currentMemberProfile;
  }

  function getCurrentMemberSession() {
    return {
      currentMemberUserId,
      currentMemberProfile
    };
  }

  function setCurrentMemberSession(value = {}) {
    currentMemberUserId = value.currentMemberUserId || '';
    currentMemberProfile = value.currentMemberProfile || null;
    return {
      currentMemberUserId,
      currentMemberProfile
    };
  }

  function clearCurrentMemberSession() {
    return setCurrentMemberSession();
  }

  function mergeCurrentMemberProfile(value = {}) {
    const patch = value?.profile || value || {};
    currentMemberProfile = {
      ...(currentMemberProfile || {}),
      ...patch
    };
    return currentMemberProfile;
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
    resetFirebaseAuthState,
    getCurrentMemberUserId,
    setCurrentMemberUserId,
    getCurrentMemberProfile,
    setCurrentMemberProfile,
    getCurrentMemberSession,
    setCurrentMemberSession,
    clearCurrentMemberSession,
    mergeCurrentMemberProfile
  };
})();
