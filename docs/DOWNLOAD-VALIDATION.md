# Windows game package validation

The current package contains the HTML plus 150 on-demand country artwork scripts.
Right-click the ZIP and choose Extract All; keep `country-art/` beside the HTML.
No Unity, Python, account, server or internet is required to play the complete
extracted package in current Chrome or Edge.

The five supplied ZIPs contain 150 country PNGs. The user confirmed that the
remaining 46 sheets are still being made, so those countries retain their prior
fighters. Originals are preserved with SHA-256 checksums. Filenames determine
country assignment; source costume flag mismatches are listed in
[the artwork review](COUNTRY-ARTWORK-REVIEW.md) and in the ZIP's ARTWORK-NOTES.txt.

## Exact tested package

- ZIP: 63,494,033 bytes (60.55 MiB).
- ZIP SHA-256: `679c05a55b8a1754b76fc9f98300db3e136d148673f9b3fd9b973c8aca58ed7a`.
- Extracted HTML: 10,549,992 bytes.
- HTML SHA-256: `3661341f60667a7c8e01668e9dd5ebfaada24e73ef918171f1d0e7d4877dd942`.
- Members: 155, including all 150 country artwork scripts.

All ZIP CRCs pass. Every artwork script was extracted and the HTML matches the
packager output byte for byte. The actual extracted package was tested with:

```sh
python3 -m zipfile -e artifacts/NationClash-Windows.zip artifacts/country-package-check
NATIONCLASH_HTML=artifacts/country-package-check/NationClash.html \
NATIONCLASH_ARTIFACT_DIR=artifacts/country-package-validation \
node Tests/Browser/world-smoke.cjs
```

All 13 browser acceptance groups pass: all 196 selectable/rendered countries,
150 exact original-filename mappings, every supplied pose, 2,400 visible melee
contact fixtures in both stances and directions, bounded six-atlas decoding,
live keyboard movement/attacks/guard/whiff/jump/pause, rounds/results/rematch,
10 arenas, music and start/KO/impact sounds, live AI, portrait and landscape touch,
zero runtime errors and zero requests outside the local game files.

All 49 module/functional checks pass, including original-file hashes and 3,600
supplied-fighter hit fixtures, guard rules, genuine across-arena whiffs and
committed low-attack stance after input release. Contact landmarks were separately
checked against opaque pixels in the actual WebP atlases.

Managed Linux Chromium uses an internal HTTP server to serve the exact extracted
files because its managed browser can block file navigation. Direct use on a
Windows computer has not been observed here. Artwork loads through local scripts
that register image data, avoiding canvas access to cross-origin file images.

The prior 2.34 MiB download predates these supplied characters and is superseded.
Current package metadata is in [COUNTRY-PACKAGE-MANIFEST.json](COUNTRY-PACKAGE-MANIFEST.json).

Additional regression: `node Tests/Browser/start-loading.cjs` delays the artwork load and changes the visible country/arena controls mid-load. The match still starts with its original snapshotted fighters, arena and audio, with both characters rendered and no runtime error.
