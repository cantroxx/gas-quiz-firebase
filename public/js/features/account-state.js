(function () {
  let memberLinkInProgress = false;
  let memberLinkSubmitAction = 'login';
  let pendingPasswordChange = null;

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

  window.DJ48AccountState = {
    isMemberLinkInProgress,
    setMemberLinkInProgress,
    getMemberLinkSubmitAction,
    setMemberLinkSubmitAction,
    getPendingPasswordChange,
    setPendingPasswordChange,
    clearPendingPasswordChange
  };
})();
