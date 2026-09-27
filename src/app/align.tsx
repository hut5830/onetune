import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSessionState, TuningSession } from '../model/session';
import { currentSession } from '../model/current';
import { CM_PER_MS, chName, delaysFromDistances } from '../model/tuning';
import { haptic } from '../lib/haptics';
import { Slider } from '../components/Slider';
import { useAskNumber } from '../components/NumberPrompt';
import { useToast } from '../components/Toast';
import { NoSession } from '../components/NoSession';
import { Btn, Card, Header, Note, Page, Screen, SectionTitle, Stepper, T, ValueText, st } from '../components/ui';
import { C, F } from '../theme';

export default function Align() {
  const s = currentSession();
  return s ? <AlignInner session={s} /> : <NoSession title="จัดเวลาจากระยะ" />;
}

function AlignInner({ session }: { session: TuningSession }) {
  const state = useSessionState(session);
  const p = session.profile;
  const ask = useAskNumber();
  const toast = useToast();
  const [dist, setDist] = useState<Record<string, number>>(() => ({ ...state.distances }));
  const car = state.scene === 'car';
  const maxCm = car ? 400 : 2000;
  const preview = useMemo(() => delaysFromDistances(state.channels, dist, p), [dist, state.channels]);
  const measured = state.channels.filter(c => dist[c.id] > 0);
  const maxMs = Math.max(0.001, ...Object.values(preview).map(d => d.ms));
  const clipped = Object.values(preview).some(d => d.clipped);

  const set = (id: string, cm: number) => setDist(d => ({ ...d, [id]: Math.max(0, Math.round(cm * 10) / 10) }));
  const setBox = (id: string, cm: number) => {
    set(id, cm);
    const c = state.channels.find(x => x.id === id);
    // Drivers in one cabinet share a distance; fill untouched siblings as a convenience.
    if (!car && c && c.side !== 2) for (const o of state.channels) if (o.side === c.side && o.kind !== 'sub' && o.id !== id && !(dist[o.id] > 0)) set(o.id, cm);
  };

  return (
    <Screen>
      <Header title="จัดเวลาจากระยะ" sub="ให้เสียงจากทุกลำโพงมาถึงหูพร้อมกัน" />
      <Page>
        <Note icon="ruler">
          <T v="small" style={{ color: C.ink2 }}>วัดระยะจาก{car ? 'หูผู้ขับ' : 'จุดนั่งฟัง'}ถึงลำโพงแต่ละตัว (ซม.) ตัวที่ไกลที่สุดดีเลย์ 0 ตัวที่ใกล้กว่าจะถูกหน่วงให้ทัน{car ? '' : ' · ใส่ระยะตู้เดียว ดอกในตู้เดียวกันได้ค่าเดียวกันให้'}</T>
        </Note>

        <SectionTitle label="ระยะแต่ละช่อง" right={<T v="small">วัดแล้ว {measured.length}/{state.channels.length}</T>} />
        {state.channels.map(c => {
          const d = dist[c.id] ?? 0;
          const pv = preview[c.id];
          return (
            <Card key={c.id} style={{ gap: 4 }}>
              <View style={st.row}>
                <View style={[s.dot, { backgroundColor: c.color }]} />
                <Text style={s.name} numberOfLines={1}>{chName(c)}</Text>
                <ValueText size={19} unit="ซม." color={d ? C.ink : C.muted} text={d ? d.toFixed(d % 1 ? 1 : 0) : '—'}
                  onPress={() => ask({ title: `ระยะถึง ${chName(c)}`, unit: 'ซม.', value: d, min: 0, max: maxCm, step: 0.5, onSet: v => setBox(c.id, v) })} />
                <Stepper small onMinus={() => set(c.id, d - 1)} onPlus={() => setBox(c.id, d + 1)} />
              </View>
              <Slider label={`ระยะ ${c.short}`} value={d} min={0} max={maxCm} step={car ? 0.5 : 1} color={c.color} onChange={v => set(c.id, v)} />
              <View style={st.row}>
                <View style={s.barTrack}><View style={[s.bar, { width: `${pv ? Math.max(2, (pv.ms / maxMs) * 100) : 0}%`, backgroundColor: c.color }]} /></View>
                <Text style={[s.ms, pv?.clipped && { color: C.danger }]}>{pv ? `ดีเลย์ ${pv.ms.toFixed(2)} ms` : 'ยังไม่วัด'}</Text>
              </View>
            </Card>
          );
        })}

        {clipped && <Note icon="warn" color={C.danger}>{`บางช่องต้องการดีเลย์มากกว่าที่ ${p.model} ทำได้ (${p.delayMs[1]} ms) จะตั้งที่ค่าสูงสุดแทน`}</Note>}
        <Btn kind="primary" label={`ใช้ดีเลย์กับ ${measured.length} ช่อง`} disabled={measured.length < 2}
          onPress={() => { session.applyDistances(dist); haptic.ok(); toast('ตั้งดีเลย์จากระยะแล้ว'); }} />
        <Btn kind="ghost" label="ล้างระยะทั้งหมด" onPress={() => setDist({})} />
        <T v="small" style={{ textAlign: 'center' }}>ต้องวัดอย่างน้อย 2 ช่อง · เสียงเดินทาง {CM_PER_MS} ซม. ต่อ 1 ms</T>
      </Page>
    </Screen>
  );
}

const s = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1, fontFamily: F.semi, color: C.ink, fontSize: 14.5, lineHeight: 21 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.panel3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  ms: { fontFamily: F.medium, color: C.ink2, fontSize: 12.5, minWidth: 96, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
