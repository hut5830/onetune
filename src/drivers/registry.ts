import { Driver } from './types';
import { encodeDemo } from './demo';
import { PROFILES, profileById } from './profiles';

/**
 * One driver per model (or per protocol family once a family is confirmed to share bytes).
 * Unmapped drivers still render the full UI from the capability profile and emit demo-format
 * frames to the log only — they never write to real hardware until `mapped` is true.
 */
const unmapped = (id: string): Driver => ({ id, mapped: false, profile: profileById(id)!, encode: encodeDemo });
/** Simulated models: `mapped` so the UI treats them as working, but they have no BLE target and only ever log. */
const simulated = (id: string): Driver => ({ id, mapped: true, profile: profileById(id)!, encode: encodeDemo });

export const DRIVERS: Record<string, Driver> = Object.fromEntries(
  PROFILES.map(p => [p.id, p.family === 'demo' ? simulated(p.id) : unmapped(p.id)] as const),
);

export const driverFor = (profileId: string): Driver | undefined => DRIVERS[profileId];
