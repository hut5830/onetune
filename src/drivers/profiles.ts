import { CapabilityProfile } from './types';

const S6 = [6, 12, 18, 24, 30, 36, 42, 48];

// Numbers come from public manuals/spec sheets gathered during research.
// Anything marked `unverified` must be confirmed against a real unit before release.
export const PROFILES: CapabilityProfile[] = [
  {
    id: 'ndsk', brand: 'Nakamichi', model: 'NDSK4265AU', family: 'tiger', transport: 'BLE',
    outputs: 6, scenes: ['car'], hlInputs: 4, rcaInputs: 2, sources: ['hl', 'rca', 'bt'],
    eq: { graphic: true, parametric: false, shelves: false, gain: [-12, 12], gainStep: 0.5, q: [4.32, 4.32] },
    xo: { types: ['LR', 'BW'], slopes: { LR: [12, 24, 48], BW: [6, 12, 18, 24, 36, 48] } },
    channelGain: [-40, 6], delayMs: [0, 20], delayStep: 0.01, extras: [],
    unverified: true, source: 'สเปกร้านค้า · ช่วงตัวเลขยังเป็นค่าประมาณ',
    namePatterns: [/NDSK/i, /NAKAMICHI/i],
  },
  {
    id: 'r500', brand: 'Alpine', model: 'PXE-R500', family: 'chs', transport: 'BLE',
    outputs: 6, scenes: ['car'], hlInputs: 4, rcaInputs: 2, sources: ['hl', 'rca', 'bt'],
    eq: { graphic: true, parametric: true, shelves: false, gain: [-12, 12], gainStep: 0.1, q: [0.404, 28.852] },
    xo: { types: ['LR', 'BE', 'BW'], slopes: { LR: [12, 24, 36, 48], BE: S6, BW: S6 } },
    channelGain: [-60, 6], delayMs: [0, 7.354], delayStep: 1 / 48, extras: ['navi', 'lock', 'presets6'],
    unverified: false, source: 'คู่มือ PXE-R500',
    namePatterns: [/PXE/i, /R500/i, /ALPINE/i],
  },
  {
    id: 'gh810', brand: 'Goldhorn', model: 'DSPA 810 Pro', family: 'own', transport: 'BLE / Wi-Fi',
    outputs: 10, scenes: ['car'], hlInputs: 8, rcaInputs: 2, sources: ['hl', 'rca', 'bt', 'usb', 'opt'],
    eq: { graphic: false, parametric: true, shelves: true, gain: [-12, 12], gainStep: 0.1, q: [0.5, 15] },
    xo: { types: ['BW', 'BE', 'LR'], slopes: { BW: S6, BE: S6, LR: [12, 24, 36] } },
    channelGain: [-20, 5], delayMs: [0, 20], delayStep: 0.02, extras: ['phaseRot', 'allpass', 'lock'],
    unverified: true, source: 'สเปก Goldhorn P-series (ใกล้เคียง)',
    namePatterns: [/GOLDHORN/i, /DSPA/i],
  },
  {
    id: 'axx', brand: 'Axxess', model: 'AXDSP-X', family: 'own', transport: 'BLE',
    outputs: 10, scenes: ['car'], hlInputs: 6, rcaInputs: 0, sources: ['hl'],
    eq: { graphic: true, parametric: false, shelves: false, gain: [-12, 12], gainStep: 0.5, q: [4.32, 4.32] },
    xo: { types: ['BW'], slopes: { BW: [6, 12, 18, 24] } },
    channelGain: [-40, 0], delayMs: [0, 10], delayStep: 0.01, extras: ['lock', 'chime'],
    unverified: true, source: 'สเปก Axxess · ชนิดฟิลเตอร์ยังไม่ทราบ',
    namePatterns: [/AXDSP/i, /AXXESS/i],
  },
  {
    id: 'demo-spk', brand: 'Demo', model: 'DSP ลำโพงจำลอง 2in·4out', family: 'demo', transport: 'จำลอง',
    outputs: 4, scenes: ['speaker'], hlInputs: 0, rcaInputs: 2, sources: ['rca', 'bt', 'usb', 'opt'],
    eq: { graphic: true, parametric: true, shelves: true, gain: [-15, 15], gainStep: 0.1, q: [0.4, 20] },
    xo: { types: ['LR', 'BW', 'BE'], slopes: { LR: [12, 24, 36, 48], BW: S6, BE: S6 } },
    channelGain: [-60, 12], delayMs: [0, 10], delayStep: 0.01, extras: ['phaseRot'],
    unverified: false, source: 'โหมดจำลอง',
    namePatterns: [],
  },
  {
    id: 'demo', brand: 'Demo', model: 'DSP จำลอง 8 ช่อง', family: 'demo', transport: 'จำลอง',
    outputs: 8, scenes: ['speaker', 'car'], hlInputs: 6, rcaInputs: 6, sources: ['rca', 'hl', 'opt', 'bt', 'usb'],
    eq: { graphic: true, parametric: true, shelves: true, gain: [-12, 12], gainStep: 0.1, q: [0.4, 28] },
    xo: { types: ['LR', 'BE', 'BW'], slopes: { LR: [12, 24, 36, 48], BE: S6, BW: S6 } },
    channelGain: [-60, 6], delayMs: [0, 20], delayStep: 0.01, extras: ['navi', 'lock', 'phaseRot'],
    unverified: false, source: 'โหมดจำลอง',
    namePatterns: [],
  },
];

export const FAMILY_NAME: Record<CapabilityProfile['family'], string> = {
  tiger: 'กลุ่ม tigerapp',
  chs: 'กลุ่ม CHS',
  own: 'แบรนด์ทำแอปเอง',
  demo: 'ทดลอง',
};

export const profileById = (id: string) => PROFILES.find(p => p.id === id);
export const matchProfile = (name: string | null | undefined) =>
  name ? PROFILES.find(p => p.namePatterns.some(r => r.test(name))) : undefined;
