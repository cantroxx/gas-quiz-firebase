/* Original Fraction World content. No remote assets or student-data dependencies. */
(function (root) {
  'use strict';
  const C = {
    biomes: [
      { name: '이끼빛 폐허', color: '#79e8ba', floor: '#142d32', boss: '뿌리의 파수꾼', tip: '돌진 표시를 보고 옆으로 피하세요.' },
      { name: '유리 사막', color: '#ffc879', floor: '#352737', boss: '모래시계 마녀', tip: '탄막 사이의 틈을 찾아 천천히 이동하세요.' },
      { name: '푸른 잿불 성채', color: '#86baff', floor: '#202b4c', boss: '잿불 기사', tip: '회피를 아껴 두고 연속 돌진에 대비하세요.' },
      { name: '별 없는 왕좌', color: '#da9fff', floor: '#30213e', boss: '균열의 심장', tip: '소환된 적을 먼저 정리하면 공간이 생겨요.' }
    ],
    weapons: [
      { id: 'wand', name: '별빛 지팡이', icon: '✦', desc: '균형 잡힌 원거리 마법', damage: 20, interval: .58, speed: 390, count: 1, color: '#9ef6d0' },
      { id: 'bow', name: '유성 활', icon: '➶', desc: '빠른 단일 공격 · 정밀한 사냥', damage: 15, interval: .35, speed: 570, count: 1, color: '#ffdb8a' },
      { id: 'fan', name: '달의 부채', icon: '❋', desc: '세 갈래 공격 · 가까이서 강력', damage: 10, interval: .8, speed: 310, count: 3, color: '#e6a8ff' },
      { id: 'orb', name: '서리 보주', icon: '❄', desc: '느리지만 묵직한 관통탄', damage: 34, interval: .9, speed: 260, count: 1, pierce: 2, color: '#91d8ff' },
      { id: 'needle', name: '번개 바늘', icon: 'ϟ', desc: '초고속 연사 · 낮은 한 발 위력', damage: 8, interval: .2, speed: 620, count: 1, color: '#fff18b' },
      { id: 'comet', name: '혜성 대포', icon: '☄', desc: '강력한 두 발 · 긴 공격 간격', damage: 27, interval: 1.15, speed: 360, count: 2, color: '#ffa78f' }
    ],
    relics: [
      ['ember','잿불 씨앗','🔥','공격력 +22%','fire'], ['frost','서리 눈꽃','❄','맞은 적의 이동 속도 감소','ice'],
      ['storm','폭풍 깃털','ϟ','공격 속도 +18%','storm'], ['twin','쌍둥이 별','✦','발사체 +1 · 발당 위력 -12%','star'],
      ['heart','숲의 심장','♥','최대 체력 +25 · 즉시 25 회복','earth'], ['boots','바람 장화','➶','이동 속도 +15%','storm'],
      ['pierce','유리 바늘','◇','적 관통 +1','ice'], ['leech','생명의 이슬','♧','적 처치마다 체력 1 회복','earth'],
      ['nova','초신성 조각','☀','특수 기술 위력 +60%','star'], ['clock','시간 톱니','◷','특수 기술 대기시간 -20%','star'],
      ['shield','수호 비늘','⬡','받는 피해 -15%','earth'], ['dash','잔상 망토','〰','회피 대기시간 -25%','storm'],
      ['crit','붉은 렌즈','◈','치명타 확률 +20%','fire'], ['reach','긴 꼬리별','☄','탄속 +25%','star'],
      ['fury','전사의 불씨','♨','체력 절반 이하에서 위력 +40%','fire'], ['heal','오래된 성배','♜','방 완료마다 체력 10 회복','earth'],
      ['echo','메아리 종','♬','발사체 +1 · 공격 간격 +12%','star'], ['icewall','얼음 갑옷','▣','받는 피해 -10% · 최대 체력 +15','ice'],
      ['spark','전류 고리','◎','가까운 적에게 주기적으로 전기 피해','storm'], ['bloom','가시 꽃','✿','접촉 피해를 입으면 주변 적 반격','earth'],
      ['meteor','운석 핵','◆','공격력 +35% · 이동 속도 -8%','fire'], ['shard','빙하 파편','❖','느려진 적에게 피해 +25%','ice'],
      ['luck','황금 나침반','✧','방 완료 때 탐험 결정 +8','star'], ['crown','공허 왕관','♛','공격력 +45% · 받는 피해 +20%','fire']
    ].map(([id,name,icon,desc,tag]) => ({id,name,icon,desc,tag})),
    members: [
      ['lumi','루미','라벤더 리더','#c3a7ff',22,16,18,'team'], ['rio','리오','리듬 탐험가','#ffb38e',14,27,14,'dance'],
      ['sora','소라','맑은 목소리','#8ddcff',28,12,15,'vocal'], ['navi','나비','무대의 이야기꾼','#ffa3c8',17,17,25,'charm'],
      ['ian','이안','차분한 작곡가','#97e4c1',23,18,14,'rest'], ['momo','모모','에너지 메이커','#ffe399',14,24,20,'team'],
      ['noel','노엘','별빛 솔리스트','#b9bdff',25,15,19,'vocal'], ['yul','율','정교한 댄서','#f7a9a0',16,26,16,'dance']
    ].map(([id,name,title,color,vocal,dance,charm,trait]) => ({id,name,title,color,vocal,dance,charm,trait})),
    activities: [
      {id:'vocal',name:'보컬 레슨',icon:'♫',desc:'보컬 +5 · 체력 -12',cost:12,energy:-12,vocal:5},
      {id:'dance',name:'안무 연습',icon:'✧',desc:'댄스 +5 · 체력 -15',cost:12,energy:-15,dance:5},
      {id:'charm',name:'표현 수업',icon:'☺',desc:'표현 +5 · 체력 -10',cost:10,energy:-10,charm:5},
      {id:'team',name:'합동 연습',icon:'♧',desc:'팀워크 +7 · 곡 숙련 +5 · 체력 -14',cost:8,energy:-14,team:7,mastery:5},
      {id:'rehearse',name:'무대 리허설',icon:'★',desc:'곡 숙련 +14 · 체력 -16',cost:8,energy:-16,mastery:14},
      {id:'rest',name:'충분한 휴식',icon:'☾',desc:'체력 +29 · 팀워크 +1',cost:0,energy:29,team:1},
      {id:'outing',name:'함께 소풍',icon:'❀',desc:'체력 +17 · 팀워크 +5',cost:16,energy:17,team:5},
      {id:'promo',name:'라디오 출연',icon:'◉',desc:'팬 +22 · 표현 +1 · 체력 -9',cost:10,energy:-9,fans:22,charm:1},
      {id:'busk',name:'거리 공연',icon:'♬',desc:'자금 +30 · 팬 +10 · 체력 -13',cost:-30,energy:-13,fans:10},
      {id:'compose',name:'곡 연구',icon:'✎',desc:'곡 숙련 +8 · 보컬 +2 · 체력 -9',cost:6,energy:-9,mastery:8,vocal:2},
      {id:'workshop',name:'댄스 워크숍',icon:'❖',desc:'댄스 +3 · 표현 +2 · 체력 -11',cost:14,energy:-11,dance:3,charm:2},
      {id:'fanmeet',name:'팬과의 만남',icon:'♡',desc:'팬 +14 · 팀워크 +3 · 체력 -8',cost:5,energy:-8,fans:14,team:3}
    ],
    songs: [
      ['first','첫 번째 별','청량',.4,.35,.25,1],['moon','달빛 편지','몽환',.55,.2,.25,1],['run','달려! 우리','파워',.2,.6,.2,1],
      ['bloom','꽃피는 궤도','청량',.35,.3,.35,2],['velvet','보랏빛 밤','몽환',.45,.2,.35,2],['spark','스파크','파워',.25,.5,.25,2],
      ['aurora','오로라 약속','몽환',.5,.25,.25,3],['orbit','우리의 공전','청량',.3,.35,.35,3],['super','슈퍼노바','파워',.25,.55,.2,3]
    ].map(([id,name,concept,vocal,dance,charm,tier]) => ({id,name,concept,vocal,dance,charm,tier})),
    outfits: [
      ['basic','연습복','자유',0,0],['mint','민트 스쿨룩','청량',35,3],['lilac','라일락 드림','몽환',35,3],['neon','네온 러너','파워',35,3],
      ['sky','하늘빛 항해','청량',70,6],['silk','달의 정원','몽환',70,6],['black','미드나잇 히어로','파워',70,6],
      ['sun','햇살 페스티벌','청량',110,9],['crystal','크리스털 왈츠','몽환',110,9],['flame','불꽃 피날레','파워',110,9],
      ['galaxy','은하수 재킷','자유',160,7],['final','별의 왕관','자유',230,10]
    ].map(([id,name,concept,cost,bonus]) => ({id,name,concept,cost,bonus})),
    facilities: [
      {id:'vocal',name:'녹음 부스',icon:'♫',desc:'보컬 활동 성장량 +1 / 단계',cost:65},
      {id:'dance',name:'댄스 스튜디오',icon:'◇',desc:'댄스 활동 성장량 +1 / 단계',cost:65},
      {id:'charm',name:'표현 연습실',icon:'✦',desc:'표현 활동 성장량 +1 / 단계',cost:60},
      {id:'rest',name:'구름 휴게실',icon:'☁',desc:'휴식 회복량 +4 / 단계',cost:55},
      {id:'promo',name:'라디오 부스',icon:'◉',desc:'팬 활동 효과 +4 / 단계',cost:70},
      {id:'stage',name:'홀로그램 무대',icon:'▥',desc:'공연 점수 +2 / 단계',cost:90}
    ],
    events: [
      {title:'동네 축제의 초대',text:'짧은 무대로 경험을 쌓을까요, 계획한 훈련에 집중할까요?',choices:[{name:'특별 무대',energy:-8,fans:18,cash:15},{name:'계획 지키기',team:3}]},
      {title:'새로운 안무 아이디어',text:'멤버가 어려운 동작을 제안했어요.',choices:[{name:'함께 도전',energy:-7,dance:2,team:3},{name:'기본기 다지기',vocal:1,energy:4}]},
      {title:'응원의 편지',text:'팬들이 손으로 쓴 응원을 보냈어요.',choices:[{name:'답장 쓰기',fans:12,team:3},{name:'연습실에 전시',energy:9}]},
      {title:'스튜디오 대여 제안',text:'쉬는 시간에 연습실을 빌려 달래요.',choices:[{name:'빌려 주기',cash:25,energy:-4},{name:'우리 팀 휴식',energy:10}]},
      {title:'의견이 다른 하루',text:'무대 표현을 두고 두 가지 의견이 나왔어요.',choices:[{name:'서로 들어 보기',team:7,energy:-4},{name:'두 안을 연습',charm:2,energy:-6}]},
      {title:'야외 촬영',text:'오늘은 햇빛이 좋아요. 어떤 장면을 남길까요?',choices:[{name:'활기찬 퍼포먼스',fans:15,energy:-7},{name:'편안한 일상',team:3,energy:5}]},
      {title:'선배의 조언',text:'선배가 짧은 수업을 제안했어요.',choices:[{name:'보컬 배우기',vocal:2,energy:-5},{name:'댄스 배우기',dance:2,energy:-5}]},
      {title:'함께 만든 간식',text:'연습이 끝나고 간식을 나눠 먹어요.',choices:[{name:'팀 이야기',team:5,energy:4},{name:'내일 준비',mastery:5,energy:4}]}
    ],
    concerts: [
      {day:7,name:'루키 쇼케이스',concept:'청량',score:32,team:28,energy:28,fans:35,reward:90},
      {day:14,name:'달빛 라이브',concept:'몽환',score:43,team:40,energy:32,fans:95,reward:130},
      {day:21,name:'라이징 페스티벌',concept:'파워',score:55,team:53,energy:36,fans:180,reward:180},
      {day:28,name:'스타라이트 어워즈',concept:'자유',score:68,team:67,energy:42,fans:290,reward:250}
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
  else root.FWContent = C;
})(typeof window !== 'undefined' ? window : globalThis);
