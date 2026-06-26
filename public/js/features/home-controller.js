(function (root) {
  function resetProfileImageEditor(deps = {}) {
    const editorState = deps.getProfileImageEditorState?.();
    if(!editorState) return null;
    const nextState = deps.setProfileImageEditorState?.({
      ...editorState,
      profileImageScale: 1,
      profileImageOffsetX: 0,
      profileImageOffsetY: 0
    });
    deps.setProfileImageEditorControls?.(nextState);
    deps.updateProfileImageEditorPreview?.();
    return nextState;
  }

  function updateProfileImageEditorPreview(deps = {}) {
    const editorState = deps.getProfileImageEditorState?.();
    if(!editorState) return null;
    const values = deps.getProfileImageEditorControlValues?.() || {};
    const nextState = deps.setProfileImageEditorState?.(
      deps.applyProfileImageEditorControlValues?.(editorState, values) || editorState
    );
    const image = deps.getProfileImageEditorPreviewImage?.();
    if(image && nextState) deps.applyProfileImageTransform?.(image, nextState);
    return nextState || null;
  }

  function openProfileImageEditor(options = {}, deps = {}) {
    const currentEdit = deps.getProfileImageEditModel?.(deps.getCurrentMemberProfile?.() || {});
    const editorState = deps.setProfileImageEditorState?.(
      deps.buildProfileImageEditorState?.(options, currentEdit, {
        normalizeDisplayImageUrl: deps.normalizeDisplayImageUrl
      })
    );
    deps.renderProfileImageEditorModal?.(editorState, {
      getProfileImageEditModel: deps.getProfileImageEditModel,
      updateProfileImageEditorPreview: deps.updateProfileImageEditorPreview
    });
    return editorState || null;
  }

  function closeProfileImageEditor(deps = {}) {
    deps.closeProfileImageEditorModal?.();
    deps.clearProfileImageEditorState?.();
  }

  async function runProfileHomeAction(action, options = {}, deps = {}) {
    const usecases = deps.profileUsecases || {};
    const actionMap = {
      searchImageCandidates: 'searchProfileImageCandidatesFlow',
      selectImageCandidate: 'selectProfileImageCandidateFlow',
      previewImageUpload: 'previewProfileImageUploadFlow',
      saveImageEditorSelection: 'saveProfileImageEditorSelectionFlow',
      saveRankingMessage: 'saveProfileRankingMessageFlow',
      saveNickname: 'saveProfileNicknameFlow',
      savePassword: 'saveProfilePasswordFlow',
      saveSelectedTitle: 'saveProfileSelectedTitleFlow'
    };
    const usecaseName = actionMap[action] || action;
    const usecase = usecases[usecaseName];
    if(typeof usecase !== 'function') throw new Error(`unknown-profile-home-action:${action}`);
    return usecase(options, deps.getActionDeps?.(action) || {});
  }

  function bindProfileHomeEvents(deps = {}) {
    document.getElementById('profile-card-root')?.addEventListener('click', event => {
      const todayQuizButton = event.target.closest('[data-today-quiz-id]');
      if(todayQuizButton) {
        deps.showQuizSelectView?.(todayQuizButton.dataset.todayQuizId || '');
        return;
      }
      const profileToggle = event.target.closest('[data-profile-detail-toggle]');
      if(profileToggle) {
        const key = profileToggle.dataset.profileDetailToggle || '';
        const root = document.getElementById('profile-card-root');
        const wasActive = profileToggle.classList.contains('is-active');
        root.querySelectorAll('[data-profile-detail-toggle]').forEach(button => {
          button.classList.remove('is-active');
          button.setAttribute('aria-expanded', 'false');
        });
        root.querySelectorAll('[data-profile-detail-panel]').forEach(panel => {
          panel.classList.remove('is-active');
        });
        if(!wasActive) {
          profileToggle.classList.add('is-active');
          profileToggle.setAttribute('aria-expanded', 'true');
          root.querySelector(`[data-profile-detail-panel="${key}"]`)?.classList.add('is-active');
        }
        return;
      }
      if(event.target.closest('[data-profile-open-admin]')) {
        deps.showAdminView?.();
        return;
      }
      const levelMedalRange = event.target.closest('[data-profile-level-medal-range]');
      if(levelMedalRange) {
        const range = levelMedalRange.dataset.profileLevelMedalRange || 'all';
        const root = document.getElementById('profile-card-root');
        root?.querySelectorAll('[data-profile-level-medal-range]').forEach(button => {
          const isActive = button === levelMedalRange;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', String(isActive));
        });
        root?.querySelectorAll('[data-profile-level-medal-preview-level]').forEach(button => {
          const visible = range === 'all' || button.dataset.profileLevelMedalGroup === range;
          button.hidden = !visible;
        });
        return;
      }
      const levelMedalOption = event.target.closest('[data-profile-level-medal-preview-level]');
      if(levelMedalOption) {
        deps.saveProfileLevelMedalPreviewLevel?.(levelMedalOption.dataset.profileLevelMedalPreviewLevel);
        deps.renderHomeMemberDataFromFirestore?.();
        return;
      }
      if(event.target.closest('#profile-nickname-save-button')) {
        deps.saveProfileNicknameFromHome?.();
        return;
      }
      if(event.target.closest('#profile-password-save-button')) {
        deps.saveProfilePasswordFromHome?.();
        return;
      }
      if(event.target.closest('#profile-image-search-button')) {
        deps.searchProfileImageCandidatesFromHome?.().catch(error => {
          console.warn('Firestore profile image search failed.', error);
          const status = document.getElementById('profile-image-search-status');
          if(status) status.textContent = '이미지를 검색하지 못했습니다.';
        });
        return;
      }
      if(event.target.closest('#profile-image-upload-button')) {
        document.getElementById('profile-image-upload-input')?.click();
        return;
      }
      const imageOption = event.target.closest('[data-profile-image-index]');
      if(imageOption) {
        deps.saveSelectedProfileImageFromHome?.(imageOption.dataset.profileImageIndex).catch(error => {
          console.warn('Firestore profile image select failed.', error);
          const status = document.getElementById('profile-image-search-status');
          if(status) status.textContent = '이미지를 저장하지 못했습니다.';
        });
        return;
      }
      if(event.target.closest('#profile-ranking-message-save-button')) {
        deps.saveProfileRankingMessageFromHome?.();
      }
    });

    document.getElementById('home-view')?.addEventListener('click', event => {
      const homeToggle = event.target.closest('[data-home-detail-toggle]');
      if(!homeToggle) return;
      const key = homeToggle.dataset.homeDetailToggle || '';
      const homeView = document.getElementById('home-view');
      const wasActive = homeToggle.classList.contains('is-active');
      homeView.querySelectorAll('[data-home-detail-toggle]').forEach(button => {
        button.classList.remove('is-active');
        button.setAttribute('aria-expanded', 'false');
      });
      homeView.querySelectorAll('[data-home-detail-panel]').forEach(panel => {
        panel.classList.remove('is-active');
      });
      if(!wasActive) {
        homeToggle.classList.add('is-active');
        homeToggle.setAttribute('aria-expanded', 'true');
        const panel = homeView.querySelector(`[data-home-detail-panel="${key}"]`);
        panel?.classList.add('is-active');
      }
    });

    document.getElementById('profile-card-root')?.addEventListener('change', event => {
      if(event.target?.id !== 'profile-image-upload-input') return;
      const file = event.target.files?.[0] || null;
      deps.handleProfileImageUploadFile?.(file).catch(error => {
        console.warn('Profile image upload preview failed.', error);
        const status = document.getElementById('profile-image-search-status');
        if(status) status.textContent = '이미지 업로드 준비 중 문제가 생겼어요.';
      }).finally(() => {
        event.target.value = '';
      });
    });

    document.getElementById('profile-card-root')?.addEventListener('keydown', event => {
      if(event.key === 'Enter' && event.target?.id === 'profile-image-search-input') {
        event.preventDefault();
        deps.searchProfileImageCandidatesFromHome?.().catch(error => {
          console.warn('Firestore profile image search failed.', error);
        });
      }
    });

    document.querySelectorAll('[data-close-profile-image-editor]').forEach(button => {
      button.addEventListener('click', deps.closeProfileImageEditor);
    });

    ['profile-image-editor-scale', 'profile-image-editor-offset-x', 'profile-image-editor-offset-y'].forEach(inputId => {
      document.getElementById(inputId)?.addEventListener('input', deps.updateProfileImageEditorPreview);
    });

    document.getElementById('profile-image-editor-reset')?.addEventListener('click', () => {
      deps.resetProfileImageEditorFromHome?.();
    });

    document.getElementById('profile-image-editor-save')?.addEventListener('click', () => {
      deps.saveProfileImageEditorSelection?.().catch(error => {
        console.warn('Profile image editor save failed.', error);
        deps.setProfileImageEditorStatus?.('이미지 저장 중 문제가 생겼어요.', true);
      });
    });

    document.getElementById('title-catalog-button')?.addEventListener('click', deps.openTitleCatalogModal);
    document.getElementById('title-sync-button')?.addEventListener('click', event => {
      const button = event.currentTarget;
      if(button?.disabled) return;
      deps.syncCurrentMemberTitlesFromHome?.(button).catch(error => {
        console.warn('Firestore title sync from home failed.', error);
        deps.renderHomeMemberDataFromFirestore?.();
      });
    });

    document.getElementById('profile-ranking-refresh-button')?.addEventListener('click', () => {
      deps.renderProfileRankingRecordsFromFirestore?.().catch(error => {
        console.warn('Firestore profile ranking records manual refresh failed.', error);
        const root = document.getElementById('profile-ranking-root');
        if(root) root.innerHTML = '<p class="profile-ranking-empty">내 랭킹 기록을 불러오지 못했습니다.</p>';
      });
    });

    document.getElementById('title-card-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-select-title-id]');
      if(!button) return;
      const titleId = button.dataset.selectTitleId || '';
      button.disabled = true;
      button.textContent = titleId ? '저장 중...' : '선택됨';
      deps.saveProfileSelectedTitleFromHome?.(titleId).catch(error => {
        console.warn('Firestore selected title update failed.', error);
        deps.renderHomeMemberDataFromFirestore?.();
      });
    });
  }

  const api = {
    openProfileImageEditor,
    closeProfileImageEditor,
    runProfileHomeAction,
    resetProfileImageEditor,
    updateProfileImageEditorPreview,
    bindProfileHomeEvents
  };

  root.DJ48HomeController = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
