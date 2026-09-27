import { Change, Frame } from './types';
import { TuningState } from '../model/tuning';

/**
 * Demo framing: [A5][cmd][len][payload…][sum & FF].
 * It exists only to exercise the queue/log pipeline. Real drivers replace
 * `encode` with the byte layout captured from each brand's app.
 */
const CMD = { EQ: 0x10, XO: 0x20, GAIN: 0x30, DELAY: 0x31, PHASE: 0x32, MUTE: 0x33, LIMIT: 0x34, INPUT: 0x40, ROUTE: 0x41, MASTER: 0x50 };
const u16 = (v: number) => { const n = Math.round(v) & 0xffff; return [n >> 8, n & 0xff]; };

function frame(key: string, label: string, cmd: number, payload: number[]): Frame {
  const b = [0xa5, cmd, payload.length, ...payload];
  b.push(b.reduce((a, x) => a + x, 0) & 0xff);
  return { key, label, bytes: Uint8Array.from(b) };
}

export function encodeDemo(change: Change, s: TuningState): Frame[] {
  const idx = (id: string) => s.channels.findIndex(c => c.id === id);
  const ch = 'ch' in change ? s.channels.find(c => c.id === change.ch) : undefined;
  switch (change.kind) {
    case 'eq': {
      const b = ch!.eq[change.band];
      return [frame(`eq${ch!.id}${change.band}`, `EQ ${ch!.short} #${change.band + 1}`, CMD.EQ,
        [idx(ch!.id), change.band, ...u16(b.f), ...u16(b.g * 10 + 1000), ...u16(b.q * 100), { pk: 0, ls: 1, hs: 2 }[b.t]])];
    }
    case 'xo': {
      const x = change.hp ? ch!.hpf : ch!.lpf;
      return [frame(`xo${ch!.id}${change.hp}`, `${change.hp ? 'HPF' : 'LPF'} ${ch!.short}`, CMD.XO,
        [idx(ch!.id), change.hp ? 1 : 0, x.on ? 1 : 0, ...u16(x.freq), x.slope, { BW: 0, LR: 1, BE: 2 }[x.type]])];
    }
    case 'gain': return [frame(`g${ch!.id}`, `GAIN ${ch!.short}`, CMD.GAIN, [idx(ch!.id), ...u16(ch!.gain * 10 + 1000)])];
    case 'delay': return [frame(`d${ch!.id}`, `DELAY ${ch!.short}`, CMD.DELAY, [idx(ch!.id), ...u16(Math.round(ch!.delay * 48))])];
    case 'phase': return [frame(`p${ch!.id}`, `PHASE ${ch!.short}`, CMD.PHASE, [idx(ch!.id), ch!.phase ? 1 : 0])];
    case 'limiter': return [frame(`l${ch!.id}`, `LIMIT ${ch!.short}`, CMD.LIMIT, [idx(ch!.id), ch!.limiter.on ? 1 : 0, ...u16(ch!.limiter.threshold * 10 + 1000)])];
    case 'mute': return [frame(`m${ch!.id}`, `MUTE ${ch!.short}`, CMD.MUTE, [idx(ch!.id), ch!.mute ? 1 : 0])];
    case 'route': return [frame(`r${ch!.id}`, `ROUTE ${ch!.short}`, CMD.ROUTE, [idx(ch!.id), (s.route[ch!.id] ?? []).reduce((m, i) => m | (1 << i), 0)])];
    case 'master': return [frame('mv', 'MASTER', CMD.MASTER, u16(s.master * 10 + 1000))];
    case 'input': return [frame('in', 'INPUT', CMD.INPUT, [['hl', 'rca', 'opt', 'bt', 'usb'].indexOf(s.source)])];
  }
}

