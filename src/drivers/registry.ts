import { Driver } from './types';
import { encodeDemo } from './demo';
import { encodeXyv122, XYV122_BLE } from './xyv122';
import { PROFILES, profileById } from './profiles';

/**
 * One driver per model (or per protocol family once a family is confirmed to share bytes).
 * Unmapped drivers still render the full UI from the capability profile and emit demo-format
 * frames to the log only — they never write to real hardware until `mapped` is true.
 */
const unmapped = (id: string): Driver => ({ id, mapped: false, profile: profileById(id)!, encode: encodeDemo });
/** Simulated models: `mapped` so the UI treats them as working, but they have no BLE target and only ever log. */
const simulated = (id: string): Driver => ({ id, mapped: true, profile: profileById(id)!, encode: encodeDemo });

/** Real drivers. `mapped` because every frame they emit was verified on hardware via the Inspector. */
const REAL: Record<string, Driver> = {
  ht21max: { id: 'ht21max', mapped: true, profile: profileById('ht21max')!, ble: XYV122_BLE, encode: encodeXyv122 },
};

export const DRIVERS: Record<string, Driver> = Object.fromEntries(
  PROFILES.map(p => [p.id, REAL[p.id] ?? (p.family === 'demo' ? simulated(p.id) : unmapped(p.id))] as const),
);

export const driverFor = (profileId: string): Driver | undefined => DRIVERS[profileId];
