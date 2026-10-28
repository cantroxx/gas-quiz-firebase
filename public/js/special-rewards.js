(function(){
 'use strict';
 const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
 const call=async(name,p)=>(await window.DJ48Firebase.getFirebaseFunctions().httpsCallable(name)(p)).data;
 const member=()=>window.DJ48AccountState.getCurrentMemberUserId();
 let request=0;
 async function load(){
  const root=document.getElementById('special-reward-grid');if(!root)return;
  const stamp=++request,owner=member();root.replaceChildren(el('p','특별한 보상을 불러오는 중이에요.'));
  try{
   const data=await call('specialRewardAction',{action:'list',memberUserId:owner});if(stamp!==request||owner!==member())return;
   root.replaceChildren();
   if(!data.items.length)root.append(el('p','선생님이 준비한 특별 보상이 아직 없어요.'));
   for(const item of data.items){
    const card=el('article','','quest-card');card.append(el('h3',item.title),el('p',item.instruction),el('p','XP +'+item.xpReward+' · DJ코인 +'+item.rewardCoin));
    if(item.mode==='cooperative')card.append(el('p','함께 참여한 친구 '+item.current+'/'+item.target+'명'));
    const button=el('button',item.claimed?'수령 완료':!item.participated?'미션을 했어요':item.mode==='cooperative'&&item.current<item.target?'친구들의 참여를 기다려요':'보상 받기','quest-claim-button');
    button.type='button';button.disabled=item.claimed||(item.participated&&item.mode==='cooperative'&&item.current<item.target);
    button.onclick=async()=>{
     if(!item.participated&&!window.confirm(item.instruction+'\n미션을 완료했나요?'))return;
     button.disabled=true;
     try{await call('specialRewardAction',{action:item.participated?'claim':'participate',id:item.id,memberUserId:owner,confirmed:true});await load();window.dispatchEvent(new Event('dj48-special-reward-updated'));}
     catch(error){window.alert(error.message||'다시 시도해 주세요.');button.disabled=false;}
    };
    card.append(button);root.append(card);
   }
  }catch(error){if(stamp===request&&owner===member())root.replaceChildren(el('p',error.message||'보상을 불러오지 못했어요.'));}
 }
 function init(){
  document.addEventListener('toggle',event=>{if(event.target.id==='spatial-panel-special-rewards'&&event.newState==='open')load();},true);
  const dashboard=document.querySelector('#admin-section-dashboard .admin-section-body');if(!dashboard)return;
  const section=el('details'),summary=el('summary','특별한 보상 설정');section.id='admin-special-rewards';section.append(summary);
  const intro=el('p','간단한 개인 미션 또는 친구들이 함께 참여하는 협동 미션을 만들어요. 학생이 수행했다고 직접 확인하는 방식입니다. 교사 승인 방식이 아닙니다. 게시 후 보상 금액은 바꿀 수 없고 종료할 수 있어요.');
  const form=el('form'),fields={};
  for(const[key,label,type,value]of [['title','보상 제목','text',''],['instruction','학생이 할 간단한 미션','text',''],['target','협동 목표 인원','number','10'],['rewardCoin','DJ코인','number','5'],['xpReward','XP','number','10']]){
   const row=el('label',label+' '),input=el(key==='instruction'?'textarea':'input');input.name=key;input.required=true;if(key!=='instruction')input.type=type;input.value=value;
   if(type==='number'){input.min=key==='target'?'2':'0';input.max=key==='xpReward'?'500':'1000';input.step='1';}
   else input.maxLength=key==='title'?80:500;
   fields[key]=input;row.append(input);form.append(row);
  }
  const mode=el('select');mode.setAttribute('aria-label','미션 종류');
  for(const[value,label]of [['individual','개인 미션'],['cooperative','협동 미션']]){const option=el('option',label);option.value=value;mode.append(option);}
  form.prepend(mode);fields.target.disabled=true;mode.onchange=()=>fields.target.disabled=mode.value==='individual';
  const publish=el('button','특별 보상 게시','button');publish.type='submit';form.append(publish);
  const status=el('p');status.setAttribute('role','status');const list=el('div');
  let adminRead=0;
  async function refresh(){
   const stamp=++adminRead,owner=member();
   list.replaceChildren();
   try{const data=await call('adminSpecialRewardAction',{action:'overview'});if(stamp!==adminRead||owner!==member())return;list.replaceChildren();
    const time=value=>value?new Date(value).toLocaleString('ko-KR'):'기록 없음';
    list.append(el('p',`조회 ${time(data.checkedAt)} · 종료 기록 ${data.historyStatus==='partial'?'최근 100건 · 일부 조회':'조회 완료'}`));
    const archive=el('details'),heading=el('summary','종료된 특별 보상');archive.append(heading);
    for(const item of data.items){
     const row=el('article'),statusLabel={complete:'조회 완료',partial:'일부 조회',failed:'조회 실패'};
     row.append(el('strong',item.title),el('p',`${item.mode==='cooperative'?'협동 · 목표 '+item.target+'명':'개인'} · XP ${item.xpReward} / DJ코인 ${item.rewardCoin}`),
      el('p',`참여 ${item.participants ?? '-'}명 · 수령 ${item.claimed ?? '-'}명 · 실제 지급 ${item.paidCoin ?? '-'}코인 / ${item.paidXp ?? '-'} XP · ${statusLabel[item.statsStatus]}`),
      el('p',`게시 ${item.createdBy || '기록 없음'} · ${time(item.createdAt)}`));
     if(item.active){const close=el('button','종료');close.type='button';
      close.onclick=async()=>{if(!window.confirm('이 특별 보상을 종료할까요? 종료하면 아직 받지 않은 보상도 수령할 수 없습니다.'))return;close.disabled=true;try{await call('adminSpecialRewardAction',{action:'close',id:item.id});await refresh();}catch(e){status.textContent=e.message;close.disabled=false;}};row.append(close);list.append(row);
     }else{row.append(el('p',`종료 ${item.closedBy || '기록 없음'} · ${time(item.closedAt)}`));archive.append(row);}
    }
    list.append(archive);
   }catch(e){if(stamp!==adminRead||owner!==member())return;list.replaceChildren();status.textContent='보상 현황을 불러오지 못했습니다. '+e.message;}
  }

  let publishId=null;
  form.oninput=()=>publishId=null;
  form.onsubmit=async event=>{
   event.preventDefault();if(!form.reportValidity())return;
   if(!window.confirm('미션을 완료한 학생에게 XP '+fields.xpReward.value+' / DJ코인 '+fields.rewardCoin.value+'을 지급하는 보상을 게시할까요?'))return;
   publish.disabled=true;publishId ||= crypto.randomUUID();
   try{await call('adminSpecialRewardAction',{action:'publish',id:publishId,title:fields.title.value,instruction:fields.instruction.value,mode:mode.value,target:Number(fields.target.value),rewardCoin:Number(fields.rewardCoin.value),xpReward:Number(fields.xpReward.value)});status.textContent='특별 보상을 게시했어요.';await refresh();}
   catch(e){status.textContent=e.message;}finally{publish.disabled=false;}
  };
  section.append(intro,form,status,list);dashboard.append(section);section.addEventListener('toggle',()=>{if(section.open)refresh();});
 }
 window.DJ48SpecialRewards={load};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();