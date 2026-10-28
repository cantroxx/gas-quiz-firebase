#!/usr/bin/env python3
"""Validate the offline popular-quiz image selection; never writes production data.

Usage: python3 scripts/audit/check-popular-image-selection.py [manifest.json]
This checks curation metadata, not image licensing or live URL availability.
"""
import json
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
DEFAULT = ROOT / 'docs/product/popular-image-selection-2026-10-18/selection.json'


def validate(data):
    errors = []
    selected = data.get('selected', [])
    held = data.get('held', [])
    ids = set()
    hashes = set()
    for row in selected + held:
        item_id = row.get('id', '<missing>')
        if item_id in ids:
            errors.append(f'Duplicate ID: {item_id}')
        ids.add(item_id)
        for field in ('id', 'answer', 'group', 'sourceName', 'mappingEvidence',
                      'visualReview', 'verifiedAt', 'sha256'):
            if not row.get(field):
                errors.append(f'{item_id}: missing {field}')
        for field in ('imageUrl', 'sourceUrl'):
            parsed = urlparse(row.get(field, ''))
            if parsed.scheme != 'https' or not parsed.netloc:
                errors.append(f'{item_id}: invalid {field}')
            if any(host in parsed.netloc.lower() for host in ('drive.google.', 'googleusercontent.')):
                errors.append(f'{item_id}: Drive source forbidden for idol/anime')
        if row.get('category') not in ('idol', 'anime'):
            errors.append(f'{item_id}: unexpected category')
        if row.get('category') == 'anime':
            rating = row.get('rating', {})
            if rating.get('region') != 'KR' or rating.get('label') not in (
                    '전체관람가', '7세관람가', '12세관람가', '15세관람가'):
                errors.append(f'{item_id}: adult or unverified rating forbidden')
            if not all(rating.get(key) for key in ('sourceProvider', 'sourceUrl', 'checkedAt', 'scope')):
                errors.append(f'{item_id}: incomplete rating evidence')
        if row in selected:
            allowed_kinds = ('person', 'group') if row['category'] == 'idol' else ('character',)
            if row.get('questionKind') not in allowed_kinds:
                errors.append(f'{item_id}: invalid question kind')
            if not row.get('prompt'):
                errors.append(f'{item_id}: missing question prompt')
            if row.get('status') != 'selected' or row.get('imageFetchVerified') is not True:
                errors.append(f'{item_id}: unverified selection')
            if row.get('sha256') in hashes:
                errors.append(f'{item_id}: duplicate selected image bytes')
            hashes.add(row.get('sha256'))
        elif row.get('status') != 'hold' or not row.get('holdReason'):
            errors.append(f'{item_id}: invalid hold')
    expected = dict(Counter(row['category'] for row in selected))
    if data.get('summary', {}).get('selected') != expected:
        errors.append('Summary count mismatch')
    summary = data.get('summary', {})
    people = sum(row.get('questionKind') == 'person' for row in selected)
    groups = sum(row.get('questionKind') == 'group' for row in selected)
    if not 200 <= people <= 300 or not 300 <= expected.get('anime', 0) <= 400:
        errors.append('Selection must contain 200–300 individuals and 300–400 anime characters')
    if groups < 5:
        errors.append('Mixed idol rounds need at least five group questions')
    if summary.get('idolIndividuals') != people or summary.get('idolGroupQuestions') != groups:
        errors.append('Idol individual/group summary mismatch')
    if summary.get('held') != len(held):
        errors.append('Held summary mismatch')
    rules = data.get('rules', {})
    if rules.get('pokemon', {}).get('rankingMinGenerations') != 3:
        errors.append('Pokemon ranking must require at least three generations')
    if rules.get('timers') is not False:
        errors.append('Popular quizzes must not have time limits')
    if any(rules.get(key) is not True for key in ('economyRewards', 'xpRewards')):
        errors.append('Popular practice must follow shared XP and coin rules')
    mix = rules.get('questionMix', {}).get('idol', {})
    if (mix.get('roundSize'), mix.get('person'), mix.get('group')) != (20, 15, 5):
        errors.append('Idol preview must mix 15 individual and five group questions')
    if data.get('updatePolicy', {}).get('automaticPublish') is not False:
        errors.append('New images must be reviewed before publication')
    if data.get('stage') != 'content-selection-only':
        errors.append('This artifact must not imply an implemented or published game')
    return errors


if __name__ == '__main__':
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    data = json.loads(path.read_text())
    errors = validate(data)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        sys.exit(1)
    print(json.dumps({'valid': True, **data['summary']}, ensure_ascii=False))
