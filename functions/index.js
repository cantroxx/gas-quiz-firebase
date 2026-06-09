"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");

initializeApp();

const REGION = "asia-northeast3";

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Firebase Auth is required.");
  }
  return request.auth.uid;
}

function assertScaffoldOnly(functionName) {
  throw new HttpsError(
    "unimplemented",
    `${functionName} is scaffolded for the next migration phase and is not active yet.`
  );
}

exports.verifyMemberAccessCode = onCall({ region: REGION }, async request => {
  requireAuth(request);
  assertScaffoldOnly("verifyMemberAccessCode");
});

exports.linkMemberAuthUid = onCall({ region: REGION }, async request => {
  requireAuth(request);
  assertScaffoldOnly("linkMemberAuthUid");
});

exports.purchaseShopItem = onCall({ region: REGION }, async request => {
  requireAuth(request);
  assertScaffoldOnly("purchaseShopItem");
});

exports.grantPracticeReward = onCall({ region: REGION }, async request => {
  requireAuth(request);
  assertScaffoldOnly("grantPracticeReward");
});
