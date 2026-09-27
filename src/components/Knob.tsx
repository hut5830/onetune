import { useRef } from 'react';
import { PanResponder, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { clamp } from '../lib/format';
import { haptic } from '../lib/haptics';
import { C, F } from '../theme';

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
export function Knob({ value, min, max, onChange, size = 150, label, unit = 'dB', pxPerUnit = 4 }: { value: number; min: number; max: number; onChange: (v: number) => void; size?: number; label: string; unit?: string; pxPerUnit?: number }) {
  const startV = useRef(value);
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

  const c = size / 2, r = size / 2 - 10;
  const t = (value - min) / (max - min);
  const ang = START + t * SWEEP;
  const tip = polar(c, c, r, ang);

  return (
    <View {...pr.panHandlers} style={{ width: size, height: size }} accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ text: `${value} ${unit}` }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => onChange(clamp(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1), min, max))}>
      <Svg width={size} height={size}>
        <Path d={arc(c, c, r, START, START + SWEEP)} stroke={C.panel3} strokeWidth={8} fill="none" strokeLinecap="round" />
        {t > 0.002 && <Path d={arc(c, c, r, START, ang)} stroke={C.accent} strokeWidth={8} fill="none" strokeLinecap="round" />}
        <Circle cx={c} cy={c} r={r - 16} fill={C.panel2} stroke={C.line2} strokeWidth={1} />
        <Circle cx={tip.x} cy={tip.y} r={9} fill={C.ink} stroke={C.bg} strokeWidth={3} />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <Text style={{ fontFamily: F.bold, fontSize: size * 0.2, color: C.ink, fontVariant: ['tabular-nums'], lineHeight: size * 0.26, marginTop: size * 0.08 }}>{value}</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 12, color: C.muted }}>{unit}</Text>
      </View>
    </View>
  );
}
