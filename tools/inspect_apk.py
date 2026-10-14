#!/usr/bin/env python3
"""Read-only APK metadata inventory. Does not extract, execute, patch or repackage."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import zipfile
from collections import Counter


def inspect(path, with_manifest=False):
    path = Path(path)
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    with zipfile.ZipFile(path) as archive:
        members = archive.infolist()
        names = [member.filename for member in members]
        name_set = set(names)
        if "AndroidManifest.xml" not in name_set:
            raise ValueError("Not an APK archive: AndroidManifest.xml is missing")
        unsafe = [name for name in names if PurePosixPath(name).is_absolute() or ".." in PurePosixPath(name).parts]
        abis = sorted({name.split("/")[1] for name in names if name.startswith("lib/") and name.count("/") >= 2})
        libraries = sorted(name for name in names if name.startswith("lib/") and name.endswith(".so"))
        markers = []
        if any(name.endswith("/libunity.so") for name in names) or any(name.startswith("assets/bin/Data/") for name in names):
            markers.append("Unity archive markers present; engine/runtime not verified")
        if any(name.endswith("/libil2cpp.so") or name.endswith("global-metadata.dat") for name in names):
            markers.append("IL2CPP archive markers present; source recovery not performed")
        if any(name.endswith("/libUE4.so") or name.endswith("/libUnreal.so") for name in names):
            markers.append("Unreal archive markers present; engine/runtime not verified")
        if any(name.endswith("/libflutter.so") for name in names):
            markers.append("Flutter archive markers present; runtime not verified")
        report = {
            "file": path.name, "sha256": digest, "size_bytes": path.stat().st_size,
            "status": "archive_metadata_only", "entry_count": len(names),
            "declared_uncompressed_bytes": sum(member.file_size for member in members),
            "duplicate_entries": sorted(name for name, count in Counter(names).items() if count > 1),
            "unsafe_paths": unsafe, "native_abis": abis, "native_libraries": libraries,
            "dex_files": sorted(name for name in names if re.fullmatch(r"classes(?:[2-9]|[1-9][0-9]+)?\.dex", name)),
            "asset_entry_count": sum(name.startswith("assets/") for name in names),
            "framework_hints": markers, "signatures_validated": False,
            "assets_extracted": False, "apk_executed": False,
        }
        if with_manifest:
            for member in members:
                if member.filename == "AndroidManifest.xml" and member.file_size > 4 * 1024 * 1024:
                    raise ValueError("Manifest exceeds read-only parser size budget")
                if member.filename == "resources.arsc" and member.file_size > 128 * 1024 * 1024:
                    raise ValueError("Resource table exceeds read-only parser size budget")
            if unsafe or report["duplicate_entries"]:
                raise ValueError("Ambiguous/unsafe archive; manifest pass refused")
    if with_manifest:
        try:
            from loguru import logger
            logger.disable("androguard")
            from androguard.core.apk import APK
            apk = APK(str(path))
            if not apk.is_valid_APK():
                raise ValueError("Manifest parser did not recognize a valid APK")
            report["manifest"] = {
                "package": apk.get_package(), "version_code": apk.get_androidversion_code(),
                "version_name": apk.get_androidversion_name(), "min_sdk": apk.get_min_sdk_version(),
                "target_sdk": apk.get_target_sdk_version(), "main_activity": apk.get_main_activity(),
                "permissions": sorted(apk.get_permissions()),
                "signature_blocks_present": {"v1": apk.is_signed_v1(), "v2": apk.is_signed_v2(), "v3": apk.is_signed_v3()},
            }
            certificates = list(apk.get_certificates_der_v2()) + list(apk.get_certificates_der_v3())
            for name in apk.get_signature_names():
                certificate = apk.get_certificate_der(name)
                if certificate: certificates.append(certificate)
            report["manifest"]["certificate_sha256"] = sorted({hashlib.sha256(c).hexdigest() for c in certificates})
            report["status"] = "archive_and_manifest_metadata"
        except Exception as error:
            report["status"] = "partial_manifest_failed"
            report["manifest_error"] = str(error)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    parser.add_argument("--manifest", action="store_true", help="Requires Androguard 4.1.4; no DEX decompilation")
    parser.add_argument("--output", type=Path, help="New report file; existing files are never overwritten")
    args = parser.parse_args()
    try:
        report = inspect(args.apk, args.manifest)
        content = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
        if args.output:
            with args.output.open("x", encoding="utf-8") as stream: stream.write(content)
        else: print(content, end="")
        return 2 if report["status"] == "partial_manifest_failed" else 0
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        parser.exit(2, "Inspection failed: " + str(error) + "\n")


if __name__ == "__main__":
    raise SystemExit(main())
