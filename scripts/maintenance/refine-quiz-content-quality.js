const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PATCHES = [
  {
    quizId: 'ancient-history',
    questionId: 'ancient-history-6',
    data: {
      hint: '법 조항을 보면 그 사회가 지키려 한 가치를 알 수 있어요.',
      explanation: '고조선의 8조법을 통해 생명과 재산을 중요하게 여겼음을 알 수 있습니다.'
    }
  },
  {
    quizId: 'ancient-history',
    questionId: 'ancient-history-10',
    data: {
      hint: '철은 청동보다 단단해서 생활과 전쟁에 쓰는 물건을 튼튼하게 만들 수 있었어요.',
      explanation: '철기 문화가 퍼지면서 더 단단한 도구를 만들 수 있었습니다.'
    }
  },
  {
    quizId: 'ancient-history',
    questionId: 'ancient-history-11',
    data: {
      prompt: '우리 역사상 첫 나라 이후 만주와 한반도 주변에 등장한 초기 여러 나라에 해당하지 않는 것은 무엇인가요?',
      hint: '부여, 옥저, 동예, 삼한처럼 초기 여러 나라의 이름을 떠올려 보세요.',
      explanation: '부여, 옥저, 동예, 삼한은 고조선 이후 등장한 여러 나라이고, 조선은 이에 해당하지 않습니다.'
    }
  },
  {
    quizId: 'ancient-history',
    questionId: 'ancient-history-33',
    data: {
      prompt: '국내성은 어느 나라의 수도였나요?',
      hint: '주몽이 세운 북쪽의 큰 나라를 떠올려 보세요.',
      explanation: '국내성은 고구려의 수도였던 곳입니다.'
    }
  },
  {
    quizId: 'ancient-history',
    questionId: 'ancient-history-47',
    data: {
      prompt: '무령왕릉은 어느 나라의 무덤인가요?',
      hint: '한강 유역을 중심으로 성장했고 공주·부여에도 유적을 남긴 나라입니다.',
      explanation: '무령왕릉은 백제 무령왕과 왕비의 무덤입니다.'
    }
  },
  {
    quizId: 'ancient-history',
    questionId: 'ancient-history-63',
    data: {
      prompt: '황룡사는 어느 나라의 절이었나요?',
      hint: '경주를 수도로 삼았던 삼국 중 하나를 떠올려 보세요.',
      explanation: '황룡사는 신라의 큰 절이었습니다.'
    }
  },
  {
    quizId: 'ancient-history',
    questionId: 'ancient-history-68',
    data: {
      hint: '철을 필요한 곳에 팔거나 나누며 다른 나라와 오간 일을 떠올려 보세요.',
      explanation: '가야는 철을 바탕으로 주변 지역과 교역을 활발히 했습니다.'
    }
  },
  {
    quizId: 'ancient-history',
    questionId: 'ancient-history-70',
    data: {
      hint: '강 주변은 이동하기 쉽고 넓은 들을 이용하기에도 좋았어요.',
      explanation: '한강 유역은 교통과 농사에 유리했습니다.'
    }
  },
  {
    quizId: 'ancient-history',
    questionId: 'ancient-history-72',
    data: {
      hint: '왕권을 뒷받침하고 사회를 안정시키는 데 도움이 된 종교를 떠올려 보세요.',
      explanation: '삼국 시대 불교는 나라와 백성의 마음을 하나로 모으는 데 도움을 주었습니다.'
    }
  },
  {
    quizId: 'ancient-history',
    questionId: 'ancient-history-84',
    data: {
      hint: '문화재에는 그것을 만든 이들의 생활 모습과 가치관이 담겨 있어요.',
      explanation: '삼국 시대 문화재를 통해 당시 사람들의 기술과 생각을 알 수 있습니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-2',
    data: {
      prompt: '추운 겨울에 오리가 꽁꽁 얼어붙으면 무엇이 될까요?',
      answer: '언덕',
      hint: '오리를 뜻하는 덕에 얼었다는 느낌을 붙여 보세요.',
      explanation: '얼어붙은 덕, 즉 언 덕처럼 들려서 언덕입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-37',
    data: {
      prompt: '하늘의 해가 슬퍼서 소리를 내면 무엇이라고 할까요?',
      answer: '해울림',
      hint: '해가 우는 소리를 한 단어처럼 붙여 보세요.',
      explanation: '해가 울면 해울림처럼 들리는 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-41',
    data: {
      prompt: '신발을 넣어 두는 가구가 화가 나면 무엇이 될까요?',
      answer: '신발장',
      hint: '신발과 화가 난 상태를 떠올려 보세요.',
      explanation: '신발이 잔뜩 화난 장면을 신발장으로 연결한 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-62',
    data: {
      prompt: '전을 맡아 보관해 주는 가게를 웃기게 부르면?',
      answer: '전당포',
      hint: '전과 맡기는 가게 이름을 붙여 보세요.',
      explanation: '전을 맡기는 곳이라는 뜻으로 전당포를 떠올리는 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-67',
    data: {
      prompt: '연필 글씨를 지우는 도구가 데리고 다니는 동물은?',
      answer: '지우개',
      hint: '지우는 도구 이름 끝에 개가 숨어 있어요.',
      explanation: '지우는 도구 이름에 개가 들어 있어서 지우개입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-69',
    data: {
      prompt: '보고 듣는 교실에서 가장 또렷하게 느껴지는 감각은?',
      answer: '시청각',
      hint: '보는 것과 듣는 것을 합친 말을 떠올려 보세요.',
      explanation: '시각과 청각을 합친 말이 시청각입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-70',
    data: {
      prompt: '추운 지방에서 온 허스키의 밥그릇을 뭐라고 부를까요?',
      answer: '시베리아',
      hint: '허스키 하면 떠오르는 아주 추운 지역이에요.',
      explanation: '시베리안 허스키에서 시베리아를 떠올리는 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-71',
    data: {
      prompt: '여러 재료를 섞어 먹는 음식을 가장 좋아하는 사람은?',
      answer: '비빔밥',
      hint: '비벼 먹는 대표 음식 이름이에요.',
      explanation: '비비는 음식을 좋아하는 사람을 비빔밥으로 연결한 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-72',
    data: {
      prompt: '고기를 싸 먹는 음식을 제일 좋아하는 사람은?',
      answer: '보쌈',
      hint: '보자기처럼 싸 먹는 음식 이름이에요.',
      explanation: '싸 먹는 음식이라는 특징을 보쌈으로 연결했습니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-74',
    data: {
      prompt: '곱셈표를 자꾸 헷갈리는 사람을 뭐라고 할까요?',
      answer: '구구단',
      hint: '곱셈을 외울 때 부르는 이름이에요.',
      explanation: '곱셈표를 못 외우는 사람을 구구단으로 부르는 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-76',
    data: {
      prompt: '길가 불빛 아래에 있는 등은 무엇일까요?',
      answer: '가로등',
      hint: '길가를 밝히는 등을 떠올려 보세요.',
      explanation: '가로에 서 있는 등이라는 뜻으로 가로등입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-77',
    data: {
      prompt: '세로로 길게 서 있는 불빛을 장난스럽게 부르면?',
      answer: '세로등',
      hint: '가로의 반대말을 붙여 보세요.',
      explanation: '가로등을 세로로 바꿔 말한 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-78',
    data: {
      prompt: '한글 순서 앞부분 일곱 글자를 그대로 말하면?',
      answer: '가나다라마바사',
      hint: '가부터 사까지 이어서 읽어 보세요.',
      explanation: '가, 나, 다, 라, 마, 바, 사를 붙인 말입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-79',
    data: {
      prompt: '빨리 가는 길만 찾는 사람을 뭐라고 할까요?',
      answer: '지름길',
      hint: '돌아가지 않고 바로 가는 길이에요.',
      explanation: '빠른 길을 좋아하는 사람을 지름길로 표현한 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-80',
    data: {
      prompt: '빌린 돈을 갚으려고 애쓰는 사람을 뭐라고 할까요?',
      answer: '대출금',
      hint: '은행에서 빌린 돈을 떠올려 보세요.',
      explanation: '갚아야 할 돈인 대출금을 사람처럼 표현한 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-82',
    data: {
      prompt: '노란 알갱이 채소가 활짝 웃으면 무엇이 될까요?',
      answer: '옥수수',
      hint: '알이 줄지어 있는 여름 간식이에요.',
      explanation: '옥수수가 웃는 모습을 떠올리는 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-83',
    data: {
      prompt: '초록 줄무늬 과일이 크게 웃으면 무엇이 될까요?',
      answer: '수박',
      hint: '여름에 먹는 커다란 과일이에요.',
      explanation: '수박이 웃는 모습을 떠올리는 가벼운 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-86',
    data: {
      prompt: '매콤한 냉면을 더 비비면 뭐가 될까요?',
      answer: '비빔냉면',
      hint: '이미 비벼 먹는 냉면 이름이에요.',
      explanation: '비비는 냉면이라는 뜻을 그대로 살린 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-87',
    data: {
      prompt: '시원한 냉면에 물을 듬뿍 넣으면 뭐가 될까요?',
      answer: '물냉면',
      hint: '국물이 있는 냉면 이름이에요.',
      explanation: '물이 들어간 냉면이라서 물냉면입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-88',
    data: {
      prompt: '설거지할 때 쓰는 도구를 좋아하는 사람은?',
      answer: '수세미',
      hint: '그릇을 닦을 때 쓰는 물건이에요.',
      explanation: '설거지 도구 이름을 답으로 삼은 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-89',
    data: {
      prompt: '손으로 승부를 겨루는 놀이를 좋아하는 사람은?',
      answer: '가위바위보',
      hint: '손 모양 세 가지로 하는 놀이예요.',
      explanation: '가위, 바위, 보로 하는 놀이 이름입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-90',
    data: {
      prompt: '멀리 달아나는 개를 두 글자로 줄이면?',
      answer: '도망가',
      hint: '도망가는 행동을 그대로 읽어 보세요.',
      explanation: '도망가는 개를 도망가로 줄인 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-92',
    data: {
      prompt: '길가에 줄지어 선 나무가 좋아하는 친구는?',
      answer: '가로수',
      hint: '길가에 심은 나무를 부르는 말이에요.',
      explanation: '길가의 나무라는 뜻으로 가로수입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-93',
    data: {
      prompt: '세로로 줄지어 선 나무를 장난스럽게 부르면?',
      answer: '세로수',
      hint: '가로수의 가로를 반대로 바꿔 보세요.',
      explanation: '가로수를 세로수로 바꾼 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-94',
    data: {
      prompt: '한글 첫 세 글자를 제일 좋아하는 사람은?',
      answer: '가나다',
      hint: '한글을 처음 배울 때 읽는 순서예요.',
      explanation: '가, 나, 다를 붙인 말입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-95',
    data: {
      prompt: '달콤한 하얀 가루가 울면 어떤 소리가 날까요?',
      answer: '설탕',
      hint: '단맛을 내는 가루예요.',
      explanation: '설탕을 사람처럼 표현한 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-96',
    data: {
      prompt: '땅속에서 꿈틀거리는 친구가 울면 무엇이라고 할까요?',
      answer: '지렁이',
      hint: '비 오는 날 자주 보이는 길쭉한 생물이에요.',
      explanation: '지렁이를 의인화한 가벼운 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-97',
    data: {
      prompt: '동네의 작은 가게를 좋아하는 사람은?',
      answer: '구멍가게',
      hint: '예전에 동네에서 흔히 보던 작은 가게예요.',
      explanation: '작은 가게 이름을 답으로 삼은 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-98',
    data: {
      prompt: '도시 안을 달리는 버스를 좋아하는 사람은?',
      answer: '시내버스',
      hint: '도시 안에서 타는 대중교통이에요.',
      explanation: '시내를 달리는 버스라서 시내버스입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-99',
    data: {
      prompt: '비행기가 뜨고 내리는 곳이 좋아하는 장은?',
      answer: '비행장',
      hint: '비행기가 모이는 넓은 장소예요.',
      explanation: '비행기가 있는 장이라는 뜻으로 비행장입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-100',
    data: {
      prompt: '시원한 여름 과일 디저트를 좋아하는 사람은?',
      answer: '수박화채',
      hint: '수박을 넣어 시원하게 먹는 간식이에요.',
      explanation: '여름 디저트 이름을 답으로 삼은 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-103',
    data: {
      prompt: '세상에서 가장 멋진 사람을 자신 있게 말하면?',
      answer: '바로 나',
      hint: '퀴즈를 풀고 있는 바로 그 사람입니다.',
      explanation: '정답은 자신감을 담은 바로 나입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-124',
    data: {
      prompt: '교실 입구가 활짝 웃으면 어떤 소리가 날까요?',
      answer: '문하하',
      hint: '출입문과 웃음소리를 붙여 보세요.',
      explanation: '문과 하하를 붙여 문하하가 됩니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-131',
    data: {
      prompt: '치즈가 듬뿍 올라간 음식이 울면 무엇이 흐를까요?',
      answer: '치즈눈물',
      hint: '녹은 치즈가 눈물처럼 흘러요.',
      explanation: '피자의 치즈가 녹아 흐르는 모습을 눈물로 표현했습니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-142',
    data: {
      prompt: '과일 이름이면서 바다에 뜨는 탈것 이름을 함께 떠올리면?',
      answer: '두 가지 배',
      hint: '먹을 수도 있고 탈 수도 있는 말이에요.',
      explanation: '배는 과일 이름이면서 배를 타다의 배이기도 합니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-143',
    data: {
      prompt: '가을 과일이 깜짝 놀라면 무엇을 할까요?',
      answer: '감탄',
      hint: '과일 이름에 놀라는 표현을 붙여 보세요.',
      explanation: '감이 놀라 감탄한다는 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-148',
    data: {
      prompt: '긴 코를 가진 동물이 코를 잃어버리면 뭐가 남을까요?',
      answer: '끼리',
      hint: '동물 이름에서 앞의 한 글자를 빼 보세요.',
      explanation: '코끼리에서 코를 빼면 끼리가 남습니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-155',
    data: {
      prompt: '높은 산이 기분 좋게 웃으면 어떤 느낌일까요?',
      answer: '산뜻해',
      hint: '산과 상쾌한 느낌을 이어 보세요.',
      explanation: '산과 산뜻함을 연결한 말장난입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-166',
    data: {
      prompt: '장화가 가장 기다리는 날씨는 무엇일까요?',
      answer: '장화 출근날',
      hint: '장화를 신게 되는 날씨예요.',
      explanation: '비 오는 날에는 장화가 제일 바빠지니 장화 출근날입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-170',
    data: {
      prompt: '안경이 가장 친하게 지내는 글자는 무엇일까요?',
      answer: '눈친구',
      hint: '안경을 쓰는 곳을 떠올려 보세요.',
      explanation: '안경은 눈에 쓰는 물건이라서 눈친구입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-196',
    data: {
      prompt: '이어폰이 가장 가까이 지내는 친구는 누구일까요?',
      answer: '귀친구',
      hint: '이어폰을 꽂는 곳이에요.',
      explanation: '이어폰은 귀에 꽂기 때문에 귀친구입니다.'
    }
  },
  {
    quizId: 'dad-joke',
    questionId: 'dad-joke-201',
    data: {
      prompt: '도장을 찍을 때 가장 잘 어울리는 소리는?',
      answer: '꾹 소리',
      hint: '종이에 세게 누르는 소리를 떠올려 보세요.',
      explanation: '도장은 꾹 눌러 찍으므로 꾹 소리가 어울립니다.'
    }
  }
];

function parseArgs(argv) {
  const args = {
    commit: false,
    dryRun: true,
    sample: 10
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.commit = false;
      args.dryRun = true;
    } else if (arg === '--sample') {
      index += 1;
      args.sample = Number(argv[index] || 0);
    } else if (arg.startsWith('--sample=')) {
      args.sample = Number(arg.slice('--sample='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.sample) || args.sample < 0) {
    throw new Error('--sample must be a non-negative integer.');
  }
  return args;
}

function initializeAdminApp() {
  if (getApps().length) return;
  initializeApp({
    credential: applicationDefault()
  });
}

function questionRef(db, patch) {
  return db.collection('quizQuestions').doc(patch.quizId).collection('questions').doc(patch.questionId);
}

async function buildPreview(db) {
  const preview = [];
  for (const patch of PATCHES) {
    const ref = questionRef(db, patch);
    const snapshot = await ref.get();
    preview.push({
      quizId: patch.quizId,
      questionId: patch.questionId,
      exists: snapshot.exists,
      before: snapshot.exists ? snapshot.data() : null,
      after: patch.data
    });
  }
  return preview;
}

async function commitPatches(db) {
  const batch = db.batch();
  PATCHES.forEach(patch => {
    batch.set(questionRef(db, patch), patch.data, { merge: true });
  });
  await batch.commit();
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = getFirestore();
  const preview = await buildPreview(db);
  const missing = preview.filter(item => !item.exists);

  console.log(`Prepared quiz content patches: ${PATCHES.length}`);
  console.log(`Missing target documents: ${missing.length}`);
  preview.slice(0, args.sample).forEach(item => {
    console.log(JSON.stringify({
      path: `quizQuestions/${item.quizId}/questions/${item.questionId}`,
      exists: item.exists,
      before: item.before ? {
        prompt: item.before.prompt || item.before.question || '',
        answer: item.before.answer || '',
        hint: item.before.hint || '',
        explanation: item.before.explanation || ''
      } : null,
      after: item.after
    }, null, 2));
  });

  if (missing.length) {
    missing.forEach(item => console.log(`Missing: quizQuestions/${item.quizId}/questions/${item.questionId}`));
    throw new Error('Refusing to commit while target documents are missing.');
  }

  if (!args.commit) {
    console.log('Dry run only. Re-run with --commit to write these patches.');
    return;
  }

  await commitPatches(db);
  console.log(`Committed quiz content patches: ${PATCHES.length}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
