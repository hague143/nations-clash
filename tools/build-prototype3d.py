"""Build a self-contained, offline Three.js combat prototype and a small ZIP."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import base64, hashlib, json

ROOT=Path(__file__).resolve().parent.parent
folder=ROOT/'browser3d'
paths=[folder/'vendor/three-r160.min.js',*(folder/'src'/(name+'.js') for name in ['combat','models','arena']),ROOT/'browser/src/audio.js',folder/'src/game.js']
parts=[]
for path in paths:
    source=path.read_text()
    if path.name=='audio.js':
        for cue in ['fight','ko','getready','timeover']:
            data=(ROOT/'browser/assets/audio'/(cue+'.wav')).read_bytes()
            source=source.replace('/* AUDIO_'+cue.upper()+'_DATA */','data:audio/wav;base64,'+base64.b64encode(data).decode())
    parts.append(source)
program='\n;\n'.join(parts).replace('</script','<\\/script')
template=(folder/'template.html').read_text()
marker='<script>/* PROTOTYPE_3D_SOURCE */</script>'
assert template.count(marker)==1
html=template.replace(marker,'<script>'+program+'</script>').encode()
(folder/'index.html').write_bytes(html)
downloads=ROOT/'downloads';downloads.mkdir(exist_ok=True)
name='NationClash-3D-Prototype.html'
(downloads/name).write_bytes(html)
readme='''NATIONCLASH - 3D COMBAT PROTOTYPE

Pakistan versus Japan at a real 3D Minar-e-Pakistan arena.
Original stylized mesh fighters inspired by the supplied costume references.
This is a gameplay/visual prototype, not an exact 3D reconstruction of the PNGs.

1. Right-click NationClash-3D-Prototype.zip > Extract All.
2. Open NationClash-3D-Prototype.html in current Google Chrome or Microsoft Edge.
3. Choose your fighter, mode and quality, then START FIGHT.
No Unity, account, server, companion files or internet is required after download.
WebGL and browser hardware acceleration are needed. Try Low quality on slow devices.

PLAYER 1: A/D move, W jump, S crouch, hold F block.
J punch, K kick, H country special (four-second recharge), Escape pause.
PLAYER 2 (Local): arrow keys move/jump/crouch, right Ctrl block,
numpad 1 punch, numpad 2 kick, numpad 3 country special.
Training mode leaves the opponent still for testing contact and attacks.
Move close for melee attacks; attacks outside real contact range miss.
Low attacks beat standing guard; crouch + guard blocks low attacks.
Win two rounds. Use ARENA VIEW to inspect the real 3D scene.
Touch buttons are available during fights. Music and Effects are adjustable.

Tested automatically in Linux Chromium, including actual WebGL mesh contacts.
Windows file opening and Android native packaging have not been observed here.
Three.js r160 is MIT licensed; its license is included.
Original prototype meshes, procedural arena and generated audio are included.
'''
archive=downloads/'NationClash-3D-Prototype.zip'
with ZipFile(archive,'w',ZIP_DEFLATED,compresslevel=9) as z:
    z.writestr(name,html)
    z.writestr('START-HERE.txt',readme)
    z.writestr('THREE-LICENSE.txt',(folder/'vendor/THREE-LICENSE.txt').read_bytes())
with ZipFile(archive) as z:
    assert z.testzip() is None and z.read(name)==html
digest=lambda data:hashlib.sha256(data).hexdigest()
manifest={'format':'self-contained offline 3D prototype','htmlBytes':len(html),'htmlSha256':digest(html),'zipBytes':archive.stat().st_size,'zipSha256':digest(archive.read_bytes()),'fighters':['pk','jp'],'arena':'Minar-e-Pakistan','threeVersion':'r160','sourceHashes':{str(p.relative_to(ROOT)):digest(p.read_bytes()) for p in paths},'templateSha256':digest(template.encode())}
out=ROOT/'artifacts/prototype3d';out.mkdir(parents=True,exist_ok=True)
(out/'package-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
