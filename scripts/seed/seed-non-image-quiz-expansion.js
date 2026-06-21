#!/usr/bin/env node

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const QUIZZES_COLLECTION = 'quizzes';
const QUIZ_QUESTIONS_ROOT = 'quizQuestions';
const TITLE_CATALOG_COLLECTION = 'titleCatalog';
const DEFAULT_QUESTIONS_PER_QUIZ = 200;
const SEED_SOURCE = 'seed-non-image-quiz-expansion';
const REMOVED_TITLE_IDS = ['science_grade4_1', 'science_grade4_3', 'science_grade4_5'];
const QUIZ_TITLE_PREFIXES = {
  proverb: ['korean_proverb_'],
  spacing: ['korean_spacing_'],
  idiom: ['korean_idiom_'],
  'fraction-basic': ['math_fraction_basic_'],
  'unified-silla-balhae': ['social_unified_silla_balhae_'],
  cultural_heritage: ['social_cultural_heritage_'],
  'flag-country': ['popular_flag_country_'],
  'snack-food': ['popular_snack_food_'],
  'science-general': ['science_general_'],
  'emoji-kpop': ['popular_emoji_kpop_', 'popular_emoji_kpop_total_'],
  'emoji-anime': ['popular_emoji_anime_', 'popular_emoji_anime_total_'],
  'emoji-tiniping': ['popular_emoji_tiniping_', 'popular_emoji_tiniping_total_']
};

