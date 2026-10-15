# Browser world validation

The exact self-contained HTML passes **16 browser acceptance groups** and the
source passes **52 automated tests**. See [exact artifact hashes and commands](DOWNLOAD-VALIDATION.md)
and [machine-readable browser evidence](WORLD-ACCEPTANCE.json).

All 196 fighters have supplied art, including 32 changed images from the latest
36-file archive. Four files were unchanged. 195 countries have eight source
poses; Turkey has four and explicit adapted crouch/KO states. No country PNG is
missing. Two costumes need replacement and two need confirmation; see the
[creator checklist](REPLACEMENT-ARTWORK-CHECKLIST.md).

Coverage includes every country card and renderer, 4,704 attack hit fixtures,
153,664 low-strike hits against every crouched country and the same number of
boundary whiffs, 3,136 painted contact fixtures, 3,136 two-fighter layer checks,
real Iraq/Iran country selection and keyboard hits/misses, guards, KO/rematch,
all 10 arenas, audio, AI, portrait/landscape touch, and no runtime errors or
external network requests. All embedded atlas bytes match their expected sources.

The downloaded HTML embeds all 196 atlases and works without a companion asset
folder; hosted source builds still use separate lazy scripts. Only selected
fighters decode, with a six-image cache. Testing uses an internal HTTP server
because managed Chromium blocks direct file navigation. Windows file opening
itself has not been observed. Static source poses are adapted sprite animation,
not a complete 3D or motion-capture animation set.
