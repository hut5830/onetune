import { ReactNode, useEffect, useRef } from 'react';
import { useSvgId } from '../lib/svgId';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { C, F, G, R, S, alpha } from '../theme';
import { Icon, IconName } from './Icon';
import { haptic } from '../lib/haptics';

type Variant = 'display' | 'title' | 'h' | 'body' | 'bodyMed' | 'small' | 'label' | 'num' | 'mono';
const TV: Record<Variant, TextStyle> = {
  display: { fontFamily: F.display, fontSize: 30, lineHeight: 40, color: C.ink, letterSpacing: 0.5 },
  title: { fontFamily: F.head, fontSize: 20, lineHeight: 28, color: C.ink },
  h: { fontFamily: F.head, fontSize: 16, lineHeight: 23, color: C.ink },
  body: { fontFamily: F.body, fontSize: 14.5, lineHeight: 22, color: C.ink2 },
  bodyMed: { fontFamily: F.bodyMed, fontSize: 14.5, lineHeight: 22, color: C.ink },
  small: { fontFamily: F.body, fontSize: 12.5, lineHeight: 19, color: C.muted },
  label: { fontFamily: F.head, fontSize: 11, lineHeight: 15, color: C.muted, letterSpacing: 1.6, textTransform: 'uppercase' },
  num: { fontFamily: F.num, fontSize: 16, color: C.ink, fontVariant: ['tabular-nums'] },
  mono: { fontFamily: F.numMed, fontSize: 12.5, color: C.ink2, fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
};

export function T({ v = 'body', style, ...rest }: TextProps & { v?: Variant }) {
  return <Text {...rest} style={[TV[v], style]} />;
}

/** Full-screen backdrop: deep gradient with two soft light blooms. */
export function Backdrop() {
  const u = useSvgId();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={G.screen} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id={u + 'b1'} cx="85%" cy="4%" r="55%"><Stop offset="0" stopColor={C.violet} stopOpacity={0.28} /><Stop offset="1" stopColor={C.violet} stopOpacity={0} /></RadialGradient>
          <RadialGradient id={u + 'b2'} cx="0%" cy="40%" r="50%"><Stop offset="0" stopColor={C.cyan} stopOpacity={0.12} /><Stop offset="1" stopColor={C.cyan} stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${u}b1)`} />
        <Rect width="100%" height="100%" fill={`url(#${u}b2)`} />
      </Svg>
    </View>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: C.bg }}><Backdrop />{children}</View>;
}

/** Custom top bar: back button, title block, right-side actions. */
export function Header({ title, sub, right, back = true, onBack }: { title: string; sub?: ReactNode; right?: ReactNode; back?: boolean; onBack?: () => void }) {
  const inset = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[s.header, { paddingTop: inset.top + S.sm }]}>
      {back && <IconBtn name="back" label="ย้อนกลับ" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="title" numberOfLines={1}>{title}</T>
        {typeof sub === 'string' ? <T v="small" numberOfLines={1}>{sub}</T> : sub}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, glow, pad = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; glow?: string; pad?: boolean }) {
  return (
    <View style={[s.card, pad && { padding: S.lg }, glow && { borderColor: alpha(glow, 0.45), shadowColor: glow, shadowOpacity: 0.35, shadowRadius: 18, elevation: 6 }, style]}>
      <LinearGradient colors={G.panel} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={s.cardShine} pointerEvents="none" />
      {children}
    </View>
  );
}

type BtnKind = 'primary' | 'default' | 'ghost' | 'danger' | 'hot';
export function Btn({ label, onPress, kind = 'default', icon, disabled, style, small }: { label: string; onPress: () => void; kind?: BtnKind; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const grad = kind === 'primary' ? G.primary : kind === 'hot' ? G.hot : null;
  const fg = grad ? C.onAccent : kind === 'danger' ? '#fff' : C.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => { haptic.tap(); onPress(); }}
      style={({ pressed }) => [s.btn, small && s.btnSm, kind === 'ghost' && s.ghost, kind === 'danger' && { backgroundColor: C.danger, borderColor: 'transparent' }, grad && { borderColor: 'transparent', shadowColor: grad[1], shadowOpacity: 0.5, shadowRadius: 14, elevation: 5 }, disabled && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }, style]}>
      {grad && <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: small ? R.sm : R.md }]} />}
      {icon && <View><Icon name={icon} size={small ? 16 : 19} color={fg} /></View>}
      <Text style={[s.btnT, small && { fontSize: 13 }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconBtn({ name, onPress, label, active, color, size = 40, disabled }: { name: IconName; onPress: () => void; label: string; active?: boolean; color?: string; size?: number; disabled?: boolean }) {
  const tint = color ?? (active ? C.cyan : C.ink);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active, disabled }} hitSlop={6} disabled={disabled}
      onPress={() => { haptic.tap(); onPress(); }}
      style={({ pressed }) => [s.iconBtn, { width: size, height: size, borderRadius: size * 0.34 }, active && { borderColor: alpha(tint, 0.6), backgroundColor: alpha(tint, 0.12) }, disabled && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.94 }] }]}>
      <Icon name={name} size={size * 0.5} color={tint} />
    </Pressable>
  );
}

