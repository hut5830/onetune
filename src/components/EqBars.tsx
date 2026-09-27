import { ScrollView, StyleSheet, Text, View, GestureResponderEvent } from 'react-native';
import { Channel } from '../model/tuning';
import { clamp, fmtDb, fmtF, snap } from '../lib/format';
import { haptic } from '../lib/haptics';
import { C, F } from '../theme';

/** 31-band graphic EQ. Drag vertically on a bar; tap the value above it to type a number. */
export function EqBars({ ch, range, step, onChange, onAsk, height = 170 }: { ch: Channel; range: [number, number]; step: number; onChange: (band: number, g: number) => void; onAsk: (band: number) => void; height?: number }) {
  const H = height;
  const span = Math.max(Math.abs(range[0]), Math.abs(range[1]));
  const px = H / 2 / span;
  const fromEvent = (i: number) => (e: GestureResponderEvent) => {
    const g = snap(clamp((H / 2 - e.nativeEvent.locationY) / px, range[0], range[1]), step);
    if (g !== ch.eq[i].g) { if (g === 0) haptic.bump(); onChange(i, g); }
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5, paddingVertical: 4, paddingHorizontal: 2 }}>
      {ch.eq.map((b, i) => {
        const g = clamp(b.g, -span, span);
        const on = b.g !== 0;
        return (
          <View key={i} style={s.band}>
            <Text onPress={() => onAsk(i)} style={[s.val, on && { color: C.ink }]} accessibilityRole="button" accessibilityHint="แตะเพื่อพิมพ์ค่า">{on ? fmtDb(b.g) : '0'}</Text>
            <View style={[s.track, { height: H }]} accessible accessibilityRole="adjustable" accessibilityLabel={`${fmtF(b.f)} เฮิรตซ์`} accessibilityValue={{ text: `${fmtDb(b.g)} dB` }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={e => onChange(i, clamp(b.g + (e.nativeEvent.actionName === 'increment' ? 0.5 : -0.5), range[0], range[1]))}
              onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
              onResponderGrant={e => { haptic.tick(); fromEvent(i)(e); }} onResponderMove={fromEvent(i)} onResponderTerminationRequest={() => false}>
              <View style={[s.zero, { top: H / 2 - 0.5 }]} pointerEvents="none" />
              {on && <View pointerEvents="none" style={[s.fill, { backgroundColor: ch.color, opacity: ch.eqBypass ? 0.3 : 0.9 }, g >= 0 ? { top: H / 2 - g * px, height: g * px } : { top: H / 2, height: -g * px }]} />}
              <View pointerEvents="none" style={[s.cap, { top: H / 2 - g * px - 2, backgroundColor: on ? C.ink : C.faint, opacity: ch.eqBypass ? 0.4 : 1 }]} />
            </View>
            <Text style={[s.lbl, on && { color: C.ink2 }]}>{fmtF(b.f)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  band: { width: 30, alignItems: 'center', gap: 5 },
  val: { fontFamily: F.medium, color: C.muted, fontSize: 10.5, height: 16, fontVariant: ['tabular-nums'] },
  track: { width: 24, borderRadius: 8, backgroundColor: C.panel2 },
  zero: { position: 'absolute', left: 2, right: 2, height: 1, backgroundColor: C.line2 },
  fill: { position: 'absolute', left: 4, right: 4, borderRadius: 4 },
  cap: { position: 'absolute', left: 3, right: 3, height: 4, borderRadius: 2 },
  lbl: { fontFamily: F.medium, color: C.muted, fontSize: 9.5 },
});
