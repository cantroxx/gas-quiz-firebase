# WINDOWS-REQUEST — 코디 로컬 전환 보완 요청

기준 snapshot: `7B05F3B49BDF2B2DBD868F0C932BE1C9D8C5A22AD47A6CB8FE09F41A3A1EC1A3`. 기준 웹 커밋: `509687040e7afe5998daa8c919d83c75e6a31e1e`. 구현 브랜치: `codex/coordi-local-runtime`.

저장소: https://github.com/cantroxx/gas-quiz-firebase . 최신 전체 SHA와 push 결과는 MacBook 최종 인계 메시지/검증 보고서를 확인한다.

## 우선순위와 정확한 재현 입력

운영 데이터·구매 내역·가격·ID를 변경하거나 다른 아이템으로 대체하지 않는다. 아래 7개 ID를 먼저 보완한다. 완전한 callable 입력은 [windows-request-cases.json](windows-request-cases.json)의 `primary[].request`에 있다.

| 상품 ID / 부위 | 동작·피부·귀·색 | 재현 오류 |
|---|---|---|
| `earring-1032331` | stand1 / skin API12000=WZ2000 / ears0 / prism `{}` / hair mix 없음 | 기준점이 없습니다. {"itemId": 1032331, "action": "stand1"} |
| `shoes-1073469` | stand1 / skin API12000=WZ2000 / ears0 / prism `{}` / hair mix 없음 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. {"itemId": 1073469, "action": "stand1"} |
| `cape-1103400` | stand1 / skin API12000=WZ2000 / ears0 / prism `{}` / hair mix 없음 | 기준점이 없습니다. {"itemId": 1103400, "action": "stand1"} |
| `cape-1103862` | stand1 / skin API12000=WZ2000 / ears0 / prism `{}` / hair mix 없음 | 이 아이템의 효과 이동 규칙은 아직 지원하지 않습니다. {"itemId": 1103862} |
| `cape-1102039` | stand1 / skin API12000=WZ2000 / ears0 / prism `{}` / hair mix 없음 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. {"itemId": 1102039, "action": "stand1"} |
| `weapon-1703421` | stand1 / skin API12000=WZ2000 / ears0 / prism `{}` / hair mix 없음 | 아직 확인되지 않은 겹침 순서입니다. {"itemId": 1703421, "position": "weaponBelowHand"} |
| `hair-31000` | stand1 / skin API12000=WZ2000 / ears0 / prism `{}` / hair mix 없음 | 헤어 그림자 파츠 형식을 확인하세요. {"itemId": 31000, "action": "stand1"} |
| `hair-31000` | stand1 / skin API12000=WZ2000 / ears0 / prism `{"skin":{"palette":0,"tone":359,"chroma":20,"brightness":58}}` / hair mix 없음 | 헤어 그림자 파츠 형식을 확인하세요. {"itemId": 31000, "action": "stand1"} |

기본 조합은 남성 face20000/hair30000, 기본 티1042194/바지1062067이다. 31000 재현은 여성 face21000/hair31000이며 다른 아이템으로 바꾸지 않는다. 저장 코디 실패의 최소 재현 두 가지(피부 프리즘 없음 / H359 S20 B58)도 포함했다. 실제 학생별 전체 코디나 식별자는 제공하지 않는다.

필요 자료: 31000의 shadow 파츠 원형·anchor·좌표·z 규칙, 1032331/1103400의 기준점, 1073469의 stand1 frame-book, 1103862의 효과 이동 규칙/원본 효과, 1703421의 weaponBelowHand 순서·zmap/smap. 1102039는 이름이 투명이어도 인계 계약의 명시적 invisible 목록에 없으므로 투명 처리하지 않았다. 원본의 실제 행동을 증명하는 데이터와 비교 이미지를 요청한다.

## 공개 목록 72개 누락 + 60개 추가 확인

공개 8,721개는 판매 상품 수가 아니다. 운영 서버 판매 목록은 1,632개이며, 공개 누락 72개 중 판매 상품은 0개다. 추가 확인 60개 중 판매 상품은 7개다. 132개를 기본 stand1 조합으로 모두 실제 합성했다: 3개 통과, 129개 실패. 통과 3개(1002186,1022079,1032024)는 기존 계약의 explicit invisible로 처리한 결과이며 새로 임의 지정한 항목이 아니다.

아래 모든 행의 공통 재현: stand1 / WZ skin2000(API12000) / ears0 / FlipX=false / 피부·아이템·효과 Prism=null / Hue0,Saturation1,Brightness1 / MixId=null,MixPercent0. 해당 부위만 교체한다. 한벌옷은 기본 상하의를 제거한다. 원시 widget 입력은 JSON의 `publicIssues[].look`에 모두 포함했다. 아래 오류는 파일 존재 여부만 확인한 결과가 아니라 실제 합성 결과다.

