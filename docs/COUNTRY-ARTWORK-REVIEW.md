# Supplied country artwork review

The five uploaded ZIPs contain 150 country PNGs (30 per archive), plus README files. All 150 originals are preserved byte for byte with the intake SHA-256 checksums. Only image data and descriptive metadata were used; archive README contents were not treated as project instructions.

All ten contact sheets were visually inspected. Pose layouts were reviewed, and five touching sheets (Malta, Peru, Poland, Russia and Samoa) use explicit separation seams. The current eight-frame artwork supports sprite-state animation; it is not a complete motion-capture or 3D animation set. Missing low attacks, walks and ground KOs adapt the available source poses as documented in browser/assets/countries/README.md.

## Assignment and costume observations

Country assignment follows the PNG filename, as requested. These visual observations flag source artwork for review; they do not silently rename, swap or repaint the supplied characters. Official menu/waist flag badges use the existing verified national SVGs. Mirroring a fighter also mirrors the supplied painted costume; the separate official badge remains readable.

| Original filename | Observation |
| --- | --- |
| Brazil.png | Red/white crescent-and-star design, visually resembling Turkey. |
| China.png | Green/yellow/blue design with a Brazil-like diamond and disc. |
| Estonia.png | Red/green/blue and yellow wreath, visually resembling Eritrea. |
| Eswatini.png | Green/yellow/red tricolor, unlike the Eswatini shield flag. |
| Ethiopia.png | White/blue Nordic-cross costume, visually resembling Finland. |
| Fiji.png | Green/yellow/blue bands, visually resembling Gabon. |
| Finland.png | Black/red/gold costume, visually resembling Germany. |
| France.png | Red/black double-headed-eagle costume, visually resembling Albania. |
| Gabon.png | Light blue with Union Jack, visually resembling Fiji. |
| Gambia.png | White field with red crosses, visually resembling Georgia. |
| Georgia.png | Blue/black/white bands, visually resembling Estonia. |
| Germany.png | Yellow/blue/red costume, unlike Germany black/red/gold. |
| Ghana.png | White/red embroidered panels with green, visually resembling Belarus. |
| Greece.png | Red/yellow/green and black star, visually resembling Ghana. |
| Grenada.png | Blue/white and blue stars, visually resembling Honduras. |
| Guinea.png | Blue/white design, unlike Guinea red/yellow/green. |
| Haiti.png | Red/yellow/green star-emblem design, visually resembling Grenada. |
| Honduras.png | Red/yellow/green design, unlike Honduras blue/white/blue. |
| Hungary.png | Blue/red/white and coat of arms, visually resembling Belize. |
| Japan.png | Green/white robe with Saudi-like motifs, unlike Japan white/red disc. |
| Maldives.png | White/red/green layout, visually resembling Madagascar. |
| Malta.png | Red/yellow sunburst design, visually resembling North Macedonia. |
| Mauritius.png | Striped red/white and blue/yellow crescent, visually resembling Malaysia. |
| Mexico.png | Green/white crescent/star design, visually resembling Pakistan. |
| Mongolia.png | Red/yellow sunburst design, visually resembling North Macedonia. |
| Montenegro.png | Red/yellow sunburst design, visually resembling North Macedonia. |
| Morocco.png | Yellow/green/red bands, unlike Morocco red/green star. |
| Oman.png | Red/black/green with white crescent/star, visually resembling Libya. |
| Palau.png | Blue/red/gold costume, unlike Palau light-blue/yellow disc. |
| Panama.png | Striped red/white star-field design, unlike Panama quadrants. |
| Paraguay.png | Light-blue/red/white lion-like emblem, unlike the Paraguay flag. |
| Peru.png | Red/yellow sunburst design, visually resembling North Macedonia. |
| Saudi Arabia.png | Blue/yellow/red coat-of-arms costume, unlike Saudi Arabia green/white. |
| Turkey.png | White/red Japanese-style martial gi, without a visible Turkey crescent/star. |

## Missing 46 country sheets

The user confirmed these are still being made. Their previous fighters remain playable; no supplied image is falsely assigned to these countries.

- San Marino (`sm`)
- Sao Tome and Principe (`st`)
- Senegal (`sn`)
- Serbia (`rs`)
- Seychelles (`sc`)
- Sierra Leone (`sl`)
- Singapore (`sg`)
- Slovakia (`sk`)
- Slovenia (`si`)
- Solomon Islands (`sb`)
- Somalia (`so`)
- South Africa (`za`)
- South Korea (`kr`)
- South Sudan (`ss`)
- Spain (`es`)
- Sri Lanka (`lk`)
- State of Palestine (`ps`)
- Sudan (`sd`)
- Suriname (`sr`)
- Sweden (`se`)
- Switzerland (`ch`)
- Syria (`sy`)
- Taiwan (`tw`)
- Tajikistan (`tj`)
- Tanzania (`tz`)
- Thailand (`th`)
- Timor-Leste (`tl`)
- Togo (`tg`)
- Tonga (`to`)
- Trinidad and Tobago (`tt`)
- Tunisia (`tn`)
- Turkmenistan (`tm`)
- Tuvalu (`tv`)
- Uganda (`ug`)
- Ukraine (`ua`)
- United Arab Emirates (`ae`)
- United Kingdom (`gb`)
- Uruguay (`uy`)
- Uzbekistan (`uz`)
- Vanuatu (`vu`)
- Vatican City (`va`)
- Venezuela (`ve`)
- Vietnam (`vn`)
- Yemen (`ye`)
- Zambia (`zm`)
- Zimbabwe (`zw`)

## Rebuild and verification

- `python3 tools/prepare-country-art.py` regenerates derivatives from the preserved PNGs.
- `node tools/build-browser.mjs` writes the HTML and its local country-art scripts.
- `python3 tools/package-browser.py` packages the complete offline game.
- `Tests/Browser/country-art.test.cjs` verifies original hashes, mapping, contacts, hits/whiffs, guards and low-input release.
- `Tests/Browser/world-smoke.cjs` checks the actual renderer for 2,400 visible contact fixtures and all eight source poses per country, plus roster, controls, rounds, arenas, audio, AI and portrait/landscape touch.
