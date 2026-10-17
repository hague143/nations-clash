# Offline Android test app

This app packages the active **neon 2D NationClash game**: all 196 supplied
country fighters, 30 arenas, touch attacks, country signatures, music and spoken
Fight/KO cues. Unity and a hosting account are not needed. Game artwork and code
are bundled in the APK; it works without an internet connection.

## Install and play

The APK below includes the blue/red NationClash logo and the compact mobile
fight screen. For Google Play upload, use the separate
[signed Play Store AAB and instructions](../docs/PLAY-STORE-AAB.md). Install an
AAB through a Play testing track; use the APK for a direct phone test.

1. Download [NationClash-Android-test.apk](https://raw.githubusercontent.com/hague143/nations-clash/73d18a25f4c3056e3cf05658f49b31cb4ee4dbda/downloads/NationClash-Android-test.apk)
   on an Android phone running **Android 8.0 or newer**.
2. Open the downloaded APK. If Android asks, allow **Install unknown apps** for
   the browser or file manager you used, then install **NationClash**.
3. Open NationClash, choose your country, opponent and arena, then tap
   **Enter the arena**. Portrait and landscape layouts both fit the screen.
4. Use the on-screen movement, punch, kick, guard and **country power** buttons.
   The arena fills the remaining screen above the compact controls: three rows
   in portrait or two in landscape. Tap the pause icon beside the small logo to
   resume or return to fighter selection.

Music and fight sounds start when you enter a match. Use the phone's **physical
volume buttons** to adjust media audio. The fight screen has no sound sliders,
keyboard labels or long instruction panels; health, round and power cooldown
information remain visible.

Android Back pauses a running fight; Back again returns to country selection.
Switching apps pauses combat and music. Rotation keeps the current match.
Keep Android System WebView or Chrome enabled and updated on the device;
old factory WebView versions may not support the game's JavaScript.

This is a **signed test APK**, version `0.2.1-test`, version code `3`, package
`com.nationclash.game`, rather than a Google Play production release. WebView
debugging is enabled for device testing. The wrapper requests only the normal
Internet permission; it serves game requests from packaged files and blocks
remote page/asset requests. It has no login, tracking SDK, ads or purchases.

The APK requires Android 8.0 / API 26 and targets Android 15 / API 35. It reuses
the earlier test signing certificate, so it can update the previous test APK.
The Play Store AAB is version `0.2.1`, code `3`, targets Android 16 / API 36 and
uses the existing separate upload certificate with debugging disabled.

## Rebuild on Linux x86_64

Use Python 3.11+, Pillow 12.3.0 and Java 17+ containing the compiler, jar and
keytool modules. The cloud environment currently has Python 3.12, Pillow 12.3.0
and Java 21. The setup script verifies pinned hashes before using downloaded
Build Tools 35.0.0 and the API 35 SDK JAR. It installs nothing globally.

From the repository root:

```sh
python3 tools/setup-android-toolchain.py
python3 tools/build-android-apk.py
```

The build creates `downloads/NationClash-Android-test.apk`. It checks APK v2/v3
signatures, ZIP alignment, Android package metadata, ZIP CRCs and every bundled
game payload against the asset inventory. `--skip-assets` reuses generated
artwork only if its source and payload hashes still match.

Intermediate SDK/build files and the **private test signing key** stay in
ignored `artifacts/`. Retain `artifacts/android-toolchain/nationclash-test.keystore`
privately to sign compatible updates. A new key requires uninstalling an older
installation of the same package. Do not commit or upload that key. Production
signing and a Play Console release require a separate release process.

The local WebView origin is `https://appassets.androidplatform.net/assets/`.
Android intercepts it and reads `AssetManager`; no DNS request, certificate
server or external host is needed to play. Large country and arena images stay
in separate local WebP files instead of a giant base64 HTML document. Logical
country IDs keep the audited `sourceCountryId` assignments.

For the generated asset bundle's browser acceptance checks, use the existing
Playwright/Chromium environment:

```sh
node tools/android-assets-smoke.cjs
```

See [Android validation](../docs/ANDROID-APK-VALIDATION.md) for this APK's measured
results. Physical-phone performance and vendor-specific behavior still need
your mobile test.

With an attached Android device and standard Android platform-tools, a developer
can run:

```sh
adb install -r downloads/NationClash-Android-test.apk
adb shell am start -n com.nationclash.game/.MainActivity
adb logcat -s NationClash AndroidRuntime
```
