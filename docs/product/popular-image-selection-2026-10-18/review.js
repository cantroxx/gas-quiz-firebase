'use strict';
(() => {
  const {rows, summary} = window.POPULAR_REVIEW;
  const $ = id => document.getElementById(id);
  const kindLabel = {person:'개인 이름', group:'그룹 이름', character:'캐릭터 이름'};
  const normalize = text => text.normalize('NFKC').toLocaleLowerCase().replace(/[\s·・._\-]/g, '');
  const shuffle = list => {
    const result = [...list];
    for (let i=result.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
    return result;
  };
  const node = (tag, text, className) => {
    const el=document.createElement(tag); if(text!==undefined)el.textContent=text; if(className)el.className=className; return el;
  };
  const link = (label, url) => { const a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a; };
  function art(row) {
    const p=row.preview,el=node('div',undefined,'thumb');
    el.style.width=`${p.width}px`;el.style.height=`${p.height}px`;
    el.style.backgroundImage=`url("${p.sheet}")`;el.style.backgroundPosition=`-${p.x}px -${p.y}px`;
    el.setAttribute('role','img');el.setAttribute('aria-label','퀴즈 사진');return el;
  }
  for(const [count,label] of [[summary.idolIndividuals,'개인'],[summary.idolGroupQuestions,'그룹'],[summary.selected.anime,'캐릭터'],[summary.animeWorks,'애니 작품']]) {
    const stat=node('div',undefined,'stat');stat.append(node('b',String(count)),node('span',label));$('stats').append(stat);
  }
  let page=0;
  function renderCatalog() {
    const kind=$('filter').value,q=normalize($('search').value);
    const filtered=rows.filter(r=>(kind==='all'||r.questionKind===kind)&&normalize([r.answer,r.sourceName,r.groupLabel,...r.aliases].join(' ')).includes(q));
    const pages=Math.max(1,Math.ceil(filtered.length/24));page=Math.min(page,pages-1);
    $('count').textContent=`${filtered.length}개 문항`; $('cards').replaceChildren();
    for(const r of filtered.slice(page*24,(page+1)*24)) {
      const card=node('article',undefined,'card'),image=node('div',undefined,'art');image.append(art(r));
      const links=node('div',undefined,'links');links.append(link('공식 출처',r.sourceUrl),link('원본 이미지',r.imageUrl));
      if(r.rating)links.append(link(`${r.rating.label} 근거`,r.rating.sourceUrl));
      card.append(image,node('h3',r.answer),node('p',r.groupLabel),node('span',kindLabel[r.questionKind],'badge'),links);$('cards').append(card);
    }
    $('page-number').textContent=`${page+1} / ${pages}`;$('prev-page').disabled=page===0;$('next-page').disabled=page===pages-1;
  }
  $('filter').onchange=$('search').oninput=()=>{page=0;renderCatalog();};
  $('prev-page').onclick=()=>{page--;renderCatalog();};$('next-page').onclick=()=>{page++;renderCatalog();};
  function buildRound(category) {
    if(category==='idol') return shuffle([...shuffle(rows.filter(r=>r.questionKind==='person')).slice(0,15),...shuffle(rows.filter(r=>r.questionKind==='group')).slice(0,5)]);
    const counts=new Map(),round=[];
    // Shuffle works first, then one character from each. A second pass is only
    // needed if fewer than 20 works exist, and never exceeds two per work.
    const works=shuffle([...new Set(rows.filter(r=>r.category==='anime').map(r=>r.group))]);
    for(let pass=0;pass<2&&round.length<20;pass++)for(const work of works){
      const pool=rows.filter(r=>r.category==='anime'&&r.group===work&&!round.includes(r));
      if(pool.length&&round.length<20&&(counts.get(work)||0)<2){round.push(shuffle(pool)[0]);counts.set(work,(counts.get(work)||0)+1);}
    }
    return shuffle(round);
  }
  let round=[],index=0,score=0,answered=false;
  function showQuestion() {
    const row=round[index];answered=false;
    $('progress').textContent=`${index+1} / ${round.length} 문제`;$('kind').textContent=kindLabel[row.questionKind];$('prompt').textContent=row.prompt;
    $('question-art').replaceChildren(art(row));$('choices').replaceChildren();$('feedback').textContent='';$('next').hidden=true;
    const acceptable=new Set([row.answer,...row.aliases].map(normalize)),used=new Set(acceptable);
    const wrong=shuffle(rows.filter(r=>r.questionKind===row.questionKind&&r.id!==row.id)).filter(r=>{
      const names=[r.answer,...r.aliases].map(normalize);if(names.some(n=>used.has(n)))return false;names.forEach(n=>used.add(n));return true;
    }).slice(0,3);
    for(const candidate of shuffle([row,...wrong])){
      const button=node('button',candidate.answer);button.dataset.id=candidate.id;
      button.onclick=()=>{
        if(answered)return;answered=true;const correct=candidate.id===row.id;if(correct)score++;
        for(const option of $('choices').children){option.disabled=true;if(option.dataset.id===row.id)option.classList.add('correct');}
        if(!correct)button.classList.add('wrong');
        $('feedback').textContent=correct?'정답이에요!':`정답은 ${row.answer}입니다.`;
        $('next').hidden=false;$('next').textContent=index===round.length-1?'결과 보기':'다음 문제';
      };$('choices').append(button);
    }
  }
  function start(category){round=buildRound(category);index=0;score=0;$('catalog').hidden=true;$('player').hidden=false;$('question-area').hidden=false;$('result').hidden=true;showQuestion();$('player').scrollIntoView({behavior:'smooth',block:'start'});}
  $('start-idol').onclick=()=>start('idol');$('start-anime').onclick=()=>start('anime');
  $('close-player').onclick=()=>{$('player').hidden=true;$('catalog').hidden=false;};
  $('next').onclick=()=>{if(!answered)return;if(++index<round.length)showQuestion();else{$('question-area').hidden=true;$('result').hidden=false;$('progress').textContent='미리보기 완료';$('result').replaceChildren(node('h2',`${round.length}문제 중 ${score}문제 정답`),node('p','미리보기 결과는 저장하지 않습니다. 위 버튼으로 새 조합을 풀어볼 수 있습니다.'));}};
  renderCatalog();
})();
