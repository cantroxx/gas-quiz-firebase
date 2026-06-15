(function () {
  function getQuestStatusClass(status) {
    if(status === '완료 가능') return 'quest-status-ready';
    if(status === '수령 완료') return 'quest-status-claimed';
    if(status === '준비 중') return 'quest-status-waiting';
    return 'quest-status-active';
  }

  function renderQuestCards(quests = []) {
    const grid = document.getElementById('quest-card-grid');
    if(!grid) return;
    grid.innerHTML = '';
    quests.forEach(quest => {
      const card = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h4');
      const progress = document.createElement('p');
      const reward = document.createElement('p');
      const status = document.createElement('span');
      const claimButton = document.createElement('button');

      card.className = 'quest-card';
      card.dataset.questId = quest.questId || '';
      icon.className = 'event-card-icon';
      icon.textContent = quest.icon;
      title.textContent = quest.title;
      progress.className = 'quest-progress';
      progress.textContent = `진행도 ${quest.progress || `${Number(quest.current) || 0}/${Number(quest.target) || 1}`}`;
      reward.className = 'quest-reward';
      reward.textContent = `보상: ${quest.reward}`;
      status.className = `quest-status ${getQuestStatusClass(quest.status)}`;
      status.textContent = quest.status;
      claimButton.type = 'button';
      claimButton.className = 'quest-claim-button';
      claimButton.dataset.questClaimId = quest.questId || '';
      claimButton.textContent = quest.claimed ? '수령 완료' : '보상 받기';
      claimButton.disabled = !quest.claimable;

      card.append(icon, title, progress, reward, status, claimButton);
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

  function renderSeasonEvents(events = []) {
    const grid = document.getElementById('season-event-grid');
    if(!grid) return;
    grid.innerHTML = '';
    events.forEach(eventItem => {
      const card = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const period = document.createElement('span');

      card.className = 'season-event-card';
      icon.className = 'event-card-icon';
      icon.textContent = eventItem.icon;
      title.textContent = eventItem.title;
      desc.textContent = eventItem.desc;
      period.className = 'season-event-period';
      period.textContent = eventItem.period;

      card.append(icon, title, desc, period);
      grid.appendChild(card);
    });
  }

  function renderEventSections(data = {}) {
    renderQuestCards(data.quests || []);
    renderClassMissionCards(data.classMissions || []);
    renderSeasonEvents(data.seasonEvents || []);
  }

  window.DJ48EventRender = {
    getQuestStatusClass,
    renderQuestCards,
    renderClassMissionCards,
    renderSeasonEvents,
    renderEventSections
  };
})();
