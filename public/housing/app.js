// ==================== 내 방 꾸미기 (하우징 체험판) ====================
// 교육용·비상업 프로젝트. 이미지 출처: habboassets.com / imager.habboon.pw (© Sulake Oy)

// 1. 가구 카탈로그 (2026-07-09 기준 CDN에 실제 존재 확인된 20종)
const ASSET_BASE = "https://www.habboassets.com/assets/furniture/";

// 2026-07-09 habboassets CDN에 아이콘 존재 확인된 classname만 수록 (총 97종)
const CATALOG_ITEMS = [
    // ---- 의자·소파 (seat) ----
    { classname: "chair_norja",          name: "노르야 의자",       category: "seat", cost: 10, desc: "심플한 나무 의자예요.",              canSit: true, sitHeight: 0.45, scale: 1.2,  offsetY: 12 },
    { classname: "chair_polyfon",        name: "폴리폰 의자",       category: "seat", cost: 12, desc: "튼튼한 폴리폰 의자예요.",            canSit: true, sitHeight: 0.45, scale: 1.2,  offsetY: 12 },
    { classname: "chair_plasty",         name: "플라스토 의자",     category: "seat", cost: 8,  desc: "가볍고 산뜻한 플라스틱 의자.",       canSit: true, sitHeight: 0.45, scale: 1.2,  offsetY: 12 },
    { classname: "chair_plasto",         name: "플라스토 클래식",   category: "seat", cost: 8,  desc: "하보 초창기부터 있던 의자예요.",     canSit: true, sitHeight: 0.45, scale: 1.2,  offsetY: 12 },
    { classname: "chair_silo",           name: "사일로 의자",       category: "seat", cost: 12, desc: "각진 디자인의 모던 의자.",           canSit: true, sitHeight: 0.45, scale: 1.2,  offsetY: 12 },
    { classname: "sofachair_silo",       name: "사일로 안락의자",   category: "seat", cost: 18, desc: "네모지고 폭신한 1인 소파.",          canSit: true, sitHeight: 0.5,  scale: 1.25, offsetY: 12 },
    { classname: "sofachair_polyfon",    name: "폴리폰 안락의자",   category: "seat", cost: 20, desc: "포근한 1인용 안락의자.",             canSit: true, sitHeight: 0.5,  scale: 1.25, offsetY: 12 },
    { classname: "sofachair_polyfon_girl", name: "핑크 안락의자",   category: "seat", cost: 22, desc: "사랑스러운 핑크빛 안락의자.",        canSit: true, sitHeight: 0.5,  scale: 1.25, offsetY: 12 },
    { classname: "soft_sofachair_norja", name: "푹신 안락의자",     category: "seat", cost: 20, desc: "폭신폭신한 1인용 안락의자.",         canSit: true, sitHeight: 0.5,  scale: 1.25, offsetY: 12 },
    { classname: "couch_norja",          name: "노르야 긴 소파",    category: "seat", cost: 28, desc: "친구랑 나란히 앉는 긴 소파.",        canSit: true, sitHeight: 0.5,  scale: 1.35, offsetY: 12 },
    { classname: "sofa_polyfon",         name: "폴리폰 소파",       category: "seat", cost: 30, desc: "넓고 편안한 폴리폰 소파.",           canSit: true, sitHeight: 0.5,  scale: 1.35, offsetY: 12 },
    { classname: "sofa_silo",            name: "사일로 소파",       category: "seat", cost: 28, desc: "각진 모던 스타일 소파.",             canSit: true, sitHeight: 0.5,  scale: 1.35, offsetY: 12 },
    { classname: "bench_armas",          name: "오두막 벤치",       category: "seat", cost: 15, desc: "통나무 오두막 느낌의 벤치.",         canSit: true, sitHeight: 0.45, scale: 1.3,  offsetY: 12 },
    { classname: "small_chair_armas",    name: "오두막 꼬마 의자",  category: "seat", cost: 10, desc: "아담한 통나무 의자.",                canSit: true, sitHeight: 0.45, scale: 1.2,  offsetY: 12 },

    // ---- 침대 (bed) — 장식용. (이메이저가 눕기 렌더를 지원 안 하고, 2×3 침대는 앉는 자리가
    //      머리맡 구석이라 앉기가 어색해서 앉기 기능은 뺌. 방 분위기용으로 배치.)
    { classname: "bed_budget",       name: "간이 2인 침대",   category: "bed", cost: 40, desc: "아담한 2인용 침대.",       scale: 1.5, offsetY: 13 },
    { classname: "bed_budget_one",   name: "간이 1인 침대",   category: "bed", cost: 30, desc: "혼자 쓰기 좋은 침대.",     scale: 1.4, offsetY: 13 },
    { classname: "bed_budgetb",      name: "간이 침대 B",     category: "bed", cost: 35, desc: "무늬가 다른 간이 침대.",   scale: 1.5, offsetY: 13 },
    { classname: "bed_polyfon",      name: "폴리폰 침대",     category: "bed", cost: 60, desc: "포근한 이불의 2인 침대.",  scale: 1.5, offsetY: 13 },
    { classname: "bed_polyfon_one",  name: "폴리폰 1인 침대", category: "bed", cost: 45, desc: "포근한 1인용 침대.",       scale: 1.4, offsetY: 13 },
    { classname: "bed_polyfon_girl", name: "핑크 침대",       category: "bed", cost: 60, desc: "핑크빛 이불이 예쁜 침대.", scale: 1.5, offsetY: 13 },
    { classname: "bed_silo_one",     name: "사일로 1인 침대", category: "bed", cost: 45, desc: "모던한 1인용 침대.",       scale: 1.4, offsetY: 13 },
    { classname: "bed_armas_one",    name: "오두막 1인 침대", category: "bed", cost: 50, desc: "통나무집 느낌의 침대.",    scale: 1.4, offsetY: 13 },
    { classname: "bed_armas_two",    name: "오두막 2인 침대", category: "bed", cost: 65, desc: "널찍한 통나무 침대.",      scale: 1.5, offsetY: 13 },

    // ---- 테이블 (table) ----
    { classname: "table_norja_med",       name: "노르야 테이블",        category: "table", cost: 15, desc: "간식 올려 두기 좋은 테이블.",  scale: 1.3, offsetY: 12 },
    { classname: "table_plasto_round",    name: "플라스토 원형 테이블", category: "table", cost: 12, desc: "동글동글 원형 테이블.",        scale: 1.3, offsetY: 12 },
    { classname: "table_plasto_square",   name: "플라스토 사각 테이블", category: "table", cost: 12, desc: "네모 반듯한 테이블.",          scale: 1.3, offsetY: 12 },
    { classname: "table_plasto_bigsquare", name: "플라스토 큰 테이블",  category: "table", cost: 16, desc: "여럿이 쓰는 큰 테이블.",       scale: 1.4, offsetY: 12 },
    { classname: "table_silo_small",      name: "사일로 미니 테이블",   category: "table", cost: 10, desc: "구석에 놓기 좋은 미니 테이블.", scale: 1.2, offsetY: 12 },
    { classname: "table_polyfon_med",     name: "폴리폰 테이블",        category: "table", cost: 15, desc: "묵직한 나무 테이블.",          scale: 1.3, offsetY: 12 },
    { classname: "table_polyfon_small",   name: "폴리폰 미니 테이블",   category: "table", cost: 10, desc: "작고 귀여운 테이블.",          scale: 1.2, offsetY: 12 },
    { classname: "small_table_armas",     name: "오두막 티테이블",      category: "table", cost: 12, desc: "차 한 잔 놓기 좋은 테이블.",   scale: 1.2, offsetY: 12 },
    { classname: "table_armas",           name: "오두막 식탁",          category: "table", cost: 18, desc: "통나무로 만든 든든한 식탁.",   scale: 1.4, offsetY: 12 },

    // ---- 수납·칸막이 (storage) ----
    { classname: "shelves_norja",   name: "노르야 책장",   category: "storage", cost: 20, desc: "책과 소품 정리용 책장.",       scale: 1.4, offsetY: 12 },
    { classname: "shelves_polyfon", name: "폴리폰 책장",   category: "storage", cost: 22, desc: "묵직한 나무 책장.",            scale: 1.4, offsetY: 12 },
    { classname: "shelves_silo",    name: "사일로 선반",   category: "storage", cost: 18, desc: "모던한 오픈 선반.",            scale: 1.4, offsetY: 12 },
    { classname: "divider_nor1",    name: "노르야 칸막이", category: "storage", cost: 18, desc: "공간을 나눠 주는 낮은 선반.",  scale: 1.3, offsetY: 12 },
    { classname: "divider_silo1",   name: "사일로 칸막이", category: "storage", cost: 18, desc: "각진 디자인의 칸막이.",        scale: 1.3, offsetY: 12 },
    { classname: "divider_arm1",    name: "오두막 칸막이", category: "storage", cost: 18, desc: "통나무 울타리 칸막이.",        scale: 1.3, offsetY: 12 },
    { classname: "bardesk_polyfon", name: "바 테이블",     category: "storage", cost: 25, desc: "주스 가게 놀이에 딱!",         scale: 1.4, offsetY: 12 },
    { classname: "bar_polyfon",     name: "미니바",        category: "storage", cost: 35, desc: "음료를 만드는 미니바.",        scale: 1.4, offsetY: 12 },

    // ---- 식물 (plant) ----
    { classname: "plant_small_cactus", name: "작은 선인장",  category: "plant", cost: 8,  desc: "물 안 줘도 씩씩한 선인장.",   scale: 1.0, offsetY: 12 },
    { classname: "plant_yukka",        name: "유카 나무",    category: "plant", cost: 10, desc: "시원하게 뻗은 잎의 나무.",    scale: 1.4, offsetY: 12 },
    { classname: "plant_pineapple",    name: "파인애플 화분", category: "plant", cost: 12, desc: "달콤한 향이 나는 것 같아요.", scale: 1.2, offsetY: 12 },
    { classname: "plant_big_cactus",   name: "큰 선인장",    category: "plant", cost: 15, desc: "사막에서 온 커다란 선인장.",  scale: 1.5, offsetY: 12 },
    { classname: "plant_bonsai",       name: "분재 나무",    category: "plant", cost: 14, desc: "정성껏 다듬은 미니 나무.",    scale: 1.1, offsetY: 12 },
    { classname: "plant_fruittree",    name: "열매 나무",    category: "plant", cost: 16, desc: "주렁주렁 열매가 달린 나무.",  scale: 1.5, offsetY: 12 },
    { classname: "plant_sunflower",    name: "해바라기",     category: "plant", cost: 10, desc: "해를 바라보는 노란 꽃.",      scale: 1.4, offsetY: 12 },
    { classname: "plant_rose",         name: "장미 화분",    category: "plant", cost: 10, desc: "새빨간 장미 한 다발.",        scale: 1.1, offsetY: 12 },
    { classname: "plant_bulrush",      name: "부들 화분",    category: "plant", cost: 10, desc: "연못가에 자라는 부들.",       scale: 1.3, offsetY: 12 },
    { classname: "plant_maze",         name: "미로 울타리",  category: "plant", cost: 12, desc: "나무 울타리로 미로 만들기!",  scale: 1.3, offsetY: 12 },
    { classname: "plant_mazegate",     name: "미로 문",      category: "plant", cost: 12, desc: "미로 울타리의 입구.",         scale: 1.3, offsetY: 12 },
    { classname: "plant_cruddy",       name: "시든 화분",    category: "plant", cost: 5,  desc: "물을 깜빡한 지 오래된 화분.", scale: 1.0, offsetY: 12 },

    // ---- 러그·매트 (rug) — 밟고 지나갈 수 있음 ----
    { classname: "carpet_standard", name: "기본 러그",        category: "rug", cost: 20, desc: "폭신한 기본 러그.",       walkable: true, scale: 1.3, offsetY: 14 },
    { classname: "carpet_soft",     name: "부드러운 러그",    category: "rug", cost: 25, desc: "발이 포근해지는 러그.",   walkable: true, scale: 1.3, offsetY: 14 },
    { classname: "carpet_polar",    name: "북극곰 러그",      category: "rug", cost: 30, desc: "북극곰 모양 하얀 러그.",  walkable: true, scale: 1.3, offsetY: 14 },
    { classname: "carpet_armas",    name: "오두막 러그",      category: "rug", cost: 22, desc: "오두막에 어울리는 러그.", walkable: true, scale: 1.3, offsetY: 14 },
    { classname: "doormat_love",    name: "하트 현관 매트",   category: "rug", cost: 8,  desc: "하트가 그려진 환영 매트.", walkable: true, scale: 1.1, offsetY: 14 },
    { classname: "doormat_plain",   name: "현관 매트",        category: "rug", cost: 6,  desc: "심플한 현관 매트.",       walkable: true, scale: 1.1, offsetY: 14 },

    // ---- 조명 (light) ----
    { classname: "lamp_basic",   name: "기본 램프",      category: "light", cost: 12, desc: "은은하게 방을 밝혀요.",       scale: 1.4, offsetY: 12 },
    { classname: "lamp_armas",   name: "오두막 등불",    category: "light", cost: 14, desc: "따뜻한 오두막 등불.",         scale: 1.2, offsetY: 12 },
    { classname: "lamp2_armas",  name: "오두막 스탠드",  category: "light", cost: 14, desc: "통나무집 스탠드 조명.",       scale: 1.3, offsetY: 12 },
    { classname: "hockey_light", name: "공사장 경광등",  category: "light", cost: 20, desc: "빙글빙글 도는 경광등.",       scale: 1.3, offsetY: 12 },
    { classname: "spotlight",    name: "스포트라이트",   category: "light", cost: 25, desc: "무대 주인공을 비춰요!",       scale: 1.5, offsetY: 12 },
    { classname: "wcandleset",   name: "촛대 세트",      category: "light", cost: 15, desc: "분위기 있는 하얀 촛대.",      scale: 1.2, offsetY: 12 },
    { classname: "skullcandle",  name: "해골 촛불",      category: "light", cost: 18, desc: "으스스한 해골 촛불.",         scale: 1.1, offsetY: 12 },
    { classname: "menorah",      name: "촛불 장식대",    category: "light", cost: 15, desc: "촛불 여러 개가 나란히.",      scale: 1.2, offsetY: 12 },

    // ---- 가전·전자 (elec) ----
    { classname: "tv_luxus",      name: "럭셔리 TV",      category: "elec", cost: 45, desc: "고급스러운 대형 TV.",        scale: 1.4, offsetY: 12 },
    { classname: "red_tv",        name: "빨간 TV",        category: "elec", cost: 35, desc: "동글동글 빨간 TV.",          scale: 1.2, offsetY: 12 },
    { classname: "wood_tv",       name: "원목 TV",        category: "elec", cost: 40, desc: "나무 틀의 옛날 TV.",         scale: 1.3, offsetY: 12 },
    { classname: "fridge",        name: "냉장고",         category: "elec", cost: 50, desc: "시원한 음료가 가득!",        scale: 1.5, offsetY: 12 },
    { classname: "md_limukaappi", name: "음료수 자판기",  category: "elec", cost: 60, desc: "동전 넣고 음료수 뽑기.",     scale: 1.6, offsetY: 12 },
    { classname: "typingmachine", name: "타자기",         category: "elec", cost: 30, desc: "달칵달칵 옛날 타자기.",      scale: 1.1, offsetY: 12 },
    { classname: "samovar",       name: "사모바르 주전자", category: "elec", cost: 25, desc: "커다란 러시아식 주전자.",    scale: 1.2, offsetY: 12 },
    { classname: "roomdimmer",    name: "조명 조절기",    category: "elec", cost: 20, desc: "방 분위기를 바꾸는 스위치.", scale: 1.1, offsetY: 12 },

    // ---- 장식·음식 (fun) ----
    { classname: "duck",              name: "고무 오리",      category: "fun", cost: 5,  desc: "꽥! 노란 고무 오리.",        scale: 0.9, offsetY: 12 },
    { classname: "habbocake",         name: "생일 케이크",    category: "fun", cost: 10, desc: "촛불 켜진 축하 케이크.",     scale: 1.0, offsetY: 12 },
    { classname: "pizza",             name: "피자 한 판",     category: "fun", cost: 8,  desc: "따끈따끈 방금 나온 피자.",   scale: 1.0, offsetY: 12 },
    { classname: "pumpkin",           name: "호박",           category: "fun", cost: 10, desc: "가을 분위기 물씬 호박.",     scale: 1.1, offsetY: 12 },
    { classname: "campfire",          name: "모닥불",         category: "fun", cost: 25, desc: "타닥타닥 캠핑 모닥불.",      scale: 1.2, offsetY: 12 },
    { classname: "pond",              name: "작은 연못",      category: "fun", cost: 30, desc: "물고기가 살 것 같은 연못.",  scale: 1.6, offsetY: 13 },
    { classname: "toy1",              name: "장난감 큐브",    category: "fun", cost: 8,  desc: "알록달록 나무 블록.",        scale: 1.0, offsetY: 12 },
    { classname: "toy2",              name: "장난감 공",      category: "fun", cost: 8,  desc: "탱탱 튀는 장난감 공.",       scale: 1.0, offsetY: 12 },
    { classname: "fireplace_armas",   name: "오두막 벽난로",  category: "fun", cost: 80, desc: "따뜻한 통나무집 벽난로.",    scale: 1.6, offsetY: 12 },
    { classname: "fireplace_polyfon", name: "폴리폰 벽난로",  category: "fun", cost: 85, desc: "고급스러운 대리석 벽난로.",  scale: 1.6, offsetY: 12 },
    { classname: "edice",             name: "주사위",         category: "fun", cost: 15, desc: "데굴데굴 큰 주사위.",        scale: 1.1, offsetY: 12 },
    { classname: "edicehc",           name: "황금 주사위",    category: "fun", cost: 30, desc: "반짝이는 특별한 주사위.",    scale: 1.1, offsetY: 12 },

    // ---- 레어 (rare) ----
    { classname: "throne",               name: "황금 왕좌",       category: "rare", cost: 500, desc: "방의 주인공만 앉는 전설의 왕좌!", canSit: true, sitHeight: 0.55, scale: 1.5, offsetY: 12 },
    { classname: "rare_fountain",        name: "레어 분수대",     category: "rare", cost: 300, desc: "시원한 물소리가 들리는 분수대.",  scale: 1.6, offsetY: 12 },
    { classname: "rare_elephant_statue", name: "코끼리 조각상",   category: "rare", cost: 250, desc: "행운을 부르는 코끼리 조각상.",    scale: 1.4, offsetY: 12 },
    { classname: "rare_globe",           name: "지구본",          category: "rare", cost: 180, desc: "빙글 돌려 보는 큰 지구본.",       scale: 1.4, offsetY: 12 },
    { classname: "rare_stand",           name: "레어 스탠드",     category: "rare", cost: 130, desc: "귀한 물건을 올려 두는 받침대.",   scale: 1.4, offsetY: 12 },
    { classname: "rare_beehive_bulb",    name: "벌집 전구",       category: "rare", cost: 120, desc: "벌집 모양의 신기한 전구.",        scale: 1.3, offsetY: 12 },
    { classname: "rare_xmas_screen",     name: "크리스마스 병풍", category: "rare", cost: 200, desc: "겨울 풍경이 그려진 병풍.",        scale: 1.6, offsetY: 12 },
    { classname: "rare_daffodil_rug",    name: "수선화 러그",     category: "rare", cost: 100, desc: "꽃무늬가 예쁜 희귀 러그.",        walkable: true, scale: 1.3, offsetY: 14 },
    { classname: "rare_snowrug",         name: "눈꽃 러그",       category: "rare", cost: 150, desc: "사르르 눈이 쌓인 듯한 러그.",     walkable: true, scale: 1.3, offsetY: 14 },
    { classname: "rare_moonrug",         name: "달빛 러그",       category: "rare", cost: 150, desc: "은은한 달빛을 닮은 러그.",        walkable: true, scale: 1.3, offsetY: 14 }
];


