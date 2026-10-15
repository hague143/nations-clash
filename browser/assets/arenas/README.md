# Supplied arena artwork

The user supplied `Famous_Fighting_Stages_All_30.zip` through Google Drive.
All 30 PNGs are preserved byte for byte in `artwork/arenas/source/`.
`artwork/arenas/intake.json` records original names, archive paths, dimensions
and SHA-256 hashes. The reviewed catalog maps each file to its menu entry.

The 30 selectable backgrounds depict 29 landmarks: Angkor Wat has two distinct
views, named Temple Terrace and Lotus Causeway. London uses the supplied Big
Ben image and Rio uses Christ the Redeemer. Niagara Falls represents Canada
and the United States. No source image is reused for another arena.

`python3 tools/prepare-arena-art.py` verifies every source checksum and creates
1280×720 WebP derivatives (quality 90), the runtime checksums in `metadata.json`
and `browser/src/arena-catalog.js`. The size conversion applies only a negligible
aspect correction from the original 1672×941 images. Original bytes are retained.

All backgrounds are embedded in both browser builds and the portable HTML.
Only selected arena images decode; the cache retains at most three images and
pins the live match's arena. Arena music is synthesized from the existing
original music system. Background images are static illustrations.
