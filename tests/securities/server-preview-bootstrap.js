(function(){
 document.querySelectorAll('.app-view').forEach(v=>v.hidden=v.id!=='classroom-view');
 const view=document.getElementById('classroom-view');view.style.display='block';view.style.maxWidth='1180px';view.style.margin='auto';
 DJ48ClassroomForm.setClassroomUnlocked(true);
 const controls=document.createElement('div');controls.className='sec-preview-controls';
 controls.innerHTML='<strong>서버 연습 검토 · 합성 데이터 · 2026-10-16 10:00 KST 고정</strong> <label>계정 <select id="server-preview-role"><option value="sec-a">합성 학생 A</option><option value="sec-b">합성 학생 B</option><option value="sec-teacher">합성 선생님</option></select></label>';
 view.before(controls);let member='sec-a';
 window.DJ48SecuritiesTransport=async(method,payload)=>{
  const response=await fetch('/api/securities',{method:'POST',headers:{'Content-Type':'application/json','X-Securities-Demo':'1','X-Securities-Member':payload.memberUserId},body:JSON.stringify({method,payload})});
  const data=await response.json();if(data.error)throw Object.assign(new Error(data.error.message),{code:data.error.code,details:data.error.details});return data.result;
 };
 if(window.SECURITIES_DEMO_PRODUCTION)window.firebase={app:()=>({functions:()=>({httpsCallable:name=>async payload=>({data:await window.DJ48SecuritiesTransport({classroomSecuritiesQuery:'query',classroomSecuritiesAction:'action',classroomSecuritiesAdminAction:'admin'}[name],payload)})})})};
 function configure(){const teacher=member==='sec-teacher';view.dataset.classroomRole=teacher?'teacher':'student';DJ48ClassroomWorkspace.render({settings:{classId:SECURITIES_DEMO_CLASS},economyBoard:{}},{activeTab:'securities',currentMemberUserId:member,isCurrentClassroomTeacher:()=>teacher});DJ48ClassroomForm.setActiveClassroomTab(view.dataset.activeTab||'market');}
 document.getElementById('server-preview-role').onchange=e=>{DJ48ClassroomState.resetClassroomRuntimeData();member=e.target.value;configure();};
 DJ48ClassroomController.bindClassroomEvents({setActiveClassroomTab:DJ48ClassroomForm.setActiveClassroomTab});configure();
})();
