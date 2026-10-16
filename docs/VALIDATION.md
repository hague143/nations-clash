# Unity foundation and analysis-tool validation evidence

Executed in `/workspace/nations-clash` on 2026-10-14.

This report covers the original Unity/C# foundation and read-only analysis tools.
The separate 196-fighter browser game's checks are in
[WORLD-VALIDATION.md](WORLD-VALIDATION.md).

| Check | Result | What it demonstrates |
|---|---|---|
| `bash tools/bootstrap.sh` | Passed; repeat run passed | SDK detection/bootstrap and actual source-based checks are repeatable in this machine. SDK archive SHA-512 matched Microsoft's official release metadata. |
| Combat functional runner | **25 passed, 0 failed, 25 executed** | Buffer expiry, all eight profiles, schema validation, active frames, one-hit-per-move, whiffs, zero-chip/directional/low guard, guard break, light-light-heavy chain, recovery buffering, weighted juggle, slam, throw/tech/clash, jumping, meter/ultimate, trades/double KO, best-of-three/reset/perfect, percentage timeout/draw, frozen intro/completed matches, dash/bounds, seeded fight invariants. Uses production combat sources, not mock combat code. |
| `.NET Standard 2.1` core build | Passed; **0 warnings, 0 errors** | Pure core compiles against the API profile used by Unity 2022.3. This does not compile or exercise UnityEngine/Editor adapters. |
| Python APK-inventory runner | **4 passed, 0 failed, 4 executed** | Hash correctness, read-only behavior, archive metadata, non-APK rejection, path-traversal reporting/refusal and oversized-manifest rejection. Synthetic fixtures are labeled as such. |
| Stable Androguard metadata smoke | Passed on upstream `TestActivity.apk` fixture | Correctly reported package `tests.androguard`, version `1.0`, minimum SDK `9`, target SDK `16`, DEX member and v1 signature-block presence. Fixture SHA-256: `3bb32dd50129690bce850124ea120aa334e708eaa7987cf2329fd1ea0467a0eb`. No APK was executed and cryptographic APK signature validity was not checked. |
| `bash tools/setup-apk-analysis.sh` and `pip check` | Passed | Installed/reused frozen Androguard 4.1.4 analysis dependencies are consistent. |
| Unity import, Editor preparation, rendered combat, touch input | **Unrun: Unity Editor absent** | Generated scene/controllers/clips require the provided Editor command. They are source implementations awaiting Unity validation, not artifacts produced here. |
| Unity Android export/device test | **Unrun for Unity** | The Unity foundation has not been exported. The separate neon 2D WebView APK has its own [Android validation](ANDROID-APK-VALIDATION.md). |
| Uploaded Tekken-named APK | **Blocked: 32 MiB attachment transfer limit** | No package, engine, asset or permission finding is claimed for this upload. A direct download link or smaller parts is needed. |
| Remote CI and new-task restoration | **Unrun** | CI is configured; publishing/snapshot restoration has not been independently verified. |

The first .NET invocation needed `~/.dotnet` for runtime named locks. The cloud
sandbox prevented its creation. Approved commands created/initialized that directory;
subsequent runs of the same checks succeeded without escalation. No TLS, package
verification, SDK checksum or test assertion was disabled to resolve setup.

For the Unity foundation, national roster/art integration, country stages, AI,
online netcode, matchmaking, tournaments and production balance are unverified
later phases. The browser edition has its own roster, art, arenas and AI evidence;
these checks do not establish that those features have been ported into Unity.
