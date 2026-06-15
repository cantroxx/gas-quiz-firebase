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

  function setMemberLinkStatus(message, isError = false) {
    const status = document.getElementById('member-link-status');
    if(!status) return;
    status.innerHTML = '';
    const text = document.createElement('p');
    text.textContent = message;
    text.style.color = isError ? '#b3261e' : '';
    status.appendChild(text);
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
    setMemberLinkStatus,
    setMemberLinkFormMode
  };
})();
