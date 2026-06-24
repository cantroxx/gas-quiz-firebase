#!/usr/bin/env node
'use strict';

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

const PRACTICE_BADGE_CYCLE_REWARD_COIN = 10;
const TITLE_ACQUISITION_REWARD_COIN = 30;

function parseArgs(argv) {
  const args = { commit: false, sample: 10, user: '' };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
    else if (arg === '--sample') args.sample = Number(argv[++index]) || args.sample;
    else if (arg === '--user') args.user = String(argv[++index] || '').trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function initializeAdminApp() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }
}

function rewardLogId(parts) {
  return parts
    .map(part => String(part || '').trim().replace(/[^0-9A-Za-z가-힣:_-]+/g, '-'))
    .filter(Boolean)
    .join('__')
    .slice(0, 1400);
}

function normalizeMemberUserId(data = {}, fallback = '') {
  const explicit = String(data.memberUserId || data.userId || '').trim();
  if (explicit) return explicit;
  return String(fallback || '').split('__')[0].trim();
}

async function loadMissingPracticeBadgeRewards(db, args) {
  const query = args.user
    ? db.collection('practiceRecords').where('memberUserId', '==', args.user)
    : db.collection('practiceRecords');
  const snapshot = await query.get();
  const missing = [];

  for (const doc of snapshot.docs) {
    const record = doc.data() || {};
    const memberUserId = normalizeMemberUserId(record, doc.id);
    const starCount = Math.max(0, Math.min(1000, Math.round(Number(record.starCount || 0) || 0)));
    if (!memberUserId || starCount <= 0) continue;
    for (let starIndex = 1; starIndex <= starCount; starIndex += 1) {
      const logId = rewardLogId(['practice_badge_cycle_reward', memberUserId, doc.id, starIndex]);
      const logSnapshot = await db.collection('rewardLogs').doc(logId).get();
      if (logSnapshot.exists) continue;
      missing.push({
        type: 'practice_badge_cycle_reward',
        logId,
        memberUserId,
        recordId: doc.id,
        quizId: record.quizId || '',
        areaKey: record.areaKey || '',
        badgeId: record.badgeId || '',
        starIndex,
        rewardCoin: PRACTICE_BADGE_CYCLE_REWARD_COIN
      });
    }
  }

  return missing;
}

async function loadMissingTitleRewards(db, args) {
  const parentRefs = args.user
    ? [db.collection('userTitles').doc(args.user)]
    : await db.collection('userTitles').listDocuments();
  const missing = [];

  for (const parentRef of parentRefs) {
    const memberUserId = parentRef.id;
    if (!memberUserId) continue;
    const snapshot = await parentRef.collection('titles').get();
    for (const doc of snapshot.docs) {
      const title = doc.data() || {};
      const titleId = String(title.titleId || doc.id || '').trim();
      if (!titleId) continue;
      const logId = rewardLogId(['title_acquisition_reward', memberUserId, titleId]);
      const logSnapshot = await db.collection('rewardLogs').doc(logId).get();
      if (logSnapshot.exists) continue;
      missing.push({
        type: 'title_acquisition_reward',
        logId,
        memberUserId,
        titleId,
        titleName: String(title.name || title.titleName || titleId).trim(),
        rewardCoin: TITLE_ACQUISITION_REWARD_COIN
      });
    }
  }

  return missing;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function commitRewards(db, rewards) {
  let committed = 0;
  for (const group of chunk(rewards, 220)) {
    const batch = db.batch();
    const coinByUser = new Map();
    group.forEach(reward => {
      coinByUser.set(reward.memberUserId, (coinByUser.get(reward.memberUserId) || 0) + reward.rewardCoin);
      const logRef = db.collection('rewardLogs').doc(reward.logId);
      batch.set(logRef, {
        ...reward,
        userId: reward.memberUserId,
        source: 'backfill_badge_title_rewards',
        backfilledAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp()
      }, { merge: false });
    });
    Array.from(coinByUser.entries()).forEach(([memberUserId, rewardCoin]) => {
      batch.set(db.collection('userEconomy').doc(memberUserId), {
        userId: memberUserId,
        djCoin: FieldValue.increment(rewardCoin),
        totalEarned: FieldValue.increment(rewardCoin),
        updatedAt: FieldValue.serverTimestamp(),
        lastBackfillRewardAt: FieldValue.serverTimestamp(),
        source: 'backfill_badge_title_rewards'
      }, { merge: true });
    });
    await batch.commit();
    committed += group.length;
  }
  return committed;
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = getFirestore();
  const [badgeRewards, titleRewards] = await Promise.all([
    loadMissingPracticeBadgeRewards(db, args),
    loadMissingTitleRewards(db, args)
  ]);
  const rewards = [...badgeRewards, ...titleRewards];
  const totalCoin = rewards.reduce((sum, reward) => sum + reward.rewardCoin, 0);
  const summary = {
    commit: args.commit,
    user: args.user || 'all',
    missingBadgeRewards: badgeRewards.length,
    missingTitleRewards: titleRewards.length,
    totalMissingRewards: rewards.length,
    totalCoin,
    inspectedAt: Timestamp.now().toDate().toISOString(),
    sample: rewards.slice(0, args.sample)
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!args.commit) {
    console.log('No writes performed. Re-run with --commit to backfill rewards.');
    return;
  }
  const committed = await commitRewards(db, rewards);
  console.log(`Committed ${committed} missing reward logs and ${totalCoin} DJ coins.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
