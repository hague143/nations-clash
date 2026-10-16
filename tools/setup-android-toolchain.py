#!/usr/bin/env python3
"""Prepare the pinned, local Linux Android tools used to build the test APK.

Only Python's standard library and a Java runtime containing the compiler,
jar and keytool modules are required. Nothing is installed globally. Cached
downloads and extracted build tools are checked again on every invocation.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import shutil
import stat
import subprocess
import tempfile
import urllib.request
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parent.parent
BUILD_TOOLS = {
    "version": "35.0.0",
    "filename": "build-tools_r35_linux.zip",
    "url": "https://dl.google.com/android/repository/build-tools_r35_linux.zip",
    "sha256": "bd3a4966912eb8b30ed0d00b0cda6b6543b949d5ffe00bea54c04c81e1561d88",
}
ANDROID_JAR = {
    "api": 35,
    "filename": "android-35.jar",
    "url": "https://raw.githubusercontent.com/Sable/android-platforms/master/android-35/android.jar",
    "sha256": "4566663c3876e022b4fa4ced8c8697c4ab1688267f090114fd92d027b32e619b",
}
JAVA_MODULES = {
    "javac": "jdk.compiler/com.sun.tools.javac.Main",
    "jar": "jdk.jartool/sun.tools.jar.Main",
    "keytool": "java.base/sun.security.tools.keytool.Main",
}
MAX_EXTRACTED_SIZE = 256 * 1024 * 1024


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def checked_download(directory, dependency):
    path = directory / dependency["filename"]
    if path.is_symlink():
        raise RuntimeError(f"Refusing a symlink in the download cache: {path}")
    if path.exists():
        if not path.is_file() or sha256(path) != dependency["sha256"]:
            raise RuntimeError(f"Cached SHA256 mismatch: {path}. Remove that file and rerun.")
        print(f"Verified cached {path.name}", flush=True)
        return path
    print(f"Downloading {dependency['url']}", flush=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=path.name + ".", suffix=".part", dir=directory)
    temporary = Path(temporary_name)
    try:
        request = urllib.request.Request(dependency["url"], headers={"User-Agent": "NationClash-Android-Setup/1"})
        with os.fdopen(descriptor, "wb") as target:
            with urllib.request.urlopen(request, timeout=120) as response:
                shutil.copyfileobj(response, target, length=1024 * 1024)
        if sha256(temporary) != dependency["sha256"]:
            raise RuntimeError(f"Downloaded SHA256 mismatch: {dependency['url']}")
        temporary.chmod(0o644)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    print(f"Verified downloaded {path.name}", flush=True)
    return path


def archive_members(archive):
    """Reject traversal, special files, links and unexpected archive roots."""
    entries = archive.infolist()
    if sum(entry.file_size for entry in entries) > MAX_EXTRACTED_SIZE:
        raise RuntimeError("Android build-tools archive exceeds the extraction limit")
    seen = set()
    for entry in entries:
        name = PurePosixPath(entry.filename)
        kind = stat.S_IFMT(entry.external_attr >> 16)
        if (
            not name.parts
            or name.is_absolute()
            or ".." in name.parts
            or "\\" in entry.filename
            or name.parts[0] != "android-15"
            or entry.filename in seen
            or kind not in (0, stat.S_IFREG, stat.S_IFDIR)
        ):
            raise RuntimeError(f"Unsafe build-tools archive member: {entry.filename!r}")
        seen.add(entry.filename)
    return entries


def regular_file_under(path, directory):
    relative = path.relative_to(directory)
    current = directory
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            return False
    return path.is_file()


def extract_tools(archive_path, directory):
    sdk = directory / "sdk"
    if sdk.is_symlink():
        raise RuntimeError(f"Refusing a symlink for the SDK directory: {sdk}")
    sdk.mkdir(exist_ok=True)
    tools = sdk / "android-15"
    with ZipFile(archive_path) as archive:
        entries = archive_members(archive)
        if tools.exists() or tools.is_symlink():
            for entry in entries:
                if entry.is_dir():
                    continue
                path = sdk / entry.filename
                if not regular_file_under(path, sdk) or path.stat().st_size != entry.file_size:
                    raise RuntimeError(f"Extracted build tool is missing/changed: {path}. Remove sdk/android-15 and rerun.")
                with archive.open(entry) as source:
                    expected = hashlib.file_digest(source, "sha256").hexdigest()
                if sha256(path) != expected:
                    raise RuntimeError(f"Extracted build tool checksum mismatch: {path}. Remove sdk/android-15 and rerun.")
                path.chmod(0o755 if (entry.external_attr >> 16) & 0o111 else 0o644)
            print("Verified cached extracted Build Tools 35.0.0", flush=True)
        else:
            with tempfile.TemporaryDirectory(prefix=".extract-android-", dir=directory) as temporary:
                staging = Path(temporary)
                for entry in entries:
                    destination = staging / entry.filename
                    if entry.is_dir():
                        destination.mkdir(parents=True, exist_ok=True)
                        continue
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    with archive.open(entry) as source, destination.open("wb") as target:
                        shutil.copyfileobj(source, target, length=1024 * 1024)
                    destination.chmod(0o755 if (entry.external_attr >> 16) & 0o111 else 0o644)
                (staging / "android-15").replace(tools)
            print("Safely extracted Build Tools 35.0.0", flush=True)
    return tools


def run(*command):
    result = subprocess.run(command, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return result.stdout.strip()


def prepare(directory):
    java = shutil.which("java")
    if not java:
        raise RuntimeError("Java 17 or newer with compiler, jar and keytool modules is required")
    java_version = run(java, "-version")
    match = re.search(r'version "(\d+)', java_version)
    if not match or int(match.group(1)) < 17:
        raise RuntimeError(f"Java 17 or newer is required; found {java_version}")
    modules = {line.split("@", 1)[0] for line in run(java, "--list-modules").splitlines()}
    missing = {module.split("/", 1)[0] for module in JAVA_MODULES.values()} - modules
    if missing:
        raise RuntimeError("Java runtime is missing modules: " + ", ".join(sorted(missing)))
    directory.mkdir(parents=True, exist_ok=True)
    archive = checked_download(directory, BUILD_TOOLS)
    android_jar = checked_download(directory, ANDROID_JAR)
    tools = extract_tools(archive, directory)
    launchers = directory / "bin"
    if launchers.is_symlink():
        raise RuntimeError(f"Refusing a symlink for Java launchers: {launchers}")
    launchers.mkdir(exist_ok=True)
    for name, module in JAVA_MODULES.items():
        launcher = launchers / name
        if launcher.is_symlink():
            raise RuntimeError(f"Refusing a symlink for the Java launcher: {launcher}")
        launcher.write_text(f'#!/bin/sh\nexec {shlex.quote(java)} -m {module} "$@"\n')
        launcher.chmod(0o755)
    versions = {
        "javac": run(str(launchers / "javac"), "-version"),
        "aapt": run(str(tools / "aapt"), "version"),
        "aapt2": run(str(tools / "aapt2"), "version"),
        "d8": run(str(tools / "d8"), "--version"),
        "apksigner": run(str(tools / "apksigner"), "version"),
    }
    manifest = {
        "buildTools": {**BUILD_TOOLS, "path": str(tools)},
        "androidJar": {**ANDROID_JAR, "path": str(android_jar)},
        "java": {
            "version": java_version.splitlines()[0],
            "executable": java,
            **{name + "Module": module for name, module in JAVA_MODULES.items()},
            "compileOptions": ["-source", "8", "-target", "8", "-bootclasspath", str(android_jar)],
        },
        "versions": versions,
    }
    manifest_path = directory / "toolchain.json"
    if manifest_path.is_symlink():
        raise RuntimeError(f"Refusing a symlink for the toolchain manifest: {manifest_path}")
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"toolchain": str(manifest_path), "versions": versions}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=ROOT / "artifacts/android-toolchain", help="Local download/extraction directory")
    args = parser.parse_args()
    try:
        prepare(args.directory.resolve())
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Android toolchain setup failed: {error}\n")


if __name__ == "__main__":
    main()
