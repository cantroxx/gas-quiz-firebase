(function(root){
  'use strict';
  function create({read,restore,saved,image,busy}){
    const panel=document.getElementById('coordi-draft-tools'),compare=document.getElementById('coordi-compare');
    const message=document.getElementById('coordi-draft-status');
    const history=[];let cursor=-1,restoring=false;const pins={A:null,B:null};
    const clone=x=>JSON.parse(JSON.stringify(x));
    function record(){if(restoring)return;const current=read();if(cursor>=0&&JSON.stringify(current)===JSON.stringify(history[cursor]))return;history.splice(cursor+1);history.push(clone(current));if(history.length>30)history.shift();cursor=history.length-1;update();}
    function update(){
      panel.querySelector('[data-draft="undo"]').disabled=busy()||cursor<1;
      panel.querySelector('[data-draft="redo"]').disabled=busy()||cursor>=history.length-1;
      panel.querySelector('[data-draft="saved"]').disabled=busy()||!saved();
      panel.querySelector('[data-draft="large"]').disabled=!image();
      for(const key of ['A','B']){
        panel.querySelector(`[data-draft="pin-${key}"]`).disabled=busy()||!image();
        panel.querySelector(`[data-draft="restore-${key}"]`).disabled=busy()||!pins[key];
      }
    }
    function apply(snapshot,text){restoring=true;try{restore(clone(snapshot));}finally{restoring=false;}message.textContent=text+' · 입어보기만 바뀌며 구매·장착·염색 저장은 별도예요.';update();}
    function renderCompare(){compare.replaceChildren();compare.hidden=!pins.A&&!pins.B;for(const key of ['A','B']){const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=key+' · 고정한 코디';figure.append(caption);if(pins[key]){const img=document.createElement('img');img.src=pins[key].image;img.alt=key+' 고정 코디';figure.append(img);}else figure.append('아직 고정하지 않았어요');compare.append(figure);}}
    panel.addEventListener('click',event=>{const action=event.target.closest('[data-draft]')?.dataset.draft;if(!action||busy())return;
      if(action==='undo'&&cursor>0){cursor--;apply(history[cursor],'입어보기 되돌리기');}
      else if(action==='redo'&&cursor<history.length-1){cursor++;apply(history[cursor],'입어보기 다시 실행');}
      else if(action==='saved'&&saved()){apply(saved(),'저장한 코디를 불러왔어요');record();}
      else if(action.startsWith('pin-')&&image()){const key=action.slice(4);pins[key]={look:clone(read()),image:image()};renderCompare();message.textContent=key+' 코디를 고정했어요. 거래는 발생하지 않아요.';update();}
      else if(action.startsWith('restore-')&&pins[action.slice(8)]){apply(pins[action.slice(8)].look,action.slice(8)+' 코디 복원');record();}
      else if(action==='end-compare'){pins.A=pins.B=null;renderCompare();update();}
      else if(action==='large'&&image()){
        const dialog=document.createElement('dialog');dialog.className='coordi-large-preview';dialog.setAttribute('aria-label','코디 크게 보기');
        const img=document.createElement('img');img.src=image();img.alt='현재 입어보는 코디';
        const controls=document.createElement('div'),label=document.createElement('span');label.textContent='미리보기 확대';controls.append(label);
        for(const scale of [1,2,3,4]){const b=document.createElement('button');b.type='button';b.textContent=scale+'배';b.onclick=()=>{img.style.width=img.naturalWidth*scale+'px';img.style.height='auto';};controls.append(b);}
        const close=document.createElement('button');close.type='button';close.textContent='닫기';close.onclick=()=>dialog.close();controls.append(close);dialog.append(controls,img);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();close.focus();
      }
    });
    record();return {record,update,reset(){history.length=0;cursor=-1;record();}};
  }
  root.DJ48CoordiDraftTools={create};
})(window);
