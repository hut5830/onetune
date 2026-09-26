import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TuningSession } from '../model/session';
import { TuningState, BandType, ISO, MIN_HPF, CM_PER_MS, KIND_NAME } from '../model/tuning';
import { XoType } from '../drivers/types';
import { fmtDb, fmtF, snap } from '../lib/format';
import { haptic } from '../lib/haptics';
import { C, F, R, S, alpha } from '../theme';
import { EqBars } from './EqBars';
import { ResponseGraph } from './ResponseGraph';
import { useAskNumber } from './NumberPrompt';
import { Slider } from './Slider';
import { Icon, IconName } from './Icon';
import { ToastProvider, useToast } from './Toast';
import { Btn, Card, IconBtn, Segmented, Stepper, T, Toggle, ValueText, st } from './ui';

type Tab = 'geq' | 'peq' | 'xo' | 'gd';
const XO_NAME: Record<XoType, string> = { LR: 'Linkwitz-Riley', BW: 'Butterworth', BE: 'Bessel' };
const BAND_NAME: Record<BandType, string> = { pk: 'Peak', ls: 'Low shelf', hs: 'High shelf' };
const TAB: Record<Tab, { name: string; icon: IconName }> = { geq: { name: 'EQ 31', icon: 'eq' }, peq: { name: 'PEQ', icon: 'wave' }, xo: { name: 'ครอส', icon: 'xover' }, gd: { name: 'เกน·ดีเลย์', icon: 'timer' } };

type SheetProps = { session: TuningSession; state: TuningState; chId: string | null; onClose: () => void; onSelect: (id: string) => void };

/** Full-screen channel editor. Has its own toast host because a Modal renders above the app-level one. */
export function ChannelSheet(props: SheetProps) {
  return (
    <Modal visible={!!props.chId} animationType="slide" onRequestClose={props.onClose} presentationStyle="fullScreen" statusBarTranslucent>
      <ToastProvider><SheetBody {...props} /></ToastProvider>
    </Modal>
  );
}

