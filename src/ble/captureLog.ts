import { useSyncExternalStore } from 'react';
import { toAscii, toHex } from '../lib/hex';

export type LogDir = 'tx' | 'rx' | 'note' | 'err';
export interface LogEntry { id: number; t: number; dir: LogDir; label: string; hex?: string; ascii?: string; char?: string }

const MAX = 500;
let entries: LogEntry[] = [];
let seq = 0;
let paused = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const captureLog = {
  add(dir: LogDir, label: string, bytes?: Uint8Array, char?: string) {
    if (paused && dir !== 'err') return;
    const e: LogEntry = { id: ++seq, t: Date.now(), dir, label, char, hex: bytes && toHex(bytes), ascii: bytes && toAscii(bytes) };
    entries = [...entries.slice(-(MAX - 1)), e];
    emit();
  },
  clear() { entries = []; emit(); },
  setPaused(p: boolean) { paused = p; emit(); },
  isPaused: () => paused,
  all: () => entries,
  toJson: () => JSON.stringify(entries.map(e => ({ ...e, time: new Date(e.t).toISOString() })), null, 2),
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export const useCaptureLog = () => useSyncExternalStore(captureLog.subscribe, captureLog.all);
export const useLogPaused = () => useSyncExternalStore(captureLog.subscribe, captureLog.isPaused);
