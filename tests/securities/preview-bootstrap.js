/* Synthetic-only preview: no Firebase SDK, app bootstrap, or real identities. */
(function() {
  document.querySelectorAll('.app-view').forEach(v=>{v.hidden=v.id!=='classroom-view';});
  document.getElementById('classroom-view').style.display='block';
  document.getElementById('classroom-view').style.maxWidth='1180px';
  document.getElementById('classroom-view').style.margin='auto';
  DJ48ClassroomForm.setClassroomUnlocked(true);
  const controls=document.createElement('div');controls.className='sec-preview-controls';
  controls.innerHTML='<strong>로컬 검토 · 모든 데이터는 가상 예시</strong> <label>역할 <select id="preview-role"><option value="student">학생</option><option value="teacher">선생님</option></select></label> <label>시장 상태 <select id="preview-session"><option value="open">거래 중</option><option value="preopen">개장 전</option><option value="closed">장 마감</option><option value="holiday">휴장</option><option value="error">시세 준비 실패</option></select></label> <button id="preview-reset">다른 합성 계정으로 전환</button>';
  document.getElementById('classroom-view').before(controls);
  let member='synthetic-1';
  function configure() {
    const teacher=document.getElementById('preview-role').value==='teacher';
    document.getElementById('classroom-view').dataset.classroomRole=teacher?'teacher':'student';
    DJ48ClassroomWorkspace.render({settings:{classId:'demo-securities'},economyBoard:{}},{activeTab:'securities',currentMemberUserId:member,isCurrentClassroomTeacher:()=>teacher});
    DJ48ClassroomForm.setActiveClassroomTab(document.getElementById('classroom-view').dataset.activeTab || 'market');
  }
  document.getElementById('preview-role').onchange=configure;
  document.getElementById('preview-reset').onclick=()=>{DJ48ClassroomState.resetClassroomRuntimeData();member=crypto.randomUUID();configure();};
  document.getElementById('preview-session').onchange=event=>{const s=DJ48SecuritiesState.get();if(s){DJ48Securities.closeOrder();s.market.session=event.target.value;DJ48Securities.enter();}};
  DJ48ClassroomController.bindClassroomEvents({setActiveClassroomTab:DJ48ClassroomForm.setActiveClassroomTab});
  configure();
})();
