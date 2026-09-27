import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import { haptic } from '../lib/haptics';
import { C, F, alpha } from '../theme';
import { Icon, IconName } from './Icon';

export type ScanPhase = 'idle' | 'scanning' | 'off' | 'unavailable';
export interface Blip { id: string; name: string | null; rssi: number | null; tone: 'ok' | 'known' | 'unknown' }

/** How flat the radar disk looks: 1 = seen from straight above, smaller = more tilted. */
const TILT = 0.42;
const SLICES = 14;

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967295; };

/**
 * Hero Bluetooth scanner: a tilted radar disk with a rotating sweep and ripples, a floating
 * orb that starts the scan (or turns Bluetooth on), and found devices popping up as pins —
 * closer to the centre means a stronger signal.
 */
export function ScanStage({ phase, blips, onCore, onBlip, found }: { phase: ScanPhase; blips: Blip[]; onCore: () => void; onBlip: (id: string) => void; found: number }) {
  const [w, setW] = useState(0);
  const W = Math.min(w, 560);
  const R = W / 2 - 14, RY = R * TILT;
  const orb = Math.min(118, W * 0.3);
  const H = RY * 2 + orb + 96;
  const cx = W / 2, cy = H - RY - 34;
  const scanning = phase === 'scanning';

  const spin = useRef(new Animated.Value(0)).current;
  const slow = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const ripples = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = [
      Animated.loop(Animated.timing(slow, { toValue: 1, duration: 40000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  useEffect(() => {
    if (!scanning) { spin.stopAnimation(); ripples.forEach(r => r.setValue(0)); return; }
    spin.setValue(0);
    const loops = [
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true })),
      ...ripples.map((r, i) => Animated.loop(Animated.sequence([
        Animated.delay(i * 700),
        Animated.timing(r, { toValue: 1, duration: 2100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]))),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [scanning]);

  const tint = phase === 'off' ? C.warn : phase === 'unavailable' ? C.muted : C.accent;
  const deg = (v: Animated.Value, turns = 1) => v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * turns}deg`] });

  // Sweep: a wedge built from thin slices whose opacity trails off behind the leading edge.
  const sweep = useMemo(() => {
    if (!R) return [];
    const out: { d: string; o: number }[] = [];
    for (let i = 0; i < SLICES; i++) {
      const a0 = (-(i + 1) * 4 * Math.PI) / 180, a1 = (-i * 4 * Math.PI) / 180;
      out.push({ d: `M${R} ${R}L${R + R * Math.cos(a0)} ${R + R * Math.sin(a0)}A${R} ${R} 0 0 1 ${R + R * Math.cos(a1)} ${R + R * Math.sin(a1)}Z`, o: 0.34 * (1 - i / SLICES) ** 1.6 });
    }
    return out;
  }, [R]);

  const label: Record<ScanPhase, string> = {
    idle: 'แตะเพื่อค้นหา',
    scanning: found ? `กำลังค้นหา · พบ ${found}` : 'กำลังค้นหา…',
    off: 'Bluetooth ปิดอยู่ · แตะเพื่อเปิด',
    unavailable: 'แอปรุ่นนี้ไม่มี Bluetooth',
  };
  const coreIcon: IconName = phase === 'off' || phase === 'unavailable' ? 'bluetoothOff' : 'bluetooth';

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ width: '100%', alignItems: 'center' }}>
      {W > 0 && (
        <View style={{ width: W, height: H }}>
          {/* disk */}
          <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
            <Ellipse cx={cx} cy={cy} rx={R} ry={RY} fill={alpha(tint, 0.05)} stroke={alpha(tint, 0.35)} strokeWidth={1.5} />
            {[0.75, 0.5, 0.25].map(k => <Ellipse key={k} cx={cx} cy={cy} rx={R * k} ry={RY * k} fill="none" stroke={alpha(tint, 0.18)} strokeWidth={1} />)}
            <Line x1={cx - R} x2={cx + R} y1={cy} y2={cy} stroke={alpha(tint, 0.12)} />
            <Line x1={cx} x2={cx} y1={cy - RY} y2={cy + RY} stroke={alpha(tint, 0.12)} />
            {Array.from({ length: 48 }, (_, i) => {
              const a = (i / 48) * Math.PI * 2, k = i % 4 === 0 ? 0.94 : 0.97;
              return <Line key={i} x1={cx + R * Math.cos(a)} y1={cy + RY * Math.sin(a)} x2={cx + R * k * Math.cos(a)} y2={cy + RY * k * Math.sin(a)} stroke={alpha(tint, i % 4 === 0 ? 0.5 : 0.25)} strokeWidth={1} />;
            })}
          </Svg>

          {/* rotating layers live in a square that is squashed into the disk's ellipse */}
          <View pointerEvents="none" style={{ position: 'absolute', left: cx - R, top: cy - R, width: R * 2, height: R * 2, transform: [{ scaleY: TILT }] }}>
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: deg(slow) }] }]}>
              <Svg width={R * 2} height={R * 2}>
                <Circle cx={R} cy={R} r={R * 0.88} fill="none" stroke={alpha(tint, 0.35)} strokeWidth={2} strokeDasharray="2 14" />
              </Svg>
            </Animated.View>
            {scanning && ripples.map((r, i) => (
              <Animated.View key={i} style={[StyleSheet.absoluteFill, { borderRadius: R, borderWidth: 2.5, borderColor: C.accent, opacity: r.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.6, 0] }), transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] }) }] }]} />
            ))}
            {scanning && (
              <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: deg(spin) }] }]}>
                <Svg width={R * 2} height={R * 2}>
                  {sweep.map((s, i) => <Path key={i} d={s.d} fill={C.accent} opacity={s.o} />)}
                  <Line x1={R} y1={R} x2={R * 2} y2={R} stroke={C.accent} strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
                </Svg>
              </Animated.View>
            )}
          </View>

          {/* orb shadow on the disk */}
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: cx - orb * 0.45, top: cy - orb * 0.1, width: orb * 0.9, height: orb * 0.2, borderRadius: orb, backgroundColor: '#000', opacity: bob.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.25] }), transform: [{ scaleX: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) }] }} />

          {/* floating orb */}
          <Animated.View style={{ position: 'absolute', left: cx - orb / 2, top: cy - RY * 0.35 - orb - 14, width: orb, height: orb, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: orb, backgroundColor: tint, opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] }), transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1.32] }) }] }]} />
            {scanning && (
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ rotate: deg(spin, -1) }] }]}>
                <Svg width={orb} height={orb}>
                  <Circle cx={orb / 2} cy={orb / 2} r={orb / 2 + 2} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray={`${orb * 0.6} ${orb * 2.6}`} strokeLinecap="round" opacity={0.85} />
                </Svg>
              </Animated.View>
            )}
            <Pressable onPress={() => { haptic.bump(); onCore(); }} disabled={phase === 'unavailable'} accessibilityRole="button" accessibilityLabel={label[phase]}
              style={({ pressed }) => [s.orb, { width: orb, height: orb, borderRadius: orb / 2, backgroundColor: phase === 'idle' || scanning ? C.accent : C.panel3, borderColor: alpha(tint, 0.7) }, pressed && { transform: [{ scale: 0.94 }] }]}>
              <View style={[s.orbRing, { width: orb * 0.8, height: orb * 0.8, borderRadius: orb }]} />
              <Icon name={coreIcon} size={orb * 0.38} color={phase === 'idle' || scanning ? C.onAccent : tint} width={2.2} />
            </Pressable>
          </Animated.View>

          {/* device pins, drawn back-to-front and above the orb so none get hidden */}
          {[...blips].map(b => {
            // Spread over 290° and skip the wedge straight behind the orb, where a pin would be hidden.
            const a = ((-55 + hash(b.id) * 290) * Math.PI) / 180;
            const rr = (0.46 + 0.5 * Math.min(1, Math.max(0, ((-(b.rssi ?? -90)) - 45) / 50))) * R;
            return { b, x: cx + rr * Math.cos(a), y: cy + rr * TILT * Math.sin(a), depth: Math.sin(a) };
          }).sort((p, q) => p.depth - q.depth).map(p => (
            <Pin key={p.b.id} blip={p.b} x={p.x} y={p.y} depth={p.depth} onPress={() => onBlip(p.b.id)} />
          ))}

          <Text style={[s.label, { top: cy + RY + 8, color: phase === 'off' ? C.warn : C.ink2 }]} numberOfLines={1}>{label[phase]}</Text>
        </View>
      )}
    </View>
  );
}

const TONE = { ok: C.ok, known: C.accent, unknown: C.muted } as const;

/** One found device standing on the disk. Pops up when it first appears. */
const Pin = memo(function Pin({ blip, x, y, depth, onPress }: { blip: Blip; x: number; y: number; depth: number; onPress: () => void }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(pop, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }).start(); }, []);
  const near = (depth + 1) / 2; // 0 = back of the disk, 1 = front
  const scale = 0.72 + near * 0.35;
  const stem = 16 + near * 10;
  const col = TONE[blip.tone];
  const name = blip.name ?? 'ไม่มีชื่อ';
  return (
    <Animated.View style={{ position: 'absolute', left: x - 60, top: y - stem - 30, width: 120, alignItems: 'center', opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.8 + near * 0.2] }), transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, scale] }) }] }}>
      <Pressable onPress={() => { haptic.tap(); onPress(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${name} สัญญาณ ${blip.rssi ?? '-'} dBm`} style={{ alignItems: 'center' }}>
        <Text style={[s.pinName, { color: blip.tone === 'unknown' ? C.ink2 : col }]} numberOfLines={1}>{name}</Text>
        <View style={[s.pinHead, { backgroundColor: col, borderColor: C.bg }]} />
        <View style={{ width: 2, height: stem, backgroundColor: alpha(col, 0.6) }} />
        <View style={{ width: 14, height: 5, borderRadius: 7, backgroundColor: alpha(col, 0.45) }} />
      </Pressable>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  orb: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
  orbRing: { position: 'absolute', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)' },
  label: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: F.semi, fontSize: 14.5 },
  pinName: { fontFamily: F.semi, fontSize: 11.5, marginBottom: 3, maxWidth: 120, backgroundColor: 'rgba(19,21,25,0.75)', paddingHorizontal: 6, borderRadius: 6, overflow: 'hidden' },
  pinHead: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
