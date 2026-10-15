"""Package the standalone game into a compact offline Windows download.

Pillow is required only while packaging; the downloadable game has no Python
dependency. Original PNG source assets are retained unchanged.
"""
import base64
import gzip
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "artifacts"
OUT.mkdir(exist_ok=True)
html = (ROOT / "browser/index.html").read_text()
source_hash = hashlib.sha256(html.encode()).hexdigest()
assets = OUT / "web-assets"
assets.mkdir(exist_ok=True)
for name in ("japan-poses", "pakistan-poses", "fighter-heads", "fighter-body"):
    original = ROOT / "browser/assets" / (name + ".png")
    encoded = assets / (name + ".webp")
    with Image.open(original) as image:
        image.save(encoded, "WEBP", quality=92, method=6)
        expected_size = image.size
    with Image.open(encoded) as image:
        assert image.size == expected_size, "Sprite dimensions must not change"
    old_uri = "data:image/png;base64," + base64.b64encode(original.read_bytes()).decode()
    new_uri = "data:image/webp;base64," + base64.b64encode(encoded.read_bytes()).decode()
    assert html.count(old_uri) == 1, "Expected exactly one embedded atlas"
    html = html.replace(old_uri, new_uri)

scripts = list(re.finditer(r"<script>([\s\S]*?)</script>", html))
assert len(scripts) == 1
script = scripts[0]
packed = base64.b64encode(gzip.compress(script.group(1).encode(), compresslevel=9, mtime=0)).decode()
loader = """<script>
(async()=>{
 const button=document.getElementById('start');
 button.disabled=true;button.textContent='LOADING CHAMPIONS…';
 try{
  if(typeof DecompressionStream!=='function')throw new Error('Please open this game in an up-to-date Chrome or Microsoft Edge.');
  const bytes=Uint8Array.from(atob('PACKED_PROGRAM'),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const program=await new Response(stream).text();
  const script=document.createElement('script');script.textContent=program;
  document.body.appendChild(script);
 }catch(error){
  button.textContent='GAME COULD NOT LOAD';
  document.getElementById('arena-description').textContent=error.message;
 }
})();
</script>""".replace("PACKED_PROGRAM", packed)
# Inert payloads are parsed as text rather than a giant JavaScript object.
# Image decoding remains lazy and bounded in country-sprites.js. The downloaded
# HTML therefore works by itself, including after moving it to another folder.
metadata = json.loads((ROOT / 'browser/assets/countries/metadata.json').read_text())
payloads = []
for country, art in sorted(metadata.items()):
    source_id = art.get('sourceCountryId', country)
    encoded = base64.b64encode((ROOT / 'browser/assets/countries' / (source_id+'.webp')).read_bytes()).decode()
    payloads.append('<script type="application/octet-stream" id="country-art-'+country+'">'+encoded+'</script>')
assert len(payloads) == 196
html = html[:script.start()] + '\n'.join(payloads) + '\n' + loader + html[script.end():]
game = OUT / "NationClash-Play.html"
game.write_text(html)
readme = """NATIONCLASH WORLD ARENA - WINDOWS

1. Download and right-click NationClash-Windows.zip. Choose Extract All.
2. Open the extracted folder.
3. Right-click NationClash.html > Open with > Microsoft Edge or Google Chrome.
4. Wait for the country cards to load, then click ENTER THE ARENA.

Open the extracted HTML in the browser, rather than inside the ZIP or chat preview.
No Unity, Python, installer, server or internet is needed to play.
Use an up-to-date Chrome or Edge browser.

Move A/D. Jump W. Crouch S. Block F. Attacks J/K/L.
Guard break U. Throw I. Ultimate O. Pause Escape.

NationClash.html contains all 196 fighters, portraits, flags, arenas and sounds.
The HTML works by itself; there is no required country-art folder.
The file is large: allow it to finish loading before selecting a match.

Includes the agreed 196 countries (196 supplied fighters, no missing country sheets),
the supplied costumes, 10 selectable arenas,
computer/local modes, music, Fight/KO announcements and strike sounds.
"""
credits = (ROOT / "browser/assets/README.md").read_text()
credits += "\n\n" + (ROOT / "browser/assets/audio/README.md").read_text()
credits += "\n\n" + (ROOT / "browser/assets/countries/README.md").read_text()
credits += "\n\nNational flags: lipis/flag-icons 7.5.0\n"
credits += (ROOT / "browser/assets/flags/LICENSE.txt").read_text()
credits += "\nDownload optimization: PNG sources remain intact; the downloadable game embeds WebP variants at the same dimensions. Its inline program is gzip compressed.\n"
archive = OUT / "NationClash-Windows.zip"
with ZipFile(archive, "w", ZIP_DEFLATED, compresslevel=9) as zip_file:
    zip_file.writestr("NationClash.html", html)
    zip_file.writestr("START-HERE.txt", readme.replace("\n", "\r\n"))
    zip_file.writestr("CREDITS.txt", credits)
    zip_file.writestr("ARTWORK-NOTES.txt", (ROOT / 'docs/COUNTRY-ARTWORK-REVIEW.md').read_text())
    zip_file.writestr("ARTWORK-INVENTORY.json", (ROOT / 'artwork/country-fighters/intake.json').read_bytes())
    zip_file.writestr('COUNTRY-ASSIGNMENTS.json', (ROOT / 'artwork/country-fighters/assignments.json').read_bytes())
    zip_file.writestr('REPLACEMENT-CHECKLIST.txt', (ROOT / 'docs/REPLACEMENT-ARTWORK-CHECKLIST.md').read_text())

with ZipFile(archive) as zip_file:
    assert zip_file.testzip() is None
    assert zip_file.read("NationClash.html") == game.read_bytes()
    assert len(zip_file.namelist()) == 7
    assert html.count('id="country-art-') == 196
    assert not any(n.startswith('country-art/') for n in zip_file.namelist())
OUT.chmod(0o755)
for path in (game, archive):
    path.chmod(0o644)
print("Source SHA256:", source_hash)
print("HTML:", game, game.stat().st_size, "bytes")
print("ZIP:", archive, archive.stat().st_size, "bytes")
