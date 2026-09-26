import { PermissionsAndroid, Platform } from 'react-native';

/** Android 12+ needs BLUETOOTH_SCAN/CONNECT; older versions need fine location to scan. */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  const P = PermissionsAndroid.PERMISSIONS;
  const wanted = api >= 31 ? [P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT] : [P.ACCESS_FINE_LOCATION];
  const res = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every(p => res[p] === PermissionsAndroid.RESULTS.GRANTED);
}
