#!/usr/bin/env python3
"""Download a pinned public NIKL mirror and extract noun metadata only (no definitions)."""
import argparse, concurrent.futures, hashlib, json, re, time, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
REVIEWED_TERMS=set(json.loads((Path(__file__).resolve().parents[3]/'fixtures/word-bomb/reviewed-school-terms.json').read_text()))
p=argparse.ArgumentParser();p.add_argument('manifest');p.add_argument('commit');p.add_argument('cache');p.add_argument('output');a=p.parse_args()
cache=Path(a.cache);cache.mkdir(parents=True,exist_ok=True)
files=[r for r in json.loads(Path(a.manifest).read_text()) if r['name'].endswith('.xml')]
def process(row):
    f=cache/row['name'];url=f'https://raw.githubusercontent.com/spellcheck-ko/korean-dict-nikl/{a.commit}/stdict/{row["name"]}'
    for attempt in range(4):
        try:
            if not f.exists():
                with urllib.request.urlopen(url,timeout=90) as r:f.write_bytes(r.read())
            raw=f.read_bytes()
            assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==row['sha'], 'Git blob mismatch'
            break
        except Exception:
            f.unlink(missing_ok=True)
            if attempt==3:raise
            time.sleep(2**attempt)
    result=[]
    for _,item in ET.iterparse(f,events=('end',)):
        if item.tag!='item':continue
        info=item.find('word_info'); rawword=info.findtext('word','');word=re.sub(r'\d+$','',rawword).replace('-','').replace('^','')
        senses=[s for pos in info.findall('pos_info') if (pos.findtext('pos')=='명사' or (word in REVIEWED_TERMS and pos.findtext('pos')=='품사 없음')) for s in pos.findall('.//sense_info') if s.findtext('type')=='일반어']
        if senses and re.fullmatch('[가-힣]{2,100}',word):
            cats=sorted({c.text for s in senses for c in s.findall('.//cat') if c.text})
            # Exclude entries with only proper-name senses; retain common homonyms.
            usable=[s for s in senses if not {c.text for c in s.findall('.//cat')}&{'인명','지명','책명','고유명 일반'}]
            if usable:
                # Definitions used only for screening, never copied into output or game.
                defs=[s.findtext('definition','') for s in usable]
                obsolete=all(any(t in d for t in ['옛말','방언','북한어','잘못','비표준어']) for d in defs)
                sensitive=all(any(t in d for t in ['성교','성욕','성적 흥분','음경','음부','남근','여근','매춘','포르노','욕으로','욕하는 말','낮잡아','비하하여','비속하게']) for d in defs)
                if not obsolete and not sensitive:
                    result.append([word,item.findtext('target_code'),int(any(not s.findall('.//cat') for s in usable)),cats])
        item.clear()
    return result,{'name':row['name'],'gitBlob':row['sha'],'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
entries=[];manifest=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
    for i,(rows,meta) in enumerate(ex.map(process,files),1):
        entries.extend(rows);manifest.append(meta)
        if i%10==0:print(f'{i}/{len(files)} XML files, {len(entries)} eligible noun entries',flush=True)
output={'source':'국립국어원 표준국어대사전','sourceUrl':'https://stdict.korean.go.kr/','mirror':'https://github.com/spellcheck-ko/korean-dict-nikl','commit':a.commit,'license':'CC BY-SA 2.0 KR','files':manifest,'entries':entries}
Path(a.output).write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
print(f'Completed: {len(entries)} entries, {len(set(r[0] for r in entries))} unique noun spellings',flush=True)
