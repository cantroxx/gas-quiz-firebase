/* Shared decoded images. Versioned URLs can be cached without revalidation. */
(function(){
 'use strict';
 const base='./assets/optimized-v12/',entries=new Map(),skills=['wand','orb','needle','comet','bow','fan','blades','spear','hammer','scythe','shield','book','bow-pose'];
 function entry(file){let e=entries.get(file);if(!e){e={image:new Image(),ready:false,promise:null};e.image.decoding='async';e.image.src=base+file+'.webp';entries.set(file,e);}return e;}
 function image(file){return entry(file).image;}
 function load(file){const e=entry(file);if(e.ready)return Promise.resolve(e.image);if(e.promise)return e.promise;e.promise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>fail(),20000);const clean=()=>{clearTimeout(timer);e.image.onload=null;e.image.onerror=null;};const fail=()=>{clean();entries.delete(file);reject(new Error('image-load:'+file));};const done=async()=>{try{await e.image.decode();clean();e.ready=true;resolve(e.image);}catch{fail();}};e.image.onerror=fail;e.image.onload=done;if(e.image.complete){if(e.image.naturalWidth)done();else fail();}});return e.promise;}
 function combatFiles(s){const look=FWContent.looks.find(l=>l.id===s.look)||FWContent.looks[0],index=FWContent.weapons.findIndex(w=>w.id===s.weapon);return [look.sheet,index>=6?'weapons-v4':'weapons-v2',['ruins','desert','castle','void'][FWTowerDomain.roomSpec(s).biome]+'-v1',s.monsterStyle==='battle'?'battle-monsters-v13':'monsters-v6',...skills.map(k=>'skill-'+k)];}
 function prepareCombat(s,progress=()=>{}){const files=combatFiles(s);let done=0;return Promise.all(files.map(f=>load(f).then(()=>progress(++done,files.length))));}
 window.FWAssets={image,load,prepareCombat,combatFiles,ready:s=>combatFiles(s).every(f=>entries.get(f)?.ready)};
})();