// ==== 2026-07-09 확장 가구 102종 (원본 스프라이트 로컬 보유, 아이콘도 로컬 렌더) ====
CATALOG_ITEMS.push(
    // 러그·장판 (걸을 수 있음)
    { classname: "school_floor",        name: "학교 바닥판",     category: "rug", cost: 15, desc: "교실 느낌의 바닥판.", walkable: true },
    { classname: "bathroom_floortile1", name: "욕실 타일 A",     category: "rug", cost: 15, desc: "반짝반짝 욕실 타일.", walkable: true },
    { classname: "bathroom_floortile2", name: "욕실 타일 B",     category: "rug", cost: 15, desc: "무늬가 다른 욕실 타일.", walkable: true },
    { classname: "arabian_tile",        name: "아라비아 타일",   category: "rug", cost: 20, desc: "이국적인 무늬 타일.", walkable: true },
    { classname: "pixel_carpet_black",  name: "픽셀 카펫(검정)", category: "rug", cost: 18, desc: "픽셀 무늬 카펫.", walkable: true },
    { classname: "pixel_carpet_blue",   name: "픽셀 카펫(파랑)", category: "rug", cost: 18, desc: "픽셀 무늬 카펫.", walkable: true },
    { classname: "pixel_carpet_green",  name: "픽셀 카펫(초록)", category: "rug", cost: 18, desc: "픽셀 무늬 카펫.", walkable: true },
    { classname: "pixel_carpet_pink",   name: "픽셀 카펫(분홍)", category: "rug", cost: 18, desc: "픽셀 무늬 카펫.", walkable: true },
    { classname: "pixel_carpet_red",    name: "픽셀 카펫(빨강)", category: "rug", cost: 18, desc: "픽셀 무늬 카펫.", walkable: true },
    { classname: "gothic_carpet",       name: "고딕 카펫",       category: "rug", cost: 25, desc: "성에 깔린 듯한 카펫.", walkable: true },
    { classname: "gothic_carpet2",      name: "고딕 카펫 II",    category: "rug", cost: 25, desc: "더 화려한 고딕 카펫.", walkable: true },
    { classname: "classic6_stonecarpet", name: "돌바닥 판",      category: "rug", cost: 20, desc: "묵직한 돌바닥.", walkable: true },
    { classname: "arabian_rug",         name: "아라비안 러그",   category: "rug", cost: 35, desc: "마법 양탄자 같은 러그.", walkable: true },
    { classname: "anna_rug",            name: "안나 러그",       category: "rug", cost: 22, desc: "포근한 무늬 러그.", walkable: true },
    { classname: "diner_rug",           name: "식당 러그",       category: "rug", cost: 20, desc: "체크무늬 식당 러그.", walkable: true },
    { classname: "theatre_carpet",      name: "극장 카펫",       category: "rug", cost: 12, desc: "빨간 극장 카펫.", walkable: true },
    { classname: "theatre_rug",         name: "극장 러그",       category: "rug", cost: 14, desc: "별이 빛나는 러그.", walkable: true },
    { classname: "steampunk_carpet",    name: "스팀펑크 카펫",   category: "rug", cost: 25, desc: "톱니바퀴 무늬 카펫.", walkable: true },
    { classname: "easy_carpet",         name: "넓은 카펫",       category: "rug", cost: 30, desc: "방을 덮는 큰 카펫.", walkable: true },
    { classname: "carpet_valentine",    name: "하트 카펫",       category: "rug", cost: 28, desc: "길게 깔린 하트 카펫.", walkable: true },
    { classname: "xmas13_rug",          name: "크리스마스 러그", category: "rug", cost: 25, desc: "겨울 분위기 러그.", walkable: true },
    { classname: "usva_rug",            name: "구름 러그",       category: "rug", cost: 22, desc: "구름처럼 몽실한 러그.", walkable: true },

    // 테이블·책상
    { classname: "silo_studydesk",      name: "공부 책상",       category: "table", cost: 25, desc: "숙제하기 딱 좋은 책상.", canStandOn: true },
    { classname: "gothic_desk",         name: "고딕 책상",       category: "table", cost: 30, desc: "고풍스러운 책상.", canStandOn: true },
    { classname: "classic1_desk",       name: "클래식 책상",     category: "table", cost: 25, desc: "단정한 클래식 책상.", canStandOn: true },
    { classname: "exe_wrkdesk",         name: "사무용 책상",     category: "table", cost: 30, desc: "회사원 느낌 책상.", canStandOn: true },
    { classname: "hc_exe_wrkdesk",      name: "고급 사무 책상",  category: "table", cost: 45, desc: "번쩍이는 고급 책상.", canStandOn: true },
    { classname: "desk_junk",           name: "책상 소품",       category: "table", cost: 8,  desc: "책상 위 잡동사니." },
    { classname: "ktchn_desk",          name: "주방 조리대",     category: "table", cost: 25, desc: "요리 준비하는 조리대.", canStandOn: true },
    { classname: "smooth_table_polyfon", name: "매끈 테이블",    category: "table", cost: 18, desc: "매끈한 폴리폰 테이블.", canStandOn: true },
    { classname: "table_polyfon",       name: "폴리폰 큰 테이블", category: "table", cost: 20, desc: "널찍한 테이블.", canStandOn: true },
    { classname: "table_silo_med",      name: "사일로 테이블",   category: "table", cost: 18, desc: "모던한 중형 테이블.", canStandOn: true },

    // 가전·전자 (대부분 작동하기 가능)
    { classname: "jukebox",             name: "주크박스",        category: "elec", cost: 70, desc: "음악이 나올 것 같은 기계!" },
    { classname: "jukebox_big",         name: "대형 주크박스",   category: "elec", cost: 90, desc: "더 큰 주크박스." },
    { classname: "arcade_cab",          name: "오락실 게임기",   category: "elec", cost: 80, desc: "동전 넣고 게임 한 판!" },
    { classname: "computer_laptop",     name: "노트북",          category: "elec", cost: 50, desc: "접었다 펴는 노트북." },
    { classname: "computer_flatscreen", name: "컴퓨터",          category: "elec", cost: 55, desc: "평면 모니터 컴퓨터." },
    { classname: "computer_old",        name: "옛날 컴퓨터",     category: "elec", cost: 30, desc: "뚱뚱한 옛날 컴퓨터." },
    { classname: "hc_tv",               name: "고급 TV",         category: "elec", cost: 65, desc: "번쩍이는 대형 TV." },
    { classname: "ktchn10_stove",       name: "가스레인지",      category: "elec", cost: 45, desc: "불을 켜서 요리해요." },
    { classname: "ktchn15_fridge",      name: "주방 냉장고",     category: "elec", cost: 50, desc: "문이 열리는 냉장고." },
    { classname: "ktchn15_coffeemaker", name: "커피메이커",      category: "elec", cost: 25, desc: "보글보글 커피 내리기." },
    { classname: "ktchn_c15_dishwasher", name: "식기세척기",     category: "elec", cost: 45, desc: "설거지는 기계에게!" },
    { classname: "ktchn10_sink",        name: "싱크대",          category: "elec", cost: 35, desc: "물이 나오는 싱크대." },

    // 학교
    { classname: "school_chair",        name: "학교 의자(빨강)", category: "school", cost: 12, desc: "교실의 그 의자.", canSit: true },
    { classname: "school_chair_b",      name: "학교 의자(파랑)", category: "school", cost: 12, desc: "파란색 학교 의자.", canSit: true },
    { classname: "school_chair_g",      name: "학교 의자(초록)", category: "school", cost: 12, desc: "초록색 학교 의자.", canSit: true },
    { classname: "school_bench",        name: "학교 벤치",       category: "school", cost: 20, desc: "복도에 있는 긴 벤치.", canSit: true },
    { classname: "school_table",        name: "학교 책상",       category: "school", cost: 25, desc: "모둠 활동용 큰 책상.", canStandOn: true },
    { classname: "school_locker_b",     name: "사물함(파랑)",    category: "school", cost: 30, desc: "문이 열리는 사물함." },
    { classname: "school_locker_g",     name: "사물함(초록)",    category: "school", cost: 30, desc: "문이 열리는 사물함." },
    { classname: "school_locker_r",     name: "사물함(빨강)",    category: "school", cost: 30, desc: "문이 열리는 사물함." },
    { classname: "school_coatrack_b",   name: "옷걸이",          category: "school", cost: 15, desc: "가방과 옷을 걸어요." },
    { classname: "school_console",      name: "게임 콘솔 책상",  category: "school", cost: 35, desc: "게임이 되는 신기한 책상.", canStandOn: true },
    { classname: "school_fountain",     name: "식수대",          category: "school", cost: 25, desc: "물 마시는 식수대." },
    { classname: "school_gate",         name: "학교 정문",       category: "school", cost: 30, desc: "등굣길 정문." },
    { classname: "school_stuff_01",     name: "학용품 더미 A",   category: "school", cost: 8,  desc: "책과 학용품." },
    { classname: "school_stuff_02",     name: "학용품 더미 B",   category: "school", cost: 8,  desc: "쌓여 있는 준비물." },

    // 식당
    { classname: "diner_chair",         name: "식당 의자",       category: "diner", cost: 15, desc: "빙글 도는 식당 의자.", canSit: true },
    { classname: "diner_sofa_1",        name: "식당 소파(빨강)", category: "diner", cost: 25, desc: "칸막이 소파.", canSit: true },
    { classname: "diner_sofa_2",        name: "식당 소파(파랑)", category: "diner", cost: 25, desc: "칸막이 소파.", canSit: true },
    { classname: "diner_table_1",       name: "식당 테이블",     category: "diner", cost: 30, desc: "반짝이는 식탁.", canStandOn: true },
    { classname: "diner_table_2",       name: "긴 식당 테이블",  category: "diner", cost: 35, desc: "가족용 긴 식탁.", canStandOn: true },
    { classname: "diner_bardesk",       name: "식당 카운터",     category: "diner", cost: 30, desc: "주문받는 카운터." },
    { classname: "diner_bardesk_corner", name: "카운터 모서리",  category: "diner", cost: 25, desc: "카운터 연결 조각." },
    { classname: "diner_cashreg",       name: "계산대",          category: "diner", cost: 40, desc: "찰칵! 가게 놀이 필수품." },
    { classname: "diner_gumvendor",     name: "껌볼 자판기",     category: "diner", cost: 35, desc: "알록달록 껌볼 기계." },
    { classname: "diner_shaker",        name: "쉐이크 기계",     category: "diner", cost: 30, desc: "위이잉- 쉐이크 제조기." },
    { classname: "diner_tray_1",        name: "햄버거 쟁반",     category: "diner", cost: 10, desc: "맛있는 세트 메뉴." },
    { classname: "diner_tray_4",        name: "음료 쟁반",       category: "diner", cost: 10, desc: "시원한 음료 세트." },

    // 장식·음악·인형 (fun)
    { classname: "grand_piano",         name: "그랜드 피아노",   category: "fun", cost: 120, desc: "연주할 수 있는 피아노!" },
    { classname: "classic5_speaker",    name: "대형 스피커",     category: "fun", cost: 40, desc: "쿵쿵 울리는 스피커." },
    { classname: "teddy_basic",         name: "곰인형(갈색)",    category: "fun", cost: 20, desc: "꼭 안고 싶은 곰인형." },
    { classname: "teddy_bear",          name: "곰인형(수줍음)",  category: "fun", cost: 25, desc: "부끄럼쟁이 곰인형." },
    { classname: "teddy_pink",          name: "곰인형(분홍)",    category: "fun", cost: 25, desc: "분홍 곰인형." },
    { classname: "teddy_pendergrass",   name: "곰인형(멋쟁이)",  category: "fun", cost: 30, desc: "넥타이 맨 곰인형." },
    { classname: "uni_plush1",          name: "유니콘 인형 A",   category: "fun", cost: 30, desc: "무지개 유니콘 인형." },
    { classname: "uni_plush2",          name: "유니콘 인형 B",   category: "fun", cost: 30, desc: "하늘색 유니콘 인형." },
    { classname: "prize_alienplush",    name: "외계인 인형",     category: "fun", cost: 35, desc: "삐뽀삐뽀 외계인 인형." },
    { classname: "basket",              name: "바구니",          category: "fun", cost: 10, desc: "소풍 바구니." },
    { classname: "bookpile",            name: "책 더미",         category: "fun", cost: 10, desc: "읽다 쌓아둔 책들." },
    { classname: "books_0",             name: "책꽂이 책",       category: "fun", cost: 12, desc: "가지런한 책들." },

    // 식물·자연
    { classname: "ashtree",             name: "물푸레나무",      category: "plant", cost: 25, desc: "가지가 멋진 큰 나무." },
    { classname: "african_tree1",       name: "아프리카 나무 A", category: "plant", cost: 22, desc: "사바나의 나무." },
    { classname: "african_tree2",       name: "아프리카 나무 B", category: "plant", cost: 22, desc: "잎이 흔들리는 나무." },
    { classname: "bolly_fountain",      name: "정원 분수",       category: "plant", cost: 60, desc: "물이 솟는 정원 분수." },
    { classname: "country_fnc1",        name: "시골 울타리",     category: "plant", cost: 12, desc: "나무 울타리." },
    { classname: "country_fnc2",        name: "시골 울타리 II",  category: "plant", cost: 12, desc: "긴 나무 울타리." },
    { classname: "country_gate",        name: "울타리 문",       category: "plant", cost: 15, desc: "여닫는 울타리 문." },
    { classname: "country_scarecrow",   name: "허수아비",        category: "plant", cost: 30, desc: "새를 쫓는 허수아비." },
    { classname: "country_log",         name: "통나무 의자",     category: "plant", cost: 15, desc: "걸터앉는 통나무.", canSit: true },
    { classname: "country_grass",       name: "잔디밭",          category: "plant", cost: 15, desc: "밟으면 폭신한 잔디.", walkable: true },

    // 의자 추가
    { classname: "bar_chair_armas",     name: "오두막 바 의자",  category: "seat", cost: 15, desc: "높다란 바 의자.", canSit: true },
    { classname: "soft_sofa_norja",     name: "노르야 푹신 소파", category: "seat", cost: 28, desc: "푹 꺼지는 소파.", canSit: true },
    { classname: "solarium_norja",      name: "선탠 의자",       category: "seat", cost: 35, desc: "햇볕 쬐는 긴 의자.", canSit: true },

    // 수납·기타
    { classname: "bar_armas",           name: "오두막 바",       category: "storage", cost: 35, desc: "통나무 술집 바... 아니 주스 바!" },
    { classname: "shelves_armas",       name: "오두막 책장",     category: "storage", cost: 25, desc: "키 큰 통나무 책장." },
    { classname: "divider_silo2",       name: "사일로 칸막이 II", category: "storage", cost: 18, desc: "긴 칸막이." },
    { classname: "divider_silo3",       name: "사일로 게이트",   category: "storage", cost: 20, desc: "열리는 칸막이 문." },
    { classname: "safe_silo",           name: "금고",            category: "storage", cost: 60, desc: "소중한 것을 넣는 금고." },
    { classname: "stand_polyfon_z",     name: "Z 선반",          category: "storage", cost: 15, desc: "지그재그 선반." },

    // 침대 추가
    { classname: "bed_silo_two",        name: "사일로 2인 침대", category: "bed", cost: 60, desc: "모던한 2인 침대." }
);

CATALOG_ITEMS.forEach(item => {
    item.imgUrl = ASSET_BASE + item.classname + "_icon.png";
    // 테이블류는 위에 물건을 올릴 수 있음 (하보의 canstandon)
    if (item.category === "table") item.canStandOn = true;
});

function getModel(classname) {
    return CATALOG_ITEMS.find(c => c.classname === classname);
}

