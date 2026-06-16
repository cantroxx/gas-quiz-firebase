(function (root) {
  function createAccountRepository(deps = {}) {
    async function callAccountCallable(callableName, payload = {}, errorCode = '') {
      const functions = deps.getFirebaseFunctions?.();
      if(!functions) throw new Error('functions-unavailable');
      await deps.initializeAuthUser?.();
      const callable = functions.httpsCallable(callableName);
      const response = await callable(payload);
      const result = response?.data || {};
      if(!result.success) throw new Error(errorCode || `${callableName || 'account-call'}-failed`);
      return result;
    }

    return {
      callAccountCallable,
      registerNewMember(payload = {}) {
        return callAccountCallable('registerNewMember', payload, 'member-register-failed');
      },
      loginMemberWithPassword(payload = {}) {
        return callAccountCallable('loginMemberWithPassword', payload, 'member-login-failed');
      },
      resetMemberPasswordToTemporary(payload = {}) {
        return callAccountCallable('resetMemberPasswordToTemporary', payload, 'member-password-reset-failed');
      },
      changeMemberPassword(payload = {}) {
        return callAccountCallable('changeMemberPassword', payload, 'member-password-change-failed');
      },
      updateMemberNickname(payload = {}) {
        return callAccountCallable('updateMemberNickname', payload, 'member-nickname-update-failed');
      }
    };
  }

  function getAccountCallableDeps(repository) {
    return {
      callAccountCallable: (callableName, payload, errorCode) => repository.callAccountCallable(callableName, payload, errorCode)
    };
  }

  const api = {
    createAccountRepository,
    getAccountCallableDeps
  };

  root.DJ48AccountRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
