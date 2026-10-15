# Supplied country fighter derivatives

196 country atlases and portraits come from the user's original five ZIPs and
batches 16–20. No country PNG is missing. Filename mapping is the default;
15 visually reviewed, one-to-one flag swap corrections are recorded in
`artwork/country-fighters/assignments.json`. Original source IDs and bytes stay
unchanged. Combined runtime metadata carries `sourceCountryId`; the builder
selects that source's atlas and portrait together. Every source is used once.

Two unchanged costumes still need replacement (Sao Tome and Principe, Sierra Leone);
Monaco and Slovenia need confirmation. The latest archive contains 32 changed
and four unchanged PNGs. Turkey has four supplied poses; the other 195 have eight.
Its missing crouch/KO use explicit adapted states.
Shared source faces/designs are not described as 196 unique faces. Read
`docs/COUNTRY-ARTWORK-REVIEW.md` and the replacement checklist.

Original source PNGs and hashes are in `artwork/country-fighters/`. Runtime
atlases isolate the supplied figures with their transparency, remove detached
background specks farther than six pixels from the connected figure, scale to
360-pixel standing height, and encode WebP at quality 88. Touching sheets
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

The downloadable HTML embeds all 196 atlases as inert payloads and needs no
companion folder. Hosted builds retain separate lazy scripts. Both paths decode
only selected fighters and keep the same six-atlas cache.
