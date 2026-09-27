import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, ScrollViewProps, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C, F, MAX_W, R, S, alpha } from '../theme';
import { Icon, IconName } from './Icon';
import { haptic } from '../lib/haptics';

/** Two-pane layouts kick in for landscape phones and tablets. */
export function useWide() {
  const { width, height } = useWindowDimensions();
  return width >= 900 || (width > height && width >= 640);
}

type Variant = 'display' | 'title' | 'h' | 'body' | 'bodyMed' | 'small' | 'label' | 'num' | 'mono';
const TV: Record<Variant, TextStyle> = {
  display: { fontFamily: F.bold, fontSize: 26, lineHeight: 38, color: C.ink },
  title: { fontFamily: F.semi, fontSize: 19, lineHeight: 28, color: C.ink },
  h: { fontFamily: F.semi, fontSize: 15.5, lineHeight: 23, color: C.ink },
  body: { fontFamily: F.regular, fontSize: 14.5, lineHeight: 22, color: C.ink2 },
  bodyMed: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 22, color: C.ink },
  small: { fontFamily: F.regular, fontSize: 12.5, lineHeight: 19, color: C.muted },
  label: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: C.muted },
  num: { fontFamily: F.semi, fontSize: 16, color: C.ink, fontVariant: ['tabular-nums'] },
  mono: { fontFamily: F.medium, fontSize: 12.5, color: C.ink2, fontVariant: ['tabular-nums'] },
};

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  return <Text {...rest} style={[TV[v], style]} />;
}

export function Screen({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: C.bg }}>{children}</View>;
}

/** Scrollable page body: side insets for notches, centred and width-capped on wide screens. */
export function Page({ children, style, max = MAX_W, ...rest }: ScrollViewProps & { children: ReactNode; max?: number }) {
  const inset = useSafeAreaInsets();
  return (
    <ScrollView {...rest} contentContainerStyle={[{ paddingLeft: inset.left + S.lg, paddingRight: inset.right + S.lg, paddingBottom: inset.bottom + 40 }, style as StyleProp<ViewStyle>]}>
      <View style={{ width: '100%', maxWidth: max, alignSelf: 'center', gap: S.md }}>{children}</View>
    </ScrollView>
  );
}

/** Custom top bar: back button, title block, right-side actions. */
export function Header({ title, sub, right, back = true, onBack }: { title: string; sub?: ReactNode; right?: ReactNode; back?: boolean; onBack?: () => void }) {
  const inset = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[s.header, { paddingTop: inset.top + S.sm, paddingLeft: inset.left + S.lg, paddingRight: inset.right + S.lg }]}>
      {back && <IconBtn name="back" label="ย้อนกลับ" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="title" numberOfLines={1}>{title}</T>
        {typeof sub === 'string' ? <T v="small" numberOfLines={1}>{sub}</T> : sub}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, pad = true, active }: { children: ReactNode; style?: StyleProp<ViewStyle>; pad?: boolean; active?: string }) {
  return <View style={[s.card, pad && { padding: S.lg }, active && { borderColor: alpha(active, 0.5) }, style]}>{children}</View>;
}

type BtnKind = 'primary' | 'default' | 'ghost' | 'danger';
export function Btn({ label, onPress, kind = 'default', icon, disabled, style, small }: { label: string; onPress: () => void; kind?: BtnKind; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const fg = kind === 'primary' ? C.onAccent : kind === 'danger' ? '#fff' : C.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => { haptic.tap(); onPress(); }}
      style={({ pressed }) => [s.btn, small && s.btnSm, kind === 'primary' && s.primary, kind === 'ghost' && s.ghost, kind === 'danger' && s.danger, disabled && { opacity: 0.4 }, pressed && { opacity: 0.8 }, style]}>
      {icon && <Icon name={icon} size={small ? 16 : 18} color={fg} />}
      <Text style={[s.btnT, small && { fontSize: 13.5 }, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function IconBtn({ name, onPress, label, active, color, size = 40, disabled }: { name: IconName; onPress: () => void; label: string; active?: boolean; color?: string; size?: number; disabled?: boolean }) {
  const tint = color ?? (active ? C.accent : C.ink2);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active, disabled }} hitSlop={6} disabled={disabled}
      onPress={() => { haptic.tap(); onPress(); }}
      style={({ pressed }) => [s.iconBtn, { width: size, height: size, borderRadius: size * 0.3 }, active && { backgroundColor: alpha(tint, 0.14), borderColor: alpha(tint, 0.45) }, disabled && { opacity: 0.35 }, pressed && { opacity: 0.7 }]}>
      <Icon name={name} size={size * 0.5} color={tint} />
    </Pressable>
  );
}

