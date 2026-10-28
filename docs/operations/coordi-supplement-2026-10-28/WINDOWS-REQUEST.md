# Windows 후속 요청 — 보완 델타 검증 결과

31000/1103400은 Mac Node22·실제 HTTP·Chrome에서 검증 완료했다. 58개 정상 RGBA 정확 일치 + 11개 예상 거부, 판매1,627/1,632, 고정 저장10/10이다. 원래 장비 표시3종의 문맥 있음/없음 사례도 통과했다. 이전 snapshot은 보존했다.

기준 새 snapshot: `1B0FD079043CC715E90E95376B2D3641B3E5DE3619C4156F0830C2B5362B1820`.

남은 요청은 다음5개다. 원본 PNG가 있는 효과형3개를 “파일 누락”으로 분류하지 않았다.

| ID | 요청 |
|---|---|
| 1032331 | alpha17 marker와 실제 ItemEff의 결합·pos1·action1/actionExceptRotation1 규칙 및 정상 기준 PNG |
| 1073469 | 일반 장비 파츠 없이 효과만 있는 경우, fixed1/actionExceptRotation1·stand1 pos0/z2 규칙 및 정상 기준 PNG |
| 1103862 | fixed0/action1/actionExceptRotation1의 의미와 지원 범위. 1102621의 기존 거부를 유지하는 회귀 사례 |
| 1102039 | 명시적 appearance/invisible 규칙의 근거와 양성·음성 사례. 이름·파츠 없음만으로 투명 처리하지 않음 |
| 1703421 | Base/zmap에 없는 weaponBelowHand의 정확한 가림 순서 근거와 겹침 비교. weaponBelowArm 등 치환 금지 |

[remaining-evidence.json](remaining-evidence.json)에 실제 오류, 정확한 API 요청, 원본 PNG 경로 및 제어값을 적었다. 요청 공통값은 stand1, skin12000=WZ2000, ears0, 남성face20000/hair30000, 기본상의1042194/하의1062067, itemPrism={}, mix없음이다. 원시 레이어의 anchor/좌표·alpha와 겹침을 함께 검증할 수 있는 원래 크기 RGBA PNG가 필요하다.

현재 예상거부11개 중 수정되는 사례는 새 정상 기준과 변경 이유를 함께 보내고 나머지 사례의 결과를 보존해 달라. 새로운 데이터·규칙은 새 snapshot/manifest/checksum으로 전달한다. 기존 파일 이름의 snapshot 내용을 덮어쓰지 않는다. 공개 이슈132개는 별도 재검사 결과5통과/127실패이며, 이 숫자를 실제 판매 수량으로 간주하지 않는다.

Mac에서 Windows 원본 프로젝트나 원본 WZ를 수정하지 않았으며, 운영 배포도 하지 않았다. 상세 결과와 재현은 [보완 검증 보고서](../COORDI_SUPPLEMENT_2026-10-28.md)를 참조한다.
