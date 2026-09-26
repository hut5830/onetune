import { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { clamp } from '../lib/format';
import { haptic } from '../lib/haptics';
import { C, alpha } from '../theme';

interface Props {
  value: number; min: number; max: number;
  onChange: (v: number) => void;
  scale?: 'lin' | 'log';
  step?: number;
  color?: string;
  /** Values below this are off-limits (speaker protection); drawn as a hatched zone. */
  floor?: number;
  /** Where the fill starts from (e.g. 0 dB for a gain slider). Defaults to min. */
  origin?: number;
  disabled?: boolean;
  label: string;
}

const H = 34, TRACK = 6, THUMB = 22;

/** Horizontal drag slider with linear or logarithmic (frequency) scale. */
export function Slider({ value, min, max, onChange, scale = 'lin', step, color = C.cyan, floor, origin, disabled, label }: Props) {
  const [w, setW] = useState(0);
  const start = useRef({ x: 0, last: value });
  const toPos = (v: number) => {
    const t = scale === 'log' ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min);
    return clamp(t, 0, 1) * (w - THUMB) + THUMB / 2;
  };
  const toVal = (x: number) => {
    const t = clamp((x - THUMB / 2) / Math.max(1, w - THUMB), 0, 1);
    let v = scale === 'log' ? min * Math.pow(max / min, t) : min + t * (max - min);
    if (step) v = Math.round(v / step) * step;
    return clamp(v, floor ?? min, max);
  };
  const emit = (x: number) => {
    const v = toVal(x);
    if (v !== start.current.last) { start.current.last = v; onChange(v); }
  };
  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => { start.current.x = e.nativeEvent.locationX; haptic.tick(); emitRef.current(start.current.x); },
    onPanResponderMove: (_, g) => emitRef.current(start.current.x + g.dx),
    onPanResponderRelease: () => haptic.tick(),
  })).current;
  const emitRef = useRef(emit);
  emitRef.current = emit;

  const pos = w ? toPos(value) : 0;
  const o = w ? toPos(clamp(origin ?? min, min, max)) : 0;
  const floorX = w && floor !== undefined ? toPos(floor) : 0;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={[{ height: H, justifyContent: 'center' }, disabled && { opacity: 0.4 }]}
      pointerEvents={disabled ? 'none' : 'auto'} {...pr.panHandlers}
      accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ now: value, min, max }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => {
        const up = e.nativeEvent.actionName === 'increment';
        const v = scale === 'log' ? value * Math.pow(2, up ? 1 / 6 : -1 / 6) : value + (step ?? (max - min) / 50) * (up ? 1 : -1);
        onChange(clamp(v, floor ?? min, max));
      }}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={s.track} />
      {floor !== undefined && w > 0 && (
        <View style={[s.floor, { width: floorX }]}>
          {Array.from({ length: Math.ceil(floorX / 7) }, (_, i) => <View key={i} style={[s.hatch, { left: i * 7 }]} />)}
        </View>
      )}
      {w > 0 && (
        <LinearGradient colors={[alpha(color, 0.35), color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[s.fill, { left: Math.min(o, pos), width: Math.abs(pos - o) }]} />
      )}
      {w > 0 && (
        <View style={[s.thumb, { left: pos - THUMB / 2, shadowColor: color, borderColor: color }]} pointerEvents="none">
          <View style={[s.thumbDot, { backgroundColor: color }]} />
        </View>
      )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  track: { position: 'absolute', left: THUMB / 2, right: THUMB / 2, height: TRACK, borderRadius: TRACK, backgroundColor: C.panel3, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line2 },
  floor: { position: 'absolute', left: 0, height: 14, overflow: 'hidden', borderRadius: 4, backgroundColor: alpha(C.danger, 0.1) },
  hatch: { position: 'absolute', top: -4, width: 2, height: 22, backgroundColor: alpha(C.danger, 0.4), transform: [{ rotate: '35deg' }] },
  fill: { position: 'absolute', height: TRACK, borderRadius: TRACK },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: '#0B1020', borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
  thumbDot: { width: 6, height: 6, borderRadius: 3 },
});
