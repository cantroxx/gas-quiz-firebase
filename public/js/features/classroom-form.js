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

  const CLASSROOM_GROUPS = {
    home: ['today'], activity: ['quest', 'routine'], growth: ['gems'],
    economy: ['market', 'bank', 'securities'], class: ['classroom', 'jobs', 'mission'], manage: ['teacher']
  };
  const lastGroupTabs = {};

  function setActiveClassroomGroup(group) {
    if(!CLASSROOM_GROUPS[group]) return;
    setActiveClassroomTab(lastGroupTabs[group] || CLASSROOM_GROUPS[group][0]);
  }

  function setActiveClassroomTab(tabName = 'classroom') {
    const subtabAliases = new Set(['student-card']);
    const requestedTab = String(tabName || 'classroom');
    let panelTab = subtabAliases.has(requestedTab) ? 'classroom' : requestedTab;
    if(!Object.values(CLASSROOM_GROUPS).some(tabs => tabs.includes(panelTab))) panelTab = 'today';
    if(panelTab === 'securities' && !window.DJ48Securities?.isEnabled()) panelTab = 'market';
    const view = document.getElementById('classroom-view');
    if(panelTab === 'teacher' && view?.dataset.classroomRole !== 'teacher') panelTab = 'today';
    const group = Object.keys(CLASSROOM_GROUPS).find(key => CLASSROOM_GROUPS[key].includes(panelTab));
    lastGroupTabs[group] = panelTab;
    const previousTab = view?.dataset.activeTab;
    if(view) view.dataset.activeTab = panelTab;
    document.querySelectorAll('[data-classroom-group]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.classroomGroup === group));
    });
    const tablist = document.querySelector('.classroom-tabs');
    if(tablist) tablist.hidden = CLASSROOM_GROUPS[group].length < 2 || group === 'economy';
    document.querySelectorAll('[data-classroom-tab]').forEach(button => {
      const active = button.dataset.classroomTab === panelTab;
      button.hidden = !CLASSROOM_GROUPS[group].includes(button.dataset.classroomTab)
        || (button.dataset.classroomTab === 'securities' && !window.DJ48Securities?.isEnabled());
      button.id = `classroom-tab-${button.dataset.classroomTab}`;
      button.tabIndex = active ? 0 : -1;
      const panels = Array.from(document.querySelectorAll(`[data-classroom-panel="${button.dataset.classroomTab}"]`));
      button.setAttribute('aria-controls', panels.map((panel, index) => {
        if(!panel.id) panel.id = `classroom-panel-${button.dataset.classroomTab}-${index}`;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', button.id);
        return panel.id;
      }).join(' '));
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-classroom-panel]').forEach(panel => {
      panel.classList.toggle('is-active', panel.dataset.classroomPanel === panelTab);
    });
    window.DJ48ClassroomRender?.applyClassroomOverviewTabVisibility?.(panelTab);
    window.DJ48ClassroomWorkspace?.syncEconomyNavigation?.(panelTab);
    if(previousTab !== panelTab) {
      if(panelTab === 'securities') window.DJ48Securities?.enter();
      else window.DJ48Securities?.closeOrder();
      view?.dispatchEvent(new CustomEvent('classroom-tab-changed'));
    }
    if(subtabAliases.has(requestedTab)) {
      document.querySelectorAll('[data-classroom-subtab]').forEach(button => {
        const active = button.dataset.classroomSubtab === requestedTab;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('[data-classroom-subpane]').forEach(panel => {
        panel.classList.toggle('is-active', panel.dataset.classroomSubpane === requestedTab);
      });
    }
  }

  function getClassroomQuestFormValues(deps = {}) {
    const linkedGemNames = String(document.getElementById('classroom-quest-gem-name-input')?.value || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    const linkedGemName = linkedGemNames[0] || '';
    const targetText = String(document.getElementById('classroom-quest-targets-input')?.value || '').trim();
    const targetStudentIds = targetText === '대상 없음'
      ? ['__none__']
      : targetText.split(',').map(value => value.trim()).filter(Boolean);
    return {
      id: String(document.getElementById('classroom-quest-id-input')?.value || '').trim(),
      title: String(document.getElementById('classroom-quest-title-input')?.value || '').trim(),
      desc: String(document.getElementById('classroom-quest-desc-input')?.value || '').trim(),
      rewardCoin: Math.max(0, Math.round(Number(document.getElementById('classroom-quest-coin-input')?.value) || 0)),
      rewardCurrency: 'point',
      category: String(document.getElementById('classroom-quest-category-input')?.value || '').trim(),
      rewardMode: String(document.getElementById('classroom-quest-mode-input')?.value || 'auto').trim(),
      startDate: String(document.getElementById('classroom-quest-start-input')?.value || '').trim(),
      endDate: String(document.getElementById('classroom-quest-end-input')?.value || '').trim(),
      targetStudentIds,
      repeatRule: String(document.getElementById('classroom-quest-repeat-input')?.value || 'once').trim(),
      linkedGemName,
      linkedGemId: String(document.getElementById('classroom-quest-gem-name-input')?.dataset.gemIds || '').split(',')[0] || deps.slugifyClassroomGemId?.(linkedGemName) || '',
      linkedGemNames,
      linkedGemIds: (document.getElementById('classroom-quest-gem-name-input')?.dataset.gemIds || '').split(',').filter(Boolean),
      gemSelectionInvalid: document.getElementById('classroom-quest-gem-name-input')?.dataset.unresolved === 'true',
      submissionType: document.getElementById('classroom-quest-submission-input')?.value || 'complete',
      checklistItems: (document.getElementById('classroom-quest-checklist-input')?.value || '').split('\n').map(v=>v.trim()).filter(Boolean).slice(0,10),
      gemXp: linkedGemName ? 1 : 0,
      gemTargetXp: Math.max(1, Math.round(Number(document.getElementById('classroom-quest-gem-target-input')?.value) || 10)),
      gemRewardPoint: Math.max(0, Math.min(1000, Math.round(Number(document.getElementById('classroom-quest-gem-reward-input')?.value) || 0))),
      gemRewardCoin: Math.max(0, Math.min(1000, Math.round(Number(document.getElementById('classroom-quest-gem-coin-input')?.value) || 0))),
      active: true
    };
  }

  function resetClassroomQuestForm() {
    const questId = document.getElementById('classroom-quest-id-input');
    const title = document.getElementById('classroom-quest-title-input');
    const desc = document.getElementById('classroom-quest-desc-input');
    const coin = document.getElementById('classroom-quest-coin-input');
    const category = document.getElementById('classroom-quest-category-input');
    const mode = document.getElementById('classroom-quest-mode-input');
    const targets = document.getElementById('classroom-quest-targets-input');
    const start = document.getElementById('classroom-quest-start-input');
    const end = document.getElementById('classroom-quest-end-input');
    const repeat = document.getElementById('classroom-quest-repeat-input');
    const gemName = document.getElementById('classroom-quest-gem-name-input');
    const gemXp = document.getElementById('classroom-quest-gem-xp-input');
    const gemTarget = document.getElementById('classroom-quest-gem-target-input');
    const gemReward = document.getElementById('classroom-quest-gem-reward-input');
    const gemCoin = document.getElementById('classroom-quest-gem-coin-input');
    if(questId) questId.value = '';
    if(title) title.value = '';
    if(desc) desc.value = '';
    if(coin) coin.value = '5';
    if(category) category.value = '';
    if(mode) mode.value = 'auto';
    if(targets) targets.value = '';
    if(start) start.value = '';
    if(end) end.value = '';
    if(repeat) repeat.value = 'once';
    if(gemName) { gemName.value = ''; gemName.dataset.gemIds = ''; }
    const submission = document.getElementById('classroom-quest-submission-input'), checklist = document.getElementById('classroom-quest-checklist-input');
    if(submission) submission.value='complete'; if(checklist) checklist.value='';
    if(gemXp) gemXp.value = '1';
    if(gemTarget) gemTarget.value = '10';
    if(gemReward) gemReward.value = '0';
    if(gemCoin) gemCoin.value = '0';
  }

  function setClassroomQuestFormValues(quest = {}) {
    const questId = document.getElementById('classroom-quest-id-input');
    const title = document.getElementById('classroom-quest-title-input');
    const desc = document.getElementById('classroom-quest-desc-input');
    const coin = document.getElementById('classroom-quest-coin-input');
    const category = document.getElementById('classroom-quest-category-input');
    const mode = document.getElementById('classroom-quest-mode-input');
    const targets = document.getElementById('classroom-quest-targets-input');
    const start = document.getElementById('classroom-quest-start-input');
    const end = document.getElementById('classroom-quest-end-input');
    const repeat = document.getElementById('classroom-quest-repeat-input');
    const gemName = document.getElementById('classroom-quest-gem-name-input');
    const gemXp = document.getElementById('classroom-quest-gem-xp-input');
    const gemTarget = document.getElementById('classroom-quest-gem-target-input');
    const gemReward = document.getElementById('classroom-quest-gem-reward-input');
    const gemCoin = document.getElementById('classroom-quest-gem-coin-input');
    if(gemName) gemName.dataset.gemIds = (quest.linkedGemIds || [quest.linkedGemId]).filter(Boolean).join(',');
    const submission = document.getElementById('classroom-quest-submission-input'), checklist = document.getElementById('classroom-quest-checklist-input');
    if(submission) submission.value=quest.submissionType || 'complete'; if(checklist) checklist.value=(quest.checklistItems || []).join('\n');
    if(questId) questId.value = quest.id || quest.questId || '';
    if(title) title.value = quest.title || '';
    if(desc) desc.value = quest.desc || '';
    if(coin) coin.value = String(Number(quest.rewardCoin || 5));
    if(category) category.value = quest.category || '';
    if(mode) mode.value = quest.rewardMode || 'auto';
    if(targets) targets.value = Array.isArray(quest.targetStudentIds)
      ? (quest.targetStudentIds.includes('__none__') ? '대상 없음' : quest.targetStudentIds.join(', '))
      : '';
    if(start) start.value = quest.startDate || '';
    if(end) end.value = quest.endDate || '';
    if(repeat) repeat.value = quest.repeatRule || 'once';
    if(gemName) gemName.value = Array.isArray(quest.linkedGemNames) && quest.linkedGemNames.length
      ? quest.linkedGemNames.join(', ')
      : quest.linkedGemName || '';
    if(gemXp) gemXp.value = '1';
    if(gemTarget) gemTarget.value = String(Number(quest.gemTargetXp || 10));
    if(gemReward) gemReward.value = String(Number(quest.gemRewardPoint || 0));
    if(gemCoin) gemCoin.value = String(Number(quest.gemRewardCoin || 0));
  }

  function getClassroomBadgeCampaignFormValues(deps = {}) {
    const targetGemName = String(document.getElementById('classroom-badge-gem-input')?.value || '').trim();
    return {
      title: String(document.getElementById('classroom-badge-title-input')?.value || '').trim(),
      targetGemName,
      targetGemId: deps.slugifyClassroomGemId?.(targetGemName) || '',
      startDate: String(document.getElementById('classroom-badge-start-input')?.value || '').trim(),
      endDate: String(document.getElementById('classroom-badge-end-input')?.value || '').trim(),
      minIncrease: Math.max(0, Math.min(1000, Math.round(Number(document.getElementById('classroom-badge-min-increase-input')?.value) || 0))),
      awardLimit: Math.max(1, Math.min(10, Math.round(Number(document.getElementById('classroom-badge-limit-input')?.value) || 1))),
      icon: String(document.getElementById('classroom-badge-icon-input')?.value || 'keyringStar').trim().slice(0, 40),
      color: String(document.getElementById('classroom-badge-color-input')?.value || '#ffcf5a').trim().slice(0, 30)
    };
  }

  function getClassroomJobFormValues() {
    return {
      jobId: String(document.getElementById('classroom-job-id-input')?.value || '').trim(),
      title: String(document.getElementById('classroom-job-title-input')?.value || '').trim(),
      desc: String(document.getElementById('classroom-job-desc-input')?.value || '').trim(),
      weeklyPayPoint: Math.max(1, Math.round(Number(document.getElementById('classroom-job-pay-input')?.value) || 0)),
      maxAssignees: Math.max(1, Math.min(10, Math.round(Number(document.getElementById('classroom-job-capacity-input')?.value) || 1)))
    };
  }

  function resetClassroomJobForm() {
    const jobId = document.getElementById('classroom-job-id-input');
    const title = document.getElementById('classroom-job-title-input');
    const desc = document.getElementById('classroom-job-desc-input');
    const pay = document.getElementById('classroom-job-pay-input');
    const capacity = document.getElementById('classroom-job-capacity-input');
    if(jobId) jobId.value = '';
    if(title) title.value = '';
    if(desc) desc.value = '';
    if(pay) pay.value = '20';
    if(capacity) capacity.value = '1';
  }

  function setClassroomJobFormValues(job = {}) {
    const jobId = document.getElementById('classroom-job-id-input');
    const title = document.getElementById('classroom-job-title-input');
    const desc = document.getElementById('classroom-job-desc-input');
    const pay = document.getElementById('classroom-job-pay-input');
    const capacity = document.getElementById('classroom-job-capacity-input');
    if(jobId) jobId.value = job.jobId || job.id || '';
    if(title) title.value = job.title || '';
    if(desc) desc.value = job.desc || '';
    if(pay) pay.value = String(Number(job.weeklyPayPoint || job.payPoint || 20));
    if(capacity) capacity.value = String(Number(job.maxAssignees || 1));
  }

  function getClassroomShopItemFormValues() {
    const priceType = String(document.getElementById('classroom-shop-price-type-input')?.value || 'point').trim() === 'djCoin' ? 'djCoin' : 'point';
    const price = Math.max(1, Math.round(Number(document.getElementById('classroom-shop-price-input')?.value) || 0));
    return {
      itemId: String(document.getElementById('classroom-shop-id-input')?.value || '').trim(),
      title: String(document.getElementById('classroom-shop-title-input')?.value || '').trim(),
      desc: String(document.getElementById('classroom-shop-desc-input')?.value || '').trim(),
      pricePoint: priceType === 'point' ? price : 0,
      priceCoin: priceType === 'djCoin' ? price : 0,
      priceType,
      itemType: String(document.getElementById('classroom-shop-item-type-input')?.value || 'coupon').trim() || 'coupon',
      boostPoint: Number(document.getElementById('classroom-shop-boost-input')?.value || 0) || 0,
      imageUrl: String(document.getElementById('classroom-shop-image-url-input')?.value || '').trim(),
      icon: String(document.getElementById('classroom-shop-icon-input')?.value || 'pointShop').trim()
    };
  }

  function resetClassroomShopItemForm() {
    const itemId = document.getElementById('classroom-shop-id-input');
    const itemType = document.getElementById('classroom-shop-item-type-input');
    const boost = document.getElementById('classroom-shop-boost-input');
    const imageUrl = document.getElementById('classroom-shop-image-url-input');
    const title = document.getElementById('classroom-shop-title-input');
    const desc = document.getElementById('classroom-shop-desc-input');
    const price = document.getElementById('classroom-shop-price-input');
    const priceType = document.getElementById('classroom-shop-price-type-input');
    const icon = document.getElementById('classroom-shop-icon-input');
    if(itemId) itemId.value = '';
    if(itemType) itemType.value = 'coupon';
    if(boost) boost.value = '0';
    if(imageUrl) imageUrl.value = '';
    if(title) title.value = '';
    if(desc) desc.value = '';
    if(price) price.value = '50';
    if(priceType) priceType.value = 'point';
    if(icon) icon.value = 'pointShop';
    window.DJ48ClassroomShopArt?.updatePicker();
  }

  function setClassroomShopItemFormValues(item = {}) {
    const itemId = document.getElementById('classroom-shop-id-input');
    const itemType = document.getElementById('classroom-shop-item-type-input');
    const boost = document.getElementById('classroom-shop-boost-input');
    const imageUrl = document.getElementById('classroom-shop-image-url-input');
    const title = document.getElementById('classroom-shop-title-input');
    const desc = document.getElementById('classroom-shop-desc-input');
    const price = document.getElementById('classroom-shop-price-input');
    const priceType = document.getElementById('classroom-shop-price-type-input');
    const icon = document.getElementById('classroom-shop-icon-input');
    const nextPriceType = item.priceType === 'djCoin' ? 'djCoin' : 'point';
    if(itemId) itemId.value = item.itemId || item.id || '';
    if(itemType) itemType.value = item.itemType || item.type || 'coupon';
    if(boost) boost.value = String(Number(item.boostPoint || item.pointBoost || 0));
    if(imageUrl) imageUrl.value = item.imageUrl || item.iconUrl || item.thumbnailUrl || '';
    if(title) title.value = item.title || '';
    if(desc) desc.value = item.desc || '';
    if(price) price.value = String(Number(nextPriceType === 'djCoin' ? (item.priceCoin || item.priceDjCoin || item.price || 50) : (item.pricePoint || item.price || 50)));
    if(priceType) priceType.value = nextPriceType;
    if(icon) icon.value = item.icon || 'pointShop';
    window.DJ48ClassroomShopArt?.updatePicker();
  }

  function getClassroomNoticeFormValues() {
    return Array.from(document.querySelectorAll('[data-classroom-notice-slot]')).map(input => ({
      key: String(input.dataset.classroomNoticeSlot || '').trim(),
      text: String(input.value || '').trim().slice(0, 240)
    })).filter(slot => slot.key);
  }

  function getClassroomMissionFormValues() {
    const thresholds = [1, 2, 3, 4, 5, 6].map(index => {
      const targetPoint = Math.max(0, Math.round(Number(document.getElementById(`classroom-mission-target-${index}`)?.value) || 0));
      const label = String(document.getElementById(`classroom-mission-label-${index}`)?.value || '').trim();
      return {
        label: label || (targetPoint ? `${targetPoint.toLocaleString('ko-KR')}점` : `${index}번째 목표`),
        targetPoint,
        rewardText: String(document.getElementById(`classroom-mission-reward-${index}`)?.value || '').trim()
      };
    }).filter(item => item.targetPoint > 0);
    return {
      title: String(document.getElementById('classroom-mission-title-input')?.value || '').trim(),
      desc: String(document.getElementById('classroom-mission-desc-input')?.value || '').trim(),
      thresholds
    };
  }

  function getClassroomTaxFormValues() {
    return {
      title: String(document.getElementById('classroom-tax-title-input')?.value || '').trim(),
      ratePercent: Math.max(0.1, Math.min(50, Number(document.getElementById('classroom-tax-rate-input')?.value) || 0)),
      reason: String(document.getElementById('classroom-tax-reason-input')?.value || '').trim()
    };
  }

  function getClassroomGemFormValues(deps = {}) {
    const gemName = String(document.getElementById('classroom-gem-name-input')?.value || '').trim();
    const milestoneXp = String(document.getElementById('classroom-gem-milestone-xp-input')?.value || '')
      .split(',')
      .map(value => Math.max(0, Math.min(1000, Math.round(Number(value.trim()) || 0))))
      .filter(value => value > 0);
    const milestoneNames = String(document.getElementById('classroom-gem-milestone-name-input')?.value || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    const milestones = milestoneXp.map((xp, index) => ({
      xp,
      label: milestoneNames[index] || `${gemName || '젬스톤'} ${index + 1}단계`
    })).slice(0, 6);
    return {
      gemName,
      gemId: deps.slugifyClassroomGemId?.(gemName) || '',
      targetXp: Math.max(1, Math.min(1000, Math.round(Number(document.getElementById('classroom-gem-target-input')?.value) || 10))),
      milestones,
      rewardPoint: Math.max(0, Math.min(1000, Math.round(Number(document.getElementById('classroom-gem-reward-input')?.value) || 0))),
      rewardCoin: Math.max(0, Math.min(1000, Math.round(Number(document.getElementById('classroom-gem-coin-input')?.value) || 0))),
      icon: String(document.getElementById('classroom-gem-icon-input')?.value || 'gemReading').trim().slice(0, 40)
    };
  }

  function resetClassroomGemForm() {
    const name = document.getElementById('classroom-gem-name-input');
    const target = document.getElementById('classroom-gem-target-input');
    const milestoneXp = document.getElementById('classroom-gem-milestone-xp-input');
    const milestoneName = document.getElementById('classroom-gem-milestone-name-input');
    const reward = document.getElementById('classroom-gem-reward-input');
    const coin = document.getElementById('classroom-gem-coin-input');
    const icon = document.getElementById('classroom-gem-icon-input');
    if(name) name.value = '';
    if(target) target.value = '10';
    if(milestoneXp) milestoneXp.value = '10, 50, 100';
    if(milestoneName) milestoneName.value = '';
    if(reward) reward.value = '0';
    if(coin) coin.value = '0';
    if(icon) icon.value = 'gemReading';
  }

  function getClassroomGroupPurchaseFormValues() {
    return {
      title: String(document.getElementById('classroom-group-purchase-title-input')?.value || '').trim(),
      desc: String(document.getElementById('classroom-group-purchase-desc-input')?.value || '').trim(),
      targetPoint: Math.max(1, Math.round(Number(document.getElementById('classroom-group-purchase-target-input')?.value) || 0)),
      dueDate: String(document.getElementById('classroom-group-purchase-due-input')?.value || '').trim()
    };
  }

  function resetClassroomGroupPurchaseForm() {
    const title = document.getElementById('classroom-group-purchase-title-input');
    const desc = document.getElementById('classroom-group-purchase-desc-input');
    const target = document.getElementById('classroom-group-purchase-target-input');
    const due = document.getElementById('classroom-group-purchase-due-input');
    if(title) title.value = '';
    if(desc) desc.value = '';
    if(target) target.value = '500';
    if(due) due.value = '';
  }

  function getClassroomSavingsProductFormValues() {
    return {
      title: String(document.getElementById('classroom-savings-title-input')?.value || '').trim(),
      desc: String(document.getElementById('classroom-savings-desc-input')?.value || '').trim(),
      minDepositPoint: Math.max(1, Math.round(Number(document.getElementById('classroom-savings-deposit-input')?.value) || 0)),
      interestRatePercent: Math.max(0, Math.min(100, Number(document.getElementById('classroom-savings-interest-input')?.value) || 0)),
      termDays: Math.max(1, Math.min(365, Math.round(Number(document.getElementById('classroom-savings-term-input')?.value) || 7)))
    };
  }

  function resetClassroomSavingsProductForm() {
    const title = document.getElementById('classroom-savings-title-input');
    const desc = document.getElementById('classroom-savings-desc-input');
    const deposit = document.getElementById('classroom-savings-deposit-input');
    const interest = document.getElementById('classroom-savings-interest-input');
    const term = document.getElementById('classroom-savings-term-input');
    if(title) title.value = '';
    if(desc) desc.value = '';
    if(deposit) deposit.value = '1';
    if(interest) interest.value = '10';
    if(term) term.value = '7';
  }

  function getClassroomExchangeSettingsFormValues() {
    return {
      pointToCoinEnabled: document.getElementById('classroom-exchange-point-to-coin-enabled-input')?.checked !== false,
      coinToPointEnabled: document.getElementById('classroom-exchange-coin-to-point-enabled-input')?.checked !== false,
      pointToCoinPointCost: Math.max(0.01, Math.min(1000000, Math.round((Number(document.getElementById('classroom-exchange-point-cost-input')?.value) || 3) * 100) / 100)),
      coinToPointReward: Math.max(0.01, Math.min(1000000, Math.round((Number(document.getElementById('classroom-exchange-coin-reward-input')?.value) || 0.5) * 100) / 100))
    };
  }

  function setClassroomExchangeSettingsForm(settings = {}) {
    const pointEnabled = document.getElementById('classroom-exchange-point-to-coin-enabled-input');
    const coinEnabled = document.getElementById('classroom-exchange-coin-to-point-enabled-input');
    const pointCost = document.getElementById('classroom-exchange-point-cost-input');
    const coinReward = document.getElementById('classroom-exchange-coin-reward-input');
    if(pointEnabled) pointEnabled.checked = settings.pointToCoinEnabled !== false;
    if(coinEnabled) coinEnabled.checked = settings.coinToPointEnabled !== false;
    if(pointCost) pointCost.value = String(Math.max(0.01, Math.round((Number(settings.pointToCoinPointCost || 3) || 3) * 100) / 100));
    if(coinReward) coinReward.value = String(Math.max(0.01, Math.round((Number(settings.coinToPointReward || 0.5) || 0.5) * 100) / 100));
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
    const checkItems = Array.from(document.querySelectorAll('.classroom-routine-item-input'))
      .map((input, index) => ({
        itemId: `item-${index + 1}`,
        label: String(input.value || '').trim()
      }))
      .filter(item => item.label)
      .slice(0, 10);
    return {
      routineId: String(document.getElementById('classroom-routine-id-input')?.value || '').trim(),
      title: String(document.getElementById('classroom-routine-title-input')?.value || '').trim(),
      targetCount: Math.max(1, Math.min(300, Math.round(Number(document.getElementById('classroom-routine-target-input')?.value) || 5))),
      startDate: String(document.getElementById('classroom-routine-start-input')?.value || '').trim(),
      endDate: String(document.getElementById('classroom-routine-end-input')?.value || '').trim(),
      rewardPoint: Math.max(0, Math.min(20, Math.round(Number(document.getElementById('classroom-routine-reward-input')?.value) || 0))),
      weekdays,
      checkItems
    };
  }

  function updateClassroomRoutineItemCount() {
    const count = document.getElementById('classroom-routine-item-count');
    if(count) count.textContent = `${Array.from(document.querySelectorAll('.classroom-routine-item-input')).filter(input => input.value.trim()).length}/10`;
  }

  function setClassroomRoutineItemInputs(items = []) {
    const inputs = Array.from(document.querySelectorAll('.classroom-routine-item-input'));
    const labels = Array.isArray(items)
      ? items.map(item => typeof item === 'string' ? item : item?.label).map(value => String(value || '').trim()).filter(Boolean).slice(0, 10)
      : [];
    inputs.forEach((input, index) => {
      input.value = labels[index] || '';
      input.hidden = index >= Math.max(2, labels.length);
      if(input.closest('.classroom-routine-item-row')) input.closest('.classroom-routine-item-row').hidden = input.hidden;
    });
    const addButton = document.getElementById('classroom-routine-add-item-button');
    if(addButton) addButton.hidden = inputs.every(input => !input.hidden);
    updateClassroomRoutineItemCount();
  }

  function showNextClassroomRoutineItemInput() {
    const inputs = Array.from(document.querySelectorAll('.classroom-routine-item-input'));
    const nextInput = inputs.find(input => input.hidden);
    if(!nextInput) return;
    nextInput.hidden = false;
    if(nextInput.closest('.classroom-routine-item-row')) nextInput.closest('.classroom-routine-item-row').hidden = false;
    nextInput.focus();
    const addButton = document.getElementById('classroom-routine-add-item-button');
    if(addButton) addButton.hidden = !inputs.some(input => input.hidden);
  }

  function resetClassroomRoutineForm() {
    const editor = document.getElementById('classroom-routine-editor');
    if(editor) editor.open = false;
    const routineId = document.getElementById('classroom-routine-id-input');
    const title = document.getElementById('classroom-routine-title-input');
    const target = document.getElementById('classroom-routine-target-input');
    const start = document.getElementById('classroom-routine-start-input');
    const end = document.getElementById('classroom-routine-end-input');
    const reward = document.getElementById('classroom-routine-reward-input');
    if(routineId) routineId.value = '';
    if(title) title.value = '';
    if(target) target.value = '5';
    if(start) start.value = '';
    if(end) end.value = '';
    if(reward) reward.value = '10';
    setClassroomRoutineItemInputs([]);
    document.querySelectorAll('input[name="classroom-routine-weekday"]').forEach(input => {
      input.checked = true;
    });
  }

  function setClassroomRoutineFormValues(routine = {}) {
    const routineId = document.getElementById('classroom-routine-id-input');
    const title = document.getElementById('classroom-routine-title-input');
    const target = document.getElementById('classroom-routine-target-input');
    const start = document.getElementById('classroom-routine-start-input');
    const end = document.getElementById('classroom-routine-end-input');
    const reward = document.getElementById('classroom-routine-reward-input');
    if(routineId) routineId.value = routine.routineId || routine.id || '';
    if(title) title.value = routine.title || '';
    if(target) target.value = String(Number(routine.targetCount || 5));
    if(start) start.value = routine.startDate || '';
    if(end) end.value = routine.endDate || '';
    if(reward) reward.value = String(Math.max(0, Math.min(20, Math.round(Number(routine.rewardPoint) || 0))));
    setClassroomRoutineItemInputs(routine.checkItems || []);
    const weekdays = new Set((Array.isArray(routine.weekdays) ? routine.weekdays : [1, 2, 3, 4, 5]).map(String));
    document.querySelectorAll('input[name="classroom-routine-weekday"]').forEach(input => {
      input.checked = weekdays.has(String(input.value));
    });
  }

  window.DJ48ClassroomForm = {
    updateClassroomRoutineItemCount,
    setActiveClassroomGroup,
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
    setClassroomJobFormValues,
    getClassroomShopItemFormValues,
    resetClassroomShopItemForm,
    setClassroomShopItemFormValues,
    getClassroomNoticeFormValues,
    getClassroomMissionFormValues,
    getClassroomTaxFormValues,
    getClassroomGemFormValues,
    resetClassroomGemForm,
    getClassroomGroupPurchaseFormValues,
    resetClassroomGroupPurchaseForm,
    getClassroomSavingsProductFormValues,
    resetClassroomSavingsProductForm,
    getClassroomExchangeSettingsFormValues,
    setClassroomExchangeSettingsForm,
    setClassroomNoticeForm,
    getClassroomRoutineFormValues,
    resetClassroomRoutineForm,
    showNextClassroomRoutineItemInput,
    setClassroomRoutineFormValues
  };
})();
