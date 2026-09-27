import { ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TuningSession, useSessionMeta } from '../model/session';
import { TuningState, BandType, ISO, MIN_HPF, CM_PER_MS, KIND_NAME, LIMIT_RANGE, chName } from '../model/tuning';
import { XoType } from '../drivers/types';
import { fmtDb, fmtF, snap } from '../lib/format';
import { haptic } from '../lib/haptics';
import { C, F, R, S, alpha } from '../theme';
import { EqBars } from './EqBars';
import { ResponseGraph } from './ResponseGraph';
import { useAskNumber, useAskText } from './NumberPrompt';
import { Slider } from './Slider';
import { Icon, IconName } from './Icon';
import { Sheet } from './Sheet';
import { ToastProvider, useToast } from './Toast';
import { Btn, Card, IconBtn, Note, Segmented, Stepper, T, Toggle, ValueText, st, useWide } from './ui';

type Tab = 'geq' | 'peq' | 'xo' | 'gd';
const XO_NAME: Record<XoType, string> = { LR: 'Linkwitz-Riley', BW: 'Butterworth', BE: 'Bessel' };
const BAND_NAME: Record<BandType, string> = { pk: 'Peak', ls: 'Low shelf', hs: 'High shelf' };
const TAB: Record<Tab, { name: string; icon: IconName }> = { geq: { name: 'EQ 31', icon: 'eq' }, peq: { name: 'PEQ', icon: 'wave' }, xo: { name: 'ครอส', icon: 'xover' }, gd: { name: 'เกน·ดีเลย์', icon: 'timer' } };

type SheetProps = { session: TuningSession; state: TuningState; chId: string | null; onClose: () => void; onSelect: (id: string) => void };

/** Full-screen channel editor. Has its own toast host because a Modal renders above the app-level one. */
export function ChannelSheet(props: SheetProps) {
  return (
    <Modal visible={!!props.chId} animationType="slide" onRequestClose={props.onClose} presentationStyle="fullScreen" statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <ToastProvider><SheetBody {...props} /></ToastProvider>
    </Modal>
  );
}

