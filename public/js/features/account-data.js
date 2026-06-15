(function () {
  async function callAccountCallable(callableName, payload = {}, deps = {}, errorCode = '') {
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) throw new Error('functions-unavailable');
    await deps.initializeAuthUser?.();
    const callable = functions.httpsCallable(callableName);
    const response = await callable(payload);
    const result = response?.data || {};
    if(!result.success) throw new Error(errorCode || `${callableName || 'account-call'}-failed`);
    return result;
  }

  function registerNewMember(payload = {}, deps = {}) {
    return callAccountCallable('registerNewMember', payload, deps, 'member-register-failed');
  }

  function loginMemberWithPassword(payload = {}, deps = {}) {
    return callAccountCallable('loginMemberWithPassword', payload, deps, 'member-login-failed');
  }

  function resetMemberPasswordToTemporary(payload = {}, deps = {}) {
    return callAccountCallable('resetMemberPasswordToTemporary', payload, deps, 'member-password-reset-failed');
  }

  function changeMemberPassword(payload = {}, deps = {}) {
    return callAccountCallable('changeMemberPassword', payload, deps, 'member-password-change-failed');
  }

  function updateMemberNickname(payload = {}, deps = {}) {
    return callAccountCallable('updateMemberNickname', payload, deps, 'member-nickname-update-failed');
  }

  window.DJ48AccountData = {
    callAccountCallable,
    registerNewMember,
    loginMemberWithPassword,
    resetMemberPasswordToTemporary,
    changeMemberPassword,
    updateMemberNickname
  };
})();
