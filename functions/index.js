"use strict";

const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

initializeApp();

const REGION = "asia-northeast3";
const DEFAULT_MEMBER_SCHOOL = "동자";
const AUTH_LINK_PROVIDER = "firebase_member_link_function";
const AUTH_LINK_VERSION = 3;
const MAX_FAILED_ATTEMPTS = 5;
const PRACTICE_CORRECT_REWARD_COIN = 1;
const PRACTICE_DAILY_COIN_LIMIT = 50;
const PASSWORD_HASH_ITERATIONS = 210000;
const PASSWORD_HASH_KEY_LENGTH = 32;
const PASSWORD_SETUP_SESSION_MINUTES = 15;
const DEFAULT_PASSWORD_SETUP_EXPIRES_AT = "2026-06-17T23:59:59+09:00";
const SUPER_ADMIN_MEMBER_USER_ID = "G9-C9-N99";
const FEATURE_FLAGS_DOC_PATH = "appSettings/featureFlags";
const EXTERNAL_QUIZZES_DOC_PATH = "appSettings/externalQuizzes";
const SEASON_EVENTS_DOC_PATH = "appSettings/seasonEvents";
const MAX_EXTERNAL_QUIZ_ITEMS = 12;
const MAX_SEASON_EVENT_ITEMS = 12;
const POPULAR_USAGE_SOFT_LIMIT_SECONDS = 10 * 60;
const POPULAR_USAGE_AFTER4_HARD_LIMIT_SECONDS = 30 * 60;
const POPULAR_USAGE_UNLOCK_CORRECT_COUNT = 15;
const POPULAR_USAGE_MAX_HEARTBEAT_SECONDS = 60;
const LEVEL_MAX = 50;
const LEVEL_XP_PER_LEVEL = 50;
const LEVEL_UP_REWARD_COIN = 50;
const LEVEL_UP_CLASSROOM_POINT = 50;
const DEFAULT_CLASSROOM_EXCHANGE_SETTINGS = {
  pointToCoinEnabled: true,
  coinToPointEnabled: true,
  pointToCoinPointCost: 10,
  coinToPointReward: 10
};
const WEEKLY_XP_LIMIT = 500;
const TODAY_QUIZ_XP_PER_QUESTION = 2;
const TODAY_QUIZ_DAILY_XP_LIMIT = 20;
const HIDDEN_CLASSROOM_STUDENT_CARD_MEMBER_USER_IDS = new Set(["G4-C8-N23"]);
const HIDDEN_CLASSROOM_ACTIVITY_MEMBER_USER_IDS = new Set(["G4-C8-N23"]);
const TITLE_ACQUISITION_XP = 50;
const TITLE_ACQUISITION_COIN = 50;
const TITLE_ACQUISITION_CLASSROOM_POINT = 10;
const CLASSROOM_BILLBOARD_TICKET_ITEM_ID = "billboard-ticket";
const CLASSROOM_NOTICE_SLOT_KEYS = ["links", "patch", "monthlyKing", "events", "personal"];
const DEFAULT_CLASSROOM_NOTICE_SLOTS = [
  { key: "links", label: "주요 링크", color: "#3b82f6", text: "" },
  { key: "patch", label: "패치노트", color: "#f7b7d9", text: "" },
  { key: "monthlyKing", label: "이달의 왕", color: "#bdecc9", text: "" },
  { key: "events", label: "행사판", color: "#d9b8ff", text: "" },
  { key: "personal", label: "개인적인", color: "#ffd1b8", text: "" }
];
const DEFAULT_CLASSROOM_BILLBOARD_ITEM = {
  itemId: CLASSROOM_BILLBOARD_TICKET_ITEM_ID,
  title: "전광판 이용권",
  desc: "우리반 게시판 전광판에 한마디를 올릴 수 있는 쿠폰",
  pricePoint: 30,
  itemType: "billboardTicket",
  icon: "📣",
  active: true,
  isDefault: true
};
const DEFAULT_CLASSROOM_POINT_BOOST_ITEMS = [
  {
    itemId: "boost-farmer-friend",
    title: "허수아비 친구",
    desc: "교실 포인트를 받을 때마다 +0.35P를 더 받습니다.",
    priceCoin: 35,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.35,
    icon: "boost-farmer-friend",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-big-tree",
    title: "잎이 무성한 나무",
    desc: "교실 포인트를 받을 때마다 +0.40P를 더 받습니다.",
    priceCoin: 40,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.4,
    icon: "boost-big-tree",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-fountain",
    title: "정원 분수",
    desc: "교실 포인트를 받을 때마다 +0.20P를 더 받습니다.",
    priceCoin: 20,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.2,
    icon: "boost-fountain",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-mini-tractor",
    title: "미니 트랙터",
    desc: "교실 포인트를 받을 때마다 +0.65P를 더 받습니다.",
    priceCoin: 65,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.65,
    icon: "boost-mini-tractor",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-ripe-rice",
    title: "잘 익은 벼",
    desc: "교실 포인트를 받을 때마다 +0.30P를 더 받습니다.",
    priceCoin: 30,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.3,
    icon: "boost-ripe-rice",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-truck",
    title: "트럭",
    desc: "교실 포인트를 받을 때마다 +0.50P를 더 받습니다.",
    priceCoin: 50,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.5,
    icon: "boost-truck",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-log-pile",
    title: "통나무 더미",
    desc: "교실 포인트를 받을 때마다 +0.10P를 더 받습니다.",
    priceCoin: 10,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.1,
    icon: "boost-log-pile",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-bird-speaker",
    title: "참새 퇴치기",
    desc: "교실 포인트를 받을 때마다 +0.45P를 더 받습니다.",
    priceCoin: 45,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.45,
    icon: "boost-bird-speaker",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-chick",
    title: "귀여운 병아리",
    desc: "교실 포인트를 받을 때마다 +0.25P를 더 받습니다.",
    priceCoin: 25,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.25,
    icon: "boost-chick",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-liquid-fertilizer",
    title: "액체비료",
    desc: "교실 포인트를 받을 때마다 +0.15P를 더 받습니다.",
    priceCoin: 15,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.15,
    icon: "boost-liquid-fertilizer",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-greenhouse",
    title: "작은 온실",
    desc: "교실 포인트를 받을 때마다 +0.70P를 더 받습니다.",
    priceCoin: 80,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.7,
    icon: "boost-greenhouse",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-sprinkler",
    title: "자동 스프링클러",
    desc: "교실 포인트를 받을 때마다 +0.85P를 더 받습니다.",
    priceCoin: 95,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 0.85,
    icon: "boost-sprinkler",
    active: true,
    isDefault: true
  },
  {
    itemId: "boost-sun-lamp",
    title: "햇빛 램프",
    desc: "교실 포인트를 받을 때마다 +1.00P를 더 받습니다.",
    priceCoin: 120,
    priceType: "djCoin",
    itemType: "pointBoost",
    boostPoint: 1,
    icon: "boost-sun-lamp",
    active: true,
    isDefault: true
  },
  {
    itemId: "effect-golden-garden",
    title: "황금 텃밭 배경",
    desc: "학생카드 배경이 바뀌고 교실 포인트를 받을 때마다 +1.50P를 더 받습니다.",
    priceCoin: 220,
    priceType: "djCoin",
    itemType: "pointBoostEffect",
    boostPoint: 1.5,
    icon: "effect-golden-garden",
    active: true,
    isDefault: true
  },
  {
    itemId: "effect-star-classroom",
    title: "별빛 교실 배경",
    desc: "학생카드 배경이 바뀌고 교실 포인트를 받을 때마다 +2.00P를 더 받습니다.",
    priceCoin: 300,
    priceType: "djCoin",
    itemType: "pointBoostEffect",
    boostPoint: 2,
    icon: "effect-star-classroom",
    active: true,
    isDefault: true
  }
];
const db = getFirestore();

const DEFAULT_CLASSROOM_MISSION = {
  missionId: "current",
  title: "학급 포인트 미션",
  desc: "우리반 학생 포인트 총합으로 달성하는 단체 목표",
  thresholds: [
    { label: "1단계", targetPoint: 2000, rewardText: "" },
    { label: "2단계", targetPoint: 4000, rewardText: "" },
    { label: "3단계", targetPoint: 6000, rewardText: "" }
  ],
  active: true
};

const DEFAULT_FEATURE_FLAGS = {
  practiceRewardEnabled: true,
  practiceXpEnabled: true,
  shopEnabled: true,
  externalQuizzesEnabled: true,
  eventPlazaEnabled: true,
  rankingEnabled: true,
  todayQuizMode: "manual",
  todayQuizIds: [],
  todayQuizRandomPoolIds: [],
  todayQuizDailyCount: 1,
  todayQuizShuffleSeed: "",
  todayQuizShuffledAtIso: "",
  disabledQuizIds: []
};

const DEFAULT_EXTERNAL_QUIZZES = {
  items: []
};

const DEFAULT_SEASON_EVENTS = {
  items: [
    {
      eventId: "reading_king_season",
      icon: "📖",
      title: "독서왕 시즌",
      desc: "독서 퀴즈를 중심으로 시즌 칭호와 뱃지를 모으는 이벤트입니다.",
      periodType: "monthly",
      targetMonth: "",
      quizIds: ["gmo", "time_store"],
      active: true
    },
    {
      eventId: "three_kingdoms_week",
      icon: "🏯",
      title: "삼국시대 탐험 주간",
      desc: "삼국시대 사회 퀴즈를 많이 풀어보는 주간 이벤트입니다.",
      periodType: "weekly",
      startDate: "",
      endDate: "",
      quizIds: ["samgukji", "ancient-history"],
      active: true
    }
  ]
};

const SEASON_EVENTS_UPDATE_LOCK_MS = 60 * 60 * 1000;

const EVENT_DAILY_QUEST_POOL = [
  { questId: "daily_spelling_10", icon: "✏️", title: "맞춤법 10문제 해결", target: 10, xpReward: 20, rewardCoin: 10, kind: "spellingCorrect", scope: "daily" },
  { questId: "daily_vocab_8", icon: "🔤", title: "다의어·동형이의어 8문제 해결", target: 8, xpReward: 20, rewardCoin: 10, kind: "vocabCorrect", scope: "daily" },
  { questId: "daily_reading_6", icon: "📖", title: "독서 퀴즈 6문제 해결", target: 6, xpReward: 22, rewardCoin: 10, kind: "readingCorrect", scope: "daily", recommended: true },
  { questId: "daily_social_10", icon: "🏛️", title: "사회·역사 퀴즈 10문제 해결", target: 10, xpReward: 20, rewardCoin: 10, kind: "socialCorrect", scope: "daily" },
  { questId: "daily_math_10", icon: "➗", title: "수학 연습 10문제 해결", target: 10, xpReward: 20, rewardCoin: 10, kind: "mathCorrect", scope: "daily" },
  { questId: "daily_study_mix_15", icon: "🎯", title: "학습 퀴즈 15문제 해결", target: 15, xpReward: 18, rewardCoin: 10, kind: "studyCorrect", scope: "daily" }
];

const EVENT_WEEKLY_QUESTS = [
  { questId: "weekly_study_20", icon: "📚", title: "주간 반복: 학습 퀴즈 20문제 해결", target: 20, xpReward: 8, rewardCoin: 10, kind: "studyCorrect", scope: "weekly", repeatLimit: 5 },
  { questId: "weekly_reading_12", icon: "📘", title: "주간 반복: 독서 퀴즈 12문제 해결", target: 12, xpReward: 8, rewardCoin: 10, kind: "readingCorrect", scope: "weekly", repeatLimit: 3 },
  { questId: "weekly_social_15", icon: "🧭", title: "주간 반복: 사회·역사 15문제 해결", target: 15, xpReward: 8, rewardCoin: 10, kind: "socialCorrect", scope: "weekly", repeatLimit: 3 }
];

const DEFAULT_CLASSROOM_SETTINGS = {
  "G4-C8": {
    classId: "G4-C8",
    grade: "4",
    classNumber: "8",
    name: "4학년 8반",
    entryCode: "4822",
    quests: [
      {
        id: "desk-check",
        title: "오늘 책상 정리하기",
        desc: "수업 전후 책상과 주변을 스스로 정리합니다.",
        questType: "수락형 · 체크형",
        type: "수락형 · 체크형",
        rewardMode: "auto",
        rewardCoin: 5,
        saveEnabled: true,
        active: true,
        studentAction: "완료하고 5 포인트 받기"
      }
    ]
  }
};

const CLASS_MISSION_DEFINITIONS = [];

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Firebase Auth is required.");
  }
  return request.auth.uid;
}

function normalizeLegacyMemberSchool(school) {
  const value = String(school || "").trim();
  if (!value) return DEFAULT_MEMBER_SCHOOL;
  const normalized = value
    .replace(/^서울/, "")
    .replace(/초등학교$/, "")
    .replace(/초$/, "")
    .trim();
  return normalized || DEFAULT_MEMBER_SCHOOL;
}

function buildLegacyMemberUserId(school, grade, classNumber, studentNumber) {
  const normalizedSchool = normalizeLegacyMemberSchool(school);
  const gradeNumber = Number(grade);
  const classNoNumber = Number(classNumber);
  const studentNoNumber = Number(studentNumber);

  if (!gradeNumber || !classNoNumber || !studentNoNumber) {
    throw new HttpsError("invalid-argument", "Invalid member identity.");
  }

  const baseUserId = `G${gradeNumber}-C${classNoNumber}-N${String(studentNoNumber).padStart(2, "0")}`;
  if (normalizedSchool === DEFAULT_MEMBER_SCHOOL) return baseUserId;

  const schoolKey = normalizedSchool.replace(/[^0-9A-Za-z가-힣_-]/g, "");
  return schoolKey ? `S${schoolKey}-${baseUserId}` : baseUserId;
}

function normalizeAccessCode(accessCode) {
  const code = String(accessCode || "").trim();
  if (!code || code.length > 64) {
    throw new HttpsError("invalid-argument", "Invalid access code.");
  }
  return code;
}

function getMemberPayload(data) {
  const payload = data && typeof data === "object" ? data : {};
  return {
    school: payload.school || DEFAULT_MEMBER_SCHOOL,
    grade: payload.grade,
    classNumber: payload.classNumber,
    studentNumber: payload.studentNumber,
    accessCode: normalizeAccessCode(payload.accessCode)
  };
}

function getMemberIdentityPayload(data) {
  const payload = data && typeof data === "object" ? data : {};
  return {
    school: payload.school || DEFAULT_MEMBER_SCHOOL,
    grade: payload.grade,
    classNumber: payload.classNumber,
    studentNumber: payload.studentNumber
  };
}

function normalizeNickname(value) {
  return String(value || "").trim();
}

function assertNicknameAllowed(nickname) {
  const normalized = normalizeNickname(nickname);
  const compact = normalized.replace(/\s+/g, "").toLowerCase();
  const blockedWords = [
    "시발", "씨발", "ㅅㅂ", "병신", "ㅂㅅ", "좆", "꺼져", "죽어",
    "fuck", "shit", "bitch"
  ];
  if (normalized.length < 2 || normalized.length > 20) {
    throw new HttpsError("invalid-argument", "Nickname must be 2 to 20 characters.");
  }
  if (!/[0-9A-Za-z가-힣]/.test(normalized)) {
    throw new HttpsError("invalid-argument", "Nickname must include letters or numbers.");
  }
  if (blockedWords.some(word => compact.includes(word))) {
    throw new HttpsError("invalid-argument", "Nickname contains blocked words.");
  }
  return normalized;
}

function publicFeatureFlags(data = {}) {
  const sanitizeQuizIds = (value, limit) => Array.isArray(value)
    ? Array.from(new Set(value
      .map(id => String(id || "").trim())
      .filter(id => /^[0-9A-Za-z_-]{1,80}$/.test(id))))
      .slice(0, limit)
    : [];
  const disabledQuizIds = Array.isArray(data.disabledQuizIds)
    ? sanitizeQuizIds(data.disabledQuizIds, 120)
    : [];
  const todayQuizIds = sanitizeQuizIds(data.todayQuizIds, 20);
  const todayQuizRandomPoolIds = sanitizeQuizIds(data.todayQuizRandomPoolIds, 80);
  const todayQuizMode = data.todayQuizMode === "dailyRandom" ? "dailyRandom" : "manual";
  const todayQuizDailyCount = Math.min(10, Math.max(1, Math.round(Number(data.todayQuizDailyCount) || 1)));
  const todayQuizShuffleSeed = String(data.todayQuizShuffleSeed || "").trim().slice(0, 80);
  const todayQuizShuffledAtIso = String(data.todayQuizShuffledAtIso || "").trim().slice(0, 40);
  const activeTodayQuizIds = todayQuizMode === "dailyRandom"
    ? getDailyShuffledQuizIds(todayQuizRandomPoolIds, `${getKstDateKey()}:${todayQuizShuffleSeed || ""}`).slice(0, todayQuizDailyCount)
    : todayQuizIds;
  return {
    practiceRewardEnabled: data.practiceRewardEnabled !== false,
    practiceXpEnabled: data.practiceXpEnabled !== false,
    shopEnabled: data.shopEnabled !== false,
    externalQuizzesEnabled: data.externalQuizzesEnabled !== false,
    eventPlazaEnabled: data.eventPlazaEnabled !== false,
    rankingEnabled: data.rankingEnabled !== false,
    todayQuizMode,
    todayQuizIds,
    activeTodayQuizIds,
    todayQuizRandomPoolIds,
    todayQuizDailyCount,
    todayQuizShuffleSeed,
    todayQuizShuffledAtIso,
    disabledQuizIds
  };
}

async function getFeatureFlags(transaction = null) {
  const ref = db.doc(FEATURE_FLAGS_DOC_PATH);
  const snapshot = transaction ? await transaction.get(ref) : await ref.get();
  return publicFeatureFlags(snapshot.exists ? snapshot.data() || {} : DEFAULT_FEATURE_FLAGS);
}

function assertFeatureEnabled(flags, key, message) {
  if (flags?.[key] === false) {
    throw new HttpsError("failed-precondition", message || "Feature is disabled.");
  }
}

function isAdminMemberData(memberData = {}) {
  return memberData.role === "admin" || !!String(memberData.adminLevel || "").trim();
}

function assertFeatureEnabledForMember(flags, key, memberData, message) {
  if (isAdminMemberData(memberData)) return;
  assertFeatureEnabled(flags, key, message);
}

function getAdminPopularUsageBypassStatus(memberUserId) {
  return {
    memberUserId,
    userId: memberUserId,
    date: getKstDateKey(),
    funSeconds: 0,
    after4FunSeconds: 0,
    eduCorrectCount: 0,
    unlockBaseEduCorrectCount: 0,
    unlockProgress: POPULAR_USAGE_UNLOCK_CORRECT_COUNT,
    unlockRemainingCorrect: 0,
    softLocked: false,
    hardLocked: false,
    locked: false,
    adminBypass: true
  };
}

function normalizeExternalQuizUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new HttpsError("invalid-argument", "External quiz URL is invalid.");
  }
  if (parsed.protocol !== "https:") {
    throw new HttpsError("invalid-argument", "External quiz URL must use https.");
  }
  return parsed.toString().slice(0, 500);
}

function publicExternalQuizzes(data = {}) {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems.slice(0, MAX_EXTERNAL_QUIZ_ITEMS)
    .map((item, index) => {
      const title = String(item?.title || "").trim().slice(0, 40);
      const url = normalizeExternalQuizUrl(item?.url || "");
      return {
        id: String(item?.id || `external-${index + 1}`).trim().replace(/[^0-9A-Za-z_-]/g, "-").slice(0, 40) || `external-${index + 1}`,
        title,
        description: String(item?.description || "").trim().slice(0, 120),
        url,
        active: item?.active !== false,
        sortOrder: Number(item?.sortOrder) || index + 1
      };
    })
    .filter(item => item.title && item.url)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

  return { items };
}

function isIsoMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

function addIsoDateDays(dateKey, days) {
  if (!isIsoDateKey(dateKey)) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function getKstWeekStartDateKey(dateKey = getKstDateKey()) {
  const [year, month, day] = String(dateKey || getKstDateKey()).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

function getMonthEndDateKey(monthKey) {
  if (!isIsoMonthKey(monthKey)) return "";
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function formatSeasonMonthPeriod(monthKey) {
  if (!isIsoMonthKey(monthKey)) return "이번 달";
  const [year, month] = monthKey.split("-").map(Number);
  return `${year}년 ${month}월`;
}

function publicSeasonEvents(data = {}, context = {}) {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const dateKey = String(context.dateKey || getKstDateKey());
  const monthKey = dateKey.slice(0, 7);
  const currentWeekStartDate = getKstWeekStartDateKey(dateKey);
  const currentWeekEndDate = addIsoDateDays(currentWeekStartDate, 6);
  const sanitizeQuizIds = value => Array.isArray(value)
    ? Array.from(new Set(value
      .map(id => String(id || "").trim())
      .filter(id => /^[0-9A-Za-z_-]{1,80}$/.test(id))))
      .slice(0, 20)
    : [];
  const items = rawItems.slice(0, MAX_SEASON_EVENT_ITEMS)
    .map((item, index) => {
      const periodType = item?.periodType === "weekly" ? "weekly" : "monthly";
      const targetMonth = isIsoMonthKey(item?.targetMonth || item?.month)
        ? String(item.targetMonth || item.month)
        : monthKey;
      let startDate = isIsoDateKey(item?.startDate || item?.periodStartDate)
        ? String(item.startDate || item.periodStartDate)
        : currentWeekStartDate;
      let endDate = isIsoDateKey(item?.endDate || item?.periodEndDate)
        ? String(item.endDate || item.periodEndDate)
        : currentWeekEndDate;
      if (startDate > endDate) {
        startDate = currentWeekStartDate;
        endDate = currentWeekEndDate;
      }
      const periodStartDate = periodType === "weekly" ? startDate : `${targetMonth}-01`;
      const periodEndDate = periodType === "weekly" ? endDate : getMonthEndDateKey(targetMonth);
      const periodKey = periodType === "weekly"
        ? `${periodStartDate}:${periodEndDate}`
        : targetMonth;
      const quizIds = sanitizeQuizIds(item?.quizIds);
      const period = periodType === "weekly"
        ? `${periodStartDate} ~ ${periodEndDate}`
        : formatSeasonMonthPeriod(targetMonth);
      return {
        eventId: String(item?.eventId || `season-${index + 1}`).trim().replace(/[^0-9A-Za-z_-]+/g, "-").slice(0, 60) || `season-${index + 1}`,
        icon: String(item?.icon || "✨").trim().slice(0, 8) || "✨",
        title: String(item?.title || "").trim().slice(0, 60),
        desc: String(item?.desc || item?.description || "").trim().slice(0, 180),
        quizIds,
        periodType,
        period: String(period).trim().slice(0, 40),
        periodKey,
        targetMonth: periodType === "monthly" ? targetMonth : "",
        startDate: periodType === "weekly" ? periodStartDate : "",
        endDate: periodType === "weekly" ? periodEndDate : "",
        periodStartDate,
        periodEndDate,
        active: item?.active !== false,
        sortOrder: Number(item?.sortOrder) || index + 1
      };
    })
    .filter(item => item.eventId && item.title)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

  return { items };
}

function getSeasonEventsUpdateLock(snapshot) {
  if (!snapshot?.exists) return { locked: false, lockedUntilIso: "" };
  const updatedAtMillis = timestampToMillis(snapshot.data()?.updatedAt);
  if (!updatedAtMillis) return { locked: false, lockedUntilIso: "" };
  const lockedUntilMillis = updatedAtMillis + SEASON_EVENTS_UPDATE_LOCK_MS;
  const locked = lockedUntilMillis > Date.now();
  return {
    locked,
    lockedUntilIso: locked ? new Date(lockedUntilMillis).toISOString() : ""
  };
}

function getKstDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function isAfter4PmKst(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    hourCycle: "h23"
  }).format(date));
  return hour >= 16;
}

function buildDailyUsageRecordId(memberUserId, dateKey = getKstDateKey()) {
  return `${memberUserId}__${dateKey}`;
}

function normalizeDailyUsageData(data = {}, memberUserId = "", dateKey = getKstDateKey()) {
  return {
    recordId: String(data.recordId || buildDailyUsageRecordId(memberUserId, dateKey)),
    memberUserId: String(data.memberUserId || memberUserId || ""),
    userId: String(data.userId || data.memberUserId || memberUserId || ""),
    date: String(data.date || dateKey),
    funSeconds: Math.max(0, Math.round(Number(data.funSeconds) || 0)),
    after4FunSeconds: Math.max(0, Math.round(Number(data.after4FunSeconds) || 0)),
    eduCorrectCount: Math.max(0, Math.round(Number(data.eduCorrectCount) || 0)),
    unlockBaseEduCorrectCount: Math.max(0, Math.round(Number(data.unlockBaseEduCorrectCount) || 0))
  };
}

function getDailyUsageAccessStatus(usage) {
  const funSeconds = Number(usage.funSeconds) || 0;
  const after4FunSeconds = Number(usage.after4FunSeconds) || 0;
  const unlockBase = Math.max(0, Number(usage.unlockBaseEduCorrectCount) || 0);
  const unlockProgress = funSeconds >= POPULAR_USAGE_SOFT_LIMIT_SECONDS
    ? Math.max(0, (Number(usage.eduCorrectCount) || 0) - unlockBase)
    : 0;
  const softLocked = funSeconds >= POPULAR_USAGE_SOFT_LIMIT_SECONDS
    && unlockProgress < POPULAR_USAGE_UNLOCK_CORRECT_COUNT;
  const hardLocked = after4FunSeconds >= POPULAR_USAGE_AFTER4_HARD_LIMIT_SECONDS;
  return {
    ...usage,
    unlockProgress,
    unlockRemainingCorrect: Math.max(0, POPULAR_USAGE_UNLOCK_CORRECT_COUNT - unlockProgress),
    softLocked,
    hardLocked,
    locked: softLocked || hardLocked
  };
}

async function updateDailyUsageForLinkedMember(authUid, memberUserId, delta = {}) {
  const safeMemberUserId = normalizeId(memberUserId, "memberUserId");
  const dateKey = getKstDateKey();
  const recordId = buildDailyUsageRecordId(safeMemberUserId, dateKey);
  const usageRef = db.collection("dailyUsage").doc(recordId);
  return db.runTransaction(async transaction => {
    const memberData = await assertLinkedMemberAuth(transaction, safeMemberUserId, authUid);
    assertActiveStudent(memberData);
    const snapshot = await transaction.get(usageRef);
    const current = normalizeDailyUsageData(snapshot.exists ? snapshot.data() : { recordId }, safeMemberUserId, dateKey);
    const funDelta = Math.max(0, Math.min(
      Math.round(Number(delta.funSeconds) || 0),
      POPULAR_USAGE_MAX_HEARTBEAT_SECONDS
    ));
    const eduCorrectDelta = Math.max(0, Math.min(Math.round(Number(delta.eduCorrectCount) || 0), 5));
    let unlockBase = current.unlockBaseEduCorrectCount;
    if (current.funSeconds + funDelta >= POPULAR_USAGE_SOFT_LIMIT_SECONDS && unlockBase <= 0) {
      unlockBase = current.eduCorrectCount;
    }
    const after4FunDelta = isAfter4PmKst() ? funDelta : 0;
    const next = {
      recordId,
      memberUserId: safeMemberUserId,
      userId: safeMemberUserId,
      date: dateKey,
      funSeconds: current.funSeconds + funDelta,
      after4FunSeconds: current.after4FunSeconds + after4FunDelta,
      eduCorrectCount: current.eduCorrectCount + eduCorrectDelta,
      unlockBaseEduCorrectCount: unlockBase,
      migrationSource: "cloud_function_daily_usage",
      updatedAt: FieldValue.serverTimestamp()
    };
    if (!snapshot.exists) next.createdAt = FieldValue.serverTimestamp();
    transaction.set(usageRef, next, { merge: true });
    return getDailyUsageAccessStatus(next);
  });
}

function normalizePassword(value) {
  const password = String(value || "");
  if (password.length < 4 || password.length > 128 || !password.trim()) {
    throw new HttpsError("invalid-argument", "Password must be 4 to 128 characters.");
  }
  return password;
}

function hashAccessCode(accessCode, salt) {
  return crypto
    .createHash("sha256")
    .update(`${String(salt || "")}:${accessCode}`, "utf8")
    .digest("hex");
}

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, PASSWORD_HASH_ITERATIONS, PASSWORD_HASH_KEY_LENGTH, "sha256")
    .toString("hex");
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    passwordHashAlgorithm: "pbkdf2_sha256",
    passwordHashIterations: PASSWORD_HASH_ITERATIONS,
    passwordVersion: 1
  };
}

function buildTemporaryMemberPassword(identity) {
  const grade = Number(identity.grade);
  const classNumber = Number(identity.classNumber);
  const studentNumber = Number(identity.studentNumber);
  if (!grade || !classNumber || !studentNumber) {
    throw new HttpsError("invalid-argument", "Invalid member identity.");
  }
  return `${grade}${classNumber}${String(studentNumber).padStart(2, "0")}`;
}

