(function(){
  'use strict';
  const U=FWUI,M=FWMath;let callback=null,field='num',answer={whole:'0',num:''},solved=false;
  function session(){return FWStore.get().quiz;}
  function start(mode,count,title,done){
    const p=FWStore.get();if(!p.quiz||p.quiz.mode!==mode)p.quiz={mode,count,title,index:0,question:null,tries:0};
    callback=done;if(!U.$('quiz-dialog').open)U.$('quiz-dialog').showModal();next();
  }
  function next(){const s=session();if(s.index>=s.count){const done=callback;FWStore.get().quiz=null;U.save();U.$('quiz-dialog').close();callback=null;done?.();return;}
    if(!s.question){s.question=M.generate(M.pickKind(FWStore.get().settings.level,FWStore.get().stats));s.tries=0;U.save();}
    solved=false;answer={whole:'0',num:''};field='num';render();
  }
  function render(){const s=session(),q=s.question;
    U.$('quiz-content').innerHTML=`<div class="quiz-head"><span class="eyebrow" style="margin:0">FRACTION LAB</span><button class="quiet" id="quiz-exit">잠시 닫기</button></div><h2 id="quiz-title">${U.esc(s.title)}</h2><div class="row between"><small>${M.kinds[q.kind]} · ${s.index+1} / ${s.count}</small><div class="quiz-dots">${Array.from({length:s.count},(_,i)=>`<i class="${i<s.index?'done':''}"></i>`).join('')}</div></div><div class="quiz-layout"><div><div class="equation">${U.fraction(q.a,q.d)}<span>${q.op}</span>${U.fraction(q.b,q.d)}<span>=</span><span>?</span></div><div class="answer-row"><div class="answer-box"><small>자연수</small><button id="answer-whole" aria-label="답 자연수">0</button></div><div class="answer-box"><small>분자</small><button id="answer-num" class="active" aria-label="답 분자">?</button><div class="answer-den">${q.d}</div></div></div><div class="fine" style="text-align:center">자연수가 없으면 0 · 가분수로 입력해도 돼요</div><div id="quiz-feedback" class="quiz-feedback" role="status" aria-live="polite"></div><div id="quiz-hint"></div></div><div><div class="keypad">${[1,2,3,4,5,6,7,8,9,'칸 이동',0,'⌫'].map(k=>`<button data-key="${k}">${k}</button>`).join('')}</div><div class="row" style="margin-top:12px"><button id="hint-button" class="quiet">그림 힌트</button><button id="answer-submit" class="primary" style="flex:1">확인 ↵</button></div></div></div>`;
    U.$('quiz-exit').onclick=()=>{U.save();U.$('quiz-dialog').close();};
    U.$('answer-whole').onclick=()=>setField('whole');U.$('answer-num').onclick=()=>setField('num');
    U.$('quiz-content').querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>key(b.dataset.key));
    U.$('hint-button').onclick=hint;U.$('answer-submit').onclick=submit;
  }
  function setField(f){field=f;for(const k of ['whole','num'])U.$('answer-'+k).classList.toggle('active',k===f);}
  function key(k){if(solved)return;if(k==='칸 이동'){setField(field==='num'?'whole':'num');return;}if(k==='⌫')answer[field]=answer[field].slice(0,-1);else if(answer[field].length<3)answer[field]=(answer[field]==='0'?'':answer[field])+k;U.$('answer-'+field).textContent=answer[field]||'?';}
  function hint(){const q=session().question;let bars='';for(let unit=0;unit<Math.ceil(q.a/q.d);unit++)bars+=`<span class="bar-unit">${Array.from({length:q.d},(_,i)=>`<i class="${unit*q.d+i<q.a?'filled':''}"></i>`).join('')}</span>`;U.$('quiz-hint').innerHTML=`<p class="fine">${M.hint(q)}</p><small>처음 양 ${M.plain(q.a,q.d)}</small><div class="fraction-bars">${bars}</div>`;}
  function submit(){
    if(solved){next();return;}
    if(answer.num===''){U.$('quiz-feedback').textContent='분자 칸에 답을 입력해 주세요. 정수라면 분자는 0이에요.';return;}
    const s=session(),q=s.question,p=FWStore.get(),stat=p.stats[q.kind];
    if(s.tries===0)stat.attempts++;s.tries++;
    if(M.matches(q,answer.whole||'0',answer.num)){
      if(s.tries===1)stat.first++;stat.solved++;p.total++;s.index++;s.question=null;solved=true;
      U.sound('good');U.$('quiz-feedback').className='quiz-feedback ok';U.$('quiz-feedback').textContent=`정답! ${M.plain(q.n,q.d)}이에요.`;U.$('answer-submit').textContent=s.index>=s.count?'충전 완료 →':'다음 문제 →';
      U.$('hint-button').disabled=true;U.$('quiz-hint').innerHTML='';
    }else{U.sound('wrong');U.$('quiz-feedback').textContent='다시 생각해 볼까요? 분모는 그대로 두고, 자연수와 분자를 확인해요.';if(s.tries>=2)hint();answer.num='';U.$('answer-num').textContent='?';setField('num');}
    U.save();
  }
  U.$('quiz-dialog').addEventListener('cancel',()=>U.save());
  document.addEventListener('keydown',e=>{if(!U.$('quiz-dialog').open)return;if(/^\d$/.test(e.key)){e.preventDefault();key(e.key);}else if(e.key==='Backspace'){e.preventDefault();key('⌫');}else if(e.key==='Enter'){e.preventDefault();submit();}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();key('칸 이동');}});
  window.FWQuiz={start};
})();
