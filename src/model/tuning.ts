import { CapabilityProfile, Change, Scene, SourceId, XoType } from '../drivers/types';
import { clamp } from '../lib/format';
import { masterRange } from '../drivers/profiles';

export const ISO = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000];

export type BandType = 'pk' | 'ls' | 'hs';
export interface Band { f: number; g: number; q: number; t: BandType }
export interface Xover { on: boolean; freq: number; slope: number; type: XoType }
/** Driver role. tw = tweeter/horn, mr = midrange, mid = car midbass, lf = cabinet woofer, full = full-range. */
export type Kind = 'tw' | 'mr' | 'mid' | 'lf' | 'full' | 'ctr' | 'rr' | 'sub';

export interface ChannelDef { id: string; name: string; short: string; group: string; pair: string | null; side: 0 | 1 | 2; kind: Kind; rear?: boolean }
export interface Limiter { on: boolean; threshold: number }
/** `custom` is the user's own name for the output (shown instead of `name` when set). */
export interface Channel extends ChannelDef { color: string; hpf: Xover; lpf: Xover; gain: number; delay: number; phase: boolean; mute: boolean; eqBypass: boolean; eq: Band[]; limiter: Limiter; custom?: string }

export const chName = (c: Channel) => c.custom?.trim() || c.name;
export const LIMIT_RANGE: [number, number] = [-30, 0];

export interface TuningState {
  profileId: string;
  scene: Scene;
  layoutId: string;
  channels: Channel[];
  master: number;
  link: boolean;
  source: SourceId;
  route: Record<string, number[]>;
  /** Listener → speaker distance in cm per channel, used by time alignment. */
  distances: Record<string, number>;
}

export const KIND_COLOR: Record<Kind, string> = {
  tw: '#5AB0FF', mr: '#6FCF97', mid: '#F2B35A', lf: '#F2B35A', full: '#8F9BFF', ctr: '#56C9C1', rr: '#B39DDB', sub: '#EF7B7B',
};

/** Level groups for the simple (remote-style) screen. */
export const GROUPS: { id: string; name: string; kinds: Kind[] }[] = [
  { id: 'hf', name: 'เสียงแหลม', kinds: ['tw'] },
  { id: 'mf', name: 'เสียงกลาง', kinds: ['mr', 'ctr'] },
  { id: 'lf', name: 'เสียงต่ำ', kinds: ['lf', 'mid'] },
  { id: 'full', name: 'ลำโพงหลัก', kinds: ['full'] },
  { id: 'rr', name: 'ลำโพงหลัง', kinds: ['rr'] },
  { id: 'sub', name: 'ซับ', kinds: ['sub'] },
];
export const groupOf = (k: Kind) => GROUPS.find(g => g.kinds.includes(k))!;
export const KIND_NAME: Record<Kind, string> = {
  tw: 'ทวีตเตอร์', mr: 'เสียงกลาง', mid: 'มิดเบส', lf: 'วูฟเฟอร์', full: 'ฟูลเรนจ์', ctr: 'เซ็นเตอร์', rr: 'ลำโพงหลัง', sub: 'ซับวูฟเฟอร์',
};

const def = (id: string, name: string, short: string, group: string, pair: string | null, side: 0 | 1 | 2, kind: Kind, rear = false): ChannelDef =>
  ({ id, name, short, group, pair, side, kind, rear });

