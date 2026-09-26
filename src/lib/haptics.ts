import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Haptics are feedback only: failures (web, devices without a motor) are ignored.
const on = Platform.OS !== 'web';
export const haptic = {
  tick: () => { if (on) void Haptics.selectionAsync().catch(() => {}); },
  tap: () => { if (on) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  bump: () => { if (on) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
  ok: () => { if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  warn: () => { if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
};
