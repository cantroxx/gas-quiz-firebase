(function () {
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

    if(!gradeNumber || !classNoNumber || !studentNoNumber) {
      throw new Error('invalid-member-identity');
    }

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
    normalizeLegacyMemberSchool,
    buildLegacyMemberUserId,
    getTemporaryPasswordText,
    normalizeMemberProfileFromFirestore,
    isRestorableMemberProfile,
    callAccountCallable,
    registerNewMember,
    loginMemberWithPassword,
    resetMemberPasswordToTemporary,
    changeMemberPassword,
    updateMemberNickname
  };
})();
