/* 수학 서바이버 — 학년·단원별 문제 자동 생성 (2022 개정 1학기 기준)
 * 문제는 4지선다: { text, choices[4], answerIndex, unit }
 * 숫자만 바꿔 무한히 만들 수 있도록 단원마다 생성 함수를 둔다. */
(function () {
  'use strict';

  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[R(0, arr.length - 1)];
  const comma = (n) => n.toLocaleString('ko-KR');

  // 정답 1개 + 그럴듯한 오답 3개 → 섞어서 보기 4개 만들기
  function build(unit, text, answer, wrongGen) {
    const set = new Set([String(answer)]);
    let guard = 0;
    while (set.size < 4 && guard++ < 80) {
      const w = wrongGen();
      if (w !== null && w !== undefined && String(w) !== String(answer)) set.add(String(w));
    }
    const choices = [...set];
    // 섞기
    for (let i = choices.length - 1; i > 0; i--) {
      const j = R(0, i);
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return { unit, text, choices, answerIndex: choices.indexOf(String(answer)) };
  }

  // 숫자 정답용 기본 오답: 정답 근처의 다른 수
  function nearNum(ans, fmt) {
    const f = fmt || ((n) => String(n));
    return () => {
      const diffs = [-30, -20, -12, -10, -3, -2, -1, 1, 2, 3, 10, 12, 20, 30, 100, -100];
      const w = ans + pick(diffs);
      return w > 0 ? f(w) : null;
    };
  }

  // ---------- 3학년 1학기 ----------
  const G3 = [
    function add() { // 세 자리 수 덧셈
      const a = R(120, 780), b = R(110, 999 - 780);
      return build('덧셈과 뺄셈', `${a} + ${b} = ?`, a + b, nearNum(a + b));
    },
    function sub() { // 세 자리 수 뺄셈
      const a = R(400, 980), b = R(110, a - 150);
      return build('덧셈과 뺄셈', `${a} − ${b} = ?`, a - b, nearNum(a - b));
    },
    function mul() { // (두 자리)×(한 자리)
      const a = R(12, 49), b = R(2, 9);
      return build('곱셈', `${a} × ${b} = ?`, a * b, nearNum(a * b));
    },
    function div() { // 곱셈구구 범위 나눗셈
      const b = R(2, 9), q = R(2, 9);
      return build('나눗셈', `${b * q} ÷ ${b} = ?`, q,
        () => { const w = q + pick([-2, -1, 1, 2, 3]); return w >= 1 && w <= 12 ? w : null; });
    },
    function time() { // 길이와 시간
      const m = R(1, 5), s = pick([0, 10, 20, 30, 40, 50]);
      const ans = m * 60 + s;
      return build('길이와 시간', `${m}분 ${s ? s + '초' : ''}는 모두 몇 초일까?`, `${ans}초`,
        () => `${ans + pick([-60, -30, -10, 10, 30, 60, 100])}초`);
    },
  ];

  // ---------- 4학년 1학기 ----------
  const G4 = [
    function bigPlace() { // 큰 수: 자릿값
      let n = R(23456, 98765);
      const digits = String(n).split('');
      let idx = R(0, 2); // 만·천·백의 자리 중에서
      if (digits[idx] === '0') idx = 0;
      const d = Number(digits[idx]);
      const place = Math.pow(10, digits.length - 1 - idx);
      const ans = comma(d * place);
      return build('큰 수', `${comma(n)}에서 숫자 ${d}가 나타내는 값은?`, ans,
        () => comma(d * Math.pow(10, R(0, 4))));
    },
    function bigTimes() { // 큰 수: 10배·100배
      const n = pick([250, 340, 1200, 5600, 780]);
      const t = pick([10, 100]);
      return build('큰 수', `${comma(n)}의 ${t}배는?`, comma(n * t),
        () => comma(n * pick([10, 100, 1000]) * pick([1, 10]) / pick([1, 10])));
    },
    function angle() { // 각도 계산
      const kind = R(0, 2);
      if (kind === 0) {
        const a = R(35, 120), b = R(20, 55);
        return build('각도', `${a}° + ${b}° = ?`, `${a + b}°`, () => `${a + b + pick([-20, -10, -5, 5, 10, 20])}°`);
      }
      if (kind === 1) {
        const a = R(30, 80); // 삼각형 세 각의 합 = 180°
        const b = R(30, 80);
        return build('각도', `삼각형에서 두 각이 ${a}°, ${b}°일 때 나머지 한 각은?`, `${180 - a - b}°`,
          () => `${180 - a - b + pick([-20, -10, 10, 20, 30])}°`);
      }
      return build('각도', `직선이 이루는 각은 몇 도일까?`, '180°',
        () => pick(['90°', '120°', '270°', '360°', '60°']));
    },
    function mul22() { // (두 자리)×(두 자리)
      const a = R(12, 38), b = R(11, 24);
      return build('곱셈과 나눗셈', `${a} × ${b} = ?`, a * b, nearNum(a * b));
    },
    function div2() { // (두·세 자리)÷(두 자리)
      const b = R(12, 24), q = R(3, 9);
      return build('곱셈과 나눗셈', `${b * q} ÷ ${b} = ?`, q,
        () => { const w = q + pick([-2, -1, 1, 2]); return w >= 1 ? w : null; });
    },
  ];

  // ---------- 5학년 1학기 ----------
  const G5 = [
    function mixed() { // 자연수의 혼합 계산
      const kind = R(0, 2);
      if (kind === 0) {
        const a = R(3, 20), b = R(2, 9), c = R(2, 9);
        return build('혼합 계산', `${a} + ${b} × ${c} = ?`, a + b * c, nearNum(a + b * c));
      }
      if (kind === 1) {
        const a = R(2, 9), b = R(2, 9), c = R(2, 6);
        return build('혼합 계산', `(${a} + ${b}) × ${c} = ?`, (a + b) * c, nearNum((a + b) * c));
      }
      const b = R(2, 6), q = R(2, 8), a = R(30, 60);
      return build('혼합 계산', `${a} − ${b * q} ÷ ${b} = ?`, a - q, nearNum(a - q));
    },
    function gcd() { // 최대공약수 (작은 수)
      const m = R(2, 9);
      const [a, b] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6]]);
      return build('약수와 배수', `${m * a}와(과) ${m * b}의 최대공약수는?`, m,
        () => { const w = m + pick([-2, -1, 1, 2, m]); return w >= 1 ? w : null; });
    },
    function lcm() { // 최소공배수 (작은 수)
      const [a, b, l] = pick([[4, 6, 12], [6, 8, 24], [3, 5, 15], [4, 10, 20], [6, 9, 18], [8, 12, 24]]);
      return build('약수와 배수', `${a}와(과) ${b}의 최소공배수는?`, l,
        () => pick([a * b, l * 2, l / 2, l + a, l - a].filter((n) => n >= 1 && Number.isInteger(n))));
    },
    function fracAdd() { // 분모가 같은 분수의 덧셈·뺄셈
      const d = pick([5, 7, 8, 9, 10, 12]);
      const a = R(1, d - 2), b = R(1, d - 1 - a);
      const plus = Math.random() < 0.6;
      const big = a + b, small = Math.min(a, b), diff = Math.abs(a - b) || 1;
      const text = plus ? `${a}/${d} + ${b}/${d} = ?` : `${big}/${d} − ${small}/${d} = ?`;
      const ansN = plus ? a + b : big - small;
      return build('분수', text, `${ansN}/${d}`,
        () => pick([`${ansN + 1}/${d}`, `${Math.max(1, ansN - 1)}/${d}`, `${ansN}/${d + d}`, `${a * b}/${d}`, `${ansN}/${Math.max(2, d - 1)}`]));
    },
    function area() { // 다각형의 둘레와 넓이
      const w = R(3, 12), h = R(2, 9);
      if (Math.random() < 0.5) {
        return build('둘레와 넓이', `가로 ${w}cm, 세로 ${h}cm인 직사각형의 넓이는?`, `${w * h}cm²`,
          () => `${pick([w * h + w, w * h - h, 2 * (w + h), w * h + 10, w + h])}cm²`);
      }
      return build('둘레와 넓이', `가로 ${w}cm, 세로 ${h}cm인 직사각형의 둘레는?`, `${2 * (w + h)}cm`,
        () => `${pick([w + h, w * h, 2 * w + h, 2 * (w + h) + 2, 2 * (w + h) - 2])}cm`);
    },
  ];

  // ---------- 6학년 1학기 ----------
  const G6 = [
    function fracDiv() { // 분수의 나눗셈
      if (Math.random() < 0.5) {
        const c = R(2, 4), n = c * R(1, 3), d = pick([5, 7, 8, 9, 11]);
        return build('분수의 나눗셈', `${n}/${d} ÷ ${c} = ?`, `${n / c}/${d}`,
          () => pick([`${n}/${d * c}`, `${n * c}/${d}`, `${Math.max(1, n / c - 1)}/${d}`, `${n / c}/${Math.max(2, d - 2)}`]));
      }
      const a = R(2, 9), b = R(2, 6);
      return build('분수의 나눗셈', `${a} ÷ 1/${b} = ?`, a * b, nearNum(a * b));
    },
    function decDiv() { // 소수의 나눗셈
      const b = pick([0.2, 0.4, 0.5, 0.8, 1.2, 1.5]);
      const q = R(2, 9);
      const a = Math.round(b * q * 10) / 10;
      return build('소수의 나눗셈', `${a} ÷ ${b} = ?`, q,
        () => { const w = q + pick([-2, -1, 1, 2, 10]); return w >= 1 ? w : null; });
    },
    function ratio() { // 비와 비율
      if (Math.random() < 0.5) {
        const p = pick([10, 20, 25, 50, 75]);
        const base = pick([40, 60, 80, 120, 200, 400]);
        const ans = base * p / 100;
        return build('비와 비율', `${base}의 ${p}%는?`, ans, nearNum(ans));
      }
      const [n, d, p] = pick([[1, 2, 50], [1, 4, 25], [3, 4, 75], [1, 5, 20], [2, 5, 40], [1, 10, 10]]);
      return build('비와 비율', `${n}/${d}을(를) 백분율로 나타내면?`, `${p}%`,
        () => `${pick([p + 5, p - 5, p * 2, 100 - p, p + 10].filter((x) => x > 0 && x <= 100))}%`);
    },
    function volume() { // 직육면체의 부피
      const w = R(2, 6), h = R(2, 5), d = R(2, 5);
      const ans = w * h * d;
      return build('부피', `가로 ${w}cm, 세로 ${h}cm, 높이 ${d}cm인 직육면체의 부피는?`, `${ans}cm³`,
        () => `${pick([ans + w, ans - h, w * h, w + h + d, ans * 2, ans + 10])}cm³`);
    },
  ];

  // ---------- 3학년 2학기 ----------
  const G3_2 = [
    function mul31() { // (세 자리)×(한 자리)
      const a = R(112, 332), b = R(2, 3);
      return build('곱셈', `${a} × ${b} = ?`, a * b, nearNum(a * b));
    },
    function divRemain() { // 나머지가 있는 나눗셈
      const b = R(2, 9);
      let a = R(13, 89);
      if (a % b === 0) a += 1;
      const r = a % b;
      return build('나눗셈', `${a} ÷ ${b}의 나머지는?`, r,
        () => { const w = R(0, b - 1); return w !== r ? w : null; });
    },
    function circle() { // 원: 지름과 반지름
      const r = R(2, 12);
      if (Math.random() < 0.5) {
        return build('원', `반지름이 ${r}cm인 원의 지름은?`, `${r * 2}cm`, () => `${pick([r, r * 2 + 2, r * 2 - 2, r * 3, r + 2])}cm`);
      }
      return build('원', `지름이 ${r * 2}cm인 원의 반지름은?`, `${r}cm`, () => `${pick([r * 2, r + 1, r - 1, r * 4, r + 2].filter((n) => n > 0))}cm`);
    },
    function capacity() { // 들이와 무게
      if (Math.random() < 0.5) {
        const n = R(2, 9);
        return build('들이와 무게', `${n}L는 모두 몇 mL일까?`, `${n * 1000}mL`, () => `${pick([n * 100, n * 10, n * 1000 + 100, (n + 1) * 1000])}mL`);
      }
      const k = R(2, 9);
      return build('들이와 무게', `${k}kg 500g은 모두 몇 g일까?`, `${k * 1000 + 500}g`, () => `${pick([k * 100 + 500, k * 1000, k * 1000 + 50, (k + 1) * 1000])}g`);
    },
    function fracKind() { // 진분수·가분수 (c[0]이 정답, build가 섞어 줌)
      const sets = [['7/5', '3/5', '2/7', '1/2'], ['9/4', '1/4', '3/8', '2/5'], ['8/3', '2/3', '1/3', '5/6'], ['11/6', '5/6', '1/6', '2/9']];
      const c = pick(sets);
      let i = 0;
      return build('분수', '다음 중 가분수는 어느 것일까?', c[0], () => c[++i] || null);
    },
  ];

  // ---------- 4학년 2학기 ----------
  const G4_2 = [
    function fracAddSub() { // 분모가 같은 분수
      const d = pick([5, 6, 7, 8, 9, 10]);
      const a = R(1, d - 2), b = R(1, d - 1 - a);
      if (Math.random() < 0.5) {
        return build('분수의 덧셈과 뺄셈', `${a}/${d} + ${b}/${d} = ?`, `${a + b}/${d}`,
          () => pick([`${a + b + 1}/${d}`, `${Math.max(1, a + b - 1)}/${d}`, `${a + b}/${d * 2}`, `${a * b}/${d}`]));
      }
      const big = a + b;
      return build('분수의 덧셈과 뺄셈', `${big}/${d} − ${a}/${d} = ?`, `${b}/${d}`,
        () => pick([`${b + 1}/${d}`, `${Math.max(1, b - 1)}/${d}`, `${big}/${d}`, `${b}/${Math.max(2, d - 1)}`]));
    },
    function triangle() { // 삼각형
      if (Math.random() < 0.5) {
        const apex = pick([20, 30, 40, 50, 60, 80, 100]);
        return build('삼각형', `이등변삼각형의 꼭지각이 ${apex}°일 때, 밑각 한 개의 크기는?`, `${(180 - apex) / 2}°`,
          () => `${pick([(180 - apex), apex, (180 - apex) / 2 + 10, (180 - apex) / 2 - 10, 90])}°`);
      }
      return build('삼각형', '정삼각형의 한 각의 크기는?', '60°', () => pick(['90°', '45°', '30°', '120°', '180°']));
    },
    function decAddSub() { // 소수의 덧셈과 뺄셈
      const a = R(11, 79) / 10, b = R(11, 79) / 10;
      const fmt = (n) => Math.round(n * 10) / 10;
      if (Math.random() < 0.5) {
        const ans = fmt(a + b);
        return build('소수의 덧셈과 뺄셈', `${a} + ${b} = ?`, ans, () => fmt(ans + pick([-1, -0.5, -0.1, 0.1, 0.5, 1])));
      }
      const big = Math.max(a, b), small = Math.min(a, b);
      const ans = fmt(big - small);
      return build('소수의 덧셈과 뺄셈', `${big} − ${small} = ?`, ans, () => { const w = fmt(ans + pick([-1, -0.5, -0.1, 0.1, 0.5, 1])); return w > 0 ? w : null; });
    },
    function perpParallel() { // 수직과 평행
      const qs = [
        ['한 평면에서 서로 만나지 않는 두 직선을 무엇이라고 할까?', '평행선', ['수직선', '대각선', '곡선']],
        ['두 직선이 만나서 이루는 각이 직각일 때, 두 직선은 서로 어떤 관계일까?', '수직', ['평행', '대칭', '합동']],
      ];
      const [t, a, w] = pick(qs);
      let i = 0;
      return build('수직과 평행', t, a, () => w[i++] || null);
    },
    function polygon() { // 다각형
      if (Math.random() < 0.5) {
        const n = pick([[5, '오각형'], [6, '육각형'], [7, '칠각형'], [8, '팔각형']]);
        return build('다각형', `${n[1]}의 변은 모두 몇 개일까?`, `${n[0]}개`, () => `${pick([n[0] - 1, n[0] + 1, n[0] + 2, 4])}개`);
      }
      const qs = [['변의 길이와 각의 크기가 모두 같은 다각형을 무엇이라고 할까?', '정다각형', ['이등변다각형', '직각다각형', '평행다각형']],
        ['시간에 따라 변하는 양을 나타내기에 알맞은 그래프는?', '꺾은선그래프', ['막대그래프', '그림그래프', '원그래프']]];
      const [t, a, w] = pick(qs);
      let i = 0;
      return build('다각형과 그래프', t, a, () => w[i++] || null);
    },
  ];

  // ---------- 5학년 2학기 ----------
  const G5_2 = [
    function rounding() { // 수의 범위와 어림
      const n = R(123, 987);
      const ans = Math.round(n / 10) * 10;
      return build('어림하기', `${n}을 반올림하여 십의 자리까지 나타내면?`, ans,
        () => pick([ans + 10, ans - 10, Math.floor(n / 10) * 10 === ans ? ans + 20 : Math.floor(n / 10) * 10, Math.ceil(n / 10) * 10 === ans ? ans - 20 : Math.ceil(n / 10) * 10, n]));
    },
    function fracMul() { // 분수의 곱셈 (자연수×진분수, 결과가 자연수)
      const b = pick([2, 3, 4, 5]);
      const n = b * R(2, 4);
      const a = R(1, b - 1);
      const ans = n / b * a;
      return build('분수의 곱셈', `${n} × ${a}/${b} = ?`, ans, nearNum(ans));
    },
    function decMul() { // 소수의 곱셈
      const sets = [[0.3, 0.2, '0.06'], [0.4, 0.5, '0.2'], [0.2, 0.2, '0.04'], [1.5, 4, '6'], [2.5, 0.4, '1'], [0.6, 0.5, '0.3'], [1.2, 3, '3.6']];
      const [a, b, ans] = pick(sets);
      return build('소수의 곱셈', `${a} × ${b} = ?`, ans,
        () => pick(['0.6', '0.12', '0.02', '2', '6', '0.36', '1.2', '0.5', '3.6', '0.3'].filter((x) => x !== ans)));
    },
    function average() { // 평균
      const m = R(4, 9), d = R(1, 3);
      const nums = [m - d, m, m + d].sort(() => Math.random() - 0.5);
      return build('평균', `${nums.join(', ')}의 평균은?`, m, () => { const w = m + pick([-2, -1, 1, 2, 3]); return w > 0 ? w : null; });
    },
    function solid() { // 직육면체·합동과 대칭
      const qs = [
        ['직육면체의 면은 모두 몇 개일까?', '6개', ['4개', '8개', '12개']],
        ['직육면체의 모서리는 모두 몇 개일까?', '12개', ['6개', '8개', '10개']],
        ['직육면체의 꼭짓점은 모두 몇 개일까?', '8개', ['6개', '10개', '12개']],
        ['모양과 크기가 완전히 같아 포개면 겹치는 두 도형을 무엇이라고 할까?', '합동', ['대칭', '평행', '수직']],
      ];
      const [t, a, w] = pick(qs);
      let i = 0;
      return build('직육면체·합동', t, a, () => w[i++] || null);
    },
  ];

  // ---------- 6학년 2학기 ----------
  const G6_2 = [
    function fracDivSame() { // 분모가 같은 분수의 나눗셈
      const b = pick([5, 7, 9, 11]);
      const c = R(1, 3), q = R(2, 4);
      const a = c * q;
      if (a >= b) return G6_2[0]();
      return build('분수의 나눗셈', `${a}/${b} ÷ ${c}/${b} = ?`, q,
        () => { const w = q + pick([-2, -1, 1, 2]); return w >= 1 ? w : null; });
    },
    function decDiv2() { // 소수÷소수
      const b = pick([0.3, 0.4, 0.6, 0.7, 0.8, 1.2]);
      const q = R(2, 9);
      const a = Math.round(b * q * 10) / 10;
      return build('소수의 나눗셈', `${a} ÷ ${b} = ?`, q, () => { const w = q + pick([-2, -1, 1, 2, 10]); return w >= 1 ? w : null; });
    },
    function proportion() { // 비례식과 비례배분
      if (Math.random() < 0.5) {
        const a = R(2, 6), b = R(2, 6), k = R(2, 4);
        return build('비례식', `${a} : ${b} = ${a * k} : □   □에 알맞은 수는?`, b * k, nearNum(b * k));
      }
      const m = R(1, 4), n = R(1, 4), unit2 = R(2, 5);
      const total = (m + n) * unit2;
      const bigger = Math.max(m, n) * unit2;
      return build('비례배분', `사탕 ${total}개를 ${m} : ${n}으로 나눌 때, 더 많은 쪽은 몇 개일까?`, `${bigger}개`,
        () => `${pick([bigger + 1, bigger - 1, total - bigger, total, Math.min(m, n) * unit2]).toString()}개`);
    },
    function circleCalc() { // 원의 넓이·원주 (원주율 3.14)
      if (Math.random() < 0.5) {
        const r = pick([5, 10, 20]);
        return build('원의 넓이', `반지름이 ${r}cm인 원의 넓이는? (원주율 3.14)`, `${r * r * 3.14}cm²`,
          () => `${pick([r * 2 * 3.14, r * 3.14, r * r * 3, r * r * 3.14 * 2])}cm²`);
      }
      const d = pick([5, 10, 20]);
      return build('원주', `지름이 ${d}cm인 원의 원주는? (원주율 3.14)`, `${Math.round(d * 3.14 * 100) / 100}cm`,
        () => `${pick([d * 3.14 * 2, Math.round(d / 2 * 3.14 * 100) / 100, d * 3, d * 3.14 + 3.14])}cm`);
    },
    function solid3d() { // 원기둥·원뿔·구
      const qs = [
        ['원기둥의 밑면은 어떤 모양일까?', '원', ['삼각형', '사각형', '별모양']],
        ['뾰족한 꼭짓점이 1개 있는 둥근 입체도형은?', '원뿔', ['원기둥', '구', '정육면체']],
        ['어느 방향에서 보아도 모양이 원인 입체도형은?', '구', ['원뿔', '원기둥', '직육면체']],
      ];
      const [t, a, w] = pick(qs);
      let i = 0;
      return build('원기둥·원뿔·구', t, a, () => w[i++] || null);
    },
  ];

  const GRADES = {
    3: { name: '3학년', units: '덧셈·뺄셈 · 곱셈·나눗셈 · 시간', gens: G3, units2: '곱셈·나눗셈 · 원 · 들이와 무게', gens2: G3_2 },
    4: { name: '4학년', units: '큰 수 · 각도 · 곱셈과 나눗셈', gens: G4, units2: '분수·소수 덧뺄셈 · 삼각형 · 다각형', gens2: G4_2 },
    5: { name: '5학년', units: '혼합 계산 · 약수와 배수 · 분수', gens: G5, units2: '어림 · 분수·소수 곱셈 · 평균', gens2: G5_2 },
    6: { name: '6학년', units: '분수·소수 나눗셈 · 비율 · 부피', gens: G6, units2: '분수·소수 나눗셈 · 비례식 · 원의 넓이', gens2: G6_2 },
  };

  function generatorsFor(grade, sem) {
    const g = GRADES[grade] || GRADES[4];
    return (sem === 2 && g.gens2) ? g.gens2 : g.gens;
  }

  const unitGeneratorCache = new Map();
  function unitGeneratorsFor(grade, sem) {
    const key = `${GRADES[grade] ? grade : 4}|${sem === 2 ? 2 : 1}`;
    if (unitGeneratorCache.has(key)) return unitGeneratorCache.get(key);
    const byUnit = new Map();
    for (const make of generatorsFor(grade, sem)) {
      // 한 생성기가 두 단원을 섞어 내는 경우도 있어 여러 번 확인한다.
      for (let i = 0; i < 40; i++) {
        const unit = make().unit;
        if (!byUnit.has(unit)) byUnit.set(unit, []);
        if (!byUnit.get(unit).includes(make)) byUnit.get(unit).push(make);
      }
    }
    unitGeneratorCache.set(key, byUnit);
    return byUnit;
  }

  function unitsFor(grade, sem) {
    return [...unitGeneratorsFor(grade, sem).keys()];
  }

  window.MS_Problems = {
    GRADES,
    unitList: unitsFor,
    generate(grade, sem, requestedUnit) {
      const all = generatorsFor(grade, sem);
      let gens = all;
      if (requestedUnit) {
        const matching = unitGeneratorsFor(grade, sem).get(requestedUnit);
        if (matching && matching.length) gens = matching;
      }
      // 보기 4개가 안 만들어지는 드문 경우엔 다시 뽑기
      for (let i = 0; i < 80; i++) {
        const p = pick(gens)();
        if (p && p.choices.length === 4 && p.answerIndex >= 0 &&
            (!requestedUnit || p.unit === requestedUnit)) return p;
      }
      return build('연습', '7 × 8 = ?', 56, nearNum(56));
    },
  };
})();
