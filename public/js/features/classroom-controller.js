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

    document.getElementById('classroom-notice-form')?.addEventListener('submit', event => {
      deps.saveClassroomNoticesFromForm?.(event);
    });

    document.getElementById('classroom-mission-form')?.addEventListener('submit', event => {
      deps.saveClassroomMissionFromForm?.(event);
    });

    document.getElementById('classroom-tax-form')?.addEventListener('submit', event => {
      deps.saveClassroomTaxPresetFromForm?.(event);
    });

    document.getElementById('classroom-tax-run-current-button')?.addEventListener('click', event => {
      deps.collectClassroomTaxFromForm?.(event);
    });

    document.getElementById('classroom-gem-form')?.addEventListener('submit', event => {
      deps.saveClassroomGemFromForm?.(event);
    });

    document.getElementById('classroom-group-purchase-form')?.addEventListener('submit', event => {
      deps.saveClassroomGroupPurchaseFromForm?.(event);
    });

    document.getElementById('classroom-savings-form')?.addEventListener('submit', event => {
      deps.saveClassroomSavingsProductFromForm?.(event);
    });

    document.getElementById('classroom-exchange-form')?.addEventListener('submit', event => {
      deps.saveClassroomExchangeSettingsFromForm?.(event);
    });

    document.getElementById('classroom-routine-form')?.addEventListener('submit', event => {
      deps.saveClassroomRoutineFromForm?.(event);
    });

    document.querySelectorAll('[data-classroom-subtab]').forEach(button => {
      button.addEventListener('click', () => {
        const nextTab = button.dataset.classroomSubtab || 'student-card';
        deps.setActiveClassroomTab?.(nextTab);
      });
    });

    document.querySelectorAll('[data-classroom-market-tab]').forEach(button => {
      button.addEventListener('click', () => {
        const nextTab = button.dataset.classroomMarketTab || 'point';
        document.querySelectorAll('[data-classroom-market-tab]').forEach(tab => {
          const active = tab === button;
          tab.classList.toggle('is-active', active);
          tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('[data-classroom-market-pane]').forEach(pane => {
          pane.classList.toggle('is-active', pane.dataset.classroomMarketPane === nextTab);
        });
      });
    });

    document.querySelectorAll('[data-classroom-tab]').forEach(button => {
      button.addEventListener('click', () => deps.setActiveClassroomTab?.(button.dataset.classroomTab || 'classroom'));
    });

    document.getElementById('classroom-today-grid')?.addEventListener('click', event => {
      const deleteBillboardButton = event.target.closest('[data-classroom-billboard-delete-id]');
      if(deleteBillboardButton && !deleteBillboardButton.disabled) {
        deps.deleteClassroomBillboardMessage?.(deleteBillboardButton.dataset.classroomBillboardDeleteId || '', deleteBillboardButton);
        return;
      }
      const button = event.target.closest('[data-classroom-today-tab]');
      if(!button || button.disabled) return;
      deps.setActiveClassroomTab?.(button.dataset.classroomTodayTab || 'today');
      if(button.dataset.classroomSubtabTarget) {
        const nextTab = button.dataset.classroomSubtabTarget;
        document.querySelectorAll('[data-classroom-subtab]').forEach(tab => {
          const active = tab.dataset.classroomSubtab === nextTab;
          tab.classList.toggle('is-active', active);
          tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('[data-classroom-subpane]').forEach(pane => {
          pane.classList.toggle('is-active', pane.dataset.classroomSubpane === nextTab);
        });
      }
      if(button.dataset.classroomTeacherTarget) {
        document.getElementById(button.dataset.classroomTeacherTarget)?.scrollIntoView({
          block: 'start',
          behavior: 'smooth'
        });
      }
    });

    document.querySelector('.classroom-summary-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-classroom-today-tab]');
      if(!button || button.disabled) return;
      deps.setActiveClassroomTab?.(button.dataset.classroomTodayTab || 'today');
    });

    document.getElementById('classroom-quest-grid')?.addEventListener('click', event => {
      const editButton = event.target.closest('[data-classroom-quest-edit-id]');
      if(editButton && !editButton.disabled) {
        deps.editClassroomQuest?.(editButton.dataset.classroomQuestEditId || '');
        return;
      }
      const duplicateButton = event.target.closest('[data-classroom-quest-duplicate-id]');
      if(duplicateButton && !duplicateButton.disabled) {
        deps.duplicateClassroomQuest?.(duplicateButton.dataset.classroomQuestDuplicateId || '', duplicateButton);
        return;
      }
      const moveButton = event.target.closest('[data-classroom-quest-move-id]');
      if(moveButton && !moveButton.disabled) {
        deps.reorderClassroomQuest?.(
          moveButton.dataset.classroomQuestMoveId || '',
          moveButton.dataset.classroomQuestMoveDirection || 'up',
          moveButton
        );
        return;
      }
      const deactivateButton = event.target.closest('[data-classroom-quest-deactivate-id]');
      if(deactivateButton && !deactivateButton.disabled) {
        deps.deactivateClassroomQuest?.(deactivateButton.dataset.classroomQuestDeactivateId || '', deactivateButton);
        return;
      }
      const deleteButton = event.target.closest('[data-classroom-quest-delete-id]');
      if(deleteButton && !deleteButton.disabled) {
        deps.deleteClassroomQuest?.(deleteButton.dataset.classroomQuestDeleteId || '', deleteButton);
        return;
      }
      const button = event.target.closest('[data-classroom-quest-action]');
      if(!button || button.disabled) return;
      deps.completeClassroomCheckQuest?.(button.dataset.classroomQuestAction || '');
    });

    document.getElementById('classroom-inactive-quest-grid')?.addEventListener('click', event => {
      const restoreButton = event.target.closest('[data-classroom-quest-restore-id]');
      if(!restoreButton || restoreButton.disabled) return;
      deps.restoreClassroomQuest?.(restoreButton.dataset.classroomQuestRestoreId || '', restoreButton);
    });

    document.getElementById('classroom-student-card-grid')?.addEventListener('click', event => {
      const adjustButton = event.target.closest('[data-classroom-point-adjust-member-id]');
      if(!adjustButton || adjustButton.disabled) return;
      deps.adjustClassroomStudentPoint?.(adjustButton.dataset.classroomPointAdjustMemberId || '', adjustButton);
    });

    document.getElementById('classroom-gem-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-classroom-badge-gem-id]');
      if(!button || button.disabled) return;
      deps.setClassroomSelectedGemBadge?.(button.dataset.classroomBadgeGemId || '');
    });

    document.getElementById('classroom-job-grid')?.addEventListener('click', event => {
      const editButton = event.target.closest('[data-classroom-job-edit-id]');
      if(editButton && !editButton.disabled) {
        deps.editClassroomJob?.(editButton.dataset.classroomJobEditId || '');
        return;
      }
      const deleteButton = event.target.closest('[data-classroom-job-delete-id]');
      if(deleteButton && !deleteButton.disabled) {
        deps.deleteClassroomJob?.(deleteButton.dataset.classroomJobDeleteId || '', deleteButton);
        return;
      }
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

    const handleClassroomMarketClick = event => {
      const editShopButton = event.target.closest('[data-classroom-shop-edit-id]');
      if(editShopButton && !editShopButton.disabled) {
        deps.editClassroomShopItem?.(editShopButton.dataset.classroomShopEditId || '');
        return;
      }
      const deleteShopButton = event.target.closest('[data-classroom-shop-delete-id]');
      if(deleteShopButton && !deleteShopButton.disabled) {
        deps.deleteClassroomShopItem?.(deleteShopButton.dataset.classroomShopDeleteId || '', deleteShopButton);
        return;
      }
      const buyButton = event.target.closest('[data-classroom-shop-buy-id]');
      if(buyButton && !buyButton.disabled) {
        deps.purchaseClassroomShopItem?.(buyButton.dataset.classroomShopBuyId || '', buyButton);
        return;
      }
      const equipButton = event.target.closest('[data-classroom-shop-equip-id]');
      if(equipButton && !equipButton.disabled) {
        deps.setClassroomShopPurchaseEquipped?.(
          equipButton.dataset.classroomShopEquipId || '',
          equipButton.dataset.classroomShopEquipState === 'true',
          equipButton
        );
        return;
      }
      const requestButton = event.target.closest('[data-classroom-shop-request-use-id]');
      if(requestButton && !requestButton.disabled) {
        deps.requestClassroomShopPurchaseUse?.(requestButton.dataset.classroomShopRequestUseId || '', requestButton);
        return;
      }
      const billboardButton = event.target.closest('[data-classroom-billboard-use-id]');
      if(billboardButton && !billboardButton.disabled) {
        deps.useClassroomBillboardTicket?.(billboardButton.dataset.classroomBillboardUseId || '', billboardButton);
        return;
      }
      const approveButton = event.target.closest('[data-classroom-shop-approve-use-id]');
      if(approveButton && !approveButton.disabled) {
        deps.approveClassroomShopPurchaseUse?.(approveButton.dataset.classroomShopApproveUseId || '', approveButton);
        return;
      }
      const rejectButton = event.target.closest('[data-classroom-shop-reject-use-id]');
      if(rejectButton && !rejectButton.disabled) {
        deps.rejectClassroomShopPurchaseUse?.(rejectButton.dataset.classroomShopRejectUseId || '', rejectButton);
        return;
      }
      const completeButton = event.target.closest('[data-classroom-shop-complete-use-id]');
      if(completeButton && !completeButton.disabled) {
        deps.completeClassroomShopPurchaseUse?.(completeButton.dataset.classroomShopCompleteUseId || '', completeButton);
        return;
      }
      const refundButton = event.target.closest('[data-classroom-shop-refund-id]');
      if(refundButton && !refundButton.disabled) {
        deps.refundClassroomShopPurchase?.(refundButton.dataset.classroomShopRefundId || '', refundButton);
        return;
      }
      const contributeButton = event.target.closest('[data-classroom-group-purchase-id]');
      if(contributeButton && !contributeButton.disabled) {
        deps.contributeClassroomGroupPurchase?.(contributeButton.dataset.classroomGroupPurchaseId || '', contributeButton);
        return;
      }
      const joinSavingsButton = event.target.closest('[data-classroom-savings-product-id]');
      if(joinSavingsButton && !joinSavingsButton.disabled) {
        deps.joinClassroomSavingsProduct?.(joinSavingsButton.dataset.classroomSavingsProductId || '', joinSavingsButton);
        return;
      }
      const claimSavingsButton = event.target.closest('[data-classroom-savings-account-id]');
      if(claimSavingsButton && !claimSavingsButton.disabled) {
        deps.claimClassroomSavingsMaturity?.(claimSavingsButton.dataset.classroomSavingsAccountId || '', claimSavingsButton);
      }
    };

    document.getElementById('classroom-shop-grid')?.addEventListener('click', handleClassroomMarketClick);
    document.getElementById('classroom-shop-history')?.addEventListener('click', handleClassroomMarketClick);
    document.getElementById('classroom-group-purchase-shop')?.addEventListener('click', handleClassroomMarketClick);

    document.getElementById('classroom-bank-grid')?.addEventListener('click', event => {
      const exchangeButton = event.target.closest('[data-classroom-exchange-direction]');
      if(exchangeButton && !exchangeButton.disabled) {
        deps.exchangeClassroomCurrency?.(exchangeButton.dataset.classroomExchangeDirection || '', exchangeButton);
        return;
      }
      const joinSavingsButton = event.target.closest('[data-classroom-savings-product-id]');
      if(joinSavingsButton && !joinSavingsButton.disabled) {
        deps.joinClassroomSavingsProduct?.(joinSavingsButton.dataset.classroomSavingsProductId || '', joinSavingsButton);
        return;
      }
      const claimSavingsButton = event.target.closest('[data-classroom-savings-account-id]');
      if(claimSavingsButton && !claimSavingsButton.disabled) {
        deps.claimClassroomSavingsMaturity?.(claimSavingsButton.dataset.classroomSavingsAccountId || '', claimSavingsButton);
      }
    });

    document.getElementById('classroom-tax-preset-list')?.addEventListener('click', event => {
      const presetButton = event.target.closest('[data-classroom-tax-preset-rate]');
      if(!presetButton || presetButton.disabled) return;
      deps.collectClassroomTaxPreset?.(
        Number(presetButton.dataset.classroomTaxPresetRate || 0),
        presetButton.dataset.classroomTaxPresetReason || '',
        presetButton
      );
    });

    document.getElementById('classroom-routine-grid')?.addEventListener('click', event => {
      const editButton = event.target.closest('[data-classroom-routine-edit-id]');
      if(editButton && !editButton.disabled) {
        deps.editClassroomRoutine?.(editButton.dataset.classroomRoutineEditId || '');
        return;
      }
      const button = event.target.closest('[data-classroom-routine-check-id]');
      if(!button || button.disabled) return;
      deps.checkClassroomRoutine?.(button.dataset.classroomRoutineCheckId || '', button);
    });

    const reviewClassroomAction = event => {
      const button = event.target.closest('[data-classroom-review-action]');
      if(!button || button.disabled) return;
      deps.reviewClassroomQuestProgress?.(
        button.dataset.classroomReviewId || '',
        button.dataset.classroomReviewAction || '',
        button
      );
    };

    document.getElementById('classroom-review-grid')?.addEventListener('click', reviewClassroomAction);
    document.getElementById('admin-classroom-review-grid')?.addEventListener('click', reviewClassroomAction);
  }

  window.DJ48ClassroomController = {
    bindClassroomEvents
  };
})();
