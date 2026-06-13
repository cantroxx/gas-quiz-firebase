(function () {
  const MODE_CATALOG = {
    practice: {
      icon: '📝',
      title: '연습전',
      desc: '정답마다 연습기록과 보상을 저장하는 모드입니다.',
      enabled: true
    },
    ranking: {
      icon: '🏅',
      title: '일반 랭킹전',
      desc: '하트가 다 닳을 때까지 점수와 시간을 기록하는 모드입니다.',
      enabled: true
    },
    oneChance: {
      icon: '🎯',
      title: '원코 모드',
      desc: '한 번 틀리면 종료되는 도전 모드입니다.',
      enabled: true
    },
    records: {
      icon: '📊',
      title: '개인 기록',
      desc: '개인 기록과 뱃지 현황은 내 집에서 확인합니다.',
      enabled: false
    }
  };

  const SUBJECT_CATALOG = {
    korean: {
      icon: '📚',
      title: '국어 퀴즈',
      hallTitle: '국어관',
      kicker: 'Korean Hall',
      desc: '맞춤법, 낱말, 독서 퀴즈를 과목관에서 선택합니다.',
      board: '낱말과 문장을 탐험해요',
      cardDesc: '맞춤법, 독서, 속담, 사자성어 문제를 고르는 화면입니다.',
      quizzes: ['spelling', 'word-relation', 'gmo', 'time_store', 'proverb', 'idiom'],
      enabled: true
    },
    social: {
      icon: '🏛️',
      title: '사회 퀴즈',
      hallTitle: '사회관',
      kicker: 'Social Studies Hall',
      desc: '역사와 사회 퀴즈를 골라 연습전과 랭킹전에 도전합니다.',
      board: '역사와 사회를 살펴봐요',
      cardDesc: '삼국시대, 역사 인물, 문화유산, 사회 개념 퀴즈를 고르는 화면입니다.',
      quizzes: ['samgukji', 'ancient-history', 'history-people', 'cultural_heritage', 'social_concepts'],
      enabled: true
    },
    popular: {
      icon: '⭐',
      title: '인기 퀴즈',
      hallTitle: '인기관',
      kicker: 'Popular Quiz Hall',
      desc: '이미지와 문장을 보고 정답을 맞히는 인기 퀴즈를 모았습니다.',
      board: '사진과 문장을 보고 정답을 맞혀요',
      cardDesc: '아이돌, 애니, 아재개그, 티니핑, 포켓몬 퀴즈를 고르는 화면입니다.',
      quizzes: ['idol', 'anime', 'dad-joke', 'tiniping', 'pokemon'],
      enabled: true
    },
    math: {
      icon: '➗',
      title: '수학 퀴즈',
      hallTitle: '수학관',
      kicker: 'Math Hall',
      desc: '곱셈과 나눗셈을 차근차근 풀며 계산 감각을 키웁니다.',
      board: '차근차근 계산해요',
      cardDesc: '곱셈과 나눗셈, 계산 연습 퀴즈를 고르는 화면입니다.',
      quizzes: ['random-basic', 'calculation_practice'],
      enabled: true
    }
  };

  const SCHOOL_QUIZ_CARDS = [
    { subjectId: 'korean' },
    { subjectId: 'social' },
    { subjectId: 'math' },
    { subjectId: 'popular' },
    {
      externalQuizHub: true,
      icon: '🔗',
      title: '외부 퀴즈',
      desc: '관리자가 연결한 외부 퀴즈 사이트로 새 탭에서 이동합니다.',
      enabled: true
    }
  ];

  const QUIZ_CATALOG = {
    spelling: {
      title: '맞춤법 퀴즈',
      kicker: 'Korean Hall',
      icon: '✏️',
      desc: '헷갈리는 맞춤법을 문제로 풀며 익힙니다.',
      summary: '연습전과 랭킹전에서 맞춤법 문제를 풉니다.',
      subjectId: 'korean',
      modes: ['practice', 'ranking', 'oneChance', 'records']
    },
    'word-relation': {
      title: '다의어·동형이의어 퀴즈',
      kicker: 'Korean Hall',
      icon: '🔤',
      desc: '한 낱말이 여러 뜻으로 쓰이는지, 소리는 같고 뜻이 다른지 확인합니다.',
      summary: '낱말의 뜻과 쓰임을 비교하며 다의어와 동형이의어를 구분합니다.',
      subjectId: 'korean',
      modes: ['practice', 'ranking', 'oneChance', 'records']
    },
    gmo: {
      title: '지엠오 아이 퀴즈',
      kicker: 'Korean Hall',
      icon: '📗',
      desc: '지엠오 아이 내용을 떠올리며 독서 문제를 풉니다.',
      summary: '작품 내용을 바탕으로 한 4지선다 문제에 도전합니다.',
      subjectId: 'korean',
      parentQuizId: 'reading',
      groupLabel: '독서 하위',
      modes: ['practice', 'ranking', 'oneChance', 'records']
    },
    reading: {
      title: '독서 퀴즈',
      kicker: 'Korean Hall',
      icon: '📖',
      desc: '작품의 내용과 인물을 떠올리는 독서 퀴즈입니다.',
      summary: '독서 하위 퀴즈와 같은 문제 풀이 엔진을 사용합니다.',
      subjectId: 'korean',
      modes: ['practice', 'ranking', 'oneChance', 'records']
    },
    time_store: {
      title: '시간가게 퀴즈',
      kicker: 'Korean Hall',
      icon: '⏰',
      desc: '시간가게 작품 내용을 바탕으로 한 독서 퀴즈입니다.',
      summary: '독서 하위의 작품별 퀴즈로 표시하되, 선택 화면과 문제 풀이 엔진은 그대로 재사용합니다.',
      subjectId: 'korean',
      parentQuizId: 'reading',
      groupLabel: '독서 하위',
      modes: ['practice', 'ranking', 'oneChance', 'records']
    },
    proverb: {
      title: '속담 퀴즈',
      kicker: 'Korean Hall',
      icon: '💬',
      desc: '속담의 뜻과 쓰임을 맞히는 퀴즈입니다.',
      summary: '문제를 준비하고 있습니다. 곧 도전할 수 있어요.',
      subjectId: 'korean',
      modes: ['records'],
      enabled: false
    },
    idiom: {
      title: '사자성어 퀴즈',
      kicker: 'Korean Hall',
      icon: '🐉',
      desc: '사자성어의 뜻과 쓰임을 확인하는 퀴즈입니다.',
      summary: '문제를 준비하고 있습니다. 곧 도전할 수 있어요.',
      subjectId: 'korean',
      modes: ['records'],
      enabled: false
    },
    samgukji: {
      title: '삼국지 퀴즈',
      kicker: 'Social Studies Hall',
      icon: '🏯',
      desc: '삼국지 이야기를 바탕으로 4지선다 문제를 풉니다.',
      summary: '인물과 사건을 떠올리며 삼국지 문제에 도전합니다.',
      subjectId: 'social',
      modes: ['practice', 'ranking', 'oneChance']
    },
    'ancient-history': {
      title: '고대사 퀴즈',
      kicker: 'Social Studies Hall',
      icon: '🏺',
      desc: '고대사와 삼국시대 내용을 4지선다로 확인합니다.',
      summary: '역사의 흐름과 주요 사건을 문제로 복습합니다.',
      subjectId: 'social',
      modes: ['practice', 'ranking', 'oneChance']
    },
    'history-people': {
      title: '역사 인물 퀴즈',
      kicker: 'Social Studies Hall',
      icon: '🧭',
      desc: '역사 인물 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 역사 인물의 이름을 입력합니다.',
      subjectId: 'social',
      modes: ['practice', 'ranking', 'oneChance']
    },
    idol: {
      title: '아이돌 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🎤',
      desc: '아이돌 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 아이돌 이름을 입력합니다.',
      subjectId: 'popular',
      modes: ['practice', 'ranking', 'oneChance']
    },
    anime: {
      title: '애니 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🎬',
      desc: '애니 캐릭터 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 애니 캐릭터 이름을 입력합니다.',
      subjectId: 'popular',
      modes: ['practice', 'ranking', 'oneChance']
    },
    'dad-joke': {
      title: '아재개그 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '😄',
      desc: '아재개그 문제를 보고 정답을 맞히는 퀴즈입니다.',
      summary: '문장을 보고 웃긴 정답을 떠올려 입력합니다.',
      subjectId: 'popular',
      modes: ['practice', 'ranking', 'oneChance']
    },
    tiniping: {
      title: '티니핑 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌸',
      desc: '티니핑 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 티니핑 이름을 입력합니다.',
      subjectId: 'popular',
      modes: ['practice', 'ranking', 'oneChance']
    },
    pokemon: {
      title: '포켓몬 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '세대별 연습전과 난이도별 랭킹전을 고르는 포켓몬 탭입니다.',
      summary: '연습전은 세대별 도감을 채우고, 랭킹전은 쉬움/보통/헬 난이도와 모드를 골라 도전합니다.',
      subjectId: 'popular',
      groupLabel: '포켓몬',
      modes: ['pokemonHub']
    },
    'pokemon-gen1': {
      title: '포켓몬 1세대 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '포켓몬 1세대 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 포켓몬 이름을 입력합니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['practice', 'records']
    },
    'pokemon-gen2': {
      title: '포켓몬 2세대 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '포켓몬 2세대 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 포켓몬 이름을 입력합니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['practice', 'records']
    },
    'pokemon-gen3': {
      title: '포켓몬 3세대 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '포켓몬 3세대 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 포켓몬 이름을 입력합니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['practice', 'records']
    },
    'pokemon-gen4': {
      title: '포켓몬 4세대 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '포켓몬 4세대 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 포켓몬 이름을 입력합니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['practice', 'records']
    },
    'pokemon-gen5': {
      title: '포켓몬 5세대 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '포켓몬 5세대 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 포켓몬 이름을 입력합니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['practice', 'records']
    },
    'pokemon-gen6': {
      title: '포켓몬 6세대 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '포켓몬 6세대 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 포켓몬 이름을 입력합니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['practice', 'records']
    },
    'pokemon-gen7': {
      title: '포켓몬 7세대 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '포켓몬 7세대 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 포켓몬 이름을 입력합니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['practice', 'records']
    },
    'pokemon-gen8': {
      title: '포켓몬 8세대 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '포켓몬 8세대 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 포켓몬 이름을 입력합니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['practice', 'records']
    },
    'pokemon-gen9': {
      title: '포켓몬 9세대 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '포켓몬 9세대 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '이미지를 보고 포켓몬 이름을 입력합니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['practice', 'records']
    },
    'pokemon-easy': {
      title: '포켓몬 쉬움 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '1세대 범위의 포켓몬 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '기존 포켓몬 쉬움 모드입니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['ranking']
    },
    'pokemon-normal': {
      title: '포켓몬 보통 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '2세대까지의 포켓몬 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '기존 포켓몬 보통 모드입니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['ranking']
    },
    'pokemon-hard': {
      title: '포켓몬 어려움 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '3세대까지의 포켓몬 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '기존 포켓몬 어려움 모드입니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['ranking']
    },
    'pokemon-very-hard': {
      title: '포켓몬 헬 퀴즈',
      kicker: 'Popular Quiz Hall',
      icon: '🌲',
      desc: '전체 포켓몬 이미지를 보고 이름을 맞히는 퀴즈입니다.',
      summary: '기존 포켓몬 헬 모드입니다.',
      subjectId: 'popular',
      parentQuizId: 'pokemon',
      groupLabel: '포켓몬',
      modes: ['ranking']
    },
    cultural_heritage: {
      title: '문화유산 퀴즈',
      kicker: 'Social Studies Hall',
      icon: '🏺',
      desc: '우리 문화유산의 이름과 특징을 확인하는 사회 퀴즈입니다.',
      summary: '문제를 준비하고 있습니다. 곧 도전할 수 있어요.',
      subjectId: 'social',
      modes: ['records'],
      enabled: false
    },
    social_concepts: {
      title: '사회 개념 퀴즈',
      kicker: 'Social Studies Hall',
      icon: '🗺️',
      desc: '지도, 지역, 공동체 같은 기본 사회 개념을 확인합니다.',
      summary: '문제를 준비하고 있습니다. 곧 도전할 수 있어요.',
      subjectId: 'social',
      modes: ['records'],
      enabled: false
    },
    multiplication_division: {
      title: '곱셈과 나눗셈 퀴즈',
      kicker: 'Math Hall',
      icon: '✖️',
      desc: '곱셈과 나눗셈의 기본 관계를 확인하는 수학 퀴즈입니다.',
      summary: '수학관 문제도 별도 엔진 없이 같은 연습전 화면을 사용합니다.',
      subjectId: 'math',
      modes: ['practice', 'ranking', 'oneChance']
    },
    'random-basic': {
      title: '곱셈과 나눗셈 퀴즈',
      kicker: 'Math Hall',
      icon: '✖️',
      desc: '곱셈과 나눗셈 문제를 무작위로 풀며 계산력을 기릅니다.',
      summary: '100문항 단위로 연습하고, 랭킹전에서는 하트를 지키며 도전합니다.',
      subjectId: 'math',
      modes: ['practice', 'ranking', 'oneChance']
    },
    calculation_practice: {
      title: '계산 연습 퀴즈',
      kicker: 'Math Hall',
      icon: '🧮',
      desc: '간단한 사칙 계산을 빠르게 확인하는 수학 퀴즈입니다.',
      summary: '문제를 준비하고 있습니다. 곧 도전할 수 있어요.',
      subjectId: 'math',
      modes: ['records'],
      enabled: false
    }
  };

  window.DJ48QuizCatalog = {
    MODE_CATALOG,
    SUBJECT_CATALOG,
    SCHOOL_QUIZ_CARDS,
    QUIZ_CATALOG
  };
})();
