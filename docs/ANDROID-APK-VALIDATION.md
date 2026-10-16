# Neon 2D Android test APK

Build checks executed on 2026-10-16 in `/workspace/nations-clash`.
This APK packages the active neon 2D game, not the paused 3D prototype or Unity
foundation. No Unity Editor, hosting account or login backend is required.

| Property | Value |
|---|---|
| Download | `downloads/NationClash-Android-test.apk` |
| Package / version | `com.nationclash.game` / `0.1.0-test` (code 1) |
| Size | 88,348,437 bytes (88.35 MB; 84.26 MiB) |
| APK SHA256 | `d9982a792bf33292b56a9c5607995966d159366c2f70775258b97d161922c299` |
| Android minimum / target | API 26 (Android 8.0) / API 35 (Android 15) |
| Architectures | Universal WebView APK; no bundled native libraries |
| Signing | Valid APK v2 and v3; local RSA 2048 test certificate |
| Certificate SHA256 | `c146eec76ef3fdc40ad147ad6ddd8533b37ba93b8af24b797aa5ea8f550f9475` |
| Game assets | 429 checked payload files plus their inventory; 196 country atlases, 196 portraits, 30 arenas, four legacy atlases |

## Build and browser evidence

- `python3 tools/setup-android-toolchain.py` passed. Cached downloads matched
  pinned SHA256 values; all 168 extracted SDK files matched the verified archive.
- `python3 tools/build-android-apk.py --skip-assets` compiled native Java,
  generated DEX, packaged local assets, aligned and signed the APK. The asset
  generator had already run separately. Every source and generated asset hash
  was verified before packaging.
- `apksigner verify --verbose --print-certs` and `zipalign -c 4` passed. AAPT
  confirmed the expected launcher, package, SDK levels and sole Internet
  permission. ZIP CRCs and all 429 packaged payload hashes passed.
- `node tools/android-assets-smoke.cjs`: **8 acceptance groups passed**, zero
  browser errors or external requests. All 196 country atlases, 196 portraits
  and 30 arenas decoded; full-size image caches remained bounded. Real J/K/H
  inputs caused 65/125/120 damage with actual collision timing. Music, punch/kick
  impacts and all four embedded announcements worked. Portrait 390px and
  landscape 844px touch controls worked with at least 44px touch targets.
- `node --test Tests/Browser/*.test.cjs`: **101 passed, zero failed or skipped**.
  Of these, 81 cover the active 2D game; 20 belong to the separate paused 3D
  experiment and are not part of this APK.

The browser acceptance report and APK contain the identical asset inventory
SHA256 `6319e10cbba061af4f3687222554afb5e4c4d5de8932d1087aecebfb1ef743ba`.
Country files preserve the audited logical-country `sourceCountryId` mappings;
no country artwork or original combat module was reassigned for Android.

Machine-readable evidence:

- [Build and signing report](ANDROID-APK-BUILD.json)
- [Exact asset inventory](ANDROID-ASSET-MANIFEST.json)
- [Browser acceptance report](ANDROID-ASSET-SMOKE.json)

## Android runtime validation

Android 15 / API 35 x86_64 emulator, WebView 124.0.6367.219, software CPU
emulation without KVM. The APK installed successfully with airplane mode enabled
and Wi-Fi disabled. Rendered gameplay and lifecycle checks are in progress;
installation alone is not a gameplay pass.

No physical Android handset was available here. Frame rate, heat, battery use,
vendor-specific behavior and low-memory performance require a phone test.
This test APK has WebView debugging enabled; production signing, Play Console
submission and release hardening remain separate work.
