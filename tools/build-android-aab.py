#!/usr/bin/env python3
"""Build a signed Play Console Android App Bundle and verify its generated APK.

The release manifest overrides only version, SDK and debuggable metadata in an
ignored build copy. The existing test APK and its signing key remain untouched.
A separate private upload key and random password stay under ignored artifacts/
android-signing; retain those files securely for future uploads. Nothing is
uploaded to Play Console by this script.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ANDROID_NS = "http://schemas.android.com/apk/res/android"
A = "{" + ANDROID_NS + "}"
PACKAGE = "com.nationclash.game"
MIN_SDK = 26
TARGET_SDK = 36
VERSION_CODE = 3
VERSION_NAME = "0.2.1"
KEY_ALIAS = "nationclash-upload"


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def run(*args, capture=False):
    result = subprocess.run([str(arg) for arg in args], cwd=ROOT, check=True, text=True,
                            stdout=subprocess.PIPE if capture else None,
                            stderr=subprocess.STDOUT if capture else None)
    return result.stdout if capture else ""


def validate_assets(assets):
    manifest_path = assets / "asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    source_hashes = dict(manifest["sourceInputs"])
    for record in manifest["modules"].values():
        source_hashes[record["sourcePath"]] = record["sourceSha256"]
    for record in manifest["countries"].values():
        source_hashes[record["sourcePath"]] = record["sourceSha256"]
        source_hashes[record["portraitSourcePath"]] = record["portraitSourceSha256"]
    for group in ("arenas", "legacy", "voices"):
        for record in manifest[group].values():
            source_hashes[record["sourcePath"]] = record["sourceSha256"]
    for relative, expected in source_hashes.items():
        if digest(ROOT / relative) != expected:
            raise ValueError("Stale Android assets; source changed: " + relative)
    expected_files = set(manifest["files"]) | {"asset-manifest.json"}
    actual_files = {str(path.relative_to(assets)) for path in assets.rglob("*") if path.is_file()}
    if actual_files != expected_files:
        raise ValueError("Bundled asset inventory does not match the asset directory")
    for relative, record in manifest["files"].items():
        path = assets / relative
        if path.stat().st_size != record["bytes"] or digest(path) != record["sha256"]:
            raise ValueError("Android asset checksum mismatch: " + relative)
    if len(manifest["countries"]) != 196 or len(manifest["arenas"]) != 30:
        raise ValueError("Release must contain all 196 fighters and 30 arenas")
    return manifest, source_hashes


def release_manifest(source, destination):
    ET.register_namespace("android", ANDROID_NS)
    tree = ET.parse(source)
    manifest = tree.getroot()
    if manifest.get("package") != PACKAGE:
        raise ValueError("Unexpected package ID in native manifest")
    manifest.set(A + "versionCode", str(VERSION_CODE))
    manifest.set(A + "versionName", VERSION_NAME)
    uses_sdk = manifest.find("uses-sdk")
    if uses_sdk is None:
        uses_sdk = ET.SubElement(manifest, "uses-sdk")
    uses_sdk.set(A + "minSdkVersion", str(MIN_SDK))
    uses_sdk.set(A + "targetSdkVersion", str(TARGET_SDK))
    application = manifest.find("application")
    if application is None:
        raise ValueError("Missing application manifest element")
    application.set(A + "debuggable", "false")
    application.set(A + "testOnly", "false")
    tree.write(destination, encoding="utf-8", xml_declaration=True)


def private_upload_key(toolchain):
    directory = ROOT / "artifacts/android-signing"
    if directory.is_symlink():
        raise ValueError("Refusing a symlink for private Android signing storage")
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    directory.chmod(0o700)
    key = directory / "nationclash-upload.p12"
    password = directory / "upload-password.txt"
    for path in (key, password):
        if path.is_symlink():
            raise ValueError("Refusing a symlink for private signing files")
    if key.exists() != password.exists():
        raise ValueError("Private upload-key storage is incomplete; restore the matching key/password backup. No key was replaced.")
    if not key.exists():
        descriptor = os.open(password, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(descriptor, "w") as target:
            target.write(secrets.token_urlsafe(48) + "\n")
        run(toolchain / "bin/keytool", "-genkeypair", "-keystore", key,
            "-storetype", "PKCS12", "-storepass:file", password, "-keypass:file", password,
            "-alias", KEY_ALIAS, "-keyalg", "RSA", "-keysize", "4096",
            "-sigalg", "SHA256withRSA", "-validity", "10000",
            "-dname", "CN=NationClash Upload, O=NationClash, C=PK")
        print("Created a separate private upload key under ignored artifacts/android-signing.")
    key.chmod(0o600)
    password.chmod(0o600)
    # Only the public certificate is included in build provenance.
    public_certificate = directory / "upload-certificate.der"
    if public_certificate.is_symlink():
        raise ValueError("Refusing a symlink for the upload public certificate")
    run(toolchain / "bin/keytool", "-exportcert", "-keystore", key,
        "-storepass:file", password, "-alias", KEY_ALIAS, "-file", public_certificate)
    public_certificate.chmod(0o644)
    return key, password, digest(public_certificate)


def verify_archive_assets(archive, prefix, assets, inventory):
    if archive.testzip() is not None:
        raise ValueError("Archive failed ZIP CRC validation")
    if len(set(archive.namelist())) != len(archive.namelist()):
        raise ValueError("Archive contains duplicate file names")
    actual = {name[len(prefix):] for name in archive.namelist() if name.startswith(prefix) and not name.endswith("/")}
    if actual != set(inventory["files"]) | {"asset-manifest.json"}:
        raise ValueError("Archive asset inventory differs")
    for relative, record in inventory["files"].items():
        payload = archive.read(prefix + relative)
        if len(payload) != record["bytes"] or hashlib.sha256(payload).hexdigest() != record["sha256"]:
            raise ValueError("Archive asset checksum differs: " + relative)
    if archive.read(prefix + "asset-manifest.json") != (assets / "asset-manifest.json").read_bytes():
        raise ValueError("Archive asset-manifest.json differs")
    if any(name.endswith(".so") or name.startswith(("lib/", "base/lib/")) for name in archive.namelist()):
        raise ValueError("Unexpected bundled native code; native page-size verification would be required")


def verify_metadata(manifest_xml):
    tree = ET.fromstring(manifest_xml)
    uses_sdk = tree.find("uses-sdk")
    application = tree.find("application")
    expected = {
        "package": tree.get("package") == PACKAGE,
        "versionCode": tree.get(A + "versionCode") == str(VERSION_CODE),
        "versionName": tree.get(A + "versionName") == VERSION_NAME,
        "minSdk": uses_sdk is not None and uses_sdk.get(A + "minSdkVersion") == str(MIN_SDK),
        "targetSdk": uses_sdk is not None and uses_sdk.get(A + "targetSdkVersion") == str(TARGET_SDK),
        "debuggableFalse": application is not None and application.get(A + "debuggable", "false") == "false",
        "testOnlyFalse": application is not None and application.get(A + "testOnly", "false") == "false",
        "compileSdk": tree.get(A + "compileSdkVersion") == str(TARGET_SDK),
    }
    if not all(expected.values()):
        raise ValueError("Unexpected release bundle manifest metadata: " + json.dumps(expected))
    return expected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-assets", action="store_true", help="Reuse assets only after source/payload verification")
    parser.add_argument("--out", type=Path, default=ROOT / "downloads/NationClash-PlayStore.aab")
    args = parser.parse_args()
    toolchain = ROOT / "artifacts/android-toolchain"
    run(sys.executable, ROOT / "tools/setup-android-bundletool.py")
    tooling = json.loads((toolchain / "bundletool.json").read_text())
    bt = Path(tooling["buildTools"]["path"])
    android_jar = Path(tooling["androidJar"]["path"])
    java = tooling["java"]["executable"]
    bundletool = Path(tooling["bundletool"]["path"])

    def bundle(*command, capture=False):
        return run(java, "-Xmx2g", "-jar", bundletool, *command, capture=capture)

    assets = ROOT / "artifacts/android-assets"
    if not args.skip_assets:
        run(sys.executable, ROOT / "tools/build-android-assets.py", "--out", assets)
    inventory, source_hashes = validate_assets(assets)
    app = ROOT / "android/app/src/main"
    source_files = sorted(app.rglob("*"))
    if any("setWebContentsDebuggingEnabled(true)" in path.read_text() for path in (app / "java").rglob("*.java")):
        raise ValueError("Native WebView debugging must follow the release debuggable flag or be disabled")
    build = ROOT / "artifacts/android-aab-build"
    build.mkdir(parents=True, exist_ok=True)
    for name in ("classes", "gen", "dex"):
        directory = build / name
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir()
    manifest_path = build / "AndroidManifest.release.xml"
    release_manifest(app / "AndroidManifest.xml", manifest_path)
    compiled = build / "compiled-resources.zip"
    compiled.unlink(missing_ok=True)
    run(bt / "aapt2", "compile", "--dir", app / "res", "-o", compiled)
    linked = build / "base-resources.ap_"
    run(bt / "aapt2", "link", "--proto-format", "--auto-add-overlay", "--java", build / "gen",
        "--manifest", manifest_path, "-I", android_jar,
        "--compile-sdk-version-code", TARGET_SDK, "--compile-sdk-version-name", "16",
        "-o", linked, compiled)
    sources = sorted((app / "java").rglob("*.java")) + sorted((build / "gen").rglob("*.java"))
    run(toolchain / "bin/javac", "-source", "8", "-target", "8", "-bootclasspath", android_jar,
        "-d", build / "classes", *sources)
    run(toolchain / "bin/jar", "--create", "--file", build / "classes.jar", "-C", build / "classes", ".")
    run(bt / "d8", "--release", "--min-api", MIN_SDK, "--lib", android_jar,
        "--output", build / "dex", build / "classes.jar")
    module = build / "base.zip"
    with zipfile.ZipFile(module, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as base:
        with zipfile.ZipFile(linked) as resources:
            for info in resources.infolist():
                if info.is_dir():
                    continue
                name = "manifest/AndroidManifest.xml" if info.filename == "AndroidManifest.xml" else info.filename
                if name == "resources.arsc":
                    raise ValueError("AAB resources must be protobuf, not APK resources.arsc")
                base.writestr(name, resources.read(info))
        for dex in sorted((build / "dex").glob("*.dex")):
            base.write(dex, "dex/" + dex.name)
        for path in sorted(assets.rglob("*")):
            if path.is_file():
                base.write(path, "assets/" + str(path.relative_to(assets)))
    unsigned = build / "unsigned.aab"
    bundle("build-bundle", "--modules=" + str(module), "--output=" + str(unsigned), "--overwrite")
    key, password, certificate_sha256 = private_upload_key(toolchain)
    signed = build / "signed.aab"
    shutil.copyfile(unsigned, signed)
    run(toolchain / "bin/jarsigner", "-keystore", key, "-storetype", "PKCS12",
        "-storepass:file", password, "-keypass:file", password,
        "-sigalg", "SHA256withRSA", "-digestalg", "SHA-256", signed, KEY_ALIAS)
    signature = run(toolchain / "bin/jarsigner", "-verify", "-strict", "-verbose", "-certs",
                    "-keystore", key, "-storepass:file", password, signed, KEY_ALIAS, capture=True)
    if "jar verified." not in signature:
        raise ValueError("Signed AAB JAR signature did not verify")
    validation = bundle("validate", "--bundle=" + str(signed), capture=True)
    manifest_xml = bundle("dump", "manifest", "--bundle=" + str(signed), "--module=base", capture=True)
    metadata_checks = verify_metadata(manifest_xml)
    with zipfile.ZipFile(signed) as archive:
        required = {"BundleConfig.pb", "base/manifest/AndroidManifest.xml", "base/resources.pb", "base/dex/classes.dex"}
        if not required <= set(archive.namelist()):
            raise ValueError("Missing AAB protobuf manifest/resources or executable DEX")
        verify_archive_assets(archive, "base/assets/", assets, inventory)
    if signed.stat().st_size >= 100 * 1024 * 1024:
        raise ValueError("AAB exceeds GitHub's 100 MiB file limit")

    # Prove that the bundle converts to a signed, structurally valid installable
    # APK. It stays ignored: users receive the separate test APK from its builder.
    apk_set = build / "universal.apks"
    bundle("build-apks", "--bundle=" + str(signed), "--output=" + str(apk_set),
           "--mode=universal", "--max-threads=2", "--aapt2=" + str(bt / "aapt2"),
           "--ks=" + str(key), "--ks-key-alias=" + KEY_ALIAS,
           "--ks-pass=file:" + str(password), "--key-pass=file:" + str(password), "--overwrite")
    universal = build / "universal.apk"
    with zipfile.ZipFile(apk_set) as archive:
        universal.write_bytes(archive.read("universal.apk"))
    apk_signature = run(bt / "apksigner", "verify", "--verbose", "--print-certs", universal, capture=True)
    if "Verified using v2 scheme (APK Signature Scheme v2): true" not in apk_signature:
        raise ValueError("Bundle-generated universal APK lacks a valid v2 signature")
    expected_cert = re.search(r"Signer #1 certificate SHA-256 digest: ([0-9a-fA-F]+)", apk_signature)
    if not expected_cert or expected_cert.group(1).lower() != certificate_sha256:
        raise ValueError("Universal APK signer differs from the private upload certificate")
    alignment = run(bt / "zipalign", "-c", "-P", "16", "-v", "4", universal, capture=True)
    badging = run(bt / "aapt", "dump", "badging", universal, capture=True)
    checks = ["name='" + PACKAGE + "'", "versionCode='" + str(VERSION_CODE) + "'",
              "versionName='" + VERSION_NAME + "'", "sdkVersion:'26'", "targetSdkVersion:'36'", "compileSdkVersion='36'"]
    if not all(part in badging for part in checks) or "application-debuggable" in badging:
        raise ValueError("Bundle-generated APK metadata/debug status differs")
    with zipfile.ZipFile(universal) as archive:
        verify_archive_assets(archive, "assets/", assets, inventory)
        if not {"classes.dex", "AndroidManifest.xml", "resources.arsc"} <= set(archive.namelist()):
            raise ValueError("Bundle-generated APK lacks executable/resource files")

    output = args.out.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(signed, output)
    output.chmod(0o644)
    checksum = digest(output)
    output.with_suffix(output.suffix + ".sha256").write_text(checksum + "  " + output.name + "\n")
    reports = {"aab-signature.txt": signature, "bundle-validation.txt": validation,
               "release-manifest.xml": manifest_xml, "universal-signature.txt": apk_signature,
               "universal-badging.txt": badging, "universal-alignment.txt": alignment}
    for name, content in reports.items():
        (build / name).write_text(content)
    report = {
        "format": 1, "aab": str(output.relative_to(ROOT)) if output.is_relative_to(ROOT) else str(output),
        "bytes": output.stat().st_size, "sha256": checksum,
        "package": PACKAGE, "versionCode": VERSION_CODE, "versionName": VERSION_NAME,
        "minSdk": MIN_SDK, "targetSdk": TARGET_SDK, "compileSdk": TARGET_SDK,
        "debuggable": False, "testOnly": False, "jarSignatureVerifiedStrict": True,
        "bundletoolValidated": True, "bundletoolVersion": tooling["bundletool"]["version"],
        "uploadCertificateSha256": certificate_sha256,
        "privateSigningStorage": "Ignored local artifacts/android-signing; never bundled, committed or published.",
        "metadataChecks": metadata_checks, "nativeLibraries": 0,
        "native16KBPageSizeRequirement": "Not applicable: app bundles no native shared libraries; system WebView is provided by Android.",
        "universalApk": {"path": str(universal.relative_to(ROOT)), "bytes": universal.stat().st_size,
                         "sha256": digest(universal), "signatureV2": True, "zipalign16KBCheck": True},
        "verifiedBundledFiles": inventory["fileCount"], "countries": 196, "arenas": 30,
        "assetManifestSha256": digest(assets / "asset-manifest.json"), "sourceInputs": source_hashes,
        "nativeInputs": {str(path.relative_to(ROOT)): digest(path) for path in source_files if path.is_file()},
        "releaseManifestSha256": digest(manifest_path),
        "toolchainInputs": {"setup": digest(ROOT / "tools/setup-android-bundletool.py"),
                            "builder": digest(Path(__file__)), "manifest": digest(toolchain / "bundletool.json")},
        "runtimeTesting": "Build/conversion/signatures/assets checked. Device runtime validation is separate.",
        "publication": "Not uploaded to Play Console; store listing, account checks and review remain separate.",
    }
    (build / "build-report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps({key: report[key] for key in ("aab", "bytes", "sha256", "targetSdk", "countries", "arenas", "jarSignatureVerifiedStrict", "bundletoolValidated")}, indent=2))


if __name__ == "__main__":
    main()
