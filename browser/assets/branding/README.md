# Nation Clash branding

The blue/red globe, spear shield and metallic **NATION CLASH** logo were supplied
as a visual reference by the user. `nation-clash-logo.png` is the prepared logo
export made from that reference using image generation, with the same wording
and emblem composition. It is retained as the source for deterministic exports.

`python3 tools/build-brand-assets.py` exports the web logo, 512x512 Play Store
listing icon, native fallback icon and padded adaptive foreground. The exports
resize the complete source without cropping the emblem or lettering. The Play
Store listing PNG has no baked-in rounded corners. Android applies its launcher
mask to the separate adaptive foreground/background.

`metadata.json` records source/export SHA256 values. Browser and standalone HTML
embed the WebP; Android bundles the same WebP locally. No brand artwork loads
from a remote server.
