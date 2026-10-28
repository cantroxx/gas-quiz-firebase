/* Server-authoritative practice arithmetic. Default parity with frontend is tested. */
(function(root) {
  'use strict';
  class SecuritiesError extends Error {
    constructor(code, message) { super(message); this.code = code; this.retryable = false; }
  }
  function fail(code, message) { throw new SecuritiesError(code, message); }
  function integer(value, minimum = 0) {
    if(!Number.isSafeInteger(value) || value < minimum) fail('invalid-number', '올바른 정수 금액과 수량을 입력해 주세요.');
    return value;
  }
  function add(a, b) { return integer(integer(a) + integer(b)); }
  function multiply(a, b) { return integer(integer(a) * integer(b)); }
  function fee(amount, bps = 50) { return Math.floor(add(multiply(amount, bps), 5000) / 10000); }
  function summary(account, prices) {
    let valueMinor = 0, costBasisMinor = 0;
    for(const [id, position] of Object.entries(account.positions)) {
      valueMinor = add(valueMinor, multiply(integer(prices[id], 1), position.quantity));
      costBasisMinor = add(costBasisMinor, position.costBasisMinor);
    }
    const netAssetsMinor = add(account.cashMinor, valueMinor);
    const pnlMinor = add(netAssetsMinor, account.withdrawalsMinor) - add(account.depositsMinor, account.initialGrantMinor);
    if(!Number.isSafeInteger(pnlMinor)) fail('invalid-number', '금액 범위를 확인해 주세요.');
    return { valueMinor, costBasisMinor, netAssetsMinor, pnlMinor, unrealizedPnlMinor: valueMinor - costBasisMinor };
  }
  function openAccount(mode = 'practice') {
    return { cashMinor: mode === 'coin' ? 0 : 100000, initialGrantMinor: mode === 'coin' ? 0 : 100000, depositsMinor: 0, withdrawalsMinor: 0,
      feesMinor: 0, realizedPnlMinor: 0, positions: {}, tradesToday: 0, status: 'active', revision: 0 };
  }
  function quote(account, market, order) {
    if(!account) fail('no-account', '먼저 연습 계좌를 시작해 주세요.');
    if(account.status !== 'active') fail('frozen', '계좌 상태를 선생님께 확인해 주세요.');
    if((market.lifecycle !== 'enabled' && !(market.mode === 'coin' && order.side === 'sell')) || market.session !== 'open') fail('market-closed', '지금은 거래할 수 없어요. 시장 상태를 확인해 주세요.');
    if(order.expectedPriceVersion !== market.priceVersion) fail('price-changed', '시세가 바뀌었어요. 가격을 다시 확인해 주세요.');
    if(!['buy', 'sell'].includes(order.side)) fail('invalid-side', '매수 또는 매도를 선택해 주세요.');
    const quantity = integer(order.quantity, 1);
    if(quantity > (market.limits?.maxOrderQuantity ?? 100)) fail('quantity-limit', `한 번에 ${market.limits?.maxOrderQuantity ?? 100}주까지 주문할 수 있어요.`);
    if(account.tradesToday >= (market.limits?.dailyTrades ?? 3)) fail('daily-limit', `오늘의 거래 ${market.limits?.dailyTrades ?? 3}회를 모두 사용했어요.`);
    const priceMinor = integer(market.prices[order.companyId], 1);
    const position = account.positions[order.companyId] || { quantity: 0, costBasisMinor: 0 };
    const grossMinor = multiply(priceMinor, quantity), feeMinor = fee(grossMinor, market.feeBps);
    let cashMinor, costBasisMinor, nextQuantity, realizedPnlMinor = 0;
    if(order.side === 'buy') {
      if(market.riskHalted) fail('risk-halted', '학급 순유출 기준에 도달하여 신규 매수가 중지됐어요. 매도·출금은 가능해요.');
      const reason = typeof order.reason === 'string' ? order.reason.trim() : '';
      const length = Array.from(reason.replace(/\s/g, '')).length;
      if(length < 10 || length > 200) fail('reason-required', '매수 이유를 공백 제외 10~200자로 적어 주세요.');
      const total = add(grossMinor, feeMinor);
      if(total > account.cashMinor) fail('insufficient-cash', '예수금이 부족해요. 수량을 줄여 주세요.');
      cashMinor = account.cashMinor - total;
      nextQuantity = add(position.quantity, quantity);
      costBasisMinor = add(position.costBasisMinor, total);
      const net = summary(account, market.prices).netAssetsMinor - feeMinor;
      if(net <= 0 || multiply(multiply(nextQuantity, priceMinor), 10000) > multiply(net, market.limits?.maxWeightBps ?? 5000)) fail('weight-limit', `한 기업은 거래 후 전체 자산의 ${(market.limits?.maxWeightBps ?? 5000)/100}%까지만 살 수 있어요.`);
      if(market.mode === 'coin' && net > 50000) fail('asset-limit', '실제 재화 시장의 순자산 한도를 넘었어요.');
    } else {
      if(quantity > position.quantity) fail('insufficient-shares', '보유한 주식 수보다 많이 팔 수 없어요.');
      const allocated = quantity === position.quantity ? position.costBasisMinor : Math.floor(multiply(position.costBasisMinor, quantity) / position.quantity);
      cashMinor = add(account.cashMinor, grossMinor - feeMinor);
      nextQuantity = position.quantity - quantity;
      costBasisMinor = position.costBasisMinor - allocated;
      realizedPnlMinor = grossMinor - feeMinor - allocated;
    }
    return { priceMinor, grossMinor, feeMinor, taxMinor: 0, cashMinor, quantity: nextQuantity, costBasisMinor, realizedPnlMinor };
  }
  function maximumBuy(account, market, companyId) {
    let max = 0;
    for(let quantity = 1; quantity <= 100; quantity++) {
      try { quote(account, market, { companyId, quantity, side: 'buy', expectedPriceVersion: market.priceVersion, reason: '기업과뉴스를읽고신중하게선택했어요' }); max = quantity; }
      catch { break; }
    }
    return max;
  }
  function trade(account, market, order) {
    const result = quote(account, market, order);
    const next = { ...account, positions: { ...account.positions }, cashMinor: result.cashMinor,
      feesMinor: add(account.feesMinor, result.feeMinor), realizedPnlMinor: integer(account.realizedPnlMinor + result.realizedPnlMinor, Number.MIN_SAFE_INTEGER),
      tradesToday: account.tradesToday + 1, revision: account.revision + 1 };
    if(result.quantity) next.positions[order.companyId] = { quantity: result.quantity, costBasisMinor: result.costBasisMinor };
    else delete next.positions[order.companyId];
    return { account: next, result };
  }
  const api = { SecuritiesError, integer, fee, summary, openAccount, quote, trade, maximumBuy };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DJ48SecuritiesDomain = api;
})(typeof window === 'undefined' ? globalThis : window);
