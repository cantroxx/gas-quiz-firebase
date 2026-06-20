#!/usr/bin/env node

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const QUIZZES_COLLECTION = 'quizzes';
const QUIZ_QUESTIONS_ROOT = 'quizQuestions';
const TITLE_CATALOG_COLLECTION = 'titleCatalog';
const DEFAULT_QUESTIONS_PER_QUIZ = 200;
const SEED_SOURCE = 'seed-non-image-quiz-expansion';

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
  ['아파트', [], '🏢🍻👏🎉'],
  ['홈 스위트 홈', [], '🏠🍯💛🎤'],
  ['레블 하트', [], '🏴‍☠️❤️⚡'],
  ['투 배드', [], '😬🚫💔'],
  ['라이크 제니', [], '👑💃✨'],
  ['골든', [], '🏆✨🌟'],
  ['블루 발렌타인', [], '💙💌🌙'],
  ['썬더', [], '🌩️⚡🥁'],
  ['페이머스', [], '🌟📸🎤'],
  ['굿 굿바이', [], '👋😊💧'],
  ['슈퍼노바', [], '🌟💥🚀'],
  ['마그네틱', [], '🧲❤️✨'],
  ['하우 스위트', [], '🍯😊🎶'],
  ['해야', [], '👋🌞💃'],
  ['아마겟돈', [], '☄️🌍🔥'],
  ['위플래시', [], '🚗💥⚡'],
  ['클락션', [], '🚗📣💃'],
  ['첫 만남은 계획대로 되지 않아', [], '1️⃣🤝📋❌'],
  ['나는 아픈 건 딱 질색이니까', [], '🤒🚫🙅‍♀️'],
  ['러브 윈즈 올', [], '❤️🏆🌍'],
  ['밤양갱', [], '🌙🍡💜'],
  ['소나기', [], '🌦️💧🎤'],
  ['천상연', [], '☁️❤️🎶'],
  ['스몰 걸', [], '👧🤏💗'],
  ['내 이름 맑음', [], '🙋‍♀️📝☀️'],
  ['슬로우 모션', [], '🐢🎥💫'],
  ['스티키', [], '🍯🤝💃'],
  ['마이다스 터치', [], '👑✋🥇'],
  ['버추얼 엔젤', [], '💻👼✨'],
  ['걸스 네버 다이', [], '👧♾️🖤'],
  ['슈퍼내추럴', [], '👻✨🌙'],
  ['버블검', [], '🫧🍬💗'],
  ['스팟', [], '📍🎤🔥'],
  ['오늘만 I LOVE YOU', [], '📅❤️💬'],
  ['이지', [], '😌👌🎧'],
  ['스마트', [], '🧠📱✨'],
  ['크레이지', [], '🤪🔥🎶'],
  ['핫', [], '🔥🌡️💃'],
  ['컴 오버', [], '👉🏠✨'],
  ['러브 랭귀지', [], '❤️💬🌍'],
  ['프라이스리스', [], '💎🚫💰'],
  ['메시', [], '🌀🧹💔'],
  ['스트래티지', [], '♟️📋✨'],
  ['두 더 댄스', [], '💃🕺🎵'],
  ['돈 세이 유 러브 미', [], '🤫❤️🚫'],
  ['스윔', [], '🏊‍♂️🌊✨'],
  ['점프', [], '⬆️🦘💗'],
  ['고', [], '🏃‍♀️💨🖤'],
  ['셀러브레이션', [], '🎉🥳✨'],
  ['아드레날린', [], '⚡💓🚀']
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
  { quizId: 'science-general', title: '과학 상식 퀴즈', subject: '과학', subjectGroup: 'science', order: 60, expectedQuestionCount: 200, cycleQuestionCount: 100, description: '초등학생이 알아두면 좋은 생활 과학 상식을 확인합니다.', questions: buildScienceGeneralQuestions },
  { quizId: 'emoji-kpop', title: 'K-POP 이모지 퀴즈', subject: '인기', subjectGroup: 'popular', order: 70, expectedQuestionCount: 50, cycleQuestionCount: 50, description: '이모지 조합을 보고 K-POP 노래 제목을 객관식으로 맞힙니다.', questions: () => buildEmojiQuestions('emoji-kpop', EMOJI_KPOP, 'K-POP 노래') },
  { quizId: 'emoji-anime', title: '애니 이모지 퀴즈', subject: '인기', subjectGroup: 'popular', order: 71, expectedQuestionCount: 50, cycleQuestionCount: 50, description: '이모지 조합을 보고 애니 제목을 객관식으로 맞힙니다.', questions: () => buildEmojiQuestions('emoji-anime', EMOJI_ANIME, '애니') },
  { quizId: 'emoji-tiniping', title: '티니핑 이모지 퀴즈', subject: '인기', subjectGroup: 'popular', order: 72, expectedQuestionCount: 50, cycleQuestionCount: 50, description: '이모지 조합을 보고 티니핑 이름을 객관식으로 맞힙니다.', questions: () => buildEmojiQuestions('emoji-tiniping', EMOJI_TINIPING, '티니핑') }
];

const TITLE_BASES = [
  ['korean_proverb', '속담', 'korean', 'title-theme-spelling', ['속담 탐험가', '속담 박사', '속담 마스터']],
  ['korean_spacing', '띄어쓰기', 'korean', 'title-theme-spelling', ['띄어쓰기 지킴이', '띄어쓰기 박사', '띄어쓰기 마스터']],
  ['korean_idiom', '사자성어', 'korean', 'title-theme-spelling', ['사자성어 수집가', '사자성어 학자', '사자성어 마스터']],
  ['math_fraction_basic', '분수', 'math', 'title-theme-school', ['분수 탐험가', '분수 박사', '분수 마스터']],
  ['social_unified_silla_balhae', '남북국 역사', 'social', 'title-theme-people', ['남북국 탐험가', '남북국 학자', '남북국 역사의 신']],
  ['science_general', '과학 상식', 'science', 'title-theme-school', ['과학 호기심 탐험가', '과학 상식 박사', '과학 상식 마스터']],
  ['popular_emoji_kpop', 'K-POP 이모지', 'popular', 'title-theme-idol', ['K-POP 이모지 팬', 'K-POP 이모지 DJ', 'K-POP 이모지 마스터']],
  ['popular_emoji_anime', '애니 이모지', 'popular', 'title-theme-anime', ['애니 이모지 팬', '애니 이모지 해석가', '애니 이모지 마스터']],
  ['popular_emoji_tiniping', '티니핑 이모지', 'popular', 'title-theme-tiniping', ['티니핑 이모지 팬', '티니핑 이모지 요정', '티니핑 이모지 마스터']]
];

function buildTitleCatalog() {
  const tiers = [
    [1, 'title-tier-1', '', '1회 완주'],
    [3, 'title-tier-3', 'title-effect-marquee', '3회 완주'],
    [5, 'title-tier-5', 'title-effect-neon', '5회 완주']
  ];
  return TITLE_BASES.flatMap(([prefix, label, subjectGroup, themeClass, names], baseIndex) => tiers.map(([stars, tierClass, effectClass, condition], tierIndex) => ({
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
}

function buildModel(quizIds = []) {
  const allow = new Set(quizIds);
  const selected = QUIZ_DEFINITIONS.filter(definition => !allow.size || allow.has(definition.quizId));
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
    titles: buildTitleCatalog()
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
