import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TuneMode = 'easy' | 'pro';
export interface Settings {
  /** Vibration feedback on taps and drags. */
  haptics: boolean;
  /** Screen the studio opens on: simple (remote-style) or detailed. */
  mode: TuneMode;
  /** Keep the phone screen on while the studio is open. */
  keepAwake: boolean;
}

const KEY = 'onetune.settings.v1';
let current: Settings = { haptics: true, mode: 'easy', keepAwake: true };
const listeners = new Set<() => void>();

export const settings = {
  get: () => current,
  set(patch: Partial<Settings>) {
    current = { ...current, ...patch };
    listeners.forEach(l => l());
    AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => {});
  },
  async load() {
    try { const raw = await AsyncStorage.getItem(KEY); if (raw) { current = { ...current, ...JSON.parse(raw) }; listeners.forEach(l => l()); } } catch { /* defaults */ }
  },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export const useSettings = () => useSyncExternalStore(settings.subscribe, settings.get);
