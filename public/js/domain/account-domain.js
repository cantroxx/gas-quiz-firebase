(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48AccountDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  function normalizeLegacyMemberSchool(school, deps = {}) {
    const defaultMemberSchool = deps.defaultMemberSchool || '동자';
    const value = String(school || '').trim();
    if(!value) return defaultMemberSchool;
    const normalized = value
      .replace(/^서울/, '')
      .replace(/초등학교$/, '')
      .replace(/초$/, '')
      .trim();
    return normalized || defaultMemberSchool;
  }

  function buildLegacyMemberUserId(school, grade, classNumber, studentNumber, deps = {}) {
    const defaultMemberSchool = deps.defaultMemberSchool || '동자';
    const normalizedSchool = normalizeLegacyMemberSchool(school, { defaultMemberSchool });
    const gradeNumber = Number(grade);
    const classNoNumber = Number(classNumber);
    const studentNoNumber = Number(studentNumber);
    if(!gradeNumber || !classNoNumber || !studentNoNumber) throw new Error('invalid-member-identity');
    const baseUserId = `G${gradeNumber}-C${classNoNumber}-N${String(studentNoNumber).padStart(2, '0')}`;
    if(normalizedSchool === defaultMemberSchool) return baseUserId;
    const schoolKey = normalizedSchool.replace(/[^0-9A-Za-z가-힣_-]/g, '');
    return schoolKey ? `S${schoolKey}-${baseUserId}` : baseUserId;
  }

  function getTemporaryPasswordText(values = {}) {
    const grade = Number(values.grade);
    const classNumber = Number(values.classNumber);
    const studentNumber = Number(values.studentNumber);
    if(!grade || !classNumber || !studentNumber) return '';
    return `${grade}${classNumber}${String(studentNumber).padStart(2, '0')}`;
  }

  function getMemberLinkSubmitPendingMessage(values = {}) {
    return values.action === 'setup'
      ? '신규가입 정보를 확인하고 계정을 만들고 있습니다...'
      : '회원 정보와 비밀번호를 확인하고 있습니다...';
  }

  function getMemberLinkSubmitSuccessMessage(profile = {}) {
    const actionMessage = profile._authLinkAction === 'password-setup'
      ? '비밀번호가 등록되고 로그인됐어요.'
      : profile._authLinkAction === 'member-signup'
        ? '신규가입이 완료되고 로그인됐어요.'
        : '비밀번호 로그인이 완료됐어요.';
    return `${profile.nickname || profile.userId} ${actionMessage} ${profile.grade}학년 ${profile.classNumber}반 ${profile.studentNumber}번`;
  }

  function shouldWaitForRequiredPasswordChange(options = {}) {
    return !!options.pendingPasswordChange?.memberUserId
      && options.pendingPasswordChange.memberUserId === options.currentMemberUserId;
  }

  function getMemberLinkDestination(profile = {}, currentMemberProfile = null) {
    return profile.role === 'admin' || currentMemberProfile?.role === 'admin' ? 'admin' : 'town';
  }

  function getRestoredMemberDestination(profile) {
    if(!profile) return '';
    return profile.role === 'admin' ? 'admin' : 'town';
  }

  function normalizeRankingMessageInput(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 24);
  }

  function normalizeProfileImageInput(value) {
    return String(value || '').trim().slice(0, 500);
  }

  function getResolvedUserChangeState(options = {}) {
    const lastResolvedUserId = String(options.lastResolvedUserId || '');
    const nextUserId = String(options.nextUserId || '');
    const testShopUserId = String(options.testShopUserId || '');
    const changed = !!lastResolvedUserId && lastResolvedUserId !== nextUserId;
    return {
      nextLastResolvedUserId: nextUserId,
      shouldClearMemberProfile: changed,
      shouldClearLinkedMemberHint: changed && lastResolvedUserId !== testShopUserId,
      shouldResetUserScopedRuntimeData: changed
    };
  }

  function getUnlinkCurrentMemberState(options = {}) {
    if(!options.auth || !options.authUid) throw new Error('auth-required');
    if(!options.memberUserId) throw new Error('member-not-linked');
    return {
      currentMemberUserId: '',
      currentMemberProfile: null,
      shouldClearLinkedMemberHint: true,
      shouldResetUserScopedRuntimeData: true,
      shouldResetFirebaseAuthState: true
    };
  }

  return {
    normalizeLegacyMemberSchool,
    buildLegacyMemberUserId,
    getTemporaryPasswordText,
    getMemberLinkSubmitPendingMessage,
    getMemberLinkSubmitSuccessMessage,
    shouldWaitForRequiredPasswordChange,
    getMemberLinkDestination,
    getRestoredMemberDestination,
    normalizeRankingMessageInput,
    normalizeProfileImageInput,
    getResolvedUserChangeState,
    getUnlinkCurrentMemberState
  };
});
