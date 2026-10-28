(function(root) {
  'use strict';
  let activeDialog = null;
  let previewScript = null;

  // Display-only crop of transparent padding: keeps every visible item and never writes Storage.
  function setAvatarImageSource(image, url, onError = () => {}) {
    let originalFallback = false;
    const trim = () => {
      const width = image.naturalWidth, height = image.naturalHeight;
      if(!width || !height || width * height > 1024 * 1024) return;
      try {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, width, height).data;
        let left = width, top = height, right = -1, bottom = -1;
        for(let y = 0; y < height; y++) for(let x = 0; x < width; x++) if(pixels[(y * width + x) * 4 + 3] > 0) {
          left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        if(right < left || (left === 0 && top === 0 && right === width - 1 && bottom === height - 1)) return;
        const w = right - left + 1, h = bottom - top + 1, padding = Math.max(4, Math.ceil(Math.max(w, h) * .08));
        const output = document.createElement('canvas'); output.width = w + padding * 2; output.height = h + padding * 2;
        output.getContext('2d').drawImage(canvas, left, top, w, h, padding, padding, w, h);
        image.removeEventListener('load', trim);
        image.src = output.toDataURL('image/png');
      } catch(_) { /* CORS/decoding limitations retain the complete original image. */ }
    };
    image.crossOrigin = 'anonymous';
    image.addEventListener('load', trim, { once: true });
    image.addEventListener('error', () => {
      if(!originalFallback) { originalFallback = true; image.removeAttribute('crossorigin'); image.src = url; }
      else onError();
    });
    image.src = url;
  }

  function loadPreviewRenderer() {
    if(root.DJ48CoordiPreviewRenderer) return Promise.resolve(root.DJ48CoordiPreviewRenderer);
    if(!previewScript) previewScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/coordi-shop/preview-renderer.js?v=20261028';
      script.onload = () => resolve(root.DJ48CoordiPreviewRenderer);
      script.onerror = () => { script.remove(); previewScript = null; reject(Error('아바타 도구를 불러오지 못했어요. 다시 시도해 주세요.')); };
      document.head.append(script);
    });
    return previewScript;
  }

  async function open(deps = {}) {
    if(activeDialog) return;
    const memberUserId = deps.getMemberUserId?.();
    const uid = deps.getAuthUid?.();
    if(!memberUserId || !uid) return;
    const opener = document.activeElement;
    const dialog = document.createElement('dialog');
    activeDialog = dialog;
    dialog.className = 'classroom-portrait-dialog';
    dialog.setAttribute('aria-labelledby', 'classroom-portrait-title');
    dialog.innerHTML = `<form method="dialog" class="classroom-portrait-heading"><div><p>나를 보여주는 이미지</p><h2 id="classroom-portrait-title">교실 이미지 설정</h2></div><button aria-label="닫기" value="cancel">×</button></form>
      <p class="classroom-portrait-description">학생 카드와 일기·댓글에 보여줄 이미지를 골라 주세요. 두 이미지는 보관되어 언제든 바꿀 수 있어요.</p>
      <fieldset class="classroom-portrait-options"><legend>이미지 종류</legend>
        <label><input type="radio" name="classroom-portrait-source" value="photo" checked><span class="classroom-portrait-preview" data-preview="photo"><span>내 이미지</span></span><strong>내 설정 이미지</strong></label>
        <label><input type="radio" name="classroom-portrait-source" value="avatar"><span class="classroom-portrait-preview is-avatar" data-preview="avatar"><span>내 아바타</span></span><strong>상점 코디 아바타</strong></label>
      </fieldset>
      <div class="classroom-portrait-tools" data-tools="photo"><label class="classroom-portrait-upload">사진 올리기<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="사진 올리기"></label><p>JPG · PNG · WebP, 2MB 이하<br>사진 중앙을 정사각형으로 보여줘요.</p></div>
      <div class="classroom-portrait-tools" data-tools="avatar" hidden><button type="button" data-avatar-load>저장한 코디 불러오기</button><p>상점에서 구매한 아이템으로 저장한 코디와 염색을 가져와요.<br>코디를 바꿨다면 다시 불러와 주세요.</p></div>
      <p class="classroom-portrait-status" role="status" aria-live="polite"></p>
      <footer><span>교실에만 적용돼요.</span><button type="button" data-portrait-save disabled>이 이미지로 저장</button></footer>`;
    document.body.append(dialog);
    dialog.showModal();
    const status = dialog.querySelector('[role="status"]');
    const save = dialog.querySelector('[data-portrait-save]');
    const avatarLoad = dialog.querySelector('[data-avatar-load]');
    const input = dialog.querySelector('input[type="file"]');
    const radios = [...dialog.querySelectorAll('input[type="radio"]')];
    let state = null, source = 'photo', busy = false, saving = false, saved = false;
    const drafts = { photo: null, avatar: null };
    const uploadedPaths = { photo: '', avatar: '' };
    const urls = { photo: '', avatar: '' };
    const localUrls = new Set();
    const current = () => activeDialog === dialog && deps.getMemberUserId?.() === memberUserId && deps.getAuthUid?.() === uid;
    const assertCurrent = () => { if(!current()) throw Error('로그인 계정이 바뀌었어요. 창을 닫고 다시 열어 주세요.'); };
    const call = async data => {
      assertCurrent();
      const result = await deps.getFunctions().httpsCallable('classroomPortraitAction')({ classId: deps.classId, memberUserId, ...data });
      assertCurrent();
      return result.data;
    };
    function update() {
      for(const radio of radios) { radio.checked = radio.value === source; radio.disabled = busy || !state; }
      dialog.querySelector('[data-tools="photo"]').hidden = source !== 'photo';
      dialog.querySelector('[data-tools="avatar"]').hidden = source !== 'avatar';
      input.disabled = busy || !state;
      avatarLoad.disabled = busy || !state?.savedLook;
      save.disabled = busy || !state || !urls[source];
      save.textContent = busy ? '처리 중…' : '이 이미지로 저장';
      for(const kind of ['photo', 'avatar']) {
        const preview = dialog.querySelector(`[data-preview="${kind}"]`);
        preview.replaceChildren();
        if(urls[kind]) {
          const image = document.createElement('img');
          if(kind === 'avatar') setAvatarImageSource(image, urls[kind]); else image.src = urls[kind];
          image.alt = kind === 'photo' ? '사진 미리보기' : '마켓 아바타 미리보기';
          if(kind === 'photo' && !drafts.photo) {
            const scale = Math.max(.7, Math.min(2.2, Number(state?.photoCrop?.scale) || 1));
            const x = Math.max(-45, Math.min(45, Number(state?.photoCrop?.x) || 0));
            const y = Math.max(-45, Math.min(45, Number(state?.photoCrop?.y) || 0));
            image.style.transform = `translate(${x}%, ${y}%) scale(${scale})`;
          }
          preview.append(image);
        } else preview.textContent = kind === 'photo' ? '사진을 올려 주세요' : '저장한 코디';
      }
    }
    function errorMessage(error) {
      const code = String(error?.code || '');
      if(code.includes('not-found') || code.includes('unavailable') || code.includes('internal')) return '이미지 설정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
      return error?.message || '이미지를 저장하지 못했어요. 다시 시도해 주세요.';
    }
    dialog.addEventListener('cancel', event => { if(saving) event.preventDefault(); });
    dialog.querySelector('form').addEventListener('submit', event => { if(saving) event.preventDefault(); });
    dialog.addEventListener('close', () => {
      for(const url of localUrls) URL.revokeObjectURL(url);
      dialog.remove(); activeDialog = null;
      if(opener?.isConnected) opener.focus();
      if(saved) Promise.resolve(deps.onSaved?.()).catch(() => {});
    });
    radios.forEach(radio => radio.addEventListener('change', () => {
      source = radio.value;
      status.textContent = source === 'avatar' && !state.savedLook ? '마켓에서 코디를 먼저 저장해 주세요.' : '';
      update();
    }));
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.value = '';
      if(!file) return;
      if(!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) {
        status.textContent = '2MB 이하의 JPG, PNG, WebP 이미지를 선택해 주세요.'; return;
      }
      const url = URL.createObjectURL(file); localUrls.add(url);
      busy = true; update();
      try {
        const image = new Image(); image.src = url; await image.decode(); assertCurrent();
        drafts.photo = file; uploadedPaths.photo = ''; urls.photo = url; status.textContent = '사진을 확인하고 저장해 주세요.';
      } catch(error) { status.textContent = '사진을 읽지 못했어요. 다른 파일을 선택해 주세요.'; }
      finally { busy = false; update(); }
    });
    avatarLoad.addEventListener('click', async () => {
      busy = true; status.textContent = '저장한 코디를 불러오는 중이에요…'; update();
      try {
        state = await call({ action: 'status' });
        if(!state.savedLook) throw Error('마켓에서 코디를 먼저 저장해 주세요.');
        const preview = await loadPreviewRenderer(); assertCurrent();
        const render = preview.createRenderer({
          assertCurrent,
          render: async look => (await deps.getFunctions().httpsCallable('renderCoordiShopPreview')({ look })).data
        });
        const result = await render(state.savedLook); assertCurrent();
        if(!result?.success || !result.imageUrl?.startsWith('data:image/png;base64,')) throw Error('코디 이미지를 불러오지 못했어요. 다시 시도해 주세요.');
        const response = await fetch(result.imageUrl); const blob = await response.blob();
        assertCurrent();
        drafts.avatar = blob; uploadedPaths.avatar = ''; urls.avatar = result.imageUrl;
        status.textContent = '저장한 코디를 가져왔어요. 확인하고 저장해 주세요.';
      } catch(error) { status.textContent = errorMessage(error); }
      finally { busy = false; update(); }
    });
    save.addEventListener('click', async () => {
      if(busy || !urls[source]) return;
      busy = true; saving = true; status.textContent = '교실 이미지를 저장하고 있어요…'; update();
      try {
        assertCurrent();
        let storagePath = uploadedPaths[source];
        if(drafts[source] && !storagePath) {
          const file = drafts[source];
          const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png';
          storagePath = `profileImages/${uid}/${memberUserId}_classroom_${source}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;
          const ref = deps.getStorage().ref(storagePath);
          await ref.put(file, { contentType: file.type, customMetadata: { memberUserId, source: `classroom-${source}` } });
          // Creates the download token used by the server; the client never supplies a trusted URL.
          await ref.getDownloadURL(); assertCurrent(); uploadedPaths[source] = storagePath;
        }
        await call({ action: 'save', source, ...(storagePath ? { storagePath } : {}) });
        saved = true; dialog.close();
      } catch(error) { status.textContent = errorMessage(error); }
      finally { busy = false; saving = false; if(dialog.isConnected) update(); }
    });
    async function load() {
      busy = true; status.textContent = '내 이미지를 불러오는 중이에요…'; update();
      try {
        state = await call({ action: 'status' }); source = state.portraitSource || 'photo';
        urls.photo = state.photoUrl || ''; urls.avatar = state.avatarUrl || '';
        status.textContent = '';
      } catch(error) {
        status.textContent = errorMessage(error);
        const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '다시 시도';
        retry.addEventListener('click', load, { once: true }); status.append(' ', retry);
      } finally { busy = false; update(); }
    }
    await load();
  }
  root.DJ48ClassroomPortrait = { open, setAvatarImageSource };
})(window);