// 가구 크기·높이 [가로, 세로, 높이z]. 원본 dimensions에서 미리 추출해 박아둠 →
// 그림(furni JSON) 로딩 전에도 즉시 알 수 있어, 로딩 중 침대를 밟고 지나가는 버그 방지.
const FURNI_DIMS = {
    bar_polyfon: [1, 1, 1.0], bardesk_polyfon: [2, 1, 1.0], bed_armas_one: [1, 3, 1.8],
    bed_armas_two: [2, 3, 1.8], bed_budget: [2, 3, 1.9], bed_budget_one: [1, 3, 1.9],
    bed_budgetb: [2, 3, 1.9], bed_polyfon: [2, 3, 1.731], bed_polyfon_girl: [2, 3, 1.731],
    bed_polyfon_one: [1, 3, 1.73], bed_silo_one: [1, 3, 1.9], bench_armas: [2, 1, 1.1],
    campfire: [1, 1, 0.0], carpet_armas: [2, 4, 0.0], carpet_polar: [2, 3, 0.0],
    carpet_soft: [2, 4, 0.0], carpet_standard: [3, 5, 0.0], chair_norja: [1, 1, 1.0],
    chair_plasto: [1, 1, 1.1], chair_plasty: [1, 1, 1.0], chair_polyfon: [1, 1, 1.0],
    chair_silo: [1, 1, 1.113], club_sofa: [2, 1, 1.0], couch_norja: [2, 1, 1.0],
    divider_arm1: [1, 1, 1.0], divider_nor1: [1, 1, 1.0], divider_silo1: [1, 1, 1.0],
    doormat_love: [1, 1, 0.0], doormat_plain: [1, 1, 0.0], duck: [1, 1, 1.0],
    edice: [1, 1, 1.0], edicehc: [1, 1, 1.0], fireplace_armas: [2, 1, 1.562],
    fireplace_polyfon: [2, 1, 1.0], fridge: [1, 1, 1.0], habbocake: [1, 1, 1.562],
    hockey_light: [1, 1, 1.0], lamp2_armas: [1, 1, 1.0], lamp_armas: [1, 1, 1.562],
    lamp_basic: [1, 1, 1.0], md_limukaappi: [1, 1, 1.0], menorah: [1, 1, 1.0],
    pizza: [1, 1, 1.0], plant_big_cactus: [1, 1, 1.0], plant_bonsai: [1, 1, 1.0],
    plant_bulrush: [1, 1, 0.0], plant_cruddy: [1, 1, 1.0], plant_fruittree: [1, 1, 1.0],
    plant_maze: [2, 1, 1.0], plant_mazegate: [2, 1, 0.0], plant_pineapple: [1, 1, 1.0],
    plant_rose: [1, 1, 1.0], plant_small_cactus: [1, 1, 1.0], plant_sunflower: [1, 1, 1.0],
    plant_yukka: [1, 1, 1.0], pond: [1, 1, 0.0], pumpkin: [1, 1, 1.0],
    rare_beehive_bulb: [1, 1, 0.0], rare_daffodil_rug: [2, 2, 0.0], rare_elephant_statue: [1, 1, 1.0],
    rare_fountain: [1, 1, 1.0], rare_globe: [1, 1, 1.0], rare_moonrug: [2, 2, 0.0],
    rare_snowrug: [2, 2, 0.0], rare_stand: [1, 1, 1.9], rare_xmas_screen: [2, 1, 0.656],
    red_tv: [1, 1, 0.438], samovar: [1, 1, 1.562], shelves_norja: [1, 1, 1.0],
    shelves_polyfon: [2, 1, 1.0], shelves_silo: [2, 1, 1.0], skullcandle: [1, 1, 1.0],
    small_chair_armas: [1, 1, 1.0], small_table_armas: [1, 1, 0.9], sofa_polyfon: [2, 1, 1.2],
    sofa_silo: [2, 1, 1.0], sofachair_polyfon: [1, 1, 1.2], sofachair_polyfon_girl: [1, 1, 1.2],
    sofachair_silo: [1, 1, 1.0], soft_sofachair_norja: [1, 1, 1.0], spotlight: [1, 1, 0.0],
    table_armas: [2, 2, 0.9], table_norja_med: [2, 2, 0.8], table_plasto_bigsquare: [2, 2, 0.9],
    table_plasto_round: [2, 2, 1.2], table_plasto_square: [1, 1, 0.9], table_polyfon_med: [2, 2, 0.7],
    table_polyfon_small: [2, 2, 1.0], table_silo_small: [1, 1, 1.0], throne: [1, 1, 1.0],
    toy1: [1, 1, 0.0], toy2: [1, 1, 0.0], tv_luxus: [1, 3, 1.0],
    typingmachine: [1, 1, 0.0], wcandleset: [1, 1, 0.0], wood_tv: [1, 2, 1.9]
};

// 2026-07-09 확장분(102종) — 신규 다운로드한 furni JSON에서 추출
Object.assign(FURNI_DIMS, {
    school_floor: [2, 2, 0.001],
    bathroom_floortile1: [2, 2, 0.1],
    bathroom_floortile2: [2, 2, 0.1],
    arabian_tile: [2, 2, 0.0],
    pixel_carpet_black: [2, 3, 0.01],
    pixel_carpet_blue: [2, 3, 0.01],
    pixel_carpet_green: [2, 3, 0.01],
    pixel_carpet_pink: [2, 3, 0.01],
    pixel_carpet_red: [2, 3, 0.01],
    gothic_carpet: [2, 4, 0.0],
    gothic_carpet2: [2, 4, 0.0],
    classic6_stonecarpet: [2, 2, 0.1],
    arabian_rug: [3, 5, 0.0],
    anna_rug: [2, 2, 0.0],
    diner_rug: [2, 2, 0.0],
    theatre_carpet: [1, 1, 0.0],
    theatre_rug: [1, 1, 0.0],
    steampunk_carpet: [2, 3, 0.01],
    easy_carpet: [4, 4, 0.0],
    carpet_valentine: [2, 7, 0.0],
    xmas13_rug: [2, 3, 0.0],
    usva_rug: [2, 2, 0.0],
    silo_studydesk: [2, 1, 1.0],
    gothic_desk: [1, 2, 1.0],
    classic1_desk: [1, 1, 1.25],
    exe_wrkdesk: [2, 1, 1.0],
    hc_exe_wrkdesk: [2, 1, 1.0],
    desk_junk: [1, 1, 0.1],
    ktchn_desk: [2, 1, 0.99],
    smooth_table_polyfon: [2, 2, 0.6],
    table_polyfon: [2, 2, 0.6],
    table_silo_med: [2, 2, 0.7],
    jukebox: [1, 1, 2.0],
    jukebox_big: [2, 1, 1.9],
    arcade_cab: [1, 1, 2.0],
    computer_laptop: [1, 1, 0.0],
    computer_flatscreen: [1, 1, 1.0],
    computer_old: [1, 1, 0.0],
    hc_tv: [2, 1, 1.3],
    diner_cashreg: [1, 1, 1.0],
    diner_gumvendor: [1, 1, 1.0],
    ktchn10_stove: [2, 1, 1.25],
    ktchn15_fridge: [1, 1, 1.0],
    ktchn15_coffeemaker: [1, 1, 0.001],
    ktchn_c15_dishwasher: [1, 1, 1.25],
    ktchn10_sink: [2, 1, 1.0],
    school_chair: [1, 1, 1.1],
    school_chair_b: [1, 1, 1.1],
    school_chair_g: [1, 1, 1.1],
    school_bench: [3, 1, 1.2],
    school_table: [3, 2, 1.0],
    school_locker_b: [1, 1, 0.0],
    school_locker_g: [1, 1, 0.0],
    school_locker_r: [1, 1, 0.0],
    school_coatrack_b: [2, 1, 1.1],
    school_console: [1, 1, 1.2],
    school_fountain: [1, 1, 0.0],
    school_gate: [3, 1, 0.0],
    school_stuff_01: [1, 1, 0.0],
    school_stuff_02: [1, 1, 0.0],
    diner_chair: [1, 1, 1.6],
    diner_sofa_1: [1, 1, 1.0],
    diner_sofa_2: [1, 1, 1.0],
    diner_table_1: [2, 2, 1.7],
    diner_table_2: [3, 2, 1.5],
    diner_bardesk: [1, 1, 0.98],
    diner_bardesk_corner: [1, 1, 0.98],
    diner_shaker: [1, 1, 0.0],
    diner_tray_1: [1, 1, 0.0],
    diner_tray_4: [1, 1, 0.0],
    grand_piano: [2, 2, 0.0],
    classic5_speaker: [1, 1, 0.0],
    teddy_basic: [1, 1, 0.0],
    teddy_bear: [1, 1, 0.0],
    teddy_pink: [1, 1, 0.0],
    teddy_pendergrass: [1, 1, 0.0],
    uni_plush1: [1, 1, 1.0],
    uni_plush2: [1, 1, 1.0],
    prize_alienplush: [1, 1, 0.9],
    basket: [1, 1, 0.438],
    bookpile: [1, 1, 0.4],
    books_0: [1, 1, 1.0],
    ashtree: [1, 1, 0.0],
    african_tree1: [1, 1, 1.0],
    african_tree2: [1, 1, 1.0],
    bolly_fountain: [2, 2, 0.0],
    country_fnc1: [2, 1, 0.0],
    country_fnc2: [2, 1, 0.99],
    country_gate: [2, 1, 0.0],
    country_scarecrow: [1, 1, 0.0],
    country_log: [2, 1, 1.3],
    country_grass: [2, 2, 0.0],
    bar_armas: [1, 1, 1.0],
    bar_chair_armas: [1, 1, 1.394],
    shelves_armas: [2, 1, 3.1],
    bed_silo_two: [2, 3, 1.9],
    divider_silo2: [2, 1, 1.0],
    divider_silo3: [1, 1, 0.0],
    safe_silo: [1, 1, 1.35],
    soft_sofa_norja: [2, 1, 1.0],
    stand_polyfon_z: [1, 1, 0.5],
    solarium_norja: [1, 1, 2.0]
});


// 1-1. 아바타 부품 데이터
// 2026-07-09 imager.habboon.pw에 하나씩 렌더링해 실제 작동 확인된 ID만 수록.
// 색상 hex는 렌더 이미지에서 픽셀 추출한 실제 색. (이 이메이저는 머리 색 변경 미지원)
const SKIN_COLORS = [
    { id: 1, hex: "#feca97" }, { id: 7, hex: "#fec57f" }, { id: 2, hex: "#e2ad7d" },
    { id: 3, hex: "#c89163" }, { id: 4, hex: "#ad7748" }, { id: 5, hex: "#935c2f" },
    { id: 6, hex: "#6e482c" }
];

const CLOTH_COLORS = [
    { id: 61, hex: "#ffffff" }, { id: 62, hex: "#eeeeee" }, { id: 63, hex: "#a4a4a4" },
    { id: 64, hex: "#595959" }, { id: 66, hex: "#e7b027" }, { id: 68, hex: "#f8c790" },
    { id: 70, hex: "#c74400" }, { id: 96, hex: "#ff1300" }, { id: 72, hex: "#ed5c50" },
    { id: 73, hex: "#9f2b31" }, { id: 100, hex: "#9b001d" }, { id: 74, hex: "#e7d1ee" },
    { id: 80, hex: "#c5ede6" }, { id: 104, hex: "#00b9a8" }, { id: 106, hex: "#1bd2ff" },
    { id: 82, hex: "#4f7aa2" }, { id: 85, hex: "#456f40" }, { id: 88, hex: "#7a7d22" },
    { id: 90, hex: "#96743d" }
];

// 아바타 부품 620종 — 하보 figuredata(2012년경)에서 추출, 전부 habboon 이메이저 렌더 검증 통과분.
// 값은 성별: 'M' 남자 / 'F' 여자 / 'U' 공용. (하보 방식: 성별은 잠금이 아니라 필터)
const PART_INFO = {
    hd: {180:'M', 185:'M', 190:'M', 195:'M', 200:'M', 205:'M', 206:'M', 207:'M', 208:'M', 209:'M', 600:'F', 605:'F', 610:'F', 615:'F', 620:'F', 625:'F', 626:'F', 627:'F', 628:'F', 629:'F', 3091:'M', 3092:'M', 3093:'M', 3094:'M', 3095:'M', 3096:'F', 3097:'F', 3098:'F', 3099:'F', 3100:'F', 3101:'M', 3102:'M', 3103:'M', 3104:'F', 3105:'F', 3106:'F'},
    hr: {100:'M', 105:'M', 110:'M', 115:'M', 125:'M', 135:'M', 145:'M', 155:'M', 165:'M', 170:'M', 500:'F', 505:'F', 510:'F', 515:'F', 520:'F', 530:'F', 540:'F', 545:'F', 550:'F', 555:'F', 575:'F', 596:'F', 676:'U', 677:'U', 678:'U', 679:'U', 681:'U', 802:'M', 811:'F', 828:'M', 829:'M', 830:'M', 831:'M', 832:'F', 833:'F', 834:'F', 835:'F', 836:'F', 837:'F', 838:'F', 839:'F', 840:'F', 890:'F', 891:'U', 892:'U', 893:'U', 3004:'F', 3011:'U', 3012:'F', 3020:'M', 3021:'U', 3024:'F', 3025:'M', 3037:'F', 3040:'F', 3041:'U', 3043:'U', 3044:'F', 3048:'U', 3056:'M', 3090:'U', 3160:'F', 3161:'F', 3162:'M', 3163:'M', 3172:'U', 3194:'U', 3195:'F', 3221:'F', 3247:'U', 3251:'F', 3255:'F', 3256:'U', 3260:'M', 3273:'F', 3278:'M', 3281:'M', 3322:'U', 3325:'U', 3339:'U', 3357:'M', 3369:'U', 3370:'U', 3377:'U', 3386:'U', 3393:'U', 3396:'U', 3436:'U', 3468:'U', 9534:'F'},
    ha: {1001:'U', 1002:'U', 1003:'U', 1004:'U', 1005:'U', 1006:'U', 1007:'U', 1008:'U', 1009:'U', 1010:'U', 1011:'U', 1012:'U', 1013:'U', 1014:'U', 1015:'U', 1016:'U', 1017:'U', 1018:'U', 1019:'U', 1020:'U', 1021:'U', 1022:'U', 1023:'U', 1024:'U', 1025:'U', 1026:'U', 1027:'U', 3026:'U', 3054:'U', 3086:'U', 3117:'U', 3118:'U', 3129:'U', 3130:'U', 3139:'U', 3140:'U', 3144:'U', 3145:'U', 3150:'U', 3156:'U', 3171:'U', 3173:'U', 3179:'U', 3209:'U', 3220:'F', 3231:'U', 3236:'U', 3238:'U', 3240:'U', 3241:'U', 3242:'U', 3243:'U', 3253:'U', 3254:'U', 3259:'U', 3261:'U', 3265:'U', 3268:'U', 3272:'U', 3291:'U', 3298:'U', 3300:'U', 3305:'U', 3331:'U', 3347:'U', 3349:'U', 3352:'U', 3356:'U', 3362:'U', 3363:'U', 3382:'U', 3392:'U', 3394:'U', 3404:'U', 3409:'U', 3415:'U', 3421:'U', 3422:'U', 3426:'U', 3430:'U', 3431:'U', 3441:'U', 3450:'U', 3451:'U', 3452:'U', 3453:'U', 3454:'U', 3455:'U', 3456:'U', 3457:'U', 3461:'U', 3463:'U'},
    ea: {1401:'U', 1402:'U', 1403:'U', 1404:'U', 1405:'U', 1406:'U', 3083:'U', 3107:'U', 3108:'U', 3141:'U', 3148:'U', 3168:'U', 3169:'U', 3170:'U', 3196:'U', 3224:'U', 3226:'U', 3262:'U', 3270:'U', 3318:'U', 3388:'U'},
    ch: {210:'M', 215:'M', 220:'M', 225:'M', 230:'M', 235:'M', 240:'M', 245:'M', 250:'M', 255:'M', 262:'M', 265:'M', 266:'M', 267:'M', 630:'F', 635:'F', 640:'F', 645:'F', 650:'F', 655:'F', 660:'F', 665:'F', 667:'F', 669:'F', 670:'F', 675:'F', 680:'F', 685:'F', 690:'F', 691:'F', 803:'M', 804:'M', 805:'M', 806:'M', 807:'M', 808:'M', 809:'M', 812:'F', 813:'F', 814:'F', 815:'F', 816:'F', 817:'F', 818:'F', 819:'F', 820:'F', 821:'F', 822:'F', 823:'F', 824:'F', 825:'F', 826:'F', 875:'M', 876:'M', 877:'M', 878:'M', 879:'F', 880:'F', 881:'F', 882:'F', 883:'F', 884:'F', 885:'F', 3001:'M', 3005:'F', 3013:'F', 3014:'F', 3015:'M', 3022:'M', 3030:'M', 3032:'M', 3033:'F', 3036:'F', 3038:'M', 3045:'F', 3046:'F', 3049:'F', 3050:'M', 3051:'F', 3059:'M', 3060:'F', 3067:'F', 3076:'F', 3077:'M', 3109:'M', 3110:'M', 3111:'M', 3112:'F', 3113:'F', 3114:'F', 3133:'F', 3135:'F', 3137:'F', 3165:'F', 3167:'M', 3183:'F', 3185:'M', 3197:'F', 3199:'F', 3203:'M', 3208:'M', 3213:'F', 3214:'F', 3215:'M', 3222:'M', 3233:'F', 3234:'M', 3237:'U', 3244:'F', 3245:'F', 3250:'F', 3266:'F', 3279:'M', 3293:'F', 3321:'U', 3323:'M', 3332:'U', 3334:'M', 3335:'F', 3336:'M', 3340:'F', 3342:'U', 3351:'F', 3367:'F', 3368:'M', 3371:'F', 3372:'M', 3399:'F', 3400:'M', 3416:'M', 3417:'F', 3428:'F', 3429:'M', 3432:'M', 3433:'F', 3438:'M', 3439:'F', 3442:'F', 3443:'M', 3446:'U', 3459:'U'},
    lg: {270:'M', 275:'M', 280:'M', 281:'M', 285:'M', 695:'F', 696:'F', 700:'F', 705:'F', 710:'F', 715:'F', 716:'F', 720:'F', 827:'F', 3006:'F', 3017:'U', 3018:'F', 3019:'F', 3023:'U', 3047:'F', 3057:'U', 3058:'U', 3061:'F', 3078:'U', 3088:'U', 3116:'U', 3134:'F', 3136:'U', 3138:'U', 3166:'F', 3174:'F', 3190:'F', 3191:'F', 3192:'F', 3198:'F', 3200:'F', 3201:'M', 3202:'U', 3216:'U', 3235:'U', 3257:'U', 3267:'F', 3282:'F', 3283:'F', 3290:'M', 3320:'U', 3328:'U', 3333:'U', 3337:'U', 3341:'U', 3353:'U', 3355:'U', 3361:'U', 3364:'U', 3365:'U', 3384:'U', 3387:'U', 3391:'U', 3401:'U', 3407:'U', 3408:'U', 3418:'U', 3434:'U', 3449:'U', 3460:'U'},
    sh: {290:'M', 295:'M', 300:'M', 305:'M', 725:'F', 730:'F', 735:'F', 740:'F', 905:'U', 906:'U', 907:'F', 908:'M', 3016:'U', 3027:'U', 3035:'U', 3064:'F', 3068:'U', 3089:'U', 3115:'U', 3154:'U', 3180:'F', 3184:'F', 3206:'U', 3252:'U', 3275:'U', 3277:'F', 3338:'U', 3348:'U', 3354:'U', 3375:'U', 3383:'U', 3419:'U', 3435:'U', 3467:'U'},
    fa: {1201:'U', 1202:'U', 1203:'U', 1204:'U', 1205:'U', 1206:'U', 1207:'U', 1208:'U', 1209:'U', 1210:'U', 1211:'U', 1212:'U', 3147:'U', 3193:'U', 3230:'U', 3276:'U', 3296:'U', 3344:'U', 3345:'U', 3346:'U', 3350:'U', 3378:'U', 3462:'U'},
    cc: {260:'M', 886:'M', 887:'U', 888:'F', 3002:'M', 3003:'F', 3007:'M', 3008:'F', 3009:'M', 3010:'F', 3039:'M', 3066:'F', 3075:'M', 3087:'M', 3152:'M', 3153:'M', 3157:'F', 3158:'M', 3159:'F', 3186:'M', 3232:'U', 3246:'U', 3248:'F', 3249:'F', 3269:'M', 3280:'M', 3289:'U', 3294:'U', 3299:'U', 3304:'F', 3326:'U', 3327:'U', 3373:'F', 3374:'M', 3380:'M', 3381:'F', 3389:'M', 3390:'F', 3397:'F', 3398:'M', 3405:'M', 3406:'F', 3420:'U', 3447:'F', 3448:'M', 9563:'F', 9865:'F'},
    ca: {1801:'U', 1802:'U', 1803:'U', 1804:'U', 1805:'U', 1806:'U', 1807:'U', 1808:'U', 1809:'U', 1810:'U', 1811:'U', 1812:'U', 1813:'U', 1814:'U', 1815:'U', 1816:'U', 1817:'U', 1818:'U', 1819:'U', 3084:'U', 3085:'U', 3131:'U', 3151:'U', 3175:'U', 3176:'U', 3177:'U', 3187:'U', 3217:'U', 3219:'U', 3223:'U', 3225:'U', 3292:'U', 3343:'U', 3410:'U', 3411:'U', 3412:'U', 3413:'U', 3414:'U', 3423:'U', 3424:'U', 3425:'U', 3437:'U', 3444:'U', 3458:'U', 3464:'U', 3466:'U'},
    wa: {2001:'U', 2002:'U', 2003:'U', 2004:'U', 2005:'U', 2006:'U', 2007:'U', 2008:'U', 2009:'U', 2010:'F', 2011:'U', 2012:'U', 3072:'U', 3073:'U', 3074:'U', 3080:'U', 3178:'F', 3210:'F', 3211:'M', 3212:'U', 3263:'U', 3264:'U', 3359:'U', 3366:'U', 3427:'U'}
};

