(function () {
  function renderMemberLinkPanel(options = {}) {
    const status = document.getElementById('member-link-status');
    if(!status) return;
    const currentMemberProfile = options.currentMemberProfile || null;
    const currentMemberUserId = options.currentMemberUserId || '';
    const pendingPasswordChange = options.pendingPasswordChange || null;

    status.innerHTML = '';

    if(currentMemberProfile) {
      const summary = document.createElement('p');
      summary.textContent = '로그인 상태를 확인했어요. 타운으로 이동합니다.';
      status.appendChild(summary);
      if(pendingPasswordChange?.memberUserId === currentMemberUserId) {
        const changePanel = document.createElement('div');
        const guide = document.createElement('p');
        const newPasswordInput = document.createElement('input');
        const confirmPasswordInput = document.createElement('input');
        const changeButton = document.createElement('button');
        changePanel.className = 'member-link-form';
        guide.textContent = '임시 비밀번호로 로그인했습니다. 새 비밀번호를 설정해야 계속 사용할 수 있습니다.';
        newPasswordInput.id = 'member-password-change-new';
        newPasswordInput.type = 'password';
        newPasswordInput.minLength = 4;
        newPasswordInput.autocomplete = 'new-password';
        newPasswordInput.placeholder = '새 비밀번호';
        confirmPasswordInput.id = 'member-password-change-confirm';
        confirmPasswordInput.type = 'password';
        confirmPasswordInput.minLength = 4;
        confirmPasswordInput.autocomplete = 'new-password';
        confirmPasswordInput.placeholder = '새 비밀번호 확인';
        changeButton.id = 'member-password-change-button';
        changeButton.className = 'button primary';
        changeButton.type = 'button';
        changeButton.textContent = '새 비밀번호 저장';
        changePanel.append(guide, newPasswordInput, confirmPasswordInput, changeButton);
        status.appendChild(changePanel);
      }
      return;
    }

    const note = document.createElement('p');
    note.textContent = '처음 접속하면 학교/학년/반/번호와 기존 닉네임으로 비밀번호를 만들고, 이후에는 비밀번호로 로그인합니다.';
    status.appendChild(note);
  }

  function getMemberLinkFormValues(options = {}) {
    return {
      school: document.getElementById('member-link-school')?.value || options.defaultMemberSchool || '동자',
      grade: document.getElementById('member-link-grade')?.value || '',
      classNumber: document.getElementById('member-link-class')?.value || '',
      studentNumber: document.getElementById('member-link-number')?.value || '',
      nickname: document.getElementById('member-link-nickname')?.value || '',
      password: document.getElementById('member-link-password')?.value || '',
      passwordConfirm: document.getElementById('member-link-password-confirm')?.value || '',
      action: options.memberLinkSubmitAction || 'login'
    };
  }

  function getMemberPasswordChangeValues() {
    return {
      newPassword: document.getElementById('member-password-change-new')?.value || '',
      passwordConfirm: document.getElementById('member-password-change-confirm')?.value || ''
    };
  }

  function setButtonBusy(button, busyText = '') {
    const state = {
      textContent: button?.textContent || '',
      disabled: button?.disabled === true
    };
    if(button) {
      button.disabled = true;
      if(busyText) button.textContent = busyText;
    }
    return state;
  }

  function restoreButtonState(button, state = {}) {
    if(!button) return;
    button.disabled = state.disabled === true;
    if(state.textContent) button.textContent = state.textContent;
  }

  function setMemberLinkStatus(message, isError = false) {
    const status = document.getElementById('member-link-status');
    if(!status) return;
    status.innerHTML = '';
    const text = document.createElement('p');
    text.textContent = message;
    text.style.color = isError ? '#b3261e' : '';
    status.appendChild(text);
  }

  function appendMemberLinkError(message) {
    const status = document.getElementById('member-link-status');
    const errorText = document.createElement('p');
    errorText.textContent = message;
    errorText.style.color = '#b3261e';
    status?.appendChild(errorText);
  }

  function getMappedErrorMessage(error, messages = {}, fallback = '') {
    return messages[error?.message] || fallback;
  }

  function getMemberUnlinkErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'auth-required': 'Firebase Auth 로그인 후 해제할 수 있어요.',
      'member-not-linked': '현재 연결된 회원이 없습니다.'
    }, '회원 연결 해제 중 문제가 생겼어요.');
  }

  function getMemberPasswordChangeErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'functions-unavailable': '비밀번호 변경 서버 연결을 사용할 수 없어요.',
      'password-change-not-required': '현재 비밀번호 변경이 필요한 상태가 아닙니다.',
      'password-required': '새 비밀번호를 입력해 주세요.',
      'password-confirm-mismatch': '새 비밀번호 확인이 일치하지 않아요.',
      'functions/invalid-argument': '비밀번호는 4자리 이상이어야 하고 너무 쉬운 값은 사용할 수 없어요.',
      'functions/permission-denied': '현재 비밀번호 확인에 실패했어요. 다시 로그인해 주세요.',
      'functions/failed-precondition': '비밀번호가 아직 등록되지 않았어요.'
    }, '비밀번호 변경 중 문제가 생겼어요.');
  }

  function getMemberPasswordChangeSuccessMessage() {
    return '새 비밀번호가 저장됐어요. 이제 이 비밀번호로 로그인할 수 있습니다.';
  }

  function getMemberPasswordResetErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'functions-unavailable': '회원 검증 서버 연결을 사용할 수 없어요.',
      'functions/invalid-argument': '학교, 학년, 반, 번호를 다시 확인해 주세요.',
      'functions/not-found': '해당 학교/학년/반/번호의 회원을 찾지 못했어요.',
      'functions/failed-precondition': '비활성화된 계정입니다. 선생님께 문의하세요.'
    }, '비밀번호 초기화 중 문제가 생겼어요.');
  }

  function getMemberPasswordResetConfirmMessage(temporaryPassword) {
    return `비밀번호를 임시 비밀번호(${temporaryPassword})로 바꿀까요? 다음 로그인 뒤 새 비밀번호를 다시 만들어야 합니다.`;
  }

  function getMemberPasswordResetSuccessMessage(temporaryPassword) {
    return `임시 비밀번호는 ${temporaryPassword}입니다. 이 비밀번호로 로그인한 뒤 새 비밀번호를 저장해 주세요.`;
  }

  function getMemberLinkSubmitErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'firestore-unavailable': 'Firestore 연결을 사용할 수 없어요.',
      'functions-unavailable': '회원 검증 서버 연결을 사용할 수 없어요.',
      'auth-required': 'Firebase Auth 로그인 후 연결할 수 있어요.',
      'nickname-required': '신규가입에는 닉네임을 입력해 주세요.',
      'password-required': '비밀번호를 입력해 주세요.',
      'password-confirm-mismatch': '비밀번호 확인이 일치하지 않아요.',
      'invalid-member-identity': '학교, 학년, 반, 번호를 다시 확인해 주세요.',
      'member-not-found': '해당 학교/학년/반/번호의 회원을 찾지 못했어요.',
      'member-not-student': '학생 계정만 사용할 수 있는 기능입니다.',
      'member-inactive': '비활성화된 계정입니다. 선생님께 문의하세요.',
      'functions/invalid-argument': '학교, 학년, 반, 번호, 닉네임 또는 비밀번호를 다시 확인해 주세요.',
      'functions/not-found': '등록되지 않은 학년/반/번호입니다. 신규가입을 진행해 주세요.',
      'functions/already-exists': '이미 등록된 회원입니다. 로그인으로 입장해 주세요.',
      'functions/failed-precondition': '비밀번호 설정 기간이 지났거나 아직 비밀번호가 등록되지 않았어요.',
      'functions/permission-denied': '비밀번호가 맞지 않아요.',
      'functions/resource-exhausted': '시도 횟수가 초과됐어요. 잠시 후 다시 시도하거나 선생님께 문의하세요.'
    }, '회원 연결 중 문제가 생겼어요.');
  }

  function getMemberLinkSubmitPendingMessage(values = {}) {
    return window.DJ48AccountDomain.getMemberLinkSubmitPendingMessage(values);
  }

  function getMemberLinkSubmitSuccessMessage(profile = {}) {
    return window.DJ48AccountDomain.getMemberLinkSubmitSuccessMessage(profile);
  }

  function shouldWaitForRequiredPasswordChange(options = {}) {
    return window.DJ48AccountDomain.shouldWaitForRequiredPasswordChange(options);
  }

  function getMemberLinkDestination(profile = {}, currentMemberProfile = null) {
    return window.DJ48AccountDomain.getMemberLinkDestination(profile, currentMemberProfile);
  }

  function getProfileNicknameErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'member-required': '로그인 후 닉네임을 바꿀 수 있어요.',
      'functions-unavailable': '닉네임 변경 서버 연결을 사용할 수 없어요.',
      'nickname-required': '닉네임을 입력해 주세요.',
      'functions/invalid-argument': '닉네임은 2~20글자이며 불건전한 말은 사용할 수 없어요.',
      'functions/permission-denied': '현재 로그인 정보로는 닉네임을 바꿀 수 없어요.',
      'functions/not-found': '회원 정보를 찾지 못했습니다.'
    }, '닉네임 변경 중 문제가 생겼어요.');
  }

  function getProfilePasswordErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'member-required': '로그인 후 비밀번호를 바꿀 수 있어요.',
      'functions-unavailable': '비밀번호 변경 서버 연결을 사용할 수 없어요.',
      'current-password-required': '현재 비밀번호를 입력해 주세요.',
      'password-required': '새 비밀번호를 입력해 주세요.',
      'password-confirm-mismatch': '새 비밀번호 확인이 일치하지 않아요.',
      'functions/invalid-argument': '새 비밀번호는 4자리 이상이어야 하며 현재 비밀번호와 달라야 합니다.',
      'functions/permission-denied': '현재 비밀번호가 맞지 않아요.',
      'functions/failed-precondition': '비밀번호가 아직 등록되지 않았어요.'
    }, '비밀번호 변경 중 문제가 생겼어요.');
  }

  function setMemberLinkFormMode(mode) {
    const nextMode = mode === 'signup' ? 'signup' : 'login';
    const form = document.getElementById('member-link-form');
    const guide = document.getElementById('member-link-form-guide');
    const submit = document.getElementById('member-link-submit-button');
    const loginButton = document.getElementById('member-login-mode-button');
    const signupButton = document.getElementById('member-signup-mode-button');
    const memberLinkSubmitAction = nextMode === 'signup' ? 'setup' : 'login';
    form?.classList.toggle('is-signup-mode', nextMode === 'signup');
    form?.classList.toggle('is-login-mode', nextMode === 'login');
    loginButton?.classList.toggle('is-active', nextMode === 'login');
    signupButton?.classList.toggle('is-active', nextMode === 'signup');
    loginButton?.setAttribute('aria-pressed', String(nextMode === 'login'));
    signupButton?.setAttribute('aria-pressed', String(nextMode === 'signup'));
    if(guide) {
      guide.textContent = nextMode === 'signup'
        ? '등록되지 않은 학생은 학교/학년/반/번호/닉네임/비밀번호를 입력해 새 계정을 만듭니다.'
        : '비밀번호를 이미 만든 학생은 학교/학년/반/번호/비밀번호만 입력합니다. 첫 비밀번호는 학년반번호 4자리입니다.';
    }
    if(submit) {
      submit.value = memberLinkSubmitAction;
      submit.textContent = nextMode === 'signup' ? '신규가입' : '로그인';
    }
    return memberLinkSubmitAction;
  }

  window.DJ48AccountForm = {
    renderMemberLinkPanel,
    getMemberLinkFormValues,
    getMemberPasswordChangeValues,
    setButtonBusy,
    restoreButtonState,
    setMemberLinkStatus,
    appendMemberLinkError,
    getMemberUnlinkErrorMessage,
    getMemberPasswordChangeErrorMessage,
    getMemberPasswordChangeSuccessMessage,
    getMemberPasswordResetErrorMessage,
    getMemberPasswordResetConfirmMessage,
    getMemberPasswordResetSuccessMessage,
    getMemberLinkSubmitErrorMessage,
    getMemberLinkSubmitPendingMessage,
    getMemberLinkSubmitSuccessMessage,
    shouldWaitForRequiredPasswordChange,
    getMemberLinkDestination,
    getProfileNicknameErrorMessage,
    getProfilePasswordErrorMessage,
    setMemberLinkFormMode
  };
})();
