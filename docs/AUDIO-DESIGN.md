# Original offline audio

`browser/src/audio.js` synthesizes the soundtrack and combat sounds with Web
Audio. It uses no downloaded music, external recordings, browser speech service,
network request, or third-party audio library. The four existing original WAV
announcements remain unchanged and are embedded by the standalone builder.

The arena soundtrack follows an eight-bar harmonic progression with gently
spread pads, a syncopated bass, a plucked melodic phrase, and dry kick, snare and
hi-hat parts. Each arena supplies its existing tempo, key, scale and melody.
Alternate phrases change the melody rhythm and drum pattern. Short envelopes
and filtered upper harmonics keep combat and speech clear.

Punches combine a sharp noise transient and a short body thud. Kicks use a deeper,
longer body with a broader impact; blocks ring briefly with metallic partials.
Signature launch and hit sounds read `NationPowers.get(countryId)`. Energy, metal,
water, wind, fire, earth, ice and lightning each have a different synthesis recipe.
The country's stable seed changes tuning and duration within its family. A hit
adds a short low impact, while an ultimate has a fuller body. None uses a long
reverb or delay feedback tail.

The mix exposes three developer APIs, all accepting a number from 0 to 1:

- `setVolume(value)` controls the master; the game starts at 0.75.
- `setMusicVolume(value)` controls music independently; the default is 0.80.
- `setEffectsVolume(value)` controls combat and spoken announcements; the default
  is 0.85.

The current game uses the default mix and the device's media volume controls;
the fight UI has no sliders or mute toggle. Changing a bus gain through the API
preserves the engine's enabled state. Announcements lower a separate music
ducking gain to 30%, then restore it, so a gain update during a cue keeps the
selected level. A dynamics compressor provides shared mix headroom, with a
gentle final peak guard for simultaneous ultimates at maximum volume. Its lower
range is linear, preserving the ordinary soundtrack and strike levels.

Pause stops and disconnects every scheduled source before suspending the context.
Resume continues the musical phrase and does not repeat round announcements.
Changing arenas stops the old score's sources before starting the new one.
Returning to selection stops everything. Session and playback tokens prevent a
late announcement decode or unlock from starting audio after a pause or stop.
Setting Music to zero stops its scheduler; setting Effects to zero cancels combat
sounds and speech without stopping music.

`debug` preserves the original `impactCounts` shape and adds `musicVolume`,
`effectsVolume`, actual bus gains, source counts, the music step, and separate
`signatureCounts: {launch, impact}`. Signature launch audio listens to
`nation-move`; `nation-projectile` does not trigger a duplicate sound.

Run the focused offline-render and real Chromium checks with:

```sh
node --test Tests/Browser/audio-upgrade.test.cjs
node --test Tests/Browser/arenas-audio.test.cjs
```

To also export an original stereo PCM preview of the score with combat sounds:

```sh
NATION_AUDIO_ARTIFACT=/workspace/artifacts/NationClash-audio-preview.wav \
  node --test Tests/Browser/audio-upgrade.test.cjs
```

The focused checks render all thirty arena tunings, all eight power families,
punches, kicks and a maximum-volume simultaneous-power mix. They measure actual
samples for audibility, stereo energy, distinct timbres, tail length and peak
headroom, then exercise independent controls, speech ducking, pause, arena
changes, mute and cancellation in Chromium through the developer APIs. Audibility
measurements do not replace listening tests; players adjust the combined level
with their device's media volume controls.
