# NationClash World Arena

A self-contained browser fighting game with **196 country fighters**, national
flag costumes, **10 selectable landmark arenas**, computer and local two-player
matches, music, spoken announcements, and punch/kick/block effects. The agreed
roster is 193 UN members plus Palestine, Vatican City and Taiwan.

## Play on Windows

1. Download `NationClash-World-196.html` (about 12 MB).
2. Right-click it → **Open with → Google Chrome** or **Microsoft Edge**.
3. Search or filter countries. Choose **Your fighter** or **Select opponent**,
   then select a card. Pakistan and Japan are the initial matchup.
4. Choose an arena and difficulty, then click **Enter the arena**.

No Unity, account, server or internet connection is needed after downloading.
Clicking Enter unlocks browser audio; Sound and Volume control it. If the document
opens as text, ensure its extension is `.html`, not `.html.txt`. The build can also
be hosted as `index.html` on a static website.

## Controls

| Action | Player 1 | Player 2 in local mode |
|---|---|---|
| Move | A / D | Left / Right arrows |
| Low / jump | S / W | Down / Up arrows |
| Block | F, or hold away | Right Ctrl, or hold away |
| Light / heavy / special | J / K / L | Numpad 1 / 2 / 3 |
| Guard break / throw / ultimate | U / I / O | Numpad 4 / 5 / 6 |
| Pause/resume | Escape | Escape |

On-screen buttons support mouse and multitouch. Chain **J → J → K** after
connected hits to launch, then use **L** for a slam. Hold **S + attack** to hit low.
Standing block loses to low attacks; crouching block stops them. Use **U** to break
guard, **I** during the grab prompt to escape, and **O** with a full meter. First
to two round wins takes the match. Timeout compares remaining HP percentages.

Visual attacks share contact geometry with the combat engine. Connected strikes
show recoil, sparks, damage numbers and remaining HP. Out-of-range attacks miss;
blocking prevents strike damage. Pause, focus loss and returning to selection
clear held inputs and suspend/stop the appropriate audio.

## Fighters and venues

Each country has a name, eight-archetype combat profile, national SVG flag,
costume palette and individual appearance configuration. Shared textured rigs
use 16 base face images with different clothing, silhouettes and accessories.
Pakistan and Japan retain the supplied four-pose artwork; walking, low, airborne
and hit states use transforms and effects around those key poses. These are shared
browser rigs, not 196 separately hand-animated 3D characters.

Choose Minar-e-Pakistan, Times Square, Shibuya Crossing, Eiffel Promenade,
the Great Wall, Copacabana, Giza Pyramids, Tower Bridge, Sydney Harbour or
Burj Khalifa Plaza. Each arena has its own illustrated scene and music settings.

Credits and flag variants are recorded in [assets/README.md](assets/README.md),
[flags/README.md](assets/flags/README.md) and [audio/README.md](assets/audio/README.md).
No APK-extracted assets are used. The browser edition and existing Unity foundation
are separate implementations; online multiplayer and tournament modes are not included.

## Build and verify

Node 24 is sufficient for the build and pure tests; there are no npm dependencies
needed to build or play:

```bash
node tools/build-browser.mjs
node --test Tests/Browser/roster.test.cjs Tests/Browser/combat.test.cjs Tests/Browser/combat-matrix.test.cjs Tests/Browser/fighters.test.cjs
```

The builder inlines all seven `src` modules, four PNG atlases, 196 SVG flags and
four WAV cues into `template.html`. It writes `browser/index.html`,
`artifacts/NationClash.html` and `artifacts/NationClash-World-196.html`.
Set `NATIONCLASH_ARTIFACT_DIR` to choose a different downloadable output folder.

Browser acceptance additionally requires Playwright and Chromium:

```bash
node --test Tests/Browser/arenas-audio.test.cjs
node Tests/Browser/world-smoke.cjs
```

The cloud environment provides both. Elsewhere install Playwright and its Chromium
browser in a separate tooling directory, and expose that directory through
`NODE_PATH`. The world acceptance test supports `CHROMIUM_PATH` for a preinstalled browser.
These tooling packages are not required by the playable HTML.

The cloud checks cover all 196 real country selections and rendered fighters,
all moves, collision/whiff/guard behavior, round results/rematches, all 10 venues,
audio lifecycle, live AI and mobile touch. See [validation evidence](../docs/WORLD-VALIDATION.md).
Managed Chromium renders the exact bundled document through Playwright `setContent`
because it can block `file:` navigation. Direct opening on a Windows PC has not
been tested in this Linux cloud; the document makes no external requests.
