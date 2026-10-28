#!/usr/bin/env python3
"""Read the NIKL grade workbook; export noun headwords, never definitions."""
import argparse, collections, hashlib, json, re, unicodedata
from pathlib import Path
import openpyxl
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');args=p.parse_args()
w=openpyxl.load_workbook(args.input,read_only=True,data_only=True)
sheet=w['전체(1~5등급), 40,000개']
rows={}
for grade, raw, homonym, pos, *_ in sheet.iter_rows(min_row=2,values_only=True):
    if not isinstance(raw,str) or not isinstance(pos,str) or '명사' not in pos.split('/'):continue
    word=unicodedata.normalize('NFC',raw).replace('-','').replace('^','').strip()
    if not re.fullmatch('[가-힣]{2,100}',word):continue
    level=int(re.search(r'\d',grade).group())
    if word not in rows or level<rows[word]:rows[word]=level
out={'source':'국립국어원(2024), 국어 기초 어휘 선정 및 어휘 등급화 목록 전체','sourceUrl':'https://www.korean.go.kr/front/reportData/reportDataView.do?report_seq=1160','license':'KOGL Type 1 (출처 표시)','inputSha256':hashlib.sha256(Path(args.input).read_bytes()).hexdigest(),'sheet':sheet.title,'columns':'A 등급 / B 어휘 / D 품사','words':[{'word':word,'grade':level} for word,level in sorted(rows.items())]}
Path(args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'total':len(rows),'grades':dict(sorted(collections.Counter(rows.values()).items()))},ensure_ascii=False))
