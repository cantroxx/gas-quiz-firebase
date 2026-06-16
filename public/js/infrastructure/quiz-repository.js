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

  function buildSpellingQuestion(question) {
    const prompt = String(question.prompt || '').trim();
    const answerText = String(question.answer || '').trim();
    const match = prompt.match(/\(([^()/]+)\/([^()/]+)\)/);
    const choices = match ? [match[1].trim(), match[2].trim()] : [answerText, ...(question.aliases || [])].filter(Boolean).slice(0, 2);
    const normalizedChoices = choices.length >= 2 ? choices : [answerText, '다시 보기'];
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

  function isImagePromptQuestion(question) {
    const category = String(question.category || '').trim();
    const prompt = String(question.prompt || question.question || '').trim();
    return category === '티니핑' || /^https?:\/\//i.test(prompt);
  }

  function buildFirestoreQuestion(question) {
    const questionType = String(question.questionType || '').trim();
    if(questionType === 'imageInput') return buildImageInputQuestion(question);
    if(isImagePromptQuestion(question) && question.answer) return buildImageInputQuestion(question);
    if(questionType === 'input' || questionType === 'textInput') return buildInputQuestion(question);
    if(questionType === 'readingMultipleChoice' || questionType === 'sheetMultipleChoice4') return buildChoiceQuestion(question);
    if(Array.isArray(question.choices) && question.choices.length) return buildChoiceQuestion(question);
    if(question.imageUrl) return buildImageInputQuestion(question);
    if(question.answer) return buildInputQuestion(question);
    return null;
  }

  function isPlayableQuestion(question) {
    if(!question || !question.question) return false;
    if(question.type === 'imageInput') return !!question.imageUrl && !!question.answerText;
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
          if(id === 'spelling') questions = rows.map(buildSpellingQuestion);
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
      loadPracticeRecordCorrectIds: recordId => repository.loadPracticeRecordCorrectIds(recordId)
    };
  }

  const api = {
    buildFirestoreQuestion,
    buildSpellingQuestion,
    buildWordRelationQuestion,
    createQuizRepository,
    generateFirebaseRandomBasicQuestions,
    getQuizPlayRepositoryDeps
  };

  root.DJ48QuizRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