/** Row of mutually exclusive options. */
export function Segmented<T extends string | number>({ options, value, onChange, format, full, accent = C.accent }: { options: readonly T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string; full?: boolean; accent?: string }) {
  return (
    <View style={[s.seg, full && { alignSelf: 'stretch' }]}>
      {options.map(o => {
        const on = o === value;
        return (
          <Pressable key={String(o)} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { if (!on) haptic.tick(); onChange(o); }}
            style={[s.segBtn, full && { flex: 1 }, on && { backgroundColor: C.panel3 }]}>
            <Text style={[s.segT, on && { color: accent === C.accent ? C.ink : accent }]} numberOfLines={1}>{format ? format(o) : String(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { Animated.timing(x, { toValue: value ? 1 : 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(); }, [value]);
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }} disabled={disabled} hitSlop={8}
      onPress={() => { haptic.tick(); onChange(!value); }}>
      <Animated.View style={[s.sw, { backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: [C.panel3, C.accent] }) }, disabled && { opacity: 0.45 }]}>
        <Animated.View style={[s.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }]} />
      </Animated.View>
    </Pressable>
  );
}

export function Stepper({ onMinus, onPlus, small }: { onMinus: () => void; onPlus: () => void; small?: boolean }) {
  const d = small ? 34 : 40;
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="ลดค่า" hitSlop={4} onPress={() => { haptic.tick(); onMinus(); }} style={({ pressed }) => [s.step, { width: d, height: d }, pressed && s.stepOn]}><Icon name="minus" size={16} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="เพิ่มค่า" hitSlop={4} onPress={() => { haptic.tick(); onPlus(); }} style={({ pressed }) => [s.step, { width: d, height: d }, pressed && s.stepOn]}><Icon name="plus" size={16} /></Pressable>
    </View>
  );
}

/** A number the user can tap to type an exact value. */
export function ValueText({ text, onPress, size = 17, color = C.ink, unit }: { text: string; onPress: () => void; size?: number; color?: string; unit?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityHint="แตะเพื่อพิมพ์ค่า" onPress={onPress} hitSlop={8} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }, pressed && { opacity: 0.6 }]}>
      <Text style={[s.value, { fontSize: size, color }]}>{text}</Text>
      {unit ? <Text style={[s.unit, { fontSize: Math.max(12, size * 0.5) }]}>{unit}</Text> : null}
      <View style={{ marginLeft: 2, opacity: 0.6 }}><Icon name="edit" size={Math.max(12, size * 0.5)} color={C.muted} /></View>
    </Pressable>
  );
}

export function Chip({ label, color = C.muted, icon, onPress }: { label: string; color?: string; icon?: IconName; onPress?: () => void }) {
  const body = (
    <View style={[s.chip, { backgroundColor: alpha(color, 0.14) }]}>
      {icon && <Icon name={icon} size={13} color={color} width={2} />}
      <Text style={[s.chipT, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); onPress(); }}>{body}</Pressable> : body;
}

/** Status light; only a live connection breathes. */
export function Dot({ color, size = 8, pulse }: { color: string; size?: number; pulse?: boolean }) {
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: a }} />;
}

export type Mode = 'live' | 'sim' | 'preview';
export const MODE_INFO: Record<Mode, { label: string; color: string }> = {
  live: { label: 'ต่อเครื่องจริง', color: C.ok },
  sim: { label: 'จำลอง', color: C.accent },
  preview: { label: 'พรีวิว', color: C.warn },
};
export function StatusPill({ mode }: { mode: Mode }) {
  const m = MODE_INFO[mode];
  return (
    <View style={[s.pill, { backgroundColor: alpha(m.color, 0.14) }]}>
      <Dot color={m.color} size={7} pulse={mode === 'live'} />
      <Text style={[s.pillT, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

export function SectionTitle({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <View style={s.section}>
      <T v="h" style={{ flex: 1, fontSize: 14.5 }}>{label}</T>
      {right}
    </View>
  );
}

/** Info / warning strip. */
export function Note({ icon = 'info', color = C.accent, children, right }: { icon?: IconName; color?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={[s.note, { backgroundColor: alpha(color, 0.1) }]}>
      <Icon name={icon} size={18} color={color} />
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <T v="small" style={{ color: C.ink2 }}>{children}</T> : children}</View>
      {right}
    </View>
  );
}

export const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingBottom: S.md, backgroundColor: C.bg },
  card: { backgroundColor: C.panel, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, gap: S.sm },
  btn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel3, borderRadius: R.md, paddingVertical: 13, paddingHorizontal: 16 },
  btnSm: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: R.sm },
  primary: { backgroundColor: C.accent },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: C.danger },
  btnT: { fontFamily: F.semi, fontSize: 15 },
  iconBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', backgroundColor: C.panel2 },
  seg: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.panel2, borderRadius: R.md, padding: 3, gap: 3, alignSelf: 'flex-start' },
  segBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: R.sm, alignItems: 'center' },
  segT: { fontFamily: F.medium, fontSize: 13.5, color: C.muted },
  sw: { width: 46, height: 28, borderRadius: 14, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  step: { borderRadius: 12, backgroundColor: C.panel3, alignItems: 'center', justifyContent: 'center' },
  stepOn: { backgroundColor: alpha(C.accent, 0.25) },
  value: { fontFamily: F.semi, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: F.medium, color: C.muted },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  chipT: { fontFamily: F.medium, fontSize: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, height: 26 },
  pillT: { fontFamily: F.medium, fontSize: 12.5 },
  section: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: S.md, borderRadius: R.md },
});
