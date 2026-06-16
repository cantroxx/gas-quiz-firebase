(function (root) {
  function setDisabled(element, disabled) {
    if(element) element.disabled = disabled;
  }

  function setText(element, text) {
    if(element) element.textContent = text;
  }

  async function requireProfileWriteContext(deps = {}) {
    const memberUserId = deps.getCurrentMemberUserId?.() || '';
    if(!memberUserId) throw new Error('member-required');
    const db = deps.getFirestoreDb?.();
    if(!db) throw new Error('firestore-unavailable');
    await deps.initializeAuthUser?.();
    return { memberUserId, db };
  }

  async function searchProfileImageCandidatesFlow(options = {}, deps = {}) {
    const db = deps.getFirestoreDb?.();
    if(!db) throw new Error('firestore-unavailable');
    await deps.initializeAuthUser?.();
    const input = deps.getInput?.();
    const status = deps.getStatus?.();
    const query = String(deps.normalizeProfileImageInput?.(input?.value || '') || '').toLowerCase().replace(/\s+/g, '');
    if(query.length < 2) {
      setText(status, options.shortQueryMessage || '검색어를 2글자 이상 입력해 주세요.');
      return [];
    }
    setText(status, options.loadingMessage || '이미지를 검색하는 중...');
    const candidates = await deps.searchProfileImageCandidates({
      db,
      query,
      limit: options.limit || 24
    });
    const renderOptions = deps.setProfileImageOptions?.(candidates) || candidates;
    deps.renderProfileImageSearchResults?.(renderOptions);
    return renderOptions;
  }

  async function selectProfileImageCandidateFlow(options = {}, deps = {}) {
    if(!deps.getCurrentMemberUserId?.()) throw new Error('member-required');
    const status = deps.getStatus?.();
    const imageOption = deps.getProfileImageOption?.(options.index);
    if(!imageOption) {
      setText(status, options.missingMessage || '저장할 이미지를 다시 선택해 주세요.');
      return null;
    }
    let editorOptions = null;
    try {
      editorOptions = deps.buildCandidateProfileImageEditorOptions?.(imageOption) || null;
    } catch(error) {
      setText(status, options.invalidMessage || '선택한 이미지 주소를 확인하지 못했습니다.');
      return null;
    }
    deps.openProfileImageEditor?.(editorOptions);
    return editorOptions;
  }

  async function previewProfileImageUploadFlow(options = {}, deps = {}) {
    if(!deps.getCurrentMemberUserId?.()) throw new Error('member-required');
    const status = deps.getStatus?.();
    const validation = deps.validateProfileImageUploadFile?.(options.file);
    if(!validation?.ok) {
      if(validation?.message) setText(status, validation.message);
      return null;
    }
    setText(status, options.loadingMessage || '이미지 미리보기를 준비하고 있습니다...');
    const previewUrl = await deps.readProfileImageFilePreview?.(options.file);
    const editorOptions = deps.buildUploadProfileImageEditorOptions?.(options.file, previewUrl);
    deps.openProfileImageEditor?.(editorOptions);
    return editorOptions;
  }

  async function saveProfileImageEditorSelectionFlow(options = {}, deps = {}) {
    const { memberUserId, db } = await requireProfileWriteContext(deps);
    const editorState = deps.getProfileImageEditorState?.();
    if(!editorState) return null;

    const saveButton = deps.getSaveButton?.();
    const edit = deps.getProfileImageEditModel(editorState);
    setDisabled(saveButton, true);
    deps.setProfileImageEditorStatus?.(options.loadingMessage || '프로필 이미지를 저장하고 있습니다...');
    try {
      const result = await deps.saveProfileImageEditorSelection({
        db,
        memberUserId,
        editorState,
        edit,
        storage: deps.getFirebaseStorage?.(),
        authUid: deps.getAuthUid?.() || '',
        currentProfile: deps.getCurrentMemberProfile?.()
      }, {
        getFirestoreFieldValue: deps.getFirestoreFieldValue
      });
      deps.setCurrentMemberProfile?.(result?.nextProfile || deps.getCurrentMemberProfile?.());
      deps.closeProfileImageEditor?.();
      deps.renderHomeMemberDataFromFirestore?.();
      return result;
    } catch(error) {
      deps.warn?.('Firestore profile image update failed.', error);
      const message = editorState.source === 'upload'
        ? (options.uploadErrorMessage || '직접 업로드는 Firebase Storage를 먼저 켠 뒤 사용할 수 있어요. 지금은 검색 이미지 선택을 사용해 주세요.')
        : (options.errorMessage || '이미지 저장 중 문제가 생겼어요.');
      deps.setProfileImageEditorStatus?.(message, true);
      return null;
    } finally {
      setDisabled(saveButton, false);
    }
  }

  async function saveProfileRankingMessageFlow(options = {}, deps = {}) {
    const { memberUserId, db } = await requireProfileWriteContext(deps);
    const input = deps.getInput?.();
    const status = deps.getStatus?.();
    const button = deps.getButton?.();
    const message = deps.normalizeRankingMessageInput?.(input?.value || '') || '';
    setDisabled(button, true);
    setText(status, options.loadingMessage || '한마디를 저장하고 있습니다...');
    try {
      const updateData = await deps.saveRankingMessageForMember({
        db,
        memberUserId,
        message
      }, {
        getFirestoreFieldValue: deps.getFirestoreFieldValue
      });
      deps.setCurrentMemberProfile?.({
        ...(deps.getCurrentMemberProfile?.() || {}),
        rankingMessage: updateData.rankingMessage
      });
      if(input) input.value = updateData.rankingMessage;
      setText(status, updateData.rankingMessage ? '한마디를 저장했습니다.' : '한마디를 비웠습니다.');
      return updateData;
    } catch(error) {
      deps.warn?.('Firestore profile ranking message update failed.', error);
      setText(status, options.errorMessage || '한마디 저장 중 문제가 생겼어요.');
      return null;
    } finally {
      setDisabled(button, false);
    }
  }

  async function saveProfileNicknameFlow(options = {}, deps = {}) {
    const input = deps.getInput?.();
    const status = deps.getStatus?.();
    const button = deps.getButton?.();
    const nickname = input?.value || '';
    setDisabled(button, true);
    setText(status, options.loadingMessage || '닉네임을 변경하고 있습니다...');
    try {
      const result = await deps.updateCurrentMemberNickname(nickname);
      const nextNickname = result?.profile?.nickname || String(nickname).trim();
      if(input) input.value = nextNickname;
      setText(status, options.successMessage || '닉네임을 변경했습니다.');
      await deps.renderHomeMemberDataFromFirestore?.();
      return result;
    } catch(error) {
      deps.warn?.('Member nickname update failed.', error);
      setText(status, deps.getProfileNicknameErrorMessage?.(error) || options.errorMessage || '닉네임 변경 중 문제가 생겼어요.');
      return null;
    } finally {
      setDisabled(button, false);
    }
  }

  async function saveProfilePasswordFlow(options = {}, deps = {}) {
    const currentInput = deps.getCurrentInput?.();
    const newInput = deps.getNewInput?.();
    const confirmInput = deps.getConfirmInput?.();
    const status = deps.getStatus?.();
    const button = deps.getButton?.();
    setDisabled(button, true);
    setText(status, options.loadingMessage || '비밀번호를 변경하고 있습니다...');
    try {
      const result = await deps.changeCurrentMemberPasswordWithCurrentPassword(
        currentInput?.value || '',
        newInput?.value || '',
        confirmInput?.value || ''
      );
      if(currentInput) currentInput.value = '';
      if(newInput) newInput.value = '';
      if(confirmInput) confirmInput.value = '';
      setText(status, options.successMessage || '비밀번호를 변경했습니다. 다음 로그인부터 새 비밀번호를 사용하세요.');
      return result;
    } catch(error) {
      deps.warn?.('Profile password change failed.', error);
      setText(status, deps.getProfilePasswordErrorMessage?.(error) || options.errorMessage || '비밀번호 변경 중 문제가 생겼어요.');
      return null;
    } finally {
      setDisabled(button, false);
    }
  }

  async function saveProfileSelectedTitleFlow(options = {}, deps = {}) {
    const { memberUserId, db } = await requireProfileWriteContext(deps);
    const updateData = await deps.saveSelectedTitleForMember({
      db,
      memberUserId,
      titleId: options.titleId
    }, {
      getFirestoreFieldValue: deps.getFirestoreFieldValue
    });
    deps.setCurrentMemberProfile?.({
      ...(deps.getCurrentMemberProfile?.() || {}),
      selectedTitleId: updateData.selectedTitleId
    });
    deps.renderHomeMemberDataFromFirestore?.();
    return updateData;
  }

  const api = {
    searchProfileImageCandidatesFlow,
    selectProfileImageCandidateFlow,
    previewProfileImageUploadFlow,
    saveProfileImageEditorSelectionFlow,
    saveProfileRankingMessageFlow,
    saveProfileNicknameFlow,
    saveProfilePasswordFlow,
    saveProfileSelectedTitleFlow
  };

  root.DJ48ProfileUsecases = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
