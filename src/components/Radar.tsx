import { useEffect, useRef } from 'react';
import { useSvgId } from '../lib/svgId';
import { Animated, Easing, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { C, G, alpha } from '../theme';
import { Icon } from './Icon';

/** Bluetooth scan indicator: expanding rings while scanning, calm glow when idle. */
export function Radar({ active, size = 170 }: { active: boolean; size?: number }) {
  const rings = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { rings.forEach(r => r.setValue(0)); spin.setValue(0); return; }
    const loops = rings.map((r, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 600),
      Animated.timing(r, { toValue: 1, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    const sweep = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }));
    loops.forEach(l => l.start()); sweep.start();
    return () => { loops.forEach(l => l.stop()); sweep.stop(); };
  }, [active]);

  const core = size * 0.38;
  const u = useSvgId();
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id={u + 'rg'} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={C.violet} stopOpacity={0.35} /><Stop offset="1" stopColor={C.violet} stopOpacity={0} /></RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${u}rg)`} />
        {[0.34, 0.42].map(k => <Circle key={k} cx={size / 2} cy={size / 2} r={size * k} fill="none" stroke={C.cyan} strokeOpacity={0.14} strokeDasharray="2 5" />)}
      </Svg>
      {rings.map((r, i) => (
        <Animated.View key={i} pointerEvents="none" style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: C.cyan,
          opacity: r.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.7, 0] }),
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }],
        }} />
      ))}
      {active && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size * 0.84, height: size * 0.84, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          <LinearGradient colors={[alpha(C.cyan, 0.55), alpha(C.cyan, 0)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', left: size * 0.42, top: size * 0.42 - 1, width: size * 0.42, height: 2, borderRadius: 1 }} />
        </Animated.View>
      )}
      <View style={{ width: core, height: core, borderRadius: core / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: C.cyan, shadowOpacity: 0.8, shadowRadius: 20, elevation: 10 }}>
        <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', width: core, height: core }} />
        <View><Icon name="bluetooth" size={core * 0.45} color={C.onAccent} width={2.2} /></View>
      </View>
    </View>
  );
}
