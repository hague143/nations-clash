import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("inspect_apk", ROOT / "tools/inspect_apk.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class InventoryTests(unittest.TestCase):
    def fixture(self, entries):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        path = Path(folder.name) / "sample.apk"
        with zipfile.ZipFile(path, "w") as archive:
            for name, value in entries: archive.writestr(name, value)
        return path

    def test_inventory_hash_and_no_extraction(self):
        path = self.fixture([("AndroidManifest.xml", b"fixture"), ("classes.dex", b"dex fixture"),
            ("lib/arm64-v8a/libunity.so", b"fixture"), ("assets/bin/Data/global-metadata.dat", b"fixture")])
        before = path.read_bytes()
        report = module.inspect(path)
        self.assertEqual(report["sha256"], hashlib.sha256(before).hexdigest())
        self.assertEqual(report["native_abis"], ["arm64-v8a"])
        self.assertEqual(report["dex_files"], ["classes.dex"])
        self.assertEqual(len(report["framework_hints"]), 2)
        self.assertFalse(report["assets_extracted"])
        self.assertFalse(report["signatures_validated"])
        self.assertEqual(before, path.read_bytes())
        self.assertEqual(list(path.parent.iterdir()), [path])

    def test_not_apk_rejected(self):
        path = self.fixture([("readme.txt", "not an APK")])
        with self.assertRaises(ValueError): module.inspect(path)

    def test_unsafe_paths_reported_and_manifest_refused(self):
        path = self.fixture([("AndroidManifest.xml", b"fixture"), ("../../escape", b"fixture")])
        self.assertEqual(module.inspect(path)["unsafe_paths"], ["../../escape"])
        with self.assertRaises(ValueError): module.inspect(path, True)

    def test_large_manifest_refused(self):
        path = self.fixture([("AndroidManifest.xml", b"x" * (4 * 1024 * 1024 + 1))])
        with self.assertRaises(ValueError): module.inspect(path, True)


if __name__ == "__main__": unittest.main()
