#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const D=require('../../functions/classroom/securities/domain'),Coin=require('../../functions/classroom/securities/coin');
const students=22,results=[];
// Stress model, not a forecast: each synthetic student has enough starting coins,
// deposits 100 on days 1..3, buys one company up to 49% and sells at the horizon.
for(const days of [20,60,120])for(const [scenario,bps]of [['하락',-100],['횡보',0],['상승',100],['상한 스트레스',500]]){
 let price=1000,treasury={depositsMinor:0,withdrawalsMinor:0,riskHalted:false},fees=0;
 const rows=Array.from({length:students},()=>({a:D.openAccount('coin'),wallet:1000}));
 for(let day=1;day<=days;day++){
  const market={mode:'coin',lifecycle:'enabled',session:'open',priceVersion:String(day),prices:{sprout_food:price},feeBps:50,limits:{dailyTrades:3,maxOrderQuantity:100,maxWeightBps:5000}};
  for(const row of rows){row.a.tradesToday=0;
   if(day<=3){const m=Coin.transfer({side:'deposit',amount:100,account:row.a,wallet:{djCoin:row.wallet},limit:{},treasury,market,netAssetsMinor:D.summary(row.a,market.prices).netAssetsMinor});row.a=m.account;row.wallet=m.walletAfter;treasury={...treasury,...m.totals};}
   if(day===3){const quantity=D.maximumBuy(row.a,market,'sprout_food');if(quantity){const t=D.trade(row.a,market,{side:'buy',companyId:'sprout_food',quantity,expectedPriceVersion:String(day),reason:'여러기업의실적과위험을검토했어요'});row.a=t.account;fees+=t.result.feeMinor;}}
   if(day===days){const quantity=row.a.positions.sprout_food?.quantity;if(quantity){const t=D.trade(row.a,market,{side:'sell',companyId:'sprout_food',quantity,expectedPriceVersion:String(day)});row.a=t.account;fees+=t.result.feeMinor;}const m=Coin.transfer({side:'withdraw',amount:Math.floor(row.a.cashMinor/100),account:row.a,wallet:{djCoin:row.wallet},limit:{},treasury,market,netAssetsMinor:row.a.cashMinor});row.a=m.account;row.wallet=m.walletAfter;treasury={...treasury,...m.totals};}
  }
  price=Math.max(100,Math.min(100000,Math.floor((price*(10000+bps)+5000)/10000)));
 }
 const netWalletCoin=rows.reduce((sum,r)=>sum+r.wallet-1000,0),cashRemainderMinor=rows.reduce((s,r)=>s+r.a.cashMinor,0);
 assert.equal(netWalletCoin*100,treasury.withdrawalsMinor-treasury.depositsMinor);
 results.push({days,scenario,dailyChangeBps:bps,students,totalDepositCoin:treasury.depositsMinor/100,totalWithdrawalCoin:treasury.withdrawalsMinor/100,netWalletCoin,feesCoin:fees/100,cashRemainderCoin:cashRemainderMinor/100,riskHalted:treasury.riskHalted});
}
const output={assumptions:'22 synthetic students, 1000 initial coins each; deposit 100/day for 3 days; one company <=50%; no subsequent buys; full liquidation at horizon; deterministic daily +/-1%, 0%, or +5%; starting price 10; price range 1..1000. Not a forecast. Existing positions may exceed the 1000 class budget upon sale/withdrawal.',results};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(output,null,2));console.table(results.map(({days,scenario,netWalletCoin,feesCoin,riskHalted})=>({days,scenario,netWalletCoin,feesCoin,riskHalted})));
