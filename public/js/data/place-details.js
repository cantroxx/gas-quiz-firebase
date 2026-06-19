(function () {
  window.DJ48_PLACE_DETAILS = {
    notice: {
      icon: '',
      title: '알림판',
      kicker: 'Notice Board',
      desc: '공지와 오늘 추천 활동을 확인하고 바로 이동할 수 있습니다.',
      summary: '관리자 공지, 오늘의 퀘스트, 이벤트 추천 퀴즈를 보여줄 타운 알림판입니다.',
      features: [
        { label: '공지', value: '오늘도 연습전과 랭킹전을 자유롭게 이용할 수 있어요' },
        { label: '오늘의 퀘스트', value: '이벤트 광장에서 개인 미션을 확인하세요' },
        { label: '추천 퀴즈', value: '학교에서 과목관을 골라 바로 시작하세요' }
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
      desc: '회원 프로필, 보유 칭호, 뱃지를 확인하는 개인 공간입니다.',
      summary: '회원 연결 후 내 프로필, 칭호, 뱃지, 꾸미기 아이템을 보여줍니다.',
      features: [
        { label: '닉네임', value: 'DJ48 학생' },
        { label: '칭호', value: '보유 타이틀 표시' },
        { label: '뱃지', value: '연습기록 기반 표시' }
      ],
      actions: [
        { label: '내 집 입장하기', enabled: true, action: 'openHome' },
        { label: '한마디·칭호 설정하기', enabled: true, action: 'openHome' }
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
        { label: '학급화폐', value: '베리와 교실 활동 연결' }
      ],
      actions: [
        { label: '우리 교실 입장하기', enabled: true, action: 'openClassroom' }
      ]
    },
    shop: {
      icon: '🛍️',
      title: '상점',
      kicker: 'Town Shop',
      desc: 'DJ코인으로 배경, 아바타, 장식 아이템을 구매합니다.',
      summary: 'DJ코인으로 꾸미기 아이템을 사고 내 방에 적용할 수 있습니다.',
      features: [
        { label: '배경', value: '숲속 배경, 별빛 배경' },
        { label: '아바타', value: '고양이, 탐험가 아바타' },
        { label: '장식 아이템', value: '책장, 화분, 칭호 프레임' }
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
      desc: '오늘의 퀘스트와 학급 이벤트를 보여줄 공간입니다.',
      summary: '퀘스트, 학급 미션, 시즌 이벤트를 정적 데이터로 확인하는 공간입니다.',
      features: [
        { label: '오늘의 퀘스트', value: '개인 미션 3개' },
        { label: '학급 미션', value: '주간 공동 목표 3개' },
        { label: '시즌 이벤트', value: '기간 한정 이벤트 3개' }
      ],
      actions: [
        { label: '이벤트 광장 입장하기', enabled: true, action: 'openEvent' },
        { label: '보상 받기 준비 중', enabled: false }
      ]
    }
  };
})();
