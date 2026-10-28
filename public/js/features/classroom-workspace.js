(function(root) {
  'use strict';
  const states = new Map();
  const selectedProducts = new Map();
  let identity = '';
  let marketResizeController;
  const $ = id => document.getElementById(id);
  function el(tag, className = '', text) {
    const node = document.createElement(tag); node.className = className;
    if(text !== undefined) node.textContent = text;
    return node;
  }
  function button(label, action, className = 'classroom-soft-action') {
    const node = el('button', className, label); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function icon(name, className = 'classroom-feature-visual') {
    const image = el('img', className); image.src = name === 'point-token' ? '/images/classroom/navigation-v2/bank-96.webp' : `/images/classroom-icons/${name}.svg`; image.alt = ''; return image;
  }
  function art(name) {
    const image = el('img', 'classroom-workspace-art'); image.src = `/images/classroom/${name}-320.webp`; image.alt = ''; image.width = 160; image.height = 160; image.decoding = 'async'; image.loading = 'lazy'; return image;
  }
  const point = value => Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  function go(tab) { root.DJ48ClassroomForm?.setActiveClassroomTab(tab); }
  function openEditor(id) {
    const target = $(id); if(!target || target.hidden) return;
    for(let node = target; node; node = node.parentElement) if(node.tagName === 'DETAILS') node.open = true;
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    target.querySelector('input:not([type="hidden"]),textarea,select,button')?.focus({ preventScroll: true });
  }
  function header(panel, title, description, kicker, action) {
    if(!panel) return;
    let wrap = panel.querySelector(':scope > .classroom-tab-heading');
    if(!wrap) { wrap = el('header', 'classroom-tab-heading'); panel.prepend(wrap); }
    wrap.replaceChildren();
    const copy = el('div'); copy.append(el('h3', '', title), el('p', 'classroom-tab-description', description));
    wrap.append(copy); if(action) wrap.append(action);
  }
  function summary(parent, id, title, rows, artwork) {
    let aside = $(id); if(!aside) { aside = el('aside', 'classroom-workspace-aside'); aside.id = id; parent.append(aside); }
    aside.replaceChildren(el('h4', '', title));
    if(artwork) aside.append(art(artwork));
    rows.forEach(([label, value]) => {
      const row = el('div', 'classroom-summary-line'); row.append(el('span', '', label), el('strong', '', value)); aside.append(row);
    });
    return aside;
  }
  function toolbar(parent, id, cards, options = {}) {
    let wrap = $(id); if(!wrap) { wrap = el('div', 'classroom-explorer-toolbar'); wrap.id = id; parent.prepend(wrap); }
    const state = states.get(id) || { query: '', filter: 'all', sort: 'number' }; states.set(id, state);
    wrap.replaceChildren();
    const status = el('span', 'classroom-explorer-result'); status.setAttribute('role', 'status');
    let empty = parent.querySelector(`:scope > [data-explorer-empty="${id}"]`);
    if(!empty) { empty = el('p', 'classroom-explorer-empty', '조건에 맞는 항목이 없어요. 검색어나 필터를 바꿔 주세요.'); empty.dataset.explorerEmpty = id; parent.append(empty); }
    const apply = () => {
      let count = 0;
      for(const card of cards) {
        const match = (!state.query || (options.text?.(card) || card.textContent).toLocaleLowerCase().includes(state.query.toLocaleLowerCase())) &&
          (state.filter === 'all' || options.match?.(card, state.filter));
        card.hidden = !match; if(match) count++;
      }
      empty.hidden = count !== 0 || cards.length === 0;
      status.textContent = `${count}개 표시`;
      wrap.querySelectorAll('[data-explorer-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.explorerFilter === state.filter)));
      options.afterFilter?.();
    };
    if(options.search !== false) {
      const label = el('label', 'classroom-search-field');
      label.append(el('span', 'sr-only', options.placeholder || '검색'));
      const input = el('input'); input.type = 'search'; input.placeholder = options.placeholder || '이름으로 검색'; input.value = state.query;
      input.addEventListener('input', () => { state.query = input.value.trim(); apply(); }); label.append(input); wrap.append(label);
    }
    if(options.filters) {
      const group = el('div', 'classroom-filter-pills');
      options.filters.forEach(([key, label]) => {
        const b = button(label, () => { state.filter = key; apply(); }, 'classroom-filter-pill'); b.dataset.explorerFilter = key; group.append(b);
      }); wrap.append(group);
    }
    if(options.sort) {
      const label = el('label', 'classroom-sort-field'); label.append(el('span', 'sr-only', '학생 정렬'));
      const select = el('select');
      [['number', '번호순'], ['name', '이름순']].forEach(([value, text]) => { const option = el('option', '', text); option.value = value; select.append(option); });
      select.value = state.sort;
      const sort = () => {
        const ordered = cards.slice().sort((a, b) => state.sort === 'name' ? options.text(a).localeCompare(options.text(b), 'ko') : Number(a.dataset.studentNumber) - Number(b.dataset.studentNumber));
        for(const card of ordered) card.parentElement.append(card);
      };
      select.addEventListener('change', () => { state.sort = select.value; sort(); }); sort(); label.append(select); wrap.append(label);
    }
    wrap.append(status); apply(); return wrap;
  }
  function decorateTables() {
    document.querySelectorAll('#classroom-view .classroom-review-table').forEach(table => {
      const labels = [...table.querySelectorAll('thead th')].map(cell => cell.textContent);
      table.querySelectorAll('tbody tr').forEach(row => [...row.children].forEach((cell, index) => { cell.dataset.label = labels[index] || ''; }));
    });
  }
  function getPrice(item = {}) {
    const coin = item.priceType === 'djCoin';
    const raw = coin ? item.priceCoin : item.pricePoint;
    const valid = ['number', 'string'].includes(typeof raw) && raw !== null && raw !== undefined && String(raw).trim() !== '' && Number.isFinite(Number(raw)) && Number(raw) >= 0;
    return { value: valid ? Number(raw) : null, unit: coin ? 'DJ코인' : 'P', coin, valid };
  }
  function enhanceMarket(economy = {}, wallet = {}, teacher = false) {
    const grid = $('classroom-shop-grid'); if(!grid) return;
    marketResizeController?.abort(); marketResizeController = new AbortController();
    const narrow = matchMedia('(max-width: 700px)');
    const items = new Map((economy.shopItems || []).map(item => [String(item.itemId), item]));
    for(const section of grid.querySelectorAll('.classroom-market-section')) {
      const list = section.querySelector('.classroom-market-card-grid');
      const cards = [...list.querySelectorAll('[data-classroom-shop-item-id]')];
      if(!cards.length) continue;
      const key = `${section.dataset.classroomMarketPane}-${section.querySelector('h4').textContent}`;
      const layout = el('div', 'classroom-catalog-layout'); section.append(layout); layout.append(list);
      const detail = el('aside', 'classroom-product-detail'); detail.setAttribute('aria-label', '선택한 상품 상세'); layout.append(detail);
      detail.id = `classroom-product-detail-${section.dataset.classroomMarketPane}-${section.querySelector('h4').textContent.replace(/\s/g,'')}`;
      const controls = new Map(), peeks = new Map();
      let current = null;
      const position = () => {
        if(narrow.matches && current) {
          const rowEnd = cards[Math.min(cards.length - 1, Math.floor(cards.indexOf(current) / 2) * 2 + 1)];
          rowEnd.after(detail);
        } else layout.append(detail);
        detail.hidden = !current;
      };
      const close = () => {
        if(!current) return;
        const previous = current, control = controls.get(previous);
        control.hidden = true; previous.append(control); previous.classList.remove('is-selected');
        peeks.get(previous).setAttribute('aria-expanded','false'); current = null;
        detail.hidden = true; selectedProducts.delete(key); peeks.get(previous).focus({preventScroll:true});
        if(narrow.matches) previous.scrollIntoView({block:'nearest'});
      };
      const select = (card, userAction = false) => {
        if(current === card) { if(userAction && narrow.matches) detail.scrollIntoView({block:'nearest'}); return; }
        // Touch only the old and new selection. The original purchase/edit nodes keep their delegated handlers.
        if(current) {
          const control = controls.get(current); control.hidden = true; current.append(control);
          current.classList.remove('is-selected'); peeks.get(current).setAttribute('aria-expanded','false');
        }
        current = card; card.classList.add('is-selected'); peeks.get(card).setAttribute('aria-expanded','true');
        const item = items.get(card.dataset.classroomShopItemId) || {};
        selectedProducts.set(key, item.itemId);
        const price = getPrice(item), balance = Number(price.coin ? economy.myDjCoin : wallet.point) || 0;
        const title = el('h4','',item.title || '교실 상품'); title.tabIndex = -1;
        const head = el('div','classroom-product-heading'); head.append(title,button('목록으로',close,'classroom-product-back'));
        detail.replaceChildren(head,el('p','',item.desc || '상품 설명이 아직 등록되지 않았어요.'));
        const values = el('div','classroom-product-calculation');
        const rows = [['가격',price.valid ? `${point(price.value)} ${price.unit}` : '가격 미등록']];
        if(!teacher) {
          rows.unshift(['사용 가능한 잔액',`${point(balance)} ${price.unit}`]);
          if(price.valid && price.value > 0) rows.push([balance >= price.value ? '구매 후 잔액' : '부족한 금액',`${point(Math.abs(balance-price.value))} ${price.unit}`]);
        }
        rows.forEach(([label,value])=>{const row=el('div','classroom-summary-line');row.append(el('span','',label),el('strong','',value));values.append(row);});
        detail.append(values);
        const status = card.querySelector('.quest-status'); if(status) detail.append(status.cloneNode(true));
        const control = controls.get(card); control.hidden=false;detail.append(control); position();
        if(userAction && narrow.matches) { title.focus({preventScroll:true}); detail.scrollIntoView({block:'nearest',behavior:'auto'}); }
      };
      for(const card of cards) {
        const control = card.querySelector('.classroom-review-actions') || card.querySelector('[data-classroom-shop-buy-id]');
        controls.set(card,control);control.hidden=true;
        const peek=button('상세 보기',()=>select(card,true));peek.dataset.productDetails=card.dataset.classroomShopItemId;
        peek.setAttribute('aria-label',`${card.querySelector('h4').textContent} 상세 보기`);peek.setAttribute('aria-controls',detail.id);peek.setAttribute('aria-expanded','false');
        peeks.set(card,peek);card.append(peek);
      }
      detail.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
      narrow.addEventListener('change',position,{signal:marketResizeController.signal});
      const saved=cards.find(card=>card.dataset.classroomShopItemId===selectedProducts.get(key));
      if(saved || !narrow.matches) select(saved || cards[0]); else position();
    }
  }
  function enhanceExchange(data) {
    const section = document.querySelector('.classroom-exchange-section'); if(!section) return;
    const rows = [...section.querySelectorAll('.classroom-exchange-row')];
    const tabs = el('div', 'classroom-filter-pills classroom-exchange-tabs');
    const state = states.get('exchange') || { direction: 'pointToCoin' }; states.set('exchange', state);
    const settings = data.economyBoard?.exchangeSettings || {};
    const balance = Number(data.wallet?.point || 0), coin = Number(data.economyBoard?.myDjCoin || 0);
    rows.forEach(row => {
      const input = row.querySelector('input'); const direction = input.dataset.classroomExchangeAmount;
      const label = direction === 'pointToCoin' ? 'P → DJ코인' : 'DJ코인 → P';
      const tab = button(label, () => {
        state.direction = direction;
        rows.forEach(r => { r.hidden = r !== row; });
        tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === tab)));
      }, 'classroom-filter-pill'); tab.setAttribute('aria-pressed', String(state.direction === direction)); tabs.append(tab);
      row.hidden = state.direction !== direction;
      const inputLabel = el('label', 'classroom-exchange-field', input.placeholder);
      input.before(inputLabel); inputLabel.append(input);
      const preview = el('div', 'classroom-exchange-preview'); preview.setAttribute('aria-live', 'polite'); inputLabel.after(preview);
      const action = row.querySelector('[data-classroom-exchange-direction]');
      const enabled = direction === 'pointToCoin' ? settings.pointToCoinEnabled !== false : settings.coinToPointEnabled !== false;
      const update = () => {
        const amount = Number(input.value);
        const cost = direction === 'pointToCoin' ? amount * Math.max(.01, Number(settings.pointToCoinPointCost || 3)) : amount;
        const receive = direction === 'pointToCoin' ? amount : amount * Math.max(.01, Number(settings.coinToPointReward || .5));
        const valid = input.value !== '' && Number.isSafeInteger(amount) && amount > 0 && amount <= 1000000;
        const available = direction === 'pointToCoin' ? balance : coin;
        const unit = direction === 'pointToCoin' ? 'P' : 'DJ코인';
        const receiveUnit = direction === 'pointToCoin' ? 'DJ코인' : 'P';
        preview.replaceChildren();
        if(valid) {
          for(const [label, value] of [['사용할 금액', `${point(cost)} ${unit}`], ['받을 금액', `${point(receive)} ${receiveUnit}`], [cost <= available ? '교환 후 잔액' : '부족한 금액', `${point(Math.abs(available - cost))} ${unit}`]]) {
            const line = el('div', 'classroom-summary-line'); line.append(el('span', '', label), el('strong', '', value)); preview.append(line);
          }
        } else preview.append(el('p', '', '교환할 DJ코인 수를 양의 정수로 입력해 주세요.'));
        action.disabled = !enabled || !valid || cost > available;
        action.textContent = !enabled ? '교환 중지' : valid ? `${point(receive)} ${receiveUnit} 받기` : '금액을 입력해 주세요';
      };
      input.addEventListener('input', update); update();
    });
    section.querySelector('.classroom-exchange-list').before(tabs);
  }
  function syncEconomyNavigation(activeTab) {
    const nav = $('classroom-economy-navigation'); if(!nav) return;
    nav.hidden = !['market', 'bank', 'securities'].includes(activeTab);
    for(const control of nav.querySelectorAll('[data-classroom-market-tab]')) {
      const key = control.dataset.classroomMarketTab;
      control.id = `classroom-economy-tab-${key}`;
      const selected = activeTab === 'market' && control.classList.contains('is-active');
      control.setAttribute('aria-selected', String(selected)); control.tabIndex = selected ? 0 : -1;
      const panes = [...document.querySelectorAll(`[data-classroom-market-pane="${key}"]`)];
      control.setAttribute('aria-controls', panes.map((pane,index) => {
        if(!pane.id) pane.id = `classroom-economy-${key}-${index}`;
        pane.setAttribute('role', 'tabpanel'); pane.setAttribute('aria-labelledby', control.id); return pane.id;
      }).join(' '));
    }
  }
  function arrangeEconomyNavigation(teacher) {
    const nav = $('classroom-economy-navigation') || document.querySelector('[data-classroom-panel="market"] .classroom-subtab-bar');
    if(!nav) return;
    if(!nav.id) {
      nav.id = 'classroom-economy-navigation'; nav.setAttribute('aria-label', '교실 경제 메뉴');
      const bank = document.querySelector('[data-classroom-tab="bank"]'); bank.classList.add('classroom-subtab');
      nav.append(bank);
      const securities = document.querySelector('[data-classroom-tab="securities"]');
      if(securities) { securities.classList.add('classroom-subtab'); nav.append(securities); }
      document.querySelector('.classroom-tabs').after(nav);
      nav.querySelectorAll('button').forEach(control => control.setAttribute('role', 'tab'));
      nav.addEventListener('keydown', event => {
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        const controls = [...nav.querySelectorAll('button')].filter(control => !control.hidden);
        const index = controls.indexOf(event.target); if(index < 0) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + controls.length) % controls.length;
        controls[next].click(); controls[next].focus();
      });
    }
    for(const [key,label] of [['point','포인트샵'],['coin','코인샵'],['group','공동구매'],['inventory',teacher ? '사용 요청' : '내 물건']]) {
      const control = nav.querySelector(`[data-classroom-market-tab="${key}"]`);
      if(control.textContent !== label) control.textContent = label;
    }
  }
  function render(data = {}, deps = {}) {
    root.DJ48Securities?.configure(data, deps);
    const needs = name => !deps.activeTab || deps.activeTab === name;
    const teacher = deps.isCurrentClassroomTeacher?.(data.settings) === true;
    const key = `${data.settings?.classId}:${deps.currentMemberUserId}:${teacher}`;
    if(identity !== key) { states.clear(); selectedProducts.clear(); identity = key; }
    const economy = data.economyBoard || {};
    const manageNav = document.querySelector('[data-classroom-group="manage"]');
    if(manageNav) manageNav.textContent = '검토';
    const tab = name => document.querySelector(`[data-classroom-panel="${name}"]`);
    const nav = document.querySelector('.classroom-navigation'); const tabs = document.querySelector('.classroom-tabs');
    if(tabs?.parentElement === nav) nav.after(tabs);
    arrangeEconomyNavigation(teacher);
    const specs = [
      ['classroom', '우리반 학생', '서로의 모습과 성장을 만나 보세요.', '우리반', null],
      ['quest', teacher ? '우리반 퀘스트' : '오늘의 퀘스트', teacher ? '활동과 보상을 살펴보고, 우리반의 도전을 준비해요.' : '작은 실천을 완료하고 포인트와 경험치를 모아요.', '할 일', teacher ? ['퀘스트 등록·관리', 'classroom-quest-editor-panel'] : null],
      ['routine', teacher ? '성장루틴 살펴보기' : '매일 조금씩, 나의 루틴', teacher ? '학생별 진행 상황과 검토 요청을 확인하세요.' : '반복하고 싶은 습관을 만들고 오늘 할 일을 체크해요.', '할 일', teacher ? null : ['새 루틴 만들기', 'classroom-routine-editor']],
      ['gems', teacher ? '우리반 젬스톤' : '나의 젬스톤', '쌓아 온 노력이 반짝이는 기록이 돼요.', '성장', teacher ? ['젬스톤 관리', 'classroom-gem-editor-panel'] : null],
      ['jobs', '우리반 직업', '나의 역할로 우리반을 더 좋게 만들어요.', '우리반', teacher ? ['직업 관리', 'classroom-job-editor-panel'] : null],
      ['market', '우리반 마켓', teacher ? '상품과 사용 요청을 한곳에서 관리하세요.' : '갖고 싶은 상품을 고르고, 구매 전 금액을 확인해요.', '경제', teacher ? ['상품 관리', 'classroom-shop-editor-panel'] : null],
      ['bank', teacher ? '우리반 은행' : '나의 교실 은행', teacher ? '학급 잔액과 적금·환전 설정을 확인하세요.' : '포인트를 차곡차곡 모으고 필요한 만큼 교환해요.', '경제', teacher ? ['은행 관리', 'classroom-bank-management-slot'] : null],
      ['mission', '함께 만드는 우리반의 목표', '한 사람의 작은 실천이 우리반의 큰 기쁨으로 모여요.', '우리반', teacher ? ['목표 관리', 'classroom-mission-editor-panel'] : null],
      ['teacher', '처리할 일', '학생들의 활동과 요청을 차근차근 확인해요.', '선생님 공간', null]
    ];
    for(const [name, title, description, kicker, action] of specs) {
      if(!needs(name)) continue;
      header(tab(name), title, description, kicker, action ? button(action[0], () => openEditor(action[1]), 'classroom-main-action') : null);
      const panel = tab(name); if(!panel) continue;
      const slot = panel.querySelector('.classroom-management-slot');
      if(slot) { slot.classList.add('classroom-bottom-management'); panel.append(slot); }
    }
    if(teacher && needs('quest')) tab('quest').querySelector('.classroom-tab-heading').append(button(`검토 ${(data.reviewItems || []).filter(item => item.itemType !== 'routine').length}건`, () => go('teacher')));
    if(needs('classroom')) {
    const students = data.studentCards || [];
    const studentCards = [...$('classroom-student-card-grid').children].filter(card => card.dataset.classroomStudentId);
    for(const card of studentCards) {
      const student = students.find(s => s.memberUserId === card.dataset.classroomStudentId);
      card.dataset.studentNumber = student?.studentNumber || 0; card.dataset.studentName = student?.nickname || student?.name || '';
    }
    toolbar($('classroom-student-card-body'), 'classroom-student-explorer', studentCards, {
      placeholder: '이름 또는 번호 검색', sort: true, text: card => `${card.dataset.studentName} ${card.dataset.studentNumber}`
    });
    }
    if(needs('quest')) {
    const questBody = $('classroom-quest-body'); questBody.classList.add('classroom-quest-workspace');
    // The renderer already applies audience/date rules; read its unfiltered summary counts.
    const questStats = [...$('classroom-quest-summary')?.querySelectorAll('.classroom-quest-stat-grid article') || []].map(card => [card.querySelector('span').textContent, card.querySelector('strong').textContent]);
    const questAside = summary(questBody, 'classroom-quest-aside', teacher ? '활동 현황' : '오늘의 진행 상황', questStats, 'reading-sprout');
    questAside.append(button(teacher ? '검토 요청 확인' : '나의 젬스톤 보기', () => go(teacher ? 'teacher' : 'gems')));
    }
    $('classroom-routine-body').hidden = teacher;
    if($('classroom-gem-management-overview')) $('classroom-gem-management-overview').hidden = !teacher;
    if($('classroom-job-management-overview')) $('classroom-job-management-overview').hidden = !teacher;
    if(needs('routine')) {
    if(!teacher) {
      const routineBody = $('classroom-routine-body'); routineBody.classList.add('classroom-routine-workspace');
      const routines = (economy.routines || []).filter(r => r.status !== 'deleted');
      const aside = summary(routineBody, 'classroom-routine-aside', '작은 습관의 힘', [
        ['진행 중', `${routines.filter(r => r.status !== 'completed').length}개`],
        ['오늘 체크', `${routines.filter(r => r.canCheckToday && !r.checkedToday && !r.reviewPending).length}개`],
        ['완료한 루틴', `${routines.filter(r => r.status === 'completed').length}개`]
      ], 'reading-sprout');
      aside.append(el('p', '', '오늘 가능한 항목을 하나씩 체크해 보세요.'));
      routineBody.append($('classroom-routine-editor'));
    } else $('classroom-routine-aside')?.remove();
    }
    if(needs('gems')) {
    const gemCards = [...$('classroom-gem-grid').querySelectorAll('[data-classroom-gem-state]')];
    toolbar(tab('gems'), 'classroom-gem-explorer', gemCards, { search: false, filters: [['all', '전체'], ['growing', '성장 중'], ['done', '최고 단계'], ['new', '시작 전']], match: (card, filter) => card.dataset.classroomGemState === filter });
    tab('gems').querySelector('.classroom-tab-heading').after($('classroom-gem-explorer'));
    }
    if(needs('jobs')) {
    const myJob = economy.myAssignment || (economy.assignments || []).find(a => a.memberUserId === deps.currentMemberUserId && a.status === 'active');
    let jobBanner = $('classroom-my-job-banner');
    if(!jobBanner) { jobBanner = el('section', 'classroom-my-job-banner'); jobBanner.id = 'classroom-my-job-banner'; $('classroom-job-summary').before(jobBanner); }
    jobBanner.hidden = teacher; jobBanner.replaceChildren(root.DJ48ClassroomRender.createClassroomJobIcon(myJob || {}));
    const jobCopy = el('div'); jobCopy.append(el('small', '', '나의 직업'), el('h4', '', myJob?.jobTitle || '나에게 맞는 역할을 찾아보세요'), el('p', '', myJob ? `월급 ${point(myJob.weeklyPayPoint)} P · 맡은 역할을 성실히 해 보아요.` : '모집 중인 직업을 둘러보고 지원할 수 있어요.')); jobBanner.append(jobCopy);
    const jobCards = [...$('classroom-job-grid').querySelectorAll('[data-classroom-job-id]')];
    toolbar(tab('jobs'), 'classroom-job-explorer', jobCards, { placeholder: '직업 검색', filters: [['all', '전체'], ['open', '모집 중'], ...(!teacher ? [['mine', '내 지원·직업']] : [])], match: (card, filter) => card.dataset[filter === 'open' ? 'classroomJobOpen' : 'classroomJobMine'] === 'true' });
    $('classroom-job-summary').after($('classroom-job-explorer'));
    }
    if(needs('market')) {
    const marketHead = tab('market').querySelector('.classroom-tab-heading');
    if(!teacher) {
      const wallet = el('div', 'classroom-market-wallet'); wallet.append(icon('point-token'), el('strong', '', `교실 포인트 ${point(data.wallet?.point)} P`), el('span', '', `DJ코인 ${point(economy.myDjCoin)}`)); marketHead.append(wallet);
    }
    }
    if(needs('bank')) {
    enhanceExchange(data);
    const bank = $('classroom-bank-grid');
    const bankAside = el('div', 'classroom-bank-aside');
    [...bank.children].filter(child => !child.classList.contains('classroom-exchange-section')).forEach(child => bankAside.append(child));
    bank.append(bankAside);
    const overview = $('classroom-bank-overview');
    if(teacher && overview?.querySelector('.classroom-review-table')) {
      const table = overview.querySelector('.classroom-review-table').parentElement;
      const details = el('details', 'classroom-bank-students'); details.append(el('summary', '', '학생별 잔액 살펴보기'), table); overview.append(details);
    }
    }
    if(needs('teacher')) {
    const reviewRoot = $('classroom-review-grid');
    if(teacher && reviewRoot) {
      const rows = [...reviewRoot.querySelectorAll('tbody tr')];
      toolbar($('classroom-teacher-review-panel'), 'classroom-review-explorer', rows, { placeholder: '학생 또는 활동 검색', filters: [['all', '전체 활동'], ['quest', '퀘스트'], ['routine', '성장루틴']], match: (row, filter) => filter === 'routine' ? row.children[0]?.textContent.includes('루틴') : !row.children[0]?.textContent.includes('루틴') });
      const headings = $('classroom-teacher-review-panel').querySelector('.event-section-heading');
      headings?.after($('classroom-review-explorer'));
      [...$('classroom-teacher-dashboard-grid').children].forEach((card, index) => {
        const label = index === 0 ? '활동 검토하기' : index === 1 ? '사용 요청 보기' : '지원자 보기';
        card.append(button(label, () => {
          if(index === 0) reviewRoot.scrollIntoView({ block: 'start', behavior: 'smooth' });
          else if(index === 1) { go('market'); document.querySelector('[data-classroom-market-tab="inventory"]')?.click(); }
          else go('jobs');
        }));
      });
    }
    }
    decorateTables();
  }
  root.DJ48ClassroomWorkspace = { render, enhanceMarket, decorateTables, getPrice, syncEconomyNavigation };
})(window);
