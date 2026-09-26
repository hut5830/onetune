# OneTune DSP — context for Claude

See also AGENTS.md (Expo conventions) and README.md (Thai setup + protocol-mapping workflow).

## What this is
One Android app to tune DSPs of many brands popular in Thailand over Bluetooth LE — primarily standalone speaker
systems (active 2/3-way cabinets + subs), also car audio —
instead of installing each brand's own app. UI language: Thai (technical terms like Hz, dB, EQ stay English).

## Stack
Expo SDK 57, React Native 0.86, TypeScript strict, expo-router (routes in `src/app/`),
react-native-ble-plx, react-native-svg. Builds via EAS (account `hut5830`, project `onetune`),
`preview` profile = APK. Workflow file: `.eas/workflows/create-production-builds.yml`.
`.npmrc` sets `legacy-peer-deps=true` (react-dom optional peer conflict).

## Architecture
- `src/drivers/profiles.ts` — CapabilityProfile per model (outputs, scenes speaker/car, EQ gain/Q ranges, crossover types/slopes,
  delay max/step, extras). The UI only offers what the profile allows. Values marked `unverified` come from partial specs.
- `src/drivers/*.ts` — Driver = `encode(Change, state) → Frame[]` + BLE target (service/write/notify UUIDs).
  Only `demo.ts` exists (fake framing `A5 cmd len payload sum`). Other models use unmapped drivers.
- `src/model/tuning.ts` — channel defs, LAYOUTS per scene (output order = OUT 1…N), safe defaults, `guardXover` (MIN_HPF), delays from distances.
- `src/model/session.ts` — tuning state, L/R link (delay never linked), copy-to-pair, layouts, presets, sends via `WriteQueue`
  (coalesces by frame key, one write at a time, 80 ms). BLE writer is injected (`src/model/current.ts`) so it runs in Node tests.
- UI: `src/theme.ts` tokens (dark neon, Chakra Petch + IBM Plex Sans Thai), own SVG icons in `components/Icon.tsx`,
  custom headers (Stack headerShown false). SVG gradient ids must be per-instance (`useSvgId`). Tool screens: align, inputs, presets.
- `src/app/inspector.tsx` — BLE Inspector: GATT list, read, notify, write hex, notes, share log as JSON.

## Safety rules (keep)
- A driver with `mapped: false` must never write to real hardware; frames go to the log only.
- Never ship crossover values that can put full-range signal into a tweeter: `guardXover` enforces MIN_HPF per kind on every edit,
  layout change and preset load (covered by selftest). Keep it that way.
- Protocols are learned by observing our own devices' traffic; do not copy code or assets from brand apps.

## Research notes
- Android app families: `com.chs.mt.*` / `leon.android.chs_*` (Alpine PXE-R500/PXE-0850S, Nakamichi NDS, Pioneer DSP,
  Dayton DSP-408, Power Acoustik, RDING); `com.tigerapp.*` (Nakamichi NDSK, Sansui KALA, Harmony, OZORA);
  Goldhorn and Axxess have their own apps (Goldhorn large models also use Wi-Fi). Shared family ≠ proven shared protocol.
- First targets: Nakamichi NDSK4265AU (tigerapp, top seller in Thailand) and one CHS device (Alpine PXE-R500).

## Status / next steps
1. Run Inspector on a real DSP: find the vendor service (not 1800/1801/180A), subscribe to N characteristics, share log.
2. Capture the original app via Android "Bluetooth HCI snoop log" + a timed list of single changes; decode in Wireshark.
3. Write the first real driver, verify each command with hex via Inspector, then set `mapped: true`.
4. Direction under consideration: data-driven drivers (JSON protocol definitions loaded at runtime) plus a tool that
   proposes a protocol from a capture + change timeline, so new models need no code change.
5. Done in v1.1: speaker scene + layouts, inputs/routing, presets (+JSON share), time alignment. Still open: which speaker DSP
   models the user owns (add profiles), unused OUTs should be muted by real drivers, 3D view, expo-updates for OTA.
6. Web preview for design checks: `npx expo start --web` (no BLE on web).

## Checks before declaring work done
`npx tsc --noEmit` and `npm run selftest`.
