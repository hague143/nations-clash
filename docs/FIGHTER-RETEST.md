# All-fighter retest — 16 October 2026

All **196 countries** were retested through simulations, actual browser rendering
and keyboard/touch checks on the exact downloadable HTML. **81 automated tests**,
**29 browser gameplay/presentation groups**, and three loading/navigation cases
pass. Source artwork and authored attack reach/damage are unchanged.

## Bug found and fixed

A deciding KO stopped the simulation clock before the defeated pose completed.
The loser could remain in a bright hit pose, the winner could freeze mid-strike,
and sparks could remain visible. Airborne fighters could also hang in place.
The same flash/recovery problem affected the between-round interval.

A separate outcome-animation tick now completes landing, recovery, flash and
particles in both result states. It accepts no commands or attacks and preserves
health, meter, wins, round timer, recharge and the recorded winner. It honors
hitstop, clamps recoil at stage bounds and leaves the normal round reset intact.
The old package fails the new live-browser regression; the corrected package
passes. 1,568 grounded/airborne KO fixtures cover every country, both directions
and both player slots. All 196 defeated artwork states render; six actual keyboard
KOs also finish correctly in the real animation loop.

## Full AI fights

The live production combat engine completed **19,992 / 19,992 matches**, with
**33,873,834 step checks** and zero recorded lifecycle/state violations. Every
country appears in **102 matches**, both player slots, all three difficulties,
eight opposing styles and two representative natural-opening seeds. Additional
ranged openings exercise country powers. All 196 countries land normal attacks
and signature powers. The two-perspective AI adapter is checked against native
AI decisions and RNG state before the audit.

This samples opposing styles rather than all 196 × 196 country pairs. It is
not proof of balance: observed wins range from 7 to 74 of 102 sampled matches,
which also depend on this generic AI and the selected opponents. No strength
ranking or damage rebalance is inferred from those win counts. Human playtests
and wider matchup tuning are still useful before a competitive release.

[Per-country results (CSV)](FIGHTER-RETEST.csv) ·
[Full AI summary](ALL-FIGHTERS-AI-AUDIT.json) ·
[KO browser evidence](KO-ACCEPTANCE.json) ·
[Current artifact and commands](DOWNLOAD-VALIDATION.md)

Reproduce the complete-fight audit:

```sh
node tools/audit-fighter-matches.cjs
```

## Visible motion review

The actual portable renderer produced 14 contact sheets covering all 196
countries' idle, punch, low-kick, defeated, walk, block, crouch and hit poses.
All pages were inspected. These images record supplied artwork/pose mapping;
the KO live-loop regression separately verifies the corrected result animation.
North Macedonia, Norway and Poland use their supplied kneeling defeat images.
Turkey's four-pose source uses an explicitly adapted crouch/KO. These remain
sprite poses rather than motion-capture/3D rigs; some low/walk motions reuse
available poses. Existing costume issues remain in the creator checklist.

### Countries 1–28

![Attack and defeat poses](previews/fighter-audit/poses-1-attacks-ko.jpg)

![Movement and defense poses](previews/fighter-audit/poses-1-movement.jpg)

### Countries 29–56

![Attack and defeat poses](previews/fighter-audit/poses-2-attacks-ko.jpg)

![Movement and defense poses](previews/fighter-audit/poses-2-movement.jpg)

### Countries 57–84

![Attack and defeat poses](previews/fighter-audit/poses-3-attacks-ko.jpg)

![Movement and defense poses](previews/fighter-audit/poses-3-movement.jpg)

### Countries 85–112

![Attack and defeat poses](previews/fighter-audit/poses-4-attacks-ko.jpg)

![Movement and defense poses](previews/fighter-audit/poses-4-movement.jpg)

### Countries 113–140

![Attack and defeat poses](previews/fighter-audit/poses-5-attacks-ko.jpg)

![Movement and defense poses](previews/fighter-audit/poses-5-movement.jpg)

### Countries 141–168

![Attack and defeat poses](previews/fighter-audit/poses-6-attacks-ko.jpg)

![Movement and defense poses](previews/fighter-audit/poses-6-movement.jpg)

### Countries 169–196

![Attack and defeat poses](previews/fighter-audit/poses-7-attacks-ko.jpg)

![Movement and defense poses](previews/fighter-audit/poses-7-movement.jpg)