function verifyPassword(password, credentials) {
  const salt = String(credentials.passwordSalt || "");
  const expectedHash = String(credentials.passwordHash || "");
  if (!salt || !expectedHash) return false;
  const iterations = Number(credentials.passwordHashIterations || PASSWORD_HASH_ITERATIONS);
  const actualHash = crypto
    .pbkdf2Sync(password, salt, iterations, PASSWORD_HASH_KEY_LENGTH, "sha256")
    .toString("hex");
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function buildMemberProfileForRegistration(identity, nickname, authUid) {
  const normalizedSchool = normalizeLegacyMemberSchool(identity.school);
  return {
    school: normalizedSchool,
    grade: Number(identity.grade),
    classNumber: Number(identity.classNumber),
    studentNumber: Number(identity.studentNumber),
    nickname,
    name: nickname,
    role: "student",
    status: "active",
    active: true,
    authUid,
    authLinkedAt: FieldValue.serverTimestamp(),
    authLinkProvider: "firebase_member_password_signup",
    authLinkVersion: 5,
    passwordMode: "user_password",
    initialPasswordChanged: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    migrationSource: "firebase_app_signup"
  };
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function dateToTimestamp(dateValue) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return Timestamp.fromDate(parsed);
}

function timestampToIsoString(value) {
  const millis = timestampToMillis(value);
  return millis ? new Date(millis).toISOString() : "";
}

function assertActiveStudent(memberData) {
  if (!memberData || memberData.role !== "student") {
    throw new HttpsError("failed-precondition", "Member is not an active student.");
  }
  if (memberData.status !== "active" || memberData.active !== true) {
    throw new HttpsError("failed-precondition", "Member is inactive.");
  }
}

function assertActiveMember(memberData) {
  if (!memberData || !["student", "admin"].includes(memberData.role)) {
    throw new HttpsError("failed-precondition", "Member is not active.");
  }
  if (memberData.status !== "active" || memberData.active !== true) {
    throw new HttpsError("failed-precondition", "Member is inactive.");
  }
}

async function getAdminMemberForAuth(authUid) {
  const snapshot = await db.collection("users")
    .where("authUid", "==", authUid)
    .where("role", "==", "admin")
    .limit(1)
    .get();
  if (snapshot.empty) {
    throw new HttpsError("permission-denied", "Admin permission is required.");
  }
  const doc = snapshot.docs[0];
  const data = doc.data() || {};
  if (data.status !== "active" || data.active !== true) {
    throw new HttpsError("permission-denied", "Admin member is inactive.");
  }
  const isSuperAdmin = doc.id === SUPER_ADMIN_MEMBER_USER_ID
    || data.adminLevel === "superAdmin"
    || data.adminLevel === "fullAdmin";
  return {
    memberUserId: doc.id,
    memberData: data,
    adminLevel: isSuperAdmin ? "superAdmin" : "classAdmin",
    isSuperAdmin,
    scopeGrade: String(data.adminScopeGrade || data.grade || ""),
    scopeClassNumber: String(data.adminScopeClassNumber || data.classNumber || "")
  };
}

function assertSuperAdmin(adminMember) {
  if (!adminMember?.isSuperAdmin) {
    throw new HttpsError("permission-denied", "Full admin permission is required.");
  }
}

function isMemberInAdminScope(adminMember, memberData) {
  if (adminMember?.isSuperAdmin) return true;
  return String(memberData?.grade || "") === String(adminMember?.scopeGrade || "")
    && String(memberData?.classNumber || "") === String(adminMember?.scopeClassNumber || "");
}

function assertAdminCanAccessMember(adminMember, memberUserId, memberData, options = {}) {
  if (adminMember?.isSuperAdmin) return;
  if (memberUserId === adminMember?.memberUserId && options.allowSelf === true) return;
  if (!isMemberInAdminScope(adminMember, memberData)) {
    throw new HttpsError("permission-denied", "Member is outside admin class scope.");
  }
  if (memberData?.role === "admin" && options.allowAdminTarget !== true) {
    throw new HttpsError("permission-denied", "Class admin cannot manage admins.");
  }
}

async function writeAdminLog({ adminUserId, action, targetUserId, before, after, reason }) {
  await db.collection("adminLogs").add({
    adminUserId,
    action,
    targetUserId: targetUserId || "",
    before: before || null,
    after: after || null,
    reason: reason || "",
    createdAt: FieldValue.serverTimestamp()
  });
}

function publicAdminLogRow(doc) {
  const data = doc.data ? doc.data() || {} : doc || {};
  return {
    id: doc.id || data.id || "",
    adminUserId: data.adminUserId || "",
    action: data.action || "",
    targetUserId: data.targetUserId || "",
    reason: data.reason || "",
    createdAt: data.createdAt || null
  };
}

function assertAccessCodeUsable(accessData) {
  if (!accessData || accessData.active !== true) {
    throw new HttpsError("permission-denied", "Access code is not active.");
  }
  if (!accessData.codeHash || !accessData.salt) {
    throw new HttpsError("failed-precondition", "Access code is not configured.");
  }
  const expiresAtMillis = timestampToMillis(accessData.expiresAt);
  if (expiresAtMillis && expiresAtMillis <= Date.now()) {
    throw new HttpsError("permission-denied", "Access code expired.");
  }
  if (accessData.usedAt && (accessData.oneTime === true || accessData.consumeOnUse === true)) {
    throw new HttpsError("permission-denied", "Access code already used.");
  }
  const failedAttempts = Number(accessData.failedAttempts || 0);
  const maxFailedAttempts = Number(accessData.maxFailedAttempts || MAX_FAILED_ATTEMPTS);
  if (maxFailedAttempts > 0 && failedAttempts >= maxFailedAttempts) {
    throw new HttpsError("resource-exhausted", "Access code is locked.");
  }
}

function assertAccessCodeMatches(accessCode, accessData) {
  const expectedHash = hashAccessCode(accessCode, accessData.salt);
  if (expectedHash !== accessData.codeHash) {
    throw new HttpsError("permission-denied", "Access code mismatch.");
  }
}

function isClassroomStudentCardVisible(memberUserId, memberData = {}) {
  if(memberData.classroomHidden === true || memberData.hiddenFromClassroom === true) return false;
  if(memberData.classroomHidden === false || memberData.hiddenFromClassroom === false) return true;
  return !HIDDEN_CLASSROOM_STUDENT_CARD_MEMBER_USER_IDS.has(String(memberUserId || "").trim());
}

function publicMemberProfile(memberId, memberData) {
  return {
    userId: memberId,
    nickname: memberData.nickname || "",
    school: memberData.school || DEFAULT_MEMBER_SCHOOL,
    grade: memberData.grade || null,
    classNumber: memberData.classNumber || null,
    studentNumber: memberData.studentNumber || null,
    role: memberData.role || "",
    status: memberData.status || "",
    active: memberData.active === true,
    classroomHidden: !isClassroomStudentCardVisible(memberId, memberData)
  };
}

function publicSetupSettings(settings) {
  return {
    setupEnabled: settings.setupEnabled === true,
    signupEnabled: settings.signupEnabled !== false,
    temporaryPasswordLoginEnabled: settings.temporaryPasswordLoginEnabled !== false,
    setupExpiresAt: settings.setupExpiresAt || null,
    minPasswordLength: Number(settings.minPasswordLength || 4),
    maxFailedAttempts: Number(settings.maxFailedAttempts || MAX_FAILED_ATTEMPTS),
    lockMinutes: Number(settings.lockMinutes || 10)
  };
}

function publicAdminPasswordSetupSettings(settings) {
  const normalized = publicSetupSettings(settings || {});
  return {
    ...normalized,
    setupExpiresAtIso: timestampToIsoString(normalized.setupExpiresAt),
    nicknameCheckEnabled: settings?.nicknameCheckEnabled !== false
  };
}

function normalizeAdminPasswordSetupSettings(payload) {
  const signupEnabled = payload.signupEnabled !== false;
  const temporaryPasswordLoginEnabled = payload.temporaryPasswordLoginEnabled !== false;
  const setupEnabled = payload.setupEnabled !== undefined ? payload.setupEnabled !== false : temporaryPasswordLoginEnabled;
  const setupExpiresAt = dateToTimestamp(payload.setupExpiresAt || DEFAULT_PASSWORD_SETUP_EXPIRES_AT);
  const minPasswordLength = Number(payload.minPasswordLength || 4);
  const maxFailedAttempts = Number(payload.maxFailedAttempts || MAX_FAILED_ATTEMPTS);
  const lockMinutes = Number(payload.lockMinutes || 10);

  if (!setupExpiresAt) {
    throw new HttpsError("invalid-argument", "setupExpiresAt must be a valid date.");
  }
  if (!Number.isInteger(minPasswordLength) || minPasswordLength < 4 || minPasswordLength > 32) {
    throw new HttpsError("invalid-argument", "minPasswordLength must be between 4 and 32.");
  }
  if (!Number.isInteger(maxFailedAttempts) || maxFailedAttempts < 1 || maxFailedAttempts > 20) {
    throw new HttpsError("invalid-argument", "maxFailedAttempts must be between 1 and 20.");
  }
  if (!Number.isInteger(lockMinutes) || lockMinutes < 1 || lockMinutes > 240) {
    throw new HttpsError("invalid-argument", "lockMinutes must be between 1 and 240.");
  }

  return {
    setupEnabled,
    signupEnabled,
    temporaryPasswordLoginEnabled,
    setupExpiresAt,
    nicknameCheckEnabled: true,
    minPasswordLength,
    maxFailedAttempts,
    lockMinutes
  };
}

function normalizeId(value, fieldName) {
  const id = String(value || "").trim();
  if (!id || id.length > 160 || id.includes("/")) {
    throw new HttpsError("invalid-argument", `Invalid ${fieldName}.`);
  }
  return id;
}

function rewardLogId(parts) {
  return parts
    .map(part => String(part || "").trim().replace(/[^0-9A-Za-z가-힣:_-]+/g, "-"))
    .filter(Boolean)
    .join("__")
    .slice(0, 1400);
}

function xpRequiredForNextLevel(level) {
  const safeLevel = Math.max(1, Math.min(LEVEL_MAX, Math.round(Number(level) || 1)));
  if (safeLevel >= LEVEL_MAX) return 0;
  return LEVEL_XP_PER_LEVEL;
}

function getLevelTier(level) {
  const safeLevel = Math.max(1, Math.min(LEVEL_MAX, Math.round(Number(level) || 1)));
  if (safeLevel >= 36) return "gold";
  if (safeLevel >= 16) return "silver";
  return "bronze";
}

function getLevelMedalId(level) {
  const safeLevel = Math.max(1, Math.min(LEVEL_MAX, Math.round(Number(level) || 1)));
  return `${getLevelTier(safeLevel)}-${String(safeLevel).padStart(2, "0")}`;
}

function getRankIconUrlForLevel(level) {
  return `/images/level-ranks/${getLevelTier(level)}-rank.png`;
}

function computeLevelSummary(totalXpInput) {
  const totalXp = Math.max(0, Math.round(Number(totalXpInput) || 0));
  let level = 1;
  let spent = 0;
  while (level < LEVEL_MAX) {
    const required = xpRequiredForNextLevel(level);
    if (totalXp - spent < required) break;
    spent += required;
    level += 1;
  }
  const xp = totalXp - spent;
  const nextLevelXp = xpRequiredForNextLevel(level);
  return {
    level,
    xp,
    totalXp,
    nextLevelXp,
    maxLevel: LEVEL_MAX,
    tier: getLevelTier(level),
    medalId: getLevelMedalId(level),
    rankIconUrl: getRankIconUrlForLevel(level)
  };
}

async function applyLevelXp(transaction, {
  memberUserId,
  authUid,
  memberData = null,
  xpDelta,
  sourceType,
  sourceId,
  sourceLabel,
  dateKey = getKstDateKey(),
  capKey = "",
  capLimit = 0,
  caps = [],
  classroomPointMirrorAmount = 0,
  extra = {}
}) {
  const safeXpDelta = Math.max(0, Math.round(Number(xpDelta) || 0));
  const summaryRef = db.collection("userLevelSummary").doc(memberUserId);
  const logRef = db.collection("levelXpLogs").doc(rewardLogId([
    "level_xp",
    sourceType,
    memberUserId,
    sourceId
  ]));
  const capSpecs = (Array.isArray(caps) && caps.length ? caps : (capKey ? [{ capKey, capLimit, dateKey }] : []))
    .map(cap => ({
      capKey: String(cap?.capKey || "").trim(),
      capLimit: Math.max(0, Math.round(Number(cap?.capLimit) || 0)),
      dateKey: String(cap?.dateKey || dateKey || "").trim()
    }))
    .filter(cap => cap.capKey);
  const capRefs = capSpecs.map(cap => db.collection("levelXpCaps").doc(cap.capKey));
  const classroomLevelRewardClassId = memberData ? getClassIdForMember(memberData) : "";
  const classroomLevelRewardWalletRef = classroomLevelRewardClassId
    ? db.collection("classrooms").doc(classroomLevelRewardClassId).collection("studentWallets").doc(memberUserId)
    : null;
  const readSnapshots = await Promise.all([
    transaction.get(summaryRef),
    transaction.get(logRef),
    ...capRefs.map(ref => transaction.get(ref)),
    ...(classroomLevelRewardWalletRef ? [transaction.get(classroomLevelRewardWalletRef)] : [])
  ]);
  const summarySnapshot = readSnapshots[0];
  const logSnapshot = readSnapshots[1];
  const capSnapshots = readSnapshots.slice(2, 2 + capRefs.length);
  const classroomLevelRewardWalletSnapshot = classroomLevelRewardWalletRef ? readSnapshots[2 + capRefs.length] : null;

  const before = computeLevelSummary(summarySnapshot.exists ? summarySnapshot.data()?.totalXp : 0);
  if (logSnapshot.exists || safeXpDelta <= 0 || before.level >= LEVEL_MAX) {
    return {
      duplicate: logSnapshot.exists,
      xpDelta: 0,
      before,
      after: before,
      leveledUp: false,
      levelSummaryPath: summaryRef.path,
      levelXpLogPath: logRef.path
    };
  }

  const allowedXp = capSpecs.reduce((allowed, cap, index) => {
    if (cap.capLimit <= 0) return allowed;
    const capData = capSnapshots[index]?.exists ? capSnapshots[index].data() || {} : {};
    const usedXp = Math.max(0, Math.round(Number(capData.xp) || 0));
    return Math.min(allowed, Math.max(0, cap.capLimit - usedXp));
  }, safeXpDelta);
  const appliedXp = Math.min(safeXpDelta, allowedXp);
  if (appliedXp <= 0) {
    transaction.set(logRef, {
      type: "level_xp_skipped",
      memberUserId,
      userId: memberUserId,
      authUid,
      sourceType,
      sourceId,
      sourceLabel: sourceLabel || "",
      requestedXp: safeXpDelta,
      xpDelta: 0,
      skipReason: "cap-reached",
      capKeys: capSpecs.map(cap => cap.capKey),
      createdAt: FieldValue.serverTimestamp(),
      ...extra
    }, { merge: false });
    return {
      duplicate: false,
      xpDelta: 0,
      before,
      after: before,
      leveledUp: false,
      capped: true,
      levelSummaryPath: summaryRef.path,
      levelXpLogPath: logRef.path
    };
  }

  const after = computeLevelSummary(before.totalXp + appliedXp);
  const gainedLevelCount = Math.max(0, after.level - before.level);
  const levelRewardCoin = gainedLevelCount * LEVEL_UP_REWARD_COIN;
  const classroomWalletData = classroomLevelRewardWalletSnapshot?.exists ? classroomLevelRewardWalletSnapshot.data() || {} : {};
  const classroomLevelReward = getBoostedClassroomPointAmount(
    gainedLevelCount * LEVEL_UP_CLASSROOM_POINT,
    classroomWalletData
  );
  const classroomMirrorReward = getBoostedClassroomPointAmount(
    classroomPointMirrorAmount,
    classroomWalletData
  );
  transaction.set(summaryRef, {
    memberUserId,
    userId: memberUserId,
    level: after.level,
    xp: after.xp,
    totalXp: after.totalXp,
    nextLevelXp: after.nextLevelXp,
    maxLevel: LEVEL_MAX,
    tier: after.tier,
    medalId: after.medalId,
    rankIconUrl: after.rankIconUrl,
    updatedAt: FieldValue.serverTimestamp(),
    ...(gainedLevelCount > 0 ? { lastLevelRewardAt: FieldValue.serverTimestamp() } : {})
  }, { merge: true });
  if (levelRewardCoin > 0) {
    const economyRef = db.collection("userEconomy").doc(memberUserId);
    transaction.set(economyRef, {
      userId: memberUserId,
      djCoin: FieldValue.increment(levelRewardCoin),
      totalEarned: FieldValue.increment(levelRewardCoin),
      updatedAt: FieldValue.serverTimestamp(),
      lastLevelRewardAt: FieldValue.serverTimestamp(),
      source: "level_up_reward_function"
    }, { merge: true });
  }
  if (classroomLevelRewardWalletRef && classroomLevelReward.rewardAmount > 0) {
    const levelRewardPointLogId = rewardLogId([
      "classroom_level_up_reward",
      classroomLevelRewardClassId,
      memberUserId,
      sourceType,
      sourceId
    ]);
    transaction.set(classroomLevelRewardWalletRef, {
      memberUserId,
      userId: memberUserId,
      classId: classroomLevelRewardClassId,
      point: FieldValue.increment(classroomLevelReward.rewardAmount),
      totalEarnedPoint: FieldValue.increment(classroomLevelReward.rewardAmount),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomLevelRewardAt: FieldValue.serverTimestamp(),
      source: "level_up_reward_function"
    }, { merge: true });
    transaction.set(db.collection("classrooms").doc(classroomLevelRewardClassId).collection("pointLogs").doc(levelRewardPointLogId), {
      type: "classroom_level_up_reward",
      classId: classroomLevelRewardClassId,
      userId: memberUserId,
      memberUserId,
      authUid,
      rewardCurrency: "point",
      rewardPoint: classroomLevelReward.rewardAmount,
      rewardAmount: classroomLevelReward.rewardAmount,
      baseRewardAmount: classroomLevelReward.baseAmount,
      boostPoint: classroomLevelReward.boostPoint,
      beforeLevel: before.level,
      afterLevel: after.level,
      gainedLevelCount,
      sourceType,
      sourceId,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
  }
  if (classroomLevelRewardWalletRef && classroomMirrorReward.rewardAmount > 0) {
    const mirrorPointLogId = rewardLogId([
      "dj_coin_mirror_point",
      classroomLevelRewardClassId,
      memberUserId,
      sourceType || "dj_coin_reward",
      sourceId || Date.now()
    ]);
    transaction.set(classroomLevelRewardWalletRef, {
      memberUserId,
      userId: memberUserId,
      classId: classroomLevelRewardClassId,
      point: FieldValue.increment(classroomMirrorReward.rewardAmount),
      totalEarnedPoint: FieldValue.increment(classroomMirrorReward.rewardAmount),
      updatedAt: FieldValue.serverTimestamp(),
      lastDjCoinMirrorPointAt: FieldValue.serverTimestamp(),
      source: sourceType || "dj_coin_mirror_point"
    }, { merge: true });
    transaction.set(db.collection("classrooms").doc(classroomLevelRewardClassId).collection("pointLogs").doc(mirrorPointLogId), {
      type: "dj_coin_mirror_point",
      classId: classroomLevelRewardClassId,
      userId: memberUserId,
      memberUserId,
      authUid,
      rewardCurrency: "point",
      rewardPoint: classroomMirrorReward.rewardAmount,
      rewardAmount: classroomMirrorReward.rewardAmount,
      baseRewardAmount: classroomMirrorReward.baseAmount,
      boostPoint: classroomMirrorReward.boostPoint,
      sourceType: sourceType || "dj_coin_reward",
      sourceId: sourceId || "",
      sourceLabel: sourceLabel || "",
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
  }
  transaction.set(logRef, {
    type: "level_xp",
    memberUserId,
    userId: memberUserId,
    authUid,
    sourceType,
    sourceId,
    sourceLabel: sourceLabel || "",
    requestedXp: safeXpDelta,
    xpDelta: appliedXp,
    beforeLevel: before.level,
    afterLevel: after.level,
    beforeTotalXp: before.totalXp,
    afterTotalXp: after.totalXp,
    leveledUp: gainedLevelCount > 0,
    gainedLevelCount,
    levelRewardCoin,
    levelRewardPoint: classroomLevelReward.rewardAmount,
    levelRewardBasePoint: classroomLevelReward.baseAmount,
    levelRewardBoostPoint: classroomLevelReward.boostPoint,
    classroomMirrorPoint: classroomMirrorReward.rewardAmount,
    classroomMirrorBasePoint: classroomMirrorReward.baseAmount,
    classroomMirrorBoostPoint: classroomMirrorReward.boostPoint,
    createdAt: FieldValue.serverTimestamp(),
    ...extra
  }, { merge: false });
  capRefs.forEach((capRef, index) => {
    const cap = capSpecs[index];
    transaction.set(capRef, {
      memberUserId,
      userId: memberUserId,
      dateKey: cap.dateKey,
      capKey: cap.capKey,
      xp: FieldValue.increment(appliedXp),
      capLimit: cap.capLimit,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
  return {
    duplicate: false,
    xpDelta: appliedXp,
    before,
    after,
    leveledUp: gainedLevelCount > 0,
    gainedLevelCount,
    levelReward: {
      djCoin: levelRewardCoin,
      point: classroomLevelReward.rewardAmount,
      basePoint: classroomLevelReward.baseAmount,
      boostPoint: classroomLevelReward.boostPoint
    },
    classroomMirror: {
      point: classroomMirrorReward.rewardAmount,
      basePoint: classroomMirrorReward.baseAmount,
      boostPoint: classroomMirrorReward.boostPoint
    },
    capped: capSpecs.some(cap => cap.capLimit > 0) && appliedXp < safeXpDelta,
    levelSummaryPath: summaryRef.path,
    levelXpLogPath: logRef.path
  };
}

function hashStringForSelection(value) {
  return crypto.createHash("sha1").update(String(value || "")).digest().readUInt32BE(0);
}

function getDailyEventQuestSelection(dateKey = getKstDateKey()) {
  const pool = EVENT_DAILY_QUEST_POOL.map(quest => ({ ...quest }));
  return pool
    .map(quest => ({
      quest,
      sort: hashStringForSelection(`${dateKey}:${quest.questId}`)
    }))
    .sort((a, b) => a.sort - b.sort || a.quest.questId.localeCompare(b.quest.questId))
    .slice(0, 3)
    .map(entry => entry.quest);
}

function getActiveEventQuests(dateKey = getKstDateKey()) {
  return [
    ...getDailyEventQuestSelection(dateKey),
    ...EVENT_WEEKLY_QUESTS.map(quest => ({ ...quest }))
  ];
}

function getEventQuestPeriodKey(quest, dateKey = getKstDateKey(), weekKey = getKstWeekKey()) {
  return quest.scope === "weekly" ? weekKey : dateKey;
}

function getEventProgressId(memberUserId, quest, dateKey = getKstDateKey(), weekKey = getKstWeekKey()) {
  return rewardLogId([
    memberUserId,
    quest.scope || "daily",
    getEventQuestPeriodKey(quest, dateKey, weekKey),
    quest.questId
  ]);
}

function getEventRewardLogId(memberUserId, quest, dateKey = getKstDateKey(), weekKey = getKstWeekKey(), attempt = 1) {
  return rewardLogId([
    "event_quest",
    quest.scope || "daily",
    getEventQuestPeriodKey(quest, dateKey, weekKey),
    memberUserId,
    quest.questId,
    attempt
  ]);
}

function getWeeklyLevelXpCap(memberUserId, weekKey = getKstWeekKey()) {
  return {
    capKey: rewardLogId(["level_xp_weekly", weekKey, memberUserId]),
    capLimit: WEEKLY_XP_LIMIT,
    dateKey: weekKey
  };
}

function getTodayQuizDailyLevelXpCap(memberUserId, dateKey = getKstDateKey()) {
  return {
    capKey: rewardLogId(["today_quiz_xp_daily", dateKey, memberUserId]),
    capLimit: TODAY_QUIZ_DAILY_XP_LIMIT,
    dateKey
  };
}

function getStableHash(text) {
  return String(text || "").split("").reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }, 0);
}

function getDailyShuffledQuizIds(ids = [], dateKey = getKstDateKey()) {
  return ids.slice().sort((a, b) => {
    const left = getStableHash(`${dateKey}:${a}`);
    const right = getStableHash(`${dateKey}:${b}`);
    return left - right || String(a).localeCompare(String(b));
  });
}

function getTodayQuizIds(flags = {}) {
  const manualIds = Array.isArray(flags.todayQuizIds) ? flags.todayQuizIds : [];
  const poolIds = Array.isArray(flags.todayQuizRandomPoolIds) ? flags.todayQuizRandomPoolIds : [];
  const ids = flags.todayQuizMode === "dailyRandom"
    ? getDailyShuffledQuizIds(poolIds, `${getKstDateKey()}:${flags.todayQuizShuffleSeed || ""}`).slice(0, Math.max(1, Number(flags.todayQuizDailyCount) || 1))
    : manualIds;
  return new Set(ids
    .map(id => String(id || "").trim())
    .filter(Boolean));
}

function getPracticeQuestKindsForQuiz(quizId) {
  const id = String(quizId || "").trim();
  const kinds = new Set();
  if (id === "spelling") kinds.add("spellingCorrect");
  if (id === "random-basic" || id === "fraction-basic") kinds.add("mathCorrect");
  if (["word-relation", "proverb", "spacing", "idiom"].includes(id)) kinds.add("vocabCorrect");
  if (id === "gmo" || id === "time_store") kinds.add("readingCorrect");
  if (id === "samgukji" || id === "ancient-history" || id === "regional-specialties" || id === "unified-silla-balhae" || id === "cultural_heritage") kinds.add("socialCorrect");
  if (id === "science-grade4" || id === "science-general") kinds.add("scienceCorrect");
  if (["flag-country", "snack-food", "emoji-kpop", "emoji-anime", "emoji-tiniping"].includes(id)) kinds.add("popularCorrect");
  if (["spelling", "word-relation", "proverb", "spacing", "idiom", "gmo", "time_store", "random-basic", "fraction-basic", "samgukji", "ancient-history", "regional-specialties", "unified-silla-balhae", "cultural_heritage", "science-grade4", "science-general", "flag-country", "snack-food", "emoji-kpop", "emoji-anime", "emoji-tiniping"].includes(id)) {
    kinds.add("studyCorrect");
  }
  return kinds;
}

function updateEventQuestProgressForKinds(transaction, {
  memberUserId,
  dateKey = getKstDateKey(),
  weekKey = getKstWeekKey(),
  kinds,
  amount = 1,
  sourceType,
  sourceId
}) {
  const kindSet = kinds instanceof Set ? kinds : new Set(kinds || []);
  if (!kindSet.size || amount <= 0) return;
  getActiveEventQuests(dateKey)
    .filter(quest => kindSet.has(quest.kind))
    .forEach(quest => {
      const progressRef = db.collection("eventQuestProgress")
        .doc(getEventProgressId(memberUserId, quest, dateKey, weekKey));
      transaction.set(progressRef, {
        progressId: progressRef.id,
        memberUserId,
        userId: memberUserId,
        questId: quest.questId,
        scope: quest.scope || "daily",
        periodKey: getEventQuestPeriodKey(quest, dateKey, weekKey),
        dateKey,
        weekKey,
        current: FieldValue.increment(amount),
        target: quest.target,
        kind: quest.kind,
        lastSourceType: sourceType || "",
        lastSourceId: sourceId || "",
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });
}

function slugifyClassroomGemId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-z가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeClassroomQuest(rawQuest = {}, index = 0) {
  const rawId = String(rawQuest.id || rawQuest.questId || "").trim();
  const id = rawId || `quest-${index + 1}`;
  const rewardCoin = Math.max(0, Math.min(1000, Math.round(Number(rawQuest.rewardCoin) || 0)));
  const rewardCurrency = "point";
  const rewardMode = ["auto", "teacherReview", "quizAchieved"].includes(rawQuest.rewardMode)
    ? rawQuest.rewardMode
    : "auto";
  const rewardLabel = "포인트";
  const linkedGemName = String(rawQuest.linkedGemName || "").trim().slice(0, 40);
  const linkedGemId = slugifyClassroomGemId(rawQuest.linkedGemId || linkedGemName);
  const gemXp = linkedGemId ? Math.max(0, Math.min(100, Math.round(Number(rawQuest.gemXp) || 0))) : 0;
  const repeatRule = ["once", "daily", "weekly"].includes(rawQuest.repeatRule) ? rawQuest.repeatRule : "once";
  const targetStudentIds = Array.isArray(rawQuest.targetStudentIds)
    ? rawQuest.targetStudentIds.map(value => String(value || "").trim().slice(0, 80)).filter(Boolean).slice(0, 80)
    : [];
  return {
    id,
    questId: id,
    title: String(rawQuest.title || "교실 퀘스트").trim().slice(0, 60),
    desc: String(rawQuest.desc || "").trim().slice(0, 180),
    type: String(rawQuest.type || rawQuest.questType || "수락형 · 체크형").trim().slice(0, 40),
    questType: String(rawQuest.questType || rawQuest.type || "수락형 · 체크형").trim().slice(0, 40),
    rewardMode,
    rewardCoin,
    rewardCurrency,
    targetStudentIds,
    repeatRule,
    saveEnabled: rawQuest.saveEnabled !== false,
    active: rawQuest.active !== false,
    linkedGemId,
    linkedGemName,
    gemXp,
    gemTargetXp: linkedGemId ? Math.max(1, Math.min(1000, Math.round(Number(rawQuest.gemTargetXp) || 10))) : 10,
    gemRewardPoint: linkedGemId ? Math.max(0, Math.min(1000, Math.round(Number(rawQuest.gemRewardPoint) || 0))) : 0,
    studentAction: String(rawQuest.studentAction || (rewardMode === "auto" ? `완료하고 ${rewardCoin} ${rewardLabel} 받기` : "완료 체크")).trim().replace(/코인/g, "포인트").replace(/베리/g, "포인트").slice(0, 60)
  };
}

async function applyClassroomGemProgress(transaction, {
  classId,
  memberUserId,
  quest,
  authUid,
  source,
  progressPath
}) {
  const gemId = slugifyClassroomGemId(quest?.linkedGemId || quest?.linkedGemName);
  const gemXp = Math.max(0, Math.min(100, Math.round(Number(quest?.gemXp) || 0)));
  if (!gemId || gemXp <= 0) return null;

  const gemName = String(quest?.linkedGemName || gemId).trim().slice(0, 40);
  const targetXp = Math.max(1, Math.min(1000, Math.round(Number(quest?.gemTargetXp) || 10)));
  const rewardPoint = Math.max(0, Math.min(1000, Math.round(Number(quest?.gemRewardPoint) || 0)));
  const progressId = `${memberUserId}__${gemId}`;
  const gemRef = db.collection("classrooms")
    .doc(classId)
    .collection("studentGemProgress")
    .doc(progressId);
  const gemSnapshot = await transaction.get(gemRef);
  const previous = gemSnapshot.exists ? gemSnapshot.data() || {} : {};
  const previousXp = Math.max(0, Math.round(Number(previous.currentXp) || 0));
  const nextXp = previousXp + gemXp;
  const wasCompleted = previous.completed === true || previousXp >= targetXp;
  const isCompleted = nextXp >= targetXp;
  const newlyCompleted = isCompleted && !wasCompleted;
  const awardLogId = rewardLogId([
    "classroom_gem_award",
    classId,
    memberUserId,
    gemId
  ]);
  const awardLogRef = db.collection("rewardLogs").doc(awardLogId);
  const awardLogSnapshot = newlyCompleted && rewardPoint > 0 ? await transaction.get(awardLogRef) : null;
  const canAward = newlyCompleted && rewardPoint > 0 && !awardLogSnapshot?.exists;

  transaction.set(gemRef, {
    progressId,
    classId,
    memberUserId,
    userId: memberUserId,
    gemId,
    gemName,
    currentXp: nextXp,
    totalXp: FieldValue.increment(gemXp),
    targetXp,
    rewardPoint,
    completed: isCompleted,
    status: isCompleted ? "completed" : "in_progress",
    lastQuestId: quest?.id || quest?.questId || "",
    lastQuestTitle: quest?.title || "",
    lastProgressPath: progressPath || "",
    updatedAt: FieldValue.serverTimestamp(),
    ...(newlyCompleted ? { completedAt: FieldValue.serverTimestamp() } : {})
  }, { merge: true });

  if (canAward) {
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
    const pointLogRef = db.collection("classrooms").doc(classId).collection("pointLogs").doc(awardLogId);
    transaction.set(walletRef, {
      memberUserId,
      userId: memberUserId,
      classId,
      point: FieldValue.increment(rewardPoint),
      totalEarnedPoint: FieldValue.increment(rewardPoint),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomGemRewardAt: FieldValue.serverTimestamp(),
      source: source || "classroom_gem_progress_function"
    }, { merge: true });
    transaction.set(pointLogRef, {
      type: "classroom_gem_award",
      classId,
      gemId,
      gemName,
      userId: memberUserId,
      memberUserId,
      authUid,
      rewardCurrency: "point",
      rewardPoint,
      rewardAmount: rewardPoint,
      progressPath: progressPath || "",
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    transaction.set(awardLogRef, {
      type: "classroom_gem_award",
      classId,
      gemId,
      gemName,
      userId: memberUserId,
      memberUserId,
      authUid,
      rewardCurrency: "point",
      rewardCoin: 0,
      rewardPoint,
      rewardAmount: rewardPoint,
      progressPath: progressPath || "",
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
  }

  return {
    gemId,
    gemName,
    gemXp,
    currentXp: nextXp,
    targetXp,
    completed: isCompleted,
    newlyCompleted,
    rewardPoint: canAward ? rewardPoint : 0
  };
}

function getClassIdForMember(memberData = {}) {
  const grade = String(memberData.grade || "").trim();
  const classNumber = String(memberData.classNumber || "").trim();
  if (!grade || !classNumber || memberData.role === "admin") return "";
  return `G${grade}-C${classNumber}`;
}

function getClassroomPointAmount(wallet = {}) {
  return Number(wallet.point ?? wallet.berry ?? 0) || 0;
}

function roundClassroomPoint(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function getClassroomPointBoostAmount(wallet = {}) {
  return roundClassroomPoint(wallet.pointBoostAmount ?? wallet.pointBoost ?? 0);
}

function getBoostedClassroomPointAmount(baseAmount, wallet = {}) {
  const base = roundClassroomPoint(baseAmount);
  const boostPoint = base > 0 ? Math.max(0, getClassroomPointBoostAmount(wallet)) : 0;
  return {
    baseAmount: base,
    boostPoint,
    rewardAmount: roundClassroomPoint(base + boostPoint)
  };
}

function normalizeClassroomBoostItemForWallet(item = {}) {
  return {
    itemId: String(item.itemId || "").slice(0, 80),
    title: String(item.title || "").slice(0, 40),
    icon: String(item.icon || "").slice(0, 40),
    boostPoint: roundClassroomPoint(item.boostPoint || 0)
  };
}

function normalizeClassroomEquippedItemForWallet(item = {}) {
  return {
    purchaseId: String(item.purchaseId || "").slice(0, 180),
    itemId: String(item.itemId || "").slice(0, 80),
    title: String(item.title || item.itemTitle || "").slice(0, 40),
    icon: String(item.icon || item.itemIcon || "").slice(0, 40),
    itemType: String(item.itemType || "").slice(0, 40)
  };
}

function getDefaultClassroomShopItem(itemId) {
  const id = String(itemId || "");
  if (id === CLASSROOM_BILLBOARD_TICKET_ITEM_ID) return DEFAULT_CLASSROOM_BILLBOARD_ITEM;
  return DEFAULT_CLASSROOM_POINT_BOOST_ITEMS.find(item => item.itemId === id) || null;
}

function normalizeClassroomMission(rawMission = {}) {
  const thresholds = Array.isArray(rawMission.thresholds) ? rawMission.thresholds : DEFAULT_CLASSROOM_MISSION.thresholds;
  return {
    missionId: "current",
    title: String(rawMission.title || DEFAULT_CLASSROOM_MISSION.title).trim().slice(0, 50),
    desc: String(rawMission.desc || DEFAULT_CLASSROOM_MISSION.desc).trim().slice(0, 160),
    thresholds: thresholds
      .map((item, index) => ({
        label: String(item?.label || `${index + 1}단계`).trim().slice(0, 30),
        targetPoint: Math.max(1, Math.min(1000000, Math.round(Number(item?.targetPoint) || 0))),
        rewardText: String(item?.rewardText || "").trim().slice(0, 80)
      }))
      .filter(item => item.targetPoint > 0)
      .sort((a, b) => a.targetPoint - b.targetPoint)
      .slice(0, 6),
    active: rawMission.active !== false
  };
}

function publicClassroomMission(mission = {}, totalPoint = 0) {
  const normalized = normalizeClassroomMission(mission);
  const safeTotal = Math.max(0, Math.round(Number(totalPoint) || 0));
  const nextThreshold = normalized.thresholds.find(item => safeTotal < item.targetPoint) || null;
  return {
    ...normalized,
    totalPoint: safeTotal,
    achievedCount: normalized.thresholds.filter(item => safeTotal >= item.targetPoint).length,
    nextTargetPoint: nextThreshold ? nextThreshold.targetPoint : 0,
    remainingPoint: nextThreshold ? Math.max(0, nextThreshold.targetPoint - safeTotal) : 0,
    thresholds: normalized.thresholds.map(item => ({
      ...item,
      achieved: safeTotal >= item.targetPoint
    }))
  };
}

function normalizeClassroomGroupPurchase(rawItem = {}) {
  const title = String(rawItem.title || "").trim().slice(0, 50);
  const groupPurchaseId = normalizeId(rawItem.groupPurchaseId || slugifyClassroomGemId(title || "group-purchase"), "groupPurchaseId");
  return {
    groupPurchaseId,
    title,
    desc: String(rawItem.desc || "").trim().slice(0, 160),
    targetPoint: Math.max(1, Math.min(1000000, Math.round(Number(rawItem.targetPoint) || 0))),
    dueDate: isIsoDateKey(rawItem.dueDate) ? rawItem.dueDate : "",
    active: rawItem.active !== false,
    status: String(rawItem.status || "open").trim() || "open"
  };
}

function normalizeClassroomSavingsProduct(rawProduct = {}) {
  const title = String(rawProduct.title || "").trim().slice(0, 50);
  const productId = normalizeId(rawProduct.productId || slugifyClassroomGemId(title || "savings-product"), "productId");
  return {
    productId,
    title,
    desc: String(rawProduct.desc || "").trim().slice(0, 160),
    minDepositPoint: Math.max(1, Math.min(1000000, Math.round(Number(rawProduct.minDepositPoint || rawProduct.depositPoint) || 1))),
    interestRatePercent: Math.max(0, Math.min(100, Number(rawProduct.interestRatePercent) || 0)),
    termDays: Math.max(1, Math.min(365, Math.round(Number(rawProduct.termDays) || 7))),
    active: rawProduct.active !== false
  };
}

function normalizeClassroomExchangeSettings(rawSettings = {}) {
  return {
    pointToCoinEnabled: rawSettings.pointToCoinEnabled !== false,
    coinToPointEnabled: rawSettings.coinToPointEnabled !== false,
    pointToCoinPointCost: Math.max(1, Math.min(1000000, Math.round(Number(rawSettings.pointToCoinPointCost || DEFAULT_CLASSROOM_EXCHANGE_SETTINGS.pointToCoinPointCost) || DEFAULT_CLASSROOM_EXCHANGE_SETTINGS.pointToCoinPointCost))),
    coinToPointReward: Math.max(1, Math.min(1000000, Math.round(Number(rawSettings.coinToPointReward || DEFAULT_CLASSROOM_EXCHANGE_SETTINGS.coinToPointReward) || DEFAULT_CLASSROOM_EXCHANGE_SETTINGS.coinToPointReward)))
  };
}

function publicClassroomExchangeSettings(rawSettings = {}) {
  return normalizeClassroomExchangeSettings(rawSettings);
}

function normalizeClassroomTaxPreset(rawPreset = {}) {
  const title = String(rawPreset.title || rawPreset.reason || "").trim().slice(0, 50);
  const presetId = normalizeId(rawPreset.presetId || slugifyClassroomGemId(title || "tax-preset"), "presetId");
  return {
    presetId,
    title: title || "세금 프리셋",
    ratePercent: Math.max(0.1, Math.min(50, Number(rawPreset.ratePercent || 0))),
    reason: String(rawPreset.reason || title || "학급 공공 포인트 적립").trim().slice(0, 120),
    active: rawPreset.active !== false
  };
}

function normalizeClassroomGemConfig(rawGem = {}) {
  const gemName = String(rawGem.gemName || rawGem.title || rawGem.name || "").trim().slice(0, 40);
  const gemId = slugifyClassroomGemId(rawGem.gemId || gemName);
  return {
    gemId,
    gemName,
    targetXp: Math.max(1, Math.min(1000, Math.round(Number(rawGem.targetXp || rawGem.gemTargetXp) || 10))),
    rewardPoint: Math.max(0, Math.min(1000, Math.round(Number(rawGem.rewardPoint || rawGem.gemRewardPoint) || 0))),
    icon: String(rawGem.icon || "gemReading").trim().slice(0, 40),
    active: rawGem.active !== false
  };
}

function publicClassroomPublicWallet(data = {}) {
  return {
    point: Math.max(0, Math.round(Number(data.point || 0) || 0)),
    totalTaxPoint: Math.max(0, Math.round(Number(data.totalTaxPoint || 0) || 0)),
    totalSpentPoint: Math.max(0, Math.round(Number(data.totalSpentPoint || 0) || 0))
  };
}

function mirrorDjCoinRewardToClassroomPoint(transaction, {
  memberUserId,
  memberData,
  authUid,
  rewardAmount,
  sourceType,
  sourceId
}) {
  const amount = Math.max(0, Math.round(Number(rewardAmount) || 0));
  const classId = getClassIdForMember(memberData);
  if (!classId || amount <= 0) return null;
  const logId = rewardLogId([
    "dj_coin_mirror_point",
    classId,
    memberUserId,
    sourceType || "dj_coin_reward",
    sourceId || Date.now()
  ]);
  const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
  const pointLogRef = db.collection("classrooms").doc(classId).collection("pointLogs").doc(logId);
  transaction.set(walletRef, {
    memberUserId,
    userId: memberUserId,
    classId,
    point: FieldValue.increment(amount),
    totalEarnedPoint: FieldValue.increment(amount),
    updatedAt: FieldValue.serverTimestamp(),
    lastDjCoinMirrorPointAt: FieldValue.serverTimestamp(),
    source: sourceType || "dj_coin_mirror_point"
  }, { merge: true });
  transaction.set(pointLogRef, {
    type: "dj_coin_mirror_point",
    classId,
    userId: memberUserId,
    memberUserId,
    authUid,
    rewardCurrency: "point",
    rewardPoint: amount,
    rewardAmount: amount,
    sourceType: sourceType || "dj_coin_reward",
    sourceId: sourceId || "",
    source: "firebase_function",
    createdAt: FieldValue.serverTimestamp()
  }, { merge: false });
  return {
    classId,
    rewardPoint: amount,
    walletPath: walletRef.path,
    pointLogPath: pointLogRef.path
  };
}

function normalizeClassroomSettings(classId, data = {}) {
  const fallback = DEFAULT_CLASSROOM_SETTINGS[classId] || {
    classId,
    grade: "",
    classNumber: "",
    name: classId,
    entryCode: "",
    quests: []
  };
  const merged = { ...fallback, ...data, classId };
  const sourceQuests = Array.isArray(data.quests) && data.quests.length ? data.quests : fallback.quests;
  return {
    ...merged,
    grade: String(merged.grade || ""),
    classNumber: String(merged.classNumber || ""),
    quests: sourceQuests.map(normalizeClassroomQuest)
  };
}

async function loadClassroomSettingsForTransaction(transaction, classId) {
  const ref = db.collection("classrooms").doc(classId);
  const snapshot = await transaction.get(ref);
  return {
    ref,
    exists: snapshot.exists,
    settings: normalizeClassroomSettings(classId, snapshot.exists ? snapshot.data() || {} : {})
  };
}

function assertAdminCanManageClassroom(adminMember, settings) {
  if (adminMember?.isSuperAdmin) return;
  if (String(settings.grade || "") !== String(adminMember?.scopeGrade || "")
    || String(settings.classNumber || "") !== String(adminMember?.scopeClassNumber || "")) {
    throw new HttpsError("permission-denied", "Class admin cannot manage this classroom.");
  }
}

function assertMemberCanEnterClassroom(memberData, settings) {
  if (memberData?.role === "admin") {
    const isFullAdmin = memberData.adminLevel === "superAdmin" || memberData.adminLevel === "fullAdmin";
    if (isFullAdmin) return;
    const scopeGrade = String(memberData.adminScopeGrade || memberData.grade || "");
    const scopeClassNumber = String(memberData.adminScopeClassNumber || memberData.classNumber || "");
    if (scopeGrade === String(settings.grade || "") && scopeClassNumber === String(settings.classNumber || "")) return;
    throw new HttpsError("permission-denied", "Admin is outside classroom scope.");
  }
  if (String(memberData?.grade || "") !== String(settings.grade || "")
    || String(memberData?.classNumber || "") !== String(settings.classNumber || "")) {
    throw new HttpsError("permission-denied", "Member is outside classroom scope.");
  }
}

exports.verifyClassroomEntryCode = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const entryCode = String(payload.entryCode || "").trim();

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    const settings = classroomResult.settings;
    assertMemberCanEnterClassroom(memberData, settings);
    if (!entryCode || entryCode !== String(settings.entryCode || "").trim()) {
      throw new HttpsError("permission-denied", "Classroom entry code is invalid.");
    }
    return {
      className: settings.name || `${settings.grade}학년 ${settings.classNumber}반`,
      grade: settings.grade,
      classNumber: settings.classNumber
    };
  });

  return {
    success: true,
    classId,
    memberUserId,
    ...result
  };
});

function publicClassroomStudentCard(doc, wallet = {}, profile = {}, titleSummary = {}, economy = {}) {
  const data = doc.data() || {};
  const selectedBadge = profile.selectedBadge && typeof profile.selectedBadge === "object"
    ? profile.selectedBadge
    : {};
  const selectedKeyring = profile.selectedKeyring && typeof profile.selectedKeyring === "object"
    ? profile.selectedKeyring
    : {};
  return {
    memberUserId: doc.id,
    grade: String(data.grade || ""),
    classNumber: String(data.classNumber || ""),
    studentNumber: Number(data.studentNumber || 0),
    nickname: String(data.nickname || data.name || "").slice(0, 24),
    name: String(data.name || data.nickname || "").slice(0, 24),
    profileImageUrl: String(data.profileImageUrl || "").slice(0, 1200),
    point: getClassroomPointAmount(wallet),
    djCoin: Number(economy.djCoin ?? economy.coin ?? 0) || 0,
    pointBoostAmount: getClassroomPointBoostAmount(wallet),
    boostItems: Array.isArray(wallet.boostItems)
      ? wallet.boostItems.map(item => normalizeClassroomBoostItemForWallet(item)).filter(item => item.itemId).slice(0, 12)
      : [],
    equippedItems: Array.isArray(wallet.equippedItems)
      ? wallet.equippedItems.map(item => normalizeClassroomEquippedItemForWallet(item)).filter(item => item.purchaseId && item.itemId).slice(0, 8)
      : [],
    selectedTitle: {
      titleId: String(titleSummary.selectedTitleId || data.selectedTitleId || "").slice(0, 80),
      titleName: String(titleSummary.selectedTitleName || data.selectedTitleName || "").slice(0, 50)
    },
    selectedKeyring: {
      keyringId: String(profile.selectedKeyringId || selectedKeyring.keyringId || profile.selectedBadgeId || selectedBadge.badgeId || "").slice(0, 80),
      label: String(profile.selectedKeyringLabel || selectedKeyring.label || profile.selectedBadgeLabel || selectedBadge.label || "").slice(0, 30),
      icon: String(profile.selectedKeyringIcon || selectedKeyring.icon || profile.selectedBadgeIcon || selectedBadge.icon || "").slice(0, 40),
      color: String(profile.selectedKeyringColor || selectedKeyring.color || profile.selectedBadgeColor || selectedBadge.color || "").slice(0, 30)
    },
    selectedBadge: {
      badgeId: String(profile.selectedBadgeId || selectedBadge.badgeId || "").slice(0, 80),
      label: String(profile.selectedBadgeLabel || selectedBadge.label || "").slice(0, 30),
      icon: String(profile.selectedBadgeIcon || selectedBadge.icon || "").slice(0, 40),
      color: String(profile.selectedBadgeColor || selectedBadge.color || "").slice(0, 30)
    }
  };
}

function getKstDateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

function getKstMonthKey(date = new Date()) {
  return getKstDateKey(date).slice(0, 7);
}

function getKstWeekKey(date = new Date()) {
  const [year, month, day] = getKstDateKey(date).split("-").map(Number);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = localDate.getUTCDay() || 7;
  localDate.setUTCDate(localDate.getUTCDate() + 4 - weekday);
  const weekYear = localDate.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  const firstWeekday = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstWeekday);
  const week = 1 + Math.round((localDate - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

function getKstWeekdayNumber(date = new Date()) {
  const [year, month, day] = getKstDateKey(date).split("-").map(Number);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  return localDate.getUTCDay() || 7;
}

function isIsoDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isClassroomTeacherMember(memberData = {}, settings = {}) {
  if (memberData.role !== "admin") return false;
  const adminLevel = String(memberData.adminLevel || "").toLowerCase();
  if (["superadmin", "fulladmin"].includes(adminLevel)) return true;
  if (adminLevel !== "classadmin") return false;
  const scopeGrade = String(memberData.adminScopeGrade || memberData.grade || "");
  const scopeClassNumber = String(memberData.adminScopeClassNumber || memberData.classNumber || "");
  return scopeGrade === String(settings.grade || "") && scopeClassNumber === String(settings.classNumber || "");
}

function normalizeClassroomJob(rawJob = {}) {
  const jobId = String(rawJob.jobId || rawJob.id || `job-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`)
    .trim()
    .replace(/[^0-9A-Za-z_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!jobId) {
    throw new HttpsError("invalid-argument", "Job id is invalid.");
  }
  const title = String(rawJob.title || "").trim().slice(0, 40);
  if (!title) {
    throw new HttpsError("invalid-argument", "Job title is required.");
  }
  return {
    jobId,
    title,
    desc: String(rawJob.desc || "").trim().slice(0, 160),
    weeklyPayPoint: Math.max(1, Math.min(1000, Math.round(Number(rawJob.weeklyPayPoint || rawJob.payPoint || rawJob.payBerry) || 1))),
    maxAssignees: Math.max(1, Math.min(10, Math.round(Number(rawJob.maxAssignees) || 1))),
    active: rawJob.active !== false
  };
}

function normalizeClassroomShopItem(rawItem = {}) {
  const itemId = String(rawItem.itemId || rawItem.id || `shop-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`)
    .trim()
    .replace(/[^0-9A-Za-z_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!itemId) {
    throw new HttpsError("invalid-argument", "Shop item id is invalid.");
  }
  const title = String(rawItem.title || "").trim().slice(0, 40);
  if (!title) {
    throw new HttpsError("invalid-argument", "Shop item title is required.");
  }
  return {
    itemId,
    title,
    desc: String(rawItem.desc || "").trim().slice(0, 160),
    pricePoint: Math.max(1, Math.min(10000, Math.round(Number(rawItem.pricePoint || rawItem.priceBerry || rawItem.price) || 1))),
    priceCoin: Math.max(0, Math.min(10000, Math.round(Number(rawItem.priceCoin || rawItem.priceDjCoin || rawItem.djCoinPrice) || 0))),
    priceType: ["djCoin", "point"].includes(String(rawItem.priceType || "").trim()) ? String(rawItem.priceType).trim() : "point",
    itemType: String(rawItem.itemType || rawItem.type || "coupon").trim().slice(0, 40) || "coupon",
    boostPoint: roundClassroomPoint(rawItem.boostPoint || rawItem.pointBoost || 0),
    icon: String(rawItem.icon || "").trim().slice(0, 40),
    active: rawItem.active !== false
  };
}

function normalizeClassroomNoticeSlots(rawSlots = []) {
  const source = Array.isArray(rawSlots) ? rawSlots : [];
  return DEFAULT_CLASSROOM_NOTICE_SLOTS.map(defaultSlot => {
    const found = source.find(slot => String(slot?.key || "") === defaultSlot.key) || {};
    return {
      ...defaultSlot,
      text: String(found.text || "").trim().slice(0, 240)
    };
  });
}

function getKstEndOfDayDateAfter(days = 3) {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const endKstUtcMillis = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate() + Math.max(0, Math.round(Number(days) || 0)),
    14,
    59,
    59,
    999
  );
  return new Date(endKstUtcMillis);
}

function normalizeClassroomRoutine(rawRoutine = {}) {
  const routineId = String(rawRoutine.routineId || rawRoutine.id || `routine-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`)
    .trim()
    .replace(/[^0-9A-Za-z_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!routineId) {
    throw new HttpsError("invalid-argument", "Routine id is invalid.");
  }
  const title = String(rawRoutine.title || "").trim().slice(0, 40);
  if (!title) {
    throw new HttpsError("invalid-argument", "Routine title is required.");
  }
  const targetCount = Math.max(2, Math.min(30, Math.round(Number(rawRoutine.targetCount) || 5)));
  const startDate = String(rawRoutine.startDate || "").trim();
  const endDate = String(rawRoutine.endDate || "").trim();
  if (!isIsoDateKey(startDate) || !isIsoDateKey(endDate) || startDate > endDate) {
    throw new HttpsError("invalid-argument", "Routine period is invalid.");
  }
  const weekdays = Array.from(new Set((Array.isArray(rawRoutine.weekdays) ? rawRoutine.weekdays : [])
    .map(day => Math.round(Number(day)))
    .filter(day => day >= 1 && day <= 5)))
    .sort((a, b) => a - b);
  if (!weekdays.length) {
    throw new HttpsError("invalid-argument", "Routine weekdays are required.");
  }
  return {
    routineId,
    title,
    desc: String(rawRoutine.desc || "").trim().slice(0, 160),
    targetCount,
    startDate,
    endDate,
    weekdays,
    rewardPoint: Math.max(0, Math.min(20, Math.round(Number(rawRoutine.rewardPoint) || 0))),
    active: rawRoutine.active !== false
  };
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function getPracticeSolvedTotal(record) {
  const correctCount = Number(record?.correctCount) || 0;
  const totalCount = Number(record?.totalCount) || 0;
  const starCount = Number(record?.starCount) || 0;
  if (totalCount > 0 && starCount > 0) return (starCount * totalCount) + correctCount;
  return correctCount;
}

function getRecordAreaKey(record) {
  return String(record?.areaKey || `${record?.area || ""}/${record?.detail || ""}`).trim();
}

function buildEventQuestRows(quests, progressMap, claimMap) {
  return quests.map(quest => {
    const claim = claimMap[quest.questId] || {};
    const repeatLimit = Math.max(1, Math.round(Number(quest.repeatLimit) || 1));
    const claimedCount = Math.min(repeatLimit, Math.max(0, Math.round(Number(claim.claimedCount) || 0)));
    const target = Math.max(1, Math.round(Number(quest.target) || 1));
    const progress = Math.max(0, Math.round(Number(progressMap[quest.questId]?.current) || 0));
    const nextTarget = target * Math.min(repeatLimit, claimedCount + 1);
    const current = Math.min(nextTarget, progress);
    const completed = current >= nextTarget;
    const claimed = claimedCount >= repeatLimit || (quest.scope !== "weekly" && claimedCount > 0);
    const claimable = completed && !claimed;
    const rewardParts = [`XP +${quest.xpReward || 0}`];
    if (Number(quest.rewardCoin) > 0) rewardParts.push(`DJ코인 +${quest.rewardCoin}`);
    return {
      questId: quest.questId,
      icon: quest.icon,
      title: quest.title,
      scope: quest.scope || "daily",
      recommended: !!quest.recommended,
      current,
      target: nextTarget,
      baseTarget: target,
      progress: `${current}/${nextTarget}`,
      xpReward: quest.xpReward || 0,
      rewardCoin: quest.rewardCoin || 0,
      reward: rewardParts.join(" · "),
      claimedCount,
      repeatLimit,
      completed,
      claimed,
      claimable,
      status: claimed
        ? "수령 완료"
        : (claimable ? "완료 가능" : (quest.scope === "weekly" ? `주간 반복 ${claimedCount}/${repeatLimit}` : "진행 중"))
    };
  });
}

async function loadLinkedMemberForEvent(authUid, memberUserId) {
  const safeMemberUserId = normalizeId(memberUserId, "memberUserId");
  const memberRef = db.collection("users").doc(safeMemberUserId);
  const snapshot = await memberRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Member not found.");
  }
  const memberData = snapshot.data() || {};
  assertActiveMember(memberData);
  if (memberData.authUid !== authUid) {
    throw new HttpsError("permission-denied", "Member is not linked to current auth.");
  }
  return { memberUserId: safeMemberUserId, memberData };
}

exports.getPopularQuizUsageStatus = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const { memberData } = await loadLinkedMemberForEvent(authUid, memberUserId);
  if (isAdminMemberData(memberData)) {
    return {
      success: true,
      status: getAdminPopularUsageBypassStatus(memberUserId)
    };
  }
  const dateKey = getKstDateKey();
  const recordId = buildDailyUsageRecordId(memberUserId, dateKey);
  const snapshot = await db.collection("dailyUsage").doc(recordId).get();
  const usage = normalizeDailyUsageData(snapshot.exists ? snapshot.data() : { recordId }, memberUserId, dateKey);
  return {
    success: true,
    status: getDailyUsageAccessStatus(usage)
  };
});

exports.recordPopularQuizUsageSeconds = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const { memberData } = await loadLinkedMemberForEvent(authUid, memberUserId);
  if (isAdminMemberData(memberData)) {
    return {
      success: true,
      status: getAdminPopularUsageBypassStatus(memberUserId)
    };
  }
  const seconds = Math.max(0, Math.round(Number(payload.seconds) || 0));
  if (seconds <= 0) {
    const dateKey = getKstDateKey();
    const recordId = buildDailyUsageRecordId(memberUserId, dateKey);
    const snapshot = await db.collection("dailyUsage").doc(recordId).get();
    return {
      success: true,
      status: getDailyUsageAccessStatus(normalizeDailyUsageData(snapshot.exists ? snapshot.data() : { recordId }, memberUserId, dateKey))
    };
  }
  const status = await updateDailyUsageForLinkedMember(authUid, memberUserId, { funSeconds: seconds });
  return { success: true, status };
});

exports.recordEducationCorrectForPopularUnlock = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const { memberData } = await loadLinkedMemberForEvent(authUid, memberUserId);
  if (isAdminMemberData(memberData)) {
    return {
      success: true,
      status: getAdminPopularUsageBypassStatus(memberUserId)
    };
  }
  const status = await updateDailyUsageForLinkedMember(authUid, memberUserId, { eduCorrectCount: 1 });
  return { success: true, status };
});

async function loadMemberPracticeRecords(memberUserId) {
  const snapshot = await db.collection("practiceRecords")
    .where("memberUserId", "==", memberUserId)
    .limit(500)
    .get();
  return snapshot.docs.map(doc => ({ recordId: doc.id, ...(doc.data() || {}) }));
}

async function loadEventClaimMap(memberUserId, quests, dateKey, weekKey) {
  const refs = [];
  const keys = [];
  quests.forEach(quest => {
    const repeatLimit = Math.max(1, Math.round(Number(quest.repeatLimit) || 1));
    for (let attempt = 1; attempt <= repeatLimit; attempt += 1) {
      refs.push(db.collection("rewardLogs").doc(getEventRewardLogId(memberUserId, quest, dateKey, weekKey, attempt)));
      keys.push({ questId: quest.questId, attempt });
    }
  });
  const snapshots = await Promise.all(refs.map(ref => ref.get()));
  return snapshots.reduce((map, snapshot, index) => {
    if (snapshot.exists) {
      const key = keys[index];
      const current = map[key.questId] || { claimedCount: 0 };
      map[key.questId] = {
        claimedCount: current.claimedCount + 1,
        lastAttempt: Math.max(current.lastAttempt || 0, key.attempt)
      };
    }
    return map;
  }, {});
}

async function loadEventProgressMap(memberUserId, quests, dateKey, weekKey) {
  const snapshots = await Promise.all(quests.map(quest =>
    db.collection("eventQuestProgress")
      .doc(getEventProgressId(memberUserId, quest, dateKey, weekKey))
      .get()
  ));
  return snapshots.reduce((map, snapshot, index) => {
    if (snapshot.exists) map[quests[index].questId] = snapshot.data() || {};
    return map;
  }, {});
}

async function loadClassEventProgress(memberData) {
  const grade = String(memberData.grade || "");
  const classNumber = String(memberData.classNumber || "");
  const school = String(memberData.school || DEFAULT_MEMBER_SCHOOL);
  if (!grade || !classNumber) return [];

  const gradeCandidates = Array.from(new Set([
    grade,
    Number(grade)
  ].filter(value => value !== "" && !Number.isNaN(value))));
  const memberSnapshot = await db.collection("users")
    .where("grade", "in", gradeCandidates)
    .limit(120)
    .get();
  const memberIds = memberSnapshot.docs
    .filter(doc => {
      const data = doc.data() || {};
      return data.role === "student"
        && data.status === "active"
        && data.active === true
        && String(data.classNumber || "") === classNumber
        && String(data.school || DEFAULT_MEMBER_SCHOOL) === school;
    })
    .map(doc => doc.id);

  if (!memberIds.length) {
    return CLASS_MISSION_DEFINITIONS.map(mission => ({ ...mission, current: 0, percent: 0 }));
  }

  let practiceTotal = 0;
  let rankingTotal = 0;
  let coinTotal = 0;
  for (const chunk of chunkArray(memberIds, 30)) {
    const [practiceSnapshot, rankingSnapshot, economySnapshots] = await Promise.all([
      db.collection("practiceRecords").where("memberUserId", "in", chunk).limit(1000).get(),
      db.collection("rankingRecords").where("memberUserId", "in", chunk).limit(1000).get(),
      Promise.all(chunk.map(memberId => db.collection("userEconomy").doc(memberId).get()))
    ]);
    practiceTotal += practiceSnapshot.docs
      .map(doc => doc.data() || {})
      .reduce((sum, record) => sum + getPracticeSolvedTotal(record), 0);
    rankingTotal += rankingSnapshot.size;
    coinTotal += economySnapshots
      .map(snapshot => snapshot.exists ? snapshot.data() || {} : {})
      .reduce((sum, economy) => sum + (Number(economy.totalEarned ?? economy.djCoin ?? 0) || 0), 0);
  }

  const values = {
    class_quiz_100: practiceTotal,
    class_coin_2000: coinTotal,
    ranking_30: rankingTotal
  };
  return CLASS_MISSION_DEFINITIONS.map(mission => {
    const current = Math.max(0, Math.floor(values[mission.missionId] || 0));
    return {
      ...mission,
      current,
      percent: Math.min(100, Math.round((current / mission.target) * 100))
    };
  });
}

async function writeAuthLinkLog(entry) {
  try {
    await db.collection("authLinkLogs").add({
      ...entry,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.warn("Auth link log write failed.", error);
  }
}

async function writeMemberAuthLog(entry) {
  try {
    await db.collection("memberAuthLogs").add({
      ...entry,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.warn("Member auth log write failed.", error);
  }
}

function accessCodeFailureIncrement() {
  return {
    failedAttempts: FieldValue.increment(1),
    lastFailedAt: FieldValue.serverTimestamp()
  };
}

async function verifyAccessCodeForMemberInTransaction(transaction, { authUid, payload, consumeOnUse }) {
  const memberUserId = buildLegacyMemberUserId(
    payload.school,
    payload.grade,
    payload.classNumber,
    payload.studentNumber
  );
  const memberRef = db.collection("users").doc(memberUserId);
  const accessCodeRef = db.collection("memberAccessCodes").doc(memberUserId);

  const [memberSnapshot, accessCodeSnapshot] = await Promise.all([
    transaction.get(memberRef),
    transaction.get(accessCodeRef)
  ]);

  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "Member not found.");
  }
  const memberData = memberSnapshot.data() || {};
  assertActiveStudent(memberData);

  if (!accessCodeSnapshot.exists) {
    throw new HttpsError("permission-denied", "Access code is not configured.");
  }
  const accessData = accessCodeSnapshot.data() || {};
  assertAccessCodeUsable(accessData);

  try {
    assertAccessCodeMatches(payload.accessCode, accessData);
  } catch (error) {
    transaction.set(accessCodeRef, accessCodeFailureIncrement(), { merge: true });
    throw error;
  }

  transaction.set(accessCodeRef, {
    failedAttempts: 0,
    lastVerifiedAt: FieldValue.serverTimestamp(),
    lastVerifiedAuthUid: authUid
  }, { merge: true });

  if (consumeOnUse && (accessData.oneTime === true || accessData.consumeOnUse === true)) {
    transaction.set(accessCodeRef, {
      usedAt: FieldValue.serverTimestamp(),
      usedByAuthUid: authUid,
      active: false
    }, { merge: true });
  }

  return { memberUserId, memberRef, memberData };
}

async function verifyAccessCodeForMember(options) {
  return db.runTransaction(transaction => verifyAccessCodeForMemberInTransaction(transaction, options));
}

async function assertLinkedMemberAuth(transaction, memberUserId, authUid) {
  const memberRef = db.collection("users").doc(memberUserId);
  const memberSnapshot = await transaction.get(memberRef);
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "Member not found.");
  }
  const memberData = memberSnapshot.data() || {};
  assertActiveMember(memberData);
  if (memberData.authUid !== authUid) {
    throw new HttpsError("permission-denied", "Member is not linked to current auth.");
  }
  return memberData;
}

async function assertLinkedPurchasingMemberAuth(transaction, memberUserId, authUid) {
  const memberRef = db.collection("users").doc(memberUserId);
  const memberSnapshot = await transaction.get(memberRef);
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "Member not found.");
  }
  const memberData = memberSnapshot.data() || {};
  assertActiveMember(memberData);
  if (memberData.authUid !== authUid) {
    throw new HttpsError("permission-denied", "Member is not linked to current auth.");
  }
  return memberData;
}

async function getPasswordSetupSettings(transaction) {
  const settingsRef = db.collection("authSettings").doc("memberPasswordSetup");
  const settingsSnapshot = await transaction.get(settingsRef);
  const defaults = {
    setupEnabled: true,
    signupEnabled: true,
    temporaryPasswordLoginEnabled: true,
    setupExpiresAt: dateToTimestamp(DEFAULT_PASSWORD_SETUP_EXPIRES_AT),
    minPasswordLength: 4,
    maxFailedAttempts: MAX_FAILED_ATTEMPTS,
    lockMinutes: 10
  };
  return settingsSnapshot.exists
    ? { ...defaults, ...(settingsSnapshot.data() || {}) }
    : defaults;
}

function assertPasswordSetupOpen(settings) {
  if (settings.setupEnabled !== true) {
    throw new HttpsError("failed-precondition", "Password setup is disabled.");
  }
  const expiresAtMillis = timestampToMillis(settings.setupExpiresAt);
  if (expiresAtMillis && expiresAtMillis <= Date.now()) {
    throw new HttpsError("failed-precondition", "Password setup period has ended.");
  }
}

function assertNotLocked(stateData, settings) {
  const lockedUntilMillis = timestampToMillis(stateData?.lockedUntil);
  if (lockedUntilMillis && lockedUntilMillis > Date.now()) {
    throw new HttpsError("resource-exhausted", "Member setup or login is temporarily locked.");
  }
  if (lockedUntilMillis && lockedUntilMillis <= Date.now()) return;
  const failedAttempts = Number(stateData?.failedAttempts || 0);
  const maxFailedAttempts = Number(settings.maxFailedAttempts || MAX_FAILED_ATTEMPTS);
  if (maxFailedAttempts > 0 && failedAttempts >= maxFailedAttempts) {
    throw new HttpsError("resource-exhausted", "Member setup or login is temporarily locked.");
  }
}

function lockUntilTimestamp(settings) {
  const lockMinutes = Number(settings.lockMinutes || 10);
  return Timestamp.fromMillis(Date.now() + Math.max(1, lockMinutes) * 60 * 1000);
}

function failedAttemptUpdate(stateData, settings) {
  const failedAttempts = Number(stateData?.failedAttempts || 0) + 1;
  const maxFailedAttempts = Number(settings.maxFailedAttempts || MAX_FAILED_ATTEMPTS);
  const update = {
    failedAttempts: FieldValue.increment(1),
    lastFailedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  if (maxFailedAttempts > 0 && failedAttempts >= maxFailedAttempts) {
    update.lockedUntil = lockUntilTimestamp(settings);
  }
  return update;
}

function createSetupSessionId() {
  return crypto.randomBytes(24).toString("hex");
}

exports.verifyMemberAccessCode = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = getMemberPayload(request.data);

  try {
    const result = await verifyAccessCodeForMember({
      authUid,
      payload,
      consumeOnUse: false
    });
    await writeAuthLinkLog({
      action: "verifyMemberAccessCode",
      result: "success",
      authUid,
      memberUserId: result.memberUserId
    });
    return {
      success: true,
      memberUserId: result.memberUserId,
      profile: publicMemberProfile(result.memberUserId, result.memberData)
    };
  } catch (error) {
    await writeAuthLinkLog({
      action: "verifyMemberAccessCode",
      result: "failure",
      authUid,
      reason: error.code || "unknown"
    });
    throw error;
  }
});

exports.linkMemberAuthUid = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = getMemberPayload(request.data);

  try {
    const linkResult = await db.runTransaction(async transaction => {
      const verified = await verifyAccessCodeForMemberInTransaction(transaction, {
        authUid,
        payload,
        consumeOnUse: true
      });
      const memberData = verified.memberData || {};
      assertActiveMember(memberData);

      const updateData = {
        authUid,
        authLinkProvider: AUTH_LINK_PROVIDER,
        authLinkVersion: AUTH_LINK_VERSION,
        updatedAt: FieldValue.serverTimestamp()
      };

      let action = "unchanged";
      if (!memberData.authUid) {
        updateData.authLinkedAt = FieldValue.serverTimestamp();
        action = "linked";
      } else if (memberData.authUid !== authUid) {
        updateData.previousAuthUid = memberData.authUid;
        updateData.authRelinkedAt = FieldValue.serverTimestamp();
        action = "relinked";
      }

      if (action !== "unchanged") {
        transaction.set(verified.memberRef, updateData, { merge: true });
      }

      return {
        action,
        memberUserId: verified.memberUserId,
        memberData: {
          ...memberData,
          authUid
        }
      };
    });

    await writeAuthLinkLog({
      action: "linkMemberAuthUid",
      result: "success",
      authUid,
      memberUserId: linkResult.memberUserId,
      linkAction: linkResult.action
    });

    return {
      success: true,
      memberUserId: linkResult.memberUserId,
      action: linkResult.action,
      profile: publicMemberProfile(linkResult.memberUserId, linkResult.memberData)
    };
  } catch (error) {
    await writeAuthLinkLog({
      action: "linkMemberAuthUid",
      result: "failure",
      authUid,
      reason: error.code || "unknown"
    });
    throw error;
  }
});

exports.startMemberPasswordSetup = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const identity = getMemberIdentityPayload(payload);
  const nickname = normalizeNickname(payload.nickname);
  if (!nickname) {
    throw new HttpsError("invalid-argument", "Nickname is required.");
  }

  try {
    const result = await db.runTransaction(async transaction => {
      const memberUserId = buildLegacyMemberUserId(
        identity.school,
        identity.grade,
        identity.classNumber,
        identity.studentNumber
      );
      const memberRef = db.collection("users").doc(memberUserId);
      const credentialsRef = db.collection("memberCredentials").doc(memberUserId);
      const stateRef = db.collection("memberPasswordSetupState").doc(memberUserId);

      const [settings, memberSnapshot, credentialsSnapshot, stateSnapshot] = await Promise.all([
        getPasswordSetupSettings(transaction),
        transaction.get(memberRef),
        transaction.get(credentialsRef),
        transaction.get(stateRef)
      ]);

      assertPasswordSetupOpen(settings);
      if (!memberSnapshot.exists) {
        throw new HttpsError("not-found", "Member not found.");
      }
      const memberData = memberSnapshot.data() || {};
      assertActiveMember(memberData);
      if (credentialsSnapshot.exists && credentialsSnapshot.data()?.passwordHash) {
        throw new HttpsError("already-exists", "Member password is already configured.");
      }

      const stateData = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
      assertNotLocked(stateData, settings);

      const expectedNickname = normalizeNickname(memberData.nickname || memberData.name);
      if (expectedNickname !== nickname) {
        transaction.set(stateRef, failedAttemptUpdate(stateData, settings), { merge: true });
        throw new HttpsError("permission-denied", "Nickname mismatch.");
      }

      const setupSessionId = createSetupSessionId();
      const sessionRef = db.collection("memberPasswordSetupSessions").doc(setupSessionId);
      const expiresAt = Timestamp.fromMillis(Date.now() + PASSWORD_SETUP_SESSION_MINUTES * 60 * 1000);
      transaction.set(sessionRef, {
        setupSessionId,
        memberUserId,
        authUid,
        purpose: "initial_password_setup",
        used: false,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt
      }, { merge: false });
      transaction.set(stateRef, {
        memberUserId,
        failedAttempts: 0,
        lockedUntil: null,
        lastVerifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        memberUserId,
        setupSessionId,
        setupSessionExpiresAt: expiresAt,
        memberData,
        settings
      };
    });

    await writeMemberAuthLog({
      action: "startMemberPasswordSetup",
      result: "success",
      authUid,
      memberUserId: result.memberUserId
    });

    return {
      success: true,
      memberUserId: result.memberUserId,
      setupSessionId: result.setupSessionId,
      setupSessionExpiresAt: result.setupSessionExpiresAt,
      profile: publicMemberProfile(result.memberUserId, result.memberData),
      settings: publicSetupSettings(result.settings)
    };
  } catch (error) {
    await writeMemberAuthLog({
      action: "startMemberPasswordSetup",
      result: "failure",
      authUid,
      reason: error.code || "unknown"
    });
    throw error;
  }
});

exports.setMemberPassword = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const setupSessionId = normalizeId(payload.setupSessionId, "setupSessionId");
  const password = normalizePassword(payload.newPassword);

  try {
    const result = await db.runTransaction(async transaction => {
      const sessionRef = db.collection("memberPasswordSetupSessions").doc(setupSessionId);
      const sessionSnapshot = await transaction.get(sessionRef);
      if (!sessionSnapshot.exists) {
        throw new HttpsError("not-found", "Password setup session not found.");
      }
      const session = sessionSnapshot.data() || {};
      if (session.used === true) {
        throw new HttpsError("failed-precondition", "Password setup session already used.");
      }
      if (session.authUid !== authUid) {
        throw new HttpsError("permission-denied", "Password setup session belongs to another auth.");
      }
      if (timestampToMillis(session.expiresAt) <= Date.now()) {
        throw new HttpsError("failed-precondition", "Password setup session expired.");
      }

      const memberUserId = normalizeId(session.memberUserId, "memberUserId");
      const memberRef = db.collection("users").doc(memberUserId);
      const credentialsRef = db.collection("memberCredentials").doc(memberUserId);
      const [memberSnapshot, credentialsSnapshot] = await Promise.all([
        transaction.get(memberRef),
        transaction.get(credentialsRef)
      ]);
      if (!memberSnapshot.exists) {
        throw new HttpsError("not-found", "Member not found.");
      }
      const memberData = memberSnapshot.data() || {};
      assertActiveMember(memberData);
      if (credentialsSnapshot.exists && credentialsSnapshot.data()?.passwordHash) {
        throw new HttpsError("already-exists", "Member password is already configured.");
      }

      const passwordHashData = createPasswordHash(password);
      transaction.set(credentialsRef, {
        memberUserId,
        ...passwordHashData,
        forcePasswordChange: false,
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp()
      }, { merge: false });
      transaction.set(memberRef, {
        authUid,
        authLinkedAt: memberData.authUid ? memberData.authLinkedAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        previousAuthUid: memberData.authUid && memberData.authUid !== authUid ? memberData.authUid : memberData.previousAuthUid || "",
        authRelinkedAt: memberData.authUid && memberData.authUid !== authUid ? FieldValue.serverTimestamp() : memberData.authRelinkedAt || null,
        authLinkProvider: "firebase_member_password",
        authLinkVersion: 4,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.set(sessionRef, {
        used: true,
        usedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return { memberUserId, memberData };
    });

    await writeMemberAuthLog({
      action: "setMemberPassword",
      result: "success",
      authUid,
      memberUserId: result.memberUserId
    });

    return {
      success: true,
      memberUserId: result.memberUserId,
      profile: publicMemberProfile(result.memberUserId, result.memberData),
      forcePasswordChange: false
    };
  } catch (error) {
    await writeMemberAuthLog({
      action: "setMemberPassword",
      result: "failure",
      authUid,
      reason: error.code || "unknown"
    });
    throw error;
  }
});

exports.loginMemberWithPassword = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const identity = getMemberIdentityPayload(payload);
  const password = normalizePassword(payload.password);
  const temporaryPassword = buildTemporaryMemberPassword(identity);

  try {
    const result = await db.runTransaction(async transaction => {
      const memberUserId = buildLegacyMemberUserId(
        identity.school,
        identity.grade,
        identity.classNumber,
        identity.studentNumber
      );
      const memberRef = db.collection("users").doc(memberUserId);
      const credentialsRef = db.collection("memberCredentials").doc(memberUserId);
      const [settings, memberSnapshot, credentialsSnapshot] = await Promise.all([
        getPasswordSetupSettings(transaction),
        transaction.get(memberRef),
        transaction.get(credentialsRef)
      ]);

      if (!memberSnapshot.exists) {
        throw new HttpsError("not-found", "Member not found.");
      }
      const memberData = memberSnapshot.data() || {};
      assertActiveMember(memberData);
      const hasConfiguredPassword = credentialsSnapshot.exists && credentialsSnapshot.data()?.passwordHash;
      const credentials = hasConfiguredPassword ? credentialsSnapshot.data() || {} : null;
      assertNotLocked(credentials, settings);

      if (!hasConfiguredPassword) {
        if (settings.temporaryPasswordLoginEnabled === false) {
          throw new HttpsError("failed-precondition", "Temporary password login is disabled.");
        }
        if (password !== temporaryPassword) {
          transaction.set(credentialsRef, failedAttemptUpdate({}, settings), { merge: true });
          throw new HttpsError("permission-denied", "Temporary password mismatch.");
        }
        transaction.set(credentialsRef, {
          memberUserId,
          ...createPasswordHash(temporaryPassword),
          forcePasswordChange: true,
          failedAttempts: 0,
          lockedUntil: null,
          passwordMode: "temporary_identity",
          temporaryPasswordIssuedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          lastLoginAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      } else if (!verifyPassword(password, credentials)) {
        transaction.set(credentialsRef, failedAttemptUpdate(credentials || {}, settings), { merge: true });
        throw new HttpsError("permission-denied", "Password mismatch.");
      } else {
        transaction.set(credentialsRef, {
          failedAttempts: 0,
          lockedUntil: null,
          lastLoginAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }

      transaction.set(memberRef, {
        authUid,
        previousAuthUid: memberData.authUid && memberData.authUid !== authUid ? memberData.authUid : memberData.previousAuthUid || "",
        authRelinkedAt: memberData.authUid && memberData.authUid !== authUid ? FieldValue.serverTimestamp() : memberData.authRelinkedAt || null,
        authLinkProvider: "firebase_member_password",
        authLinkVersion: 4,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        memberUserId,
        memberData: {
          ...memberData,
          authUid
        },
        forcePasswordChange: !hasConfiguredPassword || credentials?.forcePasswordChange === true
      };
    });

    await writeMemberAuthLog({
      action: "loginMemberWithPassword",
      result: "success",
      authUid,
      memberUserId: result.memberUserId
    });

    return {
      success: true,
      memberUserId: result.memberUserId,
      profile: publicMemberProfile(result.memberUserId, result.memberData),
      forcePasswordChange: result.forcePasswordChange
    };
  } catch (error) {
    await writeMemberAuthLog({
      action: "loginMemberWithPassword",
      result: "failure",
      authUid,
      reason: error.code || "unknown"
    });
    throw error;
  }
});

exports.registerNewMember = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const identity = getMemberIdentityPayload(payload);
  const nickname = assertNicknameAllowed(payload.nickname);
  const password = normalizePassword(payload.password);
  const temporaryPassword = buildTemporaryMemberPassword(identity);
  if (password === temporaryPassword) {
    throw new HttpsError("invalid-argument", "Signup password must be different from temporary password.");
  }

  try {
    const result = await db.runTransaction(async transaction => {
      const memberUserId = buildLegacyMemberUserId(
        identity.school,
        identity.grade,
        identity.classNumber,
        identity.studentNumber
      );
      const memberRef = db.collection("users").doc(memberUserId);
      const credentialsRef = db.collection("memberCredentials").doc(memberUserId);
      const [settings, memberSnapshot, credentialsSnapshot] = await Promise.all([
        getPasswordSetupSettings(transaction),
        transaction.get(memberRef),
        transaction.get(credentialsRef)
      ]);
      if (settings.signupEnabled === false) {
        throw new HttpsError("failed-precondition", "Signup is disabled.");
      }

      if (memberSnapshot.exists) {
        throw new HttpsError("already-exists", "Member already exists.");
      }
      if (credentialsSnapshot.exists) {
        throw new HttpsError("already-exists", "Member credentials already exist.");
      }

      const memberData = buildMemberProfileForRegistration(identity, nickname, authUid);
      transaction.set(memberRef, memberData, { merge: false });
      transaction.set(credentialsRef, {
        memberUserId,
        ...createPasswordHash(password),
        forcePasswordChange: false,
        failedAttempts: 0,
        lockedUntil: null,
        passwordMode: "user_password",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp()
      }, { merge: false });

      return {
        memberUserId,
        memberData: {
          ...memberData,
          authUid
        }
      };
    });

    await writeMemberAuthLog({
      action: "registerNewMember",
      result: "success",
      authUid,
      memberUserId: result.memberUserId
    });

    return {
      success: true,
      memberUserId: result.memberUserId,
      profile: publicMemberProfile(result.memberUserId, result.memberData),
      forcePasswordChange: false
    };
  } catch (error) {
    await writeMemberAuthLog({
      action: "registerNewMember",
      result: "failure",
      authUid,
      reason: error.code || "unknown"
    });
    throw error;
  }
});

exports.changeMemberPassword = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const currentPassword = normalizePassword(payload.currentPassword);
  const newPassword = normalizePassword(payload.newPassword);

  try {
    const result = await db.runTransaction(async transaction => {
      const memberRef = db.collection("users").doc(memberUserId);
      const credentialsRef = db.collection("memberCredentials").doc(memberUserId);
      const [memberSnapshot, credentialsSnapshot] = await Promise.all([
        transaction.get(memberRef),
        transaction.get(credentialsRef)
      ]);
      if (!memberSnapshot.exists) {
        throw new HttpsError("not-found", "Member not found.");
      }
      const memberData = memberSnapshot.data() || {};
      assertActiveMember(memberData);
      if (memberData.authUid !== authUid) {
        throw new HttpsError("permission-denied", "Member is not linked to current auth.");
      }
      if (!credentialsSnapshot.exists || !credentialsSnapshot.data()?.passwordHash) {
        throw new HttpsError("failed-precondition", "Member password is not configured.");
      }
      const credentials = credentialsSnapshot.data() || {};
      if (!verifyPassword(currentPassword, credentials)) {
        transaction.set(credentialsRef, failedAttemptUpdate(credentials, {
          maxFailedAttempts: MAX_FAILED_ATTEMPTS,
          lockMinutes: 10
        }), { merge: true });
        throw new HttpsError("permission-denied", "Current password mismatch.");
      }
      const temporaryPassword = buildTemporaryMemberPassword({
        school: memberData.school,
        grade: memberData.grade,
        classNumber: memberData.classNumber,
        studentNumber: memberData.studentNumber
      });
      if (newPassword === currentPassword || newPassword === temporaryPassword) {
        throw new HttpsError("invalid-argument", "New password must be different from temporary or current password.");
      }

      transaction.set(credentialsRef, {
        ...createPasswordHash(newPassword),
        forcePasswordChange: false,
        failedAttempts: 0,
        lockedUntil: null,
        passwordMode: "user_password",
        passwordChangedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.set(memberRef, {
        passwordMode: "user_password",
        initialPasswordChanged: true,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return { memberUserId, memberData };
    });

    await writeMemberAuthLog({
      action: "changeMemberPassword",
      result: "success",
      authUid,
      memberUserId: result.memberUserId
    });

    return {
      success: true,
      memberUserId: result.memberUserId,
      profile: publicMemberProfile(result.memberUserId, result.memberData),
      forcePasswordChange: false
    };
  } catch (error) {
    await writeMemberAuthLog({
      action: "changeMemberPassword",
      result: "failure",
      authUid,
      memberUserId,
      reason: error.code || "unknown"
    });
    throw error;
  }
});

exports.updateMemberNickname = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const nickname = assertNicknameAllowed(payload.nickname);

  try {
    const result = await db.runTransaction(async transaction => {
      const memberRef = db.collection("users").doc(memberUserId);
      const memberSnapshot = await transaction.get(memberRef);
      if (!memberSnapshot.exists) {
        throw new HttpsError("not-found", "Member not found.");
      }
      const memberData = memberSnapshot.data() || {};
      assertActiveMember(memberData);
      if (memberData.authUid !== authUid) {
        throw new HttpsError("permission-denied", "Member is not linked to current auth.");
      }

      transaction.set(memberRef, {
        nickname,
        name: nickname,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        memberUserId,
        memberData: {
          ...memberData,
          nickname,
          name: nickname
        }
      };
    });

    await writeMemberAuthLog({
      action: "updateMemberNickname",
      result: "success",
      authUid,
      memberUserId: result.memberUserId
    });

    return {
      success: true,
      memberUserId: result.memberUserId,
      profile: publicMemberProfile(result.memberUserId, result.memberData)
    };
  } catch (error) {
    await writeMemberAuthLog({
      action: "updateMemberNickname",
      result: "failure",
      authUid,
      memberUserId,
      reason: error.code || "unknown"
    });
    throw error;
  }
});

exports.resetMemberPasswordToTemporary = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const identity = getMemberIdentityPayload(payload);
  const temporaryPassword = normalizePassword(buildTemporaryMemberPassword(identity));

  try {
    const result = await db.runTransaction(async transaction => {
      const memberUserId = buildLegacyMemberUserId(
        identity.school,
        identity.grade,
        identity.classNumber,
        identity.studentNumber
      );
      const memberRef = db.collection("users").doc(memberUserId);
      const credentialsRef = db.collection("memberCredentials").doc(memberUserId);
      const memberSnapshot = await transaction.get(memberRef);
      if (!memberSnapshot.exists) {
        throw new HttpsError("not-found", "Member not found.");
      }
      const memberData = memberSnapshot.data() || {};
      assertActiveStudent(memberData);

      transaction.set(credentialsRef, {
        memberUserId,
        ...createPasswordHash(temporaryPassword),
        forcePasswordChange: true,
        failedAttempts: 0,
        lockedUntil: null,
        passwordMode: "temporary_identity",
        resetAt: FieldValue.serverTimestamp(),
        resetByAuthUid: authUid,
        resetSource: "student_self_service",
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.set(memberRef, {
        passwordMode: "temporary_identity",
        initialPasswordChanged: false,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return { memberUserId, memberData };
    });

    await writeMemberAuthLog({
      action: "resetMemberPasswordToTemporary",
      result: "success",
      authUid,
      memberUserId: result.memberUserId
    });

    return {
      success: true,
      memberUserId: result.memberUserId,
      profile: publicMemberProfile(result.memberUserId, result.memberData),
      forcePasswordChange: true
    };
  } catch (error) {
    await writeMemberAuthLog({
      action: "resetMemberPasswordToTemporary",
      result: "failure",
      authUid,
      reason: error.code || "unknown"
    });
    throw error;
  }
});

function publicAdminMemberRow(doc) {
  const data = doc.data ? doc.data() || {} : doc || {};
  const userId = doc.id || data.userId || "";
  return {
    userId,
    school: data.school || DEFAULT_MEMBER_SCHOOL,
    grade: data.grade || "",
    classNumber: data.classNumber || "",
    studentNumber: data.studentNumber || "",
    nickname: data.nickname || data.name || "",
    role: data.role || "student",
    adminLevel: data.adminLevel || "",
    adminScopeGrade: data.adminScopeGrade || "",
    adminScopeClassNumber: data.adminScopeClassNumber || "",
    status: data.status || "",
    active: data.active === true,
    authLinked: !!data.authUid,
    passwordMode: data.passwordMode || "",
    initialPasswordChanged: data.initialPasswordChanged === true,
    updatedAt: data.updatedAt || null,
    classroomHidden: !isClassroomStudentCardVisible(userId, data)
  };
}

function publicAdminCredentialState(snapshot) {
  const data = snapshot.exists ? snapshot.data() || {} : {};
  return {
    passwordConfigured: !!data.passwordHash,
    forcePasswordChange: data.forcePasswordChange === true,
    failedAttempts: Number(data.failedAttempts || 0),
    locked: timestampToMillis(data.lockedUntil) > Date.now(),
    lastLoginAt: data.lastLoginAt || null,
    resetAt: data.resetAt || null
  };
}

function publicAdminPracticeRecord(doc) {
  const data = doc.data ? doc.data() || {} : doc || {};
  return {
    recordId: doc.id || data.recordId || "",
    area: data.area || "",
    detail: data.detail || "",
    areaKey: data.areaKey || "",
    completionType: data.completionType || "",
    correctCount: Number(data.correctCount || 0),
    totalCount: Number(data.totalCount || 0),
    starCount: Number(data.starCount || 0),
    updatedAt: data.updatedAt || data.lastAchievedAt || null
  };
}

function getKstDayStartDate() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - 9 * 60 * 60 * 1000);
}

function buildAdminDashboardSummary({ adminMember, members, credentialStates, todayPracticeCount, todayRewardCount, recentLogs }) {
  const activeStudents = members.filter(member => member.role !== "admin" && member.active && member.status === "active").length;
  const inactive = members.filter(member => !member.active || member.status !== "active").length;
  const admins = members.filter(member => member.role === "admin").length;
  const authUnlinked = members.filter(member => !member.authLinked).length;
  const passwordMissing = credentialStates.filter(state => !state.passwordConfigured).length;
  const passwordForceChange = credentialStates.filter(state => state.forcePasswordChange).length;
  const passwordLocked = credentialStates.filter(state => state.locked).length;
  return {
    scopeLabel: adminMember.isSuperAdmin ? "전체" : `${adminMember.scopeGrade || "-"}학년 ${adminMember.scopeClassNumber || "-"}반`,
    adminLevel: adminMember.adminLevel,
    totalMembers: members.length,
    activeStudents,
    inactive,
    admins,
    authUnlinked,
    passwordMissing,
    passwordForceChange,
    passwordLocked,
    todayPracticeCount,
    todayRewardCount,
    recentLogs
  };
}

exports.adminGetDashboard = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const userSnapshot = await db.collection("users").orderBy("userId").limit(1000).get();
  let members = userSnapshot.docs.map(publicAdminMemberRow);
  if (!adminMember.isSuperAdmin) {
    members = members.filter(member => isMemberInAdminScope(adminMember, member));
  }

  const credentialSnapshots = members.length
    ? await db.getAll(...members.map(member => db.collection("memberCredentials").doc(member.userId)))
    : [];
  const credentialStates = credentialSnapshots.map(publicAdminCredentialState);
  const kstDayStart = Timestamp.fromDate(getKstDayStartDate());
  let todayPracticeCount = 0;
  let todayRewardCount = 0;
  let recentLogs = [];

  try {
    const practiceSnapshot = await db.collection("practiceRecords")
      .where("updatedAt", ">=", kstDayStart)
      .limit(1000)
      .get();
    todayPracticeCount = practiceSnapshot.docs
      .map(doc => doc.data() || {})
      .filter(record => adminMember.isSuperAdmin || isMemberInAdminScope(adminMember, {
        grade: record.grade || "",
        classNumber: record.classNumber || "",
        userId: record.memberUserId || record.userId || ""
      }) || members.some(member => member.userId === (record.memberUserId || record.userId || "")))
      .length;
  } catch (error) {
    console.warn("Admin dashboard practice count failed.", error);
  }

  try {
    const rewardSnapshot = await db.collection("rewardLogs")
      .where("createdAt", ">=", kstDayStart)
      .limit(1000)
      .get();
    todayRewardCount = rewardSnapshot.docs
      .map(doc => doc.data() || {})
      .filter(log => adminMember.isSuperAdmin || members.some(member => member.userId === (log.memberUserId || log.userId || "")))
      .length;
  } catch (error) {
    console.warn("Admin dashboard reward count failed.", error);
  }

  if (adminMember.isSuperAdmin) {
    const logSnapshot = await db.collection("adminLogs")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    recentLogs = logSnapshot.docs.map(publicAdminLogRow);
  }

  return {
    success: true,
    dashboard: buildAdminDashboardSummary({
      adminMember,
      members,
      credentialStates,
      todayPracticeCount,
      todayRewardCount,
      recentLogs
    })
  };
});

function normalizeAuditRankingCategoryKey(categoryKey, category = "") {
  const key = String(categoryKey || "").trim();
  const label = String(category || "").trim();
  if (key === "티니핑" || key === "인물티니핑" || label.includes("티니핑")) return "티니핑";
  return key;
}

function normalizeAuditRankingMode(rankingMode) {
  return String(rankingMode || "normal").trim() || "normal";
}

function isBetterAuditRankingRecord(next, current) {
  if (!current) return true;
  const scoreDiff = (Number(next.score) || 0) - (Number(current.score) || 0);
  if (scoreDiff) return scoreDiff > 0;
  return (Number(next.elapsedSeconds) || 999999999) < (Number(current.elapsedSeconds) || 999999999);
}

function buildAuditQuizKingSummary(rows) {
  const bestByUser = new Map();
  const allowedModes = new Set(["normal", "speed", "onechance", "nohint", "legacy"]);
  rows.forEach(record => {
    const memberUserId = String(record.memberUserId || record.userId || "").trim();
    const rankingMode = normalizeAuditRankingMode(record.rankingMode);
    const categoryKey = normalizeAuditRankingCategoryKey(record.categoryKey, record.category);
    if (!memberUserId || !categoryKey || !allowedModes.has(rankingMode) || Number(record.score) <= 0) return;
    if (!bestByUser.has(memberUserId)) bestByUser.set(memberUserId, new Map());
    const byCategory = bestByUser.get(memberUserId);
    const current = byCategory.get(categoryKey);
    if (isBetterAuditRankingRecord(record, current)) byCategory.set(categoryKey, record);
  });
  const summaries = new Map();
  bestByUser.forEach((byCategory, memberUserId) => {
    const bestRows = Array.from(byCategory.values());
    summaries.set(memberUserId, {
      memberUserId,
      totalScore: bestRows.reduce((sum, row) => sum + (Number(row.score) || 0), 0),
      categoryCount: bestRows.length
    });
  });
  return summaries;
}

function publicAuditRecord(doc) {
  return { recordId: doc.id, ...(doc.data() || {}) };
}

exports.adminGetOperationalAudit = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);

  const [
    userSnapshot,
    credentialSnapshot,
    practiceSnapshot,
    rankingSnapshot,
    quizKingSnapshot,
    dailyUsageSnapshot
  ] = await Promise.all([
    db.collection("users").limit(2000).get(),
    db.collection("memberCredentials").limit(2000).get(),
    db.collection("practiceRecords").limit(5000).get(),
    db.collection("rankingRecords").limit(5000).get(),
    db.collection("quizKingSummary").limit(2000).get(),
    db.collection("dailyUsage").limit(5000).get()
  ]);

  const users = userSnapshot.docs.map(doc => ({ memberUserId: doc.id, ...(doc.data() || {}) }));
  const userIds = new Set(users.map(user => user.memberUserId));
  const credentialIds = new Set(credentialSnapshot.docs.map(doc => doc.id));
  const practiceRows = practiceSnapshot.docs.map(publicAuditRecord);
  const rankingRows = rankingSnapshot.docs.map(publicAuditRecord);
  const quizKingRows = quizKingSnapshot.docs.map(publicAuditRecord);
  const dailyUsageRows = dailyUsageSnapshot.docs.map(publicAuditRecord);

  const activeStudents = users.filter(user => user.role !== "admin" && user.active === true && user.status === "active");
  const memberAuthIssues = activeStudents
    .filter(user => !user.authUid || !credentialIds.has(user.memberUserId))
    .slice(0, 20)
    .map(user => ({
      memberUserId: user.memberUserId,
      nickname: user.nickname || user.name || "",
      reason: !user.authUid ? "authUid 없음" : "비밀번호 credential 없음"
    }));

  const orphanPracticeRecordRows = practiceRows
    .filter(row => {
      const memberUserId = String(row.memberUserId || row.userId || "").trim();
      return memberUserId && !userIds.has(memberUserId);
    });
  const orphanPracticeRecords = orphanPracticeRecordRows
    .slice(0, 20)
    .map(row => ({
      recordId: row.recordId,
      memberUserId: row.memberUserId || row.userId || "",
      area: row.area || "",
      detail: row.detail || row.areaKey || ""
    }));

  const orphanRankingRecordRows = rankingRows
    .filter(row => {
      const memberUserId = String(row.memberUserId || row.userId || "").trim();
      return memberUserId && !userIds.has(memberUserId);
    });
  const legacyNameRankingRecordRows = orphanRankingRecordRows
    .filter(row => String(row.memberUserId || row.userId || "").startsWith("legacy_name_"));
  const orphanRankingRecords = orphanRankingRecordRows
    .slice(0, 20)
    .map(row => ({
      recordId: row.recordId,
      memberUserId: row.memberUserId || row.userId || "",
      category: row.category || row.categoryKey || "",
      score: Number(row.score) || 0,
      legacyNameOnly: String(row.memberUserId || row.userId || "").startsWith("legacy_name_")
    }));

  const suspiciousRankingRecordRows = rankingRows
    .filter(row => {
      const score = Number(row.score) || 0;
      const elapsedSeconds = Number(row.elapsedSeconds) || 0;
      return score < 0 || score > 1000 || elapsedSeconds > 21600;
    });
  const suspiciousRankingRecords = suspiciousRankingRecordRows
    .slice(0, 20)
    .map(row => ({
      recordId: row.recordId,
      memberUserId: row.memberUserId || row.userId || "",
      category: row.category || row.categoryKey || "",
      score: Number(row.score) || 0,
      elapsedSeconds: Number(row.elapsedSeconds) || 0
    }));
  const overLimitRankingRecordRows = rankingRows
    .filter(row => (Number(row.elapsedSeconds) || 0) > 1200)
    .sort((a, b) => (Number(b.elapsedSeconds) || 0) - (Number(a.elapsedSeconds) || 0));
  const overLimitRankingRecords = overLimitRankingRecordRows
    .slice(0, 20)
    .map(row => ({
      recordId: row.recordId,
      memberUserId: row.memberUserId || row.userId || "",
      category: row.category || row.categoryKey || "",
      score: Number(row.score) || 0,
      elapsedSeconds: Number(row.elapsedSeconds) || 0,
      rankingMode: row.rankingMode || "normal"
    }));

  const latestDailyUsageRows = dailyUsageRows
    .slice()
    .sort((a, b) => Number(b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0) - Number(a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0))
    .slice(0, 20)
    .map(row => ({
      recordId: row.recordId,
      memberUserId: row.memberUserId || row.userId || "",
      date: row.date || "",
      funSeconds: Number(row.funSeconds) || 0,
      after4FunSeconds: Number(row.after4FunSeconds) || 0,
      eduCorrectCount: Number(row.eduCorrectCount) || 0,
      unlockBaseEduCorrectCount: Number(row.unlockBaseEduCorrectCount) || 0,
      updatedAt: row.updatedAt || row.createdAt || null
    }));

  const calculatedQuizKing = buildAuditQuizKingSummary(rankingRows);
  const quizKingMismatchRows = quizKingRows
    .map(row => {
      const memberUserId = String(row.memberUserId || row.recordId || "").trim();
      const calculated = calculatedQuizKing.get(memberUserId) || { totalScore: 0, categoryCount: 0 };
      return {
        memberUserId,
        storedTotalScore: Number(row.totalScore) || 0,
        storedCategoryCount: Number(row.categoryCount) || 0,
        calculatedTotalScore: calculated.totalScore,
        calculatedCategoryCount: calculated.categoryCount
      };
    })
    .filter(row => row.storedTotalScore !== row.calculatedTotalScore || row.storedCategoryCount !== row.calculatedCategoryCount);
  const quizKingMismatch = quizKingMismatchRows
    .slice(0, 20);

  return {
    success: true,
    audit: {
      checkedAt: Timestamp.now(),
      metrics: {
        users: users.length,
        activeStudents: activeStudents.length,
        missingAuthUid: activeStudents.filter(user => !user.authUid).length,
        missingCredentials: activeStudents.filter(user => !credentialIds.has(user.memberUserId)).length,
        orphanPracticeRecords: orphanPracticeRecordRows.length,
        orphanRankingRecords: orphanRankingRecordRows.length,
        legacyNameRankingRecords: legacyNameRankingRecordRows.length,
        suspiciousRankingRecords: suspiciousRankingRecordRows.length,
        overLimitRankingRecords: overLimitRankingRecordRows.length,
        dailyUsageRecords: dailyUsageRows.length,
        quizKingMismatch: quizKingMismatchRows.length
      },
      issues: {
        memberAuth: memberAuthIssues,
        orphanPracticeRecords,
        orphanRankingRecords,
        suspiciousRankingRecords,
        overLimitRankingRecords,
        latestDailyUsage: latestDailyUsageRows,
        quizKingMismatch
      }
    }
  };
});

function getQuestionPrompt(data) {
  return String(data.prompt || data.question || data.text || "").trim();
}

function getQuestionAnswer(data) {
  return String(data.answer || data.answerText || data.correctAnswer || "").trim();
}

function getQuestionImageRef(data) {
  return String(data.imageUrl || data.imageFileId || data.imageStoragePath || "").trim();
}

function isImageQuestion(data) {
  const type = String(data.questionType || data.type || "").trim();
  return type === "imageInput" || type === "image-choice" || Boolean(data.imageRequired);
}

function isChoiceQuestion(data) {
  if (isImageQuestion(data)) return false;
  const type = String(data.questionType || data.type || "").trim();
  return type.includes("Choice") || type === "choice" || Array.isArray(data.choices);
}

function getQuestionQualityReason(data) {
  const prompt = getQuestionPrompt(data);
  const answer = getQuestionAnswer(data);
  const choices = Array.isArray(data.choices) ? data.choices.filter(choice => String(choice || "").trim()) : [];
  const answerIndex = Number(data.answerIndex);
  if (!prompt) return "문항/프롬프트가 비어 있음";
  if (!answer && !Number.isInteger(answerIndex)) return "정답이 비어 있음";
  if (isChoiceQuestion(data)) {
    if (choices.length < 2) return "보기 수 부족";
    if (Number.isInteger(answerIndex) && (answerIndex < 0 || answerIndex >= choices.length)) return "answerIndex 범위 오류";
  }
  if (isImageQuestion(data) && !getQuestionImageRef(data)) return "이미지 참조 없음";
  return "";
}

exports.adminGetQuizQualityAudit = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);

  const [quizSnapshot, featureFlags] = await Promise.all([
    db.collection("quizzes").limit(300).get(),
    getFeatureFlags().catch(() => DEFAULT_FEATURE_FLAGS)
  ]);
  const disabledQuizIds = new Set(publicFeatureFlags(featureFlags).disabledQuizIds || []);
  const quizDocs = quizSnapshot.docs.map(doc => ({ quizId: doc.id, ...(doc.data() || {}) }));
  const questionSnapshots = await Promise.all(quizDocs.map(quiz =>
    db.collection("quizQuestions").doc(quiz.quizId).collection("questions").limit(1200).get()
      .catch(error => {
        console.warn("Admin quiz quality question read failed.", quiz.quizId, error);
        return null;
      })
  ));

  const quizSummaries = [];
  const invalidQuestions = [];
  const missingImages = [];
  const duplicateQuestionIds = [];
  let questionCount = 0;
  let invalidQuestionCount = 0;
  let missingImageCount = 0;
  let duplicateQuestionIdCount = 0;

  quizDocs.forEach((quiz, index) => {
    const snapshot = questionSnapshots[index];
    const questions = snapshot ? snapshot.docs.map(publicAuditRecord) : [];
    const seenIds = new Map();
    questionCount += questions.length;

    questions.forEach(question => {
      const questionId = String(question.questionId || question.recordId || "").trim();
      if (questionId) seenIds.set(questionId, (seenIds.get(questionId) || 0) + 1);
      const reason = getQuestionQualityReason(question);
      if (reason) {
        invalidQuestionCount += 1;
        if (invalidQuestions.length < 30) {
          invalidQuestions.push({
            quizId: quiz.quizId,
            questionId: questionId || question.recordId,
            reason
          });
        }
      }
      if (isImageQuestion(question) && !getQuestionImageRef(question)) {
        missingImageCount += 1;
        if (missingImages.length < 30) {
          missingImages.push({
            quizId: quiz.quizId,
            questionId: questionId || question.recordId,
            answer: getQuestionAnswer(question),
            prompt: getQuestionPrompt(question)
          });
        }
      }
    });

    seenIds.forEach((count, questionId) => {
      if (count <= 1) return;
      duplicateQuestionIdCount += count;
      if (duplicateQuestionIds.length < 30) {
        duplicateQuestionIds.push({ quizId: quiz.quizId, questionId, count });
      }
    });

    quizSummaries.push({
      quizId: quiz.quizId,
      title: quiz.title || quiz.name || "",
      questionCount: questions.length,
      expectedQuestionCount: Number(quiz.questionCount) || 0,
      disabled: disabledQuizIds.has(quiz.quizId),
      generatorType: quiz.generatorType || ""
    });
  });

  quizSummaries.sort((a, b) => String(a.quizId).localeCompare(String(b.quizId)));

  return {
    success: true,
    audit: {
      checkedAt: Timestamp.now(),
      metrics: {
        quizCount: quizDocs.length,
        questionCount,
        disabledQuizCount: quizSummaries.filter(quiz => quiz.disabled).length,
        invalidQuestionCount,
        missingImageCount,
        duplicateQuestionIdCount
      },
      quizSummaries,
      issues: {
        invalidQuestions,
        missingImages,
        duplicateQuestionIds
      }
    }
  };
});

