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
const PASSWORD_HASH_ITERATIONS = 210000;
const PASSWORD_HASH_KEY_LENGTH = 32;
const PASSWORD_SETUP_SESSION_MINUTES = 15;
const DEFAULT_PASSWORD_SETUP_EXPIRES_AT = "2026-06-17T23:59:59+09:00";
const SUPER_ADMIN_MEMBER_USER_ID = "G9-C9-N99";
const FEATURE_FLAGS_DOC_PATH = "appSettings/featureFlags";
const EXTERNAL_QUIZZES_DOC_PATH = "appSettings/externalQuizzes";
const db = getFirestore();

const DEFAULT_FEATURE_FLAGS = {
  practiceRewardEnabled: true,
  shopEnabled: true,
  eventPlazaEnabled: true,
  rankingEnabled: true,
  disabledQuizIds: []
};

const DEFAULT_EXTERNAL_QUIZZES = {
  items: []
};

const EVENT_QUEST_DEFINITIONS = {
  spelling_practice_once: {
    questId: "spelling_practice_once",
    icon: "✏️",
    title: "맞춤법 연습전 1회 완료",
    target: 1,
    rewardCoin: 3,
    kind: "spellingPractice"
  },
  social_three_questions: {
    questId: "social_three_questions",
    icon: "🏛️",
    title: "사회 퀴즈 3문제 풀기",
    target: 3,
    rewardCoin: 5,
    kind: "socialCorrect"
  },
  math_practice_try: {
    questId: "math_practice_try",
    icon: "➗",
    title: "수학 연습전 도전하기",
    target: 1,
    rewardCoin: 10,
    kind: "mathPractice"
  }
};

