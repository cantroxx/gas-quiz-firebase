"use strict";

const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const REGION = "asia-northeast3";
const DEFAULT_MEMBER_SCHOOL = "동자";
const AUTH_LINK_PROVIDER = "firebase_member_link_function";
const AUTH_LINK_VERSION = 3;
const MAX_FAILED_ATTEMPTS = 5;
const PRACTICE_CORRECT_REWARD_COIN = 1;
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

function hashAccessCode(accessCode, salt) {
  return crypto
    .createHash("sha256")
    .update(`${String(salt || "")}:${accessCode}`, "utf8")
    .digest("hex");
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function assertActiveStudent(memberData) {
  if (!memberData || memberData.role !== "student") {
    throw new HttpsError("failed-precondition", "Member is not an active student.");
  }
  if (memberData.status !== "active" || memberData.active !== true) {
    throw new HttpsError("failed-precondition", "Member is inactive.");
  }
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
      assertActiveStudent(memberData);

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

exports.purchaseShopItem = onCall({ region: REGION }, async request => {
  requireAuth(request);
  throw new HttpsError(
    "unimplemented",
    "purchaseShopItem is scaffolded for the next migration phase and is not active yet."
  );
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
