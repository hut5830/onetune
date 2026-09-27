# What other DSP apps offer (research, 2026-09)

Goal: find what OneTune still lacks compared with brand apps and pro speaker processors, and decide what to build.

## Findings

| Source | What it does that matters to us |
|---|---|
| Alpine PXE-R500 app ([App Store](https://apps.apple.com/us/app/pxe-r500/id1556774816), [manual](https://www.manualslib.com/manual/2542399/Alpine-Pxe-R500.html)) | 31-band graphic + parametric EQ, HPF/LPF/band-pass, time correction, Navi-mix, save/load setting files |
| Helix Conductor / URC remotes ([Audiotec Fischer](https://www.audiotec-fischer.de/en/accessories/urc-1), [Conductor test](https://www.audiotec-fischer.de/media/pdf/38/ab/23/2021-02-Car-Hifi-Bericht-CONDUCTOR_en.pdf)) | Everyday control is only: master volume, sub level, source, preset switching (up to 10), rear attenuation |
| dbx DriveRack PA/PA2 ([dbx](https://dbxpro.com/en-US/products/dbx-driverack-pa), [SOS review](https://www.soundonsound.com/reviews/dbx-driverack-pa2)) | Speaker processors add a compressor before the crossover and a limiter per output for speaker/amp protection; remote app control |
| t.racks DSP 4x4 / openDSP ([F-Droid](https://f-droid.org/packages/net.opendsp.x4x4/)) | PEQ, HPF/LPF, compressor, noise gate, limiter, output delay — typical for active cabinets |
| Wondom/Sure JAB (ADAU1701) ([datasheet](https://manuals.plus/m/6f6d2ed66ceaa3fe2fae739f1d1ebe2e82523d4bd7410989bd714db29bdd762a)) | Popular DIY speaker boards; app control over Bluetooth (MIUMAX app) |
| Audison bit Tune ([Audison](https://audison.com/blog/bit-tune-auto-tuning/)) | Measurement mic + RTA; auto time alignment, EQ and levels; detects wiring/phase mistakes |
| JL Audio TüN ([Crutchfield](https://www.crutchfield.com/learn/putting-jl-audio-tuning-dsp-software-to-the-test.html)) | RTA measurements; PEQ on tablet; simpler phone app vs full laptop app |

## What we built from this (v1.2)

- **Simple mode** (remote-style, like Helix Conductor): master knob, level per speaker group (keeps L/R balance), sub crossover, source, preset buttons, mute all. **Detailed mode** keeps the full per-channel tuning.
- **Limiter per output** (speaker protection, like DriveRack / t.racks) for models whose profile lists `limiter`.
- **Undo / redo**, **A/B compare**, **solo** a channel, **rename** outputs, **copy settings to any channel** (crossover re-guarded), **reset one channel**.
- **Landscape and tablets**: two-pane studio and channel editor.
- Calm flat design (graphite + one blue accent), IBM Plex Sans Thai, settings (haptics, default mode, keep screen on).

## Still missing (next candidates)

1. **Measure with the phone mic (RTA) + auto level/delay** — the biggest differentiator (bit Tune). Needs native audio input + FFT; pink-noise/sine generator through the DSP input.
2. **Compressor / noise gate** for PA-style cabinets (profile capability, like `limiter`).
3. **On-device preset slots** (Alpine 6, Helix 10): switch presets stored in the DSP itself — protocol-dependent.
4. **Sound-field / fader-balance** controls for cars (Navi-mix, rear attenuation).
5. **Wiring check**: play a test tone per output and confirm polarity/channel (bit Tune diagnostics).
6. **Password lock** so customers can't change an installer's tune (`lock` extra).
7. **OTA updates** (expo-updates) so fixes reach users without reinstalling the APK.
