'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Coin=require('../../functions/classroom/securities/coin'),D=require('../../functions/classroom/securities/domain');
const base=()=>({side:'deposit',amount:1,account:D.openAccount('coin'),wallet:{djCoin:1000},limit:{},treasury:{},market:{mode:'coin',lifecycle:'enabled'},netAssetsMinor:0});
test('coin boundaries, immutable practice currency, integer withdrawal remainder and supply circuit',()=>{
 for(const override of [{market:{mode:'practice'}},{limit:{depositsMinor:10000}},{account:{...D.openAccount('coin'),depositsMinor:30000}},{netAssetsMinor:50000},{treasury:{riskHalted:true}},{treasury:{withdrawalsMinor:100000,depositsMinor:0}}])assert.throws(()=>Coin.transfer({...base(),...override}));
 assert.equal(Coin.transfer({...base(),account:{...D.openAccount('coin'),depositsMinor:29900},netAssetsMinor:49900}).account.cashMinor,100);
 const exit={...base(),side:'withdraw',amount:12,account:{...D.openAccount('coin'),cashMinor:1234},market:{mode:'coin',lifecycle:'disabled'},treasury:{riskHalted:true}};
 assert.equal(Coin.transfer(exit).account.cashMinor,34);assert.throws(()=>Coin.transfer({...exit,amount:13}));
 for(const wallet of [{djCoin:-1},{djCoin:1.5},{djCoin:'20'},{djCoin:Infinity}])assert.throws(()=>Coin.balance(wallet));
 assert.equal(Coin.balance({djCoin:0,coin:100}),0);assert.equal(Coin.balance({coin:100}),100);
});
