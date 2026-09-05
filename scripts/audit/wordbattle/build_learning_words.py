#!/usr/bin/env python3
"""Rebuild the Korean-learning-word input used by Word Battle.

Usage:
    python3 build_learning_words.py vocab.xls learning-words.json

Requires xlrd. The input is the 2003 NIKL Korean learning vocabulary XLS.
"""

import argparse
import json
import re

import xlrd


BLOCKED = {
    "씨발", "시발", "씨발놈", "좆", "좇", "존나", "병신", "새끼", "개새끼", "지랄", "썅",
    "쌍놈", "미친놈", "엿먹어", "꺼져", "닥쳐", "또라이", "등신", "머저리", "바보같은",
    "호로", "후레자식", "개년", "년놈", "섹스", "성교", "자위", "포르노", "야동", "음란",
    "성기", "자지", "보지", "고추", "불알", "젖가슴", "유방", "음경", "질내", "사정",
    "발기", "変態", "변태", "강간", "매춘", "창녀", "기생충같은", "죽어", "살인", "자살",
    "마약", "대마초", "필로폰",
}

EXTRA = {
    "무지개", "병아리", "다람쥐", "고구마", "지우개", "색종이", "도시락", "아이스크림", "초콜릿",
    "호랑이", "코끼리", "원숭이", "기린", "거북", "토끼", "사자", "펭귄", "상어", "고래", "문어",
    "오징어", "떡볶이", "김밥", "라면", "우유", "주스", "과자", "사탕", "수박", "참외", "딸기",
    "포도", "당근", "자전거", "지하철", "비행기", "기차", "트럭", "택시", "로봇", "게임", "만화",
    "축구", "야구", "농구", "줄넘기", "달리기", "수영", "태권도", "피아노", "기타", "바이올린",
    "장구", "꽹과리", "엄마", "아빠", "누나", "오빠", "언니", "동생", "친구", "선생님", "짝꿍",
    "설날", "추석", "생일", "방학", "소풍", "운동회", "졸업식", "입학식",
}


def clean(value):
    word = re.sub(r"\d+$", "", value)
    return word.replace("-", "").replace("^", "").replace(" ", "").strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_xls")
    parser.add_argument("output_json")
    args = parser.parse_args()

    sheet = xlrd.open_workbook(args.input_xls).sheet_by_index(0)
    words = set()
    for row in range(1, sheet.nrows):
        word = clean(str(sheet.cell_value(row, 1)).strip())
        if re.fullmatch(r"[가-힣]+", word):
            words.add(word)

    words.update(word for word in EXTRA if re.fullmatch(r"[가-힣]+", word))
    words.difference_update(BLOCKED)
    result = sorted(words)

    with open(args.output_json, "w", encoding="utf-8") as output:
        json.dump(result, output, ensure_ascii=False, separators=(",", ":"))
        output.write("\n")

    print(f"learning words: {len(result)}")


if __name__ == "__main__":
    main()
