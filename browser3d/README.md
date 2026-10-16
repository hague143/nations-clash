# NationClash 3D combat prototype

Development of this prototype is paused. The active version is the
[neon 2D browser game](../browser/README.md).

Two original articulated 3D fighters—Pakistan and Japan—fight on a marble
forecourt at a modelled Minar-e-Pakistan in Lahore. The scene, bodies, hands,
feet, clothing and landmark are actual Three.js geometry with perspective,
lighting and shadows. The models are stylized interpretations of the supplied
costume references. They are an initial gameplay prototype for review.

[Download the offline prototype](https://raw.githubusercontent.com/hague143/nations-clash/39a8e002ab32da310689171e4788f5b965aa0cc9/downloads/NationClash-3D-Prototype.zip).
Extract All, then open `NationClash-3D-Prototype.html` in current Chrome or Edge.
Everything is embedded in that one HTML; Unity, accounts, hosting and an internet
connection are unnecessary after downloading. Choose Low graphics if needed.

Use **Training** to test strikes against a stationary rival, **Versus computer**
for solo play, or **Local two players** to share a keyboard.

| Action | Player one | Player two |
|---|---|---|
| Move | A / D | Left / Right |
| Jump / crouch | W / S | Up / Down |
| Hold guard | F | Right Ctrl |
| Punch / kick | J / K | Numpad 1 / 2 |
| Country power | H | Numpad 3 |
| Pause | Escape | Escape |

Walk close before punching. Kicks have a longer reach; distant melee strikes
miss. Low attacks beat standing guard; crouch plus guard blocks low attacks.
Country powers travel as 3D projectiles and recharge in four seconds. First to
two rounds wins. Arena View changes the perspective; Music and Effects have
separate controls. Touch controls support held movement/guard plus attack taps.

## Development

```sh
python3 tools/build-prototype3d.py
node --test Tests/Browser/prototype3d.test.cjs
node tools/audit-prototype3d.cjs
NATIONCLASH_3D_HTML=downloads/NationClash-3D-Prototype.html \
NATIONCLASH_3D_ARTIFACT_DIR=artifacts/prototype3d/verified-browser \
  node Tests/Browser/prototype3d-browser.cjs
```

The build uses Python's standard library. Browser acceptance uses installed
Playwright and Chromium; CI renders real WebGL using SwiftShader. The game uses
the player's GPU through WebGL. Three.js r160 is vendored under its MIT license
from `mrdoob/three.js`, tag `r160`, `build/three.min.js`. No CDN is used at runtime.
Music, impacts and announcer cues reuse the project's original offline audio.

Combat samples the same articulated joint pose that the mesh rig receives.
Swept fists/feet and actual kicking shins contact body/head/leg capsules in 3D.
Both fighters and both directions are checked against actual mesh world points,
and travelling power meshes use their simulation collider positions/radii.
Post-KO animation finishes gravity, recovery and flash with the outcome locked.

Windows file opening, Android packaging and Play Store publishing are pending
device/release validation. This download is a browser prototype, with two
fighters and one arena. See [validation evidence](../docs/3D-PROTOTYPE-VALIDATION.md).