// 선택 해제(0=없음)가 가능한 부품들
const OPTIONAL_PARTS = ['hr', 'ha', 'ea', 'fa', 'cc', 'ca', 'wa'];

// PART_INFO에서 파생: 타입별 세트 ID 목록 (기존 코드 호환용)
const AVATAR_PART_SETS = {};
for (const t in PART_INFO) {
    const ids = Object.keys(PART_INFO[t]).map(Number).sort((a, b) => a - b);
    AVATAR_PART_SETS[t] = OPTIONAL_PARTS.includes(t) ? [0, ...ids] : ids;
}

const HAIR_COLOR = 45; // 머리는 색상 변경이 안 되므로 고정값 사용

// 이메이저 주소 생성기.
// 이메이저가 가끔 오류 이미지(종이봉투 아바타)를 응답하는데, 응답 캐시 수명이 1년이라
// 한 번 받으면 브라우저에 계속 남는 사고가 있었음(2026-07-09).
// 캐시 키에 '주차' 번호를 넣어 일주일마다 새로 받게 함 → 오류 이미지가 박혀도 최대 1주면 자연 복구.
// 당장 고쳐야 하면 IMAGER_V 숫자를 1 올리면 즉시 전부 새로 받음.
const IMAGER_V = 3;
const IMAGER_WEEK = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
function imagerUrl(query) {
    return `https://imager.habboon.pw/?${query}&v=${IMAGER_V}w${IMAGER_WEEK}`;
}

// 1-2. 방 모델 (실제 Habbo 기본 방 heightmap — 에뮬레이터 room_models 원본 데이터)
// 'x' = 바닥 없음(void), '0' = 바닥. door = 입장 타일(바닥 바깥에 있고 걸을 수 있음)
const ROOM_MODELS = {
    model_a: {
        label: "기본 네모 방", door: { x: 3, y: 5, dir: 2 },
        map: "xxxxxxxxxxxx|xxxx00000000|xxxx00000000|xxxx00000000|xxxx00000000|xxxx00000000|xxxx00000000|xxxx00000000|xxxx00000000|xxxx00000000|xxxx00000000|xxxx00000000|xxxx00000000|xxxx00000000|xxxxxxxxxxxx|xxxxxxxxxxxx"
    },
    model_b: {
        label: "ㄱ자 방", door: { x: 0, y: 5, dir: 2 },
        map: "xxxxxxxxxxxx|xxxxx0000000|xxxxx0000000|xxxxx0000000|xxxxx0000000|x00000000000|x00000000000|x00000000000|x00000000000|x00000000000|x00000000000|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx"
    },
    model_c: {
        label: "아늑한 방", door: { x: 4, y: 7, dir: 2 },
        map: "xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx"
    },
    model_d: {
        label: "긴 방", door: { x: 4, y: 7, dir: 2 },
        map: "xxxxxxxxxxxx|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxx000000x|xxxxxxxxxxxx"
    },
    model_e: {
        label: "넓은 네모 방", door: { x: 1, y: 5, dir: 2 },
        map: "xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xx0000000000|xx0000000000|xx0000000000|xx0000000000|xx0000000000|xx0000000000|xx0000000000|xx0000000000|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx"
    },
    model_f: {
        label: "계단 모양 방", door: { x: 2, y: 5, dir: 2 },
        map: "xxxxxxxxxxxx|xxxxxxx0000x|xxxxxxx0000x|xxx00000000x|xxx00000000x|xxx00000000x|xxx00000000x|x0000000000x|x0000000000x|x0000000000x|x0000000000x|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx|xxxxxxxxxxxx"
    }
};

// heightmap 문자열을 타일 정보로 해석
function parseRoomModel(modelName) {
    const def = ROOM_MODELS[modelName];
    const rows = def.map.split("|");
    const h = rows.length;
    const w = rows[0].length;

    const floor = [];       // floor[y][x] = true (문 타일 포함)
    const rowMinX = {};     // 각 행의 첫 바닥 x (벽 그리기용, 문 제외)
    const colMinY = {};     // 각 열의 첫 바닥 y (벽 그리기용, 문 제외)

    for (let y = 0; y < h; y++) {
        floor[y] = [];
        for (let x = 0; x < w; x++) {
            const isF = rows[y][x] !== 'x';
            floor[y][x] = isF;
            if (isF) {
                if (rowMinX[y] === undefined) rowMinX[y] = x;
                if (colMinY[x] === undefined) colMinY[x] = y;
            }
        }
    }

    // 문 타일도 걸을 수 있는 바닥으로 추가
    floor[def.door.y][def.door.x] = true;

    // 방을 화면 중앙에 놓기 위한 등각투영 좌표 범위
    let isoXMin = Infinity, isoXMax = -Infinity, isoYMin = Infinity, isoYMax = -Infinity;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!floor[y][x]) continue;
            isoXMin = Math.min(isoXMin, x - y); isoXMax = Math.max(isoXMax, x - y);
            isoYMin = Math.min(isoYMin, x + y); isoYMax = Math.max(isoYMax, x + y);
        }
    }

    return { name: modelName, def, w, h, floor, rowMinX, colMinY, isoXMin, isoXMax, isoYMin, isoYMax, door: def.door };
}

let currentRoom = parseRoomModel("model_a");

function isFloorTile(x, y) {
    return y >= 0 && y < currentRoom.h && x >= 0 && x < currentRoom.w && currentRoom.floor[y][x];
}

function isDoorTile(x, y) {
    return x === currentRoom.door.x && y === currentRoom.door.y;
}

// 2. 상태 관리 + localStorage 저장
const SAVE_KEY = "housing_save_v1";

let state = {
    credits: 2000,
    playerName: "나",
    roomModel: "model_a",
    wallTheme: 0,         // 벽지 (WALL_THEMES id)
    floorTheme: 0,        // 바닥 (FLOOR_THEMES id)
    inventory: [],        // classname 배열
    placedItems: [],      // { id, classname, x, y, rot }
    selectedCatalogItem: null,
    selectedPlacedItem: null,

    mode: 'normal',       // 'normal' | 'placing' | 'moving'
    placementItem: null,  // 배치 중인 가구 모델
    placementSource: null,// { type: 'inventory' } | { type: 'move', original: {...} }
    placementX: 0,
    placementY: 0,
    placementRot: 0,

    avatar: {
        x: 3, y: 5, z: 0, // 시작 위치는 초기화 시 문 좌표로 다시 설정됨
        dir: 2,
        isWalking: false,
        path: [],
        stepTimer: 0,
        sitting: null,    // { itemId, pose: 'sit'|'lay', dir, z }
        pendingPose: null,// 도착하면 앉거나 누울 예약 { itemId, pose }
        // 아바타 생김새 (부품별 선택값) — figure 문자열은 여기서 만들어짐
        look: { gender: 'M', skin: 1, hd: 180, hr: 100, ha: 0, haColor: 61, ea: 0, fa: 0, cc: 0, ccColor: 64, ca: 0, wa: 0, ch: 225, chColor: 82, lg: 270, lgColor: 64, sh: 290, shColor: 61 },
        figure: "" // buildFigure()가 채움
    }
};

// look 객체 → 하보 figure 문자열
function buildFigure(look) {
    const parts = [`hd-${look.hd}-${look.skin}`];
    if (look.hr !== 0) parts.push(`hr-${look.hr}-${HAIR_COLOR}`);
    if (look.ha !== 0) parts.push(`ha-${look.ha}-${look.haColor}`);
    if (look.ea !== 0) parts.push(`ea-${look.ea}-62`); // 안경은 색 고정
    if (look.fa !== 0) parts.push(`fa-${look.fa}-62`);   // 얼굴 장식
    if (look.cc !== 0) parts.push(`cc-${look.cc}-${look.ccColor}`); // 외투
    if (look.ca !== 0) parts.push(`ca-${look.ca}-62`);   // 목걸이·가슴 장식
    if (look.wa !== 0) parts.push(`wa-${look.wa}-62`);   // 벨트
    parts.push(`ch-${look.ch}-${look.chColor}`);
    parts.push(`lg-${look.lg}-${look.lgColor}`);
    parts.push(`sh-${look.sh}-${look.shColor}`);
    return parts.join(".");
}

// look이 바뀔 때마다 figure 문자열과 프로필 아이콘을 갱신 + 이동 스프라이트 미리 로딩
function refreshAvatarFigure() {
    state.avatar.figure = buildFigure(state.avatar.look);
    const profileImg = document.querySelector('#btn-profile img');
    if (profileImg) {
        profileImg.src = imagerUrl(`figure=${state.avatar.figure}&size=m&direction=2&head_direction=2&gesture=sml&headonly=1`);
    }
    preloadAvatarSprites();
}

// 8방향의 서기·걷기·앉기 스프라이트를 미리 받아둠 → 첫 걸음에 아바타가 사라지지 않게
function preloadAvatarSprites() {
    const fig = state.avatar.figure;
    for (let d = 0; d < 8; d++) {
        getCachedImage(imagerUrl(`figure=${fig}&size=m&direction=${d}&head_direction=${d}&action=std`));
        getCachedImage(imagerUrl(`figure=${fig}&size=m&direction=${d}&head_direction=${d}&action=wlk`));
    }
    // 앉기는 의자 방향(2,4,6,0)만 쓰이므로 그 방향만
    for (const d of [0, 2, 4, 6]) {
        getCachedImage(imagerUrl(`figure=${fig}&size=m&direction=${d}&head_direction=${d}&action=sit`));
    }
}

function saveGame() {
    const payload = {
        credits: state.credits,
        playerName: state.playerName,
        roomModel: state.roomModel,
        wallTheme: state.wallTheme,
        floorTheme: state.floorTheme,
        look: state.avatar.look,
        inventory: state.inventory,
        placedItems: state.placedItems
    };
    // 온라인 모드: 코인·가방은 서버(userEconomy·userInventory)가 관리하므로 방 상태만 저장
    if (window.HousingData?.mode === 'online') {
        HousingData.saveRoom(payload);
        return;
    }
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) { /* 저장 실패는 무시 (사파리 시크릿 모드 등) */ }
}

function loadGame() {
    // 온라인 모드: Firestore 방 문서 + 서버 보유 목록에서 복원
    if (window.HousingData?.mode === 'online') {
        state.credits = HousingData.djCoin;
        const nickname = HousingData.member?.nickname;
        if (nickname) state.playerName = String(nickname).slice(0, 10);
        if (HousingData.roomData) applySavedData(HousingData.roomData);
        // 가방 = 서버 보유 수량 − 방에 배치된 수량 (배치/회수는 이 관계를 그대로 유지함)
        const placedCount = {};
        state.placedItems.forEach(i => { placedCount[i.classname] = (placedCount[i.classname] || 0) + 1; });
        state.inventory = [];
        CATALOG_ITEMS.forEach(item => {
            const owned = HousingData.ownedCount(HousingData.furniItemId(item.classname));
            const inBag = owned - (placedCount[item.classname] || 0);
            for (let k = 0; k < inBag; k++) state.inventory.push(item.classname);
        });
        return;
    }
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (typeof data.credits === 'number') state.credits = data.credits;
        if (Array.isArray(data.inventory)) state.inventory = data.inventory.filter(c => getModel(c));
        applySavedData(data);
    } catch (e) { /* 손상된 저장 데이터는 무시 */ }
}

// 저장 데이터(로컬/Firestore 공용)를 검증하며 state에 반영
function applySavedData(data) {
    try {
        if (typeof data.playerName === 'string') state.playerName = data.playerName;
        if (typeof data.roomModel === 'string' && ROOM_MODELS[data.roomModel]) state.roomModel = data.roomModel;
        if (typeof data.wallTheme === 'number' && WALL_THEMES[data.wallTheme]) state.wallTheme = data.wallTheme;
        if (typeof data.floorTheme === 'number' && FLOOR_THEMES[data.floorTheme]) state.floorTheme = data.floorTheme;
        if (data.look && typeof data.look === 'object') {
            // 저장된 부품 ID가 유효 목록에 있을 때만 반영 (목록이 바뀌어도 안전)
            const l = state.avatar.look;
            if (SKIN_COLORS.some(c => c.id === data.look.skin)) l.skin = data.look.skin;
            if (AVATAR_PART_SETS.hd.includes(data.look.hd)) l.hd = data.look.hd;
            if (AVATAR_PART_SETS.hr.includes(data.look.hr)) l.hr = data.look.hr;
            if (AVATAR_PART_SETS.ha.includes(data.look.ha)) l.ha = data.look.ha;
            if (AVATAR_PART_SETS.ea.includes(data.look.ea)) l.ea = data.look.ea;
            if (AVATAR_PART_SETS.ch.includes(data.look.ch)) l.ch = data.look.ch;
            if (AVATAR_PART_SETS.lg.includes(data.look.lg)) l.lg = data.look.lg;
            if (AVATAR_PART_SETS.sh.includes(data.look.sh)) l.sh = data.look.sh;
            if (AVATAR_PART_SETS.fa.includes(data.look.fa)) l.fa = data.look.fa;
            if (AVATAR_PART_SETS.cc.includes(data.look.cc)) l.cc = data.look.cc;
            if (AVATAR_PART_SETS.ca.includes(data.look.ca)) l.ca = data.look.ca;
            if (AVATAR_PART_SETS.wa.includes(data.look.wa)) l.wa = data.look.wa;
            if (data.look.gender === 'M' || data.look.gender === 'F') l.gender = data.look.gender;
            if (CLOTH_COLORS.some(c => c.id === data.look.ccColor)) l.ccColor = data.look.ccColor;
            if (CLOTH_COLORS.some(c => c.id === data.look.haColor)) l.haColor = data.look.haColor;
            if (CLOTH_COLORS.some(c => c.id === data.look.chColor)) l.chColor = data.look.chColor;
            if (CLOTH_COLORS.some(c => c.id === data.look.lgColor)) l.lgColor = data.look.lgColor;
            if (CLOTH_COLORS.some(c => c.id === data.look.shColor)) l.shColor = data.look.shColor;
        }
        if (Array.isArray(data.placedItems)) state.placedItems = data.placedItems.filter(i => getModel(i.classname));
    } catch (e) { /* 손상된 저장 데이터는 무시 */ }
}

