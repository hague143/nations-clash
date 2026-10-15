# Updated arena package validation

The download contains one self-contained `NationClash.html`, with all **196
country fighters, 30 supplied arena views and audio** embedded. Its ZIP includes
that HTML and eight instructions, credits and artwork records. No companion
asset folder is required. The smaller hosted source build still loads country
atlases from accompanying local scripts.

The arena images depict 29 landmarks: Angkor Wat has two distinct views.
All 30 original PNGs were visually reviewed and preserved unchanged. Menu names,
preview pixels and live-match backgrounds match their reviewed source mappings.
See [arena review](ARENA-ARTWORK-REVIEW.md) and [checks](ARENA-ACCEPTANCE.json).

## Exact tested artifact

- ZIP: 89,186,024 bytes (85.05 MiB).
- ZIP SHA-256: `5a0cc0ad9c6197ebe57bfc8d7fc4a2243ec15f7e1f36961a6d5079557936e498`.
- Extracted HTML: 117,864,361 bytes (112.40 MiB).
- HTML SHA-256: `184ec8c4626388900b75a09c80ebffe18e83910ae67369a33782df2b5238f822`.
- ZIP members: nine. Companion artwork files: **zero**.
- All **196** embedded country atlases match their assigned source WebPs.
- All **30** embedded arena images match their runtime WebPs and recorded hashes.

ZIP CRCs pass. The exact extracted HTML hash matches the document in
[the browser acceptance report](WORLD-ACCEPTANCE.json). The expanded HTML exceeds
GitHub's 100 MiB individual-file limit, so it is distributed inside the ZIP.
The old standalone download is removed from the current branch to avoid serving
an outdated game; earlier immutable commits retain it.

## Executed checks

All **52 automated tests pass**. These cover preserved country/arena hashes,
unique mappings, every supplied pose, 4,704 six-action hit fixtures, guards and
whiffs. The crouched matchup matrix verifies **153,664 low-strike hits and
153,664 boundary whiffs** across all 196 defenders, both attacks and directions.
The arena browser test decodes all supplied backgrounds, compares the rendered
pixels with their source images, and verifies the three-image cache and retained
match background. All 30 images and music arrangements are distinct.

All **17 browser acceptance groups pass** on the exact standalone HTML:

- All 196 country cards, assignments and rendered fighters.
- 3,136 painted melee-contact fixtures and 3,136 two-fighter layering fixtures,
  both stances, facings and player slots.
- Every supplied pose, bounded country decoding, adapted four-pose Turkey
  crouch and grounded KO.
- Real Iraq/Iran UI selection and keyboard punch/kick hits and out-of-range
  misses, standing/low and both directions.
- All 30 arena previews and live matches, matching background pixels and music,
  retained active image and bounded cache. Late image loads cannot overwrite a
  newer selection.
- Keyboard controls, guards, jump, pause, KO/results/rematch, music/Fight/KO/strike
  audio, volume/mute, AI, mobile portrait and landscape touch.
- Zero runtime errors and no external network requests.

The separate start-loading regression also passes: changing the visible country
or arena while images load cannot change or blank the match already starting.

```sh
node --test Tests/Browser/roster.test.cjs Tests/Browser/combat.test.cjs \
  Tests/Browser/combat-matrix.test.cjs Tests/Browser/fighters.test.cjs \
  Tests/Browser/country-art.test.cjs Tests/Browser/arenas-audio.test.cjs
python3 tools/verify-browser-package.py --out artifacts/arena-update/package-check
NATIONCLASH_HTML=artifacts/arena-update/package-check/NationClash.html \
NATIONCLASH_ARTIFACT_DIR=artifacts/arena-update/package-validation \
  node Tests/Browser/world-smoke.cjs
NATIONCLASH_PACKAGE_DIR=artifacts/arena-update/package-check \
  node Tests/Browser/start-loading.cjs
```

Managed Linux Chromium tests the exact extracted HTML over an internal HTTP
server. Browser policy blocks direct file navigation; Windows file opening has
not been observed here. The HTML uses embedded assets and needs no user-run
server, Unity, Python or internet to play in current Chrome or Edge.

Country artwork remains as reviewed: all 196 PNGs are present; 195 sheets have
eight poses and Turkey has four with explicit adapted states. Two costumes need
replacement and two need confirmation. See the [creator checklist](REPLACEMENT-ARTWORK-CHECKLIST.md).
No identical file or visible-pixel sheets were found; shared faces/designs are
not described as independently drawn faces. Backgrounds are static illustrations.

See [package metadata](COUNTRY-PACKAGE-MANIFEST.json), [browser evidence](WORLD-ACCEPTANCE.json)
and [public download verification](PUBLIC-DOWNLOAD-VERIFICATION.json).

## Verified public delivery

https://raw.githubusercontent.com/hague143/nations-clash/6c41478bd01ad26e42ea39af79e86ce590cc9eb0/downloads/NationClash-Windows.zip

The public ZIP returned HTTP 200 and was downloaded in full. Its byte count,
SHA-256 and CRCs match the tested artifact. The contained HTML matches the exact
browser acceptance document. All artwork is embedded in that HTML.