| ID | 부위 | 원래 분류 | 실제 판매 | 합성 결과 |
|---|---|---|---|---|
| 1062226 | bottom | missing-from-local-catalog | 아니오 | Item absent from bundle: 1062226 |
| 1102039 | cape | needs-review | 예 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1102815 | cape | needs-review | 아니오 | 이 아이템의 효과 이동 규칙은 아직 지원하지 않습니다. |
| 1102878 | cape | missing-from-local-catalog | 아니오 | Item absent from bundle: 1102878 |
| 1102879 | cape | missing-from-local-catalog | 아니오 | Item absent from bundle: 1102879 |
| 1102880 | cape | missing-from-local-catalog | 아니오 | Item absent from bundle: 1102880 |
| 1102881 | cape | missing-from-local-catalog | 아니오 | Item absent from bundle: 1102881 |
| 1102882 | cape | missing-from-local-catalog | 아니오 | Item absent from bundle: 1102882 |
| 1102883 | cape | missing-from-local-catalog | 아니오 | Item absent from bundle: 1102883 |
| 1103400 | cape | needs-review | 예 | 기준점이 없습니다. |
| 1103539 | cape | needs-review | 아니오 | 이 아이템의 효과 이동 규칙은 아직 지원하지 않습니다. |
| 1103742 | cape | needs-review | 아니오 | 이 아이템의 효과 이동 규칙은 아직 지원하지 않습니다. |
| 1103862 | cape | needs-review | 예 | 이 아이템의 효과 이동 규칙은 아직 지원하지 않습니다. |
| 1032024 | earring | needs-review | 예 | 통과 (명시적 invisible) |
| 1022079 | eyeAccessory | needs-review | 예 | 통과 (명시적 invisible) |
| 20010 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 20010 |
| 20019 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 20019 |
| 20024 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 20024 |
| 20071 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 20071 |
| 20072 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 20072 |
| 20079 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 20079 |
| 21018 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 21018 |
| 21019 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 21019 |
| 21066 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 21066 |
| 21067 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 21067 |
| 23034 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 23034 |
| 24029 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 24029 |
| 24076 | face | missing-from-local-catalog | 아니오 | Item absent from bundle: 24076 |
| 50075 | face | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1012010 | faceAccessory | missing-from-local-catalog | 아니오 | Item absent from bundle: 1012010 |
| 1012160 | faceAccessory | missing-from-local-catalog | 아니오 | Item absent from bundle: 1012160 |
| 1012165 | faceAccessory | missing-from-local-catalog | 아니오 | Item absent from bundle: 1012165 |
| 1012652 | faceAccessory | missing-from-local-catalog | 아니오 | Item absent from bundle: 1012652 |
| 1082936 | glove | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 30670 | hair | needs-review | 아니오 | 피부별 헤어 그림자가 달라 정확한 피부 선택 지원이 필요합니다. |
| 30680 | hair | needs-review | 아니오 | 피부별 헤어 그림자가 달라 정확한 피부 선택 지원이 필요합니다. |
| 30870 | hair | needs-review | 아니오 | 헤어 그림자 후보가 없습니다. |
| 31000 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 31120 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 31160 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 31250 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 31270 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 31340 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 31470 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 31550 | hair | needs-review | 아니오 | 피부별 헤어 그림자가 달라 정확한 피부 선택 지원이 필요합니다. |
| 31590 | hair | needs-review | 아니오 | 피부별 헤어 그림자가 달라 정확한 피부 선택 지원이 필요합니다. |
| 31620 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 31700 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 37330 | hair | missing-from-local-catalog | 아니오 | Item absent from bundle: 37330 |
| 37350 | hair | missing-from-local-catalog | 아니오 | Item absent from bundle: 37350 |
| 37950 | hair | needs-review | 아니오 | 헤어 그림자의 피부 구분을 확인하세요. |
| 40390 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 40710 | hair | needs-review | 아니오 | 헤어 그림자 파츠 형식을 확인하세요. |
| 42490 | hair | needs-review | 아니오 | 파츠 좌표가 없습니다. |
| 48220 | hair | needs-review | 아니오 | 지원하지 않는 파츠 기준점 형식입니다. |
| 1001068 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1001068 |
| 1002186 | hat | needs-review | 예 | 통과 (명시적 invisible) |
| 1002320 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1002320 |
| 1002388 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1002388 |
| 1003271 | hat | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1003276 | hat | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1003492 | hat | needs-review | 아니오 | 기준점이 없습니다. |
| 1003493 | hat | needs-review | 아니오 | 기준점이 없습니다. |
| 1003494 | hat | needs-review | 아니오 | 기준점이 없습니다. |
| 1003495 | hat | needs-review | 아니오 | 기준점이 없습니다. |
| 1003496 | hat | needs-review | 아니오 | 기준점이 없습니다. |
| 1004059 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1004059 |
| 1004088 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1004088 |
| 1004405 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1004405 |
| 1004645 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1004645 |
| 1004646 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1004646 |
| 1004888 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1004888 |
| 1005134 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1005134 |
| 1005187 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1005187 |
| 1005374 | hat | missing-from-local-catalog | 아니오 | Item absent from bundle: 1005374 |
| 1005834 | hat | needs-review | 아니오 | 기준점이 없습니다. |
| 1007121 | hat | needs-review | 아니오 | 표시할 파츠가 없습니다. |
| 1050367 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1050367 |
| 1050396 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1050396 |
| 1050397 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1050397 |
| 1050398 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1050398 |
| 1050399 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1050399 |
| 1050420 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1050420 |
| 1051467 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1051467 |
| 1051468 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1051468 |
| 1051489 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1051489 |
| 1051502 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1051502 |
| 1052295 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1052295 |
| 1052343 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1052343 |
| 1052707 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1052707 |
| 1052708 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1052708 |
| 1053006 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1053006 |
| 1053477 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1053477 |
| 1054726 | overall | missing-from-local-catalog | 아니오 | Item absent from bundle: 1054726 |
| 1092031 | shield | missing-from-local-catalog | 아니오 | 아이템 정보를 확인하세요. |
| 1092032 | shield | missing-from-local-catalog | 아니오 | 아이템 정보를 확인하세요. |
| 1092033 | shield | missing-from-local-catalog | 아니오 | 아이템 정보를 확인하세요. |
| 1092034 | shield | missing-from-local-catalog | 아니오 | 아이템 정보를 확인하세요. |
| 1092040 | shield | missing-from-local-catalog | 아니오 | 아이템 정보를 확인하세요. |
| 1092044 | shield | missing-from-local-catalog | 아니오 | 아이템 정보를 확인하세요. |
| 1092062 | shield | missing-from-local-catalog | 아니오 | 아이템 정보를 확인하세요. |
| 1092067 | shield | missing-from-local-catalog | 아니오 | 아이템 정보를 확인하세요. |
| 1092116 | shield | missing-from-local-catalog | 아니오 | 아이템 정보를 확인하세요. |
| 1092117 | shield | missing-from-local-catalog | 아니오 | 아이템 정보를 확인하세요. |
| 1072559 | shoes | missing-from-local-catalog | 아니오 | Item absent from bundle: 1072559 |
| 1073469 | shoes | needs-review | 예 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1074003 | shoes | needs-review | 아니오 | 기준점이 없습니다. |
| 1042312 | top | missing-from-local-catalog | 아니오 | Item absent from bundle: 1042312 |
| 1042316 | top | missing-from-local-catalog | 아니오 | Item absent from bundle: 1042316 |
| 1042342 | top | missing-from-local-catalog | 아니오 | Item absent from bundle: 1042342 |
| 1442076 | weapon | missing-from-local-catalog | 아니오 | Item absent from bundle: 1442076 |
| 1702014 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702026 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702044 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702046 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702056 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702057 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702073 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702074 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702098 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702099 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702107 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702127 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702147 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702190 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702422 | weapon | missing-from-local-catalog | 아니오 | Item absent from bundle: 1702422 |
| 1702653 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1702885 | weapon | missing-from-local-catalog | 아니오 | Item absent from bundle: 1702885 |
| 1702957 | weapon | needs-review | 아니오 | 효과 첫 프레임이 없습니다. |
| 1703070 | weapon | needs-review | 아니오 | 이 아이템의 동작 데이터는 아직 지원하지 않습니다. |
| 1703276 | weapon | needs-review | 아니오 | 효과 동작이 없습니다. |
| 1703764 | weapon | needs-review | 아니오 | 표시할 파츠가 없습니다. |

