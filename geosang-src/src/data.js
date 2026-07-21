// ============================================================
// data.js — 게임에 쓰이는 "데이터"만 모아둔 파일
// (규칙/로직은 gameLogic.js 에서 이 데이터를 읽어서 사용합니다)
// 지역·특산물·여비·게임 설정을 바꾸고 싶으면 이 파일만 고치면 됩니다.
// ============================================================

// ── 1) 전국 17개 시·도 ─────────────────────────────
// neighbors: 육지로 붙어 있어 수레로 갈 수 있는 이웃
// ferries:   배를 타야 갈 수 있는 곳 (제주 항로)
// lat/lng:   지도에 핀을 찍을 대표 좌표
// marketBonus: 이 지역 시장의 판매가 배수 (대도시 = 사람이 많아 비싸게 팔림!)
// desc:      아이들에게 보여줄 한 줄 소개
export const REGIONS = [
  { key: '서울', name: '서울특별시', emoji: '🏙️', lat: 37.57, lng: 126.98,
    neighbors: ['경기'], ferries: [], marketBonus: 1.4,
    desc: '우리나라의 수도예요. 사람이 가장 많아서 뭐든 비싸게 팔려요!' },
  { key: '인천', name: '인천광역시', emoji: '✈️', lat: 37.46, lng: 126.63,
    neighbors: ['경기'], ferries: [], marketBonus: 1.25,
    desc: '큰 항구와 공항이 있는 바다의 관문이에요. 강화 순무가 유명해요.' },
  { key: '경기', name: '경기도', emoji: '🏘️', lat: 37.10, lng: 127.42,
    neighbors: ['서울', '인천', '강원', '충북', '충남'], ferries: [], marketBonus: 1.0,
    desc: '서울을 둘러싼 큰 도예요. 이천 쌀, 안성 포도가 유명해요.' },
  { key: '강원', name: '강원특별자치도', emoji: '⛰️', lat: 37.75, lng: 128.30,
    neighbors: ['경기', '충북', '경북'], ferries: [], marketBonus: 1.0,
    desc: '높은 산과 동해 바다! 감자, 황태, 횡성 한우가 유명해요.' },
  { key: '충북', name: '충청북도', emoji: '🌰', lat: 36.85, lng: 127.75,
    neighbors: ['경기', '강원', '충남', '세종', '대전', '경북', '전북'], ferries: [], marketBonus: 1.0,
    desc: '바다가 없는 내륙 지역이에요. 보은 대추가 유명해요.' },
  { key: '충남', name: '충청남도', emoji: '🌾', lat: 36.48, lng: 126.75,
    neighbors: ['경기', '충북', '세종', '대전', '전북'], ferries: [], marketBonus: 1.0,
    desc: '넓은 들판과 서해 갯벌! 금산 인삼, 논산 딸기가 유명해요.' },
  { key: '세종', name: '세종특별자치시', emoji: '🏛️', lat: 36.56, lng: 127.26,
    neighbors: ['충남', '충북', '대전'], ferries: [], marketBonus: 1.15,
    desc: '나라의 새 행정 도시예요. 정부 청사가 모여 있어요.' },
  { key: '대전', name: '대전광역시', emoji: '🚄', lat: 36.35, lng: 127.38,
    neighbors: ['충남', '충북', '세종'], ferries: [], marketBonus: 1.25,
    desc: '철도가 만나는 교통의 중심! 과학의 도시이기도 해요.' },
  { key: '전북', name: '전북특별자치도', emoji: '🍲', lat: 35.75, lng: 127.15,
    neighbors: ['충남', '충북', '전남', '경북', '경남'], ferries: [], marketBonus: 1.0,
    desc: '기름진 호남평야가 있어요. 전주 비빔밥, 순창 고추장이 유명해요.' },
  { key: '전남', name: '전라남도', emoji: '🌊', lat: 34.80, lng: 126.65,
    neighbors: ['전북', '광주', '경남'], ferries: ['제주'], marketBonus: 1.0,
    desc: '섬과 갯벌이 가장 많은 곳! 완도 김, 영광 굴비가 유명해요.' },
  { key: '광주', name: '광주광역시', emoji: '🎨', lat: 35.16, lng: 126.85,
    neighbors: ['전남'], ferries: [], marketBonus: 1.25,
    desc: '호남의 중심 도시예요. 예술과 맛의 고장!' },
  { key: '경북', name: '경상북도', emoji: '🍎', lat: 36.35, lng: 128.75,
    neighbors: ['강원', '충북', '전북', '경남', '대구', '울산'], ferries: [], marketBonus: 1.0,
    desc: '넓은 땅과 동해 바다! 청송 사과, 영덕 대게가 유명해요.' },
  { key: '대구', name: '대구광역시', emoji: '🌞', lat: 35.87, lng: 128.60,
    neighbors: ['경북', '경남'], ferries: [], marketBonus: 1.25,
    desc: '여름이 아주 더운 분지 도시예요. 큰 시장이 많아요!' },
  { key: '경남', name: '경상남도', emoji: '🏭', lat: 35.35, lng: 128.15,
    neighbors: ['전북', '전남', '경북', '대구', '울산', '부산'], ferries: [], marketBonus: 1.0,
    desc: '남해 바다와 큰 공장들! 통영 굴, 진영 단감이 유명해요.' },
  { key: '울산', name: '울산광역시', emoji: '🐋', lat: 35.54, lng: 129.31,
    neighbors: ['경북', '경남', '부산'], ferries: [], marketBonus: 1.25,
    desc: '자동차와 배를 만드는 산업 도시! 옛날엔 고래로 유명했어요.' },
  { key: '부산', name: '부산광역시', emoji: '🚢', lat: 35.18, lng: 129.08,
    neighbors: ['경남', '울산'], ferries: ['제주'], marketBonus: 1.25,
    desc: '우리나라 제일 큰 항구 도시! 기장 멸치가 유명해요.' },
  { key: '제주', name: '제주특별자치도', emoji: '🌴', lat: 33.38, lng: 126.55,
    neighbors: [], ferries: ['전남', '부산'], marketBonus: 1.0,
    desc: '따뜻한 남쪽 화산섬! 감귤, 흑돼지, 갈치가 유명해요.' },
]

