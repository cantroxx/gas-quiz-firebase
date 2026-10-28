export const CHARACTERS = [
  {
    id: 0,
    name: "모찌",
    animal: "토끼",
    color: "#df84a4",
    soft: "#fbeaf0",
    tag: "폴짝폴짝 여행가",
  },
  {
    id: 1,
    name: "삐약",
    animal: "오리",
    color: "#d7a53f",
    soft: "#fff5d9",
    tag: "호기심 많은 탐험가",
  },
  {
    id: 2,
    name: "치즈",
    animal: "고양이",
    color: "#8e88ce",
    soft: "#f0edfc",
    tag: "느긋한 도시 수집가",
  },
  {
    id: 3,
    name: "코코",
    animal: "곰",
    color: "#55a596",
    soft: "#e7f5ed",
    tag: "든든한 여행 친구",
  },
];
export const GROUPS = [
  "#e6b292",
  "#e69fae",
  "#ae9bd0",
  "#8bbbd3",
  "#83b8a3",
  "#dbbb66",
  "#db9983",
  "#899bca",
];
const city = (name, icon, price, group) => ({
  type: "city",
  name,
  icon,
  price,
  group,
  build: Math.round(price * 0.65),
  rent: Math.max(2, Math.round(price * 0.18)),
});
export const BOARD = [
  { type: "start", name: "출발", icon: "⚑", caption: "월급 +20만" },
  city("타이베이", "🏮", 8, 0),
  city("홍콩", "⛵", 10, 0),
  { type: "card", name: "황금열쇠", icon: "✦" },
  city("마닐라", "🌴", 12, 1),
  city("싱가포르", "🦁", 14, 1),
  { type: "fundPay", name: "기부하기", icon: "♡", caption: "5만 기부" },
  city("도쿄", "🌸", 16, 1),
  { type: "island", name: "무인도", icon: "🏝️", caption: "잠깐 쉬어가요" },
  city("시드니", "🐨", 18, 2),
  city("오클랜드", "🥝", 20, 2),
  { type: "card", name: "황금열쇠", icon: "✦" },
  city("두바이", "🌇", 22, 3),
  city("카이로", "🔺", 24, 3),
  city("이스탄불", "🕌", 26, 3),
  city("아테네", "🏛️", 28, 3),
  { type: "fundGet", name: "복지기금", icon: "🎁", caption: "모인 기금 받기" },
  city("로마", "🏟️", 30, 4),
  city("베를린", "🐻", 32, 4),
  { type: "card", name: "황금열쇠", icon: "✦" },
  city("파리", "🗼", 34, 5),
  city("런던", "🕰️", 36, 5),
  city("마드리드", "🌻", 38, 5),
  city("리스본", "🚋", 40, 5),
  { type: "travel", name: "우주여행", icon: "🚀", caption: "다음 턴 순간이동" },
  city("뉴욕", "🗽", 42, 6),
  city("몬트리올", "🍁", 44, 6),
  { type: "card", name: "황금열쇠", icon: "✦" },
  city("리우", "🦜", 46, 7),
  city("하와이", "🌺", 48, 7),
  city("부산", "🌉", 50, 7),
  city("서울", "🏯", 54, 7),
].map((cell, index) => ({ ...cell, index }));

export const CARDS = [
  {
    title: "여행 지원금",
    text: "즐거운 여행을 응원해요. 은행에서 15만을 받아요.",
    cash: 15,
  },
  {
    title: "생일 축하해!",
    text: "은행이 준비한 선물! 20만을 받아요.",
    cash: 20,
  },
  {
    title: "사진전 입상",
    text: "멋진 여행 사진으로 상금 10만을 받아요.",
    cash: 10,
  },
  {
    title: "건물 수리",
    text: "건물 한 단계마다 수리비 3만을 내요.",
    repair: 3,
  },
  {
    title: "여행 가방 수리",
    text: "가방을 고치고 은행에 8만을 내요.",
    cash: -8,
  },
  {
    title: "출발지로!",
    text: "출발지로 이동하고 월급 20만을 받아요.",
    move: 0,
  },
  {
    title: "서울 나들이",
    text: "서울로 이동해요. 출발지를 지나면 월급도 받아요.",
    move: 31,
  },
  {
    title: "무인도 휴가",
    text: "무인도로 이동해요. 더블이 나오면 탈출할 수 있어요.",
    island: true,
  },
  {
    title: "무인도 탈출권",
    text: "다음 무인도 차례에 자동으로 사용할 수 있어요.",
    escape: true,
  },
  { title: "행운의 저축", text: "은행에서 이자 12만을 받아요.", cash: 12 },
  {
    title: "우주여행 초대",
    text: "우주여행 칸으로 이동해요. 다음 차례에 목적지를 골라요.",
    move: 24,
  },
  { title: "마을 돕기", text: "복지기금에 10만을 기부해요.", fund: 10 },
];
export const BUILD_NAMES = ["빈 땅", "별장", "빌딩", "호텔"];
export const INITIAL_CASH = 200;
export const SALARY = 20;
export const TURN_MS = 45000;
export const RULESET = "DJ48 기본형 v1 · 32칸";
export function tilePoint(index) {
  if (index <= 8) return { x: 8 - index, y: 8 };
  if (index <= 16) return { x: 0, y: 16 - index };
  if (index <= 24) return { x: index - 16, y: 0 };
  return { x: 8, y: index - 24 };
}
export const money = (amount) => `${amount.toLocaleString("ko-KR")}만`;
