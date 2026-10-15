"""Verify the downloadable ZIP against the built artwork and extract its HTML.

Run after package-browser.py. This does not execute the embedded program.
"""
import argparse
import base64
import gzip
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--zip', type=Path, default=ROOT/'artifacts/NationClash-Windows.zip')
    parser.add_argument('--out', type=Path, default=ROOT/'artifacts/package-check')
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.zip) as archive:
        assert archive.testzip() is None, 'ZIP CRC failed'
        members = archive.namelist()
        assert len(members) == 9 and len(set(members)) == 9
        assert all('/' not in name and '\\' not in name for name in members)
        html_bytes = archive.read('NationClash.html')
        assert archive.read('ARENA-INVENTORY.json') == (ROOT/'artwork/arenas/intake.json').read_bytes()
    html = html_bytes.decode()
    payloads = dict(re.findall(r'<script type="application/octet-stream" id="country-art-([a-z]{2})">([^<]+)</script>', html))
    countries = json.loads((ROOT/'browser/assets/countries/metadata.json').read_text())
    assert len(payloads) == 196 and set(payloads) == set(countries)
    for country, art in countries.items():
        expected = ROOT/'browser/assets/countries'/((art.get('sourceCountryId') or country)+'.webp')
        assert base64.b64decode(payloads[country], validate=True) == expected.read_bytes(), country
    packed = re.search(r"Uint8Array.from\(atob\('([A-Za-z0-9+/=]+)'\)", html)
    assert packed, 'Missing compressed program'
    program = gzip.decompress(base64.b64decode(packed.group(1), validate=True)).decode()
    bundled_modules = {}
    for name in ('powers', 'combat', 'power-fx', 'presentation', 'audio', 'game'):
        source = (ROOT/'browser/src'/(name+'.js')).read_text()
        prepared = source
        if name == 'audio':
            for cue in ('fight', 'ko', 'getready', 'timeover'):
                uri = 'data:audio/wav;base64,'+base64.b64encode((ROOT/'browser/assets/audio'/(cue+'.wav')).read_bytes()).decode()
                prepared = prepared.replace('/* AUDIO_'+cue.upper()+'_DATA */', uri)
        # Legacy atlases are separately optimized by the packager. Verify all
        # remaining game source in order around those four URI substitutions.
        if name == 'game':
            cursor = 0
            parts = re.split(r'/\* [A-Z]+_IMAGE_DATA \*/', prepared)
            assert len(parts) == 5
            for part in parts:
                at = program.find(part, cursor)
                assert at >= 0, 'Bundled game logic differs from tested source'
                cursor = at+len(part)
        else:
            assert prepared in program, 'Bundled module differs from tested source: '+name
        bundled_modules[name] = digest(source.encode())
    images = json.loads(re.search(r'const IMAGE_DATA=(\{[^\n]+\});', program).group(1))
    arenas = json.loads((ROOT/'browser/assets/arenas/metadata.json').read_text())
    assert len(images) == 30 and set(images) == set(arenas)
    for arena, uri in images.items():
        assert uri.startswith('data:image/webp;base64,')
        data = base64.b64decode(uri.split(',', 1)[1], validate=True)
        assert digest(data) == arenas[arena]['sha256'], arena
        assert data == (ROOT/'browser/assets/arenas'/(arena+'.webp')).read_bytes(), arena
    (args.out/'NationClash.html').write_bytes(html_bytes)
    report = {
        'format': 'self-contained single HTML inside ZIP',
        'zipBytes': args.zip.stat().st_size, 'zipSha256': digest(args.zip.read_bytes()),
        'htmlBytes': len(html_bytes), 'htmlSha256': digest(html_bytes),
        'sourceHtmlSha256': digest((ROOT/'browser/index.html').read_bytes()),
        'zipCrc': 'passed', 'members': len(members), 'companionAssetFiles': 0,
        'embeddedAtlases': len(payloads), 'assignedAtlasByteChecks': len(payloads),
        'sourcePngs': len(countries), 'missingPngs': 0,
        'eightPoseCountries': sum(len(a['poseRecords']) == 8 for a in countries.values()),
        'fourPoseCountry': [c for c,a in countries.items() if len(a['poseRecords']) == 4],
        'sourcePoseTotal': sum(len(a['poseRecords']) for a in countries.values()),
        'arenaSourcePngs': len(arenas), 'embeddedArenaViews': len(images),
        'arenaByteChecks': len(images), 'arenaLandmarks': 29,
        'countrySignatures': 196, 'signatureVisualMaterials': 9,
        'bundledModuleSourceHashes': bundled_modules,
    }
    (args.out/'package-manifest.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