// 방 모델 적용: 새 방 바닥에 없는 가구는 가방으로 돌려보냄, 아바타는 문에서 재시작
function applyRoomModel(modelName) {
    state.roomModel = modelName;
    currentRoom = parseRoomModel(modelName);

    const kept = [], returned = [];
    for (const item of state.placedItems) {
        if (isFloorTile(item.x, item.y) && !isDoorTile(item.x, item.y)) kept.push(item);
        else returned.push(item);
    }
    if (returned.length > 0) {
        returned.forEach(i => state.inventory.push(i.classname));
        state.placedItems = kept;
    }

    const a = state.avatar;
    a.x = currentRoom.door.x;
    a.y = currentRoom.door.y;
    a.z = 0;
    a.dir = currentRoom.door.dir;
    a.path = [];
    a.sitting = null;
    a.pendingPose = null;
    a.stepTimer = 0;

    resizeCanvas();
    return returned.length;
}

// 3. 이미지 캐싱
const imageCache = {};
function getCachedImage(url) {
    if (!imageCache[url]) {
        const img = new Image();
        img.src = url;
        imageCache[url] = img;
    }
    return imageCache[url];
}

// 3-2. 원본 가구 스프라이트 (하보 SWF → CycloneIO 변환본)
// 가구마다: dimensions(크기·앉는높이 z), 방향별 스프라이트 오프셋, 레이어 순서, 정품 색상값 포함
// 저작권 보호를 위해 개별 파일 대신 Storage의 잠긴 묶음(assets-loader.js)에서 읽는다
const furniCache = {}; // classname → { status: 'loading'|'ready'|'failed', data }

function loadFurni(cn) {
    if (furniCache[cn]) return furniCache[cn];
    const entry = { status: 'loading' };
    furniCache[cn] = entry;

    window.HousingAssets.ready.then(() => {
        const b = window.HousingAssets.furni[cn];
        if (!b) { entry.status = 'failed'; return; }
        const img = new Image();
        img.onload = () => {
            entry.data = { cn, def: b.def, frames: b.frames, img };
            entry.status = 'ready';
        };
        img.onerror = () => { entry.status = 'failed'; };
        img.src = 'data:image/png;base64,' + b.png;
    }).catch(() => { entry.status = 'failed'; });

    return entry;
}

// 준비됐으면 데이터, 아니면 null (로딩은 자동 시작)
function furniReady(cn) {
    const e = loadFurni(cn);
    return e.status === 'ready' ? e.data : null;
}

// 에셋 이름 → 실제 프레임/오프셋/좌우반전 정보 (source 참조 따라가기)
function resolveFurniAsset(fd, name) {
    const a = fd.def.assets[name];
    if (!a) return null;
    const frameName = a.source || name;
    if (!fd.frames[`${fd.cn}_${frameName}.png`]) return null;
    return { frameName, x: a.x || 0, y: a.y || 0, flipH: !!a.flipH };
}

// 요청 방향/프레임에 에셋이 없으면 있는 것으로 대체
function furniAssetForDir(fd, layerKey, dir, frame) {
    frame = frame || 0;
    for (const f of (frame ? [frame, 0] : [0])) {          // 요청 프레임 우선, 없으면 0번
        for (const d of [dir, 0, 2, 4, 6]) {               // 요청 방향 우선, 없으면 대체 방향
            const res = resolveFurniAsset(fd, `${fd.cn}_64_${layerKey}_${d}_${f}`);
            if (res) return res;
        }
    }
    return null;
}

// 가전 상태(작동) 관련 --------------------------------------------------------
const ANIM_MS = 120; // 애니메이션 프레임 간격(ms)

// 이 가구가 '작동' 가능한지 (상태가 2개 이상)
function usableStates(fd) {
    const anims = fd && fd.def.visualization.animations;
    if (!anims) return [];
    return Object.keys(anims).map(Number).sort((a, b) => a - b);
}
function isUsable(cn) {
    const fd = furniReady(cn);
    return fd ? usableStates(fd).length >= 2 : false;
}
// 새로 놓을 때의 기본 상태(대개 0=꺼짐)
function defaultState(fd) {
    const s = usableStates(fd);
    return s.includes(0) ? 0 : (s.length ? s[0] : 0);
}
// 특정 레이어가 현재 상태에서 보여줄 프레임 번호 (애니메이션이면 시간에 따라 순환)
function frameForLayer(fd, item, layerIdx) {
    const anims = fd.def.visualization.animations;
    if (!anims) return 0;
    const st = (item.state !== undefined) ? item.state : defaultState(fd);
    const sd = anims[st];
    const ld = sd && sd.layers && sd.layers[layerIdx];
    if (!ld || !ld.frames || ld.frames.length === 0) return 0;
    if (ld.frames.length === 1) return ld.frames[0];
    const idx = Math.floor(performance.now() / ANIM_MS) % ld.frames.length;
    return ld.frames[idx];
}

// 기본 색상(원본 색상표의 첫 번째)의 레이어별 색 정보
function furniDefaultColors(fd) {
    const colors = fd.def.visualization && fd.def.visualization.colors;
    if (!colors) return null;
    const first = Object.keys(colors).sort((a, b) => Number(a) - Number(b))[0];
    return first !== undefined && colors[first] ? (colors[first].layers || null) : null;
}

// 색칠(틴트)된 스프라이트 캔버스 (결과 캐시)
const tintCache = {};
function tintedFrame(fd, frameName, colorInt) {
    const key = `${fd.cn}|${frameName}|${colorInt}`;
    if (tintCache[key]) return tintCache[key];

    const fr = fd.frames[`${fd.cn}_${frameName}.png`].frame;
    const c = document.createElement('canvas');
    c.width = fr.w; c.height = fr.h;
    const cx = c.getContext('2d');
    cx.drawImage(fd.img, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    if (colorInt !== null && colorInt !== undefined) {
        cx.globalCompositeOperation = 'multiply';
        cx.fillStyle = '#' + colorInt.toString(16).padStart(6, '0');
        cx.fillRect(0, 0, fr.w, fr.h);
        cx.globalCompositeOperation = 'destination-in';
        cx.drawImage(fd.img, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    }
    tintCache[key] = c;
    return c;
}

// 가구 스프라이트 기준점: 오프셋 좌표계의 원점 = 타일 중심 (타일 위 꼭짓점 + 16px)
const FURNI_ANCHOR_DY = 16;

// 가구 레이어 한 장 그리기. layerKey: 'a'~'h'(레이어) 또는 'sd'(그림자)
function drawFurniLayer(item, fd, layerKey, isGhost) {
    const dir = rotToDir(item.rot);
    const layerIdx = (layerKey === 'sd') ? -1 : layerKey.charCodeAt(0) - 97;
    const frame = (layerIdx >= 0 && !isGhost) ? frameForLayer(fd, item, layerIdx) : 0;
    const res = furniAssetForDir(fd, layerKey, dir, frame);
    if (!res) return;

    const s = gridToScreen(item.x, item.y, item.z || 0); // 테이블 위 등 높이 반영
    const ax = s.x;
    const ay = s.y + FURNI_ANCHOR_DY;

    // 레이어 인덱스에 해당하는 정품 색상
    let colorInt = null;
    if (layerKey !== 'sd') {
        const layerIdx = layerKey.charCodeAt(0) - 97;
        const colorLayers = furniDefaultColors(fd);
        if (colorLayers && colorLayers[layerIdx] && colorLayers[layerIdx].color !== undefined) {
            colorInt = colorLayers[layerIdx].color;
        }
    }

    const sprite = tintedFrame(fd, res.frameName, colorInt);

    ctx.save();
    if (isGhost) ctx.globalAlpha = 0.5;
    if (layerKey === 'sd') ctx.globalAlpha = (isGhost ? 0.15 : 0.3); // 그림자는 반투명
    if (!isGhost && state.selectedPlacedItem && state.selectedPlacedItem.id === item.id && layerKey !== 'sd') {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
    }

    if (res.flipH) {
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, -(ax + res.x), ay - res.y);
    } else {
        ctx.drawImage(sprite, ax - res.x, ay - res.y);
    }
    ctx.restore();
}

// 배치 미리보기(유령)용: 그림자+전 레이어를 한 번에
function drawFurniGhost(item, fd) {
    drawFurniLayer(item, fd, 'sd', true);
    const lc = fd.def.visualization.layerCount || 1;
    for (let i = 0; i < lc; i++) {
        drawFurniLayer(item, fd, String.fromCharCode(97 + i), true);
    }
}

// ==== 상점 아이콘 로컬 렌더 ====
// habboassets 원격 아이콘 대신, 로컬 스프라이트시트에 든 정품 icon 프레임(_icon_a, _icon_b...)을
// 합성해 dataURL로 만든다. → 상점 로딩 지연 제거 + habboassets 의존 제거.
const iconCache = {}; // classname → dataURL

function furniIconDataURL(cn) {
    if (iconCache[cn]) return iconCache[cn];
    const fd = furniReady(cn);
    if (!fd) return null;

    // icon 레이어 수집 (a, b, c ... 순서 = 색칠 레이어 인덱스와 대응)
    const layers = [];
    for (let i = 0; i < 8; i++) {
        const res = resolveFurniAsset(fd, `${cn}_icon_${String.fromCharCode(97 + i)}`);
        if (res) layers.push({ res, idx: i });
    }
    if (layers.length === 0) return null;

    // 배치 범위 계산 (오프셋 기준점 0,0)
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const L of layers) {
        const fr = fd.frames[`${cn}_${L.res.frameName}.png`].frame;
        const left = L.res.flipH ? (L.res.x - fr.w) : -L.res.x;
        const top = -L.res.y;
        minX = Math.min(minX, left); maxX = Math.max(maxX, left + fr.w);
        minY = Math.min(minY, top);  maxY = Math.max(maxY, top + fr.h);
    }

    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(maxX - minX));
    c.height = Math.max(1, Math.ceil(maxY - minY));
    const cx = c.getContext('2d');
    const colorLayers = furniDefaultColors(fd);
    for (const L of layers) {
        let colorInt = null;
        if (colorLayers && colorLayers[L.idx] && colorLayers[L.idx].color !== undefined) {
            colorInt = colorLayers[L.idx].color;
        }
        const sprite = tintedFrame(fd, L.res.frameName, colorInt);
        const left = (L.res.flipH ? (L.res.x - sprite.width) : -L.res.x) - minX;
        const top = -L.res.y - minY;
        if (L.res.flipH) {
            cx.save(); cx.scale(-1, 1);
            cx.drawImage(sprite, -(left + sprite.width), top);
            cx.restore();
        } else {
            cx.drawImage(sprite, left, top);
        }
    }
    iconCache[cn] = c.toDataURL();
    return iconCache[cn];
}

// <img>에 로컬 아이콘 적용. 아직 로딩 전이면 로딩 완료 후 채워 넣음.
function setFurniIcon(img, cn) {
    const url = furniIconDataURL(cn);
    if (url) { img.src = url; return; }
    loadFurni(cn);
    const timer = setInterval(() => {
        const e = furniCache[cn];
        if (!e || e.status === 'loading') return;
        clearInterval(timer);
        const u = furniIconDataURL(cn);
        if (u) img.src = u;
        else { const m = getModel(cn); if (m && m.imgUrl) img.src = m.imgUrl; } // 최후 폴백: 원격 아이콘
    }, 120);
}

// ==== 벽지·바닥 (하보처럼 '방 속성'으로 구현 — 가구가 아님) ====
const WALL_THEMES = [
    { id: 0, name: "파랑 벽지",   hex: "#4a6582" },
    { id: 1, name: "초록 벽지",   hex: "#5d7a5a" },
    { id: 2, name: "분홍 벽지",   hex: "#a06a80" },
    { id: 3, name: "보라 벽지",   hex: "#6f5f8c" },
    { id: 4, name: "베이지 벽지", hex: "#9a8a6a" },
    { id: 5, name: "회색 벽지",   hex: "#6e7686" },
    { id: 6, name: "겨자 벽지",   hex: "#a89a50" },
    { id: 7, name: "민트 벽지",   hex: "#5f8c85" }
];
const FLOOR_THEMES = [
    { id: 0, name: "올리브 바닥", hex: "#9cb08a" },
    { id: 1, name: "원목 바닥",   hex: "#b99a6b" },
    { id: 2, name: "돌 바닥",     hex: "#a4a8ac" },
    { id: 3, name: "하늘 타일",   hex: "#8fb0c0" },
    { id: 4, name: "분홍 타일",   hex: "#c5a0ac" },
    { id: 5, name: "모래 바닥",   hex: "#c9b98a" },
    { id: 6, name: "민트 타일",   hex: "#96bfae" },
    { id: 7, name: "흰 타일",     hex: "#d8d8d0" }
];
const PAPER_ITEMS = [
    ...WALL_THEMES.map(t => ({ paper: 'wall', themeId: t.id, name: t.name, cost: 25, hex: t.hex, desc: "벽 색을 바꿔요. 사면 바로 발라져요!" })),
    ...FLOOR_THEMES.map(t => ({ paper: 'floor', themeId: t.id, name: t.name, cost: 25, hex: t.hex, desc: "바닥 색을 바꿔요. 사면 바로 깔려요!" }))
];

// 밝기 조절: f<1 어둡게, f>1 밝게 (흰색 쪽으로)
function shadeHex(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f <= 1) { r *= f; g *= f; b *= f; }
    else { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
    const c = v => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + ((c(r) << 16) | (c(g) << 8) | c(b)).toString(16).padStart(6, '0');
}

// 상점 카드용 색 견본 이미지
function paperSwatchURL(p) {
    const key = `paper|${p.paper}|${p.themeId}`;
    if (iconCache[key]) return iconCache[key];
    const c = document.createElement('canvas'); c.width = 40; c.height = 40;
    const cx = c.getContext('2d');
    if (p.paper === 'wall') {
        cx.fillStyle = p.hex; cx.fillRect(0, 0, 40, 40);
        cx.fillStyle = shadeHex(p.hex, 0.55); cx.fillRect(0, 32, 40, 8); // 걸레받이 느낌
    } else {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
            cx.fillStyle = (i + j) % 2 ? shadeHex(p.hex, 0.92) : p.hex;
            cx.fillRect(i * 10, j * 10, 10, 10);
        }
    }
    iconCache[key] = c.toDataURL();
    return iconCache[key];
}

// 현재 방의 벽/바닥 색 (state가 아직 없을 수 있어 함수로)
function currentWallHex()  { return (WALL_THEMES[state.wallTheme]  || WALL_THEMES[0]).hex; }
function currentFloorHex() { return (FLOOR_THEMES[state.floorTheme] || FLOOR_THEMES[0]).hex; }

// 4. 캔버스 설정과 등각투영 수학
const canvas = document.getElementById('room-canvas');
const ctx = canvas.getContext('2d');

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const HALF_WIDTH = TILE_WIDTH / 2;
const HALF_HEIGHT = TILE_HEIGHT / 2;
const Z_SCALE = 30;

let originX = 0;
let originY = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // 현재 방 모델의 바닥 범위를 기준으로 방을 화면 중앙에 배치
    const r = currentRoom;
    originX = canvas.width / 2 - ((r.isoXMin + r.isoXMax) / 2) * HALF_WIDTH;
    originY = canvas.height / 2 - ((r.isoYMin + r.isoYMax) / 2) * HALF_HEIGHT + 30;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 그리드 → 화면 (타일의 위쪽 꼭짓점 기준)
function gridToScreen(x, y, z = 0) {
    return {
        x: originX + (x - y) * HALF_WIDTH,
        y: originY + (x + y) * HALF_HEIGHT - z * Z_SCALE
    };
}

// 화면 → 그리드 (타일 '중심' 기준으로 역변환해 반 칸 밀림 방지)
function screenToGrid(screenX, screenY) {
    const dx = screenX - originX;
    const dy = screenY - originY - HALF_HEIGHT;
    return {
        x: Math.round((dx / HALF_WIDTH + dy / HALF_HEIGHT) / 2),
        y: Math.round((dy / HALF_HEIGHT - dx / HALF_WIDTH) / 2)
    };
}

// 5. 충돌 검사와 A* 길찾기

// 가구가 차지하는 칸 크기 [가로,세로].
// 하보 원본 dimensions(x,y)는 '방향 0(북)' 기준인데, 우리 rot0 스프라이트는 방향 2(90도)로
// 그림 → rot 0·2에서 가로세로를 교환해야 그림과 막는 칸이 일치한다. (rot 1·3은 원본 그대로)
function itemDims(item) {
    const d = FURNI_DIMS[item.classname];
    const dx = d ? d[0] : 1;
    const dy = d ? d[1] : 1;
    return (item.rot === 1 || item.rot === 3) ? [dx, dy] : [dy, dx];
}

// 가구 높이 z (앉기·쌓기용). FURNI_DIMS 우선.
function furniHeightZ(classname) {
    const d = FURNI_DIMS[classname];
    if (d) return d[2];
    const fd = furniReady(classname);
    return (fd && fd.def.dimensions) ? (fd.def.dimensions.z || 0) : 0;
}

// 가구가 실제로 덮는 모든 칸 (원점에서 +x,+y 방향으로 확장)
function footprintTiles(item) {
    const [w, h] = itemDims(item);
    const tiles = [];
    for (let i = 0; i < w; i++)
        for (let j = 0; j < h; j++)
            tiles.push({ x: item.x + i, y: item.y + j });
    return tiles;
}

function footprintCovers(item, x, y) {
    const [w, h] = itemDims(item);
    return x >= item.x && x < item.x + w && y >= item.y && y < item.y + h;
}

// 이 칸을 덮는 가구 (여러 개면 나중에 놓인=위에 있는 것)
function itemAt(x, y) {
    for (let i = state.placedItems.length - 1; i >= 0; i--) {
        if (footprintCovers(state.placedItems[i], x, y)) return state.placedItems[i];
    }
    return null;
}