exports.adminListMembers = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const grade = String(payload.grade || "").trim();
  const classNumber = String(payload.classNumber || "").trim();
  const queryText = String(payload.query || "").trim().toLowerCase();
  const memberStatus = String(payload.memberStatus || "").trim().toLowerCase();
  const authStatus = String(payload.authStatus || "").trim().toLowerCase();
  const passwordStatus = String(payload.passwordStatus || "").trim().toLowerCase();
  const limit = Math.max(1, Math.min(Number(payload.limit) || 80, 200));

  const snapshot = await db.collection("users").orderBy("userId").limit(1000).get();
  let members = snapshot.docs.map(publicAdminMemberRow);
  if (!adminMember.isSuperAdmin) {
    members = members.filter(member => isMemberInAdminScope(adminMember, member));
  }

  if (grade) {
    members = members.filter(member => String(member.grade) === grade);
  }
  if (classNumber) {
    members = members.filter(member => String(member.classNumber) === classNumber);
  }
  if (memberStatus === "active") {
    members = members.filter(member => member.active && member.status === "active" && member.role !== "admin");
  } else if (memberStatus === "inactive") {
    members = members.filter(member => !member.active || member.status !== "active");
  } else if (memberStatus === "admin") {
    members = members.filter(member => member.role === "admin");
  }
  if (authStatus === "linked") {
    members = members.filter(member => member.authLinked);
  } else if (authStatus === "unlinked") {
    members = members.filter(member => !member.authLinked);
  }
  if (queryText) {
    members = members.filter(member => [
      member.userId,
      member.school,
      member.nickname,
      `${member.grade}-${member.classNumber}-${member.studentNumber}`
    ].join(" ").toLowerCase().includes(queryText));
  }
  const needsPasswordFilter = ["configured", "missing", "force", "locked"].includes(passwordStatus);
  const credentialTargetMembers = needsPasswordFilter ? members : members.slice(0, limit);
  const credentialSnapshots = credentialTargetMembers.length
    ? await db.getAll(...credentialTargetMembers.map(member => db.collection("memberCredentials").doc(member.userId)))
    : [];
  const credentialsByUserId = new Map(
    credentialSnapshots.map(snapshot => [snapshot.id, publicAdminCredentialState(snapshot)])
  );
  if (needsPasswordFilter) {
    members.forEach(member => {
      member.passwordState = credentialsByUserId.get(member.userId) || publicAdminCredentialState({ exists: false });
    });
    members = members.filter(member => {
      const state = member.passwordState || {};
      if (passwordStatus === "configured") return state.passwordConfigured && !state.forcePasswordChange && !state.locked;
      if (passwordStatus === "missing") return !state.passwordConfigured;
      if (passwordStatus === "force") return state.forcePasswordChange;
      if (passwordStatus === "locked") return state.locked;
      return true;
    });
  }
  const selectedMembers = members.slice(0, limit);
  selectedMembers.forEach(member => {
    member.passwordState = credentialsByUserId.get(member.userId) || publicAdminCredentialState({ exists: false });
  });

  const summary = members.reduce((acc, member) => {
    acc.total += 1;
    if (member.role === "admin") acc.admins += 1;
    if (member.role === "student" && member.active && member.status === "active") acc.activeStudents += 1;
    if (!member.active || member.status !== "active") acc.inactive += 1;
    return acc;
  }, { total: 0, activeStudents: 0, inactive: 0, admins: 0 });
  summary.displayedPasswordConfigured = selectedMembers.filter(member => member.passwordState.passwordConfigured).length;
  summary.displayedForcePasswordChange = selectedMembers.filter(member => member.passwordState.forcePasswordChange).length;

  return {
    success: true,
    adminUserId: adminMember.memberUserId,
    summary,
    members: selectedMembers
  };
});

