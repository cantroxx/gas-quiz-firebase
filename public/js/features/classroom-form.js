(function () {
  function setClassroomStatusElement(elementId, message, isError = false) {
    const status = document.getElementById(elementId);
    if(!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', !!isError);
  }

  function setClassroomUnlocked(unlocked) {
    const gate = document.getElementById('classroom-gate-panel');
    const main = document.getElementById('classroom-main-panel');
    if(gate) gate.hidden = !!unlocked;
    if(main) main.hidden = !unlocked;
  }

  function getClassroomEntryCode() {
    return String(document.getElementById('classroom-entry-code')?.value || '').trim();
  }

  function clearClassroomEntryCode() {
    const input = document.getElementById('classroom-entry-code');
    if(input) input.value = '';
  }

  function isClassroomEntryCodeValid(value, settings = {}) {
    return String(value || '').trim() === String(settings.entryCode || '').trim();
  }

  function setClassroomEntryStatus(message, isError = false) {
    setClassroomStatusElement('classroom-entry-status', message, isError);
  }

  function getClassroomEntrySuccessMessage(settings = {}, fallbackName = '') {
    return `${settings.name || fallbackName} 교실에 입장했습니다.`;
  }

  function setActiveClassroomTab(tabName = 'quests') {
    document.querySelectorAll('[data-classroom-tab]').forEach(button => {
      const active = button.dataset.classroomTab === tabName;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-classroom-panel]').forEach(panel => {
      panel.classList.toggle('is-active', panel.dataset.classroomPanel === tabName);
    });
  }

  function getClassroomQuestFormValues(deps = {}) {
    const linkedGemName = String(document.getElementById('classroom-quest-gem-name-input')?.value || '').trim();
    const targetText = String(document.getElementById('classroom-quest-targets-input')?.value || '').trim();
    return {
      id: String(document.getElementById('classroom-quest-id-input')?.value || '').trim(),
      title: String(document.getElementById('classroom-quest-title-input')?.value || '').trim(),
      desc: String(document.getElementById('classroom-quest-desc-input')?.value || '').trim(),
      rewardCoin: Math.max(0, Math.round(Number(document.getElementById('classroom-quest-coin-input')?.value) || 0)),
      rewardCurrency: 'point',
      rewardMode: String(document.getElementById('classroom-quest-mode-input')?.value || 'auto').trim(),
      targetStudentIds: targetText.split(',').map(value => value.trim()).filter(Boolean),
      repeatRule: String(document.getElementById('classroom-quest-repeat-input')?.value || 'once').trim(),
      linkedGemName,
      linkedGemId: deps.slugifyClassroomGemId?.(linkedGemName) || '',
      gemXp: Math.max(0, Math.round(Number(document.getElementById('classroom-quest-gem-xp-input')?.value) || 0)),
      gemTargetXp: Math.max(1, Math.round(Number(document.getElementById('classroom-quest-gem-target-input')?.value) || 10)),
      gemRewardPoint: Math.max(0, Math.round(Number(document.getElementById('classroom-quest-gem-reward-input')?.value) || 0)),
      active: true
    };
  }

  function resetClassroomQuestForm() {
    const questId = document.getElementById('classroom-quest-id-input');
    const title = document.getElementById('classroom-quest-title-input');
    const desc = document.getElementById('classroom-quest-desc-input');
    const coin = document.getElementById('classroom-quest-coin-input');
    const mode = document.getElementById('classroom-quest-mode-input');
    const targets = document.getElementById('classroom-quest-targets-input');
    const repeat = document.getElementById('classroom-quest-repeat-input');
    const gemName = document.getElementById('classroom-quest-gem-name-input');
    const gemXp = document.getElementById('classroom-quest-gem-xp-input');
    const gemTarget = document.getElementById('classroom-quest-gem-target-input');
    const gemReward = document.getElementById('classroom-quest-gem-reward-input');
    if(questId) questId.value = '';
    if(title) title.value = '';
    if(desc) desc.value = '';
    if(coin) coin.value = '5';
    if(mode) mode.value = 'auto';
    if(targets) targets.value = '';
    if(repeat) repeat.value = 'once';
    if(gemName) gemName.value = '';
    if(gemXp) gemXp.value = '0';
    if(gemTarget) gemTarget.value = '10';
    if(gemReward) gemReward.value = '30';
  }

  function setClassroomQuestFormValues(quest = {}) {
    const questId = document.getElementById('classroom-quest-id-input');
    const title = document.getElementById('classroom-quest-title-input');
    const desc = document.getElementById('classroom-quest-desc-input');
    const coin = document.getElementById('classroom-quest-coin-input');
    const mode = document.getElementById('classroom-quest-mode-input');
    const targets = document.getElementById('classroom-quest-targets-input');
    const repeat = document.getElementById('classroom-quest-repeat-input');
    const gemName = document.getElementById('classroom-quest-gem-name-input');
    const gemXp = document.getElementById('classroom-quest-gem-xp-input');
    const gemTarget = document.getElementById('classroom-quest-gem-target-input');
    const gemReward = document.getElementById('classroom-quest-gem-reward-input');
    if(questId) questId.value = quest.id || quest.questId || '';
    if(title) title.value = quest.title || '';
    if(desc) desc.value = quest.desc || '';
    if(coin) coin.value = String(Number(quest.rewardCoin || 5));
    if(mode) mode.value = quest.rewardMode || 'auto';
    if(targets) targets.value = Array.isArray(quest.targetStudentIds) ? quest.targetStudentIds.join(', ') : '';
    if(repeat) repeat.value = quest.repeatRule || 'once';
    if(gemName) gemName.value = quest.linkedGemName || '';
    if(gemXp) gemXp.value = String(Number(quest.gemXp || 0));
    if(gemTarget) gemTarget.value = String(Number(quest.gemTargetXp || 10));
    if(gemReward) gemReward.value = String(Number(quest.gemRewardPoint || 0));
  }

  function getClassroomBadgeCampaignFormValues(deps = {}) {
    const targetGemName = String(document.getElementById('classroom-badge-gem-input')?.value || '').trim();
    return {
      title: String(document.getElementById('classroom-badge-title-input')?.value || '').trim(),
      targetGemName,
      targetGemId: deps.slugifyClassroomGemId?.(targetGemName) || '',
      awardLimit: Math.max(1, Math.min(10, Math.round(Number(document.getElementById('classroom-badge-limit-input')?.value) || 1))),
      icon: String(document.getElementById('classroom-badge-icon-input')?.value || '🏅').trim().slice(0, 12),
      color: String(document.getElementById('classroom-badge-color-input')?.value || '#ffcf5a').trim().slice(0, 30)
    };
  }

  function getClassroomJobFormValues() {
    return {
      title: String(document.getElementById('classroom-job-title-input')?.value || '').trim(),
      desc: String(document.getElementById('classroom-job-desc-input')?.value || '').trim(),
      weeklyPayPoint: Math.max(1, Math.round(Number(document.getElementById('classroom-job-pay-input')?.value) || 0)),
      maxAssignees: Math.max(1, Math.min(10, Math.round(Number(document.getElementById('classroom-job-capacity-input')?.value) || 1)))
    };
  }

  function resetClassroomJobForm() {
    const title = document.getElementById('classroom-job-title-input');
    const desc = document.getElementById('classroom-job-desc-input');
    const pay = document.getElementById('classroom-job-pay-input');
    const capacity = document.getElementById('classroom-job-capacity-input');
    if(title) title.value = '';
    if(desc) desc.value = '';
    if(pay) pay.value = '20';
    if(capacity) capacity.value = '1';
  }

  function getClassroomShopItemFormValues() {
    return {
      title: String(document.getElementById('classroom-shop-title-input')?.value || '').trim(),
      desc: String(document.getElementById('classroom-shop-desc-input')?.value || '').trim(),
      pricePoint: Math.max(1, Math.round(Number(document.getElementById('classroom-shop-price-input')?.value) || 0))
    };
  }

  function resetClassroomShopItemForm() {
    const title = document.getElementById('classroom-shop-title-input');
    const desc = document.getElementById('classroom-shop-desc-input');
    const price = document.getElementById('classroom-shop-price-input');
    if(title) title.value = '';
    if(desc) desc.value = '';
    if(price) price.value = '50';
  }

  function getClassroomNoticeFormValues() {
    return Array.from(document.querySelectorAll('[data-classroom-notice-slot]')).map(input => ({
      key: String(input.dataset.classroomNoticeSlot || '').trim(),
      text: String(input.value || '').trim().slice(0, 240)
    })).filter(slot => slot.key);
  }

  function setClassroomNoticeForm(slots = []) {
    const slotMap = {};
    (Array.isArray(slots) ? slots : []).forEach(slot => {
      slotMap[String(slot.key || '')] = String(slot.text || '');
    });
    document.querySelectorAll('[data-classroom-notice-slot]').forEach(input => {
      input.value = slotMap[String(input.dataset.classroomNoticeSlot || '')] || '';
    });
  }

  function getClassroomRoutineFormValues() {
    const weekdays = Array.from(document.querySelectorAll('input[name="classroom-routine-weekday"]:checked'))
      .map(input => Number(input.value))
      .filter(day => day >= 1 && day <= 5);
    return {
      title: String(document.getElementById('classroom-routine-title-input')?.value || '').trim(),
      targetCount: Math.max(2, Math.min(30, Math.round(Number(document.getElementById('classroom-routine-target-input')?.value) || 5))),
      startDate: String(document.getElementById('classroom-routine-start-input')?.value || '').trim(),
      endDate: String(document.getElementById('classroom-routine-end-input')?.value || '').trim(),
      weekdays
    };
  }

  function resetClassroomRoutineForm() {
    const title = document.getElementById('classroom-routine-title-input');
    const target = document.getElementById('classroom-routine-target-input');
    const start = document.getElementById('classroom-routine-start-input');
    const end = document.getElementById('classroom-routine-end-input');
    if(title) title.value = '';
    if(target) target.value = '5';
    if(start) start.value = '';
    if(end) end.value = '';
    document.querySelectorAll('input[name="classroom-routine-weekday"]').forEach(input => {
      input.checked = true;
    });
  }

  window.DJ48ClassroomForm = {
    setClassroomStatusElement,
    setClassroomUnlocked,
    getClassroomEntryCode,
    clearClassroomEntryCode,
    isClassroomEntryCodeValid,
    setClassroomEntryStatus,
    getClassroomEntrySuccessMessage,
    setActiveClassroomTab,
    getClassroomQuestFormValues,
    resetClassroomQuestForm,
    setClassroomQuestFormValues,
    getClassroomBadgeCampaignFormValues,
    getClassroomJobFormValues,
    resetClassroomJobForm,
    getClassroomShopItemFormValues,
    resetClassroomShopItemForm,
    getClassroomNoticeFormValues,
    setClassroomNoticeForm,
    getClassroomRoutineFormValues,
    resetClassroomRoutineForm
  };
})();
