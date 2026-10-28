(function () {
  window.DJ48_PLACE_DETAILS = {
    notice: {
      icon: '',
      title: '알림판',
      kicker: 'Notice Board',
      desc: '선생님이 전하는 마을 소식을 확인합니다.',
      summary: '',
      features: [
        { label: '공지', value: '오늘도 학교에서 배우고 마을에서 함께 놀아요.' }
      ],
      actions: [
        { label: '학교로 바로가기', enabled: true, action: 'openSchool' },
        { label: '이벤트 보기', enabled: true, action: 'openEvent' },
        { label: '랭킹 보기', enabled: true, action: 'openRanking' }
      ]
    },
    home: {
      icon: '🏠',
      title: '내 집',
      kicker: 'My Room',
      desc: '회원 프로필, 보유 타이틀, 뱃지를 확인하는 개인 공간입니다.',
      summary: '회원 연결 후 내 프로필, 타이틀, 뱃지, 꾸미기 아이템을 보여줍니다.',
      features: [
        { label: '닉네임', value: 'DJ48 학생' },
        { label: '타이틀', value: '보유 타이틀 표시' },
        { label: '뱃지', value: '연습기록 기반 표시' }
      ],
      actions: [
        { label: '내 집 입장하기', enabled: true, action: 'openHome' },
        { label: '한마디·타이틀 설정하기', enabled: true, action: 'openHome' }
      ]
    },
    school: {
      icon: '🏫',
      title: '학교',
      kicker: 'Quiz School',
      desc: '과목관에서 퀴즈를 고르고 연습전과 랭킹전을 시작합니다.',
      summary: '퀴즈 카테고리를 고르고 연습전/랭킹전으로 들어갈 핵심 장소입니다.',
      features: [
        { label: '오늘의 추천 퀴즈', value: '역사 인물 10문제' },
        { label: '국어', value: '맞춤법, 다의어, 독서 퀴즈' },
        { label: '사회/수학', value: '역사, 곱셈나눗셈' }
      ],
      actions: [
        { label: '학교 입장하기', enabled: true, action: 'openSchool' }
      ]
    },
    classroom: {
      icon: '🏫',
      title: '우리 교실',
      kicker: 'Our Classroom',
      desc: '4학년 8반 전용 퀘스트와 성장루틴을 실험하는 공간입니다.',
      summary: '담임 권한, 교실 비밀번호, 퀘스트, 성장루틴, 교실 전용 미니퀴즈를 단계적으로 검증합니다.',
      features: [
        { label: '퀘스트', value: '수락형/달성형 교실 미션' },
        { label: '성장루틴', value: '학생 목표 달성 보상' },
        { label: '학급 포인트', value: '포인트와 교실 활동 연결' }
      ],
      actions: [
        { label: '우리 교실 입장하기', enabled: true, action: 'openClassroom' }
      ]
    },
    shop: {
      icon: '🛍️',
      title: '상점',
      kicker: 'Town Shop',
      desc: '코디를 입어보고 마음에 드는 아이템을 구매해요.',
      summary: '무료로 입어보고, DJ코인이나 구매 쿠폰으로 내 코디를 완성해요.',
      features: [
        { label: '입어보기', value: '마음껏 골라보는 무료 드레스룸' },
        { label: '코디 아이템', value: '헤어, 옷, 신발, 액세서리' },
        { label: '구매', value: '보유 코인과 쿠폰을 확인해요' }
      ],
      actions: [
        { label: '상점 입장하기', enabled: true, action: 'openShop' },
        { label: '내 집에서 적용하기', enabled: true, action: 'openHome' }
      ]
    },
    ranking: {
      icon: '🏆',
      title: '랭킹 광장',
      kicker: 'Ranking Plaza',
      desc: '랭킹전 기록과 퀴즈왕 순위를 확인합니다.',
      summary: '랭킹전 완료 기록을 기준으로 주요 랭킹과 분야별 목록을 보여줍니다.',
      features: [
        { label: '퀴즈왕', value: '종합 요약 표시' },
        { label: '카테고리 랭킹', value: '국어/사회/수학 분리' },
        { label: '인기 퀴즈 랭킹', value: '아재개그/아이돌/애니 표시' }
      ],
      actions: [
        { label: '랭킹 광장 입장하기', enabled: true, action: 'openRanking' },
        { label: '분야별 목록 보기', enabled: true, action: 'openRanking' }
      ]
    },
    event: {
      icon: '🎪',
      title: '이벤트 광장',
      kicker: 'Event Plaza',
      desc: '오늘의 퀘스트를 확인하고 보상을 받아요.',
      summary: '도전 중인 퀘스트와 완료한 보상을 확인해요.',
      features: [
        { label: '오늘의 퀘스트', value: '작은 도전을 하나씩 완성해요' },
        { label: '보상 받기', value: '완료한 퀘스트의 보상을 받아요' }
      ],
      actions: [
        { label: '이벤트 광장 입장하기', enabled: true, action: 'openEvent' }
      ]
    }
  };
})();
