(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let toastTimer,audio;
  function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',3500);}
  function save(){if(!FWStore.save())toast(FWStore.warning());}
  function modal(html,onReady){const d=$('modal');if(d.open)d.close();$('modal-content').innerHTML=currency(html);d.showModal();onReady?.($('modal-content'));}
  const coin='<img class="crystal-coin" src="./assets/crystal-coin.svg" alt="결정" width="26" height="26">';
  const currency=html=>html.replaceAll('◇',coin);
  function close(){ $('modal').close(); }
  function fraction(n,d){const p=FWMath.parts(n,d);return `<span class="fraction" aria-label="${FWMath.plain(n,d)}">${p.whole||!p.num?`<span>${p.whole}</span>`:''}${p.num?`<span class="parts"><span class="num">${p.num}</span><span class="den">${d}</span></span>`:''}</span>`;}
  function meter(name,value,max=100,color=''){return `<div class="meter-label"><span>${name}</span><span>${Math.round(value)}${max!==100?' / '+max:''}</span></div><div class="meter ${color}"><i style="width:${Math.min(100,Math.max(0,value/max*100))}%"></i></div>`;}
  function art(){return '<div class="painted-cover"><img class="world-art" src="./assets/optimized-v12/tower-cover-v1.webp" alt="달빛 아래 균열의 탑과 모험가" decoding="async"></div>';}

  document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement&&e.target.src.includes('/assets/')){e.target.hidden=true;e.target.parentElement.classList.add('art-fallback');}},true);
  function sound(kind){window.FWMusic?.duck(kind==='warn'?.5:.2);if(!FWStore.get().settings.sound||FWStore.get().settings.effectsVolume===0)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(kind==='parry'?1046:kind==='warn'?740:kind==='good'?660:kind==='hit'?140:440,audio.currentTime);o.frequency.exponentialRampToValueAtTime(kind==='parry'?1568:kind==='warn'?980:kind==='good'?990:80,audio.currentTime+.12);g.gain.setValueAtTime(Math.max(.0001,.055*(FWStore.get().settings.effectsVolume??65)/100),audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.17);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.18);}catch(e){/* Audio is optional. */}}
  window.FWUI={$,esc,toast,save,modal,close,coin,currency,fraction,meter,art,sound,render:html=>{document.body.classList.toggle('combat-view',html.includes('id="combat-stage"'));document.body.classList.toggle('map-view',html.includes('class="expedition-layout"'));$('app').innerHTML=currency(html);window.FWMusic?.refresh();window.FWGuide?.decorate();window.scrollTo(0,0);}};
})();
