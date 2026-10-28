(function() {
  'use strict';

  // Server catalog prices are authoritative; these values are used only before the catalog loads.
  const dataProvider = window.DJ48CoordiDataProvider.createProvider();
  let commerce=null,commerceBusy=false, draftTools=null;
  let itemPage=0, pageScope="";
  const pageSize=48;
  let dressroomMode = new URLSearchParams(location.search).get('mode') === 'dressroom';
  const previewPrices = Object.freeze({
    hair: 150, face: 120, skin: 50, hat: 100,
    faceAccessory: 60, eyeAccessory: 60, earring: 50,
    top: 100, overall: 180, bottom: 80, shoes: 70,
    glove: 50, cape: 150, weapon: 200, shield: 100
  });
  function getPreviewPrice(item) { return commerce?.prices?.[item.id]?.price ?? previewPrices[item.category] ?? 0; }
  function formatPrice(value) { return value.toLocaleString('ko-KR'); }

  const categories = [
    
    { id: 'hair', label: '헤어' },
    { id: 'face', label: '성형' },
    { id: 'skin', label: '피부' },
    { id: 'hat', label: '모자' },
    { id: 'faceAccessory', label: '얼굴장식' },
    { id: 'eyeAccessory', label: '눈장식' },
    { id: 'earring', label: '귀고리' },
    { id: 'top', label: '상의' },
    { id: 'overall', label: '한벌옷' },
    { id: 'bottom', label: '하의' },
    { id: 'shoes', label: '신발' },
    { id: 'glove', label: '장갑' },
    { id: 'cape', label: '망토' },
    { id: 'weapon', label: '무기' },
    { id: 'transparent', label: '투명 아이템' }
  ];

  const slotLabels = {
    hair: '헤어',
    face: '성형',
    skin: '피부',
    hat: '모자',
    faceAccessory: '얼굴장식',
    eyeAccessory: '눈장식',
    earring: '귀고리',
    top: '상의',
    overall: '한벌옷',
    bottom: '하의',
    shoes: '신발',
    glove: '장갑',
    cape: '망토',
    weapon: '무기',
  };

  const styleTokens = {
    hair: ['#5a382d', '#b95576', '#61a799', '#22252d'],
    face: ['calm', 'wink', 'smile', 'cry'],
    skin: ['#f3c7a5', '#f7d9bb', '#d7b399'],
    hat: ['#df6d7d', '#487fb3', '#f4c95d'],
    faceAccessory: ['#f4c95d', '#e05b5b', '#ffffff'],
    eyeAccessory: ['#7a5cdd', '#20242c'],
    earring: ['#f8d568', '#8bd4e8'],
    top: ['#f8f1df', '#68a57b', '#4e78b7'],
    overall: ['#8f7bd2', '#d77d83'],
    bottom: ['#536b83', '#de7d9f', '#594a3d'],
    shoes: ['#2f333b', '#7b4b31', '#e7e7e7'],
    glove: ['#ffffff', '#3d4350'],
    cape: ['#47527d', '#b8d7e9', '#e6c86e'],
    weapon: ['#f6c36d', '#9ba7b3', '#b77adf'],
    shield: ['#7f8c9a', '#d8c06f']
  };

  const fallbackCatalog = [
    { name: '검은색 솜이 헤어', code: 30000, slot: '헤어', category: 'hair', cash: 1 },
    { name: '베리 트윈테일 헤어', code: 30001, slot: '헤어', category: 'hair', cash: 1 },
    { name: '민트 웨이브 헤어', code: 30002, slot: '헤어', category: 'hair', cash: 1 },
    { name: '차분한 얼굴', code: 20000, slot: '성형', category: 'face', cash: 1 },
    { name: '윙크 얼굴', code: 20001, slot: '성형', category: 'face', cash: 1 },
    { name: '복숭아 피부', code: 12000, slot: '피부', category: 'skin', cash: 1 },
    { name: '크림 피부', code: 12001, slot: '피부', category: 'skin', cash: 1 },
    { name: '리본 베레모', code: 1000001, slot: '모자', category: 'hat', cash: 1 },
    { name: '투명 모자', code: 1000002, slot: '모자', category: 'hat', cash: 1, transparent: true },
    { name: '별 볼터치', code: 1010001, slot: '얼굴장식', category: 'faceAccessory', cash: 1 },
    { name: '투명 안경', code: 1020001, slot: '눈장식', category: 'eyeAccessory', cash: 1, transparent: true },
    { name: '달빛 귀고리', code: 1030001, slot: '귀고리', category: 'earring', cash: 1 },
    { name: '세일러 상의', code: 1040001, slot: '상의', category: 'top', cash: 1 },
    { name: '초록 후드', code: 1040002, slot: '상의', category: 'top', cash: 1 },
    { name: '분홍 한벌옷', code: 1050001, slot: '한벌옷', category: 'overall', cash: 1 },
    { name: '데님 하의', code: 1060001, slot: '하의', category: 'bottom', cash: 1 },
    { name: '핑크 스커트', code: 1060002, slot: '하의', category: 'bottom', cash: 1 },
    { name: '블랙 슈즈', code: 1070001, slot: '신발', category: 'shoes', cash: 1 },
    { name: '브라운 로퍼', code: 1070002, slot: '신발', category: 'shoes', cash: 1 },
    { name: '투명 신발', code: 1072153, slot: '신발', category: 'shoes', cash: 1, transparent: true, pinned: true },
    { name: '하얀 장갑', code: 1080001, slot: '장갑', category: 'glove', cash: 1 },
    { name: '투명 장갑', code: 1082102, slot: '장갑', category: 'glove', cash: 1, transparent: true, pinned: true },
    { name: '밤하늘 망토', code: 1100001, slot: '망토', category: 'cape', cash: 1 },
    { name: '구름 망토', code: 1100002, slot: '망토', category: 'cape', cash: 1 },
    { name: '별빛 완드', code: 1700001, slot: '무기', category: 'weapon', cash: 1 },
    { name: '연습용 검', code: 1302000, slot: '무기', category: 'weapon' },
    { name: '투명 방패', code: 1092067, slot: '방패', category: 'shield', cash: 1, transparent: true }
  ];

  const defaultState = {
    activeCategory: 'hair',
    action: 'stand',
    cashOnly: true,
    ear: 'round',
    faceMode: 'calm',
    gender: 'female',
    genderLocked: false,
    background: 'grid',
    query: '',
    scale: 3,
    sort: 'featured',
    equipped: {},
    officialLook: null
  };

  const rendererConfig = {
    region: 'GMS',
    version: '255',
    baseItemCodes: {
      gender: {
        male: {
          body: [2000],
          look: {
            skin: 12000,
            face: 20000,
            hair: 30000
          }
        },
        female: {
          body: [2001],
          look: {
            skin: 12000,
            face: 21000,
            hair: 31000
          }
        }
      },
      outfit: {
        top: 1040001,
        bottom: 1060001,
        shoes: 1070001
      }
    },
    actionMap: {
      stand: 'stand1',
      walk: 'walk1',
      jump: 'jump',
      sit: 'sit'
    },
    emotionMap: {
      calm: 0,
      wink: 1,
      smile: 2,
      cry: 3
    }
  };

  const rendererSlots = [
    'skin',
    'face',
    'hair',
    'hat',
    'faceAccessory',
    'eyeAccessory',
    'earring',
    'top',
    'overall',
    'bottom',
    'shoes',
    'glove',
    'cape',
    'weapon',
    'shield'
  ];

  const displayLimit = 140;
  const focusedCategoryLimit = 20;
  const roomyCategoryIds = new Set(['hair', 'face', 'skin']);
  const featuredCategoryQuota = {
    hair: 14,
    face: 10,
    skin: 6,
    hat: 20,
    faceAccessory: 20,
    eyeAccessory: 20,
    earring: 20,
    top: 20,
    overall: 20,
    bottom: 20,
    shoes: 20,
    glove: 20,
    cape: 20,
    weapon: 20,
    shield: 1
  };
  const featuredKeywords = [
    '마스터',
    '스페셜',
    '라벨',
    '로얄',
    '프리미엄',
    '리부트',
    '블랙',
    '화이트',
    '핑크',
    '러블리',
    '루시드',
    '라리엘',
    '멜로디',
    '세레나데',
    '아린',
    '엘로디',
    '원더',
    '페어리',
    '달빛',
    '별빛',
    '밤의',
    '안개'
  ];

  const meaegiSlotPathByCategory = {
    hair: 'hair',
    face: 'face',
    skin: 'skin',
    hat: 'cap',
    faceAccessory: 'faceDeco',
    eyeAccessory: 'eyeDeco',
    earring: 'earring',
    top: 'dress',
    overall: 'dress',
    bottom: 'pants',
    shoes: 'shoes',
    glove: 'glove',
    cape: 'cape',
    weapon: 'weapon',
    shield: 'subWeapon'
  };

  const storageKey = 'dj48.coordi.preview.' + (window.parent.DJ48AccountState?.getCurrentMemberUserId() || 'guest');
  const coordiAnalysisDataVersion = '20260702-render-validated-v2';
  let officialCoordiTimer = null;
  let officialCoordiRequestId = 0;
  let officialCoordiLoading = false;
  const elements = {
    action: document.getElementById('action-select'),
    backgroundPicker: document.querySelector('.background-picker'),
    cashToggle: document.getElementById('cash-toggle'),
    catalogStatus: document.getElementById('catalog-status'),
    categoryTabs: document.getElementById('category-tabs'),
    character: document.getElementById('character'),
    characterEmptyTitle: document.getElementById('character-empty-title'),
    characterEffects: document.getElementById('character-effects'),
    characterImage: document.getElementById('character-image'),
    characterRenderStatus: document.getElementById('character-render-status'),
    count: document.getElementById('item-count'),
    ear: document.getElementById('ear-select'),
    face: document.getElementById('face-select'),
    genderDialog: document.getElementById('gender-dialog'),
    genderLockLabel: document.getElementById('gender-lock-label'),
    grid: document.getElementById('item-grid'),
    gender: document.getElementById('gender-select'),
    load: document.getElementById('load-button'),
    officialLookInput: document.getElementById('official-look-input'),
    officialLookStatus: document.getElementById('official-look-status'),
    random: document.getElementById('random-button'),
    reset: document.getElementById('reset-button'),
    search: document.getElementById('item-search'),
    share: document.getElementById('share-button'),
    sort: document.getElementById('sort-select'),
    stageFrame: document.getElementById('stage-frame'),
    slotList: document.getElementById('slot-list')
  };

  let catalog = buildCatalogItems(fallbackCatalog);
  let featuredHairMap = new Map();
  let itemEffectMap = new Map();
  let topCoordiItemMap = new Map();
  let topCoordiItemsByCategoryGender = {};
  let state = loadState();
  // Persisted outfits survive provider changes; persisted pixels must be regenerated.
  state.officialLook = null;
  let prismDraft = null;
  let lastRenderedPayload = "";
  let prismTargetKey = "";

  const pinnedCatalogItems = [
    { name: '투명 신발', code: 1072153, slot: '신발', category: 'shoes', cash: 1, transparent: true, pinned: true },
    { name: '투명 장갑', code: 1082102, slot: '장갑', category: 'glove', cash: 1, transparent: true, pinned: true }
  ];

  function buildCatalogItems(items = []) {
    return items.map((item, index) => ({
      ...item,
      id: `${item.category}-${item.code}`,
      token: item.token || (styleTokens[item.category] ? styleTokens[item.category][index % styleTokens[item.category].length] : '#999')
    }));
  }

  function mergePinnedItemsIntoCatalog() {
    const existingKeys = new Set(catalog.map((item) => `${item.category}-${Number(item.code)}`));
    const additions = pinnedCatalogItems.filter((item) => !existingKeys.has(`${item.category}-${Number(item.code)}`));
    if(additions.length > 0) {
      catalog = buildCatalogItems([...catalog, ...additions]);
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function loadCatalog() {
    try {
      const data = await dataProvider.load('catalog');
      const items = Array.isArray(data.items) ? data.items : [];
      if(items.length > 0) {
        catalog = buildCatalogItems(items);
      }
    } catch(error) {
      console.warn('Maple cosmetics catalog load failed. Using fallback catalog.', error);
    }
  }

  async function loadFeaturedHair() {
    try {
      const data = await dataProvider.load('featuredHair');
      const items = Array.isArray(data.items) ? data.items : [];
      featuredHairMap = new Map(items.map((item, index) => [
        Number(item.code),
        {
          ...item,
          rank: index + 1
        }
      ]));
    } catch(error) {
      console.warn('Maple featured hair catalog load failed. Falling back to keyword ranking.', error);
    }
  }

  async function loadTopCoordiItems() {
    try {
      const data = await dataProvider.load('verified');
      // Reapply the policy so a stale/refreshed upstream JSON cannot reintroduce excluded items.
      topCoordiItemsByCategoryGender = Object.fromEntries(Object.entries(data.itemsByCategoryGender || {}).map(([category, byGender]) => [
        category, Object.fromEntries(Object.entries(byGender).map(([gender, items]) => [
          gender, items.filter(item => window.DJ48CoordiCatalogFilter.isEligible(item)).sort(window.DJ48CoordiCatalogFilter.compareDisplay)
        ]))
      ]));
      topCoordiItemMap = new Map();
      Object.values(topCoordiItemsByCategoryGender).forEach((byGender) => {
        Object.values(byGender || {}).forEach((items) => {
          (items || []).forEach((item) => {
            const code = Number(item.code);
            const previous = topCoordiItemMap.get(code);
            if(!previous || Number(item.usedCount || 0) > Number(previous.usedCount || 0)) {
              topCoordiItemMap.set(code, item);
            }
          });
        });
      });
    } catch(error) {
      console.warn('Maple coordi analysis top items load failed. Falling back to local ranking.', error);
    }
  }

  function mergeTopCoordiItemsIntoCatalog() {
    if(!topCoordiItemsByCategoryGender || Object.keys(topCoordiItemsByCategoryGender).length === 0) return;
    const existingKeys = new Set(catalog.map((item) => `${item.category}-${Number(item.code)}`));
    const additions = [];
    Object.values(topCoordiItemsByCategoryGender).forEach((byGender) => {
      Object.values(byGender || {}).forEach((items) => {
        (items || []).forEach((item) => {
          const code = Number(item.code);
          const category = item.category;
          const key = `${category}-${code}`;
          if(!category || !Number.isFinite(code) || existingKeys.has(key)) return;
          existingKeys.add(key);
          additions.push({
            name: item.name,
            code,
            slot: item.slot,
            category,
            cash: item.cash ? 1 : 0,
            gender: item.gender || 'all',
            masterSpecial: !!item.masterSpecial,
            royalSpecial: !!item.royalSpecial,
            masterSpecialSeason: item.masterSpecialSeason || null,
            royalSpecialSeason: item.royalSpecialSeason || null
          });
        });
      });
    });
    if(additions.length > 0) {
      catalog = buildCatalogItems([...catalog, ...additions]);
    }
  }

  async function loadItemEffects() {
    try {
      const data = await dataProvider.load('effects');
      itemEffectMap = new Map(Object.entries(data.effects || {}).map(([code, effect]) => [
        Number(code),
        {
          ...effect,
          code: Number(code)
        }
      ]));
    } catch(error) {
      console.warn('Maple item effect data load failed. Effect overlays are disabled.', error);
      itemEffectMap = new Map();
    }
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return saved
        ? normalizeState({ ...defaultState, ...saved, equipped: saved.equipped || {}, officialLook: normalizeOfficialLook(saved.officialLook) })
        : { ...defaultState };
    } catch(error) {
      return { ...defaultState };
    }
  }

  function normalizeState(value = {}) {
    const next = { ...defaultState, ...value };
    next.gender = next.gender === 'male' ? 'male' : 'female';
    if(!categories.some(category => category.id === next.activeCategory)) next.activeCategory = 'hair';
    next.equipped = { ...next.equipped }; delete next.equipped.shield;
    next.genderLocked = next.genderLocked === true;
    next.background = ['grid', 'room', 'stage', 'sky', 'school'].includes(next.background) ? next.background : 'grid';
    next.action = 'stand';
    next.ear = 'round';
    next.faceMode = 'calm';
    next.cashOnly = true;
    next.sort = 'featured';
    next.scale = 3;
    next.prisms = Object.fromEntries(Object.entries(value.prisms || {}).filter(([key, v]) => /^[a-zA-Z]+-\d+$/.test(key) && v && typeof v === 'object').slice(0, 1500).map(([key,v]) => [key, normalizePrism(v)]));
    return next;
  }

  function saveState() {
    state = normalizeState(state);
    localStorage.setItem(storageKey, JSON.stringify(prismDraft ? {...state, officialLook: null} : state));
    draftTools?.record();
  }

  function normalizeOfficialLook(look) {
    if(!look || typeof look !== 'object') return null;
    const hash = String(look.hash || '').trim().toUpperCase();
    const imageUrl = String(look.imageUrl || '').trim();
    if(!hash && !imageUrl.startsWith('data:image/png;base64,')) return null;
    return {
      hash,
      imageUrl,
      sourceInput: String(look.sourceInput || '').trim(),
      loadedAt: look.loadedAt || '',
      includesEffects: look.includesEffects === true,
      renderer: String(look.renderer || '')
    };
  }

  function getOfficialLookImageUrl(officialLook) {
    if(!officialLook) return '';
    if(officialLook.imageUrl?.startsWith('data:image/png;base64,')) return officialLook.imageUrl;
    if(officialLook.hash) {
      const params = new URLSearchParams({ hash: officialLook.hash, size: '180' });
      return `/api/maple/official-image?${params.toString()}`;
    }
    return officialLook.imageUrl || '';
  }

  function clearOfficialLook() {
    if(!state.officialLook) return;
    state.officialLook = null;
    if(elements.officialLookStatus) {
      elements.officialLookStatus.classList.remove('is-ready', 'is-error');
      elements.officialLookStatus.textContent = '코디 미리보기 대기';
    }
  }

  function beginOfficialCoordiRefresh() {
    officialCoordiRequestId += 1;
    officialCoordiLoading = true;
    setOfficialLookStatus('코디를 입혀보는 중…', 'loading');
  }

  function cancelOfficialCoordiRefresh() {
    officialCoordiLoading = false;
    officialCoordiRequestId += 1;
    if(officialCoordiTimer) {
      window.clearTimeout(officialCoordiTimer);
      officialCoordiTimer = null;
    }
  }

  function getDefaultOfficialLookCode(slot) {
    const genderConfig = rendererConfig.baseItemCodes.gender[state.gender === 'male' ? 'male' : 'female'];
    return genderConfig.look[slot] || null;
  }

  function getOfficialCoordiCode(slot) {
    const item = getEquipped(slot);
    return item && Number.isFinite(Number(item.code)) ? Number(item.code) : null;
  }

  function getDyedHairCode() {
    const item = getEquipped('hair');
    const code = getOfficialCoordiCode('hair') || getDefaultOfficialLookCode('hair');
    const dye = prismDraft && item && prismDraft.key === item.id ? prismDraft.value : state.prisms?.[item?.id];
    return Number.isInteger(dye?.hairColor) ? Math.floor(code / 10) * 10 + dye.hairColor : code;
  }
  function buildOfficialCoordiPayload() {
    const hasOverall = !!getEquipped('overall');
    const itemCode = {
      skin: getOfficialCoordiCode('skin') || getDefaultOfficialLookCode('skin'),
      face: getOfficialCoordiCode('face') || getDefaultOfficialLookCode('face'),
      hair: getDyedHairCode(),
      cap: getOfficialCoordiCode('hat'),
      faceDeco: getOfficialCoordiCode('faceAccessory'),
      eyeDeco: getOfficialCoordiCode('eyeAccessory'),
      earring: getOfficialCoordiCode('earring'),
      dress: hasOverall ? getOfficialCoordiCode('overall') : getOfficialCoordiCode('top'),
      pants: hasOverall ? null : getOfficialCoordiCode('bottom'),
      shoes: getOfficialCoordiCode('shoes'),
      glove: getOfficialCoordiCode('glove'),
      cape: getOfficialCoordiCode('cape'),
      weapon: getOfficialCoordiCode('weapon')
    };
    Object.keys(itemCode).forEach((key) => {
      if(!Number.isFinite(Number(itemCode[key]))) delete itemCode[key];
    });
    return {
      gender: state.gender === 'male' ? 0 : 1,
      earType: state.ear === 'leaf' ? 1 : 0,
      weaponMotion: 0,
      variation: 0,
      variationType: 0,
      weaponBaseEffect: 1,
      weaponJumpEffect: 1,
      weaponSpecialEffect: 1,
      capeEffect: 1,
      hideWeaponOnSkill: 1,
      capEffect: 1,
      floatEffect: 1,
      width: 220,
      height: 180,
      x: 110,
      y: 140,
      itemCode,
      itemPrism: buildPrisms()
    };
  }

  const renderPreview = window.DJ48CoordiPreviewRenderer.createRenderer({
    render: async look => {
      const config=await dataProvider.configure();
      const result=await window.DJ48CoordiBridge.render(look);
      if(config.mode==='local'&&(result.renderer!=='quiztown-local-static'||result.sourceSnapshot!==config.snapshot))throw Error('코디 서버와 로컬 데이터 버전이 일치하지 않습니다.');
      return result;
    },
    assertCurrent: () => window.DJ48CoordiBridge.assertSession()
  });

  async function loadOfficialCoordiLook() {
    const requestId = ++officialCoordiRequestId;
    const payload = buildOfficialCoordiPayload();
    officialCoordiLoading = true;
    setOfficialLookStatus('코디를 입혀보는 중…', 'loading');
    try {
      const result = await renderPreview(payload);
      const response = {ok: result?.success === true};
      if(requestId !== officialCoordiRequestId) return;
      if(!response.ok || !result || !result.success || !result.imageUrl) {
        throw new Error(result && result.message ? result.message : `official-coordi-${response.status}`);
      }
      const renderedImage = new Image();
      renderedImage.src = result.imageUrl;
      await renderedImage.decode();
      if(requestId !== officialCoordiRequestId) return;
      lastRenderedPayload = JSON.stringify(payload);
      officialCoordiLoading = false;
      state.officialLook = {
        hash: result.hash || '',
        imageUrl: result.imageUrl,
        sourceInput: 'equipped-coordi',
        includesEffects: result.includesEffects === true,
        renderer: result.renderer || '',
        loadedAt: new Date().toISOString()
      };
      saveState();
      setOfficialLookStatus(prismDraft ? '염색 미리보기' : '미리보기 반영됨', 'ready');
      renderCharacter();
      updatePrismApply();
      if(prismDraft) prismStatus(dressroomMode ? '염색 미리보기 반영됨 · 코인은 사용되지 않았어요.' : '미리보기 반영됨 · 마음에 들면 적용을 눌러 저장하세요.');
    } catch(error) {
      if(requestId !== officialCoordiRequestId) return;
      console.warn('Maple official coordi look load failed.', error);
      officialCoordiLoading = false;
      updatePrismApply();
      if(prismDraft) document.getElementById('prism-status').textContent = error.message?.includes('헤어') ? error.message : '염색 이미지를 불러오지 못했어요. 미리보기 다시 시도를 눌러주세요.';
      setOfficialLookStatus(error.message || '코디 이미지를 불러오지 못했어요. 다시 시도해 주세요.', 'error');
      renderCharacter();
    }
  }

  function scheduleOfficialCoordiLook(delay = 250) {
    beginOfficialCoordiRefresh();
    updatePrismApply();
    if(officialCoordiTimer) window.clearTimeout(officialCoordiTimer);
    officialCoordiTimer = window.setTimeout(() => {
      officialCoordiTimer = null;
      loadOfficialCoordiLook();
    }, delay);
  }

  function setOfficialLookStatus(text, mode) {
    document.getElementById('retry-coordi-preview').hidden = mode !== 'error';
    if(!elements.officialLookStatus) return;
    elements.officialLookStatus.textContent = text;
    elements.officialLookStatus.setAttribute('aria-busy', String(mode === 'loading'));
    elements.officialLookStatus.classList.toggle('is-ready', mode === 'ready');
    elements.officialLookStatus.classList.toggle('is-error', mode === 'error');
  }

  async function loadOfficialLook() {
    await dataProvider.configure();
    if(dataProvider.isLocal()) { setOfficialLookStatus('로컬 모드에서는 저장 코디와 아이템 선택으로 미리보기를 만드세요.'); return; }
    const input = elements.officialLookInput ? elements.officialLookInput.value.trim() : '';
    if(!input) {
      setOfficialLookStatus('공식 이미지 URL 또는 hash 필요', 'error');
      return;
    }
    officialCoordiLoading = true;
    setOfficialLookStatus('공식 렌더 확인 중', 'loading');
    try {
      const params = new URLSearchParams({
        input,
        width: '220',
        height: '180',
        x: '110',
        y: '140'
      });
      const response = await fetch(`/api/maple/official-look?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if(!response.ok || !payload || !payload.success || !payload.hash || !payload.imageUrl) {
        throw new Error(payload && payload.message ? payload.message : `official-look-${response.status}`);
      }
      officialCoordiLoading = false;
      state.officialLook = {
        hash: payload.hash,
        imageUrl: payload.imageUrl,
        sourceInput: input,
        loadedAt: new Date().toISOString()
      };
      saveState();
      if(!officialCoordiLoading) setOfficialLookStatus(prismDraft ? '염색 미리보기' : '코디 저장됨', 'ready');
      renderCharacter();
    } catch(error) {
      console.warn('Maple official look load failed.', error);
      officialCoordiLoading = false;
      setOfficialLookStatus('공식 렌더 불러오기 실패', 'error');
    }
  }

  function getItem(id) {
    return catalog.find((item) => item.id === id) || null;
  }

  function getEquipped(slot) {
    return getItem(state.equipped[slot]);
  }

  function getVerifiedItems(category = state.activeCategory) {
    if(category === 'transparent') {
      return Object.values(topCoordiItemsByCategoryGender).flatMap(genders => genders[state.gender] || [])
        .filter(window.DJ48CoordiCatalogFilter.isTransparentItem)
        .sort(window.DJ48CoordiCatalogFilter.compareDisplay)
        .map(item => ({ ...item, id: `${item.category}-${item.code}` }));
    }
    return (topCoordiItemsByCategoryGender[category]?.[state.gender] || []).map(item => ({ ...item, id: `${item.category}-${item.code}` }));
  }

  function getVisibleItems() {
    const query = state.query.trim().toLowerCase();
    return getVerifiedItems().filter(item => (!document.getElementById('coordi-owned-only')?.checked || commerce?.profile.owned?.includes(item.id)) && (!query || item.name.toLowerCase().includes(query) || String(item.code).includes(query)));
  }

  function getFilteredItemCount() { return getVisibleItems().length; }

  function shouldUseRecommendedOnly(query) {
    if(state.sort !== 'featured' || query) return false;
    if(state.activeCategory === 'new') return topCoordiItemMap.size > 0;
    return getRecommendedCodesForCategory(state.activeCategory).size > 0 ||
      (state.activeCategory === 'hair' && featuredHairMap.size > 0);
  }

  function getVisibleLimit() {
    if(state.activeCategory === 'new') return displayLimit;
    return roomyCategoryIds.has(state.activeCategory) ? displayLimit : focusedCategoryLimit;
  }

  function applyRecommendedScope(items, query) {
    if(!shouldUseRecommendedOnly(query)) return items;
    if(state.activeCategory === 'new') {
      return items.filter((item) => topCoordiItemMap.has(Number(item.code)));
    }
    const recommendedCodes = getRecommendedCodesForCategory(state.activeCategory);
    const pinnedItems = items.filter((item) => item.pinned);
    if(recommendedCodes.size > 0) {
      const recommendedItems = items.filter((item) => recommendedCodes.has(Number(item.code)));
      const recommendedIds = new Set(recommendedItems.map((item) => item.id));
      pinnedItems.forEach((item) => {
        if(!recommendedIds.has(item.id)) recommendedItems.unshift(item);
      });
      return recommendedItems;
    }
    if(state.activeCategory === 'hair' && featuredHairMap.size > 0) {
      return items.filter((item) => featuredHairMap.has(Number(item.code)));
    }
    return items;
  }

  function getRecommendedGenderKeys() {
    if(state.gender === 'male') return ['male'];
    if(state.gender === 'female') return ['female'];
    return ['female', 'male', 'all'];
  }

  function getRecommendedCodesForCategory(category) {
    const byGender = topCoordiItemsByCategoryGender[category] || {};
    const codes = new Set();
    getRecommendedGenderKeys().forEach((gender) => {
      (byGender[gender] || []).forEach((item) => codes.add(Number(item.code)));
    });
    return codes;
  }

  function isSupportedItem(item) {
    return !!item;
  }

  function inferItemGender(item) {
    const rankedItem = topCoordiItemMap.get(Number(item.code));
    if(rankedItem && rankedItem.gender && rankedItem.gender !== 'all') return rankedItem.gender;
    const code = Number(item.code);
    if(!Number.isFinite(code)) return 'all';
    if(item.category === 'hair') {
      const family = Math.floor(code / 10000);
      if(family === 3 || family === 5) return 'male';
      if(family === 4 || family === 6 || family === 7) return 'female';
    }
    if(item.category === 'face') {
      const family = Math.floor(code / 1000);
      if(family === 20 || family === 22 || family === 24 || family === 26 || family === 28 || family === 50) return 'male';
      if(family === 21 || family === 23 || family === 25 || family === 27 || family === 29 || family === 51) return 'female';
    }
    return 'all';
  }

  function isGenderMatched(item) {
    if(state.gender === 'all') return true;
    const gender = inferItemGender(item);
    return gender === 'all' || gender === state.gender;
  }

  function getFeaturedScore(item) {
    const name = item.name || '';
    if(item.pinned) return 3000000 + Number(item.code || 0);
    const topCoordiItem = topCoordiItemMap.get(Number(item.code));
    if(topCoordiItem) {
      const rank = Number(topCoordiItem.displayRank || topCoordiItem.rank || 999999);
      const usedCount = Number(topCoordiItem.usedCount || 0);
      return 2000000 + usedCount - rank;
    }
    const featuredHair = item.category === 'hair' ? featuredHairMap.get(Number(item.code)) : null;
    if(featuredHair) return 1000000 - featuredHair.rank;
    const keywordScore = featuredKeywords.reduce((score, keyword, index) => (
      name.includes(keyword) ? score + (featuredKeywords.length - index) * 120 : score
    ), 0);
    return keywordScore + Number(item.code || 0);
  }

  function sortItems(items, sortMode) {
    return items.slice().sort((left, right) => {
      if(sortMode === 'name') return left.name.localeCompare(right.name, 'ko') || left.code - right.code;
      if(sortMode === 'latest') return right.code - left.code;
      if(sortMode === 'code') return left.code - right.code;
      return getFeaturedScore(right) - getFeaturedScore(left);
    });
  }

  function sortFeaturedItems(items, query) {
    if(state.activeCategory !== 'new' || query) return sortItems(items, 'featured');
    const byCategory = new Map();
    items.forEach((item) => {
      if(!byCategory.has(item.category)) byCategory.set(item.category, []);
      byCategory.get(item.category).push(item);
    });
    const picked = [];
    Object.keys(featuredCategoryQuota).forEach((category) => {
      const source = byCategory.get(category) || [];
      const recommendedCodes = getRecommendedCodesForCategory(category);
      const group = recommendedCodes.size > 0
        ? sortItems(source.filter((item) => recommendedCodes.has(Number(item.code))), 'featured')
        : category === 'hair' && featuredHairMap.size > 0
          ? sortItems(source.filter((item) => featuredHairMap.has(Number(item.code))), 'featured')
          : sortItems(source, 'featured');
      picked.push(...group.slice(0, featuredCategoryQuota[category]));
    });
    if(picked.length < displayLimit) {
      const pickedIds = new Set(picked.map((item) => item.id));
      sortItems(items.filter((item) => !pickedIds.has(item.id)), 'featured')
        .slice(0, displayLimit - picked.length)
        .forEach((item) => picked.push(item));
    }
    return picked.slice(0, displayLimit);
  }

  function getItemThumbUrl(item) {
    return dataProvider.thumbnail(item, getVerifiedItems(item.category));
  }

  function shouldUseGeneratedThumb(item) {
    return item && (item.transparent || item.category === 'hair' || item.category === 'face' || item.category === 'skin');
  }

  function getItemFallbackLabel(item) {
    if(!item) return '아이템';
    if(item.transparent) return '투명';
    const labels = {
      hair: '헤어',
      face: '성형',
      skin: '피부',
      hat: '모자',
      faceAccessory: '얼굴',
      eyeAccessory: '눈',
      earring: '귀',
      top: '상의',
      overall: '한벌',
      bottom: '하의',
      shoes: '신발',
      glove: '장갑',
      cape: '망토',
      weapon: '무기',
      shield: '방패'
    };
    return labels[item.category] || '아이템';
  }

  function equip(item) {
    prismDraft = null;
    state.equipped[item.category] = item.id;
    if(item.category === 'overall') {
      delete state.equipped.top;
      delete state.equipped.bottom;
    }
    if(item.category === 'top' || item.category === 'bottom') {
      delete state.equipped.overall;
    }
    if(item.category === 'face') {
      state.faceMode = item.token || 'calm';
    }
    saveState();
    scheduleOfficialCoordiLook();
    render();
  }

  function clearSlot(slot) {
    prismDraft = null;
    delete state.equipped[slot];
    if(slot === 'face') {
      state.faceMode = 'calm';
    }
    saveState();
    scheduleOfficialCoordiLook();
    render();
  }

  function getRendererItemCodes() {
    const genderConfig = rendererConfig.baseItemCodes.gender[state.gender === 'male' ? 'male' : 'female'];
    const codes = new Set(genderConfig.body);
    if(!getEquipped('skin')) {
      codes.add(genderConfig.look.skin);
    }
    if(!getEquipped('face')) {
      codes.add(genderConfig.look.face);
    }
    if(!getEquipped('hair')) {
      codes.add(genderConfig.look.hair);
    }
    const hasDress = !!getEquipped('overall');
    if(!hasDress && !getEquipped('top')) {
      codes.add(rendererConfig.baseItemCodes.outfit.top);
    }
    if(!hasDress && !getEquipped('bottom')) {
      codes.add(rendererConfig.baseItemCodes.outfit.bottom);
    }
    if(!getEquipped('shoes')) {
      codes.add(rendererConfig.baseItemCodes.outfit.shoes);
    }
    rendererSlots.forEach((slot) => {
      const item = getEquipped(slot);
      if(item && Number.isFinite(Number(item.code))) {
        codes.add(Number(item.code));
      }
    });
    return Array.from(codes);
  }

  function buildRendererUrl() {
    const encodedItems = getRendererItemCodes()
      .map((code) => encodeURIComponent(JSON.stringify({
        ItemId: code,
        Version: rendererConfig.version,
        Region: rendererConfig.region
      })))
      .join(',');
    const params = new URLSearchParams({
      showEars: state.ear === 'round' ? 'True' : 'False',
      showLefEars: state.ear === 'leaf' ? 'True' : 'False',
      showHighLefEars: 'False',
      padding: '24',
      name: '',
      flipX: 'False',
      renderMode: 'Full',
      resize: '2'
    });
    const action = rendererConfig.actionMap[state.action] || rendererConfig.actionMap.stand;
    const emotion = rendererConfig.emotionMap[state.faceMode] ?? 0;
    return `https://maplestory.io/api/character/${encodedItems}/${action}/${emotion}?${params.toString()}`;
  }

  function renderCharacter() {
    const itemCount = Object.keys(state.equipped).length;
    const officialLook = normalizeOfficialLook(state.officialLook);
    // GMS fallback omits newer KMS items (including Abyss hair), producing a
    // misleading bald/different outfit. Only show the requested official look.
    const imageUrl = officialLook ? getOfficialLookImageUrl(officialLook) : '';
    elements.character.style.setProperty('--preview-scale', String(state.scale));
    elements.character.classList.toggle('is-official-render', !!officialLook);
    elements.character.classList.toggle('is-official-loading', officialCoordiLoading);
    elements.character.classList.remove('is-error');
    elements.characterImage.hidden = !imageUrl || (officialCoordiLoading && !officialLook);
    if(imageUrl && elements.characterImage.src !== imageUrl) {
      elements.characterImage.src = imageUrl;
    }
    if(!imageUrl) elements.characterImage.removeAttribute('src');
    elements.characterEmptyTitle.textContent = officialCoordiLoading
      ? officialLook ? '코디 미리보기 갱신 중' : '코디 미리보기 생성 중'
      : officialLook
        ? '코디 미리보기'
        : itemCount ? '코디 미리보기 대기' : '빈 캐릭터';
    elements.characterRenderStatus.textContent = officialCoordiLoading
      ? '코디 이미지를 생성 중입니다.'
      : officialLook
        ? '코디 이미지로 표시 중입니다.'
        : itemCount
          ? '이미지를 불러오지 못했어요. 미리보기 다시 시도를 눌러주세요.'
          : '아이템을 선택하면 코디 이미지로 갱신됩니다.';
    if(elements.action) elements.action.value = state.action;
    if(elements.ear) elements.ear.value = state.ear;
    if(elements.face) elements.face.value = state.faceMode;
    if(elements.officialLookInput && officialLook && !elements.officialLookInput.value) {
      elements.officialLookInput.value = officialLook.sourceInput || officialLook.hash;
    }
    renderItemEffects(!!officialLook);
    draftTools?.update();
  }

  function getEquippedItemEffects() {
    return Object.values(state.equipped)
      .map((id) => getItem(id))
      .filter(Boolean)
      .map((item) => itemEffectMap.get(Number(item.code)))
      .filter(Boolean)
      .sort((a, b) => Number(a.z || 0) - Number(b.z || 0));
  }

  function renderItemEffects(officialLookReady) {
    if(!elements.characterEffects) return;
    if(!officialLookReady || officialCoordiLoading || state.officialLook?.includesEffects) {
      elements.characterEffects.innerHTML = '';
      elements.characterEffects.hidden = true;
      return;
    }
    const effects = getEquippedItemEffects();
    elements.characterEffects.hidden = effects.length === 0;
    elements.characterEffects.innerHTML = effects.map((effect) => {
      const previewScale = Number(state.scale || 2);
      const effectScale = Number(effect.scale || 1) * (previewScale / 2);
      const width = Number(effect.width || 0);
      const height = Number(effect.height || 0);
      const x = Number(effect.x || 0);
      const y = Number(effect.y || 0);
      const z = Number(effect.z || 0);
      return [
        '<img',
        ` src="${escapeHtml(effect.imageUrl)}"`,
        ` alt=""`,
        ` style="left:calc(50% + ${x}px);top:calc(50% + ${y}px);width:${width}px;height:${height}px;z-index:${z};transform:translate(-50%, -50%) scale(${effectScale});"`,
        '>'
      ].join('');
    }).join('');
  }

  function renderCategories() {
    elements.categoryTabs.innerHTML = categories.map((category) => {
      const active = category.id === state.activeCategory ? ' is-active' : '';
      return `<button type="button" class="${active}" data-category="${category.id}">${category.label}</button>`;
    }).join('');
  }

  function renderItems() {
    const all = getVisibleItems();
    const scope=JSON.stringify([state.gender,state.activeCategory,state.query,document.getElementById('coordi-owned-only').checked]);
    if(scope!==pageScope){pageScope=scope;itemPage=0;}
    const pages=Math.max(1,Math.ceil(all.length/pageSize));itemPage=Math.min(itemPage,pages-1);
    const visible=all.slice(itemPage*pageSize,(itemPage+1)*pageSize);
    document.getElementById('coordi-page-status').textContent=(itemPage+1)+' / '+pages+' · '+all.length+'개';
    document.getElementById('coordi-page-prev').disabled=itemPage===0;
    document.getElementById('coordi-page-next').disabled=itemPage===pages-1;
    dataProvider.prepareItems(visible).then(changed=>{if(changed)renderItems();}).catch(()=>{});
    const total = all.length;
    elements.count.textContent = `${visible.length}개`;
    if(!visible.length) { elements.grid.innerHTML = '<p class="empty-results">검색 결과가 없어요. 다른 이름으로 찾아보세요.</p>'; return; }
    elements.grid.innerHTML = visible.map((item) => {
      const equipped = state.equipped[item.category] === item.id ? ' is-equipped' : '';
      const saved=commerce?.profile.look?.gender===state.gender && commerce?.profile.look?.equipped?.[item.category]===item.id;
      const note=dataProvider.note(item);
      const swatchStyle = item.transparent
        ? 'background:linear-gradient(135deg,#fff 0 45%,#e45b5b 46% 54%,#fff 55% 100%)'
        : `background:${item.token}`;
      const thumbUrl = getItemThumbUrl(item);
      const fallbackLabel = escapeHtml(getItemFallbackLabel(item));
      return [
        `<button type="button" class="item-card${equipped}${saved?' is-saved':''}${note?' is-unsupported':''}" data-item="${item.id}" data-category="${item.category}" title="${escapeHtml(item.name)}" aria-label="${escapeHtml(item.name)}, ${formatPrice(getPreviewPrice(item))} DJ코인, 입어보기" aria-pressed="${equipped ? 'true' : 'false'}">`,
        thumbUrl
          ? `<span class="item-media"><img class="item-thumb${dataProvider.isIcon(item)?' is-item-icon':''}" src="${escapeHtml(thumbUrl)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="item-fallback item-fallback--${item.category}" hidden>${fallbackLabel}</span></span>`
          : `<span class="item-media"><span class="item-fallback item-fallback--${item.category}" style="${swatchStyle}">${fallbackLabel}</span></span>`,
        '<span>',
        `<span class="item-state">${saved?'장착 중':equipped?'입어보는 중':''}${note?' · 지원 확인':''}</span>`,
        `<span class="item-name">${escapeHtml(item.name)}</span>`,
        state.activeCategory === 'transparent' ? `<span class="item-kind">${escapeHtml(slotLabels[item.category] || '')}</span>` : '',
        `<span class="item-price">${commerce?.profile.owned?.includes(item.id) ? "보유 중" : formatPrice(getPreviewPrice(item))+" DJ코인"}</span>`,
        '</span>',
        '</button>'
      ].join('');
    }).join('');
  }

  function renderSlots() {
    const total = Object.keys(slotLabels).reduce((sum, slot) => {
      const item = getEquipped(slot);
      return sum + (item && !commerce?.profile.owned?.includes(item.id) ? getPreviewPrice(item) : 0);
    }, 0);
    document.getElementById('outfit-total').textContent = `${formatPrice(total)} DJ코인`;

    elements.slotList.innerHTML = Object.keys(slotLabels).map((slot) => {
      const item = getEquipped(slot);
      if(!item) return '';
      return [
        '<div class="slot-row">',
        `<span class="slot-name">${slotLabels[slot]}</span>`,
        `<span class="slot-value">${item ? escapeHtml(item.name) : '-'}</span>`,
        `<button type="button" class="slot-clear" data-slot="${slot}" aria-label="${slotLabels[slot]} 해제">x</button>`,
        '</div>'
      ].join('');
    }).join('') || '<p class="empty-outfit">아직 착용한 아이템이 없어요.</p>';
  }

  function renderScaleButtons() {
    document.querySelectorAll('.scale-button').forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.scale) === state.scale);
    });
  }

  function render() {
    updateSavedOutfitHint();
    state = normalizeState(state);
    renderCategories();
    renderItems();
    renderSlots();
    renderPrismPanel();
    renderCharacter();
    elements.search.value = state.query;
    if(elements.sort) elements.sort.value = state.sort;
    if(elements.gender) elements.gender.value = state.gender;
    if(elements.cashToggle) {
      elements.cashToggle.classList.toggle('is-active', state.cashOnly);
      elements.cashToggle.textContent = state.cashOnly ? '캐시만' : '전체';
    }
    if(elements.genderLockLabel) {
      elements.genderLockLabel.textContent = state.gender === 'male' ? '남자 아바타' : '여자 아바타';
    }
    if(elements.stageFrame) elements.stageFrame.dataset.background = state.background;
    if(elements.backgroundPicker) {
      elements.backgroundPicker.querySelectorAll('[data-background]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.background === state.background);
      });
    }
    if(normalizeOfficialLook(state.officialLook)) {
      if(!officialCoordiLoading) setOfficialLookStatus(prismDraft ? '염색 미리보기' : '코디 저장됨', 'ready');
    }
    elements.catalogStatus.textContent = state.activeCategory === 'transparent' ? '부위를 골라 깔끔하게 꾸며보세요.' : '인기 코디 아이템을 골라보세요.';
  }

  function randomize() {
    prismDraft = null;
    const equipped = {};
    Object.keys(slotLabels).forEach((slot) => {
      const options = getVerifiedItems(slot);
      if(options.length > 0 && Math.random() > 0.25) {
        equipped[slot] = options[Math.floor(Math.random() * options.length)].id;
      }
    });
    if(equipped.overall) { delete equipped.top; delete equipped.bottom; }
    state.equipped = equipped;
    const face = getEquipped('face');
    state.faceMode = face && face.token ? face.token : 'calm';
    saveState();
    scheduleOfficialCoordiLook();
    render();
  }

  function lockGender(nextGender) {
    prismDraft = null;
    state.gender = nextGender === 'male' ? 'male' : 'female';
    state.genderLocked = true;
    Object.keys(state.equipped).forEach((slot) => {
      const item = getEquipped(slot);
      if(item && !isGenderMatched(item)) delete state.equipped[slot];
    });
    if(elements.genderDialog) elements.genderDialog.hidden = true;
    saveState();
    scheduleOfficialCoordiLook();
    render();
  }

  function showGenderDialogIfNeeded() {
    if(!elements.genderDialog || state.genderLocked) return;
    elements.genderDialog.hidden = false;
  }

  elements.cashToggle?.addEventListener('click', () => {
    state.cashOnly = !state.cashOnly;
    saveState();
    render();
  });

  elements.categoryTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if(!button) return;
    state.activeCategory = button.dataset.category;
    saveState();
    render();
  });

  elements.grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-item]');
    if(!button) return;
    const item = getItem(button.dataset.item);
    if(item) equip(item);
  });

  elements.slotList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-slot]');
    if(!button) return;
    clearSlot(button.dataset.slot);
  });

  elements.search.addEventListener('input', () => {
    state.query = elements.search.value;
    renderItems();
  });

  elements.sort?.addEventListener('change', () => {
    state.sort = elements.sort.value;
    saveState();
    renderItems();
  });

  elements.gender?.addEventListener('change', () => {
    state.gender = elements.gender.value;
    Object.keys(state.equipped).forEach((slot) => {
      const item = getEquipped(slot);
      if(item && !isGenderMatched(item)) delete state.equipped[slot];
    });
    saveState();
    scheduleOfficialCoordiLook();
    render();
  });

  elements.action?.addEventListener('change', () => {
    state.action = elements.action.value;
    saveState();
    renderCharacter();
  });

  elements.face?.addEventListener('change', () => {
    state.faceMode = elements.face.value;
    saveState();
    renderCharacter();
  });

  elements.ear?.addEventListener('change', () => {
    state.ear = elements.ear.value;
    saveState();
    scheduleOfficialCoordiLook();
    renderCharacter();
  });

  document.querySelectorAll('.scale-button').forEach((button) => {
    button.addEventListener('click', () => {
      state.scale = Number(button.dataset.scale);
      saveState();
      renderCharacter();
      renderScaleButtons();
    });
  });

  elements.backgroundPicker?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-background]');
    if(!button) return;
    state.background = button.dataset.background || 'grid';
    saveState();
    render();
  });

  elements.genderDialog?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-set-gender]');
    if(!button) return;
    lockGender(button.dataset.setGender);
  });

  elements.reset.addEventListener('click', () => {
    prismDraft = null;
    cancelOfficialCoordiRefresh();
    state = normalizeState({
      ...defaultState,
      gender: state.gender,
      genderLocked: state.genderLocked,
      background: state.background,
      prisms: state.prisms,
      equipped: {}
    });
    if(elements.officialLookInput) elements.officialLookInput.value = '';
    setOfficialLookStatus('코디 미리보기 대기');
    saveState();
    render();
  });

  elements.random.addEventListener('click', randomize);
  document.getElementById('retry-coordi-preview').addEventListener('click', () => {
    scheduleOfficialCoordiLook(0);
    renderCharacter();
  });

  elements.load?.addEventListener('click', loadOfficialLook);

  elements.officialLookInput?.addEventListener('keydown', (event) => {
    if(event.key === 'Enter') {
      event.preventDefault();
      loadOfficialLook();
    }
  });

  elements.characterImage.addEventListener('load', () => {
    const officialLook = normalizeOfficialLook(state.officialLook);
    if(officialCoordiLoading) return;
    elements.character.classList.remove('is-error');
    elements.characterImage.hidden = false;
    elements.characterEmptyTitle.textContent = officialLook
      ? '코디 미리보기'
      : Object.keys(state.equipped).length ? '코디 미리보기 대기' : '빈 캐릭터';
    elements.characterRenderStatus.textContent = officialLook
      ? '코디 이미지로 표시 중입니다.'
      : '코디 미리보기 · 일부 아이템은 외부 렌더 지원에 따라 다르게 보일 수 있어요.';
  });

  elements.characterImage.addEventListener('error', () => {
    elements.characterImage.hidden = true;
    if(officialCoordiLoading) return;
    const officialLook = normalizeOfficialLook(state.officialLook);
    elements.character.classList.add('is-error');
    elements.characterImage.hidden = true;
    elements.characterEmptyTitle.textContent = officialLook ? '코디 미리보기 실패' : '미리보기 대기';
    elements.characterRenderStatus.textContent = officialLook
      ? '코디 이미지를 불러오지 못했습니다.'
      : '코디 미리보기 · 일부 아이템은 외부 렌더 지원에 따라 다르게 보일 수 있어요.';
  });

  elements.share?.addEventListener('click', async () => {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({
      equipped: state.equipped,
      officialLook: normalizeOfficialLook(state.officialLook)
    }))));
    const url = `${location.origin}${location.pathname}#${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      elements.share.textContent = '복사됨';
      window.setTimeout(() => {
        elements.share.textContent = '공유';
      }, 1200);
    } catch(error) {
      location.hash = encoded;
    }
  });

  if(location.hash.length > 1) {
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1)))));
      if(payload.equipped) {
        state.equipped = { ...state.equipped, ...payload.equipped };
      }
      state.officialLook = null; // Shared links carry selections, never trusted renderer pixels.
    } catch(error) {
      location.hash = '';
    }
  }

  function normalizePrism(value = {}) {

    const number = (key, min, max) => Math.max(min, Math.min(max, Math.round(Number(value[key]) || 0)));
    if(Number.isInteger(value.baseColor)) return {baseColor:number('baseColor',0,7),mixColor:number('mixColor',0,7),mixRate:number('mixRate',0,99)};
    return { ...(Number.isInteger(value.hairColor) ? {hairColor:Math.max(0,Math.min(7,value.hairColor))} : {}), palette:number('palette',0,6), tone:number('tone',0,359), chroma:number('chroma',-99,99), brightness:number('brightness',-99,99), blackInclusive:number('blackInclusive',0,1) };
  }
  function prismTargets() {
    const targets = Object.keys(slotLabels).filter(slot => slot !== 'face').flatMap(slot => {
      const item = getEquipped(slot);
      if(!item && slot !== 'skin') return [];
      return [{ slot, key:item?.id || `skin-${getDefaultOfficialLookCode('skin')}`, name:item?.name || '기본 스킨' }];
    });
    for(const id of commerce?.profile.owned || []) {
      const item = getItem(id);
      if(item && item.category !== 'face' && commerce.prices?.[id]?.genders?.includes(state.gender) && !targets.some(t=>t.key===id)) targets.push({slot:item.category,key:id,name:item.name});
    }
    return targets;
  }
  function currentPrismTarget() { return prismTargets().find(t => t.key === document.getElementById('prism-target').value); }
  function buildPrisms() {
    const result = {};
    for(const target of prismTargets()) {
      const value = prismDraft?.key === target.key ? prismDraft.value : state.prisms?.[target.key];
      if(!value) continue;
      if(target.key !== (getEquipped(target.slot)?.id || (target.slot === 'skin' ? `skin-${getDefaultOfficialLookCode('skin')}` : ''))) continue;
      const prism = {...normalizePrism(value)};
      delete prism.hairColor;
      if(target.slot === 'skin') delete prism.blackInclusive;
      result[meaegiSlotPathByCategory[target.slot]] = prism;
    }
    return result;
  }
  function readPrismControls() {
    if(currentPrismTarget()?.slot === 'hair') return normalizePrism({baseColor:Number(document.getElementById('hair-dye-color').value),mixColor:Number(document.getElementById('hair-mix-color').value),mixRate:Number(document.getElementById('hair-mix-rate').value)});
    return normalizePrism({...(currentPrismTarget()?.slot === 'hair' ? {hairColor:Number(document.getElementById('hair-dye-color').value)} : {}),palette:document.getElementById('prism-palette').value,tone:document.getElementById('prism-tone').value,chroma:document.getElementById('prism-chroma').value,brightness:document.getElementById('prism-brightness').value,blackInclusive:currentPrismTarget()?.slot === 'skin' ? 0 : Number(document.getElementById('prism-black').checked)});
  }
  function syncPrismControls() {
    const target = currentPrismTarget();
    const value = savedDye(target);
    const hair = target?.slot === 'hair';
    document.getElementById('hair-dye-controls').hidden = !hair;
    document.getElementById('hair-dye-color').value = hair ? (value.baseColor ?? value.hairColor) : 0;
    document.getElementById('hair-mix-color').value = value.mixColor ?? 7;
    document.getElementById('hair-mix-rate').value = value.mixRate ?? 0;
    document.getElementById('hair-legacy-note').hidden = !hair || !(value.tone || value.chroma || value.brightness);
    document.getElementById('prism-title').textContent = hair ? '✦ 헤어 믹스염색' : '✦ 프리즘 염색';
    document.querySelectorAll('.prism-palette-label,.prism-slider').forEach(el=>el.hidden=hair);
    for(const key of ['palette','tone','chroma','brightness']) document.getElementById(`prism-${key}`).value = value[key] || 0;
    document.getElementById('prism-black').checked = !!value.blackInclusive;
    document.getElementById('prism-black-label').hidden = hair || target?.slot === 'skin';
    document.querySelector('.prism-help').textContent = target?.slot === 'skin' ? '스킨 프리즘 · 피부 색조, 채도, 명도를 조절해요.' : hair ? '정해진 8가지 색 중 두 색을 고르고 섞는 비율을 조절하세요.' : '컬러 프리즘 · 선택한 의상 부위만 염색해요.';
    updatePrismControls();
  }
  function updatePrismControls() {
    const colors = ['검정','빨강','주황','노랑','초록','파랑','보라','갈색'];
    const rate = Number(document.getElementById('hair-mix-rate').value);
    document.getElementById('hair-mix-percent').value = rate;
    document.getElementById('hair-mix-summary').textContent = `${colors[Number(document.getElementById('hair-dye-color').value)]} ${100-rate}% · ${colors[Number(document.getElementById('hair-mix-color').value)]} ${rate}%`;
    for(const key of ['tone','chroma','brightness']) document.getElementById(`prism-${key}-value`).value = document.getElementById(`prism-${key}`).value;
    updatePrismApply();
  }
  function savedDye(target) {
    if(target?.slot === 'hair' && !state.prisms?.[target.key]) return {baseColor:Number(getItem(target.key)?.code)%10,mixColor:7,mixRate:0};
    return normalizePrism({...state.prisms?.[target?.key], ...(target?.slot === 'hair' ? {hairColor:state.prisms?.[target.key]?.hairColor ?? Number(getItem(target.key)?.code)%10} : {})});
  }
  function isOriginalDye(target,value) {
    if(target?.slot === 'hair' && Number.isInteger(value.baseColor)) {
      const original = Number(getItem(target.key)?.code)%10;
      return (value.mixRate===0 || value.baseColor===value.mixColor) && value.baseColor===original;
    }
    return !value.tone && !value.chroma && !value.brightness && (target?.slot !== 'hair' || value.hairColor === Number(getItem(target.key)?.code)%10);
  }
  function updatePrismApply() {
    const button = document.getElementById('prism-apply');
    if(!button) return;
    const target = currentPrismTarget();
    const value = readPrismControls();
    const saved = savedDye(target);
    const changed = JSON.stringify(saved) !== JSON.stringify(value);
    button.disabled = dressroomMode || !commerce || commerceBusy || (target?.key !== 'skin-12000' && !commerce.profile.owned?.includes(target?.key)) || !changed || !prismDraft || prismDraft.key !== target?.key || JSON.stringify(prismDraft.value) !== JSON.stringify(value) || officialCoordiLoading || lastRenderedPayload !== JSON.stringify(buildOfficialCoordiPayload());
    const zero = isOriginalDye(target,value);
    button.textContent = target?.key !== 'skin-12000' && !commerce?.profile.owned?.includes(target?.key) ? '아이템을 먼저 받은 뒤 적용' : zero ? '원색 적용 · 무료' : '염색 무료 적용';
  }
  function renderPrismPanel() {
    const select = document.getElementById('prism-target');
    const targets = prismTargets();
    const before = select.value;
    select.innerHTML = targets.map(t => `<option value="${escapeHtml(t.key)}">${slotLabels[t.slot]} · ${escapeHtml(t.name)}${state.prisms?.[t.key] ? ' ✦' : ''}</option>`).join('');
    select.value = targets.some(t=>t.key===before) ? before : targets[0]?.key || '';
    if(prismTargetKey !== select.value) { prismTargetKey = select.value; syncPrismControls(); }
    updatePrismApply();
  }
  const prismDialog = document.getElementById('prism-panel');
  const prismStage = document.getElementById('stage-frame');
  const prismStageHome = document.createComment('preview home');
  prismStage.before(prismStageHome);
  let prismOpeningOutfit = null;
  let prismFrameStyle = null;
  let prismParentOverflow = '';
  const prismFrame = window.frameElement;
  document.getElementById('prism-open').addEventListener('click', () => {
    prismOpeningOutfit = {...state.equipped};
    if(prismFrame) {
      prismFrameStyle = prismFrame.getAttribute('style');
      prismParentOverflow = window.parent.document.body.style.overflow;
      prismFrame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;border:0;border-radius:0;z-index:100000';
      window.parent.document.body.style.overflow = 'hidden';
    }
    document.getElementById('prism-preview-stage').append(prismStage);
    renderPrismPanel(); syncPrismControls();
    prismDialog.showModal();
    document.getElementById('prism-target').dispatchEvent(new Event('change'));
  });
  document.getElementById('prism-close').addEventListener('click', () => prismDialog.close());
  prismDialog.addEventListener('close', () => {
    prismDraft = null;
    if(prismFrame) {
      if(prismFrameStyle === null) prismFrame.removeAttribute('style'); else prismFrame.setAttribute('style', prismFrameStyle);
      window.parent.document.body.style.overflow = prismParentOverflow;
    }
    if(prismOpeningOutfit) state.equipped = prismOpeningOutfit;
    prismOpeningOutfit = null;
    prismStageHome.after(prismStage);
    render(); scheduleOfficialCoordiLook();
    document.getElementById('prism-open').focus();
  });
  const prismStatus = message => { document.getElementById('prism-status').textContent = message; };
  document.getElementById('prism-target').addEventListener('change', () => {
    const hadDraft = !!prismDraft; prismDraft = null; prismTargetKey = document.getElementById('prism-target').value;
    const target = currentPrismTarget();
    if(target && getItem(target.key)) {
      state.equipped[target.slot] = target.key;
      if(target.slot === 'overall') { delete state.equipped.top; delete state.equipped.bottom; }
      if(['top','bottom'].includes(target.slot)) delete state.equipped.overall;
    }
    syncPrismControls(); scheduleOfficialCoordiLook();
    prismStatus(dressroomMode ? '색상도 자유롭게 미리 볼 수 있어요. 저장과 결제는 하지 않아요.' : '보유 아이템 염색은 횟수 제한 없이 무료예요.');
  });
  function previewPrismAutomatically(delay = 400) {
    const target = currentPrismTarget(); if(!target) return;
    prismDraft = {key:target.key, value:readPrismControls()};
    updatePrismControls();
    prismStatus('색상 미리보기 갱신 중… 자동으로 반영돼요.');
    scheduleOfficialCoordiLook(delay);
  }
  for(const id of ['hair-dye-color','hair-mix-color']) document.getElementById(id).addEventListener('change', () => previewPrismAutomatically(0));
  document.getElementById('hair-mix-rate').addEventListener('input', () => previewPrismAutomatically());
  document.getElementById('hair-mix-percent').addEventListener('input', event => {
    if(event.target.value === '') return;
    document.getElementById('hair-mix-rate').value = Math.max(0,Math.min(99,Math.round(Number(event.target.value)||0)));
    previewPrismAutomatically();
  });
  document.getElementById('hair-mix-percent').addEventListener('change', () => updatePrismControls());
  for(const key of ['palette','tone','chroma','brightness','black']) {
    document.getElementById(`prism-${key}`).addEventListener('input', () => previewPrismAutomatically());
  }
  document.getElementById('prism-preview').addEventListener('click', () => previewPrismAutomatically(0));
  document.getElementById('prism-apply').addEventListener('click', async () => {
    updatePrismApply(); if(document.getElementById('prism-apply').disabled) return;
    const {key,value} = prismDraft;
    if(!await commerceAction({action:'dye',itemId:key,value}))return;
    state.prisms = {...commerce.profile.prisms};
    prismDraft = null; saveState(); renderPrismPanel(); syncPrismControls();
    prismStatus('염색을 저장했어요.');
    setOfficialLookStatus('코디 저장됨','ready');
  });
  document.getElementById('prism-cancel').addEventListener('click', () => {
    prismDraft = null; syncPrismControls(); scheduleOfficialCoordiLook(); prismStatus('미리보기를 취소하고 저장된 색으로 돌아왔어요.');
  });
  document.getElementById('prism-restore').addEventListener('click', async () => {
    const target=currentPrismTarget(); if(!target) return;
    if(!await commerceAction({action:'dye',itemId:target.key,value:target.slot === 'hair' ? {baseColor:Number(getItem(target.key)?.code)%10,mixColor:7,mixRate:0} : normalizePrism({})}))return;
    prismDraft=null; delete state.prisms[target.key]; saveState(); syncPrismControls(); renderPrismPanel(); scheduleOfficialCoordiLook(); prismStatus('원래 색으로 복원했어요. 복원은 무료예요.');
  });

  document.getElementById('change-gender').addEventListener('click', () => { elements.genderDialog.hidden = false; });
  document.getElementById('export-look').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: 1, gender: state.gender, equipped: state.equipped, background: state.background, prisms: state.prisms }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download='my-coordi.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  document.getElementById('import-look').addEventListener('click', () => document.getElementById('look-file').click());
  document.getElementById('look-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if(!file) return;
    try {
      if(file.size > 100000) throw Error('too-large');
      const data = JSON.parse(await file.text());
      if(data.version !== 1 || !data.equipped || !['male','female'].includes(data.gender)) throw Error('invalid');
      const equipped = {};
      for(const [slot, id] of Object.entries(data.equipped)) { const item=getItem(id); if(Object.hasOwn(slotLabels,slot) && item?.category===slot) equipped[slot]=id; }
      prismDraft = null; prismTargetKey = ""; cancelOfficialCoordiRefresh(); state=normalizeState({...defaultState, gender:data.gender, genderLocked:true, equipped, background:data.background, prisms:data.prisms, officialLook:null});
      if(equipped.overall) { delete state.equipped.top; delete state.equipped.bottom; }
      saveState(); render(); scheduleOfficialCoordiLook();
    } catch(error) { alert('이 코디룸에서 저장한 JSON 파일을 선택해주세요.'); }
    event.target.value='';
  });

  function commerceMessage(message){document.getElementById('coordi-commerce-status').textContent=message;}
  function updateMode() {
    document.body.dataset.coordiMode = dressroomMode ? 'dressroom' : 'shop';
    document.querySelector('.brand').firstChild.textContent = dressroomMode ? '드레스룸' : '코디 상점';
    document.title = dressroomMode ? '무료 드레스룸' : '코디 상점';
    document.querySelector('.local-note').textContent = dressroomMode ? '마음껏 입어보기 · 코인 사용 없음' : '입어보기는 무료 · 구매는 DJ코인';
    document.getElementById('dressroom-notice').hidden = !dressroomMode;
    for(const button of document.querySelectorAll('[data-coordi-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.coordiMode === (dressroomMode ? 'dressroom' : 'shop')));
      button.disabled = commerceBusy;
    }
    for(const id of ['coordi-buy', 'coordi-buy-coupon', 'coordi-equip', 'prism-apply', 'prism-restore']) document.getElementById(id).hidden = dressroomMode;
    prismStatus(dressroomMode ? '색상도 자유롭게 미리 볼 수 있어요. 저장과 결제는 하지 않아요.' : '보유 아이템 염색과 원색 복원은 언제나 무료예요.');
    updatePrismApply();
  }
  for(const button of document.querySelectorAll('[data-coordi-mode]')) button.addEventListener('click', () => {
    if(commerceBusy) return;
    dressroomMode = button.dataset.coordiMode === 'dressroom';
    const url = new URL(location.href); url.searchParams.set('mode', dressroomMode ? 'dressroom' : 'shop');
    history.replaceState(null, '', url);
    commerceMessage(dressroomMode ? '무료로 입어보는 중이에요.' : '입어본 코디를 그대로 가져왔어요. 구매 버튼을 눌러야 코인이 사용돼요.');
    updateCommerce();
  });
  function updateCommerce(){
    document.getElementById('coordi-wallet').textContent=commerce ? '보유 '+formatPrice(commerce.balance)+' DJ코인 · '+(commerce.profile.owned||[]).length+'개 보유' : '상점 연결을 확인해 주세요.';
    for(const id of ['coordi-buy','coordi-buy-coupon','coordi-equip'])document.getElementById(id).disabled=dressroomMode||!commerce||commerceBusy;
    document.getElementById('starter-coupons').textContent = commerce ? '남은 구매 쿠폰 '+(commerce.purchaseCoupons ?? 0)+'장 · 아이템 1개당 1장' : '구매 쿠폰 확인 중…';
    updateMode();
    updateSavedOutfitHint();
    draftTools?.update();
  }
  function updateSavedOutfitHint() {
    let hint = document.getElementById('coordi-saved-outfit');
    if(!hint) {
      hint = document.createElement('p'); hint.id = 'coordi-saved-outfit'; hint.setAttribute('role','status');
      document.getElementById('coordi-equip').before(hint);
    }
    if(!commerce) { hint.textContent = ''; return; }
    const saved = commerce.profile.look || {}, equipped = saved.equipped || {};
    const keys = [...new Set([...Object.keys(equipped), ...Object.keys(state.equipped)])];
    const dyeIds = new Set([...Object.values(state.equipped), state.equipped.skin || 'skin-12000']);
    const dyeSignature = value => value ? JSON.stringify(normalizePrism(value)) : '';
    const sameDyes = [...dyeIds].every(id => dyeSignature(state.prisms?.[id]) === dyeSignature(commerce.profile.prisms?.[id]));
    const same = saved.gender === state.gender && keys.every(key => equipped[key] === state.equipped[key]) && sameDyes;
    hint.textContent = dressroomMode ? '입어보기 전용이에요. 마을 코디는 바뀌지 않아요.'
      : !sameDyes ? '입어보기 염색이 저장된 색과 달라요. 염색 창의 무료 적용을 눌러야 저장돼요.'
      : !same ? '지금은 입어보기 중이에요. 구매한 아이템은 아래 ‘내 코디로 장착’을 눌러야 마을에 보여요.'
      : Object.keys(equipped).length ? '마을에 적용된 코디예요. 헤어만 장착해도 보여요.'
      : '마을에 저장한 코디가 없어요. 보유한 헤어를 선택하고 ‘내 코디로 장착’을 눌러 주세요.';
  }
  async function commerceAction(payload){
    if(dressroomMode||!commerce||commerceBusy)return false;
    commerceBusy=true;updateCommerce();
    try{const result=await window.DJ48CoordiBridge.transact({...payload,version:commerce.version});commerce={...commerce,...result};commerceMessage(payload.action === 'equip' ? '마을 코디를 저장했어요.' : payload.action === 'purchase' ? '구매했어요. 마을에 적용하려면 ‘내 코디로 장착’을 눌러 주세요.' : result.couponsUsed ? '쿠폰 '+result.couponsUsed+'장을 사용했어요.' : result.cost ? result.cost+' DJ코인을 사용했어요.' : '저장했어요.');return true;}
    catch(error){commerceMessage(error.message||'처리 결과를 확인하지 못했어요. 같은 동작을 다시 누르면 중복 결제 없이 확인해요.');return false;}
    finally{commerceBusy=false;updateCommerce();render();}
  }
  document.getElementById('coordi-owned-only').addEventListener('change',render);
  async function purchaseSelected(paymentMethod) {
    if(dressroomMode||!commerce||commerceBusy)return;
    const items=[...new Set(Object.values(state.equipped))].filter(id=>!commerce.profile.owned?.includes(id));
    if(!items.length){commerceMessage('선택한 상품은 이미 보유 중이에요.');return;}
    const price=items.reduce((sum,id)=>sum+(commerce.prices?.[id]?.price||0),0);
    if(paymentMethod==='coupon' && items.length>(commerce.purchaseCoupons??0)){commerceMessage('쿠폰이 부족해요. 코인으로 구매하거나 상품 수를 줄여 주세요.');return;}
    const label=paymentMethod==='coupon'?'쿠폰 '+items.length+'장':price+' DJ코인';
    if(!confirm(items.length+'개 상품을 '+label+'으로 구매할까요?'))return;
    await commerceAction({action:'purchase',items,paymentMethod});
  }
  document.getElementById('coordi-buy').addEventListener('click',()=>purchaseSelected('coin'));
  document.getElementById('coordi-buy-coupon').addEventListener('click',()=>purchaseSelected('coupon'));
  document.getElementById('coordi-equip').addEventListener('click',async()=>{await commerceAction({action:'equip',gender:state.gender,equipped:state.equipped});});
  for(const [id,step]of [['coordi-page-prev',-1],['coordi-page-next',1]])document.getElementById(id).addEventListener('click',()=>{itemPage=Math.max(0,itemPage+step);renderItems();elements.grid.scrollTop=0;});
  draftTools=window.DJ48CoordiDraftTools.create({
    read:()=>({gender:state.gender,equipped:state.equipped,prisms:state.prisms||{}}),
    saved:()=>commerce?{gender:commerce.profile.look?.gender||state.gender,equipped:commerce.profile.look?.equipped||{},prisms:commerce.profile.prisms||{}}:null,
    image:()=>!officialCoordiLoading&&!prismDraft&&lastRenderedPayload===JSON.stringify(buildOfficialCoordiPayload())?state.officialLook?.imageUrl:'',
    busy:()=>commerceBusy||!!prismDraft,
    restore:draft=>{prismDraft=null;cancelOfficialCoordiRefresh();state=normalizeState({...state,...draft,genderLocked:true});saveState();render();scheduleOfficialCoordiLook();}
  });
  updateMode();
  commerceMessage('상품 목록과 내 정보를 불러오고 있어요.');
  // Start the independent member lookup alongside the public catalogs. Keep its
  // result local until both finish, so purchases still require a complete view.
  // Handle rejection immediately even when a catalog takes longer to respond.
  const commerceReady = Promise.resolve()
    .then(() => window.DJ48CoordiBridge.status())
    .then(data => { commerceMessage('내 정보 확인 완료 · 상품을 준비하고 있어요.'); return { data }; }, error => ({ error }));
  const catalogsReady = Promise.all([loadCatalog(), loadFeaturedHair(), loadTopCoordiItems(), loadItemEffects()]).then(() => { commerceMessage('상품 목록 준비 완료 · 내 정보를 확인하고 있어요.'); });
  Promise.all([catalogsReady, commerceReady]).then(([, result]) => {
    mergePinnedItemsIntoCatalog();
    mergeTopCoordiItemsIntoCatalog();
    try {
      if(result.error) throw result.error;
      commerce = result.data;
      state.prisms=commerce.profile.prisms||{};state.equipped=commerce.profile.look?.equipped||{};state.gender=commerce.profile.look?.gender||state.gender;state.officialLook=null;draftTools?.reset();saveState();
      commerceMessage('');
    }
    catch(error){commerceMessage(error.message||'상점 연결을 확인해 주세요.');}
    updateCommerce();
    render();
    showGenderDialogIfNeeded();
    if(commerce)scheduleOfficialCoordiLook();
  }).catch(error => {
    commerceMessage(error.message || '상품을 불러오지 못했어요. 상점을 다시 열어 주세요.');
    updateCommerce();
  });
})();