export const REGION_BY_KEY = REGIONS.reduce((acc, r) => {
  acc[r.key] = r
  return acc
}, {})

// 두 지역 사이를 어떻게 갈 수 있는지: 'land'(육로) / 'sea'(뱃길) / null(못 감)
export function travelType(fromKey, toKey) {
  const from = REGION_BY_KEY[fromKey]
  if (!from || fromKey === toKey) return null
  if (from.neighbors.includes(toKey)) return 'land'
  if (from.ferries.includes(toKey)) return 'sea'
  return null
}

// 제주 항로(뱃길)를 지도에 점선으로 그릴 때 사용
export const FERRY_ROUTES = [
  ['전남', '제주'],
  ['부산', '제주'],
]

// ── 2) 특산물 55종 ─────────────────────────────────
// marble-src(특산물 마블)의 40종을 시·도 기준으로 나누고, 15종을 더했습니다.
// basePrice = 기준가. 산지에서 사면 싸고(×0.8), 멀리 가서 팔면 비쌉니다.
// desc = 학습 카드에 보여줄 "왜 이 지역에서 유명할까?" 한 줄 설명.
export const PRODUCTS = {
  // ── 강원 (7) ──
  감자: { id: '감자', name: '감자', region: '강원', basePrice: 3000, emoji: '🥔', category: '농산물', origin: '정선',
    desc: '서늘한 산골 밭에서 자라서 더 포슬포슬하고 맛있어요.' },
  황태: { id: '황태', name: '황태', region: '강원', basePrice: 8000, emoji: '🐟', category: '수산물', origin: '인제',
    desc: '겨울 찬바람에 명태를 얼렸다 녹였다 하며 말린 거예요. 추운 산골이라 가능해요!' },
  옥수수: { id: '옥수수', name: '옥수수', region: '강원', basePrice: 3500, emoji: '🌽', category: '농산물', origin: '홍천',
    desc: '낮과 밤의 온도 차가 커서 알이 꽉 차고 달아요.' },
  오징어: { id: '오징어', name: '오징어', region: '강원', basePrice: 6000, emoji: '🦑', category: '수산물', origin: '속초',
    desc: '동해 바다에서 밤에 배의 불을 환하게 켜고 잡아요.' },
  한우: { id: '한우', name: '한우', region: '강원', basePrice: 15000, emoji: '🐮', category: '축산가공', origin: '횡성',
    desc: '높은 산의 맑은 공기와 깨끗한 물에서 소를 정성껏 키워요.' },
  메밀: { id: '메밀', name: '메밀', region: '강원', basePrice: 4000, emoji: '🌾', category: '농산물', origin: '봉평',
    desc: '서늘하고 메마른 땅에서도 잘 자라는 곡식이라 산골 봉평에서 많이 길러요.' },
  송이버섯: { id: '송이버섯', name: '송이버섯', region: '강원', basePrice: 13000, emoji: '🍄', category: '농산물', origin: '양양',
    desc: '가을 소나무 숲에서만 나는 귀한 버섯이에요. 사람이 기를 수 없어요!' },
  // ── 경기 (4) ──
  쌀: { id: '쌀', name: '쌀', region: '경기', basePrice: 4500, emoji: '🌾', category: '농산물', origin: '이천',
    desc: '기름진 땅과 맑은 물 덕분에 옛날에 임금님께 바치던 쌀이에요.' },
  포도: { id: '포도', name: '포도', region: '경기', basePrice: 6000, emoji: '🍇', category: '과일', origin: '안성',
    desc: '햇빛을 많이 받는 언덕 밭에서 포도가 달게 익어요.' },
  고구마: { id: '고구마', name: '고구마', region: '경기', basePrice: 3500, emoji: '🍠', category: '농산물', origin: '여주',
    desc: '모래가 섞인 부드러운 땅이라 고구마가 상처 없이 예쁘게 커요.' },
  잣: { id: '잣', name: '잣', region: '경기', basePrice: 10000, emoji: '🌰', category: '농산물', origin: '가평',
    desc: '깊은 잣나무 숲에서 사람이 직접 나무에 올라 따는 귀한 열매예요.' },
  // ── 인천 (2) ──
  순무: { id: '순무', name: '순무', region: '인천', basePrice: 3000, emoji: '🥬', category: '농산물', origin: '강화',
    desc: '강화도의 갯벌 흙에서 자라 알싸하면서도 달아요.' },
  젓갈: { id: '젓갈', name: '젓갈', region: '인천', basePrice: 6000, emoji: '🫙', category: '수산물', origin: '소래포구',
    desc: '새우잡이 배가 모이는 큰 포구라서 싱싱한 새우로 젓갈을 담가요.' },
  // ── 충북 (3) ──
  대추: { id: '대추', name: '대추', region: '충북', basePrice: 4500, emoji: '🔴', category: '농산물', origin: '보은',
    desc: '산으로 둘러싸여 낮은 덥고 밤은 서늘해서 대추가 달게 여물어요.' },
  호두: { id: '호두', name: '호두', region: '충북', basePrice: 9000, emoji: '🥜', category: '농산물', origin: '영동',
    desc: '따뜻하고 물이 잘 빠지는 땅이라 호두나무가 잘 자라요.' },
  한약재: { id: '한약재', name: '한약재', region: '충북', basePrice: 12000, emoji: '🌿', category: '농산물', origin: '제천',
    desc: '높은 산이 많아 약초가 잘 자라서 옛날부터 큰 약재 시장이 열렸어요.' },
  // ── 충남 (6) ──
  인삼: { id: '인삼', name: '인삼', region: '충남', basePrice: 12000, emoji: '🌱', category: '농산물', origin: '금산',
    desc: '서늘한 그늘 밭에서 몇 년을 기다려 캐는 귀한 뿌리예요.' },
  딸기: { id: '딸기', name: '딸기', region: '충남', basePrice: 4000, emoji: '🍓', category: '과일', origin: '논산',
    desc: '넓은 들판의 비닐하우스에서 겨울에도 딸기를 길러요.' },
  마늘: { id: '마늘', name: '마늘', region: '충남', basePrice: 5000, emoji: '🧄', category: '농산물', origin: '서산',
    desc: '서해 바닷바람을 맞고 자라서 단단하고 알싸해요.' },
  밤: { id: '밤', name: '밤', region: '충남', basePrice: 5000, emoji: '🌰', category: '농산물', origin: '공주',
    desc: '산비탈에 밤나무 숲이 많아 옛날부터 밤의 고장으로 불려요.' },
  고추: { id: '고추', name: '고추', region: '충남', basePrice: 7000, emoji: '🌶️', category: '농산물', origin: '청양',
    desc: '맵기로 유명한 청양고추의 고향이에요.' },
  꽃게: { id: '꽃게', name: '꽃게', region: '충남', basePrice: 8000, emoji: '🦞', category: '수산물', origin: '태안',
    desc: '서해 갯벌 바다에서 봄과 가을에 꽃게가 많이 잡혀요.' },
  // ── 전북 (4) ──
  고추장: { id: '고추장', name: '고추장', region: '전북', basePrice: 6000, emoji: '🥫', category: '축산가공', origin: '순창',
    desc: '맑은 물과 좋은 콩·고추로 장을 담그는 장류의 고장이에요.' },
  치즈: { id: '치즈', name: '치즈', region: '전북', basePrice: 9000, emoji: '🧀', category: '축산가공', origin: '임실',
    desc: '우리나라에서 치즈를 처음 만든 곳이 바로 임실이에요!' },
  복분자: { id: '복분자', name: '복분자', region: '전북', basePrice: 8000, emoji: '🫐', category: '과일', origin: '고창',
    desc: '서해 바람이 부는 황토밭에서 검붉은 열매가 익어요.' },
  머루: { id: '머루', name: '머루', region: '전북', basePrice: 6000, emoji: '🍇', category: '과일', origin: '무주',
    desc: '깊은 산골짜기에서 자라는 우리나라 토종 산포도예요.' },
  // ── 전남 (8) ──
  굴비: { id: '굴비', name: '굴비', region: '전남', basePrice: 9000, emoji: '🐠', category: '수산물', origin: '영광',
    desc: '조기를 소금에 절여 바닷바람에 꾸덕꾸덕 말린 거예요.' },
  김: { id: '김', name: '김', region: '전남', basePrice: 2500, emoji: '🍙', category: '수산물', origin: '완도',
    desc: '잔잔하고 깨끗한 남쪽 바다에서 김을 길러요.' },
  배: { id: '배', name: '배', region: '전남', basePrice: 4000, emoji: '🍐', category: '과일', origin: '나주',
    desc: '넓은 들판과 따뜻한 날씨 덕분에 크고 시원한 배가 열려요.' },
  녹차: { id: '녹차', name: '녹차', region: '전남', basePrice: 8000, emoji: '🍵', category: '농산물', origin: '보성',
    desc: '안개가 자주 끼는 언덕 밭에서 찻잎이 부드럽게 자라요.' },
  매실: { id: '매실', name: '매실', region: '전남', basePrice: 5500, emoji: '🟢', category: '과일', origin: '광양',
    desc: '우리나라에서 봄이 가장 먼저 오는 따뜻한 고장이에요.' },
  홍어: { id: '홍어', name: '홍어', region: '전남', basePrice: 11000, emoji: '🐟', category: '수산물', origin: '흑산도',
    desc: '흑산도 깊은 바다에서 잡히는 아주 특별한 물고기예요.' },
  유자: { id: '유자', name: '유자', region: '전남', basePrice: 5000, emoji: '🍋', category: '과일', origin: '고흥',
    desc: '추위에 약해서 따뜻한 남쪽 바닷가에서만 잘 자라요.' },
  천일염: { id: '천일염', name: '천일염', region: '전남', basePrice: 3000, emoji: '🧂', category: '수산물', origin: '신안',
    desc: '넓은 갯벌 염전에서 햇빛과 바람만으로 소금을 만들어요.' },
  // ── 경북 (9) ──
  사과: { id: '사과', name: '사과', region: '경북', basePrice: 3500, emoji: '🍎', category: '과일', origin: '청송',
    desc: '낮과 밤의 온도 차가 큰 산간 지역이라 사과가 아삭하고 달아요.' },
  대게: { id: '대게', name: '대게', region: '경북', basePrice: 11000, emoji: '🦀', category: '수산물', origin: '영덕',
    desc: '차갑고 깊은 동해 바다에서 다리가 긴 대게가 잡혀요.' },
  참외: { id: '참외', name: '참외', region: '경북', basePrice: 4000, emoji: '🍈', category: '과일', origin: '성주',
    desc: '낙동강 옆 모래땅 비닐하우스에서 노란 참외를 길러요.' },
  곶감: { id: '곶감', name: '곶감', region: '경북', basePrice: 6000, emoji: '🟠', category: '축산가공', origin: '상주',
    desc: '감을 깎아 겨울바람에 말리면 달콤한 곶감이 돼요.' },
  미나리: { id: '미나리', name: '미나리', region: '경북', basePrice: 3000, emoji: '🌿', category: '농산물', origin: '청도',
    desc: '맑은 물이 흐르는 논에서 향긋한 미나리가 자라요.' },
  복숭아: { id: '복숭아', name: '복숭아', region: '경북', basePrice: 5000, emoji: '🍑', category: '과일', origin: '영천',
    desc: '비가 적고 햇빛이 풍부해서 복숭아가 크고 달아요.' },
  문어: { id: '문어', name: '문어', region: '경북', basePrice: 9000, emoji: '🐙', category: '수산물', origin: '포항',
    desc: '동해에서 잡히는 문어는 경북 잔치상에 꼭 올라요.' },
  간고등어: { id: '간고등어', name: '간고등어', region: '경북', basePrice: 7000, emoji: '🐟', category: '수산물', origin: '안동',
    desc: '바다에서 먼 안동까지 오는 동안 상하지 않게 소금에 절인 데서 시작됐어요.' },
  자두: { id: '자두', name: '자두', region: '경북', basePrice: 4500, emoji: '🟣', category: '과일', origin: '김천',
    desc: '우리나라 자두의 큰 몫을 기르는 자두의 고장이에요.' },
  // ── 경남 (4) ──
  굴: { id: '굴', name: '굴', region: '경남', basePrice: 7000, emoji: '🦪', category: '수산물', origin: '통영',
    desc: '잔잔한 남해 바다에 줄을 매달아 굴을 길러요.' },
  단감: { id: '단감', name: '단감', region: '경남', basePrice: 4500, emoji: '🟧', category: '과일', origin: '진영',
    desc: '서리가 늦게 내리는 따뜻한 곳이라 단감이 잘 익어요.' },
  멍게: { id: '멍게', name: '멍게', region: '경남', basePrice: 7000, emoji: '🍍', category: '수산물', origin: '통영',
    desc: '바닷속 줄에 붙여 기르는 주황색 바다 과일이에요.' },
  양파: { id: '양파', name: '양파', region: '경남', basePrice: 3500, emoji: '🧅', category: '농산물', origin: '창녕',
    desc: '따뜻한 낙동강 들판, 우리나라 양파 농사가 처음 시작된 곳이에요.' },
  // ── 부산 (2) ──
  멸치: { id: '멸치', name: '멸치', region: '부산', basePrice: 7000, emoji: '🐟', category: '수산물', origin: '기장',
    desc: '물살이 빠른 기장 앞바다에서 은빛 멸치가 잡혀요.' },
  어묵: { id: '어묵', name: '어묵', region: '부산', basePrice: 5000, emoji: '🍢', category: '수산물', origin: '부산',
    desc: '큰 항구 도시라 싱싱한 생선살로 어묵을 만들어 왔어요.' },
  // ── 제주 (6) ──
  감귤: { id: '감귤', name: '감귤', region: '제주', basePrice: 3000, emoji: '🍊', category: '과일', origin: '서귀포',
    desc: '따뜻한 화산섬이라 겨울에도 귤이 주렁주렁 열려요.' },
  흑돼지: { id: '흑돼지', name: '흑돼지', region: '제주', basePrice: 10000, emoji: '🐷', category: '축산가공', origin: '제주시',
    desc: '옛날부터 제주에서만 기르던 검은 털 돼지예요.' },
  갈치: { id: '갈치', name: '갈치', region: '제주', basePrice: 9000, emoji: '🐟', category: '수산물', origin: '한림',
    desc: '은빛으로 반짝이는 갈치가 제주 바다에서 많이 잡혀요.' },
  한라봉: { id: '한라봉', name: '한라봉', region: '제주', basePrice: 5000, emoji: '🍊', category: '과일', origin: '서귀포',
    desc: '꼭지가 한라산처럼 볼록 솟아서 한라봉이라 불러요.' },
  옥돔: { id: '옥돔', name: '옥돔', region: '제주', basePrice: 12000, emoji: '🐟', category: '수산물', origin: '제주',
    desc: '제주 사람들이 가장 귀하게 여기는 바닷물고기예요.' },
  표고버섯: { id: '표고버섯', name: '표고버섯', region: '제주', basePrice: 7000, emoji: '🍄', category: '농산물', origin: '서귀포',
    desc: '한라산 숲의 참나무에 버섯을 붙여 길러요.' },
}

