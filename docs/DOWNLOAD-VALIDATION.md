# Windows game package validation

The current package contains the HTML plus **196** on-demand country artwork scripts.
Right-click the ZIP and choose Extract All; keep `country-art/` beside the HTML.
No Unity, Python, account, server or internet is needed to play the complete
extracted package in current Chrome or Edge.

All 196 country PNGs are present. Batches 16–20 provided the remaining 46.
Originals and archive provenance are preserved with SHA-256 checksums.
Fifteen reviewed one-to-one flag swaps affect portraits, atlases and collision
metadata together. There are no exact file or canonical visible-pixel duplicate
sheets among 19,110 pairs. Many source faces/designs are similar; 34 costumes
need replacement and two need confirmation. See [the audit](COUNTRY-ARTWORK-REVIEW.md)
and [creator checklist](REPLACEMENT-ARTWORK-CHECKLIST.md).

## Exact tested package

- ZIP: 80,923,717 bytes (77.17 MiB).
- ZIP SHA-256: `34727e5bc4c42e257bf80ee3d3b1c9526abd215844d18081cd56d0707206acbc`.
- Extracted HTML: 12,624,748 bytes.
- HTML SHA-256: `59213819779691a5c2bc7641d971537539f15cbcdae7e44df40acfc99f28e24a`.
- Members: 203, including all 196 country artwork scripts.
- Every packaged atlas payload was compared byte for byte with the expected
  reviewed source-country WebP: **196 checks passed**.

All ZIP CRCs pass. Every member was extracted, and the HTML matches the packager
output and browser acceptance document hash byte for byte. The exact package was tested with:

```sh
python3 -m zipfile -e artifacts/NationClash-Windows.zip artifacts/country-package-check
NATIONCLASH_HTML=artifacts/country-package-check/NationClash.html \
NATIONCLASH_ARTIFACT_DIR=artifacts/batch16-20/package-validation \
node Tests/Browser/world-smoke.cjs
node Tests/Browser/start-loading.cjs
```

All **13 browser acceptance groups pass**: 196 selectable/rendered countries,
196 expected source assignments, every supplied pose, **3,136** visible melee
contact fixtures in both stances and directions, bounded six-atlas decoding,
live keyboard movement/attacks/guard/whiff/jump/pause, rounds/results/rematch,
10 arenas, music and Fight/KO/impact sounds, live AI, portrait/landscape touch,
zero runtime errors and zero requests outside the local game files.

All **50 module/functional checks pass**, including original source hashes,
source assignment uniqueness, reviewed swap regressions, **4,704** supplied-fighter
hit fixtures, guard rules, genuine across-arena whiffs, and low-input release.
The start-loading regression also passes: changing selection during artwork load
cannot change or blank the match already starting.

Managed Linux Chromium serves the exact extracted files through an internal HTTP
server. A separate direct `file:` navigation attempt was blocked by the managed
browser with `ERR_BLOCKED_BY_ADMINISTRATOR`; that path could not be exercised here.
Direct Windows opening has not been observed. The game uses local scripts with
embedded image data to avoid cross-origin file-image canvas restrictions.

See [package metadata](COUNTRY-PACKAGE-MANIFEST.json), [browser evidence](WORLD-ACCEPTANCE.json)
and [public delivery verification](PUBLIC-DOWNLOAD-VERIFICATION.json).
