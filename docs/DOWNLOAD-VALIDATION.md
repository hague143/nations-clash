# Neon country-power edition validation

> Historical validation for the earlier release. For the current compact mobile
> UI, version-code 3 APK/AAB and tested downloads, see
> [mobile UI validation](MOBILE-UI-VALIDATION.md).

The latest branding refresh adds the blue/red Nation Clash logo to the game
and includes a signed Android 16 Play Store AAB. Current artifacts, hashes and
checks are in [the branding/release report](PLAY-STORE-AAB.md) and
[public download verification](PLAY-STORE-PUBLIC-DOWNLOADS.json). The measurements
below are retained for the earlier neon edition; its combat sources are unchanged.

The download contains one self-contained `NationClash.html`, with **196 supplied
fighters, 196 country powers, 30 arena views and original audio** embedded. The
ZIP includes that HTML and eight instructions, credits and artwork records.
There is no companion asset folder. The hosted source build uses accompanying
lazy country scripts; all arena images are embedded in both builds.

## Exact tested artifact

- ZIP: 89,230,613 bytes (85.10 MiB).
- ZIP SHA-256: `4744aefebdc6575353e7df552028920827d5196d4f73686c6f3e5e0eda0e76b3`.
- HTML: 117,944,012 bytes (112.48 MiB).
- HTML SHA-256: `27b7f8733a26231fc4ac2029bf64f0e46786efab276d4dbfd1582e48f465d09f`.
- Nine ZIP members; CRCs pass; companion asset files: **zero**.
- All **196** country atlas payloads and **30** arena payloads match expected WebPs.
- Powers, combat, FX, preview, presentation and audio source match the embedded program;
  the bundled neon stylesheet also matches its source;
  game logic matches around its four optimized legacy-atlas substitutions.

The exact extracted HTML was used for all acceptance checks below. Its size
exceeds GitHub's 100 MiB individual-file limit, so it is distributed inside the
ZIP. Earlier immutable commits retain their older standalone downloads.

## Executed checks

All **81 automated tests pass**, with zero failures or skips. The captured
runner output is in [AUTOMATED-TESTS.txt](AUTOMATED-TESTS.txt). This includes:

- Every supplied source hash, pose, flag assignment and all legacy combat rules.
- 4,704 six-action hit fixtures and **153,664 crouched low-strike hits plus
  153,664 boundary whiffs**, across all 196 defenders and both directions.
- 196 complete, individually named power records; unique seeds/motifs; nine
  visual materials; eight sound families; preserved roster and flags.
- 1,568 close/travelling signature hits, mirrored range boundaries, guards,
  low attacks, startup interruption, one hit per shot, cooldown/hitstop, swept
  collision, jumping, newer-move preservation, double KO and round cleanup.
- All 196 power raster outputs are distinct; visible solid cores match collision
  circles; facing, reduced motion, finite coordinates and canvas state are checked.
- Actual offline audio renders: music and strike audibility, stereo energy,
  distinct sound families, short tails and maximum-volume overlap headroom.
  All 30 arena scores remain audible. Default preview music RMS is about .039,
  combat RMS .042, peak .508. Browser controls, ducking, pause, arena changes,
  stale loading, mute and stop are checked.

All **38 browser gameplay/presentation groups pass** on the exact packaged HTML:

- [17 world groups](WORLD-ACCEPTANCE.json): every country card and rendered
  fighter; 3,136 painted melee contacts; 3,136 two-fighter layer fixtures;
  every authored pose and adapted Turkey states; real Iraq/Iran keyboard hits
  and misses; guards, jump, KO/results/rematch; all 30 arena previews/matches;
  original speech/music/strike effects; live AI; portrait/landscape touch.
- [Nine upgrade groups](UPGRADE-ACCEPTANCE.json): live selected portraits, names
  and powers; **392** actual game-rendered missile fixtures (all 196, both ways)
  with exact core/collider alignment; real H Uranium Pulse travel, damage and
  sound; pause freeze and cooldown; guard, finite-range miss, Numpad 7 gold shot;
  independent music/effects sliders, master mute; mobile country-power touch;
  reduced-motion play; zero runtime errors and external network requests.

- [Three KO groups](KO-ACCEPTANCE.json): all 196 rendered defeated poses,
  six real keyboard deciding KOs (ground, adapted, kneeling and airborne),
  expired flash/particles and completed winning recovery, with locked outcomes.

