"""Usage: python3 scripts/import-noc.py STRUCTURE.csv ELEMENTS.csv
Official sources: https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1
Only Level 5 occupation groups and All examples are imported; exclusions are never aliases.
"""
import csv,json,sys
from pathlib import Path
groups={}
with open(sys.argv[1],encoding='utf-8-sig') as f:
 for row in csv.DictReader(f):
  if row['Level']=='5':
   code=row['Code - NOC 2021 V1.0'];groups[code]={'code':code,'title':row['Class title'].strip(),'teer':int(code[1]),'titles':[]}
with open(sys.argv[2],encoding='utf-8-sig') as f:
 for row in csv.DictReader(f):
  if row['Element Type Label English']=='All examples':
   groups[row['Code - NOC 2021 V1.0']]['titles'].append(row['Element Description English'].strip())
for g in groups.values():g['titles']=sorted(set(g['titles']))
assert len(groups)==516
Path('dist/noc-2021.json').write_text(json.dumps(list(groups.values()),ensure_ascii=False,separators=(',',':'))+'\n')
print(f'{len(groups)} groups; {sum(len(g["titles"]) for g in groups.values())} job titles')
