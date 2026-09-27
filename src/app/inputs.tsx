import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSessionState, TuningSession } from '../model/session';
import { currentSession } from '../model/current';
import { inputCount } from '../model/tuning';
import { SourceId } from '../drivers/types';
import { haptic } from '../lib/haptics';
import { Icon, IconName } from '../components/Icon';
import { NoSession } from '../components/NoSession';
import { Card, Header, Note, Page, Screen, SectionTitle, T } from '../components/ui';
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
  const n = inputCount(p, state.source);
  const inName = (i: number) => (n === 2 ? ['L', 'R'][i] : `${i + 1}`);

  return (
    <Screen>
      <Header title="สัญญาณเข้า" sub="เลือกแหล่งเสียง และช่องไหนรับเสียงจากไหน" />
      <Page>
        <SectionTitle label="แหล่งเสียง" />
        <View style={s.srcGrid}>
          {p.sources.map(id => {
            const on = state.source === id;
            return (
              <Pressable key={id} onPress={() => { if (!on) { haptic.tick(); session.setSource(id); } }} style={[s.src, on && { borderColor: C.accent, backgroundColor: alpha(C.accent, 0.08) }]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                <Icon name={SRC[id].icon} size={20} color={on ? C.accent : C.muted} />
                <Text style={[s.srcT, on && { color: C.ink }]}>{SRC[id].name}</Text>
                <T v="small" style={{ fontSize: 11.5 }}>{inputCount(p, id)} ช่องเข้า</T>
              </Pressable>
            );
          })}
        </View>
        <T v="small">เปลี่ยนแหล่งเสียงแล้ว การจ่ายสัญญาณจะกลับเป็นค่าเริ่มต้นของแหล่งนั้น</T>

        <SectionTitle label="การจ่ายสัญญาณ (Routing)" right={<T v="small">แตะช่องเพื่อเปิด/ปิด</T>} />
        <Card pad={false} style={{ padding: S.md }}>
          <View style={s.mRow}>
            <View style={s.mHead} />
            {Array.from({ length: n }, (_, i) => <Text key={i} style={s.mCol}>เข้า {inName(i)}</Text>)}
          </View>
          {state.channels.map((c, o) => {
            const r = state.route[c.id] ?? [];
            return (
              <View key={c.id} style={s.mRow}>
                <View style={s.mHead}>
                  <View style={[s.dot, { backgroundColor: c.color }]} />
                  <Text style={s.mName} numberOfLines={1}>{o + 1} {c.short}</Text>
                </View>
                {Array.from({ length: n }, (_, i) => {
                  const on = r.includes(i);
                  return (
                    <Pressable key={i} onPress={() => { haptic.tick(); session.toggleRoute(c.id, i); }} style={s.cellWrap} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${c.short} รับจากช่องเข้า ${inName(i)}`}>
                      <View style={[s.cell, on && { backgroundColor: C.accent }]}>
                        {on && <Icon name="check" size={14} color={C.onAccent} width={2.6} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </Card>
        {state.channels.some(c => !(state.route[c.id]?.length)) && <Note icon="warn" color={C.warn}>บางช่องไม่ได้รับสัญญาณจากช่องเข้าใดเลย จะไม่มีเสียง</Note>}
      </Page>
    </Screen>
  );
}

const s = StyleSheet.create({
  srcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  src: { width: '31%', flexGrow: 1, gap: 4, padding: S.md, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.panel },
  srcT: { fontFamily: F.semi, fontSize: 14, color: C.ink2, lineHeight: 20 },
  mRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  mHead: { width: 96, flexDirection: 'row', alignItems: 'center', gap: 6 },
  mCol: { flex: 1, textAlign: 'center', fontFamily: F.medium, fontSize: 11.5, color: C.muted },
  dot: { width: 8, height: 8, borderRadius: 4 },
  mName: { fontFamily: F.semi, fontSize: 13, color: C.ink, flexShrink: 1 },
  cellWrap: { flex: 1, alignItems: 'center', paddingVertical: 5 },
  cell: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.panel3, alignItems: 'center', justifyContent: 'center' },
});
