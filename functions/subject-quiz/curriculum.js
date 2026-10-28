'use strict';
// 2022 revised curriculum. Source mapping: docs/product/SUBJECT_QUIZ_CURRICULUM_2026-10-17.md.
const VERSION = 'subject-2022-v1';
const subjects = [
  { id: 'korean', title: '국어', icon: '📚', publisher: '국정', groups: [
    { id: '4-1', title: '4학년 1학기', units: ['깊이 있게 읽어요', '서로 다른 의견', '자세하게 살펴요', '뜻을 파악하며 읽어요', '말과 글로 전하는 생각', '경험을 표현해요', '독서 · 질문을 만들며 책을 읽어요', '매체 · 인터넷에서 자료를 찾아요'] },
    { id: '4-2', title: '4학년 2학기', units: ['비교하며 읽어요', '우리말 우리글', '의견을 모아서', '책 속의 길을 따라', '오가는 마음', '상상의 날개', '독서 · 생각을 나누며 책을 읽어요', '매체 · 자료를 활용하여 발표해요'] },
    { id: 'spelling', title: '맞춤법', description: '초등 6학년까지의 어휘·맞춤법·띄어쓰기', units: ['맞춤법과 띄어쓰기'] }
  ] },
  { id: 'math', title: '수학', icon: '➗', publisher: '아이스크림 · 김성여', groups: [
    { id: '4-1', title: '4학년 1학기', units: ['큰 수', '각도', '곱셈과 나눗셈', '평면도형의 이동', '막대그래프', '규칙과 관계'] },
    { id: '4-2', title: '4학년 2학기', units: ['분수의 덧셈과 뺄셈', '삼각형', '소수의 덧셈과 뺄셈', '사각형', '꺾은선그래프', '다각형'] }
  ] },
  { id: 'social', title: '사회', icon: '🏛️', publisher: '비상 · 설규주', groups: [
    { id: '4-1', title: '4학년 1학기', units: ['지도로 만나는 우리 지역', '우리 지역의 국가유산', '경제활동과 지역 간 교류'] },
    { id: '4-2', title: '4학년 2학기', units: ['민주주의와 자치', '지역문제를 해결하고 지역을 알리는 노력', '다양한 환경과 삶의 모습'] },
    { id: 'korean-history', title: '한국사', parent: '역사', units: ['삼국시대 · 고조선~통일신라·발해', '고려시대', '조선시대', '현대사 · 대한제국~현대'] },
    { id: 'world-history', title: '세계사', parent: '역사', units: ['서양사', '중국사'] }
  ] },
  { id: 'science', title: '과학', icon: '🔬', publisher: '비상 · 강석진', groups: [
    { id: '4-1', title: '4학년 1학기', units: ['자석의 이용', '물의 상태 변화', '땅의 변화', '다양한 생물과 우리 생활'] },
    { id: '4-2', title: '4학년 2학기', units: ['밤하늘 관찰', '생물과 환경', '여러 가지 기체', '기후변화와 우리 생활'] }
  ] }
];
const units = subjects.flatMap(subject => subject.groups.flatMap(group => group.units.map((title, i) => ({
  id: `${subject.id}:${group.id}:${i + 1}`, subject: subject.id, group: group.id,
  title, number: i + 1, groupTitle: group.title, publisher: subject.publisher
}))));
const unitById = Object.fromEntries(units.map(unit => [unit.id, unit]));
const legacyQuizIds = ['reading','gmo','time_store','spelling','word-relation','spacing','proverb','idiom','samgukji','ancient-history','history-people','unified-silla-balhae','cultural_heritage','multiplication_division','random-basic','fraction-basic','calculation_practice','science-general'];
const legacyCategoryKeys = ['맞춤법','단어다의어-동형이의어','국어띄어쓰기','국어속담','국어사자성어','독서지엠오-아이','독서시간가게','사회삼국지','사회고대사-삼국시대','사회통일신라-발해','사회문화유산','인물역사-인물','역사-인물','수학곱셈과-나눗셈','수학분수','수학분수-기초','과학과학-상식'];
const isLegacyRecord = row => legacyQuizIds.includes(row.quizId) || legacyCategoryKeys.includes(row.categoryKey || row.category);
function legacySubject(quizId) {
  if(['reading','gmo','time_store','spelling','word-relation','spacing','proverb','idiom'].includes(quizId))return 'korean';
  if(['samgukji','ancient-history','history-people','unified-silla-balhae','cultural_heritage'].includes(quizId))return 'social';
  if(['multiplication_division','random-basic','fraction-basic','calculation_practice'].includes(quizId))return 'math';
  return quizId==='science-general'?'science':null;
}
module.exports = { VERSION, subjects, units, unitById, legacyQuizIds, legacyCategoryKeys, isLegacyRecord, legacySubject };
