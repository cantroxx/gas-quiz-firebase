'use strict';
const crypto=require('node:crypto');
function createService({db,FieldValue,ErrorType,authorize,authorizeAdmin,applyXp,now=()=>Date.now()}){
 const fail=(code,message)=>{throw new ErrorType(code,message);};
 const settings=db.doc('appSettings/specialRewards');
 const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 const progress=id=>db.doc('growthQuestProgress/special_'+id);
 const receipt=(id,member)=>db.doc('rewardLogs/special_'+hash(id+'|'+member));
 async function admin(uid,p){
  const operator = await authorizeAdmin(uid);
  const actor = operator?.memberUserId || uid;
  if(p.action==='overview') {
   const [current, history] = await Promise.all([settings.get(), settings.collection('history').orderBy('createdAt','desc').limit(101).get()]);
   const items = new Map(history.docs.slice(0,100).map(d=>[d.id,d.data()]));
   for(const item of current.data()?.items || []) items.set(item.id,item);
   const rows=[];
   // Bound read concurrency; an upper limit never masquerades as a full total.
   const all=[...items.values()];
   for(let offset=0;offset<all.length;offset+=5) rows.push(...await Promise.all(all.slice(offset,offset+5).map(async item=>{
    const [state, receipts] = await Promise.allSettled([progress(item.id).get(),db.collection('rewardLogs').where('rewardId','==',item.id).limit(5001).get()]);
    const logs=receipts.status==='fulfilled'?receipts.value.docs.slice(0,5000).map(d=>d.data()).filter(r=>r.type==='special_reward'):[];
    return {...item,participants:state.status==='fulfilled'?(state.value.data()?.participants||[]).length:null,
     claimed:receipts.status==='fulfilled'?logs.length:null,
     paidCoin:receipts.status==='fulfilled'?logs.reduce((sum,r)=>sum+Number(r.rewardCoin||0),0):null,
     paidXp:receipts.status==='fulfilled'?logs.reduce((sum,r)=>sum+Number(r.xpDelta||0),0):null,
     statsStatus:state.status==='rejected'||receipts.status==='rejected'?'failed':receipts.value.size>5000?'partial':'complete'};
   })));
   return {items:rows,checkedAt:now(),historyStatus:history.size>100?'partial':'complete'};
  }
  return db.runTransaction(async tx=>{
   const old=(await tx.get(settings)).data()||{},items=old.items||[];
   const historyRef = p.id && /^[a-zA-Z0-9-]{8,80}$/.test(p.id) ? db.doc('appSettings/specialRewards/history/'+p.id) : null;
   const saved = historyRef ? await tx.get(historyRef) : null;
   const log = (action) => tx.set(db.doc('adminLogs/special_'+hash(action+'|'+p.id)),{action,adminUserId:actor,targetUserId:p.id,createdAt:FieldValue.serverTimestamp()});
   if(p.action==='list')return {items};
   if(p.action==='close'){
    if(!items.some(i=>i.id===p.id))fail('not-found','보상을 찾지 못했어요.');
    if(!historyRef)fail('invalid-argument','보상 ID를 확인해 주세요.');
    const item=items.find(i=>i.id===p.id);
    if(item.active===false)return {success:true,duplicate:true};
    const closed={...item,active:false,closedAt:now(),closedBy:actor};
    tx.set(historyRef,closed);
    tx.set(settings,{items:items.map(i=>i.id===p.id?closed:i)});
    log('adminCloseSpecialReward');
    return {success:true};
   }
   if(p.action!=='publish'||!/^[a-zA-Z0-9-]{8,80}$/.test(p.id||''))fail('invalid-argument','요청을 확인해 주세요.');
   const title=String(p.title||'').trim(),instruction=String(p.instruction||'').trim();
   if(!title||title.length>80||!instruction||instruction.length>500||!['individual','cooperative'].includes(p.mode))fail('invalid-argument','제목, 미션 설명과 종류를 확인해 주세요.');
   if(!Number.isInteger(p.rewardCoin)||p.rewardCoin<0||p.rewardCoin>1000||!Number.isInteger(p.xpReward)||p.xpReward<0||p.xpReward>500)fail('invalid-argument','코인은 0~1000, XP는 0~500으로 설정해 주세요.');
   const target=p.mode==='individual'?1:p.target;
   if(!Number.isInteger(target)||target<2&&p.mode==='cooperative'||target>1000)fail('invalid-argument','협동 목표 인원을 확인해 주세요.');
   if(saved?.exists||items.some(i=>i.id===p.id))return {success:true,duplicate:true};
   if(items.filter(i=>i.active).length>=20)fail('failed-precondition','진행 중인 보상은 최대 20개입니다.');
   const item={id:p.id,title,instruction,mode:p.mode,target,rewardCoin:p.rewardCoin,xpReward:p.xpReward,active:true,createdAt:now(),createdBy:actor};
   for(const closed of items.filter(i=>!i.active))tx.set(db.doc('appSettings/specialRewards/history/'+closed.id),closed);
   tx.set(historyRef,item);
   tx.set(settings,{items:[...items.filter(i=>i.active),item]});
   log('adminPublishSpecialReward');
   return {success:true};
  });
 }
 async function act(uid,p){
  return db.runTransaction(async tx=>{
   const member=await authorize(tx,uid,p.memberUserId);
   const flags=(await tx.get(db.doc('appSettings/featureFlags'))).data()||{};
   if(flags.eventPlazaEnabled===false&&member.role!=='admin')fail('failed-precondition','특별 보상이 잠시 쉬고 있어요.');
   const items=((await tx.get(settings)).data()?.items||[]).filter(i=>i.active);
   if(p.action==='list'){
    const rows=await Promise.all(items.map(async item=>{
     const [s,r]=await Promise.all([tx.get(progress(item.id)),tx.get(receipt(item.id,p.memberUserId))]);
     const participants=s.data()?.participants||[];
     const {createdBy,closedBy,closedAt,...publicItem}=item;
     return {...publicItem,current:participants.length,participated:participants.includes(p.memberUserId),claimed:r.exists};
    }));
    return {items:rows};
   }
   const item=items.find(i=>i.id===p.id);if(!item)fail('not-found','종료되었거나 없는 보상이에요.');
   const pr=progress(item.id),rr=receipt(item.id,p.memberUserId);
   const [s,r]=await Promise.all([tx.get(pr),tx.get(rr)]);
   const participants=s.data()?.participants||[],joined=participants.includes(p.memberUserId);
   if(p.action==='participate'){
    if(p.confirmed!==true)fail('failed-precondition','미션을 수행한 뒤 확인해 주세요.');
    if(!joined)tx.set(pr,{participants:[...participants,p.memberUserId]});
    return {success:true};
   }
   if(p.action!=='claim')fail('invalid-argument','요청을 확인해 주세요.');
   if(r.exists)return {success:true,duplicate:true,rewardCoin:0,xpDelta:0};
   if(!joined||(item.mode==='cooperative'&&participants.length<item.target))fail('failed-precondition','미션 참여와 협동 목표를 먼저 완료해 주세요.');
   const dateKey=new Date(now()+9*3600000).toISOString().slice(0,10);
   const xp=await applyXp(tx,{memberUserId:p.memberUserId,authUid:uid,memberData:member,xpDelta:item.xpReward,sourceType:'special_reward',sourceId:item.id,sourceLabel:item.title,dateKey});
   tx.set(db.doc('userEconomy/'+p.memberUserId),{userId:p.memberUserId,djCoin:FieldValue.increment(item.rewardCoin),totalEarned:FieldValue.increment(item.rewardCoin),updatedAt:FieldValue.serverTimestamp()},{merge:true});
   tx.create(rr,{type:'special_reward',memberUserId:p.memberUserId,rewardId:item.id,rewardCoin:item.rewardCoin,xpDelta:xp.xpDelta,createdAt:FieldValue.serverTimestamp()});
   return {success:true,rewardCoin:item.rewardCoin,xpDelta:xp.xpDelta};
  });
 }
 return {admin,act};
}
module.exports={createService};
