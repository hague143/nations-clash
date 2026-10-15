# NationClash

**Play without Unity:** the new [standalone browser edition](browser/index.html)
runs in Chrome or Edge. Download `NationClash.html`, right-click it and choose
**Open with > Google Chrome / Microsoft Edge**, pick a country, then **Enter the
arena**. The default opponent is a computer. No server, account, installation or
external downloads are needed. See [browser controls and checks](browser/README.md).

The browser edition has **196 country representatives**, flag costumes, **10
selectable landmark arenas**, computer/local play, music and spoken Fight/KO cues.
The roster is 193 UN members plus Palestine, Vatican City and Taiwan. Shared
textured fighter rigs have individual appearance profiles; Pakistan and Japan use
the supplied artwork. Attacks share visible contact geometry with collision checks.
The complete offline HTML is about 12 MB. See [browser validation](docs/WORLD-VALIDATION.md).
The Unity/C# foundation below remains a separate project.

Original Unity/C# 2.5D fighting-game foundation, implementing **Phase 1** of the
supplied design. Two explicitly marked country training fighters use placeholder
capsule rigs. No Tekken code, models, animation, audio or character data is included.

**Status:** the pure combat core compiles and passes headless functional tests.
Unity Editor is unavailable on this cloud machine, so Unity script compilation,
visual playtesting and Android export are pending. This is a foundation, not a
finished Unity game or a verified APK build. The playable 196-country browser
edition is available above.

## Play in Unity

1. In Unity Hub, add this checkout as a project. Use **Unity 2022.3.62f1 LTS** and
   the built-in render pipeline. The project has no Asset Store dependencies.
2. Allow Unity to import scripts. The Editor generates a training scene on first
   import; you can also choose **NationClash > Prepare prototype**. This creates
   eight Animator Controllers, sixteen placeholder clips for each, a retained
   Standard material and the training scene under ignored generated folders.
3. Open `Assets/Scenes/Generated/TrainingArena.unity`, press **Play**, select two
   fighters, then **Enter the arena**. Both players are human; AI is Phase 3.
4. For Android, install Android Build Support/SDK/NDK through Unity Hub, switch
   the build target to Android and use the generated scene. Test on a device before
   distribution. No signed APK has been produced or verified here.

For a separately installed, licensed Unity Editor, an import/preparation check is:

```bash
<path-to-Unity> -batchmode -nographics -projectPath <path-to-checkout> \
  -executeMethod NationClash.Editor.PrototypeBuilder.Prepare \
  -quit -logFile /tmp/nationclash-unity.log
```

This command is provided for the pending Unity validation; it has not run here.

| Action | Player 1 | Player 2 |
|---|---|---|
| Move / crouch / jump | A,D / S / W | arrows |
| Dash | left Shift + direction | right Shift + direction |
| Block | F, or hold away from opponent | right Ctrl, or hold away |
| Light / heavy / special | J / K / L | numpad 1 / 2 / 3 |
| Guard break / throw / ultimate | U / I / O | numpad 4 / 5 / 6 |
| Pause | Esc | Esc |

Touch buttons support held direction, low/block and attack taps using multitouch.
The **Touch P1/P2** selector chooses which player the touch controls operate.
Use a keyboard for the other player during the local prototype. The roster screen
includes country/name search and region filtering. Mirror matches are supported.

Combat runs at 60 simulation ticks per second. Press Light again after a connected
Light, then Heavy, for a launcher chain. Inputs buffer for eight simulation frames.
Hold Low with an attack for its low variation; standing block loses to low attacks.
Use Special against a launched opponent for a slam follow-up. Throws are unblockable
on the ground but have a twelve-frame Throw counter-input window. Meter fills when
dealing/taking damage; Ultimate costs 100%. A match is first to two round wins, with
a 60-second round timer; draws award no win and repeat. Timeout compares HP
percentages, including fighters with different maximum HP. Damage, juggle scaling,
startup, active frames and recovery come from the eight archetype profiles.

## Run the verified core checks

On this cloud machine:

```bash
cd /workspace/nations-clash
bash tools/bootstrap.sh
```

The script installs a SHA-512-verified .NET SDK 8.0.426 under `/workspace/.tools` if
needed, runs 25 combat scenarios, builds the same core against .NET Standard 2.1,
and runs the Python APK-inventory tests. It leaves game dependencies unchanged.
The SDK needs write access to its default runtime lock directory `~/.dotnet` on
its first run; the onboarding run created that directory with approved access.
On a machine with an existing SDK, the equivalent commands are:

```bash
dotnet run --project Tests/Combat/Combat.Tests.csproj --configuration Release
dotnet build Tests/Compatibility/Combat.Core.csproj --configuration Release
python3 -m unittest discover -s Tests/Tools -v
```

These exercise the **actual C# combat sources** used by Unity, without Unity stubs
or a reimplementation. They do not validate rendering, Editor APIs or mobile input.
CI is configured with the same checks; no remote CI run has been claimed.

## Project structure

```text
Assets/
  Characters/Data/             Phase 1 schema guide; no generated 195-country roster
  Scripts/
    CharacterController/       validated schema, resource loader, training fixtures, rig view
    Combat/                    archetypes, hitboxes, combos, juggle, block, throws, meter, rounds
    Input/                     eight-frame buffer, keyboard/touch input adapter
    Stage/                     placeholder arena and retained materials
    UI/                        character selection, HUD, pause, rematch, results
  Editor/                      repeatable scene/animation/data preparation command
Packages/                      built-in Unity modules only
ProjectSettings/               Unity version pin
Tests/Combat/                  dependency-free functional runner
Tests/Compatibility/           Unity-compatible .NET Standard 2.1 core build
Tests/Tools/                   read-only APK inspector tests
tools/                         SDK bootstrap and metadata-only APK inspector
docs/                          repository research and validation evidence
```

## APK analysis and future phases

The uploaded APK exceeded the attachment tool's 32 MiB transfer limit. Its bytes,
identity and engine have **not** been examined. [Repository analysis](docs/RESEARCH.md)
records the three requested tools and the exact blocker. A direct HTTPS link or
parts each below 32 MiB are needed to finish that separate analysis.

To inspect an accessible APK read-only:

```bash
python3 tools/inspect_apk.py /path/to/file.apk --output /tmp/apk-report.json
# Optional: use a virtual environment with androguard==4.1.4 for manifest metadata.
/workspace/.tools/apk-analysis-venv/bin/python tools/inspect_apk.py /path/to/file.apk \
  --manifest --output /tmp/apk-manifest-report.json
```

The optional manifest path was exercised on an Androguard test fixture, not the
uploaded Tekken-named APK. No archive extraction, game-code copying, APK execution,
patching, DRM changes or repackaging is part of this project.

For the Unity project, Phase 2 still requires country data and art integration.
The browser roster now resolves country coverage to the agreed 196 entries; it
has not been ported into Unity. Add validated JSON to
`Assets/Characters/Data/` and run **Prepare prototype** to validate/package it for
PC and Android. Unity Phase 3 includes AI, matchmaking and tournament. Online
netcode, balance review and production release validation remain future work.
