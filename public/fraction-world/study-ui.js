(function(){
'use strict';const U=FWUI,D=FWStudy;
const rich=text=>U.esc(text).replace(/(?:(\d+)과 )?(\d+)\/(\d+)/g,(_,w,n,d)=>U.fraction((+(w||0))*(+d)+(+n),+d)).replace(/\n/g,'<br>');
function visual(question,answers={}){const v=question.visual;if(!v)return '';let drawing='',description=v.label||question.title;
const text=(x,y,t)=>`<text x="${x}" y="${y}" text-anchor="middle">${U.esc(t)}</text>`;
const interactive=(value,content)=>`<g data-visual-value="${U.esc(value)}" tabindex="0" role="button" aria-label="${U.esc(value)}" class="diagram-choice">${content}</g>`;
if(v.kind==='graph'){
 const max=Math.ceil((Math.max(...v.values)+2)/5)*5,step=max<=20?2:5,x=i=>55+i*350/Math.max(1,v.values.length-1),y=n=>230-n/max*185;
 drawing=`<path d="M55 35V230H430" class="axis"/>${text(25,25,v.unit)}`;
 for(let n=0;n<=max;n+=step)drawing+=`<path d="M55 ${y(n)}H410" class="gridline"/>${text(30,y(n)+5,n)}`;
 v.labels.forEach((label,i)=>drawing+=text(x(i),258,label));
 if(!v.hidePoints){drawing+=`<polyline points="${v.values.map((n,i)=>`${x(i)},${y(n)}`).join(' ')}" class="data-line"/>`;v.values.forEach((n,i)=>{let point=`<circle cx="${x(i)}" cy="${y(n)}" r="7" class="data-dot"/>`;if(question.fields[0]?.options?.includes(v.labels[i]))point=interactive(v.labels[i],`<circle cx="${x(i)}" cy="${y(n)}" r="20" fill="transparent"/>`+point);drawing+=point;});for(let i=0;i<v.values.length-1;i++){const label=v.labels[i]+'→'+v.labels[i+1];if(question.fields[0]?.options?.includes(label))drawing+=interactive(label,`<path d="M${x(i)} ${y(v.values[i])}L${x(i+1)} ${y(v.values[i+1])}" stroke="transparent" stroke-width="24"/>`);}}
 description=`${v.labels.map((l,i)=>l+' '+v.values[i]+v.unit).join(', ')}。${v.hidePoints?'점을 찍기 전 빈 그래프입니다.':''}`;
}else{
 let points=[];
 if(v.kind==='triangle'){const half=85,h=half/Math.tan(v.angle*Math.PI/360),scale=Math.min(1,170/h);points=[[230,220-h*scale],[230-half*scale,220],[230+half*scale,220]];drawing+=text(230,Math.max(30,210-h*scale),v.angle+'°');}
 if(v.kind==='polygon')points=Array.from({length:v.n},(_,i)=>[230+100*Math.cos(-Math.PI/2+i*2*Math.PI/v.n),135+100*Math.sin(-Math.PI/2+i*2*Math.PI/v.n)]);
 if(v.kind==='quad')points=v.shape==='square'?[[150,55],[310,55],[310,215],[150,215]]:v.shape==='rectangle'?[[90,75],[370,75],[370,195],[90,195]]:v.shape==='trapezoid'?[[160,65],[300,65],[365,215],[95,215]]:v.shape==='rhombus'?[[90,55],[270,55],[360,211],[180,211]]:[[155,65],[365,65],[305,205],[95,205]];
 drawing+=`<polygon points="${points.map(p=>p.join(',')).join(' ')}" class="shape"/>`;
 points.forEach(([x,y],i)=>{drawing+=`<circle cx="${x}" cy="${y}" r="4" class="vertex"/>`+text(x+(x-230)*.13,y+(y-135)*.13+5,String.fromCharCode(65+i));});
 if(v.kind==='triangle'){for(const [i,j] of [[0,1],[0,2],...(v.angle===60?[[1,2]]:[])]){const a=points[i],b=points[j],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);drawing+=`<path d="M${mx-dy/len*6} ${my+dx/len*6}L${mx+dy/len*6} ${my-dx/len*6}" class="mark"/>`;}}
 if(v.kind==='quad'&&['square','rectangle'].includes(v.shape)){const [[x1,y1],[x2],[,y2]]=points;drawing+=`<path d="M${x1+12} ${y1}v12h-12 M${x2-12} ${y1}v12h12 M${x2-12} ${y2}v-12h12 M${x1+12} ${y2}v-12h-12" class="mark"/>`;}
 if(v.kind==='polygon'&&question.type==='pick'){const field=question.fields[0];for(const option of field.options||[]){if(!/^[A-H]{2}$/.test(option))continue;const a=points[option.charCodeAt(0)-65],b=points[option.charCodeAt(1)-65];if(!a||!b)continue;const selected=(answers[field.id]||[]).includes(option);drawing+=interactive(option,`<path d="M${a.join(' ')}L${b.join(' ')}" stroke="${selected?'#ffe39d':'#83bcb5'}" stroke-width="${selected?6:3}" stroke-dasharray="6 5"/><path d="M${a.join(' ')}L${b.join(' ')}" stroke="transparent" stroke-width="22"/>`);}}
}
return `<figure class="study-figure"><svg viewBox="0 0 460 285" role="img" aria-label="${U.esc(description)}">${drawing}</svg>${v.label?`<figcaption>${U.esc(v.label)}</figcaption>`:''}${v.kind==='graph'&&!v.hidePoints?`<details><summary>자료를 표로 보기</summary><table><tr>${v.labels.map(x=>`<th>${x}</th>`).join('')}</tr><tr>${v.values.map(x=>`<td>${x}${U.esc(v.unit)}</td>`).join('')}</tr></table></details>`:''}</figure>`;
}
function controls(q,answers={}){return q.fields.map((f,i)=>`<fieldset class="study-field"><legend>${i+1}. ${U.esc(f.label)}</legend>${f.kind==='fraction'?`<div class="study-fraction-input"><label>자연수<input data-whole="${f.id}" inputmode="numeric" value="${U.esc(answers[f.id]?.whole??'0')}" maxlength="3"></label><span>과</span><label>분자<input data-numerator="${f.id}" inputmode="numeric" value="${U.esc(answers[f.id]?.num??'')}" maxlength="3"><span class="study-den">${f.den}</span></label></div>`:f.kind==='number'?`<label class="study-number"><input data-answer="${f.id}" inputmode="decimal" autocomplete="off" maxlength="12" aria-label="${U.esc(f.label)}" value="${U.esc(answers[f.id]??'')}"><span>${U.esc(f.unit||'')}</span></label>`:`<p class="fine">${f.kind==='multi'?'맞는 것을 모두 골라요.':f.kind==='order'?'첫 번째부터 차례로 눌러요. 다시 누르면 선택을 뺄 수 있어요.':'하나를 골라요.'}</p><div class="study-options">${f.options.map((option,j)=>{const selected=Array.isArray(answers[f.id])?answers[f.id].includes(option):answers[f.id]===option;return `<button type="button" data-field="${f.id}" data-option="${j}" aria-pressed="${selected}" class="${selected?'selected':''}">${f.kind==='order'&&selected?`<b class="order-number">${answers[f.id].indexOf(option)+1}</b>`:''}${rich(option)}</button>`;}).join('')}</div>`}</fieldset>`).join('');}
const api={rich,visual,controls};window.FWStudyUI=api;
})();
