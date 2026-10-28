'use strict';
const D = require('./board-domain');
const crypto = require('node:crypto');
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const hash = v => crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
function text(v, max = 300) { if (typeof v !== 'string' || !v.trim() || v.length > max) throw Error(`1~${max}자 내용을 입력해 주세요.`); return v.trim(); }
function id(v) { v = text(v, 120); if (/[/.\s]/.test(v)) throw Error('ID 형식을 확인해 주세요.'); return v; }
function cents(v) { if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1e9 || Math.abs(v * 100 - Math.round(v * 100)) > 1e-5) throw Error('금액은 0 이상, 소수 둘째 자리까지 입력해 주세요.'); return Math.round(v * 100); }
const amount = v => cents(v) / 100;
function int(v, min, max) { if (!Number.isInteger(v) || v < min || v > max) throw Error(`${min}~${max} 범위 정수가 필요합니다.`); return v; }
function date(v) { if (!D.validDate(v)) throw Error('날짜를 확인해 주세요.'); return v; }
function currency(v) { if (!['point', 'djCoin'].includes(v)) throw Error('포인트 또는 DJ코인을 선택해 주세요.'); return v; }
function salary(base, adjustment, tax) { const gross = Math.round(cents(base) * (100 + int(adjustment, -100, 100)) / 100), withheld = Math.round(gross * int(tax, 0, 100) / 100); return { gross: gross / 100, tax: withheld / 100, net: (gross - withheld) / 100 }; }
function exchange(value, policy) { const source = cents(value), fee = Math.round(source * int(policy.feePercent, 0, 100) / 100) + cents(policy.fixedFee), ratio = Number(policy.ratio); if (!(ratio > 0 && ratio <= 1000) || fee >= source) throw Error('환전액보다 수수료가 작고 환율은 0 초과여야 합니다.'); return { debit: source / 100, fee: fee / 100, credit: Math.round((source - fee) * ratio) / 100 }; }
function normalize(kind, p) {
  const base = { id: id(p.id), title: text(p.title, 80), active: p.active !== false };
  if (kind === 'routine') {
    if (!['daily', 'period'].includes(p.policy)) throw Error('일일 또는 기간 보상을 선택해 주세요.');
    const startDate = date(p.startDate), endDate = p.endDate ? date(p.endDate) : '';
    if (endDate && endDate < startDate || p.policy === 'period' && !endDate) throw Error('기간 종료 날짜를 확인해 주세요.');
    if(p.policy==='period'&&Date.parse(endDate)-Date.parse(startDate)>366*86400000)throw Error('기간형 루틴은 최대 367일 이내로 나누어 주세요.');
    const rewardBasis=p.rewardBasis||'all';if(!['all','per-item'].includes(rewardBasis)||p.policy==='period'&&rewardBasis!=='all')throw Error('항목별 보상은 일일형 루틴에서 사용할 수 있습니다.');
    if(p.weekdays&&(!Array.isArray(p.weekdays)||!p.weekdays.length))throw Error('루틴 요일을 하나 이상 선택해 주세요.');
    if (!Array.isArray(p.items) || !p.items.length || p.items.length > 10) throw Error('루틴 항목은 1~10개입니다.');
    return { ...base, policy: p.policy, rewardBasis, startDate, endDate, items: p.items.map(v => text(v, 100)), reward: amount(p.reward), weekdays: [...new Set(p.weekdays || [1,2,3,4,5])].map(v => int(v, 0, 6)), template: p.template === true };
  }
  if (kind === 'job') return { ...base, memberUserId: id(p.memberUserId), jobId: id(p.jobId), salary: amount(p.salary), currency: currency(p.currency), adjustment: int(p.adjustment || 0,-100,100), taxPercent: int(p.taxPercent || 0,0,100) };
  if (kind === 'deposit') return { ...base, days: int(p.days,1,365), interestPercent: int(p.interestPercent,0,100), earlyFee: amount(p.earlyFee) };
  if (kind === 'item') {
    if (!['seed','skin','coupon'].includes(p.kind)) throw Error('씨앗·농장 스킨·쿠폰을 선택해 주세요.');
    const out = { ...base, kind: p.kind, price: amount(p.price), description: typeof p.description === 'string' ? p.description.slice(0,300) : '' };
    if (p.kind === 'seed') Object.assign(out, { growHours: int(p.growHours,1,8760), harvestCoin: amount(p.harvestCoin) });
    if (p.kind === 'skin') { if (!['meadow','sunset','night','spring'].includes(p.theme)) throw Error('농장 스킨을 선택해 주세요.'); out.theme = p.theme; }
    return out;
  }
  if (kind === 'exchange') return { ...base, from: currency(p.from), to: currency(p.to), ratio: (()=>{ if(typeof p.ratio!=='number'||!Number.isFinite(p.ratio)||p.ratio<=0||p.ratio>1000||p.from===p.to)throw Error('환율과 통화를 확인해 주세요.');return p.ratio; })(), feePercent:int(p.feePercent,0,100), fixedFee:amount(p.fixedFee) };
  throw Error('지원하지 않는 설정입니다.');
}
// Read-only comparison. Never fabricates a reversible gem snapshot from current state.
function diagnoseLegacy(records, logs) {
  return records.filter(r => r.rewardStatus === 'paid' && r.source !== 'classroom-board').map(r => {
    const matches = logs.filter(l => l.recordId === r.id && l.memberUserId === (r.memberUserId || r.userId));
    const paid = matches.filter(l => Number(l.rewardPoint ?? l.rewardAmount) > 0);
    const hasGems = Boolean(r.linkedGemId || r.linkedGemIds?.length || r.gemId);
    const exact = paid.length === 1 && Number(paid[0].rewardPoint ?? paid[0].rewardAmount) === Number(r.rewardAmount);
    return { recordId:r.id, matchingLogs:matches.length, amountMatched:exact, status:exact&&!hasGems?'amount-evidence-only':'manual-review', automaticAdoption:false, reason:hasGems?'당시 젬 전후 스냅샷 필요':'지급 금액 대조와 별도로 당시 원장·취소 여부 검토 필요' };
  });
}
module.exports = { hash, text, id, cents, amount, int, date, currency, salary, exchange, normalize, diagnoseLegacy };