exports.adminResetMemberPassword = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");

  const result = await db.runTransaction(async transaction => {
    const memberRef = db.collection("users").doc(memberUserId);
    const credentialsRef = db.collection("memberCredentials").doc(memberUserId);
    const memberSnapshot = await transaction.get(memberRef);
    if (!memberSnapshot.exists) {
      throw new HttpsError("not-found", "Member not found.");
    }
    const memberData = memberSnapshot.data() || {};
    assertActiveMember(memberData);
    assertAdminCanAccessMember(adminMember, memberUserId, memberData, { allowSelf: true });
    if (memberData.role === "admin" && !adminMember.isSuperAdmin && adminMember.memberUserId !== memberUserId) {
      throw new HttpsError("permission-denied", "Other admin passwords cannot be reset here.");
    }
    const temporaryPassword = normalizePassword(buildTemporaryMemberPassword({
      grade: memberData.grade,
      classNumber: memberData.classNumber,
      studentNumber: memberData.studentNumber
    }));
    transaction.set(credentialsRef, {
      memberUserId,
      ...createPasswordHash(temporaryPassword),
      forcePasswordChange: true,
      failedAttempts: 0,
      lockedUntil: null,
      passwordMode: "temporary_identity",
      resetAt: FieldValue.serverTimestamp(),
      resetByAuthUid: authUid,
      resetByAdminUserId: adminMember.memberUserId,
      resetSource: "admin",
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(memberRef, {
      passwordMode: "temporary_identity",
      initialPasswordChanged: false,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { memberData, temporaryPassword };
  });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminResetMemberPassword",
    targetUserId: memberUserId,
    before: { forcePasswordChange: false },
    after: { forcePasswordChange: true },
    reason: String(payload.reason || "")
  });

  return {
    success: true,
    memberUserId,
    temporaryPassword: result.temporaryPassword,
    profile: publicMemberProfile(memberUserId, result.memberData)
  };
});

exports.adminGetMemberDetail = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");

  const userRef = db.collection("users").doc(memberUserId);
  const credentialsRef = db.collection("memberCredentials").doc(memberUserId);
  const economyRef = db.collection("userEconomy").doc(memberUserId);
  const summaryRef = db.collection("userPracticeSummary").doc(memberUserId);
  const titleSummaryRef = db.collection("userTitleSummary").doc(memberUserId);

  const [
    userSnapshot,
    credentialsSnapshot,
    economySnapshot,
    summarySnapshot,
    titleSummarySnapshot,
    badgeSnapshot,
    titleSnapshot,
    practiceSnapshot
  ] = await Promise.all([
    userRef.get(),
    credentialsRef.get(),
    economyRef.get(),
    summaryRef.get(),
    titleSummaryRef.get(),
    db.collection("userBadges").doc(memberUserId).collection("badges").limit(120).get(),
    db.collection("userTitles").doc(memberUserId).collection("titles").limit(160).get(),
    db.collection("practiceRecords")
      .where("memberUserId", "==", memberUserId)
      .limit(80)
      .get()
  ]);

  if (!userSnapshot.exists) {
    throw new HttpsError("not-found", "Member not found.");
  }
  const memberData = userSnapshot.data() || {};
  assertAdminCanAccessMember(adminMember, memberUserId, memberData, { allowSelf: true });
  const classroomId = memberData.grade && memberData.classNumber
    ? `G${memberData.grade}-C${memberData.classNumber}`
    : "";
  const classroomWalletSnapshot = classroomId
    ? await db.collection("classrooms").doc(classroomId).collection("studentWallets").doc(memberUserId).get()
    : null;

  const economy = economySnapshot.exists ? economySnapshot.data() || {} : {};
  const classroomWallet = classroomWalletSnapshot?.exists ? classroomWalletSnapshot.data() || {} : {};
  const summary = summarySnapshot.exists ? summarySnapshot.data() || {} : {};
  const titleSummary = titleSummarySnapshot.exists ? titleSummarySnapshot.data() || {} : {};
  const badges = badgeSnapshot.docs.map(doc => {
    const data = doc.data() || {};
    return {
      badgeId: data.badgeId || doc.id,
      label: data.label || data.name || doc.id,
      group: data.group || "",
      correct: Number(data.correct || 0),
      total: Number(data.total || 0),
      starCount: Number(data.starCount || 0),
      completed: data.completed === true
    };
  });
  const titles = titleSnapshot.docs.map(doc => {
    const data = doc.data() || {};
    return {
      titleId: data.titleId || doc.id,
      titleName: data.titleName || data.name || data.titleId || doc.id,
      selected: data.selected === true
    };
  });
  const practiceRecords = practiceSnapshot.docs
    .map(publicAdminPracticeRecord)
    .sort((a, b) => timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt))
    .slice(0, 20);

  return {
    success: true,
    memberUserId,
    profile: publicAdminMemberRow(userSnapshot),
    passwordState: publicAdminCredentialState(credentialsSnapshot),
    economy: {
      djCoin: Number(economy.djCoin ?? economy.coin ?? 0),
      totalEarned: Number(economy.totalEarned || 0),
      totalSpent: Number(economy.totalSpent || 0),
      updatedAt: economy.updatedAt || null
    },
    classroomWallet: {
      classId: classroomId,
      point: getClassroomPointAmount(classroomWallet),
      updatedAt: classroomWallet.updatedAt || null
    },
    practiceSummary: {
      totalStars: Number(summary.totalStars || 0),
      recordCount: Number(summary.recordCount || 0),
      earnedBadgeCount: Number(summary.earnedBadgeCount || 0),
      legacyUnknownRecordCount: Number(summary.legacyUnknownRecordCount || 0),
      updatedAt: summary.updatedAt || null
    },
    titleSummary: {
      selectedTitleId: titleSummary.selectedTitleId || "",
      selectedTitleName: titleSummary.selectedTitleName || "",
      ownedCount: Number(titleSummary.ownedCount || titles.length || 0),
      updatedAt: titleSummary.updatedAt || null
    },
    counts: {
      badges: badges.length,
      titles: titles.length,
      practiceRecords: practiceRecords.length
    },
    badges: badges.slice(0, 20),
    titles: titles.slice(0, 24),
    practiceRecords
  };
});

exports.adminAdjustMemberWallet = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const currency = String(payload.currency || "").trim();
  const delta = Math.round(Number(payload.delta));
  const reason = String(payload.reason || "").trim().slice(0, 200);
  if (!["djCoin", "point"].includes(currency)) {
    throw new HttpsError("invalid-argument", "currency must be djCoin or point.");
  }
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000) {
    throw new HttpsError("invalid-argument", "delta must be between -100000 and 100000, excluding zero.");
  }

  const result = await db.runTransaction(async transaction => {
    const memberRef = db.collection("users").doc(memberUserId);
    const memberSnapshot = await transaction.get(memberRef);
    if (!memberSnapshot.exists) throw new HttpsError("not-found", "Member not found.");
    const memberData = memberSnapshot.data() || {};
    if (memberData.role === "admin") {
      throw new HttpsError("failed-precondition", "Admin wallet cannot be adjusted here.");
    }
    assertActiveStudent(memberData);

    const classId = currency === "point"
      ? normalizeId(payload.classId || `G${memberData.grade}-C${memberData.classNumber}`, "classId")
      : "";
    const walletRef = currency === "djCoin"
      ? db.collection("userEconomy").doc(memberUserId)
      : db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
    const walletSnapshot = await transaction.get(walletRef);
    const wallet = walletSnapshot.exists ? walletSnapshot.data() || {} : {};
    const currentAmount = Number(currency === "djCoin" ? (wallet.djCoin ?? wallet.coin ?? 0) : getClassroomPointAmount(wallet)) || 0;
    const nextAmount = currentAmount + delta;
    if (nextAmount < 0) {
      throw new HttpsError("failed-precondition", "Wallet balance cannot become negative.");
    }

    const update = currency === "djCoin"
      ? {
          userId: memberUserId,
          djCoin: nextAmount,
          adminAdjustedDjCoin: FieldValue.increment(delta),
          lastAdminAdjustmentDelta: delta,
          lastAdminAdjustedBy: adminMember.memberUserId,
          lastAdminAdjustmentReason: reason,
          updatedAt: FieldValue.serverTimestamp(),
          adminAdjustedAt: FieldValue.serverTimestamp()
        }
      : {
          memberUserId,
          userId: memberUserId,
          classId,
          point: nextAmount,
          adminAdjustedPoint: FieldValue.increment(delta),
          lastAdminAdjustmentDelta: delta,
          lastAdminAdjustedBy: adminMember.memberUserId,
          lastAdminAdjustmentReason: reason,
          updatedAt: FieldValue.serverTimestamp(),
          adminAdjustedAt: FieldValue.serverTimestamp()
        };
    transaction.set(walletRef, update, { merge: true });

    return {
      classId,
      beforeAmount: currentAmount,
      afterAmount: nextAmount,
      walletPath: walletRef.path,
      memberProfile: publicMemberProfile(memberUserId, memberData)
    };
  });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminAdjustMemberWallet",
    targetUserId: memberUserId,
    before: {
      currency,
      amount: result.beforeAmount,
      classId: result.classId || ""
    },
    after: {
      currency,
      amount: result.afterAmount,
      delta,
      classId: result.classId || "",
      walletPath: result.walletPath
    },
    reason: reason || "wallet adjustment"
  });

  return {
    success: true,
    memberUserId,
    currency,
    delta,
    classId: result.classId || "",
    beforeAmount: result.beforeAmount,
    afterAmount: result.afterAmount,
    walletPath: result.walletPath,
    profile: result.memberProfile
  };
});

exports.adminAdjustAdminWallet = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const delta = Math.round(Number(payload.delta));
  const reason = String(payload.reason || "").trim().slice(0, 200);
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000) {
    throw new HttpsError("invalid-argument", "delta must be between -100000 and 100000, excluding zero.");
  }

  const result = await db.runTransaction(async transaction => {
    const memberRef = db.collection("users").doc(memberUserId);
    const walletRef = db.collection("userEconomy").doc(memberUserId);
    const [memberSnapshot, walletSnapshot] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(walletRef)
    ]);
    if (!memberSnapshot.exists) throw new HttpsError("not-found", "Member not found.");
    const memberData = memberSnapshot.data() || {};
    assertActiveMember(memberData);
    if (memberData.role !== "admin") {
      throw new HttpsError("failed-precondition", "Target member is not an admin.");
    }

    const wallet = walletSnapshot.exists ? walletSnapshot.data() || {} : {};
    const currentAmount = Number(wallet.djCoin ?? wallet.coin ?? 0) || 0;
    const nextAmount = currentAmount + delta;
    if (nextAmount < 0) {
      throw new HttpsError("failed-precondition", "Wallet balance cannot become negative.");
    }

    transaction.set(walletRef, {
      userId: memberUserId,
      djCoin: nextAmount,
      adminAdjustedDjCoin: FieldValue.increment(delta),
      lastAdminAdjustmentDelta: delta,
      lastAdminAdjustedBy: adminMember.memberUserId,
      lastAdminAdjustmentReason: reason,
      lastAdminTargetRole: "admin",
      updatedAt: FieldValue.serverTimestamp(),
      adminAdjustedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      beforeAmount: currentAmount,
      afterAmount: nextAmount,
      walletPath: walletRef.path,
      memberProfile: publicMemberProfile(memberUserId, memberData)
    };
  });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminAdjustAdminWallet",
    targetUserId: memberUserId,
    before: {
      currency: "djCoin",
      amount: result.beforeAmount
    },
    after: {
      currency: "djCoin",
      amount: result.afterAmount,
      delta,
      walletPath: result.walletPath
    },
    reason: reason || "admin wallet adjustment"
  });

  return {
    success: true,
    memberUserId,
    currency: "djCoin",
    delta,
    beforeAmount: result.beforeAmount,
    afterAmount: result.afterAmount,
    walletPath: result.walletPath,
    profile: result.memberProfile
  };
});

