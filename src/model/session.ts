import { useSyncExternalStore } from 'react';
import { Change, Driver, Frame, Scene, SourceId } from '../drivers/types';
import { captureLog } from '../ble/captureLog';
import { WriteQueue } from '../ble/writeQueue';
import { Band, Channel, Limiter, Xover, TuningState, GROUPS, LIMIT_RANGE, defaultRoute, delaysFromDistances, diffChanges, guardXover, initialState, inputCount, layoutById } from './tuning';
import { clamp } from '../lib/format';

type Linkable = (c: Channel) => void;
/** Writes bytes to the device. Injected so this module stays free of native BLE code (and testable in Node). */
export type Writer = (deviceId: string, service: string, char: string, bytes: Uint8Array, withResponse: boolean) => Promise<void>;

/** Session facts that are not part of the tuning itself (never saved in presets). */
export interface SessionMeta { canUndo: boolean; canRedo: boolean; ab: 'off' | 'A' | 'B'; solo: string | null }

const HISTORY = 100;
/** Edits of the same control closer together than this collapse into one undo step (e.g. a slider drag). */
const MERGE_MS = 900;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export class TuningSession {
  state: TuningState;
  private listeners = new Set<() => void>();
  private queue: WriteQueue;
  private past: TuningState[] = [];
  private future: TuningState[] = [];
  private lastTag = '';
  private lastAt = 0;
  private abOther: TuningState | null = null;
  private abSide: 'A' | 'B' = 'B';
  private soloId: string | null = null;
  private soloBackup: Record<string, boolean> = {};
  private snap: { state: TuningState; meta: SessionMeta };

  constructor(readonly driver: Driver, readonly deviceId: string | null, readonly deviceName: string | null = null, scene?: Scene, private write?: Writer) {
    this.state = initialState(driver.profile, scene && driver.profile.scenes.includes(scene) ? scene : driver.profile.scenes[0]);
    this.snap = { state: this.state, meta: this.meta() };
    this.queue = new WriteQueue(f => this.transmit(f), (f, e) => captureLog.add('err', `ส่ง ${f.label} ไม่สำเร็จ: ${e instanceof Error ? e.message : e}`));
    this.queue.start();
  }

  get profile() { return this.driver.profile; }
  /** Real hardware is only written when the driver is mapped and a device is connected. */
  get live() { return this.driver.mapped && !!this.driver.ble && !!this.deviceId && !!this.write; }

  private async transmit(f: Frame) {
    if (this.live) {
      const t = this.driver.ble!;
      await this.write!(this.deviceId!, t.service, t.write, f.bytes, t.withResponse);
      captureLog.add('tx', f.label, f.bytes, t.write);
    } else {
      captureLog.add('tx', `${f.label} (จำลอง)`, f.bytes);
    }
  }

  private meta(): SessionMeta {
    return { canUndo: this.past.length > 0, canRedo: this.future.length > 0, ab: this.abOther ? this.abSide : 'off', solo: this.soloId };
  }
  private emit() { this.snap = { state: this.state, meta: this.meta() }; this.listeners.forEach(l => l()); }

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getState = () => this.state;
  getSnap = () => this.snap;

  private send(changes: Change[], s: TuningState) { for (const c of changes) this.queue.push(this.driver.encode(c, s)); }

  /** Record `prev` for undo unless this edit continues the previous one (same tag, quick succession). */
  private remember(prev: TuningState, tag: string) {
    const now = Date.now();
    if (!(tag && tag === this.lastTag && now - this.lastAt < MERGE_MS)) {
      this.past.push(prev);
      if (this.past.length > HISTORY) this.past.shift();
    }
    this.future = [];
    this.lastTag = tag; this.lastAt = now;
  }

  private commit(mutate: (s: TuningState) => void, changes: (s: TuningState) => Change[], tag = '') {
    const prev = this.state;
    const next: TuningState = clone(prev);
    mutate(next);
    this.remember(prev, tag);
    this.state = next;
    this.send(changes(next), next);
    this.emit();
  }

  /** Jump to a whole state, sending only what differs. */
  private jump(next: TuningState) {
    const prev = this.state;
    this.state = next;
    this.send(diffChanges(prev, next, this.profile), next);
    this.lastTag = '';
    this.emit();
  }

  /** Applies fn to the channel, and to its pair when L/R link is on. Returns affected ids. */
  private withPair(s: TuningState, chId: string, fn: Linkable, linkable = true): string[] {
    const c = s.channels.find(x => x.id === chId)!;
    fn(c);
    if (linkable && s.link && c.pair) { const p = s.channels.find(x => x.id === c.pair); if (p) { fn(p); return [c.id, p.id]; } }
    return [c.id];
  }

  // ── history & comparison ─────────────────────────────────────────────
  undo() { const p = this.past.pop(); if (!p) return; this.future.push(this.state); this.jump(p); }
  redo() { const n = this.future.pop(); if (!n) return; this.past.push(this.state); this.jump(n); }

  /** Keep the current sound as "A" and continue editing a copy ("B"). */
  abStart() { this.abOther = clone(this.state); this.abSide = 'B'; this.emit(); }
  /** Swap between A and B so both can be heard on the device. */
  abSwap() {
    if (!this.abOther) return;
    const other = this.abOther;
    this.abOther = this.state;
    this.abSide = this.abSide === 'A' ? 'B' : 'A';
    this.jump(other);
  }
  /** Stop comparing and keep whatever is playing now. */
  abEnd() { this.abOther = null; this.emit(); }

  // ── per-channel edits ────────────────────────────────────────────────
  setBand(chId: string, band: number, patch: Partial<Band>) {
    const e = this.profile.eq;
    let ids: string[] = [];
    this.commit(s => {
      ids = this.withPair(s, chId, c => {
        const b = c.eq[band];
        Object.assign(b, patch);
        b.g = clamp(b.g, e.gain[0], e.gain[1]); b.q = clamp(b.q, e.q[0], e.q[1]); b.f = clamp(Math.round(b.f), 20, 20000);
      });
    }, () => ids.map(ch => ({ kind: 'eq', ch, band })), `eq:${chId}:${band}`);
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

  /** Crossover edits pass through the speaker-protection guard (tweeter/midrange HPF floor). */
  setXover(chId: string, hp: boolean, patch: Partial<Xover>) {
    let ids: string[] = [];
    this.commit(s => {
      ids = this.withPair(s, chId, c => {
        const x = { ...(hp ? c.hpf : c.lpf), ...patch };
        x.freq = clamp(Math.round(x.freq), 20, 20000);
        const fitted = guardXover(c.kind, hp, x, this.profile);
        if (hp) c.hpf = fitted; else c.lpf = fitted;
      });
    }, () => ids.map(ch => ({ kind: 'xo', ch, hp })), `xo:${chId}:${hp}`);
  }

  setGain(chId: string, g: number) {
    const [lo, hi] = this.profile.channelGain; let ids: string[] = [];
    this.commit(s => { ids = this.withPair(s, chId, c => { c.gain = +clamp(g, lo, hi).toFixed(2); }); }, () => ids.map(ch => ({ kind: 'gain', ch })), `gain:${chId}`);
  }

  /** Delay is always per side, even with L/R link on (time alignment differs left/right). */
  setDelay(chId: string, ms: number) {
    const [lo, hi] = this.profile.delayMs, st = this.profile.delayStep;
    this.commit(s => { const c = s.channels.find(x => x.id === chId)!; c.delay = +clamp(Math.round(ms / st) * st, lo, hi).toFixed(4); },
      () => [{ kind: 'delay', ch: chId }], `delay:${chId}`);
  }

  setPhase(chId: string, inverted: boolean) {
    let ids: string[] = [];
    this.commit(s => { ids = this.withPair(s, chId, c => { c.phase = inverted; }); }, () => ids.map(ch => ({ kind: 'phase', ch })));
  }

  setLimiter(chId: string, patch: Partial<Limiter>) {
    let ids: string[] = [];
    this.commit(s => {
      ids = this.withPair(s, chId, c => { Object.assign(c.limiter, patch); c.limiter.threshold = +clamp(c.limiter.threshold, LIMIT_RANGE[0], LIMIT_RANGE[1]).toFixed(1); });
    }, () => ids.map(ch => ({ kind: 'limiter', ch })), `lim:${chId}`);
  }

  toggleMute(chId: string) {
    this.soloId = null;
    this.commit(s => { const c = s.channels.find(x => x.id === chId)!; c.mute = !c.mute; }, () => [{ kind: 'mute', ch: chId }]);
  }

  muteAll(on: boolean) {
    this.soloId = null;
    this.commit(s => s.channels.forEach(c => { c.mute = on; }), s => s.channels.map(c => ({ kind: 'mute' as const, ch: c.id })));
  }

  /** Listen to one output alone; calling again on the same channel restores the previous mutes. */
  solo(chId: string) {
    if (this.soloId === chId) {
      const back = this.soloBackup;
      this.soloId = null;
      this.commit(s => s.channels.forEach(c => { c.mute = back[c.id] ?? false; }), s => s.channels.map(c => ({ kind: 'mute' as const, ch: c.id })));
      return;
    }
    if (!this.soloId) this.soloBackup = Object.fromEntries(this.state.channels.map(c => [c.id, c.mute]));
    this.soloId = chId;
    this.commit(s => s.channels.forEach(c => { c.mute = c.id !== chId; }), s => s.channels.map(c => ({ kind: 'mute' as const, ch: c.id })));
  }

  rename(chId: string, name: string) {
    this.commit(s => { const c = s.channels.find(x => x.id === chId)!; c.custom = name.trim() || undefined; }, () => []);
  }

  setMaster(db: number) { this.commit(s => { s.master = clamp(Math.round(db), -60, 0); }, () => [{ kind: 'master' }], 'master'); }
  setLink(on: boolean) { this.commit(s => { s.link = on; }, () => []); }

  /**
   * Simple-mode level: moves every output of a group together by the same amount, so the
   * balance between them (e.g. left/right trims) is kept.
   */
  setGroupLevel(groupId: string, level: number) {
    const g = GROUPS.find(x => x.id === groupId); if (!g) return;
    const [lo, hi] = this.profile.channelGain;
    const members = this.state.channels.filter(c => g.kinds.includes(c.kind));
    if (!members.length) return;
    const delta = level - members.reduce((a, c) => a + c.gain, 0) / members.length;
    this.commit(s => s.channels.forEach(c => { if (g.kinds.includes(c.kind)) c.gain = +clamp(c.gain + delta, lo, hi).toFixed(2); }),
      () => members.map(c => ({ kind: 'gain' as const, ch: c.id })), `group:${groupId}`);
  }

  /** One-shot copy of EQ, crossover (re-guarded for the target) and gain to other outputs. Delay is never copied. */
  copyTo(srcId: string, targets: string[]) {
    const src = this.state.channels.find(c => c.id === srcId); if (!src) return;
    const ids = targets.filter(t => t !== srcId && this.state.channels.some(c => c.id === t));
    if (!ids.length) return;
    const limiter = this.profile.extras.includes('limiter');
    this.commit(s => {
      for (const c of s.channels) if (ids.includes(c.id)) {
        c.eq = src.eq.map(b => ({ ...b })); c.eqBypass = src.eqBypass; c.gain = src.gain; c.limiter = { ...src.limiter };
        c.hpf = guardXover(c.kind, true, { ...src.hpf }, this.profile); c.lpf = guardXover(c.kind, false, { ...src.lpf }, this.profile);
      }
    }, s => ids.flatMap((ch): Change[] => [
      { kind: 'gain', ch }, { kind: 'xo', ch, hp: true }, { kind: 'xo', ch, hp: false },
      ...(limiter ? [{ kind: 'limiter' as const, ch }] : []),
      ...s.channels.find(c => c.id === ch)!.eq.map((_, band) => ({ kind: 'eq' as const, ch, band })),
    ]));
  }

  /** Copy to the paired L/R channel. Returns the target id ('' when there is no pair). */
  copyToPair(chId: string) {
    const c = this.state.channels.find(x => x.id === chId);
    if (!c?.pair || !this.state.channels.some(x => x.id === c.pair)) return '';
    this.copyTo(chId, [c.pair]);
    return c.pair;
  }

  /** Back to this layout's safe defaults for one output (name and delay included). */
  resetChannel(chId: string) {
    const fresh = initialState(this.profile, this.state.scene, this.state.layoutId).channels.find(c => c.id === chId);
    if (!fresh) return;
    const next = clone(this.state);
    next.channels = next.channels.map(c => (c.id === chId ? fresh : c));
    this.remember(this.state, '');
    this.jump(next);
  }

  setSource(src: SourceId) {
    this.commit(s => { s.source = src; s.route = defaultRoute(s.channels, inputCount(this.profile, src)); },
      s => [{ kind: 'input' }, ...s.channels.map(c => ({ kind: 'route' as const, ch: c.id }))]);
  }

  toggleRoute(chId: string, input: number) {
    this.commit(s => {
      const r = (s.route[chId] ??= []); const k = r.indexOf(input);
      if (k >= 0) r.splice(k, 1); else r.push(input);
      r.sort((a, b) => a - b);
    }, () => [{ kind: 'route', ch: chId }]);
  }

  /** Switch installation / speaker layout. Rebuilds channels with safe defaults. */
  setLayout(scene: Scene, layoutId: string) {
    const l = layoutById(layoutId);
    if (!l || l.scene !== scene || l.channels.length > this.profile.outputs) return;
    const fresh = initialState(this.profile, scene, layoutId);
    const next = clone(this.state);
    Object.assign(next, { scene, layoutId, channels: fresh.channels, route: defaultRoute(fresh.channels, inputCount(this.profile, next.source)), distances: {} });
    this.soloId = null;
    this.remember(this.state, '');
    this.jump(next);
  }

  /** Store distances and set every measured channel's delay from them. */
  applyDistances(dist: Record<string, number>) {
    const d = delaysFromDistances(this.state.channels, dist, this.profile);
    this.commit(s => {
      s.distances = { ...dist };
      for (const c of s.channels) if (d[c.id]) c.delay = d[c.id].ms;
    }, () => Object.keys(d).map(ch => ({ kind: 'delay' as const, ch })));
  }

  /**
   * Replace the whole state (preset / last session). Rejects states from another model and
   * re-applies the crossover guard so a stored preset can never bypass speaker protection.
   */
  loadState(st: TuningState): boolean {
    if (!st || st.profileId !== this.profile.id || !Array.isArray(st.channels) || !layoutById(st.layoutId) || st.channels.length > this.profile.outputs) return false;
    const next = clone(st);
    next.distances ??= {};
    for (const c of next.channels) {
      c.limiter ??= { on: false, threshold: -6 };
      c.hpf = guardXover(c.kind, true, c.hpf, this.profile); c.lpf = guardXover(c.kind, false, c.lpf, this.profile);
    }
    this.soloId = null;
    this.remember(this.state, '');
    this.jump(next);
    return true;
  }

  /** Push everything, e.g. after (re)connecting to a device: diff against an empty device. */
  sendAll() {
    const empty = { ...this.state, channels: [], master: NaN, source: '' as SourceId };
    this.send(diffChanges(empty, this.state, this.profile), this.state);
  }

  dispose() { this.queue.stop(); this.listeners.clear(); }
}

export function useSessionState(s: TuningSession): TuningState {
  return useSyncExternalStore(s.subscribe, s.getSnap).state;
}
export function useSessionMeta(s: TuningSession): SessionMeta {
  return useSyncExternalStore(s.subscribe, s.getSnap).meta;
}
