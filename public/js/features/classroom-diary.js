(function(root) {
  'use strict';
  let active = null;
  const moods = [['happy','☀','기뻐요'],['excited','★','설레요'],['calm','❧','편안해요'],['tired','☾','피곤해요'],['sad','☂','슬퍼요'],['upset','☁','속상해요']];
  const el = (tag, cls, text) => {const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button = (text, fn, cls='') => {const n=el('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;};
  function moodPicture(value) {
    const shapes={
      happy:'<g stroke="#edbd3a" stroke-width="5" stroke-linecap="round"><path d="M32 3v6M32 55v6M3 32h6M55 32h6M11 11l4 4M49 49l4 4M11 53l4-4M49 15l4-4"/></g><circle cx="32" cy="32" r="21" fill="#ffdc63"/>',
      excited:'<path d="M32 5 41 23 61 26 46 40 50 60 32 50 14 60 18 40 3 26 23 23Z" fill="#ffb79a"/>',
      calm:'<path d="M55 7Q6 8 8 40Q12 66 38 52Q59 40 55 7Z" fill="#8bd3af"/><path d="M12 55 43 24" stroke="#5baf89" stroke-width="3"/>',
      tired:'<path d="M42 5A28 28 0 1 0 59 44A25 25 0 0 1 42 5" fill="#c9a7ed"/><path d="M43 13h10l-10 9h10" fill="none" stroke="#8c6ab5" stroke-width="2"/>',
      sad:'<path d="M32 3C24 19 9 29 9 42A23 23 0 0 0 55 42C55 29 40 19 32 3Z" fill="#84c9ee"/>',
      upset:'<path d="M15 51A15 15 0 0 1 13 22A20 20 0 0 1 51 21A16 16 0 0 1 51 53Z" fill="#f4a093"/>'
    };
    const wrap=el('span','diary-mood-picture');
    // Fixed SVG artwork only; no diary, profile or user text is interpolated.
    const face=value==='calm'||value==='tired'
      ? '<path d="M19 34q4 4 8 0m9 0q4 4 8 0" fill="none" stroke="#514959" stroke-width="2.5" stroke-linecap="round"/>'
      : '<ellipse cx="24" cy="32" rx="2.4" ry="3" fill="#514959"/><ellipse cx="40" cy="32" rx="2.4" ry="3" fill="#514959"/>';
    const mouth=['sad','upset'].includes(value)?'M26 44q6-7 12 0':'M26 40q6 8 12 0';
    wrap.innerHTML=`<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${shapes[value]}${face}<path d="${mouth}" fill="none" stroke="#514959" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    return wrap;
  }
  function close() { active?.dispose(); }
  async function open(deps, options={}) {
    if(active) return;
    const member=deps.getMemberUserId(), uid=deps.getAuthUid();
    if(!member || !uid) return;
    const opener=document.activeElement, dialog=el('dialog','classroom-diary-dialog');
    dialog.setAttribute('aria-labelledby','classroom-diary-heading');
    dialog.innerHTML=`<header class="diary-heading"><span class="diary-author-face"></span><div><h2 id="classroom-diary-heading">마음 일기</h2><p>오늘의 마음을 기록하고 친구와 이야기를 나눠요.</p></div><button type="button" data-close aria-label="일기 닫기">×</button></header>
      <div class="diary-toolbar"><div class="diary-tabs"><button type="button" data-mine>내 일기</button><button type="button" data-friends>친구 일기</button></div><label>날짜 <input type="date" data-date aria-label="일기 날짜"></label><button type="button" data-refresh>다시 불러오기</button></div>
      <p class="diary-status" role="status" aria-live="polite"></p><div class="diary-discard" hidden><span>저장하지 않은 내용이 있어요.</span><button type="button" data-keep>계속 쓰기</button><button type="button" data-discard>수정 취소하고 이동</button></div>
      <section class="diary-friends" aria-label="우리반 공개 일기" hidden></section>
      <div class="diary-body"><section class="diary-entry"><fieldset class="diary-moods"><legend>오늘의 기분</legend></fieldset>
      <label class="diary-text-label" for="classroom-diary-text">오늘의 이야기</label><textarea id="classroom-diary-text" maxlength="1000" rows="7" placeholder="오늘 있었던 일과 느낀 점을 적어 보세요."></textarea><small class="diary-count"></small>
      <fieldset class="diary-visibility"><legend>공개 범위</legend><label><input type="radio" name="diary-visibility" value="private">나만 보기</label><label><input type="radio" name="diary-visibility" value="class">우리반 공개</label></fieldset>
      <p class="diary-sharing-help"></p><div class="diary-entry-actions"><button type="button" data-delete>일기 삭제</button><button type="button" data-moderate hidden>공개 글 숨기기</button><button type="button" data-save class="diary-primary">일기 저장</button></div></section>
      <section class="diary-comments"><h3>친구들의 댓글 <span data-comment-count></span></h3><div class="diary-comment-list"></div><form class="diary-comment-form"><label for="classroom-diary-comment">서로에게 힘이 되는 말을 남겨요.</label><textarea id="classroom-diary-comment" maxlength="300" rows="3" placeholder="친구에게 따뜻한 댓글을 남겨요."></textarea><button class="diary-primary" type="submit">댓글 등록</button></form></section></div>`;
    const $=selector=>dialog.querySelector(selector), status=$('[role="status"]'), date=$('[data-date]'), content=$('#classroom-diary-text'), commentInput=$('#classroom-diary-comment');
    let owner=options.ownerId || member, dateKey=deps.today(), current=null, busy=false, ready=false, dirty=false, commentDirty=false, mood='', mode=options.mode==='friends'?'friends':'mine', sequence=0, pendingNavigation=null;
    let commentRequest=null, editingComment=false;
    const scope=()=>active?.dialog===dialog && deps.getMemberUserId()===member && deps.getAuthUid()===uid;
    const assertScope=()=>{if(!scope())throw Error('로그인 계정이 바뀌었어요. 창을 다시 열어 주세요.');};
    const session={dialog,dispose(){sequence++;dialog.close();dialog.remove();if(active===session)active=null;if(opener?.isConnected)opener.focus();}};active=session;
    const call=async payload=>{assertScope();const result=await deps.call({classId:deps.classId,memberUserId:member,dateKey,ownerId:owner,...payload});assertScope();return result;};
    function message(error) {
      const code=String(error?.code||'');
      if(/not-found|unimplemented/.test(code))return '일기 서비스를 아직 사용할 수 없어요. 선생님께 알려 주세요.';
      return error?.message || '불러오지 못했어요. 다시 시도해 주세요.';
    }
    function controls() {
      const own=owner===member, enabled=ready&&!busy;
      dialog.querySelectorAll('button,input,textarea').forEach(n=>{n.disabled=busy;});
      $('[data-close]').disabled=false;
      const commentDraft=commentDirty||editingComment;
      content.disabled=!enabled||!own||commentDraft;
      $('.diary-moods').disabled=!enabled||!own||commentDraft;
      $('.diary-visibility').disabled=!enabled||!own||commentDraft;
      $('[data-save]').hidden=!own; $('[data-delete]').hidden=!own;
      $('[data-save]').disabled=!enabled||!dirty||!mood||!content.value.trim()||commentDraft;
      $('[data-delete]').disabled=!enabled||!current?.entry.text||commentDraft;
      dialog.querySelectorAll('.diary-comment-actions button').forEach(n=>{n.disabled=!enabled||dirty||commentDraft;});
      $('[data-moderate]').hidden=!current?.isTeacher||current?.entry.visibility!=='class';
      $('[data-moderate]').disabled=!enabled||!current?.entry.text;
      const mayComment=enabled&&current?.entry.visibility==='class'&&!!current?.entry.text&&!current?.entry.hidden&&!dirty&&!editingComment;
      commentInput.disabled=!mayComment;
      $('.diary-comment-form button').disabled=!mayComment||!commentInput.value.trim();
      $('.diary-count').textContent=`${content.value.length}/1000자`;
      $('.diary-sharing-help').textContent=current?.entry.hidden ? '선생님이 숨긴 일기입니다. 본인과 선생님만 확인할 수 있어요.'
        : commentDraft ? '작성 중인 댓글을 마치면 일기를 수정할 수 있어요.'
        : dirty ? '수정 중이에요. 일기를 저장한 뒤 댓글을 남겨 주세요.'
        : current?.entry.visibility==='class' ? '우리반 친구들이 읽고 댓글을 남길 수 있어요.' : '나만 볼 수 있어요. 우리반에 공개하면 댓글을 받을 수 있어요.';
      $('[data-mine]').setAttribute('aria-pressed',String(mode==='mine'));
      $('[data-friends]').setAttribute('aria-pressed',String(mode==='friends'));
      $('[data-moderate]').textContent=current?.entry.hidden?'공개 글 다시 표시':'공개 글 숨기기';
    }
    function navigate(fn) {
      if(busy)return;
      if(dirty||commentDirty){pendingNavigation=fn;$('.diary-discard span').textContent='저장하지 않은 내용이 있어요.';$('[data-discard]').textContent='수정 취소하고 이동';$('.diary-discard').hidden=false;$('[data-keep]').focus();return;}
      fn();
    }
    $('[data-keep]').onclick=()=>{pendingNavigation=null;$('.diary-discard').hidden=true;};
    $('[data-discard]').onclick=()=>{const fn=pendingNavigation;pendingNavigation=null;dirty=false;commentDirty=false;commentInput.value='';commentRequest=null;$('.diary-discard').hidden=true;fn?.();};
    const requestClose=()=>{if(!busy)navigate(()=>session.dispose());};
    $('[data-close]').onclick=requestClose;
    dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
    dialog.addEventListener('close',()=>{if(dialog.isConnected)session.dispose();},{once:true});
    for(const [value,symbol,label] of moods){
      const b=button('',()=>{mood=value;dirty=true;renderMoods();controls();});b.dataset.mood=value;
      b.append(moodPicture(value),el('strong','',label));$('.diary-moods').append(b);
    }
    function renderMoods(){dialog.querySelectorAll('[data-mood]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mood===mood)));}
    content.addEventListener('input',()=>{dirty=true;controls();});
    $('.diary-visibility').addEventListener('change',()=>{dirty=true;controls();});
    commentInput.addEventListener('input',()=>{commentDirty=!!commentInput.value;commentRequest=null;controls();});
    const face=(target,author)=>root.DJ48ClassroomRender.fillClassroomPortrait(target,author,{normalizeDisplayImageUrl:deps.normalizeDisplayImageUrl});
    async function load() {
      const request=++sequence;busy=true;ready=false;status.textContent='일기를 불러오는 중…';controls();
      try {
        const result=await call({action:'read'});if(request!==sequence)return;
        current=result;ready=true;dirty=false;commentDirty=false;editingComment=false;commentRequest=null;commentInput.value='';
        content.value=result.entry.text; mood=result.entry.mood;date.value=dateKey;
        dialog.querySelectorAll('[name="diary-visibility"]').forEach(n=>{n.checked=n.value===result.entry.visibility;});
        const authorFace=$('.diary-author-face');authorFace.replaceChildren();face(authorFace,result.author);
        $('#classroom-diary-heading').textContent=`${result.author.nickname || '나'}의 마음 일기`;
        renderMoods();renderComments();status.textContent='';
      } catch(error){if(scope()&&request===sequence){status.textContent=message(error);current=null;content.value='';$('.diary-comment-list').replaceChildren();}}
      finally{if(scope()&&request===sequence){busy=false;controls();}}
    }
    async function mutate(payload,success) {
      if(busy||!ready)return;
      busy=true;status.textContent='저장 중…';controls();let saved=false;
      try{await call(payload);saved=true;dirty=false;commentDirty=false;await load();if(ready)status.textContent=success;else status.textContent=`${success} 다시 불러오기를 눌러 확인해 주세요.`;}
      catch(error){if(scope())status.textContent=(saved?`${success} `:'')+message(error);}
      finally{if(scope()){busy=false;controls();}}
    }
    $('[data-save]').onclick=()=>mutate({action:'save',text:content.value,mood,visibility:$('[name="diary-visibility"]:checked')?.value || 'private',revision:current.entry.revision},'일기를 저장했어요.');
    $('[data-delete]').onclick=()=>{
      pendingNavigation=()=>mutate({action:'delete',revision:current.entry.revision},'일기를 삭제했어요.');
      $('.diary-discard span').textContent='이 일기를 삭제할까요? 삭제 후에는 친구들에게도 보이지 않아요.';
      $('[data-discard]').textContent='일기 삭제';$('.diary-discard').hidden=false;
    };
    $('[data-moderate]').onclick=()=>navigate(()=>mutate({action:'moderate',revision:current.entry.revision},'공개 상태를 변경했어요.'));
    $('.diary-comment-form').onsubmit=e=>{
      e.preventDefault();if(busy||dirty||!commentInput.value.trim())return;
      commentRequest ||= crypto.randomUUID();
      mutate({action:'comment',commentId:commentRequest,text:commentInput.value},'댓글을 등록했어요.');
    };
    function renderComments(){
      const list=$('.diary-comment-list');list.replaceChildren();$('[data-comment-count]').textContent=String(current.comments.length);
      for(const comment of current.comments){
        const item=el('article','diary-comment');const portrait=el('span','diary-comment-avatar');face(portrait,comment.author);
        const body=el('div','diary-comment-copy');body.append(el('strong','',comment.author.nickname),el('p','',comment.text));
        if(comment.hidden)body.append(el('small','','선생님이 숨긴 댓글'));
        const actions=el('div','diary-comment-actions');
        if(comment.memberUserId===member){
          actions.append(button('수정',()=>{
            if(dirty||busy||commentDirty||editingComment)return;
            editingComment=true;
            const edit=el('textarea','');edit.maxLength=300;edit.value=comment.text;edit.setAttribute('aria-label','댓글 수정');
            edit.addEventListener('input',()=>{commentDirty=true;controls();});
            body.replaceChildren(edit,button('수정 저장',()=>mutate({action:'editComment',commentId:comment.id,text:edit.value,revision:comment.revision},'댓글을 수정했어요.')),
              button('취소',()=>{commentDirty=false;editingComment=false;renderComments();controls();}));controls();edit.focus();
          }),button('삭제',()=>{
            if(dirty||busy){status.textContent='일기를 먼저 저장해 주세요.';return;}
            pendingNavigation=()=>mutate({action:'deleteComment',commentId:comment.id,revision:comment.revision},'댓글을 삭제했어요.');
            $('.diary-discard span').textContent='이 댓글을 삭제할까요?';$('[data-discard]').textContent='댓글 삭제';$('.diary-discard').hidden=false;
          }));
        }
        if(current.isTeacher)actions.append(button(comment.hidden?'다시 표시':'숨기기',()=>navigate(()=>mutate({action:'moderateComment',commentId:comment.id,revision:comment.revision},'댓글 공개 상태를 변경했어요.'))));
        body.append(actions);item.append(portrait,body);list.append(item);
      }
      if(!current.comments.length)list.append(el('p','diary-empty',current.entry.visibility==='class'?'아직 댓글이 없어요. 따뜻한 첫마디를 남겨 보세요.':'나만 보는 일기에는 댓글이 표시되지 않아요.'));
    }
    async function friends(){
      mode='friends';owner=member;ready=false;current=null;$('.diary-body').hidden=true;$('.diary-friends').hidden=false;
      const list=$('.diary-friends');list.replaceChildren();busy=true;status.textContent='우리반 공개 일기를 불러오는 중…';controls();const request=++sequence;
      try{
        const result=await call({action:'list'});if(request!==sequence)return;
        for(const row of result.entries){
          const b=button('',()=>navigate(()=>{owner=row.ownerId;$('.diary-body').hidden=false;$('.diary-friends').hidden=true;load();}),'diary-friend-entry');
          const portrait=el('span','diary-friend-avatar');face(portrait,row.author);
          b.append(portrait,el('strong','',row.author.nickname),el('span','',row.excerpt),el('small','',row.hidden?'숨긴 일기':'우리반 공개'));list.append(b);
        }
        if(!result.entries.length)list.append(el('p','diary-empty','이 날짜에 공개된 우리반 일기가 없어요. 다른 날짜도 살펴보세요.'));
        status.textContent=result.truncated?'일기가 많아 일부만 표시했어요.':'';
      }catch(error){if(scope())status.textContent=message(error);}
      finally{if(scope()&&request===sequence){busy=false;controls();}}
    }
    const mine=()=>{mode='mine';owner=member;$('.diary-body').hidden=false;$('.diary-friends').hidden=true;load();};
    $('[data-mine]').onclick=()=>navigate(mine);$('[data-friends]').onclick=()=>navigate(friends);
    $('[data-refresh]').onclick=()=>navigate(()=>mode==='friends'&&$('.diary-body').hidden?friends():load());
    date.value=dateKey;date.max=deps.today();date.min='2020-01-01';
    date.onchange=()=>{const next=date.value;date.value=dateKey;if(!next||next>deps.today()||next<'2020-01-01')return;navigate(()=>{dateKey=next;date.value=next;mode==='friends'&&$('.diary-body').hidden?friends():load();});};
    document.body.append(dialog);dialog.showModal();controls();
    if(mode==='friends')await friends();else await load();
  }
  root.DJ48ClassroomDiary={open,close};
})(window);