const CLASS_MISSION_DEFINITIONS = [
  {
    missionId: "class_quiz_100",
    icon: "🏫",
    title: "우리 반 누적 퀴즈 100문제 도전",
    target: 100,
    reward: "학급 공동 보상 예고"
  },
  {
    missionId: "class_coin_2000",
    icon: "🪙",
    title: "학급 누적 DJ코인 2000개 모으기",
    target: 2000,
    reward: "학급 공동 보상 예고"
  },
  {
    missionId: "ranking_30",
    icon: "🏆",
    title: "학급 랭킹전 참여 30회",
    target: 30,
    reward: "학급 공동 보상 예고"
  }
];

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
  const disabledQuizIds = Array.isArray(data.disabledQuizIds)
    ? Array.from(new Set(data.disabledQuizIds
      .map(id => String(id || "").trim())
      .filter(id => /^[0-9A-Za-z_-]{1,80}$/.test(id))))
      .slice(0, 120)
    : [];
  return {
    practiceRewardEnabled: data.practiceRewardEnabled !== false,
    shopEnabled: data.shopEnabled !== false,
    eventPlazaEnabled: data.eventPlazaEnabled !== false,
    rankingEnabled: data.rankingEnabled !== false,
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
  const items = rawItems.slice(0, 5)
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
    active: memberData.active === true
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

function getKstDateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
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

function getQuestProgressValue(quest, practiceRecords) {
  if (quest.kind === "spellingPractice") {
    return practiceRecords.some(record =>
      record.quizId === "spelling"
      || getRecordAreaKey(record) === "일상/맞춤법"
      || String(record.detail || "").includes("맞춤법")
    ) ? 1 : 0;
  }
  if (quest.kind === "mathPractice") {
    return practiceRecords.some(record =>
      record.quizId === "random-basic"
      || getRecordAreaKey(record) === "수학/random-basic"
      || String(record.detail || "").includes("곱셈과 나눗셈")
    ) ? 1 : 0;
  }
  if (quest.kind === "socialCorrect") {
    return practiceRecords
      .filter(record => String(record.area || "").includes("사회") || getRecordAreaKey(record).startsWith("사회/"))
      .reduce((sum, record) => sum + getPracticeSolvedTotal(record), 0);
  }
  return 0;
}

function buildEventQuestRows(practiceRecords, claimMap) {
  return Object.values(EVENT_QUEST_DEFINITIONS).map(quest => {
    const current = Math.min(quest.target, getQuestProgressValue(quest, practiceRecords));
    const completed = current >= quest.target;
    const claimed = !!claimMap[quest.questId];
    return {
      questId: quest.questId,
      icon: quest.icon,
      title: quest.title,
      current,
      target: quest.target,
      progress: `${current}/${quest.target}`,
      rewardCoin: quest.rewardCoin,
      reward: `DJ코인 +${quest.rewardCoin}`,
      completed,
      claimed,
      claimable: completed && !claimed,
      status: claimed ? "수령 완료" : (completed ? "완료 가능" : "진행 중")
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
  assertActiveStudent(memberData);
  if (memberData.authUid !== authUid) {
    throw new HttpsError("permission-denied", "Member is not linked to current auth.");
  }
  return { memberUserId: safeMemberUserId, memberData };
}

async function loadMemberPracticeRecords(memberUserId) {
  const snapshot = await db.collection("practiceRecords")
    .where("memberUserId", "==", memberUserId)
    .limit(500)
    .get();
  return snapshot.docs.map(doc => ({ recordId: doc.id, ...(doc.data() || {}) }));
}

async function loadEventClaimMap(memberUserId, dateKey) {
  const questIds = Object.keys(EVENT_QUEST_DEFINITIONS);
  const snapshots = await Promise.all(questIds.map(questId =>
    db.collection("rewardLogs").doc(rewardLogId([
      "event_quest",
      dateKey,
      memberUserId,
      questId
    ])).get()
  ));
  return snapshots.reduce((map, snapshot, index) => {
    if (snapshot.exists) map[questIds[index]] = true;
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
  assertActiveStudent(memberData);
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
    updatedAt: data.updatedAt || null
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

function isBetterAuditRankingRecord(next, current) {
  if (!current) return true;
  const scoreDiff = (Number(next.score) || 0) - (Number(current.score) || 0);
  if (scoreDiff) return scoreDiff > 0;
  return (Number(next.elapsedSeconds) || 999999999) < (Number(current.elapsedSeconds) || 999999999);
}

function buildAuditQuizKingSummary(rows) {
  const bestByUser = new Map();
  const allowedModes = new Set(["normal", "speed", "onechance", "nohint"]);
  rows.forEach(record => {
    const memberUserId = String(record.memberUserId || record.userId || "").trim();
    const rankingMode = String(record.rankingMode || "").trim();
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
    quizKingSnapshot
  ] = await Promise.all([
    db.collection("users").limit(2000).get(),
    db.collection("memberCredentials").limit(2000).get(),
    db.collection("practiceRecords").limit(5000).get(),
    db.collection("rankingRecords").limit(5000).get(),
    db.collection("quizKingSummary").limit(2000).get()
  ]);

  const users = userSnapshot.docs.map(doc => ({ memberUserId: doc.id, ...(doc.data() || {}) }));
  const userIds = new Set(users.map(user => user.memberUserId));
  const credentialIds = new Set(credentialSnapshot.docs.map(doc => doc.id));
  const practiceRows = practiceSnapshot.docs.map(publicAuditRecord);
  const rankingRows = rankingSnapshot.docs.map(publicAuditRecord);
  const quizKingRows = quizKingSnapshot.docs.map(publicAuditRecord);

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
  const orphanRankingRecords = orphanRankingRecordRows
    .slice(0, 20)
    .map(row => ({
      recordId: row.recordId,
      memberUserId: row.memberUserId || row.userId || "",
      category: row.category || row.categoryKey || "",
      score: Number(row.score) || 0
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
        suspiciousRankingRecords: suspiciousRankingRecordRows.length,
        quizKingMismatch: quizKingMismatchRows.length
      },
      issues: {
        memberAuth: memberAuthIssues,
        orphanPracticeRecords,
        orphanRankingRecords,
        suspiciousRankingRecords,
        quizKingMismatch
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

  const economy = economySnapshot.exists ? economySnapshot.data() || {} : {};
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
    desc: String(data?.desc || "공지와 오늘 추천 활동을 확인하고 바로 이동할 수 있습니다.").trim().slice(0, 120),
    summary: String(data?.summary || "관리자 공지, 오늘의 퀘스트, 이벤트 추천 퀴즈를 보여주는 타운 알림판입니다.").trim().slice(0, 180),
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

  await db.doc(FEATURE_FLAGS_DOC_PATH).set({
    ...next,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByAdminUserId: adminMember.memberUserId
  }, { merge: true });

  await writeAdminLog({
    adminUserId: adminMember.memberUserId,
    action: "adminUpdateFeatureFlags",
    targetUserId: FEATURE_FLAGS_DOC_PATH,
    before,
    after: next,
    reason: "feature flags update"
  });

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

exports.getEventProgress = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const flags = await getFeatureFlags();
  assertFeatureEnabled(flags, "eventPlazaEnabled", "Event plaza is disabled.");

  const { memberData } = await loadLinkedMemberForEvent(authUid, memberUserId);
  const dateKey = getKstDateKey();
  const [practiceRecords, claimMap, classMissions] = await Promise.all([
    loadMemberPracticeRecords(memberUserId),
    loadEventClaimMap(memberUserId, dateKey),
    loadClassEventProgress(memberData)
  ]);

  return {
    success: true,
    memberUserId,
    dateKey,
    quests: buildEventQuestRows(practiceRecords, claimMap),
    classMissions,
    seasonEvents: [
      {
        eventId: "reading_king_season",
        icon: "📖",
        title: "독서왕 시즌",
        desc: "독서 퀴즈를 중심으로 시즌 칭호와 뱃지를 모으는 이벤트입니다.",
        period: "이번 달"
      },
      {
        eventId: "three_kingdoms_week",
        icon: "🏯",
        title: "삼국시대 탐험 주간",
        desc: "삼국시대 사회 퀴즈를 많이 풀어보는 주간 이벤트입니다.",
        period: "이번 주"
      },
      {
        eventId: "calculation_challenge",
        icon: "🧮",
        title: "계산왕 챌린지",
        desc: "수학 계산 연습을 반복하며 도전 기록을 확인하는 이벤트입니다.",
        period: "준비 중"
      }
    ]
  };
});

exports.claimEventQuestReward = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const questId = normalizeId(payload.questId, "questId");
  const quest = EVENT_QUEST_DEFINITIONS[questId];
  if (!quest) {
    throw new HttpsError("invalid-argument", "Unknown event quest.");
  }

  const flags = await getFeatureFlags();
  assertFeatureEnabled(flags, "eventPlazaEnabled", "Event plaza is disabled.");
  await loadLinkedMemberForEvent(authUid, memberUserId);
  const practiceRecords = await loadMemberPracticeRecords(memberUserId);
  const current = Math.min(quest.target, getQuestProgressValue(quest, practiceRecords));
  if (current < quest.target) {
    throw new HttpsError("failed-precondition", "Event quest is not complete.");
  }

  const result = await db.runTransaction(async transaction => {
    await assertLinkedMemberAuth(transaction, memberUserId, authUid);

    const dateKey = getKstDateKey();
    const logRef = db.collection("rewardLogs").doc(rewardLogId([
      "event_quest",
      dateKey,
      memberUserId,
      questId
    ]));
    const economyRef = db.collection("userEconomy").doc(memberUserId);
    const logSnapshot = await transaction.get(logRef);
    if (logSnapshot.exists) {
      return {
        duplicate: true,
        rewardCoin: 0,
        dateKey,
        rewardLogPath: logRef.path,
        economyPath: economyRef.path
      };
    }

    transaction.set(economyRef, {
      userId: memberUserId,
      djCoin: FieldValue.increment(quest.rewardCoin),
      totalEarned: FieldValue.increment(quest.rewardCoin),
      updatedAt: FieldValue.serverTimestamp(),
      lastEventQuestRewardAt: FieldValue.serverTimestamp(),
      source: "event_quest_reward_function"
    }, { merge: true });
    transaction.set(logRef, {
      type: "event_quest",
      questId,
      questTitle: quest.title,
      dateKey,
      userId: memberUserId,
      memberUserId,
      authUid,
      rewardCoin: quest.rewardCoin,
      progressCurrent: current,
      progressTarget: quest.target,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });

    return {
      duplicate: false,
      rewardCoin: quest.rewardCoin,
      dateKey,
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

exports.purchaseShopItem = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const itemId = normalizeId(payload.itemId, "itemId");

  const result = await db.runTransaction(async transaction => {
    const flags = await getFeatureFlags(transaction);
    assertFeatureEnabled(flags, "shopEnabled", "Shop is disabled.");
    await assertLinkedMemberAuth(transaction, memberUserId, authUid);

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
    assertFeatureEnabled(flags, "practiceRewardEnabled", "Practice reward is disabled.");
    await assertLinkedMemberAuth(transaction, memberUserId, authUid);

    const recordRef = db.collection("practiceRecords").doc(recordId);
    const logRef = db.collection("rewardLogs").doc(rewardLogId([
      "practice",
      memberUserId,
      recordId,
      questionId
    ]));
    const economyRef = db.collection("userEconomy").doc(memberUserId);

    const [recordSnapshot, logSnapshot] = await Promise.all([
      transaction.get(recordRef),
      transaction.get(logRef)
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
        economyPath: economyRef.path,
        rewardLogPath: logRef.path
      };
    }

    transaction.set(economyRef, {
      userId: memberUserId,
      djCoin: FieldValue.increment(PRACTICE_CORRECT_REWARD_COIN),
      totalEarned: FieldValue.increment(PRACTICE_CORRECT_REWARD_COIN),
      updatedAt: FieldValue.serverTimestamp(),
      lastPracticeRewardAt: FieldValue.serverTimestamp(),
      source: "practice_reward_function"
    }, { merge: true });
    transaction.set(logRef, {
      type: "practice_correct",
      userId: memberUserId,
      memberUserId,
      authUid,
      recordId,
      questionId,
      quizId,
      rewardCoin: PRACTICE_CORRECT_REWARD_COIN,
      source: "firebase_function",
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });

    return {
      duplicate: false,
      rewardCoin: PRACTICE_CORRECT_REWARD_COIN,
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
  if (id === "reading_gmo_complete") return "korean_gmo";
  if (id.startsWith("math_muldiv_")) return "math_random_basic";
  if (id.startsWith("people_") || id === "history_god") return "people_역사인물";
  if (id.startsWith("three_kingdoms_")) return "social_three_kingdoms";
  if (id.startsWith("ancient_three_kingdoms_")) return "social_ancient_three_kingdoms";
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

  return {
    success: true,
    memberUserId,
    awardedCount: eligibleNewTitles.length,
    awardedTitles: eligibleNewTitles.map(title => ({
      titleId: title.titleId,
      titleName: title.titleName || title.titleId
    })),
    titleCount: allTitleIds.size
  };
});