function SheetBody({ session, state, chId, onClose, onSelect }: SheetProps) {
  const p = session.profile;
  const meta = useSessionMeta(session);
  const wide = useWide();
  const inset = useSafeAreaInsets();
  const tabs: Tab[] = [...(p.eq.graphic ? ['geq' as const] : []), ...(p.eq.parametric ? ['peq' as const] : []), 'xo', 'gd'];
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [band, setBand] = useState(17);
  const [copyOpen, setCopyOpen] = useState(false);
  const ask = useAskNumber();
  const askText = useAskText();
  const toast = useToast();
  useEffect(() => { if (!tabs.includes(tab)) setTab(tabs[0]); }, [p.id]);

  const idx = state.channels.findIndex(x => x.id === chId);
  const c = state.channels[idx];
  if (!c) return null;
  const b = c.eq[band];
  const minHp = MIN_HPF[c.kind];
  const qFixed = p.eq.q[0] === p.eq.q[1];
  const hasLimiter = p.extras.includes('limiter');

  const askBand = (i: number, k: 'f' | 'g' | 'q') => {
    const cur = c.eq[i];
    if (k === 'g') ask({ title: `เกน แบนด์ ${fmtF(cur.f)} Hz`, unit: 'dB', value: cur.g, min: p.eq.gain[0], max: p.eq.gain[1], step: p.eq.gainStep, onSet: v => session.setBand(c.id, i, { g: v }) });
    if (k === 'f') ask({ title: `ความถี่ แบนด์ ${i + 1}`, unit: 'Hz', value: cur.f, min: 20, max: 20000, step: 1, onSet: v => session.setBand(c.id, i, { f: v }) });
    if (k === 'q') ask({ title: `ค่า Q แบนด์ ${i + 1}`, value: cur.q, min: p.eq.q[0], max: p.eq.q[1], step: 0.001, onSet: v => session.setBand(c.id, i, { q: v }) });
  };

  const xoCard = (hp: boolean) => {
    const x = hp ? c.hpf : c.lpf;
    const slopes = p.xo.slopes[x.type] ?? [];
    const locked = hp && minHp !== undefined;
    return (
      <Card key={String(hp)} style={!x.on && { opacity: 0.75 }}>
        <View style={st.row}>
          <View style={{ flex: 1 }}>
            <T v="h">{hp ? 'ไฮพาส (HPF) · ตัดเสียงต่ำ' : 'โลว์พาส (LPF) · ตัดเสียงสูง'}</T>
            {locked && <T v="small" style={{ color: C.warn }}>ล็อกไว้ป้องกัน{KIND_NAME[c.kind]} · ต่ำสุด {fmtF(minHp)} Hz</T>}
          </View>
          {locked ? <Icon name="shield" size={22} color={C.warn} /> : <Toggle value={x.on} onChange={on => session.setXover(c.id, hp, { on })} label={hp ? 'เปิด HPF' : 'เปิด LPF'} />}
        </View>
        <View style={st.row}>
          <View style={{ flex: 1 }}>
            <ValueText size={30} unit="Hz" color={x.on ? C.ink : C.muted} text={Math.round(x.freq).toLocaleString('en-US')}
              onPress={() => ask({ title: hp ? 'ความถี่ HPF' : 'ความถี่ LPF', unit: 'Hz', value: x.freq, min: locked ? minHp! : 20, max: 20000, step: 1, note: locked ? 'ป้องกันลำโพงเสียหาย' : undefined, onSet: v => session.setXover(c.id, hp, { freq: v }) })} />
          </View>
          <Stepper small onMinus={() => session.setXover(c.id, hp, { freq: x.freq / Math.pow(2, 1 / 12) })} onPlus={() => session.setXover(c.id, hp, { freq: x.freq * Math.pow(2, 1 / 12) })} />
        </View>
        <Slider label={hp ? 'ความถี่ HPF' : 'ความถี่ LPF'} value={x.freq} min={20} max={20000} scale="log" color={c.color} floor={locked ? minHp : undefined} disabled={!x.on}
          onChange={v => session.setXover(c.id, hp, { freq: Math.round(v) })} />
        <Segmented options={p.xo.types} value={x.type} format={t => XO_NAME[t]} onChange={type => session.setXover(c.id, hp, { type })} />
        <View style={st.row}>
          <Segmented options={slopes} value={x.slope} onChange={slope => session.setXover(c.id, hp, { slope })} />
          <T v="small">dB/oct</T>
        </View>
      </Card>
    );
  };

  const graph = (
    <Card pad={false} style={{ paddingTop: S.sm, paddingRight: S.xs }}>
      <ResponseGraph channels={state.channels} selected={c.id} top={Math.max(12, p.eq.gain[1])} bandMarks height={wide ? 230 : 190}
        edit={tab === 'peq' ? { index: band, f: b.f, g: b.g, onDrag: (f, g) => session.setBand(c.id, band, { f, g }) } : undefined} />
    </Card>
  );

  const actions = (
    <View style={s.actions}>
      <Action icon="phase" label={c.phase ? 'เฟส 180°' : 'เฟส 0°'} on={c.phase} onPress={() => session.setPhase(c.id, !c.phase)} />
      <Action icon={state.link ? 'link' : 'unlink'} label={state.link ? 'ลิงก์ L/R' : 'แยก L/R'} on={state.link} onPress={() => session.setLink(!state.link)} />
      <Action icon="copy" label="คัดลอกไป…" onPress={() => setCopyOpen(true)} />
      <Action icon="refresh" label="รีเซ็ตช่องนี้" onPress={() => { session.resetChannel(c.id); toast('รีเซ็ตเป็นค่าเริ่มต้นแล้ว (กดย้อนกลับได้)', 'info'); }} />
    </View>
  );

  const tabBar = (
    <View style={s.tabs}>
      {tabs.map(t => (
        <Pressable key={t} onPress={() => { haptic.tick(); setTab(t); }} style={[s.tab, tab === t && s.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
          <Icon name={TAB[t].icon} size={16} color={tab === t ? C.ink : C.muted} />
          <Text style={[s.tabT, tab === t && { color: C.ink }]}>{TAB[t].name}</Text>
        </Pressable>
      ))}
    </View>
  );

  const content: ReactNode = (
    <>
      {tab === 'geq' && (
        <Card>
          <EqBars ch={c} range={p.eq.gain} step={Math.max(p.eq.gainStep, 0.5)} onChange={(i, g) => session.setBand(c.id, i, { g })} onAsk={i => askBand(i, 'g')} />
          <View style={[st.row, { marginTop: S.xs }]}>
            <T v="small" style={{ flex: 1 }}>ลากที่แท่ง · แตะตัวเลขเพื่อพิมพ์ค่า</T>
            <Btn small label={c.eqBypass ? 'เปิด EQ' : 'ปิด EQ ชั่วคราว'} onPress={() => session.setBypass(c.id, !c.eqBypass)} />
            <Btn small kind="ghost" label="ล้าง EQ" onPress={() => session.resetEq(c.id)} />
          </View>
        </Card>
      )}

      {tab === 'peq' && (
        <View style={{ gap: S.md }}>
          <T v="small">ลากจุดบนกราฟ หรือเลือกแบนด์ด้านล่าง</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {c.eq.map((x, i) => (
              <Pressable key={i} onPress={() => { haptic.tick(); setBand(i); }} style={[s.bchip, x.g !== 0 && { borderColor: alpha(c.color, 0.7) }, i === band && { backgroundColor: C.accent, borderColor: C.accent }]} accessibilityRole="button" accessibilityState={{ selected: i === band }}>
                <Text style={[s.bchipN, i === band && { color: C.onAccent }]}>{i + 1}</Text>
                <Text style={[s.bchipT, i === band && { color: C.onAccent }]}>{fmtF(x.f)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {p.eq.shelves && <Segmented full options={['pk', 'ls', 'hs'] as const} value={b.t} format={t => BAND_NAME[t]} onChange={t => session.setBand(c.id, band, { t })} />}
          <Card>
            <View style={st.row}>
              <T v="label" style={{ flex: 1 }}>ความถี่ · แบนด์ {band + 1}</T>
              <Stepper small onMinus={() => session.setBand(c.id, band, { f: b.f / Math.pow(2, 1 / 24) })} onPlus={() => session.setBand(c.id, band, { f: b.f * Math.pow(2, 1 / 24) })} />
            </View>
            <ValueText size={30} unit="Hz" text={Math.round(b.f).toLocaleString('en-US')} onPress={() => askBand(band, 'f')} />
            <Slider label="ความถี่แบนด์" value={b.f} min={20} max={20000} scale="log" color={c.color} onChange={v => session.setBand(c.id, band, { f: v })} />
          </Card>
          <Card>
            <View style={st.row}>
              <T v="label" style={{ flex: 1 }}>เกน</T>
              <ValueText size={22} unit="dB" text={fmtDb(b.g)} onPress={() => askBand(band, 'g')} />
            </View>
            <Slider label="เกนแบนด์" value={b.g} min={p.eq.gain[0]} max={p.eq.gain[1]} origin={0} step={p.eq.gainStep} color={c.color} onChange={v => session.setBand(c.id, band, { g: snap(v, p.eq.gainStep) })} />
            <View style={[st.row, { marginTop: S.xs }]}>
              <T v="label" style={{ flex: 1 }}>ค่า Q {qFixed ? '(รุ่นนี้คงที่)' : '· ยิ่งมากยิ่งแคบ'}</T>
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
          <Note icon="shield" color={C.warn}>ทวีตเตอร์/ฮอร์นเปิด HPF เสมอ (ต่ำสุด {fmtF(MIN_HPF.tw!)} Hz) เสียงกลางต่ำสุด {MIN_HPF.mr} Hz ที่ 12 dB/oct ขึ้นไป{p.xo.types.includes('BE') ? ' · เส้น Bessel ในกราฟเป็นค่าประมาณ' : ''}</Note>
        </View>
      )}

      {tab === 'gd' && (
        <View style={{ gap: S.md }}>
          <Card>
            <View style={st.row}>
              <T v="label" style={{ flex: 1 }}>ระดับเสียงช่องนี้</T>
              <ValueText size={24} unit="dB" color={c.gain > 0 ? C.warn : C.ink} text={fmtDb(c.gain)} onPress={() => ask({ title: `ระดับ ${c.short}`, unit: 'dB', value: c.gain, min: p.channelGain[0], max: p.channelGain[1], step: 0.1, onSet: v => session.setGain(c.id, v) })} />
              <Stepper small onMinus={() => session.setGain(c.id, c.gain - 0.5)} onPlus={() => session.setGain(c.id, c.gain + 0.5)} />
            </View>
            <Slider label="ระดับเสียงช่อง" value={c.gain} min={p.channelGain[0]} max={p.channelGain[1]} origin={0} step={0.5} color={c.color} onChange={v => session.setGain(c.id, v)} />
          </Card>
          <Card>
            <View style={st.row}>
              <T v="label" style={{ flex: 1 }}>ดีเลย์</T>
              <ValueText size={24} unit="ms" text={c.delay.toFixed(3)} onPress={() => ask({ title: `ดีเลย์ ${c.short}`, unit: 'ms', value: c.delay, min: p.delayMs[0], max: p.delayMs[1], step: p.delayStep, onSet: v => session.setDelay(c.id, v) })} />
              <Stepper small onMinus={() => session.setDelay(c.id, c.delay - p.delayStep)} onPlus={() => session.setDelay(c.id, c.delay + p.delayStep)} />
            </View>
            <Slider label="ดีเลย์" value={c.delay} min={p.delayMs[0]} max={p.delayMs[1]} step={p.delayStep} color={c.color} onChange={v => session.setDelay(c.id, v)} />
            <View style={st.row}>
              <T v="small" style={{ flex: 1 }}>เท่ากับระยะ</T>
              <ValueText unit="ซม." text={(c.delay * CM_PER_MS).toFixed(1)} onPress={() => ask({ title: `ดีเลย์ ${c.short} (ระยะ)`, unit: 'ซม.', value: +(c.delay * CM_PER_MS).toFixed(1), min: 0, max: +(p.delayMs[1] * CM_PER_MS).toFixed(1), step: 0.1, onSet: v => session.setDelay(c.id, v / CM_PER_MS) })} />
            </View>
            <T v="small">สูงสุด {p.delayMs[1]} ms · ดีเลย์ปรับแยกซ้าย-ขวาเสมอ</T>
          </Card>
          {hasLimiter && (
            <Card>
              <View style={st.row}>
                <View style={{ flex: 1 }}>
                  <T v="h">ลิมิตเตอร์</T>
                  <T v="small">กันเสียงดังเกินจนลำโพงหรือแอมป์เสียหาย</T>
                </View>
                <Toggle value={c.limiter.on} onChange={on => session.setLimiter(c.id, { on })} label="เปิดลิมิตเตอร์" />
              </View>
              <View style={st.row}>
                <T v="label" style={{ flex: 1 }}>เริ่มทำงานที่</T>
                <ValueText size={20} unit="dB" text={fmtDb(c.limiter.threshold)} onPress={() => ask({ title: `ลิมิตเตอร์ ${c.short}`, unit: 'dB', value: c.limiter.threshold, min: LIMIT_RANGE[0], max: LIMIT_RANGE[1], step: 0.5, onSet: v => session.setLimiter(c.id, { threshold: v }) })} />
              </View>
              <Slider label="จุดเริ่มลิมิตเตอร์" value={c.limiter.threshold} min={LIMIT_RANGE[0]} max={LIMIT_RANGE[1]} step={0.5} color={c.color} disabled={!c.limiter.on} onChange={v => session.setLimiter(c.id, { threshold: v })} />
            </Card>
          )}
        </View>
      )}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: inset.top, paddingLeft: inset.left, paddingRight: inset.right }}>
      <View style={s.head}>
        <IconBtn name="close" label="ปิด" onPress={onClose} />
        <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => askText({ title: `ตั้งชื่อ OUT ${idx + 1}`, value: c.custom ?? '', placeholder: c.name, onSet: v => session.rename(c.id, v) })} accessibilityRole="button" accessibilityHint="แตะเพื่อตั้งชื่อ">
          <View style={[st.row, { gap: 8 }]}>
            <View style={[s.dot, { backgroundColor: c.color }]} />
            <T v="title" numberOfLines={1} style={{ flexShrink: 1 }}>{chName(c)}</T>
            <Icon name="edit" size={15} color={C.muted} />
          </View>
          <T v="small" numberOfLines={1}>ช่องออก {idx + 1} · {c.group}</T>
        </Pressable>
        <IconBtn name="undo" label="ย้อนกลับ (Undo)" disabled={!meta.canUndo} onPress={() => session.undo()} />
        <IconBtn name="solo" label="ฟังช่องนี้ช่องเดียว (Solo)" active={meta.solo === c.id} onPress={() => session.solo(c.id)} />
        <IconBtn name="mute" label="ปิดเสียงช่องนี้" active={c.mute} color={c.mute ? C.danger : undefined} onPress={() => session.toggleMute(c.id)} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chRow} style={{ flexGrow: 0 }}>
        {state.channels.map(x => (
          <Pressable key={x.id} onPress={() => { haptic.tick(); onSelect(x.id); }} style={[s.chPill, x.id === c.id && s.chPillOn]} accessibilityRole="tab" accessibilityState={{ selected: x.id === c.id }}>
            <View style={[s.chDot, { backgroundColor: x.mute ? C.faint : x.color }]} />
            <Text style={[s.chPillT, x.id === c.id && { color: C.ink }]}>{x.short}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {meta.solo && (
        <View style={{ paddingHorizontal: S.lg, paddingBottom: S.sm }}>
          <Note icon="solo" color={C.violet} right={<Btn small label="เลิกโซโล่" onPress={() => session.solo(meta.solo!)} />}>กำลังฟังเฉพาะช่องเดียว ช่องอื่นถูกปิดเสียงชั่วคราว</Note>
        </View>
      )}

      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: S.lg, paddingHorizontal: S.lg }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: S.md, paddingBottom: inset.bottom + 24 }}>
            {graph}
            {actions}
          </ScrollView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: S.md, paddingBottom: inset.bottom + 40 }} keyboardShouldPersistTaps="handled">
            {tabBar}
            {content}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.md, paddingBottom: inset.bottom + 48 }} keyboardShouldPersistTaps="handled">
          {graph}
          {actions}
          {tabBar}
          {content}
        </ScrollView>
      )}

      <CopySheet visible={copyOpen} onClose={() => setCopyOpen(false)} state={state} srcId={c.id}
        onCopy={ids => { session.copyTo(c.id, ids); haptic.ok(); toast(`คัดลอก EQ ครอส และระดับเสียงไป ${ids.length} ช่องแล้ว (ดีเลย์ไม่เปลี่ยน)`); }} />
    </View>
  );
}

