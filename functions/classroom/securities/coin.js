'use strict';
const C = require('./contracts');
const POLICY = Object.freeze({dailyDepositMinor:10000,netDepositMinor:30000,netAssetsMinor:50000,netOutflowBudgetMinor:100000});
function balance(wallet = {}) {
 // Match existing precedence exactly, including an explicit djCoin: 0.
 return C.integer(wallet.djCoin ?? wallet.coin ?? 0, 0, Number.MAX_SAFE_INTEGER);
}
function blocked(treasury) {
 return treasury.riskHalted === true || (treasury.withdrawalsMinor || 0) - (treasury.depositsMinor || 0) >= POLICY.netOutflowBudgetMinor;
}
function transfer({side,amount,account,wallet,limit,treasury,market,netAssetsMinor}) {
 if(market.mode !== 'coin') C.fail('failed-precondition','연습머니는 DJ코인으로 바꿀 수 없어요.');
 if(!account || account.status !== 'active') C.fail('failed-precondition','사용할 수 있는 증권 계좌가 필요해요.');
 C.integer(amount,1,1000000);
 const amountMinor = amount * 100, beforeWallet = balance(wallet), deposit = side === 'deposit';
 if(!deposit && side !== 'withdraw') C.fail('invalid-argument','입금 또는 출금을 선택해 주세요.');
 if(deposit) {
  if(market.lifecycle !== 'enabled' || blocked(treasury)) C.fail('failed-precondition','신규 입금·매수가 중지됐어요. 매도·출금은 계속 이용할 수 있어요.');
  if(beforeWallet < amount) C.fail('failed-precondition','DJ코인이 부족해요.');
  if((limit.depositsMinor || 0) + amountMinor > POLICY.dailyDepositMinor) C.fail('failed-precondition','하루 입금은 총 100코인까지예요.');
  if(Math.max(0,account.depositsMinor + amountMinor - account.withdrawalsMinor) > POLICY.netDepositMinor) C.fail('failed-precondition','누적 순입금은 300코인까지예요.');
  if(netAssetsMinor + amountMinor > POLICY.netAssetsMinor) C.fail('failed-precondition','순자산은 500코인까지 입금할 수 있어요.');
 } else if(account.cashMinor < amountMinor) C.fail('failed-precondition','출금할 수 있는 정수 예수금이 부족해요.');
 const cashDelta = deposit ? amountMinor : -amountMinor, walletAfter = C.integer(beforeWallet - cashDelta/100,0,Number.MAX_SAFE_INTEGER);
 const next = {...account,cashMinor:C.integer(account.cashMinor+cashDelta,0,Number.MAX_SAFE_INTEGER),depositsMinor:account.depositsMinor+(deposit?amountMinor:0),withdrawalsMinor:account.withdrawalsMinor+(deposit?0:amountMinor),revision:account.revision+1};
 C.integer(next.depositsMinor,0,Number.MAX_SAFE_INTEGER);C.integer(next.withdrawalsMinor,0,Number.MAX_SAFE_INTEGER);
 const totals = {depositsMinor:(treasury.depositsMinor||0)+(deposit?amountMinor:0),withdrawalsMinor:(treasury.withdrawalsMinor||0)+(deposit?0:amountMinor)};
 return {account:next,walletBefore:beforeWallet,walletAfter,cashDelta,amountMinor,totals:{...totals,riskHalted:blocked({...treasury,...totals})}};
}
module.exports={POLICY,balance,blocked,transfer};
