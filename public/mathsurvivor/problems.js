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

  const GRADES = {
    3: { name: '3학년', units: '덧셈·뺄셈 · 곱셈·나눗셈 · 시간', gens: G3 },
    4: { name: '4학년', units: '큰 수 · 각도 · 곱셈과 나눗셈', gens: G4 },
    5: { name: '5학년', units: '혼합 계산 · 약수와 배수 · 분수', gens: G5 },
    6: { name: '6학년', units: '분수·소수 나눗셈 · 비율 · 부피', gens: G6 },
  };

  window.MS_Problems = {
    GRADES,
    generate(grade) {
      const g = GRADES[grade] || GRADES[4];
      // 보기 4개가 안 만들어지는 드문 경우엔 다시 뽑기
      for (let i = 0; i < 5; i++) {
        const p = pick(g.gens)();
        if (p.choices.length === 4 && p.answerIndex >= 0) return p;
      }
      return build('연습', '7 × 8 = ?', 56, nearNum(56));
    },
  };
})();
