import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, alpha } from '../theme';
import { Icon, IconName } from './Icon';

type Tone = 'ok' | 'info' | 'warn';
const TONE: Record<Tone, { color: string; icon: IconName }> = { ok: { color: C.ok, icon: 'check' }, info: { color: C.cyan, icon: 'info' }, warn: { color: C.amber, icon: 'warn' } };

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
      Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 7 }),
      Animated.delay(2200),
      Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);
  const t = msg ? TONE[msg.tone] : TONE.ok;
  return (
    <Ctx.Provider value={show}>
      {children}
      <Animated.View pointerEvents="none" style={[s.wrap, { bottom: inset.bottom + 24, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
        <View style={[s.toast, { borderColor: alpha(t.color, 0.5), shadowColor: t.color }]}>
          <Icon name={t.icon} size={18} color={t.color} />
          <Text style={s.text}>{msg?.text}</Text>
        </View>
      </Animated.View>
    </Ctx.Provider>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0D1427F2', borderWidth: 1, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10, maxWidth: 520 },
  text: { fontFamily: F.bodyMed, color: C.ink, fontSize: 14, lineHeight: 20, flexShrink: 1 },
});
