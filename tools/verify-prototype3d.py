"""Verify the self-contained prototype download against every bundled source."""
from pathlib import Path
from zipfile import ZipFile
import argparse,base64,hashlib,json

ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--zip',type=Path,default=ROOT/'downloads/NationClash-3D-Prototype.zip')
args=parser.parse_args()
manifest=json.loads((ROOT/'artifacts/prototype3d/package-manifest.json').read_text())
digest=lambda data:hashlib.sha256(data).hexdigest()
assert digest(args.zip.read_bytes())==manifest['zipSha256']
with ZipFile(args.zip) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist())=={'NationClash-3D-Prototype.html','START-HERE.txt','THREE-LICENSE.txt'}
    html=archive.read('NationClash-3D-Prototype.html')
    assert archive.read('THREE-LICENSE.txt')==(ROOT/'browser3d/vendor/THREE-LICENSE.txt').read_bytes()
assert digest(html)==manifest['htmlSha256']
assert html==(ROOT/'browser3d/index.html').read_bytes()==(ROOT/'downloads/NationClash-3D-Prototype.html').read_bytes()
text=html.decode()
for name,sha in manifest['sourceHashes'].items():
    source=(ROOT/name).read_bytes();assert digest(source)==sha,name
    prepared=source.decode()
    if name=='browser/src/audio.js':
        for cue in ['fight','ko','getready','timeover']:
            data=(ROOT/'browser/assets/audio'/(cue+'.wav')).read_bytes()
            prepared=prepared.replace('/* AUDIO_'+cue.upper()+'_DATA */','data:audio/wav;base64,'+base64.b64encode(data).decode())
    assert prepared.replace('</script','<\\/script') in text,'Missing bundled source: '+name
assert '/* PROTOTYPE_3D_SOURCE */' not in text
assert not any('/* AUDIO_'+cue+'_DATA */' in text for cue in ['FIGHT','KO','GETREADY','TIMEOVER'])
assert digest((ROOT/'browser3d/template.html').read_bytes())==manifest['templateSha256']
print('Verified ZIP CRC, three members, exact HTML, all six bundled sources, voice clips and MIT license.')