// 바닥이 없거나(void) 걸을 수 없는 가구가 덮고 있으면 true
function isBlocked(x, y) {
    if (!isFloorTile(x, y)) return true;
    for (const item of state.placedItems) {
        const model = getModel(item.classname);
        if (model && model.walkable) continue;   // 러그는 통과 가능
        if (footprintCovers(item, x, y)) return true;
    }
    return false;
}

// 가구의 윗면 높이 (z). 스택 계산용.
function itemTopZ(item) {
    return (item.z || 0) + furniHeightZ(item.classname);
}

// 그리기 순서 기준점(깊이). 다칸 가구는 '뷰어에 가장 가까운 코너'(footprint 합 최대 칸) 기준 —
// 원점(합 최소) 기준이면 옆 칸에 선 아바타가 가구 위에 덧칠되는 문제가 생긴다.
// 러그(walkable)는 바닥에 깔린 것이라 원점 기준으로 항상 먼저(뒤에) 그림.
// 테이블 위에 쌓인 물건은 받침 가구보다 항상 앞에 오도록 보정.
function furniDepthBase(item) {
    const model = getModel(item.classname);
    const [w, h] = itemDims(item);
    if (model && model.walkable) return item.x + item.y;
    let base = (item.x + w - 1) + (item.y + h - 1);
    if ((item.z || 0) > 0) {
        for (const s of state.placedItems) {
            if (s.id === item.id) continue;
            const sm = getModel(s.classname);
            if (sm && sm.canStandOn && footprintCovers(s, item.x, item.y)) {
                base = Math.max(base, furniDepthBase(s) + 0.05);
            }
        }
    }
    return base;
}

// (x,y) 칸에 새 물건을 올릴 때의 바닥 높이. 못 올리면 -1.
// 러그(walkable)=높이0 위 허용, 테이블(canStandOn)=그 윗면 높이 위 허용, 그 외 가구=막힘.
function surfaceHeightAt(x, y, ignoreId) {
    let z = 0, blocked = false;
    for (const it of state.placedItems) {
        if (ignoreId !== undefined && it.id === ignoreId) continue;
        if (!footprintCovers(it, x, y)) continue;
        const m = getModel(it.classname);
        if (m && m.walkable) continue;                 // 러그: 바닥 높이 유지
        if (m && m.canStandOn) z = Math.max(z, itemTopZ(it)); // 테이블: 윗면 위에
        else blocked = true;                            // 못 올리는 가구
    }
    return blocked ? -1 : z;
}

// (x,y)에 이 가구를 놓을 수 있으면 배치 높이 z를 반환, 못 놓으면 null.
// footprint 전체가 바닥·문 아님이고, 모든 칸이 같은 높이여야 함(테이블 위에 걸침 방지).
function canPlace(classname, x, y, rot, ignoreId) {
    const tiles = footprintTiles({ classname, x, y, rot });
    let placeZ = null;
    for (const t of tiles) {
        if (!isFloorTile(t.x, t.y) || isDoorTile(t.x, t.y)) return null;
        const h = surfaceHeightAt(t.x, t.y, ignoreId);
        if (h < 0) return null;                 // 못 올리는 가구가 있음
        if (placeZ === null) placeZ = h;
        else if (placeZ !== h) return null;     // 칸마다 높이가 다르면(반은 테이블, 반은 바닥) 불가
    }
    return placeZ;
}

// allowEndBlocked: 도착 칸(의자 등)은 막혀 있어도 허용
function findPath(startX, startY, endX, endY, allowEndBlocked = false) {
    if (!isFloorTile(endX, endY)) return [];
    if (isBlocked(endX, endY) && !allowEndBlocked) return [];
    if (startX === endX && startY === endY) return [];

    const blockedAtEndOk = (x, y) => (x === endX && y === endY) ? false : isBlocked(x, y);
    const blocked = allowEndBlocked ? blockedAtEndOk : isBlocked;

    let openList = [];
    let closedList = new Set();

    const startNode = { x: startX, y: startY, g: 0, h: heuristic(startX, startY, endX, endY), parent: null };
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);

    while (openList.length > 0) {
        openList.sort((a, b) => a.f - b.f);
        let curr = openList.shift();

        if (curr.x === endX && curr.y === endY) {
            let path = [];
            let temp = curr;
            while (temp.parent) {
                path.push({ x: temp.x, y: temp.y });
                temp = temp.parent;
            }
            return path.reverse();
        }

        closedList.add(`${curr.x},${curr.y}`);

        const neighbors = [
            { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
            { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 },
            { x: curr.x + 1, y: curr.y + 1 }, { x: curr.x - 1, y: curr.y - 1 },
            { x: curr.x + 1, y: curr.y - 1 }, { x: curr.x - 1, y: curr.y + 1 }
        ];

        for (let n of neighbors) {
            if (!isFloorTile(n.x, n.y)) continue;
            if (closedList.has(`${n.x},${n.y}`)) continue;
            if (blocked(n.x, n.y)) continue;

            // 대각선 이동 시 모서리 끼임 방지
            if (n.x !== curr.x && n.y !== curr.y) {
                if (blocked(n.x, curr.y) || blocked(curr.x, n.y)) continue;
            }

            const gScore = curr.g + (n.x !== curr.x && n.y !== curr.y ? 1.4 : 1);
            const existing = openList.find(o => o.x === n.x && o.y === n.y);

            if (!existing) {
                const newNode = { x: n.x, y: n.y, g: gScore, h: heuristic(n.x, n.y, endX, endY), parent: curr };
                newNode.f = newNode.g + newNode.h;
                openList.push(newNode);
            } else if (gScore < existing.g) {
                existing.g = gScore;
                existing.f = existing.g + existing.h;
                existing.parent = curr;
            }
        }
    }
    return [];
}

function heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// 가구 회전값(0~3) → 하보 아바타 방향(0~7)
function rotToDir(rot, pose) {
    if (pose === 'lay') return [2, 4, 2, 4][rot % 4]; // 눕기는 2/4 방향만 지원
    return [2, 4, 6, 0][rot % 4];
}

// 앉는 높이(z-단위): 원본 가구 데이터가 있으면 그 좌석 높이를, 없으면 model.sitHeight 사용.
// 하보 규칙상 좌석 표면은 가구 z의 절반(등받이가 z까지, 좌석은 그 중간).
function seatZ(classname) {
    const h = furniHeightZ(classname);
    if (h > 0) return h * 0.5;
    const model = getModel(classname);
    return (model && model.sitHeight) || 0.45;
}

// 서쪽 벽 한 조각(면+걸레받이+상단 캡)을 그림. 배경 벽 루프와 문 앞 조각(렌더 큐) 양쪽에서 사용.
function drawWestWallSegment(x, y) {
    const WALL_HEIGHT = 120;
    const WALL_DEPTH = 6;
    const p1 = gridToScreen(x, y, 0);       // N(x,y)
    const p2 = gridToScreen(x, y + 1, 0);   // N(x,y+1)

    // 벽면
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p2.x, p2.y - WALL_HEIGHT); ctx.lineTo(p1.x, p1.y - WALL_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = currentWallHex();
    ctx.fill();

    // 걸레받이
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p2.x, p2.y - 12); ctx.lineTo(p1.x, p1.y - 12);
    ctx.closePath();
    ctx.fillStyle = shadeHex(currentWallHex(), 0.55);
    ctx.fill();

    // 벽 상단 두께 캡
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y - WALL_HEIGHT); ctx.lineTo(p2.x, p2.y - WALL_HEIGHT);
    ctx.lineTo(p2.x - WALL_DEPTH, p2.y - WALL_HEIGHT - WALL_DEPTH / 2);
    ctx.lineTo(p1.x - WALL_DEPTH, p1.y - WALL_HEIGHT - WALL_DEPTH / 2);
    ctx.closePath();
    ctx.fillStyle = shadeHex(currentWallHex(), 1.28);
    ctx.fill();
}

// 6. 렌더링 루프
function drawRoom() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false; // 레트로 픽셀 유지

    // (1) 바닥 타일 — heightmap의 바닥('0')과 문 타일만 그림
    const room = currentRoom;
    for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
            if (!room.floor[y][x]) continue;
            const screen = gridToScreen(x, y, 0);
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y);
            ctx.lineTo(screen.x + HALF_WIDTH, screen.y + HALF_HEIGHT);
            ctx.lineTo(screen.x, screen.y + TILE_HEIGHT);
            ctx.lineTo(screen.x - HALF_WIDTH, screen.y + HALF_HEIGHT);
            ctx.closePath();
            ctx.fillStyle = (x + y) % 2 === 0 ? currentFloorHex() : shadeHex(currentFloorHex(), 0.94);
            ctx.fill();
            ctx.strokeStyle = shadeHex(currentFloorHex(), 0.8);
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    // (1-1) 바닥 단상 옆면 — 바닥의 남동/남서쪽 가장자리마다 두께를 그림
    const PLATFORM_HEIGHT = 8;
    ctx.lineWidth = 1;
    ctx.strokeStyle = shadeHex(currentFloorHex(), 0.5);
    for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
            if (!room.floor[y][x]) continue;
            const s = gridToScreen(x, y, 0);
            const N = { x: s.x, y: s.y };
            const E = { x: s.x + HALF_WIDTH, y: s.y + HALF_HEIGHT };
            const S = { x: s.x, y: s.y + TILE_HEIGHT };
            const W = { x: s.x - HALF_WIDTH, y: s.y + HALF_HEIGHT };

            // 남동쪽(오른쪽 아래)에 바닥 없음 → 옆면
            if (!isFloorTile(x + 1, y)) {
                ctx.beginPath();
                ctx.moveTo(E.x, E.y); ctx.lineTo(S.x, S.y);
                ctx.lineTo(S.x, S.y + PLATFORM_HEIGHT); ctx.lineTo(E.x, E.y + PLATFORM_HEIGHT);
                ctx.closePath();
                ctx.fillStyle = shadeHex(currentFloorHex(), 0.7);
                ctx.fill(); ctx.stroke();
            }
            // 남서쪽(왼쪽 아래)에 바닥 없음 → 옆면 (더 어두운 그림자 톤)
            if (!isFloorTile(x, y + 1)) {
                ctx.beginPath();
                ctx.moveTo(W.x, W.y); ctx.lineTo(S.x, S.y);
                ctx.lineTo(S.x, S.y + PLATFORM_HEIGHT); ctx.lineTo(W.x, W.y + PLATFORM_HEIGHT);
                ctx.closePath();
                ctx.fillStyle = shadeHex(currentFloorHex(), 0.58);
                ctx.fill(); ctx.stroke();
            }
        }
    }

    // (1-2) 벽면 — Habbo 방식: 각 행의 첫 바닥 타일 서쪽에, 각 열의 첫 바닥 타일 북쪽에 벽.
    // 방 모양이 계단식이면 벽도 따라 꺾임 (model_b, model_f 등)
    const WALL_HEIGHT = 120;
    const WALL_DEPTH = 6;
    const DOOR_HEIGHT = 90;

    // 서쪽(왼쪽) 벽: 벽 한 조각은 타일 (x,y)의 북서쪽 모서리 N(x,y)→N(x,y+1) 위에 세움
    for (let y = 0; y < room.h; y++) {
        const mx = room.rowMinX[y];
        if (mx === undefined) continue;

        if (y === room.door.y) {
            // 문이 있는 행: 벽 대신 문 타일 서쪽에 어두운 입구 통로를 그림
            const d1 = gridToScreen(room.door.x, y, 0);
            const d2 = gridToScreen(room.door.x, y + 1, 0);
            ctx.beginPath();
            ctx.moveTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y);
            ctx.lineTo(d2.x, d2.y - DOOR_HEIGHT); ctx.lineTo(d1.x, d1.y - DOOR_HEIGHT);
            ctx.closePath();
            ctx.fillStyle = '#090e1a';
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(d1.x, d1.y); ctx.lineTo(d1.x, d1.y - DOOR_HEIGHT);
            ctx.lineTo(d2.x, d2.y - DOOR_HEIGHT); ctx.lineTo(d2.x, d2.y);
            ctx.stroke();
            continue;
        }

        // 문 바로 남쪽 벽 조각은 배경이 아니라 렌더 큐에서 그림 —
        // 문 타일에 선 아바타를 가려 '문 안에 들어가 있는' 하보식 모습을 만들기 위해
        if (y === room.door.y + 1) continue;

        drawWestWallSegment(mx, y);
    }

    // 북쪽(오른쪽 위) 벽: 타일 (x,y)의 북동쪽 모서리 N(x,y)→N(x+1,y) 위에 세움
    for (let x = 0; x < room.w; x++) {
        const my = room.colMinY[x];
        if (my === undefined) continue;

        const p1 = gridToScreen(x, my, 0);
        const p2 = gridToScreen(x + 1, my, 0);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x, p2.y - WALL_HEIGHT); ctx.lineTo(p1.x, p1.y - WALL_HEIGHT);
        ctx.closePath();
        ctx.fillStyle = shadeHex(currentWallHex(), 0.82);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x, p2.y - 12); ctx.lineTo(p1.x, p1.y - 12);
        ctx.closePath();
        ctx.fillStyle = shadeHex(currentWallHex(), 0.45);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y - WALL_HEIGHT); ctx.lineTo(p2.x, p2.y - WALL_HEIGHT);
        ctx.lineTo(p2.x + WALL_DEPTH, p2.y - WALL_HEIGHT - WALL_DEPTH / 2);
        ctx.lineTo(p1.x + WALL_DEPTH, p1.y - WALL_HEIGHT - WALL_DEPTH / 2);
        ctx.closePath();
        ctx.fillStyle = shadeHex(currentWallHex(), 1.12);
        ctx.fill();
    }

    // (2) 렌더 큐 구성 (가구 + 아바타를 깊이 순으로)
    let renderQueue = [];

    // 문 바로 남쪽 벽 조각: 문 타일의 아바타(합 door.x+door.y+0.2)보다 앞, 방 안쪽
    // 타일의 아바타(합 wx+wy+0.2)보다는 뒤가 되도록 wx+wy+0.05 깊이로 큐에 넣음
    {
        const wy = room.door.y + 1;
        const wx = room.rowMinX[wy];
        if (wx !== undefined) {
            renderQueue.push({ type: 'doorwall', depth: wx + wy + 0.05, wx, wy });
        }
    }

    for (let item of state.placedItems) {
        const model = getModel(item.classname);
        const fd = furniReady(item.classname);

        if (fd) {
            const depthBase = furniDepthBase(item); // 다칸 가구는 뷰어에 가까운 코너 기준
            // 원본 스프라이트: 그림자 먼저, 그다음 레이어들.
            renderQueue.push({ type: 'flayer', depth: depthBase + 0.02, item, fd, layer: 'sd' });

            // 레이어 z값은 '가구 내부의 앞뒤 순서'용이지 아바타보다 앞에 두라는 뜻이 아님
            // (club_sofa는 z=1000·1500처럼 큰 값 사용). z 오름차순으로 정렬해 가구끼리만
            // 앞뒤를 맞추고, 전체는 base+0.1(=앉은 아바타 +0.2보다 뒤)에 배치한다.
            const dir = rotToDir(item.rot);
            const viz = fd.def.visualization;
            const lc = viz.layerCount || 1;
            const dirLayers = viz.directions && viz.directions[dir] && viz.directions[dir].layers;
            const layers = [];
            for (let i = 0; i < lc; i++) {
                const zOff = (dirLayers && dirLayers[i] && dirLayers[i].z !== undefined) ? dirLayers[i].z
                           : (viz.layers && viz.layers[i] && viz.layers[i].z !== undefined) ? viz.layers[i].z
                           : 0;
                layers.push({ i, zOff });
            }
            layers.sort((a, b) => (a.zOff - b.zOff) || (a.i - b.i));
            layers.forEach((L, rank) => {
                renderQueue.push({
                    type: 'flayer',
                    depth: depthBase + 0.1 + rank * 0.002,
                    item, fd, layer: String.fromCharCode(97 + L.i)
                });
            });
        } else {
            // 아직 로딩 중이거나 원본 데이터가 없는 가구(roomdimmer)는 기존 아이콘 방식
            renderQueue.push({
                type: 'furniture',
                depth: item.x + item.y + 0.1,
                item, model
            });
        }
    }

    // (3) 배치 모드 가이드 — 가구 footprint 전체를 초록(가능)/빨강(불가)으로 표시
    if ((state.mode === 'placing' || state.mode === 'moving') && state.placementItem) {
        const x = state.placementX;
        const y = state.placementY;
        const cn = state.placementItem.classname;
        const placeZ = canPlace(cn, x, y, state.placementRot);
        const ok = placeZ !== null;

        for (const t of footprintTiles({ classname: cn, x, y, rot: state.placementRot })) {
            if (!isFloorTile(t.x, t.y)) continue;
            const screen = gridToScreen(t.x, t.y, 0);
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y);
            ctx.lineTo(screen.x + HALF_WIDTH, screen.y + HALF_HEIGHT);
            ctx.lineTo(screen.x, screen.y + TILE_HEIGHT);
            ctx.lineTo(screen.x - HALF_WIDTH, screen.y + HALF_HEIGHT);
            ctx.closePath();
            ctx.fillStyle = ok ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
            ctx.fill();
            ctx.strokeStyle = ok ? '#10b981' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (isFloorTile(x, y)) {
            const ghostItem = { classname: cn, x, y, rot: state.placementRot, z: placeZ || 0 };
            const [gw, gh] = itemDims(ghostItem);
            renderQueue.push({
                type: 'ghost',
                depth: (x + gw - 1) + (y + gh - 1) + 0.26, // 유령은 항상 맨 위에
                item: ghostItem,
                model: state.placementItem
            });
        }
    }

    // (4) 아바타 위치 보간
    const avatar = state.avatar;
    let ax = avatar.x, ay = avatar.y, az = avatar.z;

    if (avatar.path.length > 0) {
        const next = avatar.path[0];
        const nextZ = tileHeight(next.x, next.y);
        ax = avatar.x + (next.x - avatar.x) * avatar.stepTimer;
        ay = avatar.y + (next.y - avatar.y) * avatar.stepTimer;
        az = avatar.z + (nextZ - avatar.z) * avatar.stepTimer;
    }

    // 앉아 있을 땐 그 좌석 가구 기준 깊이 + ε — 다칸 소파에서도 아바타가 좌석 위에 그려지게
    let avatarDepth = ax + ay + 0.2;
    if (avatar.sitting) {
        const seat = state.placedItems.find(i => i.id === avatar.sitting.itemId);
        if (seat) avatarDepth = furniDepthBase(seat) + 0.15;
    }
    renderQueue.push({ type: 'avatar', depth: avatarDepth, ax, ay, az });

    // (5) 깊이 정렬 후 그리기
    renderQueue.sort((a, b) => a.depth - b.depth);

    for (let el of renderQueue) {
        if (el.type === 'doorwall') drawWestWallSegment(el.wx, el.wy);
        else if (el.type === 'flayer') drawFurniLayer(el.item, el.fd, el.layer, false);
        else if (el.type === 'furniture') drawFurniture(el.item, el.model, false);
        else if (el.type === 'ghost') {
            const gfd = furniReady(el.model.classname);
            if (gfd) drawFurniGhost(el.item, gfd);
            else drawFurniture(el.item, el.model, true);
        }
        else drawAvatar(el.ax, el.ay, el.az);
    }

    requestAnimationFrame(drawRoom);
}

