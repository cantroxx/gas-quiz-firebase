'use strict';
const {item}=require('./question'),data=require('./reading-workshop-data');
const groups={
 '4-1:1':'narrative','4-1:2':'opinion','4-1:3':'information','4-1:4':'information','4-1:5':'opinion','4-1:6':'narrative','4-1:7':'narrative','4-1:8':'information',
 '4-2:1':'information','4-2:2':'information','4-2:3':'opinion','4-2:4':'narrative','4-2:5':'opinion','4-2:6':'narrative','4-2:7':'narrative','4-2:8':'information'
};
function questions(u){const bank=groups[u.group+':'+u.number];if(u.subject!=='korean'||!bank)return [];
 return data[bank].trim().split('\n').flatMap((line,n)=>{
  const v=line.split('|');if(v.length!==12)throw Error('Reading workshop fields '+n+': '+v.length);
  const [title,a,b,c,endA,claimA,actA,endB,claimB,actB,unsupported,badAction]=v;
  return [[endA,claimA,actA,endB,claimB,actB],[endB,claimB,actB,endA,claimA,actA]].flatMap(([end,claim,act,other,otherClaim,otherAct],branch)=>{
   const passage=`${title}\n${a}\n${b}\n${c}\n${end}`;
   const extra={materialId:`${u.id}:workshop-${n}-${branch}`,family:'',objective:''};
   const Q=(type,level,objective,prompt,correct,wrong,explanation)=>item(`${u.id}:workshop-${type}`,passage,prompt,correct,wrong,explanation,{...extra,difficulty:level,objective,family:'workshop-'+type});
   return [
    Q('summary',1,'interpret-evidence','앞의 조건과 마지막 사건을 함께 읽었을 때, 이 글에서 실제로 일어난 일을 정확히 정리한 것은?',end,[[other,'이것은 조건이 달랐을 때 가능한 다른 전개입니다. 현재 글의 마지막 사건과 구별합니다.'],[unsupported,'관찰한 범위를 넘어선 일반화이며 이번 사건의 요약이 아닙니다.'],[badAction,'실제로 한 일과 다릅니다. 글의 마지막 행동을 확인합니다.']],`마지막 사건: ${end}\n앞의 조건에 대응한 행동을 사실대로 정리합니다. 다른 가능성이나 앞으로 할 일을 실제 사건과 섞지 않습니다.`),
    Q('evidence',2,'interpret-evidence','글의 앞부분에 나온 조건과 마지막 행동을 연결하여 해석한 것은?',claim,[[otherClaim,'현재 글과 다른 결말에 해당하는 해석입니다. 실제 마지막 행동과 대조해 보세요.'],[unsupported,'이번 사례에서 확인한 범위보다 넓게 단정했습니다.'],[badAction,'중요한 조건에 대응한 실제 행동과 어긋납니다.']],`해석의 근거는 “${end}”입니다. 앞의 조건과 이 행동을 연결하면 ${claim}`),
    branch===0?Q('scope',3,'evaluate-evidence','이 글만을 근거로 사실이라고 단정하기 어려운 설명은?',unsupported,[[claim,'앞의 조건과 마지막 행동을 연결하면 뒷받침되는 해석입니다.'],[end,'실제로 일어난 일로 글에 나옵니다.'],[b,'글에서 직접 확인할 수 있는 조건입니다.']],`“${unsupported}”는 이번 자료의 범위를 넘어섭니다. ${end} 이번 상황과 다른 모든 상황에 대한 주장을 구별해야 합니다.`):
    Q('changed-ending',3,'evaluate-evidence',`앞의 조건은 같고 마지막 사건이 다음처럼 바뀌었다고 합시다. “${other}” 이 새 결말에 맞는 해석은?`,otherClaim,[[claim,'원래 결말의 해석입니다. 새 결말의 선택이 달라졌는지 확인하세요.'],[unsupported,'결말이 바뀌어도 모든 다른 상황까지 단정할 근거는 생기지 않습니다.'],[badAction,'새 결말의 실제 선택과 어긋납니다.']],`새로 제시한 행동은 “${other}”입니다. 따라서 ${otherClaim} 원래 글의 답을 그대로 옮기지 않고 바뀐 행동을 근거로 해석합니다.`),
    Q('application',3,'apply-evidence','마지막에 한 선택의 취지를 살려 다음 활동에 적용할 방법은?',act,[[badAction,'이 행동은 중요했던 조건이나 상대의 필요를 놓칩니다.'],[otherAct,'다른 결말에서는 가능한 방법이지만 현재 결말에서 한 선택의 취지와 다릅니다.'],[`다음에도 ${unsupported}`,'한 사례를 확인한 범위 밖으로 일반화하는 방식입니다.']],`이번 사건에서는 ${claim} 같은 취지를 적용하려면 ${act} 조건이 달라지면 방법도 다시 검토해야 합니다.`)
   ];
  });
 });
}
module.exports={questions,groups};