export const CHANNELS: Record<string, ChannelDef> = {
  // car
  TW_L: def('TW_L', 'ทวีตเตอร์ ซ้าย', 'TW L', 'ทวีตเตอร์ · เสาเอ', 'TW_R', 0, 'tw'),
  TW_R: def('TW_R', 'ทวีตเตอร์ ขวา', 'TW R', 'ทวีตเตอร์ · เสาเอ', 'TW_L', 1, 'tw'),
  MR_L: def('MR_L', 'เสียงกลาง ซ้าย', 'MR L', 'เสียงกลาง · คอนโซลหน้า', 'MR_R', 0, 'mr'),
  MR_R: def('MR_R', 'เสียงกลาง ขวา', 'MR R', 'เสียงกลาง · คอนโซลหน้า', 'MR_L', 1, 'mr'),
  MID_L: def('MID_L', 'มิดเบส ซ้าย', 'MID L', 'มิดเบส · ประตูหน้า', 'MID_R', 0, 'mid'),
  MID_R: def('MID_R', 'มิดเบส ขวา', 'MID R', 'มิดเบส · ประตูหน้า', 'MID_L', 1, 'mid'),
  CTR: def('CTR', 'เซ็นเตอร์', 'CTR', 'เซ็นเตอร์ · กลางคอนโซล', null, 2, 'ctr'),
  RR_L: def('RR_L', 'ลำโพงหลัง ซ้าย', 'RR L', 'ลำโพงหลัง · ประตูหลัง', 'RR_R', 0, 'rr', true),
  RR_R: def('RR_R', 'ลำโพงหลัง ขวา', 'RR R', 'ลำโพงหลัง · ประตูหลัง', 'RR_L', 1, 'rr', true),
  SUB: def('SUB', 'ซับวูฟเฟอร์', 'SUB', 'ซับวูฟเฟอร์ · ท้ายรถ', null, 2, 'sub'),
  SUB_L: def('SUB_L', 'ซับวูฟเฟอร์ 1', 'SUB 1', 'ซับวูฟเฟอร์ · ท้ายรถ', 'SUB_R', 0, 'sub'),
  SUB_R: def('SUB_R', 'ซับวูฟเฟอร์ 2', 'SUB 2', 'ซับวูฟเฟอร์ · ท้ายรถ', 'SUB_L', 1, 'sub'),
  // speaker system
  HF_L: def('HF_L', 'ทวีตเตอร์ / ฮอร์น ซ้าย', 'HF L', 'เสียงแหลม · ตู้ซ้าย', 'HF_R', 0, 'tw'),
  HF_R: def('HF_R', 'ทวีตเตอร์ / ฮอร์น ขวา', 'HF R', 'เสียงแหลม · ตู้ขวา', 'HF_L', 1, 'tw'),
  MF_L: def('MF_L', 'เสียงกลาง ซ้าย', 'MF L', 'เสียงกลาง · ตู้ซ้าย', 'MF_R', 0, 'mr'),
  MF_R: def('MF_R', 'เสียงกลาง ขวา', 'MF R', 'เสียงกลาง · ตู้ขวา', 'MF_L', 1, 'mr'),
  LF_L: def('LF_L', 'วูฟเฟอร์ ซ้าย', 'LF L', 'เสียงต่ำ · ตู้ซ้าย', 'LF_R', 0, 'lf'),
  LF_R: def('LF_R', 'วูฟเฟอร์ ขวา', 'LF R', 'เสียงต่ำ · ตู้ขวา', 'LF_L', 1, 'lf'),
  FR_L: def('FR_L', 'ลำโพงซ้าย', 'L', 'ฟูลเรนจ์ · ตู้ซ้าย', 'FR_R', 0, 'full'),
  FR_R: def('FR_R', 'ลำโพงขวา', 'R', 'ฟูลเรนจ์ · ตู้ขวา', 'FR_L', 1, 'full'),
  HF_M: def('HF_M', 'ทวีตเตอร์ / ฮอร์น', 'HF', 'เสียงแหลม · ตู้หลัก', null, 2, 'tw'),
  LF_M: def('LF_M', 'วูฟเฟอร์', 'LF', 'เสียงต่ำ · ตู้หลัก', null, 2, 'lf'),
  SW: def('SW', 'ซับวูฟเฟอร์', 'SUB', 'ซับวูฟเฟอร์ · ตู้ซับ', null, 2, 'sub'),
  SW_L: def('SW_L', 'ซับวูฟเฟอร์ 1', 'SUB 1', 'ซับวูฟเฟอร์ · ตู้ซับ', 'SW_R', 0, 'sub'),
  SW_R: def('SW_R', 'ซับวูฟเฟอร์ 2', 'SUB 2', 'ซับวูฟเฟอร์ · ตู้ซับ', 'SW_L', 1, 'sub'),
};

export interface LayoutDef { id: string; scene: Scene; name: string; desc: string; channels: string[] }

