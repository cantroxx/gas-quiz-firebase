/* Shared status and quest shortcuts. External sites open a first-party window. */
(function () {
  'use strict';
  if (document.getElementById('dj48-player-status-shortcut')) return;
  const source = document.currentScript;
  const origin = source.dataset.statusOrigin || new URL(source.src).origin;
  const host = document.createElement('div');
  host.id = 'dj48-player-status-shortcut';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{position:fixed;right: max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483646;font:14px system-ui;color:#20342b}
    button{font:inherit;cursor:pointer;border:1px solid #b5c9b9;background:#fffdf6;color:#20342b;border-radius:24px;padding:12px 16px;box-shadow:0 3px 14px #0002;min-height:44px}button:focus-visible{outline:3px solid #36805a;outline-offset:3px}
    nav{display:flex;gap:6px;justify-content:flex-end}nav button{padding:10px 13px}
    dialog{padding:0;border:1px solid #b5c9b9;border-radius:20px;width:min(400px,calc(100vw - 24px));height:min(620px,calc(100dvh - 32px));max-height:calc(100dvh - 32px);background:#fffdf6;color:inherit;box-shadow:0 12px 60px #0003}
    dialog::backdrop{background:#14231b55}header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;height:48px;box-sizing:border-box}header button{padding:4px 12px;box-shadow:none}iframe{border:0;width:100%;height:calc(100% - 48px);display:block}
  </style><slot name="town-links"></slot><nav aria-label="내 성장 바로가기"><button type="button" data-view="status" aria-haspopup="dialog" aria-expanded="false">👤 내 상태</button></nav><dialog aria-label="개인 상태"><header><strong>나의 퀴즈타운</strong><button type="button" aria-label="개인 상태 닫기">닫기</button></header></dialog>`;
  const launches = [...root.querySelectorAll('nav button')], dialog = root.querySelector('dialog');
  let activeLaunch=launches[0];
  function close() { dialog.close(); }
  launches.forEach(launch=>launch.addEventListener('click', () => {
    activeLaunch=launch;const url=origin+'/player-status/?view='+launch.dataset.view;
    if (location.origin !== origin) { window.open(url, '_blank', 'noopener'); return; }
    const frame = document.createElement('iframe');
    frame.title = '퀘스트·코인·경험치'; frame.src = url;
    dialog.append(frame); dialog.showModal(); launch.setAttribute('aria-expanded', 'true'); root.querySelector('header button').focus();
  }));
  root.querySelector('header button').addEventListener('click', close);
  dialog.addEventListener('close', () => { dialog.querySelector('iframe')?.remove(); launches.forEach(button=>button.setAttribute('aria-expanded', 'false')); activeLaunch.focus(); });
  dialog.addEventListener('keydown', e => { e.stopPropagation(); });
  let townLinksMounted=false;
  function mount() {
    if(!townLinksMounted){
      const links=document.querySelector('.town-info-shortcuts'),town=document.getElementById('town-view');
      if(links&&town){
        links.slot='town-links';host.append(links);townLinksMounted=true;
        const sync=()=>{links.hidden=town.hidden;};sync();
        new MutationObserver(sync).observe(town,{attributes:true,attributeFilter:['hidden']});
      }
    }
    (document.fullscreenElement || document.body).append(host);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });
  document.addEventListener('fullscreenchange', () => { if (dialog.open) close(); mount(); });
})();
