(function(root){
'use strict';
const units=[['fraction','분수의 덧셈과 뺄셈','½'],['triangle','삼각형','△'],['decimal','소수의 덧셈과 뺄셈','0.1'],['quadrilateral','사각형','▱'],['graph','꺾은선그래프','↗'],['polygon','다각형','⬡']].map(([id,name,icon])=>({id,name,icon}));
const templates=[];
function random(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
const number=(id,label,answer,unit='')=>({id,label,kind:'number',answer:String(answer),unit});
const choice=(id,label,options,answer)=>({id,label,kind:'choice',options,answer:String(answer)});
const multi=(id,label,options,answer)=>({id,label,kind:'multi',options,answer});
const order=(id,label,options,answer)=>({id,label,kind:'order',options,answer});
const frac=(id,label,n,d)=>({id,label,kind:'fraction',den:d,answer:`${n}/${d}`});
const dec=n=>(n/100).toFixed(2).replace(/0$/,'').replace(/\.0$/,'');
const fp=(n,d)=>n<d?`${n}/${d}`:`${Math.floor(n/d)}과 ${n%d}/${d}`;
function q(prompt,fields,explanation,visual=null,extra={}){return {prompt,fields,explanation,visual,...extra};}
function add(unit,key,title,type,level,build){templates.push({id:unit+'.'+key,unit,title,type,level,build});}
function register(unit,rows){rows.forEach(([key,title,type,level,build])=>add(unit,key,title,type,level,build));}
const polygon=(n,label='')=>({kind:'polygon',n,label});
const triangle=(angle=60,label='')=>({kind:'triangle',angle,label});
const quad=(shape,label='')=>({kind:'quad',shape,label});
// Each entry represents a different mathematical task, not merely a number variant.
register('fraction',[
['sum','받아올림 계산','number',1,({d})=>q(`${fp(d-1,d)} + ${fp(d-1,d)}를 계산하세요.`,[frac('a','답',2*d-2,d)],`분모는 ${d}로 두고 분자를 더해요. ${2*d-2}/${d} = ${fp(2*d-2,d)}입니다.`)],
['borrow','받아내림 계산','number',2,({d,k})=>q(`${fp((k+2)*d+1,d)} − ${fp(d+2,d)}를 계산하세요.`,[frac('a','답',(k+1)*d-1,d)],`자연수 1을 ${d}/${d}로 바꾸어 빼요. 답은 ${fp((k+1)*d-1,d)}입니다.`)],
['missing-add','덧셈의 빈칸','blanks',2,({d,k})=>q(`□ + ${fp(d+1,d)} = ${fp((k+2)*d+3,d)}입니다. □를 구하세요.`,[frac('a','□',(k+1)*d+2,d)],`합에서 더한 수를 빼면 □가 나와요. ${fp((k+1)*d+2,d)}입니다.`)],
['missing-sub','뺄셈의 빈칸','blanks',2,({d,k})=>q(`${fp((k+3)*d+3,d)} − □ = ${fp(d+1,d)}입니다. □를 구하세요.`,[frac('a','□',(k+2)*d+2,d)],`처음 수에서 남은 수를 빼요. ${fp((k+2)*d+2,d)}입니다.`)],
['compare','두 계산 비교','single',1,({d})=>q(`가: ${fp(d+1,d)} + 2/${d}\n나: ${fp(d+2,d)} + 2/${d}\n계산 결과가 더 큰 것을 고르세요.`,[choice('a','더 큰 결과',['가','나'],'나')],`같은 2/${d}를 더하므로 처음 수가 더 큰 나의 결과가 큽니다.`)],
['ribbon','두 번 쓰고 남은 양','number',2,({d,k})=>q(`리본 ${fp((k+2)*d+3,d)}m에서 ${fp(d+1,d)}m와 1/${d}m를 잘랐어요. 남은 길이는?`,[frac('a','남은 길이(m)',(k+1)*d+1,d)],`자른 두 길이를 더한 뒤 처음 길이에서 빼요. ${fp((k+1)*d+1,d)}m입니다.`)],
['restore','처음 양 거꾸로 구하기','number',3,({d,k})=>q(`주스 ${fp(d+1,d)}L를 마시고 2/${d}L를 더 마셨더니 ${fp(k*d+1,d)}L가 남았어요. 처음에는 몇 L였나요?`,[frac('a','처음 양(L)',(k+1)*d+4,d)],`남은 양에 마신 양 두 개를 더해요. ${fp((k+1)*d+4,d)}L입니다.`)],
['difference','둘의 차이 구하기','number',2,({d,k})=>q(`가 모둠은 ${fp((k+1)*d+3,d)}km, 나 모둠은 ${fp(k*d+1,d)}km 걸었어요. 가 모둠이 더 걸은 거리는?`,[frac('a','더 걸은 거리(km)',d+2,d)],`두 거리를 빼면 ${fp(d+2,d)}km입니다.`)],
['den-error','분모를 더한 오류','explain',3,({d})=>q(`1/${d} + 2/${d} = 3/${2*d}라고 쓴 풀이를 고치세요.`,[choice('why','고쳐야 하는 이유',['같은 크기의 조각이므로 분모는 그대로 둬요','분모도 더해야 해요','분자끼리 곱해야 해요'],'같은 크기의 조각이므로 분모는 그대로 둬요'),frac('a','바른 답',3,d)],`분모는 한 조각의 크기를 나타내므로 그대로예요. 1개와 2개를 더해 3/${d}입니다.`)],
['borrow-error','받아내림 설명','explain',3,({d})=>q(`2와 1/${d}에서 1과 3/${d}을 빼려고 해요. 자연수 1을 분수로 바꾼 식과 답을 완성하세요.`,[number('n','2와 1/'+d+' = 1과 □/'+d,d+1),frac('a','뺄셈의 답',d-2,d)],`1은 ${d}/${d}입니다. 분자가 ${d+1}이 되므로 빼면 ${d-2}/${d}입니다.`)],
['sort','계산 결과 순서','sort',2,({d})=>q('계산 결과가 작은 것부터 차례로 누르세요.',[order('a','작은 것 → 큰 것',[`1/${d}+1/${d}`,`1/${d}+2/${d}`,`2/${d}+2/${d}`],[`1/${d}+1/${d}`,`1/${d}+2/${d}`,`2/${d}+2/${d}`])],`분모가 같으므로 결과의 분자 2, 3, 4를 비교해요.`)],
['true','옳은 계산 모두 찾기','multi',1,({d})=>q('옳게 계산한 식을 모두 고르세요.',[multi('a','모두 선택',[`1/${d}+2/${d}=3/${d}`,`3/${d}−1/${d}=2/${d}`,`2/${d}+2/${d}=4/${2*d}`],[`1/${d}+2/${d}=3/${d}`,`3/${d}−1/${d}=2/${d}`])],`분모가 같은 분수는 분모를 그대로 두고 분자끼리 계산해요.`)],
['steps','문장제 풀이 순서','sort',2,({d})=>q(`물 ${fp(3*d+3,d)}L 중 ${fp(d+1,d)}L와 1/${d}L를 썼어요. 남은 양을 구하는 순서를 고르세요.`,[order('a','풀이 순서',['쓴 두 양을 더한다','처음 양에서 쓴 양을 뺀다','남은 양의 단위 L를 확인한다'],['쓴 두 양을 더한다','처음 양에서 쓴 양을 뺀다','남은 양의 단위 L를 확인한다'])],`먼저 쓴 양 전체를 알아야 처음 양에서 뺄 수 있어요.`)],
['both','두 조건 함께 계산','blanks',3,({d,k})=>q(`준이는 ${fp(k*d+1,d)}km 걸었고, 민이는 준이보다 1/${d}km 더 걸었어요. 민이의 거리와 두 사람 거리의 합을 구하세요.`,[frac('a','민이의 거리(km)',k*d+2,d),frac('b','두 사람의 합(km)',2*k*d+3,d)],`민이: ${fp(k*d+2,d)}km. 여기에 준이의 거리를 더하면 ${fp(2*k*d+3,d)}km입니다.`)],
['writing','왜 받아내릴까요?','written',3,({d})=>q(`2와 1/${d} − 1과 3/${d}을 계산할 때, 자연수 1을 어떻게 바꾸는지 설명하세요.`,[],`1 = ${d}/${d}이므로 2와 1/${d}을 1과 ${d+1}/${d}로 바꿉니다. 자연수끼리, 분자끼리 빼면 ${d-2}/${d}입니다.`,null,{rubric:['1을 분수로 바꾼 방법을 썼나요?','분모를 그대로 두었나요?','바꾼 식과 계산 결과를 연결했나요?']})]
]);
register('decimal',[
['sum','소수점 맞추기','number',1,({k})=>{const a=k*100+68,b=175;return q(`${dec(a)} + ${dec(b)}를 계산하세요.`,[number('a','답',dec(a+b))],`소수점을 맞춰 같은 자리끼리 더하면 ${dec(a+b)}입니다.`);}],
['sub','받아내림 뺄셈','number',2,({k})=>q(`${k+3}.04 − 1.78을 계산하세요.`,[number('a','답',dec((k+3)*100+4-178))],`소수점을 맞추고 필요한 자리에서 받아내림해요. 답은 ${dec((k+3)*100+4-178)}입니다.`)],
['unequal','자릿수가 다른 계산','number',2,({k})=>q(`${k}.7 + 0.86을 계산하세요.`,[number('a','답',dec(k*100+156))],`${k}.7을 ${k}.70으로 보고 더하면 ${dec(k*100+156)}입니다.`)],
['missing','빈칸 거꾸로 구하기','blanks',2,({k})=>q(`□ − 1.85 = ${k}.47입니다. □는?`,[number('a','□',dec(k*100+232))],`뺀 수를 다시 더해요. ${k}.47 + 1.85 = ${dec(k*100+232)}입니다.`)],
['compare','세 자리 소수 비교','single',1,({k})=>q('더 큰 수를 고르세요.',[choice('a','더 큰 수',[`${k}.09`,`${k}.105`],`${k}.105`)],`${k}.090과 ${k}.105를 같은 자리끼리 비교해요. 소수 첫째 자리에서 나뉩니다.`)],
['sort','소수 순서','sort',2,({k})=>q('작은 수부터 차례로 누르세요.',[order('a','작은 수 → 큰 수',[`${k}.08`,`${k}.108`,`${k}.18`,`${k}.8`],[`${k}.08`,`${k}.108`,`${k}.18`,`${k}.8`])],`소수점을 맞추고 왼쪽 자리부터 비교해요.`)],
['place','자리의 값 구별','blanks',1,({k})=>q(`${k}.375에서 숫자 7이 나타내는 값과 5가 나타내는 값을 쓰세요.`,[number('a','7이 나타내는 값','0.07'),number('b','5가 나타내는 값','0.005')],`7은 소수 둘째 자리, 5는 소수 셋째 자리입니다.`)],
['ribbon','남은 길이','number',2,({k})=>q(`끈 ${k+4}.2m에서 1.85m와 0.76m를 잘랐어요. 남은 길이는?`,[number('a','남은 길이',dec((k+4)*100+20-261),'m')],`쓴 길이는 2.61m입니다. 처음 길이에서 빼면 ${dec((k+4)*100+20-261)}m입니다.`)],
['restore','처음 양 알아내기','number',3,({k})=>q(`물 1.75L를 쓰고 0.8L를 더 넣었더니 ${k+2}.35L가 되었어요. 처음 물의 양은?`,[number('a','처음 양',dec((k+2)*100+35-80+175),'L')],`넣은 0.8L를 빼고 쓴 1.75L를 더해 거꾸로 계산해요.`)],
['error','소수점 오류 고치기','explain',3,()=>q('3.6 + 0.85 = 1.21이라는 풀이를 고치세요.',[choice('why','틀린 이유',['끝자리만 맞추고 소수점은 맞추지 않았어요','소수 둘째 자리는 계산하면 안 돼요','덧셈 대신 곱셈을 해야 해요'],'끝자리만 맞추고 소수점은 맞추지 않았어요'),number('a','바른 답','4.45')],`3.6 = 3.60이므로 3.60 + 0.85 = 4.45입니다.`)],
['same','같은 크기 찾기','multi',2,({k})=>q(`${k}.5와 크기가 같은 수를 모두 고르세요.`,[multi('a','모두 선택',[`${k}.50`,`${k}.500`,`${k}.05`,`${k}.005`],[`${k}.50`,`${k}.500`])],`소수의 오른쪽 끝에 0을 붙여도 크기는 바뀌지 않아요. 자리 사이에 0을 넣는 것은 달라요.`)],
['difference','기록의 차이','number',2,({k})=>q(`긴 줄은 ${k+2}.05m, 짧은 줄은 ${k}.78m예요. 긴 줄은 짧은 줄보다 몇 m 더 긴가요?`,[number('a','길이 차이','1.27','m')],`긴 길이에서 짧은 길이를 빼면 1.27m입니다.`)],
['between','조건에 맞는 소수','multi',3,({k})=>q(`${k}.4보다 크고 ${k}.5보다 작은 수를 모두 고르세요.`,[multi('a','모두 선택',[`${k}.405`,`${k}.49`,`${k}.50`,`${k}.039`],[`${k}.405`,`${k}.49`])],`양 끝 수는 포함하지 않아요. 같은 자리끼리 비교하면 두 수만 사이에 있어요.`)],
['two','두 조건의 양','blanks',3,({k})=>q(`가방 가는 ${k}.65kg, 나는 가보다 0.48kg 가벼워요. 나의 무게와 두 가방 무게의 합을 쓰세요.`,[number('a','나의 무게',dec(k*100+17),'kg'),number('b','무게의 합',dec(k*200+82),'kg')],`나는 0.48kg을 빼고, 그 무게를 가의 무게에 더해요.`)],
['writing','소수의 크기 설명','written',3,()=>q('“0.9는 한 자리이고 0.12는 두 자리이므로 0.12가 더 크다.” 이 말이 왜 틀렸는지 설명하세요.',[],'0.9는 0.90과 같습니다. 소수 첫째 자리의 9와 1을 비교하면 0.9가 더 큽니다. 소수 자릿수가 많다고 큰 수는 아닙니다.',null,{rubric:['0.9와 같은 크기의 수를 이용했나요?','같은 자리의 숫자를 비교했나요?','어느 수가 큰지 결론을 썼나요?']})]
]);
const tNames=['예각삼각형','직각삼각형','둔각삼각형'];
register('triangle',[
['equal','변으로 분류','single',1,()=>q('세 변의 길이가 모두 6cm인 삼각형의 가장 알맞은 이름은?',[choice('a','이름',['이등변삼각형','정삼각형','직각삼각형'],'정삼각형')],'세 변의 길이가 모두 같은 삼각형은 정삼각형입니다.',triangle(60,'세 변 모두 6cm'))],
['angle-class','각으로 분류','single',1,()=>q('세 각이 35°, 45°, 100°인 삼각형을 각의 크기에 따라 분류하세요.',[choice('a','분류',tNames,'둔각삼각형')],'90°보다 큰 각이 하나 있으므로 둔각삼각형입니다.')],
['right','직각삼각형의 각','number',2,({k})=>q(`직각삼각형의 한 예각이 ${20+k*5}°예요. 나머지 예각은?`,[number('a','나머지 각',70-k*5,'°')],'세 각의 합 180°에서 직각 90°와 주어진 각을 빼요.')],
['iso','이등변삼각형의 밑각','number',2,({k})=>{const a=30+k*10;return q(`두 변의 길이가 같은 삼각형에서 두 변 사이의 각이 ${a}°예요. 나머지 두 각 중 한 각은?`,[number('a','한 밑각',(180-a)/2,'°')],`나머지 두 각은 같아요. (180 − ${a}) ÷ 2 = ${(180-a)/2}°입니다.`,triangle(a,`같은 두 변 사이의 각 ${a}°`));}],
['iso-top','이등변삼각형의 꼭지각','number',2,({k})=>{const a=35+k*5;return q(`이등변삼각형의 같은 두 각이 각각 ${a}°예요. 나머지 각은?`,[number('a','나머지 각',180-2*a,'°')],`180 − ${a} − ${a} = ${180-2*a}°입니다.`,triangle(180-2*a,`밑의 두 각이 각각 ${a}°`));}],
['both','변과 각 함께 분류','multi',2,()=>q('두 변의 길이가 같고 그 두 변 사이의 각이 100°인 삼각형에 맞는 이름을 모두 고르세요.',[multi('a','모두 선택',['이등변삼각형','정삼각형',...tNames],['이등변삼각형','둔각삼각형'])],'변의 길이로 보면 이등변삼각형, 각으로 보면 둔각삼각형입니다.',triangle(100,'같은 두 변 사이 100°'))],
['possible','삼각형의 각 조건','multi',3,()=>q('삼각형의 세 각이 될 수 있는 묶음을 모두 고르세요.',[multi('a','모두 선택',['40°, 60°, 80°','90°, 45°, 45°','70°, 60°, 60°','100°, 50°, 40°'],['40°, 60°, 80°','90°, 45°, 45°'])],'세 각의 합이 180°인 묶음만 가능합니다.')],
['classify','여러 삼각형 분류','classify',2,()=>q('각의 크기를 보고 각각 분류하세요.',[choice('a','50°, 60°, 70°',tNames,'예각삼각형'),choice('b','20°, 70°, 90°',tNames,'직각삼각형'),choice('c','30°, 40°, 110°',tNames,'둔각삼각형')],'가장 큰 각이 90°보다 작은지, 같은지, 큰지 살펴봐요.')],
['equilateral','정삼각형의 각','number',1,()=>q('정삼각형의 한 각은 몇 도인가요?',[number('a','한 각',60,'°')],'세 각의 크기가 같고 합이 180°이므로 180 ÷ 3 = 60°입니다.',triangle(60,'세 변의 길이가 같아요'))],
['wrong','각 하나만 본 오류','explain',3,()=>q('지수는 “30°인 각이 있으니 예각삼각형이야.”라고 말했어요. 이 판단에서 빠진 것을 고르세요.',[choice('a','추가로 확인할 것',['나머지 두 각도 모두 90°보다 작은지','변을 그린 색깔','꼭짓점이 위를 향하는지'],'나머지 두 각도 모두 90°보다 작은지')],'예각삼각형은 세 각이 모두 예각이어야 해요. 예각 하나만으로는 판단할 수 없어요.')],
['sort','가장 큰 각 순서','sort',2,()=>q('각의 크기에 따른 삼각형 이름을, 가장 큰 각이 작은 종류부터 누르세요.',[order('a','순서',tNames,tNames)],'예각삼각형의 가장 큰 각은 90°보다 작고, 직각삼각형은 90°, 둔각삼각형은 90°보다 큽니다.')],
['two-right','직각 두 개 판단','explain',3,()=>q('삼각형에 직각이 두 개 있을 수 있을까요? 판단과 이유를 고르세요.',[choice('a','판단',['있다','없다'],'없다'),choice('why','이유',['두 직각만으로 180°여서 나머지 각을 만들 수 없어요','삼각형의 모든 각은 같아요','삼각형은 세 변이 모두 달라야 해요'],'두 직각만으로 180°여서 나머지 각을 만들 수 없어요')],'두 직각의 합만 180°예요. 나머지 각이 0°가 되므로 삼각형이 될 수 없어요.')],
['condition','두 조건으로 찾기','pick',2,()=>q('이등변삼각형이면서 직각삼각형인 것을 고르세요.',[choice('a','세 각의 묶음',['45°, 45°, 90°','60°, 60°, 60°','40°, 40°, 100°'],'45°, 45°, 90°')],'직각 하나와 같은 두 각이 있어야 해요. 45°, 45°, 90°가 맞습니다.')],
['steps','각 구하는 과정','blanks',3,()=>q('꼭지각이 40°인 이등변삼각형의 한 밑각을 구하는 과정을 완성하세요.',[number('a','180 − 40',140,'°'),number('b','두 밑각 중 한 각',70,'°')],'나머지 두 각의 합은 140°이고 두 각이 같으므로 한 각은 70°예요.',triangle(40,'꼭지각 40°'))],
['writing','두 이름이 가능한 이유','written',3,()=>q('한 삼각형을 이등변삼각형이면서 직각삼각형이라고 부를 수 있어요. 가능한 각의 예를 들고 이유를 설명하세요.',[],'45°, 45°, 90°인 삼각형은 같은 두 변을 가진 이등변삼각형이며, 직각이 하나 있어 직각삼각형이기도 합니다.',null,{rubric:['가능한 세 각을 예로 들었나요?','변에 따른 이름을 설명했나요?','각에 따른 이름을 설명했나요?']})]
]);
const quadNames=['사다리꼴','평행사변형','마름모','직사각형','정사각형'];
register('quadrilateral',[
['parallel','평행의 뜻','single',1,()=>q('두 직선을 끝없이 늘여도 서로 만나지 않아요. 두 직선의 관계는?',[choice('a','관계',['평행','수직','항상 만난다'],'평행')],'아무리 늘여도 만나지 않는 두 직선은 서로 평행해요.')],
['perpendicular','수직의 뜻','number',1,()=>q('서로 수직인 두 직선이 만나 만드는 작은 각의 크기는?',[number('a','각',90,'°')],'두 직선이 만나 직각을 이루면 서로 수직이에요.')],
['rhombus','마름모 성질','multi',2,()=>q('모든 마름모에 항상 맞는 설명을 고르세요.',[multi('a','모두 선택',['네 변의 길이가 같아요','마주 보는 두 쌍의 변이 평행해요','네 각이 반드시 직각이에요'],['네 변의 길이가 같아요','마주 보는 두 쌍의 변이 평행해요'])],'마름모는 네 변의 길이가 같지만, 네 각이 모두 직각일 필요는 없어요.',quad('rhombus','네 변의 길이가 같아요'))],
['rectangle','직사각형 성질','multi',2,()=>q('모든 직사각형에 항상 맞는 설명을 고르세요.',[multi('a','모두 선택',['네 각이 직각이에요','마주 보는 변의 길이가 같아요','네 변의 길이가 반드시 같아요'],['네 각이 직각이에요','마주 보는 변의 길이가 같아요'])],'직사각형은 네 각이 직각이고 마주 보는 변의 길이가 같아요.',quad('rectangle'))],
['square','정사각형 이름 모두 찾기','multi',3,()=>q('정사각형에 해당하는 이름을 모두 고르세요.',[multi('a','모두 선택',['직사각형','마름모','평행사변형','삼각형'],['직사각형','마름모','평행사변형'])],'정사각형은 네 각이 직각이고 네 변이 같으며 마주 보는 변들이 평행해요.',quad('square'))],
['distance','평행선 사이 거리','pick',2,({k})=>q(`평행한 두 직선 사이에 선분 가와 나를 그었어요. 가는 두 직선에 수직이며 ${k+2}cm, 나는 비스듬하며 ${k+4}cm예요. 평행선 사이 거리를 나타내는 선분은?`,[choice('a','선분',['가','나'],'가')],'평행선 사이의 거리는 두 직선에 수직인 선분의 길이로 재요.')],
['parallelogram','마주 보는 변 길이','number',2,({k})=>q(`평행사변형 ABCD에서 AB가 ${k+4}cm예요. 마주 보는 CD는 몇 cm인가요?`,[number('a','CD',k+4,'cm')],'평행사변형에서 마주 보는 변의 길이는 같아요.',quad('parallelogram','AB와 CD는 마주 보는 변'))],
['classify','조건으로 사각형 분류','classify',2,()=>q('설명과 가장 알맞은 이름을 연결하세요.',[choice('a','네 변이 같고 직각이 없는 사각형',quadNames,'마름모'),choice('b','네 각이 직각이고 이웃한 두 변의 길이가 다른 사각형',quadNames,'직사각형'),choice('c','네 변이 같고 네 각이 직각인 사각형',quadNames,'정사각형')],'변과 각의 조건을 함께 확인해요.')],
['trapezoid','평행한 변 찾기','single',1,()=>q('평행한 변이 한 쌍이라도 있는 사각형을 무엇이라고 하나요?',[choice('a','이름',['사다리꼴','정삼각형','원'],'사다리꼴')],'평행한 변이 한 쌍이라도 있는 사각형은 사다리꼴입니다.',quad('trapezoid'))],
['counterexample','잘못된 주장 고치기','explain',3,()=>q('“네 변이 같으면 반드시 정사각형이다.”라는 말의 반례를 고르세요.',[choice('a','반례',['직각이 없는 마름모','정사각형','정삼각형'],'직각이 없는 마름모'),choice('why','이유',['네 변은 같아도 네 각이 직각이 아닐 수 있어요','정사각형의 변은 모두 달라요'],'네 변은 같아도 네 각이 직각이 아닐 수 있어요')],'정사각형이 되려면 네 변뿐 아니라 네 각도 확인해야 해요.',quad('rhombus'))],
['angle','평행사변형의 각','number',2,({k})=>q(`평행사변형에서 한 각이 ${50+k*5}°예요. 그 각과 마주 보는 각의 크기는?`,[number('a','마주 보는 각',50+k*5,'°')],'평행사변형은 마주 보는 각의 크기가 같아요.')],
['all','두 조건 모두 만족','pick',2,()=>q('네 각이 직각이며 네 변의 길이도 같은 도형을 고르세요.',[choice('a','도형',quadNames,'정사각형')],'네 각이 직각이고 네 변의 길이가 같은 사각형은 정사각형이에요.',quad('square'))],
['inclusive','포함 관계 판단','multi',3,()=>q('항상 옳은 말을 모두 고르세요.',[multi('a','모두 선택',['정사각형은 직사각형이에요','정사각형은 마름모예요','모든 직사각형은 정사각형이에요','모든 마름모는 정사각형이에요'],['정사각형은 직사각형이에요','정사각형은 마름모예요'])],'정사각형은 두 성질을 모두 갖지만, 직사각형이나 마름모가 반드시 정사각형인 것은 아니에요.')],
['missing','추가 조건 찾기','explain',3,()=>q('평행사변형을 직사각형이라고 판단하려면 다음 중 어떤 조건을 확인하면 되나요?',[choice('a','조건',['네 각이 모두 직각이다','마주 보는 변이 평행하다','꼭짓점이 네 개다'],'네 각이 모두 직각이다')],'평행사변형이라는 조건만으로 직사각형인지 알 수 없어요. 네 각이 직각인지 확인해요.')],
['writing','정사각형과 마름모','written',3,()=>q('정사각형은 마름모라고 할 수 있지만, 마름모가 항상 정사각형인 것은 아니에요. 변과 각을 이용해 설명하세요.',[],'정사각형은 네 변의 길이가 같아서 마름모입니다. 하지만 마름모는 각이 직각이 아닐 수도 있으므로 항상 정사각형인 것은 아닙니다.',quad('rhombus'),{rubric:['마름모의 변의 성질을 썼나요?','정사각형의 각 조건을 썼나요?','항상 성립하는 방향과 아닌 방향을 구별했나요?']})]
]);
const segments=['월→화','화→수','수→목','목→금'];const gains=v=>v.slice(1).map((n,i)=>n-v[i]);const greatest=v=>segments[gains(v).indexOf(Math.max(...gains(v)))];
const graphVisual=values=>({kind:'graph',values,labels:['월','화','수','목','금'],unit:'cm'});
register('graph',[
['read','눈금 읽기','number',1,({values})=>q('목요일의 식물 키는 몇 cm인가요?',[number('a','목요일',values[3],'cm')],'목요일의 점에서 세로 눈금을 읽어요.',graphVisual(values))],
['highest','가장 높은 때','pick',1,({values})=>q('식물 키가 가장 큰 요일을 고르세요.',[choice('a','요일',['월','화','수','목','금'],'금')],'가장 위에 있는 점은 금요일이에요.',graphVisual(values))],
['increase','가장 많이 증가한 구간','pick',2,({values})=>q('하루 사이 키가 가장 많이 자란 구간을 고르세요.',[choice('a','구간',segments,greatest(values))],`각 구간의 증가량은 ${gains(values).join(', ')}cm입니다. ${greatest(values)}이 가장 커요.`,graphVisual(values))],
['total','전체 변화량','number',2,({values})=>q('월요일부터 금요일까지 모두 몇 cm 자랐나요?',[number('a','자란 길이',values[4]-values[0],'cm')],'마지막 키에서 처음 키를 빼요. 점들의 키를 모두 더하지 않아요.',graphVisual(values))],
['compare','두 구간 변화 비교','blanks',2,({values})=>q('월→화와 수→목의 증가량을 각각 구하세요.',[number('a','월→화',gains(values)[0],'cm'),number('b','수→목',gains(values)[2],'cm')],`각 구간의 나중 값에서 처음 값을 빼면 ${gains(values)[0]}cm와 ${gains(values)[2]}cm예요.`,graphVisual(values))],
['equal','같은 증가량 찾기','multi',2,({values})=>q(`하루 사이 ${Math.min(...gains(values))}cm 자란 구간을 모두 고르세요.`,[multi('a','모두 선택',segments,segments.filter((_,i)=>gains(values)[i]===Math.min(...gains(values))))],`구간별 증가량 ${gains(values).join(', ')}cm를 비교해요.`,graphVisual(values))],
['table','표를 그래프로','pick',2,({k})=>q(`월요일 ${k+5}cm, 화요일 ${k+7}cm, 수요일 ${k+6}cm였어요. 화요일 점을 찍을 세로 눈금은?`,[choice('a','눈금',[`${k+5}cm`,`${k+7}cm`,`${k+6}cm`],`${k+7}cm`)],'날짜와 그 날짜의 값을 함께 확인하고 점을 찍어요.',{kind:'graph',values:[k+5,k+7,k+6],labels:['월','화','수'],unit:'cm',hidePoints:true})],
['suitable','알맞은 그래프 고르기','single',1,()=>q('하루 동안 2시간마다 잰 기온의 변화를 나타내려고 해요. 더 알맞은 그래프는?',[choice('a','그래프',['꺾은선그래프','막대그래프'],'꺾은선그래프')],'꺾은선그래프는 시간에 따른 변화를 살펴보기에 좋아요.')],
['misread','높이와 증가량 구별','explain',3,({values})=>q('“금요일 점이 가장 높으니 목→금에 가장 많이 자랐다.”라는 설명을 고치세요.',[choice('why','틀린 이유',['점의 높이와 구간의 증가량은 달라요','높은 점은 항상 틀린 자료예요'],'점의 높이와 구간의 증가량은 달라요'),choice('a','가장 많이 자란 구간',segments,greatest(values))],'키가 가장 큰 날과 가장 많이 자란 구간은 다를 수 있어요.',graphVisual(values))],
['predict','예상과 사실 구별','explain',3,({values})=>q('이 그래프만 보고 토요일의 키를 정확히 알 수 있나요?',[choice('a','판단',['정확히 알 수 있어요','변화를 보고 예상만 할 수 있어요'],'변화를 보고 예상만 할 수 있어요'),choice('why','이유',['토요일에 실제로 잰 값은 없어요','모든 날에 같은 양만큼 자라요'],'토요일에 실제로 잰 값은 없어요')],'측정하지 않은 날은 예상할 수 있지만 정확한 사실로 단정할 수는 없어요.',graphVisual(values))],
['steps','그래프 그리는 순서','sort',2,()=>q('표를 꺾은선그래프로 나타내는 순서를 고르세요.',[order('a','순서',['가로와 세로에 나타낼 것을 정한다','값에 맞게 눈금을 정한다','각 자료의 위치에 점을 찍는다','시간 순서대로 점을 선분으로 잇는다'],['가로와 세로에 나타낼 것을 정한다','값에 맞게 눈금을 정한다','각 자료의 위치에 점을 찍는다','시간 순서대로 점을 선분으로 잇는다'])],'축과 눈금을 정한 뒤 점을 찍고 차례로 이어야 해요.')],
['fall','증가·감소 분류','classify',2,({k})=>q('물의 온도가 월 20°C, 화 25°C, 수 23°C, 목 23°C였어요. 구간별 변화를 분류하세요.',[choice('a','월→화',['증가','감소','변화 없음'],'증가'),choice('b','화→수',['증가','감소','변화 없음'],'감소'),choice('c','수→목',['증가','감소','변화 없음'],'변화 없음')],'나중 값이 크면 증가, 작으면 감소, 같으면 변화 없음이에요.',{kind:'graph',values:[20,25,23,23],labels:['월','화','수','목'],unit:'°C'})],
['evidence','자료에서 근거 찾기','multi',3,({values})=>q('그래프에서 확인할 수 있는 사실을 모두 고르세요.',[multi('a','모두 선택',[`월요일보다 금요일에 ${values[4]-values[0]}cm 더 커요`,`${segments.filter((_,i)=>gains(values)[i]===Math.min(...gains(values))).join('와 ')}은 똑같이 ${Math.min(...gains(values))}cm 자랐어요`,'토요일에는 반드시 1cm 자랄 거예요'],[`월요일보다 금요일에 ${values[4]-values[0]}cm 더 커요`,`${segments.filter((_,i)=>gains(values)[i]===Math.min(...gains(values))).join('와 ')}은 똑같이 ${Math.min(...gains(values))}cm 자랐어요`])],'기록된 값으로 확인할 수 있는 사실과 아직 모르는 예상을 구별해요.',graphVisual(values))],
['reverse','빠진 자료 거꾸로 찾기','number',3,({k})=>q(`화요일은 ${k+8}cm이고, 월요일보다 3cm 자랐어요. 표에서 빠진 월요일의 키는?`,[number('a','월요일',k+5,'cm')],'나중 값에서 증가량을 빼면 처음 값이 나와요.')],
['writing','그래프로 설명하기','written',3,({values})=>q('가장 많이 자란 구간을 찾고, 두 날짜의 값을 이용해 이유를 설명하세요.',[],`${greatest(values)}에서 ${Math.max(...gains(values))}cm 자랐습니다. 각 구간의 증가량 ${gains(values).join(', ')}cm를 비교하면 이 구간의 증가량이 가장 큽니다.`,graphVisual(values),{rubric:['하루 사이의 구간을 썼나요?','나중 값에서 처음 값을 뺀 계산을 썼나요?','다른 구간과 비교한 근거가 있나요?']})]
]);
register('polygon',[
['name','변의 수로 이름 짓기','single',1,({n})=>q(`변이 ${n}개인 다각형의 이름은?`,[choice('a','이름',['오각형','육각형','칠각형','팔각형'][n-5]?[...['오각형','육각형','칠각형','팔각형']]:[],['오각형','육각형','칠각형','팔각형'][n-5])],`다각형의 이름은 변의 수에 따라 정해요. 변이 ${n}개입니다.`,polygon(n))],
['vertices','변과 꼭짓점 수','number',1,({n})=>q(`변이 ${n}개인 다각형의 꼭짓점은 몇 개인가요?`,[number('a','꼭짓점',n,'개')],'다각형은 변의 수와 꼭짓점의 수가 같아요.',polygon(n))],
['definition','다각형 조건','multi',1,()=>q('다각형에 맞는 조건을 모두 고르세요.',[multi('a','모두 선택',['선분으로 둘러싸여 있어요','닫힌 도형이에요','반드시 곡선이 있어요','변의 길이가 반드시 모두 같아요'],['선분으로 둘러싸여 있어요','닫힌 도형이에요'])],'다각형은 선분으로 둘러싸인 닫힌 도형이에요.')],
['regular','정다각형 조건','multi',2,()=>q('정다각형을 판단할 때 꼭 확인할 조건을 모두 고르세요.',[multi('a','모두 선택',['모든 변의 길이가 같아요','모든 각의 크기가 같아요','꼭짓점이 반드시 4개예요'],['모든 변의 길이가 같아요','모든 각의 크기가 같아요'])],'변의 길이와 각의 크기 두 조건을 모두 확인해요.',polygon(5,'정오각형'))],
['diagonal','대각선 고르기','pick',2,()=>q('오각형의 꼭짓점이 둘레를 따라 A, B, C, D, E예요. A에서 그은 대각선을 모두 고르세요.',[multi('a','모두 선택',['AB','AC','AD','AE'],['AC','AD'])],'대각선은 이웃하지 않는 두 꼭짓점을 잇는 선분입니다.',polygon(5,'꼭짓점은 둘레 순서'))],
['one-vertex','한 꼭짓점의 대각선 수','number',2,({n})=>q(`${n}각형의 한 꼭짓점에서 그을 수 있는 대각선은 몇 개인가요? 그림에서 세어 보세요.`,[number('a','대각선',n-3,'개')],'자기 자신과 이웃한 두 꼭짓점에는 대각선을 그을 수 없어요.',polygon(n))],
['all-diagonal','오각형의 대각선 세기','number',3,()=>q('오각형의 대각선은 모두 몇 개인가요? 같은 선분을 두 번 세지 않도록 주의하세요.',[number('a','대각선',5,'개')],'AC, AD, BD, BE, CE의 5개입니다. AC와 CA는 같은 선분이에요.',polygon(5))],
['classify','변·대각선 구별','classify',2,()=>q('육각형의 꼭짓점이 둘레 순서로 A~F예요. 각 선분을 분류하세요.',[choice('a','AB',['변','대각선'],'변'),choice('b','AD',['변','대각선'],'대각선'),choice('c','AF',['변','대각선'],'변')],'둘레에서 이웃한 두 꼭짓점을 이으면 변이고, 이웃하지 않으면 대각선이에요.',polygon(6))],
['counterexample','변만 같은 도형','explain',3,()=>q('네 변의 길이가 같고 각은 60°, 120°, 60°, 120°인 사각형은 정다각형인가요?',[choice('a','판단',['정다각형이다','정다각형이 아니다'],'정다각형이 아니다'),choice('why','이유',['각의 크기가 모두 같지는 않아요','변이 네 개라서 안 돼요'],'각의 크기가 모두 같지는 않아요')],'정다각형은 변뿐 아니라 각의 크기도 모두 같아야 해요.',quad('rhombus','각: 60°, 120°, 60°, 120°'))],
['rectangle','각만 같은 도형','single',2,()=>q('가로 6cm, 세로 3cm인 직사각형이 정다각형이 아닌 이유는?',[choice('a','이유',['네 변의 길이가 모두 같지 않아요','네 각이 직각이 아니에요','닫힌 도형이 아니에요'],'네 변의 길이가 모두 같지 않아요')],'네 각은 같지만 네 변의 길이가 모두 같지는 않아요.',quad('rectangle','가로 6cm · 세로 3cm'))],
['sort','변의 수 순서','sort',2,()=>q('변의 수가 적은 것부터 누르세요.',[order('a','순서',['삼각형','오각형','육각형','팔각형'],['삼각형','오각형','육각형','팔각형'])],'각각 변이 3, 5, 6, 8개입니다.')],
['regular-pick','정다각형 모두 찾기','multi',2,()=>q('정다각형인 것을 모두 고르세요.',[multi('a','모두 선택',['정삼각형','정사각형','가로와 세로가 다른 직사각형','각이 모두 같지 않은 마름모'],['정삼각형','정사각형'])],'정삼각형과 정사각형은 변과 각이 각각 모두 같아요.')],
['double-count','중복해서 센 오류','explain',3,()=>q('오각형에서 A→C와 C→A를 서로 다른 대각선 두 개로 셌어요. 올바른 판단을 고르세요.',[choice('a','판단',['같은 두 꼭짓점을 잇는 같은 선분이에요','출발점이 달라서 다른 대각선이에요'],'같은 두 꼭짓점을 잇는 같은 선분이에요'),number('b','AC와 CA를 합쳐 세는 대각선 수',1,'개')],'방향을 바꾸어 읽어도 같은 선분이므로 한 번만 세요.',polygon(5))],
['conditions','두 조건으로 다각형 찾기','blanks',3,({n})=>q(`한 꼭짓점에서 이웃하지 않는 꼭짓점 ${n-3}개로 대각선을 그었어요. 그 다각형의 변과 꼭짓점 수는?`,[number('a','변의 수',n,'개'),number('b','꼭짓점 수',n,'개')],`연결한 ${n-3}개에 자기 자신 1개와 이웃한 꼭짓점 2개를 더하면 ${n}개입니다.`)],
['writing','정다각형 판단 설명','written',3,()=>q('“네 각이 모두 직각인 사각형은 언제나 정다각형이다.” 이 말이 맞는지, 예를 들어 설명하세요.',[],'틀린 말입니다. 가로 6cm, 세로 3cm인 직사각형은 네 각이 같지만 네 변의 길이가 모두 같지 않습니다. 정다각형은 변의 길이와 각의 크기가 각각 모두 같아야 합니다.',quad('rectangle'),{rubric:['맞는지 틀린지 판단했나요?','조건에 맞는 예를 들었나요?','변과 각 두 조건으로 설명했나요?']})]
]);
function generate(id,seed){const t=templates.find(t=>t.id===id);if(!t)throw Error('알 수 없는 문제');const rng=random(seed),integer=(a,b)=>a+Math.floor(rng()*(b-a+1)),d=integer(5,12),k=integer(1,4),n=integer(5,8),start=integer(5,10),factor=integer(1,2),growth=[2,1,4,1].map(n=>n*factor),rotation=integer(0,2);for(let i=3;i>0;i--){const j=integer(0,i);[growth[i],growth[j]]=[growth[j],growth[i]];}if(growth.indexOf(4*factor)===3)[growth[rotation],growth[3]]=[growth[3],growth[rotation]];const values=[start];growth.forEach(n=>values.push(values[values.length-1]+n));const out=t.build({rng,integer,d,k,n,values});out.fields.forEach(f=>{if(f.options)f.options=f.options.slice();if(f.options){for(let i=f.options.length-1;i>0;i--){const j=integer(0,i);[f.options[i],f.options[j]]=[f.options[j],f.options[i]];}}});return {...out,id:t.id,unit:t.unit,title:t.title,type:t.type,level:t.level};}
function validDescriptor(d){return !!d&&d.schema===2&&Number.isInteger(d.seed)&&d.seed>=0&&d.seed<=0xffffffff&&templates.some(t=>t.id===d.template);}
function select(selected,recent=[],writing=false,rng=Math.random){const ids=units.filter(u=>selected?.includes(u.id)).map(u=>u.id);if(!ids.length)ids.push('fraction');const last=recent.slice(-8),available=ids.filter(id=>!last.slice(-Math.min(ids.length-1,5)).some(x=>x.startsWith(id+'.'))),unit=(available.length?available:ids)[Math.floor(rng()*(available.length||ids.length))];const roll=rng(),level=roll<.2?1:roll<.7?2:3;let pool=templates.filter(t=>t.unit===unit&&(writing?t.type==='written':t.type!=='written'&&t.level===level));if(!pool.length)pool=templates.filter(t=>t.unit===unit&&(writing?t.type==='written':t.type!=='written'));const fresh=pool.filter(t=>!last.includes(t.id));if(fresh.length)pool=fresh;const t=pool[Math.floor(rng()*pool.length)];return {schema:2,template:t.id,seed:Math.floor(rng()*0x100000000)};}
function rational(value){const s=String(value??'').trim().replace(/과/g,' ').replace(/\s+/g,' ');let m;if((m=s.match(/^(?:(\d+) )?(\d+)\/(\d+)$/))){const d=+m[3];return d>0?[(+(m[1]||0))*d+(+m[2]),d]:null;}if(!/^\d+(?:\.\d{1,3})?$/.test(s))return null;const [a,b='']=s.split('.'),d=10**b.length;return [+a*d+(+b||0),d];}
function grade(question,answers){if(question.type==='written')return {status:'submitted',correct:null,parts:[]};const parts=question.fields.map(f=>{const value=answers[f.id];let correct=false;if(['number','fraction'].includes(f.kind)){const a=rational(value),b=rational(f.answer);correct=!!a&&!!b&&a[0]*b[1]===b[0]*a[1];}else if(f.kind==='multi'){correct=Array.isArray(value)&&new Set(value).size===value.length&&value.length===f.answer.length&&f.answer.every(x=>value.includes(x));}else if(f.kind==='order'){correct=Array.isArray(value)&&value.length===f.answer.length&&value.every((x,i)=>x===f.answer[i]);}else correct=value===f.answer;return {id:f.id,correct};});return {status:parts.every(p=>p.correct)?'correct':'incorrect',correct:parts.every(p=>p.correct),parts};}
const api={units,templates,generate,select,validDescriptor,grade,rational,random};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FWStudy=api;
})(typeof window!=='undefined'?window:globalThis);
