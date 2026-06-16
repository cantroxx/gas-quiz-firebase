(function (root) {
  function normalizeMemberProfileFromFirestore(doc) {
    const data = doc.data() || {};
    return {
      userId: data.userId || doc.id,
      legacyMemberId: data.legacyMemberId || doc.id,
      authUid: data.authUid || '',
      school: data.school || '',
      grade: data.grade || '',
      classNumber: data.classNumber || '',
      studentNumber: data.studentNumber || '',
      nickname: data.nickname || '',
      role: data.role || 'student',
      adminLevel: data.adminLevel || '',
      adminScopeGrade: data.adminScopeGrade || '',
      adminScopeClassNumber: data.adminScopeClassNumber || '',
      status: data.status || 'active',
      active: data.active === true,
      profileImageUrl: data.profileImageUrl || '',
      profileImageSource: data.profileImageSource || '',
      profileImageStoragePath: data.profileImageStoragePath || '',
      profileImageScale: data.profileImageScale,
      profileImageOffsetX: data.profileImageOffsetX,
      profileImageOffsetY: data.profileImageOffsetY,
      selectedTitleId: data.selectedTitleId || '',
      rankingMessage: data.rankingMessage || ''
    };
  }

  function isRestorableMemberProfile(profile, authUid) {
    return profile
      && profile.authUid === authUid
      && ['student', 'admin'].includes(profile.role)
      && profile.status === 'active'
      && profile.active === true;
  }

  async function loadRestorableMemberProfileByHint(options = {}) {
    const { db, hintedMemberUserId, authUid } = options;
    if(!db || !hintedMemberUserId || !authUid) return null;

    const hintedSnapshot = await db.collection('users').doc(hintedMemberUserId).get();
    if(!hintedSnapshot.exists) return null;

    const hintedProfile = normalizeMemberProfileFromFirestore(hintedSnapshot);
    return isRestorableMemberProfile(hintedProfile, authUid) ? hintedProfile : null;
  }

  async function loadRestorableMemberProfileByAuthUid(options = {}) {
    const { db, authUid } = options;
    if(!db || !authUid) return null;

    const snapshot = await db.collection('users')
      .where('authUid', '==', authUid)
      .limit(1)
      .get();
    if(snapshot.empty) return null;

    const profile = normalizeMemberProfileFromFirestore(snapshot.docs[0]);
    return isRestorableMemberProfile(profile, authUid) ? profile : null;
  }

  async function restoreLinkedMemberProfile(options = {}, nextDeps = {}) {
    const {
      db,
      authUid,
      currentMemberUserId,
      currentMemberProfile,
      hintedMemberUserId,
      testShopUserId
    } = options;

    if(!db || !authUid || authUid === testShopUserId) return null;
    if(currentMemberUserId && currentMemberProfile?.authUid === authUid) return currentMemberProfile;

    if(hintedMemberUserId) {
      try {
        const hintedProfile = await loadRestorableMemberProfileByHint({ db, hintedMemberUserId, authUid });
        if(hintedProfile) return nextDeps.applyRestoredMemberProfile?.(hintedProfile) || hintedProfile;
        nextDeps.clearLinkedMemberHint?.();
      } catch(error) {
        nextDeps.warn?.('Linked member hint verification failed.', error);
        nextDeps.clearLinkedMemberHint?.();
      }
    }

    try {
      const profile = await loadRestorableMemberProfileByAuthUid({ db, authUid });
      return profile ? (nextDeps.applyRestoredMemberProfile?.(profile) || profile) : null;
    } catch(error) {
      nextDeps.warn?.('Linked member restore by auth uid failed.', error);
      return null;
    }
  }

  async function loadLinkedMemberProfile(options = {}) {
    const { db, authUid, result } = options;
    if(!db) throw new Error('firestore-unavailable');
    if(!authUid) throw new Error('auth-required');
    if(!result?.success || !result.memberUserId) throw new Error('member-link-function-failed');

    const memberSnapshot = await db.collection('users').doc(result.memberUserId).get();
    const linkedProfile = memberSnapshot.exists
      ? normalizeMemberProfileFromFirestore(memberSnapshot)
      : {
        ...(result.profile || {}),
        userId: result.memberUserId,
        legacyMemberId: result.memberUserId,
        authUid
      };
    linkedProfile.authUid = authUid;
    linkedProfile._authLinkAction = result.action || 'password-login';
    return linkedProfile;
  }

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
      },
      restoreLinkedMemberProfile,
      loadLinkedMemberProfile
    };
  }

  function getAccountProfileReadDeps(repository) {
    return {
      restoreLinkedMemberProfile: (options, deps) => repository.restoreLinkedMemberProfile(options, deps),
      loadLinkedMemberProfile: options => repository.loadLinkedMemberProfile(options)
    };
  }

  function getAccountCallableDeps(repository) {
    return {
      callAccountCallable: (callableName, payload, errorCode) => repository.callAccountCallable(callableName, payload, errorCode)
    };
  }

  const api = {
    createAccountRepository,
    getAccountCallableDeps,
    getAccountProfileReadDeps,
    isRestorableMemberProfile,
    loadLinkedMemberProfile,
    loadRestorableMemberProfileByAuthUid,
    loadRestorableMemberProfileByHint,
    normalizeMemberProfileFromFirestore,
    restoreLinkedMemberProfile
  };

  root.DJ48AccountRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
