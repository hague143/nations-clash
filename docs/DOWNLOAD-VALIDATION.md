# Compact Windows package validation

The user requested a downloadable ZIP without GitHub. `python3 tools/package-browser.py`
creates a standalone game, with same-size WebP atlas variants and a gzip-compressed
inline program. Original source PNGs remain unchanged. The user needs current
Chrome or Edge, with no Unity, Python, server or additional game downloads.

ZIP size: 2,453,387 bytes.
Packaged HTML size: 3,255,296 bytes.
Packaged HTML SHA256: `46c411a26dd1e5a30c3e74a85d4b5f0a7980b3fccf092d71bbad4c052b0fc81c`.

The archive's CRC check passed. Its actual extracted HTML was tested with:

```sh
NATIONCLASH_HTML=/workspace/nations-clash/artifacts/windows-check/NationClash.html \
NATIONCLASH_ARTIFACT_DIR=/workspace/nations-clash/artifacts/windows-validation \
node Tests/Browser/world-smoke.cjs
```

All 12 acceptance groups passed: all 196 selections and rendered fighters, 96
attack poses, flags, keyboard/contact, rounds/rematches, 10 arenas, audio, AI,
portrait and landscape touch, zero runtime errors and zero external requests.
The tested extracted bytes match `NationClash.html` in the ZIP.

Delivery remains separate from local validation. The user is on the Codex
cloud/setup screen, where the supplied internal and sandbox links did not
download. No attachment-export tool is available here. The temporary download
host tmpfiles.org returned proxy CONNECT403; its domain was added to the saved
network draft. Runtime availability awaits user review/save/publication.
No public URL or successful user download is claimed.

Publication recheck: the user published the configuration. The config read showed
a new active base version and tmpfiles.org in the explicit allowed-host list.
Nevertheless, the current runner still receives proxy CONNECT HTTP403 for that
host, including an escalated request and a turn-scoped network permission grant.
No upload was performed and no working HTTPS download URL exists yet. A runtime
reconnection or a new task using the published environment is still needed to
recheck effective access; do not ask the user to republish unchanged settings.

Delivery succeeded after runtime reconnection. The public file-host page is
https://tmpfiles.org/weARZwgtpl2i/nationclash-windows.zip
The host reported file expires in 47 hours and 58 minutes. The actual Download-button URL
was fetched over HTTPS; all 2453387 downloaded bytes match the tested
ZIP, its CRC check passes, and its contained HTML matches the browser-tested
compact document. ZIP SHA256: `a709926ca727f4535b4c3bf05d0cf03a2fc215a597c9e55d6103970190c22b9f`.
The download page is temporary; the extracted game works offline after saving.
