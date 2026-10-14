# National flag assets and roster membership

The 196 self-contained SVG files and `countries-source.json` are vendored from
[`lipis/flag-icons`](https://github.com/lipis/flag-icons), version 7.5.0,
commit `086f7e97d657358203916dbe84f61c2bccaa81eb`.

They use the MIT license. The full copyright and license notice is retained in
`LICENSE.txt` and is embedded in the generated browser module's `source.licenseText`.
`source.json` records the pinned URL, explicit roster membership, and SHA-256
checksum for every flag, metadata and license file.

The playable selection contains the 193 UN member states, Palestine, Vatican
City and Taiwan, following the roster convention selected for this game.
Dependent territories are not included. This is a game roster convention and
does not assert that there is one universally accepted country count.

The Afghanistan asset is the Islamic Republic's 2004 tricolor with its emblem,
as supplied by flag-icons. It is not the current de facto government's white
flag. Alternate current-flag sources were investigated; the available GitHub
flag sets supplied the same tricolor, while the Wikimedia-hosted alternative
was not reachable from this environment. The variant is recorded in the data
so it is not silently misrepresented. The Syria asset uses the green, white and
black stripes with three red stars. Nepal retains its nonrectangular shape.

The full original SVG artwork is used for costumes and badges. `colors` in the
roster are UI accents; they do not substitute for the flag's pattern or emblem.
Fighter body skin colors match the sampled cheek tones of their assigned frame
in the original 16-head atlas. Nationality is not used to infer appearance.

Rebuild from the verified local inputs:

```sh
node tools/build-roster.mjs
node --test Tests/Browser/roster.test.cjs
```

The builder checks all input hashes and rejects executable or external SVG
references. It generates `browser/src/roster.js`, exposing the same
`{ROSTER, COUNTRIES, FLAG_SVGS, source}` API in a browser or Node.
