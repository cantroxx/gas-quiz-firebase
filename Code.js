// dj48-quiz-images/history 폴더 ID를 여기에 입력하세요.
const HISTORY_IMAGE_FOLDER_ID = '1N8I1LMDvU-84o1wZ0liOP2UK6ZlUwXZY';

// dj48-quiz-images/idol 폴더 ID를 여기에 입력하세요.
const IDOL_IMAGE_FOLDER_ID = '1Pd76maOke4OweSdyhozBknIEkKLoLlrD';
const POKEMON_IMAGES_FOLDER_ID = '13uxNGzpEmdZin8CZaVsNCy45veCUDfIE';
// dj48-quiz-images/tiniping 폴더 ID를 여기에 입력하세요.
const TINIPING_IMAGE_FOLDER_ID = '';
// dj48-quiz-images/ani 폴더 ID를 여기에 입력하세요.
const ANI_IMAGE_FOLDER_ID = '1ByGwvb37gtHnJF7ze8UCaVIGsOqrvowz';

var MAX_MEMBER_NICKNAME_LENGTH = 12;
const MAX_RANKING_MESSAGE_LENGTH = 16;
// PROFILE_UPLOAD_FOLDER_ID가 설정될 때까지 false로 유지. 활성화하려면 폴더 ID 입력 후 true로 변경.
const ENABLE_PROFILE_IMAGE_UPLOAD = false;
// TODO: 프로필 직접 업로드용 Google Drive 폴더 ID를 입력하세요.
// 학생 업로드 이미지는 이 폴더에 저장되므로 교사가 주기적으로 확인해야 합니다.
const PROFILE_UPLOAD_FOLDER_ID = '';
const MAX_PROFILE_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;
const DEFAULT_MEMBER_SCHOOL = '동자';
const MEMBER_SCHOOL_COLUMN = 10;
const MEMBER_SELECTED_TITLE_COLUMN = 11;
const MEMBER_RANKING_MESSAGE_COLUMN = 12;
const MEMBER_ROLE_COLUMN = 13;
const MEMBER_STATUS_COLUMN = 14;
const MEMBER_INFO_COLUMN_COUNT = 14;
const DEFAULT_MEMBER_ROLE = 'student';
const ADMIN_MEMBER_ROLE = 'admin';
const ACTIVE_MEMBER_STATUS = 'active';
const INACTIVE_MEMBER_STATUS = 'inactive';
const MEMBER_STATUS_CHANGE_LOG_SHEET_NAME = '회원상태변경로그';
const MEMBER_STATUS_CHANGE_LOG_HEADERS = ['일시', '관리자ID', '관리자닉네임', '대상회원ID', '대상닉네임', '이전상태', '변경상태', '사유'];
const MEMBER_DELETE_LOG_SHEET_NAME = '회원삭제로그';
const MEMBER_DELETE_LOG_HEADERS = ['일시', '관리자ID', '관리자닉네임', '삭제회원ID', '삭제회원닉네임', '학교', '학년', '반', '번호', '삭제사유'];
const BANNED_RANKING_MESSAGE_WORDS = [
  '시발', '씨발', 'ㅅㅂ', '개새', '병신', '븅신', '좆', '지랄', '꺼져', '죽어',
  '멍청', '찐따', '왕따', '패드립', '섹스', 'sex', '야동', '자지', '보지',
  '게이새', '장애인새', '흑인새', '중국인새', '전화번호', '카톡', '오픈채팅', '디엠', 'dm해'
];
const SCHOOL_LIST_SHEET_NAME = '학교목록';
const SCHOOL_LIST_DEFAULT_ROWS = [
  ['동자', '서울동자초등학교', true],
  ['옥정', '서울옥정초등학교', true],
  ['행당', '서울행당초등학교', true]
];

const MY_ROOM_SETTINGS_SHEET_NAME = '내집설정';
const MY_ROOM_SETTINGS_HEADERS = ['userId', '배경ID', '아바타ID', '대표뱃지ID', '대표칭호ID', '수정일시'];
const DEFAULT_MY_ROOM_BACKGROUND_ID = 'bg_room_basic';
const DEFAULT_MY_ROOM_AVATAR_ID = 'avatar_basic';
const DEFAULT_MY_ROOM_TITLE_ID = 'title_beginner';
const TITLE_STATUS_SHEET_NAME = '타이틀현황';
const TITLE_STATUS_HEADERS = ['userId', 'titleId', 'titleName', 'theme', 'tier', 'effect', 'sourceType', 'sourceCategory', 'sourceGroup', 'acquiredAt', 'updatedAt'];
const PRACTICE_RECORD_SHEET_NAME = '연습기록';
const POKEMON_PRACTICE_RECORD_SHEET_NAME = '포켓몬연습기록';
const PRACTICE_RECORD_HEADERS = ['userId', '학년', '반', '번호', '닉네임', '영역', '세부구분', '맞힌개수', '전체개수', '맞힌목록', '별개수', '최근성취일시', '최초완주일시', '최근완주일시', '모드'];
const PRACTICE_MATCHED_LIST_COLUMN = 10;
const POKEMON_PRACTICE_MATCHED_LIST_COLUMN = 12;
const DAILY_USAGE_SHEET_NAME = '일일이용기록';
const DAILY_USAGE_HEADERS = ['date', 'memberId', 'funSeconds', 'after4FunSeconds', 'eduCorrectCount', 'unlockBaseEduCorrectCount', 'updatedAt'];
const DAILY_FUN_LIMIT_SECONDS = 600;
const DAILY_EDU_UNLOCK_CORRECT_COUNT = 15;
const DAILY_AFTER4_START_HOUR = 16;
const DAILY_AFTER4_HARD_LIMIT_SECONDS = 1800;
const MAX_FUN_SECONDS_PER_QUESTION = 60;
const MAX_RANKING_ELAPSED_SECONDS = 600 * 60;
const INVALID_RANKING_TIME_MESSAGE = '잘못된 기록입니다. 시간이 너무 오래 지나 랭킹에 기록되지 않았어요.';
const DEBUG_PERF = false;

const TITLE_TIER_DEFINITIONS = {
  tiniping: {
    source: 'people_티니핑',
    fieldKey: 'tiniping',
    theme: 'tiniping',
    category: '티니핑',
    subjectGroup: 'popular',
    conditionTarget: '티니핑',
    titles: {
      1: { id: 'tiniping_guard', title: '티니핑 수호대', legacyNames: ['티니핑 수호자'], legacyIds: ['tiniping_guardian'] },
      3: { id: 'tiniping_guardian', title: '티니핑 수호신' },
      5: { id: 'tiniping_god', title: '티니핑 신' }
    },
    order: 10
  },
  spelling: {
    source: 'daily_맞춤법',
    fieldKey: 'spelling',
    theme: 'spelling',
    category: '맞춤법',
    subjectGroup: 'korean',
    conditionTarget: '맞춤법',
    titles: {
      1: { id: 'spelling_researcher', title: '맞춤법 연구자', legacyNames: ['맞춤법 박사'], legacyIds: ['spelling_doctor'] },
      3: { id: 'spelling_doctor', title: '맞춤법 박사' },
      5: { id: 'spelling_master', title: '맞춤법 마스터' }
    },
    order: 30
  },
  wordRelation: {
    source: 'korean_word_relation',
    fieldKey: 'korean',
    theme: 'spelling',
    category: '국어',
    subjectGroup: 'korean',
    conditionTarget: '다의어·동형이의어',
    titles: {
      1: { id: 'word_relation_researcher', title: '단어 연구자' },
      3: { id: 'word_relation_doctor', title: '단어 박사' },
      5: { id: 'word_relation_master', title: '단어 마스터' }
    },
    order: 35
  },
  readingGmo: {
    source: 'korean_gmo',
    fieldKey: 'korean',
    theme: 'school',
    category: '국어',
    subjectGroup: 'korean',
    conditionTarget: '지엠오 아이',
    titles: {
      1: { id: 'reading_gmo_complete', title: '지엠오 아이 완독' }
    },
    order: 38
  },
  people: {
    source: 'people_역사인물',
    fieldKey: 'people',
    theme: 'people',
    category: '인물',
    subjectGroup: 'social',
    conditionTarget: '역사인물',
    titles: {
      1: { id: 'people_detective', title: '인물 탐정' },
      3: { id: 'people_scholar', title: '인물 학자' },
      5: { id: 'history_god', title: '역사 인물의 신' }
    },
    order: 40
  },
  threeKingdoms: {
    source: 'social_three_kingdoms',
    fieldKey: 'people',
    theme: 'people',
    category: '사회',
    subjectGroup: 'social',
    conditionTarget: '삼국지',
    titles: {
      1: { id: 'three_kingdoms_late_han_person', title: '후한말 사람' },
      3: { id: 'three_kingdoms_scholar', title: '삼국지 학자' },
      5: { id: 'three_kingdoms_luoguanzhong', title: '나관중' }
    },
    order: 45
  },
  ancientThreeKingdoms: {
    source: 'social_ancient_three_kingdoms',
    fieldKey: 'people',
    theme: 'people',
    category: '사회',
    subjectGroup: 'social',
    conditionTarget: '고대사~삼국시대',
    titles: {
      1: { id: 'ancient_three_kingdoms_person', title: '삼국시대 사람' },
      3: { id: 'ancient_three_kingdoms_archaeologist', title: '고고학자' },
      5: { id: 'ancient_three_kingdoms_master', title: '고대사 마스터' }
    },
    order: 46
  },
  anime: {
    source: 'people_애니',
    fieldKey: 'anime',
    theme: 'anime',
    category: '애니',
    subjectGroup: 'popular',
    conditionTarget: '애니',
    titles: {
      1: { id: 'anime_rookie', title: '애니 루키', legacyNames: ['애니 지식왕'], legacyIds: ['anime_king'] },
      3: { id: 'anime_mania', title: '애니 매니아' },
      5: { id: 'anime_master', title: '애니 마스터' }
    },
    order: 50
  },
  idol: {
    source: 'people_아이돌',
    fieldKey: 'idol',
    theme: 'idol',
    category: '아이돌',
    subjectGroup: 'popular',
    conditionTarget: '아이돌',
    titles: {
      1: { id: 'idol_fanclub', title: '아이돌 팬클럽', legacyNames: ['아이돌 전문가'], legacyIds: ['idol_expert'] },
      3: { id: 'idol_mania', title: '아이돌 매니아' },
      5: { id: 'idol_master', title: '아이돌마스터' }
    },
    order: 60
  },
  dadjoke: {
    source: 'daily_아재개그',
    fieldKey: 'dadjoke',
    theme: 'dadjoke',
    category: '아재개그',
    subjectGroup: 'popular',
    conditionTarget: '아재개그',
    titles: {
      1: { id: 'dad_joke_rookie', title: '개그맨 지망생', legacyNames: ['웃음 사냥꾼'], legacyIds: ['dad_joke_hunter'] },
      3: { id: 'dad_joke_comedian', title: '초보 개그맨' },
      5: { id: 'ten_million_youtuber', title: '천만유튜버' }
    },
    order: 70
  },
  mathMulDiv: {
    source: 'math_muldiv',
    fieldKey: 'math',
    theme: 'school',
    category: '수학',
    subjectGroup: 'math',
    conditionTarget: '곱셈과 나눗셈',
    titles: {
      1: { id: 'math_muldiv_explorer', title: '곱셈과 나눗셈 학자' },
      3: { id: 'math_muldiv_solver', title: '곱셈과 나눗셈 박사' },
      5: { id: 'math_muldiv_master', title: '곱셈과 나눗셈 마스터' }
    },
    order: 80
  }
};

const GENERAL_TITLE_DEFINITIONS = [
  {
    id: 'sparkling_newbie',
    title: '반짝이는 신입',
    category: '일반',
    theme: 'school',
    tier: 1,
    conditionText: '기본 뱃지 1개 이상 획득',
    description: '첫 기본 뱃지를 얻은 친구에게 어울리는 타이틀입니다.',
    requiredBadgeCount: 1,
    sourceType: 'badge',
    legacyNames: [],
    order: 100
  },
  {
    id: 'quiz_school_newbie',
    title: '퀴즈학교 신입',
    category: '일반',
    theme: 'school',
    tier: 1,
    conditionText: '서로 다른 분야 뱃지 2개 획득',
    description: '두 분야 이상에서 기본 뱃지를 얻은 친구에게 어울리는 타이틀입니다.',
    requiredBadgeCount: 2,
    sourceType: 'badgeFields',
    legacyNames: [],
    order: 110
  },
  {
    id: 'quiz_school_intermediate',
    title: '퀴즈학교 중수',
    category: '일반',
    theme: 'school',
    tier: 1,
    conditionText: '서로 다른 분야 뱃지 3개 획득',
    description: '여러 분야를 골고루 완주한 친구에게 어울리는 타이틀입니다.',
    requiredBadgeCount: 3,
    sourceType: 'badgeFields',
    legacyNames: ['올라운더'],
    legacyIds: ['allrounder', 'quiz_allrounder'],
    order: 120
  },
  {
    id: 'quiz_school_expert',
    title: '퀴즈학교 고수',
    category: '일반',
    theme: 'school',
    tier: 3,
    conditionText: '서로 다른 영역 뱃지 5개 획득',
    description: '다섯 영역 이상에서 기본 뱃지를 얻은 친구에게 어울리는 타이틀입니다.',
    requiredBadgeCount: 5,
    sourceType: 'badgeFields',
    legacyNames: [],
    order: 125
  },
  {
    id: 'perfect_score_fairy',
    title: '만점 요정',
    category: '일반',
    theme: 'perfect',
    tier: 5,
    conditionText: '일반 랭킹전 50점 이상 5회 달성',
    description: '일반 랭킹전에서 50점 이상을 5번 기록한 친구에게 어울리는 특별 타이틀입니다.',
    requiredBadgeCount: 0,
    sourceType: 'rankingNormal50',
    legacyNames: [],
    order: 130
  },
  {
    id: 'quiz_mania',
    title: '퀴즈매니아',
    category: '일반',
    theme: 'perfect',
    tier: 3,
    conditionText: '영역별 최고점 합계 300점 이상',
    description: '여러 영역에서 얻은 최고점 합계가 300점 이상인 친구에게 어울리는 타이틀입니다.',
    requiredBadgeCount: 0,
    sourceType: 'rankingBestScoreTotal300',
    legacyNames: [],
    order: 135
  },
  {
    id: 'korean_mania',
    title: '국어매니아',
    category: '국어',
    theme: 'spelling',
    tier: 3,
    conditionText: '국어 계열 세부 타이틀 3개 이상 보유',
    description: '국어 계열 세부 타이틀을 3개 이상 보유한 친구에게 어울리는 타이틀입니다.',
    requiredSubjectTitleCount: 3,
    subjectGroup: 'korean',
    sourceType: 'subjectDetailTitles',
    legacyNames: [],
    order: 140
  },
  {
    id: 'korean_master',
    title: '국어마스터',
    category: '국어',
    theme: 'spelling',
    tier: 5,
    conditionText: '국어 계열 세부 타이틀 6개 이상 보유',
    description: '국어 계열 세부 타이틀을 6개 이상 보유한 친구에게 어울리는 타이틀입니다.',
    requiredSubjectTitleCount: 6,
    subjectGroup: 'korean',
    sourceType: 'subjectDetailTitles',
    legacyNames: [],
    order: 141
  },
  {
    id: 'korean_god',
    title: '국어신',
    category: '국어',
    theme: 'spelling',
    tier: 5,
    conditionText: '국어 계열 세부 타이틀 9개 이상 보유',
    description: '국어 계열 세부 타이틀을 9개 이상 보유한 친구에게 어울리는 타이틀입니다.',
    requiredSubjectTitleCount: 9,
    subjectGroup: 'korean',
    sourceType: 'subjectDetailTitles',
    legacyNames: [],
    order: 142
  },
  {
    id: 'math_mania',
    title: '수학매니아',
    category: '수학',
    theme: 'school',
    tier: 3,
    conditionText: '수학 계열 세부 타이틀 3개 이상 보유',
    description: '수학 계열 세부 타이틀을 3개 이상 보유한 친구에게 어울리는 타이틀입니다.',
    requiredSubjectTitleCount: 3,
    subjectGroup: 'math',
    sourceType: 'subjectDetailTitles',
    legacyNames: [],
    order: 150
  },
  {
    id: 'math_master',
    title: '수학마스터',
    category: '수학',
    theme: 'school',
    tier: 5,
    conditionText: '수학 계열 세부 타이틀 6개 이상 보유',
    description: '수학 계열 세부 타이틀을 6개 이상 보유한 친구에게 어울리는 타이틀입니다.',
    requiredSubjectTitleCount: 6,
    subjectGroup: 'math',
    sourceType: 'subjectDetailTitles',
    legacyNames: [],
    order: 151
  },
  {
    id: 'math_god',
    title: '수학신',
    category: '수학',
    theme: 'school',
    tier: 5,
    conditionText: '수학 계열 세부 타이틀 9개 이상 보유',
    description: '수학 계열 세부 타이틀을 9개 이상 보유한 친구에게 어울리는 타이틀입니다.',
    requiredSubjectTitleCount: 9,
    subjectGroup: 'math',
    sourceType: 'subjectDetailTitles',
    legacyNames: [],
    order: 152
  },
  {
    id: 'social_mania',
    title: '사회매니아',
    category: '사회',
    theme: 'people',
    tier: 3,
    conditionText: '사회 계열 세부 타이틀 3개 이상 보유',
    description: '사회 계열 세부 타이틀을 3개 이상 보유한 친구에게 어울리는 타이틀입니다.',
    requiredSubjectTitleCount: 3,
    subjectGroup: 'social',
    sourceType: 'subjectDetailTitles',
    legacyNames: [],
    order: 160
  },
  {
    id: 'social_master',
    title: '사회마스터',
    category: '사회',
    theme: 'people',
    tier: 5,
    conditionText: '사회 계열 세부 타이틀 6개 이상 보유',
    description: '사회 계열 세부 타이틀을 6개 이상 보유한 친구에게 어울리는 타이틀입니다.',
    requiredSubjectTitleCount: 6,
    subjectGroup: 'social',
    sourceType: 'subjectDetailTitles',
    legacyNames: [],
    order: 161
  },
  {
    id: 'social_god',
    title: '사회신',
    category: '사회',
    theme: 'people',
    tier: 5,
    conditionText: '사회 계열 세부 타이틀 9개 이상 보유',
    description: '사회 계열 세부 타이틀을 9개 이상 보유한 친구에게 어울리는 타이틀입니다.',
    requiredSubjectTitleCount: 9,
    subjectGroup: 'social',
    sourceType: 'subjectDetailTitles',
    legacyNames: [],
    order: 162
  }
];
let NORMAL_RANKING_SCORE50_COUNT_CACHE_ = null;
let SUBJECT_QUIZ_META_MAP_CACHE_ = null;

function logPerf_(label, startedAt, detail) {
  if (!DEBUG_PERF) return;
  Logger.log('[PERF] %s end %sms%s', label, Date.now() - startedAt, detail ? ' ' + detail : '');
}

function logPerfStart_(label) {
  if (DEBUG_PERF) Logger.log('[PERF] %s start', label);
  return Date.now();
}

function normalizeTitleUserId_(userId) {
  return String(userId || '').trim();
}

function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('DJ48 퀴즈 파티')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function makeUserId(grade, classNo, number) {
  const g = String(grade || '').trim();
  const c = String(classNo || '').trim();
  const n = String(number || '').trim();
  if (!g || !c || !n) return '';
  return `G${Number(g)}-C${Number(c)}-N${String(Number(n)).padStart(2, '0')}`;
}

function normalizeMemberSchool_(school) {
  const value = String(school || '').trim();
  if (!value) return DEFAULT_MEMBER_SCHOOL;
  const normalized = value
    .replace(/^서울/, '')
    .replace(/초등학교$/, '')
    .replace(/초$/, '')
    .trim();
  return normalized || DEFAULT_MEMBER_SCHOOL;
}

function formatSchoolShortName_(school) {
  const normalized = normalizeMemberSchool_(school);
  return normalized
    .replace(/^서울/, '')
    .replace(/초등학교$/, '')
    .replace(/초$/, '')
    .trim();
}

function getTitleDefinitions() {
  return buildAllTitleDefinitions_();
}

function getTitleDefinitionById_(titleId) {
  const id = String(titleId || '').trim();
  if (!id) return null;
  return getTitleDefinitionMap_()[id] || null;
}

function getTitleDefinitionMap_() {
  const map = {};
  buildAllTitleDefinitions_().forEach(item => {
    if (item && item.id) map[item.id] = item;
  });
  return map;
}

function inferSubjectGroupFromTitleConfig_(config) {
  const category = String((config || {}).category || '').trim();
  if (category === '국어' || category === '맞춤법') return 'korean';
  if (category === '수학') return 'math';
  if (category === '사회') return 'social';
  return '';
}

function makeTitleDefinition_(config, tier, titleInfo, suffix, orderOffset) {
  return {
    id: titleInfo.id,
    title: titleInfo.title,
    category: config.category,
    theme: config.theme,
    themeClass: 'title-theme-' + config.theme,
    tier: tier,
    tierClass: 'title-tier-' + tier,
    effectClass: tier >= 5 ? 'title-effect-neon' : (tier >= 3 ? 'title-effect-marquee' : ''),
    source: config.source || '',
    sourceType: 'practiceStars',
    requiredBadgeCount: tier,
    conditionText: config.conditionTarget + ' 연습 뱃지 ' + tier + '회 완주',
    description: config.conditionTarget + ' 연습을 ' + tier + '회 완주한 친구에게 어울리는 타이틀입니다.',
    legacyNames: (titleInfo.legacyNames || []).slice(),
    legacyIds: (titleInfo.legacyIds || []).slice(),
    order: (Number(config.order) || 0) + (Number(orderOffset) || 0),
    fieldKey: config.fieldKey || '',
    subjectGroup: config.subjectGroup || inferSubjectGroupFromTitleConfig_(config),
    generation: suffix || ''
  };
}

function makePokemonTitleDefinition_(gen, tier, titleInfo) {
  const generationLabel = gen + '세대';
  return {
    id: titleInfo.id.replace('{gen}', gen),
    title: titleInfo.title.replace('{generation}', generationLabel),
    category: '포켓몬',
    theme: 'pokemon',
    themeClass: 'title-theme-pokemon',
    tier: tier,
    tierClass: 'title-tier-' + tier,
    effectClass: tier >= 5 ? 'title-effect-neon' : (tier >= 3 ? 'title-effect-marquee' : ''),
    source: 'pokemon_gen' + gen,
    sourceType: 'practiceStars',
    requiredBadgeCount: tier,
    conditionText: '포켓몬 ' + generationLabel + ' 연습 뱃지 ' + tier + '회 완주',
    description: '포켓몬 ' + generationLabel + ' 연습을 ' + tier + '회 완주한 친구에게 어울리는 타이틀입니다.',
    legacyNames: (titleInfo.legacyNames || []).slice(),
    legacyIds: (titleInfo.legacyIds || []).slice(),
    order: 20 + (gen / 100),
    fieldKey: 'pokemon',
    subjectGroup: 'popular',
    generation: String(gen)
  };
}

function buildAllTitleDefinitions_() {
  const titleDefs = getMergedTitleTierDefinitions_();
  const definitions = [];
  Object.keys(titleDefs).forEach(key => {
    const config = titleDefs[key];
    [1, 3, 5].forEach((tier, index) => {
      if (!config.titles[tier]) return;
      definitions.push(makeTitleDefinition_(config, tier, config.titles[tier], '', index / 100));
    });
  });

  // 세대별 트레이너 타이틀 (각 세대 뱃지 1회 완주)
  const pokemonTrainer = { id: 'pokemon_gen{gen}_trainer', title: '포켓몬 {generation} 트레이너', legacyNames: [], legacyIds: [] };
  for (let gen = 1; gen <= 9; gen++) {
    definitions.push(makePokemonTitleDefinition_(gen, 1, pokemonTrainer));
  }

  // 크로스젠 타이틀 (서로 다른 세대 뱃지 N개 이상 획득)
  const crossGenTitles = [
    {
      id: 'pokemon_master',
      title: '포켓몬 마스터',
      category: '포켓몬',
      theme: 'pokemon',
      themeClass: 'title-theme-pokemon',
      tier: 3,
      tierClass: 'title-tier-3',
      effectClass: 'title-effect-marquee',
      sourceType: 'pokemonGenCount',
      requiredGenCount: 3,
      conditionText: '서로 다른 포켓몬 세대 뱃지 3개 이상 획득',
      description: '3개 세대 이상의 포켓몬 뱃지를 획득한 친구에게 어울리는 타이틀입니다.',
      legacyNames: ['포켓몬 마스터'],
      legacyIds: ['pokemon_gen1_master', 'pokemon_gen2_master', 'pokemon_gen3_master',
                  'pokemon_gen4_master', 'pokemon_gen5_master', 'pokemon_gen6_master',
                  'pokemon_gen7_master', 'pokemon_gen8_master', 'pokemon_gen9_master'],
      order: 20.5,
      fieldKey: 'pokemon',
      subjectGroup: 'popular',
      generation: ''
    },
    {
      id: 'pokemon_gym_leader',
      title: '포켓몬 관장',
      category: '포켓몬',
      theme: 'pokemon',
      themeClass: 'title-theme-pokemon',
      tier: 5,
      tierClass: 'title-tier-5',
      effectClass: 'title-effect-neon',
      sourceType: 'pokemonGenCount',
      requiredGenCount: 6,
      conditionText: '서로 다른 포켓몬 세대 뱃지 6개 이상 획득',
      description: '6개 세대 이상의 포켓몬 뱃지를 획득한 친구에게 어울리는 타이틀입니다.',
      legacyNames: [],
      legacyIds: ['pokemon_gen1_gym_leader', 'pokemon_gen2_gym_leader', 'pokemon_gen3_gym_leader',
                  'pokemon_gen4_gym_leader', 'pokemon_gen5_gym_leader', 'pokemon_gen6_gym_leader',
                  'pokemon_gen7_gym_leader', 'pokemon_gen8_gym_leader', 'pokemon_gen9_gym_leader'],
      order: 20.6,
      fieldKey: 'pokemon',
      subjectGroup: 'popular',
      generation: ''
    },
    {
      id: 'pokemon_god',
      title: '포켓몬 신',
      category: '포켓몬',
      theme: 'pokemon',
      themeClass: 'title-theme-pokemon',
      tier: 5,
      tierClass: 'title-tier-5',
      effectClass: 'title-effect-neon',
      sourceType: 'pokemonGenCount',
      requiredGenCount: 9,
      conditionText: '모든 포켓몬 세대(1~9세대) 뱃지 획득',
      description: '9개 세대 전부의 포켓몬 뱃지를 획득한 친구에게만 허락된 최고의 타이틀입니다.',
      legacyNames: [],
      legacyIds: [],
      order: 20.7,
      fieldKey: 'pokemon',
      subjectGroup: 'popular',
      generation: ''
    }
  ];
  crossGenTitles.forEach(t => definitions.push(Object.assign({}, t)));

  GENERAL_TITLE_DEFINITIONS.forEach(item => {
    const definition = Object.assign({}, item);
    definition.themeClass = 'title-theme-' + definition.theme;
    definition.tierClass = 'title-tier-' + definition.tier;
    definition.effectClass = definition.tier >= 5 ? 'title-effect-neon' : (definition.tier >= 3 ? 'title-effect-marquee' : '');
    definition.subjectGroup = definition.subjectGroup || '';
    definitions.push(definition);
  });

  return definitions
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map(item => Object.assign({}, item));
}

function getBadgeItemById_(badgeSummary, badgeId) {
  const items = (badgeSummary && badgeSummary.items) || [];
  return items.find(item => item.id === badgeId) || null;
}

function normalizeTitleAreaKeyPart_(value) {
  return String(value || '').trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/[^0-9a-z가-힣_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getSubjectQuizFallbacks_(subject) {
  if (subject === '국어') {
    return [
      { quizId: 'gmo', title: '지엠오 아이', type: 'sheet', sheetName: '지엠오아이문제', subject: '국어', uiType: '', badgeGroup: '', completionType: '', titleSource: '', subjectGroup: '' },
      { quizId: 'word-relation', title: '다의어·동형이의어', type: 'sheet', sheetName: '단어시트', subject: '국어', uiType: '', badgeGroup: '', completionType: '', titleSource: '', subjectGroup: '' }
    ];
  }
  if (subject === '수학') {
    return [
      { quizId: 'random-basic', title: '곱셈과 나눗셈', type: 'generated', sheetName: '', subject: '수학', uiType: '', badgeGroup: '', completionType: '', titleSource: '', subjectGroup: '' }
    ];
  }
  if (subject === '사회') {
    return [
      { quizId: 'history-people', title: '역사 인물', type: 'existing', sheetName: '인물문제', subject: '사회', uiType: 'input', badgeGroup: 'social', completionType: 'loop', titleSource: 'people_역사인물', subjectGroup: 'social' },
      { quizId: 'history-people', title: '역사인물', type: 'existing', sheetName: '인물문제', subject: '사회', uiType: 'input', badgeGroup: 'social', completionType: 'loop', titleSource: 'people_역사인물', subjectGroup: 'social' }
    ];
  }
  return [];
}

function readSubjectQuizOptions_(subject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fallback = getSubjectQuizFallbacks_(subject);
  if (!ss) return fallback;

  const sheet = ss.getSheetByName(subject + '목록');
  if (!sheet) return fallback;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return fallback;

  const values = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  const active = values.filter(row => {
    const activeValue = String(row[4] || '').trim().toUpperCase();
    return ['Y', 'TRUE', '사용', '활성'].indexOf(activeValue) !== -1;
  }).map(row => ({
    quizId: String(row[0] || '').trim(),
    title: String(row[1] || '').trim(),
    type: String(row[2] || '').trim(),
    sheetName: String(row[3] || '').trim(),
    order: parseInt(row[5], 10) || 999,
    description: String(row[6] || '').trim(),
    subject: subject,
    uiType: String(row[8] || '').trim(),
    badgeGroup: String(row[9] || '').trim(),
    completionType: String(row[10] || '').trim(),
    titleSource: String(row[11] || '').trim(),
    subjectGroup: String(row[12] || '').trim()
  })).filter(item => item.quizId && item.title);

  if (!active.length) return fallback;
  const activeIds = new Set(active.map(item => item.quizId));
  return active.concat(fallback.filter(item => !activeIds.has(item.quizId)));
}

function getSubjectQuizMetaMap_() {
  if (SUBJECT_QUIZ_META_MAP_CACHE_) return SUBJECT_QUIZ_META_MAP_CACHE_;
  const map = {};
  ['국어', '수학', '사회'].forEach(subject => {
    readSubjectQuizOptions_(subject).forEach(item => {
      const quiz = Object.assign({}, item, { subject: subject });
      [quiz.quizId, quiz.title, quiz.sheetName].forEach(key => {
        const text = String(key || '').trim();
        if (text && !map[subject + ':' + text]) map[subject + ':' + text] = quiz;
      });
      if (subject === '국어' && quiz.completionType === 'complete' && quiz.title) {
        const readingDetail = '독서:' + quiz.title;
        if (!map[subject + ':' + readingDetail]) map[subject + ':' + readingDetail] = quiz;
      }
    });
  });
  SUBJECT_QUIZ_META_MAP_CACHE_ = map;
  return map;
}

function getQuizAreaKey_(subject, quizKey, fallbackDetail) {
  const area = String(subject || '').trim();
  const key = String(quizKey || '').trim();
  const fallback = String(fallbackDetail || key || '').trim();
  if (!area) return normalizeTitleAreaKeyPart_(fallback) || '기타-퀴즈';

  const metaMap = getSubjectQuizMetaMap_();
  const meta = metaMap[area + ':' + key] || metaMap[area + ':' + fallback];
  const quizId = meta && meta.quizId ? meta.quizId : normalizeTitleAreaKeyPart_(fallback || key || '기타');
  return area + '/' + quizId;
}

function getPracticeAreaKeyFromSource_(sourceId) {
  const source = String(sourceId || '').trim();
  if (source.indexOf('pokemon_gen') === 0) return '인기/' + source;
  if (source === 'people_티니핑') return '인기/tiniping';
  if (source === 'people_역사인물') return '사회/history-people';
  if (isThreeKingdomsPracticeAlias_(source)) return '사회/three-kingdoms';
  if (isAncientThreeKingdomsPracticeAlias_(source)) return '사회/ancient-three-kingdoms';
  if (source === 'people_애니') return '인기/anime';
  if (source === 'people_아이돌') return '인기/idol';
  if (source === 'daily_맞춤법') return '일상/spelling';
  if (source === 'daily_아재개그') return '일상/dad-joke';
  if (source === 'korean_gmo') return getQuizAreaKey_('국어', 'gmo', '지엠오 아이');
  if (source === 'korean_word_relation') return getQuizAreaKey_('국어', 'word-relation', '다의어·동형이의어');
  if (source === 'math_muldiv') return getQuizAreaKey_('수학', 'random-basic', '곱셈과 나눗셈');
  if (source === 'math_other') return '수학/other';
  return normalizeTitleAreaKeyPart_(source) || '기타-퀴즈';
}

function isThreeKingdomsPracticeAlias_(value) {
  const key = String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .toLowerCase();
  return [
    '삼국지',
    '사회/삼국지',
    'three-kingdoms',
    'threekingdoms',
    '사회/three-kingdoms',
    'social/three-kingdoms',
    'social-three-kingdoms',
    'romance-of-three-kingdoms',
    '사회/romance-of-three-kingdoms',
    'social/romance-of-three-kingdoms',
    'sanguo',
    '사회/sanguo',
    'social/sanguo'
  ].indexOf(key) !== -1;
}

function isAncientThreeKingdomsPracticeAlias_(value) {
  const key = String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .toLowerCase();
  return [
    '고대사~삼국시대',
    '고대사삼국시대',
    '고대사-삼국시대',
    '고대사',
    '삼국시대',
    'ancient-three-kingdoms',
    'ancienthistory',
    'ancient-history',
    'social-ancient-three-kingdoms',
    '사회/고대사~삼국시대',
    '사회/고대사삼국시대',
    '사회/고대사-삼국시대',
    '사회/고대사',
    '사회/삼국시대',
    '사회/ancient-three-kingdoms',
    '사회/ancient-history',
    'social/ancient-three-kingdoms',
    'social/ancient-history'
  ].indexOf(key) !== -1;
}

function isWordRelationSolvedId_(value) {
  const id = String(value || '').trim().toLowerCase();
  return id === 'word-relation' || id.indexOf('word-relation-') === 0;
}

function normalizeWordRelationPracticeDetail_(detail) {
  const text = String(detail || '').trim();
  const lowerText = text.toLowerCase();
  if (lowerText === 'word-relation' || lowerText.indexOf('word-relation-') === 0) return '다의어·동형이의어';
  const compact = text
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/[·ㆍ]/g, '')
    .replace(/-/g, '')
    .toLowerCase();
  const aliases = {
    '다의어동형이의어': true,
    '동형이의어다의어': true,
    'wordrelation': true
  };
  return aliases[compact] ? '다의어·동형이의어' : text;
}

function getPracticeBadgeAreaKeyFromRow_(area, detail, solvedIds) {
  const areaText = String(area || '').trim();
  const detailText = String(detail || '').trim();
  const ids = solvedIds || [];
  if (areaText === '국어') {
    if (normalizeReadingGmoPracticeDetail_(detailText) === '독서:지엠오 아이' || ids.some(isReadingGmoSolvedId_)) {
      return getQuizAreaKey_('국어', 'gmo', '지엠오 아이');
    }
    if (normalizeWordRelationPracticeDetail_(detailText) === '다의어·동형이의어' || ids.some(isWordRelationSolvedId_)) {
      return getQuizAreaKey_('국어', 'word-relation', '다의어·동형이의어');
    }
  }
  const source = getPracticeTitleSourceFromRow_(areaText, detailText, ids);
  if (source) return getPracticeAreaKeyFromSource_(source.id);
  if (areaText === '수학') {
    const mathDetail = normalizeMathMulDivDetail_(detailText);
    if (mathDetail === '곱셈과 나눗셈') return getQuizAreaKey_('수학', 'random-basic', mathDetail);
    if (mathDetail) return getQuizAreaKey_('수학', mathDetail, mathDetail);
  }
  if (areaText) return areaText + '/' + (normalizeTitleAreaKeyPart_(detailText || '기타') || '기타');
  return '';
}

function getGenericBadgeAreaSourceId_(areaKey) {
  const key = normalizeTitleAreaKeyPart_(areaKey);
  return key ? 'badge_area_' + key : '';
}

function getEarnedFieldCount_(badgeSummary) {
  const items = (badgeSummary && badgeSummary.items) || [];
  const fields = {};
  items.forEach(item => {
    if (!item || !item.available) return;
    fields[item.areaKey || getPracticeAreaKeyFromSource_(item.id)] = true;
  });
  return Object.keys(fields).length;
}

function getNormalRankingScore50Count_(userId, titleContext) {
  const id = normalizeTitleUserId_(userId);
  if (!id) return 0;
  if (titleContext && titleContext.rankingAreaStatsByUserId) {
    const stats = titleContext.rankingAreaStatsByUserId[id] || {};
    return Number(stats.perfectAreaCount) || 0;
  }
  if (!NORMAL_RANKING_SCORE50_COUNT_CACHE_) {
    NORMAL_RANKING_SCORE50_COUNT_CACHE_ = buildRankingAreaStatsByUserId_(getRankingRecordRows_());
  }

  return Number((NORMAL_RANKING_SCORE50_COUNT_CACHE_[id] || {}).perfectAreaCount) || 0;
}

function getRankingBestScoreTotal_(userId, titleContext) {
  const id = normalizeTitleUserId_(userId);
  if (!id) return 0;
  if (titleContext && titleContext.rankingAreaStatsByUserId) {
    return Number((titleContext.rankingAreaStatsByUserId[id] || {}).bestScoreTotal) || 0;
  }
  if (!NORMAL_RANKING_SCORE50_COUNT_CACHE_) {
    NORMAL_RANKING_SCORE50_COUNT_CACHE_ = buildRankingAreaStatsByUserId_(getRankingRecordRows_());
  }
  return Number((NORMAL_RANKING_SCORE50_COUNT_CACHE_[id] || {}).bestScoreTotal) || 0;
}

function getRankingTitleAreaKey_(category) {
  const normalized = normalizeRankingCategory(category);
  const match = String(normalized || '').trim().match(/^(.+?)\((.+)\)$/);
  const main = match ? match[1] : String(normalized || '').trim();
  const sub = match ? match[2] : '';
  if (main === '수학') return getQuizAreaKey_('수학', sub, sub);
  if (main === '독서') return getQuizAreaKey_('국어', sub, sub);
  if (main === '단어') return getQuizAreaKey_('국어', sub, sub);
  if (main === '인물' && (sub === '역사 인물' || sub === '역사인물')) return getQuizAreaKey_('사회', 'history-people', sub);
  if (main === '맞춤법') return '일상/spelling';
  if (main === '아재개그') return '일상/dad-joke';
  if (main === '티니핑') return '인기/tiniping';
  if (main === '인물' && sub === '아이돌') return '인기/idol';
  if (main === '인물' && sub === '애니') return '인기/anime';
  if (main === '포켓몬') return '인기/pokemon-' + normalizeTitleAreaKeyPart_(sub || '전체');
  return normalizeTitleAreaKeyPart_(main + (sub ? '/' + sub : '')) || '기타-퀴즈';
}

function buildRankingAreaStatsByUserId_(rankingRows) {
  const stats = {};
  (rankingRows || []).forEach(row => {
    const userId = normalizeTitleUserId_(row[4]);
    if (!userId) return;
    const rankingMode = normalizeRankingMode_(row[10]);
    const score = Number(row[3]);
    if (isNaN(score)) return;
    const areaKey = getRankingTitleAreaKey_(row[2]);
    if (!areaKey) return;
    if (!stats[userId]) stats[userId] = { areaScores: {}, quizKingAreaScores: {}, perfectAreaCount: 0, bestScoreTotal: 0 };

    if (rankingMode === 'normal') {
      const currentNormal = Number(stats[userId].areaScores[areaKey]);
      if (isNaN(currentNormal) || score > currentNormal) stats[userId].areaScores[areaKey] = score;
    }

    if (['normal', 'onechance', 'nohint', 'speed'].indexOf(rankingMode) !== -1) {
      const currentQuizKing = Number(stats[userId].quizKingAreaScores[areaKey]);
      if (isNaN(currentQuizKing) || score > currentQuizKing) stats[userId].quizKingAreaScores[areaKey] = score;
    }
  });
  Object.keys(stats).forEach(userId => {
    const scores = Object.keys(stats[userId].areaScores).map(key => Number(stats[userId].areaScores[key]) || 0);
    const quizKingScores = Object.keys(stats[userId].quizKingAreaScores).map(key => Number(stats[userId].quizKingAreaScores[key]) || 0);
    stats[userId].perfectAreaCount = scores.filter(score => score >= 50).length;
    stats[userId].bestScoreTotal = quizKingScores.reduce((sum, score) => sum + score, 0);
  });
  return stats;
}

function getSubjectDetailTitleItems_(availableTitles, subjectGroup) {
  const group = String(subjectGroup || '').trim();
  if (!group) return [];
  return (availableTitles || []).filter(title => {
    return title &&
      title.sourceType === 'practiceStars' &&
      String(title.subjectGroup || '').trim() === group;
  });
}

function buildSubjectDetailTitleCounts_(availableTitles) {
  return {
    korean: getSubjectDetailTitleItems_(availableTitles, 'korean').length,
    math: getSubjectDetailTitleItems_(availableTitles, 'math').length,
    social: getSubjectDetailTitleItems_(availableTitles, 'social').length
  };
}

function buildAvailableTitleList_(badgeSummary, userId, titleContext) {
  const summary = badgeSummary || {};
  const earnedFieldCount = getEarnedFieldCount_(summary);
  const normalRanking50Count = getNormalRankingScore50Count_(userId, titleContext);
  const rankingBestScoreTotal = getRankingBestScoreTotal_(userId, titleContext);
  const definitions = buildAllTitleDefinitions_();
  const detailTitles = definitions.filter(definition => {
    if (!definition.source || definition.sourceType !== 'practiceStars') return false;
    const item = getBadgeItemById_(summary, definition.source);
    return item && (Number(item.starCount) || 0) >= (Number(definition.requiredBadgeCount) || 1);
  });
  const subjectTitleCounts = buildSubjectDetailTitleCounts_(detailTitles);
  return definitions
    .filter(definition => {
      if (definition.source) {
        const item = getBadgeItemById_(summary, definition.source);
        return item && (Number(item.starCount) || 0) >= (Number(definition.requiredBadgeCount) || 1);
      }
      if (definition.id === 'sparkling_newbie') {
        return (Number(summary.earnedBadgeCount) || 0) >= 1;
      }
      if (definition.id === 'quiz_school_newbie') {
        return earnedFieldCount >= 2;
      }
      if (definition.id === 'quiz_school_intermediate') {
        return earnedFieldCount >= 3;
      }
      if (definition.id === 'quiz_school_expert') {
        return earnedFieldCount >= 5;
      }
      if (definition.id === 'perfect_score_fairy') {
        return normalRanking50Count >= 5;
      }
      if (definition.id === 'quiz_mania') {
        return rankingBestScoreTotal >= 300;
      }
      if (definition.sourceType === 'subjectDetailTitles') {
        const subjectGroup = String(definition.subjectGroup || '').trim();
        return (Number(subjectTitleCounts[subjectGroup]) || 0) >= (Number(definition.requiredSubjectTitleCount) || 1);
      }
      if (definition.sourceType === 'pokemonGenCount') {
        // 서로 다른 세대 중 뱃지를 1개 이상 획득한 세대 수를 센다 (같은 세대 여러 번 = 1개로 카운트)
        const earnedGenCount = [1,2,3,4,5,6,7,8,9].filter(gen => {
          const item = getBadgeItemById_(summary, 'pokemon_gen' + gen);
          return item && (Number(item.starCount) || 0) >= 1;
        }).length;
        return earnedGenCount >= (Number(definition.requiredGenCount) || 1);
      }
      return false;
    })
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map(item => Object.assign({}, item));
}

function resolveSelectedTitle_(selectedTitleValue, availableTitles) {
  const value = String(selectedTitleValue || '').trim();
  if (!value) return null;
  const titles = availableTitles || [];
  const exact = titles.find(item => item.id === value || item.title === value);
  if (exact) return exact;

  if (value === '포켓몬 마스터' || value === 'pokemon_master') {
    const pokemonTitles = titles.filter(item => item.theme === 'pokemon');
    if (pokemonTitles.length) {
      pokemonTitles.sort((a, b) => {
        if ((Number(b.tier) || 0) !== (Number(a.tier) || 0)) return (Number(b.tier) || 0) - (Number(a.tier) || 0);
        return (Number(b.generation) || 0) - (Number(a.generation) || 0);
      });
      return pokemonTitles[0];
    }
  }

  const byLegacyName = titles.find(item => (item.legacyNames || []).indexOf(value) !== -1);
  if (byLegacyName) return byLegacyName;

  const byLegacyId = titles.find(item => (item.legacyIds || []).indexOf(value) !== -1);
  if (byLegacyId) return byLegacyId;

  return null;
}

function isAvailableTitleId_(badgeSummary, titleId, userId) {
  const id = String(titleId || '').trim();
  if (!id) return true;
  return buildAvailableTitleList_(badgeSummary, userId).some(item => item.id === id);
}

function addTitleContextBadgeStar_(context, userId, sourceId, group, starCount) {
  const id = String(userId || '').trim();
  const source = String(sourceId || '').trim();
  const stars = Number(starCount) || 0;
  if (!id || !source || stars <= 0) return;
  if (!context.badgeStarsByUserId[id]) context.badgeStarsByUserId[id] = {};
  const current = context.badgeStarsByUserId[id][source];
  if (!current || stars > current.starCount) {
    context.badgeStarsByUserId[id][source] = {
      id: source,
      group: group || '',
      areaKey: getPracticeAreaKeyFromSource_(source),
      starCount: stars,
      available: true
    };
  }
}

function addTitleContextGenericBadgeArea_(context, userId, areaKey, starCount) {
  const id = String(userId || '').trim();
  const key = String(areaKey || '').trim();
  const source = getGenericBadgeAreaSourceId_(key);
  const stars = parsePracticeStarCount_(starCount);
  if (!id || !key || !source || stars <= 0) return;
  if (!context.badgeStarsByUserId[id]) context.badgeStarsByUserId[id] = {};
  const current = context.badgeStarsByUserId[id][source];
  if (!current || stars > current.starCount) {
    context.badgeStarsByUserId[id][source] = {
      id: source,
      group: key.split('/')[0] || '',
      areaKey: key,
      starCount: stars,
      available: true,
      genericBadgeArea: true
    };
  }
}

function getPracticeTitleSourceFromRow_(area, detail, solvedIds) {
  const areaText = String(area || '').trim();
  const detailText = String(detail || '').trim();
  const ids = solvedIds || [];
  const historyDetailKey = detailText.replace(/\s+/g, '');
  if (areaText === '포켓몬') {
    const match = detailText.match(/^([1-9])세대$/);
    return match ? { id: 'pokemon_gen' + match[1], group: 'pokemon' } : null;
  }
  if (areaText === '인물') {
    if (detailText === '티니핑') return { id: 'people_티니핑', group: 'people' };
    if (historyDetailKey === '역사인물' || detailText === 'history-people' || historyDetailKey === '인물/역사인물') return { id: 'people_역사인물', group: 'people' };
    if (detailText === '아이돌') return { id: 'people_아이돌', group: 'people' };
    if (detailText === '애니') return { id: 'people_애니', group: 'people' };
  }
  if (areaText === '사회') {
    if (historyDetailKey === '역사인물' || detailText === 'history-people' || detailText === '사회/history-people') return { id: 'people_역사인물', group: 'people' };
    if (isAncientThreeKingdomsPracticeAlias_(detailText) || isAncientThreeKingdomsPracticeAlias_(areaText + '/' + detailText)) return { id: 'social_ancient_three_kingdoms', group: 'social' };
    if (isThreeKingdomsPracticeAlias_(detailText) || isThreeKingdomsPracticeAlias_(areaText + '/' + detailText)) return { id: 'social_three_kingdoms', group: 'social' };
  }
  if (isAncientThreeKingdomsPracticeAlias_(areaText) || isAncientThreeKingdomsPracticeAlias_(detailText) || isAncientThreeKingdomsPracticeAlias_(areaText + '/' + detailText)) {
    return { id: 'social_ancient_three_kingdoms', group: 'social' };
  }
  if (isThreeKingdomsPracticeAlias_(areaText) || isThreeKingdomsPracticeAlias_(detailText) || isThreeKingdomsPracticeAlias_(areaText + '/' + detailText)) {
    return { id: 'social_three_kingdoms', group: 'social' };
  }
  if (areaText === '국어') {
    if (normalizeReadingGmoPracticeDetail_(detailText) === '독서:지엠오 아이' || ids.some(isReadingGmoSolvedId_)) {
      return { id: 'korean_gmo', group: 'korean' };
    }
    if (normalizeWordRelationPracticeDetail_(detailText) === '다의어·동형이의어' || ids.some(isWordRelationSolvedId_)) {
      return { id: 'korean_word_relation', group: 'korean' };
    }
    const metaMap = getSubjectQuizMetaMap_();
    const normalizedDetail = normalizeReadingGmoPracticeDetail_(detailText);
    const meta = metaMap['국어:' + detailText] ||
                 metaMap['국어:' + normalizedDetail] ||
                 metaMap['국어:' + detailText.replace(/^독서:/, '')] ||
                 null;
    if (meta && meta.titleSource) return { id: meta.titleSource, group: meta.subjectGroup || meta.badgeGroup || 'korean' };
  }
  if (areaText === '일상') {
    if (detailText === '맞춤법') return { id: 'daily_맞춤법', group: 'daily' };
    if (detailText === '아재개그') return { id: 'daily_아재개그', group: 'daily' };
  }
  if (areaText === '수학') {
    const mathDetail = normalizeMathMulDivDetail_(detailText);
    if (mathDetail === '곱셈과 나눗셈') return { id: 'math_muldiv', group: 'math' };
    if (mathDetail) return { id: 'math_other', group: 'math' };
  }
  return null;
}

function normalizePracticeRecordHeader_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function findPracticeRecordColumnIndex_(headers, aliases, fallbackIndex) {
  const normalizedAliases = (aliases || []).map(normalizePracticeRecordHeader_);
  for (let i = 0; i < headers.length; i++) {
    const header = normalizePracticeRecordHeader_(headers[i]);
    if (normalizedAliases.indexOf(header) !== -1) return i;
  }
  return fallbackIndex;
}

function getPracticeRecordColumnMap_(sheet) {
  const width = Math.max(sheet ? sheet.getLastColumn() : 0, PRACTICE_RECORD_HEADERS.length);
  const headers = sheet ? sheet.getRange(1, 1, 1, width).getValues()[0] : PRACTICE_RECORD_HEADERS.slice();
  const indexes = {
    userId: findPracticeRecordColumnIndex_(headers, ['userId', '회원ID', '학생ID'], 0),
    grade: findPracticeRecordColumnIndex_(headers, ['학년', 'grade'], 1),
    classNo: findPracticeRecordColumnIndex_(headers, ['반', 'classNo', 'class'], 2),
    number: findPracticeRecordColumnIndex_(headers, ['번호', 'number', 'num'], 3),
    nickname: findPracticeRecordColumnIndex_(headers, ['닉네임', '이름', 'nickname', 'name'], 4),
    area: findPracticeRecordColumnIndex_(headers, ['영역', 'area', 'subject'], 5),
    detail: findPracticeRecordColumnIndex_(headers, ['세부구분', 'detail', 'quizKey', 'quizId', 'subFilter'], 6),
    progress: findPracticeRecordColumnIndex_(headers, ['맞힌개수', '현재진행도', '진행도', 'current', 'progress', 'correct'], 7),
    total: findPracticeRecordColumnIndex_(headers, ['전체개수', '목표개수', 'target', 'goal', 'total'], 8),
    solvedIds: findPracticeRecordColumnIndex_(headers, ['맞힌목록', 'solvedIds', 'correctIds', 'matchedIds', 'matchedList'], 9),
    starCount: findPracticeRecordColumnIndex_(headers, ['별개수', '별 수', '별', 'starCount', 'stars', 'badgeCount', '뱃지수', '뱃지개수'], 10),
    lastAchievedAt: findPracticeRecordColumnIndex_(headers, ['최근성취일시', 'lastAchievedAt'], 11),
    firstCompletedAt: findPracticeRecordColumnIndex_(headers, ['최초완주일시', 'firstCompletedAt'], 12),
    lastCompletedAt: findPracticeRecordColumnIndex_(headers, ['최근완주일시', 'lastCompletedAt'], 13),
    mode: findPracticeRecordColumnIndex_(headers, ['모드', 'mode'], 14)
  };
  return { width: width, headers: headers.map(value => String(value || '').trim()), indexes: indexes };
}

function getPracticeRecordValue_(row, columnMap, key) {
  const index = columnMap && columnMap.indexes ? columnMap.indexes[key] : -1;
  return index >= 0 ? row[index] : '';
}

function parsePracticeStarCount_(value) {
  if (typeof value === 'number') return Math.max(0, value);
  const text = String(value || '').trim();
  if (!text) return 0;
  const direct = Number(text);
  if (!isNaN(direct)) return Math.max(0, direct);
  const numeric = Number(text.replace(/[^0-9.-]/g, ''));
  return isNaN(numeric) ? 0 : Math.max(0, numeric);
}

function buildPracticeTitleDebugItem_(row, rowNumber, columnMap, source, areaKey, starCount, progress, total, solvedIds) {
  const solvedText = String(getPracticeRecordValue_(row, columnMap, 'solvedIds') || '');
  const detail = String(getPracticeRecordValue_(row, columnMap, 'detail') || '').trim();
  const normalizedDetail = normalizeReadingGmoPracticeDetail_(normalizeWordRelationPracticeDetail_(detail));
  const sourceResult = source ? Object.assign({}, source) : null;
  const recognized = !!areaKey;
  return {
    rowNumber: rowNumber,
    userId: String(getPracticeRecordValue_(row, columnMap, 'userId') || '').trim(),
    nickname: String(getPracticeRecordValue_(row, columnMap, 'nickname') || '').trim(),
    areaRaw: String(getPracticeRecordValue_(row, columnMap, 'area') || '').trim(),
    detailRaw: detail,
    progressRaw: getPracticeRecordValue_(row, columnMap, 'progress'),
    progress: progress,
    totalRaw: getPracticeRecordValue_(row, columnMap, 'total'),
    total: total,
    starCountRaw: getPracticeRecordValue_(row, columnMap, 'starCount'),
    starCount: starCount,
    solvedIdsPrefix: solvedText.slice(0, 100),
    solvedCount: (solvedIds || []).length,
    normalizedDetail: normalizedDetail,
    titleSource: sourceResult,
    areaKey: areaKey,
    recognized: recognized,
    includedInStarRows: recognized && starCount > 0,
    excludedReason: recognized
      ? (starCount > 0 ? '' : '별개수 parsed 값이 0입니다.')
      : '일반 타이틀용 areaKey를 만들지 못했습니다.'
  };
}

function isTargetPracticeTitleDebugRow_(item) {
  const userId = String((item || {}).userId || '').trim();
  const detail = String((item || {}).detailRaw || '').trim();
  const normalized = normalizeReadingGmoPracticeDetail_(normalizeWordRelationPracticeDetail_(detail));
  if ((userId === 'G4-C8-N19' || userId === 'G4-C8-N21') && normalized === '독서:지엠오 아이') return true;
  if (userId === 'G4-C8-N02' && normalized === '다의어·동형이의어') return true;
  return false;
}

function buildTitleContext_(options) {
  const startedAt = logPerfStart_('buildTitleContext_');
  const context = {
    badgeStarsByUserId: {},
    perfectFairyCountByUserId: {},
    rankingAreaStatsByUserId: {},
    diagnostics: {
      practiceRows: 0,
      practiceRecognizedRows: 0,
      practiceAreaKeyRows: 0,
      practiceStarRows: 0,
      practiceHeaders: [],
      practiceColumnIndexes: {},
      starRawSamples: [],
      starParsedSamples: [],
      practiceStarRowSamples: [],
      practiceDebugTargets: [],
      pokemonPracticeRows: 0,
      pokemonPracticeEarnedRows: 0,
      rankingRows: 0,
      usersWithPracticeStars: 0
    }
  };
  const opts = options || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    logPerf_('buildTitleContext_', startedAt, 'no spreadsheet');
    return context;
  }

  let stepStarted = Date.now();
  const practiceSheet = ss.getSheetByName(PRACTICE_RECORD_SHEET_NAME);
  if (practiceSheet && practiceSheet.getLastRow() >= 2) {
    const columnMap = getPracticeRecordColumnMap_(practiceSheet);
    context.diagnostics.practiceHeaders = columnMap.headers;
    context.diagnostics.practiceColumnIndexes = columnMap.indexes;
    const values = practiceSheet.getRange(2, 1, practiceSheet.getLastRow() - 1, columnMap.width).getValues();
    context.diagnostics.practiceRows = values.length;
    values.forEach((row, index) => {
      const userId = String(getPracticeRecordValue_(row, columnMap, 'userId') || '').trim();
      if (!userId) return;
      const area = getPracticeRecordValue_(row, columnMap, 'area');
      const detail = getPracticeRecordValue_(row, columnMap, 'detail');
      const progress = Number(getPracticeRecordValue_(row, columnMap, 'progress')) || 0;
      const total = Number(getPracticeRecordValue_(row, columnMap, 'total')) || 0;
      const solvedIds = uniquePokemonPracticeIds_(parsePokemonPracticeCorrectList_(getPracticeRecordValue_(row, columnMap, 'solvedIds')));
      const rawStarCount = getPracticeRecordValue_(row, columnMap, 'starCount');
      const starCount = parsePracticeStarCount_(rawStarCount);
      if (context.diagnostics.starRawSamples.length < 10) context.diagnostics.starRawSamples.push(rawStarCount);
      if (context.diagnostics.starParsedSamples.length < 10) context.diagnostics.starParsedSamples.push(starCount);
      const source = getPracticeTitleSourceFromRow_(area, detail, solvedIds);
      const areaKey = getPracticeBadgeAreaKeyFromRow_(area, detail, solvedIds);
      if (source) context.diagnostics.practiceRecognizedRows++;
      if (areaKey) context.diagnostics.practiceAreaKeyRows++;
      const debugItem = buildPracticeTitleDebugItem_(row, index + 2, columnMap, source, areaKey, starCount, progress, total, solvedIds);
      if (isTargetPracticeTitleDebugRow_(debugItem)) context.diagnostics.practiceDebugTargets.push(debugItem);
      if (starCount > 0 && areaKey) {
        context.diagnostics.practiceStarRows++;
        if (context.diagnostics.practiceStarRowSamples.length < 10) {
          context.diagnostics.practiceStarRowSamples.push({
            rowNumber: index + 2,
            userId: userId,
            area: String(area || '').trim(),
            detail: String(detail || '').trim(),
            source: source || null,
            areaKey: areaKey,
            rawStarCount: rawStarCount,
            starCount: starCount
          });
        }
        addTitleContextGenericBadgeArea_(context, userId, areaKey, starCount);
      }
      if (source) addTitleContextBadgeStar_(context, userId, source.id, source.group, starCount);
    });
    logPerf_('buildTitleContext_:practice getValues+index', stepStarted, 'rows=' + values.length);
  } else {
    logPerf_('buildTitleContext_:practice getValues+index', stepStarted, 'rows=0');
  }

  stepStarted = Date.now();
  const pokemonPracticeSheet = ss.getSheetByName(POKEMON_PRACTICE_RECORD_SHEET_NAME);
  if (pokemonPracticeSheet && pokemonPracticeSheet.getLastRow() >= 2) {
    const values = pokemonPracticeSheet.getRange(2, 1, pokemonPracticeSheet.getLastRow() - 1, Math.max(pokemonPracticeSheet.getLastColumn(), 12)).getValues();
    context.diagnostics.pokemonPracticeRows = values.length;
    values.forEach(row => {
      const userId = String(row[0] || '').trim();
      const match = String(row[5] || '').trim().match(/^([1-9])세대$/);
      const earned = row[6] === true || String(row[6]).toUpperCase() === 'TRUE';
      if (!userId || !match || !earned) return;
      context.diagnostics.pokemonPracticeEarnedRows++;
      const sourceId = 'pokemon_gen' + match[1];
      if (context.badgeStarsByUserId[userId] && context.badgeStarsByUserId[userId][sourceId]) return;
      addTitleContextBadgeStar_(context, userId, sourceId, 'pokemon', 1);
    });
    logPerf_('buildTitleContext_:pokemonPractice getValues+index', stepStarted, 'rows=' + values.length);
  } else {
    logPerf_('buildTitleContext_:pokemonPractice getValues+index', stepStarted, 'rows=0');
  }

  stepStarted = Date.now();
  const rankingRows = opts.rankingRows || getRankingRecordRows_();
  context.diagnostics.rankingRows = rankingRows.length;
  context.rankingAreaStatsByUserId = buildRankingAreaStatsByUserId_(rankingRows);
  Object.keys(context.rankingAreaStatsByUserId).forEach(userId => {
    context.perfectFairyCountByUserId[userId] = context.rankingAreaStatsByUserId[userId].perfectAreaCount || 0;
  });
  context.diagnostics.usersWithPracticeStars = Object.keys(context.badgeStarsByUserId).length;
  logPerf_('buildTitleContext_:ranking index', stepStarted, 'rows=' + rankingRows.length);
  logPerf_('buildTitleContext_', startedAt);
  return context;
}

function buildTitleBadgeSummaryFromContext_(userId, titleContext) {
  const sourceMap = titleContext && titleContext.badgeStarsByUserId ? titleContext.badgeStarsByUserId[String(userId || '').trim()] || {} : {};
  const items = Object.keys(sourceMap).map(key => Object.assign({}, sourceMap[key]));
  const totalStars = items.reduce((sum, item) => sum + (Number(item.starCount) || 0), 0);
  return {
    totalStars: totalStars,
    earnedBadgeCount: items.filter(item => item.available).length,
    items: items
  };
}

function getSelectedTitleForUserFromContext_(userId, selectedTitleValue, titleContext) {
  const badgeSummary = buildTitleBadgeSummaryFromContext_(userId, titleContext);
  const availableTitles = buildAvailableTitleList_(badgeSummary, userId, titleContext);
  return resolveSelectedTitle_(selectedTitleValue, availableTitles);
}

function ensureTitleStatusSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  let sheet = ss.getSheetByName(TITLE_STATUS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(TITLE_STATUS_SHEET_NAME);

  const currentHeaders = sheet.getRange(1, 1, 1, TITLE_STATUS_HEADERS.length).getValues()[0];
  const needsHeader = TITLE_STATUS_HEADERS.some((header, index) => String(currentHeaders[index] || '').trim() !== header);
  if (needsHeader) sheet.getRange(1, 1, 1, TITLE_STATUS_HEADERS.length).setValues([TITLE_STATUS_HEADERS]);

  return { sheet: sheet };
}

function titleDefinitionToStatusRow_(userId, title, now, previousAcquiredAt) {
  const item = title || {};
  const sourceParts = String(item.source || '').split('_');
  const sourceCategory = item.category || '';
  const sourceGroup = item.generation ? item.generation + '세대' : (sourceParts.length > 1 ? sourceParts.slice(1).join('_') : '');
  return [
    userId,
    item.id || '',
    item.title || '',
    item.theme || '',
    item.tier || '',
    item.effectClass || '',
    item.sourceType || '',
    sourceCategory,
    sourceGroup,
    previousAcquiredAt || now,
    now
  ];
}

function formatTitleStatusDate_(value) {
  if (!value) return '';
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  return String(value || '').trim();
}

function formatMemberTimestamp_(value) {
  if (!value) return '';
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  return String(value || '').trim();
}

function rowToTitleStatusItem_(row) {
  return {
    userId: String(row[0] || '').trim(),
    id: String(row[1] || '').trim(),
    title: String(row[2] || '').trim(),
    theme: String(row[3] || '').trim(),
    themeClass: row[3] ? 'title-theme-' + String(row[3]).trim() : '',
    tier: Number(row[4]) || 0,
    tierClass: row[4] ? 'title-tier-' + String(row[4]).trim() : '',
    effectClass: String(row[5] || '').trim(),
    sourceType: String(row[6] || '').trim(),
    category: String(row[7] || '').trim(),
    sourceGroup: String(row[8] || '').trim(),
    acquiredAt: formatTitleStatusDate_(row[9]),
    updatedAt: formatTitleStatusDate_(row[10])
  };
}

function enrichTitleStatusItem_(item, definitionMap) {
  const source = item || {};
  const definition = (definitionMap || {})[source.id] || {};
  const enriched = Object.assign({}, definition, source);
  enriched.title = definition.title || source.title || source.id || '';
  enriched.theme = source.theme || definition.theme || '';
  enriched.themeClass = source.themeClass || definition.themeClass || (enriched.theme ? 'title-theme-' + enriched.theme : '');
  enriched.tier = Number(source.tier || definition.tier) || 0;
  enriched.tierClass = source.tierClass || definition.tierClass || (enriched.tier ? 'title-tier-' + enriched.tier : '');
  enriched.effectClass = source.effectClass || definition.effectClass || '';
  enriched.conditionText = definition.conditionText || source.conditionText || '';
  enriched.description = definition.description || source.description || '';
  return enriched;
}

function getTitleStatusRows_() {
  const startedAt = logPerfStart_('getTitleStatusRows_');
  const sheetResult = ensureTitleStatusSheet_();
  if (sheetResult.error) {
    logPerf_('getTitleStatusRows_', startedAt, sheetResult.error);
    return [];
  }
  const sheet = sheetResult.sheet;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    logPerf_('getTitleStatusRows_', startedAt, 'rows=0');
    return [];
  }
  const rows = sheet.getRange(2, 1, lastRow - 1, TITLE_STATUS_HEADERS.length).getValues();
  logPerf_('getTitleStatusRows_', startedAt, 'rows=' + rows.length);
  return rows;
}

function buildTitleStatusMap_(userIds) {
  const startedAt = logPerfStart_('buildTitleStatusMap_');
  const definitionMap = getTitleDefinitionMap_();
  const filter = {};
  (userIds || []).forEach(userId => {
    const id = normalizeTitleUserId_(userId);
    if (id) filter[id] = true;
  });
  const useFilter = Object.keys(filter).length > 0;
  const map = {};
  getTitleStatusRows_().forEach(row => {
    const item = enrichTitleStatusItem_(rowToTitleStatusItem_(row), definitionMap);
    if (!item.userId || !item.id) return;
    if (useFilter && !filter[item.userId]) return;
    if (!map[item.userId]) map[item.userId] = [];
    map[item.userId].push(item);
  });
  Object.keys(map).forEach(userId => {
    map[userId].sort((a, b) => {
      if ((Number(a.tier) || 0) !== (Number(b.tier) || 0)) return (Number(a.tier) || 0) - (Number(b.tier) || 0);
      return String(a.title || '').localeCompare(String(b.title || ''), 'ko');
    });
  });
  logPerf_('buildTitleStatusMap_', startedAt, 'users=' + Object.keys(map).length);
  return map;
}

function getAvailableTitlesFromStatus_(userId) {
  const id = normalizeTitleUserId_(userId);
  return (buildTitleStatusMap_([id])[id] || []).map(item => Object.assign({}, item));
}

function getSelectedTitleFromStatus_(selectedTitleValue, availableTitles) {
  const resolved = resolveSelectedTitle_(selectedTitleValue, availableTitles || []);
  if (resolved) return resolved;
  const definition = getTitleDefinitionById_(selectedTitleValue);
  if (!definition) return null;
  return (availableTitles || []).find(item => item.id === definition.id) || null;
}

function buildMemberRowsForTitleRefresh_() {
  const memberSheetResult = getMemberSheet_();
  if (memberSheetResult.error) return { error: memberSheetResult.error, rows: [] };
  const sheet = memberSheetResult.sheet;
  ensureMemberHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rows: [] };
  return { rows: sheet.getRange(2, 1, lastRow - 1, MEMBER_INFO_COLUMN_COUNT).getValues() };
}

function buildTitleRowsForMembers_(memberRows, titleContext, now, previousAcquiredAtByKey) {
  const rows = [];
  const byUserId = {};
  (memberRows || []).forEach(row => {
    const userId = String(row[0] || '').trim();
    if (!userId) return;
    const badgeSummary = buildTitleBadgeSummaryFromContext_(userId, titleContext);
    const titles = buildAvailableTitleList_(badgeSummary, userId, titleContext);
    byUserId[userId] = titles;
    titles.forEach(title => {
      const key = userId + '|' + title.id;
      rows.push(titleDefinitionToStatusRow_(userId, title, now, previousAcquiredAtByKey && previousAcquiredAtByKey[key]));
    });
  });
  return { rows: rows, byUserId: byUserId };
}

function buildMissingTitleRowsForMembers_(memberRows, titleContext, now, previousAcquiredAtByKey) {
  const built = buildTitleRowsForMembers_(memberRows, titleContext, now, previousAcquiredAtByKey);
  const missingRows = [];
  const missingByUserId = {};
  const titleCounts = {};
  const missingTitleCounts = {};
  built.rows.forEach(row => {
    const titleId = String(row[1] || '').trim();
    if (titleId) titleCounts[titleId] = (titleCounts[titleId] || 0) + 1;
  });
  built.rows.forEach(row => {
    const userId = String(row[0] || '').trim();
    const titleId = String(row[1] || '').trim();
    const key = userId + '|' + titleId;
    if (!userId || !titleId || (previousAcquiredAtByKey && previousAcquiredAtByKey[key])) return;
    missingRows.push(row);
    missingTitleCounts[titleId] = (missingTitleCounts[titleId] || 0) + 1;
    if (!missingByUserId[userId]) missingByUserId[userId] = [];
    missingByUserId[userId].push(row);
  });
  return {
    rows: missingRows,
    byUserId: built.byUserId,
    missingByUserId: missingByUserId,
    titleCounts: titleCounts,
    missingTitleCounts: missingTitleCounts,
    totalAvailableTitleRows: built.rows.length
  };
}

function buildSubjectTitlePreviewSamples_(availableTitlesByUserId) {
  const result = {
    korean: [],
    math: [],
    social: []
  };
  Object.keys(availableTitlesByUserId || {}).forEach(userId => {
    const titles = availableTitlesByUserId[userId] || [];
    ['korean', 'math', 'social'].forEach(subjectGroup => {
      if (result[subjectGroup].length >= 10) return;
      const detailTitles = getSubjectDetailTitleItems_(titles, subjectGroup);
      if (!detailTitles.length) return;
      result[subjectGroup].push({
        userId: userId,
        count: detailTitles.length,
        titleIds: detailTitles.map(title => title.id),
        titles: detailTitles.map(title => title.title)
      });
    });
  });
  return result;
}

function getExistingTitleStatusAcquiredMap_() {
  const map = {};
  getTitleStatusRows_().forEach(row => {
    const userId = String(row[0] || '').trim();
    const titleId = String(row[1] || '').trim();
    if (userId && titleId) map[userId + '|' + titleId] = row[9] || '';
  });
  return map;
}

function previewRefreshAllUserTitles() {
  const startedAt = logPerfStart_('previewRefreshAllUserTitles');
  const memberResult = buildMemberRowsForTitleRefresh_();
  if (memberResult.error) return { success: false, message: memberResult.error };
  const titleContext = buildTitleContext_();
  const built = buildMissingTitleRowsForMembers_(memberResult.rows, titleContext, new Date(), getExistingTitleStatusAcquiredMap_());
  const subjectTitleSamples = buildSubjectTitlePreviewSamples_(built.byUserId);
  Logger.log('[타이틀현황 preview] members=%s availableTitleRows=%s missingTitleRows=%s', memberResult.rows.length, built.totalAvailableTitleRows, built.rows.length);
  Logger.log('[타이틀현황 preview context] %s', JSON.stringify(titleContext.diagnostics || {}));
  const diagnostics = titleContext.diagnostics || {};
  Logger.log('[뱃지현황 headers] %s', JSON.stringify(diagnostics.practiceHeaders || []));
  Logger.log('[뱃지현황 column indexes] %s', JSON.stringify(diagnostics.practiceColumnIndexes || {}));
  Logger.log('[별개수 raw sample] %s', JSON.stringify(diagnostics.starRawSamples || []));
  Logger.log('[별개수 parsed sample] %s', JSON.stringify(diagnostics.starParsedSamples || []));
  Logger.log('[별개수 > 0 row sample] %s', JSON.stringify(diagnostics.practiceStarRowSamples || []));
  Logger.log('[지정 행 진단] %s', JSON.stringify(diagnostics.practiceDebugTargets || []));
  [
    'sparkling_newbie',
    'quiz_school_newbie',
    'quiz_school_intermediate',
    'quiz_school_expert',
    'perfect_score_fairy',
    'quiz_mania',
    'korean_mania',
    'korean_master',
    'korean_god',
    'math_mania',
    'math_master',
    'math_god',
    'social_mania',
    'social_master',
    'social_god'
  ].forEach(titleId => {
    Logger.log('%s candidates: %s, missing: %s', titleId, built.titleCounts[titleId] || 0, built.missingTitleCounts[titleId] || 0);
  });
  Logger.log('[교과별 세부 타이틀 보유 샘플] %s', JSON.stringify(subjectTitleSamples));
  Object.keys(built.missingByUserId).slice(0, 30).forEach(userId => {
    Logger.log('userId=%s missingTitles=%s', userId, built.missingByUserId[userId].map(row => row[2]).join(', ') || '(none)');
  });
  logPerf_('previewRefreshAllUserTitles', startedAt, 'members=' + memberResult.rows.length + ' missingTitles=' + built.rows.length);
  return {
    success: true,
    preview: true,
    memberCount: memberResult.rows.length,
    titleCount: built.totalAvailableTitleRows,
    missingTitleCount: built.rows.length,
    diagnostics: titleContext.diagnostics || {},
    titleCounts: built.titleCounts,
    missingTitleCounts: built.missingTitleCounts,
    subjectTitleSamples: subjectTitleSamples,
    practiceDebugTargets: (titleContext.diagnostics || {}).practiceDebugTargets || [],
    sampleMissing: Object.keys(built.missingByUserId).slice(0, 20).map(userId => ({
      userId: userId,
      titles: built.missingByUserId[userId].map(row => row[2])
    }))
  };
}

function refreshAllUserTitles() {
  const startedAt = logPerfStart_('refreshAllUserTitles');
  const memberResult = buildMemberRowsForTitleRefresh_();
  if (memberResult.error) return { success: false, message: memberResult.error };
  const sheetResult = ensureTitleStatusSheet_();
  if (sheetResult.error) return { success: false, message: sheetResult.error };

  const sheet = sheetResult.sheet;
  const existingAcquiredAt = getExistingTitleStatusAcquiredMap_();
  const titleContext = buildTitleContext_();
  const built = buildMissingTitleRowsForMembers_(memberResult.rows, titleContext, new Date(), existingAcquiredAt);
  if (built.rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, built.rows.length, TITLE_STATUS_HEADERS.length).setValues(built.rows);
  Logger.log('[타이틀현황 refreshAll] members=%s appendedMissingTitleRows=%s', memberResult.rows.length, built.rows.length);
  logPerf_('refreshAllUserTitles', startedAt, 'members=' + memberResult.rows.length + ' appended=' + built.rows.length);
  return { success: true, memberCount: memberResult.rows.length, appendedTitleCount: built.rows.length };
}

function refreshUserTitles(userId) {
  const startedAt = logPerfStart_('refreshUserTitles');
  const id = String(userId || '').trim();
  if (!id) return { success: false, message: 'userId가 필요합니다.' };
  const memberResult = buildMemberRowsForTitleRefresh_();
  if (memberResult.error) return { success: false, message: memberResult.error };
  const memberRow = (memberResult.rows || []).find(row => String(row[0] || '').trim() === id);
  if (!memberRow) return { success: false, message: '회원정보를 찾을 수 없습니다.' };

  const sheetResult = ensureTitleStatusSheet_();
  if (sheetResult.error) return { success: false, message: sheetResult.error };
  const sheet = sheetResult.sheet;
  const existingAcquiredAt = getExistingTitleStatusAcquiredMap_();
  const titleContext = buildTitleContext_();
  const built = buildMissingTitleRowsForMembers_([memberRow], titleContext, new Date(), existingAcquiredAt);
  if (built.rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, built.rows.length, TITLE_STATUS_HEADERS.length).setValues(built.rows);
  Logger.log('[타이틀현황 refreshUser] userId=%s appendedMissingTitleRows=%s', id, built.rows.length);
  logPerf_('refreshUserTitles', startedAt, 'userId=' + id + ' appended=' + built.rows.length);
  return { success: true, userId: id, appendedTitleCount: built.rows.length };
}

function debugTitleStatusForUserId(userId) {
  const input = String(userId || '').trim();
  const normalized = normalizeTitleUserId_(input);
  Logger.log('[debugTitleStatusForUserId] input=%s normalized=%s', input, normalized);

  const rows = getTitleStatusRows_();
  const matchedRows = rows.filter(row => normalizeTitleUserId_(row[0]) === normalized);
  Logger.log('[debugTitleStatusForUserId] titleStatusRows=%s', matchedRows.length);
  matchedRows.forEach((row, index) => {
    Logger.log(
      '#%s userId=%s titleId=%s titleName=%s theme=%s tier=%s effect=%s',
      index + 1,
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5]
    );
  });

  const memberSheet = getMemberSheet_();
  let selectedTitle = '';
  if (!memberSheet.error) {
    ensureMemberHeaders_(memberSheet.sheet);
    const found = findMemberRow_(memberSheet.sheet, normalized);
    if (found) selectedTitle = String(found.values[MEMBER_SELECTED_TITLE_COLUMN - 1] || '').trim();
  }
  Logger.log('[debugTitleStatusForUserId] selectedTitle=%s', selectedTitle);

  const response = getAvailableTitlesForMember(normalized);
  Logger.log('[debugTitleStatusForUserId] getAvailableTitlesForMember=%s', JSON.stringify(response));
  return response;
}

function debugTitleStatusForN21() {
  return debugTitleStatusForUserId('G4-C8-N21');
}

function makeMemberUserId_(school, grade, classNo, number) {
  const baseUserId = makeUserId(grade, classNo, number);
  if (!baseUserId) return '';
  const normalizedSchool = normalizeMemberSchool_(school);
  if (normalizedSchool === DEFAULT_MEMBER_SCHOOL) return baseUserId;
  const schoolKey = normalizedSchool.replace(/[^0-9A-Za-z가-힣_-]/g, '');
  return schoolKey ? `S${schoolKey}-${baseUserId}` : baseUserId;
}

function getLegacyUserIdCandidates_(grade, classNo, number) {
  const g = String(Number(grade));
  const c = String(Number(classNo));
  const n = String(Number(number));
  if (!g || !c || !n || g === 'NaN' || c === 'NaN' || n === 'NaN') return [];
  return [
    `${g}-${c}-${n}`,
    `${g}-${c}-${String(Number(number)).padStart(2, '0')}`,
    `${2000 + Number(g)}-${c}-${n}`,
    `${2000 + Number(g)}-${c}-${String(Number(number)).padStart(2, '0')}`
  ];
}

function isLegacyDateUserIdMatch_(value, grade, classNo, number) {
  if (!(value instanceof Date)) return false;
  const g = Number(grade);
  const c = Number(classNo);
  const n = Number(number);
  if (!g || !c || !n) return false;
  return (
    (value.getFullYear() === 2000 + g && value.getMonth() + 1 === c && value.getDate() === n) ||
    (value.getMonth() + 1 === g && value.getDate() === c && value.getFullYear() % 100 === n)
  );
}

function getMemberSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };
  const sheet = ss.getSheetByName('회원정보');
  if (!sheet) return { error: '회원정보 시트를 찾을 수 없습니다. 회원정보 시트를 만들고 헤더를 확인해 주세요.' };
  return { sheet };
}

function ensureMemberPasswordHeader_(sheet) {
  if (!sheet) return;
  sheet.getRange('I:I').setNumberFormat('@');
  const header = String(sheet.getRange(1, 9).getValue() || '').trim();
  if (!header) sheet.getRange(1, 9).setValue('비밀번호');
}

function ensureMemberSchoolHeader_(sheet) {
  if (!sheet) return;
  const header = String(sheet.getRange(1, MEMBER_SCHOOL_COLUMN).getValue() || '').trim();
  if (!header) sheet.getRange(1, MEMBER_SCHOOL_COLUMN).setValue('학교');
}

function ensureMemberSelectedTitleHeader_(sheet) {
  if (!sheet) return;
  const header = String(sheet.getRange(1, MEMBER_SELECTED_TITLE_COLUMN).getValue() || '').trim();
  if (!header) sheet.getRange(1, MEMBER_SELECTED_TITLE_COLUMN).setValue('선택타이틀');
}

function ensureMemberRankingMessageHeader_(sheet) {
  if (!sheet) return;
  const header = String(sheet.getRange(1, MEMBER_RANKING_MESSAGE_COLUMN).getValue() || '').trim();
  if (!header) sheet.getRange(1, MEMBER_RANKING_MESSAGE_COLUMN).setValue('랭킹한마디');
}

function normalizeMemberRole_(value) {
  return String(value || '').trim().toLowerCase() === ADMIN_MEMBER_ROLE ? ADMIN_MEMBER_ROLE : DEFAULT_MEMBER_ROLE;
}

function normalizeMemberStatus_(value) {
  return String(value || '').trim().toLowerCase() === INACTIVE_MEMBER_STATUS ? INACTIVE_MEMBER_STATUS : ACTIVE_MEMBER_STATUS;
}

function ensureMemberRoleStatusHeaders_(sheet) {
  if (!sheet) return;
  const headers = sheet.getRange(1, MEMBER_ROLE_COLUMN, 1, 2).getValues()[0];
  if (!String(headers[0] || '').trim()) sheet.getRange(1, MEMBER_ROLE_COLUMN).setValue('role');
  if (!String(headers[1] || '').trim()) sheet.getRange(1, MEMBER_STATUS_COLUMN).setValue('status');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const range = sheet.getRange(2, MEMBER_ROLE_COLUMN, lastRow - 1, 2);
  const values = range.getValues();
  let changed = false;
  const nextValues = values.map(row => {
    const rawRole = String(row[0] || '').trim();
    const rawStatus = String(row[1] || '').trim();
    const role = rawRole || DEFAULT_MEMBER_ROLE;
    const status = rawStatus || ACTIVE_MEMBER_STATUS;
    if (role !== row[0] || status !== row[1]) changed = true;
    return [role, status];
  });
  if (changed) range.setValues(nextValues);
}

function ensureMemberHeaders_(sheet) {
  ensureMemberPasswordHeader_(sheet);
  ensureMemberSchoolHeader_(sheet);
  ensureMemberSelectedTitleHeader_(sheet);
  ensureMemberRankingMessageHeader_(sheet);
  ensureMemberRoleStatusHeaders_(sheet);
}

function ensureSchoolListSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  let sheet = ss.getSheetByName(SCHOOL_LIST_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SCHOOL_LIST_SHEET_NAME);

  const headers = ['표시이름', '공식학교명', '사용여부'];
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = headers.some((header, index) => String(currentHeaders[index] || '').trim() !== header);
  if (needsHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (sheet.getLastRow() < 2) {
    sheet.getRange(2, 1, SCHOOL_LIST_DEFAULT_ROWS.length, 3).setValues(SCHOOL_LIST_DEFAULT_ROWS);
  }

  return { sheet };
}

function searchSeoulElementarySchools(keyword) {
  const query = normalizeMemberSchool_(keyword);
  if (!query) return [];

  const sheetResult = ensureSchoolListSheet();
  if (sheetResult.error) return { error: sheetResult.error };

  const sheet = sheetResult.sheet;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  return values
    .filter(row => {
      const enabled = row[2] === true || String(row[2]).toUpperCase() === 'TRUE';
      if (!enabled) return false;
      const displayName = String(row[0] || '').trim();
      const officialName = String(row[1] || '').trim();
      return displayName.indexOf(query) !== -1 || officialName.indexOf(query) !== -1;
    })
    .map(row => ({
      displayName: normalizeMemberSchool_(row[0]),
      officialName: String(row[1] || '').trim()
    }))
    .slice(0, 5);
}

function generateMemberPassword(grade, classNo, number) {
  const g = String(Number(grade || '')).trim();
  const c = String(Number(classNo || '')).trim();
  const n = String(Number(number || '')).trim();
  if (!g || !c || !n || g === 'NaN' || c === 'NaN' || n === 'NaN') return '';
  return g + c + n.padStart(2, '0');
}

function validateMemberPassword_(password) {
  const value = String(password || '');
  if (value.length < 4 || value.length > 10) return '비밀번호는 4~10자리여야 합니다.';
  if (!/^[A-Za-z0-9]+$/.test(value)) return '비밀번호는 영어 대소문자와 숫자만 사용할 수 있습니다.';
  if (value.charAt(0) === '0') return '비밀번호는 0으로 시작할 수 없습니다.';
  return '';
}

function getResolvedMemberSelectedTitle_(userId, selectedTitleValue, titleContext) {
  const id = String(userId || '').trim();
  const value = String(selectedTitleValue || '').trim();
  if (!id || !value) return null;
  if (titleContext) return getSelectedTitleForUserFromContext_(id, value, titleContext);
  const badgeSummary = buildMyRoomBadgeSummary_(id);
  const availableTitles = buildAvailableTitleList_(badgeSummary, id);
  return resolveSelectedTitle_(value, availableTitles);
}

function normalizeRankingMessage_(value) {
  return String(value || '').trim().replace(/[ \t\f\v]+/g, ' ');
}

function normalizeRankingMessageForFilter_(value) {
  return normalizeRankingMessage_(value)
    .toLowerCase()
    .replace(/[0０o]/g, 'o')
    .replace(/[1１!|i]/g, 'i')
    .replace(/[3３]/g, 'e')
    .replace(/[4４@]/g, 'a')
    .replace(/[5５$]/g, 's')
    .replace(/[7７]/g, 't')
    .replace(/[\s._\-~`'"()[\]{}<>:;,+*=\\\/?%^&]/g, '');
}

function validateRankingMessage_(value) {
  const raw = String(value || '');
  if (/[\r\n]/.test(raw)) return { error: '랭킹 한마디는 줄바꿈 없이 입력해 주세요.' };
  const rankingMessage = normalizeRankingMessage_(raw);
  if (rankingMessage.length > MAX_RANKING_MESSAGE_LENGTH) {
    return { error: '랭킹 한마디는 ' + MAX_RANKING_MESSAGE_LENGTH + '자 이내로 입력해 주세요.' };
  }
  const filterText = normalizeRankingMessageForFilter_(rankingMessage);
  if (filterText && BANNED_RANKING_MESSAGE_WORDS.some(word => filterText.indexOf(normalizeRankingMessageForFilter_(word)) !== -1)) {
    return { error: '사용할 수 없는 표현이 포함되어 있어요. 다른 말로 바꿔 주세요.' };
  }
  return { rankingMessage: rankingMessage };
}

function memberRowToObject_(row) {
  const userId = String(row[0] || '').trim();
  const selectedTitleId = String(row[10] || '').trim();
  const selectedTitle = getTitleDefinitionById_(selectedTitleId) || (selectedTitleId ? { id: '', title: selectedTitleId } : null);
  return {
    userId: userId,
    grade: String(row[1] || '').trim(),
    classNo: String(row[2] || '').trim(),
    number: String(row[3] || '').trim(),
    nickname: String(row[4] || '').trim(),
    profileImageUrl: String(row[5] || '').trim(),
    school: normalizeMemberSchool_(row[9]),
    schoolShortName: formatSchoolShortName_(row[9]),
    role: normalizeMemberRole_(row[MEMBER_ROLE_COLUMN - 1]),
    status: normalizeMemberStatus_(row[MEMBER_STATUS_COLUMN - 1]),
    rankingMessage: normalizeRankingMessage_(row[MEMBER_RANKING_MESSAGE_COLUMN - 1]),
    selectedTitleId: selectedTitle && selectedTitle.id ? selectedTitle.id : selectedTitleId,
    selectedTitle: selectedTitle ? selectedTitle.title : '',
    selectedTitleThemeClass: selectedTitle ? selectedTitle.themeClass : '',
    selectedTitleTierClass: selectedTitle ? selectedTitle.tierClass : '',
    selectedTitleEffectClass: selectedTitle ? selectedTitle.effectClass : ''
  };
}

function isActiveStudentMember_(member) {
  const item = member || {};
  return normalizeMemberRole_(item.role) === DEFAULT_MEMBER_ROLE &&
    normalizeMemberStatus_(item.status) === ACTIVE_MEMBER_STATUS;
}

function isActiveAdminMember_(member) {
  const item = member || {};
  return normalizeMemberRole_(item.role) === ADMIN_MEMBER_ROLE &&
    normalizeMemberStatus_(item.status) === ACTIVE_MEMBER_STATUS;
}

function findMemberRow_(sheet, userId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const values = sheet.getRange(2, 1, lastRow - 1, MEMBER_INFO_COLUMN_COUNT).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === userId) {
      return { rowNumber: i + 2, values: values[i] };
    }
  }
  return null;
}

function ensureMemberStatusChangeLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  let sheet = ss.getSheetByName(MEMBER_STATUS_CHANGE_LOG_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(MEMBER_STATUS_CHANGE_LOG_SHEET_NAME);

  const headers = MEMBER_STATUS_CHANGE_LOG_HEADERS;
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = headers.some((header, index) => String(currentHeaders[index] || '').trim() !== header);
  if (needsHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  return sheet;
}

function appendMemberStatusChangeLog_(log) {
  const sheet = ensureMemberStatusChangeLogSheet_();
  sheet.appendRow([
    log.changedAt,
    log.adminUserId,
    log.adminNickname,
    log.targetUserId,
    log.targetNickname,
    log.previousStatus,
    log.nextStatus,
    log.reason
  ]);
}

function ensureMemberDeleteLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  let sheet = ss.getSheetByName(MEMBER_DELETE_LOG_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(MEMBER_DELETE_LOG_SHEET_NAME);

  const headers = MEMBER_DELETE_LOG_HEADERS;
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = headers.some((header, index) => String(currentHeaders[index] || '').trim() !== header);
  if (needsHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  return sheet;
}

function appendMemberDeleteLog_(log) {
  const sheet = ensureMemberDeleteLogSheet_();
  sheet.appendRow([
    log.deletedAt,
    log.adminUserId,
    log.adminNickname,
    log.deletedUserId,
    log.deletedNickname,
    log.school,
    log.grade,
    log.classNo,
    log.number,
    log.reason
  ]);
}

function findMemberRowByGradeClassNumber_(sheet, grade, classNo, number, school) {
  const normalizedSchool = normalizeMemberSchool_(school);
  const userId = makeMemberUserId_(normalizedSchool, grade, classNo, number);
  const candidates = normalizedSchool === DEFAULT_MEMBER_SCHOOL ? [userId].concat(getLegacyUserIdCandidates_(grade, classNo, number)) : [userId];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const values = sheet.getRange(2, 1, lastRow - 1, MEMBER_INFO_COLUMN_COUNT).getValues();
  for (let i = 0; i < values.length; i++) {
    const stored = values[i][0];
    const storedText = String(stored || '').trim();
    const rowSchool = normalizeMemberSchool_(values[i][9]);
    if (rowSchool !== normalizedSchool) continue;
    if (candidates.indexOf(storedText) !== -1 || (normalizedSchool === DEFAULT_MEMBER_SCHOOL && isLegacyDateUserIdMatch_(stored, grade, classNo, number))) {
      return { rowNumber: i + 2, values: values[i] };
    }
  }
  return null;
}

function findMemberRowsByIdentityAndPassword_(sheet, grade, classNo, number, password) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const targetGrade = String(grade || '').trim();
  const targetClassNo = String(classNo || '').trim();
  const targetNumber = String(Number(number || '')).trim();
  const targetPassword = String(password || '').trim();
  if (!targetGrade || !targetClassNo || !targetNumber || !targetPassword || targetNumber === 'NaN') return [];

  const values = sheet.getRange(2, 1, lastRow - 1, MEMBER_INFO_COLUMN_COUNT).getValues();
  const matches = [];
  values.forEach((row, index) => {
    const rowGrade = String(row[1] || '').trim();
    const rowClassNo = String(row[2] || '').trim();
    const rowNumber = String(Number(row[3] || '')).trim();
    const rowPassword = String(row[8] || '').trim();
    if (rowGrade === targetGrade && rowClassNo === targetClassNo && rowNumber === targetNumber && rowPassword === targetPassword) {
      matches.push({
        rowNumber: index + 2,
        values: row,
        school: normalizeMemberSchool_(row[9])
      });
    }
  });
  return matches;
}

function pickLoginRowWithoutConfirmedSchool_(matches) {
  const activeStudentMatches = matches.filter(item => isActiveStudentMember_(memberRowToObject_(item.values)));
  if (activeStudentMatches.length !== 1) return null;
  return activeStudentMatches[0];
}

function registerMember(grade, classNo, number, nickname, school) {
  const nick = String(nickname || '').trim();
  if (!nick) return { error: '닉네임을 입력해 주세요.' };

  const normalizedSchool = normalizeMemberSchool_(school);
  const userId = makeMemberUserId_(normalizedSchool, grade, classNo, number);
  if (!userId) return { error: '학교, 학년, 반, 번호를 선택해 주세요.' };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { error: memberSheet.error };

  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);
  const existing = findMemberRowByGradeClassNumber_(sheet, grade, classNo, number, normalizedSchool);
  if (existing) return { error: '이미 가입된 학교-학년-반-번호입니다. 로그인해 주세요.' };

  const now = new Date();
  const password = generateMemberPassword(grade, classNo, number);
  const member = {
    userId: userId,
    school: normalizedSchool,
    schoolShortName: formatSchoolShortName_(normalizedSchool),
    grade: String(grade || '').trim(),
    classNo: String(classNo || '').trim(),
    number: String(Number(number)),
    nickname: nick,
    profileImageUrl: '',
    rankingMessage: '',
    role: DEFAULT_MEMBER_ROLE,
    status: ACTIVE_MEMBER_STATUS,
    selectedTitleId: '',
    selectedTitle: '',
    initialPassword: password
  };
  sheet.appendRow([member.userId, member.grade, member.classNo, member.number, member.nickname, member.profileImageUrl, now, now, password, member.school, '', '', member.role, member.status]);
  return member;
}

function loginMember(grade, classNo, number, password, school, schoolConfirmed) {
  const normalizedSchool = normalizeMemberSchool_(school);
  const inputPassword = String(password || '').trim();
  if (!inputPassword) return { error: '비밀번호를 입력하세요.' };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { error: memberSheet.error };

  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);
  const passwordMatches = findMemberRowsByIdentityAndPassword_(sheet, grade, classNo, number, inputPassword);
  let found = null;
  if (schoolConfirmed !== true) {
    const activeStudentMatches = passwordMatches.filter(item => isActiveStudentMember_(memberRowToObject_(item.values)));
    if (activeStudentMatches.length > 1) {
      return {
        error: '같은 학년/반/번호/비밀번호를 가진 계정이 여러 학교에 있습니다. 학교를 먼저 확인해주세요.',
        needsSchoolConfirmation: true
      };
    }
    if (activeStudentMatches.length === 1) {
      found = activeStudentMatches[0];
    }
    if (!found) {
      const inactiveStudentMatches = passwordMatches.filter(item => {
        const member = memberRowToObject_(item.values);
        return member.role === DEFAULT_MEMBER_ROLE && member.status === INACTIVE_MEMBER_STATUS;
      });
      if (inactiveStudentMatches.length > 0) {
        return { error: '비활성화된 계정입니다. 관리자에게 문의하세요.' };
      }
      const activeAdminMatches = passwordMatches.filter(item => isActiveAdminMember_(memberRowToObject_(item.values)));
      if (activeAdminMatches.length > 0) {
        return { error: '관리자 계정입니다. 관리자 버튼을 눌러 로그인해주세요.' };
      }
    }
    if (!found) return { error: '가입된 회원정보가 없습니다. 먼저 가입해 주세요.' };
  } else {
    found = findMemberRowByGradeClassNumber_(sheet, grade, classNo, number, normalizedSchool);
  }
  if (!found) return { error: '가입된 회원정보가 없습니다. 먼저 가입해 주세요.' };

  const storedPassword = String(found.values[8] || '').trim();
  if (!storedPassword) return { error: '비밀번호가 아직 설정되지 않았습니다. 선생님께 문의하세요.' };
  if (storedPassword !== inputPassword) return { error: '비밀번호가 일치하지 않습니다.' };

  const member = memberRowToObject_(found.values);
  if (member.status === INACTIVE_MEMBER_STATUS) return { error: '비활성화된 계정입니다. 선생님께 문의하세요.' };

  memberSheet.sheet.getRange(found.rowNumber, 8).setValue(new Date());
  return member;
}

function getAdminMemberList(adminUserId) {
  const id = String(adminUserId || '').trim();
  if (!id) return { success: false, error: '관리자 로그인이 필요합니다.' };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { success: false, error: memberSheet.error };

  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);
  const adminRow = findMemberRow_(sheet, id);
  if (!adminRow || !isActiveAdminMember_(memberRowToObject_(adminRow.values))) {
    return { success: false, error: '관리자 권한이 없습니다.' };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      success: true,
      members: [],
      summary: { total: 0, activeStudents: 0, inactive: 0, admins: 0 }
    };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, MEMBER_INFO_COLUMN_COUNT).getValues();
  const members = values.map(row => ({
    userId: String(row[0] || '').trim(),
    school: normalizeMemberSchool_(row[9]),
    schoolShortName: formatSchoolShortName_(row[9]),
    grade: String(row[1] || '').trim(),
    classNo: String(row[2] || '').trim(),
    number: String(row[3] || '').trim(),
    nickname: String(row[4] || '').trim(),
    role: normalizeMemberRole_(row[MEMBER_ROLE_COLUMN - 1]),
    status: normalizeMemberStatus_(row[MEMBER_STATUS_COLUMN - 1]),
    createdAt: formatMemberTimestamp_(row[6]),
    updatedAt: formatMemberTimestamp_(row[7])
  }));
  const summary = members.reduce((acc, member) => {
    acc.total++;
    if (member.role === DEFAULT_MEMBER_ROLE && member.status === ACTIVE_MEMBER_STATUS) acc.activeStudents++;
    if (member.status === INACTIVE_MEMBER_STATUS) acc.inactive++;
    if (member.role === ADMIN_MEMBER_ROLE) acc.admins++;
    return acc;
  }, { total: 0, activeStudents: 0, inactive: 0, admins: 0 });

  return { success: true, members: members, summary: summary };
}

function getEmptyMemberUsageSummary_() {
  return {
    hasAnyUsage: false,
    practiceCount: 0,
    pokemonPracticeCount: 0,
    rankingCount: 0,
    oldRecordCount: 0,
    myRoomCount: 0,
    nicknameHistoryCount: 0,
    titleStatusCount: 0,
    sentHeartCount: 0,
    receivedHeartCount: 0
  };
}

function getOrCreateMemberUsageSummary_(usageMap, userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  if (!usageMap[id]) usageMap[id] = getEmptyMemberUsageSummary_();
  return usageMap[id];
}

function incrementMemberUsageSummary_(usageMap, userId, fieldName, count) {
  const summary = getOrCreateMemberUsageSummary_(usageMap, userId);
  if (!summary) return;
  summary[fieldName] = (summary[fieldName] || 0) + (count || 1);
  summary.hasAnyUsage = true;
}

function addMemberUsageCountsFromSheet_(usageMap, sheet, userIdColumn, fieldName) {
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, userIdColumn, lastRow - 1, 1).getValues();
  values.forEach(row => {
    const userId = String(row[0] || '').trim();
    if (userId) incrementMemberUsageSummary_(usageMap, userId, fieldName, 1);
  });
}

function addRoomHeartUsageCounts_(usageMap, sheet) {
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
  values.forEach(row => {
    const senderId = String(row[0] || '').trim();
    const receiverId = String(row[1] || '').trim();
    if (senderId) incrementMemberUsageSummary_(usageMap, senderId, 'sentHeartCount', 1);
    if (receiverId) incrementMemberUsageSummary_(usageMap, receiverId, 'receivedHeartCount', 1);
  });
}

function getMemberUsageSummaryMap_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usageMap = {};
  if (!ss) return usageMap;

  addMemberUsageCountsFromSheet_(usageMap, ss.getSheetByName(PRACTICE_RECORD_SHEET_NAME), 1, 'practiceCount');
  addMemberUsageCountsFromSheet_(usageMap, ss.getSheetByName(POKEMON_PRACTICE_RECORD_SHEET_NAME), 1, 'pokemonPracticeCount');
  addMemberUsageCountsFromSheet_(usageMap, ss.getSheetByName('랭킹기록'), 5, 'rankingCount');
  addMemberUsageCountsFromSheet_(usageMap, ss.getSheetByName('기록저장'), 5, 'oldRecordCount');
  addMemberUsageCountsFromSheet_(usageMap, ss.getSheetByName(MY_ROOM_SETTINGS_SHEET_NAME), 1, 'myRoomCount');
  addMemberUsageCountsFromSheet_(usageMap, ss.getSheetByName('닉네임이력'), 2, 'nicknameHistoryCount');
  addMemberUsageCountsFromSheet_(usageMap, ss.getSheetByName(TITLE_STATUS_SHEET_NAME), 1, 'titleStatusCount');
  addRoomHeartUsageCounts_(usageMap, ss.getSheetByName('집좋아요기록'));
  return usageMap;
}

function getAdminDuplicateMemberReport(adminUserId) {
  const id = String(adminUserId || '').trim();
  if (!id) return { success: false, error: '관리자 로그인이 필요합니다.' };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { success: false, error: memberSheet.error };

  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);
  const adminRow = findMemberRow_(sheet, id);
  if (!adminRow || !isActiveAdminMember_(memberRowToObject_(adminRow.values))) {
    return { success: false, error: '관리자 권한이 없습니다.' };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      success: true,
      duplicateGroups: [],
      summary: { totalGroups: 0, sameSchoolIdentityGroups: 0, sameIdentityDifferentSchoolGroups: 0, activeDuplicateGroups: 0 },
      targetRole: DEFAULT_MEMBER_ROLE
    };
  }

  const usageSummaryMap = getMemberUsageSummaryMap_();
  const values = sheet.getRange(2, 1, lastRow - 1, MEMBER_INFO_COLUMN_COUNT).getValues();
  const students = values
    .map(row => {
      const userId = String(row[0] || '').trim();
      return {
        userId: userId,
        school: normalizeMemberSchool_(row[9]),
        schoolShortName: formatSchoolShortName_(row[9]),
        grade: String(row[1] || '').trim(),
        classNo: String(row[2] || '').trim(),
        number: String(row[3] || '').trim(),
        nickname: String(row[4] || '').trim(),
        role: normalizeMemberRole_(row[MEMBER_ROLE_COLUMN - 1]),
        status: normalizeMemberStatus_(row[MEMBER_STATUS_COLUMN - 1]),
        createdAt: formatMemberTimestamp_(row[6]),
        updatedAt: formatMemberTimestamp_(row[7]),
        usageSummary: usageSummaryMap[userId] || getEmptyMemberUsageSummary_()
      };
    })
    .filter(member => member.role === DEFAULT_MEMBER_ROLE);

  const sameSchoolMap = {};
  const sameIdentityMap = {};
  students.forEach(member => {
    const identityKey = [member.grade, member.classNo, member.number].join('|');
    const sameSchoolKey = [member.school, member.grade, member.classNo, member.number].join('|');
    if (!sameSchoolMap[sameSchoolKey]) sameSchoolMap[sameSchoolKey] = [];
    if (!sameIdentityMap[identityKey]) sameIdentityMap[identityKey] = [];
    sameSchoolMap[sameSchoolKey].push(member);
    sameIdentityMap[identityKey].push(member);
  });

  const makeDuplicateGroup = (groupType, key, members) => {
    const activeCount = members.filter(member => member.status === ACTIVE_MEMBER_STATUS).length;
    const inactiveCount = members.filter(member => member.status === INACTIVE_MEMBER_STATUS).length;
    return {
      groupType: groupType,
      key: key,
      activeCount: activeCount,
      inactiveCount: inactiveCount,
      totalCount: members.length,
      members: members
    };
  };

  const duplicateGroups = [];
  Object.keys(sameSchoolMap).forEach(key => {
    const members = sameSchoolMap[key];
    if (members.length >= 2) {
      const first = members[0];
      const displayKey = [first.school, first.grade + '학년', first.classNo + '반', first.number + '번'].join(' ');
      duplicateGroups.push(makeDuplicateGroup('sameSchoolIdentity', displayKey, members));
    }
  });
  Object.keys(sameIdentityMap).forEach(key => {
    const members = sameIdentityMap[key];
    const schools = {};
    members.forEach(member => {
      schools[member.school] = true;
    });
    if (members.length >= 2 && Object.keys(schools).length >= 2) {
      const first = members[0];
      const displayKey = [first.grade + '학년', first.classNo + '반', first.number + '번'].join(' ');
      duplicateGroups.push(makeDuplicateGroup('sameIdentityDifferentSchool', displayKey, members));
    }
  });

  duplicateGroups.sort((a, b) => {
    const order = { sameSchoolIdentity: 1, sameIdentityDifferentSchool: 2 };
    if (a.groupType !== b.groupType) return (order[a.groupType] || 99) - (order[b.groupType] || 99);
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  const summary = duplicateGroups.reduce((acc, group) => {
    acc.totalGroups++;
    if (group.groupType === 'sameSchoolIdentity') acc.sameSchoolIdentityGroups++;
    if (group.groupType === 'sameIdentityDifferentSchool') acc.sameIdentityDifferentSchoolGroups++;
    if (group.activeCount >= 2) acc.activeDuplicateGroups++;
    return acc;
  }, { totalGroups: 0, sameSchoolIdentityGroups: 0, sameIdentityDifferentSchoolGroups: 0, activeDuplicateGroups: 0 });

  return {
    success: true,
    duplicateGroups: duplicateGroups,
    summary: summary,
    targetRole: DEFAULT_MEMBER_ROLE
  };
}

function getAdminDeletableMemberCandidates(adminUserId) {
  const id = String(adminUserId || '').trim();
  if (!id) return { success: false, error: '관리자 로그인이 필요합니다.' };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { success: false, error: memberSheet.error };

  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);
  const adminRow = findMemberRow_(sheet, id);
  if (!adminRow || !isActiveAdminMember_(memberRowToObject_(adminRow.values))) {
    return { success: false, error: '관리자 권한이 없습니다.' };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      success: true,
      summary: { safeCandidateCount: 0, cautionCandidateCount: 0, excludedCount: 0 },
      safeCandidates: [],
      cautionCandidates: []
    };
  }

  const usageSummaryMap = getMemberUsageSummaryMap_();
  const values = sheet.getRange(2, 1, lastRow - 1, MEMBER_INFO_COLUMN_COUNT).getValues();
  const safeCandidates = [];
  const cautionCandidates = [];
  let excludedCount = 0;

  values.forEach(row => {
    const userId = String(row[0] || '').trim();
    const role = normalizeMemberRole_(row[MEMBER_ROLE_COLUMN - 1]);
    const status = normalizeMemberStatus_(row[MEMBER_STATUS_COLUMN - 1]);
    const usageSummary = usageSummaryMap[userId] || getEmptyMemberUsageSummary_();
    const member = {
      userId: userId,
      school: normalizeMemberSchool_(row[9]),
      schoolShortName: formatSchoolShortName_(row[9]),
      grade: String(row[1] || '').trim(),
      classNo: String(row[2] || '').trim(),
      number: String(row[3] || '').trim(),
      nickname: String(row[4] || '').trim(),
      role: role,
      status: status,
      createdAt: formatMemberTimestamp_(row[6]),
      updatedAt: formatMemberTimestamp_(row[7]),
      usageSummary: usageSummary
    };

    if (role !== DEFAULT_MEMBER_ROLE || usageSummary.hasAnyUsage) {
      excludedCount++;
    } else if (status === INACTIVE_MEMBER_STATUS) {
      safeCandidates.push(member);
    } else if (status === ACTIVE_MEMBER_STATUS) {
      cautionCandidates.push(member);
    } else {
      excludedCount++;
    }
  });

  const sortCandidates = (a, b) => {
    const aKey = [a.school, a.grade, a.classNo, a.number, a.userId].join('|');
    const bKey = [b.school, b.grade, b.classNo, b.number, b.userId].join('|');
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  };
  safeCandidates.sort(sortCandidates);
  cautionCandidates.sort(sortCandidates);

  return {
    success: true,
    summary: {
      safeCandidateCount: safeCandidates.length,
      cautionCandidateCount: cautionCandidates.length,
      excludedCount: excludedCount
    },
    safeCandidates: safeCandidates,
    cautionCandidates: cautionCandidates
  };
}

function deleteAdminInactiveUnusedMember(adminUserId, targetUserId, confirmText) {
  const adminId = String(adminUserId || '').trim();
  const targetId = String(targetUserId || '').trim();
  const confirmation = String(confirmText || '').trim();
  if (!adminId) return { success: false, error: '관리자 로그인이 필요합니다.' };
  if (!targetId) return { success: false, error: '삭제 대상 회원을 찾을 수 없습니다.' };
  if (confirmation !== targetId) return { success: false, error: '확인 입력값이 삭제 대상 userId와 일치하지 않습니다.' };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { success: false, error: memberSheet.error };

  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);
  const adminRow = findMemberRow_(sheet, adminId);
  if (!adminRow || !isActiveAdminMember_(memberRowToObject_(adminRow.values))) {
    return { success: false, error: '관리자 권한이 없습니다.' };
  }

  const targetRow = findMemberRow_(sheet, targetId);
  if (!targetRow) return { success: false, error: '삭제 대상 회원을 찾을 수 없습니다.' };

  const adminMember = memberRowToObject_(adminRow.values);
  const targetMember = memberRowToObject_(targetRow.values);
  if (targetMember.role !== DEFAULT_MEMBER_ROLE) {
    return { success: false, error: 'student 계정만 삭제할 수 있습니다.' };
  }
  if (targetMember.status !== INACTIVE_MEMBER_STATUS) {
    return { success: false, error: 'inactive 계정만 삭제할 수 있습니다.' };
  }

  const usageSummaryMap = getMemberUsageSummaryMap_();
  const usageSummary = usageSummaryMap[targetId] || getEmptyMemberUsageSummary_();
  if (usageSummary.hasAnyUsage) {
    return { success: false, error: '사용 기록이 있는 계정은 삭제할 수 없습니다.', usageSummary: usageSummary };
  }

  const deletedAt = new Date();
  const deletedMember = {
    userId: targetMember.userId,
    school: targetMember.school,
    schoolShortName: targetMember.schoolShortName,
    grade: targetMember.grade,
    classNo: targetMember.classNo,
    number: targetMember.number,
    nickname: targetMember.nickname,
    role: targetMember.role,
    status: targetMember.status,
    usageSummary: usageSummary
  };

  sheet.deleteRow(targetRow.rowNumber);
  try {
    appendMemberDeleteLog_({
      deletedAt: deletedAt,
      adminUserId: adminMember.userId,
      adminNickname: adminMember.nickname,
      deletedUserId: deletedMember.userId,
      deletedNickname: deletedMember.nickname,
      school: deletedMember.school,
      grade: deletedMember.grade,
      classNo: deletedMember.classNo,
      number: deletedMember.number,
      reason: 'inactive student with no usage records'
    });
  } catch (err) {
    return {
      success: false,
      error: '회원 row는 이미 삭제됐지만 삭제 로그 기록에 실패했습니다: ' + (err && err.message ? err.message : err),
      deleted: true,
      logFailed: true,
      member: deletedMember
    };
  }

  const candidates = getAdminDeletableMemberCandidates(adminId);
  return {
    success: true,
    deleted: true,
    member: deletedMember,
    candidates: candidates && candidates.success ? candidates : null
  };
}

function updateAdminMemberStatus(adminUserId, targetUserId, nextStatus, reason) {
  const adminId = String(adminUserId || '').trim();
  const targetId = String(targetUserId || '').trim();
  const status = String(nextStatus || '').trim().toLowerCase();
  if (!adminId) return { success: false, error: '관리자 로그인이 필요합니다.' };
  if (!targetId) return { success: false, error: '대상 회원을 찾을 수 없습니다.' };
  if ([ACTIVE_MEMBER_STATUS, INACTIVE_MEMBER_STATUS].indexOf(status) === -1) {
    return { success: false, error: 'status는 active 또는 inactive만 사용할 수 있습니다.' };
  }

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { success: false, error: memberSheet.error };

  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);
  const adminRow = findMemberRow_(sheet, adminId);
  if (!adminRow || !isActiveAdminMember_(memberRowToObject_(adminRow.values))) {
    return { success: false, error: '관리자 권한이 없습니다.' };
  }

  const targetRow = findMemberRow_(sheet, targetId);
  if (!targetRow) return { success: false, error: '대상 회원을 찾을 수 없습니다.' };
  if (adminId === targetId && status === INACTIVE_MEMBER_STATUS) {
    return { success: false, error: '관리자 본인 계정은 비활성화할 수 없습니다.' };
  }

  const adminMember = memberRowToObject_(adminRow.values);
  const targetMember = memberRowToObject_(targetRow.values);
  const previousStatus = normalizeMemberStatus_(targetMember.status);
  const cleanReason = String(reason || '').trim();
  if (previousStatus === status) {
    return {
      success: true,
      member: targetMember,
      reason: cleanReason,
      changed: false,
      message: '이미 같은 상태입니다.'
    };
  }

  const now = new Date();
  sheet.getRange(targetRow.rowNumber, MEMBER_STATUS_COLUMN).setValue(status);
  sheet.getRange(targetRow.rowNumber, 8).setValue(now);
  const updatedValues = sheet.getRange(targetRow.rowNumber, 1, 1, MEMBER_INFO_COLUMN_COUNT).getValues()[0];
  const updatedMember = memberRowToObject_(updatedValues);
  try {
    appendMemberStatusChangeLog_({
      changedAt: now,
      adminUserId: adminMember.userId,
      adminNickname: adminMember.nickname,
      targetUserId: updatedMember.userId,
      targetNickname: updatedMember.nickname,
      previousStatus: previousStatus,
      nextStatus: status,
      reason: cleanReason
    });
  } catch (err) {
    return {
      success: false,
      error: '회원 상태는 변경됐지만 변경 로그 기록에 실패했습니다: ' + (err && err.message ? err.message : err),
      member: updatedMember,
      reason: cleanReason,
      changed: true,
      logFailed: true
    };
  }
  return {
    success: true,
    member: updatedMember,
    reason: cleanReason,
    changed: true
  };
}

function resetMemberPasswordByIdentity(grade, classNo, number, nickname, school) {
  const nick = String(nickname || '').trim();
  if (!grade || !classNo || !number || !nick) {
    return { success: false, message: '학년, 반, 번호, 닉네임을 모두 입력해 주세요.' };
  }
  const normalizedSchool = normalizeMemberSchool_(school);

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { success: false, message: memberSheet.error };

  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);
  const found = findMemberRowByGradeClassNumber_(sheet, grade, classNo, number, normalizedSchool);
  if (!found) return { success: false, message: '입력한 정보와 일치하는 회원을 찾을 수 없습니다.' };

  const currentNickname = String(found.values[4] || '').trim();
  if (currentNickname !== nick) {
    return { success: false, message: '입력한 정보와 일치하는 회원을 찾을 수 없습니다.' };
  }

  const password = generateMemberPassword(grade, classNo, number);
  if (!password) return { success: false, message: '초기 비밀번호를 만들 수 없습니다.' };

  sheet.getRange(found.rowNumber, 9).setNumberFormat('@').setValue(password);
  return {
    success: true,
    nickname: currentNickname,
    password: password,
    initialPassword: password,
    school: normalizedSchool,
    grade: String(grade || '').trim(),
    classNo: String(classNo || '').trim(),
    number: String(Number(number)),
    message: '비밀번호가 초기화되었습니다.'
  };
}

function updateMemberPassword(userId, newPassword) {
  const id = String(userId || '').trim();
  const password = String(newPassword || '');
  if (!id) return { error: 'userId가 필요합니다.' };
  const validationMessage = validateMemberPassword_(password);
  if (validationMessage) return { error: validationMessage };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { error: memberSheet.error };

  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);
  const found = findMemberRow_(sheet, id);
  if (!found) return { error: '회원정보를 찾을 수 없습니다.' };

  sheet.getRange(found.rowNumber, 9).setNumberFormat('@').setValue(password);
  return { ok: true };
}

function getMemberUsageMap_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usageMap = {};
  if (!ss) return usageMap;

  addUsageFromSheet_(usageMap, ss.getSheetByName(PRACTICE_RECORD_SHEET_NAME), 1, PRACTICE_RECORD_SHEET_NAME);
  addUsageFromSheet_(usageMap, ss.getSheetByName(POKEMON_PRACTICE_RECORD_SHEET_NAME), 1, POKEMON_PRACTICE_RECORD_SHEET_NAME);
  addUsageFromSheet_(usageMap, ss.getSheetByName('랭킹기록'), 5, '랭킹기록');
  addUsageFromSheet_(usageMap, ss.getSheetByName(MY_ROOM_SETTINGS_SHEET_NAME), 1, MY_ROOM_SETTINGS_SHEET_NAME);
  addUsageFromSheet_(usageMap, ss.getSheetByName('닉네임이력'), 2, '닉네임이력');
  addUsageFromSheet_(usageMap, ss.getSheetByName('기록저장'), 5, '기록저장');
  return usageMap;
}

function addUsageFromSheet_(usageMap, sheet, userIdColumn, label) {
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, userIdColumn, lastRow - 1, 1).getValues();
  values.forEach(row => {
    const userId = String(row[0] || '').trim();
    if (!userId) return;
    if (!usageMap[userId]) usageMap[userId] = [];
    if (usageMap[userId].indexOf(label) === -1) usageMap[userId].push(label);
  });
}


function ensureNicknameHistorySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  let sheet = ss.getSheetByName('닉네임이력');
  if (!sheet) {
    sheet = ss.insertSheet('닉네임이력');
  }

  const headers = ['변경일시', 'userId', '이전닉네임', '새닉네임'];
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = headers.some((header, index) => String(currentHeaders[index] || '').trim() !== header);
  if (needsHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  return { sheet };
}

function appendNicknameHistory_(userId, oldNickname, newNickname) {
  const historySheetResult = ensureNicknameHistorySheet();
  if (historySheetResult.error) {
    Logger.log(historySheetResult.error);
    return { ok: false, message: historySheetResult.error };
  }

  historySheetResult.sheet.appendRow([
    new Date(),
    String(userId || '').trim(),
    String(oldNickname || '').trim(),
    String(newNickname || '').trim()
  ]);
  return { ok: true };
}

function updateMemberNickname(userId, newNickname) {
  const id = String(userId || '').trim();
  const nextNickname = String(newNickname || '').trim();
  if (!id) return { error: 'userId가 필요합니다.' };
  if (!nextNickname) return { error: '새 닉네임을 입력해 주세요.' };
  if (nextNickname.length > MAX_MEMBER_NICKNAME_LENGTH) {
    return { error: '닉네임은 ' + MAX_MEMBER_NICKNAME_LENGTH + '자 이내로 입력해 주세요.' };
  }

  const memberSheetResult = getMemberSheet_();
  if (memberSheetResult.error) return { error: memberSheetResult.error };

  const found = findMemberRow_(memberSheetResult.sheet, id);
  if (!found) return { error: '회원정보를 찾을 수 없습니다.' };

  const oldNickname = String(found.values[4] || '').trim();
  if (oldNickname === nextNickname) {
    return memberRowToObject_(found.values);
  }

  const historyResult = appendNicknameHistory_(id, oldNickname, nextNickname);
  if (historyResult.error || historyResult.ok === false) {
    return { error: historyResult.message || '닉네임 이력을 저장하지 못했습니다.' };
  }

  memberSheetResult.sheet.getRange(found.rowNumber, 5).setValue(nextNickname);
  const updatedValues = found.values.slice();
  updatedValues[4] = nextNickname;
  return memberRowToObject_(updatedValues);
}

function updateMemberRankingMessage(userId, rankingMessage) {
  const id = String(userId || '').trim();
  if (!id) return { success: false, message: 'userId가 필요합니다.' };

  const validation = validateRankingMessage_(rankingMessage);
  if (validation.error) return { success: false, message: validation.error };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { success: false, message: memberSheet.error };
  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);

  const found = findMemberRow_(sheet, id);
  if (!found) return { success: false, message: '회원정보를 찾을 수 없습니다.' };

  const nextMessage = validation.rankingMessage;
  sheet.getRange(found.rowNumber, MEMBER_RANKING_MESSAGE_COLUMN).setValue(nextMessage);
  const updatedValues = found.values.slice();
  updatedValues[MEMBER_RANKING_MESSAGE_COLUMN - 1] = nextMessage;
  return {
    success: true,
    message: nextMessage ? '랭킹 한마디를 저장했습니다.' : '랭킹 한마디를 비웠습니다.',
    rankingMessage: nextMessage,
    member: memberRowToObject_(updatedValues)
  };
}

function getMemberByUserId(userId) {
  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { error: memberSheet.error };

  ensureMemberHeaders_(memberSheet.sheet);
  const found = findMemberRow_(memberSheet.sheet, String(userId || '').trim());
  if (!found) return { error: '회원정보를 찾을 수 없습니다.' };
  return memberRowToObject_(found.values);
}

function getAvailableTitlesForMember(userId) {
  const startedAt = logPerfStart_('getAvailableTitlesForMember');
  const id = normalizeTitleUserId_(typeof userId === 'object' && userId !== null ? userId.userId : userId);
  if (!id) return { success: false, message: 'userId가 필요합니다.', availableTitles: [] };
  try {
    let rawSelectedTitle = '';
    const memberSheet = getMemberSheet_();
    if (!memberSheet.error) {
      ensureMemberHeaders_(memberSheet.sheet);
      const found = findMemberRow_(memberSheet.sheet, id);
      if (found) rawSelectedTitle = String(found.values[MEMBER_SELECTED_TITLE_COLUMN - 1] || '').trim();
      else Logger.log('[TITLE] getAvailableTitlesForMember member not found userId=%s', id);
    } else {
      Logger.log('[TITLE] getAvailableTitlesForMember member sheet error=%s', memberSheet.error);
    }

    const availableTitles = getAvailableTitlesFromStatus_(id);
    const validSelectedTitle = getSelectedTitleFromStatus_(rawSelectedTitle, availableTitles);
    const result = {
      success: true,
      selectedTitleId: validSelectedTitle ? validSelectedTitle.id : '',
      selectedTitle: validSelectedTitle ? validSelectedTitle.title : '',
      selectedTitleThemeClass: validSelectedTitle ? validSelectedTitle.themeClass : '',
      selectedTitleTierClass: validSelectedTitle ? validSelectedTitle.tierClass : '',
      selectedTitleEffectClass: validSelectedTitle ? validSelectedTitle.effectClass : '',
      availableTitles: availableTitles,
      titleDefinitions: getTitleDefinitions(),
      badgeSummary: buildTitleBadgeSummaryFromContext_(id, { badgeStarsByUserId: {} })
    };
    logPerf_('getAvailableTitlesForMember', startedAt, 'userId=' + id + ' availableTitles=' + availableTitles.length);
    return result;
  } catch (err) {
    Logger.log('[TITLE] getAvailableTitlesForMember failed userId=%s reason=%s', id, err && err.message ? err.message : err);
    return { success: false, message: '타이틀을 불러오지 못했습니다.', availableTitles: [] };
  }
}

function updateMemberSelectedTitle(userId, selectedTitleId) {
  const id = String(userId || '').trim();
  const titleId = String(selectedTitleId || '').trim();
  if (!id) return { success: false, message: 'userId가 필요합니다.' };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { success: false, message: memberSheet.error };
  const sheet = memberSheet.sheet;
  ensureMemberHeaders_(sheet);

  const found = findMemberRow_(sheet, id);
  if (!found) return { success: false, message: '회원정보를 찾을 수 없습니다.' };

  const availableTitles = getAvailableTitlesFromStatus_(id);
  if (titleId && !availableTitles.some(item => item.id === titleId)) {
    return { success: false, message: '아직 획득하지 않은 타이틀입니다.' };
  }

  sheet.getRange(found.rowNumber, MEMBER_SELECTED_TITLE_COLUMN).setValue(titleId);
  const updatedValues = found.values.slice();
  updatedValues[MEMBER_SELECTED_TITLE_COLUMN - 1] = titleId;
  const member = memberRowToObject_(updatedValues);
  const selectedTitle = getSelectedTitleFromStatus_(titleId, availableTitles);
  return {
    success: true,
    member: member,
    selectedTitleId: selectedTitle ? selectedTitle.id : '',
    selectedTitle: selectedTitle ? selectedTitle.title : '',
    selectedTitleThemeClass: selectedTitle ? selectedTitle.themeClass : '',
    selectedTitleTierClass: selectedTitle ? selectedTitle.tierClass : '',
    selectedTitleEffectClass: selectedTitle ? selectedTitle.effectClass : '',
    availableTitles: availableTitles,
    message: titleId ? '타이틀이 저장되었습니다.' : '타이틀 선택을 해제했습니다.'
  };
}

function normalizeDebugTitleArgs_(userIdOrGrade, classNo, number, school) {
  if (typeof userIdOrGrade === 'object' && userIdOrGrade !== null) {
    const input = userIdOrGrade;
    return {
      userId: String(input.userId || '').trim(),
      grade: input.grade,
      classNo: input.classNo,
      number: input.number,
      school: input.school
    };
  }
  const first = String(userIdOrGrade || '').trim();
  if (classNo === undefined && number === undefined && first && /^S?.*G\d+-C\d+-N\d+/i.test(first)) {
    return { userId: first, grade: '', classNo: '', number: '', school: '' };
  }
  return { userId: '', grade: userIdOrGrade, classNo: classNo, number: number, school: school };
}

function findDebugMemberForTitles_(input) {
  const memberSheetResult = getMemberSheet_();
  if (memberSheetResult.error) return { error: memberSheetResult.error };
  const sheet = memberSheetResult.sheet;
  ensureMemberHeaders_(sheet);

  if (input.userId) {
    const foundById = findMemberRow_(sheet, input.userId);
    if (!foundById) return { error: '회원정보에서 userId를 찾지 못했습니다: ' + input.userId };
    return { rowNumber: foundById.rowNumber, row: foundById.values, member: memberRowToObject_(foundById.values) };
  }

  const foundByIdentity = findMemberRowByGradeClassNumber_(sheet, input.grade, input.classNo, input.number, input.school);
  if (!foundByIdentity) return { error: '회원정보에서 학년/반/번호 조건의 사용자를 찾지 못했습니다.' };
  return { rowNumber: foundByIdentity.rowNumber, row: foundByIdentity.values, member: memberRowToObject_(foundByIdentity.values) };
}

function getDebugPracticeRowsForTitles_(userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = { practiceRows: [], pokemonPracticeRows: [] };
  if (!ss) return result;

  const practiceSheet = ss.getSheetByName(PRACTICE_RECORD_SHEET_NAME);
  if (practiceSheet && practiceSheet.getLastRow() >= 2) {
    const values = practiceSheet.getRange(2, 1, practiceSheet.getLastRow() - 1, Math.max(practiceSheet.getLastColumn(), PRACTICE_RECORD_HEADERS.length)).getValues();
    values.forEach((row, index) => {
      if (String(row[0] || '').trim() !== userId) return;
      const area = String(row[5] || '').trim();
      const detail = String(row[6] || '').trim();
      const generationMatch = area === '포켓몬' ? detail.match(/^([1-9])세대$/) : null;
      result.practiceRows.push({
        rowNumber: index + 2,
        userId: String(row[0] || '').trim(),
        area: area,
        detail: detail,
        generation: generationMatch ? generationMatch[1] : '',
        correct: Number(row[7]) || 0,
        total: Number(row[8]) || 0,
        starCount: Number(row[10]) || 0,
        rawStarCount: row[10]
      });
    });
  }

  const pokemonSheet = ss.getSheetByName(POKEMON_PRACTICE_RECORD_SHEET_NAME);
  if (pokemonSheet && pokemonSheet.getLastRow() >= 2) {
    const values = pokemonSheet.getRange(2, 1, pokemonSheet.getLastRow() - 1, Math.max(pokemonSheet.getLastColumn(), 12)).getValues();
    values.forEach((row, index) => {
      if (String(row[0] || '').trim() !== userId) return;
      const generationText = String(row[5] || '').trim();
      const generationMatch = generationText.match(/^([1-9])세대$/);
      result.pokemonPracticeRows.push({
        rowNumber: index + 2,
        userId: String(row[0] || '').trim(),
        generationText: generationText,
        generation: generationMatch ? generationMatch[1] : '',
        earned: row[6] === true || String(row[6]).toUpperCase() === 'TRUE',
        correct: Number(row[8]) || 0,
        total: Number(row[9]) || 0
      });
    });
  }

  return result;
}

function debugUserAvailableTitles(userIdOrGrade, classNo, number, school) {
  const input = normalizeDebugTitleArgs_(userIdOrGrade, classNo, number, school);
  Logger.log('[debugUserAvailableTitles] input=%s', JSON.stringify(input));

  const found = findDebugMemberForTitles_(input);
  if (found.error) {
    Logger.log('[member] error=%s', found.error);
    return { success: false, message: found.error };
  }

  const rawSelectedTitle = String(found.row[MEMBER_SELECTED_TITLE_COLUMN - 1] || '').trim();
  const member = found.member;
  const userId = member.userId;
  Logger.log('[member] row=%s userId=%s grade=%s class=%s number=%s nickname=%s school=%s',
    found.rowNumber, userId, member.grade, member.classNo, member.number, member.nickname, member.school);
  Logger.log('[selectedTitle stored] raw=%s resolvedId=%s resolvedTitle=%s',
    rawSelectedTitle, member.selectedTitleId || '', member.selectedTitle || '');

  const pokemonDefinitions = buildAllTitleDefinitions_().filter(item => item.theme === 'pokemon');
  Logger.log('[pokemon title definitions] %s',
    pokemonDefinitions.map(item => item.id + ':' + item.title + ':required' + item.requiredBadgeCount + ':source=' + item.source).join(', '));

  const debugRows = getDebugPracticeRowsForTitles_(userId);
  Logger.log('[연습기록 rows] count=%s', debugRows.practiceRows.length);
  debugRows.practiceRows.forEach(item => {
    Logger.log('연습기록 row=%s area=%s detail=%s generation=%s starCount=%s rawStar=%s correct=%s total=%s',
      item.rowNumber, item.area, item.detail, item.generation || '-', item.starCount, item.rawStarCount, item.correct, item.total);
  });
  Logger.log('[포켓몬연습기록 rows] count=%s', debugRows.pokemonPracticeRows.length);
  debugRows.pokemonPracticeRows.forEach(item => {
    Logger.log('포켓몬연습기록 row=%s generationText=%s generation=%s earned=%s correct=%s total=%s',
      item.rowNumber, item.generationText, item.generation || '-', item.earned, item.correct, item.total);
  });

  const badgeSummary = buildMyRoomBadgeSummary_(userId);
  const pokemonItems = (badgeSummary.items || []).filter(item => item.group === 'pokemon');
  Logger.log('[badgeSummary] totalStars=%s earnedBadgeCount=%s earnedFieldCount=%s normalRanking50Count=%s',
    badgeSummary.totalStars, badgeSummary.earnedBadgeCount, getEarnedFieldCount_(badgeSummary), getNormalRankingScore50Count_(userId));
  pokemonItems.forEach(item => {
    Logger.log('pokemon badge item id=%s label=%s starCount=%s available=%s correct=%s total=%s',
      item.id, item.label, item.starCount, item.available, item.correct, item.total);
  });

  const availableTitles = buildAvailableTitleList_(badgeSummary, userId);
  const pokemonGeneratedTitles = availableTitles.filter(item => item.theme === 'pokemon');
  const generalGeneratedTitles = availableTitles.filter(item => item.theme === 'school' || item.theme === 'perfect');
  Logger.log('[pokemon generated titles] %s', pokemonGeneratedTitles.map(item => item.id + ':' + item.title + ':tier' + item.tier).join(', ') || '(none)');
  Logger.log('[general titles] %s', generalGeneratedTitles.map(item => item.id + ':' + item.title).join(', ') || '(none)');
  Logger.log('[availableTitles] %s', availableTitles.map(item => item.id + ':' + item.title + ':tier' + item.tier).join(', ') || '(none)');

  const exactSelectedInAvailable = !!rawSelectedTitle && availableTitles.some(item => item.id === rawSelectedTitle || item.title === rawSelectedTitle);
  const resolvedSelected = resolveSelectedTitle_(rawSelectedTitle, availableTitles);
  const legacyApplied = !!rawSelectedTitle && !!resolvedSelected && !exactSelectedInAvailable;
  Logger.log('[selectedTitle validation] raw=%s exactInAvailable=%s legacyApplied=%s finalId=%s finalTitle=%s',
    rawSelectedTitle, exactSelectedInAvailable, legacyApplied, resolvedSelected ? resolvedSelected.id : '', resolvedSelected ? resolvedSelected.title : '');

  return {
    success: true,
    input: input,
    member: member,
    storedSelectedTitle: rawSelectedTitle,
    practiceRows: debugRows.practiceRows,
    pokemonPracticeRows: debugRows.pokemonPracticeRows,
    badgeSummary: badgeSummary,
    pokemonGeneratedTitles: pokemonGeneratedTitles,
    generalGeneratedTitles: generalGeneratedTitles,
    availableTitles: availableTitles,
    selectedTitleExactInAvailable: exactSelectedInAvailable,
    legacyApplied: legacyApplied,
    finalSelectedTitle: resolvedSelected || null
  };
}

const ROOM_LIKE_SHEET_NAME = '집좋아요기록';
const MAX_DAILY_ROOM_LIKES = 5;

function ensureRoomLikeSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  let sheet = ss.getSheetByName(ROOM_LIKE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ROOM_LIKE_SHEET_NAME);
    sheet.appendRow(['날짜', '보낸회원ID', '받은회원ID', '생성일시']);
    sheet.setFrozenRows(1);
    Logger.log('[ensureRoomLikeSheet] Created new sheet: %s', ROOM_LIKE_SHEET_NAME);
  }
  return { sheet: sheet };
}

function getRoomLikeStatus_(sheet, fromUserId, toUserId) {
  const status = {
    totalLikes: 0,
    todayRemainingLikes: MAX_DAILY_ROOM_LIKES,
    likedToday: false,
    canLike: false,
    isOwnRoom: false,
    message: ''
  };

  const fid = String(fromUserId || '').trim();
  const tid = String(toUserId || '').trim();

  if (!fid || !tid) {
    status.message = '회원 정보가 불확실합니다.';
    return status;
  }

  if (fid === tid) {
    status.isOwnRoom = true;
    status.message = '자신의 집입니다.';
  }

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    if (!status.isOwnRoom) {
      status.canLike = true;
      status.message = '하트를 보낼 수 있습니다.';
    }
    return status;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  let todaySentCount = 0;

  for (let i = 0; i < values.length; i++) {
    let rowDate = values[i][0];
    // 날짜 타입 정규화
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      rowDate = String(rowDate || '').trim();
    }

    const rowFrom = String(values[i][1] || '').trim();
    const rowTo = String(values[i][2] || '').trim();

    if (rowTo === tid) {
      status.totalLikes++;
    }

    if (rowDate === todayStr && rowFrom === fid) {
      todaySentCount++;
      if (rowTo === tid) {
        status.likedToday = true;
      }
    }
  }

  status.todayRemainingLikes = Math.max(0, MAX_DAILY_ROOM_LIKES - todaySentCount);

  if (status.isOwnRoom) {
    // 이미 위에서 처리됨
  } else if (status.likedToday) {
    status.message = '오늘은 이미 하트를 보냈어요.';
  } else if (status.todayRemainingLikes <= 0) {
    status.message = '오늘 보낼 하트를 모두 사용했어요.';
  } else {
    status.canLike = true;
    status.message = '하트를 보낼 수 있습니다.';
  }

  return status;
}

function getMemberTotalLikes_(userId) {
  const tid = String(userId || '').trim();
  if (!tid) return 0;

  const likeSheetResult = ensureRoomLikeSheet_();
  if (likeSheetResult.error) return 0;

  const sheet = likeSheetResult.sheet;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, 3, lastRow - 1, 1).getValues(); // 받은회원ID 열만 읽기
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === tid) count++;
  }
  return count;
}
function ensureMyRoomSettingsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  let sheet = ss.getSheetByName(MY_ROOM_SETTINGS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(MY_ROOM_SETTINGS_SHEET_NAME);

  const headers = MY_ROOM_SETTINGS_HEADERS;
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = headers.some((header, index) => String(currentHeaders[index] || '').trim() !== header);
  if (needsHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  return { sheet: sheet };
}

function getMyRoomDecorationOptions_() {
  return {
    backgrounds: [
      { id: 'bg_room_basic', name: '기본 방', type: 'background', description: '포근한 기본 내 집 배경입니다.', themeClass: 'my-room-bg-basic', emoji: '🏠', enabled: true, order: 1 },
      { id: 'bg_forest', name: '숲속 방', type: 'background', description: '초록빛 숲 느낌의 방입니다.', themeClass: 'my-room-bg-forest', emoji: '🌲', enabled: true, order: 2 },
      { id: 'bg_classroom', name: '교실 방', type: 'background', description: '친구들과 공부하는 교실 느낌입니다.', themeClass: 'my-room-bg-classroom', emoji: '🏫', enabled: true, order: 3 },
      { id: 'bg_stage', name: '무대 방', type: 'background', description: '발표와 공연을 떠올리는 무대 배경입니다.', themeClass: 'my-room-bg-stage', emoji: '🎭', enabled: true, order: 4 },
      { id: 'bg_space', name: '우주 방', type: 'background', description: '별이 반짝이는 우주 느낌의 방입니다.', themeClass: 'my-room-bg-space', emoji: '🚀', enabled: true, order: 5 }
    ],
    avatars: [
      { id: 'avatar_basic', name: '기본 아바타', type: 'avatar', description: '처음 사용할 수 있는 기본 친구입니다.', themeClass: 'my-room-avatar-basic', emoji: '🙂', enabled: true, order: 1 },
      { id: 'avatar_cat', name: '고양이 친구', type: 'avatar', description: '차분하고 귀여운 고양이 친구입니다.', themeClass: 'my-room-avatar-cat', emoji: '🐱', enabled: true, order: 2 },
      { id: 'avatar_dog', name: '강아지 친구', type: 'avatar', description: '활발한 강아지 친구입니다.', themeClass: 'my-room-avatar-dog', emoji: '🐶', enabled: true, order: 3 },
      { id: 'avatar_star', name: '별빛 친구', type: 'avatar', description: '반짝이는 별빛 친구입니다.', themeClass: 'my-room-avatar-star', emoji: '⭐', enabled: true, order: 4 },
      { id: 'avatar_robot', name: '로봇 친구', type: 'avatar', description: '퀴즈를 좋아하는 로봇 친구입니다.', themeClass: 'my-room-avatar-robot', emoji: '🤖', enabled: true, order: 5 }
    ],
    titles: [
      { id: 'title_beginner', name: '퀴즈 새싹', type: 'title', description: '퀴즈 타운을 시작한 친구에게 어울리는 칭호입니다.', themeClass: 'my-room-title-beginner', emoji: '🌱', enabled: true, order: 1 },
      { id: 'title_pokemon', name: '포켓몬 탐험가', type: 'title', description: '포켓몬 도감을 꾸준히 채우는 친구에게 어울립니다.', themeClass: 'my-room-title-pokemon', emoji: '🌲', enabled: true, order: 2 },
      { id: 'title_spelling', name: '맞춤법 박사', type: 'title', description: '맞춤법 퀴즈를 열심히 푸는 친구에게 어울립니다.', themeClass: 'my-room-title-spelling', emoji: '✏️', enabled: true, order: 3 },
      { id: 'title_math', name: '수학 해결사', type: 'title', description: '수학 퀴즈를 열심히 푸는 친구에게 어울립니다.', themeClass: 'my-room-title-spelling', emoji: '📐', enabled: true, order: 4 },
      { id: 'title_ranking', name: '랭킹 도전자', type: 'title', description: '랭킹전에 도전하는 친구에게 어울립니다.', themeClass: 'my-room-title-ranking', emoji: '🏆', enabled: true, order: 5 },
      { id: 'title_allrounder', name: '퀴즈 모험가', type: 'title', description: '여러 퀴즈를 골고루 즐기는 친구에게 어울립니다.', themeClass: 'my-room-title-allrounder', emoji: '🧭', enabled: true, order: 6 },
      { id: 'title_reading_gmo', name: '지엠오 아이 완독', type: 'title', description: '지엠오 아이를 완독한 친구에게 어울립니다.', themeClass: 'my-room-title-spelling', emoji: '📖', enabled: true, order: 7, requiredTitleId: 'reading_gmo_complete' },
      { id: 'title_word_master', name: '단어 마스터', type: 'title', description: '다의어와 동형이의어를 꾸준히 익힌 친구에게 어울립니다.', themeClass: 'my-room-title-spelling', emoji: '🔤', enabled: true, order: 8, requiredTitleId: 'word_relation_master' },
      { id: 'title_korean_mania', name: '국어매니아', type: 'title', description: '국어 계열 타이틀을 모은 친구에게 어울립니다.', themeClass: 'my-room-title-spelling', emoji: '📚', enabled: true, order: 9, requiredTitleId: 'korean_mania' },
      { id: 'title_math_mania', name: '수학매니아', type: 'title', description: '수학 계열 타이틀을 모은 친구에게 어울립니다.', themeClass: 'my-room-title-spelling', emoji: '➗', enabled: true, order: 10, requiredTitleId: 'math_mania' },
      { id: 'title_social_mania', name: '사회매니아', type: 'title', description: '사회 계열 타이틀을 모은 친구에게 어울립니다.', themeClass: 'my-room-title-ranking', emoji: '🏛️', enabled: true, order: 11, requiredTitleId: 'social_mania' }
    ]
  };
}

function getOwnedTitleIdMapForMyRoom_(userId) {
  const map = {};
  getAvailableTitlesFromStatus_(userId).forEach(title => {
    const id = String((title || {}).id || '').trim();
    if (id) map[id] = true;
  });
  return map;
}

function hasMyRoomRequiredTitle_(ownedTitleMap, requiredTitleIds) {
  const map = ownedTitleMap || {};
  const ids = Array.isArray(requiredTitleIds) ? requiredTitleIds : [requiredTitleIds];
  return ids.some(id => !!map[String(id || '').trim()]);
}

function isSelectableMyRoomTitle_(userId, titleId) {
  const id = String(titleId || '').trim();
  if (!id || id === DEFAULT_MY_ROOM_TITLE_ID) return true;
  const option = getMyRoomTitleOption_(id);
  if (!option) return false;
  if (!option.requiredTitleId && !option.requiredTitleIds) return true;
  return hasMyRoomRequiredTitle_(getOwnedTitleIdMapForMyRoom_(userId), option.requiredTitleIds || option.requiredTitleId);
}

function getMyRoomDecorationOptionsForUser_(userId) {
  const options = getMyRoomDecorationOptions_();
  const ownedTitleMap = getOwnedTitleIdMapForMyRoom_(userId);
  return {
    backgrounds: options.backgrounds,
    avatars: options.avatars,
    titles: (options.titles || []).map(title => {
      const next = Object.assign({}, title);
      if (next.requiredTitleId || next.requiredTitleIds) {
        next.enabled = hasMyRoomRequiredTitle_(ownedTitleMap, next.requiredTitleIds || next.requiredTitleId);
      }
      return next;
    })
  };
}

function getEnabledMyRoomOptions_(type) {
  const options = getMyRoomDecorationOptions_();
  const keyMap = {
    background: 'backgrounds',
    avatar: 'avatars',
    title: 'titles'
  };
  const key = keyMap[type];
  return key ? (options[key] || []).filter(item => item && item.enabled !== false) : [];
}

function getMyRoomTitleOption_(titleId) {
  const id = String(titleId || '').trim() || DEFAULT_MY_ROOM_TITLE_ID;
  const titles = getEnabledMyRoomOptions_('title');
  return titles.find(item => item.id === id) || titles.find(item => item.id === DEFAULT_MY_ROOM_TITLE_ID) || null;
}

function isValidDecorationOption_(type, id) {
  const value = String(id || '').trim();
  if (!value) return false;
  return getEnabledMyRoomOptions_(type).some(item => item.id === value);
}

function getDefaultMyRoomSettings_(userId) {
  return {
    userId: String(userId || '').trim(),
    backgroundId: DEFAULT_MY_ROOM_BACKGROUND_ID,
    avatarId: DEFAULT_MY_ROOM_AVATAR_ID,
    featuredBadgeId: '',
    featuredTitleId: DEFAULT_MY_ROOM_TITLE_ID,
    updatedAt: ''
  };
}

function normalizeMyRoomSettings_(settings, userId) {
  const source = settings || {};
  const id = String(userId || source.userId || '').trim();
  const defaults = getDefaultMyRoomSettings_(id);
  const backgroundId = String(source.backgroundId || source['배경ID'] || '').trim();
  const avatarId = String(source.avatarId || source['아바타ID'] || '').trim();
  const featuredBadgeId = String(source.featuredBadgeId || source['대표뱃지ID'] || '').trim();
  const featuredTitleId = String(source.featuredTitleId || source['대표칭호ID'] || '').trim();
  const rawUpdatedAt = source.updatedAt || source['수정일시'] || '';
  const updatedAt = rawUpdatedAt instanceof Date ? rawUpdatedAt.toISOString() : String(rawUpdatedAt || '');

  return {
    userId: id,
    backgroundId: isValidDecorationOption_('background', backgroundId) ? backgroundId : defaults.backgroundId,
    avatarId: isValidDecorationOption_('avatar', avatarId) ? avatarId : defaults.avatarId,
    featuredBadgeId: featuredBadgeId,
    featuredTitleId: isValidDecorationOption_('title', featuredTitleId) ? featuredTitleId : defaults.featuredTitleId,
    updatedAt: updatedAt
  };
}

function myRoomSettingsRowToObject_(row) {
  return {
    userId: String(row[0] || '').trim(),
    backgroundId: String(row[1] || '').trim(),
    avatarId: String(row[2] || '').trim(),
    featuredBadgeId: String(row[3] || '').trim(),
    featuredTitleId: String(row[4] || '').trim(),
    updatedAt: row[5] || ''
  };
}

function getMyRoomSettingsRow_(sheet, userId) {
  const id = String(userId || '').trim();
  if (!sheet || !id) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, MY_ROOM_SETTINGS_HEADERS.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === id) {
      return { rowNumber: i + 2, values: values[i] };
    }
  }
  return null;
}

function makeMyRoomBadgeSummaryItem_(id, label, group, data, order) {
  const item = data || {};
  const total = Number(item.total) || 0;
  const correct = Math.min(Number(item.correct) || 0, total);
  const starCount = Number(item.starCount) || 0;
  const completed = !!total && correct >= total;
  const progressPercent = total ? Math.min(100, Math.round((correct / total) * 100)) : 0;
  return {
    id: id,
    label: label,
    group: group,
    correct: correct,
    total: total,
    starCount: starCount,
    completed: completed,
    progressPercent: progressPercent,
    available: starCount > 0 || completed,
    order: order
  };
}

function recommendMyRoomBadge_(badgeSummary) {
  const items = (badgeSummary && badgeSummary.items) || [];
  const available = items.filter(item => item.available);
  if (!available.length) return null;

  available.sort((a, b) => {
    if (b.starCount !== a.starCount) return b.starCount - a.starCount;
    if (b.completed !== a.completed) return b.completed ? 1 : -1;
    if (b.progressPercent !== a.progressPercent) return b.progressPercent - a.progressPercent;
    return a.order - b.order;
  });
  return available[0];
}

function recommendMyRoomTitle_(userId, badgeSummary) {
  const summary = badgeSummary || {};
  const groupStars = summary.groupStars || {};
  const totalStars = Number(summary.totalStars) || 0;
  const ownedTitleMap = getOwnedTitleIdMapForMyRoom_(userId);
  if (ownedTitleMap.korean_mania) return 'title_korean_mania';
  if (ownedTitleMap.math_mania) return 'title_math_mania';
  if (ownedTitleMap.social_mania) return 'title_social_mania';
  if (ownedTitleMap.word_relation_master) return 'title_word_master';
  if (ownedTitleMap.reading_gmo_complete) return 'title_reading_gmo';
  if (totalStars >= 5) return 'title_allrounder';
  if (Number(groupStars.pokemon) > 0) return 'title_pokemon';
  if (Number(groupStars.math) > 0) return 'title_math';
  if (Number(groupStars.daily) > 0) return 'title_spelling';
  return DEFAULT_MY_ROOM_TITLE_ID;
}

function buildMyRoomBadgeSummary_(userId) {
  const progress = getPracticeBadgeProgress(userId);
  const items = [];
  let order = 1;

  const pokemon = progress.pokemon || {};
  for (let gen = 1; gen <= 9; gen++) {
    items.push(makeMyRoomBadgeSummaryItem_('pokemon_gen' + gen, gen + '세대', 'pokemon', pokemon['gen' + gen], order++));
  }

  const people = progress.people || {};
  ['티니핑', '역사인물', '아이돌', '애니'].forEach(label => {
    items.push(makeMyRoomBadgeSummaryItem_('people_' + label, label, 'people', people[label], order++));
  });

  const daily = progress.daily || {};
  ['맞춤법', '아재개그'].forEach(label => {
    items.push(makeMyRoomBadgeSummaryItem_('daily_' + label, label, 'daily', daily[label], order++));
  });

  const math = progress.math || {};
  items.push(makeMyRoomBadgeSummaryItem_('math_muldiv', '곱셈과 나눗셈', 'math', math['곱셈과 나눗셈'] || math['난수퀴즈'], order++));

  const groupStars = { pokemon: 0, people: 0, daily: 0, math: 0 };
  items.forEach(item => {
    if (!groupStars[item.group]) groupStars[item.group] = 0;
    groupStars[item.group] += Number(item.starCount) || 0;
  });

  const totalStars = items.reduce((sum, item) => sum + (Number(item.starCount) || 0), 0);
  const recommendedBadge = recommendMyRoomBadge_({ items: items });
  return {
    totalStars: totalStars,
    earnedBadgeCount: items.filter(item => item.available).length,
    groupStars: groupStars,
    recommendedBadge: recommendedBadge,
    recommendedBadgeId: recommendedBadge ? recommendedBadge.id : '',
    items: items,
    progress: progress
  };
}

function isValidMyRoomBadgeId_(badgeSummary, badgeId) {
  const id = String(badgeId || '').trim();
  if (!id) return true;
  const items = (badgeSummary && badgeSummary.items) || [];
  return items.some(item => item.id === id && item.available);
}

function getMyRoomData(userId) {
  const id = String(userId || '').trim();
  if (!id) return { success: false, message: 'userId가 필요합니다.' };

  try {
    const member = getMemberByUserId(id);
    if (member && member.error) return { success: false, message: member.error };

    const sheetResult = ensureMyRoomSettingsSheet();
    if (sheetResult.error) return { success: false, message: sheetResult.error };

    const found = getMyRoomSettingsRow_(sheetResult.sheet, id);
    const rawSettings = found ? myRoomSettingsRowToObject_(found.values) : getDefaultMyRoomSettings_(id);
    const badgeSummary = buildMyRoomBadgeSummary_(id);
    const settings = normalizeMyRoomSettings_(rawSettings, id);
    if (!settings.featuredBadgeId) settings.featuredBadgeId = badgeSummary.recommendedBadgeId || '';
    if (!settings.featuredTitleId) settings.featuredTitleId = recommendMyRoomTitle_(id, badgeSummary);

    return {
      success: true,
      member: member,
      settings: settings,
      options: getMyRoomDecorationOptionsForUser_(id),
      badgeSummary: badgeSummary,
      badgeRecommendation: badgeSummary.recommendedBadge,
      totalLikesReceived: getMemberTotalLikes_(id),
      message: '내 집 데이터를 불러왔습니다.'
    };
  } catch (err) {
    Logger.log('[getMyRoomData failed] userId=%s reason=%s', id, err && err.message ? err.message : err);
    return { success: false, message: '내 집 데이터를 불러오지 못했습니다.' };
  }
}

/**
 * 다른 회원의 방 데이터를 조회합니다. (방문용)
 */
function getVisitRoomData(targetUserId, currentUserId) {
  const tid = String(targetUserId || '').trim();
  const cid = String(currentUserId || '').trim();
  if (!tid) return { success: false, message: '방문할 회원을 지정해 주세요.' };
  if (tid === cid) return { success: false, message: '자신의 집은 "내 집" 메뉴에서 확인해 주세요.' };

  try {
    const member = getMemberByUserId(tid);
    if (member && member.error) return { success: false, message: '해당 회원을 찾을 수 없습니다.' };
    if (!isActiveStudentMember_(member)) return { success: false, message: '방문할 수 없는 계정입니다.' };

    const sheetResult = ensureMyRoomSettingsSheet();
    if (sheetResult.error) return { success: false, message: sheetResult.error };

    const found = getMyRoomSettingsRow_(sheetResult.sheet, tid);
    const rawSettings = found ? myRoomSettingsRowToObject_(found.values) : getDefaultMyRoomSettings_(tid);
    const badgeSummary = buildMyRoomBadgeSummary_(tid);
    const settings = normalizeMyRoomSettings_(rawSettings, tid);

    // 대표 뱃지 보완. 방문 화면 칭호는 랭킹용 selectedTitle이 아니라 내집설정 대표칭호를 기준으로 표시한다.
    if (!settings.featuredBadgeId) settings.featuredBadgeId = badgeSummary.recommendedBadgeId || '';
    if (!settings.featuredTitleId) settings.featuredTitleId = DEFAULT_MY_ROOM_TITLE_ID;
    const featuredTitle = getMyRoomTitleOption_(settings.featuredTitleId) || getMyRoomTitleOption_(DEFAULT_MY_ROOM_TITLE_ID);

    const badgeItems = badgeSummary.items || [];
    const featuredBadge = badgeItems.find(item => item && item.id === settings.featuredBadgeId) || badgeSummary.recommendedBadge;

    const likeSheetResult = ensureRoomLikeSheet_();
    let likeStatus = null;
    if (!likeSheetResult.error) {
      likeStatus = getRoomLikeStatus_(likeSheetResult.sheet, cid, tid);
    }

    return {
      success: true,
      targetUserId: tid,
      // 개인정보 최소화 (닉네임, 프로필, 학교명, 칭호 정보만 노출)
      member: {
        nickname: member.nickname || member.name || '나',
        profileImageUrl: member.profileImageUrl || '',
        schoolShortName: member.schoolShortName || '',
        selectedTitle: featuredTitle ? ((featuredTitle.emoji ? featuredTitle.emoji + ' ' : '') + (featuredTitle.name || '퀴즈 새싹')) : '퀴즈 새싹',
        selectedTitleThemeClass: '',
        selectedTitleTierClass: '',
        selectedTitleEffectClass: ''
      },
      settings: settings,
      badgeSummary: {
        totalStars: badgeSummary.totalStars || 0,
        earnedBadgeCount: badgeSummary.earnedBadgeCount || 0
      },
      featuredBadge: featuredBadge || null,
      likeStatus: likeStatus,
      message: '친구의 집 데이터를 불러왔습니다.'
    };
  } catch (err) {
    Logger.log('[getVisitRoomData failed] target=%s reason=%s', tid, err && err.message ? err.message : err);
    return { success: false, message: '친구의 집 정보를 불러오지 못했습니다.' };
  }
}

/**
 * 방문한 집에 하트를 보냅니다. (하루 최대 5회, 같은 집은 1일 1회)
 */
function likeVisitRoom(fromUserId, toUserId) {
  const fid = String(fromUserId || '').trim();
  const tid = String(toUserId || '').trim();

  if (!fid || !tid) return { success: false, message: '회원 정보가 필요합니다.' };
  if (fid === tid) return { success: false, message: '자신의 집에는 하트를 보낼 수 없습니다.' };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { success: false, message: memberSheet.error };
  const targetMember = findMemberRow_(memberSheet.sheet, tid);
  if (!targetMember) return { success: false, message: '방문할 집의 주인을 찾을 수 없습니다.' };
  if (!isActiveStudentMember_(memberRowToObject_(targetMember.values))) {
    return { success: false, message: '방문할 수 없는 계정입니다.' };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(3000);
    const likeSheetResult = ensureRoomLikeSheet_();
    if (likeSheetResult.error) return { success: false, message: likeSheetResult.error };

    const sheet = likeSheetResult.sheet;
    const currentStatus = getRoomLikeStatus_(sheet, fid, tid);

    if (!currentStatus.canLike) {
      return { success: false, message: currentStatus.message || '하트를 보낼 수 없습니다.' };
    }

    const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const now = new Date();
    sheet.appendRow([todayStr, fid, tid, now]);

    // 갱신된 상태 반환
    const newStatus = getRoomLikeStatus_(sheet, fid, tid);
    return {
      success: true,
      message: '하트를 보냈어요! 💗',
      totalLikes: newStatus.totalLikes,
      todayRemainingLikes: newStatus.todayRemainingLikes,
      likedToday: newStatus.likedToday,
      canLike: newStatus.canLike,
      likeMessage: newStatus.message
    };
  } catch (err) {
    Logger.log('[likeVisitRoom failed] from=%s to=%s reason=%s', fid, tid, err && err.message ? err.message : err);
    return { success: false, message: '하트를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.' };
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

/**
 * 나를 제외한 랜덤한 회원의 방 데이터를 가져옵니다.
 */
function getRandomOtherRoom(currentUserId) {
  const cid = String(currentUserId || '').trim();
  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { success: false, message: memberSheet.error };

  const lastRow = memberSheet.sheet.getLastRow();
  if (lastRow < 2) return { success: false, message: '방문할 수 있는 회원이 아직 없어요.' };

  ensureMemberHeaders_(memberSheet.sheet);
  const values = memberSheet.sheet.getRange(2, 1, lastRow - 1, MEMBER_INFO_COLUMN_COUNT).getValues();
  // 본인 제외 및 닉네임 있는 회원 필터링
  const candidates = values.filter(row => {
    const member = memberRowToObject_(row);
    return member.userId && member.userId !== cid && member.nickname && isActiveStudentMember_(member);
  });

  if (!candidates.length) return { success: false, message: '방문할 수 있는 다른 친구가 없어요.' };

  const randomIndex = Math.floor(Math.random() * candidates.length);
  const targetUserId = String(candidates[randomIndex][0]).trim();

  return getVisitRoomData(targetUserId, cid);
}

/**
 * 닉네임으로 회원을 검색합니다. (최대 10명)
 */
function searchMembersByNickname(query, currentUserId) {
  const q = String(query || '').trim();
  const cid = String(currentUserId || '').trim();
  if (!q || q.length < 1) return [];

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return [];

  const lastRow = memberSheet.sheet.getLastRow();
  if (lastRow < 2) return [];

  ensureMemberHeaders_(memberSheet.sheet);
  const values = memberSheet.sheet.getRange(2, 1, lastRow - 1, MEMBER_INFO_COLUMN_COUNT).getValues();
  const results = [];

  for (let i = 0; i < values.length; i++) {
    const member = memberRowToObject_(values[i]);
    if (!isActiveStudentMember_(member) || member.userId === cid) continue; // 나 제외

    const userId = member.userId;
    const nickname = member.nickname;
    if (nickname && nickname.indexOf(q) !== -1) {
      results.push({
        userId: userId,
        nickname: nickname,
        profileImageUrl: member.profileImageUrl
      });
      if (results.length >= 10) break;
    }
  }

  return results;
}

function saveMyRoomSettings(settings) {
  const input = settings || {};
  const id = String(input.userId || '').trim();
  if (!id) return { success: false, message: 'userId가 필요합니다.' };

  const member = getMemberByUserId(id);
  if (member && member.error) return { success: false, message: member.error };

  const badgeSummary = buildMyRoomBadgeSummary_(id);
  const backgroundId = String(input.backgroundId || '').trim() || DEFAULT_MY_ROOM_BACKGROUND_ID;
  const avatarId = String(input.avatarId || '').trim() || DEFAULT_MY_ROOM_AVATAR_ID;
  const featuredBadgeId = String(input.featuredBadgeId || '').trim();
  const featuredTitleId = String(input.featuredTitleId || '').trim() || recommendMyRoomTitle_(id, badgeSummary);

  if (!isValidDecorationOption_('background', backgroundId)) {
    return { success: false, message: '선택할 수 없는 배경입니다.' };
  }
  if (!isValidDecorationOption_('avatar', avatarId)) {
    return { success: false, message: '선택할 수 없는 아바타입니다.' };
  }
  if (!isValidDecorationOption_('title', featuredTitleId)) {
    return { success: false, message: '선택할 수 없는 칭호입니다.' };
  }
  if (!isSelectableMyRoomTitle_(id, featuredTitleId)) {
    return { success: false, message: '아직 보유하지 않은 칭호입니다.' };
  }
  if (!isValidMyRoomBadgeId_(badgeSummary, featuredBadgeId)) {
    return { success: false, message: '선택할 수 없는 대표 뱃지입니다.' };
  }

  const sheetResult = ensureMyRoomSettingsSheet();
  if (sheetResult.error) return { success: false, message: sheetResult.error };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(3000);
    const sheet = sheetResult.sheet;
    const found = getMyRoomSettingsRow_(sheet, id);
    const now = new Date();
    const row = [id, backgroundId, avatarId, featuredBadgeId, featuredTitleId, now];

    if (found) sheet.getRange(found.rowNumber, 1, 1, MY_ROOM_SETTINGS_HEADERS.length).setValues([row]);
    else sheet.appendRow(row);

    const savedSettings = normalizeMyRoomSettings_(myRoomSettingsRowToObject_(row), id);
    savedSettings.updatedAt = now.toISOString();
    return {
      success: true,
      settings: savedSettings,
      badgeSummary: badgeSummary,
      message: '내 집 설정이 저장되었습니다.'
    };
  } catch (err) {
    Logger.log('[saveMyRoomSettings failed] userId=%s reason=%s', id, err && err.message ? err.message : err);
    return { success: false, message: '내 집 설정을 저장할 수 없습니다.' };
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {
      // Lock may not have been acquired if waitLock failed.
    }
  }
}

function isValidProfileImageUrl_(value) {
  const url = String(value || '').trim();
  if (!url || /\s/.test(url)) return false;
  if (/^https?:\/\//i.test(url)) return true;
  return /^[a-zA-Z0-9_-]{25,}$/.test(url);
}

function addProfileImageSearchResult_(results, seenUrls, item) {
  const url = String((item && item.url) || '').trim();
  if (!isValidProfileImageUrl_(url)) return;

  const displayUrl = toDisplayImageUrl(url);
  if (!displayUrl) return;
  const dedupeKey = displayUrl || url;
  if (seenUrls[dedupeKey]) return;
  if (results.length >= 30) return;

  seenUrls[dedupeKey] = true;
  results.push({
    name: String(item.name || '').trim(),
    url: url,
    displayUrl: displayUrl,
    source: String(item.source || '').trim(),
    category: String(item.category || '').trim()
  });
}

function rowContainsKeyword_(row, indexes, keyword) {
  return indexes.some(index => String(row[index] || '').toLowerCase().indexOf(keyword) !== -1);
}

function searchProfileImageCandidates(keyword) {
  const query = String(keyword || '').trim().toLowerCase();
  if (!query || query.length < 2) return [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return [];

  const results = [];
  const seenUrls = {};

  const profileSheet = ss.getSheetByName('프로필이미지');
  if (profileSheet && profileSheet.getLastRow() >= 2) {
    const values = profileSheet.getRange(2, 1, profileSheet.getLastRow() - 1, 4).getValues();
    values.forEach(row => {
      if (results.length >= 30) return;
      const name = String(row[1] || '').trim();
      const url = String(row[2] || '').trim();
      const category = String(row[3] || '').trim();
      if (!url) return;
      if ((name + ' ' + category).toLowerCase().indexOf(query) === -1) return;
      addProfileImageSearchResult_(results, seenUrls, {
        name: name,
        url: url,
        source: '프로필이미지',
        category: category
      });
    });
  }

  const problemSheetConfigs = [
    { sheetName: '티니핑문제', imageIndex: 4, textIndexes: [0, 1, 2, 3, 5], category: '티니핑' },
    { sheetName: '포켓몬문제', imageIndex: 4, textIndexes: [0, 1, 2, 3, 5], category: '포켓몬' },
    { sheetName: '인물문제', imageIndex: 4, textIndexes: [1, 2, 3, 5], category: '인물' },
    { sheetName: '아이돌문제', imageIndex: 4, textIndexes: [1, 2, 3, 5], category: '아이돌' },
    { sheetName: '애니문제', imageIndex: 4, textIndexes: [1, 2, 3, 5], category: '애니' },
    { sheetName: '맞춤법문제', imageIndex: 4, textIndexes: [0, 1, 2, 3, 5], category: '맞춤법' },
    { sheetName: '아재개그문제', imageIndex: 4, textIndexes: [0, 1, 2, 3, 5], category: '아재개그' }
  ];

  problemSheetConfigs.forEach(config => {
    if (results.length >= 30) return;
    const sheet = ss.getSheetByName(config.sheetName);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    values.forEach(row => {
      if (results.length >= 30) return;
      const url = String(row[config.imageIndex] || '').trim();
      if (!url) return;
      if (!rowContainsKeyword_(row, config.textIndexes, query)) return;
      const name = String(row[1] || row[0] || '').trim();
      addProfileImageSearchResult_(results, seenUrls, {
        name: name,
        url: url,
        source: config.sheetName,
        category: config.category
      });
    });
  });

  return results;
}

function updateMemberProfileImage(userId, imageUrl) {
  const id = String(userId || '').trim();
  const url = String(imageUrl || '').trim();
  if (!id) return { error: 'userId가 필요합니다.' };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { error: memberSheet.error };

  const found = findMemberRow_(memberSheet.sheet, id);
  if (!found) return { error: '회원정보를 찾을 수 없습니다.' };

  memberSheet.sheet.getRange(found.rowNumber, 6).setValue(url);
  const updatedValues = found.values.slice();
  updatedValues[5] = url;
  return memberRowToObject_(updatedValues);
}

function uploadProfileImage(userId, fileName, mimeType, base64Data) {
  const id = String(userId || '').trim();
  const type = String(mimeType || '').trim().toLowerCase();
  const data = String(base64Data || '').replace(/^data:[^,]+,/, '').trim();
  if (!ENABLE_PROFILE_IMAGE_UPLOAD) return { error: '직접 이미지 업로드가 꺼져 있습니다.' };
  if (!PROFILE_UPLOAD_FOLDER_ID) return { error: '프로필 업로드 폴더 ID가 설정되지 않았습니다.' };
  if (!id) return { error: 'userId가 필요합니다.' };
  if (!data) return { error: '업로드할 이미지 파일을 선택해 주세요.' };

  const extension = getImageExtensionFromContentType(type);
  if (!extension) return { error: 'PNG, JPG, WEBP 이미지만 업로드할 수 있습니다.' };

  const memberSheet = getMemberSheet_();
  if (memberSheet.error) return { error: memberSheet.error };

  const found = findMemberRow_(memberSheet.sheet, id);
  if (!found) return { error: '회원정보를 찾을 수 없습니다.' };

  let bytes;
  try {
    bytes = Utilities.base64Decode(data);
  } catch (err) {
    return { error: '이미지 파일을 읽지 못했습니다.' };
  }
  if (bytes.length > MAX_PROFILE_IMAGE_UPLOAD_BYTES) {
    return { error: '이미지 파일은 2MB 이하만 업로드할 수 있습니다.' };
  }

  try {
    const folder = DriveApp.getFolderById(PROFILE_UPLOAD_FOLDER_ID);
    const safeUserId = normalizeFileName(id) || 'profile';
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    const safeName = 'profile_' + safeUserId + '_' + stamp + '.' + extension;
    const blob = Utilities.newBlob(bytes, type, safeName);
    const file = folder.createFile(blob);
    setFilePublicReadable(file);
    const imageUrl = getDirectDriveImageUrl(file.getId());

    memberSheet.sheet.getRange(found.rowNumber, 6).setValue(imageUrl);
    const updatedValues = found.values.slice();
    updatedValues[5] = imageUrl;
    return {
      imageUrl: imageUrl,
      member: memberRowToObject_(updatedValues)
    };
  } catch (err) {
    Logger.log('[profile image upload failed] userId=%s fileName=%s reason=%s', id, fileName, err && err.message ? err.message : err);
    return { error: '프로필 이미지 업로드에 실패했습니다. 폴더 ID와 Drive 권한을 확인해 주세요.' };
  }
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
// Manual debug only. The current quiz UI uses Web Audio effects directly.
function listPokemonSoundFileIds() {
  const files = getSortedPokemonImageFolderFiles();
  const soundIds = findSoundFileIdsInPokemonFolder();
  Logger.log(JSON.stringify(files, null, 2));
  return {
    correctCandidate: soundIds.correctFile,
    wrongCandidate: soundIds.wrongFile,
    warnings: soundIds.warnings,
    files
  };
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
// Manual debug only. The current quiz UI uses Web Audio effects directly.
function getQuizSoundFileIds() {
  const soundIds = findSoundFileIdsInPokemonFolder();
  return {
    correct: soundIds.correctFile ? soundIds.correctFile.id : '',
    wrong: soundIds.wrongFile ? soundIds.wrongFile.id : '',
    warnings: soundIds.warnings
  };
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
// Manual debug helper for checking optional Drive sound files.
function findSoundFileIdsInPokemonFolder() {
  const files = getSortedPokemonImageFolderFiles();
  const findByName = name => files.find(file => String(file.name || '').trim().toLowerCase() === name);
  const correctFile = findByName('1.mp3') || null;
  const wrongFile = findByName('2.mp3') || null;
  const typoFile = findByName('2.mp.3') || null;
  const warnings = [];

  if (!correctFile) warnings.push('1.mp3 파일을 pokemon_images 폴더에서 찾지 못했습니다.');
  if (!wrongFile) warnings.push('2.mp3 파일을 pokemon_images 폴더에서 찾지 못했습니다.');
  if (typoFile) warnings.push('2.mp.3 파일이 있습니다. 오답 사운드는 2.mp3 파일명을 사용합니다.');

  Logger.log('correct sound 1.mp3: ' + JSON.stringify(correctFile));
  Logger.log('wrong sound 2.mp3: ' + JSON.stringify(wrongFile));
  if (typoFile) Logger.log('possible typo sound 2.mp.3: ' + JSON.stringify(typoFile));
  if (warnings.length) Logger.log('sound warnings: ' + warnings.join(' / '));

  return { correctFile, wrongFile, typoFile, warnings, files };
}

function getSortedPokemonImageFolderFiles() {
  const folder = DriveApp.getFolderById(POKEMON_IMAGES_FOLDER_ID);
  const files = [];
  const iterator = folder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    files.push({
      name: file.getName(),
      id: file.getId(),
      mimeType: file.getMimeType()
    });
  }

  files.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true, sensitivity: 'base' }));
  return files;
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function updateTinipingImageLinksFromDrive() {
  if (!TINIPING_IMAGE_FOLDER_ID) {
    Logger.log('TINIPING_IMAGE_FOLDER_ID에 dj48-quiz-images/tiniping 폴더 ID를 입력하세요.');
    return {
      error: 'TINIPING_IMAGE_FOLDER_ID가 비어 있습니다.',
      updated: 0
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  const sheet = ss.getSheetByName('티니핑문제');
  if (!sheet) throw new Error('티니핑문제 시트를 찾을 수 없습니다.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('티니핑문제 시트에 갱신할 데이터가 없습니다.');
    return {
      totalRows: 0,
      rowsWithNumber: 0,
      updated: 0,
      missingFiles: 0,
      emptyNumbers: 0,
      sharingFailures: 0
    };
  }

  const fileMap = getTinipingDriveImageFileMap_();
  const rowCount = lastRow - 1;
  const values = sheet.getRange(2, 1, rowCount, 3).getValues();
  const nextImageValues = values.map(row => [row[0]]);
  const missing = [];
  let rowsWithNumber = 0;
  let updated = 0;
  let emptyNumbers = 0;
  let sharingFailures = 0;

  values.forEach((row, index) => {
    const rowNumber = index + 2;
    const numberText = normalizeTinipingImageNumber_(row[2]);
    if (!numberText) {
      emptyNumbers++;
      return;
    }

    rowsWithNumber++;
    const file = fileMap[numberText];
    if (!file) {
      missing.push(numberText + '.jpg(row ' + rowNumber + ')');
      return;
    }

    try {
      setFilePublicReadable(file);
    } catch (err) {
      sharingFailures++;
      Logger.log('[tiniping sharing failed] row=%s number=%s file=%s reason=%s', rowNumber, numberText, file.getName(), err && err.message ? err.message : err);
    }

    nextImageValues[index][0] = getDirectDriveImageUrl(file.getId());
    updated++;
  });

  if (updated > 0) {
    sheet.getRange(2, 1, rowCount, 1).setValues(nextImageValues);
  }

  Logger.log(
    '티니핑 이미지 URL 갱신 완료: 전체 행 %s, 번호 있는 행 %s, 갱신 %s, 파일 못 찾음 %s, 번호 없음 %s, 권한 설정 실패 %s',
    rowCount,
    rowsWithNumber,
    updated,
    missing.length,
    emptyNumbers,
    sharingFailures
  );
  if (missing.length) Logger.log('누락 파일: ' + missing.join(', '));

  return {
    totalRows: rowCount,
    rowsWithNumber: rowsWithNumber,
    updated: updated,
    missingFiles: missing.length,
    emptyNumbers: emptyNumbers,
    sharingFailures: sharingFailures
  };
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function listTinipingDriveImageFiles() {
  if (!TINIPING_IMAGE_FOLDER_ID) {
    Logger.log('TINIPING_IMAGE_FOLDER_ID에 dj48-quiz-images/tiniping 폴더 ID를 입력하세요.');
    return [];
  }

  const folder = DriveApp.getFolderById(TINIPING_IMAGE_FOLDER_ID);
  const files = [];
  const iterator = folder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    files.push({
      name: file.getName(),
      id: file.getId(),
      mimeType: file.getMimeType()
    });
  }

  files.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true, sensitivity: 'base' }));
  files.forEach(file => Logger.log('%s | %s | %s', file.name, file.id, file.mimeType));
  Logger.log('티니핑 Drive 이미지 파일 수: ' + files.length);
  return files;
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function getTinipingDriveImageFileMap_() {
  const folder = DriveApp.getFolderById(TINIPING_IMAGE_FOLDER_ID);
  const map = {};
  const iterator = folder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    const match = String(file.getName() || '').trim().match(/^(\d+)\.(jpe?g)$/i);
    if (!match) continue;
    const numberText = String(Number(match[1]));
    if (!numberText || numberText === 'NaN') continue;
    if (!map[numberText]) map[numberText] = file;
  }
  return map;
}

function normalizeTinipingImageNumber_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const number = Number(text);
  if (!number || isNaN(number)) return '';
  return String(number);
}

function getTodayUsageDateString_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
}

function isLikelySheetDateSerial_(value) {
  if (value === null || value === undefined || value === '') return false;
  const number = Number(value);
  return isFinite(number) && number >= 20000 && number <= 80000;
}

function formatSheetDateSerial_(value) {
  const number = Math.floor(Number(value));
  if (!isFinite(number)) return '';
  const millis = Date.UTC(1899, 11, 30) + number * 24 * 60 * 60 * 1000;
  return Utilities.formatDate(new Date(millis), 'Asia/Seoul', 'yyyy-MM-dd');
}

function isAfter4PmSeoul_() {
  const hour = Number(Utilities.formatDate(new Date(), 'Asia/Seoul', 'H')) || 0;
  return hour >= DAILY_AFTER4_START_HOUR;
}

function normalizeDailyDateKey_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, 'Asia/Seoul', 'yyyy-MM-dd');
  if (isLikelySheetDateSerial_(value)) return formatSheetDateSerial_(value);
  const text = String(value || '').trim();
  if (!text) return '';
  if (isLikelySheetDateSerial_(text)) return formatSheetDateSerial_(text);
  const dateMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (dateMatch) {
    return [
      dateMatch[1],
      String(Number(dateMatch[2])).padStart(2, '0'),
      String(Number(dateMatch[3])).padStart(2, '0')
    ].join('-');
  }
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, 'Asia/Seoul', 'yyyy-MM-dd');
  return text;
}

function normalizeDailyUsageRow_(row) {
  const values = Array.isArray(row) ? row : [];
  const hasUnlockBaseColumn = values.length >= 7;
  const hasAfter4Column = values.length >= 6;
  const funSeconds = Math.max(0, Math.round(Number(values[2]) || 0));
  const after4FunSeconds = hasAfter4Column ? Math.max(0, Math.round(Number(values[3]) || 0)) : 0;
  const eduIndex = hasUnlockBaseColumn ? 4 : (hasAfter4Column ? 4 : 3);
  const unlockBaseIndex = hasUnlockBaseColumn ? 5 : 0;
  const updatedAtIndex = hasUnlockBaseColumn ? 6 : (hasAfter4Column ? 5 : 4);
  return {
    date: normalizeDailyDateKey_(values[0]),
    memberId: String(values[1] || '').trim(),
    funSeconds: funSeconds,
    after4FunSeconds: after4FunSeconds,
    eduCorrectCount: Math.max(0, Math.round(Number(values[eduIndex]) || 0)),
    unlockBaseEduCorrectCount: hasUnlockBaseColumn ? Math.max(0, Math.round(Number(values[unlockBaseIndex]) || 0)) : 0,
    updatedAt: values[updatedAtIndex] || ''
  };
}

function normalizeQuizCategoryKey_(category, subFilter) {
  const cat = String(category || '').trim();
  const sub = String(subFilter || '').trim();
  if (cat === '인물' && sub) return sub;
  if (cat === '역사인물') return '역사 인물';
  if (cat === '역사') return '역사 인물';
  return cat;
}

function isFunQuizCategory_(category, subFilter) {
  const key = normalizeQuizCategoryKey_(category, subFilter);
  return ['티니핑', '포켓몬', '아이돌', '애니', '아재개그'].indexOf(key) !== -1;
}

function isEducationQuizCategory_(category, subFilter) {
  const key = normalizeQuizCategoryKey_(category, subFilter);
  const sub = String(subFilter || '').trim();
  if (key === '단어' && sub === '다의어·동형이의어') return true;
  return ['독서', '역사 인물', '역사', '수학', '맞춤법'].indexOf(key) !== -1;
}

function ensureDailyUsageSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  let sheet = ss.getSheetByName(DAILY_USAGE_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(DAILY_USAGE_SHEET_NAME);

  const headers = DAILY_USAGE_HEADERS;
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(value => String(value || '').trim());
  const normalizedHeaders = currentHeaders.map(value => value.toLowerCase());
  const hasUnlockBaseHeader = normalizedHeaders[5] === 'unlockbaseeducorrectcount';
  const legacyLayout = normalizedHeaders[0] === 'date'
    && normalizedHeaders[1] === 'memberid'
    && normalizedHeaders[2] === 'funseconds'
    && normalizedHeaders[3] === 'after4funseconds'
    && normalizedHeaders[4] === 'educorrectcount'
    && normalizedHeaders[5] === 'updatedat';
  if (!hasUnlockBaseHeader && legacyLayout) {
    sheet.insertColumnBefore(6);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const needsHeader = headers.some((header, index) => String(currentHeaders[index] || '').trim() !== header);
    if (needsHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.getRange('A:B').setNumberFormat('@');

  return { sheet: sheet };
}

function ensureTodayUsageRow_(memberId) {
  const id = String(memberId || '').trim();
  if (!id) return { error: '회원 정보가 필요합니다.' };

  const sheetResult = ensureDailyUsageSheet_();
  if (sheetResult.error) return sheetResult;

  const sheet = sheetResult.sheet;
  const today = getTodayUsageDateString_();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, DAILY_USAGE_HEADERS.length).getValues();
    const matched = [];
    for (let i = 0; i < values.length; i++) {
      const normalized = normalizeDailyUsageRow_(values[i]);
      const rowDate = normalized.date;
      const rowMemberId = normalized.memberId;
      if (rowDate === today && rowMemberId === id) {
        matched.push({ rowNumber: i + 2, values: values[i], normalized: normalized });
      }
    }
    if (matched.length > 0) {
      if (matched.length > 1) {
        const merged = matched.reduce((acc, item) => {
          acc.funSeconds += item.normalized.funSeconds;
          acc.after4FunSeconds += item.normalized.after4FunSeconds;
          acc.eduCorrectCount += item.normalized.eduCorrectCount;
          if (!acc.unlockBaseEduCorrectCount && item.normalized.unlockBaseEduCorrectCount > 0) {
            acc.unlockBaseEduCorrectCount = item.normalized.unlockBaseEduCorrectCount;
          }
          return acc;
        }, { funSeconds: 0, after4FunSeconds: 0, eduCorrectCount: 0, unlockBaseEduCorrectCount: 0 });
        const first = matched[0];
        const now = new Date();
        const nextValues = [today, id, merged.funSeconds, merged.after4FunSeconds, merged.eduCorrectCount, merged.unlockBaseEduCorrectCount, now];
        sheet.getRange(first.rowNumber, 1, 1, DAILY_USAGE_HEADERS.length).setValues([nextValues]);
        for (let i = matched.length - 1; i >= 1; i--) {
          sheet.deleteRow(matched[i].rowNumber);
        }
        return { sheet: sheet, rowNumber: first.rowNumber, values: nextValues };
      }
      const normalizedValues = [
        today,
        id,
        matched[0].normalized.funSeconds,
        matched[0].normalized.after4FunSeconds,
        matched[0].normalized.eduCorrectCount,
        matched[0].normalized.unlockBaseEduCorrectCount,
        matched[0].normalized.updatedAt
      ];
      if (String(matched[0].values[0] || '').trim() !== today) {
        sheet.getRange(matched[0].rowNumber, 1).setValue(today);
      }
      return { sheet: sheet, rowNumber: matched[0].rowNumber, values: normalizedValues };
    }
  }

  const now = new Date();
  const row = [today, id, 0, 0, 0, 0, now];
  sheet.appendRow(row);
  return { sheet: sheet, rowNumber: sheet.getLastRow(), values: row };
}

function ensureUnlockBaseEduCorrectCount_(rowResult) {
  if (!rowResult || rowResult.error) return rowResult;
  const normalized = normalizeDailyUsageRow_(rowResult.values);
  if (normalized.funSeconds < DAILY_FUN_LIMIT_SECONDS) return rowResult;
  if (normalized.unlockBaseEduCorrectCount > 0) return rowResult;
  const nextBase = Math.max(0, normalized.eduCorrectCount);
  const nextValues = [
    normalized.date,
    normalized.memberId,
    normalized.funSeconds,
    normalized.after4FunSeconds,
    normalized.eduCorrectCount,
    nextBase,
    normalized.updatedAt || new Date()
  ];
  rowResult.sheet.getRange(rowResult.rowNumber, 1, 1, DAILY_USAGE_HEADERS.length).setValues([nextValues]);
  rowResult.values = nextValues;
  return rowResult;
}

function usageRowToStatus_(row) {
  const normalized = normalizeDailyUsageRow_(row);
  const funSeconds = normalized.funSeconds;
  const after4FunSeconds = normalized.after4FunSeconds;
  const eduCorrectCount = normalized.eduCorrectCount;
  const unlockBaseEduCorrectCount = Math.max(0, normalized.unlockBaseEduCorrectCount || 0);
  const requiredCorrect = DAILY_EDU_UNLOCK_CORRECT_COUNT;
  const unlockProgress = funSeconds >= DAILY_FUN_LIMIT_SECONDS
    ? Math.max(0, eduCorrectCount - unlockBaseEduCorrectCount)
    : 0;
  const unlockRemainingCorrect = Math.max(0, requiredCorrect - unlockProgress);
  const isUnlockedToday = funSeconds >= DAILY_FUN_LIMIT_SECONDS && unlockProgress >= requiredCorrect;
  const isSoftLocked = funSeconds >= DAILY_FUN_LIMIT_SECONDS && unlockProgress < requiredCorrect;
  const isHardLocked = after4FunSeconds >= DAILY_AFTER4_HARD_LIMIT_SECONDS;
  const isLocked = isSoftLocked || isHardLocked;
  const lockReason = isHardLocked
    ? 'DAILY_MAX_REACHED'
    : (isSoftLocked ? 'NEED_EDUCATION_UNLOCK' : (isUnlockedToday ? 'UNLOCKED_TODAY' : 'AVAILABLE'));
  return {
    date: normalized.date,
    memberId: normalized.memberId,
    funSeconds: funSeconds,
    after4FunSeconds: after4FunSeconds,
    eduCorrectCount: eduCorrectCount,
    unlockBaseEduCorrectCount: unlockBaseEduCorrectCount,
    unlockProgress: unlockProgress,
    funLimitSeconds: DAILY_FUN_LIMIT_SECONDS,
    dailySoftLimitSeconds: DAILY_FUN_LIMIT_SECONDS,
    eduUnlockCorrectCount: requiredCorrect,
    requiredCorrect: requiredCorrect,
    unlockRemainingCorrect: unlockRemainingCorrect,
    isUnlockedToday: isUnlockedToday,
    isLocked: isLocked,
    isSoftLocked: isSoftLocked,
    isHardLocked: isHardLocked,
    after4HardLimitSeconds: DAILY_AFTER4_HARD_LIMIT_SECONDS,
    after4RemainingSeconds: Math.max(0, DAILY_AFTER4_HARD_LIMIT_SECONDS - after4FunSeconds),
    isAfter4Window: isAfter4PmSeoul_(),
    lockReason: lockReason,
    funRemainingSeconds: Math.max(0, DAILY_FUN_LIMIT_SECONDS - funSeconds),
    unlockedByEducation: isUnlockedToday
  };
}

function getTodayUsageStatus_(memberId) {
  const row = ensureTodayUsageRow_(memberId);
  if (row.error) return { success: false, error: row.error };
  const ensuredRow = ensureUnlockBaseEduCorrectCount_(row);
  const status = usageRowToStatus_(ensuredRow.values);
  status.success = true;
  return status;
}

function getQuizAccessStatus(memberId, category, subFilter) {
  const status = getTodayUsageStatus_(memberId);
  if (!status || status.success === false) return status;

  const isFun = isFunQuizCategory_(category, subFilter);
  const locked = isFun && (status.isHardLocked || status.isSoftLocked);
  return Object.assign({}, status, {
    success: true,
    category: String(category || '').trim(),
    subFilter: String(subFilter || '').trim(),
    isFunQuiz: isFun,
    isEducationQuiz: isEducationQuizCategory_(category, subFilter),
    canAccess: !locked,
    locked: locked,
    isLocked: locked,
    isSoftLocked: !!(isFun && status.isSoftLocked),
    isHardLocked: !!(isFun && status.isHardLocked),
    isUnlockedToday: status.isUnlockedToday,
    unlockBaseEduCorrectCount: status.unlockBaseEduCorrectCount,
    unlockProgress: status.unlockProgress,
    requiredCorrect: status.requiredCorrect,
    unlockRemainingCorrect: status.unlockRemainingCorrect,
    dailySoftLimitSeconds: status.dailySoftLimitSeconds,
    after4HardLimitSeconds: status.after4HardLimitSeconds,
    after4RemainingSeconds: status.after4RemainingSeconds,
    lockReason: locked
      ? status.lockReason
      : (status.isUnlockedToday ? 'UNLOCKED_TODAY' : 'AVAILABLE'),
    message: locked
      ? (status.isHardLocked
        ? '오늘의 인기퀴즈 이용 시간이 모두 끝났어요! 오후 4시 이후 인기퀴즈는 하루 최대 30분까지 이용할 수 있어요. 자정이 지나면 다시 이용할 수 있습니다.'
        : '오늘의 인기퀴즈 기본 시간이 끝났어요! 국어·사회 퀴즈에서 15문제를 맞히면 다시 이용할 수 있어요. 수학 퀴즈는 준비 중이에요.')
      : (status.isUnlockedToday ? '오늘 해금 완료' : '')
  });
}

function resolveReadingAnswerText_(rawAnswer, choices) {
  const raw = String(rawAnswer || '').trim();
  const list = Array.isArray(choices) ? choices : [];
  if (!raw) return '';

  const normalized = raw.replace(/\s+/g, '');
  const bracketMatch = normalized.match(/^\[?([1-4])\]?$/);
  if (bracketMatch) return list[Number(bracketMatch[1]) - 1] || raw;

  const circledMap = { '①': 1, '②': 2, '③': 3, '④': 4 };
  if (circledMap[normalized]) return list[circledMap[normalized] - 1] || raw;

  const choiceMatch = normalized.match(/^보기([1-4])$/);
  if (choiceMatch) return list[Number(choiceMatch[1]) - 1] || raw;

  const matchedChoice = list.find(choice => String(choice || '').trim() === raw);
  return matchedChoice || raw;
}

function addDailyQuizProgress(memberId, category, subFilter, funSeconds, educationCorrect) {
  const row = ensureTodayUsageRow_(memberId);
  if (row.error) return { success: false, error: row.error };

  const sheet = row.sheet;
  const current = usageRowToStatus_(row.values);
  const seconds = isFunQuizCategory_(category, subFilter)
    ? Math.min(MAX_FUN_SECONDS_PER_QUESTION, Math.max(0, Math.round(Number(funSeconds) || 0)))
    : 0;
  const after4Seconds = isFunQuizCategory_(category, subFilter) && isAfter4PmSeoul_() ? seconds : 0;
  const eduIncrement = isEducationQuizCategory_(category, subFilter) && educationCorrect === true ? 1 : 0;
  const nextFunSeconds = current.funSeconds + seconds;
  const nextAfter4FunSeconds = current.after4FunSeconds + after4Seconds;
  const nextEduCorrectCount = current.eduCorrectCount + eduIncrement;
  const nextUnlockBaseEduCorrectCount = current.unlockBaseEduCorrectCount > 0
    ? current.unlockBaseEduCorrectCount
    : (nextFunSeconds >= DAILY_FUN_LIMIT_SECONDS ? current.eduCorrectCount : 0);
  const now = new Date();

  sheet.getRange(row.rowNumber, 3, 1, 5).setValues([[nextFunSeconds, nextAfter4FunSeconds, nextEduCorrectCount, nextUnlockBaseEduCorrectCount, now]]);
  const status = usageRowToStatus_([current.date, current.memberId, nextFunSeconds, nextAfter4FunSeconds, nextEduCorrectCount, nextUnlockBaseEduCorrectCount, now]);
  status.success = true;
  status.addedFunSeconds = seconds;
  status.addedAfter4FunSeconds = after4Seconds;
  status.addedEduCorrectCount = eduIncrement;
  return status;
}

function getKoreanQuizOptions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('국어목록');
  const fallback = [
    { quizId: 'spelling', title: '맞춤법', type: 'sheet', sheetName: '맞춤법문제', description: '', uiType: 'input', badgeGroup: 'korean', completionType: 'loop', titleSource: 'daily_맞춤법', subjectGroup: 'korean' },
    { quizId: 'word-relation', title: '다의어·동형이의어', type: 'sheet', sheetName: '단어시트', description: '', uiType: 'multipleChoice2', badgeGroup: 'korean', completionType: 'loop', titleSource: 'korean_word_relation', subjectGroup: 'korean' },
    { quizId: 'gmo', title: '지엠오 아이', type: 'sheet', sheetName: '지앰오아이문제', description: '', uiType: 'multipleChoice4', badgeGroup: 'korean', completionType: 'complete', titleSource: 'korean_gmo', subjectGroup: 'korean' }
  ];

  if (!sheet) return fallback;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return fallback;

  const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  const activeBooks = data.filter(row => {
    const active = String(row[4] || '').trim().toUpperCase();
    return ['Y', 'TRUE', '사용', '활성'].indexOf(active) !== -1;
  }).map(row => ({
    quizId: String(row[0] || '').trim(),
    title: String(row[1] || '').trim(),
    type: String(row[2] || '').trim(),
    sheetName: String(row[3] || '').trim(),
    order: parseInt(row[5]) || 999,
    description: String(row[6] || '').trim(),
    uiType: String(row[8] || '').trim(),
    badgeGroup: String(row[9] || '').trim(),
    completionType: String(row[10] || '').trim(),
    titleSource: String(row[11] || '').trim(),
    subjectGroup: String(row[12] || '').trim()
  })).sort((a, b) => a.order - b.order);

  return activeBooks.length > 0 ? activeBooks : fallback;
}

function getReadingBookConfig_(bookKey) {
  const books = getKoreanQuizOptions();
  const key = String(bookKey || '').trim();

  // Try exact match on quizId or title
  let book = books.find(b => b.quizId === key || b.title === key);

  // Special compatibility for GMO Eye aliases
  if (!book && (key === '지앰오 아이' || key === '지엠오' || key === '지앰오')) {
    book = books.find(b => b.quizId === 'gmo' || b.title === '지엠오 아이');
  }

  return book;
}

function getMathQuizFallback_() {
  return {
    quizId: 'random-basic',
    title: '곱셈과 나눗셈',
    type: 'generated',
    sheetName: '',
    description: '곱셈과 나눗셈 단원 자동 생성 문제'
  };
}

function getMathQuizOptions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fallback = [getMathQuizFallback_()];
  if (!ss) return fallback;

  const sheet = ss.getSheetByName('수학목록');
  if (!sheet) return fallback;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return fallback;

  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const activeQuizzes = data.filter(row => {
    const active = String(row[4] || '').trim().toUpperCase();
    return ['Y', 'TRUE', '사용', '활성'].indexOf(active) !== -1;
  }).map(row => ({
    quizId: String(row[0] || '').trim(),
    title: String(row[1] || '').trim(),
    type: String(row[2] || '').trim(),
    sheetName: String(row[3] || '').trim(),
    order: parseInt(row[5], 10) || 999,
    description: String(row[6] || '').trim()
  })).filter(quiz => quiz.quizId && quiz.title).sort((a, b) => a.order - b.order);

  return activeQuizzes.length > 0 ? activeQuizzes : fallback;
}

function getSocietyQuizOptions() {
  return readSubjectQuizOptions_('사회');
}

function ensureTitleListSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('타이틀목록');
  if (sheet) return sheet;
  sheet = ss.insertSheet('타이틀목록');
  const headers = ['defKey', 'titleSource', 'subjectGroup', 'conditionTarget',
    'star1_id', 'star1_title', 'star3_id', 'star3_title', 'star5_id', 'star5_title',
    'theme', 'category', 'order', 'active'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function initTitleListSheet() {
  const sheet = ensureTitleListSheet_();
  if (sheet.getLastRow() >= 2) {
    Logger.log('타이틀목록 시트: 이미 데이터가 있습니다.');
    return;
  }
  const titleDefs = getMergedTitleTierDefinitions_();
  const rows = [];
  Object.keys(titleDefs).forEach(defKey => {
    const cfg = titleDefs[defKey];
    const t = cfg.titles || {};
    rows.push([
      defKey,
      cfg.source || '',
      cfg.subjectGroup || '',
      cfg.conditionTarget || '',
      (t[1] && t[1].id) || '',
      (t[1] && t[1].title) || '',
      (t[3] && t[3].id) || '',
      (t[3] && t[3].title) || '',
      (t[5] && t[5].id) || '',
      (t[5] && t[5].title) || '',
      cfg.theme || '',
      cfg.category || '',
      cfg.order || '',
      'Y'
    ]);
  });
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, 14).setValues(rows);
  }
  Logger.log('타이틀목록 시트 초기화 완료: ' + rows.length + '행 추가');
}

function getTitleListFromSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('타이틀목록');
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  return data
    .filter(row => String(row[13] || '').trim().toUpperCase() === 'Y')
    .map(row => ({
      defKey: String(row[0] || '').trim(),
      titleSource: String(row[1] || '').trim(),
      subjectGroup: String(row[2] || '').trim(),
      conditionTarget: String(row[3] || '').trim(),
      star1_id: String(row[4] || '').trim(),
      star1_title: String(row[5] || '').trim(),
      star3_id: String(row[6] || '').trim(),
      star3_title: String(row[7] || '').trim(),
      star5_id: String(row[8] || '').trim(),
      star5_title: String(row[9] || '').trim(),
      theme: String(row[10] || '').trim(),
      category: String(row[11] || '').trim(),
      order: parseInt(row[12]) || 999
    }))
    .filter(row => row.defKey);
}

function getMergedTitleTierDefinitions_() {
  const merged = Object.assign({}, TITLE_TIER_DEFINITIONS);
  const sheetRows = getTitleListFromSheet_();
  sheetRows.forEach(row => {
    if (merged[row.defKey]) return;
    const fieldKey = row.subjectGroup === 'korean' ? 'korean'
                   : row.subjectGroup === 'math' ? 'math'
                   : row.subjectGroup === 'social' ? 'people'
                   : row.subjectGroup;
    const titles = {};
    if (row.star1_id) titles[1] = { id: row.star1_id, title: row.star1_title };
    if (row.star3_id) titles[3] = { id: row.star3_id, title: row.star3_title };
    if (row.star5_id) titles[5] = { id: row.star5_id, title: row.star5_title };
    merged[row.defKey] = {
      source: row.titleSource,
      fieldKey: fieldKey,
      theme: row.theme || 'school',
      category: row.category,
      subjectGroup: row.subjectGroup,
      conditionTarget: row.conditionTarget,
      titles: titles,
      order: row.order
    };
  });
  return merged;
}

function getMathQuizConfig_(quizKey) {
  const quizzes = getMathQuizOptions();
  const key = String(quizKey || '').trim();
  const fallback = getMathQuizFallback_();
  if (!key) return fallback;

  if (key === 'random-basic' || key === '난수퀴즈' || key === '곱셈과 나눗셈') return fallback;
  return quizzes.find(quiz => quiz.quizId === key || quiz.title === key) || fallback;
}

function getSubjectQuizConfig_(subject, quizKey) {
  const quizzes = readSubjectQuizOptions_(subject);
  const key = String(quizKey || '').trim();
  if (!key) return null;
  return quizzes.find(quiz => quiz.quizId === key || quiz.title === key || quiz.sheetName === key) || null;
}

function shuffleMathChoices_(values) {
  const copy = values.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function createMathChoiceOptions_(answer) {
  const correct = Number(answer);
  const choices = {};
  choices[String(correct)] = true;
  const offsets = [-10, -9, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 9, 10];
  const shuffledOffsets = shuffleMathChoices_(offsets);

  shuffledOffsets.forEach(offset => {
    if (Object.keys(choices).length >= 4) return;
    const candidate = correct + offset;
    if (candidate >= 0) choices[String(candidate)] = true;
  });

  while (Object.keys(choices).length < 4) {
    const spread = Math.max(8, Math.ceil(Math.abs(correct) * 0.35) + 4);
    const candidate = correct + Math.floor(Math.random() * (spread * 2 + 1)) - spread;
    if (candidate >= 0) choices[String(candidate)] = true;
  }

  return shuffleMathChoices_(Object.keys(choices));
}

function normalizeMathMulDivDetail_(detail) {
  const text = String(detail || '').trim();
  const compact = text.toLowerCase().replace(/\s+/g, '');
  const aliases = {
    'random-basic': true,
    'math_muldiv': true,
    '난수퀴즈': true,
    '곱셈과나눗셈': true
  };
  return aliases[compact] || aliases[text] ? '곱셈과 나눗셈' : text;
}

function createMathRandomQuestion_(type, index) {
  let a;
  let b;
  let answer;
  let symbol;
  let typeLabel;
  const padded = ('000' + index).slice(-3);

  if (type === 'mul10') {
    a = 100 + Math.floor(Math.random() * 800);
    b = (1 + Math.floor(Math.random() * 9)) * 10;
    answer = a * b;
    symbol = '×';
    typeLabel = '세 자리 수 × 몇십';
  } else if (type === 'mul2digit') {
    a = 100 + Math.floor(Math.random() * 700);
    b = 11 + Math.floor(Math.random() * 79);
    answer = a * b;
    symbol = '×';
    typeLabel = '세 자리 수 × 몇십몇';
  } else if (type === 'div10') {
    b = (1 + Math.floor(Math.random() * 9)) * 10;
    answer = 2 + Math.floor(Math.random() * 48);
    a = b * answer;
    symbol = '÷';
    typeLabel = '몇십으로 나누기';
  } else {
    b = 11 + Math.floor(Math.random() * 39);
    answer = 2 + Math.floor(Math.random() * 28);
    a = b * answer;
    symbol = '÷';
    typeLabel = '몇십몇으로 나누기';
  }

  const questionText = a + ' ' + symbol + ' ' + b + ' = ?';
  const explanation = a + ' ' + symbol + ' ' + b + ' = ' + answer + '예요.';
  const id = 'math-muldiv-' + type + '-' + padded;
  const question = {
    kind: 'mathMultipleChoice',
    title: '곱셈과 나눗셈',
    type: typeLabel,
    question: questionText,
    choices: createMathChoiceOptions_(answer),
    id: id
  };

  return [question, String(answer), '', explanation, id, []];
}

function createSheetMultipleChoiceQuizData_(config) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = String(config && config.sheetName || '').trim();
  const quizId = String(config && config.quizId || '').trim();
  const title = String(config && config.title || '').trim() || '퀴즈';
  if (!sheetName) return { error: title + ' 문제 시트가 설정되어 있지 않습니다.' };

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: sheetName + ' 시트를 찾을 수 없습니다.' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: sheetName + ' 시트에 문제 데이터가 없습니다.' };

  const idPrefix = normalizeTitleAreaKeyPart_(quizId || title) || 'sheet-quiz';
  return sheet.getRange(2, 1, lastRow - 1, 9).getValues()
    .filter(row => row[1] && row[2] && row[3] && row[4] && row[5] && row[6])
    .map((row, index) => {
      const choices = [row[2], row[3], row[4], row[5]].map(value => String(value || '').trim());
      const rawAnswer = String(row[6] || '').trim();
      let correctText = '';
      const answerIndex = parseInt(rawAnswer, 10);
      if (!isNaN(answerIndex) && answerIndex >= 1 && answerIndex <= choices.length) {
        correctText = choices[answerIndex - 1] || '';
      } else {
        correctText = choices.find(choice => choice === rawAnswer) || rawAnswer;
      }

      const shuffledChoices = shuffleMathChoices_(choices);
      const rowId = String(row[0] || '').trim() || String(index + 2);
      const id = idPrefix + '-' + rowId;
      const question = {
        kind: 'sheetMultipleChoice4',
        title: title + ' 퀴즈',
        question: String(row[1] || '').trim(),
        choices: shuffledChoices,
        rawAnswer: String(shuffledChoices.indexOf(correctText) + 1),
        id: id,
        quizId: quizId,
        sheetName: sheetName
      };
      const hintText = String(row[7] || '').trim();
      const explanationText = String(row[8] || row[7] || '').trim();
      return [question, correctText, hintText, explanationText, id, []];
    })
    .filter(row => {
      const info = row[0] || {};
      return info.question && info.choices && info.choices.length === 4 && row[1];
    })
    .sort(() => Math.random() - 0.5);
}

function generateRandomMathQuizData_() {
  const rows = [];
  const groups = [
    { type: 'mul10', count: 30 },
    { type: 'mul2digit', count: 30 },
    { type: 'div10', count: 20 },
    { type: 'div2digit', count: 20 }
  ];
  let index = 1;
  groups.forEach(group => {
    for (let i = 0; i < group.count; i++) {
      rows.push(createMathRandomQuestion_(group.type, index++));
    }
  });
  return shuffleMathChoices_(rows);
}

function getQuizDataForMember(memberId, category, subFilter) {
  const access = getQuizAccessStatus(memberId, category, subFilter);
  if (access && access.success === false) return { error: access.error || '퀴즈 접근 상태를 확인하지 못했습니다.' };
  if (access && access.locked) return { locked: true, status: access };
  return {
    locked: false,
    status: access,
    data: getQuizData(category, subFilter)
  };
}

function getQuizData(category, subFilter) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  if (category === '수학') {
    const config = getMathQuizConfig_(subFilter);
    if (config && config.type === 'generated' && (config.quizId === 'random-basic' || config.title === '곱셈과 나눗셈' || config.title === '난수퀴즈')) {
      return generateRandomMathQuizData_();
    }
    return { error: '아직 준비 중인 수학 퀴즈입니다: ' + subFilter };
  }

  if (category === '단어' && subFilter === '다의어·동형이의어') {
    const wordSheet = ss.getSheetByName('단어시트');
    if (!wordSheet) return { error: '단어시트를 찾을 수 없습니다.' };
    const wordLastRow = wordSheet.getLastRow();
    if (wordLastRow < 2) return { error: '단어시트에 문제 데이터가 없습니다.' };

    return wordSheet.getRange(2, 1, wordLastRow - 1, 8).getValues().map((r, index) => {
      const word = String(r[0] || '').trim();
      const sentence1 = String(r[1] || '').trim();
      const sentence2 = String(r[2] || '').trim();
      const answer = String(r[3] || '').trim();
      const meaning1 = String(r[4] || '').trim();
      const meaning2 = String(r[5] || '').trim();
      const explanation = String(r[6] || '').trim();
      const type = String(r[7] || '').trim();
      const question = {
        kind: 'wordRelation',
        word: word,
        sentence1: sentence1,
        sentence2: sentence2,
        meaning1: meaning1,
        meaning2: meaning2,
        type: type,
        id: 'word-relation-' + (index + 2)
      };
      const hint = '뜻 1: ' + meaning1 + '\n뜻 2: ' + meaning2;
      return [question, answer, hint, explanation, question.id, []];
    }).filter(row => row[0].word && row[0].sentence1 && row[0].sentence2 && row[1]).sort(() => Math.random() - 0.5);
  }

  if (category === '독서') {
    const config = getReadingBookConfig_(subFilter);
    if (!config) return { error: '책 정보를 찾을 수 없습니다: ' + subFilter };

    const readingSheet = ss.getSheetByName(config.sheetName);
    if (!readingSheet) return { error: config.sheetName + ' 시트를 찾을 수 없습니다.' };

    const readingLastRow = readingSheet.getLastRow();
    if (readingLastRow < 2) return { error: config.sheetName + ' 시트에 문제 데이터가 없습니다.' };

    return readingSheet.getRange(2, 1, readingLastRow - 1, 9).getValues().map((r, index) => {
      const number = String(r[0] || '').trim();
      const difficulty = String(r[1] || '').trim();
      const questionText = String(r[2] || '').trim();
      const choices = [r[3], r[4], r[5], r[6]].map(value => String(value || '').trim());
      const rawAnswer = String(r[7] || '').trim();
      const answer = resolveReadingAnswerText_(rawAnswer, choices);
      const explanation = String(r[8] || '').trim();
      const rowNumber = index + 2;

      // 기존 지엠오 아이는 기존 연습기록 호환을 위해 reading-gmo- 접두사 유지
      const idPrefix = (config.quizId === 'gmo') ? 'reading-gmo-' : ('reading-' + config.quizId + '-');
      const id = idPrefix + (number || rowNumber);

      const question = {
        kind: 'readingMultipleChoice',
        title: config.title + ' 독서퀴즈',
        difficulty: difficulty,
        question: questionText,
        choices: choices,
        rawAnswer: rawAnswer,
        id: id,
        bookTitle: config.title
      };
      return [question, answer, explanation, explanation, id, []];
    }).filter(row => {
      const info = row[0] || {};
      const choices = info.choices || [];
      return info.question && choices.length === 4 && choices.every(choice => choice) && row[1] && row[3];
    }).sort(() => Math.random() - 0.5);
  }

  if (category === '사회') {
    const config = getSubjectQuizConfig_('사회', subFilter);
    if (config && config.type === 'sheet' && config.uiType === 'multipleChoice4') {
      return createSheetMultipleChoiceQuizData_(config);
    }
    return { error: '아직 준비 중인 사회 퀴즈입니다: ' + subFilter };
  }

  if (category === '인물' && subFilter === '아이돌') {
    const idolSheet = ss.getSheetByName('아이돌문제');
    if (!idolSheet) return { error: '아이돌문제 시트를 찾을 수 없습니다.' };
    const idolLastRow = idolSheet.getLastRow();
    if (idolLastRow < 2) return { error: '아이돌문제 시트에 문제 데이터가 없습니다.' };
    return idolSheet.getRange(2, 1, idolLastRow - 1, idolSheet.getLastColumn()).getValues().map(r => {
      const imgUrl = r[4]; // 아이돌 이미지는 E열에서 가져옴
      return [imgUrl ? toDisplayImageUrl(imgUrl) : "", r[1], r[2], r[3], '', parseAnswerAliases_(r[5])];
    }).sort(() => Math.random() - 0.5);
  }

  if (category === '인물' && subFilter === '애니') {
    const animeSheet = ss.getSheetByName('애니문제');
    if (!animeSheet) return { error: '애니문제 시트를 찾을 수 없습니다.' };
    const animeLastRow = animeSheet.getLastRow();
    if (animeLastRow < 2) return { error: '애니문제 시트에 문제 데이터가 없습니다.' };
    return animeSheet.getRange(2, 1, animeLastRow - 1, animeSheet.getLastColumn()).getValues().map(r => {
      const imgUrl = r[4]; // 애니 이미지는 E열에서 가져옴
      return [imgUrl ? toHistoryDisplayImageUrl(imgUrl) : "", r[1], r[2], r[3], '', parseAnswerAliases_(r[6])];
    }).sort(() => Math.random() - 0.5);
  }

  const sheet = ss.getSheetByName(category + '문제');
  if (!sheet) return { error: `${category}문제 시트를 찾을 수 없습니다.` };
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: `${category}문제 시트에 문제 데이터가 없습니다.` };

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  let filteredData = data;

  // 1. 포켓몬 세대 및 난이도 로직 복구
  if (category === '포켓몬' && subFilter) {
    const genEndPoints = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
    if (!isNaN(subFilter)) {
      const start = subFilter === 1 ? 1 : genEndPoints[subFilter - 2] + 1;
      const end = genEndPoints[subFilter - 1];
      filteredData = data.filter(r => r[0] >= start && r[0] <= end);
    } else {
      const diffMap = { '쉬움': 151, '보통': 251, '어려움': 386, '헬': 1025 };
      const limit = diffMap[subFilter] || 1025;
      filteredData = data.filter(r => r[0] <= limit);
    }
  }
  // 2. 인물 하위 카테고리 필터 (역사 인물 등)
  else if (category === '인물' && subFilter) {
    filteredData = data.filter(r => (r[5] && String(r[5]).trim() === subFilter) || subFilter === '역사 인물');
  }

  // 3. 시트별 구조 매핑 (티니핑, 맞춤법, 아재개그, 인물/포켓몬/애니 공통)
  return filteredData.map(r => {
    let q = "", a = "", h = "", d = "";
    let aliases = [];
    if (category === '티니핑') { q = r[0]; a = r[1]; }
    else if (category === '맞춤법') { q = r[0]; a = r[1]; h = r[2]; d = r[2]; } // 해설을 힌트 자리에 매핑
    else if (category === '아재개그') { q = r[0]; a = r[1]; h = r[2]; }
    else if (category === '인물') {
      a = r[1]; h = r[2]; d = r[3];
      let imgUrl = r[4]; // 역사인물 이미지는 E열에서 가져옴
      if (imgUrl) q = toHistoryDisplayImageUrl(imgUrl);
    }
    else if (category === '포켓몬') {
      a = r[1]; h = r[2]; d = r[3];
      let imgUrl = r[4]; // 포켓몬 이미지는 E열에서 가져옴
      if (imgUrl) q = toDisplayImageUrl(imgUrl);
    }
    else if (category === '애니') {
      a = r[1]; h = r[2]; d = r[3];
      let imgUrl = r[4]; // 애니 이미지는 E열에서 가져옴
      if (imgUrl) q = toHistoryDisplayImageUrl(imgUrl);
    }
    if (category === '티니핑') aliases = parseAnswerAliases_(r[3]);
    else if (category === '포켓몬') aliases = parseAnswerAliases_(r[5]);
    else if (category === '인물') aliases = parseAnswerAliases_(r[6]);
    else if (category === '애니') aliases = parseAnswerAliases_(r[6]);
    return category === '포켓몬' ? [q, a, h, d, r[0], aliases] : [q, a, h, d, '', aliases];
  }).sort(() => Math.random() - 0.5);
  }

function parseAnswerAliases_(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const seen = {};
  const aliases = [];
  text.split(/[,，、\/\n\r]+/).forEach(item => {
    const alias = String(item || '').trim();
    if (!alias || seen[alias]) return;
    seen[alias] = true;
    aliases.push(alias);
  });
  return aliases;
}

const ANSWER_ALIAS_VARIANT_MAP = {
  '캐이시': '케이시',
  '케이시': '캐이시',
  '고죠': '고조',
  '고조': '고죠'
};

const ANSWER_ALIAS_VARIANT_PAIRS = [
  ['캐이시', '케이시'],
  ['고죠', '고조']
];

const ANSWER_ALIAS_FILL_TARGETS = [
  { category: '티니핑', sheetName: '티니핑문제', answerColumn: 2, aliasColumn: 4 },
  { category: '포켓몬', sheetName: '포켓몬문제', answerColumn: 2, aliasColumn: 6 },
  { category: '인물', sheetName: '인물문제', answerColumn: 2, aliasColumn: 7 },
  { category: '애니', sheetName: '애니문제', answerColumn: 2, aliasColumn: 7 },
  { category: '아이돌', sheetName: '아이돌문제', answerColumn: 2, aliasColumn: 6 }
];

function normalizeAnswerAliasKey_(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function getAnswerAliasVariant_(answer) {
  const normalized = normalizeAnswerAliasKey_(answer);
  if (!normalized) return '';
  if (ANSWER_ALIAS_VARIANT_MAP[normalized]) return ANSWER_ALIAS_VARIANT_MAP[normalized];

  for (let i = 0; i < ANSWER_ALIAS_VARIANT_PAIRS.length; i++) {
    const from = ANSWER_ALIAS_VARIANT_PAIRS[i][0];
    const to = ANSWER_ALIAS_VARIANT_PAIRS[i][1];
    if (normalized.indexOf(from) !== -1) return normalized.replace(new RegExp(from, 'g'), to);
    if (normalized.indexOf(to) !== -1) return normalized.replace(new RegExp(to, 'g'), from);
  }
  return '';
}

/*
 * [MANUAL ADMIN TOOL]
 * 정답별칭열이 비어 있는 행에만 보수적인 외래어 표기 흔들림 별칭을 채웁니다.
 * 기본값은 dryRun=true라 실제 시트 값을 바꾸지 않습니다.
 */
function fillMissingAnswerAliasesBySpellingVariants(dryRun) {
  const isDryRun = dryRun !== false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('스프레드시트를 찾을 수 없습니다.');
    return { processed: 0, updated: 0, dryRun: isDryRun, error: '스프레드시트를 찾을 수 없습니다.' };
  }

  let processed = 0;
  let updated = 0;

  ANSWER_ALIAS_FILL_TARGETS.forEach(target => {
    const sheet = ss.getSheetByName(target.sheetName);
    if (!sheet) {
      Logger.log('[정답별칭 보완] 시트 없음: %s', target.sheetName);
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const width = Math.max(sheet.getLastColumn(), target.answerColumn, target.aliasColumn);
    const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const answer = normalizeAnswerAliasKey_(row[target.answerColumn - 1]);
      const currentAlias = String(row[target.aliasColumn - 1] || '').trim();
      if (!answer || currentAlias) return;

      const alias = getAnswerAliasVariant_(answer);
      if (!alias || alias === answer) return;

      processed++;
      Logger.log(
        '[정답별칭 보완] 카테고리=%s 행=%s 정답=%s 기록예정별칭=%s dryRun=%s',
        target.category,
        rowNumber,
        answer,
        alias,
        isDryRun
      );

      if (!isDryRun) {
        sheet.getRange(rowNumber, target.aliasColumn).setValue(alias);
      }
      updated++;
    });
  });

  Logger.log(
    '[정답별칭 보완] 완료: 대상=%s건, %s=%s건',
    processed,
    isDryRun ? '기록예정' : '실제기록',
    updated
  );

  return { processed: processed, updated: updated, dryRun: isDryRun };
}

function previewFillMissingAnswerAliasesBySpellingVariants() {
  return fillMissingAnswerAliasesBySpellingVariants(true);
}

function executeFillMissingAnswerAliasesBySpellingVariants() {
  return fillMissingAnswerAliasesBySpellingVariants(false);
}

const DATA_INTEGRITY_RECORD_TARGETS = [
  { sheetName: '연습기록', userIdColumn: 1, label: '연습기록', dateColumn: 12 },
  { sheetName: '포켓몬연습기록', userIdColumn: 1, label: '포켓몬연습기록', dateColumn: 11 },
  { sheetName: '랭킹기록', userIdColumn: 5, label: '랭킹기록', scoreColumn: 4, categoryColumn: 3, modeColumn: 11, dateColumn: 1 },
  { sheetName: MY_ROOM_SETTINGS_SHEET_NAME, userIdColumn: 1, label: MY_ROOM_SETTINGS_SHEET_NAME, dateColumn: 6 },
  { sheetName: '닉네임이력', userIdColumn: 2, label: '닉네임이력', dateColumn: 1 },
  { sheetName: '기록저장', userIdColumn: 5, label: '기록저장(구)', scoreColumn: 4, categoryColumn: 3, dateColumn: 1 }
];

const DATA_INTEGRITY_QUESTION_TARGETS = [
  { category: '티니핑', sheetName: '티니핑문제', keyColumn: 1, questionColumn: 1, answerColumn: 2, aliasColumn: 4 },
  { category: '포켓몬', sheetName: '포켓몬문제', keyColumn: 1, questionColumn: 5, answerColumn: 2, aliasColumn: 6 },
  { category: '인물', sheetName: '인물문제', keyColumn: 1, questionColumn: 5, answerColumn: 2, aliasColumn: 7 },
  { category: '애니', sheetName: '애니문제', keyColumn: 1, questionColumn: 5, answerColumn: 2, aliasColumn: 7 },
  { category: '아이돌', sheetName: '아이돌문제', keyColumn: 1, questionColumn: 5, answerColumn: 2, aliasColumn: 6 },
  { category: '맞춤법', sheetName: '맞춤법문제', keyColumn: 1, questionColumn: 1, answerColumn: 2, aliasColumn: 0 },
  { category: '아재개그', sheetName: '아재개그문제', keyColumn: 1, questionColumn: 1, answerColumn: 2, aliasColumn: 0 }
];

const DATA_INTEGRITY_DANGEROUS_ADMIN_FUNCTIONS = [
  { name: 'cleanupInvalidRankingRecordsOver600Minutes', safety: 'preview 함수 별도 존재, 삭제 전 백업 시트 생성' },
  { name: 'executeFillMissingAnswerAliasesBySpellingVariants', safety: '빈 별칭열만 기록, 기존 별칭 덮어쓰기 없음, 삭제 없음' }
];

function previewDataIntegrityStatus() {
  const report = buildDataIntegrityStatus_();
  logDataIntegrityReport_(report, false);
  return summarizeDataIntegrityReport_(report);
}

function previewDataCleanupCandidates() {
  const report = buildDataIntegrityStatus_();
  logDataIntegrityReport_(report, true);
  return summarizeDataIntegrityReport_(report);
}

const LEGACY_SHEET_CLEANUP_TARGETS = [
  {
    sheetName: '학생명단',
    category: '숨김 유지',
    appRelation: '회원정보 이관용 레거시 입력 시트 (이관 완료)',
    references: [],
    recommendation: '숨김 유지',
    deleteRisk: '회원정보 이관 재검토 시 원본 학생 데이터가 사라짐'
  },
  {
    sheetName: '랭킹기록_600분초과백업',
    category: '삭제 보류',
    appRelation: '랭킹 600분 초과 관리자 정리 백업',
    references: ['Code.js cleanupInvalidRankingRecordsOver600Minutes'],
    recommendation: '추가 확인 필요',
    deleteRisk: '랭킹 정리 복구용 백업을 잃음'
  },
  {
    sheetName: '프로필이미지',
    category: '보존',
    appRelation: '프로필 이미지 후보 검색',
    references: ['Code.js searchProfileImageCandidates'],
    recommendation: '보존',
    deleteRisk: '프로필 이미지 검색 후보 일부가 사라짐'
  },
  {
    sheetName: '회원중복점검',
    category: '삭제 보류',
    appRelation: '중복 회원 관리자 점검 결과',
    references: ['Code.js writeDuplicateMemberReport_'],
    recommendation: '추가 확인 필요',
    deleteRisk: '중복 회원 점검 결과 시트가 사라지고 다음 점검 때 다시 생성됨'
  },
  {
    sheetName: '중복회원병합미리보기',
    category: '삭제 가능',
    appRelation: '중복 회원 병합 완료 후 불필요한 시트',
    references: [],
    recommendation: '삭제 가능',
    deleteRisk: '없음 (병합 완료)'
  },
  {
    sheetName: '중복회원병합결과',
    category: '삭제 가능',
    appRelation: '중복 회원 병합 결과 기록',
    references: [],
    recommendation: '삭제 가능',
    deleteRisk: '없음 (병합 완료)'
  },
  {
    sheetName: '회원정보_병합백업_20260521_1205',
    category: '백업 보존',
    appRelation: '최근 회원정보 병합 백업',
    references: [],
    recommendation: '보존',
    deleteRisk: '최근 회원정보 복구 지점을 잃음'
  },
  {
    sheetName: '타이틀현황_백업_20260522_012523',
    category: '백업 보존',
    appRelation: '최근 타이틀현황 백업',
    references: [],
    recommendation: '보존',
    deleteRisk: '최근 타이틀현황 복구 지점을 잃음'
  }
];

function previewCleanupLegacySheetsAndTempCode() {
  return cleanupLegacySheetsAndTempCode(true);
}

function runCleanupLegacySheetsAndTempCode() {
  return cleanupLegacySheetsAndTempCode(false);
}

function cleanupLegacySheetsAndTempCode(preview) {
  const isPreview = preview !== false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, preview: isPreview, message: '스프레드시트를 찾을 수 없습니다.' };

  const deletionTargets = [];
  const deferredTargets = [];
  LEGACY_SHEET_CLEANUP_TARGETS.forEach(target => {
    const sheet = ss.getSheetByName(target.sheetName);
    const exists = !!sheet;
    const hasCodeReference = target.references.length > 0;
    const keepByPolicy = target.recommendation !== '삭제';
    const item = Object.assign({}, target, {
      exists: exists,
      codeReferenced: hasCodeReference,
      referenceText: hasCodeReference ? target.references.join(', ') : '코드 참조 없음'
    });
    if (exists && !hasCodeReference && !keepByPolicy) deletionTargets.push(item);
    else deferredTargets.push(item);
  });

  Logger.log('[CLEANUP %s]', isPreview ? 'PREVIEW' : 'RUN');
  Logger.log('삭제 후보:');
  if (!deletionTargets.length) Logger.log('- 없음: 현재 감사 대상은 코드 참조 또는 보존 정책으로 삭제 보류');
  deletionTargets.forEach(item => Logger.log('- %s: %s, %s', item.sheetName, item.referenceText, item.appRelation));
  Logger.log('삭제 보류:');
  deferredTargets.forEach(item => Logger.log('- %s: %s / 권장=%s / 존재=%s / 위험=%s',
    item.sheetName, item.referenceText, item.recommendation, item.exists, item.deleteRisk));
  Logger.log('추가 보존: %s: 신규 저장 대상은 아니지만 legacy 호환/fallback 정리 전까지 보존',
    POKEMON_PRACTICE_RECORD_SHEET_NAME);
  Logger.log('실제 반영 여부: preview=%s', isPreview);

  const deletedSheets = [];
  if (!isPreview) {
    deletionTargets.forEach(item => {
      const sheet = ss.getSheetByName(item.sheetName);
      if (!sheet) return;
      Logger.log('삭제 직전 확인: %s / %s', item.sheetName, item.referenceText);
      ss.deleteSheet(sheet);
      deletedSheets.push(item.sheetName);
      Logger.log('실제 삭제: %s', item.sheetName);
    });
  }

  return {
    success: true,
    preview: isPreview,
    deletionTargets: deletionTargets.map(item => item.sheetName),
    deferredTargets: deferredTargets.map(item => item.sheetName),
    deletedSheets: deletedSheets
  };
}

function buildDataIntegrityStatus_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = {
    checkedAt: new Date(),
    errors: [],
    members: {
      totalRows: 0,
      memberIds: {},
      duplicateGroups: [],
      missingRequired: [],
      invalidIdentity: [],
      invalidProfileImages: []
    },
    records: {
      totalRows: 0,
      orphanRecords: [],
      invalidRows: [],
      duplicateCandidates: []
    },
    rankings: {
      totalRows: 0,
      orphanRecords: [],
      invalidRows: [],
      duplicateCandidates: []
    },
    questions: {
      totalRows: 0,
      missingRequired: [],
      aliasIssues: [],
      duplicateKeys: []
    },
    aliasAdmin: getAliasAdminSafetyStatus_(),
    dangerousAdminFunctions: DATA_INTEGRITY_DANGEROUS_ADMIN_FUNCTIONS
  };

  if (!ss) {
    report.errors.push('스프레드시트를 찾을 수 없습니다.');
    return report;
  }

  inspectMemberDataForIntegrity_(ss, report);
  inspectRecordDataForIntegrity_(ss, report);
  inspectQuestionDataForIntegrity_(ss, report);
  return report;
}

function inspectMemberDataForIntegrity_(ss, report) {
  const sheet = ss.getSheetByName('회원정보');
  if (!sheet) {
    report.errors.push('회원정보 시트를 찾을 수 없습니다.');
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const width = Math.max(sheet.getLastColumn(), MEMBER_SCHOOL_COLUMN);
  const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  const groups = {};
  report.members.totalRows = rows.length;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const member = memberRowToObject_(row);
    const password = String(row[8] || '').trim();
    const school = member.school;
    const grade = member.grade;
    const classNo = member.classNo;
    const number = String(Number(member.number || '')).trim();
    const identityKey = [school, grade, classNo, number].join('|');

    if (member.userId) report.members.memberIds[member.userId] = true;
    if (!groups[identityKey]) groups[identityKey] = [];
    groups[identityKey].push({
      rowNumber: rowNumber,
      school: school,
      grade: grade,
      classNo: classNo,
      number: number,
      userId: member.userId,
      nickname: member.nickname,
      createdAt: row[6],
      updatedAt: row[7]
    });

    const missing = [];
    if (!member.userId) missing.push('userId');
    if (!grade) missing.push('학년');
    if (!classNo) missing.push('반');
    if (!String(member.number || '').trim()) missing.push('번호');
    if (!member.nickname) missing.push('닉네임');
    if (!password) missing.push('비밀번호');
    if (missing.length) {
      report.members.missingRequired.push({
        rowNumber: rowNumber,
        userId: member.userId,
        nickname: member.nickname,
        missing: missing.join(', ')
      });
    }

    if (!isPositiveIntegerText_(grade) || !isPositiveIntegerText_(classNo) || !isPositiveIntegerText_(member.number)) {
      report.members.invalidIdentity.push({
        rowNumber: rowNumber,
        userId: member.userId,
        grade: grade,
        classNo: classNo,
        number: member.number,
        note: '학년/반/번호가 숫자로 해석되지 않음'
      });
    }

    const profileImageUrl = member.profileImageUrl;
    if (profileImageUrl && !isLikelyValidProfileImageValue_(profileImageUrl)) {
      report.members.invalidProfileImages.push({
        rowNumber: rowNumber,
        userId: member.userId,
        profileImageUrl: profileImageUrl
      });
    }
  });

  const usageMap = getMemberUsageMap_();
  Object.keys(groups).forEach(key => {
    const group = groups[key];
    if (group.length < 2) return;
    report.members.duplicateGroups.push({
      key: key,
      rows: group.map(item => Object.assign({}, item, {
        used: !!(usageMap[item.userId] && usageMap[item.userId].length),
        usagePlaces: usageMap[item.userId] || []
      }))
    });
  });
}

function inspectRecordDataForIntegrity_(ss, report) {
  const memberIds = report.members.memberIds || {};
  DATA_INTEGRITY_RECORD_TARGETS.forEach(target => {
    const sheet = ss.getSheetByName(target.sheetName);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const width = Math.max(sheet.getLastColumn(), target.userIdColumn, target.scoreColumn || 1, target.categoryColumn || 1, target.modeColumn || 1, target.dateColumn || 1);
    const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
    const duplicateMap = {};
    if (target.sheetName === '랭킹기록') report.rankings.totalRows += rows.length;
    else report.records.totalRows += rows.length;

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const userId = String(row[target.userIdColumn - 1] || '').trim();
      const dateValue = target.dateColumn ? row[target.dateColumn - 1] : '';
      const scoreValue = target.scoreColumn ? row[target.scoreColumn - 1] : '';
      const categoryValue = target.categoryColumn ? String(row[target.categoryColumn - 1] || '').trim() : '';
      const modeValue = target.modeColumn ? String(row[target.modeColumn - 1] || '').trim() : '';
      const invalidNotes = [];

      if (userId && !memberIds[userId]) {
        const item = { sheetName: target.sheetName, rowNumber: rowNumber, userId: userId, category: categoryValue, mode: modeValue };
        if (target.sheetName === '랭킹기록') report.rankings.orphanRecords.push(item);
        else report.records.orphanRecords.push(item);
      }

      if (!userId && target.userIdColumn) invalidNotes.push('userId 비어 있음');
      if (target.scoreColumn && scoreValue !== '' && scoreValue !== null && isNaN(Number(scoreValue))) invalidNotes.push('점수 숫자 아님');
      if (target.categoryColumn && !categoryValue) invalidNotes.push('카테고리/영역 비어 있음');
      if (target.sheetName === '랭킹기록' && target.modeColumn && !modeValue) invalidNotes.push('랭킹모드 비어 있음');
      if (target.dateColumn && dateValue && !isValidDateLike_(dateValue)) invalidNotes.push('날짜값 검토 필요');

      if (invalidNotes.length) {
        const item = { sheetName: target.sheetName, rowNumber: rowNumber, userId: userId, issue: invalidNotes.join(', ') };
        if (target.sheetName === '랭킹기록') report.rankings.invalidRows.push(item);
        else report.records.invalidRows.push(item);
      }

      const duplicateKey = [target.sheetName, userId, categoryValue, modeValue].join('|');
      if (!duplicateMap[duplicateKey]) duplicateMap[duplicateKey] = [];
      duplicateMap[duplicateKey].push(rowNumber);
    });

    Object.keys(duplicateMap).forEach(key => {
      const rowNumbers = duplicateMap[key];
      if (rowNumbers.length < 5) return;
      const item = {
        sheetName: target.sheetName,
        key: key,
        count: rowNumbers.length,
        sampleRows: rowNumbers.slice(0, 10),
        note: '누적형 기록일 수 있으므로 검토 후보로만 표시'
      };
      if (target.sheetName === '랭킹기록') report.rankings.duplicateCandidates.push(item);
      else report.records.duplicateCandidates.push(item);
    });
  });
}

function inspectQuestionDataForIntegrity_(ss, report) {
  DATA_INTEGRITY_QUESTION_TARGETS.forEach(target => {
    const sheet = ss.getSheetByName(target.sheetName);
    if (!sheet) {
      report.questions.missingRequired.push({
        sheetName: target.sheetName,
        rowNumber: '',
        issue: '시트 없음'
      });
      return;
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const width = Math.max(sheet.getLastColumn(), target.keyColumn, target.questionColumn, target.answerColumn, target.aliasColumn || 1);
    const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
    const keyMap = {};
    report.questions.totalRows += rows.length;

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const key = String(row[target.keyColumn - 1] || '').trim();
      const question = String(row[target.questionColumn - 1] || '').trim();
      const answer = String(row[target.answerColumn - 1] || '').trim();
      const alias = target.aliasColumn ? String(row[target.aliasColumn - 1] || '').trim() : '';
      const missing = [];

      if (!question) missing.push('문제/이미지');
      if (!answer) missing.push('정답');
      if (!answer && alias) missing.push('정답 없음 + 별칭만 있음');
      if (missing.length) {
        report.questions.missingRequired.push({
          sheetName: target.sheetName,
          category: target.category,
          rowNumber: rowNumber,
          key: key,
          issue: missing.join(', ')
        });
      }

      if (target.aliasColumn && alias && isSuspiciousAnswerAlias_(alias)) {
        report.questions.aliasIssues.push({
          sheetName: target.sheetName,
          category: target.category,
          rowNumber: rowNumber,
          answer: answer,
          alias: alias,
          issue: '별칭 길이/구분자/줄바꿈 검토 필요'
        });
      }

      if (key) {
        const duplicateKey = target.sheetName + '|' + key;
        if (!keyMap[duplicateKey]) keyMap[duplicateKey] = [];
        keyMap[duplicateKey].push(rowNumber);
      }
    });

    Object.keys(keyMap).forEach(key => {
      const rowNumbers = keyMap[key];
      if (rowNumbers.length < 2) return;
      report.questions.duplicateKeys.push({
        sheetName: target.sheetName,
        key: key.split('|').slice(1).join('|'),
        rows: rowNumbers
      });
    });
  });
}

function getAliasAdminSafetyStatus_() {
  return {
    previewFunction: 'previewFillMissingAnswerAliasesBySpellingVariants',
    executeFunction: 'executeFillMissingAnswerAliasesBySpellingVariants',
    dryRunDefault: 'fillMissingAnswerAliasesBySpellingVariants(dryRun)에서 dryRun !== false이면 미리보기',
    overwriteProtection: 'currentAlias가 있으면 return하여 덮어쓰지 않음',
    excludedCategories: '맞춤법, 아재개그는 ANSWER_ALIAS_FILL_TARGETS에 없음',
    targetCategories: ANSWER_ALIAS_FILL_TARGETS.map(item => item.category).join(', ')
  };
}

function logDataIntegrityReport_(report, cleanupOnly) {
  const prefix = cleanupOnly ? 'DATA CLEANUP CANDIDATES' : 'DATA CHECK SUMMARY';
  Logger.log('[%s]', prefix);
  Logger.log('Checked at: %s', report.checkedAt);
  report.errors.forEach(error => Logger.log('ERROR: %s', error));
  Logger.log('Members: total=%s duplicateKeys=%s missingRequired=%s invalidIdentity=%s invalidProfileImage=%s',
    report.members.totalRows,
    report.members.duplicateGroups.length,
    report.members.missingRequired.length,
    report.members.invalidIdentity.length,
    report.members.invalidProfileImages.length
  );
  Logger.log('Records: total=%s orphanCandidates=%s invalidCandidates=%s duplicateReviewCandidates=%s',
    report.records.totalRows,
    report.records.orphanRecords.length,
    report.records.invalidRows.length,
    report.records.duplicateCandidates.length
  );
  Logger.log('Rankings: total=%s orphanCandidates=%s invalidCandidates=%s duplicateReviewCandidates=%s',
    report.rankings.totalRows,
    report.rankings.orphanRecords.length,
    report.rankings.invalidRows.length,
    report.rankings.duplicateCandidates.length
  );
  Logger.log('Questions: total=%s missingQuestionOrAnswer=%s aliasReviewCandidates=%s duplicateKeys=%s',
    report.questions.totalRows,
    report.questions.missingRequired.length,
    report.questions.aliasIssues.length,
    report.questions.duplicateKeys.length
  );
  Logger.log('Alias admin: preview=%s execute=%s safety=%s / %s / 제외=%s',
    report.aliasAdmin.previewFunction,
    report.aliasAdmin.executeFunction,
    report.aliasAdmin.dryRunDefault,
    report.aliasAdmin.overwriteProtection,
    report.aliasAdmin.excludedCategories
  );
  Logger.log('Dangerous admin functions checked: %s', report.dangerousAdminFunctions.length);

  Logger.log('[DETAILS]');
  logDetailItems_('중복 회원 검토 후보', report.members.duplicateGroups, item => {
    const rows = item.rows.map(row => Utilities.formatString('row=%s userId=%s nick=%s used=%s places=%s', row.rowNumber, row.userId, row.nickname, row.used, row.usagePlaces.join('/'))).join(' | ');
    return Utilities.formatString('key=%s :: %s', item.key, rows);
  });
  logDetailItems_('회원 필수값 누락 후보', report.members.missingRequired, item => Utilities.formatString('row=%s userId=%s nick=%s missing=%s', item.rowNumber, item.userId, item.nickname, item.missing));
  logDetailItems_('회원 학년/반/번호 형식 검토 후보', report.members.invalidIdentity, item => Utilities.formatString('row=%s userId=%s grade=%s class=%s number=%s', item.rowNumber, item.userId, item.grade, item.classNo, item.number));
  logDetailItems_('프로필 이미지 문자열 검토 후보', report.members.invalidProfileImages, item => Utilities.formatString('row=%s userId=%s value=%s', item.rowNumber, item.userId, item.profileImageUrl));
  logDetailItems_('회원 없는 기록 검토 후보', report.records.orphanRecords.concat(report.rankings.orphanRecords), item => Utilities.formatString('sheet=%s row=%s userId=%s category=%s mode=%s', item.sheetName, item.rowNumber, item.userId, item.category || '', item.mode || ''));
  logDetailItems_('기록/랭킹 이상 검토 후보', report.records.invalidRows.concat(report.rankings.invalidRows), item => Utilities.formatString('sheet=%s row=%s userId=%s issue=%s', item.sheetName, item.rowNumber, item.userId, item.issue));
  logDetailItems_('기록/랭킹 중복 과다 검토 후보', report.records.duplicateCandidates.concat(report.rankings.duplicateCandidates), item => Utilities.formatString('sheet=%s count=%s sampleRows=%s note=%s', item.sheetName, item.count, item.sampleRows.join(','), item.note));
  logDetailItems_('문제/정답 누락 검토 후보', report.questions.missingRequired, item => Utilities.formatString('sheet=%s row=%s key=%s issue=%s', item.sheetName, item.rowNumber, item.key || '', item.issue));
  logDetailItems_('정답별칭 검토 후보', report.questions.aliasIssues, item => Utilities.formatString('sheet=%s row=%s answer=%s alias=%s issue=%s', item.sheetName, item.rowNumber, item.answer, item.alias, item.issue));
  logDetailItems_('문제 키 중복 검토 후보', report.questions.duplicateKeys, item => Utilities.formatString('sheet=%s key=%s rows=%s', item.sheetName, item.key, item.rows.join(',')));
  logDetailItems_('위험 관리자 함수 안전장치', report.dangerousAdminFunctions, item => Utilities.formatString('%s: %s', item.name, item.safety), 20);

  Logger.log('[ADMIN RUN ORDER]');
  Logger.log('1. previewDataIntegrityStatus() 실행');
  Logger.log('2. previewDataCleanupCandidates() 실행');
  Logger.log('3. Logger.log 상세 검토');
  Logger.log('4. 실제 cleanup/execute 함수는 필요한 항목만 개별 실행');
  Logger.log('5. 실제 삭제/병합 전에는 반드시 관련 시트를 백업');
}

function logDetailItems_(title, items, formatter, limit) {
  const max = limit || 30;
  Logger.log('[%s] count=%s', title, items.length);
  items.slice(0, max).forEach(item => Logger.log('- %s', formatter(item)));
  if (items.length > max) Logger.log('- ... 외 %s건', items.length - max);
}

function summarizeDataIntegrityReport_(report) {
  return {
    ok: !report.errors.length,
    checkedAt: report.checkedAt,
    errors: report.errors,
    members: {
      totalRows: report.members.totalRows,
      duplicateKeys: report.members.duplicateGroups.length,
      missingRequired: report.members.missingRequired.length,
      invalidIdentity: report.members.invalidIdentity.length,
      invalidProfileImages: report.members.invalidProfileImages.length
    },
    records: {
      totalRows: report.records.totalRows,
      orphanCandidates: report.records.orphanRecords.length,
      invalidCandidates: report.records.invalidRows.length,
      duplicateReviewCandidates: report.records.duplicateCandidates.length
    },
    rankings: {
      totalRows: report.rankings.totalRows,
      orphanCandidates: report.rankings.orphanRecords.length,
      invalidCandidates: report.rankings.invalidRows.length,
      duplicateReviewCandidates: report.rankings.duplicateCandidates.length
    },
    questions: {
      totalRows: report.questions.totalRows,
      missingQuestionOrAnswer: report.questions.missingRequired.length,
      aliasReviewCandidates: report.questions.aliasIssues.length,
      duplicateKeys: report.questions.duplicateKeys.length
    },
    dangerousAdminFunctionsChecked: report.dangerousAdminFunctions.length
  };
}

function isPositiveIntegerText_(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  return /^\d+$/.test(text) && Number(text) > 0;
}

function isValidDateLike_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return true;
  const text = String(value || '').trim();
  if (!text) return true;
  const date = new Date(text);
  return !isNaN(date.getTime());
}

function isLikelyValidProfileImageValue_(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  return /^https?:\/\//i.test(text) || /^[A-Za-z0-9_-]{20,}$/.test(text);
}

function isSuspiciousAnswerAlias_(alias) {
  const text = String(alias || '');
  if (!text) return false;
  if (text.length > 30) return true;
  return /[\n\r;；|]/.test(text);
}

function getPokemonRankingQuizData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  const sheet = ss.getSheetByName('포켓몬문제');
  if (!sheet) return { error: '포켓몬문제 시트를 찾을 수 없습니다.' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: '포켓몬문제 시트에 문제 데이터가 없습니다.' };

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const difficulties = {
    '쉬움': 151,
    '보통': 251,
    '어려움': 386,
    '헬': 1025
  };
  const result = {};

  Object.keys(difficulties).forEach(difficulty => {
    const limit = difficulties[difficulty];
    result[difficulty] = data
      .filter(r => r[0] <= limit)
      .map(r => {
        const imgUrl = r[4];
        return [
          imgUrl ? toDisplayImageUrl(imgUrl) : "",
          r[1],
          r[2],
          r[3],
          r[0],
          parseAnswerAliases_(r[5])
        ];
      });
  });

  return result;
}

function getPokemonPracticeQuizData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  const sheet = ss.getSheetByName('포켓몬문제');
  if (!sheet) return { error: '포켓몬문제 시트를 찾을 수 없습니다.' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: '포켓몬문제 시트에 문제 데이터가 없습니다.' };

  const genEndPoints = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
  const result = {};
  for (let gen = 1; gen <= 9; gen++) result[String(gen)] = [];

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  data.forEach(r => {
    const no = Number(r[0]);
    if (!no) return;

    for (let i = 0; i < genEndPoints.length; i++) {
      const start = i === 0 ? 1 : genEndPoints[i - 1] + 1;
      const end = genEndPoints[i];
      if (no >= start && no <= end) {
        const imgUrl = r[4];
        result[String(i + 1)].push([
          imgUrl ? toDisplayImageUrl(imgUrl) : "",
          r[1],
          r[2],
          r[3],
          no,
          parseAnswerAliases_(r[5])
        ]);
        return;
      }
    }
  });

  return result;
}

function getPersonQuizDataBundle() {
  const result = {};
  ['역사 인물', '아이돌', '애니'].forEach(type => {
    result[type] = getQuizData('인물', type);
  });
  return result;
}

function getPokemonGenerationTotals_() {
  const totals = {};
  for (let gen = 1; gen <= 9; gen++) totals[String(gen)] = 0;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return totals;

  const sheet = ss.getSheetByName('포켓몬문제');
  if (!sheet) return totals;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return totals;

  const genEndPoints = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  values.forEach(row => {
    const no = Number(row[0]);
    if (!no) return;
    for (let i = 0; i < genEndPoints.length; i++) {
      const start = i === 0 ? 1 : genEndPoints[i - 1] + 1;
      const end = genEndPoints[i];
      if (no >= start && no <= end) {
        totals[String(i + 1)]++;
        return;
      }
    }
  });

  return totals;
}

function ensurePokemonPracticeRecordSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  let sheet = ss.getSheetByName(POKEMON_PRACTICE_RECORD_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(POKEMON_PRACTICE_RECORD_SHEET_NAME);

  const headers = ['userId', '학년', '반', '번호', '닉네임', '세대', '획득여부', '획득일시', '맞힌개수', '전체개수', '최고성취일시', '맞힌목록'];
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = headers.some((header, index) => String(currentHeaders[index] || '').trim() !== header);
  if (needsHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, POKEMON_PRACTICE_MATCHED_LIST_COLUMN, Math.max(1, sheet.getMaxRows()), 1).setNumberFormat('@');

  return { sheet };
}

function normalizePokemonPracticeId_(value) {
  const id = String(value || '').trim();
  const legacyMatch = id.match(/^legacy:(\d+)$/i);
  return legacyMatch ? `LEGACY_UNKNOWN_${legacyMatch[1]}` : id;
}

function parsePokemonPracticeCorrectList_(value) {
  return String(value || '')
    .split(',')
    .map(normalizePokemonPracticeId_)
    .filter(Boolean);
}

function uniquePokemonPracticeIds_(values) {
  const seen = {};
  const result = [];
  (values || []).forEach(value => {
    const id = normalizePokemonPracticeId_(value);
    if (!id || seen[id]) return;
    seen[id] = true;
    result.push(id);
  });
  return result;
}

function getLegacyPokemonPracticeIds_(count) {
  const total = Number(count) || 0;
  const result = [];
  for (let i = 1; i <= total; i++) result.push(`LEGACY_UNKNOWN_${i}`);
  return result;
}

function savePokemonPracticeProgress(userInfo, generation, correctCount, totalCount, correctIds) {
  const member = userInfo || {};
  const userId = String(member.userId || '').trim();
  const gen = String(Number(generation));
  const total = Number(totalCount);
  const playCorrectIds = uniquePokemonPracticeIds_(correctIds || []);
  if (!userId || !gen || gen === 'NaN' || Number(gen) < 1 || Number(gen) > 9 || isNaN(total) || total <= 0) {
    return { saved: false, message: '포켓몬 연습 기록 저장에 필요한 값이 올바르지 않습니다.' };
  }

  const generationLabel = `${gen}세대`;
  const unifiedProgress = savePracticeProgress(member, '포켓몬', generationLabel, playCorrectIds, total);
  if (!unifiedProgress || unifiedProgress.saved === false) {
    return { saved: false, message: (unifiedProgress && unifiedProgress.message) || '포켓몬 연습 별 기록을 저장하지 못했습니다.' };
  }

  return {
    saved: true,
    earned: (Number(unifiedProgress.starCount) || 0) > 0,
    newlyEarned: !!unifiedProgress.completed,
    generation: generationLabel,
    addedCount: 0,
    correctCount: unifiedProgress.correctCount || 0,
    totalCount: unifiedProgress.totalCount || total,
    starCount: unifiedProgress.starCount || 0
  };
}

// [RECENT LEGACY ADMIN TOOL] 2026-05 Pokemon practice reset. Keep preview-first while reset verification is recent.
function previewResetPokemonPracticeData() {
  return resetPokemonPracticeData(true);
}

function runResetPokemonPracticeData() {
  return resetPokemonPracticeData(false);
}

function isPokemonGenerationLabel_(value) {
  return /^([1-9])세대$/.test(String(value || '').trim());
}

function isRankingPracticeMode_(value) {
  const mode = String(value || '').trim().toLowerCase();
  return mode.indexOf('ranking') !== -1 || mode.indexOf('랭킹') !== -1;
}

function isPokemonPracticeRecordResetTarget_(row) {
  const area = String((row || [])[5] || '').trim();
  const detail = String((row || [])[6] || '').trim();
  const mode = String((row || [])[14] || '').trim().toLowerCase();
  if (isRankingPracticeMode_(mode)) return false;
  if (mode && mode !== 'practice' && mode !== '연습') return false;
  return area === '포켓몬' || isPokemonGenerationLabel_(detail);
}

function isPokemonPracticeTitleStatusResetTarget_(row) {
  const id = String((row || [])[1] || '').trim();
  const theme = String((row || [])[3] || '').trim();
  const sourceType = String((row || [])[6] || '').trim();
  const sourceCategory = String((row || [])[7] || '').trim();
  const sourceGroup = String((row || [])[8] || '').trim();
  if (sourceType && sourceType !== 'practiceStars') return false;
  return sourceCategory === '포켓몬' ||
    theme === 'pokemon' ||
    id.indexOf('pokemon_gen') === 0 ||
    isPokemonGenerationLabel_(sourceGroup);
}

function hasPokemonPracticeBadgeState_(row) {
  const source = row || [];
  return (Number(source[7]) || 0) > 0 ||
    (Number(source[10]) || 0) > 0 ||
    !!String(source[9] || '').trim();
}

function resetPokemonPracticeData(preview) {
  const isPreview = preview !== false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, preview: isPreview, message: '스프레드시트를 찾을 수 없습니다.' };

  const practiceSheet = ss.getSheetByName(PRACTICE_RECORD_SHEET_NAME);
  const practiceTargets = [];
  if (practiceSheet && practiceSheet.getLastRow() >= 2) {
    const rows = practiceSheet
      .getRange(2, 1, practiceSheet.getLastRow() - 1, Math.max(PRACTICE_RECORD_HEADERS.length, practiceSheet.getLastColumn()))
      .getValues();
    rows.forEach((row, index) => {
      if (!isPokemonPracticeRecordResetTarget_(row)) return;
      practiceTargets.push({ rowNumber: index + 2, values: row });
    });
  }

  const pokemonPracticeSheet = ss.getSheetByName(POKEMON_PRACTICE_RECORD_SHEET_NAME);
  const pokemonPracticeRowCount = pokemonPracticeSheet ? Math.max(0, pokemonPracticeSheet.getLastRow() - 1) : 0;

  const titleSheet = ss.getSheetByName(TITLE_STATUS_SHEET_NAME);
  const titleTargets = [];
  if (titleSheet && titleSheet.getLastRow() >= 2) {
    const rows = titleSheet.getRange(2, 1, titleSheet.getLastRow() - 1, TITLE_STATUS_HEADERS.length).getValues();
    rows.forEach((row, index) => {
      if (!isPokemonPracticeTitleStatusResetTarget_(row)) return;
      titleTargets.push({ rowNumber: index + 2, values: row });
    });
  }

  // Practice badges are derived from practice progress rows. No ranking badge source is changed here.
  const practiceBadgeStateCount = practiceTargets.filter(target => hasPokemonPracticeBadgeState_(target.values)).length;
  const pokemonBadgeStateCount = pokemonPracticeRowCount;
  const sampleTargets = practiceTargets.slice(0, 5).map(target => ({
    sheet: PRACTICE_RECORD_SHEET_NAME,
    row: target.rowNumber,
    userId: String(target.values[0] || '').trim(),
    category: String(target.values[5] || '').trim(),
    generation: String(target.values[6] || '').trim(),
    mode: String(target.values[14] || '').trim() || '(legacy blank)'
  }));

  Logger.log('[RESET POKEMON PRACTICE %s]', isPreview ? 'PREVIEW' : 'RUN');
  Logger.log('- 연습기록 시트 포켓몬 연습 삭제 대상 행 수: %s', practiceTargets.length);
  Logger.log('- 포켓몬연습기록 시트 초기화 대상 행 수: %s', pokemonPracticeRowCount);
  Logger.log('- 포켓몬 관련 배지 초기화 대상 수: %s', practiceBadgeStateCount + pokemonBadgeStateCount);
  Logger.log('- 포켓몬 관련 타이틀 초기화 대상 수: %s', titleTargets.length);
  Logger.log('- 보존되는 랭킹 기록 수 또는 “랭킹 시트 미수정” 표시: 랭킹 시트 미수정');
  Logger.log('- 샘플 삭제 대상 5건: %s', JSON.stringify(sampleTargets));
  Logger.log('- 실제 반영 여부: preview=%s', isPreview);
  Logger.log('- 보존 대상: 회원정보, 프로필, 랭킹/랭킹전 기록, 포켓몬 외 연습기록, 일반 앱 설정');

  if (!isPreview) {
    practiceTargets
      .map(target => target.rowNumber)
      .sort((a, b) => b - a)
      .forEach(rowNumber => practiceSheet.deleteRow(rowNumber));

    if (pokemonPracticeSheet && pokemonPracticeRowCount) {
      pokemonPracticeSheet.getRange(2, 1, pokemonPracticeRowCount, Math.max(POKEMON_PRACTICE_MATCHED_LIST_COLUMN, pokemonPracticeSheet.getLastColumn())).clearContent();
      pokemonPracticeSheet
        .getRange(1, POKEMON_PRACTICE_MATCHED_LIST_COLUMN, Math.max(1, pokemonPracticeSheet.getMaxRows()), 1)
        .setNumberFormat('@');
    }

    titleTargets
      .map(target => target.rowNumber)
      .sort((a, b) => b - a)
      .forEach(rowNumber => titleSheet.deleteRow(rowNumber));
  }

  return {
    success: true,
    preview: isPreview,
    practiceRows: practiceTargets.length,
    pokemonPracticeRows: pokemonPracticeRowCount,
    pokemonBadgeStates: practiceBadgeStateCount + pokemonBadgeStateCount,
    pokemonTitleRows: titleTargets.length,
    rankingSheetModified: false,
    samples: sampleTargets
  };
}

function ensurePracticeRecordSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  let sheet = ss.getSheetByName(PRACTICE_RECORD_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(PRACTICE_RECORD_SHEET_NAME);

  const currentHeaders = sheet.getRange(1, 1, 1, PRACTICE_RECORD_HEADERS.length).getValues()[0];
  const needsHeader = PRACTICE_RECORD_HEADERS.some((header, index) => String(currentHeaders[index] || '').trim() !== header);
  if (needsHeader) sheet.getRange(1, 1, 1, PRACTICE_RECORD_HEADERS.length).setValues([PRACTICE_RECORD_HEADERS]);
  sheet.getRange(1, PRACTICE_MATCHED_LIST_COLUMN, Math.max(1, sheet.getMaxRows()), 1).setNumberFormat('@');

  return { sheet };
}

function writePracticeRecordRow_(sheet, rowNumber, row) {
  const nextRow = (row || []).slice(0, PRACTICE_RECORD_HEADERS.length);
  while (nextRow.length < PRACTICE_RECORD_HEADERS.length) nextRow.push('');
  nextRow[PRACTICE_MATCHED_LIST_COLUMN - 1] = String(nextRow[PRACTICE_MATCHED_LIST_COLUMN - 1] || '');

  sheet.getRange(rowNumber, PRACTICE_MATCHED_LIST_COLUMN).setNumberFormat('@');
  sheet.getRange(rowNumber, 1, 1, PRACTICE_RECORD_HEADERS.length).setValues([nextRow]);
  sheet.getRange(rowNumber, PRACTICE_MATCHED_LIST_COLUMN)
    .setNumberFormat('@')
    .setValue(String(nextRow[PRACTICE_MATCHED_LIST_COLUMN - 1]));
}

function savePracticeProgress(userInfo, area, detail, correctIds, totalCount) {
  const member = userInfo || {};
  const userId = String(member.userId || '').trim();
  const targetArea = String(area || '').trim();
  const targetDetail = String(detail || '전체').trim();
  const total = Number(totalCount);
  const playCorrectIds = uniquePokemonPracticeIds_(correctIds || []);
  if (!userId || !targetArea || !targetDetail || isNaN(total) || total <= 0) {
    return { saved: false, message: '연습 기록 저장에 필요한 값이 올바르지 않습니다.' };
  }

  const sheetResult = ensurePracticeRecordSheet();
  if (sheetResult.error) return { saved: false, message: sheetResult.error };

  const sheet = sheetResult.sheet;
  const lastRow = sheet.getLastRow();
  const now = new Date();
  let rowNumber = null;
  let existing = null;

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, PRACTICE_RECORD_HEADERS.length).getValues();
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0] || '').trim() === userId &&
          String(values[i][5] || '').trim() === targetArea &&
          String(values[i][6] || '').trim() === targetDetail) {
        rowNumber = i + 2;
        existing = values[i];
        break;
      }
    }
  }

  const existingIds = existing ? uniquePokemonPracticeIds_(parsePokemonPracticeCorrectList_(existing[9])) : [];
  const baseIds = existingIds.length ? existingIds : getLegacyPokemonPracticeIds_(existing ? Number(existing[7]) || 0 : 0);
  const mergedIds = uniquePokemonPracticeIds_(baseIds.concat(playCorrectIds));
  let starCount = existing ? Number(existing[10]) || 0 : 0;
  let nextIds = mergedIds;
  let nextCorrect = mergedIds.length;
  const completed = nextCorrect >= total;
  const metaMap = getSubjectQuizMetaMap_();
  const subjectAreas = ['국어', '수학', '사회'];
  let quizMeta = null;
  if (subjectAreas.indexOf(targetArea) !== -1) {
    const normalizedDetail = targetArea === '국어'
      ? (normalizeReadingGmoPracticeDetail_(targetDetail) || targetDetail)
      : targetDetail;
    quizMeta = metaMap[targetArea + ':' + targetDetail] ||
               metaMap[targetArea + ':' + normalizedDetail] || null;
  }
  const isCompletionType = quizMeta
    ? quizMeta.completionType === 'complete'
    : (targetArea === '국어' && normalizeReadingGmoPracticeDetail_(targetDetail) === '독서:지엠오 아이');
  let firstCompleteAt = existing ? existing[12] : '';
  let lastCompleteAt = existing ? existing[13] : '';

  if (completed) {
    if (isCompletionType) {
      starCount = Math.max(starCount, 1);
      nextIds = [];
      nextCorrect = total;
    } else {
      starCount++;
      nextIds = [];
      nextCorrect = 0;
    }
    if (!firstCompleteAt) firstCompleteAt = now;
    lastCompleteAt = now;
  }

  const nextRow = [
    userId,
    member.grade || (existing && existing[1]) || '',
    member.classNo || (existing && existing[2]) || '',
    member.number || (existing && existing[3]) || '',
    member.nickname || (existing && existing[4]) || '',
    targetArea,
    targetDetail,
    nextCorrect,
    total,
    nextIds.join(','),
    starCount,
    now,
    firstCompleteAt,
    lastCompleteAt,
    'practice'
  ];

  writePracticeRecordRow_(sheet, existing ? rowNumber : sheet.getLastRow() + 1, nextRow);

  return {
    saved: true,
    completed: completed,
    area: targetArea,
    detail: targetDetail,
    correctCount: nextCorrect,
    totalCount: total,
    starCount: starCount
  };
}

function getSheetDataCount_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 0;
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;
  return Math.max(0, sheet.getLastRow() - 1);
}

function getWordRelationQuestionCount_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 0;
  const sheet = ss.getSheetByName('단어시트');
  if (!sheet) return 0;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  return rows.filter(row => {
    const word = String(row[0] || '').trim();
    const sentence1 = String(row[1] || '').trim();
    const sentence2 = String(row[2] || '').trim();
    const answer = String(row[3] || '').trim();
    return !!(word && sentence1 && sentence2 && answer);
  }).length;
}

function getReadingGmoQuestionCount_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 0;
  const sheet = ss.getSheetByName('지앰오아이문제');
  if (!sheet) return 0;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  return rows.filter(row => {
    const number = String(row[0] || '').trim();
    const question = String(row[2] || '').trim();
    const choices = [row[3], row[4], row[5], row[6]].map(value => String(value || '').trim());
    const answer = String(row[7] || '').trim();
    const explanation = String(row[8] || '').trim();
    return !!(number && question && choices.every(choice => choice) && answer && explanation);
  }).length;
}

function normalizeReadingGmoPracticeDetail_(detail) {
  const text = String(detail || '').trim();
  const lowerText = text.toLowerCase();
  if (lowerText === 'reading-gmo' || lowerText.indexOf('reading-gmo-') === 0 || lowerText === 'gmo' || lowerText.indexOf('gmo-') === 0) {
    return '독서:지엠오 아이';
  }
  const compact = text
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/：/g, ':')
    .replace(/지앰오/g, '지엠오');
  const aliases = {
    'gmo': true,
    'reading-gmo': true,
    '지엠오아이': true,
    '독서:지엠오아이': true,
    '독서지엠오아이': true
  };
  return aliases[compact.toLowerCase()] || aliases[compact] ? '독서:지엠오 아이' : text;
}

function isReadingGmoSolvedId_(value) {
  const id = String(value || '').trim().toLowerCase();
  return id === 'gmo' || id === 'reading-gmo' || id.indexOf('reading-gmo-') === 0 || id.indexOf('gmo-') === 0;
}

function isReadingGmoPracticeRecord_(area, detail, solvedIds) {
  const areaText = String(area || '').trim();
  const detailText = normalizeReadingGmoPracticeDetail_(detail);
  if (areaText === '국어' && detailText === '독서:지엠오 아이') return true;
  return (solvedIds || []).some(isReadingGmoSolvedId_);
}

function getSheetRowsByUserId_(sheet, userId, columnCount) {
  const id = String(userId || '').trim();
  const lastRow = sheet ? sheet.getLastRow() : 0;
  if (!sheet || !id || lastRow < 2) return [];

  const startedAt = logPerfStart_('getSheetRowsByUserId_');
  const matches = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(id)
    .matchEntireCell(true)
    .findAll();
  const rows = matches.map(cell => sheet.getRange(cell.getRow(), 1, 1, columnCount).getValues()[0]);
  logPerf_('getSheetRowsByUserId_', startedAt, 'userId=' + id + ' rows=' + rows.length);
  return rows;
}

function getPracticeBadgeTotals_() {
  const pokemonTotals = getPokemonGenerationTotals_();

  const koreanGroup = {};
  const readingGroup = {};
  getKoreanQuizOptions().forEach(quiz => {
    if (!quiz.title) return;
    const isReading = quiz.completionType === 'complete' || quiz.quizId === 'gmo';
    let count;
    if (quiz.quizId === 'gmo') {
      count = getReadingGmoQuestionCount_();
    } else if (quiz.quizId === 'word-relation') {
      count = getWordRelationQuestionCount_();
    } else {
      count = quiz.sheetName ? getSheetDataCount_(quiz.sheetName) : 0;
    }
    if (isReading) {
      readingGroup[quiz.title] = count;
    } else {
      koreanGroup[quiz.title] = count;
    }
  });

  const mathGroup = {};
  getMathQuizOptions().forEach(quiz => {
    if (!quiz.title) return;
    mathGroup[quiz.title] = quiz.type === 'generated' ? 100 : getSheetDataCount_(quiz.sheetName || '');
  });

  const peopleGroup = {
    '티니핑': getSheetDataCount_('티니핑문제'),
    '역사인물': getSheetDataCount_('인물문제'),
    '아이돌': getSheetDataCount_('아이돌문제'),
    '애니': getSheetDataCount_('애니문제')
  };
  readSubjectQuizOptions_('사회').forEach(quiz => {
    if (!quiz.title || quiz.quizId === 'history-people') return;
    peopleGroup[quiz.title] = quiz.sheetName ? getSheetDataCount_(quiz.sheetName) : 0;
  });

  return {
    pokemon: pokemonTotals,
    people: peopleGroup,
    daily: {
      '아재개그': getSheetDataCount_('아재개그문제')
    },
    korean: koreanGroup,
    reading: readingGroup,
    math: mathGroup
  };
}

function makePracticeBadgeItem_(correct, total, stars) {
  return {
    correct: Math.min(Number(correct) || 0, Number(total) || 0),
    total: Number(total) || 0,
    starCount: Number(stars) || 0
  };
}

function getPracticeBadgeProgress(userId) {
  const startedAt = logPerfStart_('getPracticeBadgeProgress');
  const id = String(userId || '').trim();
  const totals = getPracticeBadgeTotals_();
  const result = {
    pokemon: {},
    people: {},
    daily: {},
    korean: {},
    reading: {},
    math: {}
  };

  for (let gen = 1; gen <= 9; gen++) {
    result.pokemon['gen' + gen] = makePracticeBadgeItem_(0, totals.pokemon[String(gen)] || 0, 0);
  }
  Object.keys(totals.people).forEach(label => result.people[label] = makePracticeBadgeItem_(0, totals.people[label], 0));
  Object.keys(totals.daily).forEach(label => result.daily[label] = makePracticeBadgeItem_(0, totals.daily[label], 0));
  Object.keys(totals.korean).forEach(label => result.korean[label] = makePracticeBadgeItem_(0, totals.korean[label], 0));
  Object.keys(totals.reading).forEach(label => result.reading[label] = makePracticeBadgeItem_(0, totals.reading[label], 0));
  Object.keys(totals.math).forEach(label => result.math[label] = makePracticeBadgeItem_(0, totals.math[label], 0));
  if (!id) {
    logPerf_('getPracticeBadgeProgress', startedAt, 'no userId');
    return result;
  }

  const sheetResult = ensurePracticeRecordSheet();
  if (!sheetResult.error) {
    const sheet = sheetResult.sheet;
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const stepStarted = Date.now();
      const rows = getSheetRowsByUserId_(sheet, id, PRACTICE_RECORD_HEADERS.length);
      logPerf_('getPracticeBadgeProgress:practice user rows', stepStarted, 'rows=' + rows.length);
      const metaMap = getSubjectQuizMetaMap_();
      rows.forEach(row => {
        const area = String(row[5] || '').trim();
        const detail = String(row[6] || '').trim();
        const item = makePracticeBadgeItem_(row[7], row[8], row[10]);
        if (area === '포켓몬') {
          const match = detail.match(/^([1-9])세대$/);
          if (match) result.pokemon['gen' + match[1]] = item;
        } else if (area === '인물') {
          if (result.people[detail]) result.people[detail] = item;
        } else if (area === '일상') {
          if (detail === '맞춤법') {
            if (result.korean['맞춤법']) result.korean['맞춤법'] = item;
          } else {
            if (result.daily[detail]) result.daily[detail] = item;
          }
        } else if (area === '국어') {
          const normalizedDetail = normalizeReadingGmoPracticeDetail_(detail);
          const meta = metaMap['국어:' + detail] || metaMap['국어:' + normalizedDetail] || null;
          if (meta) {
            const group = meta.completionType === 'complete' ? result.reading : result.korean;
            const totalsGroup = meta.completionType === 'complete' ? totals.reading : totals.korean;
            const key = meta.title;
            const current = group[key] || makePracticeBadgeItem_(0, totalsGroup[key] || row[8], 0);
            const total = totalsGroup[key] || row[8];
            group[key] = makePracticeBadgeItem_(
              Math.max(Number(current.correct) || 0, Number(row[7]) || 0),
              total,
              Math.max(Number(current.starCount) || 0, Number(row[10]) || 0)
            );
          } else {
            if (normalizedDetail === '독서:지엠오 아이') {
              const current = result.reading['지엠오 아이'] || makePracticeBadgeItem_(0, totals.reading['지엠오 아이'] || row[8], 0);
              const total = totals.reading['지엠오 아이'] || row[8];
              result.reading['지엠오 아이'] = makePracticeBadgeItem_(
                Math.max(Number(current.correct) || 0, Number(row[7]) || 0),
                total,
                Math.max(Number(current.starCount) || 0, Number(row[10]) || 0)
              );
            } else if (result.korean[normalizedDetail]) {
              const current = result.korean[normalizedDetail] || makePracticeBadgeItem_(0, totals.korean[normalizedDetail] || row[8], 0);
              const total = totals.korean[normalizedDetail] || row[8];
              result.korean[normalizedDetail] = makePracticeBadgeItem_(
                Math.max(Number(current.correct) || 0, Number(row[7]) || 0),
                total,
                Math.max(Number(current.starCount) || 0, Number(row[10]) || 0)
              );
            }
          }
        } else if (area === '수학') {
          const meta = metaMap['수학:' + detail] || null;
          if (meta) {
            const key = meta.title;
            const current = result.math[key] || makePracticeBadgeItem_(0, totals.math[key] || row[8], 0);
            const total = totals.math[key] || row[8];
            result.math[key] = makePracticeBadgeItem_(
              Math.max(Number(current.correct) || 0, Number(row[7]) || 0),
              total,
              Math.max(Number(current.starCount) || 0, Number(row[10]) || 0)
            );
          } else {
            const mathDetail = normalizeMathMulDivDetail_(detail);
            if (result.math[mathDetail]) {
              const current = result.math[mathDetail] || makePracticeBadgeItem_(0, totals.math[mathDetail] || row[8], 0);
              const total = totals.math[mathDetail] || row[8];
              result.math[mathDetail] = makePracticeBadgeItem_(
                Math.max(Number(current.correct) || 0, Number(row[7]) || 0),
                total,
                Math.max(Number(current.starCount) || 0, Number(row[10]) || 0)
              );
            }
          }
        } else if (area === '사회') {
          const meta = metaMap['사회:' + detail] || null;
          if (meta) {
            const key = meta.title;
            const current = result.people[key] || makePracticeBadgeItem_(0, totals.people[key] || row[8], 0);
            const total = totals.people[key] || row[8];
            result.people[key] = makePracticeBadgeItem_(
              Math.max(Number(current.correct) || 0, Number(row[7]) || 0),
              total,
              Math.max(Number(current.starCount) || 0, Number(row[10]) || 0)
            );
          } else {
            const current = result.people[detail] || makePracticeBadgeItem_(0, totals.people[detail] || row[8], 0);
            const total = totals.people[detail] || row[8];
            result.people[detail] = makePracticeBadgeItem_(
              Math.max(Number(current.correct) || 0, Number(row[7]) || 0),
              total,
              Math.max(Number(current.starCount) || 0, Number(row[10]) || 0)
            );
          }
        }
      });
    }
  }

  logPerf_('getPracticeBadgeProgress', startedAt);
  return result;
}

function toDisplayImageUrl(value) {
  const url = String(value).trim();
  if (!url) return "";
  const driveMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  if (driveMatch) return "https://lh3.googleusercontent.com/d/" + driveMatch[1];
  return url.startsWith('http') ? url : "https://lh3.googleusercontent.com/d/" + url;
}

function toHistoryDisplayImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return "";
  if (isDriveDisplayUrl(url)) return toDisplayImageUrl(url);
  return /^https?:\/\//i.test(url) ? url : "";
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function updateHistoryImageLinksWithBackup() {
  if (!HISTORY_IMAGE_FOLDER_ID || HISTORY_IMAGE_FOLDER_ID === '여기에_history_폴더_ID') {
    Logger.log('HISTORY_IMAGE_FOLDER_ID에 dj48-quiz-images/history 폴더 ID를 입력하세요.');
    return { error: 'HISTORY_IMAGE_FOLDER_ID가 비어 있습니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  const sheet = ss.getSheetByName('인물문제');
  if (!sheet) throw new Error('인물문제 시트를 찾을 수 없습니다.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('인물문제 시트에 갱신할 데이터가 없습니다.');
    return {
      totalRows: 0,
      rowsWithNumber: 0,
      alreadyCurrent: 0,
      filledEmpty: 0,
      replacedWithBackup: 0,
      existingBackupKept: 0,
      missingFiles: 0,
      emptyNumbers: 0,
      sharingFailures: 0
    };
  }

  const fileMap = getHistoryDriveImageFileMap_();
  const rowCount = lastRow - 1;
  const values = sheet.getRange(2, 1, rowCount, 6).getValues();
  const nextImageAndBackupValues = values.map(row => [row[4], row[5]]);
  const missingNumbers = [];
  let rowsWithNumber = 0;
  let alreadyCurrent = 0;
  let filledEmpty = 0;
  let replacedWithBackup = 0;
  let existingBackupKept = 0;
  let missingFiles = 0;
  let emptyNumbers = 0;
  let sharingFailures = 0;

  values.forEach((row, index) => {
    const rowNumber = index + 2;
    const numberText = normalizeHistoryImageNumber_(row[0]);
    if (!numberText) {
      emptyNumbers++;
      return;
    }

    rowsWithNumber++;
    const file = fileMap[numberText];
    if (!file) {
      missingFiles++;
      missingNumbers.push(numberText + '(row ' + rowNumber + ')');
      return;
    }

    const fileId = file.getId();
    const nextUrl = getDirectDriveImageUrl(fileId);
    const currentUrl = String(row[4] || '').trim();
    const currentBackup = String(row[5] || '').trim();

    if (isSameDriveFileUrl(currentUrl, fileId)) {
      alreadyCurrent++;
      return;
    }

    try {
      setFilePublicReadable(file);
    } catch (err) {
      sharingFailures++;
      Logger.log('[history sharing failed] row=%s number=%s file=%s reason=%s', rowNumber, numberText, file.getName(), err && err.message ? err.message : err);
    }

    if (!currentUrl) {
      nextImageAndBackupValues[index][0] = nextUrl;
      filledEmpty++;
      return;
    }

    if (!currentBackup) {
      nextImageAndBackupValues[index][1] = currentUrl;
    } else {
      existingBackupKept++;
    }
    nextImageAndBackupValues[index][0] = nextUrl;
    replacedWithBackup++;
  });

  sheet.getRange(2, 5, rowCount, 2).setValues(nextImageAndBackupValues);

  Logger.log(
    '인물문제 history 이미지 URL 갱신 완료: 전체 행 %s, 번호 있는 행 %s, 최신 유지 %s, 빈 E열 채움 %s, 백업 후 교체 %s, 기존 백업 유지 %s, 파일 못 찾음 %s, 번호 없음 %s, 권한 설정 실패 %s',
    rowCount,
    rowsWithNumber,
    alreadyCurrent,
    filledEmpty,
    replacedWithBackup,
    existingBackupKept,
    missingFiles,
    emptyNumbers,
    sharingFailures
  );
  if (missingNumbers.length) Logger.log('누락 번호: ' + missingNumbers.join(', '));

  return {
    totalRows: rowCount,
    rowsWithNumber: rowsWithNumber,
    alreadyCurrent: alreadyCurrent,
    filledEmpty: filledEmpty,
    replacedWithBackup: replacedWithBackup,
    existingBackupKept: existingBackupKept,
    missingFiles: missingFiles,
    emptyNumbers: emptyNumbers,
    sharingFailures: sharingFailures
  };
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function listHistoryDriveImageFiles() {
  if (!HISTORY_IMAGE_FOLDER_ID || HISTORY_IMAGE_FOLDER_ID === '여기에_history_폴더_ID') {
    Logger.log('HISTORY_IMAGE_FOLDER_ID에 dj48-quiz-images/history 폴더 ID를 입력하세요.');
    return [];
  }

  const folder = DriveApp.getFolderById(HISTORY_IMAGE_FOLDER_ID);
  const files = [];
  const iterator = folder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    files.push({
      name: file.getName(),
      id: file.getId(),
      mimeType: file.getMimeType()
    });
  }

  files.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true, sensitivity: 'base' }));
  files.forEach(file => Logger.log('%s | %s | %s', file.name, file.id, file.mimeType));
  Logger.log('history Drive 이미지 파일 수: ' + files.length);
  return files;
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function getHistoryDriveImageFileMap_() {
  const folder = DriveApp.getFolderById(HISTORY_IMAGE_FOLDER_ID);
  const map = {};
  const iterator = folder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    const match = String(file.getName() || '').trim().match(/^0*(\d+)\.(jpe?g|png|webp)$/i);
    if (!match) continue;
    const numberText = String(Number(match[1]));
    if (!numberText || numberText === 'NaN') continue;
    if (!map[numberText]) map[numberText] = file;
  }
  return map;
}

function normalizeHistoryImageNumber_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const number = Number(text);
  if (!number || isNaN(number)) return '';
  return String(number);
}

function extractDriveFileIdFromUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';

  const patterns = [
    /\/d\/([a-zA-Z0-9_-]{20,})/,
    /[?&]id=([a-zA-Z0-9_-]{20,})/,
    /googleusercontent\.com\/d\/([a-zA-Z0-9_-]{20,})/
  ];
  for (let i = 0; i < patterns.length; i++) {
    const match = value.match(patterns[i]);
    if (match) return match[1];
  }
  return /^[a-zA-Z0-9_-]{25,}$/.test(value) ? value : '';
}

function isSameDriveFileUrl(url, fileId) {
  const currentFileId = extractDriveFileIdFromUrl(url);
  return !!currentFileId && currentFileId === String(fileId || '').trim();
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function updateAnimeImageLinksWithBackup() {
  if (!ANI_IMAGE_FOLDER_ID) {
    Logger.log('ANI_IMAGE_FOLDER_ID에 dj48-quiz-images/ani 폴더 ID를 입력하세요.');
    return { error: 'ANI_IMAGE_FOLDER_ID가 비어 있습니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  const sheet = ss.getSheetByName('애니문제');
  if (!sheet) throw new Error('애니문제 시트를 찾을 수 없습니다.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('애니문제 시트에 갱신할 데이터가 없습니다.');
    return {
      totalRows: 0,
      rowsWithNumber: 0,
      alreadyCurrent: 0,
      filledEmpty: 0,
      replacedWithBackup: 0,
      existingBackupKept: 0,
      missingFiles: 0,
      emptyNumbers: 0,
      sharingFailures: 0
    };
  }

  const fileMap = getAnimeDriveImageFileMap_();
  const rowCount = lastRow - 1;
  const values = sheet.getRange(2, 1, rowCount, 6).getValues();
  const nextImageAndBackupValues = values.map(row => [row[4], row[5]]);
  const missingNumbers = [];
  let rowsWithNumber = 0;
  let alreadyCurrent = 0;
  let filledEmpty = 0;
  let replacedWithBackup = 0;
  let existingBackupKept = 0;
  let missingFiles = 0;
  let emptyNumbers = 0;
  let sharingFailures = 0;

  values.forEach((row, index) => {
    const rowNumber = index + 2;
    const numberText = normalizeDriveImageNumber_(row[0]);
    if (!numberText) {
      emptyNumbers++;
      return;
    }

    rowsWithNumber++;
    const file = fileMap[numberText];
    if (!file) {
      missingFiles++;
      missingNumbers.push(numberText + '(row ' + rowNumber + ')');
      return;
    }

    const fileId = file.getId();
    const nextUrl = getDirectDriveImageUrl(fileId);
    const currentUrl = String(row[4] || '').trim();
    const currentBackup = String(row[5] || '').trim();

    if (isSameDriveFileUrl(currentUrl, fileId)) {
      alreadyCurrent++;
      return;
    }

    try {
      setFilePublicReadable(file);
    } catch (err) {
      sharingFailures++;
      Logger.log('[anime sharing failed] row=%s number=%s file=%s reason=%s', rowNumber, numberText, file.getName(), err && err.message ? err.message : err);
    }

    if (!currentUrl) {
      nextImageAndBackupValues[index][0] = nextUrl;
      filledEmpty++;
      return;
    }

    if (!currentBackup) {
      nextImageAndBackupValues[index][1] = currentUrl;
    } else {
      existingBackupKept++;
    }
    nextImageAndBackupValues[index][0] = nextUrl;
    replacedWithBackup++;
  });

  sheet.getRange(2, 5, rowCount, 2).setValues(nextImageAndBackupValues);

  Logger.log(
    '애니문제 ani 이미지 URL 갱신 완료: 전체 행 %s, 번호 있는 행 %s, 최신 유지 %s, 빈 E열 채움 %s, 백업 후 교체 %s, 기존 백업 유지 %s, 파일 못 찾음 %s, 번호 없음 %s, 권한 설정 실패 %s',
    rowCount,
    rowsWithNumber,
    alreadyCurrent,
    filledEmpty,
    replacedWithBackup,
    existingBackupKept,
    missingFiles,
    emptyNumbers,
    sharingFailures
  );
  if (missingNumbers.length) Logger.log('누락 번호: ' + missingNumbers.join(', '));

  return {
    totalRows: rowCount,
    rowsWithNumber: rowsWithNumber,
    alreadyCurrent: alreadyCurrent,
    filledEmpty: filledEmpty,
    replacedWithBackup: replacedWithBackup,
    existingBackupKept: existingBackupKept,
    missingFiles: missingFiles,
    emptyNumbers: emptyNumbers,
    sharingFailures: sharingFailures
  };
}

function findAnimeEdgarImageFile_() {
  const folder = DriveApp.getFolderById(ANI_IMAGE_FOLDER_ID);
  const numberedMap = getNumberedDriveImageFileMap_(folder);
  const textMatches = [];
  const iterator = folder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    if (!isSupportedDriveImageFile(file)) continue;
    const name = String(file.getName() || '').trim();
    if (isCrowAnimeFileName_(name)) continue;
    if (/(에드거|에드가|edgar)/i.test(name)) textMatches.push(file);
  }
  textMatches.sort((a, b) => a.getName().localeCompare(b.getName(), 'ko', { numeric: true, sensitivity: 'base' }));
  if (textMatches.length) return textMatches[0];

  const numberedFile = numberedMap['69'];
  if (numberedFile && !isCrowAnimeFileName_(numberedFile.getName())) return numberedFile;
  return null;
}

function isCrowAnimeFileName_(name) {
  return /(크로우|crow)/i.test(String(name || ''));
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function listAnimeDriveImageFiles() {
  if (!ANI_IMAGE_FOLDER_ID) {
    Logger.log('ANI_IMAGE_FOLDER_ID에 dj48-quiz-images/ani 폴더 ID를 입력하세요.');
    return [];
  }

  const folder = DriveApp.getFolderById(ANI_IMAGE_FOLDER_ID);
  const files = [];
  const iterator = folder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    files.push({
      name: file.getName(),
      id: file.getId(),
      mimeType: file.getMimeType()
    });
  }

  files.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true, sensitivity: 'base' }));
  files.forEach(file => Logger.log('%s | %s | %s', file.name, file.id, file.mimeType));
  Logger.log('ani Drive 이미지 파일 수: ' + files.length);
  return files;
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function getAnimeDriveImageFileMap_() {
  const folder = DriveApp.getFolderById(ANI_IMAGE_FOLDER_ID);
  return getNumberedDriveImageFileMap_(folder);
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function getNumberedDriveImageFileMap_(folder) {
  const map = {};
  const iterator = folder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    const match = String(file.getName() || '').trim().match(/^0*(\d+)\.(jpe?g|png|webp)$/i);
    if (!match) continue;
    const numberText = String(Number(match[1]));
    if (!numberText || numberText === 'NaN') continue;
    if (!map[numberText]) map[numberText] = file;
  }
  return map;
}

function normalizeDriveImageNumber_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const number = Number(text);
  if (!number || isNaN(number)) return '';
  return String(number);
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function mapIdolImagesFromDriveByAnswer() {
  if (!IDOL_IMAGE_FOLDER_ID || IDOL_IMAGE_FOLDER_ID === '여기에_idol_폴더_ID') {
    throw new Error('IDOL_IMAGE_FOLDER_ID에 dj48-quiz-images/idol 폴더 ID를 입력하세요.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  const sheet = ss.getSheetByName('아이돌문제');
  if (!sheet) throw new Error('아이돌문제 시트를 찾을 수 없습니다.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { processed: 0, skipped: 0, failed: 0 };

  const folder = DriveApp.getFolderById(IDOL_IMAGE_FOLDER_ID);
  const values = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 6)).getValues();
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  values.forEach((row, index) => {
    const rowNumber = index + 2;
    const answerName = String(row[1] || '').trim();
    const currentImageUrl = String(row[4] || '').trim();
    if (isDriveDisplayUrl(currentImageUrl)) {
      skipped++;
      return;
    }

    try {
      if (!answerName) throw new Error('정답란이 비어 있습니다.');

      const file = findDriveImageByAnswerName(folder, answerName);
      if (!file) {
        failed++;
        Logger.log('[idol image not found] row=%s answer=%s reason=matching file not found', rowNumber, answerName);
        return;
      }

      setFilePublicReadable(file);
      backupOriginalImageUrlIfNeeded(sheet, rowNumber);
      sheet.getRange(rowNumber, 5).setValue(getDirectDriveImageUrl(file.getId()));
      processed++;
    } catch (err) {
      failed++;
      Logger.log('[idol image mapping failed] row=%s answer=%s reason=%s', rowNumber, answerName, err && err.message ? err.message : err);
    }
  });

  return { processed: processed, skipped: skipped, failed: failed };
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function findDriveImageByAnswerName(folder, answerName) {
  const targetNames = getImageNameCandidates(answerName);
  const files = folder.getFiles();
  let matchedFile = null;
  let matchCount = 0;

  while (files.hasNext()) {
    const file = files.next();
    if (!isSupportedDriveImageFile(file)) continue;

    const fileName = file.getName();
    const fileCandidates = getImageNameCandidates(fileName);
    const matched = fileCandidates.some(name => targetNames.indexOf(name) !== -1);
    if (!matched) continue;

    matchCount++;
    if (!matchedFile) matchedFile = file;
  }

  if (matchCount > 1) {
    Logger.log('[idol image duplicate possible] answer=%s matches=%s firstFile=%s', answerName, matchCount, matchedFile.getName());
  }

  return matchedFile;
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function getImageNameCandidates(name) {
  const normalized = normalizeImageName(name);
  const withoutExt = normalizeImageName(String(name || '').replace(/\.[^.]+$/, ''));
  const compact = normalized.replace(/\s/g, '');
  const compactWithoutExt = withoutExt.replace(/\s/g, '');
  const candidates = [normalized, withoutExt, compact, compactWithoutExt];
  return candidates.filter((value, index) => value && candidates.indexOf(value) === index);
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function normalizeImageName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\.(jpg|jpeg|png|webp)$/i, '');
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function downloadImageToDrive(imageUrl, folder, fileName) {
  const response = UrlFetchApp.fetch(imageUrl, {
    muteHttpExceptions: true,
    followRedirects: true
  });
  const responseCode = response.getResponseCode();
  if (responseCode < 200 || responseCode >= 300) {
    throw new Error('HTTP ' + responseCode);
  }

  const headers = response.getHeaders();
  const contentType = String(headers['Content-Type'] || headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const extension = getImageExtensionFromContentType(contentType);
  if (!extension) {
    throw new Error('지원하지 않는 Content-Type: ' + (contentType || 'unknown'));
  }

  const blob = response.getBlob().setName(fileName + '.' + extension);
  return folder.createFile(blob);
}

function getImageExtensionFromContentType(contentType) {
  const type = String(contentType || '').toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return '';
}

function getDirectDriveImageUrl(fileId) {
  return 'https://lh3.googleusercontent.com/d/' + fileId;
}

function isDriveDisplayUrl(url) {
  const value = String(url || '').trim();
  return /^https:\/\/lh3\.googleusercontent\.com\/d\/[^/?#]+/i.test(value) ||
    /^https:\/\/drive\.google\.com\//i.test(value);
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function backupOriginalImageUrlIfNeeded(sheet, row) {
  const originalValue = sheet.getRange(row, 5).getValue();
  const backupCell = sheet.getRange(row, 6);
  if (originalValue && !backupCell.getValue()) {
    backupCell.setValue(originalValue);
  }
}

function normalizeFileName(name) {
  return String(name || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_');
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삭제 전 반드시 Drive 이미지/시트 복구 작업 필요 여부를 확인하세요.
 */
function setFilePublicReadable(file) {
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
}

function isSupportedDriveImageFile(file) {
  const mimeType = String(file.getMimeType() || '').toLowerCase();
  const fileName = String(file.getName() || '').toLowerCase();
  return mimeType === 'image/jpeg' ||
    mimeType === 'image/png' ||
    mimeType === 'image/webp' ||
    /\.(jpg|jpeg|png|webp)$/i.test(fileName);
}

function formatElapsedSeconds(seconds) {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  if (!totalSeconds) return '';
  const minutes = Math.floor(totalSeconds / 60);
  const remainSeconds = totalSeconds % 60;
  return minutes ? `${minutes}분 ${remainSeconds}초` : `${remainSeconds}초`;
}

function normalizeRankingMode_(rankingMode) {
  const mode = String(rankingMode || '').trim();
  // Legacy compatibility: old ranking records may contain "silhouette".
  // The current UI no longer exposes silhouette mode.
  return ['normal', 'onechance', 'silhouette', 'nohint', 'speed'].indexOf(mode) !== -1 ? mode : 'normal';
}

function normalizeWritableRankingMode_(rankingMode) {
  const mode = String(rankingMode || '').trim();
  return ['normal', 'onechance', 'nohint', 'speed'].indexOf(mode) !== -1 ? mode : 'normal';
}

function normalizeWritableRankingModeForCategory_(category, subFilter, rankingMode) {
  const mode = normalizeWritableRankingMode_(rankingMode);
  const cat = String(category || '').trim();
  if (cat === '독서' || cat === '수학' || cat === '맞춤법') {
    return mode === 'onechance' ? 'onechance' : 'normal';
  }
  return mode;
}

function ensureRankingRecordSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: '스프레드시트를 찾을 수 없습니다.' };

  let sheet = ss.getSheetByName('랭킹기록');
  if (!sheet) sheet = ss.insertSheet('랭킹기록');

  const headers = ['날짜', '이름', '카테고리', '점수', 'userId', '학년', '반', '번호', '소요시간초', '소요시간표시', '랭킹모드'];
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = headers.some((header, index) => String(currentHeaders[index] || '').trim() !== header);
  if (needsHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  return { sheet };
}

function saveRankingRecord(category, studentNum, score, subFilter, memberInfo, elapsedSeconds, rankingMode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { ok: false, message: '스프레드시트를 찾을 수 없어 랭킹을 저장하지 못했습니다.' };

  const member = memberInfo || {};
  const userId = String(member.userId || '').trim();
  const studentName = String((member.nickname || studentNum) || '').trim() || '익명';
  const finalCategory = subFilter ? `${category}(${subFilter})` : category;
  const numericScore = Number(score);
  if (isNaN(numericScore) || numericScore <= 0) return { ok: true, skipped: true };
  if (userId) {
    const storedMember = getMemberByUserId(userId);
    if (storedMember && !storedMember.error && !isActiveStudentMember_(storedMember)) {
      Logger.log('랭킹 저장 제외: role/status 대상 아님 userId=%s role=%s status=%s', userId, storedMember.role, storedMember.status);
      return { ok: true, skipped: true };
    }
  }

  const elapsed = Math.max(0, Math.round(Number(elapsedSeconds) || 0));
  if (elapsed > MAX_RANKING_ELAPSED_SECONDS) {
    Logger.log(
      '랭킹 저장 차단: elapsedSeconds=%s, category=%s, userId=%s, name=%s, mode=%s',
      elapsed,
      finalCategory,
      userId,
      studentName,
      rankingMode
    );
    return { ok: false, ignored: true, message: INVALID_RANKING_TIME_MESSAGE };
  }

  const sheetResult = ensureRankingRecordSheet();
  if (sheetResult.error) return { ok: false, message: sheetResult.error };

  const finalRankingMode = normalizeWritableRankingModeForCategory_(category, subFilter, rankingMode);
  sheetResult.sheet.appendRow([
    new Date(),
    studentName,
    finalCategory,
    numericScore,
    userId,
    member.grade || '',
    member.classNo || '',
    member.number || '',
    elapsed || '',
    formatElapsedSeconds(elapsed),
    finalRankingMode
  ]);

  NORMAL_RANKING_SCORE50_COUNT_CACHE_ = null;
  return { ok: true };
}

function getRankingElapsedSecondsColumnIndex_(headers) {
  const candidates = ['소요시간초', 'elapsedSeconds', '경과시간초', '시간초', 'timeSeconds', 'durationSeconds'];
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] || '').trim();
    if (candidates.indexOf(header) !== -1) return i;
  }
  return 8;
}

function getInvalidRankingRecordsOverMax_() {
  const sheetResult = ensureRankingRecordSheet();
  if (sheetResult.error) return { error: sheetResult.error, rows: [] };

  const sheet = sheetResult.sheet;
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), 11);
  if (lastRow < 2) return { sheet: sheet, headers: [], rows: [] };

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const elapsedIndex = getRankingElapsedSecondsColumnIndex_(headers);
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const rows = [];

  values.forEach((row, index) => {
    const rawElapsed = row[elapsedIndex];
    if (rawElapsed === '' || rawElapsed === null || rawElapsed === undefined) return;
    const elapsed = Number(rawElapsed);
    if (isNaN(elapsed)) return;
    if (elapsed > MAX_RANKING_ELAPSED_SECONDS) {
      rows.push({
        rowNumber: index + 2,
        elapsedSeconds: elapsed,
        values: row
      });
    }
  });

  return { sheet: sheet, headers: headers, rows: rows, elapsedColumn: elapsedIndex + 1 };
}

/*
 * [MANUAL ADMIN TOOL]
 * 삭제하지 않고 랭킹기록 시트의 600분 초과 기록만 Logger.log로 미리 확인합니다.
 */
function previewInvalidRankingRecordsOver600Minutes() {
  const result = getInvalidRankingRecordsOverMax_();
  if (result.error) {
    Logger.log(result.error);
    return { ok: false, message: result.error };
  }

  Logger.log('랭킹기록 600분 초과 preview: 대상 %s건, 기준 %s초, 시간열 %s', result.rows.length, MAX_RANKING_ELAPSED_SECONDS, result.elapsedColumn);
  result.rows.forEach(item => {
    Logger.log(
      '삭제 후보 row=%s, elapsedSeconds=%s, 날짜=%s, 이름=%s, 카테고리=%s, 점수=%s, userId=%s, 모드=%s',
      item.rowNumber,
      item.elapsedSeconds,
      item.values[0],
      item.values[1],
      item.values[2],
      item.values[3],
      item.values[4],
      item.values[10]
    );
  });

  return { ok: true, count: result.rows.length, rows: result.rows.map(item => item.rowNumber) };
}

/*
 * [MANUAL ADMIN TOOL]
 * 랭킹기록 시트의 600분 초과 기록을 백업 시트로 복사한 뒤 원본에서 삭제합니다.
 * Apps Script 편집기에서 previewInvalidRankingRecordsOver600Minutes() 확인 후 직접 실행하세요.
 */
function cleanupInvalidRankingRecordsOver600Minutes() {
  const result = getInvalidRankingRecordsOverMax_();
  if (result.error) {
    Logger.log(result.error);
    return { ok: false, message: result.error };
  }

  if (!result.rows.length) {
    Logger.log('랭킹기록 600분 초과 삭제 대상이 없습니다.');
    return { ok: true, deleted: 0 };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const backupSheetName = '랭킹기록_600분초과백업';
  let backupSheet = ss.getSheetByName(backupSheetName);
  if (!backupSheet) backupSheet = ss.insertSheet(backupSheetName);

  const backupHeaders = ['백업일시', '원본행'].concat(result.headers);
  if (backupSheet.getLastRow() < 1) {
    backupSheet.getRange(1, 1, 1, backupHeaders.length).setValues([backupHeaders]);
  }

  const backupRows = result.rows.map(item => [new Date(), item.rowNumber].concat(item.values));
  backupSheet.getRange(backupSheet.getLastRow() + 1, 1, backupRows.length, backupHeaders.length).setValues(backupRows);

  result.rows.slice().sort((a, b) => b.rowNumber - a.rowNumber).forEach(item => {
    Logger.log('랭킹기록 600분 초과 삭제: row=%s, elapsedSeconds=%s, name=%s, category=%s, score=%s', item.rowNumber, item.elapsedSeconds, item.values[1], item.values[2], item.values[3]);
    result.sheet.deleteRow(item.rowNumber);
  });

  Logger.log('랭킹기록 600분 초과 정리 완료: 삭제 %s건, 백업 시트=%s', result.rows.length, backupSheetName);
  return { ok: true, deleted: result.rows.length, backupSheetName: backupSheetName };
}

function getSpellingNoHintRankingMigration_() {
  const sheetResult = ensureRankingRecordSheet();
  if (sheetResult.error) return { error: sheetResult.error };

  const sheet = sheetResult.sheet;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { sheet: sheet, headers: [], rows: [], groups: {}, noHintRows: [], actions: [] };
  }

  const headers = sheet.getRange(1, 1, 1, 11).getValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const groups = {};
  const noHintRows = [];

  rows.forEach((row, index) => {
    if (normalizeRankingCategory(String(row[2] || '').trim()) !== '맞춤법') return;

    const mode = normalizeRankingMode_(row[10]);
    if (mode !== 'normal' && mode !== 'nohint') return;

    const recordName = String(row[1] || '').trim() || '익명';
    const userId = String(row[4] || '').trim();
    const key = userId ? 'userId:' + userId : 'name:' + recordName;
    const entry = {
      rowNumber: index + 2,
      row: row,
      score: Number(row[3]),
      elapsedSeconds: Number(row[8]) || 0,
      mode: mode,
      key: key
    };
    if (isNaN(entry.score)) return;

    if (!groups[key]) groups[key] = { normal: [], nohint: [] };
    if (mode === 'normal') groups[key].normal.push(entry);
    if (mode === 'nohint') {
      groups[key].nohint.push(entry);
      noHintRows.push(entry);
    }
  });

  const actions = [];
  Object.keys(groups).forEach(key => {
    const group = groups[key];
    if (!group.nohint.length) return;

    const bestNoHint = group.nohint.slice().sort((a, b) => isBetterRankingEntry_(b, a, true) ? 1 : -1)[0];
    const bestNormal = group.normal.slice().sort((a, b) => isBetterRankingEntry_(b, a, true) ? 1 : -1)[0] || null;
    if (!bestNormal) {
      actions.push({ type: 'convert', key: key, sourceRow: bestNoHint.rowNumber, targetRow: bestNoHint.rowNumber, source: bestNoHint, target: null });
      return;
    }
    if (isBetterRankingEntry_(bestNoHint, bestNormal, true)) {
      actions.push({ type: 'overwrite', key: key, sourceRow: bestNoHint.rowNumber, targetRow: bestNormal.rowNumber, source: bestNoHint, target: bestNormal });
    }
  });

  return {
    sheet: sheet,
    headers: headers,
    rows: rows,
    groups: groups,
    noHintRows: noHintRows,
    actions: actions
  };
}

/*
 * [MANUAL ADMIN TOOL]
 * 맞춤법 노힌트 랭킹 기록을 일반 기록과 비교해 병합할 내용을 Logger.log로 미리 확인합니다.
 */
function previewMigrateSpellingNoHintRankingRecords() {
  const result = getSpellingNoHintRankingMigration_();
  if (result.error) {
    Logger.log(result.error);
    return { ok: false, message: result.error };
  }

  Logger.log('맞춤법 노힌트 랭킹 정리 preview: nohint=%s건, mergeAction=%s건', result.noHintRows.length, result.actions.length);
  result.actions.forEach(action => {
    Logger.log(
      '%s key=%s sourceRow=%s targetRow=%s score=%s elapsed=%s',
      action.type,
      action.key,
      action.sourceRow,
      action.targetRow,
      action.source.score,
      action.source.elapsedSeconds
    );
  });

  return {
    ok: true,
    noHintCount: result.noHintRows.length,
    actionCount: result.actions.length,
    actions: result.actions.map(action => ({
      type: action.type,
      key: action.key,
      sourceRow: action.sourceRow,
      targetRow: action.targetRow,
      score: action.source.score,
      elapsedSeconds: action.source.elapsedSeconds
    }))
  };
}

/*
 * [MANUAL ADMIN TOOL]
 * 맞춤법 노힌트 랭킹 기록을 일반 기록에 병합하고, 모든 맞춤법 nohint 기록을 백업 후 삭제합니다.
 */
function migrateSpellingNoHintRankingRecords() {
  const result = getSpellingNoHintRankingMigration_();
  if (result.error) {
    Logger.log(result.error);
    return { ok: false, message: result.error };
  }

  if (!result.noHintRows.length) {
    Logger.log('맞춤법 노힌트 랭킹 정리 대상이 없습니다.');
    return { ok: true, deleted: 0, overwritten: 0, converted: 0 };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const backupSheetName = '랭킹기록_맞춤법노힌트백업';
  let backupSheet = ss.getSheetByName(backupSheetName);
  if (!backupSheet) backupSheet = ss.insertSheet(backupSheetName);

  const backupHeaders = ['백업일시', '원본행', '정리동작'].concat(result.headers);
  if (backupSheet.getLastRow() < 1) {
    backupSheet.getRange(1, 1, 1, backupHeaders.length).setValues([backupHeaders]);
  }

  const actionBySourceRow = {};
  result.actions.forEach(action => actionBySourceRow[action.sourceRow] = action.type);
  const backupRows = result.noHintRows.map(entry => [new Date(), entry.rowNumber, actionBySourceRow[entry.rowNumber] || 'delete'].concat(entry.row));
  backupSheet.getRange(backupSheet.getLastRow() + 1, 1, backupRows.length, backupHeaders.length).setValues(backupRows);

  let overwritten = 0;
  let converted = 0;
  const convertedRows = {};
  result.actions.forEach(action => {
    const nextRow = action.source.row.slice();
    nextRow[2] = '맞춤법';
    nextRow[10] = 'normal';
    result.sheet.getRange(action.targetRow, 1, 1, 11).setValues([nextRow]);
    if (action.type === 'convert') {
      converted += 1;
      convertedRows[action.targetRow] = true;
    } else {
      overwritten += 1;
    }
    Logger.log('맞춤법 노힌트 %s: sourceRow=%s targetRow=%s score=%s', action.type, action.sourceRow, action.targetRow, action.source.score);
  });

  const deleteRows = result.noHintRows
    .map(entry => entry.rowNumber)
    .filter(rowNumber => !convertedRows[rowNumber])
    .sort((a, b) => b - a);
  deleteRows.forEach(rowNumber => result.sheet.deleteRow(rowNumber));

  Logger.log('맞춤법 노힌트 랭킹 정리 완료: overwritten=%s, converted=%s, deleted=%s, backupSheet=%s', overwritten, converted, deleteRows.length, backupSheetName);
  return { ok: true, overwritten: overwritten, converted: converted, deleted: deleteRows.length, backupSheetName: backupSheetName };
}

function getLatestMemberMap_(titleContext) {
  const startedAt = logPerfStart_('getLatestMemberMap_');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const map = {};
  if (!ss) return map;

  const memberSheet = ss.getSheetByName('회원정보');
  if (!memberSheet) return map;

  const lastRow = memberSheet.getLastRow();
  if (lastRow < 2) return map;

  ensureMemberHeaders_(memberSheet);
  const rows = memberSheet.getRange(2, 1, lastRow - 1, MEMBER_INFO_COLUMN_COUNT).getValues();
  const titleStatusMap = titleContext && titleContext.titleStatusMap ? titleContext.titleStatusMap : null;
  rows.forEach(row => {
    const userId = String(row[0] || '').trim();
    if (!userId) return;
    const rawSelectedTitle = String(row[10] || '').trim();
    const selectedTitle = titleContext && titleContext.skipTitleResolution
      ? null
      : (titleStatusMap
      ? getSelectedTitleFromStatus_(row[10], titleStatusMap[userId] || [])
      : (titleContext ? getSelectedTitleForUserFromContext_(userId, row[10], titleContext) : getResolvedMemberSelectedTitle_(userId, row[10])));
    map[userId] = {
      userId: userId,
      grade: String(row[1] || '').trim(),
      classNo: String(row[2] || '').trim(),
      number: String(row[3] || '').trim(),
      nickname: String(row[4] || '').trim(),
      profileImageUrl: String(row[5] || '').trim(),
      school: normalizeMemberSchool_(row[9]),
      schoolShortName: formatSchoolShortName_(row[9]),
      role: normalizeMemberRole_(row[MEMBER_ROLE_COLUMN - 1]),
      status: normalizeMemberStatus_(row[MEMBER_STATUS_COLUMN - 1]),
      rankingMessage: normalizeRankingMessage_(row[MEMBER_RANKING_MESSAGE_COLUMN - 1]),
      selectedTitleId: selectedTitle ? selectedTitle.id : rawSelectedTitle,
      selectedTitle: selectedTitle ? selectedTitle.title : '',
      selectedTitleThemeClass: selectedTitle ? selectedTitle.themeClass : '',
      selectedTitleTierClass: selectedTitle ? selectedTitle.tierClass : '',
      selectedTitleEffectClass: selectedTitle ? selectedTitle.effectClass : ''
    };
  });

  logPerf_('getLatestMemberMap_', startedAt, 'members=' + rows.length);
  return map;
}

function getUserBestScores(userId, rankingMode) {
  const startedAt = logPerfStart_('getUserBestScores');
  const id = String(userId || '').trim();
  const rankingModeFilter = normalizeRankingMode_(rankingMode);
  const result = {
    tinniping: null,
    spelling: null,
    dadJoke: null,
    pokemonPractice: null,
    pokemonPracticeGenerations: {
      '1': null,
      '2': null,
      '3': null,
      '4': null,
      '5': null,
      '6': null,
      '7': null,
      '8': null,
      '9': null
    },
    pokemonEasy: null,
    pokemonNormal: null,
    pokemonHard: null,
    pokemonVeryHard: null,
    history: null,
    wordRelation: null,
    readingGmo: null,
    mathRandom: null,
    idol: null,
    anime: null,
    _readingRankingItems: getProfileReadingRankingItems_()
  };
  if (!id) {
    logPerf_('getUserBestScores', startedAt, 'no userId');
    return result;
  }

  const categoryKeyMap = getProfileRankingCategoryKeyMap_();

  const data = getRankingRecordRows_();
  data.forEach(row => {
    if (String(row[4] || '').trim() !== id) return;
    if (normalizeRankingMode_(row[10]) !== rankingModeFilter) return;

    const rawCategory = String(row[2] || '').trim();
    const score = Number(row[3]);
    if (isNaN(score)) return;

    const category = normalizeRankingCategory(rawCategory);
    const key = categoryKeyMap[category];
    if (!key) return;

    const entry = {
      score: score,
      elapsedSeconds: Number(row[8]) || 0,
      elapsedText: String(row[9] || formatElapsedSeconds(row[8])).trim()
    };
    if (isBetterRankingEntry_(entry, result[key], true)) result[key] = entry;
  });

  logPerf_('getUserBestScores', startedAt);
  return result;
}

function getProfileReadingQuizKey_(quiz) {
  const item = quiz || {};
  if (item.quizId === 'gmo' || item.title === '지엠오 아이') return 'readingGmo';
  const source = String(item.quizId || item.title || '').trim();
  const key = normalizeTitleAreaKeyPart_(source).replace(/-/g, '_');
  return key ? 'reading_' + key : '';
}

function getProfileReadingRankingItems_() {
  const items = [];
  const seen = { readingGmo: true };
  try {
    getKoreanQuizOptions().forEach(function(quiz) {
      if (!quiz || quiz.completionType !== 'complete' || !quiz.title) return;
      const key = getProfileReadingQuizKey_(quiz);
      if (!key || seen[key]) return;
      seen[key] = true;
      items.push({ key: key, title: quiz.title });
    });
  } catch(e) {}
  return items;
}

function getProfileRankingCategoryKeyMap_() {
  const categoryKeyMap = {
    '티니핑': 'tinniping',
    '맞춤법': 'spelling',
    '아재개그': 'dadJoke',
    '포켓몬(쉬움)': 'pokemonEasy',
    '포켓몬(보통)': 'pokemonNormal',
    '포켓몬(어려움)': 'pokemonHard',
    '포켓몬(헬)': 'pokemonVeryHard',
    '인물(역사 인물)': 'history',
    '단어(다의어·동형이의어)': 'wordRelation',
    '독서(지엠오 아이)': 'readingGmo',
    '독서(지앰오 아이)': 'readingGmo',
    '수학(곱셈과 나눗셈)': 'mathRandom',
    '수학(난수퀴즈)': 'mathRandom',
    '인물(아이돌)': 'idol',
    '인물(애니)': 'anime'
  };

  try {
    getKoreanQuizOptions().forEach(function(quiz) {
      if (!quiz || quiz.completionType !== 'complete' || !quiz.title) return;
      const key = getProfileReadingQuizKey_(quiz);
      if (!key) return;
      categoryKeyMap['독서(' + quiz.title + ')'] = key;
    });
  } catch(e) {}

  try {
    readSubjectQuizOptions_('사회').forEach(function(quiz) {
      if (!quiz || !quiz.title || quiz.quizId === 'history-people') return;
      categoryKeyMap['사회(' + quiz.title + ')'] = 'social:' + quiz.title;
    });
  } catch(e) {}

  return categoryKeyMap;
}

function getQuizKingRankings() {
  const startedAt = logPerfStart_('getQuizKingRankings');
  const records = getQuizKingAuditRecords_();
  const result = buildQuizKingScoreByCategoryBest_(records);
  const resultList = result.rankings.map(user => ({
    userId: user.userId,
    name: user.name,
    nickname: user.nickname,
    grade: user.grade,
    classNo: user.classNo,
    number: user.number,
    school: user.school,
    schoolShortName: user.schoolShortName,
    profileImageUrl: user.profileImageUrl,
    selectedTitle: user.selectedTitle,
    rankingMessage: user.rankingMessage,
    score: user.totalScore
  }));

  logPerf_('getQuizKingRankings', startedAt, 'users=' + resultList.length);
  return { "전체": resultList, rankings: resultList };
}

function getQuizKingAuditRecords_() {
  const latestMemberMap = getLatestMemberMap_({ skipTitleResolution: true });
  const targetModes = ['normal', 'onechance', 'nohint', 'speed'];
  const rows = getRankingRecordRows_();
  const records = [];

  rows.forEach((row, index) => {
    const mode = normalizeRankingMode_(row[10]);
    if (targetModes.indexOf(mode) === -1) return;

    const category = normalizeRankingCategory(String(row[2] || '').trim());
    if (!category) return;

    const rawScore = Number(row[3]);
    const score = isNaN(rawScore) ? 0 : rawScore;
    if (score <= 0) return;

    const userId = String(row[4] || '').trim();
    const grade = String(row[5] || '').trim();
    const classNo = String(row[6] || '').trim();
    const number = String(row[7] || '').trim();
    const recordName = String(row[1] || '').trim() || '익명';
    const member = userId ? latestMemberMap[userId] : null;
    if (member && !isActiveStudentMember_(member)) return;

    let userKey = '';
    if (userId) {
      userKey = 'ID:' + userId;
    } else if (grade && classNo && number) {
      userKey = 'GCN:' + grade + '-' + classNo + '-' + number;
    } else {
      userKey = 'NAME:' + recordName;
    }

    records.push({
      rowNumber: index + 2,
      userKey: userKey,
      userId: userId,
      name: recordName,
      nickname: (member && member.nickname) || recordName,
      grade: (member && member.grade) || grade,
      classNo: (member && member.classNo) || classNo,
      number: (member && member.number) || number,
      school: (member && member.school) || '',
      schoolShortName: (member && member.schoolShortName) || '',
      profileImageUrl: member && member.profileImageUrl ? toDisplayImageUrl(member.profileImageUrl) : '',
      selectedTitle: (member && member.selectedTitle) || '',
      rankingMessage: (member && member.rankingMessage) || '',
      category: category,
      quizTitle: getQuizKingAuditQuizTitle_(category),
      mode: mode,
      score: score,
      elapsedSeconds: Number(row[8]) || 0,
      elapsedText: String(row[9] || formatElapsedSeconds(row[8])).trim(),
      date: row[0]
    });
  });

  return records;
}

function getQuizKingAuditQuizTitle_(category) {
  const text = String(category || '').trim();
  const match = text.match(/^(.+?)\((.+)\)$/);
  return match ? match[2].trim() : text;
}

function isBetterQuizKingAuditRecord_(next, current) {
  if (!current) return true;
  if (next.score !== current.score) return next.score > current.score;
  const nextTime = Number(next.elapsedSeconds) || 999999999;
  const currentTime = Number(current.elapsedSeconds) || 999999999;
  if (nextTime !== currentTime) return nextTime < currentTime;
  return Number(next.rowNumber) < Number(current.rowNumber);
}

function buildQuizKingScoreByCategoryBest_(records) {
  const users = {};
  (records || []).forEach(record => {
    if (!record || !record.userKey || !record.category) return;
    if (!users[record.userKey]) {
      users[record.userKey] = {
        userKey: record.userKey,
        userId: record.userId,
        name: record.name,
        nickname: record.nickname,
        grade: record.grade,
        classNo: record.classNo,
        number: record.number,
        school: record.school,
        schoolShortName: record.schoolShortName,
        profileImageUrl: record.profileImageUrl,
        selectedTitle: record.selectedTitle,
        rankingMessage: record.rankingMessage,
        bestByCategory: {},
        totalScore: 0
      };
    }
    const current = users[record.userKey].bestByCategory[record.category];
    if (isBetterQuizKingAuditRecord_(record, current)) {
      users[record.userKey].bestByCategory[record.category] = record;
    }
  });

  const rankings = Object.keys(users).map(userKey => {
    const user = users[userKey];
    const categories = Object.keys(user.bestByCategory);
    user.totalScore = categories.reduce((sum, category) => {
      return sum + (Number(user.bestByCategory[category].score) || 0);
    }, 0);
    user.categoryCount = categories.length;
    user.categories = categories.sort().map(category => user.bestByCategory[category]);
    return user;
  }).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.categoryCount !== a.categoryCount) return b.categoryCount - a.categoryCount;
    return String(a.nickname || a.name || a.userKey).localeCompare(String(b.nickname || b.name || b.userKey), 'ko');
  });

  return { users: users, rankings: rankings };
}

function formatQuizKingAuditUser_(user) {
  if (!user) return '없음';
  const name = user.nickname || user.name || '익명';
  const classText = user.grade && user.classNo && user.number
    ? user.grade + '학년 ' + user.classNo + '반 ' + user.number + '번'
    : '';
  const idText = user.userId ? 'userId=' + user.userId : user.userKey;
  return [name, classText, idText].filter(Boolean).join(' / ');
}

function printQuizKingAuditResult_(result) {
  const expectedLeaderScore = 836;
  const leader = result && result.rankings && result.rankings.length ? result.rankings[0] : null;
  const leaderScore = leader ? Number(leader.totalScore) || 0 : 0;
  const diff = leaderScore - expectedLeaderScore;

  Logger.log('[퀴즈왕 점검] records=%s, users=%s', result.recordCount, result.rankings.length);
  Logger.log('[퀴즈왕 점검] 새 기준 1등: %s', formatQuizKingAuditUser_(leader));
  Logger.log('[퀴즈왕 점검] 새 기준 1등 총점: %s', leaderScore);
  Logger.log('[퀴즈왕 점검] 현재 비교 기준 836 일치 여부: %s', leaderScore === expectedLeaderScore ? '일치' : '불일치');
  Logger.log('[퀴즈왕 점검] 836과 차이: %s', diff);

  if (leader) {
    Logger.log('[퀴즈왕 점검] 1등 영역별 반영 내역');
    leader.categories.forEach(item => {
      Logger.log(
        '- 영역=%s, 점수=%s, 모드=%s, quizTitle=%s, row=%s, 시간=%s',
        item.category,
        item.score,
        item.mode,
        item.quizTitle || '',
        item.rowNumber,
        item.elapsedText || formatElapsedSeconds(item.elapsedSeconds)
      );
    });
  }

  Logger.log('[퀴즈왕 점검] 새 기준 상위 10명');
  result.rankings.slice(0, 10).forEach((user, index) => {
    Logger.log(
      '%s위: %s / 총점=%s / 반영영역=%s',
      index + 1,
      formatQuizKingAuditUser_(user),
      user.totalScore,
      user.categoryCount
    );
  });
}

function debugQuizKingLeaderScoreByCategoryBest() {
  const records = getQuizKingAuditRecords_();
  const result = buildQuizKingScoreByCategoryBest_(records);
  result.recordCount = records.length;
  printQuizKingAuditResult_(result);

  const leader = result.rankings.length ? result.rankings[0] : null;
  return {
    ok: true,
    recordCount: records.length,
    userCount: result.rankings.length,
    expectedLeaderScore: 836,
    leaderScore: leader ? leader.totalScore : 0,
    matches836: !!leader && leader.totalScore === 836,
    differenceFrom836: leader ? leader.totalScore - 836 : -836,
    leader: leader ? {
      userKey: leader.userKey,
      userId: leader.userId,
      nickname: leader.nickname,
      name: leader.name,
      grade: leader.grade,
      classNo: leader.classNo,
      number: leader.number,
      totalScore: leader.totalScore,
      categoryCount: leader.categoryCount,
      categories: leader.categories.map(item => ({
        category: item.category,
        score: item.score,
        mode: item.mode,
        quizTitle: item.quizTitle,
        rowNumber: item.rowNumber,
        elapsedText: item.elapsedText
      }))
    } : null,
    top10: result.rankings.slice(0, 10).map((user, index) => ({
      rank: index + 1,
      userKey: user.userKey,
      userId: user.userId,
      nickname: user.nickname,
      name: user.name,
      grade: user.grade,
      classNo: user.classNo,
      number: user.number,
      totalScore: user.totalScore,
      categoryCount: user.categoryCount
    }))
  };
}

function getFullRankings(rankingMode) {
  const startedAt = logPerfStart_('getFullRankings');
  const rows = getRankingRecordRows_();
  const result = buildRankingsFromRows_(rows, true, rankingMode);
  logPerf_('getFullRankings', startedAt, 'rows=' + rows.length);
  return result;
}

function getLegacyRankings() {
  return buildRankingsFromRows_(getLegacyRankingRows_(), false);
}

function getEmptyRankingResult_() {
  var base = {
    "티니핑": [], "맞춤법": [], "아재개그": [],
    "단어(다의어·동형이의어)": [],
    "독서": [],
    "독서(지엠오 아이)": [],
    "독서(지앰오 아이)": [],
    "수학(곱셈과 나눗셈)": [],
    "수학(난수퀴즈)": [],
    "포켓몬(쉬움)": [], "포켓몬(보통)": [], "포켓몬(어려움)": [], "포켓몬(헬)": [],
    "인물(역사 인물)": [], "인물(아이돌)": [], "인물(애니)": []
  };

  // 사회목록 동적 추가: "사회(title)" 형식
  try {
    readSubjectQuizOptions_('사회').forEach(function(quiz) {
      if (!quiz.title) return;
      if (quiz.quizId === 'history-people') return; // base에 "인물(역사 인물)"로 이미 존재
      var key = '사회(' + quiz.title + ')';
      if (!(key in base)) base[key] = [];
    });
  } catch(e) {}

  // 국어목록 동적 추가: 완독형 → "독서(title)", 나머지 → title 그대로
  try {
    getKoreanQuizOptions().forEach(function(quiz) {
      if (!quiz.title) return;
      var key = quiz.completionType === 'complete' ? '독서(' + quiz.title + ')' : quiz.title;
      if (!(key in base)) base[key] = [];
    });
  } catch(e) {}

  // 수학목록 동적 추가: "수학(title)" 형식
  try {
    getMathQuizOptions().forEach(function(quiz) {
      if (!quiz.title) return;
      var key = '수학(' + quiz.title + ')';
      if (!(key in base)) base[key] = [];
    });
  } catch(e) {}

  return base;
}

function getReadingBookTitleFromRankingCategory_(category) {
  const text = String(category || '').trim();
  const match = text.match(/^독서\((.+)\)$/);
  return match ? match[1].trim() : '';
}

function getRankingAggregationCategories_(category) {
  const normalized = normalizeRankingCategory(category);
  const categories = [normalized];
  if (getReadingBookTitleFromRankingCategory_(normalized) && categories.indexOf('독서') === -1) {
    categories.push('독서');
  }
  return categories;
}

function getRankingRecordRows_() {
  const startedAt = logPerfStart_('getRankingRecordRows_');
  const sheetResult = ensureRankingRecordSheet();
  if (sheetResult.error) return [];
  const sheet = sheetResult.sheet;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  logPerf_('getRankingRecordRows_', startedAt, 'rows=' + rows.length);
  return rows;
}

function getLegacyRankingRows_() {
  const startedAt = logPerfStart_('getLegacyRankingRows_');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return [];
  const sheet = ss.getSheetByName('기록저장');
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  logPerf_('getLegacyRankingRows_', startedAt, 'rows=' + rows.length);
  return rows;
}

function isBetterRankingEntry_(next, current, useElapsedTime) {
  if (!current) return true;
  if (next.score !== current.score) return next.score > current.score;
  if (!useElapsedTime) return false;
  const nextTime = Number(next.elapsedSeconds) || 999999999;
  const currentTime = Number(current.elapsedSeconds) || 999999999;
  return nextTime < currentTime;
}

function buildRankingsFromRows_(rows, useElapsedTime, rankingMode) {
  const startedAt = logPerfStart_('buildRankingsFromRows_');
  const ranks = getEmptyRankingResult_();
  if (!rows || !rows.length) return ranks;
  const rankingModeFilter = useElapsedTime ? normalizeRankingMode_(rankingMode) : '';

  const latestMemberMap = getLatestMemberMap_({ skipTitleResolution: true });
  const bestByCategory = {};
  Object.keys(ranks).forEach(category => bestByCategory[category] = {});

  rows.forEach(r => {
    if (useElapsedTime && normalizeRankingMode_(r[10]) !== rankingModeFilter) return;

    const recordName = String(r[1] || '').trim() || '익명';
    const rawCategory = String(r[2] || '').trim();
    const category = normalizeRankingCategory(rawCategory);
    const targetCategories = getRankingAggregationCategories_(rawCategory).filter(targetCategory => bestByCategory[targetCategory]);
    if (!targetCategories.length) return;

    const score = Number(r[3]);
    if (isNaN(score)) return;

    const userId = String(r[4] || '').trim();
    const member = userId ? latestMemberMap[userId] : null;
    if (member && !isActiveStudentMember_(member)) return;
    const key = userId ? `userId:${userId}` : `name:${recordName}`;
    const displayName = (member && member.nickname) || recordName;
    const entry = {
      name: displayName,
      nickname: displayName,
      score: score,
      userId: userId,
      grade: (member && member.grade) || String(r[5] || '').trim(),
      classNo: (member && member.classNo) || String(r[6] || '').trim(),
      number: (member && member.number) || String(r[7] || '').trim(),
      profileImageUrl: member && member.profileImageUrl ? toDisplayImageUrl(member.profileImageUrl) : '',
      school: (member && member.school) || '',
      schoolShortName: (member && member.schoolShortName) || '',
      rankingMessage: (member && member.rankingMessage) || '',
      selectedTitleId: (member && member.selectedTitleId) || '',
      selectedTitle: (member && member.selectedTitle) || '',
      selectedTitleThemeClass: (member && member.selectedTitleThemeClass) || '',
      selectedTitleTierClass: (member && member.selectedTitleTierClass) || '',
      selectedTitleEffectClass: (member && member.selectedTitleEffectClass) || '',
      elapsedSeconds: useElapsedTime ? Number(r[8]) || 0 : 0,
      elapsedText: useElapsedTime ? String(r[9] || formatElapsedSeconds(r[8])).trim() : '',
      rankingMode: normalizeRankingMode_(r[10]),
      bookTitle: getReadingBookTitleFromRankingCategory_(category)
    };

    targetCategories.forEach(targetCategory => {
      const targetEntry = Object.assign({}, entry, { category: targetCategory });
      if (isBetterRankingEntry_(targetEntry, bestByCategory[targetCategory][key], useElapsedTime)) {
        bestByCategory[targetCategory][key] = targetEntry;
      } else if (userId && member && member.nickname) {
        bestByCategory[targetCategory][key].name = member.nickname;
        bestByCategory[targetCategory][key].nickname = member.nickname;
        bestByCategory[targetCategory][key].grade = member.grade || bestByCategory[targetCategory][key].grade;
        bestByCategory[targetCategory][key].classNo = member.classNo || bestByCategory[targetCategory][key].classNo;
        bestByCategory[targetCategory][key].number = member.number || bestByCategory[targetCategory][key].number;
        bestByCategory[targetCategory][key].profileImageUrl = member.profileImageUrl ? toDisplayImageUrl(member.profileImageUrl) : bestByCategory[targetCategory][key].profileImageUrl;
        bestByCategory[targetCategory][key].school = member.school || bestByCategory[targetCategory][key].school;
        bestByCategory[targetCategory][key].schoolShortName = member.schoolShortName || bestByCategory[targetCategory][key].schoolShortName;
        bestByCategory[targetCategory][key].rankingMessage = member.rankingMessage || '';
        bestByCategory[targetCategory][key].selectedTitleId = member.selectedTitleId || '';
        bestByCategory[targetCategory][key].selectedTitle = member.selectedTitle || '';
        bestByCategory[targetCategory][key].selectedTitleThemeClass = member.selectedTitleThemeClass || '';
        bestByCategory[targetCategory][key].selectedTitleTierClass = member.selectedTitleTierClass || '';
        bestByCategory[targetCategory][key].selectedTitleEffectClass = member.selectedTitleEffectClass || '';
      }
    });
  });
  for (let c in ranks) {
    ranks[c] = Object.values(bestByCategory[c])
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (!useElapsedTime) return 0;
        return (Number(a.elapsedSeconds) || 999999999) - (Number(b.elapsedSeconds) || 999999999);
      })
      .slice(0, 10);
  }
  const displayedUserIds = {};
  Object.keys(ranks).forEach(category => {
    ranks[category].forEach(entry => {
      if (entry.userId) displayedUserIds[entry.userId] = true;
    });
  });
  const titleStatusMap = buildTitleStatusMap_(Object.keys(displayedUserIds));
  Object.keys(ranks).forEach(category => {
    ranks[category].forEach(entry => {
      if (!entry.userId || !entry.selectedTitleId) return;
      const selectedTitle = getSelectedTitleFromStatus_(entry.selectedTitleId, titleStatusMap[entry.userId] || []);
      if (!selectedTitle) {
        entry.selectedTitleId = '';
        entry.selectedTitle = '';
        entry.selectedTitleThemeClass = '';
        entry.selectedTitleTierClass = '';
        entry.selectedTitleEffectClass = '';
        return;
      }
      entry.selectedTitleId = selectedTitle.id;
      entry.selectedTitle = selectedTitle.title;
      entry.selectedTitleThemeClass = selectedTitle.themeClass || '';
      entry.selectedTitleTierClass = selectedTitle.tierClass || '';
      entry.selectedTitleEffectClass = selectedTitle.effectClass || '';
    });
  });
  logPerf_('buildRankingsFromRows_', startedAt, 'rankingMode=' + rankingModeFilter);
  return ranks;
}

function getUserRankingSummary(userId, rankingMode) {
  const startedAt = logPerfStart_('getUserRankingSummary');
  const id = String(userId || '').trim();
  const rankingModeFilter = normalizeRankingMode_(rankingMode);
  const result = {
    tinniping: null,
    spelling: null,
    pokemonEasy: null,
    pokemonNormal: null,
    pokemonHard: null,
    pokemonVeryHard: null,
    dadJoke: null,
    history: null,
    wordRelation: null,
    readingGmo: null,
    mathRandom: null,
    idol: null,
    anime: null,
    _readingRankingItems: getProfileReadingRankingItems_()
  };
  if (!id) {
    logPerf_('getUserRankingSummary', startedAt, 'no userId');
    return result;
  }

  const categoryKeyMap = getProfileRankingCategoryKeyMap_();
  const bestByCategory = {};
  Object.keys(categoryKeyMap).forEach(category => bestByCategory[category] = {});

  const data = getRankingRecordRows_();
  data.forEach(row => {
    if (normalizeRankingMode_(row[10]) !== rankingModeFilter) return;

    const category = normalizeRankingCategory(row[2]);
    if (!bestByCategory[category]) return;

    const score = Number(row[3]);
    if (isNaN(score)) return;

    const rowUserId = String(row[4] || '').trim();
    const recordName = String(row[1] || '').trim() || '익명';
    const key = rowUserId ? `userId:${rowUserId}` : `name:${recordName}`;
    const currentBest = bestByCategory[category][key];
    const nextEntry = {
      score: score,
      userId: rowUserId,
      elapsedSeconds: Number(row[8]) || 0,
      rankingMode: normalizeRankingMode_(row[10])
    };
    if (isBetterRankingEntry_(nextEntry, currentBest, true)) bestByCategory[category][key] = nextEntry;
  });

  Object.keys(categoryKeyMap).forEach(category => {
    const key = categoryKeyMap[category];
    const ranked = Object.values(bestByCategory[category])
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (Number(a.elapsedSeconds) || 999999999) - (Number(b.elapsedSeconds) || 999999999);
      });
    const userIndex = ranked.findIndex(entry => entry.userId === id);
    if (userIndex === -1) return;
    result[key] = {
      rank: userIndex + 1,
      total: ranked.length,
      score: ranked[userIndex].score,
      elapsedText: formatElapsedSeconds(ranked[userIndex].elapsedSeconds)
    };
  });

  logPerf_('getUserRankingSummary', startedAt);
  return result;
}

function normalizeRankingCategory(category) {
  if (category === '애니' || category === '인물(애니 캐릭터)') return '인물(애니)';
  if (category === '수학(난수퀴즈)') return '수학(곱셈과 나눗셈)';
  return category;
}

const SPELLING_REVIEW_SOURCE_SHEET_NAME = '맞춤법문제';
const SPELLING_REVIEW_REPORT_SHEET_NAME = '맞춤법문제_개선검토';
const SPELLING_REVIEW_HEADERS = [
  '검토상태',
  '원본행번호',
  'A열_기존문제',
  'B열_기존정답',
  'C열_기존해설',
  'D열_기존값',
  'E열_기존값',
  'F열_기존값',
  '교체필요이유',
  '난이도평가',
  'A열_새문제제안',
  'B열_새정답제안',
  'C열_새해설제안',
  'D열_새값',
  'E열_새값',
  'F열_새값',
  '맞춤법유형',
  '비고'
];
const SPELLING_REVIEW_MAX_CANDIDATES = 100;
const SPELLING_QUALITY_REPORT_SHEET_NAME = '맞춤법문제_전체점검';
const SPELLING_QUALITY_REPORT_HEADERS = [
  '점검상태',
  '원본행번호',
  'A열_문제',
  'B열_정답',
  'C열_해설',
  '문제유형',
  '심각도',
  '점검내용',
  '수정권장사항',
  '비고'
];

function analyzeSpellingQuestionsToReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  const sourceSheet = ss.getSheetByName(SPELLING_REVIEW_SOURCE_SHEET_NAME);
  if (!sourceSheet) throw new Error(SPELLING_REVIEW_SOURCE_SHEET_NAME + ' 시트를 찾을 수 없습니다.');

  const reviewSheet = ensureSpellingReviewSheet_();
  clearSpellingReviewSheet_(reviewSheet);
  reviewSheet.getRange(1, 1, 1, SPELLING_REVIEW_HEADERS.length).setValues([SPELLING_REVIEW_HEADERS]);

  const lastRow = sourceSheet.getLastRow();
  if (lastRow < 2) {
    reviewSheet.getRange(2, 1).setValue('분석할 데이터 없음');
    Logger.log('[맞춤법문제 분석] scannedRows=0, candidateCount=0');
    return {
      scannedRows: 0,
      candidateCount: 0,
      reviewSheetName: SPELLING_REVIEW_REPORT_SHEET_NAME
    };
  }

  const rows = sourceSheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const inspected = [];
  const typeCounts = {};

  rows.forEach((row, index) => {
    const hasData = row.some(value => normalizeSpellingCellText_(value));
    if (!hasData) return;

    const classification = classifySpellingQuestionForReview_(row[0], row[1], row[2]);
    inspected.push({
      rowNumber: index + 2,
      row: row,
      classification: classification
    });

    if (!classification.improved && classification.type !== '기타') {
      typeCounts[classification.type] = (typeCounts[classification.type] || 0) + 1;
    }
  });

  if (!inspected.length) {
    reviewSheet.getRange(2, 1).setValue('분석할 데이터 없음');
    Logger.log('[맞춤법문제 분석] scannedRows=0, candidateCount=0');
    return {
      scannedRows: 0,
      candidateCount: 0,
      reviewSheetName: SPELLING_REVIEW_REPORT_SHEET_NAME
    };
  }

  inspected.forEach(item => {
    const classification = item.classification;
    if (classification.improved) {
      classification.needsReview = false;
      return;
    }
    if (classification.type !== '기타' && typeCounts[classification.type] >= 4) {
      classification.score += 1;
      classification.reasons.push('같은 맞춤법 유형이 여러 번 반복되어 유형 편중 가능성이 있습니다.');
    }
    classification.needsReview = classification.score >= 2 || classification.reasons.length >= 2;
    classification.difficulty = classification.score >= 5 ? '매우 쉬움/교체 우선' : classification.score >= 3 ? '쉬움/교체 검토' : '보통';
  });

  let candidates = inspected
    .filter(item => item.classification.needsReview)
    .sort((a, b) => {
      if (b.classification.score !== a.classification.score) return b.classification.score - a.classification.score;
      return a.rowNumber - b.rowNumber;
    });
  if (SPELLING_REVIEW_MAX_CANDIDATES > 0) {
    candidates = candidates.slice(0, SPELLING_REVIEW_MAX_CANDIDATES);
  }

  if (!candidates.length) {
    reviewSheet.getRange(2, 1).setValue('교체 후보 없음');
    Logger.log('[맞춤법문제 분석] scannedRows=%s, candidateCount=0', inspected.length);
    return {
      scannedRows: inspected.length,
      candidateCount: 0,
      reviewSheetName: SPELLING_REVIEW_REPORT_SHEET_NAME
    };
  }

  const reportRows = candidates.map((item, index) => {
    const row = item.row;
    const classification = item.classification;
    const suggestion = buildSpellingReplacementSuggestion_(index);

    return [
      '검토필요',
      item.rowNumber,
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      classification.reasons.join('\n'),
      classification.difficulty,
      suggestion.question,
      suggestion.answer,
      suggestion.explanation,
      '',
      '',
      '',
      suggestion.type,
      '자동 분석 결과입니다. 최종 반영 전 원본 문항과 새 제안을 직접 검토하세요.'
    ];
  });

  reviewSheet.getRange(2, 1, reportRows.length, SPELLING_REVIEW_HEADERS.length).setValues(reportRows);
  reviewSheet.setFrozenRows(1);
  reviewSheet.autoResizeColumns(1, SPELLING_REVIEW_HEADERS.length);

  Logger.log('[맞춤법문제 분석] scannedRows=%s, candidateCount=%s', inspected.length, reportRows.length);
  return {
    scannedRows: inspected.length,
    candidateCount: reportRows.length,
    reviewSheetName: SPELLING_REVIEW_REPORT_SHEET_NAME
  };
}

function applyApprovedSpellingQuestionRevisions(dryRun) {
  const isDryRun = dryRun !== false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  const sourceSheet = ss.getSheetByName(SPELLING_REVIEW_SOURCE_SHEET_NAME);
  if (!sourceSheet) throw new Error(SPELLING_REVIEW_SOURCE_SHEET_NAME + ' 시트를 찾을 수 없습니다.');

  const reviewSheet = ss.getSheetByName(SPELLING_REVIEW_REPORT_SHEET_NAME);
  if (!reviewSheet) throw new Error(SPELLING_REVIEW_REPORT_SHEET_NAME + ' 시트를 찾을 수 없습니다.');

  const reviewLastRow = reviewSheet.getLastRow();
  const reviewLastColumn = reviewSheet.getLastColumn();
  if (reviewLastRow < 2 || reviewLastColumn < 1) {
    Logger.log('[맞춤법문제 반영] dryRun=%s, approvedCount=0, appliedCount=0, skippedCount=0', isDryRun);
    return {
      dryRun: isDryRun,
      approvedCount: 0,
      appliedCount: 0,
      skippedCount: 0,
      errors: []
    };
  }

  const headerValues = reviewSheet.getRange(1, 1, 1, reviewLastColumn).getValues()[0];
  const headerMap = getSpellingReviewHeaderMap_(headerValues);
  const rows = reviewSheet.getRange(2, 1, reviewLastRow - 1, reviewLastColumn).getValues();
  const approvedItems = [];

  rows.forEach((row, index) => {
    const status = normalizeSpellingCellText_(row[headerMap['검토상태'] - 1]);
    if (status !== '승인') return;
    approvedItems.push({
      reviewRowNumber: index + 2,
      row: row
    });
  });

  const result = {
    dryRun: isDryRun,
    approvedCount: approvedItems.length,
    appliedCount: 0,
    skippedCount: 0,
    errors: []
  };

  if (!approvedItems.length) {
    Logger.log('[맞춤법문제 반영] dryRun=%s, approvedCount=0, appliedCount=0, skippedCount=0', isDryRun);
    return result;
  }

  approvedItems.forEach(item => {
    const validation = validateSpellingRevisionRow_(item, headerMap, sourceSheet);
    if (!validation.valid) {
      result.skippedCount += 1;
      result.errors.push({
        reviewRowNumber: item.reviewRowNumber,
        sourceRowNumber: validation.sourceRowNumber || '',
        message: validation.message
      });

      if (!isDryRun) {
        reviewSheet.getRange(item.reviewRowNumber, headerMap['비고']).setValue(validation.message);
      }
      Logger.log(
        '[맞춤법문제 반영] SKIP reviewRow=%s, sourceRow=%s, reason=%s',
        item.reviewRowNumber,
        validation.sourceRowNumber || '',
        validation.message
      );
      if (validation.mismatch) {
        Logger.log(
          '[맞춤법문제 반영] MISMATCH reviewRow=%s, sourceRow=%s, reviewOldA="%s", sourceCurrentA="%s", reviewOldB="%s", sourceCurrentB="%s", reviewOldC="%s", sourceCurrentC="%s"',
          item.reviewRowNumber,
          validation.sourceRowNumber,
          validation.oldValues[0],
          validation.currentValues[0],
          validation.oldValues[1],
          validation.currentValues[1],
          validation.oldValues[2],
          validation.currentValues[2]
        );
      }
      return;
    }

    Logger.log(
      '[맞춤법문제 반영] %s sourceRow=%s A: "%s" -> "%s", B: "%s" -> "%s", C: "%s" -> "%s"',
      isDryRun ? 'DRY_RUN' : 'APPLY',
      validation.sourceRowNumber,
      validation.currentValues[0],
      validation.newValues[0],
      validation.currentValues[1],
      validation.newValues[1],
      validation.currentValues[2],
      validation.newValues[2]
    );

    if (isDryRun) return;

    sourceSheet.getRange(validation.sourceRowNumber, 1, 1, 3).setValues([validation.newValues]);
    reviewSheet.getRange(item.reviewRowNumber, headerMap['검토상태']).setValue('반영완료');
    reviewSheet.getRange(item.reviewRowNumber, headerMap['비고']).setValue(writeSpellingRevisionApplyLog_());
    result.appliedCount += 1;
  });

  Logger.log(
    '[맞춤법문제 반영] dryRun=%s, approvedCount=%s, appliedCount=%s, skippedCount=%s',
    result.dryRun,
    result.approvedCount,
    result.appliedCount,
    result.skippedCount
  );
  return result;
}

function dryRunApprovedSpellingQuestionRevisions() {
  return applyApprovedSpellingQuestionRevisions(true);
}

function applyApprovedSpellingQuestionRevisionsNow() {
  return applyApprovedSpellingQuestionRevisions(false);
}

function inspectSpellingQuestionsQuality() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  const sourceSheet = ss.getSheetByName(SPELLING_REVIEW_SOURCE_SHEET_NAME);
  if (!sourceSheet) throw new Error(SPELLING_REVIEW_SOURCE_SHEET_NAME + ' 시트를 찾을 수 없습니다.');

  const reportSheet = ensureSpellingQualityReportSheet_();
  clearSpellingQualityReportSheet_(reportSheet);
  reportSheet.getRange(1, 1, 1, SPELLING_QUALITY_REPORT_HEADERS.length).setValues([SPELLING_QUALITY_REPORT_HEADERS]);

  const lastRow = sourceSheet.getLastRow();
  if (lastRow < 2) {
    reportSheet.getRange(2, 1).setValue('점검할 데이터 없음');
    Logger.log('[맞춤법문제 전체점검] scannedRows=0, issueCount=0, high=0, medium=0, low=0');
    return {
      scannedRows: 0,
      issueCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      reportSheetName: SPELLING_QUALITY_REPORT_SHEET_NAME
    };
  }

  const rows = sourceSheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const records = [];
  const exactQuestionMap = {};
  const normalizedQuestionMap = {};
  const questionAnswerMap = {};
  const choicePairMap = {};

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const question = row[0];
    const answer = row[1];
    const explanation = row[2];
    const hasData = row.some(value => normalizeSpellingCellText_(value));
    if (!hasData) return;

    const questionText = normalizeSpellingCellText_(question);
    const answerText = normalizeSpellingCellText_(answer);
    const questionKey = normalizeSpellingQualityText_(question);
    const answerKey = normalizeSpellingQualityText_(answer);
    const choicePair = extractSpellingChoicePair_(questionText);
    const record = {
      rowNumber: rowNumber,
      row: row,
      questionText: questionText,
      answerText: answerText,
      explanationText: normalizeSpellingCellText_(explanation),
      questionKey: questionKey,
      answerKey: answerKey,
      choicePair: choicePair
    };
    records.push(record);

    if (questionText) {
      if (!exactQuestionMap[questionText]) exactQuestionMap[questionText] = [];
      exactQuestionMap[questionText].push(rowNumber);
    }
    if (questionKey) {
      if (!normalizedQuestionMap[questionKey]) normalizedQuestionMap[questionKey] = [];
      normalizedQuestionMap[questionKey].push(rowNumber);
    }
    if (questionKey || answerKey) {
      const comboKey = questionKey + '||' + answerKey;
      if (!questionAnswerMap[comboKey]) questionAnswerMap[comboKey] = [];
      questionAnswerMap[comboKey].push(rowNumber);
    }
    if (choicePair && choicePair.valid) {
      const left = normalizeSpellingQualityText_(choicePair.left);
      const right = normalizeSpellingQualityText_(choicePair.right);
      const pairKey = [left, right].sort().join('/');
      if (pairKey) {
        if (!choicePairMap[pairKey]) choicePairMap[pairKey] = [];
        choicePairMap[pairKey].push(rowNumber);
      }
    }
  });

  const reportRows = [];
  const severityCounts = { '높음': 0, '중간': 0, '낮음': 0 };

  records.forEach(record => {
    const issue = classifySpellingQualityIssue_(
      record,
      exactQuestionMap,
      normalizedQuestionMap,
      questionAnswerMap,
      choicePairMap
    );
    if (!issue) return;

    severityCounts[issue.severity] += 1;
    reportRows.push([
      '확인필요',
      record.rowNumber,
      record.row[0],
      record.row[1],
      record.row[2],
      issue.types.join('\n'),
      issue.severity,
      issue.messages.join('\n'),
      issue.recommendations.join('\n'),
      '자동 점검 결과입니다. 원본 수정 전 직접 확인하세요.'
    ]);
  });

  if (reportRows.length) {
    reportSheet.getRange(2, 1, reportRows.length, SPELLING_QUALITY_REPORT_HEADERS.length).setValues(reportRows);
    reportSheet.setFrozenRows(1);
    reportSheet.autoResizeColumns(1, SPELLING_QUALITY_REPORT_HEADERS.length);
  } else {
    reportSheet.getRange(2, 1).setValue('점검 결과 문제 없음');
  }

  Logger.log(
    '[맞춤법문제 전체점검] scannedRows=%s, issueCount=%s, high=%s, medium=%s, low=%s',
    records.length,
    reportRows.length,
    severityCounts['높음'],
    severityCounts['중간'],
    severityCounts['낮음']
  );

  return {
    scannedRows: records.length,
    issueCount: reportRows.length,
    highCount: severityCounts['높음'],
    mediumCount: severityCounts['중간'],
    lowCount: severityCounts['낮음'],
    reportSheetName: SPELLING_QUALITY_REPORT_SHEET_NAME
  };
}

function analyzeDuplicateSpellingQuestionsToReview() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  const sourceSheet = ss.getSheetByName(SPELLING_REVIEW_SOURCE_SHEET_NAME);
  if (!sourceSheet) throw new Error(SPELLING_REVIEW_SOURCE_SHEET_NAME + ' 시트를 찾을 수 없습니다.');

  const qualitySheet = ss.getSheetByName(SPELLING_QUALITY_REPORT_SHEET_NAME);
  if (!qualitySheet) throw new Error(SPELLING_QUALITY_REPORT_SHEET_NAME + ' 시트를 찾을 수 없습니다.');

  const reviewSheet = ensureSpellingReviewSheet_();
  clearSpellingReviewSheet_(reviewSheet);
  reviewSheet.getRange(1, 1, 1, SPELLING_REVIEW_HEADERS.length).setValues([SPELLING_REVIEW_HEADERS]);

  const qualityLastRow = qualitySheet.getLastRow();
  const qualityLastColumn = qualitySheet.getLastColumn();
  if (qualityLastRow < 2 || qualityLastColumn < 1) {
    reviewSheet.getRange(2, 1).setValue('A열 완전 중복 후보 없음');
    Logger.log('[맞춤법 중복 검토] duplicateRows=0, candidateCount=0');
    return {
      duplicateRows: 0,
      candidateCount: 0,
      reviewSheetName: SPELLING_REVIEW_REPORT_SHEET_NAME
    };
  }

  const qualityHeaders = qualitySheet.getRange(1, 1, 1, qualityLastColumn).getValues()[0];
  const qualityHeaderMap = getSpellingQualityHeaderMap_(qualityHeaders);
  const qualityRows = qualitySheet.getRange(2, 1, qualityLastRow - 1, qualityLastColumn).getValues();
  const sourceRowNumbers = [];
  const seenSourceRows = {};

  qualityRows.forEach(row => {
    const typeText = normalizeSpellingCellText_(row[qualityHeaderMap['문제유형'] - 1]);
    const detailText = normalizeSpellingCellText_(row[qualityHeaderMap['점검내용'] - 1]);
    const isExactDuplicate = typeText.indexOf('A열 완전 중복') !== -1 || detailText.indexOf('A열 문제가 완전히 같은 행') !== -1;
    if (!isExactDuplicate) return;

    const sourceRowNumber = Number(normalizeSpellingCellText_(row[qualityHeaderMap['원본행번호'] - 1]));
    if (!sourceRowNumber || isNaN(sourceRowNumber) || sourceRowNumber < 2 || seenSourceRows[sourceRowNumber]) return;
    seenSourceRows[sourceRowNumber] = true;
    sourceRowNumbers.push(sourceRowNumber);
  });

  if (!sourceRowNumbers.length) {
    reviewSheet.getRange(2, 1).setValue('A열 완전 중복 후보 없음');
    Logger.log('[맞춤법 중복 검토] duplicateRows=0, candidateCount=0');
    return {
      duplicateRows: 0,
      candidateCount: 0,
      reviewSheetName: SPELLING_REVIEW_REPORT_SHEET_NAME
    };
  }

  sourceRowNumbers.sort((a, b) => a - b);
  const groups = {};
  const sourceLastRow = sourceSheet.getLastRow();
  sourceRowNumbers.forEach(rowNumber => {
    if (rowNumber > sourceLastRow) return;
    const sourceRow = sourceSheet.getRange(rowNumber, 1, 1, 6).getValues()[0];
    const questionKey = normalizeSpellingCellText_(sourceRow[0]);
    if (!questionKey) return;
    if (!groups[questionKey]) groups[questionKey] = [];
    groups[questionKey].push({
      rowNumber: rowNumber,
      row: sourceRow
    });
  });

  const existingQuestionKeys = {};
  if (sourceLastRow >= 2) {
    sourceSheet.getRange(2, 1, sourceLastRow - 1, 1).getValues().forEach((row, index) => {
      const rowNumber = index + 2;
      const key = normalizeSpellingSuggestionKey_(row[0]);
      if (!key) return;
      if (!existingQuestionKeys[key]) existingQuestionKeys[key] = [];
      existingQuestionKeys[key].push(rowNumber);
    });
  }

  const reportRows = [];
  const usedNewQuestionKeys = {};
  const usedReplacementTypes = {};
  let suggestionIndex = 0;
  Object.keys(groups).sort().forEach(question => {
    const group = groups[question].sort((a, b) => a.rowNumber - b.rowNumber);
    group.forEach((item, groupIndex) => {
      if (groupIndex === 0 && group.length > 1) return;

      const suggestion = buildUniqueSpellingReplacementSuggestion_(
        item.row[0],
        item.rowNumber,
        suggestionIndex,
        existingQuestionKeys,
        usedNewQuestionKeys,
        usedReplacementTypes
      );
      suggestionIndex += 1;
      reportRows.push([
        suggestion.duplicateRisk ? '수정필요' : '검토필요',
        item.rowNumber,
        item.row[0],
        item.row[1],
        item.row[2],
        item.row[3],
        item.row[4],
        item.row[5],
        'A열 완전 중복으로 인한 문항 다양화 필요',
        '중복문항',
        suggestion.question,
        suggestion.answer,
        avoidLeadingQuoteForSpellingExplanation_(suggestion.explanation),
        '',
        '',
        '',
        suggestion.type,
        suggestion.duplicateRisk ? '자동 제안 중복 가능성 - 수동 수정 필요' : '전체점검 시트의 A열 완전 중복 항목에서 생성한 교체 후보입니다.'
      ]);
    });
  });

  validateSpellingSuggestionUniqueness_(reportRows);

  if (reportRows.length) {
    reviewSheet.getRange(2, 1, reportRows.length, SPELLING_REVIEW_HEADERS.length).setValues(reportRows);
    reviewSheet.setFrozenRows(1);
    reviewSheet.autoResizeColumns(1, SPELLING_REVIEW_HEADERS.length);
  } else {
    reviewSheet.getRange(2, 1).setValue('A열 완전 중복 후보 없음');
  }

  Logger.log('[맞춤법 중복 검토] duplicateRows=%s, candidateCount=%s', sourceRowNumbers.length, reportRows.length);
  return {
    duplicateRows: sourceRowNumbers.length,
    candidateCount: reportRows.length,
    reviewSheetName: SPELLING_REVIEW_REPORT_SHEET_NAME
  };
}

function getSpellingReviewHeaderMap_(headerValues) {
  const headerMap = {};
  headerValues.forEach((value, index) => {
    const header = normalizeSpellingCellText_(value);
    if (header) headerMap[header] = index + 1;
  });

  [
    '검토상태',
    '원본행번호',
    'A열_기존문제',
    'B열_기존정답',
    'C열_기존해설',
    'A열_새문제제안',
    'B열_새정답제안',
    'C열_새해설제안',
    '비고'
  ].forEach(header => {
    if (!headerMap[header]) throw new Error('검토 시트 필수 헤더가 없습니다: ' + header);
  });

  return headerMap;
}

function getSpellingQualityHeaderMap_(headerValues) {
  const headerMap = {};
  headerValues.forEach((value, index) => {
    const header = normalizeSpellingCellText_(value);
    if (header) headerMap[header] = index + 1;
  });

  ['원본행번호', '문제유형', '점검내용'].forEach(header => {
    if (!headerMap[header]) throw new Error('전체점검 시트 필수 헤더가 없습니다: ' + header);
  });

  return headerMap;
}

function validateSpellingRevisionRow_(item, headerMap, sourceSheet) {
  const row = item.row;
  const sourceRowText = normalizeSpellingCellText_(row[headerMap['원본행번호'] - 1]);
  const sourceRowNumber = Number(sourceRowText);
  const oldValues = [
    row[headerMap['A열_기존문제'] - 1],
    row[headerMap['B열_기존정답'] - 1],
    row[headerMap['C열_기존해설'] - 1]
  ];
  const newValues = [
    row[headerMap['A열_새문제제안'] - 1],
    row[headerMap['B열_새정답제안'] - 1],
    row[headerMap['C열_새해설제안'] - 1]
  ];

  if (!sourceRowText || isNaN(sourceRowNumber) || Math.floor(sourceRowNumber) !== sourceRowNumber) {
    return {
      valid: false,
      sourceRowNumber: sourceRowText,
      message: '원본행번호가 올바른 숫자가 아닙니다.'
    };
  }

  if (sourceRowNumber < 2) {
    return {
      valid: false,
      sourceRowNumber: sourceRowNumber,
      message: '원본행번호는 2 이상이어야 합니다.'
    };
  }

  if (sourceRowNumber > sourceSheet.getLastRow()) {
    return {
      valid: false,
      sourceRowNumber: sourceRowNumber,
      message: '원본 맞춤법문제 시트에 해당 행이 없습니다.'
    };
  }

  if (!normalizeSpellingCellText_(newValues[0])) {
    return {
      valid: false,
      sourceRowNumber: sourceRowNumber,
      message: 'A열_새문제제안이 비어 있습니다.'
    };
  }

  if (!normalizeSpellingCellText_(newValues[1])) {
    return {
      valid: false,
      sourceRowNumber: sourceRowNumber,
      message: 'B열_새정답제안이 비어 있습니다.'
    };
  }

  if (!normalizeSpellingCellText_(newValues[2])) {
    return {
      valid: false,
      sourceRowNumber: sourceRowNumber,
      message: 'C열_새해설제안이 비어 있습니다.'
    };
  }

  const currentValues = sourceSheet.getRange(sourceRowNumber, 1, 1, 3).getValues()[0];
  for (let i = 0; i < 3; i += 1) {
    if (normalizeSpellingCompareText_(currentValues[i]) !== normalizeSpellingCompareText_(oldValues[i])) {
      return {
        valid: false,
        sourceRowNumber: sourceRowNumber,
        message: '원본 A/B/C 현재값이 검토 시트의 기존값과 달라 반영하지 않았습니다.',
        mismatch: true,
        oldValues: oldValues,
        currentValues: currentValues
      };
    }
  }

  return {
    valid: true,
    sourceRowNumber: sourceRowNumber,
    currentValues: currentValues,
    newValues: newValues
  };
}

function writeSpellingRevisionApplyLog_() {
  const timezone = Session.getScriptTimeZone() || 'Asia/Seoul';
  return Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd HH:mm:ss') + ' 반영완료';
}

function ensureSpellingReviewSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(SPELLING_REVIEW_SOURCE_SHEET_NAME);
  const reviewSheet = ss.getSheetByName(SPELLING_REVIEW_REPORT_SHEET_NAME) || ss.insertSheet(SPELLING_REVIEW_REPORT_SHEET_NAME);

  if (sourceSheet && reviewSheet.getSheetId() === sourceSheet.getSheetId()) {
    throw new Error('검토용 시트가 원본 시트와 같을 수 없습니다.');
  }

  return reviewSheet;
}

function clearSpellingReviewSheet_(sheet) {
  if (!sheet || sheet.getName() !== SPELLING_REVIEW_REPORT_SHEET_NAME) {
    throw new Error('검토용 시트에만 보고서를 작성할 수 있습니다.');
  }
  sheet.clearContents();
}

function ensureSpellingQualityReportSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SPELLING_QUALITY_REPORT_SHEET_NAME) || ss.insertSheet(SPELLING_QUALITY_REPORT_SHEET_NAME);
}

function clearSpellingQualityReportSheet_(sheet) {
  if (!sheet || sheet.getName() !== SPELLING_QUALITY_REPORT_SHEET_NAME) {
    throw new Error('맞춤법 전체점검 시트에만 보고서를 작성할 수 있습니다.');
  }
  sheet.clearContents();
}

function extractSpellingChoicePair_(questionText) {
  const text = normalizeSpellingCellText_(questionText);
  const parenMatch = text.match(/[（(]([^()（）]*)[）)]/);
  if (parenMatch) {
    const raw = normalizeSpellingCellText_(parenMatch[1]);
    if (raw.indexOf('/') === -1) {
      return { hasChoice: true, valid: false, raw: raw, issue: '괄호 안 선택지에 /가 없습니다.' };
    }
    const parts = raw.split('/');
    if (parts.length !== 2) {
      return { hasChoice: true, valid: false, raw: raw, issue: '괄호 안 선택지는 2개여야 합니다.' };
    }
    return {
      hasChoice: true,
      valid: true,
      raw: raw,
      left: normalizeSpellingCellText_(parts[0]),
      right: normalizeSpellingCellText_(parts[1])
    };
  }

  const slashMatch = text.match(/([가-힣A-Za-z0-9]+)\s*\/\s*([가-힣A-Za-z0-9]+)/);
  if (slashMatch) {
    return {
      hasChoice: true,
      valid: true,
      raw: slashMatch[0],
      left: normalizeSpellingCellText_(slashMatch[1]),
      right: normalizeSpellingCellText_(slashMatch[2])
    };
  }

  return null;
}

function normalizeSpellingQualityText_(value) {
  return normalizeSpellingCompareText_(value).replace(/[.?!。？！,，]/g, '').trim();
}

function getSpellingExplanationEndingIssue_(explanation) {
  const text = normalizeSpellingCellText_(explanation);
  if (!text) return '';
  if (/(습니다|입니다|합니다|씁니다|맞습니다|사용합니다|의미합니다)\.$/.test(text)) return '해설이 딱딱한 설명체로 끝납니다.';
  if (/다\.$/.test(text) && !/(맞아요|써요|돼요|예요)\.$/.test(text)) return '해설이 ~다. 말투로 끝납니다.';
  return '';
}

function classifySpellingQualityIssue_(record, exactQuestionMap, normalizedQuestionMap, questionAnswerMap, choicePairMap) {
  const types = [];
  const messages = [];
  const recommendations = [];
  let severity = '';

  const addIssue = (type, nextSeverity, message, recommendation) => {
    types.push(type);
    messages.push(message);
    recommendations.push(recommendation);
    severity = getHigherSpellingQualitySeverity_(severity, nextSeverity);
  };

  if (!record.questionText) {
    addIssue('빈값', '높음', 'A열 문제가 비어 있습니다.', '문제 문장을 입력하세요.');
  }
  if (!record.answerText) {
    addIssue('빈값', '높음', 'B열 정답이 비어 있습니다.', '정답 문자열을 입력하세요.');
  }
  if (!record.explanationText) {
    addIssue('빈값', '높음', 'C열 해설이 비어 있습니다.', '정답 이유를 짧은 ~요. 말투로 작성하세요.');
  }

  if (record.questionText && exactQuestionMap[record.questionText] && exactQuestionMap[record.questionText].length > 1) {
    addIssue('A열 완전 중복', '높음', 'A열 문제가 완전히 같은 행이 있습니다: ' + exactQuestionMap[record.questionText].join(', '), '중복 문항인지 확인하고 하나만 남길지 검토하세요.');
  }
  if (record.questionKey && normalizedQuestionMap[record.questionKey] && normalizedQuestionMap[record.questionKey].length > 1) {
    addIssue('중복 의심', '중간', '공백/따옴표를 정리하면 같은 문제인 행이 있습니다: ' + normalizedQuestionMap[record.questionKey].join(', '), '표기 차이만 있는 중복인지 확인하세요.');
  }

  const comboKey = record.questionKey + '||' + record.answerKey;
  if ((record.questionKey || record.answerKey) && questionAnswerMap[comboKey] && questionAnswerMap[comboKey].length > 1) {
    addIssue('A/B 중복', '높음', 'A열+B열 조합이 같은 행이 있습니다: ' + questionAnswerMap[comboKey].join(', '), '같은 문제가 반복 출제되는지 확인하세요.');
  }

  if (record.choicePair) {
    if (!record.choicePair.valid) {
      addIssue('보기쌍 오류', '높음', record.choicePair.issue, '괄호 안을 (정답/오답) 형식으로 정리하세요.');
    } else {
      const left = normalizeSpellingQualityText_(record.choicePair.left);
      const right = normalizeSpellingQualityText_(record.choicePair.right);
      const answer = normalizeSpellingQualityText_(record.answerText);
      const pairKey = [left, right].sort().join('/');

      if (!left || !right) {
        addIssue('보기쌍 오류', '높음', '괄호 안 보기 중 비어 있는 값이 있습니다.', '두 보기를 모두 입력하세요.');
      } else if (left === right) {
        addIssue('보기쌍 오류', '높음', '괄호 안 보기 2개가 동일하거나 사실상 같습니다.', '서로 다른 정답/오답 보기로 수정하세요.');
      }

      if (answer && answer !== left && answer !== right) {
        addIssue('정답 불일치', '높음', 'B열 정답이 괄호 안 보기 중 하나와 일치하지 않습니다.', 'B열 정답을 보기 중 정확한 값 하나로 맞추세요.');
      }

      if (choicePairMap[pairKey] && choicePairMap[pairKey].length > 3) {
        addIssue('보기쌍 반복', '낮음', '같은 보기쌍이 여러 행에서 반복됩니다: ' + choicePairMap[pairKey].join(', '), '유형 편중인지 확인하세요.');
      }

      if (left && right && left !== right && getSpellingEditDistance_(left, right) <= 1) {
        addIssue('단순 오타형', '중간', '정답과 오답 차이가 한 글자 수준이라 너무 쉬울 수 있습니다.', '문맥으로 판단하는 문장형 문제로 바꾸는 것을 검토하세요.');
      }
    }
  } else if (record.questionText && record.questionText.length <= 12) {
    addIssue('문맥 부족', '중간', '문맥 없이 단어 하나만 보고 맞힐 가능성이 높습니다.', '짧은 문장 속에서 맞춤법을 고르게 바꾸세요.');
  }

  const endingIssue = getSpellingExplanationEndingIssue_(record.explanationText);
  if (endingIssue) {
    addIssue('해설 문체', '중간', endingIssue, '초등학생에게 자연스러운 ~요. 말투로 바꾸세요.');
  }

  if (record.explanationText && record.explanationText.length <= 5) {
    addIssue('해설 품질', '중간', '해설이 너무 짧습니다.', '정답을 쓰는 이유를 한 문장으로 설명하세요.');
  }
  if (/(이것!?|이렇게 써요|항상 이것|정답은|외우세요)/.test(record.explanationText)) {
    addIssue('해설 품질', '중간', '해설이 정답 암기 위주라 학습 정보가 부족할 수 있습니다.', '뜻이나 쓰임을 간단히 설명하세요.');
  }
  if (record.answerText && normalizeSpellingQualityText_(record.explanationText) === normalizeSpellingQualityText_(record.answerText)) {
    addIssue('해설 품질', '중간', '해설이 정답만 반복합니다.', '왜 그 정답을 쓰는지 설명을 추가하세요.');
  }
  if (/(용언|어간|어미|조사|부사격|관형사|명사형|활용|축약|음운|형태소)/.test(record.explanationText)) {
    addIssue('해설 난이도', '낮음', '초등학생에게 어려울 수 있는 문법어가 포함되어 있습니다.', '쉬운 말로 풀어 쓸 수 있는지 확인하세요.');
  }

  if (/(무러봐|마시써|무서어|주웟어|머거써|드러가|널버|나잠)/.test(record.questionText)) {
    addIssue('저품질 오답', '중간', '발음대로 쓴 오답이 너무 노골적으로 보입니다.', '생활 문맥에서 헷갈리는 맞춤법 쌍으로 교체하세요.');
  }

  if (!types.length) return null;
  return {
    types: types,
    severity: severity,
    messages: messages,
    recommendations: recommendations
  };
}

function getHigherSpellingQualitySeverity_(current, next) {
  const order = { '': 0, '낮음': 1, '중간': 2, '높음': 3 };
  return order[next] > order[current] ? next : current;
}

function classifySpellingQuestionForReview_(question, answer, explanation) {
  const questionText = normalizeSpellingCellText_(question);
  const answerText = normalizeSpellingCellText_(answer);
  const explanationText = normalizeSpellingCellText_(explanation);
  const compactQuestion = questionText.replace(/\s+/g, '');
  const compactAnswer = answerText.replace(/\s+/g, '');
  const reasons = [];
  let score = 0;
  let type = '기타';

  const typeRules = [
    { type: '되/돼', pattern: /(되|돼|되어)/ },
    { type: '안/않', pattern: /(안|않)/ },
    { type: '왠/웬', pattern: /(왠|웬)/ },
    { type: '어떻게/어떡해', pattern: /(어떻게|어떡해)/ },
    { type: '낫다/낳다/낮다/났다', pattern: /(낫|낳|낮|났)/ },
    { type: '맞히다/맞추다', pattern: /(맞히|맞추)/ },
    { type: '가르치다/가리키다', pattern: /(가르치|가리키)/ },
    { type: '잃어버리다/잊어버리다', pattern: /(잃어|잊어)/ },
    { type: '반드시/반듯이', pattern: /(반드시|반듯이)/ },
    { type: '깨끗이/깨끗히', pattern: /(깨끗이|깨끗히)/ },
    { type: '일찍이/일찌기', pattern: /(일찍이|일찌기)/ },
    { type: '며칠/몇일', pattern: /(며칠|몇일)/ },
    { type: '바라다/바래다', pattern: /(바라|바래)/ },
    { type: '로서/로써', pattern: /(로서|로써)/ },
    { type: '든지/던지', pattern: /(든지|던지)/ },
    { type: '부치다/붙이다', pattern: /(부치|붙이)/ },
    { type: '벌이다/벌리다', pattern: /(벌이|벌리)/ },
    { type: '다르다/틀리다', pattern: /(다르|틀리)/ },
    { type: '결재/결제', pattern: /(결재|결제)/ },
    { type: '역할/역활', pattern: /(역할|역활)/ },
    { type: '금세/금새', pattern: /(금세|금새)/ },
    { type: '설거지/설겆이', pattern: /(설거지|설겆이)/ },
    { type: '통째로/통채로', pattern: /(통째로|통채로)/ },
    { type: '희한하다/희안하다', pattern: /(희한|희안)/ },
    { type: '곰곰이/곰곰히', pattern: /(곰곰이|곰곰히)/ },
    { type: '오랜만에/오랫만에', pattern: /(오랜만|오랫만)/ }
  ];

  typeRules.some(rule => {
    if (rule.pattern.test(questionText) || rule.pattern.test(answerText) || rule.pattern.test(explanationText)) {
      type = rule.type;
      return true;
    }
    return false;
  });

  const choicePair = getSpellingChoicePair_(questionText);
  if (isImprovedSpellingQuestion_(questionText, answerText, explanationText, type, choicePair)) {
    return {
      needsReview: false,
      score: 0,
      reasons: [],
      difficulty: '개선완료 추정',
      type: type,
      improved: true
    };
  }

  if (choicePair) {
    const left = normalizeSpellingCompareText_(choicePair[0]);
    const right = normalizeSpellingCompareText_(choicePair[1]);
    if (left && right && left === right) {
      reasons.push('보기 두 개가 동일하거나 사실상 동일해 문제로 쓰기 어렵습니다.');
      score += 6;
    } else if (left && right && getSpellingEditDistance_(left, right) <= 1) {
      reasons.push('정답과 오답 차이가 단순 오타 수준이라 너무 쉽게 보일 수 있습니다.');
      score += 4;
    }
  }

  if (!questionText || !answerText) {
    reasons.push('문제 또는 정답이 비어 있어 문항으로 쓰기 어렵습니다.');
    score += 4;
  }

  if (questionText.length <= 12 || (/^[가-힣A-Za-z0-9\s/()]+$/.test(questionText) && questionText.split(/\s+/).length <= 2)) {
    reasons.push('문맥 없이 단어 하나만 보고 맞힐 가능성이 높습니다.');
    score += 2;
  }

  if (compactAnswer && compactQuestion.indexOf(compactAnswer) !== -1) {
    reasons.push('문제 안에 정답이 직접 드러나 변별력이 낮을 수 있습니다.');
    score += 2;
  }

  if (/[\/()（）]/.test(questionText)) {
    reasons.push('보기 차이가 눈에 바로 들어와 정답과 오답 차이가 노골적일 수 있습니다.');
    score += 1;
  }

  if (/(무러봐|머거|조아|시러|마니|주웟어|마시써|무서어|일찌기|몇일|역활|금새|설겆이|통채로|희안|곰곰히|오랫만)/.test(questionText)) {
    reasons.push('발음대로 적은 오답이나 실제 생활에서 어색한 형태가 포함된 것으로 보입니다.');
    score += 2;
  }

  if (explanationText.length < 12) {
    reasons.push('해설이 너무 짧아 학습 효과가 낮을 수 있습니다.');
    score += 2;
  } else if (!/(뜻|말|때|경우|문맥|상황|줄임|사용|씁니다|맞습니다|나타냅니다|써요|맞아요|예요)/.test(explanationText)) {
    reasons.push('해설이 규칙이나 문맥을 충분히 설명하지 않을 수 있습니다.');
    score += 1;
  }

  if (questionText.length <= 20 && explanationText.length <= 20) {
    reasons.push('초등 고학년에게 변별력이 낮은 쉬운 문항일 수 있습니다.');
    score += 1;
  }

  return {
    needsReview: false,
    score: score,
    reasons: reasons,
    difficulty: '보통',
    type: type,
    improved: false
  };
}

function getSpellingReplacementTemplatePool_() {
  return [
    { type: '되/돼', question: '오늘 숙제는 집에 가서 해도 (되/돼).', answer: '돼', explanation: "정답인 '돼'는 '되어'의 준말이에요." },
    { type: '되/돼', question: '교실에 지금 들어가도 (되/돼)?', answer: '돼', explanation: "여기서는 '돼'가 맞아요. '되어'로 바꾸어도 자연스러워요." },
    { type: '안/않', question: '비가 와서 운동장에 나가지 (안/않)았다.', answer: '않', explanation: "정답인 '않았다'는 '아니하였다'의 뜻이에요." },
    { type: '안/않', question: '나는 오늘 실내화를 (안/않) 가져왔어요.', answer: '안', explanation: "뒤의 말을 부정할 때는 '안'을 앞에 써요." },
    { type: '왠/웬', question: '오늘은 (왠/웬)일인지 아침부터 기분이 좋았어요.', answer: '웬', explanation: "정답인 '웬'은 '어찌 된'이라는 뜻이에요." },
    { type: '왠/웬', question: '교실 앞에 (왠/웬) 상자가 놓여 있었어요.', answer: '웬', explanation: "까닭을 모르는 일을 말할 때는 '웬'을 써요." },
    { type: '어떻게/어떡해', question: '친구에게 문제 푸는 방법을 (어떻게/어떡해) 설명할까?', answer: '어떻게', explanation: "방법을 나타낼 때는 '어떻게'를 써요." },
    { type: '어떻게/어떡해', question: '우산을 안 가져왔는데 이제 (어떻게/어떡해) 하지?', answer: '어떡해', explanation: "난처한 상황에서는 '어떡해'를 써요." },
    { type: '며칠/몇일', question: '(며칠/몇일) 동안 비가 계속 내렸어요.', answer: '며칠', explanation: "날의 수를 말할 때는 '며칠'이라고 써요." },
    { type: '며칠/몇일', question: '체험학습까지 이제 (며칠/몇일) 남았나요?', answer: '며칠', explanation: "정답인 '며칠'이 바른 표기예요." },
    { type: '금세/금새', question: '간식을 먹으니 기분이 (금세/금새) 좋아졌어요.', answer: '금세', explanation: "정답인 '금세'는 '금시에'가 줄어든 말이에요." },
    { type: '금세/금새', question: '젖은 운동화가 햇볕에 (금세/금새) 말랐어요.', answer: '금세', explanation: "아주 짧은 시간이라는 뜻은 '금세'예요." },
    { type: '오랜만에/오랫만에', question: '친구를 (오랜만에/오랫만에) 만나서 반가웠어요.', answer: '오랜만에', explanation: "'오래간만'의 준말은 '오랜만'이에요." },
    { type: '오랜만에/오랫만에', question: '할머니 댁에 (오랜만에/오랫만에) 갔어요.', answer: '오랜만에', explanation: "정답인 '오랜만에'가 바른 표기예요." },
    { type: '설거지/설겆이', question: '저녁을 먹고 그릇 (설거지/설겆이)를 했어요.', answer: '설거지', explanation: "그릇을 씻는 일은 '설거지'가 맞아요." },
    { type: '설거지/설겆이', question: '오늘은 내가 부엌에서 (설거지/설겆이)를 도왔어요.', answer: '설거지', explanation: "정답인 '설거지'가 바른 표기예요." },
    { type: '희한하다/희안하다', question: '처음 보는 구름 모양이 참 (희한하다/희안하다).', answer: '희한하다', explanation: "드물고 신기하다는 뜻은 '희한하다'로 써요." },
    { type: '희한하다/희안하다', question: '마술사의 손놀림이 정말 (희한했다/희안했다).', answer: '희한했다', explanation: "신기하고 드문 모습은 '희한했다'라고 써요." },
    { type: '역할/역활', question: '모둠 활동에서 각자의 (역할/역활)을 정했어요.', answer: '역할', explanation: "맡아서 해야 하는 일은 '역할'이 맞아요." },
    { type: '역할/역활', question: '연극에서 내가 맡은 (역할/역활)은 왕이에요.', answer: '역할', explanation: "정답인 '역할'이 바른 표기예요." },
    { type: '어이없다/어의없다', question: '말도 안 되는 변명에 모두 (어이없어/어의없어) 했어요.', answer: '어이없어', explanation: "기가 막힐 때는 '어이없다'라고 써요." },
    { type: '하마터면/하마트면', question: '(하마터면/하마트면) 버스를 놓칠 뻔했어요.', answer: '하마터면', explanation: "아슬아슬한 상황을 말할 때는 '하마터면'을 써요." },
    { type: '맞히다/맞추다', question: '퀴즈의 정답을 정확히 (맞혔다/맞췄다).', answer: '맞혔다', explanation: "정답을 알아맞힐 때는 '맞히다'를 써요." },
    { type: '맞히다/맞추다', question: '친구와 퍼즐 조각을 하나씩 (맞혔다/맞췄다).', answer: '맞췄다', explanation: "서로 맞게 끼우거나 비교할 때는 '맞추다'를 써요." },
    { type: '가르치다/가리키다', question: '친구에게 문제 푸는 방법을 (가르쳐/가리켜) 주었어요.', answer: '가르쳐', explanation: "지식이나 방법을 알려 줄 때는 '가르치다'를 써요." },
    { type: '가르치다/가리키다', question: '선생님이 지도에서 우리 고장을 (가르쳤다/가리켰다).', answer: '가리켰다', explanation: "어떤 곳을 집어 보일 때는 '가리키다'를 써요." },
    { type: '잃어버리다/잊어버리다', question: '나는 도서관에 필통을 (잃어버렸다/잊어버렸다).', answer: '잃어버렸다', explanation: "물건이 없어졌을 때는 '잃어버렸다'를 써요." },
    { type: '잃어버리다/잊어버리다', question: '친구와 한 약속을 깜빡 (잃어버렸다/잊어버렸다).', answer: '잊어버렸다', explanation: "기억하지 못할 때는 '잊어버렸다'를 써요." },
    { type: '낫다/낳다/낮다/났다', question: '감기가 어제보다 많이 (낫다/낳다).', answer: '낫다', explanation: "병이나 상처가 좋아질 때는 '낫다'를 써요." },
    { type: '낫다/낳다/낮다/났다', question: '오늘 아침에 이마에 뾰루지가 (났다/낳다).', answer: '났다', explanation: "무엇이 생겼다는 뜻일 때는 '났다'를 써요." },
    { type: '다르다/틀리다', question: '내 생각은 너의 생각과 조금 (다르다/틀리다).', answer: '다르다', explanation: "서로 같지 않다는 뜻은 '다르다'를 써요." },
    { type: '다르다/틀리다', question: '계산한 답이 정답과 (달랐다/틀렸다).', answer: '틀렸다', explanation: "맞지 않거나 잘못되었을 때는 '틀렸다'를 써요." },
    { type: '결재/결제', question: '선생님께 서류 (결재/결제)를 받았어요.', answer: '결재', explanation: "승인받는 일은 '결재'라고 써요." },
    { type: '결재/결제', question: '엄마가 인터넷으로 운동화 값을 (결재/결제)했어요.', answer: '결제', explanation: "돈을 치르는 일은 '결제'라고 써요." },
    { type: '부치다/붙이다', question: '편지를 봉투에 넣어 우체국에서 (부쳤다/붙였다).', answer: '부쳤다', explanation: "편지나 물건을 보낼 때는 '부치다'를 써요." },
    { type: '부치다/붙이다', question: '게시판에 안내문을 (부쳤다/붙였다).', answer: '붙였다', explanation: "무엇을 달라붙게 할 때는 '붙이다'를 써요." },
    { type: '벌이다/벌리다', question: '친구들과 운동장에서 줄넘기 대회를 (벌였다/벌렸다).', answer: '벌였다', explanation: "일을 시작하거나 펼친다는 뜻은 '벌이다'예요." },
    { type: '벌이다/벌리다', question: '동생은 손가락을 활짝 (벌였다/벌렸다).', answer: '벌렸다', explanation: "사이를 넓게 할 때는 '벌리다'를 써요." },
    { type: '바라다/바래다', question: '나는 네가 건강하게 지내길 (바란다/바랜다).', answer: '바란다', explanation: "무엇을 원한다는 뜻은 '바라다'예요." },
    { type: '바람/바램', question: '내 (바람/바램)은 가족이 모두 건강한 거예요.', answer: '바람', explanation: "원하는 마음은 '바람'이라고 써요." },
    { type: '늘이다/늘리다', question: '고무줄을 양쪽으로 잡아 (늘였다/늘렸다).', answer: '늘였다', explanation: "길게 만들 때는 '늘이다'를 써요." },
    { type: '늘이다/늘리다', question: '독서 시간을 하루 10분 더 (늘였다/늘렸다).', answer: '늘렸다', explanation: "수나 양을 많게 할 때는 '늘리다'를 써요." },
    { type: '반드시/반듯이', question: '약속 시간은 (반드시/반듯이) 지켜야 해요.', answer: '반드시', explanation: "'꼭'이라는 뜻일 때는 '반드시'를 써요." },
    { type: '반드시/반듯이', question: '책상 위에 공책을 (반드시/반듯이) 놓았어요.', answer: '반듯이', explanation: "비뚤어지지 않고 바르게 놓을 때는 '반듯이'를 써요." },
    { type: '작다/적다', question: '동생은 나보다 키가 조금 (작다/적다).', answer: '작다', explanation: "크기를 말할 때는 '작다'를 써요." },
    { type: '작다/적다', question: '오늘은 숙제 양이 어제보다 (작다/적다).', answer: '적다', explanation: "수나 양이 많지 않을 때는 '적다'를 써요." },
    { type: '이따가/있다가', question: '(이따가/있다가) 운동장에서 다시 만나자.', answer: '이따가', explanation: "조금 지난 뒤를 말할 때는 '이따가'를 써요." },
    { type: '이따가/있다가', question: '도서관에 조금 더 (이따가/있다가) 집에 갈게요.', answer: '있다가', explanation: "어떤 곳에 머무른 뒤를 말할 때는 '있다가'를 써요." },
    { type: '들르다/들리다', question: '학교 끝나고 문구점에 잠깐 (들렀다/들렸다).', answer: '들렀다', explanation: "어떤 곳에 잠깐 가는 것은 '들르다'를 써요." },
    { type: '들르다/들리다', question: '창밖에서 새소리가 (들렀다/들렸다).', answer: '들렸다', explanation: "소리가 귀에 들어올 때는 '들리다'를 써요." },
    { type: '깨끗이/깨끗히', question: '식사 후 책상을 (깨끗이/깨끗히) 닦았어요.', answer: '깨끗이', explanation: "'깨끗하다'에서 온 말은 '깨끗이'로 써요." },
    { type: '곰곰이/곰곰히', question: '문제를 풀기 전에 (곰곰이/곰곰히) 생각했어요.', answer: '곰곰이', explanation: "깊이 생각하는 모양은 '곰곰이'가 맞아요." },
    { type: '가까이/가까히', question: '칠판이 잘 보이게 앞으로 (가까이/가까히) 갔어요.', answer: '가까이', explanation: "거리가 멀지 않다는 뜻은 '가까이'로 써요." },
    { type: '틈틈이/틈틈히', question: '나는 쉬는 시간마다 (틈틈이/틈틈히) 책을 읽어요.', answer: '틈틈이', explanation: "시간이 날 때마다라는 뜻은 '틈틈이'예요." },
    { type: '일찍이/일찌기', question: '그 과학자는 (일찍이/일찌기) 별을 관찰했어요.', answer: '일찍이', explanation: "오래전부터라는 뜻은 '일찍이'가 맞아요." },
    { type: '더욱이/더욱히', question: '오늘은 바람이 세고 (더욱이/더욱히) 비까지 와요.', answer: '더욱이', explanation: "앞의 말에 더 보태 말할 때는 '더욱이'를 써요." },
    { type: '널찍이/널찍히', question: '친구들이 앉도록 자리를 (널찍이/널찍히) 비워 두었어요.', answer: '널찍이', explanation: "넓고 시원한 모양은 '널찍이'로 써요." },
    { type: '솔직히/솔직이', question: '(솔직히/솔직이) 말하면 나는 조금 무서웠어요.', answer: '솔직히', explanation: "거짓 없이 말한다는 뜻은 '솔직히'로 써요." },
    { type: '조용히/조용이', question: '도서관에서는 (조용히/조용이) 걸어야 해요.', answer: '조용히', explanation: "소리가 나지 않게 할 때는 '조용히'를 써요." },
    { type: '꼼꼼히/꼼꼼이', question: '시험지를 내기 전에 답을 (꼼꼼히/꼼꼼이) 확인했어요.', answer: '꼼꼼히', explanation: "빈틈없이 살피는 모양은 '꼼꼼히'예요." },
    { type: '로서/로써', question: '나는 학급 회장(으로서/으로써) 책임감을 느껴요.', answer: '으로서', explanation: "자격이나 입장을 나타낼 때는 '으로서'를 써요." },
    { type: '로서/로써', question: '밀가루(로서/로써) 쿠키를 만들었어요.', answer: '로써', explanation: "재료나 수단을 나타낼 때는 '로써'를 써요." },
    { type: '든지/던지', question: '사과(든지/던지) 배(든지/던지) 하나를 골라요.', answer: '든지', explanation: "여러 선택 중 어느 것이든 좋을 때는 '든지'를 써요." },
    { type: '든지/던지', question: '어제 비가 얼마나 많이 오(든지/던지) 신발이 다 젖었어요.', answer: '던지', explanation: "지난 일을 떠올려 말할 때는 '던지'를 써요." },
    { type: '데/대', question: '친구가 오늘 전학을 간(데/대).', answer: '대', explanation: "들은 말을 전할 때는 '대'를 써요." },
    { type: '데/대', question: '직접 가 보니 운동장이 정말 넓(데/대).', answer: '데', explanation: "직접 겪은 느낌을 말할 때는 '데'를 써요." },
    { type: '채/체', question: '동생은 모르는 (채/체) 고개만 갸웃했어요.', answer: '체', explanation: "그런 척한다는 뜻일 때는 '체'를 써요." },
    { type: '채/체', question: '나는 우산을 든 (채/체) 버스에 탔어요.', answer: '채', explanation: "어떤 상태 그대로라는 뜻일 때는 '채'를 써요." },
    { type: '이에요/예요', question: '이것은 내 새 공책(이에요/예요).', answer: '이에요', explanation: "받침 있는 말 뒤에는 '이에요'를 써요." },
    { type: '이에요/예요', question: '저 사람은 우리 반 친구(이에요/예요).', answer: '예요', explanation: "받침 없는 말 뒤에는 '예요'를 써요." },
    { type: '거예요/거에요', question: '내일은 발표 연습을 할 (거예요/거에요).', answer: '거예요', explanation: "정답인 '거예요'가 바른 표기예요." },
    { type: '아니에요/아니예요', question: '그 소문은 사실이 (아니에요/아니예요).', answer: '아니에요', explanation: "정답인 '아니에요'가 바른 표기예요." },
    { type: '할게/할께', question: '내가 칠판 지우는 일을 (할게/할께).', answer: '할게', explanation: "약속하듯 말할 때는 '할게'를 써요." },
    { type: '갈게/갈께', question: '수업이 끝나면 바로 집에 (갈게/갈께).', answer: '갈게', explanation: "앞으로 하겠다고 말할 때는 '갈게'가 맞아요." },
    { type: '줄게/줄께', question: '내 연필을 하나 빌려 (줄게/줄께).', answer: '줄게', explanation: "무엇을 해 주겠다고 할 때는 '줄게'를 써요." },
    { type: '바라는/바래는', question: '내가 (바라는/바래는) 것은 모두의 안전이에요.', answer: '바라는', explanation: "무엇을 원한다는 말은 '바라다'에서 온 '바라는'이에요." },
    { type: '나뭇잎/나무잎', question: '가을바람에 노란 (나뭇잎/나무잎)이 떨어졌어요.', answer: '나뭇잎', explanation: "나무의 잎은 '나뭇잎'으로 써요." },
    { type: '깻잎/깨잎', question: '김밥 속에 향긋한 (깻잎/깨잎)을 넣었어요.', answer: '깻잎', explanation: "깨의 잎은 '깻잎'으로 써요." },
    { type: '뒷일/뒤일', question: '지금은 걱정 말고 (뒷일/뒤일)은 나중에 생각하자.', answer: '뒷일', explanation: "뒤에 생길 일은 '뒷일'이라고 써요." },
    { type: '햇빛/해빛', question: '창문으로 따뜻한 (햇빛/해빛)이 들어왔어요.', answer: '햇빛', explanation: "해에서 오는 빛은 '햇빛'으로 써요." },
    { type: '아랫집/아래집', question: '우리 (아랫집/아래집)에 새 이웃이 이사 왔어요.', answer: '아랫집', explanation: "아래에 있는 집은 '아랫집'이라고 써요." },
    { type: '숫자/수자', question: '수학 시간에 큰 (숫자/수자)를 읽어 보았어요.', answer: '숫자', explanation: "수를 나타내는 글자는 '숫자'가 맞아요." },
    { type: '찻집/차집', question: '골목 끝 작은 (찻집/차집)에서 차를 마셨어요.', answer: '찻집', explanation: "차를 파는 집은 '찻집'이라고 써요." },
    { type: '전셋집/전세집', question: '우리 가족은 새 (전셋집/전세집)을 알아보고 있어요.', answer: '전셋집', explanation: "전세로 사는 집은 '전셋집'이라고 써요." },
    { type: '냇가/내까', question: '여름에 친구들과 (냇가/내까)에서 물놀이했어요.', answer: '냇가', explanation: "시냇물의 가장자리는 '냇가'라고 써요." },
    { type: '빗방울/비방울', question: '창문에 작은 (빗방울/비방울)이 맺혔어요.', answer: '빗방울', explanation: "비가 방울져 떨어진 것은 '빗방울'이에요." },
    { type: '통째로/통채로', question: '동생은 작은 귤을 (통째로/통채로) 입에 넣었어요.', answer: '통째로', explanation: "나누지 않고 있는 그대로라는 뜻은 '통째로'예요." },
    { type: '구시렁거리다/궁시렁거리다', question: '동생은 숙제가 많다며 (구시렁거렸다/궁시렁거렸다).', answer: '구시렁거렸다', explanation: "못마땅해서 혼잣말하는 모습은 '구시렁거리다'예요." },
    { type: '빈털터리/빈털털이', question: '용돈을 다 써서 나는 (빈털터리/빈털털이)가 되었어요.', answer: '빈털터리', explanation: "가진 돈이 거의 없는 사람은 '빈털터리'예요." },
    { type: '어슴푸레/어슴프레', question: '새벽이 되자 산길이 (어슴푸레/어슴프레) 보였어요.', answer: '어슴푸레', explanation: "흐릿하게 보이는 모양은 '어슴푸레'예요." },
    { type: '짭짤하다/짭잘하다', question: '김치전이 조금 (짭짤했다/짭잘했다).', answer: '짭짤했다', explanation: "맛이 약간 짠 느낌은 '짭짤하다'예요." },
    { type: '넉넉하다/넉넉이', question: '시간이 (넉넉해서/넉넉이서) 천천히 걸어갔어요.', answer: '넉넉해서', explanation: "모자라지 않고 충분할 때는 '넉넉하다'를 써요." },
    { type: '삐뚤빼뚤/삐뚤삐뚤', question: '동생의 글씨가 (삐뚤빼뚤/삐뚤삐뚤)했어요.', answer: '삐뚤빼뚤', explanation: "여러 방향으로 비뚤어진 모양은 '삐뚤빼뚤'이에요." },
    { type: '우레/우뢰', question: '먹구름 사이로 (우레/우뢰) 소리가 들렸어요.', answer: '우레', explanation: "천둥소리를 뜻하는 말은 '우레'예요." },
    { type: '김치찌개/김치찌게', question: '저녁 메뉴는 얼큰한 (김치찌개/김치찌게)였어요.', answer: '김치찌개', explanation: "국물이 있는 음식 이름은 '김치찌개'가 맞아요." },
    { type: '육개장/육계장', question: '급식에 따뜻한 (육개장/육계장)이 나왔어요.', answer: '육개장', explanation: "소고기로 끓인 매운 국은 '육개장'이에요." }
  ];
}

function buildSpellingReplacementSuggestion_(index) {
  const pool = getSpellingReplacementTemplatePool_();
  const picked = pool[index % pool.length];
  return {
    type: picked.type,
    question: picked.question,
    answer: picked.answer,
    explanation: avoidLeadingQuoteForSpellingExplanation_(picked.explanation)
  };

  const suggestions = [
    {
      type: '되/돼',
      question: '오늘 숙제는 집에 가서 해도 (되/돼).',
      answer: '돼',
      explanation: "'돼'는 '되어'의 준말이라서 '해도 돼'처럼 쓸 수 있어요."
    },
    {
      type: '안/않',
      question: '비가 와서 운동장에 나가지 (안/않)았다.',
      answer: '않',
      explanation: "'않았다'는 '아니하였다'의 뜻이라서 뒤에 '-았다'가 붙을 때 써요."
    },
    {
      type: '왠/웬',
      question: '오늘은 (왠/웬) 바람이 이렇게 많이 불까?',
      answer: '웬',
      explanation: "'웬'은 '어찌 된'이라는 뜻이라서 '웬 바람'처럼 써요."
    },
    {
      type: '어떻게/어떡해',
      question: '이 문제는 (어떻게/어떡해) 풀어야 할까?',
      answer: '어떻게',
      explanation: "방법을 물을 때는 '어떻게'를 써요."
    },
    {
      type: '낫다/낳다/낮다/났다',
      question: '감기가 어제보다 많이 (낫다/낳다).',
      answer: '낫다',
      explanation: "병이나 상처가 좋아질 때는 '낫다'를 써요."
    },
    {
      type: '맞히다/맞추다',
      question: '퀴즈의 정답을 정확히 (맞혔다/맞췄다).',
      answer: '맞혔다',
      explanation: "정답을 알아맞힐 때는 '맞히다'를 써요."
    },
    {
      type: '가르치다/가리키다',
      question: '선생님께서 우리에게 분수를 (가르치셨다/가리키셨다).',
      answer: '가르치셨다',
      explanation: "지식이나 방법을 알려 줄 때는 '가르치다'를 써요."
    },
    {
      type: '잃어버리다/잊어버리다',
      question: '버스에 우산을 (잃어버렸다/잊어버렸다).',
      answer: '잃어버렸다',
      explanation: "물건이 없어졌을 때는 '잃어버리다'를 써요."
    },
    {
      type: '반드시/반듯이',
      question: '약속 시간은 (반드시/반듯이) 지켜야 한다.',
      answer: '반드시',
      explanation: "'꼭'이라는 뜻일 때는 '반드시'를 써요."
    },
    {
      type: '깨끗이/깨끗히',
      question: '식사 후 책상을 (깨끗이/깨끗히) 닦았다.',
      answer: '깨끗이',
      explanation: "'깨끗하다'에서 온 말은 '깨끗이'로 써요."
    },
    {
      type: '일찍이/일찌기',
      question: '우리 마을은 (일찍이/일찌기) 도서관을 세웠다.',
      answer: '일찍이',
      explanation: "오래전부터라는 뜻일 때는 '일찍이'가 맞아요."
    },
    {
      type: '며칠/몇일',
      question: '방학식은 앞으로 (며칠/몇일) 남았니?',
      answer: '며칠',
      explanation: "날의 수를 물을 때도 '며칠'이라고 써요."
    },
    {
      type: '바라다/바래다',
      question: '나는 네가 건강하게 지내길 (바란다/바랜다).',
      answer: '바란다',
      explanation: "무엇을 원한다는 뜻은 '바라다'라서 '바란다'가 맞아요."
    },
    {
      type: '로서/로써',
      question: '나는 학급 회장(으로서/으로써) 책임감을 느낀다.',
      answer: '으로서',
      explanation: "자격이나 신분을 나타낼 때는 '으로서'를 써요."
    },
    {
      type: '든지/던지',
      question: '사과(든지/던지) 배(든지/던지) 하나를 골라라.',
      answer: '든지',
      explanation: "여러 선택 중 어느 것이든 괜찮다는 뜻일 때는 '든지'를 써요."
    },
    {
      type: '부치다/붙이다',
      question: '편지를 봉투에 넣어 우체국에서 (부쳤다/붙였다).',
      answer: '부쳤다',
      explanation: "편지나 물건을 보내는 일은 '부치다'를 써요."
    },
    {
      type: '벌이다/벌리다',
      question: '친구들과 운동장에서 줄넘기 대회를 (벌였다/벌렸다).',
      answer: '벌였다',
      explanation: "일을 시작하거나 펼쳐 놓는다는 뜻은 '벌이다'예요."
    },
    {
      type: '다르다/틀리다',
      question: '내 생각은 너의 생각과 조금 (다르다/틀리다).',
      answer: '다르다',
      explanation: "서로 같지 않다는 뜻은 '다르다'를 써요."
    },
    {
      type: '결재/결제',
      question: '문구점에서 공책값을 카드로 (결재/결제)했다.',
      answer: '결제',
      explanation: "돈을 치르는 일은 '결제'라고 써요."
    },
    {
      type: '역할/역활',
      question: '모둠 활동에서 각자의 (역할/역활)을 정했다.',
      answer: '역할',
      explanation: "맡아서 해야 하는 일은 '역할'이 맞아요."
    },
    {
      type: '금세/금새',
      question: '아이스크림이 더위에 (금세/금새) 녹았다.',
      answer: '금세',
      explanation: "'지금 바로'라는 뜻의 말은 '금세'예요."
    },
    {
      type: '설거지/설겆이',
      question: '저녁을 먹고 그릇 (설거지/설겆이)를 했다.',
      answer: '설거지',
      explanation: "그릇을 씻는 일은 '설거지'가 맞아요."
    },
    {
      type: '통째로/통채로',
      question: '동생은 작은 귤을 (통째로/통채로) 입에 넣었다.',
      answer: '통째로',
      explanation: "나누지 않고 있는 그대로라는 뜻은 '통째로'예요."
    },
    {
      type: '희한하다/희안하다',
      question: '처음 보는 모양의 구름이 참 (희한하다/희안하다).',
      answer: '희한하다',
      explanation: "매우 드물고 신기하다는 뜻은 '희한하다'로 써요."
    },
    {
      type: '곰곰이/곰곰히',
      question: '문제를 풀기 전에 (곰곰이/곰곰히) 생각했다.',
      answer: '곰곰이',
      explanation: "깊이 생각하는 모양을 나타낼 때는 '곰곰이'가 맞아요."
    },
    {
      type: '오랜만에/오랫만에',
      question: '친구를 (오랜만에/오랫만에) 만나서 반가웠다.',
      answer: '오랜만에',
      explanation: "오래간만의 준말은 '오랜만'이라서 '오랜만에'가 맞아요."
    }
  ];

  const suggestion = suggestions[index % suggestions.length];
  return {
    type: suggestion.type,
    question: suggestion.question,
    answer: suggestion.answer,
    explanation: avoidLeadingQuoteForSpellingExplanation_(suggestion.explanation)
  };
}

function buildDuplicateSpellingReplacementSuggestion_(question, answer, explanation, index) {
  const pool = getSpellingReplacementTemplatePool_();
  const picked = pool[index % pool.length];
  return {
    type: picked.type,
    question: picked.question,
    answer: picked.answer,
    explanation: avoidLeadingQuoteForSpellingExplanation_(picked.explanation),
    duplicateRisk: false
  };

  const suggestions = [
    {
      type: '되/돼',
      question: '친구에게 빌린 책을 오늘 돌려줘도 (되/돼)?',
      answer: '돼',
      explanation: "여기서는 '돼'가 맞아요. '돼'는 '되어'의 준말이에요."
    },
    {
      type: '안/않',
      question: '숙제를 끝내지 (안/않)으면 놀 수 없어요.',
      answer: '않',
      explanation: "여기서는 '않'이 맞아요. '않으면'은 '아니하면'이라는 뜻이에요."
    },
    {
      type: '왠/웬',
      question: '교실 앞에 (왠/웬) 상자가 놓여 있었어요.',
      answer: '웬',
      explanation: "여기서는 '웬'이 맞아요. '어찌 된'이라는 뜻으로 써요."
    },
    {
      type: '어떻게/어떡해',
      question: '우산을 안 가져왔는데 이제 (어떻게/어떡해) 하지?',
      answer: '어떡해',
      explanation: "여기서는 '어떡해'가 맞아요. 난처한 상황에서 쓰는 말이에요."
    },
    {
      type: '낫다/낳다/낮다/났다',
      question: '어제보다 목이 많이 (낫다/낳다).',
      answer: '낫다',
      explanation: "정답인 '낫다'는 병이나 아픈 곳이 좋아질 때 써요."
    },
    {
      type: '맞히다/맞추다',
      question: '선생님이 낸 문제의 답을 바로 (맞혔다/맞췄다).',
      answer: '맞혔다',
      explanation: "정답을 알아냈을 때는 '맞혔다'를 써요."
    },
    {
      type: '가르치다/가리키다',
      question: '형이 동생에게 자전거 타는 법을 (가르쳤다/가리켰다).',
      answer: '가르쳤다',
      explanation: "방법을 알려 줄 때는 '가르치다'를 써요."
    },
    {
      type: '잃어버리다/잊어버리다',
      question: '나는 도서관에 필통을 (잃어버렸다/잊어버렸다).',
      answer: '잃어버렸다',
      explanation: "물건이 없어졌을 때는 '잃어버렸다'를 써요."
    },
    {
      type: '반드시/반듯이',
      question: '횡단보도에서는 신호를 (반드시/반듯이) 지켜야 해요.',
      answer: '반드시',
      explanation: "'꼭'이라는 뜻일 때는 '반드시'를 써요."
    },
    {
      type: '며칠/몇일',
      question: '체험학습까지 이제 (며칠/몇일) 남았나요?',
      answer: '며칠',
      explanation: "날의 수를 물을 때는 '며칠'이라고 써요."
    },
    {
      type: '로서/로써',
      question: '나는 친구(로서/로써) 네 이야기를 잘 들어 줄게.',
      answer: '로서',
      explanation: "자격이나 입장을 나타낼 때는 '로서'를 써요."
    },
    {
      type: '든지/던지',
      question: '김밥(이든지/이던지) 샌드위치(든지/던지) 하나를 골라요.',
      answer: '이든지',
      explanation: "여러 가지 중 고를 때는 '든지'를 써요."
    },
    {
      type: '결재/결제',
      question: '엄마가 인터넷으로 운동화 값을 (결재/결제)했어요.',
      answer: '결제',
      explanation: "돈을 치르는 일은 '결제'라고 써요."
    },
    {
      type: '역할/역활',
      question: '연극에서 내가 맡은 (역할/역활)은 왕이에요.',
      answer: '역할',
      explanation: "맡아서 해야 하는 일은 '역할'이 맞아요."
    },
    {
      type: '금세/금새',
      question: '젖은 운동화가 햇볕에 (금세/금새) 말랐어요.',
      answer: '금세',
      explanation: "아주 짧은 시간이라는 뜻은 '금세'예요."
    },
    {
      type: '오랜만에/오랫만에',
      question: '할머니 댁에 (오랜만에/오랫만에) 갔어요.',
      answer: '오랜만에',
      explanation: "'오래간만'의 준말은 '오랜만'이에요."
    }
  ];

  const suggestion = suggestions[index % suggestions.length];
  return {
    type: suggestion.type,
    question: suggestion.question,
    answer: suggestion.answer,
    explanation: avoidLeadingQuoteForSpellingExplanation_(suggestion.explanation)
  };
}

function buildUniqueSpellingReplacementSuggestion_(currentQuestion, sourceRowNumber, startIndex, existingQuestionKeys, usedNewQuestionKeys, usedReplacementTypes) {
  const template = getNextUnusedSpellingTemplate_(
    currentQuestion,
    sourceRowNumber,
    startIndex,
    existingQuestionKeys,
    usedNewQuestionKeys,
    usedReplacementTypes,
    true
  ) || getNextUnusedSpellingTemplate_(
    currentQuestion,
    sourceRowNumber,
    startIndex,
    existingQuestionKeys,
    usedNewQuestionKeys,
    usedReplacementTypes,
    false
  );

  const picked = template || getSpellingReplacementTemplatePool_()[startIndex % getSpellingReplacementTemplatePool_().length];
  const key = normalizeSpellingSuggestionKey_(picked.question);
  const duplicateRisk = !template || !!usedNewQuestionKeys[key] || isExistingSpellingQuestionKeyUsedByOtherRow_(key, sourceRowNumber, existingQuestionKeys);

  usedNewQuestionKeys[key] = true;
  usedReplacementTypes[picked.type] = (usedReplacementTypes[picked.type] || 0) + 1;

  return {
    type: picked.type,
    question: picked.question,
    answer: picked.answer,
    explanation: avoidLeadingQuoteForSpellingExplanation_(picked.explanation),
    duplicateRisk: duplicateRisk
  };
}

function getNextUnusedSpellingTemplate_(currentQuestion, sourceRowNumber, startIndex, existingQuestionKeys, usedNewQuestionKeys, usedReplacementTypes, preferUnderTypeLimit) {
  const pool = getSpellingReplacementTemplatePool_();
  for (let offset = 0; offset < pool.length; offset += 1) {
    const template = pool[(startIndex + offset) % pool.length];
    if (preferUnderTypeLimit && (usedReplacementTypes[template.type] || 0) >= 2) continue;

    const key = normalizeSpellingSuggestionKey_(template.question);
    if (!key || usedNewQuestionKeys[key]) continue;
    if (isExistingSpellingQuestionKeyUsedByOtherRow_(key, sourceRowNumber, existingQuestionKeys)) continue;
    if (key === normalizeSpellingSuggestionKey_(currentQuestion)) continue;
    return template;
  }
  return null;
}

function isExistingSpellingQuestionKeyUsedByOtherRow_(key, sourceRowNumber, existingQuestionKeys) {
  const rows = existingQuestionKeys[key] || [];
  return rows.some(rowNumber => rowNumber !== sourceRowNumber);
}

function normalizeSpellingSuggestionKey_(value) {
  return String(value || '')
    .replace(/['"‘’“”]/g, '')
    .replace(/[.。]+$/g, '.')
    .replace(/[?？]+$/g, '?')
    .replace(/[!！]+$/g, '!')
    .replace(/\s*([()（）/])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateSpellingSuggestionUniqueness_(reportRows) {
  const seen = {};
  reportRows.forEach(row => {
    const key = normalizeSpellingSuggestionKey_(row[10]);
    if (!key) return;
    if (seen[key]) {
      row[0] = '수정필요';
      row[17] = '자동 제안 중복 - 수동 수정 필요';
      seen[key][0] = '수정필요';
      seen[key][17] = '자동 제안 중복 - 수동 수정 필요';
      return;
    }
    seen[key] = row;
  });
}

function avoidLeadingQuoteForSpellingExplanation_(text) {
  const value = normalizeSpellingCellText_(text);
  if (!value) return value;
  if (/^['‘’]/.test(value)) return '정답인 ' + value;
  return value;
}

function normalizeSpellingCellText_(value) {
  return String(value || '').trim();
}

function normalizeSpellingCompareText_(value) {
  return String(value || '')
    .replace(/['"‘’“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSpellingChoicePair_(questionText) {
  const text = normalizeSpellingCellText_(questionText);
  const parenMatch = text.match(/[（(]([^()（）/]+)\/([^()（）/]+)[）)]/);
  if (parenMatch) return [parenMatch[1], parenMatch[2]];

  const slashMatch = text.match(/([가-힣A-Za-z0-9]+)\s*\/\s*([가-힣A-Za-z0-9]+)/);
  if (slashMatch) return [slashMatch[1], slashMatch[2]];

  return null;
}

function isImprovedSpellingQuestion_(questionText, answerText, explanationText, type, choicePair) {
  if (!choicePair || type === '기타') return false;
  if (questionText.length < 16) return false;
  if (!/[.!?。？！]$/.test(questionText)) return false;
  if (!/[가-힣]\s+[가-힣]/.test(questionText.replace(/[（(][^()（）]+[）)]/g, ' '))) return false;
  if (!/[요.!?。？！]*$/.test(explanationText) || explanationText.indexOf('요') === -1) return false;

  const left = normalizeSpellingCompareText_(choicePair[0]);
  const right = normalizeSpellingCompareText_(choicePair[1]);
  const answer = normalizeSpellingCompareText_(answerText);
  if (!left || !right || left === right) return false;
  if (answer !== left && answer !== right) return false;

  return true;
}

function getSpellingEditDistance_(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;

  let edits = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a.charAt(i) === b.charAt(j)) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return edits;
    if (a.length > b.length) i += 1;
    else if (a.length < b.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }

  if (i < a.length || j < b.length) edits += 1;
  return edits;
}

const WORD_RELATION_DRAFT_SHEET_NAME = '단어시트_초안';
const WORD_RELATION_DRAFT_HEADERS = ['검토상태', '대상낱말', '문장1', '문장2', '정답', '뜻1', '뜻2', '해설', '유형', '비고'];

function generateWordRelationQuestionDrafts() {
  const sheet = ensureWordQuestionDraftSheet_();
  clearWordQuestionDraftSheet_(sheet);
  sheet.getRange(1, 1, 1, WORD_RELATION_DRAFT_HEADERS.length).setValues([WORD_RELATION_DRAFT_HEADERS]);

  const drafts = getWordRelationQuestionDrafts_();
  const rows = drafts.map(item => [
    '검토필요',
    item.word,
    item.sentence1,
    item.sentence2,
    item.answer,
    item.meaning1,
    item.meaning2,
    item.explanation,
    item.type,
    item.note || ''
  ]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, WORD_RELATION_DRAFT_HEADERS.length).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, WORD_RELATION_DRAFT_HEADERS.length);
  }

  const polysemyCount = drafts.filter(item => item.answer === '다의어').length;
  const homonymCount = drafts.filter(item => item.answer === '동형이의어').length;
  Logger.log('[단어시트 초안] total=%s, 다의어=%s, 동형이의어=%s', drafts.length, polysemyCount, homonymCount);
  return {
    draftCount: drafts.length,
    polysemyCount: polysemyCount,
    homonymCount: homonymCount,
    sheetName: WORD_RELATION_DRAFT_SHEET_NAME
  };
}

function applyApprovedWordQuestionDrafts(dryRun) {
  const isDryRun = dryRun !== false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');

  const draftSheet = ss.getSheetByName(WORD_RELATION_DRAFT_SHEET_NAME);
  if (!draftSheet) throw new Error(WORD_RELATION_DRAFT_SHEET_NAME + ' 시트를 찾을 수 없습니다.');

  const lastRow = draftSheet.getLastRow();
  const lastColumn = draftSheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) {
    Logger.log('[단어시트 반영] dryRun=%s, approvedCount=0, appliedCount=0, skippedCount=0', isDryRun);
    return { dryRun: isDryRun, approvedCount: 0, appliedCount: 0, skippedCount: 0, errors: [] };
  }

  const headerMap = getWordDraftHeaderMap_(draftSheet.getRange(1, 1, 1, lastColumn).getValues()[0]);
  const draftRows = draftSheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const approvedItems = [];

  draftRows.forEach((row, index) => {
    const status = normalizeWordRelationDraftText_(row[headerMap['검토상태'] - 1]);
    if (status !== '승인') return;
    approvedItems.push({ draftRowNumber: index + 2, row: row });
  });

  const result = {
    dryRun: isDryRun,
    approvedCount: approvedItems.length,
    appliedCount: 0,
    skippedCount: 0,
    errors: []
  };

  if (!approvedItems.length) {
    Logger.log('[단어시트 반영] dryRun=%s, approvedCount=0, appliedCount=0, skippedCount=0', isDryRun);
    return result;
  }

  const wordSheet = isDryRun ? ss.getSheetByName('단어시트') : ensureWordQuestionSheet_();
  const existingKeys = {};
  const existingLastRow = wordSheet ? wordSheet.getLastRow() : 0;
  if (wordSheet && existingLastRow >= 2) {
    wordSheet.getRange(2, 1, existingLastRow - 1, 3).getValues().forEach(row => {
      const key = normalizeWordQuestionKey_(row[0], row[1], row[2]);
      if (key) existingKeys[key] = true;
    });
  }

  const pendingKeys = {};
  const rowsToAppend = [];
  const successfulItems = [];

  approvedItems.forEach(item => {
    const validation = validateWordQuestionDraftRow_(item, headerMap, existingKeys, pendingKeys);
    if (!validation.valid) {
      result.skippedCount += 1;
      result.errors.push({
        draftRowNumber: item.draftRowNumber,
        message: validation.message
      });
      Logger.log('[단어시트 반영] SKIP draftRow=%s, reason=%s', item.draftRowNumber, validation.message);
      if (!isDryRun) {
        draftSheet.getRange(item.draftRowNumber, headerMap['비고']).setValue(validation.message);
      }
      return;
    }

    pendingKeys[validation.key] = true;
    Logger.log(
      '[단어시트 반영] %s draftRow=%s word="%s" answer="%s" sentence1="%s" sentence2="%s"',
      isDryRun ? 'DRY_RUN' : 'APPLY',
      item.draftRowNumber,
      validation.outputRow[0],
      validation.outputRow[3],
      validation.outputRow[1],
      validation.outputRow[2]
    );
    rowsToAppend.push(validation.outputRow);
    successfulItems.push(item);
  });

  if (!isDryRun && rowsToAppend.length) {
    wordSheet.getRange(wordSheet.getLastRow() + 1, 1, rowsToAppend.length, 8).setValues(rowsToAppend);
    const appliedAt = writeWordDraftApplyLog_();
    successfulItems.forEach(item => {
      draftSheet.getRange(item.draftRowNumber, headerMap['검토상태']).setValue('반영완료');
      draftSheet.getRange(item.draftRowNumber, headerMap['비고']).setValue(appliedAt);
    });
  }

  result.appliedCount = isDryRun ? 0 : rowsToAppend.length;
  Logger.log(
    '[단어시트 반영] dryRun=%s, approvedCount=%s, appliedCount=%s, skippedCount=%s',
    result.dryRun,
    result.approvedCount,
    result.appliedCount,
    result.skippedCount
  );
  return result;
}

function dryRunApprovedWordQuestionDrafts() {
  return applyApprovedWordQuestionDrafts(true);
}

function applyApprovedWordQuestionDraftsNow() {
  return applyApprovedWordQuestionDrafts(false);
}

function ensureWordQuestionDraftSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');
  return ss.getSheetByName(WORD_RELATION_DRAFT_SHEET_NAME) || ss.insertSheet(WORD_RELATION_DRAFT_SHEET_NAME);
}

function clearWordQuestionDraftSheet_(sheet) {
  if (!sheet || sheet.getName() !== WORD_RELATION_DRAFT_SHEET_NAME) {
    throw new Error('단어시트_초안에만 쓸 수 있습니다.');
  }
  sheet.clearContents();
}

function normalizeWordRelationDraftText_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function ensureWordQuestionSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트를 찾을 수 없습니다.');
  const sheet = ss.getSheetByName('단어시트') || ss.insertSheet('단어시트');
  const headers = ['대상낱말', '문장1', '문장2', '정답', '뜻1', '뜻2', '해설', '유형'];
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(value => String(value || '').trim());
  const needsHeader = headers.some((header, index) => current[index] !== header);
  if (needsHeader && sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (needsHeader && sheet.getLastRow() === 1 && current.every(value => !value)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (needsHeader && sheet.getLastRow() < 2) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function getWordDraftHeaderMap_(headerValues) {
  const headerMap = {};
  headerValues.forEach((value, index) => {
    const header = normalizeWordRelationDraftText_(value);
    if (header) headerMap[header] = index + 1;
  });

  WORD_RELATION_DRAFT_HEADERS.forEach(header => {
    if (!headerMap[header]) throw new Error('단어시트_초안 필수 헤더가 없습니다: ' + header);
  });

  return headerMap;
}

function validateWordQuestionDraftRow_(item, headerMap, existingKeys, pendingKeys) {
  const row = item.row;
  const word = normalizeWordRelationDraftText_(row[headerMap['대상낱말'] - 1]);
  const sentence1 = normalizeWordRelationDraftText_(row[headerMap['문장1'] - 1]);
  const sentence2 = normalizeWordRelationDraftText_(row[headerMap['문장2'] - 1]);
  const answer = normalizeWordRelationDraftText_(row[headerMap['정답'] - 1]);
  const meaning1 = normalizeWordRelationDraftText_(row[headerMap['뜻1'] - 1]);
  const meaning2 = normalizeWordRelationDraftText_(row[headerMap['뜻2'] - 1]);
  const explanation = normalizeWordRelationDraftText_(row[headerMap['해설'] - 1]);
  const type = normalizeWordRelationDraftText_(row[headerMap['유형'] - 1]);

  if (!word) return { valid: false, message: '대상낱말이 비어 있습니다.' };
  if (!sentence1) return { valid: false, message: '문장1이 비어 있습니다.' };
  if (!sentence2) return { valid: false, message: '문장2가 비어 있습니다.' };
  if (answer !== '다의어' && answer !== '동형이의어') return { valid: false, message: '정답은 다의어 또는 동형이의어여야 합니다.' };
  if (!meaning1) return { valid: false, message: '뜻1이 비어 있습니다.' };
  if (!meaning2) return { valid: false, message: '뜻2가 비어 있습니다.' };
  if (!explanation) return { valid: false, message: '해설이 비어 있습니다.' };
  if (!type) return { valid: false, message: '유형이 비어 있습니다.' };
  if (sentence1.indexOf('[' + word + ']') === -1) return { valid: false, message: '문장1에 [대상낱말] 표시가 없습니다.' };
  if (sentence2.indexOf('[' + word + ']') === -1) return { valid: false, message: '문장2에 [대상낱말] 표시가 없습니다.' };
  if (explanation.indexOf('요') === -1) return { valid: false, message: '해설은 ~요. 말투로 작성하세요.' };

  const key = normalizeWordQuestionKey_(word, sentence1, sentence2);
  if (existingKeys[key]) return { valid: false, message: '중복으로 반영 제외' };
  if (pendingKeys[key]) return { valid: false, message: '중복으로 반영 제외' };

  return {
    valid: true,
    key: key,
    outputRow: [word, sentence1, sentence2, answer, meaning1, meaning2, explanation, type]
  };
}

function writeWordDraftApplyLog_() {
  const timezone = Session.getScriptTimeZone() || 'Asia/Seoul';
  return Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd HH:mm:ss') + ' 반영완료';
}

function normalizeWordQuestionKey_(word, sentence1, sentence2) {
  return [word, sentence1, sentence2].map(value => String(value || '')
    .replace(/['"‘’“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  ).join('||');
}

function getWordRelationQuestionDrafts_() {
  const polysemy = [
    { word: '머리', sentence1: '[머리]를 깨끗이 감았다.', sentence2: '줄의 [머리]에 선 친구가 발표했다.', meaning1: '사람이나 동물의 몸에서 눈, 코, 입 등이 있는 부분', meaning2: '줄이나 행렬의 앞부분', explanation: "두 문장의 '머리'는 모두 어떤 것의 윗부분이나 앞부분이라는 관련된 뜻으로 쓰였어요." },
    { word: '손', sentence1: '비누로 [손]을 깨끗이 씻었다.', sentence2: '동생은 아직 혼자 하기 어려워 엄마의 [손]이 필요하다.', meaning1: '팔 끝에 달린 신체 부분', meaning2: '다른 사람을 돕는 힘이나 도움', explanation: "두 문장의 '손'은 몸의 손에서 도움이라는 뜻으로 넓어진 말이에요." },
    { word: '발', sentence1: '운동장을 뛰다가 [발]이 아팠다.', sentence2: '책상 [발]이 흔들려서 고쳤다.', meaning1: '사람이나 동물이 서고 걷는 몸의 부분', meaning2: '물건을 받치고 있는 아래 부분', explanation: "두 문장의 '발'은 아래에서 받쳐 주는 부분이라는 관련된 뜻으로 쓰였어요." },
    { word: '눈', sentence1: '[눈]을 크게 뜨고 그림을 보았다.', sentence2: '바늘 [눈]에 실을 꿰었다.', meaning1: '사물을 보는 몸의 기관', meaning2: '구멍이나 틈처럼 생긴 부분', explanation: "두 문장의 '눈'은 보는 눈에서 작고 둥근 구멍 모양으로 뜻이 넓어졌어요." },
    { word: '입', sentence1: '매운 음식을 먹고 [입]이 얼얼했다.', sentence2: '병 [입]이 좁아서 물을 조심히 따랐다.', meaning1: '음식을 먹고 말을 하는 몸의 부분', meaning2: '그릇이나 병의 열린 부분', explanation: "두 문장의 '입'은 안으로 들어가는 열린 부분이라는 관련된 뜻이 있어요." },
    { word: '귀', sentence1: '작은 소리도 [귀]로 잘 들었다.', sentence2: '공책 [귀]가 접혀 있었다.', meaning1: '소리를 듣는 몸의 부분', meaning2: '물건의 모서리나 가장자리', explanation: "두 문장의 '귀'는 몸의 귀에서 가장자리라는 뜻으로 넓어졌어요." },
    { word: '코', sentence1: '감기에 걸려 [코]가 막혔다.', sentence2: '신발 [코]가 닳아서 새 신발을 샀다.', meaning1: '냄새를 맡고 숨을 쉬는 몸의 부분', meaning2: '앞쪽으로 뾰족하게 나온 부분', explanation: "두 문장의 '코'는 앞으로 나온 부분이라는 비슷한 느낌으로 쓰였어요." },
    { word: '다리', sentence1: '오래 걸었더니 [다리]가 아팠다.', sentence2: '강 위에 새 [다리]가 놓였다.', meaning1: '사람이나 동물의 몸을 받치고 걷게 하는 부분', meaning2: '강이나 길을 건널 수 있게 만든 시설', explanation: "두 문장의 '다리'는 이어 주거나 받쳐 주는 관련된 뜻으로 쓰였어요." },
    { word: '길', sentence1: '학교로 가는 [길]에 꽃이 피었다.', sentence2: '문제를 푸는 [길]을 찾았다.', meaning1: '사람이나 차가 다니는 곳', meaning2: '일을 해 나가는 방법', explanation: "두 문장의 '길'은 어디로 나아가는 데 필요한 통로라는 관련된 뜻이에요." },
    { word: '줄', sentence1: '친구들이 급식실 앞에 [줄]을 섰다.', sentence2: '공책에 밑[줄]을 그었다.', meaning1: '여럿이 길게 늘어선 모양', meaning2: '길게 그은 선', explanation: "두 문장의 '줄'은 길게 이어진 모양이라는 관련된 뜻으로 쓰였어요." },
    { word: '자리', sentence1: '교실에서 내 [자리]에 앉았다.', sentence2: '그 말이 마음속에 [자리]를 잡았다.', meaning1: '사람이 앉거나 머무는 곳', meaning2: '어떤 것이 차지한 위치나 상태', explanation: "두 문장의 '자리'는 어떤 것이 차지하는 곳이라는 관련된 뜻이에요." },
    { word: '끝', sentence1: '연필 [끝]이 뾰족했다.', sentence2: '긴 회의가 드디어 [끝]이 났다.', meaning1: '물건의 가장 마지막 부분', meaning2: '일이나 시간의 마지막', explanation: "두 문장의 '끝'은 마지막 부분이라는 관련된 뜻으로 쓰였어요." },
    { word: '속', sentence1: '상자 [속]에 장난감이 있었다.', sentence2: '친구의 [속]을 몰라서 조심스럽게 물었다.', meaning1: '겉에서 보이지 않는 안쪽', meaning2: '마음이나 생각', explanation: "두 문장의 '속'은 겉으로 보이지 않는 안쪽이라는 관련된 뜻이에요." },
    { word: '바람', sentence1: '창문으로 시원한 [바람]이 들어왔다.', sentence2: '내 [바람]은 가족이 모두 건강한 것이다.', meaning1: '공기가 움직이는 것', meaning2: '마음속으로 원하는 일', explanation: "두 문장의 '바람'은 눈에 보이지 않지만 느껴지는 것에서 원하는 마음으로 뜻이 넓어졌어요." },
    { word: '빛', sentence1: '아침 [빛]이 방 안으로 들어왔다.', sentence2: '친구의 얼굴에 기쁜 [빛]이 돌았다.', meaning1: '눈으로 밝음을 느끼게 하는 것', meaning2: '얼굴이나 모습에 나타나는 기운', explanation: "두 문장의 '빛'은 밝게 드러나는 느낌이라는 관련된 뜻이 있어요." },
    { word: '소리', sentence1: '창밖에서 새 [소리]가 들렸다.', sentence2: '친구의 [소리]에 모두 고개를 끄덕였다.', meaning1: '귀로 들을 수 있는 울림', meaning2: '말이나 의견', explanation: "두 문장의 '소리'는 귀에 들리는 것에서 말이나 의견으로 뜻이 넓어졌어요." },
    { word: '마음', sentence1: '동생을 걱정하는 [마음]이 컸다.', sentence2: '오늘은 공부할 [마음]이 잘 생기지 않았다.', meaning1: '사람이 느끼고 생각하는 속', meaning2: '무엇을 하려는 생각이나 뜻', explanation: "두 문장의 '마음'은 생각과 느낌이라는 관련된 뜻으로 쓰였어요." },
    { word: '얼굴', sentence1: '세수를 하고 [얼굴]을 닦았다.', sentence2: '우리 학교의 [얼굴]이 될 대표를 뽑았다.', meaning1: '눈, 코, 입이 있는 머리 앞부분', meaning2: '어떤 대상을 대표하는 사람이나 모습', explanation: "두 문장의 '얼굴'은 겉으로 드러나는 대표 모습이라는 관련된 뜻이에요." },
    { word: '밑', sentence1: '책상 [밑]에 공이 굴러갔다.', sentence2: '선생님 [밑]에서 글쓰기를 배웠다.', meaning1: '아래쪽 부분', meaning2: '어떤 사람의 가르침이나 보살핌을 받는 처지', explanation: "두 문장의 '밑'은 아래에 있다는 뜻에서 배움이나 보호를 받는 관계로 넓어졌어요." },
    { word: '등', sentence1: '가방을 메니 [등]이 조금 아팠다.', sentence2: '김밥, 떡볶이 [등]을 간식으로 준비했다.', meaning1: '사람이나 동물의 뒤쪽 몸 부분', meaning2: '같은 종류를 더 이어 말할 때 쓰는 말', explanation: "두 문장의 '등'은 뒤에 이어지는 느낌이 있어 관련된 뜻으로 볼 수 있어요." },
    { word: '날', sentence1: '오늘은 바람이 많이 부는 [날]이다.', sentence2: '칼 [날]이 무뎌져서 잘 들지 않았다.', meaning1: '하루나 어떤 날짜', meaning2: '칼이나 가위의 얇고 날카로운 부분', explanation: "두 문장의 '날'은 서로 관련된 뜻으로 보기는 어렵지만 한 낱말에서 쓰임이 나뉜 예로 볼 수 있어요." },
    { word: '점', sentence1: '종이에 작은 [점]을 찍었다.', sentence2: '이 문제의 좋은 [점]을 말해 보자.', meaning1: '아주 작게 찍힌 표시', meaning2: '어떤 부분이나 특징', explanation: "두 문장의 '점'은 작게 나누어 볼 수 있는 부분이라는 관련된 뜻이에요." },
    { word: '판', sentence1: '칠[판]에 오늘 날짜를 썼다.', sentence2: '친구들과 윷놀이 한 [판]을 했다.', meaning1: '넓고 평평한 물건', meaning2: '놀이가 한 번 벌어지는 자리나 차례', explanation: "두 문장의 '판'은 일이 벌어지는 바탕이나 자리라는 관련된 뜻이 있어요." },
    { word: '힘', sentence1: '무거운 상자를 들려면 [힘]이 필요하다.', sentence2: '친구의 응원이 큰 [힘]이 되었다.', meaning1: '몸으로 무언가를 움직이는 능력', meaning2: '어려움을 이겨 내게 하는 도움이나 용기', explanation: "두 문장의 '힘'은 무언가를 가능하게 하는 능력이라는 관련된 뜻이에요." },
    { word: '목', sentence1: '목도리를 둘러 [목]을 따뜻하게 했다.', sentence2: '병 [목]이 좁아서 물을 천천히 따랐다.', meaning1: '머리와 몸통을 잇는 몸의 부분', meaning2: '물건에서 좁게 이어지는 부분', explanation: "두 문장의 '목'은 좁게 이어지는 부분이라는 관련된 뜻으로 쓰였어요." },
    { word: '가슴', sentence1: '달리기를 하니 [가슴]이 두근거렸다.', sentence2: '칭찬을 들으니 [가슴]이 뿌듯했다.', meaning1: '몸의 앞쪽 윗부분', meaning2: '마음이나 느낌', explanation: "두 문장의 '가슴'은 몸의 가슴에서 마음이나 감정으로 뜻이 넓어졌어요." },
    { word: '허리', sentence1: '무거운 가방을 메니 [허리]가 아팠다.', sentence2: '산 [허리]에 구름이 걸려 있었다.', meaning1: '몸의 가운데 잘록한 부분', meaning2: '사물이나 산의 가운데쯤 되는 부분', explanation: "두 문장의 '허리'는 가운데 부분이라는 관련된 뜻이에요." },
    { word: '어깨', sentence1: '가방끈이 [어깨]를 눌렀다.', sentence2: '친구는 반 대표라는 무거운 [어깨]를 느꼈다.', meaning1: '팔과 몸통이 이어지는 윗부분', meaning2: '책임이나 부담', explanation: "두 문장의 '어깨'는 짐을 지는 곳에서 책임이라는 뜻으로 넓어졌어요." },
    { word: '뿌리', sentence1: '나무 [뿌리]가 땅속 깊이 뻗었다.', sentence2: '문제의 [뿌리]를 찾아야 해결할 수 있다.', meaning1: '식물이 땅속에서 물을 빨아들이는 부분', meaning2: '일이 생긴 근본 원인', explanation: "두 문장의 '뿌리'는 어떤 것을 받쳐 주는 근본이라는 관련된 뜻이에요." },
    { word: '가지', sentence1: '나무 [가지]에 새가 앉았다.', sentence2: '여러 [가지] 방법을 생각해 보았다.', meaning1: '나무의 줄기에서 갈라져 나온 부분', meaning2: '종류나 갈래', explanation: "두 문장의 '가지'는 갈라져 나온 것이라는 관련된 뜻이 있어요." },
    { word: '잎', sentence1: '나무 [잎]이 바람에 흔들렸다.', sentence2: '책 [잎]을 조심히 넘겼다.', meaning1: '식물의 줄기나 가지에 붙은 얇은 부분', meaning2: '책이나 종이의 한 장', explanation: "두 문장의 '잎'은 얇고 납작한 모양이라는 관련된 뜻이에요." },
    { word: '씨', sentence1: '화분에 꽃 [씨]를 심었다.', sentence2: '김민수 [씨]가 발표를 했다.', meaning1: '식물이 싹트는 작은 알맹이', meaning2: '사람 이름 뒤에 붙여 부르는 말', explanation: "두 문장의 '씨'는 모양은 같지만 쓰임이 달라요. 그러나 사람을 부르는 말과 씨앗은 뜻이 서로 달라 동형이의어에 가까워요.", answerOverride: '동형이의어' },
    { word: '그릇', sentence1: '국을 담을 [그릇]을 꺼냈다.', sentence2: '그 친구는 마음의 [그릇]이 크다.', meaning1: '음식을 담는 물건', meaning2: '사람의 마음이나 능력을 비유한 말', explanation: "두 문장의 '그릇'은 담을 수 있는 물건에서 마음이나 능력으로 뜻이 넓어졌어요." },
    { word: '문', sentence1: '교실 [문]을 조용히 닫았다.', sentence2: '새로운 세계로 가는 [문]이 열렸다.', meaning1: '드나드는 곳에 여닫게 만든 시설', meaning2: '어떤 일을 시작하거나 들어가는 길', explanation: "두 문장의 '문'은 안팎을 이어 주는 곳이라는 관련된 뜻이에요." },
    { word: '벽', sentence1: '교실 [벽]에 그림을 붙였다.', sentence2: '어려운 문제 앞에서 큰 [벽]을 느꼈다.', meaning1: '공간을 막는 수직의 면', meaning2: '넘기 어려운 장애나 어려움', explanation: "두 문장의 '벽'은 막고 있는 것이라는 관련된 뜻으로 쓰였어요." },
    { word: '그림자', sentence1: '햇빛 때문에 운동장에 [그림자]가 생겼다.', sentence2: '친구는 형의 [그림자]처럼 늘 따라다녔다.', meaning1: '빛이 가려져 생기는 어두운 모양', meaning2: '곁에서 늘 따라다니는 사람이나 흔적', explanation: "두 문장의 '그림자'는 따라붙는 어두운 모양에서 늘 따라다니는 것이라는 뜻으로 넓어졌어요." },
    { word: '열쇠', sentence1: '나는 집 [열쇠]를 가방에 넣었다.', sentence2: '성공의 [열쇠]는 꾸준한 노력이다.', meaning1: '자물쇠를 여는 물건', meaning2: '문제를 해결하는 중요한 방법', explanation: "두 문장의 '열쇠'는 무언가를 열거나 해결하게 하는 것이라는 관련된 뜻이에요." },
    { word: '씨앗', sentence1: '봉숭아 [씨앗]을 화단에 심었다.', sentence2: '작은 친절이 우정의 [씨앗]이 되었다.', meaning1: '식물이 자라나는 작은 알맹이', meaning2: '어떤 일이 시작되는 바탕', explanation: "두 문장의 '씨앗'은 새롭게 시작되는 바탕이라는 관련된 뜻이에요." },
    { word: '꽃', sentence1: '화단에 예쁜 [꽃]이 피었다.', sentence2: '운동회의 [꽃]은 이어달리기였다.', meaning1: '식물에서 아름다운 색과 향이 나는 부분', meaning2: '가장 돋보이는 부분', explanation: "두 문장의 '꽃'은 아름답고 돋보이는 것이라는 관련된 뜻으로 쓰였어요." },
    { word: '기둥', sentence1: '건물을 받치는 [기둥]이 튼튼했다.', sentence2: '아버지는 우리 집의 [기둥] 같은 분이다.', meaning1: '건물이나 물건을 받치는 세로 구조물', meaning2: '중요하게 떠받치는 사람이나 존재', explanation: "두 문장의 '기둥'은 든든하게 받쳐 주는 것이라는 관련된 뜻이에요." },
    { word: '뼈', sentence1: '생선 [뼈]를 조심히 발랐다.', sentence2: '이 글의 [뼈]를 먼저 찾아 보자.', meaning1: '몸을 지탱하는 단단한 부분', meaning2: '글이나 일의 중심이 되는 줄거리', explanation: "두 문장의 '뼈'는 중심을 잡아 주는 것이라는 관련된 뜻으로 쓰였어요." },
    { word: '살', sentence1: '모기에 물린 [살]이 가려웠다.', sentence2: '창문 틈으로 햇[살]이 들어왔다.', meaning1: '몸을 이루는 부드러운 부분', meaning2: '빛이나 기운이 뻗는 줄기', explanation: "두 문장의 '살'은 다른 뜻이지만 각각의 쓰임이 분명해요.", answerOverride: '동형이의어' },
    { word: '물결', sentence1: '바다에 푸른 [물결]이 일었다.', sentence2: '응원의 [물결]이 경기장에 퍼졌다.', meaning1: '물이 움직이며 이루는 줄기나 모양', meaning2: '많은 것이 한꺼번에 퍼지는 움직임', explanation: "두 문장의 '물결'은 퍼져 나가는 움직임이라는 관련된 뜻이에요." },
    { word: '씨름', sentence1: '두 선수가 모래판에서 [씨름]을 했다.', sentence2: '나는 어려운 수학 문제와 한참 [씨름]했다.', meaning1: '두 사람이 샅바를 잡고 겨루는 운동', meaning2: '어려운 일을 해결하려고 애쓰는 일', explanation: "두 문장의 '씨름'은 힘을 다해 겨루거나 애쓴다는 관련된 뜻이에요." },
    { word: '물', sentence1: '목이 말라 [물]을 마셨다.', sentence2: '새 옷에 파란 [물]이 들었다.', meaning1: '마실 수 있는 액체', meaning2: '색이 배어든 상태', explanation: "두 문장의 '물'은 서로 다른 뜻이지만 같은 모양으로 쓰이는 낱말이에요.", answerOverride: '동형이의어' },
    { word: '불', sentence1: '촛불의 [불]이 흔들렸다.', sentence2: '교실 [불]을 끄고 나왔다.', meaning1: '타면서 빛과 열을 내는 것', meaning2: '전등처럼 밝게 비추는 빛', explanation: "두 문장의 '불'은 밝게 비추거나 타는 것이라는 관련된 뜻이에요." },
    { word: '씨앗', sentence1: '작은 [씨앗]에서 새싹이 났다.', sentence2: '그 말이 다툼의 [씨앗]이 되었다.', meaning1: '식물이 자라기 시작하는 알맹이', meaning2: '어떤 일이 시작되는 원인', explanation: "두 문장의 '씨앗'은 일이 시작되는 바탕이라는 관련된 뜻이에요." },
    { word: '바닥', sentence1: '교실 [바닥]을 깨끗이 닦았다.', sentence2: '상자 [바닥]에 작은 구멍이 있었다.', meaning1: '평평하게 아래를 이루는 부분', meaning2: '물건의 가장 아래 부분', explanation: "두 문장의 '바닥'은 아래쪽 면이라는 관련된 뜻이에요." },
    { word: '꼬리', sentence1: '강아지가 [꼬리]를 흔들었다.', sentence2: '긴 줄 [꼬리]에 서서 기다렸다.', meaning1: '동물의 몸 뒤쪽에 길게 나온 부분', meaning2: '길게 이어진 것의 맨 뒤쪽', explanation: "두 문장의 '꼬리'는 뒤쪽 끝부분이라는 관련된 뜻이에요." },
    { word: '기름', sentence1: '팬에 [기름]을 두르고 달걀을 부쳤다.', sentence2: '친구의 칭찬이 내 마음에 [기름]을 부은 것 같았다.', meaning1: '음식을 만들 때 쓰는 미끈한 액체', meaning2: '힘이나 기운을 더해 주는 것', explanation: "두 문장의 '기름'은 잘 움직이게 하거나 힘을 더하는 느낌으로 관련되어 있어요." }
  ].map(item => Object.assign({ answer: '다의어', type: '다의어', note: '' }, item, { answer: item.answerOverride || '다의어', type: item.answerOverride || '다의어' }));

  const homonyms = [
    { word: '밤', sentence1: '[밤]에는 잠을 자야 한다.', sentence2: '따뜻한 화로에 [밤]을 구웠다.', meaning1: '해가 진 뒤부터 해가 뜨기 전까지의 시간', meaning2: '밤나무의 열매', explanation: "첫 번째 '밤'은 시간을 뜻하고, 두 번째 '밤'은 먹는 열매를 뜻해요." },
    { word: '배', sentence1: '밥을 많이 먹어 [배]가 불렀다.', sentence2: '강을 건너려고 [배]를 탔다.', meaning1: '사람이나 동물의 몸 가운데 앞부분', meaning2: '물 위를 다니는 탈것', explanation: "두 '배'는 소리와 모양은 같지만 몸의 부분과 탈것으로 뜻이 달라요." },
    { word: '말', sentence1: '친구의 [말]을 끝까지 들었다.', sentence2: '초원에서 [말]이 달리고 있었다.', meaning1: '사람이 생각을 나타내는 소리나 글', meaning2: '사람이 타기도 하는 동물', explanation: "첫 번째 '말'은 이야기이고, 두 번째 '말'은 동물이에요." },
    { word: '벌', sentence1: '꽃밭에서 [벌]이 날아다녔다.', sentence2: '규칙을 어겨 [벌]을 받았다.', meaning1: '꿀을 모으는 곤충', meaning2: '잘못한 일에 대해 받는 꾸중이나 처벌', explanation: "두 '벌'은 곤충과 처벌을 뜻하는 서로 다른 낱말이에요." },
    { word: '굴', sentence1: '바닷가에서 신선한 [굴]을 먹었다.', sentence2: '토끼가 숲속 [굴]로 들어갔다.', meaning1: '바다에서 나는 조개류', meaning2: '땅이나 바위에 뚫린 구멍', explanation: "두 '굴'은 먹는 조개와 뚫린 구멍으로 뜻이 달라요." },
    { word: '김', sentence1: '밥에 [김]을 싸서 먹었다.', sentence2: '뜨거운 국에서 [김]이 올라왔다.', meaning1: '바다에서 나는 얇은 해조류 음식', meaning2: '뜨거운 것에서 올라오는 수증기', explanation: "두 '김'은 음식과 수증기를 뜻하는 서로 다른 낱말이에요." },
    { word: '새', sentence1: '[새]가 나뭇가지에 앉았다.', sentence2: '나는 [새] 운동화를 신고 학교에 갔다.', meaning1: '날개가 있어 하늘을 나는 동물', meaning2: '처음이거나 낡지 않은 것', explanation: "첫 번째 '새'는 동물이고, 두 번째 '새'는 새롭다는 뜻이에요." },
    { word: '풀', sentence1: '운동장 옆에 [풀]이 자랐다.', sentence2: '종이를 붙이려고 [풀]을 발랐다.', meaning1: '땅에서 자라는 작은 식물', meaning2: '종이나 물건을 붙이는 끈적한 물질', explanation: "두 '풀'은 식물과 붙이는 물질로 뜻이 달라요." },
    { word: '신', sentence1: '체육 시간에 [신]을 단단히 묶었다.', sentence2: '옛이야기에는 산을 지키는 [신]이 나온다.', meaning1: '발에 신는 물건', meaning2: '사람보다 뛰어난 힘을 가진 존재', explanation: "두 '신'은 신발과 특별한 존재를 뜻하는 서로 다른 낱말이에요." },
    { word: '감', sentence1: '가을에 주황색 [감]을 먹었다.', sentence2: '그 친구는 그림에 대한 [감]이 좋다.', meaning1: '감나무의 열매', meaning2: '어떤 일을 알아차리는 느낌이나 능력', explanation: "두 '감'은 과일과 느낌을 뜻하는 서로 다른 낱말이에요." },
    { word: '사과', sentence1: '아침에 빨간 [사과]를 먹었다.', sentence2: '실수한 친구가 먼저 [사과]를 했다.', meaning1: '사과나무의 열매', meaning2: '잘못을 인정하고 용서를 비는 일', explanation: "두 '사과'는 과일과 미안함을 전하는 일을 뜻해요." },
    { word: '열', sentence1: '감기에 걸려 [열]이 났다.', sentence2: '학생들이 두 [열]로 줄을 섰다.', meaning1: '몸이 뜨거워지는 기운', meaning2: '사람이나 물건이 길게 늘어선 줄', explanation: "두 '열'은 뜨거운 기운과 줄을 뜻하는 서로 다른 낱말이에요." },
    { word: '쓰다', sentence1: '연필로 이름을 [쓰다].', sentence2: '이 약은 맛이 [쓰다].', meaning1: '글씨나 글을 적다', meaning2: '맛이 달지 않고 씁쓸하다', explanation: "두 '쓰다'는 글을 적는 일과 맛을 나타내는 서로 다른 낱말이에요." },
    { word: '타다', sentence1: '아침에 버스를 [타다].', sentence2: '빵이 오래 구워져 [타다].', meaning1: '탈것에 오르다', meaning2: '불이나 열에 그을리다', explanation: "두 '타다'는 탈것에 오르는 것과 그을리는 것을 뜻해요." },
    { word: '들다', sentence1: '상자를 두 손으로 [들다].', sentence2: '새 가방이 마음에 [들다].', meaning1: '손으로 위로 올리다', meaning2: '좋게 느껴져 마음에 맞다', explanation: "두 '들다'는 올리는 일과 마음에 맞는 일을 뜻하는 서로 다른 낱말이에요." },
    { word: '갈다', sentence1: '무딘 연필심을 칼로 [갈다].', sentence2: '낡은 전구를 새것으로 [갈다].', meaning1: '날카롭게 만들거나 잘게 부수다', meaning2: '다른 것으로 바꾸다', explanation: "두 '갈다'는 날카롭게 하는 일과 바꾸는 일을 뜻해요." },
    { word: '차다', sentence1: '운동장에서 공을 세게 [차다].', sentence2: '겨울바람이 몹시 [차다].', meaning1: '발로 밀어 보내다', meaning2: '온도가 낮아 차갑다', explanation: "두 '차다'는 발로 미는 일과 차가운 느낌을 뜻해요." },
    { word: '맞다', sentence1: '친구가 낸 문제의 답이 [맞다].', sentence2: '비를 [맞다].', meaning1: '틀리지 않고 옳다', meaning2: '비나 눈 등을 몸에 받다', explanation: "두 '맞다'는 옳다는 뜻과 비를 받는다는 뜻으로 달라요." },
    { word: '자다', sentence1: '밤에는 일찍 [자다].', sentence2: '오래 쓰지 않은 기계가 [자다].', meaning1: '잠을 자다', meaning2: '쓰이지 않고 가만히 있다', explanation: "두 '자다'는 잠자는 일과 쓰이지 않는 상태를 뜻해요." },
    { word: '차', sentence1: '따뜻한 [차]를 마셨다.', sentence2: '아빠가 [차]를 몰고 학교 앞에 왔다.', meaning1: '잎이나 열매를 우려 마시는 물', meaning2: '사람이나 물건을 싣고 다니는 자동차', explanation: "두 '차'는 마시는 차와 자동차를 뜻하는 서로 다른 낱말이에요." },
    { word: '눈', sentence1: '하늘에서 하얀 [눈]이 내렸다.', sentence2: '나는 [눈]으로 작은 글씨를 읽었다.', meaning1: '하늘에서 내리는 얼음 결정', meaning2: '사물을 보는 몸의 기관', explanation: "두 '눈'은 날씨의 눈과 보는 눈을 뜻해요." },
    { word: '장', sentence1: '엄마가 된[장]으로 찌개를 끓였다.', sentence2: '책의 첫 [장]을 조심히 넘겼다.', meaning1: '콩으로 만든 양념', meaning2: '책이나 종이의 한 면이나 한 매', explanation: "두 '장'은 양념과 종이의 단위를 뜻하는 서로 다른 낱말이에요." },
    { word: '연', sentence1: '바람이 불어 [연]이 높이 올랐다.', sentence2: '연못에 분홍 [연]이 피었다.', meaning1: '실에 매달아 하늘에 날리는 놀이 도구', meaning2: '연못에서 자라는 식물', explanation: "두 '연'은 놀이 도구와 식물을 뜻하는 서로 다른 낱말이에요." },
    { word: '굴다', sentence1: '공이 데굴데굴 [굴다].', sentence2: '동생은 심술궂게 [굴다].', meaning1: '둥근 것이 바닥에서 돌며 움직이다', meaning2: '어떤 태도로 행동하다', explanation: "두 '굴다'는 굴러가는 일과 행동하는 일을 뜻해요." },
    { word: '개다', sentence1: '비가 그치고 하늘이 [개다].', sentence2: '엄마가 빨래를 반듯하게 [개다].', meaning1: '흐린 날씨가 맑아지다', meaning2: '옷이나 종이를 접다', explanation: "두 '개다'는 날씨가 맑아지는 일과 접는 일을 뜻해요." },
    { word: '물다', sentence1: '강아지가 장난감을 [물다].', sentence2: '가게에서 물건값을 [물다].', meaning1: '입으로 꽉 잡다', meaning2: '돈이나 값을 치르다', explanation: "두 '물다'는 입으로 잡는 일과 돈을 내는 일을 뜻해요." },
    { word: '박다', sentence1: '벽에 못을 [박다].', sentence2: '책상 모서리에 머리를 [박다].', meaning1: '못이나 말뚝을 단단히 꽂다', meaning2: '세게 부딪치다', explanation: "두 '박다'는 꽂는 일과 부딪치는 일을 뜻해요." },
    { word: '타다', sentence1: '누나는 자전거를 잘 [타다].', sentence2: '그 친구는 낯을 많이 [타다].', meaning1: '탈것이나 물건 위에 오르다', meaning2: '어떤 영향을 쉽게 받다', explanation: "두 '타다'는 올라타는 일과 영향을 받는 일을 뜻해요." },
    { word: '세다', sentence1: '나는 동전을 하나씩 [세다].', sentence2: '바람이 너무 [세다].', meaning1: '수를 헤아리다', meaning2: '힘이 강하다', explanation: "두 '세다'는 수를 헤아리는 일과 힘이 강한 상태를 뜻해요." },
    { word: '이', sentence1: '양치질을 하며 [이]를 닦았다.', sentence2: '[이] 책은 정말 재미있다.', meaning1: '입 안에 나 있는 단단한 것', meaning2: '가까이 있는 대상을 가리키는 말', explanation: "두 '이'는 치아와 가리키는 말을 뜻하는 서로 다른 낱말이에요." },
    { word: '해', sentence1: '아침에 [해]가 떠올랐다.', sentence2: '새 [해]가 밝았다.', meaning1: '태양', meaning2: '한 해라는 시간의 단위', explanation: "두 '해'는 태양과 일 년을 뜻하는 서로 다른 낱말이에요." },
    { word: '달', sentence1: '밤하늘에 둥근 [달]이 떴다.', sentence2: '다음 [달]에 체험학습을 간다.', meaning1: '밤하늘에 보이는 천체', meaning2: '한 달이라는 시간의 단위', explanation: "두 '달'은 하늘의 달과 시간 단위를 뜻해요." },
    { word: '말다', sentence1: '김밥을 김으로 돌돌 [말다].', sentence2: '친구에게 장난을 치지 [말다].', meaning1: '돌돌 감거나 싸다', meaning2: '어떤 행동을 하지 않다', explanation: "두 '말다'는 감는 일과 하지 않는 일을 뜻해요." },
    { word: '비다', sentence1: '물컵이 모두 [비다].', sentence2: '소원을 간절히 [비다].', meaning1: '안에 든 것이 없다', meaning2: '바라거나 용서를 구하다', explanation: "두 '비다'는 비어 있는 상태와 바라며 청하는 일을 뜻해요." },
    { word: '사다', sentence1: '문구점에서 연필을 [사다].', sentence2: '그 행동은 친구들의 오해를 [사다].', meaning1: '돈을 주고 물건을 얻다', meaning2: '어떤 평가나 감정을 받다', explanation: "두 '사다'는 물건을 사는 일과 감정을 받는 일을 뜻해요." },
    { word: '나다', sentence1: '화단에 새싹이 [나다].', sentence2: '친구에게서 좋은 냄새가 [나다].', meaning1: '새로 생기거나 나오다', meaning2: '냄새나 소리가 느껴지다', explanation: "두 '나다'는 생기는 일과 느껴지는 일을 뜻해요." },
    { word: '쓰다', sentence1: '우산을 [쓰다].', sentence2: '일기를 정성껏 [쓰다].', meaning1: '머리 위나 몸에 얹어 가리다', meaning2: '글씨나 글을 적다', explanation: "두 '쓰다'는 우산을 쓰는 일과 글을 쓰는 일을 뜻해요." },
    { word: '켜다', sentence1: '어두워져서 전등을 [켜다].', sentence2: '동생은 바이올린을 [켜다].', meaning1: '불이나 기계를 작동하게 하다', meaning2: '현악기를 활로 문질러 소리 내다', explanation: "두 '켜다'는 전등을 켜는 일과 악기를 연주하는 일을 뜻해요." },
    { word: '매다', sentence1: '운동화 끈을 단단히 [매다].', sentence2: '밭에서 풀을 [매다].', meaning1: '끈이나 줄을 묶다', meaning2: '논밭의 잡풀을 뽑다', explanation: "두 '매다'는 묶는 일과 풀을 뽑는 일을 뜻해요." },
    { word: '빨다', sentence1: '빨대로 주스를 [빨다].', sentence2: '흰 양말을 깨끗이 [빨다].', meaning1: '입으로 액체를 들이마시다', meaning2: '물에 씻어 깨끗하게 하다', explanation: "두 '빨다'는 마시는 일과 세탁하는 일을 뜻해요." },
    { word: '차리다', sentence1: '저녁상을 정성껏 [차리다].', sentence2: '넘어진 친구가 정신을 [차리다].', meaning1: '음식이나 물건을 준비해 놓다', meaning2: '정신이나 기운을 되찾다', explanation: "두 '차리다'는 준비하는 일과 정신을 되찾는 일을 뜻해요." },
    { word: '재다', sentence1: '자로 책상 길이를 [재다].', sentence2: '그 친구는 행동이 무척 [재다].', meaning1: '길이나 양을 헤아리다', meaning2: '행동이 빠르거나 민첩하다', explanation: "두 '재다'는 헤아리는 일과 빠른 성질을 뜻해요." },
    { word: '졸다', sentence1: '수업 중에 깜빡 [졸다].', sentence2: '국물이 오래 끓어 많이 [졸다].', meaning1: '잠깐 잠이 들다', meaning2: '물기가 줄어들다', explanation: "두 '졸다'는 잠드는 일과 국물이 줄어드는 일을 뜻해요." },
    { word: '주다', sentence1: '친구에게 연필을 [주다].', sentence2: '그 일은 우리에게 기쁨을 [주다].', meaning1: '다른 사람에게 건네다', meaning2: '느낌이나 영향을 생기게 하다', explanation: "두 '주다'는 건네는 일과 영향을 끼치는 일을 뜻해요." },
    { word: '치다', sentence1: '동생이 북을 둥둥 [치다].', sentence2: '아빠가 거실에 텐트를 [치다].', meaning1: '손이나 도구로 때려 소리 내다', meaning2: '막이나 줄 등을 설치하다', explanation: "두 '치다'는 때리는 일과 설치하는 일을 뜻해요." },
    { word: '피다', sentence1: '봄이 되자 꽃이 [피다].', sentence2: '친구의 얼굴에 웃음꽃이 [피다].', meaning1: '꽃봉오리가 벌어지다', meaning2: '표정이나 분위기가 밝아지다', explanation: "두 '피다'는 벌어지거나 밝게 드러나는 관련된 뜻이에요.", answerOverride: '다의어' },
    { word: '나다', sentence1: '길에서 이상한 소리가 [나다].', sentence2: '친구는 화가 [나다].', meaning1: '소리나 냄새가 생겨 느껴지다', meaning2: '감정이 생기다', explanation: "두 '나다'는 어떤 것이 생겨 드러난다는 관련된 뜻이에요.", answerOverride: '다의어' },
    { word: '손', sentence1: '나는 [손]으로 공을 잡았다.', sentence2: '농사에는 많은 [손]이 필요하다.', meaning1: '팔 끝에 있는 몸의 부분', meaning2: '일을 도와주는 사람의 힘', explanation: "두 '손'은 몸의 손에서 일손이라는 뜻으로 넓어졌어요.", answerOverride: '다의어' },
    { word: '줄', sentence1: '공책에 반듯한 [줄]을 그었다.', sentence2: '공연장 앞에 긴 [줄]이 생겼다.', meaning1: '길게 그은 선', meaning2: '사람들이 길게 늘어선 모양', explanation: "두 '줄'은 길게 이어진 모양이라는 관련된 뜻이에요.", answerOverride: '다의어' },
    { word: '장', sentence1: '운동[장]에서 달리기를 했다.', sentence2: '종이 한 [장]에 그림을 그렸다.', meaning1: '넓은 장소를 나타내는 말', meaning2: '종이를 세는 단위', explanation: "두 '장'은 장소와 종이 단위로 뜻이 서로 달라요." }
  ].map(item => Object.assign({ answer: '동형이의어', type: '동형이의어', note: '' }, item, { answer: item.answerOverride || '동형이의어', type: item.answerOverride || '동형이의어' }));

  return polysemy.concat(homonyms);
}

/*
 * [MANUAL ADMIN TOOL]
 * Apps Script 편집기에서 교사가 필요할 때 직접 실행하는 관리용 함수입니다.
 * 웹앱 UI에서는 직접 호출하지 않습니다.
 * 삼국지문제 시트의 C~F열(보기)과 G열(정답번호)을 랜덤 재배열합니다.
 */
function shuffleSamgukjiAnswers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('삼국지문제');
  if (!sheet) {
    Logger.log('시트를 찾을 수 없습니다: 삼국지문제');
    return;
  }
  const lastRow = sheet.getLastRow();

  // 2행부터 시작 (1행은 헤더)
  for (let row = 2; row <= lastRow; row++) {
    // C~F열 = 컬럼 3~6 (보기1~4), G열 = 컬럼 7 (정답번호)
    const choicesRange = sheet.getRange(row, 3, 1, 4);
    const choices = choicesRange.getValues()[0]; // [보기1, 보기2, 보기3, 보기4]
    const correctIndex = sheet.getRange(row, 7).getValue(); // 1~4

    if (!correctIndex || correctIndex < 1 || correctIndex > 4) continue;

    // 현재 정답 텍스트 저장
    const correctText = choices[correctIndex - 1];

    // Fisher-Yates 셔플
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    // 새 정답 번호 찾기
    const newCorrectIndex = choices.indexOf(correctText) + 1;

    // 시트에 반영
    choicesRange.setValues([choices]);
    sheet.getRange(row, 7).setValue(newCorrectIndex);
  }

  Logger.log('완료: ' + (lastRow - 1) + '개 문제 보기 순서 재배열');
  SpreadsheetApp.getUi().alert('완료! ' + (lastRow - 1) + '개 문제의 보기 순서를 랜덤 재배열했습니다.');
}
