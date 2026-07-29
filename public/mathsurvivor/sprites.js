/* 수학 서바이버 — 픽셀 스프라이트 (이미지 파일 없이 코드로 그림)
 * 각 스프라이트는 문자 그림(rows)과 색깔표(palette)로 정의하고,
 * 시작할 때 한 번만 작은 캔버스에 미리 그려서(prerender) 재사용한다. */
(function () {
  'use strict';

  const DEFS = {
    // 주인공: 학생 용사
    student: {
      palette: {
        h: '#4e342e', // 머리카락
        s: '#ffd9b3', // 피부
        e: '#33291f', // 눈
        t: '#42a5f5', // 티셔츠
        u: '#1e88e5', // 티셔츠 그늘
        p: '#455a64', // 바지
        k: '#8d6e63', // 신발
      },
      rows: [
        '....hhhh....',
        '..hhhhhhhh..',
        '.hhhhhhhhhh.',
        '.hssssssssh.',
        '.hseesseesh.',
        '.hssssssssh.',
        '..ssssssss..',
        '...tttttt...',
        '..tttttttt..',
        '.ssttttttss.',
        '.ssttuuttss.',
        '..tttttttt..',
        '...pppppp...',
        '...pp..pp...',
        '...pp..pp...',
        '..kk....kk..',
      ],
    },

    // 몬스터 1: 지우개 가루 슬라임
    slime: {
      palette: {
        g: '#f48fb1',
        d: '#ec407a', // 진한 부분
        e: '#4a148c', // 눈
        w: '#ffffff',
      },
      rows: [
        '....gggg....',
        '..gggggggg..',
        '.gggggggggg.',
        '.ggweggwegg.',
        '.ggeeggeegg.',
        'gggggggggggg',
        'ggggddddgggg',
        'gggggggggggg',
        '.gdgggggggd.',
      ],
    },

    // 몬스터 2: 숙제 유령
    ghost: {
      palette: {
        w: '#e6e0ff', // 몸
        o: '#b3a5e6', // 그늘
        e: '#3f3356', // 눈
        p: '#fffde7', // 숙제 종이
        n: '#9e9d24', // 종이 글씨줄
      },
      rows: [
        '...wwwwww...',
        '..wwwwwwww..',
        '.wwwwwwwwww.',
        '.wweewweeww.',
        '.wwwwwwwwww.',
        '.wwwooowwww.',
        '.wwppppppww.',
        '.wwpnnnnpww.',
        '.wwppppppww.',
        '.wwpnnnnpww.',
        '.wwppppppww.',
        '.wowwowwoww.',
      ],
    },

    // 경험치 보석 (지식의 별사탕)
    gem: {
      palette: { c: '#4dd0e1', b: '#0097a7', w: '#e0f7fa' },
      rows: [
        '...cc...',
        '..cwcc..',
        '.cwwccc.',
        'cwwccccb',
        '.ccccbb.',
        '..ccbb..',
        '...bb...',
      ],
    },

    // 보너스 별 몬스터 (잡으면 보너스 문제!)
    star: {
      palette: { y: '#ffd54f', o: '#ffb300', e: '#5d4037' },
      rows: [
        '....y....',
        '...yyy...',
        '..yyyyy..',
        'yyyyyyyyy',
        '.yyeyeyy.',
        '..yyyyy..',
        '.yyy.yyy.',
        'yy.....yy',
      ],
    },

    // 급식빵 (체력 회복)
    bread: {
      palette: { c: '#c68642', b: '#f3d9a4' },
      rows: [
        '..cccc..',
        '.cbbbbc.',
        'cbbbbbbc',
        'cbbbbbbc',
        '.cbbbbc.',
        '..cccc..',
      ],
    },

    // 자석 아이템 (모든 보석 끌어오기)
    magnet: {
      palette: { r: '#e53935', w: '#eceff1' },
      rows: [
        'ww....ww',
        'rr....rr',
        'rr....rr',
        'rr....rr',
        'rrr..rrr',
        '.rrrrrr.',
        '..rrrr..',
      ],
    },

    // 폭탄 아이템 (화면 전체 공격)
    bomb: {
      palette: { k: '#37474f', w: '#90a4ae', f: '#ff7043' },
      rows: [
        '.....f..',
        '....f...',
        '..kkkk..',
        '.kkkkkk.',
        'kkwkkkkk',
        'kkkkkkkk',
        '.kkkkkk.',
        '..kkkk..',
      ],
    },

    // 최종보스: 시험지 대마왕
    examboss: {
      palette: {
        p: '#fdfdf5', // 종이
        l: '#b0bec5', // 글씨 줄
        e: '#d32f2f', // 성난 눈
        m: '#37474f', // 입
        s: '#cfd8dc', // 종이 그늘
      },
      rows: [
        '.pppppppppppp.',
        '.pppppppppppp.',
        '.ppllllllllpp.',
        '.pppppppppppp.',
        '.pee.pppp.eep.',
        '.ppeepppeeppp.',
        '.pppppppppppp.',
        '.ppllllllllpp.',
        '.pppppppppppp.',
        '.pmmpmmpmmpmp.',
        '.pmpmpmpmpmmp.',
        '.pppppppppppp.',
        '.ppllllllllpp.',
        '.pppppppppppp.',
        '.ppsssssssspp.',
        '.pppppppppppp.',
      ],
    },
  };

  // 문자 그림 → 미리 그린 캔버스
  function prerender(def, scale) {
    const w = def.rows[0].length, h = def.rows.length;
    const cv = document.createElement('canvas');
    cv.width = w * scale; cv.height = h * scale;
    const c = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = def.rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        c.fillStyle = def.palette[ch] || '#f0f';
        c.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return cv;
  }

  const SCALE = 3;
  const Sprites = {};
  for (const name in DEFS) Sprites[name] = prerender(DEFS[name], SCALE);
  Sprites.SCALE = SCALE;

  window.MS_Sprites = Sprites;
})();