function parseArgs(argv) {
  const args = {
    commit: false,
    dryRun: true,
    sample: 2,
    quizIds: []
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
    } else if (arg === '--quiz') {
      index += 1;
      args.quizIds = String(argv[index] || '').split(',').map(value => value.trim()).filter(Boolean);
    } else if (arg.startsWith('--quiz=')) {
      args.quizIds = arg.slice('--quiz='.length).split(',').map(value => value.trim()).filter(Boolean);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function initializeAdmin() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }
  return getFirestore();
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^0-9a-z가-힣:_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function rotateChoices(correct, pool, seed) {
  const source = Array.from(new Set(pool.filter(Boolean).filter(value => value !== correct)));
  if (source.length < 3) {
    throw new Error(`Not enough unique distractors for ${correct}`);
  }
  const choices = [correct];
  let cursor = seed % Math.max(1, source.length);
  while (choices.length < 4) {
    const next = source[cursor % source.length];
    if (!choices.includes(next)) choices.push(next);
    cursor += 1;
  }
  if (choices.length < 4) throw new Error(`Not enough choices for ${correct}`);
  const offset = seed % choices.length;
  return choices.slice(offset).concat(choices.slice(0, offset));
}

function makeChoiceQuestion(quizId, order, prompt, correct, pool, hint, explanation) {
  const choices = rotateChoices(correct, pool, order);
  return {
    quizId,
    questionId: `${quizId}-${String(order).padStart(3, '0')}`,
    order,
    questionType: 'sheetMultipleChoice4',
    prompt,
    choices,
    answer: correct,
    answerIndex: choices.indexOf(correct),
    hint,
    explanation,
    sourceSheet: SEED_SOURCE,
    sourceRowNumber: order,
    migrationSource: SEED_SOURCE
  };
}

function makeImageChoiceQuestion(quizId, order, prompt, correct, pool, imageMeta = {}, hint = '', explanation = '') {
  const choices = rotateChoices(correct, pool, order);
  const imageUrl = String(imageMeta.imageUrl || '').trim();
  const imageSourceUrl = String(imageMeta.imageSourceUrl || '').trim();
  const imageProvider = String(imageMeta.imageProvider || '').trim();
  const imageLicense = String(imageMeta.imageLicense || '').trim();
  const imageCredit = String(imageMeta.imageCredit || '').trim();
  const imageMaskAreas = Array.isArray(imageMeta.imageMaskAreas)
    ? imageMeta.imageMaskAreas.map(area => ({
      x: Number(area.x) || 0,
      y: Number(area.y) || 0,
      width: Number(area.width) || 0,
      height: Number(area.height) || 0
    })).filter(area => area.width > 0 && area.height > 0)
    : [];
  return {
    quizId,
    questionId: `${quizId}-${String(order).padStart(3, '0')}`,
    order,
    questionType: 'imageChoice',
    prompt,
    imageUrl,
    imageSourceUrl,
    imageProvider,
    imageLicense,
    imageCredit,
    imageAttributionText: buildImageAttributionText({ imageProvider, imageLicense, imageCredit, imageSourceUrl }),
    imageMaskAreas,
    choices,
    answer: correct,
    answerIndex: choices.indexOf(correct),
    hint,
    explanation: explanation || `${correct}의 이미지를 보고 이름을 고르는 이미지형 문제입니다.`,
    sourceSheet: SEED_SOURCE,
    sourceRowNumber: order,
    migrationSource: SEED_SOURCE
  };
}

function buildImageAttributionText(meta = {}) {
  const provider = String(meta.imageProvider || '').trim();
  const license = String(meta.imageLicense || '').trim();
  const credit = String(meta.imageCredit || '').trim();
  if(!provider && !license && !credit) return '';
  return [provider, license, credit].filter(Boolean).join(' · ');
}

function makeInputQuestion(quizId, order, prompt, correct, aliases = [], hint = '', explanation = '') {
  return {
    quizId,
    questionId: `${quizId}-${String(order).padStart(3, '0')}`,
    order,
    questionType: 'textInput',
    prompt,
    answer: correct,
    aliases,
    hint,
    explanation,
    sourceSheet: SEED_SOURCE,
    sourceRowNumber: order,
    migrationSource: SEED_SOURCE
  };
}

const PROVERBS = [
  ['가는 말이 고와야 오는 말이 곱다', '남에게 좋게 말해야 좋은 대답을 들을 수 있다'],
  ['고래 싸움에 새우 등 터진다', '강한 사람들의 다툼에 약한 사람이 피해를 본다'],
  ['낮말은 새가 듣고 밤말은 쥐가 듣는다', '말은 언제 어디서나 조심해야 한다'],
  ['돌다리도 두들겨 보고 건너라', '잘 아는 일도 조심해서 확인해야 한다'],
  ['티끌 모아 태산', '작은 것도 모이면 큰 것이 된다'],
  ['원숭이도 나무에서 떨어진다', '아무리 잘하는 사람도 실수할 수 있다'],
  ['백지장도 맞들면 낫다', '쉬운 일도 함께하면 더 쉽다'],
  ['소 잃고 외양간 고친다', '일이 벌어진 뒤에야 뒤늦게 대비한다'],
  ['우물 안 개구리', '넓은 세상을 모르는 사람을 이르는 말'],
  ['하늘의 별 따기', '이루기가 매우 어려운 일'],
  ['가는 날이 장날', '일을 하려는 때 뜻밖의 일이 생긴다'],
  ['개구리 올챙이 적 생각 못 한다', '어려웠던 과거를 잊고 잘난 체한다'],
  ['금강산도 식후경', '아무리 좋은 일도 먹은 뒤에야 즐길 수 있다'],
  ['누워서 떡 먹기', '하기가 아주 쉬운 일'],
  ['말 한마디에 천 냥 빚도 갚는다', '말을 잘하면 어려운 일도 해결할 수 있다'],
  ['바늘 도둑이 소 도둑 된다', '작은 잘못을 고치지 않으면 큰 잘못이 된다'],
  ['발 없는 말이 천 리 간다', '소문은 빠르게 퍼진다'],
  ['서당 개 삼 년이면 풍월을 읊는다', '오래 보고 들으면 자연히 알게 된다'],
  ['시작이 반이다', '일을 시작하면 이미 반은 이룬 셈이다'],
  ['호랑이도 제 말 하면 온다', '이야기하던 사람이 마침 나타난다']
];

const IDIOMS = [
  ['각골난망', '은혜를 마음 깊이 새겨 잊지 않음'],
  ['감언이설', '남의 마음을 사려고 달콤하게 꾸며 하는 말'],
  ['고진감래', '고생 끝에 즐거움이 옴'],
  ['과유불급', '지나친 것은 미치지 못한 것과 같음'],
  ['금상첨화', '좋은 일에 또 좋은 일이 더해짐'],
  ['다다익선', '많으면 많을수록 좋음'],
  ['동문서답', '묻는 말과 전혀 상관없는 대답'],
  ['마이동풍', '남의 말을 귀담아듣지 않음'],
  ['박장대소', '손뼉을 치며 크게 웃음'],
  ['사면초가', '도와줄 곳 없이 외로운 처지'],
  ['설상가상', '나쁜 일에 또 나쁜 일이 겹침'],
  ['속수무책', '어찌할 방법이 없음'],
  ['십시일반', '여러 사람이 힘을 조금씩 보태 도움'],
  ['오리무중', '일의 방향이나 내용을 알 수 없음'],
  ['용두사미', '시작은 좋으나 끝이 좋지 않음'],
  ['우공이산', '꾸준히 노력하면 큰일도 이룰 수 있음'],
  ['이심전심', '말하지 않아도 마음이 서로 통함'],
  ['일석이조', '한 가지 일로 두 가지 이익을 얻음'],
  ['전화위복', '나쁜 일이 도리어 좋은 일이 됨'],
  ['청출어람', '제자가 스승보다 나아짐']
];

const IDIOM_HINTS = {
  각골난망: '刻(새길 각), 骨(뼈 골), 難(어려울 난), 忘(잊을 망)',
  감언이설: '甘(달 감), 言(말씀 언), 利(이로울 이), 說(말씀 설)',
  고진감래: '苦(쓸 고), 盡(다할 진), 甘(달 감), 來(올 래)',
  과유불급: '過(지날 과), 猶(오히려 유), 不(아닐 불), 及(미칠 급)',
  금상첨화: '錦(비단 금), 上(위 상), 添(더할 첨), 花(꽃 화)',
  다다익선: '多(많을 다), 多(많을 다), 益(더할 익), 善(좋을 선)',
  동문서답: '東(동녘 동), 問(물을 문), 西(서녘 서), 答(대답 답)',
  마이동풍: '馬(말 마), 耳(귀 이), 東(동녘 동), 風(바람 풍)',
  박장대소: '拍(칠 박), 掌(손바닥 장), 大(큰 대), 笑(웃을 소)',
  사면초가: '四(넉 사), 面(낯 면), 楚(초나라 초), 歌(노래 가)',
  설상가상: '雪(눈 설), 上(위 상), 加(더할 가), 霜(서리 상)',
  속수무책: '束(묶을 속), 手(손 수), 無(없을 무), 策(꾀 책)',
  십시일반: '十(열 십), 匙(숟가락 시), 一(한 일), 飯(밥 반)',
  오리무중: '五(다섯 오), 里(마을 리), 霧(안개 무), 中(가운데 중)',
  용두사미: '龍(용 용), 頭(머리 두), 蛇(뱀 사), 尾(꼬리 미)',
  우공이산: '愚(어리석을 우), 公(공평할 공), 移(옮길 이), 山(산 산)',
  이심전심: '以(써 이), 心(마음 심), 傳(전할 전), 心(마음 심)',
  일석이조: '一(한 일), 石(돌 석), 二(두 이), 鳥(새 조)',
  전화위복: '轉(구를 전), 禍(재앙 화), 爲(될 위), 福(복 복)',
  청출어람: '靑(푸를 청), 出(날 출), 於(어조사 어), 藍(쪽 람)'
};

const SPACING = [
  ['할 수 있다', '할수 있다'], ['갈 수 없다', '갈수 없다'], ['먹어 보다', '먹어보다'],
  ['읽어 보았다', '읽어보았다'], ['그럴 만하다', '그럴만하다'], ['아는 척하다', '아는척하다'],
  ['모르는 척했다', '모르는척했다'], ['잘하는 편이다', '잘하는편이다'], ['한 번 더', '한번 더'],
  ['두 번 말했다', '두번 말했다'], ['며칠 동안', '며칠동안'], ['오랜만에 만났다', '오랜 만에 만났다'],
  ['집에 가다', '집에가다'], ['학교에 간다', '학교에간다'], ['책을 읽다', '책을읽다'],
  ['친구와 놀다', '친구와놀다'], ['바로 앞', '바로앞'], ['이와 같이', '이와같이'],
  ['그 밖의 일', '그밖의 일'], ['알 수 없는 일', '알수 없는 일']
];

const UNIFIED_SILLA_BALHAE = [
  { answer: '문무왕', type: 'person', clue: '삼국 통일을 완성한 신라 왕', hint: '신라가 백제와 고구려를 차례로 통합하던 시기의 왕입니다.' },
  { answer: '신문왕', type: 'person', clue: '통일신라의 왕권을 강화하고 관료 제도를 정비한 왕', hint: '통일 뒤 나라의 제도와 지방 통치를 정비한 왕입니다.' },
  { answer: '9주 5소경', type: 'system', clue: '통일신라가 전국을 다스리기 위해 마련한 지방 제도', hint: '전국을 9개의 큰 행정 구역과 5개의 작은 수도로 나눈 제도입니다.' },
  { answer: '국학', type: 'place', clue: '통일신라가 유학 교육을 위해 세운 교육 기관', hint: '관리 양성과 유학 교육을 담당했습니다.' },
  { answer: '불국사', type: 'heritage', clue: '통일신라의 불교 문화와 건축 기술을 보여 주는 절', hint: '석가탑과 다보탑이 있는 경주의 대표 문화유산입니다.' },
  { answer: '석굴암', type: 'heritage', clue: '통일신라의 불교 조각과 건축 기술이 담긴 문화유산', hint: '본존불을 중심으로 한 석굴 사원입니다.' },
  { answer: '장보고', type: 'person', clue: '청해진을 설치하고 해상 무역을 이끈 인물', hint: '완도에 해상 활동의 거점을 마련했습니다.' },
  { answer: '청해진', type: 'place', clue: '장보고가 해상 무역과 해적 방어를 위해 설치한 군사·무역 거점', hint: '완도에 설치된 바닷길의 중심지입니다.' },
  { answer: '원효', type: 'person', clue: '불교를 백성에게 쉽게 전하려 한 통일신라 승려', hint: '불교의 가르침을 널리 알리고 대중화하려 했습니다.' },
  { answer: '혜초', type: 'person', clue: '인도와 중앙아시아를 여행하고 왕오천축국전을 남긴 승려', hint: '먼 나라를 여행하고 그 기록을 남긴 통일신라 승려입니다.' },
  { answer: '대조영', type: 'person', clue: '고구려 유민과 말갈인을 이끌고 발해를 세운 인물', hint: '발해 건국과 관련된 대표 인물입니다.' },
  { answer: '발해', type: 'country', clue: '고구려를 계승한 나라로 만주와 한반도 북부에서 발전한 나라', hint: '통일신라와 함께 남북국 시대를 이루었습니다.' },
  { answer: '무왕', type: 'person', clue: '발해의 영토를 넓히고 당과 맞선 왕', hint: '발해의 대외 활동을 활발히 펼친 왕입니다.' },
  { answer: '문왕', type: 'person', clue: '발해의 제도를 정비하고 문화를 발전시킨 왕', hint: '발해의 수도와 제도 정비와 관련이 깊습니다.' },
  { answer: '해동성국', type: 'name', clue: '발해가 매우 번성했을 때 당에서 부른 이름', hint: '바다 동쪽의 융성한 나라라는 뜻으로 불렸습니다.' },
  { answer: '상경 용천부', type: 'place', clue: '발해의 수도로 알려진 곳', hint: '발해의 계획도시 모습을 보여 주는 수도입니다.' },
  { answer: '정혜공주 묘', type: 'heritage', clue: '발해 고분 문화와 고구려 계승성을 보여 주는 유적', hint: '발해 왕실 무덤 중 하나입니다.' },
  { answer: '이불병좌상', type: 'heritage', clue: '발해 불교 문화를 보여 주는 두 부처가 나란히 앉은 불상', hint: '두 부처가 나란히 앉아 있는 모습이 특징입니다.' },
  { answer: '남북국 시대', type: 'era', clue: '통일신라와 발해가 함께 존재하던 시대를 이르는 말', hint: '한반도 남쪽의 통일신라와 북쪽의 발해를 함께 보는 시대 이름입니다.' },
  { answer: '고구려 계승 의식', type: 'concept', clue: '발해가 고구려의 역사와 문화를 이어받았다는 생각', hint: '발해의 건국 세력과 문화에서 확인할 수 있는 역사 인식입니다.' }
];

const SCIENCE_GENERAL = [
  ['얼음이 물로 변하는 현상은 무엇인가요?', '융해', ['융해', '응고', '증발', '응결'], '고체가 액체로 변하는 현상입니다.'],
  ['물이 수증기로 변하는 현상은 무엇인가요?', '증발', ['증발', '응결', '응고', '침식'], '액체가 기체로 변하는 현상입니다.'],
  ['수증기가 물방울로 변하는 현상은 무엇인가요?', '응결', ['응결', '증발', '퇴적', '자화'], '기체가 액체로 변하는 현상입니다.'],
  ['물이 얼음으로 변하는 현상은 무엇인가요?', '응고', ['응고', '융해', '증발', '용해'], '액체가 고체로 변하는 현상입니다.'],
  ['강물이 땅이나 바위를 깎는 작용은 무엇인가요?', '침식', ['침식', '퇴적', '응결', '반사'], '흐르는 물이 지표를 깎는 작용입니다.'],
  ['흙이나 모래가 쌓이는 작용은 무엇인가요?', '퇴적', ['퇴적', '침식', '증발', '마찰'], '운반된 물질이 쌓이는 작용입니다.'],
  ['자석에 잘 붙는 물질은 무엇인가요?', '철', ['철', '나무', '고무', '유리'], '철로 된 물체는 자석에 잘 붙습니다.'],
  ['자석의 같은 극끼리는 어떻게 되나요?', '서로 밀어냅니다', ['서로 밀어냅니다', '반드시 붙습니다', '녹습니다', '빛을 냅니다'], '같은 극끼리는 밀어내고 다른 극끼리는 끌어당깁니다.'],
  ['빛이 거울에 부딪혀 되돌아가는 현상은 무엇인가요?', '반사', ['반사', '증발', '응고', '퇴적'], '거울은 빛을 잘 반사합니다.'],
  ['소리가 전달되려면 필요한 것은 무엇인가요?', '매질', ['매질', '햇빛', '자석', '전지'], '공기나 물처럼 소리를 전하는 물질이 필요합니다.'],
  ['식물이 햇빛을 이용해 양분을 만드는 과정은 무엇인가요?', '광합성', ['광합성', '증발', '침식', '응결'], '식물은 빛을 이용해 양분을 만듭니다.'],
  ['식물이 물을 주로 흡수하는 부분은 어디인가요?', '뿌리', ['뿌리', '꽃잎', '열매', '씨'], '뿌리는 물과 양분을 흡수합니다.'],
  ['식물의 잎에서 주로 일어나는 작용은 무엇인가요?', '광합성', ['광합성', '퇴적', '자화', '응고'], '잎은 햇빛을 받아 양분을 만드는 데 중요합니다.'],
  ['동물이 숨을 쉴 때 주로 필요한 기체는 무엇인가요?', '산소', ['산소', '수소', '질소만', '헬륨'], '사람과 동물은 산소를 이용해 숨을 쉽니다.'],
  ['사람의 피를 온몸으로 보내는 기관은 무엇인가요?', '심장', ['심장', '위', '폐', '간'], '심장은 피를 온몸으로 보내는 펌프 역할을 합니다.'],
  ['사람이 숨을 쉬는 데 중요한 기관은 무엇인가요?', '폐', ['폐', '위', '심장', '뼈'], '폐는 공기 중 산소를 받아들이는 데 중요합니다.'],
  ['음식물을 잘게 부수기 시작하는 곳은 어디인가요?', '입', ['입', '심장', '폐', '손'], '소화는 입에서 씹는 과정부터 시작됩니다.'],
  ['전구에 불이 켜지려면 전기 회로가 어떻게 되어야 하나요?', '끊어지지 않고 이어져야 합니다', ['끊어지지 않고 이어져야 합니다', '항상 끊어져야 합니다', '물속에 있어야 합니다', '종이로만 만들어야 합니다'], '전기가 흐르려면 회로가 닫혀 있어야 합니다.'],
  ['전기가 잘 흐르는 물질을 무엇이라고 하나요?', '도체', ['도체', '절연체', '퇴적물', '침식물'], '금속처럼 전기가 잘 흐르는 물질입니다.'],
  ['전기가 잘 흐르지 않는 물질을 무엇이라고 하나요?', '절연체', ['절연체', '도체', '자석', '화석'], '고무나 플라스틱은 전기가 잘 흐르지 않습니다.'],
  ['지구가 하루에 한 바퀴 도는 운동은 무엇인가요?', '자전', ['자전', '공전', '증발', '반사'], '지구의 자전 때문에 낮과 밤이 생깁니다.'],
  ['지구가 태양 주위를 도는 운동은 무엇인가요?', '공전', ['공전', '자전', '응고', '퇴적'], '지구의 공전은 계절 변화와 관련이 있습니다.'],
  ['달의 모양이 날마다 달라 보이는 까닭과 가장 관련 있는 것은 무엇인가요?', '달이 지구 주위를 돌기 때문', ['달이 지구 주위를 돌기 때문', '달이 사라지기 때문', '달이 녹기 때문', '달이 소리를 내기 때문'], '달의 위치가 바뀌며 밝게 보이는 부분이 달라집니다.'],
  ['비가 내린 뒤 하늘에 무지개가 보이는 것과 관련 있는 것은 무엇인가요?', '빛의 굴절과 반사', ['빛의 굴절과 반사', '자석의 힘', '전기의 흐름', '흙의 퇴적'], '물방울이 빛을 나누고 되돌려 보냅니다.'],
  ['공기가 차가워지면 수증기가 물방울로 변해 생기는 것은 무엇인가요?', '이슬', ['이슬', '용암', '자석', '모래'], '밤이나 새벽에 풀잎에 맺히기도 합니다.'],
  ['바람은 주로 무엇의 움직임인가요?', '공기', ['공기', '빛', '전기', '자석'], '움직이는 공기를 바람이라고 합니다.'],
  ['온도를 재는 도구는 무엇인가요?', '온도계', ['온도계', '자', '나침반', '저울'], '온도계로 물체나 공기의 온도를 잽니다.'],
  ['물체의 무게를 재는 데 쓰는 도구는 무엇인가요?', '저울', ['저울', '온도계', '거울', '나침반'], '저울은 무게를 재는 도구입니다.'],
  ['방향을 찾을 때 쓰는 도구는 무엇인가요?', '나침반', ['나침반', '온도계', '저울', '돋보기'], '나침반의 바늘은 방향을 가리킵니다.'],
  ['작은 물체를 크게 보기 위해 쓰는 도구는 무엇인가요?', '돋보기', ['돋보기', '저울', '전지', '나침반'], '돋보기는 물체를 확대해 보여 줍니다.'],
  ['물에 소금을 넣으면 보이지 않게 섞이는 현상은 무엇인가요?', '용해', ['용해', '응고', '침식', '반사'], '어떤 물질이 액체에 녹는 현상입니다.'],
  ['소금이 물에 녹아 만들어진 물은 무엇인가요?', '소금물', ['소금물', '얼음', '수증기', '자석'], '소금이 물에 녹은 용액입니다.'],
  ['공기 중 물이 차가운 컵 겉면에 맺히는 현상은 무엇인가요?', '응결', ['응결', '융해', '침식', '자전'], '수증기가 차가워져 물방울이 됩니다.'],
  ['화산 활동으로 생긴 암석 중 구멍이 많은 검은 암석은 무엇인가요?', '현무암', ['현무암', '화강암', '석회암', '자갈'], '현무암은 용암이 식어 만들어질 수 있습니다.'],
  ['알갱이가 비교적 크고 밝은 색을 띠는 암석은 무엇인가요?', '화강암', ['화강암', '현무암', '석탄', '모래'], '화강암은 여러 광물 알갱이가 보입니다.'],
  ['흙이 만들어지는 데 큰 영향을 주는 것은 무엇인가요?', '바위가 잘게 부서지는 과정', ['바위가 잘게 부서지는 과정', '전구가 켜지는 과정', '자석이 붙는 과정', '종이가 접히는 과정'], '오랜 시간 바위가 부서지고 생물의 흔적이 섞입니다.'],
  ['물체가 빛을 가리면 생기는 어두운 부분은 무엇인가요?', '그림자', ['그림자', '이슬', '용액', '화석'], '빛이 곧게 나아가다 막히면 그림자가 생깁니다.'],
  ['소리의 세기는 무엇과 관련 있나요?', '진동의 크기', ['진동의 크기', '물의 색', '자석의 모양', '흙의 양'], '크게 진동할수록 큰 소리가 납니다.'],
  ['열은 보통 어느 쪽에서 어느 쪽으로 이동하나요?', '따뜻한 곳에서 차가운 곳으로', ['따뜻한 곳에서 차가운 곳으로', '차가운 곳에서만 멈춤', '항상 아래에서 위로만', '소리가 나는 쪽으로'], '열은 온도가 높은 곳에서 낮은 곳으로 이동합니다.'],
  ['동물이 겨울을 나기 위해 긴 잠을 자는 것을 무엇이라고 하나요?', '겨울잠', ['겨울잠', '광합성', '응결', '자전'], '일부 동물은 겨울에 활동을 줄이고 잠을 잡니다.']
];

const EMOJI_KPOP = [
  ['APT.', [], '🏢🍻👏🎉'],
  ['HOME SWEET HOME', [], '🏠🍯💛🎤'],
  ['REBEL HEART', [], '🏴‍☠️❤️⚡'],
  ['TOO BAD', [], '😬🚫💔'],
  ['like JENNIE', [], '👑💃✨'],
  ['Golden', [], '🏆✨🌟'],
  ['Blue Valentine', [], '💙💌🌙'],
  ['Thunder', [], '🌩️⚡🥁'],
  ['Famous', [], '🌟📸🎤'],
  ['GOOD GOODBYE', [], '👋😊💧'],
  ['Supernova', [], '🌟💥🚀'],
  ['Magnetic', [], '🧲❤️✨'],
  ['How Sweet', [], '🍯😊🎶'],
  ['해야', [], '👋🌞💃'],
  ['Armageddon', [], '☄️🌍🔥'],
  ['Whiplash', [], '🚗💥⚡'],
  ['Klaxon', [], '🚗📣💃'],
  ['첫 만남은 계획대로 되지 않아', [], '1️⃣🤝📋❌'],
  ['나는 아픈 건 딱 질색이니까', [], '🤒🚫🙅‍♀️'],
  ['Love wins all', [], '❤️🏆🌍'],
  ['밤양갱', [], '🌙🍡💜'],
  ['소나기', [], '🌦️💧🎤'],
  ['천상연', [], '☁️❤️🎶'],
  ['Small girl', [], '👧🤏💗'],
  ['내 이름 맑음', [], '🙋‍♀️📝☀️'],
  ['Slow Motion', [], '🐢🎥💫'],
  ['Sticky', [], '🍯🤝💃'],
  ['Midas Touch', [], '👑✋🥇'],
  ['Virtual Angel', [], '💻👼✨'],
  ['Girls Never Die', [], '👧♾️🖤'],
  ['Supernatural', [], '👻✨🌙'],
  ['Bubble Gum', [], '🫧🍬💗'],
  ['SPOT!', [], '📍🎤🔥'],
  ['오늘만 I LOVE YOU', [], '📅❤️💬'],
  ['EASY', [], '😌👌🎧'],
  ['Smart', [], '🧠📱✨'],
  ['CRAZY', [], '🤪🔥🎶'],
  ['HOT', [], '🔥🌡️💃'],
  ['Come Over', [], '👉🏠✨'],
  ['Love Language', [], '❤️💬🌍'],
  ['Priceless', [], '💎🚫💰'],
  ['Messy', [], '🌀🧹💔'],
  ['Strategy', [], '♟️📋✨'],
  ['Do the Dance', [], '💃🕺🎵'],
  ["Don't Say You Love Me", [], '🤫❤️🚫'],
  ['SWIM', [], '🏊‍♂️🌊✨'],
  ['JUMP', [], '⬆️🦘💗'],
  ['GO!', [], '🏃‍♀️💨🖤'],
  ['Celebration', [], '🎉🥳✨'],
  ['ADRENALINE', [], '⚡💓🚀']
];

const EMOJI_ANIME = [
  ['귀멸의 칼날', [], '🗡️👹🔥'],
  ['원피스', [], '🏴‍☠️🌊👒'],
  ['나루토', [], '🥷🍥🦊'],
  ['포켓몬스터', [], '⚡🌲🔴'],
  ['명탐정 코난', [], '🕵️‍♂️👓⚽'],
  ['짱구는 못말려', [], '👦🖍️🏠'],
  ['도라에몽', [], '🤖🐱🚪'],
  ['하이큐', [], '🏐🦅🔥'],
  ['슬램덩크', [], '🏀🔥⛹️'],
  ['진격의 거인', [], '🧱🧍⚔️'],
  ['스파이 패밀리', [], '🕵️‍♂️👨‍👩‍👧🥜'],
  ['주술회전', [], '🧿🤞👻'],
  ['너의 이름은', [], '🌠🔁🏙️'],
  ['센과 치히로의 행방불명', [], '♨️👧🐉'],
  ['이웃집 토토로', [], '🌳☂️🚌'],
  ['마녀 배달부 키키', [], '🧹🐈‍⬛📦'],
  ['날씨의 아이', [], '☔☀️👧'],
  ['체인소 맨', [], '🪚👨‍🦱👿'],
  ['드래곤볼', [], '🐉🔴💥'],
  ['헌터x헌터', [], '🏹🃏🟢'],
  ['은혼', [], '🍬⚔️👘'],
  ['강철의 연금술사', [], '⚙️🦾🔮'],
  ['데스노트', [], '📓💀✍️'],
  ['원펀맨', [], '👊💥🦸‍♂️'],
  ['나의 히어로 아카데미아', [], '🦸‍♂️🏫⚡'],
  ['도쿄 구울', [], '🗼👹☕'],
  ['소드 아트 온라인', [], '⚔️💻🌐'],
  ['블랙 클로버', [], '🍀⚔️📖'],
  ['닥터 스톤', [], '🧪🪨🌍'],
  ['최애의 아이', [], '⭐🎤👶'],
  ['장송의 프리렌', [], '🧝‍♀️⏳🪄'],
  ['블루 록', [], '⚽🔵🔒'],
  ['도쿄 리벤저스', [], '🗼⏪🏍️'],
  ['괴수 8호', [], '🦖8️⃣🛡️'],
  ['스즈메의 문단속', [], '🚪🗝️🪑'],
  ['던전밥', [], '🍲🐉🗡️'],
  ['나 혼자만 레벨업', [], '🧍‍♂️⬆️⚔️'],
  ['약사의 혼잣말', [], '💊👧🔍'],
  ['봇치 더 록', [], '🎸😳🎤'],
  ['카드캡터 체리', [], '🃏🌸🪄'],
  ['디지몬 어드벤처', [], '💻🐲🌈'],
  ['유희왕', [], '🃏👑⚡'],
  ['이누야샤', [], '🐕⚔️🌙'],
  ['바이올렛 에버가든', [], '💌✍️🌸'],
  ['4월은 너의 거짓말', [], '🎻🌸💧'],
  ['케이온', [], '🎸🍰🎶'],
  ['사이키 쿠스오의 재난', [], '🧠👓💥'],
  ['암살교실', [], '🎯🏫🐙'],
  ['모브 사이코 100', [], '🧠💯💥'],
  ['리제로', [], '🔁💀🕰️']
];

const EMOJI_TINIPING = [
  ['하츄핑', [], '💗💕👑'],
  ['바로핑', [], '➡️✅⏰'],
  ['아자핑', [], '💪📣🔥'],
  ['차차핑', [], '🚗💃🎶'],
  ['라라핑', [], '🎵🎤💜'],
  ['해핑', [], '☀️😊✨'],
  ['조아핑', [], '👍💗😊'],
  ['방글핑', [], '😄🌼✨'],
  ['믿어핑', [], '🤝💙🔒'],
  ['까르핑', [], '😂🎭✨'],
  ['아잉핑', [], '🥰👀💗'],
  ['주르핑', [], '😢💧🌧️'],
  ['부끄핑', [], '😳🙈💗'],
  ['부투핑', [], '🥊🔥💪'],
  ['깜빡핑', [], '💡😵‍💫❓'],
  ['띠용핑', [], '😲💥❗'],
  ['나르핑', [], '🪞👑✨'],
  ['무셔핑', [], '😱👻🌙'],
  ['투투핑', [], '2️⃣2️⃣💫'],
  ['차나핑', [], '🍵😌🌿'],
  ['따라핑', [], '👣🔁👀'],
  ['쪼꼼핑', [], '🤏🐣💛'],
  ['싹싹핑', [], '🧹✨😊'],
  ['토닥핑', [], '🤲💗😌'],
  ['원더핑', [], '✨❓🌈'],
  ['솔찌핑', [], '💬✅🤍'],
  ['발레핑', [], '🩰💃🌸'],
  ['원더하트핑', [], '✨💗👑'],
  ['꾸래핑', [], '🎨🖍️🌈'],
  ['나나핑', [], '🍌💛🎶'],
  ['솔솔핑', [], '🌬️🍃✨'],
  ['행운핑', [], '🍀✨😊'],
  ['하트로즈핑', [], '💗🌹👑'],
  ['샤샤핑', [], '✨💃💎'],
  ['포실핑', [], '☁️🐑💗'],
  ['말랑핑', [], '🧸🍡💛'],
  ['캔디핑', [], '🍬🍭💗'],
  ['머핑', [], '🤔❓💭'],
  ['커핑', [], '☕💗😊'],
  ['머랭핑', [], '🍰☁️🍬'],
  ['샌드핑', [], '🥪🏖️💛'],
  ['또너핑', [], '🍩🔁💗'],
  ['핫케핑', [], '🥞🔥🍯'],
  ['마카핑', [], '🍪🌈💗'],
  ['아라핑', [], '🌊🐚💙'],
  ['다해핑', [], '✅💪🌟'],
  ['루루핑', [], '🌙🎶💜'],
  ['뿌뿌핑', [], '📯💨🎵'],
  ['코자핑', [], '😴🌙💤'],
  ['빙글핑', [], '🌀😵‍💫✨']
];

const CULTURAL_HERITAGE_IMAGES = [
  ['경복궁', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/%EA%B2%BD%EB%B3%B5%EA%B6%811.jpg/960px-%EA%B2%BD%EB%B3%B5%EA%B6%811.jpg', 'https://commons.wikimedia.org/wiki/File:%EA%B2%BD%EB%B3%B5%EA%B6%811.jpg'],
  ['창덕궁', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/%EC%B0%BD%EB%8D%95%EA%B6%81_%EC%9D%B8%EC%A0%95%EC%A0%84.jpg/960px-%EC%B0%BD%EB%8D%95%EA%B6%81_%EC%9D%B8%EC%A0%95%EC%A0%84.jpg', 'https://commons.wikimedia.org/wiki/File:%EC%B0%BD%EB%8D%95%EA%B6%81_%EC%9D%B8%EC%A0%95%EC%A0%84.jpg'],
  ['창경궁', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/%EC%B0%BD%EA%B2%BD%EA%B6%812.jpg/960px-%EC%B0%BD%EA%B2%BD%EA%B6%812.jpg', 'https://commons.wikimedia.org/wiki/File:%EC%B0%BD%EA%B2%BD%EA%B6%812.jpg'],
  ['덕수궁', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/%EC%95%84%EB%A6%84%EB%8B%A4%EC%9A%B4_%EB%8D%95%EC%88%98%EA%B6%81.jpg/960px-%EC%95%84%EB%A6%84%EB%8B%A4%EC%9A%B4_%EB%8D%95%EC%88%98%EA%B6%81.jpg', 'https://commons.wikimedia.org/wiki/File:%EC%95%84%EB%A6%84%EB%8B%A4%EC%9A%B4_%EB%8D%95%EC%88%98%EA%B6%81.jpg'],
  ['종묘', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/%EC%A2%85%EB%AC%98_%EC%98%81%EB%85%95%EC%A0%84.jpg/960px-%EC%A2%85%EB%AC%98_%EC%98%81%EB%85%95%EC%A0%84.jpg', 'https://commons.wikimedia.org/wiki/File:%EC%A2%85%EB%AC%98_%EC%98%81%EB%85%95%EC%A0%84.jpg'],
  ['숭례문', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/%ED%95%B4_%EC%A7%88_%EB%85%98%EC%9D%98_%EC%88%AD%EB%A1%80%EB%AC%B81.jpg/960px-%ED%95%B4_%EC%A7%88_%EB%85%98%EC%9D%98_%EC%88%AD%EB%A1%80%EB%AC%B81.jpg', 'https://commons.wikimedia.org/wiki/File:%ED%95%B4_%EC%A7%88_%EB%85%98%EC%9D%98_%EC%88%AD%EB%A1%80%EB%AC%B81.jpg'],
  ['흥인지문', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/%ED%9D%A5%EC%9D%B8%EC%A7%80%EB%AC%B8_%28Heunginjimun_Gate%29.jpg/960px-%ED%9D%A5%EC%9D%B8%EC%A7%80%EB%AC%B8_%28Heunginjimun_Gate%29.jpg', 'https://commons.wikimedia.org/wiki/File:%ED%9D%A5%EC%9D%B8%EC%A7%80%EB%AC%B8_(Heunginjimun_Gate).jpg'],
  ['수원 화성', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/%EB%B4%84%EC%9D%B4_%EC%98%A8_%EC%88%98%EC%9B%90_%ED%99%94%EC%84%B1.jpg/960px-%EB%B4%84%EC%9D%B4_%EC%98%A8_%EC%88%98%EC%9B%90_%ED%99%94%EC%84%B1.jpg', 'https://commons.wikimedia.org/wiki/File:%EB%B4%84%EC%9D%B4_%EC%98%A8_%EC%88%98%EC%9B%90_%ED%99%94%EC%84%B1.jpg'],
  ['불국사', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/%EA%B2%BD%EC%A3%BC_%EB%B6%88%EA%B5%AD%EC%82%AC_%EB%8B%A4%EB%B3%B4%ED%83%91.jpg/960px-%EA%B2%BD%EC%A3%BC_%EB%B6%88%EA%B5%AD%EC%82%AC_%EB%8B%A4%EB%B3%B4%ED%83%91.jpg', 'https://commons.wikimedia.org/wiki/File:%EA%B2%BD%EC%A3%BC_%EB%B6%88%EA%B5%AD%EC%82%AC_%EB%8B%A4%EB%B3%B4%ED%83%91.jpg'],
  ['석굴암', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/54-%E3%85%82-_1954%EB%85%84_%EA%B2%BD%EC%A3%BC_%EC%84%9D%EA%B5%B4%EC%95%941.jpg/960px-54-%E3%85%82-_1954%EB%85%84_%EA%B2%BD%EC%A3%BC_%EC%84%9D%EA%B5%B4%EC%95%941.jpg', 'https://commons.wikimedia.org/wiki/File:54-%E3%85%82-_1954%EB%85%84_%EA%B2%BD%EC%A3%BC_%EC%84%9D%EA%B5%B4%EC%95%941.jpg'],
  ['문무대왕릉', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/%EC%A0%95%EC%9B%94%EB%8C%80%EB%B3%B4%EB%A6%84%EC%9D%98_%EB%AC%B8%EB%AC%B4%EB%8C%80%EC%99%95%EB%A6%89.jpg/960px-%EC%A0%95%EC%9B%94%EB%8C%80%EB%B3%B4%EB%A6%84%EC%9D%98_%EB%AC%B8%EB%AC%B4%EB%8C%80%EC%99%95%EB%A6%89.jpg', 'https://commons.wikimedia.org/wiki/File:%EC%A0%95%EC%9B%94%EB%8C%80%EB%B3%B4%EB%A6%84%EC%9D%98_%EB%AC%B8%EB%AC%B4%EB%8C%80%EC%99%95%EB%A6%89.jpg'],
  ['관촉사 석조미륵보살입상', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Statue_of_Mireuk_Budda.jpg/960px-Statue_of_Mireuk_Budda.jpg', 'https://commons.wikimedia.org/wiki/File:Statue_of_Mireuk_Budda.jpg'],
  ['돈암서원', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Donam_Seowon_3.jpg/960px-Donam_Seowon_3.jpg', 'https://commons.wikimedia.org/wiki/File:Donam_Seowon_3.jpg'],
  ['근정전', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/%EA%B7%BC%EC%A0%95%EC%A0%84.jpg/960px-%EA%B7%BC%EC%A0%95%EC%A0%84.jpg', 'https://commons.wikimedia.org/wiki/File:%EA%B7%BC%EC%A0%95%EC%A0%84.jpg'],
  ['창덕궁 후원', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Changdeokgung.jpg/960px-Changdeokgung.jpg', 'https://commons.wikimedia.org/wiki/File:Changdeokgung.jpg'],
  ['덕수궁 석조전', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/20131215_%EB%8D%95%EC%88%98%EA%B6%81_%EC%84%9D%EC%A1%B0%EC%A0%84.jpg/960px-20131215_%EB%8D%95%EC%88%98%EA%B6%81_%EC%84%9D%EC%A1%B0%EC%A0%84.jpg', 'https://commons.wikimedia.org/wiki/File:20131215_%EB%8D%95%EC%88%98%EA%B6%81_%EC%84%9D%EC%A1%B0%EC%A0%84.jpg'],
  ['원각사지 십층석탑', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/201609_%EC%9B%90%EA%B0%81%EC%82%AC%EC%A7%80_%EC%8B%AD%EC%B8%B5%EC%84%9D%ED%83%91.jpg/960px-201609_%EC%9B%90%EA%B0%81%EC%82%AC%EC%A7%80_%EC%8B%AD%EC%B8%B5%EC%84%9D%ED%83%91.jpg', 'https://commons.wikimedia.org/wiki/File:201609_%EC%9B%90%EA%B0%81%EC%82%AC%EC%A7%80_%EC%8B%AD%EC%B8%B5%EC%84%9D%ED%83%91.jpg'],
  ['첨성대', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Cheomseongdae_Observatory_under_blue_sky_in_Gyeongju_South_Korea.jpg/960px-Cheomseongdae_Observatory_under_blue_sky_in_Gyeongju_South_Korea.jpg', 'https://en.wikipedia.org/wiki/Cheomseongdae'],
  ['다보탑', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Dabotap_Pagoda_01.jpg/960px-Dabotap_Pagoda_01.jpg', 'https://en.wikipedia.org/wiki/Dabotap'],
  ['석가탑', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Seokgatap_Pagoda.jpg/960px-Seokgatap_Pagoda.jpg', 'https://en.wikipedia.org/wiki/Seokgatap'],
  ['성덕대왕신종', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/National_Museum-Emile_Bell_-_Gyeongju_3781-06.JPG/960px-National_Museum-Emile_Bell_-_Gyeongju_3781-06.JPG', 'https://en.wikipedia.org/wiki/Bell_of_King_Seongdeok'],
  ['팔만대장경', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Tripitaka_Koreana_02.jpg/960px-Tripitaka_Koreana_02.jpg', 'https://en.wikipedia.org/wiki/Tripitaka_Koreana'],
  ['직지심체요절', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Jikji_pages.jpg/960px-Jikji_pages.jpg', 'https://en.wikipedia.org/wiki/Jikji'],
  ['공주 공산성', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/%EA%B3%B5%EC%82%B0%EC%84%B1%EC%9D%98_%EA%B0%80%EC%9D%84_%ED%95%98%EB%8A%98.jpg/960px-%EA%B3%B5%EC%82%B0%EC%84%B1%EC%9D%98_%EA%B0%80%EC%9D%84_%ED%95%98%EB%8A%98.jpg', 'https://en.wikipedia.org/wiki/Gongsanseong'],
  ['미륵사지 석탑', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/%EC%9D%B5%EC%82%B0_%EB%AF%B8%EB%A5%B5%EC%82%AC%EC%A7%80_%EC%84%9D%ED%83%91%282019%EB%85%84%29_%EC%95%BC%EA%B2%BD.jpg/960px-%EC%9D%B5%EC%82%B0_%EB%AF%B8%EB%A5%B5%EC%82%AC%EC%A7%80_%EC%84%9D%ED%83%91%282019%EB%85%84%29_%EC%95%BC%EA%B2%BD.jpg', 'https://en.wikipedia.org/wiki/Mireuksa'],
  ['동궁과 월지', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Water_reflection_of_Donggung_Palace_in_Wolji_Pond_at_blue_hour_in_Gyeongju_South_Korea.jpg/960px-Water_reflection_of_Donggung_Palace_in_Wolji_Pond_at_blue_hour_in_Gyeongju_South_Korea.jpg', 'https://en.wikipedia.org/wiki/Donggung_Palace_and_Wolji_Pond'],
  ['청자 상감운학문 매병', 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Goryeo_Celadon.jpg', 'https://en.wikipedia.org/wiki/Maebyeong'],
  ['백자 달항아리', 'https://upload.wikimedia.org/wikipedia/commons/1/19/%EB%B0%B1%EC%9E%90_%EB%8B%AC%ED%95%AD%EC%95%84%EB%A6%AC%28309%ED%98%B8%29.jpg', 'https://en.wikipedia.org/wiki/Moon_jar'],
  ['신라 금관', 'https://upload.wikimedia.org/wikipedia/commons/a/a9/%EC%84%9C%EB%B4%89%EC%B4%9D_%EA%B8%88%EA%B4%80_%EA%B8%88%EC%A0%9C%EB%93%9C%EB%A6%AC%EA%B0%9C.jpg', 'https://ko.wikipedia.org/wiki/%EC%8B%A0%EB%9D%BC_%EA%B8%88%EA%B4%80'],
  ['천마도', 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Korea-Silla-Cheonmado-02.jpg', 'https://ko.wikipedia.org/wiki/%EA%B2%BD%EC%A3%BC_%EC%B2%9C%EB%A7%88%EC%B4%9D_%EC%9E%A5%EB%8B%88_%EC%B2%9C%EB%A7%88%EB%8F%84'],
  ['무령왕릉', 'https://upload.wikimedia.org/wikipedia/commons/8/84/Tomb_of_Muryeong_of_Baekje.JPG', 'https://ko.wikipedia.org/wiki/%EB%AC%B4%EB%A0%B9%EC%99%95%EB%A6%89'],
  ['백제금동대향로', 'https://upload.wikimedia.org/wikipedia/commons/b/b7/%EB%B0%B1%EC%A0%9C_%EA%B8%88%EB%8F%99%EB%8C%80%ED%96%A5%EB%A1%9C.jpg', 'https://ko.wikipedia.org/wiki/%EB%B0%B1%EC%A0%9C_%EA%B8%88%EB%8F%99%EB%8C%80%ED%96%A5%EB%A1%9C'],
  ['훈민정음 해례본', 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Hunminjeongum.jpg', 'https://ko.wikipedia.org/wiki/%ED%9B%88%EB%AF%BC%EC%A0%95%EC%9D%8C'],
  ['난중일기', 'https://upload.wikimedia.org/wikipedia/commons/5/55/%EC%9D%B4%EC%88%9C%EC%8B%A0_%EB%82%9C%EC%A4%91%EC%9D%BC%EA%B8%B0_%EB%B0%8F_%EC%84%9C%EA%B0%84%EC%B2%A9_%EC%9E%84%EC%A7%84%EC%9E%A5%EC%B4%88.jpg', 'https://ko.wikipedia.org/wiki/%EB%82%9C%EC%A4%91%EC%9D%BC%EA%B8%B0'],
  ['동의보감', 'https://upload.wikimedia.org/wikipedia/commons/7/77/Dongibogam.jpg', 'https://ko.wikipedia.org/wiki/%EB%8F%99%EC%9D%98%EB%B3%B4%EA%B0%90'],
  ['인왕제색도', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Inwangjesaekdo.jpg/3840px-Inwangjesaekdo.jpg', 'https://ko.wikipedia.org/wiki/%EC%A0%95%EC%84%A0_%ED%95%84_%EC%9D%B8%EC%99%95%EC%A0%9C%EC%83%89%EB%8F%84'],
  ['분청사기', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Korean_punch%27ong_ware_wine_bottle%2C_Choson_dynasty%2C_15th_century%2C_stoneware_with_celadon_glaze_and_white_slip%2C_HAA.JPG/960px-Korean_punch%27ong_ware_wine_bottle%2C_Choson_dynasty%2C_15th_century%2C_stoneware_with_celadon_glaze_and_white_slip%2C_HAA.JPG', 'https://ko.wikipedia.org/wiki/%EB%B6%84%EC%B2%AD%EC%82%AC%EA%B8%B0'],
  ['익산 왕궁리 오층석탑', 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Amlou2518_%EC%99%95%EA%B6%81%EB%A6%AC_%EC%98%A4%EC%B8%B5%EC%84%9D%ED%83%91.jpg', 'https://ko.wikipedia.org/wiki/%EC%9D%B5%EC%82%B0_%EC%99%95%EA%B6%81%EB%A6%AC_%EC%98%A4%EC%B8%B5%EC%84%9D%ED%83%91'],
  ['법주사 팔상전', 'https://upload.wikimedia.org/wikipedia/commons/7/77/Beopjusa_Temple_Stay_in_Korea._Palsangjeon_%28five-story_wooden_pagoda%29.jpg', 'https://ko.wikipedia.org/wiki/%EB%B3%B4%EC%9D%80_%EB%B2%95%EC%A3%BC%EC%82%AC_%ED%8C%94%EC%83%81%EC%A0%84'],
  ['부석사 무량수전', 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Muryangsujeon2.jpg', 'https://ko.wikipedia.org/wiki/%EC%98%81%EC%A3%BC_%EB%B6%80%EC%84%9D%EC%82%AC_%EB%AC%B4%EB%9F%89%EC%88%98%EC%A0%84'],
  ['하회탈', 'https://upload.wikimedia.org/wikipedia/commons/0/08/%EC%95%88%EB%8F%99_%ED%95%98%ED%9A%8C%ED%83%88_%EB%B0%8F_%EB%B3%91%EC%82%B0%ED%83%88.jpg', 'https://ko.wikipedia.org/wiki/%ED%95%98%ED%9A%8C%ED%83%88'],
  ['고려청자', 'https://upload.wikimedia.org/wikipedia/commons/7/74/Korea_-_Seoul_-_National_Museum_-_Incense_Burner_0252-06a_%28cropped%29.jpg', 'https://en.wikipedia.org/wiki/Korean_pottery_and_porcelain'],
  ['대동여지도', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Daedongyeojido-full.jpg/3840px-Daedongyeojido-full.jpg', 'https://en.wikipedia.org/wiki/Daedongyeojido'],
  ['측우기', 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Jang_Yeong-sil_Science_Garden-Rain_Gauges_13-11789_Busan%2C_South_Korea_03.JPG', 'https://en.wikipedia.org/wiki/Ch%27%C5%ADgugi'],
  ['칠지도', 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Chiljido.jpg', 'https://en.wikipedia.org/wiki/Seven-Branched_Sword'],
  ['금동미륵보살반가사유상', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Korea-Gilt-bronze_pensive_Maitreya-National_Treasure_No._78-01.jpg/960px-Korea-Gilt-bronze_pensive_Maitreya-National_Treasure_No._78-01.jpg', 'https://commons.wikimedia.org/wiki/File:Korea-Gilt-bronze_pensive_Maitreya-National_Treasure_No._78-01.jpg'],
  ['앙부일구', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Seoul-Gyeongbokgung-Sundial-02.jpg/960px-Seoul-Gyeongbokgung-Sundial-02.jpg', 'https://commons.wikimedia.org/wiki/File:Seoul-Gyeongbokgung-Sundial-02.jpg'],
  ['고구려 고분 벽화', 'https://upload.wikimedia.org/wikipedia/commons/5/54/Goguryeo_tomb_mural.jpg', 'https://commons.wikimedia.org/wiki/File:Goguryeo_tomb_mural.jpg'],
  ['김홍도 풍속화', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Kim_Hong-do._The_watched._Screen._Genre_painting%2C_detail._Mus%C3%A9e_Guimet_MA_2544.jpg/960px-Kim_Hong-do._The_watched._Screen._Genre_painting%2C_detail._Mus%C3%A9e_Guimet_MA_2544.jpg', 'https://commons.wikimedia.org/wiki/File:Kim_Hong-do._The_watched._Screen._Genre_painting,_detail._Mus%C3%A9e_Guimet_MA_2544.jpg'],
  ['용비어천가', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Yongbieocheonga.jpg/960px-Yongbieocheonga.jpg', 'https://commons.wikimedia.org/wiki/File:Yongbieocheonga.jpg'],
  ['조선왕조실록', 'https://upload.wikimedia.org/wikipedia/commons/a/a6/%EA%B3%A0%EC%A2%85%EC%8B%A4%EB%A1%9D_%ED%91%9C%EC%A7%80.gif', 'https://commons.wikimedia.org/wiki/File:%EA%B3%A0%EC%A2%85%EC%8B%A4%EB%A1%9D_%ED%91%9C%EC%A7%80.gif'],
  ['승정원일기', 'https://upload.wikimedia.org/wikipedia/commons/2/2e/%EC%8A%B9%EC%A0%95%EC%9B%90%EC%9D%BC%EA%B8%B0_%28303%ED%98%B8%29.jpg', 'https://commons.wikimedia.org/wiki/File:%EC%8A%B9%EC%A0%95%EC%9B%90%EC%9D%BC%EA%B8%B0_(303%ED%98%B8).jpg'],
  ['해인사 장경판전', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Haeinsa_Temple_01.jpg/960px-Haeinsa_Temple_01.jpg', 'https://commons.wikimedia.org/wiki/File:Haeinsa_Temple_01.jpg'],
  ['고창 고인돌 유적', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Gochang_Dolmen_Sites_-_1.JPG/960px-Gochang_Dolmen_Sites_-_1.JPG', 'https://commons.wikimedia.org/wiki/File:Gochang_Dolmen_Sites_-_1.JPG'],
  ['하회마을', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Hahoe_Folk_Village_03.jpg/960px-Hahoe_Folk_Village_03.jpg', 'https://commons.wikimedia.org/wiki/File:Hahoe_Folk_Village_03.jpg'],
  ['양동마을', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Yangdong_Village_02.jpg/960px-Yangdong_Village_02.jpg', 'https://commons.wikimedia.org/wiki/File:Yangdong_Village_02.jpg'],
  ['화성행궁', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Hwaseong_Haenggung_Palace.jpg/960px-Hwaseong_Haenggung_Palace.jpg', 'https://commons.wikimedia.org/wiki/File:Hwaseong_Haenggung_Palace.jpg'],
  ['광화문', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Gwanghwamun_20240413.jpg/960px-Gwanghwamun_20240413.jpg', 'https://commons.wikimedia.org/wiki/File:Gwanghwamun_20240413.jpg'],
  ['강화 고인돌', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Dolmen_at_Ganghwa_Island.jpg/960px-Dolmen_at_Ganghwa_Island.jpg', 'https://commons.wikimedia.org/wiki/File:Dolmen_at_Ganghwa_Island.jpg'],
  ['송광사', 'https://upload.wikimedia.org/wikipedia/commons/6/6a/%28%ED%95%9C%EA%B5%AD%EB%AF%BC%EC%A1%B1%EB%AC%B8%ED%99%94%EB%8C%80%EB%B0%B1%EA%B3%BC%EC%82%AC%EC%A0%84%29%EC%88%9C%EC%B2%9C_%EC%86%A1%EA%B4%91%EC%82%AC_%EC%A0%84%EA%B2%BD.jpg', 'https://ko.wikipedia.org/wiki/%EC%86%A1%EA%B4%91%EC%82%AC'],
  ['해인사', 'https://upload.wikimedia.org/wikipedia/commons/b/bb/%ED%95%9C%EA%B5%AD_%EB%AC%B8%ED%99%94_%EC%97%AC%ED%96%89_%EC%9D%8C%EC%8B%9D_%ED%95%B4%EC%9D%B8%EC%82%AC003.jpg', 'https://ko.wikipedia.org/wiki/%ED%95%B4%EC%9D%B8%EC%82%AC'],
  ['통도사', 'https://upload.wikimedia.org/wikipedia/commons/0/05/Korea-Tongdosa-09.jpg', 'https://ko.wikipedia.org/wiki/%ED%86%B5%EB%8F%84%EC%82%AC'],
  ['봉정사 극락전', 'https://upload.wikimedia.org/wikipedia/commons/6/68/Korea-Andong-Bongjeongsa_3040-06_Geungnakjeon.JPG', 'https://ko.wikipedia.org/wiki/%EC%95%88%EB%8F%99_%EB%B4%89%EC%A0%95%EC%82%AC_%EA%B7%B9%EB%9D%BD%EC%A0%84'],
  ['화엄사 각황전', 'https://upload.wikimedia.org/wikipedia/commons/9/90/Korea-Gurye-Hwaeomsa_5017-06.JPG', 'https://ko.wikipedia.org/wiki/%EA%B5%AC%EB%A1%80_%ED%99%94%EC%97%84%EC%82%AC_%EA%B0%81%ED%99%A9%EC%A0%84'],
  ['황룡사지', 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Korea-Gyeongju-Hwangnyongsa-02.jpg', 'https://ko.wikipedia.org/wiki/%EA%B2%BD%EC%A3%BC_%ED%99%A9%EB%A3%A1%EC%82%AC%EC%A7%80'],
  ['감은사지 삼층석탑', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/%EA%B0%90%EC%9D%80%EC%82%AC%EC%A7%80_blue_sky.jpg/960px-%EA%B0%90%EC%9D%80%EC%82%AC%EC%A7%80_blue_sky.jpg', 'https://ko.wikipedia.org/wiki/%EA%B2%BD%EC%A3%BC_%EA%B0%90%EC%9D%80%EC%82%AC%EC%A7%80_%EB%8F%99%C2%B7%EC%84%9C_%EC%82%BC%EC%B8%B5%EC%84%9D%ED%83%91'],
  ['정림사지 오층석탑', 'https://upload.wikimedia.org/wikipedia/commons/6/60/%EC%A0%95%EB%A6%BC%EC%82%AC%EC%A7%80_%EC%98%A4%EC%B8%B5%EC%84%9D%ED%83%91_%EC%A0%95%EB%A9%B4.jpg', 'https://ko.wikipedia.org/wiki/%EB%B6%80%EC%97%AC_%EC%A0%95%EB%A6%BC%EC%82%AC%EC%A7%80_%EC%98%A4%EC%B8%B5%EC%84%9D%ED%83%91'],
  ['탑평리 칠층석탑', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/%EC%B6%A9%EC%A3%BC_%ED%83%91%ED%8F%89%EB%A6%AC_%EC%B9%A0%EC%B8%B5%EC%84%9D%ED%83%91_01.jpg', 'https://ko.wikipedia.org/wiki/%EC%B6%A9%EC%A3%BC_%ED%83%91%ED%8F%89%EB%A6%AC_%EC%B9%A0%EC%B8%B5%EC%84%9D%ED%83%91'],
  ['월정사 팔각구층석탑', 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Korea-Gangwon-Woljeongsa_Nine_Story_Stone_Pagoda_1723-07.JPG', 'https://ko.wikipedia.org/wiki/%ED%8F%89%EC%B0%BD_%EC%9B%94%EC%A0%95%EC%82%AC_%ED%8C%94%EA%B0%81%EA%B5%AC%EC%B8%B5%EC%84%9D%ED%83%91'],
  ['천상열차분야지도', 'https://upload.wikimedia.org/wikipedia/commons/6/64/Cheonsang-yeolcha-bunya-jido_%28woodcut_version%29.png', 'https://ko.wikipedia.org/wiki/%EC%B2%9C%EC%83%81%EC%97%B4%EC%B0%A8%EB%B6%84%EC%95%BC%EC%A7%80%EB%8F%84'],
  ['자격루', 'https://upload.wikimedia.org/wikipedia/commons/6/67/BoRuGak_Jagyeongnu.JPG', 'https://ko.wikipedia.org/wiki/%EC%9E%90%EA%B2%A9%EB%A3%A8'],
  ['동궐도', 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Donggwol-do.jpg', 'https://ko.wikipedia.org/wiki/%EB%8F%99%EA%B6%90%EB%8F%84'],
  ['몽유도원도', 'https://upload.wikimedia.org/wikipedia/commons/9/93/Dream_Journey_to_the_Peach_Blossom_Land.jpg', 'https://ko.wikipedia.org/wiki/%EB%AA%BD%EC%9C%A0%EB%8F%84%EC%9B%90%EB%8F%84'],
  ['금동대탑', 'https://upload.wikimedia.org/wikipedia/commons/e/e4/%EA%B8%88%EB%8F%99%ED%83%91_%28%EA%B5%AD%EB%B3%B4_%EC%A0%9C213%ED%98%B8%29.jpg', 'https://ko.wikipedia.org/wiki/%EA%B8%88%EB%8F%99%ED%83%91_(%EA%B5%AD%EB%B3%B4_%EC%A0%9C213%ED%98%B8)'],
  ['고려대학교 본관', 'https://upload.wikimedia.org/wikipedia/commons/6/60/KOREA_UNIV.JPG', 'https://ko.wikipedia.org/wiki/%EA%B3%A0%EB%A0%A4%EB%8C%80%ED%95%99%EA%B5%90_%EB%B3%B8%EA%B4%80'],
  ['서울역 구역사', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Wongwt_%E9%A6%96%E7%88%BE%E7%81%AB%E8%BB%8A%E7%AB%99_%2816942638829%29.jpg/960px-Wongwt_%E9%A6%96%E7%88%BE%E7%81%AB%E8%BB%8A%E7%AB%99_%2816942638829%29.jpg', 'https://ko.wikipedia.org/wiki/%EC%84%9C%EC%9A%B8%EC%97%AD'],
  ['독립문', 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Seodaemun_Monument%2C_Seoul.jpg', 'https://ko.wikipedia.org/wiki/%EB%8F%85%EB%A6%BD%EB%AC%B8'],
  ['명동성당', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Myeongdongchurch2025.jpg/960px-Myeongdongchurch2025.jpg', 'https://ko.wikipedia.org/wiki/%EB%AA%85%EB%8F%99%EC%84%B1%EB%8B%B9'],
  ['전주 경기전', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/%EC%A0%84%EC%A3%BC_%EA%B2%BD%EA%B8%B0%EC%A0%84_%ED%99%8D%EC%82%B4%EB%AC%B8_1.jpg/960px-%EC%A0%84%EC%A3%BC_%EA%B2%BD%EA%B8%B0%EC%A0%84_%ED%99%8D%EC%82%B4%EB%AC%B8_1.jpg', 'https://ko.wikipedia.org/wiki/%EC%A0%84%EC%A3%BC_%EA%B2%BD%EA%B8%B0%EC%A0%84'],
  ['오죽헌', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Ojukheon_sarangchae.jpg/960px-Ojukheon_sarangchae.jpg', 'https://ko.wikipedia.org/wiki/%EC%98%A4%EC%A3%BD%ED%97%8C'],
  ['도산서원', 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Korea-Andong-Dosan_Seowon_3025-06.JPG', 'https://ko.wikipedia.org/wiki/%EC%95%88%EB%8F%99_%EB%8F%84%EC%82%B0%EC%84%9C%EC%9B%90'],
  ['소수서원', 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Sosuseowon.jpg', 'https://ko.wikipedia.org/wiki/%EC%98%81%EC%A3%BC_%EC%86%8C%EC%88%98%EC%84%9C%EC%9B%90'],
  ['병산서원', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/%EB%B3%91%EC%82%B0%EC%84%9C%EC%9B%90-1.jpg/960px-%EB%B3%91%EC%82%B0%EC%84%9C%EC%9B%90-1.jpg', 'https://ko.wikipedia.org/wiki/%EC%95%88%EB%8F%99_%EB%B3%91%EC%82%B0%EC%84%9C%EC%9B%90'],
  ['옥산서원', 'https://upload.wikimedia.org/wikipedia/commons/c/ca/%EA%B2%BD%EC%A3%BC_%EC%98%A5%EC%82%B0%EC%84%9C%EC%9B%90_%EA%B5%AC%EC%9D%B8%EB%8B%B9.jpg', 'https://ko.wikipedia.org/wiki/%EA%B2%BD%EC%A3%BC_%EC%98%A5%EC%82%B0%EC%84%9C%EC%9B%90'],
  ['무위사 극락보전', 'https://upload.wikimedia.org/wikipedia/commons/c/c9/%EA%B0%95%EC%A7%84%EB%AC%B4%EC%9C%84%EC%82%AC%EA%B7%B9%EB%9D%BD%EC%A0%84.jpg', 'https://ko.wikipedia.org/wiki/%EA%B0%95%EC%A7%84_%EB%AC%B4%EC%9C%84%EC%82%AC_%EA%B7%B9%EB%9D%BD%EB%B3%B4%EC%A0%84'],
  ['수덕사 대웅전', 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Sudeoksa_01.JPG', 'https://ko.wikipedia.org/wiki/%EC%98%88%EC%82%B0_%EC%88%98%EB%8D%95%EC%82%AC_%EB%8C%80%EC%9B%85%EC%A0%84'],
  ['개심사 대웅전', 'https://upload.wikimedia.org/wikipedia/commons/7/7c/%EC%84%9C%EC%82%B0_%EA%B0%9C%EC%8B%AC%EC%82%AC_%EB%8C%80%EC%9B%85%EC%A0%84_01.jpg', 'https://ko.wikipedia.org/wiki/%EC%84%9C%EC%82%B0_%EA%B0%9C%EC%8B%AC%EC%82%AC_%EB%8C%80%EC%9B%85%EC%A0%84'],
  ['강릉 임영관 삼문', 'https://upload.wikimedia.org/wikipedia/commons/8/84/%EA%B0%95%EB%A6%89_%EC%9E%84%EC%98%81%EA%B4%80_%EC%82%BC%EB%AC%B8_01.jpg', 'https://ko.wikipedia.org/wiki/%EA%B0%95%EB%A6%89_%EC%9E%84%EC%98%81%EA%B4%80_%EC%82%BC%EB%AC%B8'],
  ['경천사지 십층석탑', 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Korea-Seoul-National_Museum_Gyeongcheonsa_Pagoda_0187%268-06.jpg', 'https://ko.wikipedia.org/wiki/%EA%B0%9C%EC%84%B1_%EA%B2%BD%EC%B2%9C%EC%82%AC%EC%A7%80_%EC%8B%AD%EC%B8%B5%EC%84%9D%ED%83%91'],
  ['대흥사', 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Daeheungsa_11-03896.JPG', 'https://ko.wikipedia.org/wiki/%EB%8C%80%ED%9D%A5%EC%82%AC'],
  ['마곡사', 'https://upload.wikimedia.org/wikipedia/commons/2/23/20140809_%EB%A7%88%EA%B3%A1%EC%82%AC_%EB%8C%80%EA%B4%91%EB%B3%B4%EC%A0%84.jpg', 'https://ko.wikipedia.org/wiki/%EB%A7%88%EA%B3%A1%EC%82%AC'],
  ['선암사', 'https://upload.wikimedia.org/wikipedia/commons/0/05/Seonamsa_Iljumun_11-06782.JPG', 'https://ko.wikipedia.org/wiki/%EC%84%A0%EC%95%94%EC%82%AC'],
  ['용주사 동종', 'https://upload.wikimedia.org/wikipedia/commons/7/7d/%ED%99%94%EC%84%B1_%EC%9A%A9%EC%A3%BC%EC%82%AC_%EB%8F%99%EC%A2%85_09.jpg', 'https://ko.wikipedia.org/wiki/%ED%99%94%EC%84%B1_%EC%9A%A9%EC%A3%BC%EC%82%AC_%EB%8F%99%EC%A2%85'],
  ['보림사 삼층석탑', 'https://upload.wikimedia.org/wikipedia/commons/7/72/%EC%9E%A5%ED%9D%A5_%EB%B3%B4%EB%A6%BC%EC%82%AC_%EB%82%A8%E3%86%8D%EB%B6%81_%EC%82%BC%EC%B8%B5%EC%84%9D%ED%83%91_%EB%B0%8F_%EC%84%9D%EB%93%B1_03.jpg', 'https://ko.wikipedia.org/wiki/%EC%9E%A5%ED%9D%A5_%EB%B3%B4%EB%A6%BC%EC%82%AC_%EB%82%A8%C2%B7%EB%B6%81_%EC%82%BC%EC%B8%B5%EC%84%9D%ED%83%91_%EB%B0%8F_%EC%84%9D%EB%93%B1'],
  ['금산사 미륵전', 'https://upload.wikimedia.org/wikipedia/ko/5/5f/Geumsanmireuk.JPG', 'https://ko.wikipedia.org/wiki/%EA%B9%80%EC%A0%9C_%EA%B8%88%EC%82%B0%EC%82%AC_%EB%AF%B8%EB%A5%B5%EC%A0%84'],
  ['관룡사 용선대 석조여래좌상', 'https://upload.wikimedia.org/wikipedia/commons/a/a7/%EC%B0%BD%EB%85%95_%EA%B4%80%EB%A3%A1%EC%82%AC_%EC%9A%A9%EC%84%A0%EB%8C%80_%EC%84%9D%EC%A1%B0%EC%97%AC%EB%9E%98%EC%A2%8C%EC%83%81.jpg', 'https://ko.wikipedia.org/wiki/%EC%B0%BD%EB%85%95_%EA%B4%80%EB%A3%A1%EC%82%AC_%EC%9A%A9%EC%84%A0%EB%8C%80_%EC%84%9D%EC%A1%B0%EC%97%AC%EB%9E%98%EC%A2%8C%EC%83%81'],
  ['진주성', 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Jinju_castle-Chosuk_gate.jpg', 'https://ko.wikipedia.org/wiki/%EC%A7%84%EC%A3%BC%EC%84%B1'],
  ['촉석루', 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Choksuk_pavillion_in_Jinju_Castel.JPG', 'https://ko.wikipedia.org/wiki/%EC%A7%84%EC%A3%BC_%EC%B4%89%EC%84%9D%EB%A3%A8'],
  ['북한산성', 'https://upload.wikimedia.org/wikipedia/commons/7/73/Korea-Bukhansan-04.jpg', 'https://ko.wikipedia.org/wiki/%EB%B6%81%ED%95%9C%EC%82%B0%EC%84%B1'],
  ['정동교회', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Jeongdong_First_Church.JPG/960px-Jeongdong_First_Church.JPG', 'https://commons.wikimedia.org/wiki/File:Jeongdong_First_Church.JPG']
];

const CULTURAL_HERITAGE_IMAGE_SOURCE_DEFAULTS = {
  imageProvider: 'Wikimedia Commons',
  imageLicense: '원본 파일 페이지의 라이선스 확인 필요',
  imageCredit: '원본 파일 페이지 참조'
};

const FLAG_COUNTRIES = [
  ['kr', '대한민국'], ['jp', '일본'], ['cn', '중국'], ['us', '미국'], ['gb', '영국'],
  ['fr', '프랑스'], ['de', '독일'], ['it', '이탈리아'], ['es', '스페인'], ['ca', '캐나다'],
  ['br', '브라질'], ['ar', '아르헨티나'], ['mx', '멕시코'], ['au', '호주'], ['nz', '뉴질랜드'],
  ['in', '인도'], ['id', '인도네시아'], ['vn', '베트남'], ['th', '태국'], ['ph', '필리핀'],
  ['sg', '싱가포르'], ['my', '말레이시아'], ['tr', '튀르키예'], ['sa', '사우디아라비아'], ['eg', '이집트'],
  ['za', '남아프리카공화국'], ['ng', '나이지리아'], ['ke', '케냐'], ['ru', '러시아'], ['ua', '우크라이나'],
  ['pl', '폴란드'], ['nl', '네덜란드'], ['be', '벨기에'], ['ch', '스위스'], ['se', '스웨덴'],
  ['no', '노르웨이'], ['fi', '핀란드'], ['dk', '덴마크'], ['gr', '그리스'], ['pt', '포르투갈'],
  ['ie', '아일랜드'], ['at', '오스트리아'], ['cz', '체코'], ['hu', '헝가리'], ['ro', '루마니아'],
  ['il', '이스라엘'], ['ae', '아랍에미리트'], ['qa', '카타르'], ['ir', '이란'], ['iq', '이라크'],
  ['pk', '파키스탄'], ['bd', '방글라데시'], ['lk', '스리랑카'], ['np', '네팔'], ['mn', '몽골'],
  ['kz', '카자흐스탄'], ['uz', '우즈베키스탄'], ['kh', '캄보디아'], ['la', '라오스'], ['mm', '미얀마'],
  ['tw', '대만'], ['hk', '홍콩'], ['ma', '모로코'], ['tn', '튀니지'], ['et', '에티오피아'],
  ['gh', '가나'], ['tz', '탄자니아'], ['ug', '우간다'], ['cm', '카메룬'], ['sn', '세네갈'],
  ['cl', '칠레'], ['pe', '페루'], ['co', '콜롬비아'], ['ve', '베네수엘라'], ['uy', '우루과이'],
  ['py', '파라과이'], ['bo', '볼리비아'], ['ec', '에콰도르'], ['cu', '쿠바'], ['jm', '자메이카'],
  ['do', '도미니카공화국'], ['cr', '코스타리카'], ['pa', '파나마'], ['gt', '과테말라'], ['is', '아이슬란드'],
  ['lu', '룩셈부르크'], ['hr', '크로아티아'], ['rs', '세르비아'], ['bg', '불가리아'], ['sk', '슬로바키아'],
  ['si', '슬로베니아'], ['lt', '리투아니아'], ['lv', '라트비아'], ['ee', '에스토니아'], ['jo', '요르단'],
  ['kw', '쿠웨이트'], ['om', '오만'], ['ge', '조지아'], ['az', '아제르바이잔'], ['am', '아르메니아']
];

function flagImageMeta(code) {
  const safeCode = String(code || '').trim().toLowerCase();
  return {
    imageUrl: `https://flagcdn.com/w640/${safeCode}.png`,
    imageSourceUrl: `https://flagcdn.com/${safeCode}.svg`,
    imageProvider: 'FlagCDN',
    imageCredit: 'flagcdn.com'
  };
}

const SNACK_FOOD_ITEMS = [
  ['신라면', 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun.png', 'https://nongshimusa.com/product-detail?pid=1', 'Nongshim USA'],
  ['신라면 블랙', 'https://nongshimusa.com/html5/imgs/products/imgs/shin_ramyun_black.png', 'https://nongshimusa.com/product-detail?pid=2', 'Nongshim USA'],
  ['짜파게티', 'https://nongshimusa.com/html5/imgs/products/imgs/chapagetti.png', 'https://nongshimusa.com/product-detail?pid=4', 'Nongshim USA'],
  ['너구리', 'https://nongshimusa.com/html5/imgs/products/imgs/neoguri_spicy.jpg', 'https://nongshimusa.com/product-detail?pid=5', 'Nongshim USA'],
  ['안성탕면', 'https://nongshimusa.com/html5/imgs/products/imgs/c658eee6889cd319e2a02fcb296aeff4013dca9b6807a6a75cae25d9a6722b1d.png', 'https://nongshimusa.com/product-detail?pid=8', 'Nongshim USA'],
  ['김치라면', 'https://nongshimusa.com/html5/imgs/products/imgs/kimchi_ramyun.jpg', 'https://nongshimusa.com/product-detail?pid=9', 'Nongshim USA'],
  ['불닭볶음면', 'https://www.samyangfoods.com/upload/product/20231117/20231117142511656473.jpg', 'https://www.samyangfoods.com/kor/brand/list.do?searchCateCd1=45', 'Samyang Foods'],
  ['까르보불닭볶음면', 'https://www.samyangfoods.com/upload/product/20250312/20250312174532041195.jpg', 'https://www.samyangfoods.com/kor/brand/list.do?searchCateCd1=45', 'Samyang Foods'],
  ['로제불닭볶음면', 'https://www.samyangfoods.com/upload/product/20250520/20250520092351672183.jpg', 'https://www.samyangfoods.com/kor/brand/list.do?searchCateCd1=45', 'Samyang Foods'],
  ['삼양라면', 'https://www.samyangfoods.com/upload/product/20230912/20230912173938561416.jpg', 'https://www.samyangfoods.com/kor/brand/list.do?searchCateCd1=45', 'Samyang Foods'],
  ['짜짜로니', 'https://www.samyangfoods.com/upload/product/20231117/20231117143446802501.jpg', 'https://www.samyangfoods.com/kor/brand/list.do?searchCateCd1=45', 'Samyang Foods'],
  ['간짬뽕', 'https://www.samyangfoods.com/upload/product/20240105/20240105135812942004.jpg', 'https://www.samyangfoods.com/kor/brand/list.do?searchCateCd1=45', 'Samyang Foods'],
  ['나가사끼짬뽕', 'https://www.samyangfoods.com/upload/product/20250110/20250110104438613123.jpg', 'https://www.samyangfoods.com/kor/brand/list.do?searchCateCd1=45', 'Samyang Foods'],
  ['맵탱 마늘조개라면', 'https://www.samyangfoods.com/upload/product/20250404/20250404142535191229.jpg', 'https://www.samyangfoods.com/kor/brand/list.do?searchCateCd1=45', 'Samyang Foods'],
  ['육개장', 'https://www.samyangfoods.com/upload/product/20250110/20250110104404198119.jpg', 'https://www.samyangfoods.com/kor/brand/list.do?searchCateCd1=45', 'Samyang Foods'],
  ['삼양1963', 'https://www.samyangfoods.com/upload/product/20251028/20251028144634493287.png', 'https://www.samyangfoods.com/kor/brand/list.do?searchCateCd1=45', 'Samyang Foods'],
  ['꼬깔콘', 'https://webimage.ldcc.co.kr/upload/conf/upload/2024/11/12/20241112c8a1df1b15ab442.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC400', 'Lotte Wellfood'],
  ['치토스', 'https://webimage.ldcc.co.kr/upload/conf/upload/2020/12/16/2020121617c35659852b48c.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC400', 'Lotte Wellfood'],
  ['오잉', 'https://webimage.ldcc.co.kr/upload/conf/upload/2020/12/16/20201216a0c7e9aae38a49a.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC400', 'Lotte Wellfood'],
  ['쌀로별', 'https://webimage.ldcc.co.kr/upload/conf/upload/2022/06/23/20220623d0246741a0e54b1.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC400', 'Lotte Wellfood'],
  ['도리토스', 'https://webimage.ldcc.co.kr/upload/conf/upload/2020/12/16/2020121657553cce81df426.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC400', 'Lotte Wellfood'],
  ['빼빼로', 'https://webimage.ldcc.co.kr/upload/conf/upload/2022/06/23/2022062373d4c0ce28a84c2.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC300', 'Lotte Wellfood'],
  ['빈츠', 'https://webimage.ldcc.co.kr/upload/conf/upload/2020/12/16/202012168143b05391414b3.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC300', 'Lotte Wellfood'],
  ['칙촉', 'https://webimage.ldcc.co.kr/upload/conf/upload/2022/09/15/2022091559ca4852cadf45e.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC300', 'Lotte Wellfood'],
  ['마가렛트', 'https://webimage.ldcc.co.kr/upload/conf/upload/2022/09/16/20220916dd7e3a80d5f2427.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC300', 'Lotte Wellfood'],
  ['가나', 'https://webimage.ldcc.co.kr/upload/conf/upload/2022/06/20/202206207bc3d7511aaf402.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC600', 'Lotte Wellfood'],
  ['ABC 초콜릿', 'https://webimage.ldcc.co.kr/upload/conf/upload/2020/12/16/20201216c6b6fa6cf21e49f.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC600', 'Lotte Wellfood'],
  ['크런키', 'https://webimage.ldcc.co.kr/upload/conf/upload/2024/05/30/202405303a5131db04fc403.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC600', 'Lotte Wellfood'],
  ['말랑카우', 'https://webimage.ldcc.co.kr/upload/conf/upload/2024/06/12/2024061260bcb4db9480425.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC200', 'Lotte Wellfood'],
  ['자일리톨', 'https://webimage.ldcc.co.kr/upload/conf/upload/2024/06/10/20240610cb54386b266441f.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC100', 'Lotte Wellfood'],
  ['메로나', 'https://www.bing.co.kr/upload/product/taste_melona_original.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae'],
  ['투게더', 'https://www.bing.co.kr/upload/product/taste_together_original.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae'],
  ['붕어싸만코', 'https://www.bing.co.kr/upload/brand/2024/05/e78ba32c-594a-4530-884e-ab62402fd6cf.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae'],
  ['비비빅', 'https://www.bing.co.kr/upload/product/taste_bibibig_original.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae'],
  ['빵또아', 'https://www.bing.co.kr/upload/brand/2024/05/e8efd75a-9524-4c03-8928-84155e8d9302.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae'],
  ['더위사냥', 'https://www.bing.co.kr/upload/brand/2026/05/172c4ad2-0bea-41d5-b008-690ce019bcac.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae'],
  ['엑설런트', 'https://www.bing.co.kr/upload/product/taste_excellent_original.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae'],
  ['쿠앤크', 'https://www.bing.co.kr/upload/product/taste_cookiecream_original.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae'],
  ['엔초', 'https://www.bing.co.kr/upload/product/taste_encho_original.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae'],
  ['바밤바', 'https://www.bing.co.kr/upload/brand/2026/03/caac679b-536c-4d9e-91a6-11955f81cefe.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae'],
  ['월드콘', 'https://webimage.ldcc.co.kr/upload/conf/upload/2025/11/26/20251126818c6758179b48c.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC700', 'Lotte Wellfood'],
  ['돼지바', 'https://webimage.ldcc.co.kr/upload/conf/upload/2022/07/05/20220705529535040d564bf.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC700', 'Lotte Wellfood'],
  ['빠삐코', 'https://webimage.ldcc.co.kr/upload/conf/upload/2022/07/05/20220705c12c19560fdf493.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC700', 'Lotte Wellfood'],
  ['설레임', 'https://webimage.ldcc.co.kr/upload/conf/upload/2022/06/30/2022063094c02ddad2f74bf.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC700', 'Lotte Wellfood'],
  ['찰떡아이스', 'https://webimage.ldcc.co.kr/upload/conf/upload/2022/06/30/202206308fb81403a5924dc.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC700', 'Lotte Wellfood'],
  ['티코', 'https://webimage.ldcc.co.kr/upload/conf/upload/2025/11/26/2025112616d998f2f0d64f0.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC700', 'Lotte Wellfood'],
  ['죠크박바', 'https://webimage.ldcc.co.kr/upload/conf/upload/2024/08/08/202408088141d33615884e7.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC700', 'Lotte Wellfood'],
  ['메가톤', 'https://webimage.ldcc.co.kr/upload/conf/upload/2024/08/08/2024080854a37348fa7c4e3.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC700', 'Lotte Wellfood'],
  ['빵빠레', 'https://webimage.ldcc.co.kr/upload/conf/upload/2022/07/05/20220705502633d1e1ed465.png', 'https://www.lottewellfood.com/brand/product?searchType1=LC700', 'Lotte Wellfood'],
  ['누가바', 'https://www.bing.co.kr/upload/brand/2026/04/e2b19b47-f595-4946-a32f-1ab21a48ce69.png', 'https://www.bing.co.kr/product/list?type=1', 'Binggrae']
];

const SNACK_FOOD_MASK_GROUPS = [
  {
    names: ['신라면', '신라면 블랙', '짜파게티', '너구리', '안성탕면', '김치라면', '불닭볶음면', '까르보불닭볶음면', '로제불닭볶음면', '삼양라면', '짜짜로니', '간짬뽕', '나가사끼짬뽕', '맵탱 마늘조개라면', '육개장', '삼양1963'],
    areas: [{ x: 26, y: 36, width: 48, height: 15 }]
  },
  {
    names: ['꼬깔콘', '치토스', '오잉', '쌀로별', '도리토스', '빼빼로', '빈츠', '칙촉', '마가렛트', '가나', 'ABC 초콜릿', '크런키', '말랑카우', '자일리톨'],
    areas: [{ x: 29, y: 38, width: 42, height: 13 }]
  },
  {
    names: ['메로나', '비비빅', '빵또아', '더위사냥', '쿠앤크', '엔초', '바밤바', '돼지바', '빠삐코', '설레임', '찰떡아이스', '죠크박바', '메가톤', '빵빠레', '누가바'],
    areas: [{ x: 30, y: 38, width: 40, height: 13 }]
  },
  {
    names: ['투게더', '붕어싸만코', '엑설런트', '월드콘', '티코'],
    areas: [{ x: 31, y: 32, width: 38, height: 12 }]
  }
];

function getSnackFoodMaskAreas(answer) {
  const group = SNACK_FOOD_MASK_GROUPS.find(item => item.names.includes(answer));
  return group ? group.areas : [{ x: 22, y: 34, width: 56, height: 20 }];
}

function snackFoodImageMeta([answer, imageUrl, imageSourceUrl, imageProvider]) {
  return {
    imageUrl,
    imageSourceUrl,
    imageProvider,
    imageCredit: `${imageProvider} official product image`,
    imageMaskAreas: getSnackFoodMaskAreas(answer)
  };
}

const CULTURAL_HERITAGE_HINTS = {
  경복궁: '조선 시대의 대표 궁궐로 서울 광화문 뒤에 있습니다.',
  창덕궁: '조선 궁궐 중 자연과 어우러진 후원으로 유명합니다.',
  창경궁: '서울 종로에 있는 조선 궁궐로 창덕궁과 이웃해 있습니다.',
  덕수궁: '서울 시청 근처에 있으며 석조전 같은 근대식 건물이 함께 있습니다.',
  종묘: '조선 왕과 왕비의 신주를 모신 제사를 지내던 곳입니다.',
  숭례문: '서울 도성의 남쪽 큰 문으로 남대문이라고도 불립니다.',
  흥인지문: '서울 도성의 동쪽 문으로 동대문이라고도 불립니다.',
  '수원 화성': '정조와 관련 깊은 성곽으로 경기도 수원에 있습니다.',
  불국사: '경주에 있는 신라 불교 문화유산으로 다보탑과 석가탑이 유명합니다.',
  석굴암: '경주 토함산에 있는 석굴 사원으로 본존불이 유명합니다.',
  문무대왕릉: '삼국 통일 뒤 바다에 묻혔다고 전해지는 신라 왕의 능입니다.',
  '관촉사 석조미륵보살입상': '충남 논산 관촉사에 있는 큰 석조 불상입니다.',
  돈암서원: '충남 논산에 있는 조선 시대 서원입니다.',
  근정전: '경복궁의 중심 건물로 왕의 공식 행사가 열리던 곳입니다.',
  '창덕궁 후원': '창덕궁 안쪽의 정원으로 자연 지형을 살린 궁궐 정원입니다.',
  '덕수궁 석조전': '덕수궁 안에 있는 서양식 석조 건물입니다.',
  '원각사지 십층석탑': '서울 탑골공원에 있는 고려 시대 석탑입니다.',
  첨성대: '경주에 있는 신라 시대 천문 관측 시설입니다.',
  다보탑: '경주 불국사에 있는 독특한 모양의 석탑입니다.',
  석가탑: '경주 불국사에 있는 삼층석탑으로 무구정광대다라니경과 관련이 있습니다.',
  성덕대왕신종: '에밀레종이라고도 불리는 신라 시대의 큰 종입니다.',
  팔만대장경: '고려 시대에 만든 불교 경전 목판으로 해인사에 보관되어 있습니다.',
  직지심체요절: '현존하는 세계에서 가장 오래된 금속 활자 인쇄본으로 알려져 있습니다.',
  '공주 공산성': '백제 웅진 시기와 관련 깊은 공주의 산성입니다.',
  '미륵사지 석탑': '전북 익산 미륵사지에 있는 백제 계열의 석탑입니다.',
  '동궁과 월지': '경주에 있는 신라 왕궁의 별궁 터와 연못입니다.',
  '청자 상감운학문 매병': '고려청자의 대표 작품으로 구름과 학 무늬가 새겨져 있습니다.',
  '백자 달항아리': '조선 시대 흰 백자로 둥근 달처럼 생긴 항아리입니다.',
  '신라 금관': '신라 왕족의 무덤에서 나온 금으로 만든 관입니다.',
  천마도: '신라 천마총에서 나온 말 그림 장식입니다.',
  무령왕릉: '백제 무령왕과 왕비의 무덤으로 공주에 있습니다.',
  백제금동대향로: '백제의 섬세한 금속 공예를 보여 주는 향로입니다.',
  '훈민정음 해례본': '한글을 만든 원리와 사용법을 설명한 책입니다.',
  난중일기: '이순신 장군이 임진왜란 중에 쓴 일기입니다.',
  동의보감: '허준이 편찬한 조선 시대 의학서입니다.',
  인왕제색도: '정선이 비 온 뒤 인왕산의 모습을 그린 그림입니다.',
  분청사기: '조선 전기에 많이 만들어진 자유로운 무늬의 도자기입니다.',
  '익산 왕궁리 오층석탑': '전북 익산 왕궁리 유적에 있는 오층석탑입니다.',
  '법주사 팔상전': '충북 보은 법주사에 있는 목조 탑 형식의 건물입니다.',
  '부석사 무량수전': '경북 영주 부석사에 있는 오래된 목조 건물입니다.',
  하회탈: '안동 하회마을의 탈놀이에 쓰인 전통 탈입니다.',
  고려청자: '고려 시대의 대표 도자기로 푸른빛 유약이 특징입니다.',
  대동여지도: '김정호가 만든 조선 시대의 자세한 지도입니다.',
  측우기: '비가 내린 양을 재기 위해 만든 조선 시대 과학 기구입니다.',
  칠지도: '가지가 일곱 개인 칼 모양의 백제 관련 유물입니다.',
  금동미륵보살반가사유상: '한쪽 다리를 올리고 생각하는 자세의 불상입니다.',
  앙부일구: '해의 그림자로 시간을 재던 조선 시대 해시계입니다.',
  '고구려 고분 벽화': '고구려 무덤 안에 그려진 생활과 신앙을 보여 주는 그림입니다.',
  '김홍도 풍속화': '조선 후기 사람들의 생활 모습을 담은 그림입니다.',
  용비어천가: '조선 왕조의 시작을 노래한 한글 문학 작품입니다.',
  조선왕조실록: '조선 시대 왕들의 일을 날짜순으로 기록한 역사책입니다.',
  승정원일기: '조선 시대 왕명 출납 기관인 승정원의 날마다의 기록입니다.',
  '해인사 장경판전': '팔만대장경 목판을 보관하기 위해 만든 해인사의 건물입니다.',
  '고창 고인돌 유적': '선사 시대 무덤인 고인돌이 많이 모여 있는 유적입니다.',
  하회마을: '경북 안동에 있는 전통 마을로 하회탈과 함께 유명합니다.',
  양동마을: '경북 경주에 있는 조선 시대 전통 마을입니다.',
  화성행궁: '정조가 수원 화성에 머물 때 사용하던 임시 궁궐입니다.',
  광화문: '경복궁의 정문으로 서울의 대표적인 궁궐 문입니다.',
  '강화 고인돌': '강화도에 남아 있는 선사 시대 고인돌 유적입니다.',
  송광사: '전남 순천에 있는 오래된 사찰입니다.',
  해인사: '경남 합천에 있는 사찰로 팔만대장경과 장경판전이 유명합니다.',
  통도사: '경남 양산에 있는 큰 사찰로 부처의 진신사리와 관련이 깊습니다.',
  '봉정사 극락전': '안동 봉정사에 있는 오래된 목조 건물입니다.',
  '화엄사 각황전': '전남 구례 화엄사에 있는 큰 불전 건물입니다.',
  황룡사지: '경주에 있던 신라의 큰 절터입니다.',
  '감은사지 삼층석탑': '문무왕과 관련 있는 감은사 터의 삼층석탑입니다.',
  '정림사지 오층석탑': '백제 석탑의 아름다움을 보여 주는 부여의 석탑입니다.',
  '탑평리 칠층석탑': '충주에 있는 통일신라 시대의 칠층석탑입니다.',
  '월정사 팔각구층석탑': '강원 평창 월정사에 있는 팔각형 구층석탑입니다.',
  천상열차분야지도: '하늘의 별자리를 새긴 조선 시대 천문도입니다.',
  자격루: '조선 시대에 만든 자동 물시계입니다.',
  동궐도: '창덕궁과 창경궁의 모습을 자세히 그린 그림입니다.',
  몽유도원도: '안견이 꿈속의 복숭아꽃 마을을 그린 그림입니다.',
  금동대탑: '금동으로 만든 작은 탑 모양의 불교 공예품입니다.',
  '고려대학교 본관': '근대 건축물로 문화재로 지정된 학교 건물입니다.',
  '서울역 구역사': '일제강점기에 지어진 옛 서울역 건물입니다.',
  독립문: '독립협회가 세운 문으로 자주독립의 뜻을 담고 있습니다.',
  명동성당: '서울 명동에 있는 대표적인 근대 성당 건축물입니다.',
  '전주 경기전': '조선 태조 이성계의 어진을 모신 곳입니다.',
  오죽헌: '신사임당과 율곡 이이와 관련 깊은 강릉의 집입니다.',
  도산서원: '퇴계 이황을 기리기 위해 세운 안동의 서원입니다.',
  소수서원: '우리나라 최초의 사액서원으로 알려진 영주의 서원입니다.',
  병산서원: '서애 류성룡과 관련 깊은 안동의 서원입니다.',
  옥산서원: '회재 이언적을 기리기 위해 세운 경주의 서원입니다.',
  '무위사 극락보전': '강진 무위사에 있는 조선 전기의 불전 건물입니다.',
  '수덕사 대웅전': '예산 수덕사에 있는 오래된 목조 건물입니다.',
  '개심사 대웅전': '서산 개심사에 있는 조선 시대 목조 건물입니다.',
  '강릉 임영관 삼문': '강릉에 남아 있는 고려 시대 관아 건축물입니다.',
  '경천사지 십층석탑': '국립중앙박물관에 있는 고려 시대 십층석탑입니다.',
  대흥사: '전남 해남에 있는 오래된 사찰입니다.',
  마곡사: '충남 공주에 있는 산사 문화유산입니다.',
  선암사: '전남 순천에 있는 오래된 산사입니다.',
  '용주사 동종': '경기 화성 용주사에 있는 조선 시대 종입니다.',
  '보림사 삼층석탑': '전남 장흥 보림사에 있는 남북 삼층석탑과 석등입니다.',
  '금산사 미륵전': '전북 김제 금산사에 있는 여러 층처럼 보이는 불전입니다.',
  '관룡사 용선대 석조여래좌상': '창녕 관룡사 근처 바위 위에 있는 석조 불상입니다.',
  진주성: '임진왜란과 관련 깊은 경남 진주의 성입니다.',
  촉석루: '진주성 안에 있는 누각입니다.',
  북한산성: '북한산에 쌓은 조선 시대 산성입니다.',
  정동교회: '서울 정동에 있는 대표적인 근대 교회 건축물입니다.'
};

const CULTURAL_HERITAGE_FOCUS_HINTS = {
  경복궁: '궁궐의 큰 문과 전각 배치를 살펴보세요.',
  창덕궁: '자연 지형과 어우러진 궁궐 모습을 살펴보세요.',
  창경궁: '서울의 조선 궁궐 중 하나라는 점을 떠올려 보세요.',
  덕수궁: '근대식 건물과 전통 궁궐이 함께 있는 곳입니다.',
  종묘: '왕실 제사를 지내던 긴 건물 배치를 살펴보세요.',
  숭례문: '서울 도성의 남쪽 문이라는 점을 떠올려 보세요.',
  흥인지문: '서울 도성의 동쪽 문이라는 점을 떠올려 보세요.',
  '수원 화성': '성곽과 누각이 이어진 모습을 살펴보세요.',
  불국사: '사찰과 탑이 함께 보이는 경주의 대표 유산입니다.',
  석굴암: '석굴 안 불상의 모습이 핵심 단서입니다.',
  문무대왕릉: '바다 가운데 있는 왕릉이라는 점을 떠올려 보세요.',
  '관촉사 석조미륵보살입상': '아주 큰 석조 불상의 모습을 살펴보세요.',
  돈암서원: '조선 시대 학문 공간인 서원의 건물을 떠올려 보세요.',
  근정전: '경복궁의 중심 전각이라는 점을 떠올려 보세요.',
  '창덕궁 후원': '궁궐 안 정원과 연못의 조화를 살펴보세요.',
  '덕수궁 석조전': '서양식 석조 건물의 모습이 단서입니다.',
  '원각사지 십층석탑': '도심 공원 안의 높은 석탑을 살펴보세요.',
  첨성대: '병 모양에 가까운 신라 시대 관측 시설입니다.',
  다보탑: '불국사에 있는 독특한 모양의 석탑입니다.',
  석가탑: '불국사에 있는 균형 잡힌 삼층석탑입니다.',
  성덕대왕신종: '큰 종의 형태와 장식을 살펴보세요.',
  팔만대장경: '나무판에 새긴 불교 경전이라는 점을 떠올려 보세요.',
  직지심체요절: '금속 활자 인쇄본의 책장을 살펴보세요.',
  '공주 공산성': '백제와 관련 깊은 산성의 모습을 살펴보세요.',
  '미륵사지 석탑': '익산의 큰 석탑이라는 점을 떠올려 보세요.',
  '동궁과 월지': '밤에 비친 연못과 궁궐 터의 모습이 단서입니다.',
  '청자 상감운학문 매병': '푸른 도자기와 구름, 학 무늬를 살펴보세요.',
  '백자 달항아리': '둥글고 흰 항아리 모양이 핵심 단서입니다.',
  '신라 금관': '나뭇가지 모양 장식이 달린 금관을 살펴보세요.',
  천마도: '하늘을 달리는 말 그림을 떠올려 보세요.',
  무령왕릉: '백제 왕릉의 벽돌무덤 구조를 살펴보세요.',
  백제금동대향로: '봉황과 산 모양 장식이 있는 금속 향로입니다.',
  '훈민정음 해례본': '한글 창제 원리를 설명한 옛 책의 글자를 살펴보세요.',
  난중일기: '이순신 장군의 기록이라는 점을 떠올려 보세요.',
  동의보감: '조선 시대 의학서의 책 모습을 살펴보세요.',
  인왕제색도: '먹으로 그린 산의 묵직한 모습을 살펴보세요.',
  분청사기: '흰 무늬가 자유롭게 들어간 도자기입니다.',
  '익산 왕궁리 오층석탑': '다섯 층으로 올라간 석탑 모양을 살펴보세요.',
  '법주사 팔상전': '나무로 만든 여러 층의 탑 같은 건물입니다.',
  '부석사 무량수전': '오래된 목조 건물의 지붕과 기둥을 살펴보세요.',
  하회탈: '사람 얼굴 모양의 전통 탈을 살펴보세요.',
  고려청자: '맑은 푸른빛 도자기 색을 살펴보세요.',
  대동여지도: '접었다 펼 수 있는 큰 지도 모양이 단서입니다.',
  측우기: '비의 양을 재는 그릇 모양 장치를 살펴보세요.',
  칠지도: '가지가 여러 갈래로 뻗은 칼 모양입니다.',
  금동미륵보살반가사유상: '한쪽 다리를 올리고 생각하는 자세를 살펴보세요.',
  앙부일구: '그릇처럼 오목한 해시계 모양이 단서입니다.',
  '고구려 고분 벽화': '무덤 벽에 그려진 옛 그림을 살펴보세요.',
  '김홍도 풍속화': '조선 시대 사람들의 생활 장면을 살펴보세요.',
  용비어천가: '한글로 적힌 오래된 책장을 살펴보세요.',
  조선왕조실록: '왕의 일을 기록한 두꺼운 역사책 표지를 살펴보세요.',
  승정원일기: '조선 시대 관청 기록물의 책장을 떠올려 보세요.',
  '해인사 장경판전': '대장경 목판을 보관한 긴 목조 건물을 살펴보세요.',
  '고창 고인돌 유적': '큰 돌을 괴어 만든 선사 시대 무덤입니다.',
  하회마을: '기와집과 초가가 어우러진 전통 마을 모습입니다.',
  양동마을: '언덕과 마을 집들이 이어진 전통 마을을 살펴보세요.',
  화성행궁: '수원 화성과 함께 있는 궁궐 건물을 떠올려 보세요.',
  광화문: '경복궁 앞의 큰 문과 현판을 살펴보세요.',
  '강화 고인돌': '넓은 덮개돌을 올린 고인돌 모양이 단서입니다.',
  송광사: '산속 사찰의 전각과 마당을 살펴보세요.',
  해인사: '팔만대장경으로 유명한 합천의 사찰입니다.',
  통도사: '큰 사찰의 문과 전각 배치를 살펴보세요.',
  '봉정사 극락전': '오래된 목조 건물의 낮은 지붕을 살펴보세요.',
  '화엄사 각황전': '크고 웅장한 사찰 전각이 핵심 단서입니다.',
  황룡사지: '경주에 남은 넓은 절터를 떠올려 보세요.',
  '감은사지 삼층석탑': '절터에 서 있는 두 삼층석탑을 살펴보세요.',
  '정림사지 오층석탑': '백제의 날렵한 오층석탑 모양을 살펴보세요.',
  '탑평리 칠층석탑': '높게 올라간 칠층석탑의 층수를 살펴보세요.',
  '월정사 팔각구층석탑': '팔각형으로 높게 올라간 석탑입니다.',
  천상열차분야지도: '별자리가 새겨진 둥근 천문도 그림을 살펴보세요.',
  자격루: '물을 이용해 시간을 재는 장치를 떠올려 보세요.',
  동궐도: '궁궐 전체를 위에서 내려다본 듯한 그림입니다.',
  몽유도원도: '꿈속 풍경처럼 이어지는 산수화를 살펴보세요.',
  금동대탑: '금빛의 작은 탑 모양 공예품입니다.',
  '고려대학교 본관': '석조 학교 건물의 근대 건축 양식을 살펴보세요.',
  '서울역 구역사': '붉은 벽돌과 돔 지붕의 옛 역사를 살펴보세요.',
  독립문: '서대문 근처의 석조 아치형 문입니다.',
  명동성당: '뾰족한 첨탑이 있는 고딕 양식 성당입니다.',
  '전주 경기전': '어진을 모신 전주의 전통 건물을 살펴보세요.',
  오죽헌: '검은 대나무와 오래된 한옥이 있는 강릉의 집입니다.',
  도산서원: '퇴계 이황과 관련 있는 안동의 서원입니다.',
  소수서원: '우리나라 서원 중 매우 이른 시기의 서원입니다.',
  병산서원: '낙동강을 바라보는 서원 건축을 떠올려 보세요.',
  옥산서원: '경주의 조선 시대 서원 건물을 살펴보세요.',
  '무위사 극락보전': '소박한 목조 불전의 정면을 살펴보세요.',
  '수덕사 대웅전': '오래된 목조 대웅전의 지붕과 기둥이 단서입니다.',
  '개심사 대웅전': '서산의 산사 안 목조 불전을 떠올려 보세요.',
  '강릉 임영관 삼문': '세 칸으로 나뉜 오래된 관아 문입니다.',
  '경천사지 십층석탑': '박물관 안에 있는 높은 십층석탑입니다.',
  대흥사: '해남의 산사 전각과 자연 풍경을 살펴보세요.',
  마곡사: '공주의 산사와 전각 배치를 떠올려 보세요.',
  선암사: '순천의 오래된 산사 입구와 전각을 살펴보세요.',
  '용주사 동종': '사찰에 있는 큰 금속 종 모양이 단서입니다.',
  '보림사 삼층석탑': '두 석탑과 석등이 함께 있는 모습을 살펴보세요.',
  '금산사 미륵전': '여러 층처럼 보이는 큰 불전 건물입니다.',
  '관룡사 용선대 석조여래좌상': '바위 위에 앉은 석조 불상을 살펴보세요.',
  진주성: '성문과 성곽이 이어진 진주의 성입니다.',
  촉석루: '진주성 안 강가에 있는 누각입니다.',
  북한산성: '북한산 능선을 따라 쌓은 산성입니다.',
  정동교회: '붉은 벽돌의 근대 교회 건물입니다.'
};

function normalizeCulturalHeritageImageEntry(entry) {
  if(Array.isArray(entry)) {
    const [answer, imageUrl, imageSourceUrl] = entry;
    return {
      answer,
      imageUrl,
      imageSourceUrl,
      ...CULTURAL_HERITAGE_IMAGE_SOURCE_DEFAULTS
    };
  }
  return {
    ...CULTURAL_HERITAGE_IMAGE_SOURCE_DEFAULTS,
    ...entry
  };
}

function buildTermQuestions(quizId, entries, subjectLabel, options = {}) {
  const questionCount = Number(options.questionCount) || DEFAULT_QUESTIONS_PER_QUIZ;
  const variantsPerEntry = Number(options.variantsPerEntry) || Math.ceil(questionCount / Math.max(1, entries.length));
  const getHint = typeof options.getHint === 'function' ? options.getHint : term => term;
  const includeExplanation = options.includeExplanation !== false;
  const terms = entries.map(item => item[0]);
  const meanings = entries.map(item => item[1]);
  const questions = [];
  entries.forEach(([term, meaning], index) => {
    for (let variant = 0; variant < variantsPerEntry; variant += 1) {
      const order = questions.length + 1;
      const asksTerm = variant % 2 === 0;
      const correct = asksTerm ? term : meaning;
      const pool = asksTerm ? terms : meanings;
      const prompt = asksTerm
        ? `'${meaning}'에 알맞은 말은 무엇인가요?`
        : `'${term}'의 뜻으로 알맞은 것은 무엇인가요?`;
      questions.push(makeChoiceQuestion(quizId, order, prompt, correct, pool, getHint(term, meaning), includeExplanation ? meaning : ''));
    }
  });
  return questions.slice(0, questionCount);
}

function buildSpacingQuestions() {
  const questions = [];
  SPACING.forEach(([correct, incorrect], index) => {
    for (let variant = 0; variant < 10; variant += 1) {
      const order = questions.length + 1;
      const prompt = variant % 2 === 0
        ? `다음 표현을 바르게 띄어 쓰세요: ${incorrect}`
        : `빈칸 없이 붙어 있는 표현을 바르게 띄어 쓰세요: ${incorrect.replace(/\s+/g, '')}`;
      questions.push(makeInputQuestion(
        'spacing',
        order,
        prompt,
        correct,
        [correct.replace(/\s+/g, ' ').trim()],
        '',
        ''
      ));
    }
  });
  return questions.slice(0, DEFAULT_QUESTIONS_PER_QUIZ);
}

function makeFractionToken(numerator, denominator) {
  return `{{frac:${numerator}/${denominator}}}`;
}

function hasFinalConsonant(value) {
  const char = String(value || '').trim().slice(-1);
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function subjectParticle(value) {
  return hasFinalConsonant(value) ? '이' : '가';
}

function objectParticle(value) {
  return hasFinalConsonant(value) ? '을' : '를';
}

function withParticle(value) {
  return hasFinalConsonant(value) ? '과' : '와';
}

function topicParticle(value) {
  return hasFinalConsonant(value) ? '은' : '는';
}

function pushFractionChoiceQuestion(questions, prompt, answer, pool) {
  const order = questions.length + 1;
  questions.push(makeChoiceQuestion('fraction-basic', order, prompt, String(answer), pool.map(String), '', ''));
}

function buildFractionQuestions() {
  const questions = [];
  const foods = ['피자', '초콜릿', '수박', '케이크', '색종이', '쿠키', '빵', '찰흙'];
  const names = ['민수', '지아', '서준', '하린', '도윤', '서아', '유찬', '나연'];
  const denominatorChoices = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
  const numeratorChoices = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  for (let denominator = 2; denominator <= 11; denominator += 1) {
    for (let numerator = 1; numerator < denominator; numerator += 1) {
      const index = questions.length;
      const food = foods[index % foods.length];
      const name = names[index % names.length];
      const nameSubject = `${name}${subjectParticle(name)}`;
      const foodObject = `${food}${objectParticle(food)}`;
      const fraction = makeFractionToken(numerator, denominator);
      pushFractionChoiceQuestion(
        questions,
        `${foodObject} 똑같이 ${denominator}조각으로 나누고 ${nameSubject} ${numerator}조각을 먹었습니다. ${nameSubject} 먹은 양을 분수로 나타내면 분자는 몇인가요?`,
        numerator,
        numeratorChoices
      );
      if (questions.length >= DEFAULT_QUESTIONS_PER_QUIZ) return questions;
      pushFractionChoiceQuestion(
        questions,
        `${foodObject} 똑같이 ${denominator}조각으로 나눈 것 중 ${numerator}조각을 먹은 양은 ${fraction}입니다. 이 분수의 분모는 몇인가요?`,
        denominator,
        denominatorChoices
      );
      if (questions.length >= DEFAULT_QUESTIONS_PER_QUIZ) return questions;
      pushFractionChoiceQuestion(
        questions,
        `${nameSubject} 리본 ${denominator}칸 중 ${numerator}칸을 색칠했습니다. 색칠한 부분을 분수로 쓰면 무엇인가요?`,
        `${numerator}/${denominator}`,
        [
          `${numerator}/${denominator}`,
          `${Math.min(numerator + 1, denominator)}/${denominator}`,
          `${numerator}/${denominator + 1}`,
          `${denominator}/${numerator}`
        ]
      );
      if (questions.length >= DEFAULT_QUESTIONS_PER_QUIZ) return questions;
    }
  }
  while (questions.length < DEFAULT_QUESTIONS_PER_QUIZ) {
    const n = questions.length + 1;
    const denominator = 3 + (n % 7);
    const numerator = 1 + (n % (denominator - 1));
    const multiplier = 2 + (n % 3);
    const equivalentNumerator = numerator * multiplier;
    const equivalentDenominator = denominator * multiplier;
    pushFractionChoiceQuestion(
      questions,
      `${makeFractionToken(numerator, denominator)}과 크기가 같은 분수를 만들려고 합니다. 분모와 분자에 똑같이 ${multiplier}를 곱하면 새 분자는 몇인가요?`,
      equivalentNumerator,
      [equivalentNumerator, numerator + multiplier, equivalentDenominator, numerator * (multiplier + 1), equivalentNumerator + 1, Math.max(1, equivalentNumerator - 1)]
    );
    if (questions.length >= DEFAULT_QUESTIONS_PER_QUIZ) return questions;
    pushFractionChoiceQuestion(
      questions,
      `${makeFractionToken(numerator, denominator)}과 크기가 같은 분수는 ${makeFractionToken(equivalentNumerator, equivalentDenominator)}입니다. 새 분모는 몇인가요?`,
      equivalentDenominator,
      [equivalentDenominator, denominator + multiplier, equivalentNumerator, denominator * (multiplier + 1), equivalentDenominator + 1, Math.max(2, equivalentDenominator - 1)]
    );
  }
  return questions;
}

function buildDefinitionQuestions(quizId, entries, subjectLabel, questionCount) {
  return buildTermQuestions(quizId, entries, subjectLabel, {
    questionCount,
    variantsPerEntry: Math.ceil(questionCount / Math.max(1, entries.length)),
    getHint: () => '',
    includeExplanation: false
  });
}

function buildHistoryDirectPrompt(item) {
  const noun = item.type === 'person' ? '누구인가요'
    : item.type === 'heritage' ? '무엇인가요'
    : item.type === 'place' ? '어디인가요'
    : '무엇인가요';
  return `${item.clue}${topicParticle(item.clue)} ${noun}?`;
}

function buildHistoryRelationPrompt(item) {
  if (item.type === 'person') return `'${item.answer}'은 어떤 일을 한 인물인가요?`;
  if (item.type === 'heritage') return `'${item.answer}'은 어떤 문화유산인가요?`;
  if (item.type === 'place') return `'${item.answer}'은 어떤 장소인가요?`;
  if (item.type === 'country') return `'${item.answer}'는 어떤 나라인가요?`;
  if (item.type === 'era') return `'${item.answer}'는 어떤 시대를 가리키나요?`;
  return `'${item.answer}'${withParticle(item.answer)} 가장 관련 있는 설명은 무엇인가요?`;
}

function buildHistoryReviewPrompt(item) {
  if (item.type === 'person') return `${item.clue}. 이 인물의 이름은 무엇인가요?`;
  if (item.type === 'heritage') return `${item.clue}. 이 문화유산의 이름은 무엇인가요?`;
  if (item.type === 'place') return `${item.clue}. 이 장소의 이름은 무엇인가요?`;
  return `${item.clue}. 이 말은 무엇인가요?`;
}

function buildHistoryQuestions() {
  const answers = UNIFIED_SILLA_BALHAE.map(item => item.answer);
  const questions = [];
  UNIFIED_SILLA_BALHAE.forEach((item, index) => {
    for (let variant = 0; variant < 10; variant += 1) {
      const order = questions.length + 1;
      let prompt = '';
      if (variant % 3 === 0) {
        prompt = buildHistoryDirectPrompt(item);
        questions.push(makeChoiceQuestion('unified-silla-balhae', order, prompt, item.answer, answers, item.hint, item.clue));
      } else if (variant % 3 === 1) {
        prompt = buildHistoryRelationPrompt(item);
        const clues = UNIFIED_SILLA_BALHAE.map(entry => entry.clue);
        questions.push(makeChoiceQuestion('unified-silla-balhae', order, prompt, item.clue, clues, item.hint, item.clue));
      } else {
        prompt = buildHistoryReviewPrompt(item);
        questions.push(makeChoiceQuestion('unified-silla-balhae', order, prompt, item.answer, answers, item.hint, item.clue));
      }
    }
  });
  return questions.slice(0, 200);
}

function buildDirectSciencePrompt(prompt, variant) {
  const text = String(prompt || '').trim();
  const match = text.match(/^(.+?)(은|는) 무엇인가요\?$/);
  if (match) {
    const stem = match[1];
    const object = objectParticle(stem);
    const subject = subjectParticle(stem);
    const variants = [
      text,
      `${stem}${object} 고르세요.`,
      `${stem}${object} 무엇이라고 하나요?`,
      `${stem}의 이름은 무엇인가요?`,
      `${stem}${object} 나타내는 말은 무엇인가요?`
    ];
    return variants[variant % variants.length];
  }
  const variants = [
    text,
    text.replace(/\?$/, ' 알맞은 답을 고르세요.'),
    text.replace(/\?$/, ' 가장 알맞은 것은 무엇인가요?'),
    text.replace(/\?$/, ' 맞는 답은 무엇인가요?'),
    text.replace(/\?$/, ' 답을 고르세요.')
  ];
  return variants[variant % variants.length];
}

function buildScienceGeneralQuestions() {
  const questions = [];
  const variantsPerEntry = Math.ceil(DEFAULT_QUESTIONS_PER_QUIZ / SCIENCE_GENERAL.length);
  SCIENCE_GENERAL.forEach(([prompt, correct, choices]) => {
    for (let variant = 0; variant < variantsPerEntry; variant += 1) {
      const order = questions.length + 1;
      questions.push(makeChoiceQuestion('science-general', order, buildDirectSciencePrompt(prompt, variant), correct, choices, '', ''));
    }
  });
  return questions.slice(0, DEFAULT_QUESTIONS_PER_QUIZ);
}

function buildEmojiQuestions(quizId, entries, label) {
  const answers = entries.map(([answer]) => answer);
  return entries.slice(0, 50).map(([answer, aliases, emojis], index) => {
    const order = index + 1;
    return makeChoiceQuestion(
      quizId,
      order,
      emojis,
      answer,
      answers,
      '',
      ''
    );
  });
}

function buildCulturalHeritageQuestions() {
  const images = CULTURAL_HERITAGE_IMAGES.map(normalizeCulturalHeritageImageEntry);
  const answers = images.map(item => item.answer);
  const questions = [];
  for (let index = 0; questions.length < 100; index += 1) {
    const imageMeta = images[index % images.length];
    const answer = imageMeta.answer;
    const order = questions.length + 1;
    questions.push(makeImageChoiceQuestion(
      'cultural_heritage',
      order,
      '',
      answer,
      answers,
      imageMeta,
      CULTURAL_HERITAGE_HINTS[answer] || ''
    ));
  }
  return questions;
}

function buildFlagCountryQuestions() {
  const answers = FLAG_COUNTRIES.map(([, country]) => country);
  return FLAG_COUNTRIES.map(([code, country], index) => makeImageChoiceQuestion(
    'flag-country',
    index + 1,
    '',
    country,
    answers,
    flagImageMeta(code),
    '',
    `${country}의 국기를 보고 나라 이름을 고르는 이미지형 문제입니다.`
  ));
}

function buildSnackFoodQuestions() {
  const answers = SNACK_FOOD_ITEMS.map(([answer]) => answer);
  return SNACK_FOOD_ITEMS.map((item, index) => {
    const [answer] = item;
    return makeImageChoiceQuestion(
      'snack-food',
      index + 1,
      '',
      answer,
      answers,
      snackFoodImageMeta(item),
      '',
      `${answer}의 제품 이미지를 보고 이름을 고르는 간식 이미지형 문제입니다.`
    );
  });
}

function quizMeta(definition, questionCount = DEFAULT_QUESTIONS_PER_QUIZ) {
  const cycleQuestionCount = Number(definition.cycleQuestionCount) || questionCount;
  return {
    quizId: definition.quizId,
    title: definition.title,
    subject: definition.subject,
    category: definition.subject,
    type: 'sheet',
    uiType: definition.uiType || 'multipleChoice4',
    completionType: 'loop',
    badgeGroup: definition.subjectGroup,
    subjectGroup: definition.subjectGroup,
    questionCount: cycleQuestionCount,
    sourceQuestionCount: questionCount,
    active: true,
    order: definition.order,
    description: definition.description,
    migrationSource: SEED_SOURCE
  };
}

const QUIZ_DEFINITIONS = [
  { quizId: 'proverb', title: '속담 퀴즈', subject: '국어', subjectGroup: 'korean', order: 30, expectedQuestionCount: 200, cycleQuestionCount: 100, description: '속담의 뜻과 쓰임을 확인합니다.', questions: () => buildTermQuestions('proverb', PROVERBS, '속담', { getHint: () => '', includeExplanation: false }) },
  { quizId: 'spacing', title: '띄어쓰기 퀴즈', subject: '국어', subjectGroup: 'korean', order: 31, expectedQuestionCount: 200, cycleQuestionCount: 100, uiType: 'textInput', description: '올바른 띄어쓰기를 직접 입력합니다.', questions: buildSpacingQuestions },
  { quizId: 'idiom', title: '사자성어 퀴즈', subject: '국어', subjectGroup: 'korean', order: 32, expectedQuestionCount: 200, cycleQuestionCount: 100, description: '사자성어의 뜻과 쓰임을 확인합니다.', questions: () => buildTermQuestions('idiom', IDIOMS, '사자성어', { getHint: term => IDIOM_HINTS[term] || '', includeExplanation: true }) },
  { quizId: 'fraction-basic', title: '분수 퀴즈', subject: '수학', subjectGroup: 'math', order: 40, expectedQuestionCount: 200, cycleQuestionCount: 100, description: '초등학교 4학년 수준의 분수 개념을 이야기 문제로 확인합니다.', questions: buildFractionQuestions },
  { quizId: 'unified-silla-balhae', title: '통일신라~발해 역사 퀴즈', subject: '사회', subjectGroup: 'social', order: 50, expectedQuestionCount: 200, cycleQuestionCount: 100, description: '통일신라와 발해의 주요 개념을 확인합니다.', questions: buildHistoryQuestions },
  { quizId: 'cultural_heritage', title: '문화유산 이미지 퀴즈', subject: '사회', subjectGroup: 'social', order: 51, expectedQuestionCount: 100, cycleQuestionCount: 100, uiType: 'imageChoice', description: '사진을 보고 우리 문화유산의 이름을 4지선다로 맞힙니다.', questions: buildCulturalHeritageQuestions },
  { quizId: 'science-general', title: '과학 상식 퀴즈', subject: '과학', subjectGroup: 'science', order: 60, expectedQuestionCount: 200, cycleQuestionCount: 100, description: '초등학생이 알아두면 좋은 생활 과학 상식을 확인합니다.', questions: buildScienceGeneralQuestions },
  { quizId: 'flag-country', title: '국기 퀴즈', subject: '인기', subjectGroup: 'popular', order: 69, expectedQuestionCount: 100, cycleQuestionCount: 100, uiType: 'imageChoice', description: '국기를 보고 알맞은 나라 이름을 4지선다로 맞힙니다.', questions: buildFlagCountryQuestions },
  { quizId: 'snack-food', title: '간식 퀴즈', subject: '인기', subjectGroup: 'popular', order: 70, expectedQuestionCount: 50, cycleQuestionCount: 50, uiType: 'imageChoice', description: '라면, 과자, 아이스크림 이미지를 보고 알맞은 간식 이름을 4지선다로 맞힙니다.', questions: buildSnackFoodQuestions },
  { quizId: 'emoji-kpop', title: 'K-POP 이모지 퀴즈', subject: '인기', subjectGroup: 'popular', order: 71, expectedQuestionCount: 50, cycleQuestionCount: 50, description: '이모지 조합을 보고 K-POP 노래 제목을 객관식으로 맞힙니다.', questions: () => buildEmojiQuestions('emoji-kpop', EMOJI_KPOP, 'K-POP 노래') },
  { quizId: 'emoji-anime', title: '애니 이모지 퀴즈', subject: '인기', subjectGroup: 'popular', order: 72, expectedQuestionCount: 50, cycleQuestionCount: 50, description: '이모지 조합을 보고 애니 제목을 객관식으로 맞힙니다.', questions: () => buildEmojiQuestions('emoji-anime', EMOJI_ANIME, '애니') },
  { quizId: 'emoji-tiniping', title: '티니핑 이모지 퀴즈', subject: '인기', subjectGroup: 'popular', order: 73, expectedQuestionCount: 50, cycleQuestionCount: 50, description: '이모지 조합을 보고 티니핑 이름을 객관식으로 맞힙니다.', questions: () => buildEmojiQuestions('emoji-tiniping', EMOJI_TINIPING, '티니핑') }
];

const TITLE_BASES = [
  ['korean_proverb', '속담', 'korean', 'title-theme-spelling', ['속담 탐험가', '속담 박사', '속담 마스터']],
  ['korean_spacing', '띄어쓰기', 'korean', 'title-theme-spelling', ['띄어쓰기 지킴이', '띄어쓰기 박사', '띄어쓰기 마스터']],
  ['korean_idiom', '사자성어', 'korean', 'title-theme-spelling', ['사자성어 수집가', '사자성어 학자', '사자성어 마스터']],
  ['math_fraction_basic', '분수', 'math', 'title-theme-school', ['분수 탐험가', '분수 박사', '분수 마스터']],
  ['social_unified_silla_balhae', '남북국 역사', 'social', 'title-theme-people', ['남북국 탐험가', '남북국 학자', '남북국 역사의 신']],
  ['social_cultural_heritage', '문화유산', 'social', 'title-theme-people', ['문화유산 탐험가', '문화유산 해설가', '문화유산 지킴이']],
  ['science_general', '과학 상식', 'science', 'title-theme-school', ['과학 호기심 탐험가', '과학 상식 박사', '과학 상식 마스터']],
  ['popular_flag_country', '국기', 'popular', 'title-theme-school', ['국기 탐험가', '국기 박사', '세계 지도자']],
  ['popular_snack_food', '간식', 'popular', 'title-theme-school', ['간식 탐험가', '간식 감별사', '간식 마스터']],
  ['popular_emoji_kpop', 'K-POP 이모지', 'popular', 'title-theme-idol', ['K-POP 팬', 'K-POP DJ', 'K-POP 마스터']],
  ['popular_emoji_anime', '애니 이모지', 'popular', 'title-theme-anime', ['애니 팬', '애니 해석가', '애니 마스터']],
  ['popular_emoji_tiniping', '티니핑 이모지', 'popular', 'title-theme-tiniping', ['티니핑 팬', '티니핑 요정', '티니핑 마스터']]
];

const EMOJI_TOTAL_TITLE_BASES = [
  ['popular_emoji_kpop_total', 'K-POP 종합', 'kpop', 'title-theme-kpop-legend', ['케이팝 문화 선구자', '케이팝 문화 리더', '케이팝 사업가']],
  ['popular_emoji_anime_total', '애니 종합', 'anime', 'title-theme-anime-legend', ['애니 탐구자', '애니 제작가', '애니메이션 기업가']],
  ['popular_emoji_tiniping_total', '티니핑 종합', 'tiniping', 'title-theme-tiniping-legend', ['티니핑 마니아', '티니핑 제작자', '티니핑 후원자']]
];

function buildTitleCatalog() {
  const tiers = [
    [1, 'title-tier-1', '', '1회 완주'],
    [3, 'title-tier-3', 'title-effect-marquee', '3회 완주'],
    [5, 'title-tier-5', 'title-effect-neon', '5회 완주']
  ];
  const practiceTitles = TITLE_BASES.flatMap(([prefix, label, subjectGroup, themeClass, names], baseIndex) => tiers.map(([stars, tierClass, effectClass, condition], tierIndex) => ({
    titleId: `${prefix}_${stars}`,
    titleName: names[tierIndex],
    category: '연습',
    theme: label,
    themeClass,
    tier: tierIndex + 1,
    tierClass,
    effectClass,
    source: SEED_SOURCE,
    sourceType: 'practiceStars',
    subjectGroup,
    conditionText: `${label} ${condition}`,
    description: `${label} 연습 뱃지 ${condition} 시 획득합니다.`,
    requiredBadgeCount: stars,
    order: 700 + baseIndex * 10 + tierIndex,
    active: true,
    migrationSource: SEED_SOURCE
  })));
  const totalTiers = [
    [3, 'title-tier-3', 'title-effect-marquee', '3회 완주'],
    [6, 'title-tier-5', 'title-effect-neon', '6회 완주'],
    [9, 'title-tier-5', 'title-effect-neon title-effect-marquee', '9회 완주']
  ];
  const totalTitles = EMOJI_TOTAL_TITLE_BASES.flatMap(([prefix, label, sourceCategory, themeClass, names], baseIndex) => totalTiers.map(([count, tierClass, effectClass, condition], tierIndex) => ({
    titleId: `${prefix}_${count}`,
    titleName: names[tierIndex],
    category: '종합',
    theme: label,
    themeClass,
    tier: tierIndex + 1,
    tierClass,
    effectClass,
    source: SEED_SOURCE,
    sourceType: 'emojiCombinedCompletions',
    sourceCategory,
    subjectGroup: 'popular',
    conditionText: `${label} 연습+랭킹 ${condition}`,
    description: `${label} 연습 완주와 랭킹전 완주 합계 ${count}회 시 획득합니다.`,
    requiredCompletionCount: count,
    order: 820 + baseIndex * 10 + tierIndex,
    active: true,
    migrationSource: SEED_SOURCE
  })));
  return [...practiceTitles, ...totalTitles];
}

function buildModel(quizIds = []) {
  const allow = new Set(quizIds);
  const selected = QUIZ_DEFINITIONS.filter(definition => !allow.size || allow.has(definition.quizId));
  const titlePrefixes = new Set(
    quizIds.flatMap(quizId => QUIZ_TITLE_PREFIXES[quizId] || [])
  );
  const quizzes = [];
  const questionsByQuiz = {};
  selected.forEach(definition => {
    const questions = definition.questions();
    const expectedQuestionCount = Number(definition.expectedQuestionCount) || DEFAULT_QUESTIONS_PER_QUIZ;
    if (questions.length !== expectedQuestionCount) {
      throw new Error(`${definition.quizId} generated ${questions.length} questions, expected ${expectedQuestionCount}.`);
    }
    quizzes.push(quizMeta(definition, questions.length));
    questionsByQuiz[definition.quizId] = questions;
  });
  return {
    quizzes,
    questionsByQuiz,
    titles: buildTitleCatalog().filter(title => !titlePrefixes.size || Array.from(titlePrefixes).some(prefix => title.titleId.startsWith(prefix))),
    removedTitleIds: titlePrefixes.size ? [] : REMOVED_TITLE_IDS
  };
}

function printSummary(model, sample) {
  console.log(`Prepared quizzes: ${model.quizzes.length}`);
  console.log(`Prepared questions: ${Object.values(model.questionsByQuiz).reduce((sum, rows) => sum + rows.length, 0)}`);
  console.log(`Prepared titleCatalog documents: ${model.titles.length}`);
  model.quizzes.forEach(quiz => {
    console.log(JSON.stringify({
      quizPath: `${QUIZZES_COLLECTION}/${quiz.quizId}`,
      title: quiz.title,
      subjectGroup: quiz.subjectGroup,
      questionCount: quiz.questionCount,
      sampleQuestions: (model.questionsByQuiz[quiz.quizId] || []).slice(0, sample).map(question => ({
        questionId: question.questionId,
        prompt: question.prompt,
        answer: question.answer
      }))
    }, null, 2));
  });
}

async function commitModel(model) {
  const db = initializeAdmin();
  const now = FieldValue.serverTimestamp();
  const writes = [];
  const deletes = [];
  model.quizzes.forEach(quiz => {
    writes.push({
      ref: db.collection(QUIZZES_COLLECTION).doc(quiz.quizId),
      data: { ...quiz, updatedAt: now }
    });
    model.questionsByQuiz[quiz.quizId].forEach(question => {
      writes.push({
        ref: db.collection(QUIZ_QUESTIONS_ROOT).doc(quiz.quizId).collection('questions').doc(question.questionId),
        data: { ...question, updatedAt: now }
      });
    });
  });
  for (const quiz of model.quizzes) {
    const expectedIds = new Set((model.questionsByQuiz[quiz.quizId] || []).map(question => question.questionId));
    const snapshot = await db.collection(QUIZ_QUESTIONS_ROOT).doc(quiz.quizId).collection('questions').get();
    snapshot.docs.forEach(doc => {
      if (!expectedIds.has(doc.id)) deletes.push(doc.ref);
    });
  }
  model.titles.forEach(title => {
    writes.push({
      ref: db.collection(TITLE_CATALOG_COLLECTION).doc(title.titleId),
      data: { ...title, updatedAt: now }
    });
  });
  (model.removedTitleIds || []).forEach(titleId => {
    deletes.push(db.collection(TITLE_CATALOG_COLLECTION).doc(titleId));
  });

  let committed = 0;
  const operations = [
    ...writes.map(write => ({ type: 'set', ...write })),
    ...deletes.map(ref => ({ type: 'delete', ref }))
  ];
  for (let index = 0; index < operations.length; index += 450) {
    const batch = db.batch();
    operations.slice(index, index + 450).forEach(operation => {
      if (operation.type === 'delete') {
        batch.delete(operation.ref);
      } else {
        batch.set(operation.ref, operation.data, { merge: true });
      }
    });
    await batch.commit();
    committed += Math.min(450, operations.length - index);
  }
  console.log(`Committed ${committed} Firestore operations (${writes.length} writes, ${deletes.length} deletes).`);
}

async function main() {
  const args = parseArgs(process.argv);
  const model = buildModel(args.quizIds);
  printSummary(model, Math.max(0, args.sample));
  if (!args.commit) {
    console.log('No Firestore writes performed. Re-run with --commit to seed.');
    return;
  }
  await commitModel(model);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