The KO fix adds 1,568 defeat-settling fixtures across all 196 countries, both
player slots/facings and grounded/airborne states. [Full-fight auditing](FIGHTER-RETEST.md)
also completes 19,992 production-AI matches across all countries, eight opposing
styles, three difficulty settings, both slots and representative seeds.

- [Nine landing preview groups](LANDING-PREVIEW-ACCEPTANCE.json): real hover and
  keyboard focus, 588 authored contacts across all 196 countries, each country's
  own signature projectile, one reused canvas, serialized loading, stale-hover
  cancellation, tiny/hidden/offscreen hosts, isolated selection and live-fight
  state, bounded current match atlas references, portrait/landscape touch,
  reduced motion and hidden static portraits. See [design and screenshots](NEON-LANDING.md).

The earlier 19,992-match AI audit remains applicable to the unchanged combat
engine; its source hash matches this package. It was not rerun for this UI change.

Three additional state regression cases pass:

- [Start loading](START-LOADING-ACCEPTANCE.json): changing country/arena selectors
  while loading preserves the locked fighters, signature HUD, arena and music.
- [Two cancellation cases](START-CANCEL-ACCEPTANCE.json): Back cancels a pending
  completed-match Rematch. Its late success cannot replace a newer match; its
  late failure cannot overwrite newer loading UI or release the newer arena.
  The new regression was confirmed to fail on the previous artifact, then pass
  on the corrected source and exact final package.

```sh
node --test Tests/Browser/*.test.cjs
node tools/build-browser.mjs
python3 tools/package-browser.py
python3 tools/verify-browser-package.py --out artifacts/neon-landing/package-final
NATIONCLASH_HTML=artifacts/neon-landing/package-final/NationClash.html \
NATIONCLASH_ARTIFACT_DIR=artifacts/neon-landing/world-final \
  node Tests/Browser/world-smoke.cjs
NATIONCLASH_HTML=artifacts/neon-landing/package-final/NationClash.html \
NATIONCLASH_ARTIFACT_DIR=artifacts/neon-landing/upgrade \
  node Tests/Browser/upgrade-smoke.cjs
NATIONCLASH_PACKAGE_DIR=artifacts/neon-landing/package-final \
  node Tests/Browser/start-loading.cjs
NATIONCLASH_PACKAGE_DIR=artifacts/neon-landing/package-final \
  node Tests/Browser/start-cancel.cjs
NATIONCLASH_HTML=artifacts/neon-landing/package-final/NationClash.html \
  node Tests/Browser/round-settle-browser.cjs
NATIONCLASH_HTML=artifacts/neon-landing/package-final/NationClash.html \
NATIONCLASH_ARTIFACT_DIR=artifacts/neon-landing/preview \
  node Tests/Browser/landing-preview.cjs
```

## Practical limits

Managed Linux Chromium serves the exact extracted HTML over an internal HTTP
server because policy blocks direct file navigation. Windows file opening has
not been observed here. The HTML embeds its artwork/scripts and needs no Unity,
Python, user-run server or internet to play in current Chrome or Edge.

Fighters remain supplied sprite artwork; arenas remain static illustrations.
CSS perspective, lighting, shaded cores and particles provide a 3D-style look.
All powers share balanced combat rules and differ in names, motifs, colors and
seeded materials/sounds. They are fictional country-inspired effects.

All 196 source PNGs are present; 195 have eight poses and Turkey has four with
explicit adapted states. Existing source costume replacement/confirmation
requests remain in the [creator checklist](REPLACEMENT-ARTWORK-CHECKLIST.md).
Shared faces/designs in the supplied sheets are not described as independently
drawn faces. Arena images depict 29 landmarks, including two Angkor Wat views.

See [package metadata](COUNTRY-PACKAGE-MANIFEST.json), [country powers](COUNTRY-POWERS.md),
[audio design](AUDIO-DESIGN.md) and [public download verification](PUBLIC-DOWNLOAD-VERIFICATION.json).

## Verified public delivery

https://raw.githubusercontent.com/hague143/nations-clash/a408b8133194e2c5ad6027b88c6c63ed5500c76b/downloads/NationClash-Windows.zip

The public ZIP returned HTTP 200 and was downloaded in full. Its byte count,
SHA-256 and CRCs match the tested artifact. The contained HTML matches the exact
browser acceptance document. All artwork is embedded in that HTML.