exports.adminSetClassAdmin = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  if (memberUserId === SUPER_ADMIN_MEMBER_USER_ID) {
    throw new HttpsError("failed-precondition", "Super admin role cannot be changed here.");
  }
  const enabled = payload.enabled !== false;

  const result = await db.runTransaction(async transaction => {
    const memberRef = db.collection("users").doc(memberUserId);
    const memberSnapshot = await transaction.get(memberRef);
    if (!memberSnapshot.exists) throw new HttpsError("not-found", "Member not found.");
    const before = memberSnapshot.data() || {};
    assertActiveMember(before);
    const scopeGrade = String(payload.scopeGrade || before.grade || "").trim();
    const scopeClassNumber = String(payload.scopeClassNumber || before.classNumber || "").trim();
    if (enabled && (!scopeGrade || !scopeClassNumber)) {
      throw new HttpsError("invalid-argument", "Class admin scope is required.");
    }
    const update = enabled
      ? {
          role: "admin",
          adminLevel: "classAdmin",
          adminScopeGrade: scopeGrade,
          adminScopeClassNumber: scopeClassNumber,
          updatedAt: FieldValue.serverTimestamp(),
          adminGrantedAt: FieldValue.serverTimestamp(),
          adminGrantedByAdminUserId: adminMember.memberUserId
        }
      : {
          role: "student",
          adminLevel: FieldValue.delete(),
          adminScopeGrade: FieldValue.delete(),
          adminScopeClassNumber: FieldValue.delete(),
          adminRevokedAt: FieldValue.serverTimestamp(),
          adminRevokedByAdminUserId: adminMember.memberUserId,
          updatedAt: FieldValue.serverTimestamp()
        };
    transaction.set(memberRef, update, { merge: true });
    return { before, after: { enabled, scopeGrade, scopeClassNumber } };
  });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: enabled ? "adminGrantClassAdmin" : "adminRevokeClassAdmin",
    targetUserId: memberUserId,
    before: {
      role: result.before.role || "",
      adminLevel: result.before.adminLevel || "",
      adminScopeGrade: result.before.adminScopeGrade || "",
      adminScopeClassNumber: result.before.adminScopeClassNumber || ""
    },
    after: result.after,
    reason: "class admin permission update"
  });

  return {
    success: true,
    memberUserId,
    classAdmin: enabled,
    scopeGrade: result.after.scopeGrade,
    scopeClassNumber: result.after.scopeClassNumber
  };
});

exports.adminUpdateMemberStatus = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const nextStatus = String(payload.status || "").trim().toLowerCase();
  if (!["active", "inactive"].includes(nextStatus)) {
    throw new HttpsError("invalid-argument", "status must be active or inactive.");
  }
  if (memberUserId === adminMember.memberUserId && nextStatus === "inactive") {
    throw new HttpsError("permission-denied", "Admin cannot deactivate self.");
  }

  const result = await db.runTransaction(async transaction => {
    const memberRef = db.collection("users").doc(memberUserId);
    const memberSnapshot = await transaction.get(memberRef);
    if (!memberSnapshot.exists) throw new HttpsError("not-found", "Member not found.");
    const before = memberSnapshot.data() || {};
    assertAdminCanAccessMember(adminMember, memberUserId, before);
    transaction.set(memberRef, {
      status: nextStatus,
      active: nextStatus === "active",
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { before };
  });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminUpdateMemberStatus",
    targetUserId: memberUserId,
    before: { status: result.before.status, active: result.before.active },
    after: { status: nextStatus, active: nextStatus === "active" },
    reason: String(payload.reason || "")
  });

  return { success: true, memberUserId, status: nextStatus, active: nextStatus === "active" };
});

exports.adminUpdateMemberVisibility = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const classroomHidden = payload.classroomHidden === true;

  const result = await db.runTransaction(async transaction => {
    const memberRef = db.collection("users").doc(memberUserId);
    const memberSnapshot = await transaction.get(memberRef);
    if (!memberSnapshot.exists) throw new HttpsError("not-found", "Member not found.");
    const before = memberSnapshot.data() || {};
    assertAdminCanAccessMember(adminMember, memberUserId, before);
    if (before.role === "admin") {
      throw new HttpsError("failed-precondition", "Admin members cannot be hidden from classroom cards.");
    }
    transaction.set(memberRef, {
      classroomHidden,
      hiddenFromClassroom: classroomHidden,
      classroomHiddenUpdatedAt: FieldValue.serverTimestamp(),
      classroomHiddenUpdatedBy: adminMember.memberUserId,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return {
      before,
      beforeHidden: !isClassroomStudentCardVisible(memberUserId, before)
    };
  });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminUpdateMemberVisibility",
    targetUserId: memberUserId,
    before: { classroomHidden: result.beforeHidden },
    after: { classroomHidden },
    reason: String(payload.reason || "classroom visibility update")
  });

  return { success: true, memberUserId, classroomHidden };
});

exports.adminUnlinkMemberAuth = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  if (memberUserId === adminMember.memberUserId) {
    throw new HttpsError("permission-denied", "Admin cannot unlink self here.");
  }

  const result = await db.runTransaction(async transaction => {
    const memberRef = db.collection("users").doc(memberUserId);
    const memberSnapshot = await transaction.get(memberRef);
    if (!memberSnapshot.exists) throw new HttpsError("not-found", "Member not found.");
    const before = memberSnapshot.data() || {};
    assertAdminCanAccessMember(adminMember, memberUserId, before);
    transaction.set(memberRef, {
      previousAuthUid: before.authUid || before.previousAuthUid || "",
      authUid: "",
      authUnlinkedAt: FieldValue.serverTimestamp(),
      authUnlinkedByAdminUserId: adminMember.memberUserId,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { before };
  });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminUnlinkMemberAuth",
    targetUserId: memberUserId,
    before: { authLinked: !!result.before.authUid },
    after: { authLinked: false },
    reason: String(payload.reason || "")
  });

  return { success: true, memberUserId, authLinked: false };
});

exports.adminGetPasswordSetupSettings = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const snapshot = await db.collection("authSettings").doc("memberPasswordSetup").get();
  const settings = snapshot.exists
    ? { setupEnabled: true, setupExpiresAt: dateToTimestamp(DEFAULT_PASSWORD_SETUP_EXPIRES_AT), minPasswordLength: 4, maxFailedAttempts: MAX_FAILED_ATTEMPTS, lockMinutes: 10, ...(snapshot.data() || {}) }
    : { setupEnabled: true, setupExpiresAt: dateToTimestamp(DEFAULT_PASSWORD_SETUP_EXPIRES_AT), minPasswordLength: 4, maxFailedAttempts: MAX_FAILED_ATTEMPTS, lockMinutes: 10 };
  return {
    success: true,
    settings: publicAdminPasswordSetupSettings(settings)
  };
});

exports.adminUpdatePasswordSetupSettings = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const settingsRef = db.collection("authSettings").doc("memberPasswordSetup");
  const beforeSnapshot = await settingsRef.get();
  const before = beforeSnapshot.exists
    ? publicAdminPasswordSetupSettings(beforeSnapshot.data() || {})
    : null;
  const nextSettings = normalizeAdminPasswordSetupSettings(payload.settings || payload);

  await settingsRef.set({
    ...nextSettings,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByAdminUserId: adminMember.memberUserId,
    updatedBy: "admin-center"
  }, { merge: true });

  const after = publicAdminPasswordSetupSettings(nextSettings);
  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminUpdatePasswordSetupSettings",
    targetUserId: "authSettings/memberPasswordSetup",
    before,
    after,
    reason: "password setup settings update"
  });

  return {
    success: true,
    settings: after
  };
});

exports.adminListLogs = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const limit = Math.max(1, Math.min(Number(payload.limit) || 40, 100));
  const action = String(payload.action || "").trim();
  const targetQuery = String(payload.targetUserId || "").trim().toLowerCase();
  const snapshot = await db.collection("adminLogs")
    .orderBy("createdAt", "desc")
    .limit(action || targetQuery ? 200 : limit)
    .get();
  let logs = snapshot.docs.map(publicAdminLogRow);
  if (action) {
    logs = logs.filter(log => log.action === action);
  }
  if (targetQuery) {
    logs = logs.filter(log => String(log.targetUserId || "").toLowerCase().includes(targetQuery));
  }
  return {
    success: true,
    logs: logs.slice(0, limit)
  };
});

function publicNoticeBoard(data) {
  const startsAtIso = String(data?.startsAtIso || data?.startsAt || "").trim();
  const endsAtIso = String(data?.endsAtIso || data?.endsAt || "").trim();
  return {
    title: String(data?.title || "알림판").trim().slice(0, 40),
    desc: String(data?.desc || "공지와 오늘의 퀴즈를 확인하고 바로 이동할 수 있습니다.").trim().slice(0, 120),
    summary: String(data?.summary || "").trim().slice(0, 180),
    announcement: String(data?.announcement || "오늘도 연습전과 랭킹전을 자유롭게 이용할 수 있어요.").trim().slice(0, 160),
    quest: String(data?.quest || "이벤트 광장에서 개인 미션을 확인하세요.").trim().slice(0, 160),
    recommendedQuizLabel: String(data?.recommendedQuizLabel || "학교에서 과목관을 골라 바로 시작하세요.").trim().slice(0, 80),
    recommendedQuizId: String(data?.recommendedQuizId || "").trim().slice(0, 80),
    recommendedQuiz2Label: String(data?.recommendedQuiz2Label || "").trim().slice(0, 80),
    recommendedQuiz2Id: String(data?.recommendedQuiz2Id || "").trim().slice(0, 80),
    startsAtIso: startsAtIso.slice(0, 40),
    endsAtIso: endsAtIso.slice(0, 40),
    active: data?.active !== false
  };
}

exports.adminGetNoticeBoard = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const snapshot = await db.collection("noticeBoard").doc("current").get();
  return {
    success: true,
    notice: publicNoticeBoard(snapshot.exists ? snapshot.data() || {} : {})
  };
});

exports.adminUpdateNoticeBoard = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const nextNotice = publicNoticeBoard(payload.notice || payload);
  const noticeRef = db.collection("noticeBoard").doc("current");
  const beforeSnapshot = await noticeRef.get();
  const before = beforeSnapshot.exists ? publicNoticeBoard(beforeSnapshot.data() || {}) : null;

  await noticeRef.set({
    ...nextNotice,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByAdminUserId: adminMember.memberUserId
  }, { merge: true });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminUpdateNoticeBoard",
    targetUserId: "noticeBoard/current",
    before,
    after: nextNotice,
    reason: "notice board update"
  });

  return {
    success: true,
    notice: nextNotice
  };
});

exports.adminGetFeatureFlags = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const flags = await getFeatureFlags();
  return {
    success: true,
    flags
  };
});

exports.adminUpdateFeatureFlags = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const before = await getFeatureFlags();
  const next = publicFeatureFlags(payload.flags || payload);
  let externalQuizUpdate = null;

  await db.doc(FEATURE_FLAGS_DOC_PATH).set({
    ...next,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByAdminUserId: adminMember.memberUserId
  }, { merge: true });

  if (next.externalQuizzesEnabled === false) {
    const externalRef = db.doc(EXTERNAL_QUIZZES_DOC_PATH);
    const beforeExternalSnapshot = await externalRef.get();
    const beforeExternal = beforeExternalSnapshot.exists
      ? publicExternalQuizzes(beforeExternalSnapshot.data() || {})
      : DEFAULT_EXTERNAL_QUIZZES;
    const nextExternal = publicExternalQuizzes({
      items: (beforeExternal.items || []).map(item => ({
        ...item,
        active: false
      }))
    });
    const changed = JSON.stringify(beforeExternal) !== JSON.stringify(nextExternal);
    if (changed) {
      await externalRef.set({
        ...nextExternal,
        updatedAt: FieldValue.serverTimestamp(),
        updatedByAdminUserId: adminMember.memberUserId
      }, { merge: true });
      externalQuizUpdate = { before: beforeExternal, after: nextExternal };
    }
  }

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminUpdateFeatureFlags",
    targetUserId: FEATURE_FLAGS_DOC_PATH,
    before,
    after: next,
    reason: "feature flags update"
  });

  if (externalQuizUpdate) {
    await writeAdminLog({
      adminUserId: adminMember.memberUserId,
      action: "adminUpdateExternalQuizzes",
      targetUserId: EXTERNAL_QUIZZES_DOC_PATH,
      before: externalQuizUpdate.before,
      after: externalQuizUpdate.after,
      reason: "external quizzes disabled by feature flag"
    });
  }

  return {
    success: true,
    flags: next
  };
});

exports.adminGetExternalQuizzes = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const snapshot = await db.doc(EXTERNAL_QUIZZES_DOC_PATH).get();
  return {
    success: true,
    externalQuizzes: publicExternalQuizzes(snapshot.exists ? snapshot.data() || {} : DEFAULT_EXTERNAL_QUIZZES)
  };
});

exports.adminUpdateExternalQuizzes = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const beforeSnapshot = await db.doc(EXTERNAL_QUIZZES_DOC_PATH).get();
  const before = beforeSnapshot.exists ? publicExternalQuizzes(beforeSnapshot.data() || {}) : DEFAULT_EXTERNAL_QUIZZES;
  const next = publicExternalQuizzes(payload.externalQuizzes || payload);

  await db.doc(EXTERNAL_QUIZZES_DOC_PATH).set({
    ...next,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByAdminUserId: adminMember.memberUserId
  }, { merge: true });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminUpdateExternalQuizzes",
    targetUserId: EXTERNAL_QUIZZES_DOC_PATH,
    before,
    after: next,
    reason: "external quizzes update"
  });

  return {
    success: true,
    externalQuizzes: next
  };
});

exports.getPublicSeasonEvents = onCall({ region: REGION }, async request => {
  requireAuth(request);
  const snapshot = await db.doc(SEASON_EVENTS_DOC_PATH).get();
  return {
    success: true,
    seasonEvents: publicSeasonEvents(snapshot.exists ? snapshot.data() || {} : DEFAULT_SEASON_EVENTS)
  };
});

exports.adminGetSeasonEvents = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const snapshot = await db.doc(SEASON_EVENTS_DOC_PATH).get();
  const lock = getSeasonEventsUpdateLock(snapshot);
  return {
    success: true,
    seasonEvents: publicSeasonEvents(snapshot.exists ? snapshot.data() || {} : DEFAULT_SEASON_EVENTS),
    canUpdate: !lock.locked,
    lockedUntilIso: lock.lockedUntilIso
  };
});

exports.adminUpdateSeasonEvents = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  assertSuperAdmin(adminMember);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const beforeSnapshot = await db.doc(SEASON_EVENTS_DOC_PATH).get();
  const lock = getSeasonEventsUpdateLock(beforeSnapshot);
  if (lock.locked) {
    throw new HttpsError("failed-precondition", `Season events can be updated after ${lock.lockedUntilIso}.`);
  }
  const before = beforeSnapshot.exists ? publicSeasonEvents(beforeSnapshot.data() || {}) : DEFAULT_SEASON_EVENTS;
  const next = publicSeasonEvents(payload.seasonEvents || payload);

  await db.doc(SEASON_EVENTS_DOC_PATH).set({
    ...next,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByAdminUserId: adminMember.memberUserId
  }, { merge: true });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminUpdateSeasonEvents",
    targetUserId: SEASON_EVENTS_DOC_PATH,
    before,
    after: next,
    reason: "season events update"
  });

  return {
    success: true,
    seasonEvents: next,
    canUpdate: false,
    lockedUntilIso: new Date(Date.now() + SEASON_EVENTS_UPDATE_LOCK_MS).toISOString()
  };
});

exports.getEventProgress = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const flags = await getFeatureFlags();

  const { memberData } = await loadLinkedMemberForEvent(authUid, memberUserId);
  assertFeatureEnabledForMember(flags, "eventPlazaEnabled", memberData, "Event plaza is disabled.");
  const dateKey = getKstDateKey();
  const weekKey = getKstWeekKey();
  const activeQuests = getActiveEventQuests(dateKey);
  const [progressMap, claimMap, seasonEventsSnapshot] = await Promise.all([
    loadEventProgressMap(memberUserId, activeQuests, dateKey, weekKey),
    loadEventClaimMap(memberUserId, activeQuests, dateKey, weekKey),
    db.doc(SEASON_EVENTS_DOC_PATH).get()
  ]);
  const monthKey = dateKey.slice(0, 7);
  const seasonEvents = publicSeasonEvents(
    seasonEventsSnapshot.exists ? seasonEventsSnapshot.data() || {} : DEFAULT_SEASON_EVENTS,
    { dateKey, weekKey }
  ).items.filter(eventItem => eventItem.active !== false);

  return {
    success: true,
    memberUserId,
    dateKey,
    weekKey,
    quests: buildEventQuestRows(activeQuests, progressMap, claimMap),
    classMissions: [],
    monthKey,
    seasonEvents
  };
});

exports.getDailyRewardStatus = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  await loadLinkedMemberForEvent(authUid, memberUserId);

  const dateKey = getKstDateKey();
  const weekKey = getKstWeekKey();
  const coinCapId = rewardLogId(["practice_coin_daily", dateKey, memberUserId]);
  const todayQuizXpCap = getTodayQuizDailyLevelXpCap(memberUserId, dateKey);
  const weeklyXpCap = getWeeklyLevelXpCap(memberUserId, weekKey);
  const [coinCapSnapshot, todayQuizXpSnapshot, weeklyXpSnapshot] = await Promise.all([
    db.collection("rewardDailyCaps").doc(coinCapId).get(),
    db.collection("levelXpCaps").doc(todayQuizXpCap.capKey).get(),
    db.collection("levelXpCaps").doc(weeklyXpCap.capKey).get()
  ]);
  const usedCoin = Math.max(0, Math.round(Number(coinCapSnapshot.exists ? coinCapSnapshot.data()?.usedCoin : 0) || 0));
  const usedTodayQuizXp = Math.max(0, Math.round(Number(todayQuizXpSnapshot.exists ? todayQuizXpSnapshot.data()?.xp : 0) || 0));
  const usedWeeklyXp = Math.max(0, Math.round(Number(weeklyXpSnapshot.exists ? weeklyXpSnapshot.data()?.xp : 0) || 0));

  return {
    success: true,
    memberUserId,
    dateKey,
    weekKey,
    coin: {
      limit: PRACTICE_DAILY_COIN_LIMIT,
      perCorrect: PRACTICE_CORRECT_REWARD_COIN,
      used: Math.min(PRACTICE_DAILY_COIN_LIMIT, usedCoin),
      remaining: Math.max(0, PRACTICE_DAILY_COIN_LIMIT - usedCoin)
    },
    todayQuizXp: {
      limit: TODAY_QUIZ_DAILY_XP_LIMIT,
      perCorrect: TODAY_QUIZ_XP_PER_QUESTION,
      used: Math.min(TODAY_QUIZ_DAILY_XP_LIMIT, usedTodayQuizXp),
      remaining: Math.max(0, TODAY_QUIZ_DAILY_XP_LIMIT - usedTodayQuizXp)
    },
    weeklyXp: {
      limit: WEEKLY_XP_LIMIT,
      used: Math.min(WEEKLY_XP_LIMIT, usedWeeklyXp),
      remaining: Math.max(0, WEEKLY_XP_LIMIT - usedWeeklyXp)
    }
  };
});

exports.claimEventQuestReward = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const questId = normalizeId(payload.questId, "questId");
  const dateKey = getKstDateKey();
  const weekKey = getKstWeekKey();
  const activeQuests = getActiveEventQuests(dateKey);
  const quest = activeQuests.find(item => item.questId === questId);
  if (!quest) {
    throw new HttpsError("invalid-argument", "Unknown or inactive event quest.");
  }

  const flags = await getFeatureFlags();
  const { memberData } = await loadLinkedMemberForEvent(authUid, memberUserId);
  assertFeatureEnabledForMember(flags, "eventPlazaEnabled", memberData, "Event plaza is disabled.");

  const result = await db.runTransaction(async transaction => {
    await assertLinkedMemberAuth(transaction, memberUserId, authUid);
    const repeatLimit = Math.max(1, Math.round(Number(quest.repeatLimit) || 1));
    const progressRef = db.collection("eventQuestProgress")
      .doc(getEventProgressId(memberUserId, quest, dateKey, weekKey));
    const logRefs = Array.from({ length: repeatLimit }, (_, index) =>
      db.collection("rewardLogs").doc(getEventRewardLogId(memberUserId, quest, dateKey, weekKey, index + 1))
    );
    const economyRef = db.collection("userEconomy").doc(memberUserId);
    const [progressSnapshot, ...logSnapshots] = await Promise.all([
      transaction.get(progressRef),
      ...logRefs.map(ref => transaction.get(ref))
    ]);
    const claimedCount = logSnapshots.filter(snapshot => snapshot.exists).length;
    if (claimedCount >= repeatLimit) {
      return {
        duplicate: true,
        rewardCoin: 0,
        xpDelta: 0,
        dateKey,
        weekKey,
        rewardLogPath: logRefs[repeatLimit - 1].path,
        economyPath: economyRef.path
      };
    }
    const progress = Math.max(0, Math.round(Number(progressSnapshot.exists ? progressSnapshot.data()?.current : 0) || 0));
    const progressTarget = Math.max(1, Math.round(Number(quest.target) || 1)) * (claimedCount + 1);
    if (progress < progressTarget) {
      throw new HttpsError("failed-precondition", "Event quest is not complete.");
    }
    const attempt = claimedCount + 1;
    const logRef = logRefs[claimedCount];
    const levelXp = await applyLevelXp(transaction, {
      memberUserId,
      authUid,
      memberData,
      xpDelta: quest.xpReward || 0,
      sourceType: `event_${quest.scope || "daily"}_quest`,
      sourceId: `${getEventQuestPeriodKey(quest, dateKey, weekKey)}__${questId}__${attempt}`,
      sourceLabel: quest.title,
      dateKey,
      classroomPointMirrorAmount: quest.rewardCoin || 0,
      caps: [getWeeklyLevelXpCap(memberUserId, weekKey)],
      extra: {
        questId,
        questScope: quest.scope || "daily",
        attempt,
        periodKey: getEventQuestPeriodKey(quest, dateKey, weekKey)
      }
    });

    if (Number(quest.rewardCoin) > 0) {
      transaction.set(economyRef, {
        userId: memberUserId,
        djCoin: FieldValue.increment(quest.rewardCoin),
        totalEarned: FieldValue.increment(quest.rewardCoin),
        updatedAt: FieldValue.serverTimestamp(),
        lastEventQuestRewardAt: FieldValue.serverTimestamp(),
        source: "event_quest_reward_function"
      }, { merge: true });
    }
    transaction.set(logRef, {
      type: "event_quest",
      questId,
      questTitle: quest.title,
      questScope: quest.scope || "daily",
      dateKey,
      weekKey,
      attempt,
      userId: memberUserId,
      memberUserId,
      authUid,
      rewardCoin: quest.rewardCoin || 0,
      xpDelta: levelXp.xpDelta || 0,
      progressCurrent: progress,
      progressTarget,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });

    return {
      duplicate: false,
      rewardCoin: quest.rewardCoin || 0,
      xpDelta: levelXp.xpDelta || 0,
      levelXp,
      dateKey,
      weekKey,
      attempt,
      rewardLogPath: logRef.path,
      economyPath: economyRef.path
    };
  });

  return {
    success: true,
    memberUserId,
    questId,
    ...result
  };
});

exports.completeClassroomAutoQuest = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const questId = normalizeId(payload.questId, "questId");

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    const settings = classroomResult.settings;
    const quest = settings.quests.find(item => item.id === questId || item.questId === questId) || null;
    if (!quest || quest.rewardMode !== "auto" || quest.active === false || quest.saveEnabled === false) {
      throw new HttpsError("invalid-argument", "Unknown classroom auto quest.");
    }
    if (String(memberData.grade || "") !== String(settings.grade || "")
      || String(memberData.classNumber || "") !== String(settings.classNumber || "")) {
      throw new HttpsError("permission-denied", "Member is outside classroom scope.");
    }

    const dateKey = getKstDateKey();
    const recordId = `${memberUserId}__${questId}__${dateKey}`;
    const progressRef = db.collection("classrooms")
      .doc(classId)
      .collection("questProgress")
      .doc(recordId);
    const rewardCurrency = "point";
    const rewardAmount = Number(quest.rewardCoin) || 0;
    const logId = rewardLogId([
      "classroom_auto_quest",
      classId,
      dateKey,
      memberUserId,
      questId
    ]);
    const logRef = db.collection("rewardLogs").doc(logId);
    const economyRef = rewardCurrency === "point"
      ? db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId)
      : db.collection("userEconomy").doc(memberUserId);
    const pointLogRef = rewardCurrency === "point"
      ? db.collection("classrooms").doc(classId).collection("pointLogs").doc(logId)
      : null;

    const [progressSnapshot, logSnapshot, walletSnapshot] = await Promise.all([
      transaction.get(progressRef),
      transaction.get(logRef),
      rewardCurrency === "point" ? transaction.get(economyRef) : Promise.resolve(null)
    ]);
    const boostedReward = getBoostedClassroomPointAmount(
      rewardAmount,
      walletSnapshot?.exists ? walletSnapshot.data() || {} : {}
    );

    if (progressSnapshot.exists || logSnapshot.exists) {
      return {
        duplicate: true,
        rewardCoin: 0,
        rewardCurrency,
        dateKey,
        recordId,
        progressPath: progressRef.path,
        rewardLogPath: logRef.path,
        economyPath: economyRef.path
      };
    }

    const gemResult = await applyClassroomGemProgress(transaction, {
      classId,
      memberUserId,
      quest,
      authUid,
      source: "classroom_auto_quest_function",
      progressPath: progressRef.path
    });

    transaction.set(progressRef, {
      recordId,
      classId,
      questId,
      questTitle: quest.title,
      questType: quest.questType || quest.type,
      rewardMode: quest.rewardMode,
      memberUserId,
      userId: memberUserId,
      checked: true,
      status: "completed",
      rewardCoin: rewardAmount,
      rewardCurrency,
      rewardStatus: "paid",
      dateKey,
      source: "classroom_auto_quest_function",
      version: 2,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      rewardedAt: FieldValue.serverTimestamp()
    }, { merge: false });
    if (rewardCurrency === "point") {
      transaction.set(economyRef, {
        memberUserId,
        userId: memberUserId,
        classId,
        point: FieldValue.increment(boostedReward.rewardAmount),
        totalEarnedPoint: FieldValue.increment(boostedReward.rewardAmount),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomQuestRewardAt: FieldValue.serverTimestamp(),
        source: "classroom_auto_quest_function"
      }, { merge: true });
      transaction.set(pointLogRef, {
        type: "classroom_auto_quest",
        classId,
        questId,
        questTitle: quest.title,
        dateKey,
        userId: memberUserId,
        memberUserId,
        authUid,
        rewardCurrency,
        rewardPoint: boostedReward.rewardAmount,
        rewardAmount: boostedReward.rewardAmount,
        baseRewardAmount: boostedReward.baseAmount,
        boostPoint: boostedReward.boostPoint,
        progressPath: progressRef.path,
        source: "firebase_function",
        createdAt: FieldValue.serverTimestamp()
      }, { merge: false });
    } else {
      transaction.set(economyRef, {
        userId: memberUserId,
        djCoin: FieldValue.increment(rewardAmount),
        totalEarned: FieldValue.increment(rewardAmount),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomQuestRewardAt: FieldValue.serverTimestamp(),
        source: "classroom_auto_quest_function"
      }, { merge: true });
    }
    transaction.set(logRef, {
      type: "classroom_auto_quest",
        classId,
        questId,
        questTitle: quest.title,
        dateKey,
        userId: memberUserId,
      memberUserId,
      authUid,
      rewardCurrency,
      rewardCoin: rewardCurrency === "djCoin" ? rewardAmount : 0,
      rewardPoint: rewardCurrency === "point" ? boostedReward.rewardAmount : 0,
      rewardAmount: rewardCurrency === "point" ? boostedReward.rewardAmount : rewardAmount,
      baseRewardAmount: rewardCurrency === "point" ? boostedReward.baseAmount : rewardAmount,
      boostPoint: rewardCurrency === "point" ? boostedReward.boostPoint : 0,
      progressPath: progressRef.path,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });

    return {
      duplicate: false,
      rewardCoin: rewardCurrency === "djCoin" ? rewardAmount : 0,
      rewardPoint: rewardCurrency === "point" ? boostedReward.rewardAmount : 0,
      rewardCurrency,
      rewardAmount: rewardCurrency === "point" ? boostedReward.rewardAmount : rewardAmount,
      baseRewardAmount: rewardCurrency === "point" ? boostedReward.baseAmount : rewardAmount,
      boostPoint: rewardCurrency === "point" ? boostedReward.boostPoint : 0,
      dateKey,
      recordId,
      progressPath: progressRef.path,
      rewardLogPath: logRef.path,
      economyPath: economyRef.path,
      gem: gemResult
    };
  });

  return {
    success: true,
    memberUserId,
    classId,
    questId,
    ...result
  };
});

exports.saveClassroomQuest = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const rawQuest = payload.quest && typeof payload.quest === "object" ? payload.quest : {};
  const title = String(rawQuest.title || "").trim();
  if (!title) {
    throw new HttpsError("invalid-argument", "Quest title is required.");
  }
  const rewardCoin = Math.max(0, Math.min(1000, Math.round(Number(rawQuest.rewardCoin) || 0)));
  if (rewardCoin <= 0) {
    throw new HttpsError("invalid-argument", "Quest rewardCoin must be positive.");
  }
  const rewardMode = ["auto", "teacherReview", "quizAchieved"].includes(rawQuest.rewardMode)
    ? rawQuest.rewardMode
    : "auto";
  const rewardCurrency = "point";
  const questId = String(rawQuest.id || rawQuest.questId || `class-quest-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`)
    .trim()
    .replace(/[^0-9A-Za-z_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!questId) {
    throw new HttpsError("invalid-argument", "Quest id is invalid.");
  }

  const result = await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    const settings = classroomResult.settings;
    assertAdminCanManageClassroom(adminMember, settings);
    const quest = normalizeClassroomQuest({
      id: questId,
      title,
      desc: rawQuest.desc || "",
      type: rawQuest.type || "수락형 · 체크형",
      questType: rawQuest.questType || rawQuest.type || "수락형 · 체크형",
      rewardMode,
      rewardCurrency,
      rewardCoin,
      targetStudentIds: rawQuest.targetStudentIds || [],
      repeatRule: rawQuest.repeatRule || "once",
      linkedGemId: rawQuest.linkedGemId || "",
      linkedGemName: rawQuest.linkedGemName || "",
      gemXp: rawQuest.gemXp || 0,
      gemTargetXp: rawQuest.gemTargetXp || 10,
      gemRewardPoint: rawQuest.gemRewardPoint || 0,
      saveEnabled: rawQuest.saveEnabled !== false,
      active: rawQuest.active !== false,
      studentAction: rawQuest.studentAction || ""
    });
    const nextQuests = settings.quests.filter(item => item.id !== quest.id && item.questId !== quest.id);
    nextQuests.push(quest);
    transaction.set(classroomResult.ref, {
      classId,
      grade: settings.grade,
      classNumber: settings.classNumber,
      name: settings.name || `${settings.grade}학년 ${settings.classNumber}반`,
      entryCode: settings.entryCode || "",
      teacherName: settings.teacherName || "",
      teacherScope: settings.teacherScope || `${settings.grade}학년 ${settings.classNumber}반`,
      quests: nextQuests,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "save_classroom_quest_function"
    }, { merge: true });
    return { quest, questCount: nextQuests.length };
  });

  return {
    success: true,
    classId,
    ...result
  };
});

exports.getClassroomReviewItems = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");

  const settings = await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    return classroomResult.settings;
  });

  const snapshot = await db.collection("classrooms")
    .doc(classId)
    .collection("questProgress")
    .where("rewardStatus", "==", "pending_teacher_review")
    .limit(200)
    .get();
  const todayKey = getKstDateKey();
  const paidAutoSnapshot = await db.collection("classrooms")
    .doc(classId)
    .collection("questProgress")
    .where("rewardStatus", "==", "paid")
    .limit(200)
    .get();
  const routineSnapshot = await db.collection("classrooms")
    .doc(classId)
    .collection("studentRoutines")
    .where("status", "==", "active")
    .limit(200)
    .get();
  const questReviewItems = snapshot.docs
    .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
    .filter(item => item.classId === classId);
  const paidAutoReviewItems = paidAutoSnapshot.docs
    .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
    .filter(item => item.classId === classId && item.rewardMode === "auto" && item.dateKey === todayKey)
    .map(item => ({
      ...item,
      reviewMode: "cancelOnly"
    }));
  const routineReviewItems = routineSnapshot.docs
    .map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        recordId: doc.id,
        itemType: "routine",
        classId,
        routineId: doc.id,
        routineTitle: String(data.title || ""),
        memberUserId: String(data.memberUserId || data.userId || ""),
        rewardCurrency: "point",
        rewardCoin: Number(data.rewardPoint || 0),
        rewardPoint: Number(data.rewardPoint || 0),
        endDate: String(data.endDate || ""),
        createdAt: data.createdAt || null
      };
    })
    .filter(item => item.classId === classId && item.memberUserId && item.endDate && item.endDate < todayKey);
  const reviewMemberIds = Array.from(new Set([...questReviewItems, ...paidAutoReviewItems, ...routineReviewItems]
    .map(item => String(item.memberUserId || "").trim())
    .filter(Boolean)));
  const reviewProfileSnapshots = reviewMemberIds.length
    ? await db.getAll(...reviewMemberIds.map(id => db.collection("users").doc(id)))
    : [];
  const reviewNameByUserId = new Map(reviewProfileSnapshots.map(snapshot => {
    const data = snapshot.exists ? snapshot.data() || {} : {};
    return [snapshot.id, String(data.nickname || data.name || "").slice(0, 24)];
  }));
  const reviewItems = [...questReviewItems, ...paidAutoReviewItems, ...routineReviewItems]
    .map(item => ({
      ...item,
      memberNickname: reviewNameByUserId.get(String(item.memberUserId || "")) || ""
    }))
    .sort((a, b) => {
      const aCreated = Number(a.createdAt?._seconds || a.createdAt?.seconds || 0);
      const bCreated = Number(b.createdAt?._seconds || b.createdAt?.seconds || 0);
      return bCreated - aCreated || String(a.recordId || a.id).localeCompare(String(b.recordId || b.id), "ko");
    });

  return {
    success: true,
    classId,
    className: settings.name || `${settings.grade}학년 ${settings.classNumber}반`,
    reviewItems
  };
});

exports.getClassroomStudentCards = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");

  const authResult = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    const settings = classroomResult.settings;
    assertMemberCanEnterClassroom(memberData, settings);
    return { memberData, settings };
  });
  const settings = authResult.settings;

  const usersSnapshot = await db.collection("users")
    .where("role", "==", "student")
    .limit(500)
    .get();
  const studentDocs = usersSnapshot.docs
    .filter(doc => {
      const data = doc.data() || {};
      return data.role === "student"
        && data.status === "active"
        && data.active === true
        && isClassroomStudentCardVisible(doc.id, data)
        && String(data.grade || "") === String(settings.grade || "")
        && String(data.classNumber || "") === String(settings.classNumber || "");
    })
    .sort((a, b) => {
      const aData = a.data() || {};
      const bData = b.data() || {};
      return (Number(aData.studentNumber || 999) - Number(bData.studentNumber || 999))
        || String(aData.nickname || a.id).localeCompare(String(bData.nickname || b.id), "ko");
    });

  const walletRefs = studentDocs.map(doc => db.collection("classrooms").doc(classId).collection("studentWallets").doc(doc.id));
  const economyRefs = studentDocs.map(doc => db.collection("userEconomy").doc(doc.id));
  const profileRefs = studentDocs.map(doc => db.collection("classrooms").doc(classId).collection("studentProfiles").doc(doc.id));
  const titleRefs = studentDocs.map(doc => db.collection("userTitleSummary").doc(doc.id));
  const [walletSnapshots, economySnapshots, profileSnapshots, titleSnapshots] = await Promise.all([
    walletRefs.length ? db.getAll(...walletRefs) : [],
    economyRefs.length ? db.getAll(...economyRefs) : [],
    profileRefs.length ? db.getAll(...profileRefs) : [],
    titleRefs.length ? db.getAll(...titleRefs) : []
  ]);
  const walletByUserId = new Map(walletSnapshots.map(snapshot => [snapshot.id, snapshot.exists ? snapshot.data() || {} : {}]));
  const economyByUserId = new Map(economySnapshots.map(snapshot => [snapshot.id, snapshot.exists ? snapshot.data() || {} : {}]));
  const profileByUserId = new Map(profileSnapshots.map(snapshot => [snapshot.id, snapshot.exists ? snapshot.data() || {} : {}]));
  const titleByUserId = new Map(titleSnapshots.map(snapshot => [snapshot.id, snapshot.exists ? snapshot.data() || {} : {}]));

  return {
    success: true,
    classId,
    className: settings.name || `${settings.grade}학년 ${settings.classNumber}반`,
    students: studentDocs.map(doc => publicClassroomStudentCard(
      doc,
      walletByUserId.get(doc.id) || {},
      profileByUserId.get(doc.id) || {},
      titleByUserId.get(doc.id) || {},
      economyByUserId.get(doc.id) || {}
    ))
  };
});

exports.setClassroomSelectedBadge = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const badgeId = normalizeId(payload.badgeId, "badgeId");
  const badgeType = String(payload.badgeType || "gem").trim();
  if (badgeType !== "gem") {
    throw new HttpsError("invalid-argument", "Unsupported classroom badge type.");
  }

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    const settings = classroomResult.settings;
    assertMemberCanEnterClassroom(memberData, settings);

    const gemRef = db.collection("classrooms")
      .doc(classId)
      .collection("studentGemProgress")
      .doc(`${memberUserId}__${badgeId}`);
    const profileRef = db.collection("classrooms")
      .doc(classId)
      .collection("studentProfiles")
      .doc(memberUserId);
    const gemSnapshot = await transaction.get(gemRef);
    if (!gemSnapshot.exists) {
      throw new HttpsError("not-found", "Classroom badge candidate not found.");
    }
    const gem = gemSnapshot.data() || {};
    if (gem.memberUserId !== memberUserId || gem.completed !== true) {
      throw new HttpsError("failed-precondition", "Only completed gemstones can be selected.");
    }
    const selectedBadge = {
      badgeId,
      type: "gem",
      label: String(gem.gemName || gem.gemId || badgeId).slice(0, 30),
      icon: "gem",
      color: "#7cddff"
    };
    const selectedKeyring = {
      keyringId: selectedBadge.badgeId,
      type: selectedBadge.type,
      label: selectedBadge.label,
      icon: selectedBadge.icon,
      color: selectedBadge.color
    };
    transaction.set(profileRef, {
      classId,
      memberUserId,
      userId: memberUserId,
      selectedBadgeId: selectedBadge.badgeId,
      selectedBadgeType: selectedBadge.type,
      selectedBadgeLabel: selectedBadge.label,
      selectedBadgeIcon: selectedBadge.icon,
      selectedBadgeColor: selectedBadge.color,
      selectedBadge,
      selectedKeyringId: selectedKeyring.keyringId,
      selectedKeyringType: selectedKeyring.type,
      selectedKeyringLabel: selectedKeyring.label,
      selectedKeyringIcon: selectedKeyring.icon,
      selectedKeyringColor: selectedKeyring.color,
      selectedKeyring,
      updatedAt: FieldValue.serverTimestamp(),
      source: "set_classroom_selected_badge_function"
    }, { merge: true });
    return { selectedBadge };
  });

  return {
    success: true,
    classId,
    memberUserId,
    ...result
  };
});

