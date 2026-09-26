import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionState, TuningSession } from '../model/session';
import { currentSession } from '../model/current';
import { inputCount } from '../model/tuning';
import { SourceId } from '../drivers/types';
import { haptic } from '../lib/haptics';
import { Icon, IconName } from '../components/Icon';
import { NoSession } from '../components/NoSession';
import { Card, Header, Screen, SectionTitle, T } from '../components/ui';
import { C, F, R, S, alpha } from '../theme';

const SRC: Record<SourceId, { name: string; icon: IconName }> = {
  hl: { name: 'ไฮเลเวล', icon: 'wave' },
  rca: { name: 'RCA / AUX', icon: 'input' },
  opt: { name: 'Optical', icon: 'bolt' },
  bt: { name: 'Bluetooth', icon: 'bluetooth' },
  usb: { name: 'USB', icon: 'signal' },
};

export default function Inputs() {
  const s = currentSession();
  return s ? <InputsInner session={s} /> : <NoSession title="สัญญาณเข้า" />;
}

function InputsInner({ session }: { session: TuningSession }) {
  const state = useSessionState(session);
  const p = session.profile;
  const inset = useSafeAreaInsets();
  const n = inputCount(p, state.source);
  const inName = (i: number) => (n === 2 ? ['L', 'R'][i] : `${i + 1}`);

  return (
    <Screen>
      <Header title="สัญญาณเข้า" sub="แหล่งเสียงและการจ่ายสัญญาณ (Routing)" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: inset.bottom + 40, gap: S.md }}>
        <SectionTitle label="แหล่งเสียง" />
        <View style={s.srcGrid}>
          {p.sources.map(id => {
            const on = state.source === id;
            return (
              <Pressable key={id} onPress={() => { if (!on) { haptic.tick(); session.setSource(id); } }} style={[s.src, on && { borderColor: alpha(C.cyan, 0.7), backgroundColor: alpha(C.cyan, 0.1) }]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                <Icon name={SRC[id].icon} size={20} color={on ? C.cyan : C.muted} />
                <Text style={[s.srcT, on && { color: C.ink }]}>{SRC[id].name}</Text>
                <T v="small" style={{ fontSize: 11 }}>{inputCount(p, id)} ช่องเข้า</T>
              </Pressable>
            );
          })}
        </View>
        <T v="small">เปลี่ยนแหล่งเสียงแล้ว routing จะกลับเป็นค่าเริ่มต้นของแหล่งนั้น</T>

        <SectionTitle label="Routing" right={<T v="small">แตะช่องเพื่อผสม/ตัดสัญญาณ</T>} />
        <Card pad={false} style={{ padding: S.md }}>
          <View style={s.mRow}>
            <View style={s.mHead} />
            {Array.from({ length: n }, (_, i) => <Text key={i} style={s.mCol}>IN {inName(i)}</Text>)}
          </View>
          {state.channels.map((c, o) => {
            const r = state.route[c.id] ?? [];
            return (
              <View key={c.id} style={s.mRow}>
                <View style={s.mHead}>
                  <View style={[s.dot, { backgroundColor: c.color }]} />
                  <Text style={s.mOut}>{o + 1}</Text>
                  <Text style={s.mName} numberOfLines={1}>{c.short}</Text>
                </View>
                {Array.from({ length: n }, (_, i) => {
                  const on = r.includes(i);
                  return (
                    <Pressable key={i} onPress={() => { haptic.tick(); session.toggleRoute(c.id, i); }} style={s.cellWrap} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${c.short} รับจาก IN ${inName(i)}`}>
                      <View style={[s.cell, on && { backgroundColor: alpha(c.color, 0.85), borderColor: c.color, shadowColor: c.color }]}>
                        {on && <Icon name="check" size={14} color={C.onAccent} width={2.6} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </Card>
        {state.channels.some(c => !(state.route[c.id]?.length)) && (
          <View style={s.warn}>
            <Icon name="warn" size={16} color={C.amber} />
            <T v="small" style={{ flex: 1, color: C.ink2 }}>บางช่องไม่ได้รับสัญญาณจากอินพุตใดเลย จะเงียบ</T>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  srcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  src: { width: '31.5%', flexGrow: 1, gap: 4, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: alpha(C.panel, 0.9) },
  srcT: { fontFamily: F.head, fontSize: 13.5, color: C.ink2, lineHeight: 19 },
  mRow: { flexDirection: 'row', alignItems: 'center', minHeight: 42 },
  mHead: { width: 92, flexDirection: 'row', alignItems: 'center', gap: 6 },
  mCol: { flex: 1, textAlign: 'center', fontFamily: F.head, fontSize: 11, color: C.muted, letterSpacing: 0.8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  mOut: { fontFamily: F.head, fontSize: 10, color: C.muted, width: 12 },
  mName: { fontFamily: F.head, fontSize: 13, color: C.ink, flexShrink: 1 },
  cellWrap: { flex: 1, alignItems: 'center', paddingVertical: 5 },
  cell: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: C.line2, backgroundColor: alpha(C.bg, 0.6), alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.7, shadowRadius: 6 },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: alpha(C.amber, 0.35), backgroundColor: alpha(C.amber, 0.07) },
});
