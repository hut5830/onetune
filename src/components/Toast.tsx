import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme';
import { Icon, IconName } from './Icon';

type Tone = 'ok' | 'info' | 'warn';
const TONE: Record<Tone, { color: string; icon: IconName }> = { ok: { color: C.ok, icon: 'check' }, info: { color: C.accent, icon: 'info' }, warn: { color: C.warn, icon: 'warn' } };

const Ctx = createContext<(msg: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; tone: Tone } | null>(null);
  const a = useRef(new Animated.Value(0)).current;
  const inset = useSafeAreaInsets();
  const show = useCallback((text: string, tone: Tone = 'ok') => {
    setMsg({ text, tone });
    a.stopAnimation();
    Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(a, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);
  const t = msg ? TONE[msg.tone] : TONE.ok;
  return (
    <Ctx.Provider value={show}>
      {children}
      <Animated.View pointerEvents="none" style={[s.wrap, { bottom: inset.bottom + 24, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        <View style={s.toast}>
          <Icon name={t.icon} size={18} color={t.color} />
          <Text style={s.text}>{msg?.text}</Text>
        </View>
      </Animated.View>
    </Ctx.Provider>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.panel3, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, maxWidth: 520 },
  text: { fontFamily: F.medium, color: C.ink, fontSize: 14, lineHeight: 20, flexShrink: 1 },
});
