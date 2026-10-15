# Original offline announcer cues

`fight.wav`, `ko.wav`, `getready.wav`, and `timeover.wav` contain only the original
short game announcements “Fight”, “K O”, “Get ready”, and “Time over”. They were
synthesized with eSpeak NG 1.52.0 and processed with FFmpeg: a 150 Hz high-pass,
7200 Hz low-pass, short echo, limiter, and mono 22050 Hz PCM output. No soundtrack,
character audio, or recording was taken from another game.

The standalone HTML builder embeds all four WAV files in `src/audio.js`. Voices
therefore work without browser speech services, an installed OS voice, or network
access. Music and strike sounds are original Web Audio synthesis.

The local speech tool was extracted under `/workspace/.tools/nation-audio` from
official Debian Trixie packages. Debian InRelease signatures were verified against
the machine's installed Debian archive keyring; the Packages index SHA-256 and each
downloaded package SHA-256 were checked before extraction. Package versions were
`espeak-ng` / `espeak-ng-data` / `libespeak-ng1` 1.52.0+dfsg-5,
`libpcaudio0` 1.3-1, and `libsonic0` 0.2.0-13+b1. This local tool is only needed to
regenerate cues; the published browser game has no such dependency.
