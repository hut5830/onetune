import { Driver } from './types';
import { demoDriver, encodeDemo } from './demo';
import { PROFILES, profileById } from './profiles';

/**
 * One driver per model (or per protocol family once a family is confirmed to share bytes).
 * Unmapped drivers still render the full UI from the capability profile and emit demo-format
 * frames to the log only — they never write to real hardware until `mapped` is true.
 */
const unmapped = (id: string): Driver => ({ id, mapped: false, profile: profileById(id)!, encode: encodeDemo });

export const DRIVERS: Record<string, Driver> = Object.fromEntries([
  ['demo', demoDriver],
  ...PROFILES.filter(p => p.id !== 'demo').map(p => [p.id, unmapped(p.id)] as const),
]);

export const driverFor = (profileId: string): Driver | undefined => DRIVERS[profileId];
