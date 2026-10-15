# Country artwork audit: batches 16–20

All 46 PNGs in batches 16–20 are integrated. Together with the original 150 sheets, every agreed roster country now has supplied eight-pose artwork: **196 supplied fighters, zero missing PNGs**. Holy See.png maps to Vatican City (`va`); State of Palestine.png maps to Palestine (`ps`).

The original 196 PNGs are retained byte for byte. Their SHA-256 values and archive provenance are in `artwork/country-fighters/intake.json` and `archives.json`. Archive documents are descriptive input, not project instructions.

## Duplicate and appearance audit

All **19,110 pairs** were compared. There are **zero byte-identical source PNG pairs, zero identical canonical visible-pixel sheets, and zero repeated source assignments**. Canonical pixel hashes clear RGB hidden under fully transparent pixels. The 40 closest 255-bit DCT perceptual candidates are retained in `duplicate-audit.json`; proximity is a review aid, not proof of identical characters. Every original contact sheet was visually reviewed.

**Some faces, bodies, poses and costumes are similar in the supplied artwork.** The result does not establish 196 unique faces. Clear shared costume families include Malta/Mongolia/Montenegro/North Macedonia/Peru (sunburst), Pakistan/Mexico, Andorra/Saudi Arabia, Belarus/Ghana, Belize/Hungary, Albania/France, Libya/Oman, Liechtenstein/Palau, Madagascar/Maldives and Malaysia/Mauritius. Their PNGs are different; reusing a shared design in the source is separate from accidentally assigning one image twice in code.

## 15 corrected country assignments

Only complete, visually clear one-to-one swap cycles override filenames. All 196 sources remain used exactly once. This avoids replacing one wrong flag with a duplicate of another country. Source filenames and original backups are unchanged; `assignments.json` records every correction. Portraits, match atlases, pose metadata and collision landmarks all use the same assignment.

| Game country | Original PNG now used | Visible basis |
| --- | --- | --- |
| Eritrea | Estonia.png | Eritrean wreath and red/green/blue on Estonia.png |
| Estonia | Georgia.png | Estonian blue/black/white on Georgia.png |
| Fiji | Gabon.png | Fiji shield and Union Jack on Gabon.png |
| Gabon | Fiji.png | Gabon green/yellow/blue on Fiji.png |
| Gambia | Eritrea.png | Gambian red/blue/green with white separators on Eritrea.png |
| Georgia | Gambia.png | Georgian five-cross design on Gambia.png |
| Somalia | Spain.png | Light-blue/white star Somali costume on Spain.png |
| South Africa | South Sudan.png | South Africa multicolour Y flag on South Sudan.png |
| South Korea | Sweden.png | Korean taegeuk/trigrams on Sweden.png |
| South Sudan | Somalia.png | South Sudan flag design on Somalia.png |
| Spain | South Africa.png | Red/yellow Spanish costume on South Africa.png |
| Sudan | South Korea.png | Sudan red/white/black and green on South Korea.png |
| Suriname | Switzerland.png | Suriname green/white/red and gold star on Switzerland.png |
| Sweden | Sudan.png | Swedish yellow Nordic cross on Sudan.png |
| Switzerland | Suriname.png | Swiss white cross on Suriname.png |

## 34 costumes still need replacement

No source PNG is missing. These **existing files** still have a mismatched or unconvincing national costume; a correct replacement is needed to resolve them without duplicating another fighter. They remain playable under their original filename assignment, explicitly unverified. Official menu and waist badges use the correct country flag, but that badge does not repair the painted source costume.

