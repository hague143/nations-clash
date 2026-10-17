# Compact mobile fight screen — version code 3

The fight now fills the available phone viewport. Its header has a 28px logo
and a pause icon. All twelve touch controls remain visible: three compact rows
in portrait and two in landscape, with minimum 44px touch targets. The keyboard
legend, keyboard subtitles, all sound controls, reach hint and instructions
beneath the buttons are removed. The selection-screen controls guide remains.

The canvas follows the measured arena dimensions with a capped device-pixel
ratio. A uniform camera fits both fighters, including jumps, without stretching
the supplied artwork. Backgrounds cover the available area uniformly. Combat
coordinates, authored attack tips, hitboxes and power mechanics are unchanged.
Music, announcements and strike sounds remain enabled. Android hardware volume
buttons explicitly control the media stream.

## Tested behavior

- **11 mobile browser acceptance groups pass** on the exact Android assets:
  390×844, 360×740, 412×915, 844×390, 740×360 and 320×568. No fight scrolling,
  all twelve controls visible, arena uses over 60% of normal portrait screens.
- **24 real touch attack checks** damage the opponent through the production
  game loop: Punch, Kick, Special and country Power at every viewport.
- Actual supplied-sheet and background draw transforms preserve natural aspect
  ratios; checks inspect real canvas draws, not only camera diagnostics.
- Two-finger movement/guard, release/cancel, touch jump, pause/resume, Back,
  audio lifecycle and rotation preserve the same match and clear held inputs.
- **101 Node tests pass**, zero failures/skips: 81 active 2D checks and 20 for
  the separate paused 3D experiment. This includes every country's melee and
  signature contact, range, guard and authored sprite geometry.
- **8 Android-asset browser groups**, **4 branding viewport groups** and
  **9 standalone landing-preview groups** pass. All 196 country sheets,
  196 portraits and 30 arenas decode locally; no external requests or runtime
  errors occur in those acceptance runs.

Evidence: [mobile acceptance](MOBILE-FIGHT-ACCEPTANCE.json),
[asset acceptance](ANDROID-ASSET-SMOKE.json),
[branding](BRANDING-VALIDATION.json),
[standalone landing](BRANDED-LANDING-VALIDATION.json),
[standalone package](BRANDED-WINDOWS-PACKAGE.json).
The exact standalone HTML also passes [17 world gameplay groups](WORLD-ACCEPTANCE.json),
including 3,136 rendered melee contacts, all 30 selected arenas, actual keyboard
hits/whiffs, KO/results/rematch and live AI.
[Nine country-power/audio groups](UPGRADE-ACCEPTANCE.json) also pass on that
same HTML: 392 rendered country missiles, exact signature sound counts through
pause/resume, actual guarded/ranged hits and misses, both mobile orientations,
audio cleanup/restart and reduced-motion play.
See the [portrait](previews/mobile-compact/mobile-fight-390x844.png) and
[landscape](previews/mobile-compact/mobile-fight-844x390.png) screenshots.

## Exact Android artifacts

| Property | Test APK | Play Store AAB |
|---|---|---|
| Version | 0.2.1-test, code 3 | 0.2.1, code 3 |
| Minimum / target API | 26 / 35 | 26 / 36 |
| Bytes | 89,450,598 | 89,447,588 |
| SHA256 | `a111c03ac111b05f31bac4982060e770d6bc6687785d9888cbebaef3c46474d2` | `9c88bbac4346954eb614c2b5b822202ff761616ec14e836e0ac0a595091cf7e8` |
| Signing | Existing test certificate; APK v2/v3 | Existing upload certificate; strict JAR verification |

Both packages contain the same **430 verified payload files**, including all
196 fighters, 30 arenas, audio and the new logo. Asset inventory SHA256:
`57ec59417787f1b4ed3c59d5889fea3aea70d2315777de3ef62596834888f254`.

The test certificate is unchanged from the earlier test APK, so this APK can
update that installation. The AAB uses its separate retained upload certificate;
Play App Signing and Play Console submission remain separate. No app was
submitted to Google Play as part of this change.

Build evidence: [APK](ANDROID-APK-BUILD.json),
[AAB](PLAY-STORE-AAB-BUILD.json), [inventory](ANDROID-ASSET-MANIFEST.json).
[Public download verification](MOBILE-PUBLIC-DOWNLOADS.json) records full downloads,
byte counts, hashes, ZIP CRCs and Android signatures from the immutable artifact commit.

## Runtime scope

These gameplay checks run actual game code and touch input in Linux Chromium.
**This release has not been played on a physical Android phone here.** The
previous no-KVM Android emulator suffered a native WebView failure reproduced
by an independent minimal app; it was not retried for this UI-only revision.
Earlier native installation results apply to the older APK, not this build.
See [historical device evidence](ANDROID-DEVICE-VALIDATION.json).
Phone performance, hardware volume keys and vendor-specific WebView behavior
still need a physical-device test. Signatures, SDK metadata, bundle validation,
ZIP integrity and all packaged asset hashes pass independently.

## Reproduce

```sh
node tools/build-browser.mjs
python3 tools/package-browser.py
python3 tools/verify-browser-package.py
python3 tools/build-android-assets.py
node tools/mobile-fight-smoke.cjs
node tools/android-assets-smoke.cjs
node tools/branding-smoke.cjs
node --test Tests/Browser/*.test.cjs
python3 tools/build-android-apk.py --skip-assets
python3 tools/build-android-aab.py --skip-assets
```

Browser packaging reuses verified, current legacy image caches and replaces new
cache images atomically, so concurrent readers cannot copy a partly written
WebP. Original artwork and combat modules are retained unchanged.
