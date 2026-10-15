# Browser world and upgrade validation

The exact standalone HTML passes **17 world browser groups**, **nine presentation/
power groups** and three loading/navigation regression cases. All **78 automated
tests pass**. See [artifact hashes and executed commands](DOWNLOAD-VALIDATION.md),
[world evidence](WORLD-ACCEPTANCE.json) and [upgrade evidence](UPGRADE-ACCEPTANCE.json).

Every supplied fighter's punches/kicks were rechecked: 4,704 six-action hits,
153,664 low-strike hits and the same number of boundary whiffs, 3,136 painted
contacts and 3,136 two-fighter layering fixtures. Real Iraq/Iran keyboard hits,
misses, KO/rematch, all 30 arena matches, audio, AI and mobile controls pass.

Each of the 196 countries now has a named fantasy power. All 196 missile visuals
are distinct; 392 live game render fixtures verify exact collision-core positions
in both directions. Travelling hits, guards, misses, recharge, startup interrupt,
pause, double KO and round cleanup pass. The matchup UI uses actual supplied
portraits with perspective panels and lighting. Audio has original eight-bar
scores, layered impacts, eight power sound families and independent volume buses.

All fighter and arena payloads match their expected source WebPs. Selected
fighters decode with a six-image cache; backgrounds retain at most three images,
pinning the live match. The HTML has no companion artwork folder or external
requests. Testing uses an internal HTTP server because managed Chromium blocks
file navigation. Direct Windows file opening has not been observed here.

These are supplied sprite animations and static background illustrations with a
3D-style presentation. Existing source costume issues and adapted Turkey poses
remain documented in the [creator checklist](REPLACEMENT-ARTWORK-CHECKLIST.md).
