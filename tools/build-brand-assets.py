"""Export the approved-reference logo into standard web/Android image sizes.

Only deterministic size/format exports are made here; the prepared source art
is retained unchanged. Run before browser and Android release packaging.
"""

import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    folder = ROOT / "browser/assets/branding"
    source = folder / "nation-clash-logo.png"
    drawable = ROOT / "android/app/src/main/res/drawable-nodpi"
    drawable.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as original:
        original.load()
        if original.width != original.height:
            raise ValueError("The prepared branding source must be square")
        rgb = original.convert("RGB")
        rgb.resize((1024, 1024), Image.Resampling.LANCZOS).save(
            folder / "nation-clash-logo.webp", "WEBP", quality=94, method=6
        )
        # Google Play listing icon: square PNG, with no baked-in corner mask.
        rgb.resize((512, 512), Image.Resampling.LANCZOS).save(
            folder / "play-store-icon.png", "PNG", optimize=True
        )
        rgb.resize((512, 512), Image.Resampling.LANCZOS).save(
            drawable / "nation_clash_icon.png", "PNG", optimize=True
        )
        # Adaptive foreground fits within the 72dp central viewport of the
        # 108dp layer, preserving the emblem and lettering under launcher masks.
        foreground = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        side = round(512 * 72 / 108)
        art = rgb.resize((side, side), Image.Resampling.LANCZOS).convert("RGBA")
        offset = (512 - side) // 2
        foreground.alpha_composite(art, (offset, offset))
        foreground.save(drawable / "nation_clash_foreground.png", "PNG", optimize=True)
    outputs = [folder / "nation-clash-logo.webp", folder / "play-store-icon.png",
               drawable / "nation_clash_icon.png", drawable / "nation_clash_foreground.png"]
    report = {
        "source": str(source.relative_to(ROOT)), "sourceSha256": sha(source),
        "preparation": "Logo prepared from the user-supplied visual reference using image generation; source PNG retained.",
        "exports": {str(path.relative_to(ROOT)): {"bytes": path.stat().st_size, "sha256": sha(path)} for path in outputs},
    }
    (folder / "metadata.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