// 분류별 장사 꿀팁 (학습 카드에 표시)
export const CATEGORY_HINTS = {
  농산물: '밭과 들에서 나는 농산물은 농사짓기 어려운 큰 도시에서 인기가 많아요!',
  수산물: '바다가 없는 내륙 지역에서는 수산물이 더 귀해요!',
  과일: '과일은 산지에서 멀수록 신선한 것이 귀해져서 값이 올라요!',
  축산가공: '정성이 많이 들어간 만큼, 사람이 많은 대도시에서 비싸게 팔려요!',
}

// 지역 → 그 지역 특산물 id 목록 (산지 시장에서 살 수 있는 것)
export const PRODUCTS_BY_REGION = Object.values(PRODUCTS).reduce((acc, p) => {
  ;(acc[p.region] ||= []).push(p.id)
  return acc
}, {})

// ── 3) 수레 단계 (업그레이드) ──────────────────────
export const CARTS = [
  { name: '지게', emoji: '🎒', cap: 6, price: 0 },
  { name: '손수레', emoji: '🛒', cap: 10, price: 15000 },
  { name: '달구지', emoji: '🐂', cap: 16, price: 40000 },
  { name: '트럭', emoji: '🚚', cap: 26, price: 100000 },
]

// ── 4) 도착 이벤트 (도착할 때 가끔 일어나요) ────────
// harvest 는 특산물이 있는 지역에서만 일어납니다.
export const EVENTS = [
  { kind: 'festival', title: '지역 축제!', emoji: '🎉', desc: '축제 손님들 덕분에 오늘 이곳 판매가가 1.3배!' },
  { kind: 'harvest', title: '풍년이다!', emoji: '🌾', desc: '풍년이라 오늘 이곳 특산물을 더 싸게 살 수 있어요!' },
  { kind: 'toll', title: '통행료', emoji: '💸', desc: '다리를 건너며 통행료 2,000원을 냈어요.', amount: 2000 },
  { kind: 'lucky', title: '길에서 주운 돈!', emoji: '🍀', desc: '길에서 3,000원을 주웠어요. 오늘은 운수 좋은 날!', amount: 3000 },
]