function SheetBody({ session, state, chId, onClose, onSelect }: SheetProps) {
  const p = session.profile;
  const tabs: Tab[] = [...(p.eq.graphic ? ['geq' as const] : []), ...(p.eq.parametric ? ['peq' as const] : []), 'xo', 'gd'];
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [band, setBand] = useState(17);
  const ask = useAskNumber();
  const toast = useToast();
  useEffect(() => { if (!tabs.includes(tab)) setTab(tabs[0]); }, [p.id]);

  const idx = state.channels.findIndex(x => x.id === chId);
  const c = state.channels[idx];
  const pair = c?.pair ? state.channels.find(x => x.id === c.pair) : undefined;
  if (!c) return null;
  const b = c.eq[band];
  const minHp = MIN_HPF[c.kind];

  const askBand = (i: number, k: 'f' | 'g' | 'q') => {
    const cur = c.eq[i];
    if (k === 'g') ask({ title: `เกน แบนด์ ${fmtF(cur.f)} Hz`, unit: 'dB', value: cur.g, min: p.eq.gain[0], max: p.eq.gain[1], step: p.eq.gainStep, onSet: v => session.setBand(c.id, i, { g: v }) });
    if (k === 'f') ask({ title: `ความถี่ แบนด์ ${i + 1}`, unit: 'Hz', value: cur.f, min: 20, max: 20000, step: 1, onSet: v => session.setBand(c.id, i, { f: v }) });
    if (k === 'q') ask({ title: `ค่า Q แบนด์ ${i + 1}`, value: cur.q, min: p.eq.q[0], max: p.eq.q[1], step: 0.001, onSet: v => session.setBand(c.id, i, { q: v }) });
  };
  const qFixed = p.eq.q[0] === p.eq.q[1];

  const xoCard = (hp: boolean) => {
    const x = hp ? c.hpf : c.lpf;
    const slopes = p.xo.slopes[x.type] ?? [];
    const locked = hp && minHp !== undefined;
    return (
      <Card key={String(hp)} glow={x.on ? c.color : undefined} style={!x.on && { opacity: 0.7 }}>
        <View style={st.row}>
          <View style={[s.xoBadge, { borderColor: alpha(c.color, 0.5) }]}><T v="label" style={{ color: c.color }}>{hp ? 'HPF' : 'LPF'}</T></View>
          <View style={{ flex: 1 }}>
            <T v="h">{hp ? 'ไฮพาส · ตัดเสียงต่ำ' : 'โลว์พาส · ตัดเสียงสูง'}</T>
            {locked && <T v="small" style={{ color: C.amber }}>ล็อกไว้ป้องกัน{KIND_NAME[c.kind]} · ต่ำสุด {fmtF(minHp)} Hz</T>}
          </View>
          {locked ? <Icon name="shield" size={22} color={C.amber} /> : <Toggle value={x.on} onChange={on => session.setXover(c.id, hp, { on })} label={hp ? 'เปิด HPF' : 'เปิด LPF'} />}
        </View>
        <View style={[st.row, { marginTop: S.xs }]}>
          <View style={{ flex: 1 }}>
            <ValueText size={34} unit="Hz" color={x.on ? C.ink : C.muted} text={Math.round(x.freq).toLocaleString('en-US')}
              onPress={() => ask({ title: hp ? 'ความถี่ HPF' : 'ความถี่ LPF', unit: 'Hz', value: x.freq, min: locked ? minHp! : 20, max: 20000, step: 1, note: locked ? 'ป้องกันลำโพงเสียหาย' : undefined, onSet: v => session.setXover(c.id, hp, { freq: v }) })} />
          </View>
          <Stepper small onMinus={() => session.setXover(c.id, hp, { freq: x.freq / Math.pow(2, 1 / 12) })} onPlus={() => session.setXover(c.id, hp, { freq: x.freq * Math.pow(2, 1 / 12) })} />
        </View>
        <Slider label={hp ? 'ความถี่ HPF' : 'ความถี่ LPF'} value={x.freq} min={20} max={20000} scale="log" color={c.color} floor={locked ? minHp : undefined} disabled={!x.on}
          onChange={v => session.setXover(c.id, hp, { freq: Math.round(v) })} />
        <Segmented options={p.xo.types} value={x.type} format={t => XO_NAME[t]} onChange={type => session.setXover(c.id, hp, { type })} accent={c.color} />
        <View style={st.row}>
          <Segmented options={slopes} value={x.slope} onChange={slope => session.setXover(c.id, hp, { slope })} accent={c.color} />
          <T v="small">dB/oct</T>
        </View>
      </Card>
    );
  };

  return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <LinearGradient colors={[alpha(c.color, 0.22), alpha(C.bg, 0)]} style={s.topGlow} pointerEvents="none" />
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={s.head}>
            <IconBtn name="down" label="ปิด" onPress={onClose} />
            <View style={{ flex: 1 }}>
              <View style={st.row}>
                <View style={[s.dot, { backgroundColor: c.color, shadowColor: c.color }]} />
                <T v="title" numberOfLines={1} style={{ flexShrink: 1 }}>{c.name}</T>
              </View>
              <T v="small" numberOfLines={1}>OUT {idx + 1} · {c.group}</T>
            </View>
            <IconBtn name="mute" label="มิวท์" active={c.mute} color={c.mute ? C.danger : undefined} onPress={() => session.toggleMute(c.id)} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chRow}>
            {state.channels.map((x, i) => (
              <Pressable key={x.id} onPress={() => { haptic.tick(); onSelect(x.id); }} style={[s.chPill, x.id === c.id && { borderColor: x.color, backgroundColor: alpha(x.color, 0.14) }]} accessibilityRole="tab" accessibilityState={{ selected: x.id === c.id }}>
                <View style={[s.chDot, { backgroundColor: x.mute ? C.faint : x.color }]} />
                <Text style={[s.chPillT, x.id === c.id && { color: C.ink }]}>{x.short}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: S.sm, gap: S.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" scrollEnabled>
            <Card pad={false} style={{ paddingTop: S.sm, paddingRight: S.xs }}>
              <ResponseGraph channels={state.channels} selected={c.id} top={Math.max(12, p.eq.gain[1])} bandMarks
                edit={tab === 'peq' ? { index: band, f: b.f, g: b.g, onDrag: (f, g) => session.setBand(c.id, band, { f, g }) } : undefined} />
            </Card>
            {tab === 'peq' && <T v="small" style={{ textAlign: 'center', marginTop: -4 }}>ลากจุดบนกราฟเพื่อเลื่อนความถี่และเกนของแบนด์ {band + 1}</T>}

            <View style={s.linkRow}>
              <Chip2 icon="phase" label={c.phase ? 'เฟส 180°' : 'เฟส 0°'} on={c.phase} color={C.violet} onPress={() => session.setPhase(c.id, !c.phase)} />
              <Chip2 icon={state.link ? 'link' : 'unlink'} label={state.link ? 'ลิงก์ L/R' : 'แยก L/R'} on={state.link} color={C.cyan} onPress={() => session.setLink(!state.link)} />
              {pair && <Chip2 icon="copy" label={`คัดลอกไป ${pair.short}`} color={C.lime} onPress={() => { session.copyToPair(c.id); haptic.ok(); toast(`คัดลอก EQ ครอส และเกนไป ${pair.short} แล้ว (ดีเลย์ไม่เปลี่ยน)`); }} />}
            </View>

            <View style={s.tabs}>
              {tabs.map(t => (
                <Pressable key={t} onPress={() => { haptic.tick(); setTab(t); }} style={[s.tab, tab === t && { backgroundColor: alpha(c.color, 0.16), borderColor: alpha(c.color, 0.6) }]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
                  <Icon name={TAB[t].icon} size={16} color={tab === t ? c.color : C.muted} />
                  <Text style={[s.tabT, tab === t && { color: C.ink }]}>{TAB[t].name}</Text>
                </Pressable>
              ))}
            </View>

            {tab === 'geq' && (
              <Card>
                <EqBars ch={c} range={p.eq.gain} step={Math.max(p.eq.gainStep, 0.5)} onChange={(i, g) => session.setBand(c.id, i, { g })} onAsk={i => askBand(i, 'g')} />
                <View style={[st.row, { marginTop: S.xs }]}>
                  <T v="small" style={{ flex: 1 }}>ลากที่แท่ง · แตะตัวเลขเพื่อพิมพ์ค่า</T>
                  <Btn small label={c.eqBypass ? 'เปิด EQ' : 'Bypass'} onPress={() => session.setBypass(c.id, !c.eqBypass)} />
                  <Btn small kind="ghost" icon="refresh" label="รีเซ็ต" onPress={() => session.resetEq(c.id)} />
                </View>
              </Card>
            )}

            {tab === 'peq' && (
              <View style={{ gap: S.md }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {c.eq.map((x, i) => (
                    <Pressable key={i} onPress={() => { haptic.tick(); setBand(i); }} style={[s.bchip, x.g !== 0 && { borderColor: alpha(c.color, 0.6) }, i === band && { backgroundColor: c.color, borderColor: c.color }]} accessibilityRole="button" accessibilityState={{ selected: i === band }}>
                      <Text style={[s.bchipN, i === band && { color: C.onAccent }]}>{i + 1}</Text>
                      <Text style={[s.bchipT, i === band && { color: C.onAccent }]}>{fmtF(x.f)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {p.eq.shelves && <Segmented full options={['pk', 'ls', 'hs'] as const} value={b.t} format={t => BAND_NAME[t]} onChange={t => session.setBand(c.id, band, { t })} accent={c.color} />}
                <Card>
                  <View style={st.row}>
                    <T v="label" style={{ flex: 1 }}>ความถี่ · แบนด์ {band + 1}</T>
                    <Stepper small onMinus={() => session.setBand(c.id, band, { f: b.f / Math.pow(2, 1 / 24) })} onPlus={() => session.setBand(c.id, band, { f: b.f * Math.pow(2, 1 / 24) })} />
                  </View>
                  <ValueText size={34} unit="Hz" text={Math.round(b.f).toLocaleString('en-US')} onPress={() => askBand(band, 'f')} />
                  <Slider label="ความถี่แบนด์" value={b.f} min={20} max={20000} scale="log" color={c.color} onChange={v => session.setBand(c.id, band, { f: v })} />
                </Card>
                <Card>
                  <View style={st.row}>
                    <T v="label" style={{ flex: 1 }}>เกน</T>
                    <ValueText size={22} unit="dB" color={b.g ? c.color : C.ink} text={fmtDb(b.g)} onPress={() => askBand(band, 'g')} />
                  </View>
                  <Slider label="เกนแบนด์" value={b.g} min={p.eq.gain[0]} max={p.eq.gain[1]} origin={0} step={p.eq.gainStep} color={c.color} onChange={v => session.setBand(c.id, band, { g: snap(v, p.eq.gainStep) })} />
                  <View style={[st.row, { marginTop: S.xs }]}>
                    <T v="label" style={{ flex: 1 }}>ค่า Q {qFixed ? '(รุ่นนี้คงที่)' : ''}</T>
                    <ValueText size={22} text={b.q.toFixed(2)} onPress={() => askBand(band, 'q')} />
                  </View>
                  {!qFixed && <Slider label="ค่า Q" value={b.q} min={p.eq.q[0]} max={p.eq.q[1]} scale="log" color={c.color} onChange={v => session.setBand(c.id, band, { q: +v.toFixed(3) })} />}
                </Card>
                <Btn kind="ghost" icon="refresh" label="รีเซ็ตแบนด์นี้" onPress={() => session.setBand(c.id, band, { f: ISO[band], g: 0, q: 4.32, t: 'pk' })} />
              </View>
            )}

            {tab === 'xo' && (
              <View style={{ gap: S.md }}>
                {xoCard(true)}
                {xoCard(false)}
                <View style={s.note}>
                  <Icon name="shield" size={18} color={C.amber} />
                  <T v="small" style={{ flex: 1 }}>ทวีตเตอร์/ฮอร์นเปิด HPF เสมอ (ต่ำสุด {fmtF(MIN_HPF.tw!)} Hz) และเสียงกลางต่ำสุด {MIN_HPF.mr} Hz ที่ 12 dB/oct ขึ้นไป ตัวเลือกแสดงเฉพาะที่ {p.brand} {p.model} รองรับ{p.xo.types.includes('BE') ? ' · เส้น Bessel เป็นค่าประมาณ' : ''}</T>
                </View>
              </View>
            )}

            {tab === 'gd' && (
              <View style={{ gap: S.md }}>
                <Card>
                  <View style={st.row}>
                    <T v="label" style={{ flex: 1 }}>เกนช่องนี้</T>
                    <ValueText size={26} unit="dB" color={c.gain > 0 ? C.amber : C.ink} text={fmtDb(c.gain)} onPress={() => ask({ title: `เกน ${c.short}`, unit: 'dB', value: c.gain, min: p.channelGain[0], max: p.channelGain[1], step: 0.1, onSet: v => session.setGain(c.id, v) })} />
                    <Stepper small onMinus={() => session.setGain(c.id, c.gain - 0.5)} onPlus={() => session.setGain(c.id, c.gain + 0.5)} />
                  </View>
                  <Slider label="เกนช่อง" value={c.gain} min={p.channelGain[0]} max={p.channelGain[1]} origin={0} step={0.5} color={c.color} onChange={v => session.setGain(c.id, v)} />
                  <T v="small">ช่วง {p.channelGain[0]} ถึง +{p.channelGain[1]} dB</T>
                </Card>
                <Card>
                  <View style={st.row}>
                    <T v="label" style={{ flex: 1 }}>ดีเลย์</T>
                    <ValueText size={26} unit="ms" text={c.delay.toFixed(3)} onPress={() => ask({ title: `ดีเลย์ ${c.short}`, unit: 'ms', value: c.delay, min: p.delayMs[0], max: p.delayMs[1], step: p.delayStep, onSet: v => session.setDelay(c.id, v) })} />
                    <Stepper small onMinus={() => session.setDelay(c.id, c.delay - p.delayStep)} onPlus={() => session.setDelay(c.id, c.delay + p.delayStep)} />
                  </View>
                  <Slider label="ดีเลย์" value={c.delay} min={p.delayMs[0]} max={p.delayMs[1]} step={p.delayStep} color={c.color} onChange={v => session.setDelay(c.id, v)} />
                  <View style={st.row}>
                    <T v="small" style={{ flex: 1 }}>เท่ากับระยะ</T>
                    <ValueText unit="ซม." text={(c.delay * CM_PER_MS).toFixed(1)} onPress={() => ask({ title: `ดีเลย์ ${c.short} (ระยะ)`, unit: 'ซม.', value: +(c.delay * CM_PER_MS).toFixed(1), min: 0, max: +(p.delayMs[1] * CM_PER_MS).toFixed(1), step: 0.1, onSet: v => session.setDelay(c.id, v / CM_PER_MS) })} />
                  </View>
                  <T v="small">รุ่นนี้ตั้งได้สูงสุด {p.delayMs[1]} ms · ดีเลย์ปรับแยกซ้าย-ขวาเสมอ</T>
                </Card>
                <Card>
                  <T v="label">เฟส</T>
                  <Segmented full options={['0°', '180°'] as const} value={c.phase ? '180°' : '0°'} onChange={v => session.setPhase(c.id, v === '180°')} accent={C.violet} />
                  <T v="small">กลับเฟสเมื่อเบสหายตรงรอยต่อระหว่างลำโพง</T>
                </Card>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
  );
}

function Chip2({ icon, label, on, color, onPress }: { icon: IconName; label: string; on?: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={() => { haptic.tick(); onPress(); }}
      style={({ pressed }) => [s.chip2, on && { borderColor: alpha(color, 0.6), backgroundColor: alpha(color, 0.12) }, pressed && { opacity: 0.8 }]}>
      <Icon name={icon} size={15} color={on ? color : C.ink2} />
      <Text style={[s.chip2T, on && { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  topGlow: { position: 'absolute', left: 0, right: 0, top: 0, height: 260 },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: S.sm },
  dot: { width: 12, height: 12, borderRadius: 6, shadowOpacity: 1, shadowRadius: 8, elevation: 4 },
  chRow: { gap: 6, paddingHorizontal: S.lg, paddingBottom: S.sm },
  chPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: alpha(C.panel2, 0.7) },
  chDot: { width: 7, height: 7, borderRadius: 4 },
  chPillT: { fontFamily: F.head, fontSize: 12.5, color: C.muted },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip2: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.line2, backgroundColor: alpha(C.panel2, 0.8) },
  chip2T: { fontFamily: F.head, fontSize: 12.5, color: C.ink2 },
  tabs: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: alpha(C.bg, 0.6) },
  tab: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: R.sm, borderWidth: 1, borderColor: 'transparent' },
  tabT: { fontFamily: F.head, color: C.muted, fontSize: 12.5 },
  bchip: { minWidth: 50, paddingVertical: 6, paddingHorizontal: 8, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2, alignItems: 'center' },
  bchipN: { fontFamily: F.head, fontSize: 9.5, color: C.muted },
  bchipT: { fontFamily: F.num, color: C.ink, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  xoBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: alpha(C.amber, 0.3), backgroundColor: alpha(C.amber, 0.06) },
});
