import { useRef } from 'react';
import { useSvgId } from '../lib/svgId';
import { PanResponder, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { clamp } from '../lib/format';
import { haptic } from '../lib/haptics';
import { C, F, alpha } from '../theme';

const SWEEP = 270, START = -135;
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
  return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
};

/** Rotary knob. Drag up/down (or use the accessibility actions) to change the value. */
export function Knob({ value, min, max, onChange, size = 168, label, unit = 'dB', pxPerUnit = 4 }: { value: number; min: number; max: number; onChange: (v: number) => void; size?: number; label: string; unit?: string; pxPerUnit?: number }) {
  const startV = useRef(value);
  const u = useSvgId();
  const cur = useRef({ value, onChange });
  cur.current = { value, onChange };
  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { startV.current = cur.current.value; haptic.tap(); },
    onPanResponderMove: (_, g) => {
      const v = clamp(Math.round(startV.current + (-g.dy + g.dx * 0.5) / pxPerUnit), min, max);
      if (v !== cur.current.value) { haptic.tick(); cur.current.onChange(v); }
    },
  })).current;

  const c = size / 2, r = size / 2 - 14;
  const t = (value - min) / (max - min);
  const ang = START + t * SWEEP;
  const tip = polar(c, c, r - 26, ang);
  const ticks = Array.from({ length: 28 }, (_, i) => START + (i / 27) * SWEEP);

  return (
    <View {...pr.panHandlers} style={{ width: size, height: size }} accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ text: `${value} ${unit}` }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => onChange(clamp(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1), min, max))}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={u + 'kArc'} x1="0" y1="1" x2="1" y2="0"><Stop offset="0" stopColor={C.cyan} /><Stop offset="1" stopColor={C.violet} /></LinearGradient>
          <RadialGradient id={u + 'kFace'} cx="40%" cy="35%" r="75%"><Stop offset="0" stopColor="#223055" /><Stop offset="0.7" stopColor="#0D1428" /><Stop offset="1" stopColor="#070B17" /></RadialGradient>
          <RadialGradient id={u + 'kGlow'} cx="50%" cy="50%" r="50%"><Stop offset="0.6" stopColor={C.violet} stopOpacity={0.22} /><Stop offset="1" stopColor={C.violet} stopOpacity={0} /></RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill={`url(#${u}kGlow)`} />
        {ticks.map((a, i) => {
          const on = a <= ang + 0.01;
          const p0 = polar(c, c, r + 9, a), p1 = polar(c, c, r + (i % 3 === 0 ? 3 : 5), a);
          return <Line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={on ? C.cyan : C.faint} strokeWidth={i % 3 === 0 ? 2 : 1.2} strokeLinecap="round" opacity={on ? 0.9 : 0.6} />;
        })}
        <Path d={arc(c, c, r, START, START + SWEEP)} stroke={C.panel3} strokeWidth={7} fill="none" strokeLinecap="round" />
        {t > 0.002 && <Path d={arc(c, c, r, START, ang)} stroke={`url(#${u}kArc)`} strokeWidth={7} fill="none" strokeLinecap="round" />}
        <Circle cx={c} cy={c} r={r - 14} fill={`url(#${u}kFace)`} stroke={alpha('#FFFFFF', 0.08)} strokeWidth={1} />
        <G>
          <Circle cx={tip.x} cy={tip.y} r={4.5} fill={C.cyan} />
          <Circle cx={tip.x} cy={tip.y} r={9} fill={C.cyan} opacity={0.18} />
        </G>
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <Text style={{ fontFamily: F.display, fontSize: size * 0.2, color: C.ink, fontVariant: ['tabular-nums'], lineHeight: size * 0.25 }}>{value}</Text>
        <Text style={{ fontFamily: F.head, fontSize: 11, color: C.muted, letterSpacing: 1.6 }}>{unit}</Text>
      </View>
    </View>
  );
}
