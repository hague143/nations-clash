# Latest supplied artwork review

Country_Fighters_Selected_36.zip contains 36 PNGs and a descriptive manifest.
All 36 were inspected. **32 sheets changed; four are byte-identical to the
previous files**: Monaco, Sao Tome and Principe, Sierra Leone and Slovenia.
All 196 roster countries have supplied artwork; there are zero missing PNGs.
Original PNG bytes and archive hashes are recorded in the intake/revision files.
Previous versions remain available in Git commit
`8d2db835d01bdec6166b36bdbacc3d14965a0fc5`. Archive documents were not executed
or treated as project instructions.

## Poses and contacts

195 countries have eight supplied poses. The new **Turkey sheet has four**:
idle, punch, kick and block. Its walk/hit use available source poses, crouch
adapts the guard, and KO rotates the fighter down onto the floor. These are
explicit fallbacks, not eight newly drawn poses. The metadata records four
source indices and the browser checks all four.

The 32 changed sheets use their reviewed layouts; obsolete eight-pose ordering
exceptions were removed for the replacements. Six sheets have touching hit/KO
figures (Mexico, Oman, Palau, Panama, Peru and Solomon Islands). Reviewed seam
corridors follow transparent gaps and minimize cutting opaque pixels, keeping
boots with the appropriate figure. Source pixels already occluded in the PNG
cannot be reconstructed by separation.

Punch/foot landmarks stay on the runtime WebP's opaque pixels. Low punches that
were too high for shorter crouching opponents now bend below the fist so the
visible strike and collision agree. The active striker draws in front of the
defender, keeping the hand/foot visible at impact from either player slot.
Eight or four static poses remain sprite-state animation, not a full 3D rig or
motion-capture animation set.

## Remaining artwork issues

**Two costumes still need corrected PNGs**; both were unchanged in the new ZIP:

- **Sao Tome and Principe.png**: green/white/blue, resembling Sierra Leone;
  missing the clear Sao Tome yellow field, red triangle and two black stars.
- **Sierra Leone.png**: red/yellow/green with a black star, resembling Ghana;
  the requested flag is green/white/blue.

**Two unchanged costumes still need confirmation**:

- **Monaco.png**: white/black with red trim; Monaco's red/white design is unclear.
- **Slovenia.png**: blue/red/white ornament; the Slovenia mountain shield is unclear.

The other 32 supplied replacements were reviewed against the earlier issue
list and integrated. Fifteen previously reviewed flag swap cycles remain in
`artwork/country-fighters/assignments.json`; portraits, atlases and collision
metadata use the same source assignment. No source is accidentally reused.
Official badges do not repair a mismatched painted costume. Painted costumes
mirror with their fighter; the separate official badge remains readable.

## Duplicate audit

All 19,110 source pairs were compared: zero identical file pairs, zero identical
canonical visible-pixel sheets, and zero repeated source assignments. Similar
faces/base poses still occur in the user's artwork; these results do not prove
196 independently designed faces. The unchanged Sierra Leone costume still
resembles the Ghana costume. Perceptual nearest-pair results are review aids,
not proof of duplicate identities.

## Files and verification

`selected36-revision.json` records changed and unchanged sources and old hashes.
`intake.json` and `archives.json` preserve current provenance.
`country-audit.json` lists every country, active source, pose count and status.
`duplicate-audit.json` preserves the complete-source hashes and perceptual candidates.

The downloadable **NationClash.html is self-contained**: all 196 atlas payloads
are inside it, while only selected fighters decode. No companion asset folder is
required. The hosted source build still uses lazy country-art scripts.
See DOWNLOAD-VALIDATION.md for exact-package checks and hashes.