/** Row of mutually exclusive options. */
export function Segmented<T extends string | number>({ options, value, onChange, format, full, accent = C.cyan }: { options: readonly T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string; full?: boolean; accent?: string }) {
  return (
    <View style={[s.seg, full && { alignSelf: 'stretch' }]}>
      {options.map(o => {
        const on = o === value;
        return (
          <Pressable key={String(o)} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { if (!on) haptic.tick(); onChange(o); }}
            style={[s.segBtn, full && { flex: 1 }, on && { backgroundColor: alpha(accent, 0.16), borderColor: alpha(accent, 0.55) }]}>
            <Text style={[s.segT, on && { color: accent }]} numberOfLines={1}>{format ? format(o) : String(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { Animated.timing(x, { toValue: value ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(); }, [value]);
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }} disabled={disabled} hitSlop={8}
      onPress={() => { haptic.tick(); onChange(!value); }} style={[s.sw, disabled && { opacity: 0.45 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 16, opacity: x }]}>
        <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 16 }} />
      </Animated.View>
      <Animated.View style={[s.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }], backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: [C.muted, '#FFFFFF'] }) }]} />
    </Pressable>
  );
}

export function Stepper({ onMinus, onPlus, small }: { onMinus: () => void; onPlus: () => void; small?: boolean }) {
  const d = small ? 32 : 38;
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
    <Pressable accessibilityRole="button" accessibilityHint="แตะเพื่อพิมพ์ค่า" onPress={onPress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <Text style={[s.value, { fontSize: size, color }]}>{text}</Text>
      {unit ? <Text style={[s.unit, { fontSize: Math.max(11, size * 0.45) }]}>{unit}</Text> : null}
    </Pressable>
  );
}

export function Chip({ label, color = C.muted, icon, onPress, filled }: { label: string; color?: string; icon?: IconName; onPress?: () => void; filled?: boolean }) {
  const body = (
    <View style={[s.chip, { borderColor: alpha(color, 0.45), backgroundColor: alpha(color, filled ? 0.2 : 0.08) }]}>
      {icon && <Icon name={icon} size={13} color={color} width={2} />}
      <Text style={[s.chipT, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); onPress(); }}>{body}</Pressable> : body;
}

/** Breathing status light. */
export function Pulse({ color, size = 8 }: { color: string; size?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ width: size * 2.4, height: size * 2.4, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size * 2.4, height: size * 2.4, borderRadius: size * 1.2, backgroundColor: color, opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.35] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

export type Mode = 'live' | 'sim' | 'preview';
export const MODE_INFO: Record<Mode, { label: string; color: string }> = {
  live: { label: 'LIVE', color: C.ok },
  sim: { label: 'จำลอง', color: C.cyan },
  preview: { label: 'พรีวิว', color: C.amber },
};
export function StatusPill({ mode }: { mode: Mode }) {
  const m = MODE_INFO[mode];
  return (
    <View style={[s.pill, { borderColor: alpha(m.color, 0.45), backgroundColor: alpha(m.color, 0.1) }]}>
      <Pulse color={m.color} size={6} />
      <Text style={[s.pillT, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

export function SectionTitle({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionBar} />
      <T v="label" style={{ flex: 1, color: C.ink2 }}>{label}</T>
      {right}
    </View>
  );
}

export const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingBottom: S.md },
  card: { borderRadius: R.lg, borderWidth: 1, borderColor: C.line, gap: S.sm, overflow: 'hidden' },
  cardShine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  btn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2, backgroundColor: C.panel2, borderRadius: R.md, paddingVertical: 13, paddingHorizontal: 16, overflow: 'visible' },
  btnSm: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: R.sm },
  ghost: { backgroundColor: 'transparent' },
  btnT: { fontFamily: F.head, fontSize: 15, letterSpacing: 0.3 },
  iconBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2, backgroundColor: alpha(C.panel2, 0.8) },
  seg: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: alpha(C.bg, 0.6), borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 3, gap: 3, alignSelf: 'flex-start' },
  segBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' },
  segT: { fontFamily: F.head, fontSize: 13, color: C.muted },
  sw: { width: 48, height: 28, borderRadius: 16, borderWidth: 1, borderColor: C.line2, backgroundColor: C.panel3, padding: 3, overflow: 'hidden' },
  knob: { width: 20, height: 20, borderRadius: 10 },
  step: { borderRadius: 12, borderWidth: 1, borderColor: C.line2, backgroundColor: C.panel3, alignItems: 'center', justifyContent: 'center' },
  stepOn: { borderColor: C.cyan, backgroundColor: alpha(C.cyan, 0.15) },
  value: { fontFamily: F.num, fontVariant: ['tabular-nums'], textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: alpha(C.cyan, 0.7) },
  unit: { fontFamily: F.head, color: C.muted },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  chipT: { fontFamily: F.head, fontSize: 11.5, letterSpacing: 0.3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: 999, paddingLeft: 4, paddingRight: 10, height: 28 },
  pillT: { fontFamily: F.head, fontSize: 12, letterSpacing: 1 },
  section: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm },
  sectionBar: { width: 3, height: 14, borderRadius: 2, backgroundColor: C.cyan },
});
