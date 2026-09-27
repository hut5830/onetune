import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { settings } from '../model/settings';

// Haptics are feedback only: failures (web, devices without a motor) are ignored, and the user can turn them off.
const on = () => Platform.OS !== 'web' && settings.get().haptics;
export const haptic = {
  tick: () => { if (on()) void Haptics.selectionAsync().catch(() => {}); },
  tap: () => { if (on()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  bump: () => { if (on()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
  ok: () => { if (on()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  warn: () => { if (on()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
};
