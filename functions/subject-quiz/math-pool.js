'use strict';
const {number}=require('./question');
// Exhaustively enumerable domains, rather than retries with an inflated estimate
// of all random seeds. 4 operations per unit; integer arithmetic even for decimals.
const counts=[10000,2000,10000,2000,2000,10000,10000,2000,10000,2000,2000,2000];
function count(u){return counts[(u.group==='4-1'?0:6)+u.number-1];}
function generate(u,r,index){
 if(!Number.isInteger(index)||index<0||index>=count(u))throw Error('Invalid math pool index');
 const type=index%4,k=Math.floor(index/4),first=u.group==='4-1',n=u.number;
 const N=(skill,prompt,ask,answer,wrong,explanation,extra={},operands=[])=>number(`${u.id}:pool-${skill}`,prompt,ask,answer,wrong,explanation,r,{...extra,verification:{},poolProof:{skill,operands,answer}});
 if(first&&n===1){
  const a=10+k%90,b=1+Math.floor((k%900)/90),level=Math.floor(k/900),base=[10000,100000000,1000000000000][level],name=['만','억','조'][level],tail=b*base/100,x=a*base+tail;
  const ans=[x,a*base,x+3*base,x-(a-1)*base][type];
  const ko=[`${a}${name}${name==='조'?'와':'과'} ${tail}을 합친 수를 기록합니다.`,`${x}을 ${name}의 묶음과 나머지로 나눕니다.`,`${x}에서 1${name}씩 세 번 뛰어 셉니다.`,`${x}과 ${(a-1)*base}의 차이를 구합니다.`][type];
  const e=[`${a}×${base}+${tail}=${ans}입니다.`,`${x}=${a}×${base}+${tail}이므로 ${name}의 묶음 부분은 ${ans}입니다.`,`${x}+${base}×3=${ans}입니다.`,`${x}−${(a-1)*base}=${ans}입니다.`][type];
  return N('large-'+type,ko,['기록할 수는?',`${name}의 묶음 부분이 나타내는 값은?`,'마지막 수는?','두 수의 차이는?'][type],ans,[[ans+base,'문제에 제시된 큰 묶음을 하나 더 셌습니다.'],[ans-base/100,'작은 자리의 계산을 다시 확인해 보세요.'],[a,'묶음의 개수와 묶음이 나타내는 값을 구별합니다.']],e,{},[type,a,b,base]);
 }
 if(first&&n===2){
  const a=20+k%50,b=5+Math.floor(k/50),sum=a+b;
  const ans=[sum,180-sum,90-a-b,a+b][type];
  const p=[`겹치지 않고 이웃한 두 각이 ${a}°와 ${b}°입니다.`,`삼각형의 두 각이 ${a}°와 ${b}°입니다.`,`직각을 겹치지 않는 세 각으로 나눴습니다. 그중 두 각이 ${a}°와 ${b}°입니다.`,`출발선에서 ${a}°를 돌린 뒤 같은 방향으로 ${b}°를 더 돌렸습니다.`][type];
  return N('angle-'+type,p,['두 각을 합친 크기는?','남은 한 각은?','남은 한 각의 크기는?','출발선에서 모두 몇 도 돌았나요?'][type],ans,[[type===1?sum:Math.abs(a-b),'더할 각과 빼야 할 각을 구분합니다.'],[180-a,'문제에 제시된 나머지 조건을 빠뜨렸습니다.'],[ans+10,'각의 크기를 10° 크게 계산했습니다.']],type===1?`세 각의 합은 180°이므로 180−${a}−${b}=${ans}°입니다.`:type===2?`직각은 90°이므로 90−${a}−${b}=${ans}°입니다. 알려진 두 각을 모두 빼야 합니다.`:`같은 방향으로 이어진 각은 ${a}+${b}=${ans}°입니다.`,{suffix:'°'},[type,a,b]);
 }
 if(first&&n===3){
  const a=12+k%50,b=12+Math.floor(k/50),rem=1+k%(b-1),total=a*b+rem;
  const ans=[a*b,a,a+1,rem][type];
  const p=type===0?`한 상자에 ${b}개씩 ${a}상자를 준비합니다.`:`물건 ${total}개를 한 묶음에 ${b}개씩 담으려 합니다.`;
  const ask=['물건은 모두 몇 개인가요?','가득 채울 수 있는 묶음은 몇 개인가요?','남은 물건까지 모두 담으려면 용기는 최소 몇 개인가요?','가득 찬 묶음을 만들고 남는 물건은 몇 개인가요?'][type];
  return N('multiply-divide-'+type,p,ask,ans,[[a+b,'곱해야 하는 두 수를 더한 값입니다.'],[type===0?a*(b-1):type===3?a:a*b,type===3?'몫과 나머지를 구분합니다.':'구하려는 묶음 수와 물건 수를 구분합니다.'],[type===2?a:ans+1,type===2?'나머지를 담을 용기 한 개도 필요합니다.':'한 개를 더 센 값입니다.']],type===0?`${a}×${b}=${ans}입니다.`:`${total}=${b}×${a}+${rem}이고 나머지 ${rem}은 ${b}보다 작습니다. ${type===1?'가득 찬 묶음은 '+a+'개입니다.':type===2?'남은 물건을 담는 용기도 필요하여 '+(a+1)+'개입니다.':'남은 물건은 '+rem+'개입니다.'}`,{},[type,a,b,rem]);
 }
 if(first&&n===4){
  const x=2+k%20,y=2+Math.floor(k/20),d=1+k%7,e=1+k%5;
  // Grid coordinates are described as counts from the left/bottom, no negative
  // coordinates, no assumption that the small preview grid contains all points.
  const ans=[x+d,y+e,x+d+e,x][type];
  const p=[`모눈에서 꼭짓점 가는 왼쪽에서 ${x}칸, 아래에서 ${y}칸에 있습니다. 도형을 오른쪽 ${d}칸 밀었습니다.`,`꼭짓점 가는 왼쪽에서 ${x}칸, 아래에서 ${y}칸에 있습니다. 도형을 위로 ${e}칸 밀었습니다.`,`꼭짓점 가는 왼쪽에서 ${x}칸, 아래에서 ${y}칸입니다. 오른쪽 ${d}칸 밀고 다시 오른쪽 ${e}칸 밀었습니다.`,`꼭짓점 가는 왼쪽에서 ${x}칸, 아래에서 ${y}칸입니다. 오른쪽 ${d}칸 밀었다가 왼쪽으로 같은 칸 수만큼 밀었습니다.`][type];
  return N('move-'+type,p,type===1?'이동 후 아래에서 센 칸 수는?':'이동 후 왼쪽에서 센 칸 수는?',ans,[[type===1?y:x,'이동한 칸 수를 반영하지 않았습니다.'],[ans+d,'문제에 없는 이동을 한 번 더 적용했습니다.'],[type===1?x:y,'가로 위치와 세로 위치를 구별합니다.']],type===3?`오른쪽과 왼쪽으로 ${d}칸씩 이동하므로 가로 위치는 처음의 ${x}칸으로 돌아옵니다.`:`묻는 방향의 위치에 이동한 칸 수를 더합니다. ${type===1?`${y}+${e}`:type===2?`${x}+${d}+${e}`:`${x}+${d}`}=${ans}칸입니다.`,{suffix:'칸'},[type,x,y,d,e]);
 }
 if(n===5){
  const a=10+k%25,b=5+Math.floor(k/25);
  const patterns=[[a,a+b,a+b+3+k%11,a+2*b+5+k%11],[a+2*b+10,a+b+10,a+b+10,a+5],[a+10,a+b+10,a+5,a+b+15],[a+b+10,a+5,a+b+15,a+10]];
  const v=first?patterns[k%4]:patterns[k%4];
  const labels=first?['독서','운동','미술','음악']:['1일','2일','3일','4일'];
  const ans=first?[Math.abs(v[3]-v[0]),v.reduce((s,x)=>s+x,0),v[1]+v[2],Math.abs(v[3]-v[2])][type]:[Math.abs(v[3]-v[0]),Math.abs(v[1]-v[0]),Math.abs(v[2]-v[1]),Math.abs(v[3]-v[2])][type];
  const prompt=first?'한 사람은 한 활동만 골랐습니다. 활동별 희망 학생 수를 나타낸 가상 조사입니다.':'같은 물통의 물높이를 매일 같은 시각에 잰 가상 기록입니다. 그 사이에 물을 넣거나 사용했습니다.';
  const ask=first?['음악과 독서의 학생 수 차이는?','조사한 학생은 모두 몇 명인가요?','운동 또는 미술을 고른 학생은 모두 몇 명인가요?','음악과 미술의 학생 수 차이는?'][type]:['1일과 4일의 물높이 차이는?','1일과 2일의 물높이 차이는?','2일과 3일의 물높이 차이는?','3일과 4일의 물높이 차이는?'][type];
  return N('graph-'+type,prompt,ask,ans,[[v[3],'마지막 값 자체와 묻는 합이나 변화량을 구분합니다.'],[v[0]+v[3],'필요한 항목과 계산 방향을 확인합니다.'],[ans+5,'눈금을 5만큼 크게 읽었는지 확인합니다.']],first?(type===1?`네 항목을 더합니다. ${v.join('+')}=${ans}명입니다.`:type===2?`${v[1]}+${v[2]}=${ans}명입니다.`:`비교하는 두 항목의 차이는 ${type===0?Math.max(v[3],v[0])+'−'+Math.min(v[3],v[0]):Math.max(v[3],v[2])+'−'+Math.min(v[3],v[2])}=${ans}명입니다.`):`물높이의 차이는 두 값 중 큰 값에서 작은 값을 뺍니다. ${type===0?Math.max(v[3],v[0])+'−'+Math.min(v[3],v[0]):Math.max(v[type],v[type-1])+'−'+Math.min(v[type],v[type-1])}=${ans}cm입니다. 차이의 크기와 증가·감소의 방향을 구별합니다.`,{suffix:first?'명':'cm',diagram:{kind:first?'bar':'line',values:v,labels,unit:first?'명':'cm'}},[type,...v]);
 }
 if(first&&n===6){
  const a=2+k%25,b=1+Math.floor(k/25),x=4+k%9;
  const ans=[a*x+b,x,a,b][type],pairs=[1,2,3].map(i=>`${i} → ${a*i+b}`).join(', ');
  const p=type===1?`시작 부품 ${b}개에 기둥 하나마다 ${a}개씩 더합니다. 전체 부품은 ${a*x+b}개입니다.`:`수 기계의 기록: ${pairs}. 규칙은 일정한 수를 곱한 뒤 일정한 수를 더하는 것입니다.`;
  const ask=[`${x}을 넣었을 때 나오는 수는?`,'기둥은 몇 개인가요?','넣은 수가 1 늘어날 때 나오는 수는 얼마씩 늘어나나요?','규칙에서 곱한 뒤 더하는 수는 얼마인가요?'][type];
  return N('relation-'+type,p,ask,ans,[[a*x,'마지막에 더하는 수와 전체 결과를 구분합니다.'],[a+b,'곱하는 수와 더하는 수를 그대로 합하지 않습니다.'],[ans+1,'표의 모든 기록에 맞는지 다시 확인합니다.']],`규칙은 ×${a} 뒤 +${b}입니다. ${type===0?`${x}×${a}+${b}=${ans}`:type===1?`(${a*x+b}−${b})÷${a}=${x}`:type===2?`이웃한 결과의 차이는 ${a}`:`첫 결과 ${a+b}에서 곱한 값 ${a}를 빼면 ${b}`}입니다.`,{},[type,a,b,x]);
 }
 if(!first&&n===1){
  const den=5+k%15,whole=2+Math.floor(k/15),a=1+k%(den-1),b=1+Math.floor(k/7)%(den-1);
  const ans=[whole*den+a+b,whole*den+a-b,whole*den-a,(whole+1)*den+a-b][type];
  const p=[`길이 ${whole}와 ${a}/${den}m인 끈에 ${b}/${den}m를 이어 붙였습니다.`,`길이 ${whole}와 ${a}/${den}m인 끈에서 ${b}/${den}m를 잘랐습니다.`,`길이 ${whole}m인 끈에서 ${a}/${den}m를 잘랐습니다. 기록표에는 참고로 ${b}/${den}m짜리 조각도 그려져 있지만 사용하지 않았습니다.`,`길이 ${whole}와 ${a}/${den}m인 끈에 1m를 붙인 뒤 ${b}/${den}m를 잘랐습니다.`][type];
  return N('fraction-'+type,p,`결과를 분모 ${den}인 분수로 나타내면?`,ans,[[ans+den,'자연수 한 묶음만큼 더 계산했습니다.'],[ans-den,'자연수 한 묶음만큼 덜 계산했습니다.'],[Math.abs(a-b),'자연수 부분을 빠뜨렸습니다.']],`자연수 1은 ${den}/${den}입니다. ${type===0?`${whole}×${den}+${a}+${b}`:type===1?`${whole}×${den}+${a}−${b}`:type===2?`${whole}×${den}−${a}`:`${whole+1}×${den}+${a}−${b}`}=${ans}이므로 ${ans}/${den}m입니다.`,{den},[type,den,whole,a,b]);
 }
 if(!first&&n===2){
  const raw=[30+k%50,20+Math.floor(k/50),130-k%50-Math.floor(k/50)],angles=[raw[k%3],raw[(k+1)%3],raw[(k+2)%3]],a=angles[0],b=angles[1],c=angles[2];
  const p=`삼각형의 각 가는 ${a}°, 나는 ${b}°입니다. 세 각의 합을 이용해 나머지 각을 구하고 비교합니다.`;
  const ans=[c,Math.max(a,b,c),Math.min(a,b,c),180-c][type];
  return N('triangle-'+type,p,['각 다의 크기는?','세 각 중 가장 큰 각의 크기는?','세 각 중 가장 작은 각의 크기는?','각 가와 나를 합친 크기는?'][type],ans,[[180-a,'알고 있는 두 각 중 하나만 뺐습니다.'],[180-b,'두 각 중 하나만 빼면 남은 각이 아닙니다.'],[ans+10,'세 각의 합과 크기 비교를 다시 확인합니다.']],`각 다는 180−${a}−${b}=${c}°입니다. 세 각 ${a}°, ${b}°, ${c}°를 비교하고, 가와 나의 합은 ${a+b}°임을 확인합니다. 답은 ${ans}°입니다.`,{suffix:'°'},[type,a,b,c]);
 }
 if(!first&&n===3){
  const a=200+k%100,b=10+Math.floor(k/100),scale=type===3?1000:100;
  const ans=type===0||type===3?a+b:type===1?a-b:a+b-7,F=x=>(x/scale).toFixed(type===3?3:2);
  const p=type===1?`물 ${F(a)}L에서 ${F(b)}L를 덜었습니다.`:type===2?`물 ${F(a)}L와 ${F(b)}L를 합친 뒤 ${F(7)}L를 사용했습니다.`:`물 ${F(a)}L와 ${F(b)}L를 합쳤습니다.`;
  return N('decimal-'+type,p,'남은 물의 양은?',ans,[[ans+10,'소수 자릿값을 확인합니다.'],[ans-10,'받아올림이나 받아내림을 확인합니다.'],[a+b+7,'사용한 양과 더한 양의 방향을 구분합니다.']],`소수점을 맞추어 같은 자리끼리 계산합니다. ${type===1?`${F(a)}−${F(b)}`:type===2?`${F(a)}+${F(b)}−${F(7)}`:`${F(a)}+${F(b)}`}=${F(ans)}L입니다.`,{scale,decimals:type===3?3:2,suffix:'L'},[type,a,b,scale]);
 }
 if(!first&&n===4){
  const a=30+k%25,b=4+Math.floor(k/25),p=2*(a+b),side=2*a+b;
  const ans=[p,a,b,side][type];
  const text=[`직사각형의 이웃한 변 길이는 ${a}cm와 ${b}cm입니다.`,`직사각형 테두리 길이는 ${p}cm이고 세로는 ${b}cm입니다.`,`평행사변형 테두리 길이는 ${p}cm이고 한 변은 ${a}cm입니다.`,`평행사변형의 이웃한 변 길이는 ${a}cm와 ${b}cm입니다. ${b}cm인 변 하나를 빼고 나머지 세 변을 따라 끈을 붙입니다.`][type];
  return N('quadrilateral-'+type,text,['네 변 길이를 모두 합하면?','가로 길이는?','주어진 변과 이웃한 변의 길이는?','붙일 끈의 길이는?'][type],ans,[[a+b,'두 쌍의 마주 보는 변을 모두 고려합니다.'],[p+2,'문제에 없는 길이를 더했습니다.'],[Math.abs(a-b),'합과 차, 구하려는 변의 길이를 구분합니다.']],type===0?`마주 보는 변이 같으므로 ${a}+${b}+${a}+${b}=${p}cm입니다.`:type===1||type===2?`마주 보는 변이 각각 같습니다. ${p}÷2=${a+b}에서 알려진 변 ${type===1?b:a}를 빼면 ${ans}cm입니다.`:`남은 세 변은 ${a}cm, ${b}cm, ${a}cm이므로 ${side}cm입니다.`,{suffix:'cm'},[type,a,b]);
 }
 if(!first&&n===6){
  const sides=3+k%10,len=2+Math.floor(k/10),total=sides*len;
  const ans=[total,len,(sides-1)*len,total+len][type];
  const p=[`정${sides}각형의 한 변은 ${len}cm입니다.`,`정${sides}각형의 모든 변 길이를 합하면 ${total}cm입니다.`,`정${sides}각형의 한 변은 ${len}cm입니다. 한 변을 빼고 나머지 테두리를 따라 끈을 붙입니다.`,`정${sides}각형의 한 변은 ${len}cm입니다. 테두리를 한 바퀴 두르고 연결용으로 한 변 길이만큼 더 준비합니다.`][type];
  return N('polygon-'+type,p,['테두리 전체 길이는?','한 변 길이는?','필요한 끈은 몇 cm인가요?','준비할 끈의 전체 길이는?'][type],ans,[[sides+len,'같은 길이의 변을 변 수만큼 더해야 합니다.'],[total-len,'문제에서 포함하는 변 수와 여분을 확인합니다.'],[total+2*len,'여분의 변을 하나 더 센 값입니다.']],type===1?`모든 변이 같으므로 ${total}÷${sides}=${len}cm입니다.`:`${type===0?sides:type===2?sides-1:sides+1}개의 ${len}cm 길이가 필요하므로 ${ans}cm입니다. 대각선은 테두리에 포함하지 않습니다.`,{suffix:'cm',diagram:{kind:'regular-polygon',sides}},[type,sides,len]);
 }
 throw Error('Missing pool '+u.id);
}
module.exports={count,generate};
