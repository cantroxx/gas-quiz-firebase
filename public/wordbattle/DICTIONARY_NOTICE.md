# 낱말 대전 사전 데이터 출처·라이선스·재현 기록

최초 점검일: 2026-09-02
provenance 복구일: 2026-09-03

## 대상

- `words-data.js`: 한글 1~4글자 80,774개를 담은 자동 생성 데이터
- `words.js`: 사전 판정과 아동용 차단어 필터

## 기록된 출처

1. 국립국어원 「한국어 학습용 어휘 목록」(2003)
   - 공식 배포 페이지: <https://www.korean.go.kr/front_eng/down/down_02V.do?etc_seq=71&pageIndex=1>
   - 공식 페이지가 안내하는 조건: 공공누리 제1유형(출처 표시)
2. `spellcheck-ko/hunspell-dict-ko` 0.7.94
   - 저장소: <https://github.com/spellcheck-ko/hunspell-dict-ko>
   - 사용 릴리스: <https://github.com/spellcheck-ko/hunspell-dict-ko/releases/tag/0.7.94>
   - 사용 파일: `ko-aff-dic-0.7.94.zip` 안의 `ko.dic`
   - 릴리스 `LICENSE.md`는 소스 데이터별 CC BY-SA 2.0 KR·CC BY 4.0·CC BY-SA 4.0 조건을 설명하고, 완성된 `ko.dic` 결합 사전은 GPL-3.0으로 명시한다.

## 복구된 입력과 해시

2026-09-03 Claude 세션 기록에서 당시 다운로드 명령과 두 생성 스크립트를 복구하고 같은 공개 입력을 다시 내려받아 확인했다.

- 국립국어원 XLS SHA-256: `df05d31942db919668a91234539ed63a200c77f4058a9a135b64c3ed08219475`
- `ko-aff-dic-0.7.94.zip` SHA-256: `c7252e2f6bf421e081a457ca007cd8a304ee2045947edba47b367db780e63c48`
- 압축 안 `ko.dic` SHA-256: `14117a72811ed6a083ed374ceb728b0846a689da6f4dbfe0a84d3b3bce124e80`
- 압축 안 GPL-3.0 전문과 현재 `LICENSE.GPL-3` SHA-256: `8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903`
- 기존 학습용 목록 정제 결과: 5,550개
- 확장 사전 결과: 80,774개

`scripts/audit/wordbattle/build_learning_words.py`와 `build_dictionary.mjs`로 임시 출력한 파일은 당시 생성된 `words-data.js`와 바이트 단위로 일치했다. 라이선스 설명 문구를 바로잡기 전 데이터 본문의 SHA-256은 `15869ca0e832c923ddd45b7fb104038c3f6dbcf0300e54be35ab955d8aa12670`이었다.

## 재현 절차

입력 파일은 저장소에 복제하지 않는다. 위 공식 주소에서 내려받아 해시를 확인한 뒤 다음 순서로 임시 출력한다.

```bash
python3 scripts/audit/wordbattle/build_learning_words.py vocab.xls learning-words.json
node scripts/audit/wordbattle/build_dictionary.mjs learning-words.json ko.dic words-data.generated.js
```

생성 결과는 단어 수·차단어 검사·diff를 확인한 뒤에만 기존 파일과 교체한다. 생성 스크립트는 현재 파일을 직접 덮어쓰지 않는다.

## 배포와 재사용 경계

- 현재 게임 안의 사전 배포에는 국립국어원과 `hunspell-dict-ko`의 출처, 릴리스, GPL-3.0 안내를 함께 둔다.
- `words-data.js`만 다른 저장소·게임·사전 패키지로 떼어 복사하지 않는다.
- GPL-3.0 전문은 상류 릴리스의 `LICENSE.GPL-3` 원문을 같은 게임 경로에 보존하고 시작 화면에서 연결한다. 상류의 데이터별 세부 조건은 이 문서에서 릴리스 `LICENSE.md`와 함께 안내한다.
- 사전 내용을 재생성하거나 필터를 바꾸면 입력 해시·스크립트·결과 해시와 아동용 유해어 검사를 다시 기록한다.

이 문서는 법률 자문이 아니라, 현재 저장소에서 확인 가능한 증거와 배포 금지선을 기록한 운영 메모다.
