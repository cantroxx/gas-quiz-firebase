'use strict';
const D = require('./board-domain');
const F = require('./followup-domain');
const crypto = require('node:crypto');
function createService({ db, authorize, studentVisible=()=>true, ErrorType=Error, now=()=>Date.now(), randomInt=crypto.randomInt }) {
  const fail=(code,message)=>{throw new ErrorType(code,message);};
  const value=s=>s.exists?s.data():null;
  return async function act(uid,p={}) {
    if(!uid)fail('unauthenticated','로그인이 필요합니다.');
    try {
      const classId=F.id(p.classId),member=F.id(p.memberUserId),action=F.id(p.action),stamp=now(),today=D.dateKey(stamp);
      const root=db.collection('classrooms').doc(classId),col=n=>root.collection('continuity'+n),doc=(n,k)=>col(n).doc(k);
      return await db.runTransaction(async tx=>{
        const ctx=await authorize(tx,member,uid,classId),teacher=ctx.isTeacher===true,settings=ctx.settings;
        const teacherActions=['configure','paySalary','settleRoutine','reviewRequest','saveObservation','openLottery','closeLottery','drawLottery','redeemCoupon','legacyDiagnostic'];
        if(teacherActions.includes(action)&&!teacher)fail('permission-denied','담임 권한이 필요합니다.');
        const owner=teacher&&p.targetMemberUserId?F.id(p.targetMemberUserId):member;
        const writes=[],put=(r,v,merge=false)=>writes.push([r,v,merge]),read=async r=>value(await tx.get(r));
        const all=async q=>(await tx.get(q)).docs.map(s=>({id:s.id,...s.data()}));
        const assertStudent=async who=>{const s=await read(db.collection('users').doc(who));if(!s||!D.activeStudent(who,s,settings)||!studentVisible(who,s))fail('permission-denied','현재 학급의 활동 학생이 아닙니다.');return s;};
        if(!teacher)await assertStudent(member);
        else if(p.targetMemberUserId)await assertStudent(owner);
        if(action==='routineDays'){
          const day=F.date(p.dateKey||today);if(day>today)fail('invalid-argument','오늘까지의 기록을 조회할 수 있습니다.');
          return {rows:await all(col('RoutineDays').where('memberUserId','==',owner).where('dateKey','==',day).limit(200))};
        }
        if(action==='history'){
          const allowed={records:'Ledger',archives:'Archives',routines:'RoutineDays',deposits:'Deposits',requests:'Requests',tickets:'Tickets'};
          const name=allowed[p.section];if(!name)fail('invalid-argument','내역 종류를 확인해 주세요.');
          let query=col(name).where('memberUserId','==',owner).orderBy('__name__');if(p.cursor)query=query.startAfter(F.id(p.cursor));
          const rows=await all(query.limit(100));return {rows:teacher?rows:rows.filter(r=>r.visibility!=='teacher'),nextCursor:rows.length===100?rows[rows.length-1].id:''};
        }
        if(action==='list') {
          const config=await all(col('Config')),own=who=>teacher&&p.all===true?col(who):col(who).where('memberUserId','==',owner);
          // Bounded, manual views. Archives are not part of automatic board polling.
          const result={isTeacher:teacher,today,config:config.filter(c=>teacher||c.kind!=='job'||c.memberUserId===owner),
            routines:await all(own('RoutineDays').where('dateKey','==',today).limit(200)),deposits:await all(own('Deposits').limit(100)),inventory:await all(own('Inventory').limit(100)),plots:await all(own('Plots').limit(12)),
            requests:await all(own('Requests').limit(100)),tickets:await all(own('Tickets').limit(100)),rounds:await all(col('Lottery').orderBy('createdAt','desc').limit(30)),
            records:await all(own('Ledger').orderBy('__name__').limit(100)),archives:await all(own('Archives').orderBy('__name__').limit(100))};
          if(teacher){result.observations=await all(col('Observations').where('memberUserId','==',owner).limit(100));result.fund=await read(doc('Fund','balance'))||{point:0,djCoin:0};result.fundRecords=await all(col('Ledger').where('fundEntry','==',true).limit(100));result.students=(await all(db.collection('users').where('role','==','student'))).filter(s=>D.activeStudent(s.id,s,settings)&&studentVisible(s.id,s)).map(s=>({id:s.id,name:s.nickname||s.id,number:s.studentNumber||0}));}
          const w=await read(root.collection('studentWallets').doc(owner)),e=await read(db.collection('userEconomy').doc(owner));
          result.profile=await read(doc('Profiles',owner))||{};
          result.rounds=result.rounds.map(({tickets,...r})=>({...r,ticketCount:tickets.length,ownNumber:tickets.find(t=>t.memberUserId===owner)?.number??null}));
          result.nextCursors=Object.fromEntries(['records','archives'].map(k=>[k,result[k].length===100?result[k][result[k].length-1].id:'']));
          result.limits={routines:200,deposits:100,inventory:100,plots:12,requests:100,tickets:100,rounds:30,records:100,archives:100};
          result.truncated=Object.entries(result.limits).filter(([k,n])=>result[k].length>=n).map(([k])=>k);
          if(!teacher){result.archives=result.archives.filter(r=>r.visibility!=='teacher');result.records=result.records.filter(r=>r.visibility!=='teacher');}
          result.wallet={point:D.money(w?.point??w?.berry??0),djCoin:D.money(e?.djCoin??e?.coin??0)};
          return result;
        }
        if(action==='legacyDiagnostic') {
          const records=await all(root.collection('questProgress').limit(500)),logs=await all(root.collection('pointLogs').limit(1000));
          return {mode:'read-only',truncated:records.length===500||logs.length===1000,records:F.diagnoseLegacy(records,logs)};
        }
        const requestId=F.id(p.requestId),requestRef=doc('RequestsOnce',F.hash([member,requestId])),oldRequest=await read(requestRef),payloadHash=F.hash(p);
        if(oldRequest){if(oldRequest.payloadHash!==payloadHash)fail('already-exists','같은 요청 번호에 다른 내용이 있습니다.');return {...oldRequest.result,duplicate:true};}
        const extraPayouts=[];
        let result={},deltaPoint=0,deltaCoin=0,fundPoint=0,fundCoin=0,eventOwner=owner;
        const requireConfig=async(kind,key)=>{const c=await read(doc('Config',kind+'__'+F.id(key)));if(!c||!c.active)fail('failed-precondition','사용 가능한 설정이 없습니다.');return c;};
        if(action==='configure') {
          const config=F.normalize(p.kind,p.config),ref=doc('Config',p.kind+'__'+config.id),old=await read(ref);
          if(p.kind==='job')await assertStudent(config.memberUserId);
          if(p.kind==='routine'&&await read(root.collection('studentRoutines').doc(config.id)))fail('failed-precondition','기존 개인 루틴과 같은 ID를 사용할 수 없습니다. 이전 대응표에서 별도로 연결해 주세요.');
          if(p.kind==='exchange'){
            const others=await all(col('Config').where('kind','==','exchange'));
            if(config.active&&others.some(c=>c.id!==config.id&&c.active&&c.from===config.from))fail('failed-precondition','같은 방향의 활성 환전 정책은 하나만 둘 수 있습니다.');
            const policies=[...others.filter(c=>c.id!==config.id),config];
            put(doc('Control','exchange'),{point:policies.some(c=>c.active&&c.from==='point'),djCoin:policies.some(c=>c.active&&c.from==='djCoin')});
          }
          const routinePolicy=v=>Object.fromEntries(['policy','rewardBasis','startDate','endDate','items','reward','weekdays','template'].map(k=>[k,k==='rewardBasis'?(v[k]||'all'):v[k]]));
          if(p.kind==='item'&&old&&old.itemKind!==config.kind)fail('failed-precondition','기존 상품의 종류는 변경할 수 없습니다. 새 관리 코드로 등록해 주세요.');
          if(p.kind==='routine'&&old&&F.hash(routinePolicy(old))!==F.hash(routinePolicy(config))){
            const existing=await all(col('RoutineDays').where('routineId','==',config.id).limit(1));
            if(existing.length)fail('failed-precondition','기록이 있는 루틴은 정책을 바꿀 수 없습니다. 새 ID로 복제해 주세요.');
          }
          put(ref,{...config,kind:p.kind,itemKind:p.kind==='item'?config.kind:'',updatedBy:member,updatedAt:stamp});
          // Preserve item category independently of document configuration type.
          if(p.kind==='item')writes[writes.length-1][1].itemKind=config.kind;
          result={saved:true,id:config.id};
        } else if(action==='checkRoutine'||action==='settleRoutine') {
          await assertStudent(owner);const routine=await requireConfig('routine',p.routineId),day=F.date(p.dateKey||today);
          if(routine.template||day<routine.startDate||routine.endDate&&day>routine.endDate||day>today||!teacher&&day!==today)fail('failed-precondition','루틴 날짜를 확인해 주세요.');
          if(!routine.weekdays.includes(new Date(day+'T00:00:00Z').getUTCDay()))fail('failed-precondition','루틴을 수행하는 요일이 아닙니다.');
          const dailyRef=doc('RoutineDays',F.hash([owner,routine.id,day])),daily=await read(dailyRef);
          if(action==='checkRoutine') {
            if(!Array.isArray(p.checked)||p.checked.some(i=>!Number.isInteger(i)||i<0||i>=routine.items.length))fail('invalid-argument','체크 항목을 확인해 주세요.');
            if(daily?.paid)fail('failed-precondition','이미 보상이 지급된 일별 기록입니다.');
            const checked=[...new Set(p.checked)],complete=checked.length===routine.items.length;
            const paidItems=daily?.paidItems||[];
            if(paidItems.some(i=>!checked.includes(i)))fail('failed-precondition','보상을 받은 항목은 체크를 해제할 수 없습니다.');
            if(routine.policy==='daily')deltaPoint=routine.rewardBasis==='per-item'?D.money(routine.reward*checked.filter(i=>!paidItems.includes(i)).length):complete?routine.reward:0;
            put(dailyRef,{memberUserId:owner,routineId:routine.id,dateKey:day,checked,complete,paidItems:routine.policy==='daily'&&routine.rewardBasis==='per-item'?checked:paidItems,paid:complete&&routine.policy==='daily',rewardPoint:D.money((daily?.rewardPoint||0)+deltaPoint),updatedAt:stamp});result={saved:true,rewardPoint:deltaPoint};
          } else {
            if(routine.policy!=='period'||today<routine.endDate)fail('failed-precondition','기간 종료 후 정산할 수 있습니다.');
            const settleRef=doc('Settlements',F.hash(['routine',owner,routine.id])),settled=await read(settleRef);
            if(settled)fail('already-exists','이미 기간 보상을 지급했습니다.');
            const days=await all(col('RoutineDays').where('memberUserId','==',owner));let required=0,complete=0;
            for(let d=Date.parse(routine.startDate);d<=Date.parse(routine.endDate);d+=86400000){const dayKey=new Date(d).toISOString().slice(0,10);if(routine.weekdays.includes(new Date(d).getUTCDay())){required++;if(days.some(r=>r.routineId===routine.id&&r.dateKey===dayKey&&r.complete))complete++;}}
            if(!required||complete!==required)fail('failed-precondition',`완료한 날 ${complete}/${required}일입니다. 모든 날을 확인해 주세요.`);
            deltaPoint=routine.reward;put(settleRef,{memberUserId:owner,routineId:routine.id,paidAt:stamp,rewardPoint:deltaPoint});result={paid:true,rewardPoint:deltaPoint};
          }
        } else if(action==='paySalary') {
          const job=await requireConfig('job',p.jobId);eventOwner=job.memberUserId;await assertStudent(eventOwner);
          const month=F.text(p.month,7);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month>today.slice(0,7))fail('invalid-argument','급여 월을 확인해 주세요.');
          const settledRef=doc('Settlements',F.hash(['salary',eventOwner,job.jobId,month]));if(await read(settledRef))fail('already-exists','이 직업의 해당 월 급여는 이미 지급했습니다.');
          const legacyKey=['classroom_job_salary',classId,month,eventOwner,job.jobId].map(v=>String(v).trim().replace(/[^0-9A-Za-z가-힣:_-]+/g,'-')).filter(Boolean).join('__').slice(0,1400);
          const legacyRef=db.collection('rewardLogs').doc(legacyKey);if(await read(legacyRef))fail('already-exists','기존 직업 화면에서 이미 지급한 월급입니다.');
          const pay=F.salary(job.salary,job.adjustment,job.taxPercent);if(job.currency==='point'){deltaPoint=pay.net;fundPoint=pay.tax;}else{deltaCoin=pay.net;fundCoin=pay.tax;}
          put(legacyRef,{type:'classroom_job_salary',source:'classroom-followup',classId,memberUserId:eventOwner,userId:eventOwner,jobId:job.jobId,monthKey:month,rewardCurrency:job.currency,rewardPoint:deltaPoint,rewardCoin:deltaCoin,rewardAmount:pay.net,createdAt:stamp});
          put(settledRef,{memberUserId:eventOwner,jobId:job.jobId,month,currency:job.currency,...pay,paidAt:stamp});result={paid:true,currency:job.currency,...pay};
        } else if(action==='deposit') {
          await assertStudent(owner);const plan=await requireConfig('deposit',p.planId),principal=F.amount(p.amount);if(!principal)fail('invalid-argument','예금액을 입력해 주세요.');
          const key=F.hash([owner,requestId]);deltaCoin=-principal;
          put(doc('Deposits',key),{memberUserId:owner,principal,interest:D.money(principal*plan.interestPercent/100),interestPercent:plan.interestPercent,earlyFee:plan.earlyFee,openedAt:stamp,maturesAt:stamp+plan.days*86400000,status:'open',currency:'djCoin',title:plan.title});result={depositId:key};
        } else if(action==='settleDeposit') {
          const ref=doc('Deposits',F.id(p.depositId)),dep=await read(ref);if(!dep||dep.memberUserId!==owner)fail('permission-denied','본인 예금만 해지할 수 있습니다.');
          await assertStudent(owner);if(dep.status!=='open')fail('already-exists','이미 정산된 예금입니다.');
          const mature=stamp>=dep.maturesAt,fee=mature?0:Math.min(dep.principal,dep.earlyFee);deltaCoin=D.money(dep.principal+(mature?dep.interest:0)-fee);fundCoin=fee;
          put(ref,{...dep,status:'closed',closedAt:stamp,mature,payout:deltaCoin,fee});result={payout:deltaCoin,fee,mature};
        } else if(action==='exchange') {
          await assertStudent(owner);const policy=await requireConfig('exchange',p.policyId),x=F.exchange(p.amount,policy);
          if(policy.from==='point'){deltaPoint=-x.debit;deltaCoin=x.credit;fundPoint=x.fee;}else{deltaCoin=-x.debit;deltaPoint=x.credit;fundCoin=x.fee;}
          result={...x,from:policy.from,to:policy.to};
        } else if(action==='buyItem') {
          await assertStudent(owner);const item=await requireConfig('item',p.itemId),quantity=F.int(p.quantity||1,1,99),invRef=doc('Inventory',F.hash([owner,item.id])),inv=await read(invRef);
          if(item.itemKind==='skin'&&(inv?.quantity>0||quantity!==1))fail('already-exists','스킨은 한 개만 소유할 수 있습니다.');
          const contractHash=F.hash({kind:item.itemKind,growHours:item.growHours||0,harvestCoin:item.harvestCoin||0,theme:item.theme||''});
          if(inv?.quantity&&inv.contractHash&&inv.contractHash!==contractHash)fail('failed-precondition','상품 조건이 변경되었습니다. 남은 상품을 사용하거나 새 상품 ID로 구입해 주세요.');
          deltaCoin=-D.money(item.price*quantity);put(invRef,{contractHash,growHours:item.growHours||0,harvestCoin:item.harvestCoin||0,memberUserId:owner,itemId:item.id,kind:item.itemKind,title:item.title,quantity:(inv?.quantity||0)+quantity,theme:item.theme||'',updatedAt:stamp});result={bought:quantity,cost:-deltaCoin};
        } else if(action==='plant') {
          await assertStudent(owner);const item={id:F.id(p.itemId)};
          const slot=F.int(p.slot,1,6),plotRef=doc('Plots',F.hash([owner,slot])),plot=await read(plotRef),invRef=doc('Inventory',F.hash([owner,item.id])),inv=await read(invRef);
          if(plot?.status==='growing')fail('failed-precondition','먼저 수확해 주세요.');if(!inv?.quantity||inv.kind!=='seed'||!inv.growHours)fail('failed-precondition','보유한 씨앗을 선택해 주세요.');
          put(invRef,{...inv,quantity:inv.quantity-1});put(plotRef,{memberUserId:owner,slot,itemId:item.id,title:inv.title,plantedAt:stamp,readyAt:stamp+inv.growHours*3600000,harvestCoin:inv.harvestCoin,status:'growing'});result={planted:true};
        } else if(action==='harvest') {
          await assertStudent(owner);const ref=doc('Plots',F.hash([owner,F.int(p.slot,1,6)])),plot=await read(ref);if(!plot||plot.status!=='growing'||stamp<plot.readyAt)fail('failed-precondition','아직 수확할 수 없습니다.');
          deltaCoin=plot.harvestCoin;put(ref,{...plot,status:'harvested',harvestedAt:stamp});result={rewardCoin:deltaCoin};
        } else if(action==='equipSkin') {
          await assertStudent(owner);const inv=await read(doc('Inventory',F.hash([owner,F.id(p.itemId)])));if(!inv?.quantity||inv.kind!=='skin')fail('failed-precondition','소유한 농장 스킨을 선택해 주세요.');
          put(doc('Profiles',owner),{memberUserId:owner,skinId:inv.itemId,theme:inv.theme});result={equipped:true};
        } else if(action==='redeemCoupon') {
          await assertStudent(owner);const ref=doc('Inventory',F.hash([owner,F.id(p.itemId)])),inv=await read(ref);if(!inv?.quantity||inv.kind!=='coupon')fail('failed-precondition','사용 가능한 쿠폰이 없습니다.');
          put(ref,{...inv,quantity:inv.quantity-1});result={redeemed:true,itemId:inv.itemId};
        } else if(action==='requestPoints') {
          await assertStudent(owner);const amount=F.amount(p.amount);if(!amount)fail('invalid-argument','신청 포인트를 입력해 주세요.');const key=F.hash([owner,requestId]);
          put(doc('Requests',key),{memberUserId:owner,amount,reason:F.text(p.reason,1000),category:F.text(p.category,80),status:'pending',createdAt:stamp});result={requestId:key};
        } else if(action==='reviewRequest') {
          const ref=doc('Requests',F.id(p.recordId)),r=await read(ref);if(!r||r.status!=='pending'||r.source==='grownd')fail('failed-precondition','새 검토 대기 신청만 처리할 수 있습니다.');
          eventOwner=r.memberUserId;await assertStudent(eventOwner);if(!['approved','rejected'].includes(p.status))fail('invalid-argument','승인/반려 상태를 확인해 주세요.');
          if(p.status==='approved')deltaPoint=r.amount;put(ref,{...r,status:p.status,reviewReason:F.text(p.reason,1000),reviewedBy:member,reviewedAt:stamp});result={status:p.status,rewardPoint:deltaPoint};
        } else if(action==='saveObservation') {
          await assertStudent(owner);put(doc('Observations',F.hash([owner,requestId])),{memberUserId:owner,dateKey:F.date(p.dateKey||today),text:F.text(p.text,3000),category:F.text(p.category||'관찰',80),createdBy:member,createdAt:stamp,visibility:'teacher'});result={saved:true};
        } else if(action==='openLottery') {
          const key=F.id(p.roundId),ref=doc('Lottery',key);if(await read(ref))fail('already-exists','이미 있는 복권 회차입니다.');
          const closesAt=Number(p.closesAt);if(!Number.isFinite(closesAt)||closesAt<=stamp)fail('invalid-argument','추첨 시각은 현재 이후여야 합니다.');
          const ticketPrice=F.amount(p.ticketPrice);if(!ticketPrice)fail('invalid-argument','복권 가격은 0보다 커야 합니다.');
          const jackpot=F.amount(p.jackpot);fundCoin=-jackpot;
          put(ref,{title:F.text(p.title,80),ticketPrice,jackpot,closesAt,maxPerStudent:1,maxTickets:F.int(p.maxTickets,1,200),tickets:[],status:'open',openedBy:member,createdAt:stamp});result={opened:true};
        } else if(action==='buyTicket') {
          await assertStudent(owner);const key=F.id(p.roundId),ref=doc('Lottery',key),round=await read(ref);if(!round||round.status!=='open'||stamp>=round.closesAt)fail('failed-precondition','판매 중인 복권이 아닙니다.');
          const count=round.tickets.filter(t=>t.memberUserId===owner).length;if(count>=round.maxPerStudent||round.tickets.length>=round.maxTickets)fail('failed-precondition','복권 구입 한도입니다.');
          const number=F.int(p.number,1,100),ticketId=F.hash([owner,requestId]),ticket={id:ticketId,memberUserId:owner,number};deltaCoin=-round.ticketPrice;fundCoin=round.ticketPrice;
          put(ref,{...round,tickets:[...round.tickets,ticket]});put(doc('Tickets',ticketId),{memberUserId:owner,roundId:key,number,price:round.ticketPrice,createdAt:stamp});result={ticketId};
        } else if(action==='closeLottery') {
          const ref=doc('Lottery',F.id(p.roundId)),round=await read(ref);if(!round||round.status!=='open')fail('failed-precondition','진행 중인 복권 회차만 마감할 수 있습니다.');
          put(ref,{...round,closesAt:Math.min(stamp,round.closesAt),closedBy:member});result={salesClosed:true};
        } else if(action==='drawLottery') {
          const ref=doc('Lottery',F.id(p.roundId)),round=await read(ref);if(!round||round.status!=='open'||stamp<round.closesAt)fail('failed-precondition','마감된 미추첨 회차만 추첨할 수 있습니다.');
          const winningNumber=randomInt(100)+1,winners=round.tickets.filter(t=>t.number===winningNumber);
          const share=winners.length?Math.floor(F.cents(round.jackpot)/winners.length)/100:0;
          for(const ticket of winners){await assertStudent(ticket.memberUserId);extraPayouts.push({memberUserId:ticket.memberUserId,deltaPoint:0,deltaCoin:share});}
          fundCoin=D.money(round.jackpot-share*winners.length);
          put(ref,{...round,status:'drawn',winningNumber,winners:winners.map(t=>t.memberUserId),payoutPerWinner:share,returnedToFund:fundCoin,drawnAt:stamp});
          result={winningNumber,winners:winners.map(t=>t.memberUserId),payoutPerWinner:share,returnedToFund:fundCoin};
        } else fail('invalid-argument','지원하지 않는 작업입니다.');
        // All mutations, including receipts, are committed together after every read succeeds.
        const payouts=[...(deltaPoint||deltaCoin?[{memberUserId:eventOwner,deltaPoint,deltaCoin}]:[]),...extraPayouts];
        for(const payout of payouts){const who=payout.memberUserId,wref=root.collection('studentWallets').doc(who),eref=db.collection('userEconomy').doc(who),w=await read(wref)||{},e=await read(eref)||{};
          const points=D.money(w.point??w.berry??0),coins=D.money(e.djCoin??e.coin??0),nextPoint=D.money(points+payout.deltaPoint),nextCoin=D.money(coins+payout.deltaCoin);
          if(nextPoint<0||nextCoin<0)fail('failed-precondition','잔액이 부족합니다. 변경하지 않았습니다.');F.amount(nextPoint);F.amount(nextCoin);
          if(payout.deltaPoint)put(wref,{memberUserId:who,userId:who,classId,point:nextPoint,updatedAt:stamp},true);
          if(payout.deltaCoin)put(eref,{userId:who,djCoin:nextCoin,updatedAt:stamp},true);
        }
        for(const payout of extraPayouts)put(doc('Ledger',F.hash([member,requestId,payout.memberUserId])),{...payout,action:'lotteryPrize',roundId:p.roundId,fundPoint:0,fundCoin:0,createdBy:member,createdAt:stamp});
        if(fundPoint||fundCoin){const ref=doc('Fund','balance'),fund=await read(ref)||{point:0,djCoin:0};const next={point:D.money((fund.point||0)+fundPoint),djCoin:D.money((fund.djCoin||0)+fundCoin)};if(next.point<0||next.djCoin<0)fail('failed-precondition','기금 잔액이 부족합니다. 복권 당첨금은 기금에서 예약합니다.');put(ref,next);}
        const eventId=F.hash([member,requestId]);
        put(doc('Ledger',eventId),{memberUserId:eventOwner,visibility:['configure','saveObservation','openLottery','closeLottery','drawLottery'].includes(action)?'teacher':'owner',fundEntry:!!(fundPoint||fundCoin),action,deltaPoint,deltaCoin,fundPoint,fundCoin,result,createdBy:member,createdAt:stamp});
        put(requestRef,{payloadHash,result,createdAt:stamp});
        for(const [ref,v,merge]of writes)merge?tx.set(ref,v,{merge:true}):tx.set(ref,v);
        return result;
      });
    }catch(e){if(e.code)throw e;fail('invalid-argument',e.message);}
  };
}
module.exports={createService};
