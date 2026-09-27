import { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
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
  /** Taller track for the simple screen. */
  big?: boolean;
}

/** Horizontal drag slider with linear or logarithmic (frequency) scale. */
export function Slider({ value, min, max, onChange, scale = 'lin', step, color = C.accent, floor, origin, disabled, label, big }: Props) {
  const H = big ? 44 : 34, TRACK = big ? 10 : 6, THUMB = big ? 28 : 22;
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
  const emitRef = useRef(emit);
  emitRef.current = emit;
  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => { start.current.x = e.nativeEvent.locationX; haptic.tick(); emitRef.current(start.current.x); },
    onPanResponderMove: (_, g) => emitRef.current(start.current.x + g.dx),
    onPanResponderRelease: () => haptic.tick(),
  })).current;

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
        <View style={{ position: 'absolute', left: THUMB / 2, right: THUMB / 2, top: (H - TRACK) / 2, height: TRACK, borderRadius: TRACK, backgroundColor: C.panel3 }} />
        {floor !== undefined && w > 0 && (
          <View style={[s.floor, { width: floorX, top: (H - 14) / 2 }]}>
            {Array.from({ length: Math.ceil(floorX / 7) }, (_, i) => <View key={i} style={[s.hatch, { left: i * 7 }]} />)}
          </View>
        )}
        {w > 0 && <View style={{ position: 'absolute', top: (H - TRACK) / 2, height: TRACK, borderRadius: TRACK, backgroundColor: color, left: Math.min(o, pos), width: Math.abs(pos - o) }} />}
        {w > 0 && <View style={[s.thumb, { left: pos - THUMB / 2, top: (H - THUMB) / 2, width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderColor: color }]} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  floor: { position: 'absolute', left: 0, height: 14, overflow: 'hidden', borderRadius: 4, backgroundColor: alpha(C.danger, 0.1) },
  hatch: { position: 'absolute', top: -4, width: 2, height: 22, backgroundColor: alpha(C.danger, 0.35), transform: [{ rotate: '35deg' }] },
  thumb: { position: 'absolute', backgroundColor: '#F4F6F9', borderWidth: 3 },
});
