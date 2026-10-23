#!/usr/bin/env python3
"""Refresh official directory records and reference-plan centroids; no dependencies.

Run from any directory. --write replaces dist/directory.json; export local edits first.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
from datetime import date
import argparse
import json
import re

URL = 'https://www.simedarbyproperty.com/malls/kleast-mall/'
ROOT = Path(__file__).resolve().parents[1]
FLOORS = {'mapLowerGround': 'LG', 'mapG1': 'G1', 'mapG2': 'G2', 'mapG3': 'G3', 'mapBasement': 'B'}


class DirectoryParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []

    def handle_starttag(self, tag, attrs):
        item = dict(attrs)
        if 'itemBox' in item.get('class', '') and item.get('data-name'):
            self.rows.append({
                'id': 's' + item['id'].replace('btn', ''),
                'name': item['data-name'], 'lot': item.get('data-floor', ''),
                'floor': FLOORS[item['data-map']],
                'category': item.get('data-category', 'services'),
                'source': URL, 'verified': 'directory', 'active': True,
            })


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--write', action='store_true')
    options = args.parse_args()
    html = urlopen(Request(URL, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read().decode('utf-8')
    parser = DirectoryParser()
    parser.feed(html)
    records = list({item['id']: item for item in parser.rows}.values())
    if len(records) < 50:
        raise SystemExit('Unexpected directory structure or too few records; original file not modified.')
    data = {'mall': {'name': 'KL East Mall', 'lat': 3.2248, 'lng': 101.7305, 'source': URL, 'retrieved': date.today().isoformat()}, 'stores': records}
    print(json.dumps({'records': len(records), 'write': options.write}))
    if options.write:
        import subprocess,sys,tempfile
        with tempfile.TemporaryDirectory() as td:
            source = Path(td) / 'official.html'
            source.write_text(html,encoding='utf-8')
            (ROOT / 'dist/directory.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
            subprocess.run([sys.executable,str(ROOT/'tools/rebuild-plan-network.py'),'--html',str(source)],check=True)


if __name__ == '__main__':
    main()
