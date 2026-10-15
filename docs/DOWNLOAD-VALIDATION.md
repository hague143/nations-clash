# Single-file HTML package validation

The playable download is now **one self-contained NationClash.html**. Its 196
country atlases are inert embedded payloads; only selected match images decode,
with a maximum six-atlas cache. No companion country-art folder is required.
The ZIP contains that HTML plus six instructions, credits and artwork records.
The hosted source build remains a smaller HTML with lazy local artwork scripts.

The latest 36-image archive supplies 32 changed PNGs and four identical copies
of previous files. No country PNG is missing. 195 countries have eight source
poses; Turkey has four, with explicit adapted crouch and ground KO states.
Sao Tome and Principe and Sierra Leone still need corrected costumes; Monaco
and Slovenia need confirmation. See [the artwork review](COUNTRY-ARTWORK-REVIEW.md).

## Exact tested artifact

- ZIP: 79,113,341 bytes (75.45 MiB).
- ZIP SHA-256: `bf7dc3623d67133c0d4ea1e42fb55a550d178b90d463767bb1a6446676e20a3b`.
- HTML: 104,572,020 bytes (99.73 MiB).
- HTML SHA-256: `2c0ddb0a34f4683b5e88abcfe73d67b89ad087e8654c1d38bab29be1b9193258`.
- ZIP members: seven. Companion artwork files: **zero**.
- Embedded country atlases: **196**, each byte-checked against its expected
  source-country WebP and recorded assignment.

All ZIP CRCs pass. The archive was extracted into a new directory without any
old country-art folder. The exact extracted HTML hash matches the document in
[the browser acceptance report](WORLD-ACCEPTANCE.json).

## Executed checks

All **52 automated tests pass**, including preserved source hashes, unique
source assignment, every supplied frame, 4,704 six-action hit fixtures, guard
rules and genuine whiffs. A new full country-versus-country low-strike matrix
checks **153,664 hits and 153,664 boundary whiffs** across all 196 crouched
opponents, both punch/kick actions and both directions. Low punches formerly
above shorter crouchers now bend below the fist to align with their hitbox.

All **16 browser acceptance groups pass** on the exact standalone HTML:

- All 196 country cards, source assignments and rendered fighters.
- 3,136 actual painted melee-contact fixtures, both stances and facings.
- 3,136 two-fighter layering fixtures, both player slots and facings. The old
  fixed paint order obscured contact pixels in 1,362 of these fixtures; the
  active attack now draws over its defender.
- Every supplied source pose, bounded lazy decoding, adapted four-pose Turkey
  crouch and grounded KO.
- Iraq and Iran selected through the real country UI, with correct HUD names;
  live keyboard checks for eight hits and eight out-of-range misses across
  punch/kick, standing/low and left/right directions.
- Keyboard controls, guards, jump, pause, KO rounds/results/rematch, 10 arenas,
  music/Fight/KO/strike audio, AI, mobile portrait/landscape touch.
- Zero runtime errors and no requests outside the tested local document.

The start-loading regression passes on the standalone package: changes to the
visible country/arena selectors while loading cannot change or blank the match
already starting. All 196 source pairs were separately audited (19,110 pairs):
no identical file pairs, canonical visible-pixel sheets or reused assignments.
Shared source faces/designs are not described as 196 independent faces.

```sh
node --test Tests/Browser/roster.test.cjs Tests/Browser/combat.test.cjs \
  Tests/Browser/combat-matrix.test.cjs Tests/Browser/fighters.test.cjs \
  Tests/Browser/country-art.test.cjs Tests/Browser/arenas-audio.test.cjs
NATIONCLASH_HTML=artifacts/selected36/package-check/NationClash.html \
NATIONCLASH_ARTIFACT_DIR=artifacts/selected36/package-validation \
  node Tests/Browser/world-smoke.cjs
NATIONCLASH_PACKAGE_DIR=artifacts/selected36/package-check \
  node Tests/Browser/start-loading.cjs
```

Managed Linux Chromium serves the exact extracted HTML over an internal HTTP
server. Managed browser policy blocks direct file navigation; direct opening on
a Windows PC has not been observed here. The single HTML uses embedded images
and scripts without external assets, a user-run server, Python or Unity.

See [package metadata](COUNTRY-PACKAGE-MANIFEST.json), [browser evidence](WORLD-ACCEPTANCE.json)
and [public download verification](PUBLIC-DOWNLOAD-VERIFICATION.json).

## Verified public delivery

Both immutable public files were downloaded in full after the push:

- https://raw.githubusercontent.com/hague143/nations-clash/17563c22045bb95463843fe01c3fe920d7ee3ebe/downloads/NationClash-Windows.zip
- https://raw.githubusercontent.com/hague143/nations-clash/17563c22045bb95463843fe01c3fe920d7ee3ebe/downloads/NationClash.html

Both returned HTTP 200 and match the exact tested ZIP/HTML sizes and SHA-256
values. ZIP CRCs pass; its contained HTML is identical to the standalone public
HTML and to the browser acceptance document.
