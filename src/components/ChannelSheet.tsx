import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TuningSession } from '../model/session';
import { TuningState, BandType } from '../model/tuning';
import { XoType } from '../drivers/types';
import { clamp, fmtDb, fmtF, snap } from '../lib/format';
import { C, R, S } from '../theme';
import { EqBars } from './EqBars';
import { ResponseGraph } from './ResponseGraph';
import { useAskNumber } from './NumberPrompt';
import { Btn, Card, Segmented, Stepper, Toggle, ValueText, st } from './ui';

type Tab = 'geq' | 'peq' | 'xo' | 'gd';
const XO_NAME: Record<XoType, string> = { LR: 'Linkwitz-Riley', BW: 'Butterworth', BE: 'Bessel' };
const BAND_NAME: Record<BandType, string> = { pk: 'Peak', ls: 'Low shelf', hs: 'High shelf' };
const TAB_NAME: Record<Tab, string> = { geq: 'EQ 31', peq: 'PEQ', xo: 'ครอสโอเวอร์', gd: 'เกน · ดีเลย์' };

export function ChannelSheet({ session, state, chId, onClose, onToast }: { session: TuningSession; state: TuningState; chId: string | null; onClose: () => void; onToast: (m: string) => void }) {
  const p = session.profile;
  const tabs: Tab[] = [...(p.eq.graphic ? ['geq' as const] : []), ...(p.eq.parametric ? ['peq' as const] : []), 'xo', 'gd'];
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [band, setBand] = useState(17);
  const ask = useAskNumber();
  useEffect(() => { if (!tabs.includes(tab)) setTab(tabs[0]); }, [p.id]);

  const c = state.channels.find(x => x.id === chId);
  const pair = c?.pair ? state.channels.find(x => x.id === c.pair) : undefined;
  if (!c) return null;
  const b = c.eq[band];

  const askBand = (i: number, k: 'f' | 'g' | 'q') => {
    const cur = c.eq[i];
    if (k === 'g') ask({ title: `เกน แบนด์ ${fmtF(cur.f)} Hz`, unit: 'dB', value: cur.g, min: p.eq.gain[0], max: p.eq.gain[1], step: p.eq.gainStep, onSet: v => session.setBand(c.id, i, { g: v }) });
    if (k === 'f') ask({ title: `ความถี่ แบนด์ ${i + 1}`, unit: 'Hz', value: cur.f, min: 20, max: 20000, step: 1, onSet: v => session.setBand(c.id, i, { f: v }) });
    if (k === 'q') ask({ title: `ค่า Q แบนด์ ${i + 1}`, value: cur.q, min: p.eq.q[0], max: p.eq.q[1], step: 0.001, onSet: v => session.setBand(c.id, i, { q: v }) });
  };

  const xoCard = (hp: boolean) => {
    const x = hp ? c.hpf : c.lpf;
    const slopes = p.xo.slopes[x.type] ?? [];
    return (
      <Card key={String(hp)} style={[{ backgroundColor: C.panel2 }, !x.on && { opacity: 0.6 }]}>
        <View style={st.row}>
          <Text style={[st.h, { flex: 1 }]}>{hp ? 'ไฮพาส (HPF) · ตัดเสียงต่ำออก' : 'โลว์พาส (LPF) · ตัดเสียงสูงออก'}</Text>
          <Toggle value={x.on} onChange={on => session.setXover(c.id, hp, { on })} label={hp ? 'เปิด HPF' : 'เปิด LPF'} />
        </View>
        <View style={st.row}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <ValueText size={32} text={Math.round(x.freq).toLocaleString('en-US')}
              onPress={() => ask({ title: hp ? 'ความถี่ HPF' : 'ความถี่ LPF', unit: 'Hz', value: x.freq, min: 20, max: 20000, step: 1, onSet: v => session.setXover(c.id, hp, { freq: v }) })} />
            <Text style={st.small}>Hz</Text>
          </View>
          <Stepper onMinus={() => session.setXover(c.id, hp, { freq: x.freq / Math.pow(2, 1 / 12) })} onPlus={() => session.setXover(c.id, hp, { freq: x.freq * Math.pow(2, 1 / 12) })} />
        </View>
        <Segmented options={p.xo.types} value={x.type} format={t => XO_NAME[t]} onChange={type => session.setXover(c.id, hp, { type })} />
        <View style={st.row}>
          <Segmented options={slopes} value={x.slope} onChange={slope => session.setXover(c.id, hp, { slope })} />
          <Text style={st.small}>dB/oct</Text>
        </View>
      </Card>
    );
  };

  return (
    <Modal visible={!!chId} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: C.panel }} edges={['top', 'bottom']}>
        <View style={s.head}>
          <View style={[s.dot, { backgroundColor: c.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{c.name}</Text>
            <Text style={st.small}>{c.group}</Text>
          </View>
          <Pressable onPress={() => session.toggleMute(c.id)} style={[s.tog, c.mute && { backgroundColor: C.danger, borderColor: 'transparent' }]} accessibilityRole="button" accessibilityState={{ selected: c.mute }}>
            <Text style={[s.togT, c.mute && { color: '#fff' }]}>มิวท์</Text>
          </Pressable>
          <Pressable onPress={onClose} style={s.close} accessibilityLabel="ปิด"><Text style={{ color: C.ink, fontSize: 18 }}>✕</Text></Pressable>
        </View>
        {pair && (
          <View style={[st.row, { paddingHorizontal: S.lg, paddingBottom: S.sm }]}>
            <Text style={[st.small, { flex: 1 }]}>{state.link ? `ลิงก์กับ ${pair.short} อยู่ · ปรับพร้อมกัน` : `ปรับแยกจาก ${pair.short}`}</Text>
            <Btn label={`คัดลอกไป ${pair.short}`} onPress={() => { session.copyToPair(c.id); onToast(`คัดลอก EQ ครอส และเกนไป ${pair.short} แล้ว (ดีเลย์ไม่เปลี่ยน)`); }} />
          </View>
        )}
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: 0, gap: S.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <ResponseGraph channels={state.channels} selected={c.id} top={Math.max(12, p.eq.gain[1])} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
            {tabs.map(t => (
              <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
                <Text style={[s.tabT, tab === t && { color: C.ink, fontWeight: '600' }]}>{TAB_NAME[t]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {tab === 'geq' && (
            <View style={{ gap: S.sm }}>
              <EqBars ch={c} range={p.eq.gain} step={Math.max(p.eq.gainStep, 0.5)} onChange={(i, g) => session.setBand(c.id, i, { g })} onAsk={i => askBand(i, 'g')} />
              <View style={st.row}>
                <Text style={[st.small, { flex: 1 }]}>ลากที่แท่ง · แตะตัวเลขเพื่อพิมพ์ค่า</Text>
                <Btn label={c.eqBypass ? 'เปิด EQ' : 'Bypass'} onPress={() => session.setBypass(c.id, !c.eqBypass)} />
                <Btn label="รีเซ็ต EQ" kind="ghost" onPress={() => session.resetEq(c.id)} />
              </View>
            </View>
          )}

          {tab === 'peq' && (
            <View style={{ gap: S.md }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {c.eq.map((x, i) => (
                  <Pressable key={i} onPress={() => setBand(i)} style={[s.bchip, x.g !== 0 && { borderColor: C.amber }, i === band && s.bchipOn]} accessibilityRole="button" accessibilityState={{ selected: i === band }}>
                    <Text style={[s.bchipT, i === band && { color: C.amberInk }]}>{fmtF(x.f)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {p.eq.shelves && <Segmented options={['pk', 'ls', 'hs'] as const} value={b.t} format={t => BAND_NAME[t]} onChange={t => session.setBand(c.id, band, { t })} />}
              <Card style={{ backgroundColor: C.panel2 }}>
                <Text style={st.h}>ความถี่ แบนด์ {band + 1}</Text>
                <View style={st.row}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <ValueText size={32} text={Math.round(b.f).toLocaleString('en-US')} onPress={() => askBand(band, 'f')} /><Text style={st.small}>Hz</Text>
                  </View>
                  <Stepper onMinus={() => session.setBand(c.id, band, { f: b.f / Math.pow(2, 1 / 24) })} onPlus={() => session.setBand(c.id, band, { f: b.f * Math.pow(2, 1 / 24) })} />
                </View>
              </Card>
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <Card style={{ flex: 1, backgroundColor: C.panel2 }}>
                  <Text style={st.h}>เกน</Text>
                  <ValueText size={22} text={`${fmtDb(b.g)} dB`} onPress={() => askBand(band, 'g')} />
                  <Stepper onMinus={() => session.setBand(c.id, band, { g: snap(b.g - Math.max(p.eq.gainStep, 0.5), p.eq.gainStep) })} onPlus={() => session.setBand(c.id, band, { g: snap(b.g + Math.max(p.eq.gainStep, 0.5), p.eq.gainStep) })} />
                </Card>
                <Card style={{ flex: 1, backgroundColor: C.panel2 }}>
                  <Text style={st.h}>ค่า Q</Text>
                  <ValueText size={22} text={b.q.toFixed(2)} onPress={() => askBand(band, 'q')} />
                  <Stepper onMinus={() => session.setBand(c.id, band, { q: +(b.q / 1.12).toFixed(3) })} onPlus={() => session.setBand(c.id, band, { q: +(b.q * 1.12).toFixed(3) })} />
                </Card>
              </View>
              <Btn label="รีเซ็ตแบนด์นี้" kind="ghost" onPress={() => session.setBand(c.id, band, { f: [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000][band], g: 0, q: 4.32, t: 'pk' })} />
            </View>
          )}

          {tab === 'xo' && (
            <View style={{ gap: S.md }}>
              {xoCard(true)}
              {xoCard(false)}
              <Text style={st.small}>แตะตัวเลข Hz เพื่อพิมพ์ค่าตรง ๆ · ปุ่ม −/+ ขยับทีละ 1/12 อ็อกเทฟ · ตัวเลือกแสดงเฉพาะที่ {p.brand} {p.model} รองรับ{p.xo.types.includes('BE') ? ' · เส้นกราฟ Bessel เป็นค่าประมาณ' : ''}</Text>
            </View>
          )}

          {tab === 'gd' && (
            <View style={{ gap: S.md }}>
              <Card style={{ backgroundColor: C.panel2 }}>
                <View style={st.row}>
                  <Text style={[st.h, { flex: 1 }]}>เกนช่องนี้</Text>
                  <ValueText text={`${fmtDb(c.gain)} dB`} onPress={() => ask({ title: `เกน ${c.short}`, unit: 'dB', value: c.gain, min: p.channelGain[0], max: p.channelGain[1], step: 0.1, onSet: v => session.setGain(c.id, v) })} />
                  <Stepper onMinus={() => session.setGain(c.id, c.gain - 0.5)} onPlus={() => session.setGain(c.id, c.gain + 0.5)} />
                </View>
                <Text style={st.small}>ช่วง {p.channelGain[0]} ถึง +{p.channelGain[1]} dB</Text>
              </Card>
              <Card style={{ backgroundColor: C.panel2 }}>
                <View style={st.row}>
                  <Text style={[st.h, { flex: 1 }]}>ดีเลย์</Text>
                  <ValueText text={`${c.delay.toFixed(3)} ms`} onPress={() => ask({ title: `ดีเลย์ ${c.short}`, unit: 'ms', value: c.delay, min: p.delayMs[0], max: p.delayMs[1], step: p.delayStep, onSet: v => session.setDelay(c.id, v) })} />
                  <Stepper onMinus={() => session.setDelay(c.id, c.delay - p.delayStep)} onPlus={() => session.setDelay(c.id, c.delay + p.delayStep)} />
                </View>
                <View style={st.row}>
                  <Text style={[st.small, { flex: 1 }]}>เท่ากับระยะ</Text>
                  <ValueText text={`${(c.delay * 34.3).toFixed(1)} ซม.`} onPress={() => ask({ title: `ดีเลย์ ${c.short} (ระยะ)`, unit: 'ซม.', value: +(c.delay * 34.3).toFixed(1), min: 0, max: +(p.delayMs[1] * 34.3).toFixed(1), step: 0.1, onSet: v => session.setDelay(c.id, v / 34.3) })} />
                </View>
                <Text style={st.small}>รุ่นนี้ตั้งได้สูงสุด {p.delayMs[1]} ms · ดีเลย์ปรับแยกซ้าย-ขวาเสมอ</Text>
              </Card>
              <Card style={{ backgroundColor: C.panel2 }}>
                <Text style={st.h}>เฟส</Text>
                <Segmented options={['0°', '180°'] as const} value={c.phase ? '180°' : '0°'} onChange={v => session.setPhase(c.id, v === '180°')} />
                <Text style={st.small}>กลับเฟสเมื่อเบสหายตรงรอยต่อระหว่างลำโพง</Text>
              </Card>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg },
  dot: { width: 14, height: 14, borderRadius: 7 },
  title: { color: C.ink, fontSize: 19, fontWeight: '700' },
  tog: { borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 11 },
  togT: { color: C.ink, fontSize: 13, fontWeight: '600' },
  close: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  tab: { paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 2, borderColor: 'transparent' },
  tabOn: { borderColor: C.amber },
  tabT: { color: C.muted, fontSize: 14 },
  bchip: { minWidth: 48, paddingVertical: 6, paddingHorizontal: 9, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2, alignItems: 'center' },
  bchipOn: { backgroundColor: C.amber, borderColor: 'transparent' },
  bchipT: { color: C.ink, fontSize: 12, fontVariant: ['tabular-nums'] },
});
