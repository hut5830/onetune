import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { C, R, S } from '../theme';

export function Btn({ label, onPress, kind = 'default', disabled, style }: { label: string; onPress: () => void; kind?: 'default' | 'primary' | 'ghost' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [st.btn, kind === 'primary' && st.primary, kind === 'ghost' && st.ghost, kind === 'danger' && st.danger, disabled && { opacity: 0.4 }, pressed && { opacity: 0.75 }, style]}>
      <Text style={[st.btnText, kind === 'primary' && { color: C.amberInk }, kind === 'danger' && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/** Row of mutually exclusive options. */
export function Segmented<T extends string | number>({ options, value, onChange, format }: { options: readonly T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string }) {
  return (
    <View style={st.seg}>
      {options.map(o => {
        const on = o === value;
        return (
          <Pressable key={String(o)} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(o)} style={[st.segBtn, on && st.segOn]}>
            <Text style={[st.segText, on && { color: C.ink }]}>{format ? format(o) : String(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={[st.sw, value && st.swOn]}>
      <View style={[st.knob, value && st.knobOn]} />
    </Pressable>
  );
}

/** A number the user can tap to type an exact value. */
export function ValueText({ text, onPress, size = 16 }: { text: string; onPress: () => void; size?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityHint="แตะเพื่อพิมพ์ค่า" onPress={onPress} hitSlop={8}>
      <Text style={[st.value, { fontSize: size }]}>{text}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[st.card, style]}>{children}</View>;
}

export function Stepper({ onMinus, onPlus }: { onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: S.sm }}>
      <Pressable accessibilityLabel="ลดค่า" onPress={onMinus} style={st.step}><Text style={st.stepT}>−</Text></Pressable>
      <Pressable accessibilityLabel="เพิ่มค่า" onPress={onPlus} style={st.step}><Text style={st.stepT}>+</Text></Pressable>
    </View>
  );
}

export const st = StyleSheet.create({
  btn: { borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, borderRadius: R.md, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center' },
  primary: { backgroundColor: C.amber, borderColor: 'transparent' },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: C.danger, borderColor: 'transparent' },
  btnText: { color: C.ink, fontSize: 14, fontWeight: '600' },
  seg: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 3, gap: 2, alignSelf: 'flex-start' },
  segBtn: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 8 },
  segOn: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line },
  segText: { color: C.muted, fontSize: 13 },
  sw: { width: 46, height: 28, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2, padding: 3 },
  swOn: { backgroundColor: '#5A4523' },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.muted },
  knobOn: { backgroundColor: C.amber, transform: [{ translateX: 18 }] },
  value: { color: C.ink, fontWeight: '700', fontVariant: ['tabular-nums'], textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: C.amber },
  card: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: S.lg, gap: S.sm },
  step: { width: 38, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' },
  stepT: { color: C.ink, fontSize: 18, fontWeight: '600' },
  h: { color: C.ink, fontSize: 15, fontWeight: '600' },
  small: { color: C.muted, fontSize: 12.5, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});