exports.awardClassroomBadgeCampaign = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const rawCampaign = payload.campaign && typeof payload.campaign === "object" ? payload.campaign : {};
  const title = String(rawCampaign.title || "").trim().slice(0, 40);
  const targetGemName = String(rawCampaign.targetGemName || "").trim().slice(0, 40);
  const targetGemId = slugifyClassroomGemId(rawCampaign.targetGemId || targetGemName);
  const awardLimit = Math.max(1, Math.min(10, Math.round(Number(rawCampaign.awardLimit) || 1)));
  const icon = String(rawCampaign.icon || "keyringStar").trim().slice(0, 40);
  const color = String(rawCampaign.color || "#ffcf5a").trim().slice(0, 30);
  if (!title || !targetGemId) {
    throw new HttpsError("invalid-argument", "Badge title and target gemstone are required.");
  }

  const classroomResult = await db.runTransaction(async transaction => {
    const result = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, result.settings);
    return result.settings;
  });
  const settings = classroomResult;
  const campaignId = rewardLogId([
    "badge-campaign",
    classId,
    title,
    targetGemId,
    getKstDateKey()
  ]).slice(0, 180);

  const progressSnapshot = await db.collection("classrooms")
    .doc(classId)
    .collection("studentGemProgress")
    .where("gemId", "==", targetGemId)
    .get();
  const candidates = progressSnapshot.docs
    .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
    .filter(row => String(row.memberUserId || "") && Number(row.currentXp || 0) > 0)
    .sort((a, b) => {
      const completedDelta = (b.completed === true ? 1 : 0) - (a.completed === true ? 1 : 0);
      if (completedDelta) return completedDelta;
      return Number(b.currentXp || 0) - Number(a.currentXp || 0);
    })
    .slice(0, awardLimit);

  const batch = db.batch();
  const campaignRef = db.collection("classrooms").doc(classId).collection("badgeCampaigns").doc(campaignId);
  batch.set(campaignRef, {
    campaignId,
    classId,
    title,
    targetGemId,
    targetGemName: targetGemName || targetGemId,
    awardLimit,
    icon,
    color,
    status: "awarded",
    winnerCount: candidates.length,
    awardedBy: adminMember.memberUserId,
    awardedAt: FieldValue.serverTimestamp(),
    source: "award_classroom_badge_campaign_function"
  }, { merge: true });

  candidates.forEach((winner, index) => {
    const memberUserId = normalizeId(winner.memberUserId, "memberUserId");
    const badgeId = `${campaignId}__${memberUserId}`;
    const selectedBadge = {
      badgeId,
      type: "campaign",
      label: title,
      icon,
      color
    };
    const selectedKeyring = {
      keyringId: selectedBadge.badgeId,
      type: selectedBadge.type,
      label: selectedBadge.label,
      icon: selectedBadge.icon,
      color: selectedBadge.color
    };
    const badgeRef = db.collection("classrooms").doc(classId).collection("studentBadges").doc(badgeId);
    const keyringRef = db.collection("classrooms").doc(classId).collection("studentKeyrings").doc(badgeId);
    const profileRef = db.collection("classrooms").doc(classId).collection("studentProfiles").doc(memberUserId);
    const keyringDoc = {
      badgeId,
      keyringId: badgeId,
      campaignId,
      classId,
      memberUserId,
      userId: memberUserId,
      title,
      targetGemId,
      targetGemName: targetGemName || targetGemId,
      icon,
      color,
      rank: index + 1,
      metricValue: Number(winner.currentXp || 0),
      awardedAt: FieldValue.serverTimestamp(),
      awardedBy: adminMember.memberUserId,
      source: "award_classroom_badge_campaign_function"
    };
    batch.set(badgeRef, keyringDoc, { merge: true });
    batch.set(keyringRef, keyringDoc, { merge: true });
    batch.set(profileRef, {
      classId,
      memberUserId,
      userId: memberUserId,
      selectedBadgeId: selectedBadge.badgeId,
      selectedBadgeType: selectedBadge.type,
      selectedBadgeLabel: selectedBadge.label,
      selectedBadgeIcon: selectedBadge.icon,
      selectedBadgeColor: selectedBadge.color,
      selectedBadge,
      selectedKeyringId: selectedKeyring.keyringId,
      selectedKeyringType: selectedKeyring.type,
      selectedKeyringLabel: selectedKeyring.label,
      selectedKeyringIcon: selectedKeyring.icon,
      selectedKeyringColor: selectedKeyring.color,
      selectedKeyring,
      updatedAt: FieldValue.serverTimestamp(),
      source: "award_classroom_badge_campaign_function"
    }, { merge: true });
  });
  await batch.commit();

  return {
    success: true,
    classId,
    className: settings.name || `${settings.grade}학년 ${settings.classNumber}반`,
    campaignId,
    title,
    targetGemId,
    winners: candidates.map((winner, index) => ({
      memberUserId: winner.memberUserId,
      rank: index + 1,
      metricValue: Number(winner.currentXp || 0)
    }))
  };
});

exports.getClassroomEconomyBoard = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");

  const authResult = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    const settings = classroomResult.settings;
    assertMemberCanEnterClassroom(memberData, settings);
    return { memberData, settings, canManage: isClassroomTeacherMember(memberData, settings) };
  });

  const jobsSnapshot = await db.collection("classrooms")
    .doc(classId)
    .collection("jobs")
    .where("active", "==", true)
    .limit(100)
    .get();
  const shopSnapshot = await db.collection("classrooms")
    .doc(classId)
    .collection("shopItems")
    .where("active", "==", true)
    .limit(100)
    .get();
  const assignmentSnapshot = await db.collection("classrooms")
    .doc(classId)
    .collection("jobAssignments")
    .where("status", "==", "active")
    .limit(200)
    .get();
  const routineSnapshot = await db.collection("classrooms")
    .doc(classId)
    .collection("studentRoutines")
    .where("memberUserId", "==", memberUserId)
    .limit(50)
    .get();
  const applicationQuery = authResult.canManage
    ? db.collection("classrooms").doc(classId).collection("jobApplications").where("status", "==", "pending").limit(200)
    : db.collection("classrooms").doc(classId).collection("jobApplications").where("memberUserId", "==", memberUserId).limit(50);
  const applicationSnapshot = await applicationQuery.get();
  const purchaseQuery = authResult.canManage
    ? db.collection("classrooms").doc(classId).collection("shopPurchases").limit(200)
    : db.collection("classrooms").doc(classId).collection("shopPurchases").where("memberUserId", "==", memberUserId).limit(80);
  const pointLogQuery = authResult.canManage
    ? db.collection("classrooms").doc(classId).collection("pointLogs").limit(300)
    : db.collection("classrooms").doc(classId).collection("pointLogs").where("memberUserId", "==", memberUserId).limit(100);
  const [purchaseSnapshot, pointLogSnapshot] = await Promise.all([
    purchaseQuery.get(),
    pointLogQuery.get()
  ]);
  const [noticeSnapshot, billboardSnapshot] = await Promise.all([
    db.collection("classrooms").doc(classId).collection("classNotices").doc("current").get(),
    db.collection("classrooms").doc(classId).collection("billboardMessages").limit(50).get()
  ]);
  const [
    missionSnapshot,
    publicWalletSnapshot,
    walletSnapshot,
    groupPurchaseSnapshot,
    savingsProductSnapshot,
    savingsAccountSnapshot,
    taxPresetSnapshot,
    exchangeSettingsSnapshot,
    classroomGemSnapshot
  ] = await Promise.all([
    db.collection("classrooms").doc(classId).collection("classMissions").doc("current").get(),
    db.collection("classrooms").doc(classId).collection("classPublicWallets").doc("current").get(),
    db.collection("classrooms").doc(classId).collection("studentWallets").limit(500).get(),
    db.collection("classrooms").doc(classId).collection("groupPurchases").limit(100).get(),
    db.collection("classrooms").doc(classId).collection("savingsProducts").where("active", "==", true).limit(100).get(),
    authResult.canManage
      ? db.collection("classrooms").doc(classId).collection("savingsAccounts").limit(200).get()
      : db.collection("classrooms").doc(classId).collection("savingsAccounts").where("memberUserId", "==", memberUserId).limit(50).get(),
    db.collection("classrooms").doc(classId).collection("taxPresets").where("active", "==", true).limit(50).get(),
    db.collection("classrooms").doc(classId).collection("exchangeSettings").doc("current").get(),
    db.collection("classrooms").doc(classId).collection("classroomGems").where("active", "==", true).limit(100).get()
  ]);

  const jobs = jobsSnapshot.docs
    .map(doc => ({ jobId: doc.id, ...(doc.data() || {}) }))
    .sort((a, b) => String(a.title || a.jobId).localeCompare(String(b.title || b.jobId), "ko"));
  const shopItems = shopSnapshot.docs
    .map(doc => ({ itemId: doc.id, ...(doc.data() || {}) }))
    .sort((a, b) => String(a.title || a.itemId).localeCompare(String(b.title || b.itemId), "ko"));
  if (!shopItems.some(item => item.itemId === CLASSROOM_BILLBOARD_TICKET_ITEM_ID)) {
    shopItems.push(DEFAULT_CLASSROOM_BILLBOARD_ITEM);
  }
  DEFAULT_CLASSROOM_POINT_BOOST_ITEMS.forEach(defaultItem => {
    if (!shopItems.some(item => item.itemId === defaultItem.itemId)) {
      shopItems.push(defaultItem);
    }
  });
  const totalStudentPoint = walletSnapshot.docs.reduce((sum, doc) => sum + Math.max(0, Math.round(getClassroomPointAmount(doc.data() || {}))), 0);
  const classMission = publicClassroomMission(
    missionSnapshot.exists ? missionSnapshot.data() || {} : DEFAULT_CLASSROOM_MISSION,
    totalStudentPoint
  );
  const publicWallet = publicClassroomPublicWallet(publicWalletSnapshot.exists ? publicWalletSnapshot.data() || {} : {});
  const exchangeSettings = publicClassroomExchangeSettings(exchangeSettingsSnapshot.exists ? exchangeSettingsSnapshot.data() || {} : DEFAULT_CLASSROOM_EXCHANGE_SETTINGS);
  const groupPurchases = groupPurchaseSnapshot.docs
    .map(doc => {
      const data = doc.data() || {};
      const targetPoint = Math.max(1, Math.round(Number(data.targetPoint || 0) || 1));
      const raisedPoint = Math.max(0, Math.round(Number(data.raisedPoint || 0) || 0));
      return {
        groupPurchaseId: doc.id,
        title: String(data.title || "").slice(0, 50),
        desc: String(data.desc || "").slice(0, 160),
        targetPoint,
        raisedPoint,
        dueDate: String(data.dueDate || ""),
        status: String(data.status || "open"),
        active: data.active !== false,
        progressPercent: Math.min(100, Math.round((raisedPoint / targetPoint) * 100))
      };
    })
    .filter(item => item.active !== false)
    .sort((a, b) => {
      const statusDelta = (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1);
      return statusDelta || String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31"));
    });
  const savingsProducts = savingsProductSnapshot.docs
    .map(doc => ({ productId: doc.id, ...(doc.data() || {}) }))
    .sort((a, b) => String(a.title || a.productId).localeCompare(String(b.title || b.productId), "ko"));
  const taxPresets = taxPresetSnapshot.docs
    .map(doc => ({ presetId: doc.id, ...(doc.data() || {}) }))
    .sort((a, b) => String(a.title || a.presetId).localeCompare(String(b.title || b.presetId), "ko"));
  const classroomGems = classroomGemSnapshot.docs
    .map(doc => ({ gemId: doc.id, ...(doc.data() || {}) }))
    .sort((a, b) => String(a.gemName || a.gemId).localeCompare(String(b.gemName || b.gemId), "ko"));
  const savingsAccounts = savingsAccountSnapshot.docs
    .map(doc => {
      const data = doc.data() || {};
      const depositPoint = Math.max(0, Math.round(Number(data.depositPoint || 0) || 0));
      const interestPoint = Math.max(0, Math.round(Number(data.interestPoint || 0) || 0));
      return {
        accountId: doc.id,
        productId: String(data.productId || ""),
        productTitle: String(data.productTitle || ""),
        memberUserId: String(data.memberUserId || data.userId || ""),
        depositPoint,
        interestPoint,
        payoutPoint: depositPoint + interestPoint,
        openedDate: String(data.openedDate || ""),
        maturityDate: String(data.maturityDate || ""),
        status: String(data.status || "active")
      };
    })
    .sort((a, b) => String(a.maturityDate || "").localeCompare(String(b.maturityDate || "")));
  const assignments = assignmentSnapshot.docs.map(doc => {
    const data = doc.data() || {};
    return {
      assignmentId: doc.id,
      jobId: String(data.jobId || ""),
      jobTitle: String(data.jobTitle || ""),
      memberUserId: String(data.memberUserId || ""),
      status: String(data.status || "")
    };
  });
  const applications = applicationSnapshot.docs.map(doc => {
    const data = doc.data() || {};
    return {
      applicationId: doc.id,
      jobId: String(data.jobId || ""),
      jobTitle: String(data.jobTitle || ""),
      memberUserId: String(data.memberUserId || ""),
      status: String(data.status || "pending")
    };
  });
  const todayKey = getKstDateKey();
  const todayWeekday = getKstWeekdayNumber();
  const routines = routineSnapshot.docs
    .map(doc => {
      const data = doc.data() || {};
      const weekdays = Array.isArray(data.weekdays)
        ? data.weekdays.map(day => Math.round(Number(day))).filter(day => day >= 1 && day <= 5)
        : [];
      const startDate = String(data.startDate || "");
      const endDate = String(data.endDate || "");
      const withinPeriod = (!startDate || todayKey >= startDate) && (!endDate || todayKey <= endDate);
      const canCheckToday = withinPeriod && weekdays.includes(todayWeekday);
      const status = String(data.status || "active");
      return {
        routineId: doc.id,
        title: String(data.title || ""),
        desc: String(data.desc || ""),
        targetCount: Number(data.targetCount || 0),
        currentCount: Number(data.currentCount || 0),
        rewardPoint: Number(data.rewardPoint || 0),
        startDate,
        endDate,
        weekdays,
        status,
        checkedToday: data.lastCheckDateKey === todayKey,
        canCheckToday,
        reviewPending: status === "active" && !!endDate && endDate < todayKey
      };
    })
    .filter(item => item.status !== "deleted");
  const getTimestampMillis = value => {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.seconds === "number") return value.seconds * 1000;
    return 0;
  };
  const purchases = purchaseSnapshot.docs
    .map(doc => {
      const data = doc.data() || {};
      return {
        purchaseId: doc.id,
        itemId: String(data.itemId || ""),
        itemTitle: String(data.itemTitle || ""),
        itemType: String(data.itemType || ""),
        memberUserId: String(data.memberUserId || data.userId || ""),
        pricePoint: Number(data.pricePoint || 0),
        priceCoin: Number(data.priceCoin || 0),
        priceType: String(data.priceType || (Number(data.priceCoin || 0) > 0 ? "djCoin" : "point")),
        itemIcon: String(data.itemIcon || "").slice(0, 40),
        boostPoint: roundClassroomPoint(data.boostPoint || 0),
        status: String(data.status || "purchased"),
        equipped: data.equipped === true,
        requestedAtMillis: getTimestampMillis(data.requestedAt),
        approvedAtMillis: getTimestampMillis(data.approvedAt),
        usedAtMillis: getTimestampMillis(data.usedAt),
        refundedAtMillis: getTimestampMillis(data.refundedAt),
        requestMemo: String(data.requestMemo || "").slice(0, 160),
        approvalMemo: String(data.approvalMemo || "").slice(0, 160),
        rejectReason: String(data.rejectReason || "").slice(0, 160),
        refundReason: String(data.refundReason || "").slice(0, 160),
        useMemo: String(data.useMemo || "").slice(0, 160),
        billboardMessage: String(data.billboardMessage || "").slice(0, 80),
        createdAtMillis: getTimestampMillis(data.createdAt)
      };
    })
    .sort((a, b) => (b.createdAtMillis || b.requestedAtMillis || 0) - (a.createdAtMillis || a.requestedAtMillis || 0))
    .slice(0, authResult.canManage ? 80 : 30);
  const nowMillis = Date.now();
  const noticeData = noticeSnapshot.exists ? noticeSnapshot.data() || {} : {};
  const classNotices = {
    slots: normalizeClassroomNoticeSlots(noticeData.slots || []),
    updatedAtMillis: getTimestampMillis(noticeData.updatedAt)
  };
  const billboardMessages = billboardSnapshot.docs
    .map(doc => {
      const data = doc.data() || {};
      return {
        messageId: doc.id,
        memberUserId: String(data.memberUserId || data.userId || ""),
        text: String(data.text || "").slice(0, 80),
        purchaseId: String(data.purchaseId || ""),
        status: String(data.status || "active"),
        createdAtMillis: getTimestampMillis(data.createdAt),
        expiresAtMillis: getTimestampMillis(data.expiresAt)
      };
    })
    .filter(item => item.status !== "deleted" && item.text && (!item.expiresAtMillis || item.expiresAtMillis >= nowMillis))
    .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0))
    .slice(0, 12);
  const pointLogs = pointLogSnapshot.docs
    .map(doc => {
      const data = doc.data() || {};
      return {
        logId: doc.id,
        type: String(data.type || ""),
        itemTitle: String(data.itemTitle || ""),
        jobTitle: String(data.jobTitle || ""),
        questTitle: String(data.questTitle || ""),
        routineTitle: String(data.routineTitle || ""),
        titleName: String(data.titleName || ""),
        sourceLabel: String(data.sourceLabel || ""),
        sourceType: String(data.sourceType || ""),
        memberUserId: String(data.memberUserId || data.userId || ""),
        rewardAmount: Number(data.rewardAmount || data.rewardPoint || 0),
        rewardPoint: Number(data.rewardPoint || data.rewardAmount || 0),
        createdAtMillis: getTimestampMillis(data.createdAt)
      };
    })
    .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0))
    .slice(0, authResult.canManage ? 120 : 30);
  const economySnapshot = await db.collection("userEconomy").doc(memberUserId).get();
  const economy = economySnapshot.exists ? economySnapshot.data() || {} : {};
  const activityMemberIds = Array.from(new Set([
    ...purchases.map(item => item.memberUserId),
    ...pointLogs.map(item => item.memberUserId)
  ].map(id => String(id || "").trim()).filter(Boolean)));
  const activityProfileSnapshots = activityMemberIds.length
    ? await db.getAll(...activityMemberIds.map(id => db.collection("users").doc(id)))
    : [];
  const activityNameByUserId = new Map(activityProfileSnapshots.map(snapshot => {
    const data = snapshot.exists ? snapshot.data() || {} : {};
    return [snapshot.id, String(data.nickname || data.name || "").slice(0, 24)];
  }));
  const addActivityProfile = item => ({
    ...item,
    memberNickname: activityNameByUserId.get(item.memberUserId) || ""
  });
  const visiblePurchases = purchases
    .filter(item => !HIDDEN_CLASSROOM_ACTIVITY_MEMBER_USER_IDS.has(String(item.memberUserId || "").trim()))
    .map(addActivityProfile);
  const visiblePointLogs = pointLogs
    .filter(item => !HIDDEN_CLASSROOM_ACTIVITY_MEMBER_USER_IDS.has(String(item.memberUserId || "").trim()))
    .map(addActivityProfile)
    .slice(0, authResult.canManage ? 120 : 30);

  return {
    success: true,
    classId,
    canManage: authResult.canManage,
    jobs,
    shopItems,
    assignments,
    applications,
    routines,
    purchases: visiblePurchases,
    pointLogs: visiblePointLogs,
    classNotices,
    billboardMessages,
    classMission,
    publicWallet,
    myDjCoin: Number(economy.djCoin ?? economy.coin ?? 0) || 0,
    exchangeSettings,
    groupPurchases,
    savingsProducts,
    savingsAccounts,
    taxPresets,
    classroomGems,
    myAssignment: assignments.find(item => item.memberUserId === memberUserId && item.status === "active") || null
  };
});

exports.adjustClassroomStudentPoint = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const targetMemberUserId = normalizeId(payload.targetMemberUserId, "targetMemberUserId");
  const delta = Math.round(Number(payload.delta));
  const reason = String(payload.reason || "").trim().slice(0, 160);
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 10000) {
    throw new HttpsError("invalid-argument", "delta must be between -10000 and 10000, excluding zero.");
  }

  const result = await db.runTransaction(async transaction => {
    const [teacherLink, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    const settings = classroomResult.settings;
    assertMemberCanEnterClassroom(teacherLink, settings);
    assertAdminCanManageClassroom(adminMember, settings);
    const targetRef = db.collection("users").doc(targetMemberUserId);
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(targetMemberUserId);
    const logId = rewardLogId(["teacher_point_adjust", classId, Date.now(), adminMember.memberUserId, targetMemberUserId]);
    const logRef = db.collection("classrooms").doc(classId).collection("pointLogs").doc(logId);
    const [targetSnapshot, walletSnapshot] = await Promise.all([
      transaction.get(targetRef),
      transaction.get(walletRef)
    ]);
    if (!targetSnapshot.exists) throw new HttpsError("not-found", "Target student not found.");
    const target = targetSnapshot.data() || {};
    assertActiveStudent(target);
    if (String(target.grade || "") !== String(settings.grade || "") || String(target.classNumber || "") !== String(settings.classNumber || "")) {
      throw new HttpsError("permission-denied", "Target student is outside this classroom.");
    }
    const wallet = walletSnapshot.exists ? walletSnapshot.data() || {} : {};
    const beforePoint = getClassroomPointAmount(wallet);
    const afterPoint = roundClassroomPoint(beforePoint + delta);
    if (afterPoint < 0) {
      throw new HttpsError("failed-precondition", "Classroom point cannot become negative.");
    }
    transaction.set(walletRef, {
      memberUserId: targetMemberUserId,
      userId: targetMemberUserId,
      classId,
      point: afterPoint,
      teacherAdjustedPoint: FieldValue.increment(delta),
      lastTeacherAdjustmentDelta: delta,
      lastTeacherAdjustedBy: adminMember.memberUserId,
      lastTeacherAdjustmentReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
      teacherAdjustedAt: FieldValue.serverTimestamp(),
      source: "adjust_classroom_student_point_function"
    }, { merge: true });
    transaction.set(logRef, {
      logId,
      type: "teacher_point_adjustment",
      classId,
      memberUserId: targetMemberUserId,
      userId: targetMemberUserId,
      targetMemberUserId,
      adjustedBy: adminMember.memberUserId,
      teacherMemberUserId: memberUserId,
      rewardCurrency: "point",
      rewardPoint: delta,
      rewardAmount: delta,
      beforePoint,
      afterPoint,
      reason,
      source: "adjust_classroom_student_point_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    return { beforePoint, afterPoint, logId };
  });

  return {
    success: true,
    classId,
    memberUserId,
    targetMemberUserId,
    delta,
    beforePoint: result.beforePoint,
    afterPoint: result.afterPoint,
    logId: result.logId
  };
});

exports.requestClassroomShopPurchaseUse = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const purchaseId = normalizeId(payload.purchaseId, "purchaseId");
  const requestMemo = String(payload.memo || payload.reason || "").trim().slice(0, 160);

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    const purchaseRef = db.collection("classrooms").doc(classId).collection("shopPurchases").doc(purchaseId);
    const purchaseSnapshot = await transaction.get(purchaseRef);
    if (!purchaseSnapshot.exists) {
      throw new HttpsError("not-found", "Classroom shop purchase not found.");
    }
    const purchase = purchaseSnapshot.data() || {};
    if (purchase.memberUserId !== memberUserId) {
      throw new HttpsError("permission-denied", "Cannot request another member purchase.");
    }
    if (purchase.status === "use_requested" || purchase.status === "use_approved") {
      return { duplicate: true, status: purchase.status };
    }
    if (purchase.status === "used") {
      throw new HttpsError("failed-precondition", "Classroom shop purchase is already used.");
    }
    transaction.set(purchaseRef, {
      status: "use_requested",
      requestMemo,
      requestedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { duplicate: false, status: "use_requested" };
  });

  return { success: true, classId, memberUserId, purchaseId, ...result };
});

async function reviewClassroomShopPurchaseUse(request, nextStatus) {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const purchaseId = normalizeId(payload.purchaseId, "purchaseId");
  const reviewMemo = String(payload.memo || payload.reason || "").trim().slice(0, 160);

  const result = await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    const purchaseRef = db.collection("classrooms").doc(classId).collection("shopPurchases").doc(purchaseId);
    const purchaseSnapshot = await transaction.get(purchaseRef);
    if (!purchaseSnapshot.exists) {
      throw new HttpsError("not-found", "Classroom shop purchase not found.");
    }
    const purchase = purchaseSnapshot.data() || {};
    const currentStatus = String(purchase.status || "purchased");
    if (nextStatus === "use_approved" && currentStatus !== "use_requested") {
      return { duplicate: true, status: currentStatus };
    }
    if (nextStatus === "used" && !["use_requested", "use_approved"].includes(currentStatus)) {
      return { duplicate: true, status: currentStatus };
    }
    if (nextStatus === "use_rejected" && !["use_requested", "use_approved"].includes(currentStatus)) {
      return { duplicate: true, status: currentStatus };
    }
    transaction.set(purchaseRef, {
      status: nextStatus,
      approvedBy: nextStatus === "use_approved" ? adminMember.memberUserId : purchase.approvedBy || "",
      approvedAt: nextStatus === "use_approved" ? FieldValue.serverTimestamp() : purchase.approvedAt || null,
      approvalMemo: nextStatus === "use_approved" ? reviewMemo : purchase.approvalMemo || "",
      rejectedBy: nextStatus === "use_rejected" ? adminMember.memberUserId : purchase.rejectedBy || "",
      rejectedAt: nextStatus === "use_rejected" ? FieldValue.serverTimestamp() : purchase.rejectedAt || null,
      rejectReason: nextStatus === "use_rejected" ? reviewMemo : purchase.rejectReason || "",
      usedBy: nextStatus === "used" ? adminMember.memberUserId : purchase.usedBy || "",
      usedAt: nextStatus === "used" ? FieldValue.serverTimestamp() : purchase.usedAt || null,
      useMemo: nextStatus === "used" ? reviewMemo : purchase.useMemo || "",
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { duplicate: false, status: nextStatus };
  });

  return { success: true, classId, memberUserId, purchaseId, ...result };
}

exports.approveClassroomShopPurchaseUse = onCall({ region: REGION }, request => {
  return reviewClassroomShopPurchaseUse(request, "use_approved");
});

exports.completeClassroomShopPurchaseUse = onCall({ region: REGION }, request => {
  return reviewClassroomShopPurchaseUse(request, "used");
});

exports.rejectClassroomShopPurchaseUse = onCall({ region: REGION }, request => {
  return reviewClassroomShopPurchaseUse(request, "use_rejected");
});

exports.refundClassroomShopPurchase = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const purchaseId = normalizeId(payload.purchaseId, "purchaseId");
  const refundReason = String(payload.memo || payload.reason || "").trim().slice(0, 160);

  const result = await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    const purchaseRef = db.collection("classrooms").doc(classId).collection("shopPurchases").doc(purchaseId);
    const purchaseSnapshot = await transaction.get(purchaseRef);
    if (!purchaseSnapshot.exists) {
      throw new HttpsError("not-found", "Classroom shop purchase not found.");
    }
    const purchase = purchaseSnapshot.data() || {};
    const currentStatus = String(purchase.status || "purchased");
    if (currentStatus === "refunded") {
      return { duplicate: true, status: currentStatus, refundPoint: 0 };
    }
    if (currentStatus === "used") {
      throw new HttpsError("failed-precondition", "Used classroom shop purchase cannot be refunded.");
    }
    const memberUserId = normalizeId(purchase.memberUserId || purchase.userId, "memberUserId");
    const refundPoint = Math.max(1, Math.min(10000, Math.round(Number(purchase.pricePoint) || 0)));
    const logId = rewardLogId(["classroom_shop_refund", classId, purchaseId]);
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
    const pointLogRef = db.collection("classrooms").doc(classId).collection("pointLogs").doc(logId);
    transaction.set(walletRef, {
      memberUserId,
      userId: memberUserId,
      classId,
      point: FieldValue.increment(refundPoint),
      totalEarnedPoint: FieldValue.increment(refundPoint),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomShopRefundAt: FieldValue.serverTimestamp(),
      source: "refund_classroom_shop_purchase_function"
    }, { merge: true });
    transaction.set(purchaseRef, {
      status: "refunded",
      refundReason,
      refundedBy: adminMember.memberUserId,
      refundedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(pointLogRef, {
      type: "classroom_shop_refund",
      classId,
      purchaseId,
      itemId: purchase.itemId || "",
      itemTitle: purchase.itemTitle || "",
      userId: memberUserId,
      memberUserId,
      authUid,
      refundedBy: adminMember.memberUserId,
      rewardCurrency: "point",
      rewardPoint: refundPoint,
      rewardAmount: refundPoint,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    return { duplicate: false, status: "refunded", memberUserId, refundPoint };
  });

  return { success: true, classId, purchaseId, ...result };
});

exports.reorderClassroomQuest = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const questId = normalizeId(payload.questId, "questId");
  const direction = String(payload.direction || "").trim() === "down" ? "down" : "up";

  const result = await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    const settings = classroomResult.settings;
    assertAdminCanManageClassroom(adminMember, settings);
    const quests = Array.isArray(settings.quests) ? [...settings.quests] : [];
    const index = quests.findIndex(item => item.id === questId || item.questId === questId);
    if (index < 0) {
      throw new HttpsError("not-found", "Classroom quest not found.");
    }
    const nextIndex = direction === "down" ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= quests.length) {
      return { duplicate: true, questId, direction };
    }
    const temp = quests[index];
    quests[index] = quests[nextIndex];
    quests[nextIndex] = temp;
    transaction.set(classroomResult.ref, {
      quests,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "reorder_classroom_quest_function"
    }, { merge: true });
    return { duplicate: false, questId, direction };
  });

  return { success: true, classId, ...result };
});

exports.saveClassroomJob = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const job = normalizeClassroomJob(payload.job && typeof payload.job === "object" ? payload.job : {});

  await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    const jobRef = db.collection("classrooms").doc(classId).collection("jobs").doc(job.jobId);
    transaction.set(jobRef, {
      ...job,
      classId,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "save_classroom_job_function"
    }, { merge: true });
  });

  return { success: true, classId, job };
});

exports.applyClassroomJob = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const jobId = normalizeId(payload.jobId, "jobId");

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    if (memberData.role === "admin") {
      throw new HttpsError("failed-precondition", "Teacher accounts cannot apply for classroom jobs.");
    }
    const jobRef = db.collection("classrooms").doc(classId).collection("jobs").doc(jobId);
    const assignmentRef = db.collection("classrooms").doc(classId).collection("jobAssignments").doc(memberUserId);
    const applicationRef = db.collection("classrooms").doc(classId).collection("jobApplications").doc(`${jobId}__${memberUserId}`);
    const [jobSnapshot, assignmentSnapshot, applicationSnapshot] = await Promise.all([
      transaction.get(jobRef),
      transaction.get(assignmentRef),
      transaction.get(applicationRef)
    ]);
    if (!jobSnapshot.exists || jobSnapshot.data()?.active === false) {
      throw new HttpsError("not-found", "Classroom job not found.");
    }
    if (assignmentSnapshot.exists && assignmentSnapshot.data()?.status === "active") {
      throw new HttpsError("failed-precondition", "Student already has a classroom job.");
    }
    if (applicationSnapshot.exists && ["pending", "assigned"].includes(applicationSnapshot.data()?.status)) {
      return { duplicate: true, applicationId: applicationRef.id };
    }
    const job = jobSnapshot.data() || {};
    transaction.set(applicationRef, {
      applicationId: applicationRef.id,
      classId,
      jobId,
      jobTitle: job.title || "",
      memberUserId,
      userId: memberUserId,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      source: "apply_classroom_job_function"
    }, { merge: true });
    return { duplicate: false, applicationId: applicationRef.id };
  });

  return { success: true, classId, jobId, memberUserId, ...result };
});

exports.assignClassroomJob = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const applicationId = normalizeId(payload.applicationId, "applicationId");

  const result = await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    const applicationRef = db.collection("classrooms").doc(classId).collection("jobApplications").doc(applicationId);
    const applicationSnapshot = await transaction.get(applicationRef);
    if (!applicationSnapshot.exists) {
      throw new HttpsError("not-found", "Job application not found.");
    }
    const application = applicationSnapshot.data() || {};
    if (application.status !== "pending") {
      return {
        duplicate: true,
        jobId: application.jobId || "",
        memberUserId: application.memberUserId || ""
      };
    }
    const jobId = normalizeId(application.jobId, "jobId");
    const memberUserId = normalizeId(application.memberUserId, "memberUserId");
    const jobRef = db.collection("classrooms").doc(classId).collection("jobs").doc(jobId);
    const assignmentRef = db.collection("classrooms").doc(classId).collection("jobAssignments").doc(memberUserId);
    const activeAssignmentsQuery = db.collection("classrooms")
      .doc(classId)
      .collection("jobAssignments")
      .where("status", "==", "active")
      .limit(200);
    const [jobSnapshot, assignmentSnapshot, activeAssignmentsSnapshot] = await Promise.all([
      transaction.get(jobRef),
      transaction.get(assignmentRef),
      transaction.get(activeAssignmentsQuery)
    ]);
    if (!jobSnapshot.exists || jobSnapshot.data()?.active === false) {
      throw new HttpsError("not-found", "Classroom job not found.");
    }
    if (assignmentSnapshot.exists && assignmentSnapshot.data()?.status === "active") {
      throw new HttpsError("failed-precondition", "Student already has a classroom job.");
    }
    const job = jobSnapshot.data() || {};
    const maxAssignees = Math.max(1, Math.min(10, Math.round(Number(job.maxAssignees) || 1)));
    const assignedCountForJob = activeAssignmentsSnapshot.docs
      .filter(doc => String(doc.data()?.jobId || "") === jobId)
      .length;
    if (assignedCountForJob >= maxAssignees) {
      throw new HttpsError("failed-precondition", "Classroom job capacity is full.");
    }
    transaction.set(applicationRef, {
      status: "assigned",
      assignedBy: adminMember.memberUserId,
      assignedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(assignmentRef, {
      assignmentId: memberUserId,
      classId,
      jobId,
      jobTitle: job.title || "",
      memberUserId,
      userId: memberUserId,
      weeklyPayPoint: Number(job.weeklyPayPoint || 0),
      maxAssignees,
      status: "active",
      assignedBy: adminMember.memberUserId,
      assignedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      source: "assign_classroom_job_function"
    }, { merge: true });
    return { duplicate: false, jobId, memberUserId };
  });

  return { success: true, classId, applicationId, ...result };
});

exports.releaseClassroomJob = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const assignmentId = normalizeId(payload.assignmentId, "assignmentId");

  const result = await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    const assignmentRef = db.collection("classrooms").doc(classId).collection("jobAssignments").doc(assignmentId);
    const assignmentSnapshot = await transaction.get(assignmentRef);
    if (!assignmentSnapshot.exists) {
      throw new HttpsError("not-found", "Job assignment not found.");
    }
    const assignment = assignmentSnapshot.data() || {};
    if (assignment.status !== "active") {
      return {
        duplicate: true,
        jobId: assignment.jobId || "",
        memberUserId: assignment.memberUserId || assignmentId
      };
    }
    transaction.set(assignmentRef, {
      status: "released",
      releasedBy: adminMember.memberUserId,
      releasedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return {
      duplicate: false,
      jobId: assignment.jobId || "",
      memberUserId: assignment.memberUserId || assignmentId
    };
  });

  return { success: true, classId, assignmentId, ...result };
});

exports.claimClassroomJobSalary = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const assignmentId = normalizeId(payload.assignmentId || payload.memberUserId, "assignmentId");

  const result = await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    const assignmentRef = db.collection("classrooms").doc(classId).collection("jobAssignments").doc(assignmentId);
    const assignmentSnapshot = await transaction.get(assignmentRef);
    if (!assignmentSnapshot.exists || assignmentSnapshot.data()?.status !== "active") {
      throw new HttpsError("failed-precondition", "Active classroom job is required.");
    }
    const assignment = assignmentSnapshot.data() || {};
    const memberUserId = normalizeId(assignment.memberUserId || assignmentId, "memberUserId");
    const jobId = normalizeId(assignment.jobId, "jobId");
    const monthKey = getKstMonthKey();
    const rewardAmount = Math.max(1, Math.min(1000, Math.round(Number(assignment.weeklyPayPoint) || 0)));
    const logId = rewardLogId(["classroom_job_salary", classId, monthKey, memberUserId, jobId]);
    const logRef = db.collection("rewardLogs").doc(logId);
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
    const pointLogRef = db.collection("classrooms").doc(classId).collection("pointLogs").doc(logId);
    const [logSnapshot, walletSnapshot] = await Promise.all([
      transaction.get(logRef),
      transaction.get(walletRef)
    ]);
    if (logSnapshot.exists) {
      return { duplicate: true, rewardAmount: 0, monthKey };
    }
    const boostedReward = getBoostedClassroomPointAmount(
      rewardAmount,
      walletSnapshot.exists ? walletSnapshot.data() || {} : {}
    );
    transaction.set(walletRef, {
      memberUserId,
      userId: memberUserId,
      classId,
      point: FieldValue.increment(boostedReward.rewardAmount),
      totalEarnedPoint: FieldValue.increment(boostedReward.rewardAmount),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomJobSalaryAt: FieldValue.serverTimestamp(),
      source: "claim_classroom_job_salary_function"
    }, { merge: true });
    transaction.set(pointLogRef, {
      type: "classroom_job_salary",
      classId,
      jobId,
      jobTitle: assignment.jobTitle || "",
      monthKey,
      userId: memberUserId,
      memberUserId,
      authUid,
      paidBy: adminMember.memberUserId,
      rewardCurrency: "point",
      rewardPoint: boostedReward.rewardAmount,
      rewardAmount: boostedReward.rewardAmount,
      baseRewardAmount: boostedReward.baseAmount,
      boostPoint: boostedReward.boostPoint,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    transaction.set(logRef, {
      type: "classroom_job_salary",
      classId,
      jobId,
      jobTitle: assignment.jobTitle || "",
      monthKey,
      userId: memberUserId,
      memberUserId,
      authUid,
      paidBy: adminMember.memberUserId,
      rewardCurrency: "point",
      rewardCoin: 0,
      rewardPoint: boostedReward.rewardAmount,
      rewardAmount: boostedReward.rewardAmount,
      baseRewardAmount: boostedReward.baseAmount,
      boostPoint: boostedReward.boostPoint,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    transaction.set(assignmentRef, {
      lastSalaryMonthKey: monthKey,
      lastSalaryAt: FieldValue.serverTimestamp(),
      lastSalaryPaidBy: adminMember.memberUserId,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { duplicate: false, rewardAmount: boostedReward.rewardAmount, baseRewardAmount: boostedReward.baseAmount, boostPoint: boostedReward.boostPoint, monthKey, memberUserId, jobId };
  });

  return { success: true, classId, assignmentId, ...result };
});

exports.saveClassroomShopItem = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const item = normalizeClassroomShopItem(payload.item && typeof payload.item === "object" ? payload.item : {});

  await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    const itemRef = db.collection("classrooms").doc(classId).collection("shopItems").doc(item.itemId);
    transaction.set(itemRef, {
      ...item,
      classId,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "save_classroom_shop_item_function"
    }, { merge: true });
  });

  return { success: true, classId, item };
});

