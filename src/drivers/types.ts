export type XoType = 'LR' | 'BW' | 'BE';
export type SourceId = 'hl' | 'rca' | 'opt' | 'bt' | 'usb';
export type Family = 'tiger' | 'chs' | 'own' | 'demo';
export type Extra = 'navi' | 'lock' | 'presets6' | 'phaseRot' | 'allpass' | 'chime' | 'limiter';
/** Where the DSP is installed: a standalone speaker system or a car. Drives layouts, defaults and visuals. */
export type Scene = 'speaker' | 'car';

/** What a model can do. The UI only offers controls and ranges listed here. */
export interface CapabilityProfile {
  id: string;
  brand: string;
  model: string;
  family: Family;
  transport: string;
  outputs: number;
  /** Installations this model is sold for; the first one is the default. */
  scenes: Scene[];
  hlInputs: number;
  rcaInputs: number;
  sources: SourceId[];
  eq: { graphic: boolean; parametric: boolean; shelves: boolean; gain: [number, number]; gainStep: number; q: [number, number] };
  xo: { types: XoType[]; slopes: Partial<Record<XoType, number[]>> };
  channelGain: [number, number];
  delayMs: [number, number];
  delayStep: number;
  extras: Extra[];
  /** true when numbers come from partial specs and must be confirmed on real hardware */
  unverified: boolean;
  source: string;
  /** Advertised-name patterns used to recognise the device during a scan (to be confirmed). */
  namePatterns: RegExp[];
}

export type Change =
  | { kind: 'eq'; ch: string; band: number }
  | { kind: 'xo'; ch: string; hp: boolean }
  | { kind: 'gain' | 'delay' | 'phase' | 'mute' | 'route' | 'limiter'; ch: string }
  | { kind: 'master' | 'input' };

export interface Frame {
  /** frames with the same key replace each other in the send queue (last value wins) */
  key: string;
  label: string;
  bytes: Uint8Array;
}

export interface BleTarget {
  service: string;
  write: string;
  notify?: string;
  withResponse: boolean;
}

export interface Driver {
  id: string;
  /** false until the protocol has been captured and verified on hardware */
  mapped: boolean;
  profile: CapabilityProfile;
  ble?: BleTarget;
  encode(change: Change, state: import('../model/tuning').TuningState): Frame[];
}
