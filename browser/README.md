# NationClash World Arena

A browser fighting game with **196 country fighters**, **196 supplied sprite sheets**,
**30 supplied arena views** of 29 landmarks, computer and local two-player
matches, 196 country signature powers, original music, spoken announcements,
and punch/kick/block effects. The agreed
roster is 193 UN members plus Palestine, Vatican City and Taiwan.

## Play on Windows

1. Download `NationClash-Windows.zip`, right-click → **Extract All**.
2. Open the extracted `NationClash.html` in **Google Chrome** or **Microsoft Edge**.
   This downloaded HTML is self-contained; no companion artwork folder is required.
3. Search or filter countries. Choose **Your fighter** or **Select opponent**,
   then select a card. Pakistan and Japan are the initial matchup.
4. Choose an arena and difficulty, then click **Enter the arena**.

No Unity, account, server or internet connection is needed after downloading.
Clicking Enter unlocks browser audio. Master, Music and Effects sliders adjust
the mix; Sound mutes everything. If the document
opens as text, ensure its extension is `.html`, not `.html.txt`. Allow this large
HTML to finish loading. For a hosted website, the source build uses `index.html`
with an accompanying `country-art` folder.

For a direct browser website, a GitHub Pages workflow is prepared. See
[publishing instructions and access status](../docs/WEB-PUBLISH.md).

## Controls

| Action | Player 1 | Player 2 in local mode |
|---|---|---|
| Move | A / D | Left / Right arrows |
| Low / jump | S / W | Down / Up arrows |
| Block | F, or hold away | Right Ctrl, or hold away |
| Light / heavy / special | J / K / L | Numpad 1 / 2 / 3 |
| Guard break / throw / ultimate | U / I / O | Numpad 4 / 5 / 6 |
| Country signature power | H | Numpad 7 |
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

## Country powers and presentation

Each country has a named fantasy power: Iran's Uranium Pulse, Pakistan's Emerald
Crescent and UAE's Golden Falcon are examples. Press **H** (player two: **Numpad 7**)
for a charged punch that launches a visible projectile. It causes 120 damage,
starts after 18 simulation frames and recharges in four seconds. It can miss,
be blocked, or be interrupted before launch. Hold S for a low power; a crouching
guard blocks low attacks. The move is available on the ground and uses no
ultimate meter. Its projectile travels at eight world units per second for up
to six units beyond the fist. All countries share these combat rules.

The matchup screen shows the selected supplied portraits and signature names.
Perspective panels, lit pedestals, shaded energy cores, sparse particles and
floor reflections provide depth. The supplied fighters and arena illustrations
remain sprites; this is a 3D-style presentation. Reduced-motion mode disables
decorative animation while keeping attacks visible and playable.

The original offline soundtrack uses an eight-bar electronic score with pads,
bass, melody and drums, tuned per arena. Layered punch/kick sounds and eight
power sound families play alongside the existing announcer. Music and Effects
can be adjusted independently. See [all country powers](../docs/COUNTRY-POWERS.md)
and [audio design](../docs/AUDIO-DESIGN.md).

## Fighters and venues

All 196 supplied PNGs are integrated, including the 46 sheets from batches 16–20.
The latest 36-file ZIP contains 32 changed and four unchanged sheets. There are
195 eight-pose sheets and one four-pose sheet (Turkey). Its missing crouch, walk,
hit and KO states adapt the supplied poses; its four source indices remain explicit.
Poses drive portraits, movement, guard, attacks, damage reactions and knockdowns.
Older pose-order exceptions have reviewed overrides.
Low strikes and motions missing from a source sheet adapt its available poses;
these are sprite animations, not full 3D animation rigs.

Original PNGs remain intact with SHA-256 checksums. Fifteen clear flag swaps use
an explicit one-to-one assignment table, shared by portraits, match atlases and
collision metadata. Every source is used exactly once. No exact byte or visible
pixel duplicate sheets were found among 19,110 pairs; many faces, base poses and
some costumes are still similar in the supplied artwork. There are zero missing
PNGs. Two unchanged costumes (Sao Tome and Principe, Sierra Leone) need
replacements; Monaco and Slovenia need confirmation. See the
[full audit](../docs/COUNTRY-ARTWORK-REVIEW.md) and
[creator checklist](../docs/REPLACEMENT-ARTWORK-CHECKLIST.md).

Choose from 30 supplied arena views, including Minar-e-Pakistan, Times Square,
Shibuya Crossing, Eiffel Tower, Big Ben, Taj Mahal, Christ the Redeemer and Burj
Khalifa. Two Angkor Wat views depict the same landmark. Each arena has its own
image and music settings; see the [arena review](../docs/ARENA-ARTWORK-REVIEW.md).

Credits and flag variants are recorded in [assets/README.md](assets/README.md),
[flags/README.md](assets/flags/README.md) and [audio/README.md](assets/audio/README.md).
No APK-extracted assets are used. The browser edition and existing Unity foundation
are separate implementations; online multiplayer and tournament modes are not included.

## Build and verify

Node 24 is sufficient for the build and pure tests; there are no npm dependencies
needed to build or play:

```bash
node tools/build-browser.mjs
node --test Tests/Browser/roster.test.cjs Tests/Browser/combat.test.cjs Tests/Browser/combat-matrix.test.cjs Tests/Browser/fighters.test.cjs Tests/Browser/country-art.test.cjs
```

The builder includes all source modules, thumbnails, fallback atlases, 196 SVG
flags and four WAV cues in the HTML. It writes `browser/index.html` plus 196
on-demand artwork scripts under `browser/country-art/`, and copies both the HTML
and local artwork files into `artifacts/`. That hosted source HTML requires its
196 match scripts. `python3 tools/package-browser.py` produces a different,
self-contained downloadable HTML with all 196 atlas payloads inside it, plus a
ZIP containing that HTML and six notes/inventory files. No companion asset
folder is required by the downloaded HTML.
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
all moves, collision/whiff/guard behavior, round results/rematches, all 30 arena views,
audio lifecycle, live AI and mobile touch. See [validation evidence](../docs/WORLD-VALIDATION.md).
Managed Chromium tests the actual extracted package through an internal HTTP
server because it can block `file:` navigation. The downloaded HTML uses
embedded image data and decodes at most six country atlases. Direct opening on a Windows PC has not been tested in this Linux cloud;
the complete extracted game needs no external network requests.