/** Output order in `channels` is the physical OUT 1…N assignment sent to the DSP. */
export const LAYOUTS: LayoutDef[] = [
  { id: 'spk-fr', scene: 'speaker', name: 'สเตอริโอ ฟูลเรนจ์', desc: 'ตู้ซ้าย-ขวา ดอกเดียวเต็มย่าน', channels: ['FR_L', 'FR_R'] },
  { id: 'spk-2w-mono', scene: 'speaker', name: '2 ทาง · ตู้เดียว', desc: 'ฮอร์น/ทวีตเตอร์ + วูฟเฟอร์ ในตู้เดียว', channels: ['HF_M', 'LF_M'] },
  { id: 'spk-fr-sub', scene: 'speaker', name: '2.1 ฟูลเรนจ์ + ซับ', desc: 'ตู้ซ้าย-ขวา และตู้ซับหนึ่งใบ', channels: ['FR_L', 'FR_R', 'SW'] },
  { id: 'spk-2w', scene: 'speaker', name: '2 ทาง สเตอริโอ', desc: 'แยกแหลม/ต่ำ ทั้งตู้ซ้ายและขวา', channels: ['HF_L', 'LF_L', 'HF_R', 'LF_R'] },
  { id: 'spk-2w-sub', scene: 'speaker', name: '2 ทาง สเตอริโอ + ซับ', desc: 'ตู้ 2 ทางซ้าย-ขวา และตู้ซับ', channels: ['HF_L', 'LF_L', 'HF_R', 'LF_R', 'SW'] },
  { id: 'spk-2w-2sub', scene: 'speaker', name: '2 ทาง สเตอริโอ + ซับคู่', desc: 'ตู้ 2 ทางซ้าย-ขวา และตู้ซับสองใบ', channels: ['HF_L', 'LF_L', 'HF_R', 'LF_R', 'SW_L', 'SW_R'] },
  { id: 'spk-3w', scene: 'speaker', name: '3 ทาง สเตอริโอ', desc: 'แหลม · กลาง · ต่ำ ทั้งสองตู้', channels: ['HF_L', 'MF_L', 'LF_L', 'HF_R', 'MF_R', 'LF_R'] },
  { id: 'spk-3w-sub', scene: 'speaker', name: '3 ทาง สเตอริโอ + ซับ', desc: 'ตู้ 3 ทางซ้าย-ขวา และตู้ซับ', channels: ['HF_L', 'MF_L', 'LF_L', 'HF_R', 'MF_R', 'LF_R', 'SW'] },
  { id: 'spk-3w-2sub', scene: 'speaker', name: '3 ทาง สเตอริโอ + ซับคู่', desc: 'ตู้ 3 ทางซ้าย-ขวา และตู้ซับสองใบ', channels: ['HF_L', 'MF_L', 'LF_L', 'HF_R', 'MF_R', 'LF_R', 'SW_L', 'SW_R'] },
  { id: 'car-2w', scene: 'car', name: 'หน้า 2 ทาง', desc: 'ทวีตเตอร์ + มิดเบส ซ้าย-ขวา', channels: ['TW_L', 'TW_R', 'MID_L', 'MID_R'] },
  { id: 'car-2w-sub', scene: 'car', name: 'หน้า 2 ทาง + ซับคู่', desc: 'ทวีตเตอร์ มิดเบส และซับสองดอก', channels: ['TW_L', 'TW_R', 'MID_L', 'MID_R', 'SUB_L', 'SUB_R'] },
  { id: 'car-8', scene: 'car', name: 'หน้า 2 ทาง + เซ็นเตอร์ + หลัง + ซับ', desc: 'ชุดครบ 8 ช่อง', channels: ['TW_L', 'TW_R', 'MID_L', 'MID_R', 'CTR', 'RR_L', 'RR_R', 'SUB'] },
  { id: 'car-3w', scene: 'car', name: 'หน้า 3 ทาง + หลัง + ซับคู่', desc: 'ชุดครบ 10 ช่อง', channels: ['TW_L', 'TW_R', 'MR_L', 'MR_R', 'MID_L', 'MID_R', 'RR_L', 'RR_R', 'SUB_L', 'SUB_R'] },
];

