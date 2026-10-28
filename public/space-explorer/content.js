(function (root) {
  'use strict';
  const bodies = [
    { id:'sun', name:'태양', en:'SUN', color:'#ffc568', size:109, au:0, kind:'별' },
    { id:'mercury', name:'수성', en:'MERCURY', color:'#b4aaa0', size:.38, au:.39, kind:'행성' },
    { id:'venus', name:'금성', en:'VENUS', color:'#dfb777', size:.95, au:.72, kind:'행성' },
    { id:'earth', name:'지구', en:'EARTH', color:'#6abccd', size:1, au:1, kind:'행성' },
    { id:'mars', name:'화성', en:'MARS', color:'#d97c58', size:.53, au:1.52, kind:'행성' },
    { id:'jupiter', name:'목성', en:'JUPITER', color:'#d9b18d', size:11.2, au:5.2, kind:'행성' },
    { id:'saturn', name:'토성', en:'SATURN', color:'#e8ce94', size:9.45, au:9.58, kind:'행성' },
    { id:'uranus', name:'천왕성', en:'URANUS', color:'#91d6d5', size:4.01, au:19.2, kind:'행성' },
    { id:'neptune', name:'해왕성', en:'NEPTUNE', color:'#6293d9', size:3.88, au:30.05, kind:'행성' },
    { id:'moon', name:'달', en:'MOON', color:'#ccd0ce', size:.27, kind:'위성' },
    { id:'observatory', name:'달 관측소', en:'LUNAR DIARY', color:'#b9c6ec', kind:'지구 관측' },
    { id:'sky', name:'별자리 사진 탐사', en:'NORTHERN SKY', color:'#bed2fa', kind:'지구 관측' },
    { id:'galaxy', name:'우리은하', en:'MILKY WAY', color:'#c4a8e5', kind:'확장 탐험' }
  ];
  const phases = [
    { day:3, name:'초승달', phase:.10 }, { day:7, name:'상현달', phase:.25 },
    { day:11, name:'차오르는 달', phase:.38 }, { day:15, name:'보름달', phase:.5 },
    { day:19, name:'기우는 달', phase:.64 }, { day:22, name:'하현달', phase:.75 },
    { day:26, name:'그믐달', phase:.89 }
  ];
  // A schematic northern-sky chart, not an ephemeris or a distance model.
  const stars = [
    {id:'polaris',x:52,y:37,name:'북극성'}, {id:'u1',x:55,y:46}, {id:'u2',x:62,y:51}, {id:'u3',x:69,y:50}, {id:'u4',x:72,y:59}, {id:'u5',x:63,y:63}, {id:'u6',x:59,y:55},
    {id:'d1',x:13,y:72}, {id:'d2',x:19,y:62}, {id:'d3',x:28,y:58}, {id:'d4',x:36,y:62}, {id:'d5',x:46,y:58}, {id:'d6',x:48,y:48}, {id:'d7',x:36,y:51},
    {id:'c1',x:63,y:23}, {id:'c2',x:70,y:31}, {id:'c3',x:76,y:20}, {id:'c4',x:84,y:28}, {id:'c5',x:90,y:15}
  ];
  const lines = [['polaris','u1','u2','u3','u4','u5','u6','u2'], ['d1','d2','d3','d4','d5','d6','d7','d4'], ['c1','c2','c3','c4','c5']];
  const missions = [
  {
    "id": "moon-surface",
    "area": "moon",
    "target": "moon",
    "title": "달의 표면을 기록해요",
    "brief": "달에 도착해 사진을 찍으세요. 사진에서 관찰한 특징을 모두 골라요.",
    "type": "multi",
    "options": [
      "둥근 구덩이가 많다",
      "밝고 어두운 부분이 있다",
      "푸른 바다가 넓게 보인다",
      "스스로 빛을 낸다"
    ]
  },
  {
    "id": "moon-order",
    "area": "moon",
    "target": "observatory",
    "title": "달 관측 일지를 복구해요",
    "brief": "관측일 3일·7일·15일의 달을 각각 촬영한 뒤, 관측한 순서대로 카드를 눌러요.",
    "type": "order",
    "options": [
      "보름달",
      "초승달",
      "상현달"
    ],
    "days": [
      3,
      7,
      15
    ]
  },
  {
    "id": "moon-predict",
    "area": "moon",
    "target": "observatory",
    "title": "다음 관측을 예상해요",
    "brief": "15일·19일·22일을 촬영해 비교해요. 이 기록의 보름달 이후에는 어떻게 변했나요?",
    "type": "choice",
    "options": [
      "밝게 보이는 부분이 점점 작아졌다",
      "언제나 둥글게 보였다",
      "달 전체가 실제로 작아졌다"
    ],
    "days": [
      15,
      19,
      22
    ]
  },
  {
    "id": "sun-star",
    "area": "solar",
    "target": "sun",
    "title": "태양의 신분증",
    "brief": "태양을 관측하고 배운 내용을 떠올려요. 태양의 분류와 까닭을 바르게 연결한 카드를 골라요.",
    "type": "choice",
    "options": [
      "별 — 스스로 빛과 열을 낸다",
      "행성 — 지구 주위를 돈다",
      "위성 — 빛을 반사하기만 한다"
    ]
  },
  {
    "id": "planet-order",
    "area": "solar",
    "target": "earth",
    "title": "지구의 이웃 항로",
    "brief": "지구를 촬영하고 배운 내용을 떠올려요. 태양에 가까운 순서대로 네 행성의 항로를 만들어요.",
    "type": "order",
    "options": [
      "화성",
      "지구",
      "수성",
      "금성"
    ]
  },
  {
    "id": "saturn-rings",
    "area": "solar",
    "target": "saturn",
    "title": "고리 행성 조사 보고서",
    "brief": "토성의 여러 면을 관측하고 촬영해요. 토성에 대한 바른 설명을 모두 골라요.",
    "type": "multi",
    "options": [
      "크고 뚜렷한 고리가 보인다",
      "고리가 있는 유일한 행성이다",
      "태양 주위를 도는 행성이다",
      "고리는 작은 조각들로 이루어져 있다"
    ]
  },
  {
    "id": "jupiter-report",
    "area": "solar",
    "target": "jupiter",
    "title": "내가 발견한 목성",
    "brief": "목성을 촬영하고 표면에 보이는 특징을 모두 골라요.",
    "type": "multi",
    "options": [
      "띠 모양 무늬가 보인다",
      "붉은색의 큰 점이 보인다",
      "지구처럼 대륙과 바다가 뚜렷하다",
      "토성처럼 넓은 고리가 뚜렷하게 보인다"
    ]
  },
  {
    "id": "north-star",
    "area": "stars",
    "target": "sky",
    "title": "북극성에 관측 표식을!",
    "brief": "작은곰자리 사진을 살펴보고 촬영해요. 북극성이라고 생각하는 별을 누르고 표식을 제출해요.",
    "type": "star"
  },
  {
    "id": "cassiopeia",
    "area": "stars",
    "target": "sky",
    "title": "북쪽 하늘의 글자",
    "brief": "카시오페이아자리 사진을 살펴봐요. 사진 속 별자리의 연결선은 어떤 글자와 비슷하게 보이나요?",
    "type": "choice",
    "options": [
      "W",
      "O",
      "L"
    ]
  },
  {
    "id": "star-definition",
    "area": "stars",
    "target": "sky",
    "title": "별과 행성을 구별해요",
    "brief": "별자리 사진을 살펴보고 배운 내용을 떠올려요. 밤하늘에서 밝게 보이는 천체에 대한 바른 설명을 골라요.",
    "type": "choice",
    "options": [
      "별은 스스로 빛을 내고, 행성은 별빛을 반사해 보인다",
      "밝게 보이는 천체는 모두 별이다",
      "행성은 스스로 빛을 내고, 별은 행성의 빛을 반사한다"
    ]
  },
  {
    "id": "moon-light",
    "area": "moon",
    "target": "moon",
    "title": "달빛은 어디에서 올까요?",
    "brief": "달을 촬영한 뒤, 달이 밝게 보이는 까닭을 골라요.",
    "type": "choice",
    "options": [
      "달이 햇빛을 반사하기 때문이다",
      "달 속에서 불이 타기 때문이다",
      "지구의 바다가 달을 비추기 때문이다"
    ]
  },
  {
    "id": "moon-shape",
    "area": "moon",
    "target": "observatory",
    "title": "모양이 달라 보이는 까닭",
    "brief": "7일과 15일 기록을 촬영해 비교해요. 바르게 설명한 것을 골라요.",
    "type": "choice",
    "options": [
      "달의 일부가 사라졌다가 다시 생긴다",
      "햇빛을 받는 부분 중 지구에서 보이는 부분이 달라진다",
      "달은 매일 다른 천체로 바뀐다"
    ],
    "days": [
      7,
      15
    ]
  },
  {
    "id": "moon-full",
    "area": "moon",
    "target": "observatory",
    "title": "둥근 달을 찾았어요",
    "brief": "7일·15일·22일 기록을 촬영해요. 가장 둥글게 보이는 기록은 언제인가요?",
    "type": "choice",
    "options": [
      "7일",
      "15일",
      "22일"
    ],
    "days": [
      7,
      15,
      22
    ]
  },
  {
    "id": "moon-wax",
    "area": "moon",
    "target": "observatory",
    "title": "초승달 이후의 변화",
    "brief": "3일과 7일 기록을 촬영하고 변화한 모습을 골라요.",
    "type": "choice",
    "options": [
      "밝은 부분이 더 넓어졌다",
      "밝은 부분이 더 좁아졌다",
      "달이 여러 개로 나뉘었다"
    ],
    "days": [
      3,
      7
    ]
  },
  {
    "id": "moon-half",
    "area": "moon",
    "target": "observatory",
    "title": "반달 모양의 기록",
    "brief": "7일·15일·22일 기록을 촬영해요. 밝은 부분이 반원에 가까운 두 기록을 골라요.",
    "type": "multi",
    "options": [
      "7일",
      "15일",
      "22일"
    ],
    "days": [
      7,
      15,
      22
    ]
  },
  {
    "id": "moon-cycle",
    "area": "moon",
    "target": "observatory",
    "title": "한 달 동안의 관측",
    "brief": "3일·15일·26일 기록을 촬영해요. 달 관측에 대한 바른 설명을 골라요.",
    "type": "choice",
    "options": [
      "하루만 보면 한 달의 변화를 모두 알 수 있다",
      "날짜를 달리하며 여러 번 관측하고 기록을 비교한다",
      "밝은 부분이 달라질 때마다 달의 실제 크기도 달라진다"
    ],
    "days": [
      3,
      15,
      26
    ]
  },
  {
    "id": "earth-surface",
    "area": "solar",
    "target": "earth",
    "title": "우리 행성의 색",
    "brief": "지구를 촬영한 뒤 실제 관측 자료에서 확인할 수 있는 것을 모두 골라요.",
    "type": "multi",
    "options": [
      "푸른 바다",
      "밝은 구름",
      "토성처럼 넓은 고리",
      "갈색과 초록빛 육지"
    ]
  },
  {
    "id": "mars-color",
    "area": "solar",
    "target": "mars",
    "title": "붉은 행성의 기록",
    "brief": "화성을 촬영하고, 전체적으로 두드러지는 색을 골라요.",
    "type": "choice",
    "options": [
      "붉은 갈색",
      "짙은 파란색",
      "밝은 초록색"
    ]
  },
  {
    "id": "planet-largest",
    "area": "solar",
    "target": "jupiter",
    "title": "가장 큰 행성",
    "brief": "목성을 촬영하고 배운 내용을 떠올려요. 태양계에서 가장 큰 행성은 무엇인가요?",
    "type": "choice",
    "options": [
      "지구",
      "목성",
      "수성",
      "화성"
    ]
  },
  {
    "id": "planet-nearest",
    "area": "solar",
    "target": "mercury",
    "title": "태양에 가장 가까운 항로",
    "brief": "수성을 촬영하고 배운 내용을 떠올려요. 태양에 가장 가까운 행성을 골라요.",
    "type": "choice",
    "options": [
      "해왕성",
      "금성",
      "수성",
      "지구"
    ]
  },
  {
    "id": "outer-order",
    "area": "solar",
    "target": "neptune",
    "title": "바깥쪽 행성 항로",
    "brief": "해왕성을 촬영하고, 태양에서 가까운 순서대로 바깥쪽 네 행성을 연결해요.",
    "type": "order",
    "options": [
      "해왕성",
      "토성",
      "목성",
      "천왕성"
    ]
  },
  {
    "id": "planet-motion",
    "area": "solar",
    "target": "earth",
    "title": "움직이는 행성들",
    "brief": "지구를 촬영하고 태양계 행성의 움직임에 대한 바른 설명을 골라요.",
    "type": "choice",
    "options": [
      "모든 행성은 달 주위를 돈다",
      "행성은 태양 주위를 공전한다",
      "행성은 우주에서 언제나 같은 자리에 멈춰 있다"
    ]
  },
  {
    "id": "constellation-meaning",
    "area": "stars",
    "target": "sky",
    "title": "별자리란 무엇일까요?",
    "brief": "별자리 사진을 촬영하고 별자리의 뜻을 골라요.",
    "type": "choice",
    "options": [
      "하늘의 별을 이어 동물이나 물건 등의 모습으로 이름 붙인 것",
      "행성 표면에 있는 무늬",
      "서로 붙어 있는 별 하나"
    ]
  },
  {
    "id": "polaris-direction",
    "area": "stars",
    "target": "sky",
    "title": "북극성으로 방향 찾기",
    "brief": "작은곰자리 사진을 촬영하고, 북극성으로 찾을 수 있는 방향을 골라요.",
    "type": "choice",
    "options": [
      "동쪽",
      "남쪽",
      "북쪽",
      "서쪽"
    ]
  },
  {
    "id": "star-day",
    "area": "stars",
    "target": "sun",
    "title": "낮에도 볼 수 있는 별",
    "brief": "태양을 촬영한 뒤, 낮에 우리가 볼 수 있는 별을 골라요.",
    "type": "choice",
    "options": [
      "달",
      "태양",
      "금성",
      "지구"
    ]
  }
];
  const data = { bodies, phases, stars, lines, missions, areas:{moon:'달의 모습과 변화',solar:'태양계 탐사',stars:'별과 별자리'} };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.SpaceContent = data;
})(typeof window !== 'undefined' ? window : globalThis);
