/* Shared status and quest shortcuts. External sites open a first-party window. */
(function () {
  'use strict';
  // Game hideout pages keep their own HUD; the town status belongs to town places.
  if(/^\/(?:mathsurvivor|cloud-tower|word-bomb|town-marble|fraction-world|fruit-bell|sumbit|battle)(?:\/|$)/.test(location.pathname) || ['dj48-fraction-world.vercel.app','kbo-owner.vercel.app','dj48-samgukji.web.app'].includes(location.hostname)) return;
  if (document.getElementById('dj48-player-status-shortcut')) return;
  const source = document.currentScript;
  const origin = source.dataset.statusOrigin || new URL(source.src).origin;
  const host = document.createElement('div');
  host.id = 'dj48-player-status-shortcut';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{position:fixed;right: max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483646;font:14px system-ui;color:#20342b}
    :host([data-shell]){position:static;display:flex;justify-content:flex-end;margin:0 0 10px}
    :host([hidden]){display:none}
    button{font:inherit;cursor:pointer;border:1px solid #b5c9b9;background:#fffdf6;color:#20342b;border-radius:24px;padding:12px 16px;box-shadow:0 3px 14px #0002;min-height:44px}button:focus-visible{outline:3px solid #36805a;outline-offset:3px}
    nav{display:flex;gap:6px;justify-content:flex-end}nav button{padding:10px 13px}
    dialog{padding:0;border:3px solid #baa16e;border-radius:24px;width:min(440px,calc(100vw - 24px));height:min(620px,calc(100dvh - 32px));max-height:calc(100dvh - 32px);background:#fffdf6;color:inherit;box-shadow:0 12px 60px #0003}
    dialog::backdrop{background:#14231b55}header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;height:48px;box-sizing:border-box}header button{padding:4px 12px;box-shadow:none}iframe{border:0;width:100%;height:calc(100% - 48px);display:block}
    :host([data-town]){position:static;margin:0;display:block}
    .town-status-art{display:none}
    :host([data-town]) nav button{width:56px;height:56px;padding:3px;border:2px solid #b99c66;background:#fff9e8e8;border-radius:50%;box-shadow:0 3px 8px #49391830}
    :host([data-town]) .town-status-art{display:block;width:100%;height:100%;object-fit:contain}
    :host([data-town]) .status-label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
    dialog[open]{display:flex;flex-direction:column}header{flex-shrink:0}iframe{flex:1;min-height:0}
    .avatar-note{padding:8px 14px;margin:0;border-top:1px solid #ddd4b9;background:#f7f0de;font-size:12px;line-height:1.5}
    .avatar-note[hidden]{display:none}.avatar-note button{font-size:12px;min-height:32px;padding:4px 8px;margin-top:4px;box-shadow:none}
    @media(max-width:560px){:host([data-town]) nav button{width:46px;height:46px}}
  </style><slot name="town-links"></slot><nav aria-label="내 성장 바로가기"><button type="button" data-view="status" aria-haspopup="dialog" aria-expanded="false" aria-label="내 상태" title="내 상태"><img class="town-status-art" src="${origin}/images/town-controls-20261018/status.webp" alt=""><span class="status-label">👤 내 상태</span></button></nav><dialog aria-label="개인 상태"><header><strong>내 상태</strong><button type="button" aria-label="개인 상태 닫기">닫기</button></header><div class="avatar-note" hidden><p></p><button type="button"></button></div></dialog>`;
  const launches = [...root.querySelectorAll('nav button')], dialog = root.querySelector('dialog');
  let activeLaunch=launches[0];
  const note=root.querySelector('.avatar-note');
  function avatarNote() {
    const state=window.DJ48TownAvatar?.getState?.();
    note.hidden=!state || !['empty','error','loading'].includes(state.status);
    note.querySelector('p').textContent=state?.message || '';
    const button=note.querySelector('button');button.hidden=state?.status==='loading';
    button.textContent=state?.status==='empty'?'코디 상점 열기':'아바타 다시 불러오기';
    button.onclick=()=>{
      if(state?.status==='empty') { close();document.querySelector('#town-view [data-place="shop"]')?.click(); }
      else window.DJ48TownAvatar?.refresh(true);
    };
  }
  window.addEventListener('dj48-avatar-state',avatarNote);
  function close() { dialog.close(); }
  launches.forEach(launch=>launch.addEventListener('click', () => {
    avatarNote();activeLaunch=launch;const url=origin+'/player-status/index.html?v=jewels-20261018&view='+launch.dataset.view;
    if (location.origin !== origin) { window.open(url, '_blank', 'noopener'); return; }
    const frame = document.createElement('iframe');
    frame.title = '퀘스트·코인·경험치'; frame.src = url;
    dialog.append(frame); dialog.showModal(); launch.setAttribute('aria-expanded', 'true'); root.querySelector('header button').focus();
  }));
  root.querySelector('header button').addEventListener('click', close);
  dialog.addEventListener('close', () => { dialog.querySelector('iframe')?.remove(); launches.forEach(button=>button.setAttribute('aria-expanded', 'false')); activeLaunch.focus(); });
  dialog.addEventListener('keydown', e => { e.stopPropagation(); });
  const shell = document.getElementById('town-view') ? document.querySelector('main.shell') : null;
  const login = document.getElementById('login-view');
  function syncVisibility() { host.hidden=Boolean(shell && login && !login.hidden && !document.fullscreenElement); }
  if(shell && login) new MutationObserver(syncVisibility).observe(login,{attributes:true,attributeFilter:['hidden']});
  function mount() {
    // Town information stays in the town layout, clear of the floating status button.
    const view=document.querySelector('.app-view:not([hidden])');
    const slot=view?.querySelector('#town-status-slot,.place-status-slot');
    if(shell && slot && !document.fullscreenElement) {host.dataset.shell='';host.dataset.town='';if(host.parentNode!==slot){if(dialog.open)close();slot.append(host);}}
    else if(shell && !document.fullscreenElement) { delete host.dataset.town;host.dataset.shell='';shell.prepend(host); }
    else { delete host.dataset.town;delete host.dataset.shell;(document.fullscreenElement || document.body).append(host); }
    syncVisibility();
  }
  document.querySelectorAll('.app-view').forEach(view=>new MutationObserver(mount).observe(view,{attributes:true,attributeFilter:['hidden']}));
  window.addEventListener('dj48-town-controls-ready',mount);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });
  document.addEventListener('fullscreenchange', () => { if (dialog.open) close(); mount(); });
})();
