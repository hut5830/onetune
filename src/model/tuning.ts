import { CapabilityProfile, SourceId, XoType } from '../drivers/types';
import { clamp } from '../lib/format';

export const ISO = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000];

export type BandType = 'pk' | 'ls' | 'hs';
export interface Band { f: number; g: number; q: number; t: BandType }
export interface Xover { on: boolean; freq: number; slope: number; type: XoType }
type Kind = 'tw' | 'mr' | 'mid' | 'ctr' | 'rr' | 'sub';

export interface ChannelDef { id: string; name: string; short: string; group: string; pair: string | null; x: number; y: number; color: string; side: 0 | 1 | 2; kind: Kind; rear?: boolean }
export interface Channel extends ChannelDef { hpf: Xover; lpf: Xover; gain: number; delay: number; phase: boolean; mute: boolean; eqBypass: boolean; eq: Band[] }

export interface TuningState {
  profileId: string;
  channels: Channel[];
  master: number;
  link: boolean;
  source: SourceId;
  route: Record<string, number[]>;
}

const def = (id: string, name: string, short: string, group: string, pair: string | null, x: number, y: number, color: string, side: 0 | 1 | 2, kind: Kind, rear = false): ChannelDef =>
  ({ id, name, short, group, pair, x, y, color, side, kind, rear });

export const CHANNELS: Record<string, ChannelDef> = {
  TW_L: def('TW_L', 'ทวีตเตอร์ ซ้าย', 'TW L', 'ทวีตเตอร์ · เสาเอ', 'TW_R', 80, 176, '#6FB7FF', 0, 'tw'),
  TW_R: def('TW_R', 'ทวีตเตอร์ ขวา', 'TW R', 'ทวีตเตอร์ · เสาเอ', 'TW_L', 220, 176, '#6FB7FF', 1, 'tw'),
  MR_L: def('MR_L', 'เสียงกลาง ซ้าย', 'MR L', 'เสียงกลาง · คอนโซลหน้า', 'MR_R', 112, 140, '#7FE0A8', 0, 'mr'),
  MR_R: def('MR_R', 'เสียงกลาง ขวา', 'MR R', 'เสียงกลาง · คอนโซลหน้า', 'MR_L', 188, 140, '#7FE0A8', 1, 'mr'),
  MID_L: def('MID_L', 'มิดเบส ซ้าย', 'MID L', 'มิดเบส · ประตูหน้า', 'MID_R', 46, 262, '#FFC15E', 0, 'mid'),
  MID_R: def('MID_R', 'มิดเบส ขวา', 'MID R', 'มิดเบส · ประตูหน้า', 'MID_L', 254, 262, '#FFC15E', 1, 'mid'),
  CTR: def('CTR', 'เซ็นเตอร์', 'CTR', 'เซ็นเตอร์ · กลางคอนโซล', null, 150, 150, '#5FD4C4', 2, 'ctr'),
  RR_L: def('RR_L', 'ลำโพงหลัง ซ้าย', 'RR L', 'ลำโพงหลัง · ประตูหลัง', 'RR_R', 48, 408, '#B99CFF', 0, 'rr', true),
  RR_R: def('RR_R', 'ลำโพงหลัง ขวา', 'RR R', 'ลำโพงหลัง · ประตูหลัง', 'RR_L', 252, 408, '#B99CFF', 1, 'rr', true),
  SUB: def('SUB', 'ซับวูฟเฟอร์', 'SUB', 'ซับวูฟเฟอร์ · ท้ายรถ', null, 150, 508, '#FF7A6B', 2, 'sub'),
  SUB_L: def('SUB_L', 'ซับวูฟเฟอร์ 1', 'SUB 1', 'ซับวูฟเฟอร์ · ท้ายรถ', 'SUB_R', 118, 506, '#FF7A6B', 0, 'sub'),
  SUB_R: def('SUB_R', 'ซับวูฟเฟอร์ 2', 'SUB 2', 'ซับวูฟเฟอร์ · ท้ายรถ', 'SUB_L', 182, 506, '#FF7A6B', 1, 'sub'),
};

export const LAYOUT: Record<6 | 8 | 10, string[]> = {
  6: ['TW_L', 'TW_R', 'MID_L', 'MID_R', 'SUB_L', 'SUB_R'],
  8: ['TW_L', 'TW_R', 'MID_L', 'MID_R', 'CTR', 'RR_L', 'RR_R', 'SUB'],
  10: ['TW_L', 'TW_R', 'MR_L', 'MR_R', 'MID_L', 'MID_R', 'RR_L', 'RR_R', 'SUB_L', 'SUB_R'],
};

/** Snap a crossover to the nearest type/slope this model supports. */
export function fitXover(x: Xover, p: CapabilityProfile): Xover {
  const type = p.xo.types.includes(x.type) ? x.type : p.xo.types[0];
  const allowed = p.xo.slopes[type] ?? [12];
  const slope = allowed.reduce((best, s) => (Math.abs(s - x.slope) < Math.abs(best - x.slope) ? s : best), allowed[0]);
  return { ...x, type, slope };
}

export function buildChannels(p: CapabilityProfile): Channel[] {
  const ids = LAYOUT[p.outputs];
  const hasMR = ids.includes('MR_L');
  const xo = (on: boolean, freq: number, slope: number, type: XoType) => fitXover({ on, freq, slope, type }, p);
  return ids.map(id => {
    const d = CHANNELS[id];
    const hp = { tw: xo(true, 3500, 24, 'LR'), mr: xo(true, 400, 24, 'LR'), mid: xo(true, 60, 24, 'LR'), ctr: xo(true, 250, 24, 'LR'), rr: xo(true, 80, 12, 'BW'), sub: xo(true, 25, 12, 'BW') }[d.kind];
    const lp = { tw: xo(false, 20000, 24, 'LR'), mr: xo(true, 3500, 24, 'LR'), mid: xo(true, hasMR ? 400 : 3500, 24, 'LR'), ctr: xo(true, 4000, 24, 'LR'), rr: xo(false, 20000, 12, 'BW'), sub: xo(true, 70, 24, 'LR') }[d.kind];
    const gain = { tw: -3, ctr: -6, rr: -6 }[d.kind as 'tw' | 'ctr' | 'rr'] ?? 0;
    return {
      ...d, hpf: hp, lpf: lp, gain: clamp(gain, p.channelGain[0], p.channelGain[1]), delay: 0, phase: false, mute: false, eqBypass: false,
      eq: ISO.map(f => ({ f, g: 0, q: 4.32, t: 'pk' as BandType })),
    };
  });
}

export const inputCount = (p: CapabilityProfile, s: SourceId) => (s === 'hl' ? p.hlInputs : s === 'rca' ? p.rcaInputs : 2);

export function defaultRoute(channels: Channel[], inputs: number): Record<string, number[]> {
  const r: Record<string, number[]> = {};
  for (const c of channels) {
    if (c.kind === 'sub') r[c.id] = inputs >= 6 ? [4, 5] : [0, 1];
    else if (c.kind === 'ctr') r[c.id] = [0, 1];
    else if (c.rear && inputs >= 4) r[c.id] = [2 + c.side];
    else r[c.id] = [c.side === 2 ? 0 : c.side];
  }
  return r;
}

export function initialState(p: CapabilityProfile): TuningState {
  const channels = buildChannels(p);
  const source = p.sources[0];
  return { profileId: p.id, channels, master: -18, link: true, source, route: defaultRoute(channels, inputCount(p, source)) };
}