exports.purchaseClassroomShopItem = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const itemId = normalizeId(payload.itemId, "itemId");

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    const itemRef = db.collection("classrooms").doc(classId).collection("shopItems").doc(itemId);
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
    const economyRef = db.collection("userEconomy").doc(memberUserId);
    const [itemSnapshot, walletSnapshot, economySnapshot] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(walletRef),
      transaction.get(economyRef)
    ]);
    const item = itemSnapshot.exists
      ? itemSnapshot.data() || {}
      : getDefaultClassroomShopItem(itemId);
    if (!item || item.active === false) {
      throw new HttpsError("not-found", "Classroom shop item not found.");
    }
    const wallet = walletSnapshot.exists ? walletSnapshot.data() || {} : {};
    const priceType = String(item.priceType || "point") === "djCoin" ? "djCoin" : "point";
    const pricePoint = Math.max(1, Math.min(10000, Math.round(Number(item.pricePoint) || 0)));
    const priceCoin = Math.max(1, Math.min(10000, Math.round(Number(item.priceCoin || item.priceDjCoin || 0) || 0)));
    const currentPoint = Math.max(0, getClassroomPointAmount(wallet));
    const economy = economySnapshot.exists ? economySnapshot.data() || {} : {};
    const currentDjCoin = Math.max(0, Math.round(Number(economy.djCoin ?? economy.coin ?? 0) || 0));
    const boostItem = ["pointBoost", "pointBoostEffect"].includes(String(item.itemType || ""));
    const ownedBoostItemIds = Array.isArray(wallet.boostItemIds) ? wallet.boostItemIds.map(value => String(value || "")) : [];
    if (boostItem && ownedBoostItemIds.includes(itemId)) {
      return {
        duplicate: true,
        itemId,
        priceType,
        pricePoint: 0,
        priceCoin: 0,
        remainingPoint: currentPoint,
        remainingDjCoin: currentDjCoin
      };
    }
    if (priceType === "djCoin" && currentDjCoin < priceCoin) {
      throw new HttpsError("failed-precondition", "Not enough DJ coins.");
    }
    if (priceType === "point" && currentPoint < pricePoint) {
      throw new HttpsError("failed-precondition", "Not enough classroom point.");
    }
    const purchaseId = rewardLogId(["classroom_shop_purchase", classId, Date.now(), memberUserId, itemId]).slice(0, 180);
    const purchaseRef = db.collection("classrooms").doc(classId).collection("shopPurchases").doc(purchaseId);
    const pointLogRef = db.collection("classrooms").doc(classId).collection("pointLogs").doc(purchaseId);
    if (priceType === "point") {
      transaction.set(walletRef, {
        memberUserId,
        userId: memberUserId,
        classId,
        point: FieldValue.increment(-pricePoint),
        totalSpentPoint: FieldValue.increment(pricePoint),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomShopPurchaseAt: FieldValue.serverTimestamp(),
        source: "purchase_classroom_shop_item_function"
      }, { merge: true });
      transaction.set(pointLogRef, {
        type: "classroom_shop_purchase",
        classId,
        itemId,
        itemTitle: item.title || "",
        userId: memberUserId,
        memberUserId,
        authUid,
        rewardCurrency: "point",
        rewardPoint: -pricePoint,
        rewardAmount: -pricePoint,
        source: "firebase_function",
        createdAt: FieldValue.serverTimestamp()
      }, { merge: false });
    } else {
      transaction.set(economyRef, {
        userId: memberUserId,
        djCoin: currentDjCoin - priceCoin,
        totalSpent: FieldValue.increment(priceCoin),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomShopPurchaseAt: FieldValue.serverTimestamp(),
        source: "purchase_classroom_shop_item_function"
      }, { merge: true });
    }
    if (boostItem) {
      const boostItemForWallet = normalizeClassroomBoostItemForWallet({ itemId, ...item });
      transaction.set(walletRef, {
        memberUserId,
        userId: memberUserId,
        classId,
        pointBoostAmount: FieldValue.increment(boostItemForWallet.boostPoint),
        boostItemIds: FieldValue.arrayUnion(itemId),
        boostItems: FieldValue.arrayUnion(boostItemForWallet),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomBoostItemAt: FieldValue.serverTimestamp(),
        source: "purchase_classroom_boost_item_function"
      }, { merge: true });
    }
    transaction.set(purchaseRef, {
      purchaseId,
      classId,
      itemId,
      itemTitle: item.title || "",
      itemType: item.itemType || "",
      itemIcon: item.icon || "",
      boostPoint: roundClassroomPoint(item.boostPoint || 0),
      userId: memberUserId,
      memberUserId,
      authUid,
      pricePoint: priceType === "point" ? pricePoint : 0,
      priceCoin: priceType === "djCoin" ? priceCoin : 0,
      priceType,
      status: "purchased",
      source: "purchase_classroom_shop_item_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    return {
      duplicate: false,
      purchaseId,
      itemId,
      priceType,
      pricePoint: priceType === "point" ? pricePoint : 0,
      priceCoin: priceType === "djCoin" ? priceCoin : 0,
      boostPoint: boostItem ? roundClassroomPoint(item.boostPoint || 0) : 0,
      remainingPoint: priceType === "point" ? roundClassroomPoint(currentPoint - pricePoint) : currentPoint,
      remainingDjCoin: priceType === "djCoin" ? currentDjCoin - priceCoin : currentDjCoin
    };
  });

  return { success: true, classId, memberUserId, ...result };
});

exports.setClassroomShopPurchaseEquipped = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const purchaseId = normalizeId(payload.purchaseId, "purchaseId");
  const equipped = payload.equipped !== false;

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    const purchaseRef = db.collection("classrooms").doc(classId).collection("shopPurchases").doc(purchaseId);
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
    const [purchaseSnapshot, walletSnapshot] = await Promise.all([
      transaction.get(purchaseRef),
      transaction.get(walletRef)
    ]);
    if (!purchaseSnapshot.exists) {
      throw new HttpsError("not-found", "Classroom shop purchase not found.");
    }
    const purchase = purchaseSnapshot.data() || {};
    if (purchase.memberUserId !== memberUserId) {
      throw new HttpsError("permission-denied", "Cannot equip another member purchase.");
    }
    const status = String(purchase.status || "purchased");
    const itemType = String(purchase.itemType || "");
    if (status !== "purchased") {
      throw new HttpsError("failed-precondition", "Only purchased items can be equipped.");
    }
    if (itemType === "billboardTicket" || itemType === "pointBoost" || itemType === "pointBoostEffect") {
      throw new HttpsError("failed-precondition", "This item type cannot be equipped manually.");
    }
    const wallet = walletSnapshot.exists ? walletSnapshot.data() || {} : {};
    const equippedItems = Array.isArray(wallet.equippedItems)
      ? wallet.equippedItems.map(item => normalizeClassroomEquippedItemForWallet(item)).filter(item => item.purchaseId && item.purchaseId !== purchaseId)
      : [];
    if (equipped) {
      equippedItems.push(normalizeClassroomEquippedItemForWallet({
        purchaseId,
        itemId: purchase.itemId || "",
        title: purchase.itemTitle || "",
        icon: purchase.itemIcon || "",
        itemType
      }));
    }
    transaction.set(walletRef, {
      memberUserId,
      userId: memberUserId,
      classId,
      equippedItems: equippedItems.slice(0, 8),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomEquipAt: FieldValue.serverTimestamp(),
      source: "set_classroom_shop_purchase_equipped_function"
    }, { merge: true });
    transaction.set(purchaseRef, {
      equipped,
      equippedAt: equipped ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
      source: "set_classroom_shop_purchase_equipped_function"
    }, { merge: true });
    return { purchaseId, equipped };
  });

  return { success: true, classId, memberUserId, ...result };
});

exports.saveClassroomMissionConfig = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const mission = normalizeClassroomMission(payload.mission && typeof payload.mission === "object" ? payload.mission : {});

  await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    transaction.set(db.collection("classrooms").doc(classId).collection("classMissions").doc("current"), {
      ...mission,
      classId,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "save_classroom_mission_config_function"
    }, { merge: true });
  });

  return { success: true, classId, mission };
});

exports.collectClassroomTax = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const ratePercent = Math.max(0.1, Math.min(50, Number(payload.ratePercent || 0)));
  const reason = String(payload.reason || "학급 공공 포인트 적립").trim().slice(0, 120);
  const classroomResult = await db.runTransaction(async transaction => {
    const result = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, result.settings);
    return result.settings;
  });
  const walletsSnapshot = await db.collection("classrooms").doc(classId).collection("studentWallets").limit(500).get();
  const targets = walletsSnapshot.docs
    .map(doc => {
      const point = Math.max(0, Math.round(getClassroomPointAmount(doc.data() || {})));
      const taxPoint = Math.floor(point * (ratePercent / 100));
      return { memberUserId: doc.id, point, taxPoint };
    })
    .filter(item => item.taxPoint > 0);
  if (!targets.length) {
    return { success: true, classId, className: classroomResult.name || classId, ratePercent, collectedPoint: 0, affectedCount: 0 };
  }
  const taxId = rewardLogId(["classroom_tax", classId, getKstDateKey(), Date.now()]);
  const batch = db.batch();
  let collectedPoint = 0;
  targets.forEach(item => {
    collectedPoint += item.taxPoint;
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(item.memberUserId);
    const logRef = db.collection("classrooms").doc(classId).collection("pointLogs").doc(`${taxId}__${item.memberUserId}`);
    batch.set(walletRef, {
      classId,
      memberUserId: item.memberUserId,
      userId: item.memberUserId,
      point: FieldValue.increment(-item.taxPoint),
      totalTaxPaidPoint: FieldValue.increment(item.taxPoint),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomTaxAt: FieldValue.serverTimestamp(),
      source: "collect_classroom_tax_function"
    }, { merge: true });
    batch.set(logRef, {
      type: "classroom_tax",
      classId,
      taxId,
      memberUserId: item.memberUserId,
      userId: item.memberUserId,
      rewardCurrency: "point",
      rewardPoint: -item.taxPoint,
      rewardAmount: -item.taxPoint,
      ratePercent,
      reason,
      collectedBy: adminMember.memberUserId,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
  });
  const publicWalletRef = db.collection("classrooms").doc(classId).collection("classPublicWallets").doc("current");
  const taxLogRef = db.collection("classrooms").doc(classId).collection("taxLogs").doc(taxId);
  batch.set(publicWalletRef, {
    classId,
    point: FieldValue.increment(collectedPoint),
    totalTaxPoint: FieldValue.increment(collectedPoint),
    updatedAt: FieldValue.serverTimestamp(),
    source: "collect_classroom_tax_function"
  }, { merge: true });
  batch.set(taxLogRef, {
    taxId,
    classId,
    ratePercent,
    reason,
    collectedPoint,
    affectedCount: targets.length,
    collectedBy: adminMember.memberUserId,
    createdAt: FieldValue.serverTimestamp(),
    source: "collect_classroom_tax_function"
  }, { merge: false });
  await batch.commit();

  return { success: true, classId, ratePercent, collectedPoint, affectedCount: targets.length };
});

exports.saveClassroomTaxPreset = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const preset = normalizeClassroomTaxPreset(payload.preset && typeof payload.preset === "object" ? payload.preset : payload);
  if (!preset.title || preset.ratePercent <= 0) {
    throw new HttpsError("invalid-argument", "Tax preset title and rate are required.");
  }

  await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    transaction.set(db.collection("classrooms").doc(classId).collection("taxPresets").doc(preset.presetId), {
      ...preset,
      classId,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "save_classroom_tax_preset_function"
    }, { merge: true });
  });

  return { success: true, classId, preset };
});

exports.saveClassroomGroupPurchase = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const groupPurchase = normalizeClassroomGroupPurchase(payload.groupPurchase && typeof payload.groupPurchase === "object" ? payload.groupPurchase : {});
  if (!groupPurchase.title || groupPurchase.targetPoint <= 0) {
    throw new HttpsError("invalid-argument", "Group purchase title and target point are required.");
  }

  await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    transaction.set(db.collection("classrooms").doc(classId).collection("groupPurchases").doc(groupPurchase.groupPurchaseId), {
      ...groupPurchase,
      classId,
      raisedPoint: FieldValue.increment(0),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "save_classroom_group_purchase_function"
    }, { merge: true });
  });

  return { success: true, classId, groupPurchase };
});

exports.contributeClassroomGroupPurchase = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const groupPurchaseId = normalizeId(payload.groupPurchaseId, "groupPurchaseId");
  const amount = Math.max(1, Math.min(100000, Math.round(Number(payload.amount) || 0)));

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    const groupRef = db.collection("classrooms").doc(classId).collection("groupPurchases").doc(groupPurchaseId);
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
    const [groupSnapshot, walletSnapshot] = await Promise.all([transaction.get(groupRef), transaction.get(walletRef)]);
    if (!groupSnapshot.exists || groupSnapshot.data()?.active === false) {
      throw new HttpsError("not-found", "Classroom group purchase not found.");
    }
    const groupPurchase = groupSnapshot.data() || {};
    if (String(groupPurchase.status || "open") !== "open") {
      throw new HttpsError("failed-precondition", "Classroom group purchase is closed.");
    }
    const currentPoint = Math.max(0, Math.round(getClassroomPointAmount(walletSnapshot.exists ? walletSnapshot.data() || {} : {})));
    if (currentPoint < amount) {
      throw new HttpsError("failed-precondition", "Not enough classroom point.");
    }
    const targetPoint = Math.max(1, Math.round(Number(groupPurchase.targetPoint || 0) || 1));
    const nextRaised = Math.max(0, Math.round(Number(groupPurchase.raisedPoint || 0) || 0)) + amount;
    const contributionId = rewardLogId(["classroom_group_purchase", classId, groupPurchaseId, Date.now(), memberUserId]);
    transaction.set(walletRef, {
      classId,
      memberUserId,
      userId: memberUserId,
      point: FieldValue.increment(-amount),
      totalGroupPurchasePoint: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomGroupPurchaseAt: FieldValue.serverTimestamp(),
      source: "contribute_classroom_group_purchase_function"
    }, { merge: true });
    transaction.set(groupRef, {
      raisedPoint: FieldValue.increment(amount),
      contributorCount: FieldValue.increment(1),
      status: nextRaised >= targetPoint ? "funded" : "open",
      fundedAt: nextRaised >= targetPoint ? FieldValue.serverTimestamp() : groupPurchase.fundedAt || null,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(db.collection("classrooms").doc(classId).collection("groupPurchaseContributions").doc(contributionId), {
      contributionId,
      classId,
      groupPurchaseId,
      groupPurchaseTitle: groupPurchase.title || "",
      memberUserId,
      userId: memberUserId,
      amount,
      source: "contribute_classroom_group_purchase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    transaction.set(db.collection("classrooms").doc(classId).collection("pointLogs").doc(contributionId), {
      type: "classroom_group_purchase_contribution",
      classId,
      groupPurchaseId,
      itemTitle: groupPurchase.title || "",
      memberUserId,
      userId: memberUserId,
      rewardCurrency: "point",
      rewardPoint: -amount,
      rewardAmount: -amount,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    return { groupPurchaseId, amount, raisedPoint: nextRaised, funded: nextRaised >= targetPoint };
  });

  return { success: true, classId, memberUserId, ...result };
});

exports.saveClassroomSavingsProduct = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const product = normalizeClassroomSavingsProduct(payload.product && typeof payload.product === "object" ? payload.product : {});
  if (!product.title || product.minDepositPoint <= 0) {
    throw new HttpsError("invalid-argument", "Savings product title and minimum deposit point are required.");
  }

  await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    transaction.set(db.collection("classrooms").doc(classId).collection("savingsProducts").doc(product.productId), {
      ...product,
      classId,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "save_classroom_savings_product_function"
    }, { merge: true });
  });

  return { success: true, classId, product };
});

exports.saveClassroomExchangeSettings = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const settings = normalizeClassroomExchangeSettings(payload.settings && typeof payload.settings === "object" ? payload.settings : payload.values || {});

  await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    transaction.set(db.collection("classrooms").doc(classId).collection("exchangeSettings").doc("current"), {
      ...settings,
      classId,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "save_classroom_exchange_settings_function"
    }, { merge: true });
  });

  return { success: true, classId, exchangeSettings: settings };
});

exports.saveClassroomGem = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const gem = normalizeClassroomGemConfig(payload.gem && typeof payload.gem === "object" ? payload.gem : payload);
  if (!gem.gemId || !gem.gemName) {
    throw new HttpsError("invalid-argument", "Gem name is required.");
  }

  await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    transaction.set(db.collection("classrooms").doc(classId).collection("classroomGems").doc(gem.gemId), {
      ...gem,
      classId,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "save_classroom_gem_function"
    }, { merge: true });
  });

  return { success: true, classId, gem };
});

exports.joinClassroomSavingsProduct = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const productId = normalizeId(payload.productId, "productId");
  const requestedDepositPoint = Math.max(1, Math.min(1000000, Math.round(Number(payload.depositPoint || payload.amount) || 0)));

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    const productRef = db.collection("classrooms").doc(classId).collection("savingsProducts").doc(productId);
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
    const [productSnapshot, walletSnapshot] = await Promise.all([transaction.get(productRef), transaction.get(walletRef)]);
    if (!productSnapshot.exists || productSnapshot.data()?.active === false) {
      throw new HttpsError("not-found", "Classroom savings product not found.");
    }
    const product = normalizeClassroomSavingsProduct({ productId, ...(productSnapshot.data() || {}) });
    const depositPoint = Math.max(product.minDepositPoint, requestedDepositPoint);
    const currentPoint = Math.max(0, Math.round(getClassroomPointAmount(walletSnapshot.exists ? walletSnapshot.data() || {} : {})));
    if (currentPoint < depositPoint) {
      throw new HttpsError("failed-precondition", "Not enough classroom point.");
    }
    const openedDate = getKstDateKey();
    const maturityDate = addIsoDateDays(openedDate, product.termDays);
    const interestPoint = Math.floor(depositPoint * (product.interestRatePercent / 100));
    const accountId = rewardLogId(["classroom_savings", classId, productId, memberUserId, Date.now()]);
    const accountRef = db.collection("classrooms").doc(classId).collection("savingsAccounts").doc(accountId);
    transaction.set(walletRef, {
      classId,
      memberUserId,
      userId: memberUserId,
      point: FieldValue.increment(-depositPoint),
      totalSavingsDepositPoint: FieldValue.increment(depositPoint),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomSavingsAt: FieldValue.serverTimestamp(),
      source: "join_classroom_savings_product_function"
    }, { merge: true });
    transaction.set(accountRef, {
      accountId,
      classId,
      productId,
      productTitle: product.title,
      memberUserId,
      userId: memberUserId,
      depositPoint,
      minDepositPoint: product.minDepositPoint,
      interestRatePercent: product.interestRatePercent,
      interestPoint,
      openedDate,
      maturityDate,
      status: "active",
      source: "join_classroom_savings_product_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    transaction.set(db.collection("classrooms").doc(classId).collection("pointLogs").doc(accountId), {
      type: "classroom_savings_deposit",
      classId,
      productId,
      itemTitle: product.title,
      memberUserId,
      userId: memberUserId,
      rewardCurrency: "point",
      rewardPoint: -depositPoint,
      rewardAmount: -depositPoint,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    return { accountId, productId, depositPoint, interestPoint, maturityDate };
  });

  return { success: true, classId, memberUserId, ...result };
});

exports.exchangeClassroomCurrency = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const direction = String(payload.direction || "").trim();
  const amount = Math.min(1000000, Math.round(Number(payload.amount || 0) || 0));
  if (!["pointToCoin", "coinToPoint"].includes(direction)) {
    throw new HttpsError("invalid-argument", "Exchange direction is required.");
  }
  if (amount <= 0) {
    throw new HttpsError("invalid-argument", "Exchange amount must be greater than zero.");
  }

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
    const economyRef = db.collection("userEconomy").doc(memberUserId);
    const settingsRef = db.collection("classrooms").doc(classId).collection("exchangeSettings").doc("current");
    const [walletSnapshot, economySnapshot, settingsSnapshot] = await Promise.all([
      transaction.get(walletRef),
      transaction.get(economyRef),
      transaction.get(settingsRef)
    ]);
    const settings = publicClassroomExchangeSettings(settingsSnapshot.exists ? settingsSnapshot.data() || {} : DEFAULT_CLASSROOM_EXCHANGE_SETTINGS);
    const wallet = walletSnapshot.exists ? walletSnapshot.data() || {} : {};
    const economy = economySnapshot.exists ? economySnapshot.data() || {} : {};
    const currentPoint = Math.max(0, roundClassroomPoint(getClassroomPointAmount(wallet)));
    const currentDjCoin = Math.max(0, Math.round(Number(economy.djCoin ?? economy.coin ?? 0) || 0));
    const exchangeId = rewardLogId(["classroom_exchange", classId, memberUserId, direction, Date.now()]);
    if (direction === "pointToCoin") {
      if (!settings.pointToCoinEnabled) {
        throw new HttpsError("failed-precondition", "Point to DJ coin exchange is disabled.");
      }
      const spentPoint = amount * settings.pointToCoinPointCost;
      if (currentPoint < spentPoint) {
        throw new HttpsError("failed-precondition", "Not enough classroom point.");
      }
      transaction.set(walletRef, {
        classId,
        memberUserId,
        userId: memberUserId,
        point: FieldValue.increment(-spentPoint),
        totalExchangeSpentPoint: FieldValue.increment(spentPoint),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomExchangeAt: FieldValue.serverTimestamp(),
        source: "exchange_classroom_currency_function"
      }, { merge: true });
      transaction.set(economyRef, {
        memberUserId,
        userId: memberUserId,
        djCoin: FieldValue.increment(amount),
        totalClassroomExchangeEarnedCoin: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomExchangeAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.set(db.collection("classrooms").doc(classId).collection("pointLogs").doc(exchangeId), {
        type: "classroom_currency_exchange",
        classId,
        memberUserId,
        userId: memberUserId,
        exchangeDirection: direction,
        rewardCurrency: "point",
        rewardPoint: -spentPoint,
        rewardAmount: -spentPoint,
        receivedCoin: amount,
        source: "firebase_function",
        createdAt: FieldValue.serverTimestamp()
      }, { merge: false });
      transaction.set(db.collection("classrooms").doc(classId).collection("exchangeLogs").doc(exchangeId), {
        exchangeId,
        classId,
        memberUserId,
        userId: memberUserId,
        direction,
        spentPoint,
        receivedCoin: amount,
        pointToCoinPointCost: settings.pointToCoinPointCost,
        source: "exchange_classroom_currency_function",
        createdAt: FieldValue.serverTimestamp()
      }, { merge: false });
      return { direction, spentPoint, receivedCoin: amount };
    }

    if (!settings.coinToPointEnabled) {
      throw new HttpsError("failed-precondition", "DJ coin to point exchange is disabled.");
    }
    if (currentDjCoin < amount) {
      throw new HttpsError("failed-precondition", "Not enough DJ coin.");
    }
    const receivedPoint = amount * settings.coinToPointReward;
    transaction.set(walletRef, {
      classId,
      memberUserId,
      userId: memberUserId,
      point: FieldValue.increment(receivedPoint),
      totalExchangeEarnedPoint: FieldValue.increment(receivedPoint),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomExchangeAt: FieldValue.serverTimestamp(),
      source: "exchange_classroom_currency_function"
    }, { merge: true });
    transaction.set(economyRef, {
      memberUserId,
      userId: memberUserId,
      djCoin: FieldValue.increment(-amount),
      totalClassroomExchangeSpentCoin: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomExchangeAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(db.collection("classrooms").doc(classId).collection("pointLogs").doc(exchangeId), {
      type: "classroom_currency_exchange",
      classId,
      memberUserId,
      userId: memberUserId,
      exchangeDirection: direction,
      rewardCurrency: "point",
      rewardPoint: receivedPoint,
      rewardAmount: receivedPoint,
      spentCoin: amount,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    transaction.set(db.collection("classrooms").doc(classId).collection("exchangeLogs").doc(exchangeId), {
      exchangeId,
      classId,
      memberUserId,
      userId: memberUserId,
      direction,
      spentCoin: amount,
      receivedPoint,
      coinToPointReward: settings.coinToPointReward,
      source: "exchange_classroom_currency_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    return { direction, spentCoin: amount, receivedPoint };
  });

  return { success: true, classId, memberUserId, ...result };
});

exports.claimClassroomSavingsMaturity = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const accountId = normalizeId(payload.accountId, "accountId");

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    const accountRef = db.collection("classrooms").doc(classId).collection("savingsAccounts").doc(accountId);
    const accountSnapshot = await transaction.get(accountRef);
    if (!accountSnapshot.exists) {
      throw new HttpsError("not-found", "Classroom savings account not found.");
    }
    const account = accountSnapshot.data() || {};
    if (account.memberUserId !== memberUserId) {
      throw new HttpsError("permission-denied", "Cannot claim another member savings account.");
    }
    if (String(account.status || "active") !== "active") {
      return { duplicate: true, payoutPoint: 0 };
    }
    if (String(account.maturityDate || "") > getKstDateKey()) {
      throw new HttpsError("failed-precondition", "Savings account is not mature yet.");
    }
    const depositPoint = Math.max(0, Math.round(Number(account.depositPoint || 0) || 0));
    const interestPoint = Math.max(0, Math.round(Number(account.interestPoint || 0) || 0));
    const payoutPoint = depositPoint + interestPoint;
    const logId = rewardLogId(["classroom_savings_payout", classId, accountId]);
    transaction.set(db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId), {
      classId,
      memberUserId,
      userId: memberUserId,
      point: FieldValue.increment(payoutPoint),
      totalSavingsPayoutPoint: FieldValue.increment(payoutPoint),
      updatedAt: FieldValue.serverTimestamp(),
      lastClassroomSavingsPayoutAt: FieldValue.serverTimestamp(),
      source: "claim_classroom_savings_maturity_function"
    }, { merge: true });
    transaction.set(accountRef, {
      status: "claimed",
      claimedAt: FieldValue.serverTimestamp(),
      payoutPoint,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(db.collection("classrooms").doc(classId).collection("pointLogs").doc(logId), {
      type: "classroom_savings_payout",
      classId,
      accountId,
      productId: account.productId || "",
      itemTitle: account.productTitle || "",
      memberUserId,
      userId: memberUserId,
      rewardCurrency: "point",
      rewardPoint: payoutPoint,
      rewardAmount: payoutPoint,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    return { duplicate: false, accountId, payoutPoint, interestPoint };
  });

  return { success: true, classId, memberUserId, ...result };
});

exports.saveClassroomNotices = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const slots = normalizeClassroomNoticeSlots(payload.slots || []);

  await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    const noticeRef = db.collection("classrooms").doc(classId).collection("classNotices").doc("current");
    transaction.set(noticeRef, {
      classId,
      slots,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminMember.memberUserId,
      source: "save_classroom_notices_function"
    }, { merge: true });
  });

  return { success: true, classId, slots };
});

exports.useClassroomBillboardTicket = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const purchaseId = normalizeId(payload.purchaseId, "purchaseId");
  const text = String(payload.text || payload.message || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!text) {
    throw new HttpsError("invalid-argument", "Billboard message is required.");
  }
  const expiresAt = Timestamp.fromDate(getKstEndOfDayDateAfter(3));

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    const purchaseRef = db.collection("classrooms").doc(classId).collection("shopPurchases").doc(purchaseId);
    const purchaseSnapshot = await transaction.get(purchaseRef);
    if (!purchaseSnapshot.exists) {
      throw new HttpsError("not-found", "Classroom shop purchase not found.");
    }
    const purchase = purchaseSnapshot.data() || {};
    if (purchase.memberUserId !== memberUserId) {
      throw new HttpsError("permission-denied", "Cannot use another member purchase.");
    }
    if (String(purchase.itemId || "") !== CLASSROOM_BILLBOARD_TICKET_ITEM_ID && String(purchase.itemType || "") !== "billboardTicket") {
      throw new HttpsError("failed-precondition", "This purchase is not a billboard ticket.");
    }
    if (String(purchase.status || "purchased") !== "purchased") {
      throw new HttpsError("failed-precondition", "This billboard ticket is already used or pending.");
    }
    const messageRef = db.collection("classrooms").doc(classId).collection("billboardMessages").doc();
    transaction.set(messageRef, {
      messageId: messageRef.id,
      classId,
      purchaseId,
      memberUserId,
      userId: memberUserId,
      text,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      source: "use_classroom_billboard_ticket_function"
    }, { merge: false });
    transaction.set(purchaseRef, {
      status: "used",
      usedBy: memberUserId,
      usedAt: FieldValue.serverTimestamp(),
      useMemo: "전광판 게시",
      billboardMessage: text,
      billboardMessageId: messageRef.id,
      billboardExpiresAt: expiresAt,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { messageId: messageRef.id, expiresAtMillis: expiresAt.toMillis() };
  });

  return { success: true, classId, memberUserId, purchaseId, text, ...result };
});

exports.deleteClassroomBillboardMessage = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const messageId = normalizeId(payload.messageId, "messageId");

  await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    assertAdminCanManageClassroom(adminMember, classroomResult.settings);
    const messageRef = db.collection("classrooms").doc(classId).collection("billboardMessages").doc(messageId);
    const messageSnapshot = await transaction.get(messageRef);
    if (!messageSnapshot.exists) {
      throw new HttpsError("not-found", "Billboard message not found.");
    }
    transaction.set(messageRef, {
      status: "deleted",
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: adminMember.memberUserId,
      updatedAt: FieldValue.serverTimestamp(),
      source: "delete_classroom_billboard_message_function"
    }, { merge: true });
  });

  return { success: true, classId, messageId };
});

exports.saveClassroomRoutine = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const routine = normalizeClassroomRoutine(payload.routine && typeof payload.routine === "object" ? payload.routine : {});

  await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    if (memberData.role === "admin") {
      throw new HttpsError("failed-precondition", "Teacher accounts cannot create student routines.");
    }
    const routineRef = db.collection("classrooms").doc(classId).collection("studentRoutines").doc(`${memberUserId}__${routine.routineId}`);
    const routineSnapshot = await transaction.get(routineRef);
    const previousRoutine = routineSnapshot.exists ? routineSnapshot.data() || {} : {};
    transaction.set(routineRef, {
      ...routine,
      routineId: routineRef.id,
      classId,
      memberUserId,
      userId: memberUserId,
      currentCount: Math.max(0, Math.round(Number(previousRoutine.currentCount) || 0)),
      status: "active",
      createdAt: previousRoutine.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      source: "save_classroom_routine_function"
    }, { merge: true });
  });

  return { success: true, classId, memberUserId, routine };
});

exports.checkClassroomRoutine = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const routineId = normalizeId(payload.routineId, "routineId");

  const result = await db.runTransaction(async transaction => {
    const [memberData, classroomResult] = await Promise.all([
      assertLinkedMemberAuth(transaction, memberUserId, authUid),
      loadClassroomSettingsForTransaction(transaction, classId)
    ]);
    assertMemberCanEnterClassroom(memberData, classroomResult.settings);
    const routineRef = db.collection("classrooms").doc(classId).collection("studentRoutines").doc(routineId);
    const routineSnapshot = await transaction.get(routineRef);
    if (!routineSnapshot.exists) {
      throw new HttpsError("not-found", "Classroom routine not found.");
    }
    const routine = routineSnapshot.data() || {};
    if (routine.memberUserId !== memberUserId || routine.active === false || routine.status === "deleted") {
      throw new HttpsError("permission-denied", "Classroom routine cannot be checked.");
    }
    if (routine.status === "completed") {
      return { duplicate: true, completed: true, rewardAmount: 0 };
    }
    const dateKey = getKstDateKey();
    const todayWeekday = getKstWeekdayNumber();
    const weekdays = Array.isArray(routine.weekdays)
      ? routine.weekdays.map(day => Math.round(Number(day))).filter(day => day >= 1 && day <= 5)
      : [];
    const startDate = String(routine.startDate || "");
    const endDate = String(routine.endDate || "");
    if (startDate && dateKey < startDate) {
      throw new HttpsError("failed-precondition", "Routine has not started.");
    }
    if (endDate && dateKey > endDate) {
      throw new HttpsError("failed-precondition", "Routine period is over.");
    }
    if (!weekdays.includes(todayWeekday)) {
      throw new HttpsError("failed-precondition", "Routine cannot be checked today.");
    }
    const checkLogId = rewardLogId(["classroom_routine_check", classId, dateKey, memberUserId, routineId]);
    const checkLogRef = db.collection("classrooms").doc(classId).collection("routineCheckLogs").doc(checkLogId);
    const checkLogSnapshot = await transaction.get(checkLogRef);
    if (checkLogSnapshot.exists || routine.lastCheckDateKey === dateKey) {
      return { duplicate: true, completed: false, rewardAmount: 0 };
    }
    const currentCount = Math.max(0, Math.round(Number(routine.currentCount) || 0));
    const targetCount = Math.max(1, Math.round(Number(routine.targetCount) || 1));
    const nextCount = currentCount + 1;
    const completed = nextCount >= targetCount;
    const rewardAmount = completed ? Math.max(0, Math.min(100, Math.round(Number(routine.rewardPoint) || 0))) : 0;
    const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
    const rewardLogRef = completed && rewardAmount > 0
      ? db.collection("rewardLogs").doc(rewardLogId(["classroom_routine_reward", classId, memberUserId, routineId]))
      : null;
    const pointLogRef = completed && rewardAmount > 0
      ? db.collection("classrooms").doc(classId).collection("pointLogs").doc(rewardLogRef.id)
      : null;
    const [rewardLogSnapshot, walletSnapshot] = await Promise.all([
      rewardLogRef ? transaction.get(rewardLogRef) : Promise.resolve(null),
      completed && rewardAmount > 0 ? transaction.get(walletRef) : Promise.resolve(null)
    ]);
    const canReward = completed && rewardAmount > 0 && !rewardLogSnapshot?.exists;
    const boostedReward = getBoostedClassroomPointAmount(
      rewardAmount,
      walletSnapshot?.exists ? walletSnapshot.data() || {} : {}
    );

    transaction.set(checkLogRef, {
      checkLogId,
      classId,
      routineId,
      routineTitle: routine.title || "",
      memberUserId,
      userId: memberUserId,
      dateKey,
      source: "check_classroom_routine_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    transaction.set(routineRef, {
      currentCount: nextCount,
      lastCheckDateKey: dateKey,
      lastCheckedAt: FieldValue.serverTimestamp(),
      status: completed ? "completed" : "active",
      updatedAt: FieldValue.serverTimestamp(),
      ...(completed ? { completedAt: FieldValue.serverTimestamp() } : {})
    }, { merge: true });
    if (canReward) {
      transaction.set(walletRef, {
        memberUserId,
        userId: memberUserId,
        classId,
        point: FieldValue.increment(boostedReward.rewardAmount),
        totalEarnedPoint: FieldValue.increment(boostedReward.rewardAmount),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomRoutineRewardAt: FieldValue.serverTimestamp(),
        source: "check_classroom_routine_function"
      }, { merge: true });
      transaction.set(pointLogRef, {
        type: "classroom_routine_reward",
        classId,
        routineId,
        routineTitle: routine.title || "",
        userId: memberUserId,
        memberUserId,
        authUid,
        rewardCurrency: "point",
        rewardPoint: boostedReward.rewardAmount,
        rewardAmount: boostedReward.rewardAmount,
        baseRewardAmount: boostedReward.baseAmount,
        boostPoint: boostedReward.boostPoint,
        source: "firebase_function",
        createdAt: FieldValue.serverTimestamp()
      }, { merge: false });
      transaction.set(rewardLogRef, {
        type: "classroom_routine_reward",
        classId,
        routineId,
        routineTitle: routine.title || "",
        userId: memberUserId,
        memberUserId,
        authUid,
        rewardCurrency: "point",
        rewardCoin: 0,
        rewardPoint: boostedReward.rewardAmount,
        rewardAmount: boostedReward.rewardAmount,
        baseRewardAmount: boostedReward.baseAmount,
        boostPoint: boostedReward.boostPoint,
        source: "firebase_function",
        createdAt: FieldValue.serverTimestamp()
      }, { merge: false });
    }
    return {
      duplicate: false,
      completed,
      currentCount: nextCount,
      targetCount,
      rewardAmount: canReward ? boostedReward.rewardAmount : 0,
      baseRewardAmount: canReward ? boostedReward.baseAmount : 0,
      boostPoint: canReward ? boostedReward.boostPoint : 0
    };
  });

  return { success: true, classId, memberUserId, routineId, ...result };
});

