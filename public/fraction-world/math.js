(function(root){
  'use strict';
  const kinds = ['진분수 덧셈','진분수 뺄셈','1을 넘는 덧셈','대분수 덧셈','대분수 뺄셈','받아내림 뺄셈'];
  const int = (rng,min,max) => min + Math.floor(rng()*(max-min+1));
  function generate(kind,rng=Math.random){
    const d=int(rng,3,12); let a,b,op='+';
    if(kind===0){ a=int(rng,1,d-2); b=int(rng,1,d-1-a); }
    else if(kind===1){a=int(rng,2,d-1);b=int(rng,1,a);op='−';}
    else if(kind===2){a=int(rng,1,d-1);b=int(rng,d-a,d-1);}
    else if(kind===3){a=int(rng,1,3)*d+int(rng,1,d-1);b=int(rng,1,2)*d+int(rng,1,d-1);}
    else if(kind===4){let ar=int(rng,1,d-1);a=int(rng,2,4)*d+ar;b=d+int(rng,1,ar);op='−';}
    else {let ar=int(rng,0,d-2);a=int(rng,2,4)*d+ar;b=int(rng,0,1)*d+int(rng,ar+1,d-1);op='−';}
    return {kind,d,a,b,op,n:op==='+'?a+b:a-b};
  }
  function parts(n,d){return {whole:Math.floor(n/d),num:n%d,den:d};}
  function plain(n,d){const p=parts(n,d);return p.num?(p.whole?`${p.whole}과 `:'')+`${p.num}/${d}`:String(p.whole);}
  function matches(q,whole,num,den=q.d){
    const valid=v=>/^[0-9]{1,3}$/.test(String(v));
    if(!valid(whole)||!valid(num)||!valid(den)||Number(den)===0)return false;
    return (Number(whole)*Number(den)+Number(num))*q.d===q.n*Number(den);
  }
  function hint(q){
    const a=parts(q.a,q.d),b=parts(q.b,q.d);
    if(q.op==='−'&&a.num<b.num)return `${a.whole}에서 1을 빌리면 ${a.whole-1}과 ${a.num+q.d}/${q.d}이 돼요. 분자끼리 ${a.num+q.d} − ${b.num}, 자연수끼리 ${a.whole-1} − ${b.whole}을 계산하세요.`;
    return `분모 ${q.d}는 그대로 두세요. 자연수끼리 ${a.whole} ${q.op} ${b.whole}, 분자끼리 ${a.num} ${q.op} ${b.num}을 계산해요.${q.op==='+'?' 분자가 분모 이상이면 자연수로 묶을 수 있어요.':''}`;
  }
  function pickKind(level,stats,rng=Math.random){
    const allowed=level==='basic'?[0,1]:level==='mixed'?[2,3,4]:[0,1,2,3,4,5];
    if(rng()<.45){return allowed.reduce((best,k)=>{const score=i=>(stats[i]?.first||0)/Math.max(1,stats[i]?.attempts||0);return score(k)<score(best)?k:best;},allowed[int(rng,0,allowed.length-1)]);}
    return allowed[int(rng,0,allowed.length-1)];
  }
  const api={kinds,generate,parts,plain,matches,hint,pickKind};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FWMath=api;
})(typeof window!=='undefined'?window:globalThis);