function Action({ icon, label, on, onPress }: { icon: IconName; label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={() => { haptic.tick(); onPress(); }}
      style={({ pressed }) => [s.action, on && { backgroundColor: alpha(C.accent, 0.14) }, pressed && { opacity: 0.7 }]}>
      <Icon name={icon} size={16} color={on ? C.accent : C.ink2} />
      <Text style={[s.actionT, on && { color: C.accent }]}>{label}</Text>
    </Pressable>
  );
}

function CopySheet({ visible, onClose, state, srcId, onCopy }: { visible: boolean; onClose: () => void; state: TuningState; srcId: string; onCopy: (ids: string[]) => void }) {
  const src = state.channels.find(c => c.id === srcId);
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => { if (visible) setSel(src?.pair ? [src.pair] : []); }, [visible, srcId]);
  if (!src) return null;
  return (
    <Sheet visible={visible} onClose={onClose} title={`คัดลอกจาก ${chName(src)}`} sub="EQ ครอสโอเวอร์ และระดับเสียง · ดีเลย์ไม่ถูกคัดลอก"
      footer={<Btn kind="primary" label={sel.length ? `คัดลอกไป ${sel.length} ช่อง` : 'เลือกช่องปลายทาง'} disabled={!sel.length} onPress={() => { onCopy(sel); onClose(); }} />}>
      {state.channels.filter(c => c.id !== srcId).map(c => {
        const on = sel.includes(c.id);
        return (
          <Pressable key={c.id} onPress={() => { haptic.tick(); setSel(on ? sel.filter(x => x !== c.id) : [...sel, c.id]); }} style={[s.copyRow, on && { borderColor: C.accent }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
            <View style={[s.chDot, { backgroundColor: c.color, width: 10, height: 10, borderRadius: 5 }]} />
            <Text style={s.copyT}>{chName(c)}</Text>
            {c.kind !== src.kind && <T v="small">ครอสจะถูกปรับให้ปลอดภัย</T>}
            <View style={[s.check, on && { backgroundColor: C.accent, borderColor: C.accent }]}>{on && <Icon name="check" size={13} color={C.onAccent} width={2.8} />}</View>
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  chRow: { gap: 6, paddingHorizontal: S.lg, paddingBottom: S.md },
  chPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: C.panel2 },
  chPillOn: { backgroundColor: C.panel3, borderWidth: 1, borderColor: C.line2 },
  chDot: { width: 8, height: 8, borderRadius: 4 },
  chPillT: { fontFamily: F.medium, fontSize: 13, color: C.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.panel2 },
  actionT: { fontFamily: F.medium, fontSize: 13, color: C.ink2 },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: R.md, backgroundColor: C.panel2 },
  tab: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: R.sm },
  tabOn: { backgroundColor: C.panel3 },
  tabT: { fontFamily: F.medium, color: C.muted, fontSize: 13 },
  bchip: { minWidth: 50, paddingVertical: 6, paddingHorizontal: 8, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2, alignItems: 'center' },
  bchipN: { fontFamily: F.medium, fontSize: 10, color: C.muted },
  bchipT: { fontFamily: F.semi, color: C.ink, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.panel2 },
  copyT: { flex: 1, fontFamily: F.medium, fontSize: 15, color: C.ink },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' },
});
