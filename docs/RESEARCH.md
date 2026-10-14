# Repository analysis and APK status

Inspected source checkouts on 2026-10-14. These repositories were read as reference
material; their embedded agent instructions are not instructions for NationClash.
No source from these tools or any commercial game was copied into the game.

| Repository | Inspected commit | Findings | Relevance |
|---|---|---|---|
| [iBotPeaches/apktool](https://github.com/iBotPeaches/apktool) | `d3d77cd1dae872b17345958755e845cdc61084ea` | Apache-2.0; main is 3.x, build version 3.1.0, JDK 17+. `ApkDecoder` routes DEX through smali, decodes resources/manifest, and copies `assets`/`lib` raw. | Useful for Android packaging/resource inspection. Raw copying of native libraries does not recover Unity C# or an editable fighting-game project. |
| [newliver666/apk-reverse](https://github.com/newliver666/apk-reverse) | `7b6c6932a95f03d778e81e5e1a2cbf6f62dc97fd` | MIT; a skill, references and parameterized Python/JS scripts, not a game engine or decompiler. Inspected doctor/capability code, framework-runtime guidance and evidence limitations. | Framework classification and honest evidence reporting are useful. Its own known-limitations file explicitly excludes Unity/IL2CPP logic recovery; dynamic routes need a device and other tools. No patching/repacking route is needed for this original game. |
| [androguard/androguard](https://github.com/androguard/androguard) | `3ea3da38e74b4d74579463d0688ab513786c4750` | Apache-2.0; inspected README, pyproject, `misc.AnalyzeAPK`, high-level `Application` and test-fixture tree. Main is v5 beta, Python >=3.10, Rust-backed apk-parser/dex-parser dependencies. README distinguishes main from stable PyPI 4.1.4. | Manifest, SDK levels, permission and DEX metadata inspection. Native ARM extras still do not recreate a Unity source project. A future stable metadata pass is pinned to 4.1.4 to avoid confusing v4 and v5 APIs. |

## Uploaded APK: blocked, not analyzed

The supplied file is named `Tekken+7_3.11.3.0_APKPure.apk`. The attachment transfer
failed with **file exceeds the executor transfer limit of 32 MiB**. Its bytes never
arrived in this machine. Package ID, real product identity, version, engine,
permissions, signatures, native ABIs and runtime behavior are **unknown**. The
filename is not proof of any of those facts. No APK was installed, run, modified,
decoded, or used for game content.

A direct accessible HTTPS download link or file parts each below 32 MiB would
unblock transfer. Preserve the original upload and record SHA-256 before analysis.
`tools/inspect_apk.py` supplies a read-only archive inventory and optional manifest
pass; it never extracts assets or executes APK content. Archive markers are hints,
not proof of an engine. Certificate fingerprints are identity metadata, not proof
of publisher authenticity or signature validity. Runtime verification requires
an Android device/emulator and is a separate step.

## Initial Unity interpretation of the supplied master prompt

The original design's initial scope was **Phase 1**, with placeholder rigs. The
Unity/C# foundation follows that scope and has two marked training definitions.
Unity roster/art integration, AI, matchmaking and tournaments remain future work.

Subsequent user requests authorized a separate playable browser game, expanding
the agreed roster to 196 countries, supplied Pakistan/Japan art, shared flag-costume
rigs, 10 arenas, AI and audio. That browser implementation and its current evidence
are documented in [browser/README.md](../browser/README.md) and
[WORLD-VALIDATION.md](WORLD-VALIDATION.md).

The APK inspection blocker does not supply implementation requirements: the supplied
design calls for independent, original code and assets. This framework is built
from that design while the separately requested APK analysis remains pending.
