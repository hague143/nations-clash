"""Build and verify the offline neon 2D Android test APK without Unity/Gradle.

Prerequisites: python3 tools/setup-android-toolchain.py; Python Pillow for artwork.
The private, local test signing key stays under ignored artifacts/. Retain it to
install future builds as updates. This script does not publish to Google Play.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: object, capture: bool = False) -> str:
    result = subprocess.run([str(arg) for arg in args], cwd=ROOT, check=True,
                            text=True, stdout=subprocess.PIPE if capture else None)
    return result.stdout if capture else ""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-assets", action="store_true", help="Reuse assets only after verifying source and payload hashes")
    parser.add_argument("--out", type=Path, default=ROOT / "downloads/NationClash-Android-test.apk")
    args = parser.parse_args()
    toolchain = ROOT / "artifacts/android-toolchain"
    bt = toolchain / "sdk/android-15"
    android_jar = toolchain / "android-35.jar"
    if not all((bt / name).is_file() for name in ("aapt", "d8", "zipalign", "apksigner")) or not android_jar.is_file():
        raise RuntimeError("Run python3 tools/setup-android-toolchain.py first")
    if digest(android_jar) != "4566663c3876e022b4fa4ced8c8697c4ab1688267f090114fd92d027b32e619b":
        raise ValueError("API35 android.jar checksum mismatch; rerun toolchain setup")

    assets = ROOT / "artifacts/android-assets"
    if not args.skip_assets:
        run(sys.executable, ROOT / "tools/build-android-assets.py", "--out", assets)
    manifest_path = assets / "asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    source_hashes = dict(manifest["sourceInputs"])
    for entry in manifest["modules"].values():
        source_hashes[entry["sourcePath"]] = entry["sourceSha256"]
    for entry in manifest["countries"].values():
        source_hashes[entry["sourcePath"]] = entry["sourceSha256"]
        source_hashes[entry["portraitSourcePath"]] = entry["portraitSourceSha256"]
    for group in ("arenas", "legacy", "voices"):
        for entry in manifest[group].values():
            source_hashes[entry["sourcePath"]] = entry["sourceSha256"]
    for relative, expected in source_hashes.items():
        if digest(ROOT / relative) != expected:
            raise ValueError("Stale assets: source changed: " + relative)
    for relative, record in manifest["files"].items():
        if digest(assets / relative) != record["sha256"]:
            raise ValueError("Asset checksum mismatch: " + relative)
    if len(manifest["countries"]) != 196 or len(manifest["arenas"]) != 30:
        raise ValueError("The APK must contain all 196 fighters and 30 arenas")

    build = ROOT / "artifacts/android-build"
    build.mkdir(parents=True, exist_ok=True)
    for directory in ("classes", "gen", "dex"):
        target = build / directory
        if target.exists():
            shutil.rmtree(target)
        target.mkdir()
    app = ROOT / "android/app/src/main"
    native_manifest = ET.parse(app / "AndroidManifest.xml").getroot()
    android_ns = "{http://schemas.android.com/apk/res/android}"
    version_code = int(native_manifest.attrib[android_ns + "versionCode"])
    version_name = native_manifest.attrib[android_ns + "versionName"]
    unsigned = build / "unsigned.apk"
    aligned = build / "aligned.apk"
    output = args.out.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    run(bt / "aapt", "package", "-f", "-m", "-J", build / "gen", "-M", app / "AndroidManifest.xml",
        "-S", app / "res", "-A", assets, "-I", android_jar, "-F", unsigned)
    sources = sorted((app / "java").rglob("*.java")) + sorted((build / "gen").rglob("*.java"))
    run(toolchain / "bin/javac", "-source", "8", "-target", "8", "-bootclasspath", android_jar,
        "-d", build / "classes", *sources)
    run(toolchain / "bin/jar", "--create", "--file", build / "classes.jar", "-C", build / "classes", ".")
    run(bt / "d8", "--min-api", "26", "--lib", android_jar, "--output", build / "dex", build / "classes.jar")
    with zipfile.ZipFile(unsigned, "a", compression=zipfile.ZIP_DEFLATED) as apk:
        for dex in sorted((build / "dex").glob("*.dex")):
            apk.write(dex, dex.name)
    run(bt / "zipalign", "-f", "4", unsigned, aligned)

    # Conventional local debug key, never tracked or uploaded. No user credential.
    key = toolchain / "nationclash-test.keystore"
    if not key.exists():
        run(toolchain / "bin/keytool", "-genkeypair", "-keystore", key, "-storepass", "android",
            "-keypass", "android", "-alias", "androiddebugkey", "-keyalg", "RSA", "-keysize", "2048",
            "-validity", "10000", "-dname", "CN=NationClash Test, O=NationClash, C=PK")
        key.chmod(0o600)
    run(bt / "apksigner", "sign", "--ks", key, "--ks-key-alias", "androiddebugkey",
        "--ks-pass", "pass:android", "--key-pass", "pass:android", "--v1-signing-enabled", "false",
        "--v2-signing-enabled", "true", "--v3-signing-enabled", "true", "--v4-signing-enabled", "false",
        "--out", output, aligned)
    signature = run(bt / "apksigner", "verify", "--verbose", "--print-certs", output, capture=True)
    if "Verified using v2 scheme (APK Signature Scheme v2): true" not in signature or "Verified using v3 scheme (APK Signature Scheme v3): true" not in signature:
        raise ValueError("Expected valid APK v2 and v3 signatures")
    run(bt / "zipalign", "-c", "4", output)
    badging = run(bt / "aapt", "dump", "badging", output, capture=True)
    if "name='com.nationclash.game'" not in badging or "sdkVersion:'26'" not in badging or "targetSdkVersion:'35'" not in badging:
        raise ValueError("Unexpected Android package or SDK metadata")
    if output.stat().st_size >= 100 * 1024 * 1024:
        raise ValueError("APK exceeds GitHub's 100 MiB file limit")
    with zipfile.ZipFile(output) as apk:
        if apk.testzip() is not None:
            raise ValueError("APK ZIP CRC validation failed")
        names = set(apk.namelist())
        if not {"classes.dex", "AndroidManifest.xml", "resources.arsc"} <= names:
            raise ValueError("Missing Android executable/resources")
        if any(name.startswith("lib/") for name in names):
            raise ValueError("Unexpected architecture-specific native library")
        for relative, record in manifest["files"].items():
            payload = apk.read("assets/" + relative)
            if len(payload) != record["bytes"] or hashlib.sha256(payload).hexdigest() != record["sha256"]:
                raise ValueError("APK payload differs: " + relative)
        if apk.read("assets/asset-manifest.json") != manifest_path.read_bytes():
            raise ValueError("APK asset inventory differs")
    (build / "signature.txt").write_text(signature)
    (build / "badging.txt").write_text(badging)
    report = {
        "format": 1, "apk": str(output.relative_to(ROOT)) if output.is_relative_to(ROOT) else str(output),
        "bytes": output.stat().st_size, "sha256": digest(output), "package": "com.nationclash.game",
        "versionName": version_name, "versionCode": version_code, "minSdk": 26, "targetSdk": 35,
        "universalWebViewApk": True, "signatureV2": True, "signatureV3": True, "zipAligned": True,
        "verifiedBundledFiles": manifest["fileCount"], "countries": 196, "arenas": 30,
        "assetManifestSha256": digest(manifest_path), "sourceInputs": source_hashes,
        "nativeInputs": {str(p.relative_to(ROOT)): digest(p) for p in sorted(app.rglob("*")) if p.is_file()},
        "signatureVerification": signature, "androidBadging": badging,
        "runtimeTesting": "Separate device/emulator validation required; this script verifies the build only.",
    }
    (build / "build-report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps({k: report[k] for k in ("apk", "bytes", "sha256", "countries", "arenas", "signatureV2", "signatureV3")}, indent=2))


if __name__ == "__main__":
    main()