## 새 인계 묶음에 필요한 것

1. 새 snapshot/manifest/SHA256SUMS. 현재 source manifest hash와 web/manifest.json hash는 서로 다르다. 웹 manifest 고정 해시는 `170e2cc0d4e68209947770f141809f17ceaa5723e52020da188527fe39344a35`이다.
2. 변경한 ID별 목록·아이콘·index·gzip parts와 decodedBytes/SHA256. gzip bytes는 Content-Encoding 없이 제공하는 기존 계약을 유지한다.
3. 기준점과 가림 순서, 효과 이동·합성 소스 변경분 및 적용 근거. 단순히 오류 메타데이터를 지우면 안 된다.
4. 우선 7개 ID의 위 요청 조합 PNG를 원래 크기 RGBA로 제공한다. 새로 정상화된 거부 사례에는 이전 오류와 새 기준 RGBA SHA256를 함께 기록한다. 26개 정상/4개 거부 기존 사례도 모두 재실행한다.
5. 1042483/1062323/1054818 원래 장비 표시 규칙은 EquipmentAppearance 문맥을 포함한 양성/음성 사례가 필요하다. 소유권 데이터의 새 스키마는 추측하지 않는다.
6. 새 규칙이 피부·귀·염색/헤어·성형 믹스·EffectPrism에 영향을 주면 해당 경계값과 비교 이미지를 추가한다. 원시 렌더러는 mix0..100, 기존 상점 저장 계약은 hair0..7색/mix0..99이며 성형 염색 저장은 현재 허용하지 않는다.

운영 manifest 404는 윈도우 묶음 오류가 아니라 MacBook의 미배포 상태다. 이번 작업에서도 운영 전환은 별도 승인 전까지 하지 않는다.
