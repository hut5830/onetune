import { useSyncExternalStore } from 'react';
import { Change, Driver, Frame } from '../drivers/types';
import { captureLog } from '../ble/captureLog';
import { ble } from '../ble/client';
import { WriteQueue } from '../ble/writeQueue';
import { Band, Channel, Xover, TuningState, defaultRoute, fitXover, initialState, inputCount } from './tuning';
import { SourceId } from '../drivers/types';
import { clamp } from '../lib/format';

type Linkable = (c: Channel) => void;

export class TuningSession {
  state: TuningState;
  private listeners = new Set<() => void>();
  private queue: WriteQueue;

  constructor(readonly driver: Driver, readonly deviceId: string | null) {
    this.state = initialState(driver.profile);
    this.queue = new WriteQueue(f => this.transmit(f), (f, e) => captureLog.add('err', `ส่ง ${f.label} ไม่สำเร็จ: ${e instanceof Error ? e.message : e}`));
    this.queue.start();
  }

  get profile() { return this.driver.profile; }
  /** Real hardware is only written when the driver is mapped and a device is connected. */
  get live() { return this.driver.mapped && !!this.driver.ble && !!this.deviceId; }

  private async transmit(f: Frame) {
    if (this.live) {
      const t = this.driver.ble!;
      await ble.write(this.deviceId!, t.service, t.write, f.bytes, t.withResponse);
      captureLog.add('tx', f.label, f.bytes, t.write);
    } else {
      captureLog.add('tx', `${f.label} (จำลอง)`, f.bytes);
    }
  }

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getState = () => this.state;

  private commit(mutate: (s: TuningState) => void, changes: (s: TuningState) => Change[]) {
    const next: TuningState = JSON.parse(JSON.stringify(this.state));
    mutate(next);
    this.state = next;
    for (const c of changes(next)) this.queue.push(this.driver.encode(c, next));
    this.listeners.forEach(l => l());
  }

  /** Applies fn to the channel, and to its pair when L/R link is on. Returns affected ids. */
  private withPair(s: TuningState, chId: string, fn: Linkable, linkable = true): string[] {
    const c = s.channels.find(x => x.id === chId)!;
    fn(c);
    if (linkable && s.link && c.pair) { const p = s.channels.find(x => x.id === c.pair); if (p) { fn(p); return [c.id, p.id]; } }
    return [c.id];
  }

  setBand(chId: string, band: number, patch: Partial<Band>) {
    const e = this.profile.eq;
    let ids: string[] = [];
    this.commit(s => {
      ids = this.withPair(s, chId, c => {
        const b = c.eq[band];
        Object.assign(b, patch);
        b.g = clamp(b.g, e.gain[0], e.gain[1]); b.q = clamp(b.q, e.q[0], e.q[1]); b.f = clamp(Math.round(b.f), 20, 20000);
      });
    }, () => ids.map(ch => ({ kind: 'eq', ch, band })));
  }

  resetEq(chId: string) {
    let ids: string[] = [];
    this.commit(s => { ids = this.withPair(s, chId, c => c.eq.forEach(b => { b.g = 0; })); },
      s => ids.flatMap(ch => s.channels.find(c => c.id === ch)!.eq.map((_, band) => ({ kind: 'eq' as const, ch, band }))));
  }

  setBypass(chId: string, on: boolean) {
    let ids: string[] = [];
    this.commit(s => { ids = this.withPair(s, chId, c => { c.eqBypass = on; }); },
      s => ids.flatMap(ch => s.channels.find(c => c.id === ch)!.eq.map((_, band) => ({ kind: 'eq' as const, ch, band }))));
  }

  setXover(chId: string, hp: boolean, patch: Partial<Xover>) {
    let ids: string[] = [];
    this.commit(s => {
      ids = this.withPair(s, chId, c => {
        const x = { ...(hp ? c.hpf : c.lpf), ...patch };
        x.freq = clamp(Math.round(x.freq), 20, 20000);
        const fitted = fitXover(x, this.profile);
        if (hp) c.hpf = fitted; else c.lpf = fitted;
      });
    }, () => ids.map(ch => ({ kind: 'xo', ch, hp })));
  }

