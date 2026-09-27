import { Linking, Platform } from 'react-native';
import { ActivityAction, ResultCode, startActivityAsync } from 'expo-intent-launcher';
import { requestBlePermissions } from './permissions';

export type PowerResult = 'on' | 'declined' | 'no-permission' | 'settings';

/**
 * Turn Bluetooth on from inside the app. Android shows its own "allow OneTune to turn on Bluetooth?"
 * dialog (apps may no longer switch it silently since Android 13); if that intent is unavailable we open
 * the Bluetooth settings page instead. iOS has no such API, so it opens the app's settings.
 */
export async function turnOnBluetooth(): Promise<PowerResult> {
  if (Platform.OS !== 'android') { await Linking.openSettings(); return 'settings'; }
  if (!(await requestBlePermissions())) return 'no-permission';
  try {
    const r = await startActivityAsync('android.bluetooth.adapter.action.REQUEST_ENABLE');
    return r.resultCode === ResultCode.Success ? 'on' : 'declined';
  } catch {
    try { await startActivityAsync(ActivityAction.BLUETOOTH_SETTINGS); } catch { await Linking.openSettings(); }
    return 'settings';
  }
}
