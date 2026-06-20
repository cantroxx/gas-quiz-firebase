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
      const editButton = event.target.closest('[data-classroom-quest-edit-id]');
      if(editButton && !editButton.disabled) {
        deps.editClassroomQuest?.(editButton.dataset.classroomQuestEditId || '');
        return;
      }
      const deactivateButton = event.target.closest('[data-classroom-quest-deactivate-id]');
      if(deactivateButton && !deactivateButton.disabled) {
        deps.deactivateClassroomQuest?.(deactivateButton.dataset.classroomQuestDeactivateId || '', deactivateButton);
        return;
      }
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
      const buyButton = event.target.closest('[data-classroom-shop-buy-id]');
      if(buyButton && !buyButton.disabled) {
        deps.purchaseClassroomShopItem?.(buyButton.dataset.classroomShopBuyId || '', buyButton);
        return;
      }
      const requestButton = event.target.closest('[data-classroom-shop-request-use-id]');
      if(requestButton && !requestButton.disabled) {
        deps.requestClassroomShopPurchaseUse?.(requestButton.dataset.classroomShopRequestUseId || '', requestButton);
        return;
      }
      const approveButton = event.target.closest('[data-classroom-shop-approve-use-id]');
      if(approveButton && !approveButton.disabled) {
        deps.approveClassroomShopPurchaseUse?.(approveButton.dataset.classroomShopApproveUseId || '', approveButton);
        return;
      }
      const completeButton = event.target.closest('[data-classroom-shop-complete-use-id]');
      if(completeButton && !completeButton.disabled) {
        deps.completeClassroomShopPurchaseUse?.(completeButton.dataset.classroomShopCompleteUseId || '', completeButton);
      }
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
