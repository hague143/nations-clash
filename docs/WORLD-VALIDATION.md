# World Arena validation

Executed `node Tests/Browser/world-smoke.cjs` in `/workspace/nations-clash` on
2026-10-14 with real headless Chromium. **All 12 acceptance groups passed** in
124.6 seconds. The tested standalone document was 12,103,349 bytes, with SHA-256
`c04432a29db1300b2a828c97a0c69b8b381b407ad2f45ba18b0ede381dfa0449`.

Scope: the agreed roster is 193 UN members plus Palestine, Vatican City and Taiwan.
The game is a browser fighting game with shared fighter rigs, country flag costumes,
10 selectable arenas, computer/local play and bundled/procedural audio.

| Check | Result | Evidence |
|---|---|---|
| Exact agreed roster | Passed | An independent canonical list matches all 196 codes: 193 UN members, Palestine, Vatican City and Taiwan. No duplicate or substitute countries. |
| Country selection | Passed | Searched and clicked every one of the 196 country cards through the live UI; also verified case-insensitive search, empty results, region filtering, 24-card pagination and random selection. |
| Flags and supplied art | Passed | All 196 cached SVG flag images decoded; supplied Pakistan/Japan images loaded; every fighter has an individual appearance profile and name. |
| Fighter rendering | Passed | All 196 fighters produced substantial body pixels and distinct image hashes through the actual production renderer. Pakistan, Japan and all eight archetypes rendered all six moves in both directions: 96 pose fixtures. |
| Real keyboard controls | Passed | Actual movement, punch damage, recoil, hit effects and HP readout; zero-chip guard; mirrored heavy launch; out-of-range whiff; jump. Position fixtures control range while the real input adapter, collision logic and RAF simulation advance. |
| Round lifecycle | Passed | Real keyboard strikes produced two knockouts; first round restored HP, second ended the match; result and rematch reset verified. Pause froze both frame count and timer. |
| Computer opponent | Passed | In a live Japan/Pakistan match, the computer moved toward the player and inflicted damage through the production AI adapter. |
| Flag orientation | Passed | Exact pixel comparisons under both actor-facing transforms for 12 representative flags, including Saudi lettering, Pakistan's crescent, US canton and Brazil/Vatican/Taiwan emblems. Tests use the production costume flag helper, which the shared rig uses for its panels. |
| All ten arenas | Passed | Every venue entered a live match and produced a screenshot. Fixed-time background renders differed for all ten, preventing animation differences from producing a false distinct-scene result. |
| Audio | Passed | All four bundled announcer clips decoded; each new match played GET READY and FIGHT once. Live punch and kick inputs triggered audible effect scheduling. Background music ran; pause, resume, mute and volume worked; KO played once per round; pause/resume repeated no announcements and canceled active voices. |
| Mobile controls/layout | Passed | At 390×844 and 844×390, real touch taps attacked and jumped, touch targets were at least 44px and layouts had no horizontal overflow. Landscape kept the arena and all touch buttons visible beside one another without scrolling. |
| Offline/runtime | Passed | Zero page errors, zero console errors and zero external HTTP(S) requests. HTTP(S) requests were blocked to enforce the offline check. |

The ten tested venues are Minar-e-Pakistan, Times Square, Shibuya Crossing, Eiffel
Promenade, the Great Wall, Copacabana, Giza Pyramids, Tower Bridge, Sydney Harbour
and Burj Khalifa Plaza. The output includes 19 screenshots and the machine-readable
report `/workspace/artifacts/NationClash-World-acceptance.json`.

Representative previews are
`/workspace/artifacts/NationClash-World-roster-desktop.png`,
`/workspace/artifacts/NationClash-World-pakistan-impact.png`,
`/workspace/artifacts/NationClash-World-mobile-fight.png` and
`/workspace/artifacts/NationClash-World-flag-orientation.png`.
The roster, Pakistan hit contact and mobile layout were also visually reviewed.

Browser tests render the exact generated HTML with Playwright `setContent`, because
managed Chromium can block `file:` navigation. The game document must not fetch any
external assets. Browser checks do not establish behavior on every Windows device
or prove a production commercial game's visual polish, balance, networking or
hardware performance. The shared rig uses a 16-face atlas with distinct appearance
profiles, national costumes and silhouette details; this does not claim 196
individually painted face images. The supplied Pakistan/Japan art remains separate.

**44 module checks passed**: 41 engine/roster/renderer checks and three arena/audio
checks. These are separate from the 12 browser acceptance groups. Their reproducible commands are:

```sh
node --test Tests/Browser/combat.test.cjs Tests/Browser/combat-matrix.test.cjs
node --test Tests/Browser/roster.test.cjs
node --test Tests/Browser/fighters.test.cjs
node --test Tests/Browser/arenas-audio.test.cjs
node Tests/Browser/world-smoke.cjs
```

The first four commands should be rerun when their owned modules change. The final
command validates the generated `browser/index.html`; regenerate that document
with `node tools/build-browser.mjs` after changing browser sources or assets.

The final run includes the Pakistan crop/baseline and cape emblem corrections,
the corrected venue copy and arrow icon, and the mobile landscape layout.
The packaged ZIP index is byte-identical to the tested standalone HTML.
The machine-readable result is [WORLD-ACCEPTANCE.json](WORLD-ACCEPTANCE.json).
Tracked previews: [roster](previews/roster.png), [Pakistan strike contact](previews/pakistan-impact.png),
and [mobile landscape](previews/mobile-landscape.png).
