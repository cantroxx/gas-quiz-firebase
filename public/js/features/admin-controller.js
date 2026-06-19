(function () {
  function bindAdminEvents(deps = {}) {
    document.getElementById('admin-member-refresh')?.addEventListener('click', () => {
      deps.hideAdminTemporaryPassword?.();
      deps.loadAdminMembers?.().catch(error => {
        console.warn('Admin member refresh failed.', error);
        deps.setAdminStatus?.('회원 목록을 다시 불러오지 못했습니다.', true);
      });
    });

    document.getElementById('admin-dashboard-refresh')?.addEventListener('click', () => {
      deps.loadAdminDashboard?.().catch(error => {
        console.warn('Admin dashboard refresh failed.', error);
        deps.setAdminDashboardStatus?.('대시보드를 다시 불러오지 못했습니다.', true);
      });
    });

    document.getElementById('admin-audit-refresh')?.addEventListener('click', () => {
      deps.loadAdminOperationalAudit?.().catch(error => {
        console.warn('Admin operational audit refresh failed.', error);
        deps.setAdminAuditStatus?.('운영 점검을 다시 불러오지 못했습니다.', true);
      });
    });

    document.getElementById('admin-quiz-quality-refresh')?.addEventListener('click', () => {
      deps.loadAdminQuizQualityAudit?.().catch(error => {
        console.warn('Admin quiz quality audit refresh failed.', error);
        deps.setAdminQuizQualityStatus?.('문제 점검을 다시 불러오지 못했습니다.', true);
      });
    });

    document.getElementById('admin-temp-password-copy')?.addEventListener('click', () => {
      const password = document.getElementById('admin-temp-password-value')?.textContent || '';
      if(!password) return;
      if(!navigator.clipboard?.writeText) {
        deps.setAdminStatus?.('이 브라우저에서는 자동 복사를 지원하지 않습니다. 임시 비밀번호를 직접 선택해 주세요.', true);
        return;
      }
      navigator.clipboard.writeText(password)
        .then(() => deps.setAdminStatus?.('임시 비밀번호를 복사했습니다.'))
        .catch(error => {
          console.warn('Admin temporary password copy failed.', error);
          deps.setAdminStatus?.('복사하지 못했습니다. 임시 비밀번호를 직접 선택해 주세요.', true);
        });
    });

    document.getElementById('admin-member-list')?.addEventListener('click', event => {
      const button = event.target.closest('[data-admin-action]');
      const card = event.target.closest('[data-member-user-id]');
      if(!button || !card || button.disabled) return;
      if(button.dataset.adminAction === 'detail') {
        deps.openAdminMemberDetail?.(card.dataset.memberUserId);
        return;
      }
      button.disabled = true;
      deps.runAdminMemberAction?.(button.dataset.adminAction, card.dataset.memberUserId)
        .catch(error => {
          console.warn('Admin member action failed.', error);
          deps.setAdminStatus?.(window.DJ48AdminForm.getAdminMemberActionErrorMessage(error), true);
        })
        .finally(() => {
          button.disabled = false;
        });
    });

    document.querySelectorAll('[data-close-admin-member-detail]').forEach(button => {
      button.addEventListener('click', deps.closeAdminMemberDetailModal);
    });

    document.querySelector('[data-admin-logout]')?.addEventListener('click', () => {
      deps.logoutAdminMember?.().catch(error => {
        console.warn('Admin logout failed.', error);
        deps.setAdminStatus?.('로그아웃 중 문제가 생겼습니다.', true);
      });
    });

    document.querySelector('[data-admin-open-town]')?.addEventListener('click', deps.showTownView);
    document.querySelector('[data-admin-open-classroom]')?.addEventListener('click', () => deps.showClassroomView?.(false));

    document.getElementById('admin-classroom-refresh')?.addEventListener('click', () => {
      deps.renderAdminClassroomReview?.(true).catch(error => {
        console.warn('Admin classroom refresh failed.', error);
        const status = document.getElementById('admin-classroom-status');
        if(status) status.textContent = '우리 교실 확인 대기 목록을 다시 불러오지 못했습니다.';
      });
    });

    document.querySelectorAll('[data-admin-section-target]').forEach(control => {
      control.addEventListener('click', () => {
        deps.setActiveAdminSection?.(control.dataset.adminSectionTarget);
      });
    });

    document.getElementById('admin-notice-load')?.addEventListener('click', () => {
      deps.loadAdminNoticeBoard?.().catch(error => {
        console.warn('Admin notice load failed.', error);
        deps.setAdminNoticeStatus?.('알림판을 불러오지 못했습니다.', true);
      });
    });

    document.getElementById('admin-notice-save')?.addEventListener('click', () => {
      deps.saveAdminNoticeBoard?.().catch(error => {
        console.warn('Admin notice save failed.', error);
        deps.setAdminNoticeStatus?.('알림판 저장 중 문제가 생겼습니다.', true);
      });
    });

    document.getElementById('admin-external-quizzes-load')?.addEventListener('click', () => {
      deps.loadAdminExternalQuizzes?.().catch(error => {
        console.warn('Admin external quizzes load failed.', error);
        deps.setAdminExternalQuizzesStatus?.('외부 퀴즈를 불러오지 못했습니다.', true);
      });
    });

    document.getElementById('admin-external-quizzes-save')?.addEventListener('click', () => {
      deps.saveAdminExternalQuizzes?.().catch(error => {
        console.warn('Admin external quizzes save failed.', error);
        deps.setAdminExternalQuizzesStatus?.(window.DJ48AdminForm.getAdminExternalQuizzesSaveErrorMessage(error), true);
      });
    });

    document.getElementById('admin-login-settings-load')?.addEventListener('click', () => {
      deps.loadAdminLoginSettings?.().catch(error => {
        console.warn('Admin login settings load failed.', error);
        deps.setAdminLoginSettingsStatus?.('로그인 설정을 불러오지 못했습니다.', true);
      });
    });

    document.getElementById('admin-login-settings-save')?.addEventListener('click', () => {
      deps.saveAdminLoginSettings?.().catch(error => {
        console.warn('Admin login settings save failed.', error);
        deps.setAdminLoginSettingsStatus?.(window.DJ48AdminForm.getAdminLoginSettingsSaveErrorMessage(error), true);
      });
    });

    document.getElementById('admin-feature-flags-load')?.addEventListener('click', () => {
      deps.loadAdminFeatureFlags?.().catch(error => {
        console.warn('Admin feature flags load failed.', error);
        deps.setAdminFeatureFlagsStatus?.('기능 설정을 불러오지 못했습니다.', true);
      });
    });

    document.getElementById('admin-feature-flags-save')?.addEventListener('click', () => {
      deps.saveAdminFeatureFlags?.().catch(error => {
        console.warn('Admin feature flags save failed.', error);
        deps.setAdminFeatureFlagsStatus?.(window.DJ48AdminForm.getAdminFeatureFlagsSaveErrorMessage(error), true);
      });
    });

    document.getElementById('admin-permission-grant')?.addEventListener('click', () => {
      deps.setClassAdminPermission?.(true).catch(error => {
        console.warn('Admin class permission grant failed.', error);
        deps.setAdminPermissionStatus?.(window.DJ48AdminForm.getAdminPermissionGrantErrorMessage(error), true);
      });
    });

    document.getElementById('admin-permission-revoke')?.addEventListener('click', () => {
      deps.setClassAdminPermission?.(false).catch(error => {
        console.warn('Admin class permission revoke failed.', error);
        deps.setAdminPermissionStatus?.(window.DJ48AdminForm.getAdminPermissionRevokeErrorMessage(error), true);
      });
    });

    document.getElementById('admin-logs-refresh')?.addEventListener('click', () => {
      deps.loadAdminLogs?.().catch(error => {
        console.warn('Admin logs refresh failed.', error);
        deps.setAdminLogsStatus?.('작업 이력을 다시 불러오지 못했습니다.', true);
      });
    });

    document.getElementById('admin-logs-action-filter')?.addEventListener('change', () => {
      deps.loadAdminLogs?.().catch(error => {
        console.warn('Admin logs action filter failed.', error);
        deps.setAdminLogsStatus?.('작업 이력을 다시 불러오지 못했습니다.', true);
      });
    });

    document.getElementById('admin-logs-target-filter')?.addEventListener('keydown', event => {
      if(event.key !== 'Enter') return;
      deps.loadAdminLogs?.().catch(error => {
        console.warn('Admin logs target filter failed.', error);
        deps.setAdminLogsStatus?.('작업 이력을 다시 불러오지 못했습니다.', true);
      });
    });
  }

  window.DJ48AdminController = {
    bindAdminEvents
  };
})();
