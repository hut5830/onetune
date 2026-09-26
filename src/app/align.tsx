import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionState, TuningSession } from '../model/session';
import { currentSession } from '../model/current';
import { CM_PER_MS, delaysFromDistances } from '../model/tuning';
import { haptic } from '../lib/haptics';
import { Icon } from '../components/Icon';
import { Slider } from '../components/Slider';
import { useAskNumber } from '../components/NumberPrompt';
import { useToast } from '../components/Toast';
import { Btn, Card, Header, Screen, SectionTitle, Stepper, T, ValueText, st } from '../components/ui';
import { NoSession } from '../components/NoSession';
import { C, F, R, S, alpha } from '../theme';

export default function Align() {
  const s = currentSession();
  return s ? <AlignInner session={s} /> : <NoSession title="จัดเวลา" />;
}

function AlignInner({ session }: { session: TuningSession }) {
  const state = useSessionState(session);
  const p = session.profile;
  const ask = useAskNumber();
  const toast = useToast();
  const inset = useSafeAreaInsets();
  const [dist, setDist] = useState<Record<string, number>>(() => ({ ...state.distances }));
  const car = state.scene === 'car';
  const maxCm = car ? 400 : 2000;
  const preview = useMemo(() => delaysFromDistances(state.channels, dist, p), [dist, state.channels]);
  const measured = state.channels.filter(c => dist[c.id] > 0);
  const maxMs = Math.max(0.001, ...Object.values(preview).map(d => d.ms));
  const clipped = Object.values(preview).some(d => d.clipped);

  const set = (id: string, cm: number) => setDist(d => ({ ...d, [id]: Math.max(0, Math.round(cm * 10) / 10) }));
  const setPair = (id: string, cm: number) => {
    set(id, cm);
    const c = state.channels.find(x => x.id === id);
    // In a speaker cabinet the drivers of one box share a distance; offer that as a convenience for untouched siblings.
    if (!car && c && c.side !== 2) for (const o of state.channels) if (o.side === c.side && o.kind !== 'sub' && o.id !== id && !(dist[o.id] > 0)) set(o.id, cm);
  };

  return (
    <Screen>
      <Header title="จัดเวลา" sub="Time Alignment จากระยะถึงจุดฟัง" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: inset.bottom + 40, gap: S.md }}>
        <Card glow={C.cyan}>
          <View style={[st.row, { alignItems: 'flex-start' }]}>
            <Icon name="ruler" size={22} color={C.cyan} />
            <View style={{ flex: 1, gap: 4 }}>
              <T v="h">วัดระยะจาก{car ? 'หูผู้ขับ' : 'จุดนั่งฟัง'}ถึงลำโพงแต่ละตัว</T>
              <T v="small">ลำโพงที่ไกลที่สุดได้ดีเลย์ 0 ตัวที่ใกล้กว่าจะถูกหน่วงให้เสียงมาถึงพร้อมกัน (เสียงเดินทาง {CM_PER_MS} ซม. ต่อ 1 ms){car ? '' : ' · ใส่ระยะตู้หนึ่งครั้ง ดอกในตู้เดียวกันจะได้ค่าเดียวกันให้อัตโนมัติ'}</T>
            </View>
          </View>
        </Card>

        <SectionTitle label="ระยะแต่ละช่อง" right={<T v="small">{measured.length}/{state.channels.length} ช่อง</T>} />
        {state.channels.map(c => {
          const d = dist[c.id] ?? 0;
          const pv = preview[c.id];
          return (
            <Card key={c.id} style={{ gap: 6 }}>
              <View style={st.row}>
                <View style={[s.dot, { backgroundColor: c.color, shadowColor: c.color }]} />
                <Text style={s.name} numberOfLines={1}>{c.name}</Text>
                <ValueText size={20} unit="ซม." color={d ? C.ink : C.muted} text={d ? d.toFixed(d % 1 ? 1 : 0) : '—'}
                  onPress={() => ask({ title: `ระยะ ${c.short}`, unit: 'ซม.', value: d, min: 0, max: maxCm, step: 0.5, onSet: v => setPair(c.id, v) })} />
                <Stepper small onMinus={() => set(c.id, d - 1)} onPlus={() => setPair(c.id, d + 1)} />
              </View>
              <Slider label={`ระยะ ${c.short}`} value={d} min={0} max={maxCm} step={car ? 0.5 : 1} color={c.color} onChange={v => set(c.id, v)} />
              <View style={st.row}>
                <View style={s.barTrack}><View style={[s.bar, { width: `${pv ? Math.max(2, (pv.ms / maxMs) * 100) : 0}%`, backgroundColor: c.color }]} /></View>
                <Text style={[s.ms, pv?.clipped && { color: C.danger }]}>{pv ? `${pv.ms.toFixed(3)} ms` : 'ยังไม่วัด'}</Text>
              </View>
            </Card>
          );
        })}

        {clipped && (
          <View style={s.warn}>
            <Icon name="warn" size={18} color={C.danger} />
            <T v="small" style={{ flex: 1, color: C.ink2 }}>บางช่องต้องการดีเลย์มากกว่าที่ {p.model} ทำได้ ({p.delayMs[1]} ms) จะถูกตั้งที่ค่าสูงสุด</T>
          </View>
        )}
        <Btn kind="primary" icon="check" label={`ใช้ดีเลย์กับ ${measured.length} ช่อง`} disabled={measured.length < 2}
          onPress={() => { session.applyDistances(dist); haptic.ok(); toast('ตั้งดีเลย์จากระยะแล้ว'); }} />
        <Btn kind="ghost" icon="refresh" label="ล้างระยะทั้งหมด" onPress={() => setDist({})} />
        <T v="small" style={{ textAlign: 'center' }}>ต้องวัดอย่างน้อย 2 ช่อง · ปรับละเอียดทีละช่องได้ในแท็บ เกน·ดีเลย์</T>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5, shadowOpacity: 1, shadowRadius: 6, elevation: 3 },
  name: { flex: 1, fontFamily: F.head, color: C.ink, fontSize: 14.5, lineHeight: 20 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.panel3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  ms: { fontFamily: F.numMed, color: C.ink2, fontSize: 12.5, minWidth: 78, textAlign: 'right', fontVariant: ['tabular-nums'] },
  warn: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: alpha(C.danger, 0.4), backgroundColor: alpha(C.danger, 0.08) },
});
