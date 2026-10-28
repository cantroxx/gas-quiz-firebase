(function () {
  'use strict';
  const $ = s => document.querySelector(s), net = window.SpaceNet;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const label = r => `${r.school} ${r.grade}학년 ${r.classNo}반`;
  let cursors = [null], page = 0, nextCursor = null, pending = null, busy = false;
  if (net.emulator) $('#game-link').href = './?emulator=1';
  function status(message) { $('#admin-status').textContent = message; }
  async function load(reset = false) {
    if (busy) return; busy = true; $('#refresh').disabled = true; $('#list-panel').setAttribute('aria-busy', 'true');
    if (reset) { cursors = [null]; page = 0; }
    try {
      const result = await net.adminRequest('adminList', { cursor: cursors[page] }); nextCursor = result.nextCursor;
      $('#login-panel').hidden = true; $('#list-panel').hidden = false;
      $('#rooms').innerHTML = result.rooms.length ? result.rooms.map(r => `<article class="admin-room"><div><h3>${esc(label(r))}</h3><p>${new Date(r.createdAt).toLocaleString('ko-KR')} 개설 · 1~${r.lastNumber}번</p><small>회차 ${esc(r.id)}</small></div><span class="admin-room-state">${r.status === 'closed' ? '종료' : r.status === 'graded' ? '채점 완료' : r.expired ? '시간 만료' : '평가 진행 중'}</span><button class="inspect-room" data-inspect="${esc(r.id)}">현황 · 결과</button><button class="delete-room" data-room="${esc(r.id)}">학급 삭제</button></article>`).join('') : '<p class="muted">이 페이지에 평가 회차가 없습니다.</p>';
      $('#page-number').textContent = `${page + 1}페이지`; $('#previous').disabled = page === 0; $('#next').disabled = !nextCursor;
      status(`퀴즈타운 총관리자 연결 완료 · 현재 페이지 ${result.rooms.length}개 회차`);
    } catch (e) { $('#rooms').replaceChildren(); $('#list-panel').hidden = true; $('#login-panel').hidden = !['unauthenticated', 'permission-denied'].includes(e.code); status(e.message); }
    finally { busy = false; $('#refresh').disabled = false; $('#list-panel').removeAttribute('aria-busy'); }
  }
  $('#refresh').addEventListener('click', () => load(true));
  $('#previous').addEventListener('click', () => { if (!busy && page > 0) { page--; load(); } });
  $('#next').addEventListener('click', () => { if (!busy && nextCursor) { cursors[++page] = nextCursor; load(); } });
  $('#close-detail').onclick=()=>$('#detail-dialog').close();
  $('#rooms').addEventListener('click',async e=>{
    const b=e.target.closest('[data-inspect]');if(!b||busy)return;busy=true;b.disabled=true;
    try{const d=await net.adminRequest('adminInspect',{roomId:b.dataset.inspect});$('#detail-title').textContent=label(d.room);
      $('#detail-body').innerHTML=`<p>입장 ${d.studentCount}명 · 제출 ${d.submittedCount}명 · 저장 답안 ${d.answerCount}개</p>`+
        `<div class="student-progress">${d.students.map(s=>`<span>${s.number}번 · ${s.answered}/${d.questionCount}문항 · ${s.submitted?'최종 제출':'진행 중'}</span>`).join('')}</div>`+
        (d.report?`<h3>채점 결과</h3><p>자동 채점 ${d.report.automaticTotal}문항${d.report.manualTotal?' · 기존 회차 서술형은 교사 확인':''}</p>`+d.report.students.map(s=>`<details class="student-result"><summary>${s.number}번 · ${s.correct}/${d.report.automaticTotal}점<small>문항별 답안 펼치기</small></summary><div class="table-scroll"><table><thead><tr><th>문항</th><th>채점</th><th>학생 답안</th></tr></thead><tbody>${s.items.map(i=>`<tr><td>${esc(i.title)}</td><td>${i.manual?'교사 확인':i.correct?'정답':'오답/미응답'}</td><td>${esc(i.responseText)}</td></tr>`).join('')}</tbody></table></div></details>`).join(''):'<p>아직 채점 결과가 없습니다.</p>');$('#detail-dialog').showModal();
    }catch(err){status(err.message);}finally{busy=false;b.disabled=false;}
  });
  $('#rooms').addEventListener('click', async e => {
    const button = e.target.closest('[data-room]'); if (!button || busy) return;
    busy = true; button.disabled = true;
    try {
      pending = await net.adminRequest('adminInspect', { roomId: button.dataset.room });
      $('#delete-title').textContent = label(pending.room);
      $('#delete-detail').textContent = `회차 ${pending.room.id} · 입장 ${pending.studentCount}명 · 제출 ${pending.submittedCount}명 · 저장 답안 ${pending.answerCount}개 · 채점 결과 ${pending.hasReport ? '있음' : '없음'}`;
      $('#delete-label').textContent = label(pending.room); $('#delete-input').value = ''; $('#delete-error').textContent = ''; $('#confirm-delete').disabled = true;
      $('#delete-dialog').showModal(); $('#delete-input').focus();
    } catch (e) { status(e.message); } finally { busy = false; button.disabled = false; }
  });
  $('#delete-input').addEventListener('input', () => { $('#confirm-delete').disabled = !pending || $('#delete-input').value !== label(pending.room); });
  $('#cancel-delete').addEventListener('click', () => { if (!busy) $('#delete-dialog').close(); });
  $('#delete-dialog').addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  $('#delete-dialog form').addEventListener('submit', e => e.preventDefault());
  $('#confirm-delete').addEventListener('click', async () => {
    if (busy || !pending || $('#delete-input').value !== label(pending.room)) return;
    busy = true; $('#delete-dialog').setAttribute('aria-busy', 'true'); $('#confirm-delete').disabled = true; $('#cancel-delete').disabled = true;
    try {
      await net.adminRequest('adminDelete', { roomId: pending.room.id, confirmation: pending.room.id, confirmationVersion: pending.confirmationVersion });
      pending = null; $('#delete-dialog').close(); busy = false; await load(true); status('선택한 평가 회차와 학생 답안·결과를 삭제했습니다.');
    } catch (e) {
      $('#delete-error').textContent = e.message;
      // Keep the dialog open after a changed-data conflict. Reopen to inspect fresh counts.
    } finally { busy = false; $('#delete-dialog').removeAttribute('aria-busy'); $('#cancel-delete').disabled = false; $('#confirm-delete').disabled = !pending || $('#delete-input').value !== label(pending.room); }
  });
  load();
})();
