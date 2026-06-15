(function () {
  function bindClassroomEvents(deps = {}) {
    document.getElementById('classroom-entry-form')?.addEventListener('submit', deps.handleClassroomEntrySubmit);

    document.getElementById('classroom-quest-form')?.addEventListener('submit', event => {
      deps.saveClassroomQuestFromForm?.(event);
    });

    document.getElementById('classroom-badge-campaign-form')?.addEventListener('submit', event => {
      deps.awardClassroomBadgeCampaignFromForm?.(event);
    });

    document.getElementById('classroom-job-form')?.addEventListener('submit', event => {
      deps.saveClassroomJobFromForm?.(event);
    });

    document.getElementById('classroom-shop-item-form')?.addEventListener('submit', event => {
      deps.saveClassroomShopItemFromForm?.(event);
    });

    document.getElementById('classroom-routine-form')?.addEventListener('submit', event => {
      deps.saveClassroomRoutineFromForm?.(event);
    });

    document.querySelectorAll('[data-classroom-tab]').forEach(button => {
      button.addEventListener('click', () => deps.setActiveClassroomTab?.(button.dataset.classroomTab || 'quests'));
    });

    document.getElementById('classroom-quest-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-classroom-quest-action]');
      if(!button || button.disabled) return;
      deps.completeClassroomCheckQuest?.(button.dataset.classroomQuestAction || '');
    });

    document.getElementById('classroom-gem-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-classroom-badge-gem-id]');
      if(!button || button.disabled) return;
      deps.setClassroomSelectedGemBadge?.(button.dataset.classroomBadgeGemId || '');
    });

    document.getElementById('classroom-job-grid')?.addEventListener('click', event => {
      const applyButton = event.target.closest('[data-classroom-job-apply-id]');
      if(applyButton && !applyButton.disabled) {
        deps.applyClassroomJob?.(applyButton.dataset.classroomJobApplyId || '', applyButton);
        return;
      }
      const assignButton = event.target.closest('[data-classroom-job-assign-id]');
      if(assignButton && !assignButton.disabled) {
        deps.assignClassroomJob?.(assignButton.dataset.classroomJobAssignId || '', assignButton);
        return;
      }
      const releaseButton = event.target.closest('[data-classroom-job-release-id]');
      if(releaseButton && !releaseButton.disabled) {
        deps.releaseClassroomJob?.(releaseButton.dataset.classroomJobReleaseId || '', releaseButton);
        return;
      }
      const salaryButton = event.target.closest('[data-classroom-job-salary-id]');
      if(salaryButton && !salaryButton.disabled) {
        deps.claimClassroomJobSalary?.(salaryButton.dataset.classroomJobSalaryId || '', salaryButton);
      }
    });

    document.getElementById('classroom-shop-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-classroom-shop-buy-id]');
      if(!button || button.disabled) return;
      deps.purchaseClassroomShopItem?.(button.dataset.classroomShopBuyId || '', button);
    });

    document.getElementById('classroom-routine-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-classroom-routine-check-id]');
      if(!button || button.disabled) return;
      deps.checkClassroomRoutine?.(button.dataset.classroomRoutineCheckId || '', button);
    });

    const reviewClassroomAction = event => {
      const button = event.target.closest('[data-classroom-review-action]');
      if(!button || button.disabled) return;
      deps.reviewClassroomQuestProgress?.(
        button.dataset.classroomReviewId || '',
        button.dataset.classroomReviewAction || ''
      );
    };

    document.getElementById('classroom-review-grid')?.addEventListener('click', reviewClassroomAction);
    document.getElementById('admin-classroom-review-grid')?.addEventListener('click', reviewClassroomAction);
  }

  window.DJ48ClassroomController = {
    bindClassroomEvents
  };
})();