exports.reviewClassroomQuestProgress = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const classId = normalizeId(payload.classId || "G4-C8", "classId");
  const recordId = normalizeId(payload.recordId, "recordId");
  const nextStatus = String(payload.nextStatus || "").trim();
  if (!["approved", "rejected"].includes(nextStatus)) {
    throw new HttpsError("invalid-argument", "Invalid review status.");
  }

  const result = await db.runTransaction(async transaction => {
    const classroomResult = await loadClassroomSettingsForTransaction(transaction, classId);
    const settings = classroomResult.settings;
    assertAdminCanManageClassroom(adminMember, settings);

    const progressRef = db.collection("classrooms")
      .doc(classId)
      .collection("questProgress")
      .doc(recordId);
    const progressSnapshot = await transaction.get(progressRef);
    if (!progressSnapshot.exists) {
      const routineRef = db.collection("classrooms").doc(classId).collection("studentRoutines").doc(recordId);
      const routineSnapshot = await transaction.get(routineRef);
      if (!routineSnapshot.exists) {
        throw new HttpsError("not-found", "Classroom quest progress not found.");
      }
      const routine = routineSnapshot.data() || {};
      if (routine.classId !== classId || routine.status !== "active") {
        throw new HttpsError("failed-precondition", "Classroom routine review is inconsistent.");
      }
      const todayKey = getKstDateKey();
      if (!routine.endDate || String(routine.endDate) >= todayKey) {
        throw new HttpsError("failed-precondition", "Classroom routine is not ready for review.");
      }
      const memberUserId = normalizeId(routine.memberUserId || routine.userId, "memberUserId");
      if (nextStatus === "rejected") {
        transaction.set(routineRef, {
          status: "review_rejected",
          reviewedBy: adminMember.memberUserId,
          reviewedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        return {
          duplicate: false,
          rewardStatus: "rejected",
          rewardAmount: 0,
          rewardCurrency: "point"
        };
      }
      const rewardAmount = Math.max(0, Math.min(1000, Math.round(Number(routine.rewardPoint) || 0)));
      if (rewardAmount <= 0) {
        throw new HttpsError("failed-precondition", "Classroom routine reward is invalid.");
      }
      const logId = rewardLogId(["classroom_routine_review", classId, recordId, memberUserId]);
      const logRef = db.collection("rewardLogs").doc(logId);
      const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
      const pointLogRef = db.collection("classrooms").doc(classId).collection("pointLogs").doc(logId);
      const [logSnapshot, walletSnapshot] = await Promise.all([
        transaction.get(logRef),
        transaction.get(walletRef)
      ]);
      const boostedReward = getBoostedClassroomPointAmount(
        rewardAmount,
        walletSnapshot?.exists ? walletSnapshot.data() || {} : {}
      );
      if (logSnapshot.exists) {
        transaction.set(routineRef, {
          status: "completed",
          reviewedBy: adminMember.memberUserId,
          reviewedAt: FieldValue.serverTimestamp(),
          rewardedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        return {
          duplicate: true,
          rewardStatus: "paid",
          rewardAmount: 0,
          rewardCurrency: "point"
        };
      }
      transaction.set(walletRef, {
        memberUserId,
        userId: memberUserId,
        classId,
        point: FieldValue.increment(boostedReward.rewardAmount),
        totalEarnedPoint: FieldValue.increment(boostedReward.rewardAmount),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomRoutineRewardAt: FieldValue.serverTimestamp(),
        source: "classroom_routine_review_function"
      }, { merge: true });
      transaction.set(routineRef, {
        status: "completed",
        reviewedBy: adminMember.memberUserId,
        reviewedAt: FieldValue.serverTimestamp(),
        rewardedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.set(pointLogRef, {
        type: "classroom_routine_review",
        classId,
        routineId: recordId,
        routineTitle: routine.title || "",
        userId: memberUserId,
        memberUserId,
        authUid,
        reviewedBy: adminMember.memberUserId,
        rewardCurrency: "point",
        rewardPoint: boostedReward.rewardAmount,
        rewardAmount: boostedReward.rewardAmount,
        baseRewardAmount: boostedReward.baseAmount,
        boostPoint: boostedReward.boostPoint,
        source: "firebase_function",
        createdAt: FieldValue.serverTimestamp()
      }, { merge: false });
      transaction.set(logRef, {
        type: "classroom_routine_review",
        classId,
        routineId: recordId,
        routineTitle: routine.title || "",
        userId: memberUserId,
        memberUserId,
        authUid,
        reviewedBy: adminMember.memberUserId,
        rewardCurrency: "point",
        rewardPoint: boostedReward.rewardAmount,
        rewardAmount: boostedReward.rewardAmount,
        baseRewardAmount: boostedReward.baseAmount,
        boostPoint: boostedReward.boostPoint,
        source: "firebase_function",
        createdAt: FieldValue.serverTimestamp()
      }, { merge: false });
      return {
        duplicate: false,
        rewardStatus: "paid",
        rewardCurrency: "point",
        rewardAmount: boostedReward.rewardAmount,
        rewardPoint: boostedReward.rewardAmount,
        baseRewardAmount: boostedReward.baseAmount,
        boostPoint: boostedReward.boostPoint
      };
    }
    const progress = progressSnapshot.data() || {};
    if (progress.classId !== classId || progress.recordId !== recordId) {
      throw new HttpsError("failed-precondition", "Classroom quest progress is inconsistent.");
    }
    if (progress.rewardStatus === "paid" && nextStatus === "rejected") {
      const memberUserId = normalizeId(progress.memberUserId || progress.userId, "memberUserId");
      const rewardAmount = Math.max(0, Math.round(Number(progress.rewardAmount || progress.rewardPoint || progress.rewardCoin) || 0));
      const rewardCurrency = "point";
      const logId = progress.rewardMode === "auto"
        ? rewardLogId([
          "classroom_auto_quest",
          classId,
          progress.dateKey || getKstDateKey(),
          memberUserId,
          progress.questId
        ])
        : rewardLogId([
          "classroom_review_quest",
          classId,
          recordId,
          memberUserId,
          rewardCurrency
        ]);
      const walletRef = db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId);
      const pointLogRef = db.collection("classrooms").doc(classId).collection("pointLogs").doc(logId);
      const rewardLogRef = db.collection("rewardLogs").doc(logId);
      if (rewardAmount > 0) {
        transaction.set(walletRef, {
          memberUserId,
          userId: memberUserId,
          classId,
          point: FieldValue.increment(-rewardAmount),
          totalEarnedPoint: FieldValue.increment(-rewardAmount),
          updatedAt: FieldValue.serverTimestamp(),
          lastClassroomQuestCancelAt: FieldValue.serverTimestamp(),
          source: "classroom_quest_cancel_function"
        }, { merge: true });
      }
      transaction.set(progressRef, {
        rewardStatus: "cancelled",
        status: "cancelled",
        cancelledBy: adminMember.memberUserId,
        cancelledAt: FieldValue.serverTimestamp(),
        reviewedBy: adminMember.memberUserId,
        reviewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.set(pointLogRef, {
        cancelled: true,
        cancelledBy: adminMember.memberUserId,
        cancelledAt: FieldValue.serverTimestamp(),
        source: "classroom_quest_cancel_function"
      }, { merge: true });
      transaction.set(rewardLogRef, {
        cancelled: true,
        cancelledBy: adminMember.memberUserId,
        cancelledAt: FieldValue.serverTimestamp(),
        source: "classroom_quest_cancel_function"
      }, { merge: true });
      return {
        duplicate: false,
        rewardStatus: "cancelled",
        rewardAmount,
        rewardCurrency
      };
    }
    if (progress.rewardStatus !== "pending_teacher_review") {
      return {
        duplicate: true,
        rewardStatus: progress.rewardStatus || "",
        rewardAmount: 0,
        rewardCurrency: "point"
      };
    }

    if (nextStatus === "rejected") {
      transaction.set(progressRef, {
        rewardStatus: "rejected",
        reviewedBy: adminMember.memberUserId,
        reviewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      return {
        duplicate: false,
        rewardStatus: "rejected",
        rewardAmount: 0,
        rewardCurrency: "point"
      };
    }

    const quest = settings.quests.find(item => item.id === progress.questId || item.questId === progress.questId) || {};
    const rewardCurrency = "point";
    const rewardAmount = Math.max(0, Math.min(1000, Math.round(Number(progress.rewardCoin || quest.rewardCoin) || 0)));
    if (rewardAmount <= 0) {
      throw new HttpsError("failed-precondition", "Classroom quest reward is invalid.");
    }
    const memberUserId = normalizeId(progress.memberUserId || progress.userId, "memberUserId");
    const logId = rewardLogId([
      "classroom_review_quest",
      classId,
      recordId,
      memberUserId,
      rewardCurrency
    ]);
    const logRef = db.collection("rewardLogs").doc(logId);
    const walletRef = rewardCurrency === "point"
      ? db.collection("classrooms").doc(classId).collection("studentWallets").doc(memberUserId)
      : db.collection("userEconomy").doc(memberUserId);
    const pointLogRef = rewardCurrency === "point"
      ? db.collection("classrooms").doc(classId).collection("pointLogs").doc(logId)
      : null;
    const [logSnapshot, walletSnapshot] = await Promise.all([
      transaction.get(logRef),
      rewardCurrency === "point" ? transaction.get(walletRef) : Promise.resolve(null)
    ]);
    const boostedReward = getBoostedClassroomPointAmount(
      rewardAmount,
      walletSnapshot?.exists ? walletSnapshot.data() || {} : {}
    );
    if (logSnapshot.exists) {
      transaction.set(progressRef, {
        rewardStatus: "paid",
        reviewedBy: adminMember.memberUserId,
        reviewedAt: FieldValue.serverTimestamp(),
        rewardedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      return {
        duplicate: true,
        rewardStatus: "paid",
        rewardAmount: 0,
        rewardCurrency
      };
    }

    const gemResult = await applyClassroomGemProgress(transaction, {
      classId,
      memberUserId,
      quest,
      authUid,
      source: "classroom_review_quest_function",
      progressPath: progressRef.path
    });

    transaction.set(progressRef, {
      rewardStatus: "paid",
      status: "completed",
      rewardCurrency,
      rewardCoin: rewardAmount,
      reviewedBy: adminMember.memberUserId,
      reviewedAt: FieldValue.serverTimestamp(),
      rewardedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    if (rewardCurrency === "point") {
      transaction.set(walletRef, {
        memberUserId,
        userId: memberUserId,
        classId,
        point: FieldValue.increment(boostedReward.rewardAmount),
        totalEarnedPoint: FieldValue.increment(boostedReward.rewardAmount),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomQuestRewardAt: FieldValue.serverTimestamp(),
        source: "classroom_review_quest_function"
      }, { merge: true });
      transaction.set(pointLogRef, {
        type: "classroom_review_quest",
        classId,
        questId: progress.questId || "",
        questTitle: progress.questTitle || quest.title || "",
        recordId,
        userId: memberUserId,
        memberUserId,
        authUid,
        reviewedBy: adminMember.memberUserId,
        rewardCurrency,
        rewardPoint: boostedReward.rewardAmount,
        rewardAmount: boostedReward.rewardAmount,
        baseRewardAmount: boostedReward.baseAmount,
        boostPoint: boostedReward.boostPoint,
        progressPath: progressRef.path,
        source: "firebase_function",
        createdAt: FieldValue.serverTimestamp()
      }, { merge: false });
    } else {
      transaction.set(walletRef, {
        userId: memberUserId,
        djCoin: FieldValue.increment(rewardAmount),
        totalEarned: FieldValue.increment(rewardAmount),
        updatedAt: FieldValue.serverTimestamp(),
        lastClassroomQuestRewardAt: FieldValue.serverTimestamp(),
        source: "classroom_review_quest_function"
      }, { merge: true });
    }

    transaction.set(logRef, {
      type: "classroom_review_quest",
      classId,
      questId: progress.questId || "",
      questTitle: progress.questTitle || quest.title || "",
      recordId,
      userId: memberUserId,
      memberUserId,
      authUid,
      reviewedBy: adminMember.memberUserId,
      rewardCurrency,
      rewardCoin: rewardCurrency === "djCoin" ? rewardAmount : 0,
      rewardPoint: rewardCurrency === "point" ? boostedReward.rewardAmount : 0,
      rewardAmount: rewardCurrency === "point" ? boostedReward.rewardAmount : rewardAmount,
      baseRewardAmount: rewardCurrency === "point" ? boostedReward.baseAmount : rewardAmount,
      boostPoint: rewardCurrency === "point" ? boostedReward.boostPoint : 0,
      progressPath: progressRef.path,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });

    return {
      duplicate: false,
      rewardStatus: "paid",
      rewardCurrency,
      rewardAmount: rewardCurrency === "point" ? boostedReward.rewardAmount : rewardAmount,
      rewardCoin: rewardCurrency === "djCoin" ? rewardAmount : 0,
      rewardPoint: rewardCurrency === "point" ? boostedReward.rewardAmount : 0,
      baseRewardAmount: rewardCurrency === "point" ? boostedReward.baseAmount : rewardAmount,
      boostPoint: rewardCurrency === "point" ? boostedReward.boostPoint : 0,
      gem: gemResult
    };
  });

  return {
    success: true,
    classId,
    recordId,
    nextStatus,
    ...result
  };
});

exports.purchaseShopItem = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const itemId = normalizeId(payload.itemId, "itemId");

  const result = await db.runTransaction(async transaction => {
    const flags = await getFeatureFlags(transaction);
    const memberData = await assertLinkedPurchasingMemberAuth(transaction, memberUserId, authUid);

    const itemRef = db.collection("shopItems").doc(itemId);
    const economyRef = db.collection("userEconomy").doc(memberUserId);
    const inventoryRef = db.collection("userInventory").doc(memberUserId).collection("items").doc(itemId);
    const purchaseLogRef = db.collection("purchaseLogs").doc();

    const [itemSnapshot, economySnapshot, inventorySnapshot] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(economyRef),
      transaction.get(inventoryRef)
    ]);

    if (!itemSnapshot.exists) {
      throw new HttpsError("not-found", "Shop item not found.");
    }
    if (inventorySnapshot.exists) {
      throw new HttpsError("already-exists", "Shop item is already owned.");
    }

    const item = itemSnapshot.data() || {};
    assertFeatureEnabledForMember(flags, "shopEnabled", memberData, "Shop is disabled.");
    if (item.enabled !== true) {
      throw new HttpsError("failed-precondition", "Shop item is disabled.");
    }
    if (item.priceType && item.priceType !== "djCoin") {
      throw new HttpsError("failed-precondition", "Unsupported price type.");
    }

    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new HttpsError("failed-precondition", "Invalid shop item price.");
    }

    const economy = economySnapshot.exists ? economySnapshot.data() || {} : {};
    const djCoin = Number(economy.djCoin ?? economy.coin ?? 0);
    if (!Number.isFinite(djCoin) || djCoin < price) {
      throw new HttpsError("failed-precondition", "Not enough DJ coins.");
    }

    transaction.set(economyRef, {
      userId: memberUserId,
      djCoin: djCoin - price,
      totalSpent: FieldValue.increment(price),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(inventoryRef, {
      userId: memberUserId,
      itemId,
      assetId: item.assetId || "",
      source: "shopPurchaseFunction",
      pricePaid: price,
      priceType: "djCoin",
      equipped: false,
      acquiredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: false });
    transaction.set(purchaseLogRef, {
      logId: purchaseLogRef.id,
      userId: memberUserId,
      memberUserId,
      authUid,
      itemId,
      assetId: item.assetId || "",
      coinDelta: -price,
      pricePaid: price,
      priceType: "djCoin",
      inventoryPath: inventoryRef.path,
      serverVerified: true,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });

    return {
      itemId,
      pricePaid: price,
      nextDjCoin: djCoin - price,
      inventoryPath: inventoryRef.path,
      purchaseLogPath: purchaseLogRef.path
    };
  });

  return {
    success: true,
    memberUserId,
    ...result
  };
});

exports.grantPracticeReward = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const recordId = normalizeId(payload.recordId, "recordId");
  const questionId = normalizeId(payload.questionId, "questionId");
  const quizId = normalizeId(payload.quizId || "unknown", "quizId");

  if (!recordId.startsWith(`${memberUserId}__`)) {
    throw new HttpsError("invalid-argument", "recordId does not belong to memberUserId.");
  }

  const result = await db.runTransaction(async transaction => {
    const flags = await getFeatureFlags(transaction);
    const practiceCoinEnabled = flags.practiceRewardEnabled !== false;
    const practiceXpEnabled = flags.practiceXpEnabled !== false;
    const memberData = await assertLinkedMemberAuth(transaction, memberUserId, authUid);

    const recordRef = db.collection("practiceRecords").doc(recordId);
    const logRef = db.collection("rewardLogs").doc(rewardLogId([
      "practice",
      memberUserId,
      recordId,
      questionId
    ]));
    const economyRef = db.collection("userEconomy").doc(memberUserId);
    const dateKey = getKstDateKey();
    const coinCapRef = db.collection("rewardDailyCaps").doc(rewardLogId([
      "practice_coin_daily",
      dateKey,
      memberUserId
    ]));

    const [recordSnapshot, logSnapshot, coinCapSnapshot] = await Promise.all([
      transaction.get(recordRef),
      transaction.get(logRef),
      transaction.get(coinCapRef)
    ]);

    if (!recordSnapshot.exists) {
      throw new HttpsError("failed-precondition", "Practice record does not exist.");
    }
    const record = recordSnapshot.data() || {};
    const correctIds = Array.isArray(record.correctIds)
      ? record.correctIds.map(id => String(id || "").trim())
      : [];
    if (!correctIds.includes(questionId)) {
      throw new HttpsError("failed-precondition", "Practice question is not recorded as correct.");
    }

    if (logSnapshot.exists) {
      return {
        duplicate: true,
        rewardCoin: 0,
        xpDelta: 0,
        coinCapped: false,
        practiceCoinEnabled,
        practiceXpEnabled,
        economyPath: economyRef.path,
        rewardLogPath: logRef.path
      };
    }

    const summarySnapshot = await transaction.get(db.collection("userLevelSummary").doc(memberUserId));
    const previousQuizCorrectCount = Math.max(0, Math.round(Number(summarySnapshot.exists ? summarySnapshot.data()?.quizCorrectRewardCount : 0) || 0));
    const nextQuizCorrectCount = previousQuizCorrectCount + 1;
    const isTodayQuiz = getTodayQuizIds(flags).has(quizId);
    const quizXpDelta = practiceXpEnabled && isTodayQuiz ? TODAY_QUIZ_XP_PER_QUESTION : 0;
    const weekKey = getKstWeekKey();
    const usedCoinToday = Math.max(0, Math.round(Number(coinCapSnapshot.exists ? coinCapSnapshot.data()?.usedCoin : 0) || 0));
    const remainingCoinToday = Math.max(0, PRACTICE_DAILY_COIN_LIMIT - usedCoinToday);
    const rewardCoin = practiceCoinEnabled
      ? Math.min(PRACTICE_CORRECT_REWARD_COIN, remainingCoinToday)
      : 0;
    const coinCapped = practiceCoinEnabled && rewardCoin < PRACTICE_CORRECT_REWARD_COIN;
    const levelXp = await applyLevelXp(transaction, {
      memberUserId,
      authUid,
      memberData,
      xpDelta: quizXpDelta,
      sourceType: isTodayQuiz ? "today_quiz_practice" : "quiz_practice",
      sourceId: `${recordId}__${questionId}`,
      sourceLabel: isTodayQuiz ? "오늘의 퀴즈 정답 경험치" : "퀴즈 정답",
      dateKey,
      classroomPointMirrorAmount: rewardCoin,
      caps: isTodayQuiz
        ? [
          getTodayQuizDailyLevelXpCap(memberUserId, dateKey),
          getWeeklyLevelXpCap(memberUserId, weekKey)
        ]
        : [],
      extra: {
        recordId,
        questionId,
        quizId,
        quizCorrectRewardCount: nextQuizCorrectCount,
        todayQuiz: isTodayQuiz
      }
    });

    if (rewardCoin > 0) {
      transaction.set(economyRef, {
        userId: memberUserId,
        djCoin: FieldValue.increment(rewardCoin),
        totalEarned: FieldValue.increment(rewardCoin),
        updatedAt: FieldValue.serverTimestamp(),
        lastPracticeRewardAt: FieldValue.serverTimestamp(),
        source: "practice_reward_function"
      }, { merge: true });
      transaction.set(coinCapRef, {
        capId: coinCapRef.id,
        memberUserId,
        userId: memberUserId,
        dateKey,
        usedCoin: FieldValue.increment(rewardCoin),
        limit: PRACTICE_DAILY_COIN_LIMIT,
        source: "practice_reward_function",
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: coinCapSnapshot.exists ? coinCapSnapshot.data()?.createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp()
      }, { merge: true });
    }
    transaction.set(db.collection("userLevelSummary").doc(memberUserId), {
      memberUserId,
      userId: memberUserId,
      quizCorrectRewardCount: nextQuizCorrectCount,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    updateEventQuestProgressForKinds(transaction, {
      memberUserId,
      dateKey,
      weekKey,
      kinds: getPracticeQuestKindsForQuiz(quizId),
      amount: 1,
      sourceType: "practice_correct",
      sourceId: `${recordId}__${questionId}`
    });
    transaction.set(logRef, {
      type: "practice_correct",
      userId: memberUserId,
      memberUserId,
      authUid,
      recordId,
      questionId,
      quizId,
      rewardCoin,
      xpDelta: levelXp.xpDelta || 0,
      coinCapped,
      practiceCoinEnabled,
      practiceXpEnabled,
      dailyCoinLimit: PRACTICE_DAILY_COIN_LIMIT,
      usedCoinBefore: usedCoinToday,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });

    return {
      duplicate: false,
      rewardCoin,
      xpDelta: levelXp.xpDelta || 0,
      levelXp,
      coinCapped,
      practiceCoinEnabled,
      practiceXpEnabled,
      dailyCoinLimit: PRACTICE_DAILY_COIN_LIMIT,
      usedCoinToday: usedCoinToday + rewardCoin,
      economyPath: economyRef.path,
      rewardLogPath: logRef.path
    };
  });

  return {
    success: true,
    memberUserId,
    recordId,
    questionId,
    quizId,
    ...result
  };
});

exports.grantRankingCompleteXp = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const recordId = normalizeId(payload.recordId, "recordId");
  const quizId = normalizeId(payload.quizId || "unknown", "quizId");

  const result = await db.runTransaction(async transaction => {
    await assertLinkedMemberAuth(transaction, memberUserId, authUid);
    const recordRef = db.collection("rankingRecords").doc(recordId);
    const recordSnapshot = await transaction.get(recordRef);
    if (!recordSnapshot.exists) {
      throw new HttpsError("failed-precondition", "Ranking record does not exist.");
    }
    const record = recordSnapshot.data() || {};
    if (record.memberUserId !== memberUserId || record.userId !== memberUserId) {
      throw new HttpsError("permission-denied", "Ranking record does not belong to member.");
    }

    const dateKey = getKstDateKey();
    const weekKey = getKstWeekKey();
    updateEventQuestProgressForKinds(transaction, {
      memberUserId,
      dateKey,
      weekKey,
      kinds: new Set(["rankingComplete"]),
      amount: 1,
      sourceType: "ranking_complete",
      sourceId: recordId
    });
    transaction.set(recordRef, {
      levelXpDelta: 0,
      levelAfter: null,
      levelMedalId: "",
      levelUpdatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return {
      duplicate: false,
      xpDelta: 0,
      levelXp: null,
      recordPath: recordRef.path
    };
  });

  return {
    success: true,
    memberUserId,
    recordId,
    quizId,
    ...result
  };
});

function numberFromText(text, fallback = 1) {
  const match = String(text || "").match(/(\d+)/);
  return match ? Number(match[1]) || fallback : fallback;
}

function isEarnedBadge(data = {}) {
  return data.available === true
    || data.completed === true
    || Number(data.starCount || 0) > 0;
}

function practiceTitleBadgeId(title = {}) {
  const id = String(title.titleId || "").trim();
  const condition = String(title.conditionText || "").trim();
  if (/^pokemon_gen[1-9]_/.test(id)) return id.replace(/_trainer$/, "");
  if (id.startsWith("spelling_")) return "daily_맞춤법";
  if (id.startsWith("word_relation_")) return "korean_word_relation";
  if (id.startsWith("korean_proverb_")) return "korean_proverb";
  if (id.startsWith("korean_spacing_")) return "korean_spacing";
  if (id.startsWith("korean_idiom_")) return "korean_idiom";
  if (id === "reading_gmo_complete") return "korean_gmo";
  if (id.startsWith("math_muldiv_")) return "math_random_basic";
  if (id.startsWith("math_fraction_basic_")) return "math_분수";
  if (id.startsWith("people_") || id === "history_god") return "people_역사인물";
  if (id.startsWith("three_kingdoms_")) return "social_three_kingdoms";
  if (id.startsWith("ancient_three_kingdoms_")) return "social_ancient_three_kingdoms";
  if (id.startsWith("social_regional_specialties_")) return "social_regional_specialties";
  if (id.startsWith("social_unified_silla_balhae_")) return "social_unified_silla_balhae";
  if (id.startsWith("social_cultural_heritage_")) return "social_cultural_heritage";
  if (id.startsWith("science_grade4_")) return "science_science_grade4";
  if (id.startsWith("science_general_")) return "science_science_general";
  if (id.startsWith("popular_flag_country_")) return "popular_flag_country";
  if (id.startsWith("popular_snack_food_")) return "popular_snack_food";
  if (id.startsWith("popular_emoji_kpop_")) return "popular_emoji_kpop";
  if (id.startsWith("popular_emoji_anime_")) return "popular_emoji_anime";
  if (id.startsWith("popular_emoji_tiniping_")) return "popular_emoji_tiniping";
  if (id.startsWith("idol_")) return "people_아이돌";
  if (id.startsWith("anime_")) return "people_애니";
  if (id.startsWith("dad_joke_") || id === "ten_million_youtuber") return "daily_아재개그";
  if (id.startsWith("tiniping_")) return "people_티니핑";
  if (condition.includes("시간가게")) return "korean_독서:시간가게";
  return "";
}

function ownedTitleDoc(title, memberUserId, source) {
  return {
    userId: memberUserId,
    memberUserId,
    titleId: title.titleId,
    titleName: title.titleName || title.titleId,
    description: title.description || title.conditionText || "",
    conditionText: title.conditionText || "",
    category: title.category || "",
    subjectGroup: title.subjectGroup || "",
    sourceType: title.sourceType || "",
    sourceCategory: title.sourceCategory || "",
    themeClass: title.themeClass || "",
    tierClass: title.tierClass || "",
    effectClass: title.effectClass || "",
    selected: false,
    migrationSource: source,
    awardedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
}

function titleSummaryDoc(memberUserId, ownedTitleIds, selectedTitleId, selectedTitleName) {
  return {
    userId: memberUserId,
    memberUserId,
    titleCount: ownedTitleIds.size,
    ownedCount: ownedTitleIds.size,
    selectedTitleId: selectedTitleId || "",
    selectedTitleName: selectedTitleName || "",
    missingSelectedTitle: !!selectedTitleId && !ownedTitleIds.has(selectedTitleId),
    migrationSource: "firebase_title_sync",
    updatedAt: FieldValue.serverTimestamp()
  };
}

async function awardTitleAcquisitionReward(memberUserId, authUid, title) {
  const titleId = String(title?.titleId || "").trim();
  if (!titleId) return null;
  return db.runTransaction(async transaction => {
    const memberData = await assertLinkedMemberAuth(transaction, memberUserId, authUid);
    const rewardRef = db.collection("rewardLogs").doc(rewardLogId([
      "title_acquisition_reward",
      memberUserId,
      titleId
    ]));
    const rewardSnapshot = await transaction.get(rewardRef);
    if (rewardSnapshot.exists) {
      return { duplicate: true, titleId, xpDelta: 0, rewardCoin: 0 };
    }
    const titleName = String(title.titleName || title.titleId || titleId).slice(0, 80);
    const levelXp = await applyLevelXp(transaction, {
      memberUserId,
      authUid,
      memberData,
      xpDelta: TITLE_ACQUISITION_XP,
      sourceType: "title_acquisition",
      sourceId: titleId,
      sourceLabel: titleName,
      classroomPointMirrorAmount: TITLE_ACQUISITION_CLASSROOM_POINT,
      extra: {
        titleId,
        titleName
      }
    });
    transaction.set(db.collection("userEconomy").doc(memberUserId), {
      userId: memberUserId,
      djCoin: FieldValue.increment(TITLE_ACQUISITION_COIN),
      totalEarned: FieldValue.increment(TITLE_ACQUISITION_COIN),
      updatedAt: FieldValue.serverTimestamp(),
      lastTitleRewardAt: FieldValue.serverTimestamp(),
      source: "title_acquisition_reward_function"
    }, { merge: true });
    transaction.set(rewardRef, {
      type: "title_acquisition_reward",
      memberUserId,
      userId: memberUserId,
      authUid,
      titleId,
      titleName,
      xpDelta: levelXp.xpDelta || 0,
      rewardCoin: TITLE_ACQUISITION_COIN,
      classroomPoint: TITLE_ACQUISITION_CLASSROOM_POINT,
      levelXp,
      createdAt: FieldValue.serverTimestamp(),
      source: "title_acquisition_reward_function"
    }, { merge: false });
    return {
      duplicate: false,
      titleId,
      titleName,
      xpDelta: levelXp.xpDelta || 0,
      rewardCoin: TITLE_ACQUISITION_COIN,
      classroomPoint: TITLE_ACQUISITION_CLASSROOM_POINT,
      levelXp
    };
  });
}

function bestRankingScoreTotal(records) {
  const bestByCategory = new Map();
  records.forEach(record => {
    const key = String(record.categoryKey || record.category || "").trim();
    if (!key) return;
    const score = Number(record.score || 0);
    const elapsedSeconds = Number(record.elapsedSeconds || 999999999);
    const current = bestByCategory.get(key);
    if (!current || score > current.score || (score === current.score && elapsedSeconds < current.elapsedSeconds)) {
      bestByCategory.set(key, { score, elapsedSeconds });
    }
  });
  return Array.from(bestByCategory.values()).reduce((sum, item) => sum + item.score, 0);
}

function emojiCategoryMatchesRecord(record = {}, sourceCategory = "") {
  const category = String(sourceCategory || "").trim();
  const quizId = String(record.quizId || "").trim();
  const text = [
    record.category,
    record.categoryKey,
    record.rawCategory,
    record.subFilter
  ].map(value => String(value || "").toLowerCase()).join(" ");
  if (category === "kpop") {
    return quizId === "emoji-kpop" || (text.includes("이모지") && (text.includes("k-pop") || text.includes("kpop") || text.includes("케이팝")));
  }
  if (category === "anime") {
    return quizId === "emoji-anime" || (text.includes("이모지") && (text.includes("애니") || text.includes("anime")));
  }
  if (category === "tiniping") {
    return quizId === "emoji-tiniping" || (text.includes("이모지") && (text.includes("티니핑") || text.includes("tiniping")));
  }
  return false;
}

function emojiPracticeBadgeId(sourceCategory = "") {
  const category = String(sourceCategory || "").trim();
  if (category === "kpop") return "popular_emoji_kpop";
  if (category === "anime") return "popular_emoji_anime";
  if (category === "tiniping") return "popular_emoji_tiniping";
  return "";
}

function emojiCombinedCompletionCount(title, badges, rankingRecords) {
  const sourceCategory = String(title.sourceCategory || "").trim();
  const badgeId = emojiPracticeBadgeId(sourceCategory);
  const badge = badgeId ? badges.find(item => item.badgeId === badgeId) : null;
  const practiceCount = Math.max(0, Math.round(Number(badge?.starCount || 0) || 0));
  const rankingCount = rankingRecords.filter(record => emojiCategoryMatchesRecord(record, sourceCategory)).length;
  return practiceCount + rankingCount;
}

function evaluateEligibleTitles(titleCatalog, badges, rankingRecords, existingTitleIds) {
  const eligible = new Map();
  const earnedBadges = badges.filter(badge => isEarnedBadge(badge));
  const earnedBadgeIds = new Set(earnedBadges.map(badge => badge.badgeId));
  const earnedGroups = new Set(earnedBadges.map(badge => badge.group || "other"));
  const pokemonGenCount = earnedBadges.filter(badge => /^pokemon_gen[1-9]$/.test(badge.badgeId)).length;
  const normal50Count = rankingRecords.filter(record => {
    const mode = String(record.rankingMode || "normal");
    return (mode === "normal" || mode === "legacy") && Number(record.score || 0) >= 50;
  }).length;
  const rankingBestTotal = bestRankingScoreTotal(rankingRecords);

  function add(title) {
    if (title.titleId) eligible.set(title.titleId, title);
  }

  titleCatalog.forEach(title => {
    const sourceType = String(title.sourceType || "").trim();
    const required = numberFromText(title.conditionText, 1);
    if (sourceType === "practiceStars") {
      const badgeId = practiceTitleBadgeId(title);
      const badge = badges.find(item => item.badgeId === badgeId);
      if (badge && Number(badge.starCount || 0) >= required) add(title);
    } else if (sourceType === "pokemonGenCount") {
      const needAll = String(title.conditionText || "").includes("모든");
      const threshold = needAll ? 9 : required;
      if (pokemonGenCount >= threshold) add(title);
    } else if (sourceType === "badgeFields") {
      if (earnedGroups.size >= required) add(title);
    } else if (sourceType === "badge") {
      if (earnedBadgeIds.size >= required) add(title);
    } else if (sourceType === "rankingNormal50") {
      if (normal50Count >= required) add(title);
    } else if (sourceType === "rankingBestScoreTotal300") {
      if (rankingBestTotal >= 300) add(title);
    } else if (sourceType === "emojiCombinedCompletions") {
      if (emojiCombinedCompletionCount(title, badges, rankingRecords) >= required) add(title);
    }
  });

  let changed = true;
  while (changed) {
    changed = false;
    const ownedOrEligibleIds = new Set([...existingTitleIds, ...eligible.keys()]);
    titleCatalog.forEach(title => {
      if (eligible.has(title.titleId)) return;
      if (String(title.sourceType || "") !== "subjectDetailTitles") return;
      const subjectGroup = String(title.subjectGroup || "").trim();
      const required = numberFromText(title.conditionText, 1);
      const count = titleCatalog.filter(candidate => {
        if (candidate.titleId === title.titleId) return false;
        if (!ownedOrEligibleIds.has(candidate.titleId)) return false;
        return String(candidate.subjectGroup || "").trim() === subjectGroup
          && String(candidate.sourceType || "").trim() === "practiceStars";
      }).length;
      if (count >= required) {
        add(title);
        changed = true;
      }
    });
  }

  return Array.from(eligible.values()).filter(title => !existingTitleIds.has(title.titleId));
}

exports.syncMemberTitles = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");

  await db.runTransaction(async transaction => {
    await assertLinkedMemberAuth(transaction, memberUserId, authUid);
  });

  const [
    titleCatalogSnapshot,
    badgeSnapshot,
    titleSnapshot,
    titleSummarySnapshot,
    rankingSnapshot
  ] = await Promise.all([
    db.collection("titleCatalog").get(),
    db.collection("userBadges").doc(memberUserId).collection("badges").get(),
    db.collection("userTitles").doc(memberUserId).collection("titles").get(),
    db.collection("userTitleSummary").doc(memberUserId).get(),
    db.collection("rankingRecords").where("memberUserId", "==", memberUserId).limit(500).get()
  ]);

  const titleCatalog = titleCatalogSnapshot.docs.map(doc => ({ titleId: doc.id, ...(doc.data() || {}) }));
  const badges = badgeSnapshot.docs.map(doc => ({ badgeId: doc.id, ...(doc.data() || {}) }));
  const rankingRecords = rankingSnapshot.docs.map(doc => ({ recordId: doc.id, ...(doc.data() || {}) }));
  const existingTitleIds = new Set(titleSnapshot.docs.map(doc => doc.id));
  const existingTitleNames = {};
  titleSnapshot.docs.forEach(doc => {
    const data = doc.data() || {};
    existingTitleNames[doc.id] = data.titleName || data.name || doc.id;
  });
  const eligibleNewTitles = evaluateEligibleTitles(titleCatalog, badges, rankingRecords, existingTitleIds);

  const summaryData = titleSummarySnapshot.exists ? titleSummarySnapshot.data() || {} : {};
  const selectedTitleId = String(summaryData.selectedTitleId || "").trim();
  const selectedTitleName = selectedTitleId
    ? (existingTitleNames[selectedTitleId] || eligibleNewTitles.find(title => title.titleId === selectedTitleId)?.titleName || summaryData.selectedTitleName || "")
    : "";
  const allTitleIds = new Set([...existingTitleIds, ...eligibleNewTitles.map(title => title.titleId)]);

  const batch = db.batch();
  eligibleNewTitles.forEach(title => {
    batch.set(
      db.collection("userTitles").doc(memberUserId).collection("titles").doc(title.titleId),
      ownedTitleDoc(title, memberUserId, "firebase_title_sync"),
      { merge: true }
    );
  });
  batch.set(
    db.collection("userTitleSummary").doc(memberUserId),
    titleSummaryDoc(memberUserId, allTitleIds, selectedTitleId, selectedTitleName),
    { merge: true }
  );
  await batch.commit();
  const rewardResults = [];
  for (const title of eligibleNewTitles) {
    rewardResults.push(await awardTitleAcquisitionReward(memberUserId, authUid, title));
  }

  return {
    success: true,
    memberUserId,
    awardedCount: eligibleNewTitles.length,
    awardedTitles: eligibleNewTitles.map(title => ({
      titleId: title.titleId,
      titleName: title.titleName || title.titleId
    })),
    titleRewardCount: rewardResults.filter(result => result && !result.duplicate).length,
    titleRewards: rewardResults.filter(Boolean).map(result => ({
      titleId: result.titleId,
      titleName: result.titleName || "",
      xpDelta: result.xpDelta || 0,
      rewardCoin: result.rewardCoin || 0,
      classroomPoint: result.classroomPoint || 0,
      levelXp: result.levelXp || null
    })),
    titleCount: allTitleIds.size
  };
});
