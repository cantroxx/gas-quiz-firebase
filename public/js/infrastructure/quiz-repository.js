(function (root) {
  function defaultShuffleList(items) {
    return items
      .map(item => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(entry => entry.item);
  }

  function getNormalizeQuizId(deps = {}) {
    return deps.normalizeFirebaseQuizId || (value => String(value || '').trim());
  }

  function getRequiredFirebaseFunctions(deps = {}) {
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) throw new Error('functions-unavailable');
    return functions;
  }

  async function grantPracticeCorrectRewardForRepository(memberUserId, rewardCoin, context, deps = {}) {
    const functions = getRequiredFirebaseFunctions(deps);
    const debugLog = deps.debugLog || (() => {});

    debugLog('Practice reward economy update queued:', {
      rewardCoin,
      context
    });
    const grantPracticeReward = functions.httpsCallable('grantPracticeReward');
    const response = await grantPracticeReward({
      memberUserId,
      recordId: context?.recordId || '',
      questionId: context?.questionId || '',
      quizId: context?.quizId || ''
    });
    const result = response?.data || {};
    deps.resetUserEconomyCache?.();
    debugLog('Firestore practice reward update succeeded:', {
      economyPath: result.economyPath || '',
      rewardLogPath: result.rewardLogPath || '',
      rewardCoin: result.rewardCoin || 0,
      xpDelta: result.xpDelta || 0,
      coinCapped: !!result.coinCapped,
      duplicate: !!result.duplicate,
      context
    });
    return result || null;
  }

  async function syncMemberTitlesAfterPracticeCompletionForRepository(memberUserId, context, deps = {}) {
    const functions = getRequiredFirebaseFunctions(deps);
    const debugLog = deps.debugLog || (() => {});
    const syncMemberTitles = functions.httpsCallable('syncMemberTitles');
    const response = await syncMemberTitles({ memberUserId });
    const result = response?.data || {};
    if(Number(result.awardedCount) > 0) {
      debugLog('Firestore title sync awarded titles:', {
        awardedCount: result.awardedCount,
        awardedTitles: result.awardedTitles || [],
        context
      });
      deps.resetTitleCatalogCache?.();
    } else {
      debugLog('Firestore title sync completed with no new titles:', {
        titleCount: result.titleCount || 0,
        context
      });
    }
    return result;
  }

  async function saveRankingRecordOnQuizCompleteForRepository(deps = {}) {
    if(deps.getCurrentModeId?.() !== 'ranking') return null;
    const db = deps.getFirestoreDb?.();
    if(!db) throw new Error('firestore-unavailable');

    const memberUserId = deps.getCurrentDataOwnerId?.();
    if(!memberUserId || memberUserId === deps.testShopUserId) throw new Error('member-required');
    const correctCount = deps.getCorrectAnswerCount?.() || 0;
    const quizId = deps.normalizeFirebaseQuizId?.(deps.getCurrentQuizId?.()) || '';
    const debugLog = deps.debugLog || (() => {});
    if(correctCount <= 0) {
      debugLog('Ranking record skipped because score is 0.', {
        quizId
      });
      return { skipped: true, reason: 'zero-score' };
    }

    const target = deps.getRankingTargetForQuiz?.(quizId);
    if(!target) throw new Error('unsupported-ranking-target');

    const profile = deps.getCurrentMemberProfile?.() || {};
    const elapsedSeconds = deps.getRankingElapsedSeconds?.() || 0;
    const maxElapsedSeconds = deps.getMaxRankingElapsedSeconds?.() || 0;
    if(elapsedSeconds > maxElapsedSeconds) {
      console.warn('Ranking record skipped because elapsed time is too long.', {
        quizId,
        elapsedSeconds,
        maxElapsedSeconds
      });
      return {
        skipped: true,
        reason: 'elapsed-too-long',
        elapsedSeconds,
        elapsedText: deps.formatRankingElapsedText?.(elapsedSeconds) || `${elapsedSeconds}초`
      };
    }
    const fieldValue = deps.getFirestoreFieldValue?.();
    const recordId = deps.buildRankingRecordId?.(memberUserId, target.categoryKey, target.rankingMode);
    const recordRef = db.collection('rankingRecords').doc(recordId);
    const userSummaryRef = db.collection('userRankingSummary').doc(memberUserId);
    const quizKingSummaryRef = db.collection('quizKingSummary').doc(memberUserId);
    const record = {
      recordId,
      memberUserId,
      userId: memberUserId,
      displayName: profile.nickname || profile.name || memberUserId,
      grade: String(profile.grade || ''),
      classNo: String(profile.classNo || profile.classNumber || ''),
      number: String(profile.number || profile.studentNumber || ''),
      profileImageUrl: profile.profileImageUrl || '',
      rankingMessage: profile.rankingMessage || '',
      selectedTitleId: profile.selectedTitleId || '',
      quizId,
      category: target.category,
      categoryKey: target.categoryKey,
      rawCategory: target.category,
      subFilter: target.subFilter,
      score: correctCount,
      elapsedSeconds,
      elapsedText: deps.formatRankingElapsedText?.(elapsedSeconds) || `${elapsedSeconds}초`,
      rankingMode: target.rankingMode,
      sourceSheet: 'firebase-app',
      sourceRowNumber: 0,
      legacy: false,
      hasUserId: true,
      recordedAt: fieldValue.serverTimestamp(),
      createdAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
      migrationSource: 'firebase_app_ranking'
    };

    const [userSummarySnapshot, quizKingSummarySnapshot] = await Promise.all([
      userSummaryRef.get(),
      quizKingSummaryRef.get()
    ]);
    const userSummaryData = deps.buildUserRankingSummaryUpdate?.(
      userSummarySnapshot.exists ? userSummarySnapshot.data() : {},
      record,
      fieldValue.serverTimestamp()
    );
    const quizKingSummaryData = deps.buildQuizKingSummaryUpdate?.(
      quizKingSummarySnapshot.exists ? quizKingSummarySnapshot.data() : {},
      record,
      fieldValue.serverTimestamp()
    );
    const batch = db.batch();
    batch.set(recordRef, record, { merge: true });
    batch.set(userSummaryRef, userSummaryData, { merge: true });
    batch.set(quizKingSummaryRef, quizKingSummaryData, { merge: true });
    await batch.commit();
    let levelXpResult = null;
    try {
      const functions = deps.getFirebaseFunctions?.();
      if(functions) {
        const grantRankingCompleteXp = functions.httpsCallable('grantRankingCompleteXp');
        const response = await grantRankingCompleteXp({
          memberUserId,
          recordId,
          quizId
        });
        const result = response?.data || null;
        levelXpResult = result && (result.success || result.levelXp || Number(result.xpDelta) > 0) ? result : null;
      }
    } catch(error) {
      console.warn('Ranking completion XP grant failed.', error);
    }

    debugLog('Firestore ranking record save succeeded:', {
      recordId,
      score: correctCount,
      categoryKey: target.categoryKey,
      elapsedSeconds,
      xpDelta: levelXpResult?.xpDelta || 0
    });
    return {
      recordId,
      score: correctCount,
      categoryKey: target.categoryKey,
      elapsedText: record.elapsedText,
      ...(levelXpResult ? {
        xpDelta: levelXpResult.xpDelta || 0,
        levelXp: levelXpResult.levelXp || null
      } : {})
    };
  }

  async function savePracticeProgressAfterCorrectAnswerForRepository(question, deps = {}) {
    if(deps.getCurrentModeId?.() !== 'practice') return null;
    const db = deps.getFirestoreDb?.();
    if(!db) throw new Error('firestore-unavailable');

    const memberUserId = deps.getCurrentDataOwnerId?.();
    if(!memberUserId || memberUserId === deps.testShopUserId) throw new Error('member-required');

    const questionId = deps.getPracticeQuestionId?.(question);
    if(!questionId) throw new Error('missing-question-id');
    const questionIdCandidates = deps.getPracticeQuestionIdCandidates?.(question) || [];

    const quizId = deps.normalizeFirebaseQuizId?.(deps.getCurrentQuizId?.()) || '';
    const meta = await deps.loadFirebaseQuizMeta?.(quizId);
    const target = deps.getPracticeTargetForQuiz?.(quizId, meta);
    if(!target) throw new Error('unsupported-practice-target');

    const totalCount = Number(meta?.questionCount) || deps.getCurrentQuestionSet?.().length;
    if(!totalCount || totalCount <= 0) throw new Error('invalid-total-count');

    const recordId = deps.buildPracticeProgressRecordId?.(memberUserId, target.areaKey);
    const recordRef = db.collection('practiceRecords').doc(recordId);
    const summaryRef = db.collection('userPracticeSummary').doc(memberUserId);
    const authUid = deps.getFirebaseAuthUser?.()?.uid || '';
    const fieldValue = deps.getFirestoreFieldValue?.();
    let saveResult = null;
    let readFallback = false;
    let snapshot = null;
    let summarySnapshot = null;
    const debugLog = deps.debugLog || (() => {});

    const [recordReadResult, summaryReadResult] = await Promise.allSettled([
      recordRef.get(),
      summaryRef.get()
    ]);
    if(recordReadResult.status === 'fulfilled') {
      snapshot = recordReadResult.value;
    } else {
      const error = recordReadResult.reason;
      if(!deps.isFirestorePermissionDeniedError?.(error)) throw error;
      readFallback = true;
      console.warn('Practice progress record read blocked; using write-only fallback for legacy or missing progress document.', {
        recordPath: recordRef.path,
        code: error?.code || '',
        message: error?.message || ''
      });
    }
    if(summaryReadResult.status === 'fulfilled') {
      summarySnapshot = summaryReadResult.value;
    } else {
      const error = summaryReadResult.reason;
      if(!deps.isFirestorePermissionDeniedError?.(error)) throw error;
      console.warn('Practice summary read blocked; continuing with merge-only summary update.', {
        summaryPath: summaryRef.path,
        code: error?.code || '',
        message: error?.message || ''
      });
    }
    const existing = snapshot?.exists ? snapshot.data() || {} : {};
    const existingSummary = summarySnapshot?.exists ? summarySnapshot.data() || {} : {};
    const existingIds = Array.isArray(existing.correctIds) ? existing.correctIds.map(id => String(id || '').trim()).filter(Boolean) : [];
    const isDuplicateCorrectId = questionIdCandidates.some(id => existingIds.includes(id));
    const mergedIds = isDuplicateCorrectId ? existingIds : Array.from(new Set([...existingIds, questionId]));
    const previousCorrectCount = Number(existing.correctCount) || existingIds.length;
    const existingStarCount = Number(existing.starCount) || 0;
    const flags = await deps.loadFeatureFlags?.();
    const rewardDisabled = flags.practiceRewardEnabled === false;
    const rewardCoin = (isDuplicateCorrectId || rewardDisabled) ? 0 : deps.getPracticeCorrectCoin?.();
    const completed = mergedIds.length >= totalCount;
    const isCompleteType = target.completionType === 'complete';
    let nextIds = mergedIds;
    let nextCorrectCount = mergedIds.length;
    let nextStarCount = existingStarCount;
    let completedRound = false;
    const nextData = {
      recordId,
      memberUserId,
      userId: memberUserId,
      authUid,
      quizId,
      area: target.area,
      detail: target.detail,
      areaKey: target.areaKey,
      completionType: target.completionType,
      inferredCompletionType: false,
      totalCount,
      mode: 'practice',
      source: 'firebase-app',
      version: 2,
      updatedAt: fieldValue.serverTimestamp(),
      lastAchievedAt: fieldValue.serverTimestamp()
    };

    if(!snapshot?.exists) {
      nextData.createdAt = fieldValue.serverTimestamp();
    }

    if(completed) {
      completedRound = true;
      if(isCompleteType) {
        nextStarCount = 1;
        nextIds = [];
        nextCorrectCount = totalCount;
      } else {
        nextStarCount += 1;
        nextIds = [];
        nextCorrectCount = 0;
      }
      nextData.completed = true;
      nextData.firstCompletedAt = existing.firstCompletedAt || fieldValue.serverTimestamp();
      nextData.lastCompletedAt = fieldValue.serverTimestamp();
    } else {
      nextData.completed = !!existing.completed;
      if(existing.firstCompletedAt) nextData.firstCompletedAt = existing.firstCompletedAt;
      if(existing.lastCompletedAt) nextData.lastCompletedAt = existing.lastCompletedAt;
    }

    nextData.correctIds = readFallback ? fieldValue.arrayUnion(questionId) : nextIds;
    nextData.correctCount = readFallback ? fieldValue.increment(1) : nextCorrectCount;
    nextData.starCount = nextStarCount;
    const summaryData = deps.buildPracticeSummaryUpdate?.(existingSummary, {
      memberUserId,
      recordExists: !!snapshot?.exists,
      area: target.area,
      detail: target.detail,
      areaKey: target.areaKey,
      totalCount,
      previousStarCount: existingStarCount,
      nextStarCount,
      nextCorrectCount,
      updatedAt: fieldValue.serverTimestamp()
    });
    const badgeData = deps.buildPracticeBadgeUpdate?.({
      memberUserId,
      area: target.area,
      detail: target.detail,
      areaKey: target.areaKey,
      totalCount,
      nextStarCount,
      nextCorrectCount,
      updatedAt: fieldValue.serverTimestamp()
    });
    const badgeRef = db.collection('userBadges').doc(memberUserId).collection('badges').doc(badgeData.badgeId);
    saveResult = {
      recordId,
      questionId,
      duplicate: isDuplicateCorrectId,
      readFallback,
      completed,
      completedRound,
      completionType: target.completionType,
      rewardCoin,
      rewardDisabled,
      previousCorrectCount,
      nextCorrectCount,
      previousStarCount: existingStarCount,
      nextStarCount,
      badgePath: badgeRef.path
    };
    if(isDuplicateCorrectId) {
      debugLog('Practice progress duplicate correctId; correctCount unchanged as expected:', saveResult);
      debugLog('Practice reward skipped for duplicate correctId:', {
        recordId,
        questionId,
        rewardCoin
      });
    } else {
      debugLog('Practice progress new correctId added:', saveResult);
    }
    debugLog('Practice progress write paths:', {
      recordPath: recordRef.path,
      summaryPath: summaryRef.path,
      badgePath: badgeRef.path,
      readFallback
    });
    await recordRef.set(nextData, { merge: true });

    const batch = db.batch();
    batch.set(summaryRef, summaryData, { merge: true });
    batch.set(badgeRef, badgeData, { merge: true });
    await batch.commit();

    if(readFallback) {
      debugLog('Practice progress primary record update succeeded with write-only fallback; summary and badge were merged after the write.', saveResult);
    }

    debugLog('Firestore practice progress update succeeded:', saveResult || { recordId, questionId });
    if(saveResult && saveResult.completedRound) {
      debugLog('Practice completion round applied:', {
        recordId: saveResult.recordId,
        completionType: saveResult.completionType,
        previousStarCount: saveResult.previousStarCount,
        nextStarCount: saveResult.nextStarCount,
        badgePath: saveResult.badgePath
      });
      deps.syncMemberTitlesAfterPracticeCompletion?.(memberUserId, {
        recordId: saveResult.recordId,
        quizId,
        completionType: saveResult.completionType
      }).catch(error => {
        console.warn('Firestore title sync after practice completion failed.', error);
      });
    }
    if(saveResult && !saveResult.duplicate) {
      const rewardResult = await deps.grantPracticeCorrectReward?.(memberUserId, saveResult.rewardCoin, {
        recordId: saveResult.recordId,
        questionId: saveResult.questionId,
        quizId
      });
      if(rewardResult) {
        saveResult.rewardCoin = Number(rewardResult.rewardCoin) || 0;
        saveResult.xpDelta = rewardResult.xpDelta || 0;
        saveResult.levelXp = rewardResult.levelXp || null;
        saveResult.coinCapped = !!rewardResult.coinCapped;
        saveResult.dailyCoinLimit = Number(rewardResult.dailyCoinLimit) || 0;
        saveResult.practiceCoinEnabled = rewardResult.practiceCoinEnabled !== false;
      }
    }
    return saveResult || { recordId, questionId };
  }

  function makeMathChoiceQuestion(question, answer, deps = {}) {
    const shuffleList = deps.shuffleList || defaultShuffleList;
    const distractors = [
      answer + 1,
      Math.max(0, answer - 1),
      answer + 10,
      Math.max(0, answer - 10)
    ].filter(value => value !== answer);
    const choices = shuffleList([answer, ...distractors.slice(0, 3)]).map(String);
    return {
      practiceQuestionId: '',
      question,
      choices,
      answer: choices.indexOf(String(answer))
    };
  }

  function generateFirebaseRandomBasicQuestions(deps = {}) {
    const shuffleList = deps.shuffleList || defaultShuffleList;
    const questions = [];
    let index = 1;
    [
      { type: 'mul10', count: 30 },
      { type: 'mul2digit', count: 30 },
      { type: 'div10', count: 20 },
      { type: 'div2digit', count: 20 }
    ].forEach(group => {
      for(let i = 0; i < group.count; i += 1) {
        if(group.type === 'mul10') {
          const left = 2 + ((index + i) % 8);
          const right = 10 * (2 + ((index * 3 + i) % 8));
          questions.push(makeMathChoiceQuestion(`${left} x ${right}의 값은?`, left * right, deps));
        } else if(group.type === 'mul2digit') {
          const left = 11 + ((index + i) % 20);
          const right = 2 + ((index * 2 + i) % 8);
          questions.push(makeMathChoiceQuestion(`${left} x ${right}의 값은?`, left * right, deps));
        } else if(group.type === 'div10') {
          const divisor = 2 + ((index + i) % 8);
          const quotient = 10 * (2 + ((index * 3 + i) % 8));
          questions.push(makeMathChoiceQuestion(`${divisor * quotient} ÷ ${divisor}의 값은?`, quotient, deps));
        } else {
          const divisor = 2 + ((index + i) % 8);
          const quotient = 11 + ((index * 2 + i) % 20);
          questions.push(makeMathChoiceQuestion(`${divisor * quotient} ÷ ${divisor}의 값은?`, quotient, deps));
        }
        questions[questions.length - 1].practiceQuestionId = `math-muldiv-${group.type}-${String(index).padStart(3, '0')}`;
        index += 1;
      }
    });
    return shuffleList(questions);
  }

  function buildSpellingQuestion(question, deps = {}) {
    const shuffleList = deps.shuffleList || defaultShuffleList;
    const prompt = String(question.prompt || '').trim();
    const answerText = String(question.answer || '').trim();
    const match = prompt.match(/\(([^()/]+)\/([^()/]+)\)/);
    const choices = match ? [match[1].trim(), match[2].trim()] : [answerText, ...(question.aliases || [])].filter(Boolean).slice(0, 2);
    const normalizedChoices = shuffleList(choices.length >= 2 ? choices : [answerText, '다시 보기']);
    const answerIndex = normalizedChoices.findIndex(choice => choice === answerText);
    return {
      practiceQuestionId: String(question.questionId || '').trim(),
      question: prompt || '다음 중 맞는 표현은?',
      choices: normalizedChoices,
      answer: answerIndex >= 0 ? answerIndex : 0
    };
  }

  function buildWordRelationQuestion(question) {
    const relationAnswer = String(question.answer || '').trim();
    const choices = ['다의어', '동형이의어'];
    const answerIndex = choices.indexOf(relationAnswer);
    const meaning1 = String(question.meaning1 || question.definition1 || question.firstMeaning || '').trim();
    const meaning2 = String(question.meaning2 || question.definition2 || question.secondMeaning || '').trim();
    const hint = [
      meaning1 ? `뜻 1: ${meaning1}` : '',
      meaning2 ? `뜻 2: ${meaning2}` : ''
    ].filter(Boolean).join('\n') || String(question.hint || '').trim();
    const promptParts = [
      `${question.word || '낱말'}의 쓰임을 고르세요.`,
      question.sentence1,
      question.sentence2
    ].filter(Boolean);
    return {
      practiceQuestionId: String(question.questionId || '').trim(),
      question: promptParts.join('\n'),
      choices,
      answer: answerIndex >= 0 ? answerIndex : 0,
      hint
    };
  }

  function buildInputQuestion(question) {
    const answerText = String(question.answer || '').trim();
    const aliases = Array.isArray(question.aliases) ? question.aliases.map(alias => String(alias || '').trim()).filter(Boolean) : [];
    return {
      practiceQuestionId: String(question.questionId || '').trim(),
      type: 'textInput',
      question: String(question.prompt || question.question || '').trim(),
      answerText,
      aliases,
      hint: String(question.hint || question.explanation || '').trim()
    };
  }

  function buildChoiceQuestion(question) {
    const choices = Array.isArray(question.choices) ? question.choices.map(choice => String(choice || '').trim()).filter(Boolean) : [];
    const explicitAnswer = Number(question.answerIndex);
    const answerText = String(question.answer || '').trim();
    const answerIndex = Number.isInteger(explicitAnswer) && explicitAnswer >= 0 && explicitAnswer < choices.length
      ? explicitAnswer
      : choices.findIndex(choice => choice === answerText);
    return {
      practiceQuestionId: String(question.questionId || '').trim(),
      type: 'choice',
      question: String(question.prompt || question.question || '').trim(),
      choices,
      answer: answerIndex >= 0 ? answerIndex : 0,
      answerText,
      hint: String(question.hint || question.explanation || '').trim()
    };
  }

  function buildImageInputQuestion(question) {
    const answerText = String(question.answer || '').trim();
    const aliases = Array.isArray(question.aliases) ? question.aliases.map(alias => String(alias || '').trim()).filter(Boolean) : [];
    const pokemonNo = Number(question.pokemonNo || question.no || 0);
    const pokemonPracticeId = pokemonNo > 0 ? String(pokemonNo) : '';
    const questionId = String(question.questionId || '').trim();
    const legacyPracticeIds = Array.isArray(question.legacyPracticeIds)
      ? question.legacyPracticeIds.map(id => String(id || '').trim()).filter(Boolean)
      : [];
    return {
      practiceQuestionId: String(question.practiceQuestionId || pokemonPracticeId || questionId).trim(),
      legacyPracticeIds: Array.from(new Set([pokemonPracticeId, questionId, ...legacyPracticeIds].filter(Boolean))),
      questionId,
      pokemonNo: pokemonNo || undefined,
      type: 'imageInput',
      question: String(question.prompt || '이미지를 보고 정답을 입력하세요.').trim(),
      imageUrl: String(question.imageUrl || question.question || '').trim(),
      answerText,
      aliases,
      hint: String(question.hint || question.explanation || '').trim()
    };
  }

  function buildImageChoiceQuestion(question) {
    const choices = Array.isArray(question.choices)
      ? question.choices.map(choice => String(choice || '').trim()).filter(Boolean)
      : [];
    const explicitAnswer = Number(question.answerIndex);
    const answerIndex = Number.isInteger(explicitAnswer) && explicitAnswer >= 0 && explicitAnswer < choices.length
      ? explicitAnswer
      : choices.findIndex(choice => choice === String(question.answer || '').trim());
    return {
      type: 'imageChoice',
      questionId: String(question.questionId || '').trim(),
      practiceQuestionId: String(question.practiceQuestionId || question.questionId || '').trim(),
      question: String(Object.prototype.hasOwnProperty.call(question, 'prompt')
        ? question.prompt
        : (question.question || '이미지를 보고 알맞은 이름을 고르세요.')).trim(),
      imageUrl: String(question.imageUrl || '').trim(),
      imageSourceUrl: String(question.imageSourceUrl || '').trim(),
      imageProvider: String(question.imageProvider || '').trim(),
      imageLicense: String(question.imageLicense || '').trim(),
      imageCredit: String(question.imageCredit || '').trim(),
      imageAttributionText: String(question.imageAttributionText || '').trim(),
      choices,
      answer: answerIndex >= 0 ? answerIndex : 0,
      hint: String(question.hint || '').trim()
    };
  }

  function isImagePromptQuestion(question) {
    const category = String(question.category || '').trim();
    const prompt = String(question.prompt || question.question || '').trim();
    return category === '티니핑' || /^https?:\/\//i.test(prompt);
  }

  function buildFirestoreQuestion(question) {
    const questionType = String(question.questionType || '').trim();
    if(questionType === 'imageInput') return buildImageInputQuestion(question);
    if(questionType === 'imageChoice' || questionType === 'image-choice') return buildImageChoiceQuestion(question);
    if(isImagePromptQuestion(question) && question.answer) return buildImageInputQuestion(question);
    if(questionType === 'input' || questionType === 'textInput') return buildInputQuestion(question);
    if(questionType === 'readingMultipleChoice' || questionType === 'sheetMultipleChoice4') return buildChoiceQuestion(question);
    if(Array.isArray(question.choices) && question.choices.length) return buildChoiceQuestion(question);
    if(question.imageUrl) return buildImageInputQuestion(question);
    if(question.answer) return buildInputQuestion(question);
    return null;
  }

  function isPlayableQuestion(question) {
    if(!question) return false;
    if(question.type === 'imageInput') return !!question.imageUrl && !!question.answerText;
    if(question.type === 'imageChoice') return !!question.imageUrl && Array.isArray(question.choices) && question.choices.length >= 2 && Number.isInteger(question.answer);
    if(!question.question) return false;
    if(question.type === 'textInput') return !!question.answerText;
    return Array.isArray(question.choices) && question.choices.length >= 2 && Number.isInteger(question.answer);
  }

  function createQuizRepository(deps = {}) {
    const normalizeQuizId = getNormalizeQuizId(deps);
    return {
      getFirestoreDb() {
        return deps.getFirestoreDb?.() || null;
      },
      getFirestoreFieldValue() {
        return deps.getFirestoreFieldValue?.() || null;
      },
      getFirebaseFunctions() {
        return deps.getFirebaseFunctions?.() || null;
      },
      getFirebaseAuthUser() {
        return deps.getFirebaseAuthUser?.() || null;
      },
      getCurrentDataOwnerId() {
        return deps.getCurrentDataOwnerId?.() || '';
      },
      loadFeatureFlags() {
        return deps.loadFeatureFlags?.();
      },
      async loadFirebaseQuizMeta(quizId) {
        if(typeof deps.loadFirebaseQuizMeta === 'function') return deps.loadFirebaseQuizMeta(quizId);
        const db = deps.getFirestoreDb?.();
        const id = normalizeQuizId(quizId);
        if(!db || !id) return null;
        const snapshot = await db.collection('quizzes').doc(id).get();
        return snapshot.exists ? { quizId: id, ...snapshot.data() } : null;
      },
      async loadFirebaseQuizQuestions(quizId) {
        if(typeof deps.loadFirebaseQuizQuestions === 'function') return deps.loadFirebaseQuizQuestions(quizId);
        const db = deps.getFirestoreDb?.();
        const id = normalizeQuizId(quizId);
        if(!db || !id) return [];
        const snapshot = await db.collection('quizQuestions').doc(id).collection('questions').orderBy('order').get();
        return snapshot.docs.map(doc => ({ questionId: doc.id, ...doc.data() }));
      },
      async buildFirebaseQuizData(quizId) {
        const id = normalizeQuizId(quizId);
        const cache = deps.getFirebaseQuizDataCache?.() || {};
        if(cache[id]) return cache[id];

        const meta = await this.loadFirebaseQuizMeta(id);
        if(!meta) return null;

        let questions = [];
        if(id === 'random-basic' && meta.generatorType === 'math-muldiv') {
          questions = generateFirebaseRandomBasicQuestions(deps);
        } else {
          const rows = await this.loadFirebaseQuizQuestions(id);
          if(id === 'spelling') questions = rows.map(row => buildSpellingQuestion(row, deps));
          if(id === 'word-relation') questions = rows.map(buildWordRelationQuestion);
          if(!questions.length) questions = rows.map(buildFirestoreQuestion).filter(Boolean);
        }

        questions = questions.filter(isPlayableQuestion);
        if(!questions.length) return null;

        cache[id] = questions;
        return questions;
      },
      isFirestorePermissionDeniedError(error) {
        return deps.isFirestorePermissionDeniedError?.(error) || false;
      },
      resetUserEconomyCache() {
        return deps.resetUserEconomyCache?.();
      },
      resetTitleCatalogCache() {
        return deps.resetTitleCatalogCache?.();
      },
      async getPopularQuizUsageStatus(options = {}) {
        const functions = getRequiredFirebaseFunctions(deps);
        const callable = functions.httpsCallable('getPopularQuizUsageStatus');
        const response = await callable({
          memberUserId: options.memberUserId
        });
        const result = response?.data || {};
        if(!result.success) throw new Error('popular-usage-status-failed');
        return result.status || {};
      },
      async updatePopularQuizUsage(options = {}) {
        const functions = getRequiredFirebaseFunctions(deps);
        const funSeconds = Math.max(0, Math.round(Number(options.funSeconds) || 0));
        const eduCorrectCount = Math.max(0, Math.round(Number(options.eduCorrectCount) || 0));
        const callableName = eduCorrectCount > 0 ? 'recordEducationCorrectForPopularUnlock' : 'recordPopularQuizUsageSeconds';
        const callable = functions.httpsCallable(callableName);
        const response = await callable({
          memberUserId: options.memberUserId,
          seconds: funSeconds
        });
        const result = response?.data || {};
        if(!result.success) throw new Error('popular-usage-update-failed');
        return result.status || {};
      },
      async loadPracticeRecordCorrectIds(recordId) {
        const db = deps.getFirestoreDb?.();
        if(!db || !recordId) return new Set();
        const snapshot = await db.collection('practiceRecords').doc(recordId).get();
        if(!snapshot.exists) return new Set();
        const data = snapshot.data() || {};
        return new Set((Array.isArray(data.correctIds) ? data.correctIds : [])
          .map(value => String(value || '').trim())
          .filter(Boolean));
      },
      saveRankingRecordOnQuizComplete(nextDeps = {}) {
        return saveRankingRecordOnQuizCompleteForRepository({
          ...deps,
          ...nextDeps
        });
      },
      savePracticeProgressAfterCorrectAnswer(question, nextDeps = {}) {
        return savePracticeProgressAfterCorrectAnswerForRepository(question, {
          ...deps,
          ...nextDeps,
          grantPracticeCorrectReward: (memberUserId, rewardCoin, context) => this.grantPracticeCorrectReward(memberUserId, rewardCoin, context, nextDeps),
          syncMemberTitlesAfterPracticeCompletion: (memberUserId, context) => this.syncMemberTitlesAfterPracticeCompletion(memberUserId, context, nextDeps)
        });
      },
      grantPracticeCorrectReward(memberUserId, rewardCoin, context, nextDeps = {}) {
        return grantPracticeCorrectRewardForRepository(memberUserId, rewardCoin, context, {
          ...deps,
          ...nextDeps
        });
      },
      syncMemberTitlesAfterPracticeCompletion(memberUserId, context, nextDeps = {}) {
        return syncMemberTitlesAfterPracticeCompletionForRepository(memberUserId, context, {
          ...deps,
          ...nextDeps
        });
      }
    };
  }

  function getQuizPlayRepositoryDeps(repository) {
    return {
      getFirestoreDb: () => repository.getFirestoreDb(),
      getFirestoreFieldValue: () => repository.getFirestoreFieldValue(),
      getFirebaseFunctions: () => repository.getFirebaseFunctions(),
      getFirebaseAuthUser: () => repository.getFirebaseAuthUser(),
      getCurrentDataOwnerId: () => repository.getCurrentDataOwnerId(),
      loadFeatureFlags: () => repository.loadFeatureFlags(),
      loadFirebaseQuizMeta: quizId => repository.loadFirebaseQuizMeta(quizId),
      loadFirebaseQuizQuestions: quizId => repository.loadFirebaseQuizQuestions(quizId),
      buildFirebaseQuizData: quizId => repository.buildFirebaseQuizData(quizId),
      isFirestorePermissionDeniedError: error => repository.isFirestorePermissionDeniedError(error),
      resetUserEconomyCache: () => repository.resetUserEconomyCache(),
      resetTitleCatalogCache: () => repository.resetTitleCatalogCache(),
      getPopularQuizUsageStatus: options => repository.getPopularQuizUsageStatus(options),
      updatePopularQuizUsage: options => repository.updatePopularQuizUsage(options),
      loadPracticeRecordCorrectIds: recordId => repository.loadPracticeRecordCorrectIds(recordId),
      saveRankingRecordOnQuizComplete: deps => repository.saveRankingRecordOnQuizComplete(deps),
      savePracticeProgressAfterCorrectAnswer: (question, deps) => repository.savePracticeProgressAfterCorrectAnswer(question, deps),
      grantPracticeCorrectReward: (memberUserId, rewardCoin, context, deps) => repository.grantPracticeCorrectReward(memberUserId, rewardCoin, context, deps),
      syncMemberTitlesAfterPracticeCompletion: (memberUserId, context, deps) => repository.syncMemberTitlesAfterPracticeCompletion(memberUserId, context, deps)
    };
  }

  const api = {
    buildFirestoreQuestion,
    buildSpellingQuestion,
    buildWordRelationQuestion,
    createQuizRepository,
    generateFirebaseRandomBasicQuestions,
    getQuizPlayRepositoryDeps,
    grantPracticeCorrectRewardForRepository,
    savePracticeProgressAfterCorrectAnswerForRepository,
    saveRankingRecordOnQuizCompleteForRepository,
    syncMemberTitlesAfterPracticeCompletionForRepository
  };

  root.DJ48QuizRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
