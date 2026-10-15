# Arena artwork update

The supplied archive contains **30 arena PNGs**. All 30 were visually reviewed
and mapped in archive order to matching landmark names and locations. The two
Angkor Wat images are separate views of the same landmark, so the selector has
30 views of 29 landmarks. No file or runtime image hash is duplicated.

The user-provided PNGs remain unchanged in `artwork/arenas/source/`. Source and
archive hashes are recorded in `artwork/arenas/intake.json`. The catalog records
the reviewed name, country, city, source file, fighting floor and music for each
menu entry. Runtime derivatives and their checksums are in
`browser/assets/arenas/metadata.json`.

The previous ten menu IDs remain compatible. London now displays Big Ben and
Rio displays Christ the Redeemer, matching the supplied files. Niagara Falls
is labelled Canada / United States. Temple Terrace and Lotus Causeway identify
the two Angkor Wat views without suggesting different landmarks.

The preview and live match use the same supplied image. Match startup waits
for its background to decode, and locks its selection along with the fighters
and music. Late preview loads cannot overwrite a newer selection. The arena
cache keeps at most three decoded images and retains the live match's image.
Fighter feet, shadows, meter indicators, names and hit effects share the
catalog's fighting-floor coordinate. Backgrounds remain static illustrations.

Rebuild:

```sh
python3 tools/prepare-arena-art.py
node tools/build-browser.mjs
python3 tools/package-browser.py
```

See [download validation](DOWNLOAD-VALIDATION.md) for executed tests, artifact
hashes, browser evidence and the verified public download.
