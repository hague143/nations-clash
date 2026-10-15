# Detailed fighter artwork — work in progress

These seven transparent PNG pose sheets were generated with the image-generation
tool in response to the user's request for detailed full-body fighters matching
the supplied artwork's visual style. They are original generated source concepts,
not assets extracted from the uploaded APK. The user's supplied Pakistan and
Japan sprites remain separately preserved in `browser/assets/`.

**These sheets are backed up here but are not integrated into the playable game.**
The current browser build still uses the existing renderer. All seven concept
costumes have neutral emerald/gold fabric; the 196 countries' flag designs have
not yet been applied to these costumes. These are seven shared base identities,
not 196 independently painted fighters or finished country costumes.

Each sheet has two rows of five right-facing full-body poses:

| Row | Poses, left to right |
| --- | --- |
| Top | idle, walk, block, crouch, low punch |
| Bottom | punch, high kick, hit reaction, ground KO, low kick |

Frame widths, artwork bounds and spacing vary. Do not assume equal grid crops.
Before runtime integration, isolate each pose, inspect edges and gutters, author
pivots/baselines/strike landmarks, apply the correct country flags, and validate
both facing directions and attack contact in the actual game. The sheets alone
do not establish correct animation, collision behavior or finished visual quality.

`manifest.json` records source dimensions, SHA-256 hashes, identity descriptions
and the intended pose order. It deliberately contains no unverified frame
coordinates. Source PNGs are retained without image transformations.
