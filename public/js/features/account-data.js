(function () {
  function normalizeLegacyMemberSchool(school, deps = {}) {
    return window.DJ48AccountDomain.normalizeLegacyMemberSchool(school, deps);
  }

  function buildLegacyMemberUserId(school, grade, classNumber, studentNumber, deps = {}) {
    return window.DJ48AccountDomain.buildLegacyMemberUserId(school, grade, classNumber, studentNumber, deps);
  }

  function getTemporaryPasswordText(values = {}) {
    return window.DJ48AccountDomain.getTemporaryPasswordText(values);
  }

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

  function maybeSaveLinkedMemberHint(memberUserId, deps = {}) {
    if(!memberUserId) return;
    try {
      deps.storage?.setItem(deps.linkedMemberHintKey, memberUserId);
    } catch(error) {
      deps.warn?.('Linked member hint could not be saved.', error);
    }
  }

  function getLinkedMemberHint(deps = {}) {
    try {
      return deps.storage?.getItem(deps.linkedMemberHintKey) || '';
    } catch(error) {
      deps.warn?.('Linked member hint could not be read.', error);
      return '';
    }
  }

  function clearLinkedMemberHint(deps = {}) {
    try {
      deps.storage?.removeItem(deps.linkedMemberHintKey);
    } catch(error) {
      deps.warn?.('Linked member hint could not be cleared.', error);
    }
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

  async function restoreLinkedMemberProfile(options = {}, deps = {}) {
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
        if(hintedProfile) return deps.applyRestoredMemberProfile?.(hintedProfile) || hintedProfile;
        deps.clearLinkedMemberHint?.();
      } catch(error) {
        deps.warn?.('Linked member hint verification failed.', error);
        deps.clearLinkedMemberHint?.();
      }
    }

    try {
      const profile = await loadRestorableMemberProfileByAuthUid({ db, authUid });
      return profile ? (deps.applyRestoredMemberProfile?.(profile) || profile) : null;
    } catch(error) {
      deps.warn?.('Linked member restore by auth uid failed.', error);
      return null;
    }
  }

  async function signInAnonymouslyIfNeeded(auth) {
    if(!auth) return null;
    if(auth.currentUser) return auth.currentUser;

    const credential = await auth.signInAnonymously();
    return credential.user || auth.currentUser;
  }

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

  function buildMemberLinkPayload(values = {}, deps = {}) {
    const password = String(values.password || '');
    if(!password) throw new Error('password-required');

    const basePayload = {
      school: values.school || deps.defaultMemberSchool || '동자',
      grade: values.grade,
      classNumber: values.classNumber,
      studentNumber: values.studentNumber
    };

    if(values.action === 'setup') {
      const nickname = String(values.nickname || '').trim();
      const passwordConfirm = String(values.passwordConfirm || '');
      if(!nickname) throw new Error('nickname-required');
      if(password !== passwordConfirm) throw new Error('password-confirm-mismatch');

      return {
        callableName: 'registerNewMember',
        payload: {
          ...basePayload,
          nickname,
          password
        },
        action: 'member-signup',
        errorCode: 'member-register-failed'
      };
    }

    return {
      callableName: 'loginMemberWithPassword',
      payload: {
        ...basePayload,
        password
      },
      action: 'password-login',
      errorCode: 'member-login-failed'
    };
  }

  async function linkMemberWithPassword(values = {}, deps = {}) {
    const linkPayload = buildMemberLinkPayload(values, deps);
    const response = await callAccountCallable(
      linkPayload.callableName,
      linkPayload.payload,
      deps,
      linkPayload.errorCode
    );
    return {
      ...(response || {}),
      action: linkPayload.action
    };
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

  async function changePendingMemberPassword(options = {}, deps = {}) {
    const {
      pendingPasswordChange,
      currentMemberUserId,
      newPassword,
      passwordConfirm
    } = options;

    if(!pendingPasswordChange?.memberUserId || pendingPasswordChange.memberUserId !== currentMemberUserId) {
      throw new Error('password-change-not-required');
    }
    if(!newPassword) throw new Error('password-required');
    if(newPassword !== passwordConfirm) throw new Error('password-confirm-mismatch');

    return changeMemberPassword({
      memberUserId: pendingPasswordChange.memberUserId,
      currentPassword: pendingPasswordChange.currentPassword,
      newPassword
    }, deps);
  }

  async function changeMemberPasswordWithCurrentPassword(options = {}, deps = {}) {
    const {
      memberUserId,
      currentPassword,
      newPassword,
      passwordConfirm
    } = options;

    if(!memberUserId) throw new Error('member-required');
    if(!currentPassword) throw new Error('current-password-required');
    if(!newPassword) throw new Error('password-required');
    if(newPassword !== passwordConfirm) throw new Error('password-confirm-mismatch');

    return changeMemberPassword({
      memberUserId,
      currentPassword,
      newPassword
    }, deps);
  }

  async function updateMemberNicknameForMember(options = {}, deps = {}) {
    const memberUserId = options.memberUserId || '';
    const normalizedNickname = String(options.nickname || '').trim();

    if(!memberUserId) throw new Error('member-required');
    if(!normalizedNickname) throw new Error('nickname-required');

    return updateMemberNickname({
      memberUserId,
      nickname: normalizedNickname
    }, deps);
  }

  function mergeMemberProfile(currentProfile, result = {}) {
    return {
      ...(currentProfile || {}),
      ...(result.profile || {})
    };
  }

  function getRestoredMemberDestination(profile) {
    return window.DJ48AccountDomain.getRestoredMemberDestination(profile);
  }

  function normalizeRankingMessageInput(value) {
    return window.DJ48AccountDomain.normalizeRankingMessageInput(value);
  }

  function normalizeProfileImageInput(value) {
    return window.DJ48AccountDomain.normalizeProfileImageInput(value);
  }

  function getProfileImageFileExtension(file) {
    const type = String(file?.type || '').toLowerCase();
    if(type.includes('png')) return 'png';
    if(type.includes('webp')) return 'webp';
    return 'jpg';
  }

  function validateProfileImageUploadFile(file, deps = {}) {
    if(!file) return { ok: false, skipped: true, message: '' };
    const allowedTypes = deps.allowedTypes || ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = deps.maxSize || 2 * 1024 * 1024;
    if(!allowedTypes.includes(file.type)) {
      return { ok: false, message: 'jpg, png, webp 이미지만 올릴 수 있어요.' };
    }
    if(file.size > maxSize) {
      return { ok: false, message: '이미지는 2MB 이하로 올려 주세요.' };
    }
    return { ok: true, message: '' };
  }

  function buildCandidateProfileImageEditorOptions(option = {}, deps = {}) {
    const profileImageUrl = normalizeProfileImageInput(option.imageUrl || option.displayUrl || option.imageFileId || '');
    if(!profileImageUrl) throw new Error('profile-image-url-missing');
    return {
      source: 'candidate',
      candidateId: option.candidateId || '',
      imageUrl: profileImageUrl,
      previewUrl: deps.normalizeDisplayImageUrl?.(profileImageUrl) || profileImageUrl,
      label: option.name || '선택한 이미지'
    };
  }

  function buildUploadProfileImageEditorOptions(file, previewUrl) {
    return {
      source: 'upload',
      file,
      previewUrl,
      label: file?.name || '업로드 이미지'
    };
  }

  function buildProfileImageEditorState(options = {}, currentEdit = {}, deps = {}) {
    const imageUrl = options.imageUrl || '';
    return {
      source: options.source || 'candidate',
      candidateId: options.candidateId || '',
      imageUrl,
      previewUrl: options.previewUrl || deps.normalizeDisplayImageUrl?.(imageUrl) || imageUrl,
      file: options.file || null,
      label: options.label || '',
      ...currentEdit
    };
  }

  function applyProfileImageEditorControlValues(editorState = {}, values = {}) {
    return {
      ...editorState,
      profileImageScale: Number(values.profileImageScale) || 1,
      profileImageOffsetX: Number(values.profileImageOffsetX) || 0,
      profileImageOffsetY: Number(values.profileImageOffsetY) || 0
    };
  }

  function buildProfileImageStoragePath(options = {}, deps = {}) {
    const authUid = options.authUid || '';
    const memberUserId = options.memberUserId || '';
    const extension = options.extension || 'jpg';
    const now = deps.now || Date.now;
    if(!authUid) throw new Error('login-required');
    if(!memberUserId) throw new Error('member-required');
    return `profileImages/${authUid}/${memberUserId}_${now()}.${extension}`;
  }

  function buildProfileImageUpdate(editorState = {}, edit = {}, deps = {}) {
    const fieldValue = deps.getFirestoreFieldValue?.();
    return {
      profileImageUrl: editorState.profileImageUrl || editorState.imageUrl || '',
      profileImageSource: editorState.profileImageSource || editorState.source || '',
      profileImageStoragePath: editorState.profileImageStoragePath || '',
      profileImageScale: edit.profileImageScale,
      profileImageOffsetX: edit.profileImageOffsetX,
      profileImageOffsetY: edit.profileImageOffsetY,
      updatedAt: fieldValue.serverTimestamp()
    };
  }

  async function saveUserProfileUpdate(options = {}) {
    const { db, memberUserId, updateData } = options;
    if(!memberUserId) throw new Error('member-required');
    if(!db) throw new Error('firestore-unavailable');
    await db.collection('users').doc(memberUserId).set(updateData, { merge: true });
    return updateData;
  }

  function buildUploadedProfileImageUpdate(editorState = {}, uploadResult = {}, edit = {}, deps = {}) {
    return buildProfileImageUpdate({
      profileImageUrl: uploadResult.downloadUrl || editorState.profileImageUrl || editorState.imageUrl || '',
      profileImageSource: editorState.profileImageSource || editorState.source || '',
      profileImageStoragePath: uploadResult.path || editorState.profileImageStoragePath || ''
    }, edit, deps);
  }

  async function uploadProfileImageToStorage(options = {}) {
    const {
      storage,
      authUid,
      memberUserId,
      file
    } = options;
    if(!storage) throw new Error('storage-unavailable');

    const extension = getProfileImageFileExtension(file);
    const path = buildProfileImageStoragePath({
      authUid,
      memberUserId,
      extension
    });
    const ref = storage.ref(path);
    await ref.put(file, {
      contentType: file.type,
      customMetadata: {
        memberUserId,
        source: 'profile-upload'
      }
    });
    const downloadUrl = await ref.getDownloadURL();
    return { downloadUrl, path };
  }

  async function saveProfileImageEditorSelection(options = {}, deps = {}) {
    const {
      db,
      memberUserId,
      editorState,
      edit,
      storage,
      authUid,
      currentProfile
    } = options;
    if(!memberUserId) throw new Error('member-required');
    if(!editorState) return null;
    if(!db) throw new Error('firestore-unavailable');

    let uploadResult = null;
    if(editorState.source === 'upload') {
      uploadResult = await uploadProfileImageToStorage({
        storage,
        authUid,
        memberUserId,
        file: editorState.file
      });
    }
    const updateData = buildUploadedProfileImageUpdate(editorState, uploadResult || {}, edit, deps);
    await saveUserProfileUpdate({
      db,
      memberUserId,
      updateData
    });
    return {
      updateData,
      nextProfile: {
        ...(currentProfile || {}),
        ...updateData
      }
    };
  }

  function buildRankingMessageUpdate(message, deps = {}) {
    const fieldValue = deps.getFirestoreFieldValue?.();
    return {
      rankingMessage: normalizeRankingMessageInput(message),
      updatedAt: fieldValue.serverTimestamp()
    };
  }

  async function saveRankingMessageForMember(options = {}, deps = {}) {
    const updateData = buildRankingMessageUpdate(options.message, deps);
    return saveUserProfileUpdate({
      db: options.db,
      memberUserId: options.memberUserId,
      updateData
    });
  }

  function buildSelectedTitleUpdate(titleId, deps = {}) {
    const fieldValue = deps.getFirestoreFieldValue?.();
    return {
      selectedTitleId: String(titleId || '').trim(),
      updatedAt: fieldValue.serverTimestamp()
    };
  }

  async function saveSelectedTitleForMember(options = {}, deps = {}) {
    const selectedTitleId = String(options.titleId || '').trim();
    if(!options.memberUserId) throw new Error('member-required');
    if(!options.db) throw new Error('firestore-unavailable');
    if(selectedTitleId) {
      const titleSnapshot = await options.db
        .collection('userTitles')
        .doc(options.memberUserId)
        .collection('titles')
        .doc(selectedTitleId)
        .get();
      if(!titleSnapshot.exists) throw new Error('title-not-owned');
    }

    const updateData = buildSelectedTitleUpdate(selectedTitleId, deps);
    return saveUserProfileUpdate({
      db: options.db,
      memberUserId: options.memberUserId,
      updateData
    });
  }

  function getResolvedUserIdFromAuthUser(user, deps = {}) {
    return user?.uid || deps.testShopUserId || '';
  }

  function getRestoredMemberState(profile) {
    return {
      currentMemberUserId: profile?.userId || '',
      currentMemberProfile: profile || null,
      linkedMemberHintUserId: profile?.userId || '',
      shouldResetUserScopedRuntimeData: true
    };
  }

  function getResolvedUserChangeState(options = {}) {
    return window.DJ48AccountDomain.getResolvedUserChangeState(options);
  }

  function getUnlinkCurrentMemberState(options = {}) {
    return window.DJ48AccountDomain.getUnlinkCurrentMemberState(options);
  }

  async function handleAuthStateUser(user, deps = {}) {
    deps.setFirebaseAuthUser?.(user || null);
    deps.handleResolvedUserChange?.(getResolvedUserIdFromAuthUser(user, deps));
    if(!user?.uid) return null;

    const profile = await deps.restoreLinkedMemberFromAuthUid?.();
    deps.renderMemberLinkPanel?.();
    deps.openRestoredMemberDestination?.(profile);
    return profile;
  }

  async function initializeAuthUserFlow(auth, deps = {}) {
    if(!auth) {
      deps.handleResolvedUserChange?.(deps.testShopUserId || '');
      return null;
    }

    try {
      const user = await signInAnonymouslyIfNeeded(auth);
      deps.setFirebaseAuthUser?.(user || null);
      deps.handleResolvedUserChange?.(getResolvedUserIdFromAuthUser(user, deps));
      const profile = await deps.restoreLinkedMemberFromAuthUid?.();
      deps.renderMemberLinkPanel?.();
      deps.openRestoredMemberDestination?.(profile);
      return user;
    } catch(error) {
      deps.warn?.('Firebase anonymous auth failed. Using test user fallback.', error);
      deps.handleResolvedUserChange?.(deps.testShopUserId || '');
      return null;
    }
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
    normalizeLegacyMemberSchool,
    buildLegacyMemberUserId,
    getTemporaryPasswordText,
    normalizeMemberProfileFromFirestore,
    isRestorableMemberProfile,
    maybeSaveLinkedMemberHint,
    getLinkedMemberHint,
    clearLinkedMemberHint,
    loadRestorableMemberProfileByHint,
    loadRestorableMemberProfileByAuthUid,
    restoreLinkedMemberProfile,
    signInAnonymouslyIfNeeded,
    callAccountCallable,
    buildMemberLinkPayload,
    linkMemberWithPassword,
    loadLinkedMemberProfile,
    changePendingMemberPassword,
    changeMemberPasswordWithCurrentPassword,
    updateMemberNicknameForMember,
    mergeMemberProfile,
    getRestoredMemberDestination,
    normalizeRankingMessageInput,
    normalizeProfileImageInput,
    getProfileImageFileExtension,
    validateProfileImageUploadFile,
    buildCandidateProfileImageEditorOptions,
    buildUploadProfileImageEditorOptions,
    buildProfileImageEditorState,
    applyProfileImageEditorControlValues,
    buildProfileImageStoragePath,
    buildProfileImageUpdate,
    saveUserProfileUpdate,
    buildUploadedProfileImageUpdate,
    uploadProfileImageToStorage,
    saveProfileImageEditorSelection,
    buildRankingMessageUpdate,
    saveRankingMessageForMember,
    buildSelectedTitleUpdate,
    saveSelectedTitleForMember,
    getResolvedUserIdFromAuthUser,
    getRestoredMemberState,
    getResolvedUserChangeState,
    getUnlinkCurrentMemberState,
    handleAuthStateUser,
    initializeAuthUserFlow,
    registerNewMember,
    loginMemberWithPassword,
    resetMemberPasswordToTemporary,
    changeMemberPassword,
    updateMemberNickname
  };
})();
