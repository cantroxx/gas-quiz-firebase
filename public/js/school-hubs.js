(function () {
  'use strict';
  let deps = {}, dialog, title, body, requestId = 0, labelId = 0;
  function ensureDialog() {
    if(dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'school-hub-dialog';
    dialog.setAttribute('aria-labelledby', 'school-hub-title');
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'button secondary'; close.textContent = '학교로 돌아가기';
    close.addEventListener('click', () => dialog.close());
    title = document.createElement('h2'); title.id = 'school-hub-title';
    body = document.createElement('div'); body.className = 'school-hub-items'; body.setAttribute('aria-live', 'polite');
    dialog.append(close, title, body); document.body.appendChild(dialog);
    dialog.addEventListener('close', () => { requestId += 1; });
  }
  function conceptLabel(config) {
    return config?.concept?.theme ? config.concept.theme : '컨셉 준비 중';
  }
  async function refreshLabel() {
    const id = ++labelId;
    try {
      const config = await deps.loadConfig();
      if(id !== labelId) return;
      const label = document.getElementById('school-concept-label');
      if(label) label.textContent = conceptLabel(config);
    } catch (_) {
      const label = document.getElementById('school-concept-label');
      if(label) label.textContent = '컨셉 정보를 불러오지 못했어요';
    }
  }
  async function open(hub) {
    ensureDialog(); const id = ++requestId;
    title.textContent = {subjects:'과목 퀴즈', learning:'학습 퀴즈', concept:'컨셉 퀴즈'}[hub];
    body.replaceChildren();
    if(!dialog.open) dialog.showModal();
    if(hub === 'subjects') {
      for(const subject of ['korean', 'math', 'social', 'science']) {
        const config = deps.subjectCatalog[subject];
        const button = document.createElement('button'); button.type = 'button';
        button.className = 'school-hub-item'; button.textContent = config.title; button.disabled = !config.enabled;
        button.addEventListener('click', () => { dialog.close(); deps.showSubjectView(subject); });
        body.appendChild(button);
      }
      return;
    }
    body.textContent = '퀴즈를 불러오는 중입니다…';
    try {
      const flags = await deps.loadFlags();
      if(id !== requestId) return;
      if(flags.externalQuizzesEnabled === false && !deps.isAdmin()) { body.textContent = '학습·컨셉 퀴즈는 지금 점검 중입니다.'; return; }
      const config = await deps.loadConfig(true);
      if(id !== requestId) return;
      if(hub === 'concept') {
        title.textContent = `컨셉 퀴즈 · ${conceptLabel(config)}`;
        if(!config.concept?.theme) { body.textContent = '새로운 컨셉 퀴즈를 준비하고 있어요.'; return; }
      }
      body.replaceChildren();
      for(const item of config.items || []) {
        if(item.active === false || (item.group || 'learning') !== hub) continue;
        let url; try { url = new URL(item.url); } catch (_) { continue; }
        if(url.protocol !== 'https:') continue;
        const link = document.createElement('a'); link.className = 'school-hub-item';
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        const name = document.createElement('strong'); name.textContent = item.title;
        const desc = document.createElement('span'); desc.textContent = item.description || '새 탭에서 퀴즈 열기 ↗';
        link.append(name, desc); body.appendChild(link);
      }
      if(!body.children.length) body.textContent = '아직 등록된 퀴즈가 없습니다.';
      refreshLabel();
    } catch (_) { if(id === requestId) body.textContent = '퀴즈를 불러오지 못했어요. 학교로 돌아간 뒤 다시 시도해 주세요.'; }
  }
  document.addEventListener('click', event => {
    const door = event.target.closest('#school-quiz-grid [data-school-hub]');
    if(door) open(door.dataset.schoolHub);
  });
  document.addEventListener('keydown', event => {
    if(event.target.tagName === 'BUTTON' || !['Enter', ' '].includes(event.key)) return;
    const door = event.target.closest('#school-quiz-grid [data-school-hub]');
    if(door) { event.preventDefault(); door.click(); }
  });
  window.DJ48SchoolHubs = { configure(value) { deps = value; refreshLabel(); }, refreshLabel };
})();
