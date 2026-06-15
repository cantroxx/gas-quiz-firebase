(function () {
  function bindAccountEvents(deps = {}) {
    document.getElementById('member-link-form')?.addEventListener('submit', deps.handleMemberLinkSubmit);

    document.querySelectorAll('[data-member-form-mode]').forEach(button => {
      button.addEventListener('click', () => deps.setMemberLinkFormMode?.(button.dataset.memberFormMode));
    });

    deps.setMemberLinkFormMode?.('login');

    document.getElementById('member-password-reset-button')?.addEventListener('click', deps.handleMemberPasswordResetClick);

    document.querySelectorAll('[data-member-unlink]').forEach(button => {
      button.addEventListener('click', deps.handleMemberUnlinkClick);
    });

    document.getElementById('member-link-status')?.addEventListener('click', event => {
      if(event.target.closest('#member-unlink-button')) deps.handleMemberUnlinkClick?.();
      if(event.target.closest('#member-password-change-button')) deps.handleMemberPasswordChangeClick?.();
    });
  }

  window.DJ48AccountController = {
    bindAccountEvents
  };
})();
