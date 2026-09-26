import { ScrollView, StyleSheet, Text, View, GestureResponderEvent } from 'react-native';
import { Channel } from '../model/tuning';
import { clamp, fmtDb, fmtF, snap } from '../lib/format';
import { C } from '../theme';

const H = 150;

/** 31-band graphic EQ. Drag vertically on a bar; tap the value above it to type a number. */
export function EqBars({ ch, range, step, onChange, onAsk }: { ch: Channel; range: [number, number]; step: number; onChange: (band: number, g: number) => void; onAsk: (band: number) => void }) {
  const px = H / 2 / 12;
  const fromEvent = (i: number) => (e: GestureResponderEvent) => {
    const g = clamp((H / 2 - e.nativeEvent.locationY) / px, range[0], range[1]);
    onChange(i, snap(g, step));
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingVertical: 4 }}>
      {ch.eq.map((b, i) => {
        const g = clamp(b.g, -12, 12);
        return (
          <View key={i} style={s.band}>
            <Text onPress={() => onAsk(i)} style={[s.val, b.g !== 0 && { color: C.amber }]} accessibilityRole="button" accessibilityHint="แตะเพื่อพิมพ์ค่า">{b.g ? fmtDb(b.g) : '0'}</Text>
            <View style={s.track} accessible accessibilityRole="adjustable" accessibilityLabel={`${fmtF(b.f)} เฮิรตซ์`} accessibilityValue={{ text: `${fmtDb(b.g)} dB` }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={e => onChange(i, clamp(b.g + (e.nativeEvent.actionName === 'increment' ? 0.5 : -0.5), range[0], range[1]))}
              onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
              onResponderGrant={fromEvent(i)} onResponderMove={fromEvent(i)} onResponderTerminationRequest={() => true}>
              <View style={s.zero} />
              <View style={[s.fill, { backgroundColor: ch.color, opacity: ch.eqBypass ? 0.3 : 1 }, g >= 0 ? { top: H / 2 - g * px, height: g * px } : { top: H / 2, height: -g * px }]} pointerEvents="none" />
            </View>
            <Text style={s.lbl}>{fmtF(b.f)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  band: { width: 30, alignItems: 'center', gap: 4 },
  val: { color: C.muted, fontSize: 11, height: 16, fontVariant: ['tabular-nums'] },
  track: { width: 22, height: H, borderRadius: 7, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  zero: { position: 'absolute', left: 3, right: 3, top: H / 2 - 1, height: 1, backgroundColor: C.muted, opacity: 0.5 },
  fill: { position: 'absolute', left: 3, right: 3, borderRadius: 3 },
  lbl: { color: C.muted, fontSize: 10 },
});
