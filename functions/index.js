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
const db = getFirestore();

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
  return { memberUserId: doc.id, memberData: data };
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
  const setupEnabled = payload.setupEnabled !== false;
  const setupExpiresAt = dateToTimestamp(payload.setupExpiresAt);
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
      if (!credentialsSnapshot.exists || !credentialsSnapshot.data()?.passwordHash) {
        throw new HttpsError("failed-precondition", "Member password is not configured.");
      }
      const credentials = credentialsSnapshot.data() || {};
      assertNotLocked(credentials, settings);

      if (!verifyPassword(password, credentials)) {
        transaction.set(credentialsRef, failedAttemptUpdate(credentials, settings), { merge: true });
        throw new HttpsError("permission-denied", "Password mismatch.");
      }

      transaction.set(credentialsRef, {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
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
        forcePasswordChange: credentials.forcePasswordChange === true
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

      transaction.set(credentialsRef, {
        ...createPasswordHash(newPassword),
        forcePasswordChange: false,
        failedAttempts: 0,
        lockedUntil: null,
        passwordChangedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.set(memberRef, {
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
        resetAt: FieldValue.serverTimestamp(),
        resetByAuthUid: authUid,
        resetSource: "student_self_service",
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.set(memberRef, {
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
    status: data.status || "",
    active: data.active === true,
    authLinked: !!data.authUid,
    updatedAt: data.updatedAt || null
  };
}

exports.adminListMembers = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const grade = String(payload.grade || "").trim();
  const classNumber = String(payload.classNumber || "").trim();
  const queryText = String(payload.query || "").trim().toLowerCase();
  const limit = Math.max(1, Math.min(Number(payload.limit) || 80, 200));

  const snapshot = await db.collection("users").orderBy("userId").limit(1000).get();
  let members = snapshot.docs.map(publicAdminMemberRow);

  if (grade) {
    members = members.filter(member => String(member.grade) === grade);
  }
  if (classNumber) {
    members = members.filter(member => String(member.classNumber) === classNumber);
  }
  if (queryText) {
    members = members.filter(member => [
      member.userId,
      member.school,
      member.nickname,
      `${member.grade}-${member.classNumber}-${member.studentNumber}`
    ].join(" ").toLowerCase().includes(queryText));
  }
  const summary = members.reduce((acc, member) => {
    acc.total += 1;
    if (member.role === "admin") acc.admins += 1;
    if (member.role === "student" && member.active && member.status === "active") acc.activeStudents += 1;
    if (!member.active || member.status !== "active") acc.inactive += 1;
    return acc;
  }, { total: 0, activeStudents: 0, inactive: 0, admins: 0 });

  return {
    success: true,
    adminUserId: adminMember.memberUserId,
    summary,
    members: members.slice(0, limit)
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
    if (memberData.role === "admin" && adminMember.memberUserId !== memberUserId) {
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
      resetAt: FieldValue.serverTimestamp(),
      resetByAuthUid: authUid,
      resetByAdminUserId: adminMember.memberUserId,
      resetSource: "admin",
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(memberRef, {
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
  await getAdminMemberForAuth(authUid);
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

function publicNoticeBoard(data) {
  return {
    title: String(data?.title || "알림판").trim().slice(0, 40),
    desc: String(data?.desc || "공지와 오늘 추천 활동을 확인하고 바로 이동할 수 있습니다.").trim().slice(0, 120),
    summary: String(data?.summary || "관리자 공지, 오늘의 퀘스트, 이벤트 추천 퀴즈를 보여주는 타운 알림판입니다.").trim().slice(0, 180),
    announcement: String(data?.announcement || "오늘도 연습전과 랭킹전을 자유롭게 이용할 수 있어요.").trim().slice(0, 160),
    quest: String(data?.quest || "이벤트 광장에서 개인 미션을 확인하세요.").trim().slice(0, 160),
    recommendedQuizLabel: String(data?.recommendedQuizLabel || "학교에서 과목관을 골라 바로 시작하세요.").trim().slice(0, 80),
    recommendedQuizId: String(data?.recommendedQuizId || "").trim().slice(0, 80),
    active: data?.active !== false
  };
}

exports.adminGetNoticeBoard = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  await getAdminMemberForAuth(authUid);
  const snapshot = await db.collection("noticeBoard").doc("current").get();
  return {
    success: true,
    notice: publicNoticeBoard(snapshot.exists ? snapshot.data() || {} : {})
  };
});

exports.adminUpdateNoticeBoard = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const adminMember = await getAdminMemberForAuth(authUid);
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

exports.purchaseShopItem = onCall({ region: REGION }, async request => {
  const authUid = requireAuth(request);
  const payload = request.data && typeof request.data === "object" ? request.data : {};
  const memberUserId = normalizeId(payload.memberUserId, "memberUserId");
  const itemId = normalizeId(payload.itemId, "itemId");

  const result = await db.runTransaction(async transaction => {
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