export const layoutById = (id: string) => LAYOUTS.find(l => l.id === id);
export const layoutsFor = (p: CapabilityProfile, scene: Scene) => LAYOUTS.filter(l => l.scene === scene && l.channels.length <= p.outputs);
/** The layout that uses the most outputs of this model. */
export function defaultLayout(p: CapabilityProfile, scene: Scene): LayoutDef {
  const fits = layoutsFor(p, scene);
  return fits.reduce((best, l) => (l.channels.length > best.channels.length ? l : best), fits[0] ?? LAYOUTS[0]);
}

/**
 * Speaker protection. Tweeters and midranges keep their high-pass on, above a floor, at 12 dB/oct or steeper,
 * so no layout, preset or typed value can send full-range signal into them.
 */
export const MIN_HPF: Partial<Record<Kind, number>> = { tw: 1000, mr: 100 };
export const hpfLocked = (k: Kind) => MIN_HPF[k] !== undefined;

/** Snap a crossover to the nearest type/slope this model supports. */
export function fitXover(x: Xover, p: CapabilityProfile): Xover {
  const type = p.xo.types.includes(x.type) ? x.type : p.xo.types[0];
  const allowed = p.xo.slopes[type] ?? [12];
  const slope = allowed.reduce((best, s) => (Math.abs(s - x.slope) < Math.abs(best - x.slope) ? s : best), allowed[0]);
  return { ...x, type, slope };
}

export function guardXover(kind: Kind, hp: boolean, x: Xover, p: CapabilityProfile): Xover {
  const min = MIN_HPF[kind];
  const r = fitXover(x, p);
  if (!hp || min === undefined) return r;
  r.on = true;
  r.freq = Math.max(r.freq, min);
  if (r.slope < 12) {
    const steep = (p.xo.slopes[r.type] ?? []).filter(s => s >= 12);
    if (steep.length) r.slope = Math.min(...steep);
  }
  return r;
}

type XoSpec = [on: boolean, freq: number, slope: number, type: XoType];

function defaults(d: ChannelDef, scene: Scene, ctx: { hasSub: boolean; hasMR: boolean }): { hp: XoSpec; lp: XoSpec; gain: number } {
  const off: XoSpec = [false, 20000, 24, 'LR'];
  if (scene === 'speaker') {
    switch (d.kind) {
      case 'tw': return { hp: [true, ctx.hasMR ? 3000 : 2000, 24, 'LR'], lp: off, gain: -3 };
      case 'mr': return { hp: [true, 400, 24, 'LR'], lp: [true, 3000, 24, 'LR'], gain: 0 };
      case 'sub': return { hp: [true, 25, 12, 'BW'], lp: [true, 80, 24, 'LR'], gain: 0 };
      default: return { hp: ctx.hasSub ? [true, 80, 24, 'LR'] : [true, 40, 12, 'BW'], lp: d.kind === 'full' ? off : [true, ctx.hasMR ? 400 : 2000, 24, 'LR'], gain: 0 };
    }
  }
  switch (d.kind) {
    case 'tw': return { hp: [true, 3500, 24, 'LR'], lp: off, gain: -3 };
    case 'mr': return { hp: [true, 400, 24, 'LR'], lp: [true, 3500, 24, 'LR'], gain: 0 };
    case 'ctr': return { hp: [true, 250, 24, 'LR'], lp: [true, 4000, 24, 'LR'], gain: -6 };
    case 'rr': return { hp: [true, 80, 12, 'BW'], lp: [false, 20000, 12, 'BW'], gain: -6 };
    case 'sub': return { hp: [true, 25, 12, 'BW'], lp: [true, 70, 24, 'LR'], gain: 0 };
    default: return { hp: [true, 60, 24, 'LR'], lp: [true, ctx.hasMR ? 400 : 3500, 24, 'LR'], gain: 0 };
  }
}

export function buildChannels(p: CapabilityProfile, layout: LayoutDef): Channel[] {
  const defs = layout.channels.map(id => CHANNELS[id]);
  const ctx = { hasSub: defs.some(d => d.kind === 'sub'), hasMR: defs.some(d => d.kind === 'mr') };
  const xo = ([on, freq, slope, type]: XoSpec) => ({ on, freq, slope, type });
  return defs.map(d => {
    const x = defaults(d, layout.scene, ctx);
    return {
      ...d, color: KIND_COLOR[d.kind],
      hpf: guardXover(d.kind, true, xo(x.hp), p), lpf: guardXover(d.kind, false, xo(x.lp), p),
      gain: clamp(x.gain, p.channelGain[0], p.channelGain[1]), delay: 0, phase: false, mute: false, eqBypass: false, limiter: { on: false, threshold: -6 },
      eq: ISO.map(f => ({ f, g: 0, q: 4.32, t: 'pk' as BandType })),
    };
  });
}

