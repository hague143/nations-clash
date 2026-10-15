# Supplied country fighter derivatives

150 country atlases and portraits come from the user's Country_Fighters ZIPs.
The source country name is authoritative for assignment, as the user requested.
The intake contains 150 PNGs, not 196; the remaining 46 keep existing fighters.
Some painted costume flags do not match their filenames; they are not silently
reassigned or described as verified national flag costumes.

Original source PNGs and hashes are in `artwork/country-fighters/`. Runtime
atlases isolate the eight figures with their transparency, remove detached
background specks farther than six pixels from the connected figure, scale to
360-pixel standing height, and encode WebP at quality 88. Five touching sheets
have reviewed separation seams; a few already-overlapping source edges cannot
be reconstructed by cropping. Painted RGB colors and designs are not repainted.

`metadata.json` and the generated `country-art.js` describe per-pose pivots,
baselines, strike landmarks and source indices. Contacts lie on opaque pixels in
the actual runtime atlas. Dedicated low punches and alternate punches are used
when present; other low punches preserve upper-body aspect ratio while lowering
the lower body, and short low foot strikes adapt an available low stance.
Sheets without a supplied ground KO use their lowest supplied down pose.

Only selected match atlases decode; the renderer retains at most six. Portraits
are separate small images. The builder emits local artwork scripts containing
image data so the extracted game can render canvases without file-image CORS.

To regenerate, install the pinned development dependencies:

```sh
python3 -m pip install -r tools/fighter-art-requirements.txt
python3 tools/prepare-country-art.py
node tools/build-browser.mjs
python3 tools/package-browser.py
```

No Python or build tools are needed to play the extracted ZIP.
