#!/usr/bin/env python3
"""Create conventional, verified project/download ZIPs from a clean source checkout."""
from pathlib import Path
import argparse
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
out = args.output.resolve()
if out == ROOT or ROOT in out.parents:
    raise SystemExit('Put downloads outside the source checkout.')
if subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT).strip():
    raise SystemExit('Commit the final source before packaging downloads.')
files = sorted(f for f in subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0') if f and not f.startswith('.openai/'))
out.mkdir(parents=True, exist_ok=True)

def make_zip(name, entries):
    destination = out / name
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=9, allowZip64=False) as archive:
        for source, member in entries:
            member.encode('ascii')
            archive.write(ROOT / source, member)
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip() is not None:
            raise SystemExit(f'ZIP integrity check failed: {name}')
        assert all(i.compress_type == zipfile.ZIP_DEFLATED and not (i.flag_bits & 1) for i in archive.infolist())
        return destination, set(archive.namelist())

source, source_names = make_zip('mallway-source.zip', [(f, 'MallWay/' + f) for f in files])
web_files = [f for f in files if f.startswith('dist/')]
web_files.sort(key=lambda f: (f != 'dist/index.html', f))
web, web_names = make_zip('mallway-web.zip', [(f, f.removeprefix('dist/')) for f in web_files])
assert {'index.html', 'app.mjs', 'camera.mjs', 'navigation.mjs', 'directory.json', 'assets/plan-B.png', 'assets/ocr/tesseract-core-lstm.wasm'} <= web_names
assert 'MallWay/dist/navigation.mjs' in source_names and 'MallWay/tests/navigation.test.mjs' in source_names
assert 'MallWay/dist/index.html' in source_names and 'MallWay/tests/camera.test.mjs' in source_names and 'MallWay/serve.py' in source_names and 'MallWay/dist/bootstrap.js' in source_names
assert not any(f.startswith('dist/') or f.startswith('MallWay/') for f in web_names)

text_files = [f for f in files if not f.startswith('dist/assets/') and Path(f).suffix in {'.mjs', '.js', '.html', '.css', '.json', '.webmanifest', '.svg', '.py', '.txt', '.md', '.bat', '.sh'}]
text = out / 'mallway-code.txt'
with text.open('w', encoding='utf-8', newline='\n') as stream:
    stream.write('MALLWAY — READABLE SOURCE BUNDLE\n\nThis text attachment contains first-party code, data and documentation. It is not a runnable single-file app. Binary floor-plan images, OCR models and vendored libraries are in the complete ZIP packages.\n')
    for f in text_files:
        stream.write('\n\n' + '=' * 72 + '\nFILE: ' + f + '\n' + '=' * 72 + '\n')
        stream.write((ROOT / f).read_text(encoding='utf-8'))
for file in (source, web, text):
    print(f'{file.name}: {file.stat().st_size:,} bytes — {file}')
print('Verified ZIP CRCs, unencrypted DEFLATE format, ASCII paths, and website root index.html.')
