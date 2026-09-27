import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { C } from '../theme';
import { Icon } from './Icon';

/** Bluetooth scan indicator: soft expanding rings while scanning, still when idle. */
export function Radar({ active, size = 132 }: { active: boolean; size?: number }) {
  const rings = useRef([0, 1].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (!active) { rings.forEach(r => r.setValue(0)); return; }
    const loops = rings.map((r, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 900),
      Animated.timing(r, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [active]);

  const core = size * 0.46;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size * 0.78, height: size * 0.78, borderRadius: size, borderWidth: 1, borderColor: C.line2 }} />
      {rings.map((r, i) => (
        <Animated.View key={i} pointerEvents="none" style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: C.accent,
          opacity: r.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.5, 0] }),
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }],
        }} />
      ))}
      <View style={{ width: core, height: core, borderRadius: core / 2, backgroundColor: active ? C.accent : C.panel3, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="bluetooth" size={core * 0.46} color={active ? C.onAccent : C.ink} width={2.2} />
      </View>
    </View>
  );
}
