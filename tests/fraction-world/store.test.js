'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../../public/fraction-world/content.js'),S=require('../../public/fraction-world/studio-domain.js'),T=require('../../public/fraction-world/tower-domain.js');
const source=fs.readFileSync(require.resolve('../../public/fraction-world/store.js'),'utf8');
function boot(raw,blocked=false){let storage=raw;const context={window:{},FWContent:C,localStorage:{getItem:()=>storage,setItem:(_k,v)=>{if(blocked)throw new Error('quota');storage=v;}}};vm.runInNewContext(source,context);return {store:context.window.FWStore,getRaw:()=>storage};}
let a=boot(null);a.store.get().tower=T.create('wand');a.store.get().studio=S.create(['lumi','rio','sora']);a.store.get().stats[0]={attempts:3,first:2,solved:3};a.store.save();
let b=boot(a.getRaw());assert.equal(b.store.get().tower.weapon,'wand');assert.equal(b.store.get().studio.day,1);assert.equal(b.store.get().total,3);b.store.switchSlot(1);assert.equal(b.store.get().tower,null);b.store.switchSlot(0);assert.equal(b.store.get().tower.weapon,'wand');
const parsed=JSON.parse(a.getRaw());parsed.slots[0].studio.phase='event';parsed.slots[0].studio.event=999;parsed.slots[0].settings=null;parsed.slots[0].quiz={mode:'garbage'};parsed.slots[1]=null;
b=boot(JSON.stringify(parsed));assert.equal(b.store.get().studio,null);assert.equal(b.store.get().tower.weapon,'wand');assert.equal(b.store.get().settings.level,'all');assert.equal(b.store.get().quiz,null);assert.ok(b.store.warning());
b=boot('{bad json');assert.ok(b.store.warning());assert.equal(b.getRaw(),'{bad json');
b=boot(null,true);b.store.get().total=9;assert.equal(b.store.save(),false);assert.ok(b.store.warning());assert.equal(b.store.get().total,9);
console.log('Fraction World storage: run restore, slot isolation, partial corruption recovery, malformed JSON preservation, quota failure passed.');