export const inputCount = (p: CapabilityProfile, s: SourceId) => (s === 'hl' ? p.hlInputs : s === 'rca' ? p.rcaInputs : 2);

export function defaultRoute(channels: Channel[], inputs: number): Record<string, number[]> {
  const r: Record<string, number[]> = {};
  for (const c of channels) {
    if (c.kind === 'sub') r[c.id] = inputs >= 6 ? [4, 5] : [0, 1];
    else if (c.side === 2) r[c.id] = [0, 1];
    else if (c.rear && inputs >= 4) r[c.id] = [2 + c.side];
    else r[c.id] = [c.side];
  }
  return r;
}

export function initialState(p: CapabilityProfile, scene: Scene = p.scenes[0], layoutId?: string): TuningState {
  const found = layoutId ? layoutById(layoutId) : undefined;
  const layout = found && found.scene === scene && found.channels.length <= p.outputs ? found : defaultLayout(p, scene);
  const channels = buildChannels(p, layout);
  const source = p.sources[0];
  return { profileId: p.id, scene, layoutId: layout.id, channels, master: masterRange(p).start, link: true, source, route: defaultRoute(channels, inputCount(p, source)), distances: {} };
}

/** Speed of sound: 34.3 cm per millisecond at ~20 °C. */
export const CM_PER_MS = 34.3;

/**
 * Time alignment: the farthest speaker gets 0 ms and every nearer one is delayed by the extra travel time,
 * so all arrivals line up at the listening position. `clipped` means the model's maximum delay was not enough.
 */
export function delaysFromDistances(channels: Channel[], dist: Record<string, number>, p: CapabilityProfile): Record<string, { ms: number; clipped: boolean }> {
  const known = channels.filter(c => dist[c.id] > 0);
  const far = Math.max(0, ...known.map(c => dist[c.id]));
  const out: Record<string, { ms: number; clipped: boolean }> = {};
  for (const c of known) {
    const raw = (far - dist[c.id]) / CM_PER_MS;
    const ms = +clamp(Math.round(raw / p.delayStep) * p.delayStep, p.delayMs[0], p.delayMs[1]).toFixed(4);
    out[c.id] = { ms, clipped: raw > p.delayMs[1] + p.delayStep / 2 };
  }
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Minimal set of changes that turns device state `a` into `b` (used by undo/redo, A/B and preset loading). */
export function diffChanges(a: TuningState, b: TuningState, p: CapabilityProfile): Change[] {
  const out: Change[] = [];
  if (a.master !== b.master) out.push({ kind: 'master' });
  if (a.source !== b.source) out.push({ kind: 'input' });
  const limiter = p.extras.includes('limiter');
  for (const c of b.channels) {
    const o = a.channels.find(x => x.id === c.id);
    const ch = c.id;
    if (!o || o.gain !== c.gain) out.push({ kind: 'gain', ch });
    if (!o || o.delay !== c.delay) out.push({ kind: 'delay', ch });
    if (!o || o.phase !== c.phase) out.push({ kind: 'phase', ch });
    if (!o || o.mute !== c.mute) out.push({ kind: 'mute', ch });
    if (!o || !same(o.hpf, c.hpf)) out.push({ kind: 'xo', ch, hp: true });
    if (!o || !same(o.lpf, c.lpf)) out.push({ kind: 'xo', ch, hp: false });
    if (!o || !same(a.route[ch], b.route[ch])) out.push({ kind: 'route', ch });
    if (limiter && (!o || !same(o.limiter, c.limiter))) out.push({ kind: 'limiter', ch });
    c.eq.forEach((band, i) => { if (!o || o.eqBypass !== c.eqBypass || !same(o.eq[i], band)) out.push({ kind: 'eq', ch, band: i }); });
  }
  return out;
}
