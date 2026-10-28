(function () {
  function getQuestStatusClass(status) {
    return window.DJ48EventDomain.getQuestStatusClass(status);
  }

  function renderQuestCards(quests = [], gridId = 'quest-card-grid') {
    const grid = document.getElementById(gridId);
    if(!grid) return;
    grid.innerHTML = '';
    if(!quests.length) {
      const empty = document.createElement('p');
      empty.className = 'plaza-empty';
      empty.textContent = '지금 표시할 퀘스트가 없어요. 다음 도전을 기다려 주세요.';
      grid.appendChild(empty);
    }
    if(gridId === 'quest-card-grid' && quests.length) {
      const scope = grid.dataset.questScope || 'daily';
      const tabs = document.createElement('div');
      tabs.className = 'quest-period-tabs';
      tabs.setAttribute('aria-label', '퀘스트 기간');
      for(const [id, label] of [['daily', '일일퀘스트'], ['weekly', '주간퀘스트']]) {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = label;
        button.className = 'ranking-sub-tab';
        button.setAttribute('aria-pressed', String(id === scope));
        button.onclick = () => { grid.dataset.questScope = id; renderQuestCards(quests, gridId); };
        tabs.append(button);
      }
      grid.append(tabs);
      const guide = document.createElement('p'); guide.className = 'quest-period-guide';
      guide.textContent = scope === 'daily' ? '퀘스트 보상은 과목 연습전의 일일 XP·코인과 별도로 받아요.' : '기본 5종 중 보상은 최대 3개! 기본 3종을 완료하면 분야 도전·3일 연속 달성 보상이 추가로 열려요.';
      grid.append(guide);
    }
    quests.filter(quest => gridId !== 'quest-card-grid' || (quest.scope || 'daily') === (grid.dataset.questScope || 'daily')).forEach(quest => {
      const card = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h4');
      const progress = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const claimButton = document.createElement('button');
      const meta = document.createElement('span');

      card.className = 'quest-card';
      card.dataset.questId = quest.questId || '';
      icon.className = 'event-card-icon';
      icon.textContent = quest.icon || '🎯';
      title.textContent = quest.title;
      meta.className = 'quest-scope-badge';
      meta.textContent = quest.recommended
        ? '권장'
        : (quest.scope === 'season' ? '시즌 조건 · 1회' : quest.scope === 'weekly' ? '주간' : '일일');
      progress.className = 'quest-progress';
      progress.textContent = `진행도 ${quest.progress || `${Number(quest.current) || 0}/${Number(quest.target) || 1}`}`;
      reward.className = 'quest-reward';
      reward.textContent = `보상: ${quest.reward}`;
      status.className = `quest-status ${getQuestStatusClass(quest.status)}`;
      status.textContent = quest.status;
      claimButton.type = 'button';
      claimButton.className = 'quest-claim-button';
      claimButton.dataset.questClaimId = quest.questId || '';
      claimButton.textContent = quest.claimed ? '수령 완료' : quest.locked ? '기본 3종 완료 후 열림' : '보상 받기';
      claimButton.disabled = !quest.claimable;

      const condition = document.createElement('p'); condition.className = 'quest-condition';
      const field = String(quest.questId || '').split('_').pop();
      const descriptions = quest.scope === 'weekly' ? {
        practice: '과목 연습전 정답 40개 · 하루 최대 10개 누적', ranking: '20점 이상 랭킹전 일일퀘스트를 3일 달성',
        tower: '구름탑 일일퀘스트를 3일 달성', survivor: '한 판에서 10,000점 이상 달성', bomb: '말폭탄 낱말 3승',
        fields: '서로 다른 기본 주간퀘스트 2종 달성', days: '3일 연속으로 매일 일일퀘스트 1개 이상 달성'
      } : { practice: '과목 연습전에서 정답 10개', ranking: '한 판에서 20점 이상 달성 후 완료', tower: '오늘 구름탑 문장 10개 이상 정답', survivor: '한 판에서 1,000점 이상 달성', bomb: '말폭탄 낱말 1승' };
      condition.textContent = descriptions[field] || '';
      card.append(icon, title, meta, condition, progress, reward, status, claimButton);
      grid.appendChild(card);
    });
  }

  function renderClassMissionCards(missions = []) {
    const grid = document.getElementById('class-mission-grid');
    if(!grid) return;
    grid.innerHTML = '';
    missions.forEach(mission => {
      const percent = Math.min(100, Math.round((mission.current / mission.target) * 100));
      const card = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h4');
      const progressText = document.createElement('p');
      const progressTrack = document.createElement('div');
      const progressBar = document.createElement('span');
      const reward = document.createElement('p');

      card.className = 'class-mission-card';
      icon.className = 'event-card-icon';
      icon.textContent = mission.icon;
      title.textContent = mission.title;
      progressText.className = 'class-mission-progress';
      progressText.textContent = `${mission.current} / ${mission.target}`;
      progressTrack.className = 'mission-progress-track';
      progressBar.className = 'mission-progress-bar';
      progressBar.style.width = `${percent}%`;
      reward.className = 'class-mission-reward';
      reward.textContent = mission.reward;

      progressTrack.appendChild(progressBar);
      card.append(icon, title, progressText, progressTrack, reward);
      grid.appendChild(card);
    });
  }

  function renderSeasonEvents() {}

  function renderEventCycleGuide() {
    document.getElementById('event-cycle-guide')?.remove();
  }

  function closeUnclaimedRewards(restoreFocus = false) {
    const dropdown = document.getElementById('event-unclaimed-dialog');
    if(!dropdown) return;
    dropdown.hidden = true;
    const button = document.getElementById('event-unclaimed-button');
    button?.setAttribute('aria-expanded', 'false');
    if(restoreFocus && !document.getElementById('event-view')?.hidden) {
      (button && !button.hidden ? button : document.getElementById('event-refresh-button'))?.focus();
    }
  }

  function getUnclaimedRewardsDialog() {
    let dropdown = document.getElementById('event-unclaimed-dialog');
    if(dropdown) return dropdown;
    const view = document.getElementById('event-view');
    if(!view) return null;
    dropdown = document.createElement('section');
    dropdown.id = 'event-unclaimed-dialog';
    dropdown.className = 'event-rewards-dropdown';
    dropdown.hidden = true;
    dropdown.setAttribute('role', 'region');
    dropdown.setAttribute('aria-labelledby', 'event-unclaimed-title');
    dropdown.innerHTML = '<div class="event-rewards-header"><h3 id="event-unclaimed-title">미수령 보상</h3><button type="button" class="button" data-event-rewards-close>닫기</button></div><p id="event-unclaimed-period"></p><div id="legacy-season-quest-grid" class="quest-card-grid"></div>';
    dropdown.querySelector('[data-event-rewards-close]').onclick = () => closeUnclaimedRewards(true);
    document.addEventListener('click', event => {
      if(!dropdown.hidden && !dropdown.contains(event.target) && !event.target.closest('#event-unclaimed-button')) closeUnclaimedRewards();
    });
    view.addEventListener('keydown', event => {
      if(event.key === 'Escape' && !dropdown.hidden) { event.preventDefault(); closeUnclaimedRewards(true); }
    });
    new MutationObserver(() => { if(view.hidden) closeUnclaimedRewards(); }).observe(view, { attributes: true, attributeFilter: ['hidden'] });
    (document.getElementById('event-loading-status') || view.querySelector('.event-topbar') || view).append(dropdown);
    return dropdown;
  }

  function updateUnclaimedButton() {
    const button = document.getElementById('event-unclaimed-button');
    if(!button) return;
    const dropdown = document.getElementById('event-unclaimed-dialog');
    const count = Number(dropdown?.dataset.count) || 0;
    button.textContent = `미수령 보상 (${count}) ▾`;
    button.hidden = !count;
    if(!count) closeUnclaimedRewards(dropdown?.contains(document.activeElement) || document.activeElement === button);
  }

  function renderUnclaimedRewards(data = {}) {
    const dialog = getUnclaimedRewardsDialog();
    if(!dialog) return;
    const quests = (data.legacyQuests || []).filter(quest => quest.claimable && !quest.claimed);
    const grid = dialog.querySelector('#legacy-season-quest-grid');
    const hadFocus = grid.contains(document.activeElement);
    dialog.dataset.count = String(quests.length);
    dialog.querySelector('#event-unclaimed-period').textContent = data.legacySeasonKey ? `이전 월간 퀘스트 · ${data.legacySeasonKey}` : '이전 월간 퀘스트';
    renderQuestCards(quests, grid.id);
    if(!quests.length) grid.querySelector('.plaza-empty').textContent = '받을 수 있는 미수령 보상이 없어요.';
    if(hadFocus && !dialog.hidden && quests.length) dialog.querySelector('[data-event-rewards-close]').focus();
    updateUnclaimedButton();
    if(hadFocus && !quests.length) closeUnclaimedRewards(true);
  }

  function renderEventSections(data = {}) {
    const grid = document.getElementById('quest-card-grid');
    const signature = JSON.stringify(data);
    renderEventCycleGuide(data);
    if(grid?.dataset.eventSignature === signature && grid.childElementCount) return;
    renderQuestCards((data.quests || []).filter(q=>q.scope!=='season' && q.questId!=='v2_daily_today'));
    renderClassMissionCards(data.classMissions || []);
    renderSeasonEvents(data.seasonEvents || []);
    renderUnclaimedRewards({ ...data, legacyQuests: [] });

    if(grid) grid.dataset.eventSignature = signature;
  }

  function renderEventStatus(message = '', loading = false, refresh) {
    const topbar = document.querySelector('#event-view .event-topbar');
    if(!topbar) return;
    let status = document.getElementById('event-loading-status');
    if(!status) {
      status = document.createElement('div'); status.id = 'event-loading-status';
      status.className = 'plaza-toolbar'; topbar.append(status);
      status.innerHTML = '<span id="event-status-message" role="status"></span><div class="event-toolbar-actions"><button id="event-unclaimed-button" type="button" class="button event-rewards-button" hidden aria-expanded="false" aria-controls="event-unclaimed-dialog">미수령 보상</button><button id="event-refresh-button" type="button" class="button">새로고침</button></div>';
      status.querySelector('#event-unclaimed-button').onclick = () => {
        const dialog = getUnclaimedRewardsDialog();
        if(!dialog || !Number(dialog.dataset.count)) return;
        dialog.hidden = !dialog.hidden;
        status.querySelector('#event-unclaimed-button').setAttribute('aria-expanded', String(!dialog.hidden));
      };
    }
    const dropdown = getUnclaimedRewardsDialog();
    if(dropdown && dropdown.parentElement !== status) status.append(dropdown);
    status.querySelector('#event-status-message').textContent = message;
    status.querySelector('#event-unclaimed-button').disabled = loading;
    const button = status.querySelector('#event-refresh-button');
    button.disabled = loading; button.onclick = refresh;
    updateUnclaimedButton();
  }

  window.DJ48EventRender = {
    getQuestStatusClass,
    renderQuestCards,
    renderClassMissionCards,
    renderSeasonEvents,
    renderEventCycleGuide,
    renderEventSections,
    renderEventStatus
  };
})();
