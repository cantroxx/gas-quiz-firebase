(function (root) {
  async function submitMemberLinkFlow(options = {}, deps = {}) {
    if(deps.isMemberLinkInProgress?.()) return { skipped: true, reason: 'in-progress' };

    deps.setMemberLinkInProgress?.(true);
    deps.setMemberLinkSubmitAction?.(options.submitAction || deps.getMemberLinkSubmitAction?.() || 'login');
    const values = deps.getMemberLinkFormValues();
    deps.setMemberLinkStatus(deps.getMemberLinkSubmitPendingMessage(values));

    try {
      const profile = await deps.linkImportedMemberToCurrentAuthUser(values);
      deps.renderMemberLinkPanel();
      deps.setMemberLinkStatus(deps.getMemberLinkSubmitSuccessMessage(profile));
      if(deps.shouldWaitForRequiredPasswordChange?.()) {
        deps.renderMemberLinkPanel();
        return { profile, waitingForPasswordChange: true };
      }
      deps.openMemberDestination(profile);
      return { profile, waitingForPasswordChange: false };
    } catch(error) {
      deps.warn?.('Member auth link failed.', error);
      deps.setMemberLinkStatus(deps.getMemberLinkSubmitErrorMessage(error), true);
      return { error };
    } finally {
      deps.setMemberLinkInProgress?.(false);
    }
  }

  async function resetMemberPasswordFlow(options = {}, deps = {}) {
    if(deps.isMemberLinkInProgress?.()) return { skipped: true, reason: 'in-progress' };

    const values = deps.getMemberLinkFormValues();
    const temporaryPassword = deps.getTemporaryPasswordText(values);
    if(!temporaryPassword) {
      deps.setMemberLinkStatus(options.identityRequiredMessage || '학교, 학년, 반, 번호를 먼저 입력해 주세요.', true);
      return { skipped: true, reason: 'identity-required' };
    }
    const confirmed = deps.confirm?.(deps.getMemberPasswordResetConfirmMessage(temporaryPassword));
    if(!confirmed) return { skipped: true, reason: 'cancelled' };

    const buttonState = deps.setButtonBusy?.(options.button, options.busyText || '초기화 중...');
    deps.setMemberLinkInProgress?.(true);
    deps.setMemberLinkStatus(options.pendingMessage || '비밀번호를 임시 비밀번호로 바꾸고 있습니다...');

    try {
      const result = await deps.resetMemberPasswordToTemporary({
        school: values.school || options.defaultMemberSchool || '동자',
        grade: values.grade,
        classNumber: values.classNumber,
        studentNumber: values.studentNumber
      });
      deps.setMemberLinkStatus(deps.getMemberPasswordResetSuccessMessage(temporaryPassword));
      return { result, temporaryPassword };
    } catch(error) {
      deps.warn?.('Member password reset failed.', error);
      deps.setMemberLinkStatus(deps.getMemberPasswordResetErrorMessage(error), true);
      return { error };
    } finally {
      deps.setMemberLinkInProgress?.(false);
      deps.restoreButtonState?.(options.button, buttonState);
    }
  }

  async function changePendingMemberPasswordFlow(options = {}, deps = {}) {
    const values = deps.getMemberPasswordChangeValues();
    const buttonState = deps.setButtonBusy?.(options.button, options.busyText || '저장 중...');

    try {
      const result = await deps.changeCurrentMemberPassword(values.newPassword, values.passwordConfirm);
      deps.renderMemberLinkPanel();
      deps.setMemberLinkStatus(deps.getMemberPasswordChangeSuccessMessage());
      deps.openMemberDestination(result?.profile || {});
      return { result };
    } catch(error) {
      deps.warn?.('Member password change failed.', error);
      deps.appendMemberLinkError(deps.getMemberPasswordChangeErrorMessage(error));
      return { error };
    } finally {
      deps.restoreButtonState?.(deps.getPasswordChangeButton?.() || options.button, buttonState);
    }
  }

  async function unlinkCurrentMemberFlow(options = {}, deps = {}) {
    if(options.button) options.button.disabled = true;
    deps.setMemberLinkStatus(options.pendingMessage || '현재 브라우저의 회원 연결을 해제하고 있습니다...');

    try {
      await deps.unlinkCurrentMemberForTesting();
      deps.renderLoggedOutHomeState();
      deps.setMemberLinkStatus(options.successMessage || '현재 브라우저 연결을 초기화했어요. 다른 학생 정보로 다시 연결할 수 있습니다.');
      deps.showLoginView();
      return { unlinked: true };
    } catch(error) {
      deps.warn?.('Member auth unlink failed.', error);
      deps.setMemberLinkStatus(deps.getMemberUnlinkErrorMessage(error), true);
      deps.renderMemberLinkPanel();
      return { error };
    }
  }

  function applyRestoredMemberProfileFlow(profile, deps = {}) {
    const state = deps.getRestoredMemberState(profile);
    deps.setCurrentMemberSession({
      currentMemberUserId: state.currentMemberUserId,
      currentMemberProfile: state.currentMemberProfile
    });
    if(state.linkedMemberHintUserId) deps.maybeSaveLinkedMemberHint?.(state.linkedMemberHintUserId);
    if(state.shouldResetUserScopedRuntimeData) deps.resetUserScopedRuntimeData?.();
    return profile;
  }

  function handleResolvedUserChangeFlow(nextUserId, deps = {}) {
    const state = deps.getResolvedUserChangeState({
      lastResolvedUserId: deps.getLastResolvedUserId?.(),
      nextUserId,
      testShopUserId: deps.testShopUserId
    });
    if(state.shouldClearMemberProfile) {
      deps.clearCurrentMemberSession?.();
      if(state.shouldClearLinkedMemberHint) deps.clearLinkedMemberHint?.();
      if(state.shouldResetUserScopedRuntimeData) deps.resetUserScopedRuntimeData?.();
    }
    deps.setLastResolvedUserId?.(state.nextLastResolvedUserId);
    return state;
  }

  async function restoreLinkedMemberFromAuthUidFlow(options = {}, deps = {}) {
    const db = deps.getFirestoreDb?.();
    const authUid = deps.getFirebaseAuthUser?.()?.uid || '';
    return deps.restoreLinkedMemberProfile({
      db,
      authUid,
      currentMemberUserId: deps.getCurrentMemberUserId?.(),
      currentMemberProfile: deps.getCurrentMemberProfile?.(),
      hintedMemberUserId: deps.getLinkedMemberHint?.(),
      testShopUserId: options.testShopUserId
    }, {
      applyRestoredMemberProfile: deps.applyRestoredMemberProfile,
      clearLinkedMemberHint: deps.clearLinkedMemberHint,
      warn: deps.warn
    });
  }

  async function linkImportedMemberToCurrentAuthUserFlow(values = {}, deps = {}) {
    const db = deps.getFirestoreDb?.();
    if(!db) throw new Error('firestore-unavailable');

    const authUser = await deps.initializeAuthUser();
    const authUid = authUser?.uid || deps.getFirebaseAuthUser?.()?.uid || '';
    if(!authUid) throw new Error('auth-required');

    const result = await deps.linkMemberWithPassword(values, {
      defaultMemberSchool: deps.defaultMemberSchool,
      ...deps.getAccountCallableDeps()
    });
    const linkedProfile = await deps.loadLinkedMemberProfile({
      db,
      authUid,
      result
    });

    deps.setCurrentMemberSession({
      currentMemberUserId: result.memberUserId,
      currentMemberProfile: linkedProfile
    });
    deps.setPendingPasswordChange(result.forcePasswordChange === true
      ? {
        memberUserId: result.memberUserId,
        currentPassword: String(values.password || '')
      }
      : null);
    deps.maybeSaveLinkedMemberHint?.(result.memberUserId);
    deps.resetUserScopedRuntimeData?.();
    try {
      await deps.migrateUserDataToMemberIdIfNeeded?.();
    } catch(error) {
      deps.warn?.('Member owned data migration after auth link failed. Auth link remains active.', error);
    }
    return linkedProfile;
  }

  function initializeAuthUserLifecycle(options = {}, deps = {}) {
    const activeInitPromise = deps.getFirebaseAuthInitPromise?.();
    if(activeInitPromise) return activeInitPromise;

    const auth = deps.getFirebaseAuth?.();
    if(!auth) {
      deps.handleResolvedUserChange?.(options.testShopUserId);
      const initPromise = Promise.resolve(null);
      deps.setFirebaseAuthInitPromise?.(initPromise);
      return initPromise;
    }

    if(!deps.isAuthStateListenerAttached?.()) {
      auth.onAuthStateChanged(user => {
        deps.handleAuthStateUser(user, {
          testShopUserId: options.testShopUserId,
          setFirebaseAuthUser: deps.setFirebaseAuthUser,
          handleResolvedUserChange: deps.handleResolvedUserChange,
          restoreLinkedMemberFromAuthUid: deps.restoreLinkedMemberFromAuthUid,
          renderMemberLinkPanel: deps.renderMemberLinkPanel,
          openRestoredMemberDestination: deps.openRestoredMemberDestination
        }).catch(error => deps.warn?.('Linked member restore after auth state change failed.', error));
      });
      deps.setAuthStateListenerAttached?.(true);
    }

    const initPromise = deps.initializeAuthUserFlow(auth, {
      testShopUserId: options.testShopUserId,
      setFirebaseAuthUser: deps.setFirebaseAuthUser,
      handleResolvedUserChange: deps.handleResolvedUserChange,
      restoreLinkedMemberFromAuthUid: deps.restoreLinkedMemberFromAuthUid,
      renderMemberLinkPanel: deps.renderMemberLinkPanel,
      openRestoredMemberDestination: deps.openRestoredMemberDestination,
      warn: deps.warn
    });
    deps.setFirebaseAuthInitPromise?.(initPromise);
    return initPromise;
  }

  const api = {
    submitMemberLinkFlow,
    resetMemberPasswordFlow,
    changePendingMemberPasswordFlow,
    unlinkCurrentMemberFlow,
    applyRestoredMemberProfileFlow,
    handleResolvedUserChangeFlow,
    initializeAuthUserLifecycle,
    linkImportedMemberToCurrentAuthUserFlow,
    restoreLinkedMemberFromAuthUidFlow
  };

  root.DJ48AccountUsecases = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
