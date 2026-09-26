import { Driver, Scene } from '../drivers/types';
import { ble } from '../ble/client';
import { TuningSession } from './session';

// The one tuning session shared by the studio and its tool screens (align, inputs, presets).
let current: TuningSession | null = null;

export function openSession(driver: Driver, deviceId: string | null, deviceName: string | null = null, scene?: Scene): TuningSession {
  if (current && current.driver.id === driver.id && current.deviceId === deviceId && (!scene || current.state.scene === scene)) return current;
  current?.dispose();
  current = new TuningSession(driver, deviceId, deviceName, scene, ble.write);
  return current;
}
export const currentSession = () => current;