// ── 5) 최종 칭호 (끝났을 때 소지금 기준) ────────────
export const TITLES = [
  { min: 350000, name: '전설의 거상', emoji: '👑' },
  { min: 200000, name: '큰손 상인', emoji: '💎' },
  { min: 100000, name: '알뜰 상인', emoji: '⭐' },
  { min: 50000, name: '새싹 상인', emoji: '🌱' },
  { min: 0, name: '병아리 상인', emoji: '🐣' },
]

// ── 6) 게임 기본 설정값 ────────────────────────────
export const CONFIG = {
  startRegion: '서울', // 시작 지역
  startCash: 50000, // 시작 자금
  landCost: 3000, // 육로 여비 (이웃 지역 하나 지날 때마다)
  seaCost: 8000, // 뱃길 여비 (제주 항로)
  maxDays: 15, // 장사 기간 (한 지역 이동 = 하루)

  // ── 가격 규칙 (수요·공급 + 거리 학습 포인트) ──
  buyFactor: 0.8, // 산지에서 살 때: 기준가 × 0.8 (산지는 싸다!)
  homeSellFactor: 0.9, // 산지 근처에서 팔면 기준가 × 0.9 (남는 게 없다…)
  hopStep: 0.25, // 한 지역 멀어질 때마다 판매가 +25% (멀수록 귀하다!)
  festivalBonus: 1.3, // 축제 중 판매가 배수
  harvestDiscount: 0.7, // 풍년일 때 매입가 배수
  eventChance: 0.35, // 도착 이벤트 확률

  // ── 배달 퀘스트 ──
  questQtyMin: 2,
  questQtyMax: 3,
  questRewardFactor: 2.2, // 보상 = 수량 × 기준가 × 2.2 (1,000원 단위 반올림)

  // ── 오늘의 뉴스 (매일 한 지역이 한 특산물을 비싸게 사줘요) ──
  newsBonus: 1.5,

  // ── 학습 카드의 "더 알아보기" 검색 링크 켜고 끄기 ──
  // (B단계에서 학급 설정으로 옮겨 교사가 화면에서 조절할 예정)
  searchLinkEnabled: true,
}

// 지도 초기 화면 범위 (우리나라 전체가 보이도록)
export const MAP_BOUNDS = [
  [33.0, 125.5],
  [38.7, 129.9],
]
