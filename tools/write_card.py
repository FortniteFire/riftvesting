#!/usr/bin/env python3
"""Read a JSON spec on stdin; write/merge cards/<id>.json, update watchlist.json, copy image."""
import json, os, re, shutil, statistics as st, sys
from datetime import date, timedelta

OUT = '/mnt/user-data/outputs'
TODAY = '2026-09-05'
spec = json.load(sys.stdin)

TYPES = {'a': 'auction', 'b': 'buy_now', 'o': 'best_offer'}
SRCS = {'e': 'ebay', 'a': 'alt', 'p': 'pwcc', 'pwcc weekly auctions': 'pwcc', 'goldin auctions': 'goldin'}

def decode(compact):
    rows = []
    for item in [x for x in compact.split(';') if x.strip()]:
        d, p, t, s, u = item.split(',')
        rows.append({'date': f'20{d[0:2]}-{d[2:4]}-{d[4:6]}', 'price': int(p), 'type': TYPES.get(t, t),
                     'source': SRCS.get(s, s), 'via': 'alt', 'unpaid': u == 'U'})
    return rows

rows = decode(spec['rows'])
cid = spec['id']
grade = spec['grade']
path = f'{OUT}/cards/{cid}.json'
card = None
for p in (path, f'/mnt/project/{cid}.json'):
    if os.path.exists(p):
        card = json.load(open(p)); break
if card is None:
    card = {'card': {}, 'pops': {}, 'grades': {}}

meta = {'id': cid, 'game': 'Riftbound', 'set': spec['set'], 'set_code': spec['set_code'], 'number': spec['number'],
        'name': spec['name'], 'variant': spec['variant'], 'alt_title': spec['alt_title']}
if spec.get('title'):
    meta['title'] = spec['title']
for k, v in meta.items():
    card['card'].setdefault(k, v)
card['card']['alt_title'] = card['card'].get('alt_title') or spec['alt_title']

pops = {'as_of': TODAY, 'source': 'alt'}
pops.update(spec['pops'])
card['pops'] = pops

grader = grade.split()[0].lower()
img_rel = f"images/{grader}-{spec['cert']}.jpg"
g = card['grades'].get(grade, {})
g['alt_item_id'] = spec['alt_item_id']
g['alt_url'] = f"https://alt.xyz/itm/{spec['alt_item_id']}/research"
g['alt_value'] = ({'as_of': TODAY} | spec['av']) if spec.get('av') else None
g['last_checked'] = TODAY
g.setdefault('image', img_rel)
g['sales'] = rows
card['grades'][grade] = g
os.makedirs(f'{OUT}/cards', exist_ok=True); os.makedirs(f'{OUT}/images', exist_ok=True)
json.dump(card, open(path, 'w'), indent=1)

if spec.get('image_src') and not os.path.exists(f'{OUT}/{img_rel}'):
    from PIL import Image
    im = Image.open(spec['image_src']).convert('RGB'); w, h = im.size
    if h > 1200: im = im.resize((round(w * 1200 / h), 1200), Image.LANCZOS)
    im.save(f'{OUT}/{img_rel}', 'JPEG', quality=85, optimize=True, progressive=True)

wl = json.load(open(f'{OUT}/watchlist.json'))
wl['updated'] = TODAY
newest = rows[0] if rows else None
entry = {'card_id': cid, 'grade': grade, 'alt_item_id': spec['alt_item_id'], 'alt_url': g['alt_url'],
         'last_seen': {'date': newest['date'], 'price': newest['price'], 'type': newest['type']} if newest else None}
for i, it in enumerate(wl['items']):
    if it['card_id'] == cid and it['grade'] == grade:
        wl['items'][i] = entry; break
else:
    wl['items'].append(entry)
json.dump(wl, open(f'{OUT}/watchlist.json', 'w'), indent=1)

paid = [r for r in rows if not r['unpaid']]
cut = (date.fromisoformat(TODAY) - timedelta(days=30)).isoformat()
w = [r['price'] for r in paid if r['date'] >= cut]
med = st.median(w) if w else None
flags = [f"{r['date']} ${r['price']:,} ({(r['price']-med)/med*100:+.0f}%)" for r in paid if r['date'] >= cut and abs(r['price']-med)/med > 0.4] if med else []
summ = f"{cid} | {grade} | {len(rows)} rows ({sum(r['unpaid'] for r in rows)} unpaid) {rows[-1]['date'] if rows else '-'}→{rows[0]['date'] if rows else '-'} | last ${newest['price']:,} {newest['type']} | 30d n={len(w)} med={('$%s' % format(round(med), ',')) if med else '-'} | av={spec.get('av') and spec['av']['value']} | pops={json.dumps(spec['pops'], separators=(',', ':'))}"
if flags: summ += ' | FLAGS: ' + '; '.join(flags)
print(summ)
