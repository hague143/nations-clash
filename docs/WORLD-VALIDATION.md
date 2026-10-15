# Browser world validation

The current extracted Windows package passes all **13 browser acceptance groups**
and **50 module/functional checks**. See [the exact ZIP hashes and test commands](DOWNLOAD-VALIDATION.md)
and the machine-readable [acceptance report](WORLD-ACCEPTANCE.json).

Coverage includes the agreed 196-country roster, 196 supplied country sheets
with 15 reviewed flag corrections and zero missing images, all eight supplied poses,
3,136 actual rendered melee contact fixtures, 4,704 supplied-fighter combat hit
fixtures, misses outside range, guards, real keyboard controls, KO/rematch,
all 10 arenas, bundled announcements and music, AI, touch at 390×844 and 844×390,
no runtime errors, and no requests outside the extracted game files.

Visual review included all 196 source sheets and actual desktop/mobile game
screenshots. Eight static poses are adapted into sprite-state animations;
missing walks, low attacks and ground KOs use the available poses. Fifteen flag assignments were corrected; 34 unresolved costumes and two uncertain
designs are explicitly [listed for review](COUNTRY-ARTWORK-REVIEW.md).
These tests do not establish 196 unique 3D models or complete hand-authored animation.

Managed Chromium serves exact extracted files over an internal HTTP test server;
Windows file-opening itself has not been observed. The complete ZIP works through
local scripts and image data without Python, Unity or a user-run server.