// 해당 칸을 밟았을 때의 높이 (러그 위 등)
function tileHeight(x, y) {
    const item = itemAt(x, y);
    if (!item) return 0;
    const model = getModel(item.classname);
    return (model && model.walkable) ? 0.02 : 0;
}

function drawFurniture(item, model, isGhost) {
    if (!model) return;
    const screen = gridToScreen(item.x, item.y, 0);

    if (!isGhost) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y + HALF_HEIGHT, 22, 11, 0, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();
        ctx.restore();
    }

    const img = getCachedImage(model.imgUrl);
    if (!img.complete || img.naturalWidth === 0) return;

    ctx.save();
    if (isGhost) ctx.globalAlpha = 0.5;

    if (!isGhost && state.selectedPlacedItem && state.selectedPlacedItem.id === item.id) {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
    }

    // 회전 1·3번 방향은 좌우 반전으로 표현 (아이콘 스프라이트 한계)
    const shouldFlip = item.rot === 1 || item.rot === 3;
    const offsetY = model.offsetY || 0;

    ctx.translate(screen.x, screen.y + HALF_HEIGHT + offsetY);
    if (shouldFlip) ctx.scale(-1, 1);

    // 아이콘(14~30px)을 '한 변 52*scale 크기의 박스'에 비율 유지로 맞춰 확대
    const box = 52 * (model.scale || 1.2);
    const m = box / Math.max(img.naturalWidth, img.naturalHeight);
    const w = img.naturalWidth * m;
    const h = img.naturalHeight * m;

    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
}

function drawAvatar(x, y, z) {
    const avatar = state.avatar;
    const screen = gridToScreen(x, y, z);

    // 발밑 그림자
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(screen.x, screen.y + HALF_HEIGHT + z * Z_SCALE, 14, 7, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();
    ctx.restore();

    let action = 'std';
    let dir = avatar.dir;
    if (avatar.sitting) {
        action = avatar.sitting.pose; // 'sit' | 'lay'
        dir = avatar.sitting.dir;
    } else if (avatar.isWalking) {
        action = 'wlk';
    }

    // 이 이미저에는 '오른쪽 비스듬 뒷모습(하보 방향 0)' 그림이 없다 (0번은 여분의 앞모습).
    // → 방향 0은 '왼쪽 비스듬 뒷모습(6번)'을 좌우반전해서 그린다. 진짜 하보와 같은 각도가 됨.
    let drawDir = dir, flip = false;
    if (dir === 0) { drawDir = 6; flip = true; }

    const url = imagerUrl(`figure=${avatar.figure}&size=m&direction=${drawDir}&head_direction=${drawDir}&action=${action}`);
    const img = getCachedImage(url);
    // 이메이저 sit 스프라이트는 앉은 엉덩이 접촉점(픽셀행 ~85)이 서 있는 발 접촉점(행 ~106)보다
    // 21px 위에 있음. sit일 때만 그 차이(SIT_SPRITE_DY)만큼 내려 그려 엉덩이를 좌석면에 얹는다.
    const poseDY = (action === 'sit') ? SIT_SPRITE_DY : 0;

    let drawImg = img, drawDY = poseDY;
    if (!(img.complete && img.naturalWidth > 0)) {
        // 목표 스프라이트가 아직 로딩 안 됐으면 같은 방향 '서기'로 대체, 그것도 없으면 직전 정상 스프라이트.
        // → 로딩되는 0.5초 동안 아바타가 사라지는 문제 방지.
        const stdImg = getCachedImage(imagerUrl(`figure=${avatar.figure}&size=m&direction=${drawDir}&head_direction=${drawDir}&action=std`));
        if (stdImg.complete && stdImg.naturalWidth > 0) { drawImg = stdImg; drawDY = 0; }
        else if (avatar._lastImg) { drawImg = avatar._lastImg; drawDY = avatar._lastDY; flip = avatar._lastFlip; }
        else return; // 그릴 게 아무것도 없으면 이번 프레임만 건너뜀
    }

    if (flip) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(drawImg, -(screen.x + 32), screen.y - 85 + drawDY, 64, 110);
        ctx.restore();
    } else {
        ctx.drawImage(drawImg, screen.x - 32, screen.y - 85 + drawDY, 64, 110);
    }
    if (drawImg === img) { avatar._lastImg = img; avatar._lastDY = poseDY; avatar._lastFlip = flip; } // 정상 프레임만 기억
}
const SIT_SPRITE_DY = 21; // 측정값: 서있는 발행(106) - 앉은 엉덩이행(85)

// 7. 아바타 이동 갱신 (시간 기반 — 타이머가 느려져도 속도 일정)
const MS_PER_TILE = 500; // Habbo 표준 이동 속도: 타일당 500ms (초당 2타일)
let lastTick = performance.now();

function updateAvatar() {
    const now = performance.now();
    const dt = Math.min(now - lastTick, 200); // 탭 전환 등으로 오래 멈췄을 땐 점프 방지
    lastTick = now;

    const avatar = state.avatar;
    if (avatar.path.length > 0) {
        avatar.isWalking = true;
        avatar.sitting = null;

        avatar.stepTimer += dt / MS_PER_TILE;
        if (avatar.stepTimer >= 1.0) {
            const next = avatar.path.shift();
            avatar.x = next.x;
            avatar.y = next.y;
            avatar.z = tileHeight(next.x, next.y);
            avatar.stepTimer -= 1.0; // 남은 시간을 다음 타일로 이월해 속도 일정 유지
            if (avatar.path.length === 0) avatar.stepTimer = 0;

            // 목적지 도착 → 예약된 앉기/눕기 실행
            if (avatar.path.length === 0 && avatar.pendingPose) {
                const item = state.placedItems.find(i => i.id === avatar.pendingPose.itemId);
                if (item && item.x === avatar.x && item.y === avatar.y) {
                    avatar.sitting = {
                        itemId: item.id,
                        pose: avatar.pendingPose.pose,
                        dir: rotToDir(item.rot, avatar.pendingPose.pose),
                        z: seatZ(item.classname)
                    };
                    avatar.z = avatar.sitting.z;
                }
                avatar.pendingPose = null;
            }
        } else {
            const next = avatar.path[0];
            if (next) {
                const dx = next.x - avatar.x;
                const dy = next.y - avatar.y;
                // 이동 방향 → 하보 방향번호. 방향 0(위-오른쪽 뒷모습)은 이미저에 그림이 없어
                // drawAvatar가 6번을 좌우반전해 그림 — 여기서는 의미 그대로 0을 지정.
                if (dx > 0 && dy === 0) avatar.dir = 2;       // 아래-오른쪽 (앞, 다가옴)
                else if (dx < 0 && dy === 0) avatar.dir = 6;  // 위-왼쪽 (비스듬 뒷모습)
                else if (dx === 0 && dy > 0) avatar.dir = 4;  // 아래-왼쪽 (앞, 다가옴)
                else if (dx === 0 && dy < 0) avatar.dir = 0;  // 위-오른쪽 (비스듬 뒷모습, 반전 렌더)
                else if (dx > 0 && dy > 0) avatar.dir = 3;    // 바로 아래 (정면)
                else if (dx < 0 && dy < 0) avatar.dir = 7;    // 바로 위 (정후면)
                else if (dx > 0 && dy < 0) avatar.dir = 1;    // 바로 오른쪽 (오른쪽 옆모습)
                else if (dx < 0 && dy > 0) avatar.dir = 5;    // 바로 왼쪽 (왼쪽 옆모습)
            }
        }
    } else {
        avatar.isWalking = false;
        avatar.stepTimer = 0;
    }
}
setInterval(updateAvatar, 20);

// 아바타를 특정 가구로 걸어가 앉거나 눕게 하기
function walkAndPose(item, pose) {
    const avatar = state.avatar;
    avatar.pendingPose = null;

    if (avatar.x === item.x && avatar.y === item.y) {
        // 이미 그 칸 위에 있으면 즉시 자세 변경
        avatar.sitting = {
            itemId: item.id,
            pose,
            dir: rotToDir(item.rot, pose),
            z: seatZ(item.classname)
        };
        avatar.z = avatar.sitting.z;
        return;
    }

    const path = findPath(avatar.x, avatar.y, item.x, item.y, true);
    if (path.length > 0) {
        avatar.path = path;
        avatar.pendingPose = { itemId: item.id, pose };
    }
}

// 8. 클릭/키보드 입력
// Habbo 방식: 목적지가 막혀 있으면 갈 수 있는 가장 가까운 이웃 타일까지 걸어감
function walkToward(tx, ty) {
    const a = state.avatar;
    let path = findPath(a.x, a.y, tx, ty);

    if (path.length === 0) {
        const neighbors = [
            { x: tx + 1, y: ty }, { x: tx - 1, y: ty }, { x: tx, y: ty + 1 }, { x: tx, y: ty - 1 },
            { x: tx + 1, y: ty + 1 }, { x: tx - 1, y: ty - 1 }, { x: tx + 1, y: ty - 1 }, { x: tx - 1, y: ty + 1 }
        ];
        let best = null;
        for (const n of neighbors) {
            if (n.x === a.x && n.y === a.y) { best = []; break; } // 이미 바로 옆에 있음
            const p = findPath(a.x, a.y, n.x, n.y);
            if (p.length > 0 && (best === null || p.length < best.length)) best = p;
        }
        path = best || [];
    }

    if (path.length > 0) {
        a.pendingPose = null;
        a.path = path;
    }
}

canvas.addEventListener('click', function (e) {
    const grid = screenToGrid(e.clientX, e.clientY);
    if (grid.x < 0 || grid.x >= currentRoom.w || grid.y < 0 || grid.y >= currentRoom.h) return;

    if (state.mode === 'normal') {
        const clickedItem = itemAt(grid.x, grid.y);

        if (clickedItem) {
            selectPlacedItem(clickedItem);
        } else if (isFloorTile(grid.x, grid.y)) {
            closeFurnitureControlPanel();
            walkToward(grid.x, grid.y);
        }
        return;
    }

    // 배치/이동 모드
    if (state.mode === 'placing' || state.mode === 'moving') {
        // 이 가구의 footprint 전체가 놓일 수 있어야 함. 반환값 = 배치 높이 z (테이블 위면 그 높이)
        const cn = state.placementItem.classname;
        const placeZ = canPlace(cn, grid.x, grid.y, state.placementRot);
        if (placeZ === null) return;

        if (state.mode === 'placing') {
            // 가방에서 꺼내 배치 (결제는 구매할 때 이미 끝남 — 여기서 차감하지 않음)
            const idx = state.inventory.indexOf(state.placementItem.classname);
            if (idx !== -1) state.inventory.splice(idx, 1);

            const newItem = {
                id: Date.now(),
                classname: state.placementItem.classname,
                x: grid.x, y: grid.y, z: placeZ,
                rot: state.placementRot
            };
            const nfd = furniReady(newItem.classname);
            if (nfd && usableStates(nfd).length >= 2) newItem.state = defaultState(nfd); // 가전은 꺼진 상태로 시작
            state.placedItems.push(newItem);
        } else {
            // 기존 가구 이동 완료
            const original = state.placementSource.original;
            state.placedItems.push({
                ...original,
                x: grid.x, y: grid.y, z: placeZ,
                rot: state.placementRot
            });
        }

        finishPlacement();
        saveGame();
        updateUI();
    }
});

canvas.addEventListener('mousemove', function (e) {
    if (state.mode === 'placing' || state.mode === 'moving') {
        const grid = screenToGrid(e.clientX, e.clientY);
        state.placementX = grid.x;
        state.placementY = grid.y;
    }
});

window.addEventListener('keydown', function (e) {
    if (e.target && e.target.tagName === 'INPUT') return; // 글자 입력 중에는 단축키 무시

    if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') {
        if (state.mode === 'placing' || state.mode === 'moving') {
            state.placementRot = (state.placementRot + 1) % 4;
        } else if (state.selectedPlacedItem) {
            rotateSelectedFurniture();
        }
    }
    if (e.key === 'Escape') {
        cancelPlacement();
    }
});

// 9. 배치 모드 관리
const tooltip = document.getElementById('placement-helper-tooltip');

function enterPlacementMode(model, source) {
    state.mode = source.type === 'move' ? 'moving' : 'placing';
    state.placementItem = model;
    state.placementSource = source;
    state.placementRot = source.type === 'move' ? source.original.rot : 0;
    closeFurnitureControlPanel();
    tooltip.classList.remove('hidden');
}

// 배치 확정 후 정리
function finishPlacement() {
    state.mode = 'normal';
    state.placementItem = null;
    state.placementSource = null;
    tooltip.classList.add('hidden');
}

// Esc 취소: 이동 중이던 가구는 원래 자리로 복원
function cancelPlacement() {
    if (state.mode === 'moving' && state.placementSource && state.placementSource.original) {
        state.placedItems.push(state.placementSource.original);
    }
    // placing 취소 시 가구는 가방에 그대로 남아 있음 (배치 확정 때만 차감)
    finishPlacement();
    closeFurnitureControlPanel();
    updateUI();
}

// 10. 가구 선택 패널
const controlPanel = document.getElementById('furniture-control-panel');
const sitBtn = document.getElementById('action-sit');
const layBtn = document.getElementById('action-lay');
const useBtn = document.getElementById('action-use');

function selectPlacedItem(item) {
    state.selectedPlacedItem = item;
    const model = getModel(item.classname);
    if (!model) return;

    document.getElementById('selected-furni-name').innerText = model.name;
    document.getElementById('selected-furni-desc').innerText = model.desc;
    setFurniIcon(document.getElementById('selected-furni-preview'), item.classname);

    sitBtn.classList.toggle('hidden', !model.canSit);
    layBtn.classList.toggle('hidden', !model.canLay);
    useBtn.classList.toggle('hidden', !isUsable(item.classname)); // 작동 가능한 가전만

    controlPanel.classList.remove('hidden');
}

// 작동하기: 다음 상태로 전환 (꺼짐↔켜짐, 주사위 눈금 등)
useBtn.addEventListener('click', () => {
    const sel = state.selectedPlacedItem;
    if (!sel) return;
    const item = state.placedItems.find(i => i.id === sel.id);
    const fd = furniReady(item.classname);
    if (!item || !fd) return;
    const states = usableStates(fd);
    const cur = (item.state !== undefined) ? item.state : defaultState(fd);
    const idx = states.indexOf(cur);
    item.state = states[(idx + 1) % states.length];
    saveGame();
});

function closeFurnitureControlPanel() {
    state.selectedPlacedItem = null;
    controlPanel.classList.add('hidden');
}
document.getElementById('close-panel-btn').addEventListener('click', closeFurnitureControlPanel);

sitBtn.addEventListener('click', () => {
    if (!state.selectedPlacedItem) return;
    walkAndPose(state.selectedPlacedItem, 'sit');
    closeFurnitureControlPanel();
});

layBtn.addEventListener('click', () => {
    if (!state.selectedPlacedItem) return;
    walkAndPose(state.selectedPlacedItem, 'lay');
    closeFurnitureControlPanel();
});

document.getElementById('action-rotate').addEventListener('click', rotateSelectedFurniture);

function rotateSelectedFurniture() {
    if (!state.selectedPlacedItem) return;
    const item = state.placedItems.find(i => i.id === state.selectedPlacedItem.id);
    if (item) {
        item.rot = (item.rot + 1) % 4;
        saveGame();
    }
}

document.getElementById('action-move').addEventListener('click', () => {
    if (!state.selectedPlacedItem) return;
    const item = state.selectedPlacedItem;
    const model = getModel(item.classname);

    // 목록에서 잠시 빼되, 취소하면 복원할 수 있게 원본 보관
    state.placedItems = state.placedItems.filter(i => i.id !== item.id);
    if (state.avatar.sitting && state.avatar.sitting.itemId === item.id) state.avatar.sitting = null;
    enterPlacementMode(model, { type: 'move', original: { ...item } });
});

document.getElementById('action-pickup').addEventListener('click', () => {
    if (!state.selectedPlacedItem) return;
    const item = state.selectedPlacedItem;

    state.placedItems = state.placedItems.filter(i => i.id !== item.id);
    state.inventory.push(item.classname);
    if (state.avatar.sitting && state.avatar.sitting.itemId === item.id) {
        state.avatar.sitting = null;
        state.avatar.z = 0;
    }

    closeFurnitureControlPanel();
    saveGame();
    updateUI();
});

