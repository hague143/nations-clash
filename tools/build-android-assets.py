"""Build the vetted 2D browser game as an offline Android WebView asset bundle.

The game modules, artwork assignments, controls, and combat rules are unchanged.
Only the asset transport differs from the Windows single-file download: WebP
files load directly from the Android app's local asset origin rather than giant
base64 JavaScript payloads. The native Android wrapper must serve this directory
at https://appassets.androidplatform.net/assets/ with correct MIME types.

Usage: python3 tools/build-android-assets.py [--out artifacts/android-assets]
"""

from __future__ import annotations

import argparse
import ast
import base64
import hashlib
import json
import re
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def data_uri(path: Path, mime: str) -> str:
    return "data:" + mime + ";base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def replace_once(source: str, old: str, new: str) -> str:
    if source.count(old) != 1:
        raise ValueError("Expected exactly one Android asset substitution: " + old[:100])
    return source.replace(old, new, 1)


def compact_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "artifacts/android-assets")
    args = parser.parse_args()
    out = args.out.resolve()
    if out == ROOT or out in ROOT.parents or out == ROOT / "browser":
        raise ValueError("Output must be a dedicated build directory")
    out.mkdir(parents=True, exist_ok=True)
    for directory in ("countries", "portraits", "arenas", "legacy", "brand"):
        (out / directory).mkdir(exist_ok=True)

    builder_path = ROOT / "tools/build-browser.mjs"
    builder = builder_path.read_text()
    module_match = re.search(r"const files=(\[[^\n]+?\]);", builder)
    if not module_match:
        raise ValueError("Could not obtain the canonical browser module order")
    modules = ast.literal_eval(module_match.group(1))
    sources = {name: (ROOT / "browser/src" / (name + ".js")).read_text() for name in modules}
    built_sources = dict(sources)

    country_metadata_path = ROOT / "browser/assets/countries/metadata.json"
    country_metadata = json.loads(country_metadata_path.read_text())
    arena_metadata_path = ROOT / "browser/assets/arenas/metadata.json"
    arena_metadata = json.loads(arena_metadata_path.read_text())
    if len(country_metadata) != 196 or len(arena_metadata) != 30:
        raise ValueError("Expected the vetted 196-fighter, 30-arena game")

    countries = {}
    country_files = {}
    portraits = {}
    for country_id, art in sorted(country_metadata.items()):
        source_id = art.get("sourceCountryId", country_id)
        source = ROOT / "browser/assets/countries" / (source_id + ".webp")
        relative = "countries/" + country_id + ".webp"
        shutil.copyfile(source, out / relative)
        with Image.open(out / relative) as image:
            if image.format != "WEBP" or image.size != (art["width"], art["height"]):
                raise ValueError("Country atlas dimensions differ: " + country_id)
            image.verify()
        country_files[country_id] = relative
        portrait_source = ROOT / "browser/assets/countries" / (source_id + "-portrait.webp")
        portrait_relative = "portraits/" + country_id + ".webp"
        shutil.copyfile(portrait_source, out / portrait_relative)
        with Image.open(out / portrait_relative) as image:
            if image.format != "WEBP":
                raise ValueError("Country portrait is not WebP: " + country_id)
            image.verify()
        portraits[country_id] = portrait_relative
        countries[country_id] = {
            "path": relative,
            "sourceCountryId": source_id,
            "sourcePath": str(source.relative_to(ROOT)),
            "sourceSha256": sha256(source.read_bytes()),
            "portraitPath": portrait_relative,
            "portraitSourcePath": str(portrait_source.relative_to(ROOT)),
            "portraitSourceSha256": sha256(portrait_source.read_bytes()),
            "width": art["width"],
            "height": art["height"],
        }

    sprite_source = built_sources["country-sprites"]
    sprite_source = replace_once(sprite_source, "/* COUNTRY_ASSET_FILES */null", compact_json(country_files))
    sprite_source = replace_once(sprite_source, "/* COUNTRY_PORTRAIT_DATA */null", compact_json(portraits))
    # Keep the exact renderer, geometry, and bounded lazy cache. This branch is
    # the only added code in the generated modules; it skips the browser build's
    # registration-script transport when a local WebP URI is available.
    country_loader_anchor = " function loadImage(id){return new Promise((resolve,reject)=>{\n"
    country_loader_branch = (
        "  const local=ASSET_FILES?.[id];\n"
        "  if(local&&local.endsWith('.webp')){const image=new Image();"
        "image.onload=()=>resolve(image);"
        "image.onerror=()=>reject(new Error('Country fighter artwork could not load from this app.'));"
        "image.src=local;return;}\n"
    )
    built_sources["country-sprites"] = replace_once(
        sprite_source, country_loader_anchor, country_loader_anchor + country_loader_branch
    )

    arenas = {}
    arena_files = {}
    for arena_id, art in sorted(arena_metadata.items()):
        source = ROOT / "browser/assets/arenas" / (arena_id + ".webp")
        relative = "arenas/" + arena_id + ".webp"
        shutil.copyfile(source, out / relative)
        with Image.open(out / relative) as image:
            if image.format != "WEBP" or image.size != (art["width"], art["height"]):
                raise ValueError("Arena dimensions differ: " + arena_id)
            image.verify()
        digest = sha256(source.read_bytes())
        if digest != art["sha256"]:
            raise ValueError("Arena bytes differ from the vetted inventory: " + arena_id)
        arena_files[arena_id] = relative
        arenas[arena_id] = {"path": relative, "sourcePath": str(source.relative_to(ROOT)), "sourceSha256": digest}
    built_sources["arenas"] = replace_once(
        built_sources["arenas"], "/* ARENA_IMAGE_DATA */null", compact_json(arena_files)
    )

    legacy = {}
    image_files = {"JAPAN": "japan-poses", "PAKISTAN": "pakistan-poses", "HEADS": "fighter-heads", "BODY": "fighter-body"}
    for key, name in image_files.items():
        original = ROOT / "browser/assets" / (name + ".png")
        cached = ROOT / "artifacts/web-assets" / (name + ".webp")
        relative = "legacy/" + name + ".webp"
        with Image.open(original) as image:
            dimensions = image.size
            if cached.is_file() and cached.stat().st_mtime >= original.stat().st_mtime:
                shutil.copyfile(cached, out / relative)
            else:
                image.save(out / relative, "WEBP", quality=92, method=6)
        with Image.open(out / relative) as image:
            if image.format != "WEBP" or image.size != dimensions:
                raise ValueError("Legacy sprite dimensions differ: " + name)
            image.verify()
        built_sources["game"] = replace_once(
            built_sources["game"], "/* " + key + "_IMAGE_DATA */", relative
        )
        legacy[name] = {
            "path": relative,
            "sourcePath": str(original.relative_to(ROOT)),
            "sourceSha256": sha256(original.read_bytes()),
            "encoding": "WebP quality 92, method 6; same pixel dimensions",
        }

    voices = {}
    for key in ("fight", "ko", "getready", "timeover"):
        source = ROOT / "browser/assets/audio" / (key + ".wav")
        built_sources["audio"] = replace_once(
            built_sources["audio"], "/* AUDIO_" + key.upper() + "_DATA */", data_uri(source, "audio/wav")
        )
        voices[key] = {"sourcePath": str(source.relative_to(ROOT)), "sourceSha256": sha256(source.read_bytes())}

    program = "\n;\n".join(built_sources[name] for name in modules)
    if re.search(r"/\* (?:[A-Z_]+IMAGE_DATA|AUDIO_[A-Z]+_DATA|COUNTRY_(?:ASSET_FILES|PORTRAIT_DATA)) \*/", program):
        raise ValueError("Unresolved asset placeholder in the generated game")
    (out / "game.js").write_text(program)

    template_path = ROOT / "browser/template.html"
    neon_path = ROOT / "browser/landing-neon.css"
    brand_logo_path = ROOT / "browser/assets/branding/nation-clash-logo.webp"
    brand_metadata_path = ROOT / "browser/assets/branding/metadata.json"
    brand_logo_relative = "brand/logo.webp"
    shutil.copyfile(brand_logo_path, out / brand_logo_relative)
    with Image.open(out / brand_logo_relative) as image:
        if image.format != "WEBP":
            raise ValueError("The shared brand logo must be WebP")
        brand_logo_dimensions = image.size
        image.verify()
    brand_logo_hash = sha256(brand_logo_path.read_bytes())
    brand_metadata = json.loads(brand_metadata_path.read_text())
    if brand_logo_hash != brand_metadata["exports"][str(brand_logo_path.relative_to(ROOT))]["sha256"]:
        raise ValueError("Brand logo bytes differ from the supplied artwork inventory")
    html = replace_once(template_path.read_text(), "/* LANDING_NEON_CSS */", neon_path.read_text())
    if html.count("/* BRAND_LOGO_DATA */") != 2:
        raise ValueError("Expected the shared brand logo in the header and landing page")
    html = html.replace("/* BRAND_LOGO_DATA */", brand_logo_relative)
    html = replace_once(
        html,
        "<script>/* COMBAT_SOURCE */</script><script>/* GAME_SOURCE */</script>",
        '<script src="game.js"></script>',
    )
    # Retain all responsive game CSS and controls without Android-specific DOM
    # changes. The native wrapper owns window insets and system bar behavior.
    (out / "index.html").write_text(html)

    credit_paths = [
        "browser/assets/README.md", "browser/assets/audio/README.md",
        "browser/assets/countries/README.md", "browser/assets/arenas/README.md",
        "docs/AUDIO-DESIGN.md", "browser/assets/flags/LICENSE.txt",
    ]
    credits = "NATIONCLASH OFFLINE ANDROID TEST BUILD\n\n" + "\n\n".join(
        (ROOT / path).read_text() for path in credit_paths
    )
    credits += "\n\nAndroid packaging loads original assigned country/arena WebP files locally; no hosting or account is required.\n"
    credits += "NationClash brand artwork was prepared from the user-supplied visual reference.\n"
    credits += "The same local logo appears in the header and landing page. Logo WebP SHA256: " + brand_logo_hash + ".\n"
    (out / "CREDITS.txt").write_text(credits)

    expected_files = {"index.html", "game.js", "CREDITS.txt", brand_logo_relative}
    expected_files.update(country_files.values())
    expected_files.update(portraits.values())
    expected_files.update(arena_files.values())
    expected_files.update(record["path"] for record in legacy.values())
    actual_files = {str(path.relative_to(out)) for path in out.rglob("*") if path.is_file()}
    if actual_files - expected_files - {"asset-manifest.json"}:
        raise ValueError("Unexpected stale files in Android output: " + str(sorted(actual_files - expected_files - {"asset-manifest.json"})))
    files = {
        relative: {"bytes": (out / relative).stat().st_size, "sha256": sha256((out / relative).read_bytes())}
        for relative in sorted(expected_files)
    }
    manifest = {
        "format": 1,
        "game": "NationClash neon 2D, 196 country fighters, 30 arenas",
        "assetOrigin": "https://appassets.androidplatform.net/assets/",
        "moduleOrder": modules,
        "modules": {
            name: {
                "sourcePath": "browser/src/" + name + ".js",
                "sourceSha256": sha256(sources[name].encode()),
                "bundledSha256": sha256(built_sources[name].encode()),
                "unchanged": sources[name] == built_sources[name],
            }
            for name in modules
        },
        "sourceInputs": {
            str(path.relative_to(ROOT)): sha256(path.read_bytes())
            for path in (Path(__file__).resolve(), builder_path, template_path, neon_path, country_metadata_path, arena_metadata_path, brand_logo_path, brand_metadata_path)
        },
        "transformations": [
            "Asset URI marker substitutions only in arenas, country-sprites, game and audio modules.",
            "country-sprites.loadImage accepts local WebP URLs before its unchanged browser transports.",
            "Canonical template and neon CSS load one local game.js instead of an inline script.",
            "Country files preserve logical country IDs and copy the metadata-assigned sourceCountryId bytes.",
            "Header and landing logo markers use one shared, byte-identical local WebP brand asset.",
        ],
        "branding": {
            "name": "NationClash",
            "path": brand_logo_relative,
            "sourcePath": str(brand_logo_path.relative_to(ROOT)),
            "sourceSha256": brand_logo_hash,
            "width": brand_logo_dimensions[0],
            "height": brand_logo_dimensions[1],
        },
        "countries": countries,
        "arenas": arenas,
        "legacy": legacy,
        "voices": voices,
        "files": files,
        "fileCount": len(files),
        "totalBytes": sum(record["bytes"] for record in files.values()),
    }
    (out / "asset-manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "output": str(out), "countries": len(countries), "arenas": len(arenas),
        "files": len(files), "totalBytes": manifest["totalBytes"],
        "htmlBytes": files["index.html"]["bytes"], "programBytes": files["game.js"]["bytes"],
        "unchangedModules": [name for name in modules if manifest["modules"][name]["unchanged"]],
    }, indent=2))


if __name__ == "__main__":
    main()
