const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../../public/js/domain/securities-domain');
const fixture=require('../../fixtures/securities/market.json');
const reason='뉴스에서비용과판매량을함께살펴보았어요';
const market={mode:'practice',lifecycle:'enabled',session:'open',priceVersion:'v1',feeBps:50,prices:{sample:2000}};
const order=(side='buy',quantity=2)=>({side,quantity,companyId:'sample',reason,expectedPriceVersion:'v1'});
function funded(){return {...D.openAccount(),cashMinor:10000,initialGrantMinor:0,depositsMinor:10000};}
test('plan 5.1: partial sell, withdrawal invariance, full liquidation, repurchase',()=>{
 let a=D.trade(funded(),market,order()).account;
 assert.equal(a.cashMinor,5980);assert.equal(a.positions.sample.costBasisMinor,4020);
 const higher={...market,prices:{sample:2200}};
 a=D.trade(a,higher,order('sell',1)).account;
 assert.equal(a.cashMinor,8169);assert.equal(a.positions.sample.costBasisMinor,2010);assert.equal(a.realizedPnlMinor,179);
 assert.deepEqual(D.summary(a,higher.prices),{valueMinor:2200,costBasisMinor:2010,netAssetsMinor:10369,pnlMinor:369,unrealizedPnlMinor:190});
 a={...a,cashMinor:a.cashMinor-1000,withdrawalsMinor:1000};
 assert.equal(D.summary(a,higher.prices).pnlMinor,369);
 a=D.trade(a,higher,order('sell',1)).account;assert.equal(a.positions.sample,undefined);assert.equal(a.realizedPnlMinor,358);
 a={...a,tradesToday:0};a=D.trade(a,higher,order('buy',1)).account;assert.equal(a.positions.sample.costBasisMinor,2211);
});
test('rounding, safe integers and strict quantities',()=>{
 assert.equal(D.fee(100),1);assert.equal(D.fee(99),0);assert.equal(D.fee(200),1);
 for(const quantity of [-1,0,1.1,NaN,Infinity,'2',101]) assert.throws(()=>D.quote(D.openAccount(),market,{...order(),quantity}));
 assert.throws(()=>D.fee(Number.MAX_SAFE_INTEGER));
 assert.throws(()=>D.quote(D.openAccount(),{...market,prices:{sample:NaN}},order()));
});
test('allocation conservation and no double subtraction of fees',()=>{
 let a={...D.openAccount(),positions:{sample:{quantity:3,costBasisMinor:1001}}};
 a=D.trade(a,market,order('sell',1)).account;assert.equal(a.positions.sample.costBasisMinor,668);
 a=D.trade(a,market,order('sell',2)).account;assert.equal(a.positions.sample,undefined);assert.equal(a.realizedPnlMinor,4969);
 const start=D.openAccount();assert.equal(D.summary(start,market.prices).pnlMinor,0);
 const b=D.trade(start,market,order('buy',1)).account;assert.equal(D.summary(b,market.prices).pnlMinor,-10);
});
test('limits use fee-adjusted net assets and full portfolio',()=>{
 assert.equal(D.maximumBuy(funded(),market,'sample'),2);
 assert.throws(()=>D.quote(funded(),market,order('buy',3)),e=>e.code==='weight-limit');
 assert.throws(()=>D.quote({...funded(),cashMinor:1},market,order()),e=>e.code==='insufficient-cash');
 assert.throws(()=>D.quote(funded(),market,order('sell')),e=>e.code==='insufficient-shares');
 assert.throws(()=>D.quote({...funded(),tradesToday:3},market,order()),e=>e.code==='daily-limit');
 assert.throws(()=>D.quote({...funded(),status:'frozen'},market,order()),e=>e.code==='frozen');
 assert.throws(()=>D.quote(funded(),market,{...order(),reason:'짧음'}),e=>e.code==='reason-required');
 assert.throws(()=>D.quote(funded(),market,{...order(),reason:'가'.repeat(201)}));
 assert.throws(()=>D.quote(funded(),market,{...order(),expectedPriceVersion:'old'}),e=>e.code==='price-changed');
 for(const session of ['closed','preopen','holiday','error'])assert.throws(()=>D.quote(funded(),{...market,session},order()),e=>e.code==='market-closed');
 assert.throws(()=>D.quote(funded(),{...market,lifecycle:'paused'},order()));
});
test('fixtures are complete and use one displayed price version',()=>{
 assert.equal(fixture.companies.length,12);assert.ok(fixture.news.length>=30);
 for(const c of fixture.companies){assert.equal(c.history.length,20);assert.equal(c.history.at(-1).priceMinor,fixture.market.prices[c.id]);}
 for(const n of fixture.news.filter(n=>n.correctionOf))assert.ok(fixture.news.some(original=>original.id===n.correctionOf));
});
test('securities tab does not load wallets or unrelated classroom data',async()=>{
 const usecases=require('../../public/js/application/classroom-usecases');
 const result=await usecases.getClassroomPrototypeViewData({activeTab:'securities'},{loadClassroomSettings:async()=>({classId:'demo'}),isCurrentClassroomTeacher:()=>false});
 assert.equal(result.settings.classId,'demo');assert.deepEqual(result.wallet,{});
});