| Country / replacement filename | Observed issue |
| --- | --- |
| Angola / Angola.png | Green/yellow/red costume; missing the distinctive Angola red/black and yellow cog/machete design. |
| Brazil / Brazil.png | Red/white crescent-and-star design, visually resembling Turkey. |
| China / China.png | Green/yellow/blue design with a Brazil-like diamond and disc. |
| Germany / Germany.png | Yellow/blue/red costume, unlike Germany black/red/gold. |
| Dominica / Dominica.png | Green/red/yellow star design resembles Cameroon; no clear Dominica cross/parrot design. |
| Ethiopia / Ethiopia.png | White/blue Nordic-cross costume, visually resembling Finland. |
| Finland / Finland.png | Black/red/gold costume, visually resembling Germany. |
| France / France.png | Red/black double-headed-eagle costume, visually resembling Albania. |
| Grenada / Grenada.png | Blue/white and blue stars, visually resembling Honduras. |
| Ghana / Ghana.png | White/red embroidered panels with green, visually resembling Belarus. |
| Guinea / Guinea.png | Blue/white design, unlike Guinea red/yellow/green. |
| Greece / Greece.png | Red/yellow/green and black star, visually resembling Ghana. |
| Honduras / Honduras.png | Red/yellow/green design, unlike Honduras blue/white/blue. |
| Haiti / Haiti.png | Red/yellow/green star-emblem design, visually resembling Grenada. |
| Hungary / Hungary.png | Blue/red/white and coat of arms, visually resembling Belize. |
| Japan / Japan.png | Green/white robe with Saudi-like motifs, unlike Japan white/red disc. |
| Morocco / Morocco.png | Yellow/green/red bands, unlike Morocco red/green star. |
| Montenegro / Montenegro.png | Red/yellow sunburst design, visually resembling North Macedonia. |
| Mongolia / Mongolia.png | Red/yellow sunburst design, visually resembling North Macedonia. |
| Malta / Malta.png | Red/yellow sunburst design, visually resembling North Macedonia. |
| Mauritius / Mauritius.png | Striped red/white and blue/yellow crescent, visually resembling Malaysia. |
| Maldives / Maldives.png | White/red/green layout, visually resembling Madagascar. |
| Mexico / Mexico.png | Green/white crescent/star design, visually resembling Pakistan. |
| Oman / Oman.png | Red/black/green with white crescent/star, visually resembling Libya. |
| Panama / Panama.png | Striped red/white star-field design, unlike Panama quadrants. |
| Peru / Peru.png | Red/yellow sunburst design, visually resembling North Macedonia. |
| Palau / Palau.png | Blue/red/gold costume, unlike Palau light-blue/yellow disc. |
| Paraguay / Paraguay.png | Light-blue/red/white lion-like emblem, unlike the Paraguay flag. |
| Saudi Arabia / Saudi Arabia.png | Blue/yellow/red coat-of-arms costume, unlike Saudi Arabia green/white. |
| Solomon Islands / Solomon Islands.png | Light-blue/white with ornate crest resembles San Marino; no clear Solomon Islands diagonal/yellow-star design. |
| Sierra Leone / Sierra Leone.png | Red/yellow/green with a black star resembles Ghana, rather than Sierra Leone green/white/blue. |
| Sao Tome and Principe / Sao Tome and Principe.png | Green/white/blue costume resembles Sierra Leone; no clear Sao Tome yellow/red triangle and two black stars. |
| Eswatini / Eswatini.png | Green/yellow/red tricolor, unlike the Eswatini shield flag. |
| Turkey / Turkey.png | White/red Japanese-style martial gi, without a visible Turkey crescent/star. |

## Two costumes need your confirmation

- **Monaco** (`Monaco.png`): White/black with red trim; the Monaco red/white flag design is not clearly identifiable. Please confirm intended costume.
- **Slovenia** (`Slovenia.png`): Blue/red/white costume has cross-like ornament; the Slovenia mountain shield is not clear. Please confirm intended costume.

## Poses and limits

All 46 new sheets contain eight separate figures in the standard idle / walk / block / crouch / punch / kick / hit / ground-KO order. All 196 runtime atlases have eight isolated source figures; older exceptional layouts retain reviewed mappings and separation seams. Low strikes and missing motions adapt available poses; eight poses are sprite-state animation, not a complete 3D or motion-capture animation set. Painted costumes mirror when fighters face left; the official badge stays readable.

## Rebuild and audit

```sh
python3 tools/audit-country-art.py
python3 tools/prepare-country-art.py
node tools/build-browser.mjs
python3 tools/package-browser.py
```

Runtime acceptance covers 196 correct source assignments, all eight poses, 3,136 painted melee-contact fixtures and bounded lazy loading. Module tests cover 4,704 supplied-fighter damage fixtures, guard rules and genuine whiffs. See DOWNLOAD-VALIDATION.md for results from the exact delivered package.