// 11. 상점 모달
const catalogModal = document.getElementById('catalog-modal');
const inventoryModal = document.getElementById('inventory-modal');

document.getElementById('btn-catalog').addEventListener('click', () => {
    catalogModal.classList.remove('hidden');
    renderCatalogGrid(document.querySelector('.tab-btn.active').dataset.category);
});
document.getElementById('close-catalog').addEventListener('click', () => {
    catalogModal.classList.add('hidden');
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        renderCatalogGrid(e.currentTarget.dataset.category);
    });
});

document.getElementById('btn-buy-item').addEventListener('click', async () => {
    const item = state.selectedCatalogItem;
    if (!item) return;
    const online = window.HousingData?.mode === 'online';
    const coinName = online ? 'DJ코인' : '크레딧';
    const buyBtn = document.getElementById('btn-buy-item');

    // 온라인 결제: 서버 함수가 코인 차감·보유 기록까지 처리 (성공하면 true)
    async function payOnline(itemId) {
        buyBtn.disabled = true;
        buyBtn.innerText = '사는 중…';
        try {
            await HousingData.purchase(itemId);
            return true;
        } catch (e) {
            alert(e.message);
            return false;
        } finally {
            buyBtn.disabled = false;
            buyBtn.innerText = '사기';
        }
    }

    // 벽지·바닥: 한 번 사면 계속 보유 — 이미 산 색은 무료로 다시 적용
    if (item.paper) {
        const paperId = online ? HousingData.paperItemId(item.paper, item.themeId) : null;
        const alreadyOwned = online && HousingData.ownedCount(paperId) > 0;
        if (!alreadyOwned) {
            if (state.credits < item.cost) { alert(`${coinName}이 부족해요! 😢`); return; }
            if (online) {
                if (!await payOnline(paperId)) return;
            } else {
                state.credits -= item.cost;
            }
        }
        if (item.paper === 'wall') state.wallTheme = item.themeId;
        else state.floorTheme = item.themeId;
        saveGame();
        updateUI();
        catalogModal.classList.add('hidden');
        return;
    }

    if (state.credits < item.cost) {
        alert(`${coinName}이 부족해요! 😢`);
        return;
    }

    // 결제는 여기서 딱 한 번
    if (online) {
        if (!await payOnline(HousingData.furniItemId(item.classname))) return;
    } else {
        state.credits -= item.cost;
    }
    state.inventory.push(item.classname);
    saveGame();
    updateUI();

    // 바로 배치 모드로
    catalogModal.classList.add('hidden');
    enterPlacementMode(item, { type: 'inventory' });
});

function renderCatalogGrid(category) {
    const grid = document.getElementById('catalog-grid');
    grid.innerHTML = "";

    // 벽지·바닥 탭: 가구가 아니라 '방 속성' 상품 (색 견본 카드)
    if (category === 'paper') {
        PAPER_ITEMS.forEach(p => {
            const card = document.createElement('div');
            card.className = "item-card";
            const img = document.createElement('img');
            img.src = paperSwatchURL(p);
            img.alt = p.name;
            card.appendChild(img);
            card.addEventListener('click', () => {
                document.querySelectorAll('#catalog-grid .item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectCatalogItem(p);
            });
            grid.appendChild(card);
        });
        return;
    }

    CATALOG_ITEMS.filter(i => i.category === category).forEach(item => {
        const card = document.createElement('div');
        card.className = "item-card";
        const img = document.createElement('img');
        img.alt = item.name;
        setFurniIcon(img, item.classname); // 로컬 스프라이트시트의 정품 아이콘
        card.appendChild(img);

        card.addEventListener('click', () => {
            document.querySelectorAll('#catalog-grid .item-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectCatalogItem(item);
        });

        grid.appendChild(card);
    });
}

function selectCatalogItem(item) {
    state.selectedCatalogItem = item;
    document.getElementById('catalog-detail-name').innerText = item.name;
    const detailImg = document.getElementById('catalog-detail-img');
    if (item.paper) detailImg.src = paperSwatchURL(item);
    else setFurniIcon(detailImg, item.classname);
    document.getElementById('catalog-detail-desc').innerText = item.desc;
    document.getElementById('catalog-detail-price').innerText = item.cost;

    const buyBtn = document.getElementById('btn-buy-item');
    buyBtn.classList.remove('disabled');
    buyBtn.removeAttribute('disabled');
}

// 12. 가방 모달
document.getElementById('btn-inventory').addEventListener('click', () => {
    inventoryModal.classList.remove('hidden');
    renderInventoryGrid();
});
document.getElementById('close-inventory').addEventListener('click', () => {
    inventoryModal.classList.add('hidden');
});

function renderInventoryGrid() {
    const grid = document.getElementById('inventory-grid');
    const emptyMsg = document.getElementById('inventory-empty-msg');
    grid.innerHTML = "";

    if (state.inventory.length === 0) {
        emptyMsg.classList.remove('hidden');
        return;
    }
    emptyMsg.classList.add('hidden');

    const itemCounts = {};
    state.inventory.forEach(c => itemCounts[c] = (itemCounts[c] || 0) + 1);

    Object.keys(itemCounts).forEach(classname => {
        const model = getModel(classname);
        if (!model) return;

        const card = document.createElement('div');
        card.className = "item-card";
        card.title = model.name;
        const img = document.createElement('img');
        img.alt = model.name;
        setFurniIcon(img, classname);
        const badge = document.createElement('span');
        badge.className = "item-count-badge";
        badge.textContent = itemCounts[classname];
        card.appendChild(img);
        card.appendChild(badge);

        card.addEventListener('click', () => {
            inventoryModal.classList.add('hidden');
            enterPlacementMode(model, { type: 'inventory' });
        });

        grid.appendChild(card);
    });
}

// 13. 크레딧/가방 UI 갱신
function updateUI() {
    document.getElementById('credits-count').innerText = state.credits.toLocaleString();
    document.getElementById('inventory-count').innerText = state.inventory.length;
}

// 14. 채팅 말풍선
const chatInput = document.getElementById('chat-input');
const chatBubblesContainer = document.getElementById('chat-bubbles-container');

function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    const bubble = document.createElement('div');
    bubble.className = "chat-bubble";

    const avatarImg = document.createElement('div');
    avatarImg.className = "chat-bubble-avatar";
    const img = document.createElement('img');
    img.src = imagerUrl(`figure=${state.avatar.figure}&size=m&head_direction=2&headonly=1`);
    img.alt = "avatar";
    avatarImg.appendChild(img);

    const textDiv = document.createElement('div');
    textDiv.className = "chat-bubble-text";
    const nameSpan = document.createElement('span');
    nameSpan.className = "chat-username";
    nameSpan.textContent = state.playerName;
    textDiv.appendChild(nameSpan);
    textDiv.appendChild(document.createTextNode(": " + text)); // textContent 사용 — HTML 삽입 방지

    bubble.appendChild(avatarImg);
    bubble.appendChild(textDiv);

    const screen = gridToScreen(state.avatar.x, state.avatar.y, state.avatar.z);
    bubble.style.left = `${screen.x}px`;
    bubble.style.top = `${screen.y - 100}px`;

    chatBubblesContainer.appendChild(bubble);
    setTimeout(() => bubble.remove(), 5500);

    chatInput.value = "";
}

document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// 15. 아바타 꾸미기 모달
const avatarModal = document.getElementById('avatar-modal');
const nameInput = document.getElementById('player-name-input');
let currentAvatarTab = 'skin';

const AVATAR_TABS = [
    { key: 'skin', label: '🙂 얼굴' }, // 얼굴 모양 + 피부색
    { key: 'hr', label: '💇 머리' },
    { key: 'ha', label: '🎩 모자' },
    { key: 'ea', label: '👓 안경' },
    { key: 'fa', label: '🧔 수염·장식' },
    { key: 'ch', label: '👕 상의' },
    { key: 'cc', label: '🧥 외투' },
    { key: 'ca', label: '📿 목걸이' },
    { key: 'wa', label: '🎀 벨트' },
    { key: 'lg', label: '👖 하의' },
    { key: 'sh', label: '👟 신발' }
];

document.getElementById('btn-profile').addEventListener('click', () => {
    nameInput.value = state.playerName;
    avatarModal.classList.remove('hidden');
    renderAvatarEditor();
});

document.getElementById('close-avatar').addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) state.playerName = name.slice(0, 10);
    avatarModal.classList.add('hidden');
    saveGame();
});

// 성별 토글: 부품 목록 필터만 바꿈 (이미 입은 옷은 그대로 유지)
document.querySelectorAll('#gender-toggle .gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.avatar.look.gender = btn.dataset.g;
        saveGame();
        renderAvatarEditor();
    });
});

// look의 특정 부품만 바꾼 미리보기용 figure 문자열
function figureWith(partKey, setId) {
    const look = { ...state.avatar.look };
    look[partKey] = setId;
    return buildFigure(look);
}

function updateAvatarPreview() {
    document.getElementById('avatar-preview-img').src =
        imagerUrl(`figure=${state.avatar.figure}&size=l&direction=2&head_direction=2&action=std`);
}

function renderAvatarEditor() {
    // 성별 토글 (M/F 필터 — 공용 부품은 양쪽 다 표시)
    document.querySelectorAll('#gender-toggle .gender-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.g === (state.avatar.look.gender || 'M'));
    });

    // 탭 버튼
    const tabsEl = document.getElementById('avatar-tabs');
    tabsEl.innerHTML = "";
    AVATAR_TABS.forEach(tab => {
        const btn = document.createElement('button');
        btn.className = "avatar-tab-btn" + (currentAvatarTab === tab.key ? " active" : "");
        btn.textContent = tab.label;
        btn.addEventListener('click', () => {
            currentAvatarTab = tab.key;
            renderAvatarEditor();
        });
        tabsEl.appendChild(btn);
    });

    const optionsEl = document.getElementById('avatar-options');
    const colorsEl = document.getElementById('avatar-colors');
    optionsEl.innerHTML = "";
    colorsEl.innerHTML = "";
    const look = state.avatar.look;

    // (1) 부품 선택 카드 — '얼굴' 탭은 hd(얼굴 모양) 부품을 보여줌
    const partKey = currentAvatarTab === 'skin' ? 'hd' : currentAvatarTab;
    const HEAD_PARTS = ['hd', 'hr', 'ha', 'ea', 'fa']; // 얼굴만 크게 보여줄 부품들

    // 성별 필터: 선택한 성별(M/F) + 공용(U)만 표시. 0(없음)은 항상 표시.
    const g = look.gender || 'M';
    const visibleSets = AVATAR_PART_SETS[partKey].filter(id =>
        id === 0 || PART_INFO[partKey][id] === 'U' || PART_INFO[partKey][id] === g
    );

    visibleSets.forEach(setId => {
        const card = document.createElement('div');
        card.className = "avatar-option-card" + (look[partKey] === setId ? " selected" : "");

        const img = document.createElement('img');
        img.loading = "lazy"; // 화면에 보이는 카드만 요청 → 이메이저 순간 부하 방지
        const fig = figureWith(partKey, setId);
        img.src = HEAD_PARTS.includes(partKey)
            ? imagerUrl(`figure=${fig}&size=m&direction=2&head_direction=2&headonly=1`)
            : imagerUrl(`figure=${fig}&size=m&direction=2&head_direction=2&action=std`);
        img.alt = setId === 0 ? "없음" : `${partKey}-${setId}`;
        card.appendChild(img);

        card.addEventListener('click', () => {
            look[partKey] = setId;
            refreshAvatarFigure();
            saveGame();
            renderAvatarEditor();
        });
        optionsEl.appendChild(card);
    });

    // (2) 색상 견본 — 얼굴: 피부색 / 모자·옷·신발: 옷 색상 / 머리·안경: 색 없음
    if (currentAvatarTab === 'skin') {
        SKIN_COLORS.forEach(c => {
            colorsEl.appendChild(makeSwatch(c.hex, look.skin === c.id, () => {
                look.skin = c.id;
                refreshAvatarFigure();
                saveGame();
                renderAvatarEditor();
            }));
        });
    } else if (['ha', 'ch', 'cc', 'lg', 'sh'].includes(currentAvatarTab)) {
        const colorKey = currentAvatarTab + "Color"; // haColor / chColor / lgColor / shColor
        CLOTH_COLORS.forEach(c => {
            colorsEl.appendChild(makeSwatch(c.hex, look[colorKey] === c.id, () => {
                look[colorKey] = c.id;
                refreshAvatarFigure();
                saveGame();
                renderAvatarEditor();
            }));
        });
    }

    updateAvatarPreview();
}

function makeSwatch(hex, isSelected, onClick) {
    const sw = document.createElement('button');
    sw.className = "color-swatch" + (isSelected ? " selected" : "");
    sw.style.background = hex;
    sw.addEventListener('click', onClick);
    return sw;
}

document.getElementById('btn-reset').addEventListener('click', () => {
    // 온라인 모드: 방 배치만 초기화 (DJ코인·산 가구는 서버에 그대로)
    if (window.HousingData?.mode === 'online') {
        if (confirm("방을 처음 상태로 되돌릴까요?\n가구는 모두 가방으로 들어가고, DJ코인과 산 물건은 그대로예요.")) {
            cancelPlacement(); // 배치·이동 중이면 취소 + 가구 패널 닫기
            state.placedItems.forEach(i => state.inventory.push(i.classname));
            state.placedItems = [];
            state.wallTheme = 0;
            state.floorTheme = 0;
            applyRoomModel(state.roomModel); // 아바타를 문으로 (앉은 상태 등 해제)
            saveGame();
            updateUI();
        }
        return;
    }
    if (confirm("정말 처음부터 다시 할까요?\n방, 가구, 크레딧이 모두 초기화돼요.")) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
});

// 16. 방 모양 바꾸기 모달
const roomModal = document.getElementById('room-modal');

document.getElementById('btn-room').addEventListener('click', () => {
    roomModal.classList.remove('hidden');
    renderRoomModelGrid();
});
document.getElementById('close-room').addEventListener('click', () => {
    roomModal.classList.add('hidden');
});

// 방 모양 미리보기: heightmap을 작은 다이아몬드 타일로 그림
function drawModelPreview(canvasEl, modelName) {
    const def = ROOM_MODELS[modelName];
    const rows = def.map.split("|");
    const pctx = canvasEl.getContext('2d');
    const PW = 5, PH = 2.5; // 미리보기용 반타일 크기

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            if (row[x] === 'x') continue;
            xMin = Math.min(xMin, x - y); xMax = Math.max(xMax, x - y);
            yMin = Math.min(yMin, x + y); yMax = Math.max(yMax, x + y);
        }
    });
    const ox = canvasEl.width / 2 - ((xMin + xMax) / 2) * PW;
    const oy = canvasEl.height / 2 - ((yMin + yMax) / 2) * PH;

    pctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const isDoor = x === def.door.x && y === def.door.y;
            if (row[x] === 'x' && !isDoor) continue;
            const sx = ox + (x - y) * PW;
            const sy = oy + (x + y) * PH;
            pctx.beginPath();
            pctx.moveTo(sx, sy);
            pctx.lineTo(sx + PW, sy + PH);
            pctx.lineTo(sx, sy + PH * 2);
            pctx.lineTo(sx - PW, sy + PH);
            pctx.closePath();
            pctx.fillStyle = isDoor ? '#f59e0b' : '#9cb08a';
            pctx.fill();
        }
    });
}

function renderRoomModelGrid() {
    const grid = document.getElementById('room-model-grid');
    grid.innerHTML = "";

    Object.keys(ROOM_MODELS).forEach(modelName => {
        const card = document.createElement('div');
        card.className = "room-model-card" + (state.roomModel === modelName ? " selected" : "");

        const cv = document.createElement('canvas');
        cv.width = 140;
        cv.height = 100;
        drawModelPreview(cv, modelName);

        const label = document.createElement('span');
        label.textContent = ROOM_MODELS[modelName].label;

        card.appendChild(cv);
        card.appendChild(label);

        card.addEventListener('click', () => {
            if (state.roomModel === modelName) {
                roomModal.classList.add('hidden');
                return;
            }
            const returned = applyRoomModel(modelName);
            saveGame();
            updateUI();
            roomModal.classList.add('hidden');
            if (returned > 0) {
                alert(`새 방 바닥에 놓을 수 없는 가구 ${returned}개를 가방에 넣어 두었어요!`);
            }
        });

        grid.appendChild(card);
    });
}

// 17. 시작!
(async () => {
    // 온라인/게스트 모드 판정과 서버 데이터(코인·보유·방)를 기다린 뒤 시작
    if (window.HousingData) {
        try { await HousingData.ready; } catch (e) { /* 실패 시 게스트 모드 */ }
    }

    loadGame();
    applyRoomModel(state.roomModel); // 문 위치에 아바타 배치 + 화면 중앙 정렬 + 저장 데이터 검증
    refreshAvatarFigure();           // look → figure 문자열 생성 + 프로필 아이콘 갱신

    // 온라인 모드: 화폐 라벨을 DJ코인으로, 잔액은 서버 구독으로 실시간 갱신
    if (window.HousingData?.mode === 'online') {
        const coinLabel = document.querySelector('#top-status-bar .status-box .label');
        if (coinLabel) coinLabel.innerText = 'DJ코인';
        HousingData.onCoinChange(coin => {
            state.credits = coin;
            updateUI();
        });
    }
    updateUI();

    // 저장된 방의 가구는 즉시, 나머지 카탈로그는 유휴 시간에 미리 로딩(원본 스프라이트 팝인 방지)
    state.placedItems.forEach(i => loadFurni(i.classname));
    const preloadIdle = window.requestIdleCallback || (fn => setTimeout(fn, 200));
    let preloadIdx = 0;
    function preloadNextFurni() {
        if (preloadIdx >= CATALOG_ITEMS.length) return;
        loadFurni(CATALOG_ITEMS[preloadIdx++].classname);
        preloadIdle(preloadNextFurni);
    }
    preloadIdle(preloadNextFurni);

    requestAnimationFrame(drawRoom);
})();
