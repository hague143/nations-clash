# Fighter artwork and asset provenance

The active browser renderer now uses 150 supplied eight-pose country sheets.
Their unchanged PNG originals are under `artwork/country-fighters/source/`;
runtime derivatives and provenance are described in [countries/README.md](countries/README.md).
They replace the legacy Japan/Pakistan and shared rigs for those 150 countries.
The remaining 46 retain their earlier rigs while their images are being made.
Some supplied costume flags differ from the filenames; mapping follows the
user's explicit filename instruction. See `docs/COUNTRY-ARTWORK-REVIEW.md`.

The earlier assets below remain preserved for fallback rendering and provenance.

`japan-poses.png` and `pakistan-poses.png` were prepared with the image-generation
editing tool from the four-pose character images supplied by the user in this
conversation. Both contain idle, punch, kick and block key poses on transparency.
Pakistan preserves the supplied green/gold costume and crescent/star design.
These are supplied artwork, not APK-extracted assets; no original ownership claim
is made for the supplied character images.

`fighter-heads.png` is an image-generated transparent 4×4 atlas of 16 detailed
base faces. `fighter-body.png` is an image-generated transparent 4×2 atlas of
monochrome torso, upper arm, forearm, glove, pelvis, thigh, shin and boot textures.
The runtime tints and articulates these shared textures, combines country-specific
appearance profiles, and renders each country's national flag on clothing.
The roster does not claim 196 individually painted faces or separate 3D models.

PNG files remain intact. Canvas clips the supplied sprite frames at runtime to
exclude neighboring pose fragments. Japan metadata is in `JAPAN_ART` in
`src/combat.js`; Pakistan metadata is in `PAKISTAN_ART` in `src/sprites.js`.
Pivots, baselines, scales and strike landmarks are shared with collision checks.
Four authored poses use transforms/effects for walking, crouching, air and recoil.

The builder embeds all artwork as data URIs for offline play. National SVG flags
are licensed MIT by lipis/flag-icons; provenance, the upstream license, country
metadata and pinned checksums are in [flags/](flags/README.md). The original
announcer cues, synthesized music and strike effects are documented in
[audio/README.md](audio/README.md). No commercial-game soundtrack or APK-extracted
image, model, animation or voice recording is included.
