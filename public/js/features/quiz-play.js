(function () {
  function getKoreanInitials(value) {
    const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    return String(value || '').split('').map(char => {
      const code = char.charCodeAt(0);
      if(code >= 0xac00 && code <= 0xd7a3) return initials[Math.floor((code - 0xac00) / 588)] || char;
      return /\s/.test(char) ? ' ' : char;
    }).join('');
  }

  function getCurrentQuestionAnswerText(question) {
    if(!question) return '';
    if(question.answerText) return String(question.answerText).trim();
    if(Array.isArray(question.choices) && Number.isInteger(question.answer)) {
      return String(question.choices[question.answer] || '').trim();
    }
    return '';
  }

  function getQuestionHintText(question, deps = {}) {
    const normalizeQuizId = deps.normalizeFirebaseQuizId || (value => String(value || '').trim());
    const quizId = normalizeQuizId(deps.currentQuizId);
    const answerText = getCurrentQuestionAnswerText(question);
    if(quizId === 'gmo' || quizId === 'time_store' || quizId === 'reading') return '';
    if(quizId === 'tiniping' && answerText) {
      return `초성 힌트: ${getKoreanInitials(answerText)}`;
    }
    return String(question?.hint || '').trim();
  }

  function getWrongAnswerFeedbackText(question, rankingEndedByWrongAnswer, overrideMessage) {
    const answerText = getCurrentQuestionAnswerText(question);
    const parts = [];
    if(overrideMessage) parts.push(overrideMessage);
    if(answerText) parts.push(`정답은 '${answerText}'입니다.`);
    if(rankingEndedByWrongAnswer) parts.push('생명력이 모두 소진되어 랭킹전이 종료됩니다.');
    if(parts.length) return parts.join(' ');
    return '괜찮아요. 다음 문제에서 다시 확인해 봅니다.';
  }

  function isTypingTarget(target) {
    const tagName = String(target?.tagName || '').toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || target?.isContentEditable === true;
  }

  function getNumericChoiceKey(event) {
    const key = String(event?.key || '');
    if(['1', '2', '3', '4'].includes(key)) return Number(key);
    const code = String(event?.code || '');
    const digitMatch = code.match(/^(Digit|Numpad)([1-4])$/);
    return digitMatch ? Number(digitMatch[2]) : 0;
  }

  function createQuizAnswerInput(onInput) {
    const input = document.createElement('input');
    input.className = 'quiz-answer-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = '정답 입력';
    input.setAttribute('aria-label', '정답 입력');
    if(typeof onInput === 'function') input.addEventListener('input', onInput);
    return input;
  }

  function createQuizImageAnswerField(question, onInput) {
    const imageWrap = document.createElement('div');
    const image = document.createElement('img');
    const input = createQuizAnswerInput(onInput);
    imageWrap.className = 'quiz-image-question';
    image.src = question?.imageUrl || '';
    image.alt = '퀴즈 이미지';
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      imageWrap.classList.add('is-image-error');
    });
    imageWrap.appendChild(image);
    return { imageWrap, input };
  }

  function createQuizChoiceButton(choice, index) {
    const button = document.createElement('button');
    const choiceMarks = ['①', '②', '③', '④'];
    button.className = 'quiz-choice';
    button.type = 'button';
    button.dataset.choiceIndex = String(index);
    button.textContent = `${choiceMarks[index] || `${index + 1}.`} ${choice}`;
    return button;
  }

  function createQuizHintToggle(hintText) {
    const hintButton = document.createElement('button');
    const hintDisplay = document.createElement('p');
    hintButton.className = 'quiz-hint-button';
    hintButton.type = 'button';
    hintButton.textContent = '힌트';
    hintDisplay.className = 'quiz-hint-text';
    hintDisplay.textContent = hintText;
    hintDisplay.hidden = true;
    hintButton.addEventListener('click', () => {
      const nextHidden = !hintDisplay.hidden;
      hintDisplay.hidden = nextHidden;
      hintButton.textContent = nextHidden ? '힌트' : '닫기';
    });
    return { hintButton, hintDisplay };
  }

  window.DJ48QuizPlay = {
    getKoreanInitials,
    getCurrentQuestionAnswerText,
    getQuestionHintText,
    getWrongAnswerFeedbackText,
    isTypingTarget,
    getNumericChoiceKey,
    createQuizAnswerInput,
    createQuizImageAnswerField,
    createQuizChoiceButton,
    createQuizHintToggle
  };
})();
