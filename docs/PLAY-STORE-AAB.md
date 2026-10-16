# NationClash Play Store bundle

`downloads/NationClash-PlayStore.aab` is a signed Android App Bundle containing
the neon 2D game, the refreshed blue/red Nation Clash branding, all 196 country
fighters, 30 arena views and offline audio. The same logo appears in the game
header, landing page and Android adaptive launcher icon.

| Field | Release |
|---|---|
| Application ID | `com.nationclash.game` |
| Version | `0.2.0`, version code `2` |
| Minimum Android | Android 8.0 / API 26, with an updated system WebView |
| Target / compile SDK | Android 16 / API 36 |
| Debuggable / testOnly | Both `false` |
| File size | 89,446,219 bytes (89.45 MB) |
| SHA256 | `573a45f24ffebcfc2bc576a7e320f5299c6e98ca105b74f69a80bab95aaba518` |
| Upload certificate SHA256 | `cba57bfc2a02717a3519340c08d866b34a8cf024e96e3a5264c647c1fdf81dcf` |

## Upload and test

1. Open your app in **Google Play Console**. For a new app, create the app record
   first. The bundle's application ID is fixed as `com.nationclash.game`.
2. Open **Testing > Internal testing**, create a release and follow the Console's
   **Play App Signing** setup. Google can generate and protect the app signing
   key; this AAB is signed with a separate upload key.
3. Upload `NationClash-PlayStore.aab`, add release notes, complete the required
   Console declarations and save/review the internal test release.
4. Add your tester account and use the Console's opt-in link to install through
   Google Play. An `.aab` is not directly installed by tapping it like an APK.
5. For the store listing, use
   [the 512x512 PNG icon](../browser/assets/branding/play-store-icon.png).
   Screenshots, listing text, ratings, policy declarations and production access
   are completed separately in your Console account.

This work creates and validates the upload artifact. It does not submit an app
to Google Play or establish approval/production access. If this application ID
already has an accepted bundle under a different upload certificate, use the
existing upload key or complete Google's upload-key reset process first.

## Validation performed

- Official Google **Build Tools 36.0.0**, **Platform 36 revision 2** and
  **bundletool 1.18.3**, with downloaded/cached archive checksums verified.
- Native Java compilation and release DEX generation; protobuf Android manifest
  and resources packaged into a genuine base-module Android App Bundle.
- Strict JAR signature verification, `bundletool validate`, and a manifest dump
  confirming package, version, SDK levels and disabled debug/test flags.
- All **430 payload files** checked against the same manifest as the passing
  browser acceptance run. Every fighter, portrait, arena and local logo hash
  matched in both the AAB and its generated universal APK.
- Conversion to a universal APK passed; its v2/v3 signing and 16 KB ZIP alignment
  check passed. The bundle and generated APK contain **zero native `.so`
  libraries**. There is no bundled native ELF alignment requirement to repair;
  Android supplies its own WebView implementation.
- Updated game acceptance: **8 groups passed**, covering every atlas/portrait
  and arena, real punch/kick/signature damage, music/announcements and touch
  controls. **4 branding viewport checks passed** at desktop, portrait and
  landscape sizes, including exact embedded/local logo identity and no overflow.
- Existing landing-preview acceptance: **9 groups passed**, including all 196
  fighters' 588 authored punch/kick/signature preview fixtures, keyboard and
  touch behavior, reduced motion and isolation from live combat.
- The updated Windows ZIP passed CRC and every embedded country/arena byte
  check. Its exact extracted standalone HTML loaded both logos without companion
  files and produced real punch damage, with zero errors or external requests.

The 16 KB checks above concern the artifact and native-library inventory; they
are not a gameplay run on a physical 16 KB-page Android device. Physical-phone
QA, release review and Play Console acceptance remain separate. Earlier
software-emulator WebView failures are documented in
[the previous test APK report](ANDROID-APK-VALIDATION.md); no new device gameplay
pass is claimed for this AAB.

Machine-readable reports:

- [Bundle build/signing checks](PLAY-STORE-AAB-BUILD.json)
- [Exact bundled asset inventory](PLAY-STORE-ASSET-MANIFEST.json)
- [Current browser acceptance](PLAY-STORE-ASSET-SMOKE.json)
- [Branding viewport checks](BRANDING-VALIDATION.json)
- [Landing preview acceptance](BRANDED-LANDING-VALIDATION.json)
- [Standalone ZIP payload checks](BRANDED-WINDOWS-PACKAGE.json)
- [Extracted standalone runtime check](BRANDED-WINDOWS-RUNTIME.json)

## Rebuild and retain the upload key

From the repository root, using Python 3.11+, Pillow 12.3.0 and Java 17+ with
compiler, jar, keytool and jarsigner modules:

```sh
python3 tools/build-brand-assets.py
python3 tools/setup-android-bundletool.py
python3 tools/build-android-aab.py
```

The builder creates an ignored release manifest targeting API 36 and keeps the
API 35 test manifest separate. Release WebView debugging follows the disabled
application debug flag. Android 13+ uses the system Back callback; older Android
versions use the existing Back handler.

The **private upload key and password** are retained locally in ignored
`artifacts/android-signing/nationclash-upload.p12` and `upload-password.txt`, with
private directory/file permissions. They are not included in the AAB, public
downloads, source commits or documentation. Back up both securely outside a
disposable environment before discarding it. Never upload them to this public
repository. Rebuilds reuse this key; future updates need the registered upload
key or an authorized Play Console upload-key reset. The earlier APK test key is
separate and is not used for this store bundle.
