(function () {
  'use strict';
  const parentWindow=window.parent,memberId=parentWindow!==window&&parentWindow.DJ48AccountState?.getCurrentMemberUserId(),functions=parentWindow!==window&&parentWindow.DJ48Firebase?.getFirebaseFunctions();
  if(!memberId||!functions){document.body.replaceChildren();const p=document.createElement('p');p.textContent='퀴즈타운에 로그인한 뒤 상점에서 열어주세요.';document.body.append(p);return;}
  let pending=null;
  function assertSession(){if(parentWindow.DJ48AccountState?.getCurrentMemberUserId()!==memberId)throw Error('로그인 계정이 바뀌었어요. 상점을 다시 열어주세요.');}
  window.DJ48CoordiBridge={
    assertSession,
    async render(look){assertSession();const response=await functions.httpsCallable('renderCoordiShopPreview')({look});assertSession();return response.data;},
    async status(){assertSession();return (await functions.httpsCallable('coordiShopAction')({action:'status'})).data;},
    async transact(payload){assertSession();const key=JSON.stringify(payload);if(!pending||pending.key!==key)pending={key,requestId:crypto.randomUUID()};const response=await functions.httpsCallable('coordiShopAction')({...payload,requestId:pending.requestId});pending=null;assertSession();if(response.data?.success && ['equip','dye'].includes(payload.action))parentWindow.DJ48TownAvatar?.refresh(true)?.catch(()=>{});return response.data;}
  };
  const script=document.createElement('script');script.src='/coordi-shop/dressing-room.js?v=renderer-boundary-20261028';document.body.append(script);
})();
