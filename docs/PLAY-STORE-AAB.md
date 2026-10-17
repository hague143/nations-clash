# NationClash Play Store bundle

`downloads/NationClash-PlayStore.aab` is a signed Android App Bundle containing
the neon 2D game, the refreshed blue/red Nation Clash branding, all 196 country
fighters, 30 arena views and offline audio. The same logo appears in the game
header, landing page and Android adaptive launcher icon. Version `0.2.1` keeps
the fight screen compact: a small logo and pause icon, the arena with essential
health/round/power information, and twelve touch buttons. Portrait uses three
button rows; landscape uses two. Music and fight sounds use the phone's media
volume buttons, with no in-game sliders or keyboard instruction panels.

[Download the signed AAB](https://raw.githubusercontent.com/hague143/nations-clash/73d18a25f4c3056e3cf05658f49b31cb4ee4dbda/downloads/NationClash-PlayStore.aab)
and the [512x512 store icon](https://raw.githubusercontent.com/hague143/nations-clash/73d18a25f4c3056e3cf05658f49b31cb4ee4dbda/downloads/NationClash-PlayStore-icon.png).
See [public download evidence](PLAY-STORE-PUBLIC-DOWNLOADS.json) for verified
artifact URLs, exact sizes and hashes.

| Field | Release |
|---|---|
| Application ID | `com.nationclash.game` |
| Version | `0.2.1`, version code `3` |
| Minimum Android | Android 8.0 / API 26, with an updated system WebView |
| Target / compile SDK | Android 16 / API 36 |
| Debuggable / testOnly | Both `false` |
| File size / SHA256 | See the [current signed build report](PLAY-STORE-AAB-BUILD.json) |
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

This release reuses the previous upload certificate and increases the version
code from `2` to `3`. The direct-install test APK is version `0.2.1-test`, code
`3`, and targets API 35 with the earlier test certificate; the Play bundle
targets API 36 with release debugging disabled. The two certificates remain
separate. Use the [test APK instructions](../android/README.md) for sideloading.

## Release validation

The build process uses official Google **Build Tools 36.0.0**, **Platform 36
revision 2** and **bundletool 1.18.3**, with archive checksums verified. It compiles
the native wrapper, generates release DEX, packages the protobuf manifest and
resources, and validates the signed AAB and a generated universal APK.

Build checks cover signing, package/version/SDK metadata, disabled debug/test
flags, ZIP integrity, alignment and every bundled payload hash. The asset
inventory includes all 196 fighter sheets, 196 portraits, 30 arenas and the
shared logo. Browser acceptance exercises real attacks, audio, mobile controls,
logo rendering and the compact fight layout; separate landing checks cover all
196 fighters' punch/kick/country-power previews.

The bundle contains no native `.so` libraries; Android supplies WebView. APK
alignment checks concern the artifact, and do not establish gameplay on a
physical 16 KB-page device. See [Android validation](ANDROID-APK-VALIDATION.md)
for runtime/device status. Use a Play testing track to test performance, touch,
audio, rotation and background pause on the intended phones before production.

Machine-readable reports:

- [Bundle build/signing checks](PLAY-STORE-AAB-BUILD.json)
- [Exact bundled asset inventory](PLAY-STORE-ASSET-MANIFEST.json)
- [Current browser acceptance](PLAY-STORE-ASSET-SMOKE.json)
- [Compact mobile UI and runtime scope](MOBILE-UI-VALIDATION.md)
- [Six-viewport touch acceptance](MOBILE-FIGHT-ACCEPTANCE.json)
- [Branding viewport checks](BRANDING-VALIDATION.json)
- [Landing preview acceptance](BRANDED-LANDING-VALIDATION.json)
- [Standalone ZIP payload checks](BRANDED-WINDOWS-PACKAGE.json)
- [Extracted standalone runtime check](BRANDED-WINDOWS-RUNTIME.json)

To reproduce the current mobile/browser acceptance checks after building assets:

```sh
node tools/android-assets-smoke.cjs
node tools/mobile-fight-smoke.cjs
node tools/branding-smoke.cjs
```

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