  setGain(chId: string, g: number) {
    const [lo, hi] = this.profile.channelGain; let ids: string[] = [];
    this.commit(s => { ids = this.withPair(s, chId, c => { c.gain = clamp(g, lo, hi); }); }, () => ids.map(ch => ({ kind: 'gain', ch })));
  }

  /** Delay is always per side, even with L/R link on (time alignment differs left/right). */
  setDelay(chId: string, ms: number) {
    const [lo, hi] = this.profile.delayMs, st = this.profile.delayStep;
    this.commit(s => { const c = s.channels.find(x => x.id === chId)!; c.delay = +clamp(Math.round(ms / st) * st, lo, hi).toFixed(4); },
      () => [{ kind: 'delay', ch: chId }]);
  }

  setPhase(chId: string, inverted: boolean) {
    let ids: string[] = [];
    this.commit(s => { ids = this.withPair(s, chId, c => { c.phase = inverted; }); }, () => ids.map(ch => ({ kind: 'phase', ch })));
  }

  toggleMute(chId: string) {
    this.commit(s => { const c = s.channels.find(x => x.id === chId)!; c.mute = !c.mute; }, () => [{ kind: 'mute', ch: chId }]);
  }

  setMaster(db: number) { this.commit(s => { s.master = clamp(Math.round(db), -60, 0); }, () => [{ kind: 'master' }]); }
  setLink(on: boolean) { this.commit(s => { s.link = on; }, () => []); }

  /** One-shot copy of EQ, crossover and gain to the paired channel (Alpine-style "copy L→R"). */
  copyToPair(chId: string) {
    let target = '';
    this.commit(s => {
      const c = s.channels.find(x => x.id === chId)!, p = s.channels.find(x => x.id === c.pair);
      if (!p) return;
      target = p.id;
      p.eq = c.eq.map(b => ({ ...b })); p.hpf = { ...c.hpf }; p.lpf = { ...c.lpf }; p.gain = c.gain; p.eqBypass = c.eqBypass;
    }, s => {
      if (!target) return [];
      const p = s.channels.find(x => x.id === target)!;
      return [{ kind: 'gain', ch: target }, { kind: 'xo', ch: target, hp: true }, { kind: 'xo', ch: target, hp: false }, ...p.eq.map((_, band) => ({ kind: 'eq' as const, ch: target, band }))];
    });
    return target;
  }

  setSource(src: SourceId) {
    this.commit(s => { s.source = src; s.route = defaultRoute(s.channels, inputCount(this.profile, src)); },
      s => [{ kind: 'input' }, ...s.channels.map(c => ({ kind: 'route' as const, ch: c.id }))]);
  }

  toggleRoute(chId: string, input: number) {
    this.commit(s => {
      const r = (s.route[chId] ??= []); const k = r.indexOf(input);
      if (k >= 0) r.splice(k, 1); else r.push(input);
    }, () => [{ kind: 'route', ch: chId }]);
  }

  sendAll() {
    const s = this.state;
    const all: Change[] = [{ kind: 'master' }, { kind: 'input' }];
    for (const c of s.channels) {
      all.push({ kind: 'gain', ch: c.id }, { kind: 'delay', ch: c.id }, { kind: 'phase', ch: c.id }, { kind: 'mute', ch: c.id },
        { kind: 'xo', ch: c.id, hp: true }, { kind: 'xo', ch: c.id, hp: false }, { kind: 'route', ch: c.id });
      c.eq.forEach((_, band) => all.push({ kind: 'eq', ch: c.id, band }));
    }
    for (const c of all) this.queue.push(this.driver.encode(c, s));
  }

  dispose() { this.queue.stop(); this.listeners.clear(); }
}

let current: TuningSession | null = null;

export function openSession(driver: Driver, deviceId: string | null): TuningSession {
  if (current && current.driver.id === driver.id && current.deviceId === deviceId) return current;
  current?.dispose();
  current = new TuningSession(driver, deviceId);
  return current;
}
export const currentSession = () => current;

export function useSessionState(s: TuningSession): TuningState {
  return useSyncExternalStore(s.subscribe, s.getState);
}
