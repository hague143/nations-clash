#!/usr/bin/env python3
"""Prepare pinned official bundletool, Build Tools 36 and Android API36 locally.

Downloads stay under ignored artifacts/android-toolchain. Both Google's
published archive SHA1 and pinned SHA256 are verified; cached files are checked
again. This does not replace the API35 tools used by the existing test APK.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import shlex
import shutil
import stat
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
BUNDLETOOL = {
    "version": "1.18.3",
    "filename": "bundletool-all-1.18.3.jar",
    "url": "https://github.com/google/bundletool/releases/download/1.18.3/bundletool-all-1.18.3.jar",
    "sha256": "a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29",
}
BUILD_TOOLS = {
    "version": "36.0.0",
    "filename": "build-tools_r36_linux.zip",
    "url": "https://dl.google.com/android/repository/build-tools_r36_linux.zip",
    "sha1": "b0b6376977657e8ad9b969bacf4093601da2c6fb",
    "sha256": "5d9ac77fb6ff43d9da518a337b4fcf8f9097113df531d99ccefe80ef7ce8250b",
}
PLATFORM = {
    "api": 36,
    "revision": 2,
    "filename": "platform-36_r02.zip",
    "url": "https://dl.google.com/android/repository/platform-36_r02.zip",
    "sha1": "2c1a80dd4d9f7d0e6dd336ec603d9b5c55a6f576",
    "sha256": "37607369a28c5b640b3a7998868d45898ebcb777565a0e85f9acf36f29631d2e",
}
ANDROID_JAR_SHA256 = "d9eb9da824d9e247a352f570f01e1169e725b2954bca9e283a71786c59b59f9a"
JAVA_MODULES = {
    "javac": "jdk.compiler/com.sun.tools.javac.Main",
    "jar": "jdk.jartool/sun.tools.jar.Main",
    "keytool": "java.base/sun.security.tools.keytool.Main",
    "jarsigner": "jdk.jartool/sun.security.tools.jarsigner.Main",
}


def helpers():
    spec = importlib.util.spec_from_file_location("nationclash_android_setup", ROOT / "tools/setup-android-toolchain.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run(*args):
    return subprocess.run([str(a) for a in args], check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT).stdout.strip()


def members(archive):
    entries = archive.infolist()
    if sum(entry.file_size for entry in entries) > 256 * 1024 * 1024:
        raise ValueError("Build Tools archive exceeds the extraction size limit")
    seen = set()
    for entry in entries:
        path = PurePosixPath(entry.filename)
        kind = stat.S_IFMT(entry.external_attr >> 16)
        if (path.is_absolute() or not path.parts or path.parts[0] != "android-16"
                or ".." in path.parts or "\\" in entry.filename
                or path.as_posix() in seen or kind not in (0, stat.S_IFREG, stat.S_IFDIR)):
            raise ValueError("Unsafe Build Tools member: " + entry.filename)
        seen.add(path.as_posix())
    return entries


def prepare(directory):
    helper = helpers()
    java = shutil.which("java")
    if not java:
        raise ValueError("Java 17+ with compiler, jar, keytool and jarsigner modules is required")
    module_names = {line.split("@", 1)[0] for line in run(java, "--list-modules").splitlines()}
    missing = {module.split("/", 1)[0] for module in JAVA_MODULES.values()} - module_names
    if missing:
        raise ValueError("Missing Java modules: " + ", ".join(sorted(missing)))
    directory.mkdir(parents=True, exist_ok=True)
    downloads = {}
    for dependency in (BUNDLETOOL, BUILD_TOOLS, PLATFORM):
        path = helper.checked_download(directory, dependency)
        if dependency.get("sha1"):
            with path.open("rb") as stream:
                if hashlib.file_digest(stream, "sha1").hexdigest() != dependency["sha1"]:
                    raise ValueError("Published SDK repository SHA1 mismatch: " + path.name)
        downloads[dependency["filename"]] = path

    sdk = directory / "sdk"
    if sdk.is_symlink():
        raise ValueError("Refusing a symlink for the SDK directory")
    sdk.mkdir(exist_ok=True)
    tools = sdk / "android-16"
    with zipfile.ZipFile(downloads[BUILD_TOOLS["filename"]]) as archive:
        entries = members(archive)
        if tools.exists() or tools.is_symlink():
            for entry in entries:
                if entry.is_dir():
                    continue
                path = sdk / entry.filename
                if not helper.regular_file_under(path, sdk) or path.stat().st_size != entry.file_size:
                    raise ValueError("Changed SDK extraction; remove sdk/android-16 and rerun: " + str(path))
                with archive.open(entry) as stream:
                    expected = hashlib.file_digest(stream, "sha256").hexdigest()
                if helper.sha256(path) != expected:
                    raise ValueError("SDK extraction checksum differs: " + str(path))
                path.chmod(0o755 if (entry.external_attr >> 16) & 0o111 else 0o644)
            print("Verified cached extracted Build Tools 36.0.0", flush=True)
        else:
            with tempfile.TemporaryDirectory(prefix=".extract-android36-", dir=directory) as temporary:
                staging = Path(temporary)
                for entry in entries:
                    target = staging / entry.filename
                    if entry.is_dir():
                        target.mkdir(parents=True, exist_ok=True)
                        continue
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with archive.open(entry) as source, target.open("wb") as output:
                        shutil.copyfileobj(source, output, length=1024 * 1024)
                    target.chmod(0o755 if (entry.external_attr >> 16) & 0o111 else 0o644)
                (staging / "android-16").replace(tools)
            print("Safely extracted Build Tools 36.0.0", flush=True)

    android_jar = directory / "android-36.jar"
    if android_jar.is_symlink():
        raise ValueError("Refusing a symlink for android-36.jar")
    if android_jar.exists():
        if helper.sha256(android_jar) != ANDROID_JAR_SHA256:
            raise ValueError("android-36.jar checksum differs; remove it and rerun")
    else:
        with zipfile.ZipFile(downloads[PLATFORM["filename"]]) as archive:
            contents = archive.read("android-36/android.jar")
        if hashlib.sha256(contents).hexdigest() != ANDROID_JAR_SHA256:
            raise ValueError("Official platform archive android.jar checksum differs")
        android_jar.write_bytes(contents)
        android_jar.chmod(0o644)

    launchers = directory / "bin"
    if launchers.is_symlink():
        raise ValueError("Refusing a symlink for Java launchers")
    launchers.mkdir(exist_ok=True)
    for name, module in JAVA_MODULES.items():
        launcher = launchers / name
        if launcher.is_symlink():
            raise ValueError("Refusing a Java launcher symlink: " + str(launcher))
        launcher.write_text(f'#!/bin/sh\nexec {shlex.quote(java)} -m {module} "$@"\n')
        launcher.chmod(0o755)
    bundletool = downloads[BUNDLETOOL["filename"]]
    versions = {
        "bundletool": run(java, "-jar", bundletool, "version"),
        "javac": run(launchers / "javac", "-version"),
        "aapt2": run(tools / "aapt2", "version"),
        "d8": run(tools / "d8", "--version"),
        "apksigner": run(tools / "apksigner", "version"),
    }
    if versions["bundletool"] != BUNDLETOOL["version"]:
        raise ValueError("Unexpected bundletool version")
    manifest = {
        "bundletool": {**BUNDLETOOL, "path": str(bundletool)},
        "buildTools": {**BUILD_TOOLS, "path": str(tools)},
        "platform": PLATFORM,
        "androidJar": {"api": 36, "path": str(android_jar), "sha256": ANDROID_JAR_SHA256},
        "sdkRepositoryMetadata": "https://dl.google.com/android/repository/repository2-3.xml",
        "java": {"executable": java, "modules": JAVA_MODULES},
        "versions": versions,
    }
    manifest_path = directory / "bundletool.json"
    if manifest_path.is_symlink():
        raise ValueError("Refusing a symlink for bundletool.json")
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"toolchain": str(manifest_path), "versions": versions}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=ROOT / "artifacts/android-toolchain")
    args = parser.parse_args()
    prepare(args.directory.resolve())


if __name__ == "__main__":
    main()
